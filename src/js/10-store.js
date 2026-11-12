/* ============================================================
   10-store.js — Lớp dữ liệu
   Kiến trúc: View → App.Store (bộ nhớ đệm + lịch sử) → Adapter (IndexedDB | localStorage | sau này: máy chủ).
   Muốn nâng cấp nhiều người dùng: viết Adapter mới có cùng 8 hàm bên dưới, không phải sửa các phân hệ.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U;
  const DB_NAME = 'khtc_so_son_la', DB_VER = 1;

  /* ---------- Adapter IndexedDB ---------- */
  function IdbAdapter() {
    let db = null;
    const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const tx = (stores, mode) => db.transaction(stores, mode);
    return {
      name: 'IndexedDB',
      async open() {
        db = await new Promise((res, rej) => {
          const r = indexedDB.open(DB_NAME, DB_VER);
          r.onupgradeneeded = () => {
            const d = r.result;
            if (!d.objectStoreNames.contains('rec')) d.createObjectStore('rec', { keyPath: '_k' });
            if (!d.objectStoreNames.contains('files')) d.createObjectStore('files', { keyPath: 'id' });
            if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' });
          };
          r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
        });
      },
      async loadAll() {
        const rows = await req(tx('rec', 'readonly').objectStore('rec').getAll());
        const out = {};
        rows.forEach(r => { const c = r._k.slice(0, r._k.indexOf(':')); (out[c] = out[c] || []).push(r.v); });
        return out;
      },
      bulk(ops) { // [{op:'put'|'del', c, id, v}]
        return new Promise((res, rej) => {
          const t = tx('rec', 'readwrite'), s = t.objectStore('rec');
          ops.forEach(o => o.op === 'del' ? s.delete(o.c + ':' + o.id) : s.put({ _k: o.c + ':' + o.v.id, v: o.v }));
          t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
        });
      },
      async clear() { await req(tx('rec', 'readwrite').objectStore('rec').clear()); await req(tx('files', 'readwrite').objectStore('files').clear()); },
      async getMeta(k) { const r = await req(tx('meta', 'readonly').objectStore('meta').get(k)); return r ? r.v : undefined; },
      async setMeta(k, v) { await req(tx('meta', 'readwrite').objectStore('meta').put({ k, v })); },
      async putFile(f) { await req(tx('files', 'readwrite').objectStore('files').put(f)); },
      async getFile(id) { return req(tx('files', 'readonly').objectStore('files').get(id)); },
      async delFile(id) { await req(tx('files', 'readwrite').objectStore('files').delete(id)); },
      async allFiles() { return req(tx('files', 'readonly').objectStore('files').getAll()); }
    };
  }

  /* ---------- Adapter dự phòng localStorage (khi trình duyệt chặn IndexedDB) ---------- */
  function LsAdapter() {
    const PFX = 'khtcso:';
    const read = k => { try { return JSON.parse(localStorage.getItem(PFX + k) || 'null'); } catch (e) { return null; } };
    const write = (k, v) => localStorage.setItem(PFX + k, JSON.stringify(v));
    return {
      name: 'localStorage', noFiles: true,
      async open() { localStorage.setItem(PFX + 'probe', '1'); },
      async loadAll() { return read('rec') || {}; },
      async bulk(ops) {
        const all = read('rec') || {};
        ops.forEach(o => {
          const arr = all[o.c] = all[o.c] || [];
          const id = o.op === 'del' ? o.id : o.v.id, i = arr.findIndex(x => x.id === id);
          if (o.op === 'del') { if (i >= 0) arr.splice(i, 1); } else if (i >= 0) arr[i] = o.v; else arr.push(o.v);
        });
        write('rec', all);
      },
      async clear() { write('rec', {}); },
      async getMeta(k) { const v = read('meta:' + k); return v === null ? undefined : v; },
      async setMeta(k, v) { write('meta:' + k, v); },
      async putFile() { throw new Error('Chế độ lưu dự phòng không hỗ trợ đính kèm tệp'); },
      async getFile() { return null; }, async delFile() { }, async allFiles() { return []; }
    };
  }

  /* ---------- Store ---------- */
  const S = A.Store = {
    adapter: null, data: {}, cfg: {}, listeners: [], ready: false,
    HIST_MAX: 4000,

    async init() {
      let ad = null;
      try { if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('no idb'); ad = IdbAdapter(); await ad.open(); }
      catch (e) { ad = LsAdapter(); await ad.open(); }
      S.adapter = ad;
      const all = await ad.loadAll();
      S.data = {};
      Object.keys(all).forEach(c => { S.data[c] = new Map(all[c].map(r => [r.id, r])); });
      S.cfg = (await ad.getMeta('config')) || {};
      S.ready = true;
    },
    coll(c) { return S.data[c] || (S.data[c] = new Map()); },
    all(c) { return Array.from(S.coll(c).values()); },
    get(c, id) { return id ? S.coll(c).get(id) || null : null; },
    count(c) { return S.coll(c).size; },
    on(fn) { S.listeners.push(fn); },
    emit(info) { S.listeners.forEach(fn => { try { fn(info || {}); } catch (e) { console.error(e); } }); },

    user() { return (S.cfg.nguoiDung || '').trim() || 'Chưa đặt tên'; },

    /* Lưu 1 bản ghi (thêm hoặc sửa). opts: {silent, noHistory, note} */
    async save(c, rec, opts) {
      opts = opts || {};
      const now = U.nowStamp(), old = rec.id ? S.get(c, rec.id) : null;
      const v = Object.assign({}, old || {}, rec);
      if (!v.id) v.id = U.uid(c.slice(0, 2));
      if (!old) v.createdAt = v.createdAt || now;
      v.updatedAt = now; v.updatedBy = S.user();
      const ops = [{ op: 'put', c, v }];
      const h = (!opts.noHistory && A.Schema && A.Schema.tracked(c)) ? S._hist(c, old, v, old ? 'Sửa' : 'Thêm', opts.note) : null;
      if (h) ops.push({ op: 'put', c: 'lichsu', v: h });
      await S.adapter.bulk(ops);
      S.coll(c).set(v.id, v); if (h) S.coll('lichsu').set(h.id, h);
      if (!opts.silent) S.emit({ c, id: v.id });
      return v;
    },
    /* Lưu nhiều bản ghi trong 1 giao dịch. items: [{c, rec}] */
    async saveMany(items, opts) {
      opts = opts || {};
      const now = U.nowStamp(), ops = [], staged = [];
      items.forEach(({ c, rec }) => {
        const old = rec.id ? S.get(c, rec.id) : null;
        const v = Object.assign({}, old || {}, rec);
        if (!v.id) v.id = U.uid(c.slice(0, 2));
        if (!old) v.createdAt = v.createdAt || now;
        v.updatedAt = now; v.updatedBy = S.user();
        ops.push({ op: 'put', c, v }); staged.push([c, v]);
      });
      if (opts.note && items.length) {
        const h = { id: U.uid('ls'), time: now, user: S.user(), coll: items[0].c, recId: '', action: 'Nhập hàng loạt', title: opts.note, changes: [] };
        ops.push({ op: 'put', c: 'lichsu', v: h }); staged.push(['lichsu', h]);
      }
      await S.adapter.bulk(ops);
      staged.forEach(([c, v]) => S.coll(c).set(v.id, v));
      if (!opts.silent) S.emit({ bulk: true });
      return staged.filter(x => x[0] !== 'lichsu').map(x => x[1]);
    },
    async remove(c, id, opts) {
      opts = opts || {};
      const old = S.get(c, id); if (!old) return;
      const ops = [{ op: 'del', c, id }];
      const h = (A.Schema && A.Schema.tracked(c)) ? S._hist(c, old, null, 'Xóa') : null;
      if (h) ops.push({ op: 'put', c: 'lichsu', v: h });
      await S.adapter.bulk(ops);
      S.coll(c).delete(id); if (h) S.coll('lichsu').set(h.id, h);
      for (const f of (old.dinhKem || [])) if (f.fileId) { try { await S.adapter.delFile(f.fileId); } catch (e) { } }
      if (!opts.silent) S.emit({ c, id });
    },
    async removeMany(pairs, note) { // [[c,id]]
      const ops = pairs.map(([c, id]) => ({ op: 'del', c, id }));
      const h = { id: U.uid('ls'), time: U.nowStamp(), user: S.user(), coll: pairs[0] ? pairs[0][0] : '', recId: '', action: 'Xóa hàng loạt', title: note || '', changes: [] };
      ops.push({ op: 'put', c: 'lichsu', v: h });
      await S.adapter.bulk(ops);
      pairs.forEach(([c, id]) => S.coll(c).delete(id)); S.coll('lichsu').set(h.id, h);
      S.emit({ bulk: true });
    },

    _hist(c, old, v, action, note) {
      const sc = A.Schema.get(c); const changes = [];
      if (old && v) {
        A.Schema.diff(c, old, v).forEach(d => changes.push(d));
        if (!changes.length) return null;           // không có gì thay đổi → không ghi
      }
      const src = v || old;
      return {
        id: U.uid('ls'), time: U.nowStamp(), user: S.user(), coll: c, recId: src.id, action,
        title: U.trunc(sc && sc.title ? sc.title(src) : (src.ten || src.id), 140), changes, note: note || ''
      };
    },
    async trimHistory() {
      const all = S.all('lichsu'); if (all.length <= S.HIST_MAX) return;
      all.sort((a, b) => a.time < b.time ? -1 : 1);
      const drop = all.slice(0, all.length - S.HIST_MAX);
      await S.adapter.bulk(drop.map(h => ({ op: 'del', c: 'lichsu', id: h.id })));
      drop.forEach(h => S.coll('lichsu').delete(h.id));
    },

    /* Cấu hình */
    async setCfg(patch) { Object.assign(S.cfg, patch); await S.adapter.setMeta('config', S.cfg); S.emit({ cfg: true }); },

    /* Tệp đính kèm */
    async addFile(file) {
      if (S.adapter.noFiles) throw new Error('Trình duyệt đang ở chế độ lưu dự phòng, không đính kèm được tệp. Hãy dùng liên kết.');
      const id = U.uid('f');
      await S.adapter.putFile({ id, name: file.name, type: file.type || 'application/octet-stream', size: file.size, blob: file });
      return { fileId: id, ten: file.name, size: file.size };
    },
    async openFile(att) {
      const f = await S.adapter.getFile(att.fileId);
      if (!f) throw new Error('Không tìm thấy tệp trong kho lưu của trình duyệt này.');
      return f;
    },

    /* Sao lưu / khôi phục */
    async exportAll(withFiles) {
      const data = {}; Object.keys(S.data).forEach(c => { data[c] = S.all(c); });
      const out = { app: A.APP_ID, version: A.VERSION, schema: 1, exportedAt: U.nowStamp(), exportedBy: S.user(), config: S.cfg, data, files: [] };
      if (withFiles) {
        const files = await S.adapter.allFiles();
        for (const f of files) out.files.push({ id: f.id, name: f.name, type: f.type, size: f.size, b64: await blobToB64(f.blob) });
      }
      return out;
    },
    validateBackup(obj) {
      if (!obj || typeof obj !== 'object') return 'Tệp không phải JSON hợp lệ.';
      if (obj.app !== A.APP_ID) return 'Tệp không phải bản sao lưu của phần mềm này (thiếu mã nhận diện "' + A.APP_ID + '").';
      if (!obj.data || typeof obj.data !== 'object') return 'Tệp sao lưu thiếu phần dữ liệu.';
      for (const c of Object.keys(obj.data)) {
        if (!Array.isArray(obj.data[c])) return 'Phần dữ liệu "' + c + '" không đúng cấu trúc.';
        if (obj.data[c].some(r => !r || typeof r !== 'object' || !r.id)) return 'Phần dữ liệu "' + c + '" có bản ghi thiếu mã (id).';
      }
      return '';
    },
    /* mode: 'replace' (thay toàn bộ) | 'merge' (gộp: bản ghi sửa sau cùng thắng) */
    async importAll(obj, mode) {
      const err = S.validateBackup(obj); if (err) throw new Error(err);
      const stat = { them: 0, capNhat: 0, boQua: 0 };
      if (mode === 'replace') {
        await S.adapter.clear(); S.data = {};
        const ops = [];
        Object.keys(obj.data).forEach(c => obj.data[c].forEach(v => { ops.push({ op: 'put', c, v }); stat.them++; }));
        await S.adapter.bulk(ops);
        Object.keys(obj.data).forEach(c => { S.data[c] = new Map(obj.data[c].map(r => [r.id, r])); });
        if (obj.config) { S.cfg = obj.config; await S.adapter.setMeta('config', S.cfg); }
      } else {
        const ops = [];
        Object.keys(obj.data).forEach(c => obj.data[c].forEach(v => {
          const cur = S.get(c, v.id);
          if (!cur) { ops.push({ op: 'put', c, v }); stat.them++; }
          else if ((v.updatedAt || v.time || '') > (cur.updatedAt || cur.time || '')) { ops.push({ op: 'put', c, v }); stat.capNhat++; }
          else stat.boQua++;
        }));
        await S.adapter.bulk(ops);
        ops.forEach(o => S.coll(o.c).set(o.v.id, o.v));
      }
      if (!S.adapter.noFiles) for (const f of (obj.files || [])) {
        try { await S.adapter.putFile({ id: f.id, name: f.name, type: f.type, size: f.size, blob: b64ToBlob(f.b64, f.type) }); } catch (e) { }
      }
      const h = { id: U.uid('ls'), time: U.nowStamp(), user: S.user(), coll: 'hethong', recId: '', action: mode === 'replace' ? 'Khôi phục (thay toàn bộ)' : 'Khôi phục (gộp)', title: 'Từ bản sao lưu ngày ' + U.fmtDateTime(obj.exportedAt), changes: [] };
      await S.adapter.bulk([{ op: 'put', c: 'lichsu', v: h }]); S.coll('lichsu').set(h.id, h);
      S.emit({ bulk: true, cfg: true });
      return stat;
    },
    /* Bản chụp an toàn trước thao tác lớn (giữ 3 bản gần nhất, không kèm tệp) */
    async snapshot(reason) {
      const snap = await S.exportAll(false); snap.reason = reason;
      const list = (await S.adapter.getMeta('snapshots')) || [];
      list.unshift(snap); while (list.length > 3) list.pop();
      try { await S.adapter.setMeta('snapshots', list); } catch (e) { console.warn('Không lưu được bản chụp', e); }
    },
    async snapshots() { return (await S.adapter.getMeta('snapshots')) || []; },
    async wipe() { await S.adapter.clear(); S.data = {}; S.emit({ bulk: true }); }
  };

  function blobToB64(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  }
  function b64ToBlob(b64, type) {
    const bin = atob(b64 || ''), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type || 'application/octet-stream' });
  }
})(App);
