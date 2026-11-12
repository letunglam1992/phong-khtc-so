/* ============================================================
   40-ui.js — Thành phần giao diện dùng chung
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, Sc = A.Schema, e = U.esc, ic = A.icon;
  const UI = A.UI = {};
  const $ = UI.$ = (sel, root) => (root || document).querySelector(sel);
  const $$ = UI.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  UI.on = (root, ev, sel, fn) => root.addEventListener(ev, x => { const t = x.target.closest(sel); if (t && root.contains(t)) fn(t, x); });
  UI.el = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };

  /* ---------- Thông báo ---------- */
  UI.toast = (msg, type, act) => {
    let box = $('.toasts'); if (!box) { box = UI.el('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(box); }
    const t = UI.el('<div class="toast ' + (type || '') + '"><span>' + e(msg) + '</span>' + (act ? '<button>' + e(act.label) + '</button>' : '') + '</div>');
    if (act) $('button', t).onclick = () => { act.fn(); t.remove(); };
    box.appendChild(t); setTimeout(() => t.remove(), act ? 9000 : (type === 'bad' ? 7000 : 3800));
  };
  UI.fail = err => { console.error(err); UI.toast('Không thực hiện được: ' + (err && err.message ? err.message : err), 'bad'); };

  /* ---------- Cửa sổ ---------- */
  const stack = [];
  UI.modal = o => {
    const ov = UI.el('<div class="ov" role="dialog" aria-modal="true"><div class="modal ' + (o.size || '') + '"><div class="modal-h"><h3>' + e(o.title || '') + (o.sub ? '<div class="sub">' + e(o.sub) + '</div>' : '') + '</h3><button class="btn icon" data-close aria-label="Đóng">' + ic('x') + '</button></div><div class="modal-b"></div>' + (o.footer === false ? '' : '<div class="modal-f"></div>') + '</div></div>');
    const body = $('.modal-b', ov), foot = $('.modal-f', ov), prevFocus = document.activeElement;
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const api = {
      el: ov, body, foot,
      close(force) { if (!force && o.beforeClose && !o.beforeClose()) return; ov.remove(); const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1); if (!stack.length) document.body.style.overflow = ''; if (o.onClose) o.onClose(); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (x) { } },
      setFooter(btns) { if (!foot) return; foot.innerHTML = ''; btns.forEach(b => { if (b === 'sp') { foot.appendChild(UI.el('<span class="sp"></span>')); return; } const el = UI.el('<button class="btn ' + (b.cls || '') + '">' + (b.icon ? ic(b.icon, 16) : '') + e(b.label) + '</button>'); el.onclick = () => b.on(api, el); foot.appendChild(el); }); }
    };
    if (o.buttons) api.setFooter(o.buttons);
    $('[data-close]', ov).onclick = () => api.close();
    ov.addEventListener('mousedown', x => { if (x.target === ov) api.close(); });
    document.body.appendChild(ov); document.body.style.overflow = 'hidden'; stack.push(api);
    setTimeout(() => { const f = $('input:not([type=hidden]),select,textarea,button.primary', body) || $('[data-close]', ov); if (f && !o.noFocus) f.focus(); }, 30);
    return api;
  };
  document.addEventListener('keydown', x => { if (x.key === 'Escape' && stack.length) { x.preventDefault(); stack[stack.length - 1].close(); } });
  UI.closeAll = () => { while (stack.length) stack[stack.length - 1].close(true); };
  UI.confirm = o => new Promise(res => {
    let done = false;
    const m = UI.modal({
      title: o.title, size: 'sm', body: '<div style="white-space:pre-wrap">' + e(o.msg || '') + '</div>' + (o.html || ''), onClose: () => { if (!done) res(false); },
      buttons: [{ label: o.cancel || 'Hủy', on: a => a.close() }, { label: o.ok || 'Đồng ý', cls: o.danger ? 'danger' : 'primary', on: a => { done = true; a.close(); res(true); } }]
    });
    return m;
  });

  /* ---------- Hiển thị nhỏ ---------- */
  UI.chip = (st, label) => '<span class="chip ' + e(st || '') + '">' + e(label) + '</span>';
  UI.pbar = (p, cls) => { const v = Math.max(0, Math.min(100, U.num(p))); return '<div class="pbar"><div class="bar ' + (cls || '') + '"><i style="width:' + v + '%"></i></div><b>' + U.fmtNum(v, v % 1 ? 1 : 0) + '%</b></div>'; };
  UI.empty = (title, text, btn) => '<div class="empty"><h4>' + e(title) + '</h4><p>' + e(text || '') + '</p>' + (btn || '') + '</div>';
  UI.who = id => { const n = Sc.refName('canbo', id); return n ? e(n) : '<span class="chip plain saphan">Chưa phân công</span>'; };
  UI.download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  UI.stamp = () => U.today().replace(/-/g, '');

  /* ============================================================
     FORM sinh từ khai báo trường
     ============================================================ */
  const FULL = ['textarea', 'rows', 'files', 'refs', 'multi'];
  function moneyStr(v) { return (v === '' || v === null || v === undefined) ? '' : U.fmtNum(v, Number.isInteger(+v) ? 0 : 2); }
  function refOptions(f, cur) {
    let list = S.all(f.ref);
    if (f.ref === 'canbo') list = list.filter(c => c.trangThai !== 'nghi' || c.id === cur || (Array.isArray(cur) && cur.includes(c.id)));
    return list.map(r => [r.id, f.ref === 'canbo' ? r.hoTen : f.ref === 'donvi' ? r.ten : U.trunc(Sc.C[f.ref].title(r), 110)]).sort((a, b) => f.ref === 'danhmuc' || f.ref === 'ngansach' ? 0 : U.cmp(a[1], b[1]));
  }
  function inputHtml(f, v, id, small) {
    const a = ' id="' + id + '" data-k="' + f.k + '"';
    switch (f.type) {
      case 'textarea': return '<textarea class="inp"' + a + ' rows="' + (small ? 1 : 3) + '">' + e(v || '') + '</textarea>';
      case 'date': return '<input class="inp" type="date"' + a + ' value="' + e(U.isISO(v) ? v : '') + '" min="1990-01-01" max="2100-12-31">';
      case 'money': return '<input class="inp num" inputmode="numeric" data-money' + (f.signed ? ' data-signed' : '') + a + ' value="' + e(moneyStr(v)) + '" autocomplete="off">';
      case 'number': return '<input class="inp" type="number" step="any"' + a + ' value="' + e(v === undefined || v === null ? '' : v) + '">';
      case 'percent': return '<input class="inp" type="number" min="0" max="100" step="1"' + a + ' value="' + e(v === undefined || v === null ? '' : v) + '">';
      case 'year': return '<input class="inp" type="number" min="1990" max="2100" step="1"' + a + ' value="' + e(v || '') + '">';
      case 'bool': return '<label class="check"><input type="checkbox"' + a + (v ? ' checked' : '') + '> Có</label>';
      case 'select': { const opts = Sc.options(f).slice(); if (v && !opts.some(o => o[0] === v)) opts.push([v, v + ' (giá trị cũ)']); return '<select class="sel"' + a + '>' + (f.required && f.def ? '' : '<option value="">— Chọn —</option>') + opts.filter(o => o[0] !== '').map(o => '<option value="' + e(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + '</select>'; }
      case 'ref': return '<select class="sel"' + a + '><option value="">— ' + (f.ref === 'canbo' ? 'Chưa phân công' : 'Không chọn') + ' —</option>' + refOptions(f, v).map(o => '<option value="' + e(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + '</select>';
      case 'multi': return '<div class="checks"' + a + '>' + Sc.options(f).map(o => '<label class="check"><input type="checkbox" value="' + e(o[0]) + '"' + ((v || []).includes(o[0]) ? ' checked' : '') + '> ' + e(o[1]) + '</label>').join('') + '</div>';
      default: return '<input class="inp" type="text"' + a + ' value="' + e(v || '') + '" autocomplete="off">';
    }
  }
  function readInput(f, el) {
    switch (f.type) {
      case 'money': { const n = U.parseNum(el.value); return n === null ? NaN : n; }
      case 'number': case 'percent': case 'year': return el.value === '' ? '' : +el.value;
      case 'bool': return el.checked;
      case 'multi': return $$('input:checked', el).map(x => x.value);
      case 'date': return el.value || '';
      default: return el.value.trim();
    }
  }
  function bindMoney(root) {
    UI.on(root, 'input', '[data-money]', el => {
      const neg = el.hasAttribute('data-signed') && el.value.trim().startsWith('-');
      const digits = el.value.replace(/[^\d]/g, ''); el.value = (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    });
  }

  /* o: {coll, rec, title, sections:[{t, keys}], onSaved, hide:[k], lock:{k:v}} */
  UI.form = o => {
    const sc = Sc.C[o.coll], isNew = !o.rec || !o.rec.id;
    const w = U.clone(o.rec || {});
    sc.fields.forEach(f => { if (w[f.k] === undefined) { if (f.def !== undefined) w[f.k] = f.def; else if (['rows', 'files', 'refs', 'multi'].includes(f.type)) w[f.k] = []; } });
    if (isNew && w.nam === undefined && Sc.field(o.coll, 'nam')) w.nam = A.year() || +U.today().slice(0, 4);
    const hide = new Set(o.hide || []);
    const secs = o.sections || sc.sections || [{ t: '', keys: sc.fields.map(f => f.k) }];
    let dirty = false;
    const root = document.createElement('div');

    const fieldBox = f => {
      const id = 'f_' + f.k, full = FULL.includes(f.type) || f.full;
      let inner;
      if (f.type === 'rows') inner = '<div data-rows="' + f.k + '"></div>';
      else if (f.type === 'files') inner = '<div data-files="' + f.k + '"></div>';
      else if (f.type === 'refs') inner = '<div data-refs="' + f.k + '"></div>';
      else inner = inputHtml(f, w[f.k], id);
      return '<div class="fld' + (full ? ' full' : '') + '" data-fld="' + f.k + '"><label ' + (['rows', 'files', 'refs', 'multi', 'bool'].includes(f.type) ? '' : 'for="' + id + '"') + '>' + e(f.label) + (f.required ? ' <span class="req">*</span>' : '') + '</label>' + inner + (f.help ? '<div class="help">' + e(f.help) + '</div>' : '') + '</div>';
    };
    root.innerHTML = '<form class="form" novalidate><div class="errbox hide" role="alert"></div>' + secs.map(s => (s.t ? '<div class="fsec">' + e(s.t) + '</div>' : '') + s.keys.filter(k => !hide.has(k)).map(k => fieldBox(Sc.field(o.coll, k))).join('')).join('') + '</form>';
    const form = $('form', root);
    bindMoney(form);
    form.addEventListener('input', () => { dirty = true; });
    form.addEventListener('change', () => { dirty = true; });
    form.addEventListener('submit', x => { x.preventDefault(); save(); });

    /* --- bảng con --- */
    const renderRows = f => {
      const box = $('[data-rows="' + f.k + '"]', form), rows = w[f.k] || (w[f.k] = []);
      box.innerHTML = '<div class="rows"><table><thead><tr>' + f.cols.map(c => '<th>' + e(c.label) + (c.required ? ' *' : '') + '</th>').join('') + '<th></th></tr></thead><tbody>' +
        (rows.length ? rows.map((r, i) => '<tr>' + f.cols.map(c => '<td>' + inputHtml(c, r[c.k] === undefined && c.def !== undefined ? (r[c.k] = c.def) : r[c.k], 'r_' + f.k + '_' + i + '_' + c.k, true).replace('data-k="' + c.k + '"', 'data-rk="' + c.k + '" data-ri="' + i + '" aria-label="' + e(c.label) + ' dòng ' + (i + 1) + '"') + '</td>').join('') + '<td class="x"><button type="button" class="btn icon" data-rdel="' + i + '" aria-label="Xóa dòng ' + (i + 1) + '">' + ic('trash', 16) + '</button></td></tr>').join('')
          : '<tr><td colspan="' + (f.cols.length + 1) + '" class="muted small" style="padding:10px">Chưa có dòng nào.</td></tr>') +
        '</tbody></table></div><button type="button" class="btn sm" data-radd style="margin-top:6px">' + ic('plus', 15) + 'Thêm dòng</button>';
      $('[data-radd]', box).onclick = () => { rows.push({}); dirty = true; renderRows(f); const ins = $$('tbody tr:last-child input,tbody tr:last-child select', box); if (ins[0]) ins[0].focus(); };
      $$('[data-rdel]', box).forEach(b => b.onclick = () => { rows.splice(+b.dataset.rdel, 1); dirty = true; renderRows(f); });
      $$('[data-rk]', box).forEach(el => {
        const cf = f.cols.find(c => c.k === el.dataset.rk);
        const h = () => { const v = readInput(cf, el); rows[+el.dataset.ri][cf.k] = (typeof v === 'number' && isNaN(v)) ? el.value : v; };
        el.addEventListener('input', h); el.addEventListener('change', h);
      });
    };
    /* --- chọn nhiều bản ghi --- */
    const renderRefs = f => {
      const box = $('[data-refs="' + f.k + '"]', form), ids = w[f.k] || (w[f.k] = []);
      const opts = refOptions(f, ids).filter(op => !ids.includes(op[0]));
      box.innerHTML = '<div class="checks">' + ids.map(id => '<span class="check" style="cursor:default">' + e(Sc.refName(f.ref, id) || '(đã xóa)') + ' <button type="button" class="btn icon" style="width:20px;height:20px" data-unref="' + e(id) + '" aria-label="Bỏ chọn">' + ic('x', 13) + '</button></span>').join('') +
        '<select class="sel" style="width:auto;max-width:100%;height:30px" aria-label="Thêm ' + e(f.label) + '"><option value="">+ Thêm…</option>' + opts.map(op => '<option value="' + e(op[0]) + '">' + e(op[1]) + '</option>').join('') + '</select></div>';
      $('select', box).onchange = x => { if (x.target.value) { ids.push(x.target.value); dirty = true; renderRefs(f); } };
      $$('[data-unref]', box).forEach(b => b.onclick = () => { ids.splice(ids.indexOf(b.dataset.unref), 1); dirty = true; renderRefs(f); });
    };
    /* --- tệp đính kèm --- */
    const renderFiles = f => {
      const box = $('[data-files="' + f.k + '"]', form), list = w[f.k] || (w[f.k] = []);
      box.innerHTML = '<div class="files">' + list.map((a, i) => '<div class="file">' + ic(a.url ? 'link' : 'clip', 16) + '<span class="nm">' + e(a.ten) + '</span>' + (a.size ? '<span class="muted small">' + U.fileSize(a.size) + '</span>' : '') + '<button type="button" class="btn icon" data-fdel="' + i + '" aria-label="Gỡ tệp">' + ic('x', 15) + '</button></div>').join('') + '</div>' +
        '<div class="gap" style="margin-top:6px"><label class="btn sm">' + ic('clip', 15) + 'Đính kèm tệp<input type="file" multiple class="sr"></label><button type="button" class="btn sm" data-flink>' + ic('link', 15) + 'Thêm liên kết</button><span class="help">Tệp lưu trong trình duyệt này, tối đa 15 MB mỗi tệp.</span></div>';
      $('input[type=file]', box).onchange = async x => {
        for (const file of x.target.files) {
          if (file.size > 15 * 1048576) { UI.toast('Tệp "' + file.name + '" lớn hơn 15 MB. Hãy dùng liên kết thay vì đính kèm.', 'bad'); continue; }
          try { list.push(await S.addFile(file)); dirty = true; } catch (er) { UI.fail(er); }
        }
        renderFiles(f);
      };
      $('[data-flink]', box).onclick = () => {
        const m = UI.modal({
          title: 'Thêm liên kết tài liệu', size: 'sm', body: '<div class="fld"><label for="lk_t">Tên hiển thị</label><input class="inp" id="lk_t"></div><div class="fld mt"><label for="lk_u">Đường dẫn (iOffice, Google Drive, thư mục dùng chung…)</label><input class="inp" id="lk_u" placeholder="https://…"></div>',
          buttons: [{ label: 'Hủy', on: a => a.close() }, { label: 'Thêm liên kết', cls: 'primary', on: a => { const u = $('#lk_u', a.body).value.trim(), t = $('#lk_t', a.body).value.trim(); if (!u) { UI.toast('Chưa nhập đường dẫn.', 'bad'); return; } list.push({ url: u, ten: t || u }); dirty = true; a.close(); renderFiles(f); } }]
        });
      };
      $$('[data-fdel]', box).forEach(b => b.onclick = () => { list.splice(+b.dataset.fdel, 1); dirty = true; renderFiles(f); });
    };
    const shown = secs.flatMap(s => s.keys).filter(k => !hide.has(k)).map(k => Sc.field(o.coll, k));
    shown.forEach(f => { if (f.type === 'rows') renderRows(f); if (f.type === 'refs') renderRefs(f); if (f.type === 'files') renderFiles(f); });
    if (o.afterRender) o.afterRender(form, w);

    function collect() {
      const r = Object.assign({}, w, o.lock || {}); const bad = [];
      shown.forEach(f => {
        if (['rows', 'refs', 'files'].includes(f.type)) return;
        const el = $('[data-k="' + f.k + '"]', form); if (!el) return;
        const v = readInput(f, el);
        if (typeof v === 'number' && isNaN(v)) { bad.push('"' + f.label + '" phải là số.'); r[f.k] = ''; } else r[f.k] = v;
      });
      shown.filter(f => f.type === 'rows').forEach(f => { r[f.k] = (r[f.k] || []).filter(row => f.cols.some(c => row[c.k] !== undefined && row[c.k] !== '' && row[c.k] !== null && !(c.def !== undefined && row[c.k] === c.def))); });
      return { r, bad };
    }
    async function save(skipWarn) {
      const { r, bad } = collect();
      if (sc.autoMa && !r.ma) r.ma = Sc.nextMa(o.coll);
      const chk = Sc.check(o.coll, r); const errs = bad.concat(chk.errors);
      const box = $('.errbox', form);
      $$('.fld.err', form).forEach(x => x.classList.remove('err'));
      if (errs.length) {
        box.classList.remove('hide'); box.innerHTML = '<b>Chưa lưu được. Cần sửa:</b><ul>' + errs.map(x => '<li>' + e(x) + '</li>').join('') + '</ul>';
        sc.fields.forEach(f => { if (errs.some(x => x.includes('"' + f.label + '"'))) { const fl = $('[data-fld="' + f.k + '"]', form); if (fl) fl.classList.add('err'); } });
        box.scrollIntoView({ block: 'nearest' }); return;
      }
      box.classList.add('hide');
      if (chk.warnings.length && !skipWarn) {
        const ok = await UI.confirm({ title: 'Kiểm tra lại trước khi lưu', msg: chk.warnings.map(x => '• ' + x).join('\n') + '\n\nVẫn lưu?', ok: 'Vẫn lưu', cancel: 'Quay lại sửa' });
        if (!ok) return;
      }
      if (sc.normalize) sc.normalize(r);
      try {
        const saved = await S.save(o.coll, r);
        dirty = false; modal.close(true);
        UI.toast(isNew ? 'Đã thêm ' + sc.label.toLowerCase() + '.' : 'Đã lưu thay đổi.', 'ok');
        if (o.onSaved) o.onSaved(saved);
      } catch (er) { UI.fail(er); }
    }
    const modal = UI.modal({
      title: o.title || ((isNew ? 'Thêm ' : 'Sửa ') + sc.label.toLowerCase()), sub: o.sub, size: o.size || (sc.fields.length > 14 ? 'lg' : ''), body: root,
      beforeClose: () => !dirty || window.confirm('Dữ liệu đang nhập chưa được lưu. Đóng và bỏ thay đổi?'),
      buttons: [{ label: 'Hủy', on: a => a.close() }, { label: isNew ? 'Thêm' : 'Lưu thay đổi', cls: 'primary', icon: 'check', on: () => save() }]
    });
    return modal;
  };

  /* ============================================================
     XEM CHI TIẾT sinh từ khai báo trường
     ============================================================ */
  UI.valueHtml = (f, v, rec) => {
    if (f.type === 'rows') {
      if (!(v || []).length) return '';
      return '<div class="rows"><table><thead><tr>' + f.cols.map(c => '<th>' + e(c.label) + '</th>').join('') + '</tr></thead><tbody>' + v.map(r => '<tr>' + f.cols.map(c => '<td class="' + (c.type === 'money' ? 'num' : '') + '">' + e(Sc.text(c, r[c.k])) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    if (f.type === 'files') return (v || []).map((a, i) => a.url ? '<a class="file" href="' + e(/^https?:\/\//i.test(a.url) ? a.url : '#') + '" target="_blank" rel="noopener">' + ic('link', 16) + '<span class="nm">' + e(a.ten) + '</span></a>' : '<button type="button" class="file" data-openfile="' + i + '" data-fk="' + f.k + '" style="cursor:pointer;width:100%;text-align:left">' + ic('clip', 16) + '<span class="nm">' + e(a.ten) + '</span><span class="muted small">' + U.fileSize(a.size || 0) + '</span>' + ic('download', 15) + '</button>').join('');
    if (f.type === 'ref' && v) { const n = Sc.refName(f.ref, v); return n ? (f.ref === 'canbo' || f.ref === 'donvi' ? e(n) : '<a href="#" data-open="' + f.ref + ':' + e(v) + '">' + e(n) + '</a>') : '<span class="muted">(bản ghi đã xóa)</span>'; }
    if (f.type === 'refs') return (v || []).map(id => { const n = Sc.refName(f.ref, id); return n ? (f.ref === 'canbo' ? '<span class="tag">' + e(n) + '</span>' : '<div><a href="#" data-open="' + f.ref + ':' + e(id) + '">' + e(n) + '</a></div>') : ''; }).join(' ');
    return e(Sc.text(f, v));
  };
  UI.dl = (coll, rec, keys) => {
    const sc = Sc.C[coll];
    const rows = (keys || sc.fields.map(f => f.k)).map(k => { const f = Sc.field(coll, k), h = UI.valueHtml(f, rec[k], rec); return h ? '<dt>' + e(f.label) + '</dt><dd>' + h + '</dd>' : ''; }).join('');
    return '<dl class="dl">' + rows + '</dl>';
  };
  UI.histHtml = (coll, id) => {
    const hs = S.all('lichsu').filter(h => h.coll === coll && h.recId === id).sort((a, b) => a.time < b.time ? 1 : -1);
    if (!hs.length) return '<p class="muted small">Chưa có lịch sử chỉnh sửa.</p>';
    return '<div class="tl">' + hs.map(h => '<div class="tl-i ' + (h.action === 'Thêm' ? 'hoanthanh' : 'dang') + '"><div class="tt">' + e(h.action) + ' — ' + e(h.user) + '</div><div class="dd">' + U.fmtDateTime(h.time) + '</div>' + (h.changes || []).map(c => '<div class="small"><b>' + e(c.label) + ':</b> <span class="muted">' + (e(c.cu) || '(trống)') + '</span> → ' + (e(c.moi) || '(trống)') + '</div>').join('') + '</div>').join('') + '</div>';
  };
  UI.bindDetail = (root, coll, rec) => {
    UI.on(root, 'click', '[data-open]', (t, x) => { x.preventDefault(); const [c, id] = t.dataset.open.split(':'); A.open(c, id); });
    UI.on(root, 'click', '[data-openfile]', async t => {
      try { const f = await S.openFile(rec[t.dataset.fk][+t.dataset.openfile]); UI.download(f.blob, f.name); } catch (er) { UI.fail(er); }
    });
  };
  UI.removeRec = async (coll, rec, after) => {
    const sc = Sc.C[coll]; let extra = '';
    if (coll === 'duan') { const n = S.all('von').filter(v => v.duAnId === rec.id).length + S.all('goithau').filter(g => g.duAnId === rec.id).length; if (n) extra = '\n\nLưu ý: có ' + n + ' kế hoạch vốn, gói thầu đang gắn với dự án này; các bản ghi đó được giữ lại nhưng mất liên kết.'; }
    if (coll === 'canbo') { const n = S.all('nhiemvu').filter(t => t.chuTriId === rec.id && t.trangThai !== 'hoanthanh').length; if (n) extra = '\n\nLưu ý: cán bộ này đang chủ trì ' + n + ' nhiệm vụ chưa hoàn thành. Nên chuyển sang trạng thái "Nghỉ, chuyển công tác" thay vì xóa.'; }
    if (coll === 'ngansach') { const n = S.all('ngansach').filter(x => x.parentId === rec.id).length; if (n) extra = '\n\nLưu ý: dòng này có ' + n + ' dòng con; các dòng con sẽ chuyển lên cấp trên.'; }
    const ok = await UI.confirm({ title: 'Xóa ' + sc.label.toLowerCase() + '?', msg: '"' + U.trunc(sc.title(rec), 160) + '"\n\nThao tác được ghi vào nhật ký. Muốn lấy lại phải khôi phục từ bản sao lưu.' + extra, ok: 'Xóa', danger: true });
    if (!ok) return false;
    try {
      if (coll === 'ngansach') await S.saveMany(S.all('ngansach').filter(x => x.parentId === rec.id).map(x => ({ c: 'ngansach', rec: Object.assign({}, x, { parentId: rec.parentId || '' }) })), { silent: true });
      await S.remove(coll, rec.id); UI.toast('Đã xóa.', 'ok'); if (after) after(); return true;
    } catch (er) { UI.fail(er); return false; }
  };
  /* o: {coll, id, head(html), keys, extraTabs:[{t, html(rec)}], actions:[{label,icon,on}], formOpts} */
  UI.detail = o => {
    const sc = Sc.C[o.coll], rec = S.get(o.coll, o.id);
    if (!rec) { UI.toast('Bản ghi không còn tồn tại.', 'bad'); return; }
    const tabs = [{ t: 'Thông tin', html: () => (A.extNote ? A.extNote(rec) : '') + (o.head ? o.head(rec) : '') + UI.dl(o.coll, rec, o.keys) }].concat(o.extraTabs || []).concat([{ t: 'Lịch sử cập nhật', html: () => UI.histHtml(o.coll, rec.id) }]);
    const body = document.createElement('div');
    const show = i => {
      body.innerHTML = '<div class="tabs" role="tablist">' + tabs.map((t, j) => '<button role="tab" aria-selected="' + (i === j) + '" class="' + (i === j ? 'on' : '') + '" data-tab="' + j + '">' + e(t.t) + '</button>').join('') + '</div><div>' + tabs[i].html(rec) + '</div>';
      $$('[data-tab]', body).forEach(b => b.onclick = () => show(+b.dataset.tab));
      if (tabs[i].bind) tabs[i].bind(body, rec, m);
    };
    const reopen = () => { m.close(true); UI.detail(o); };
    const m = UI.modal({
      title: sc.title(rec), sub: sc.label + (rec.ma ? ' · ' + rec.ma : '') + ' · cập nhật ' + U.fmtDateTime(rec.updatedAt) + ' bởi ' + (rec.updatedBy || '—'), size: o.size || 'lg', body, noFocus: true,
      buttons: [{ label: 'Xóa', cls: 'ghost', icon: 'trash', on: async a => { if (await UI.removeRec(o.coll, rec)) a.close(true); } }, 'sp']
        .concat((o.actions || []).map(x => ({ label: x.label, icon: x.icon, cls: x.cls, on: a => x.on(rec, a, reopen) })))
        .concat([{ label: 'Sửa', cls: 'primary', icon: 'edit', on: a => { a.close(true); UI.form(Object.assign({ coll: o.coll, rec, onSaved: () => UI.detail(o) }, o.formOpts || {})); } }])
    });
    UI.bindDetail(body, o.coll, rec);
    show(o.tab || 0);
    return m;
  };

  /* ============================================================
     BẢNG: sắp xếp, phân trang
     ============================================================ */
  // cfg: {cols:[{k,label,html(r),val(r),cls,noSort}], rows, onRow(r), page:25, sort:{k,dir}, state, foot(html), rowCls(r)}
  UI.table = (box, cfg) => {
    const st = cfg.state || (cfg.state = {}); st.page = st.page || 0; st.size = st.size || cfg.page || 25;
    if (!st.sort && cfg.sort) st.sort = cfg.sort;
    const draw = () => {
      let rows = cfg.rows.slice();
      if (st.sort) { const c = cfg.cols.find(x => x.k === st.sort.k); if (c) { const val = c.val || (r => r[c.k]); rows.sort((a, b) => { const x = val(a), y = val(b); const ex = x === '' || x === null || x === undefined, ey = y === '' || y === null || y === undefined; if (ex || ey) return ex && ey ? 0 : ex ? 1 : -1; return U.cmp(x, y) * st.sort.dir; }); } }
      const pages = Math.max(1, Math.ceil(rows.length / st.size)); if (st.page >= pages) st.page = pages - 1;
      const view = rows.slice(st.page * st.size, st.page * st.size + st.size);
      box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cfg.cols.map(c => '<th scope="col" class="' + (c.noSort ? '' : 'sort ') + (c.cls || '') + '" ' + (c.noSort ? '' : 'data-sort="' + c.k + '" tabindex="0" aria-sort="' + (st.sort && st.sort.k === c.k ? (st.sort.dir > 0 ? 'ascending' : 'descending') : 'none') + '"') + '>' + e(c.label) + (st.sort && st.sort.k === c.k ? '<span class="ar">' + (st.sort.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>').join('') + '</tr></thead><tbody>' +
        view.map(r => '<tr class="' + (cfg.onRow ? 'click ' : '') + (cfg.rowCls ? cfg.rowCls(r) : '') + '" data-id="' + e(r.id || '') + '"' + (cfg.onRow ? ' tabindex="0"' : '') + '>' + cfg.cols.map(c => '<td class="' + (c.cls || '') + '">' + (c.html ? c.html(r) : e(r[c.k] === undefined || r[c.k] === null ? '' : r[c.k])) + '</td>').join('') + '</tr>').join('') +
        '</tbody>' + (cfg.foot ? '<tfoot>' + cfg.foot(rows) + '</tfoot>' : '') + '</table></div>' +
        '<div class="pager"><span>' + (rows.length ? (st.page * st.size + 1) + '–' + Math.min(rows.length, (st.page + 1) * st.size) + ' / ' : '') + rows.length + ' dòng</span><span class="sp"></span>' +
        (pages > 1 ? '<button class="btn sm" data-pg="-1"' + (st.page === 0 ? ' disabled' : '') + '>' + ic('chevL', 14) + 'Trước</button><span>Trang ' + (st.page + 1) + '/' + pages + '</span><button class="btn sm" data-pg="1"' + (st.page >= pages - 1 ? ' disabled' : '') + '>Sau' + ic('chevR', 14) + '</button>' : '') +
        '<select class="sel" style="width:auto;height:30px" aria-label="Số dòng mỗi trang">' + [25, 50, 100, 500].map(n => '<option' + (n === st.size ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>';
      $$('[data-sort]', box).forEach(th => { const go = () => { const k = th.dataset.sort; st.sort = st.sort && st.sort.k === k ? { k, dir: -st.sort.dir } : { k, dir: 1 }; draw(); }; th.onclick = go; th.onkeydown = x => { if (x.key === 'Enter') go(); }; });
      $$('[data-pg]', box).forEach(b => b.onclick = () => { st.page += +b.dataset.pg; draw(); });
      $('.pager select', box).onchange = x => { st.size = +x.target.value; st.page = 0; draw(); };
      if (cfg.onRow) $$('tbody tr', box).forEach(tr => { const go = x => { if (x.target.closest('button,a,input,select')) return; const r = cfg.rows.find(q => q.id === tr.dataset.id); if (r) cfg.onRow(r); }; tr.onclick = go; tr.onkeydown = x => { if (x.key === 'Enter') go(x); }; });
      if (cfg.after) cfg.after(box, view);
    };
    draw(); return { draw };
  };

  /* ============================================================
     MÀN HÌNH DANH SÁCH chung (tìm, lọc, thêm, nhập/xuất Excel)
     ============================================================ */
  A.vs = {};  // trạng thái từng màn hình (giữ khi chuyển trang)
  /* cfg: {key, coll, rows(), cols, filters:[{k,label,opts():[[v,l]],test(r,v)}], searchText(r), onRow, add:true|fn, addLabel, excel:true, sort, extra:[html], empty:{t,p}, top(html), foot} */
  UI.listView = (root, cfg) => {
    const st = A.vs[cfg.key] || (A.vs[cfg.key] = { q: '', f: {}, tbl: {} });
    if (cfg.preset) { st.f = Object.assign({}, cfg.preset); st.q = ''; st.tbl.page = 0; }
    const sc = Sc.C[cfg.coll];
    root.innerHTML = (cfg.top || '') + '<div class="toolbar"><div class="search">' + ic('search', 16) + '<input class="inp" type="search" placeholder="Tìm trong danh sách…" value="' + e(st.q) + '" aria-label="Tìm trong danh sách"></div>' +
      (cfg.filters || []).map(f => '<select class="sel" data-f="' + f.k + '" aria-label="' + e(f.label) + '"><option value="">' + e(f.label) + ': tất cả</option>' + f.opts().map(o => '<option value="' + e(o[0]) + '"' + (st.f[f.k] === o[0] ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + '</select>').join('') +
      '<button class="btn sm ghost" data-clear>Bỏ lọc</button><span class="sp"></span>' + (cfg.extra || []).join('') +
      (cfg.excel !== false ? '<button class="btn" data-xls title="Xuất danh sách đang lọc ra Excel">' + ic('download', 16) + 'Xuất Excel</button><button class="btn" data-imp title="Nhập từ tệp Excel theo mẫu">' + ic('upload', 16) + 'Nhập Excel</button>' : '') +
      (cfg.add !== false ? '<button class="btn primary" data-add>' + ic('plus', 16) + e(cfg.addLabel || 'Thêm ' + sc.label.toLowerCase()) + '</button>' : '') + '</div><div data-body></div>';
    const body = $('[data-body]', root);
    const text = cfg.searchText || (r => sc.fields.filter(f => ['text', 'textarea', 'select', 'ref', 'refs'].includes(f.type)).map(f => Sc.text(f, r[f.k])).join(' '));
    let current = [];
    const draw = () => {
      const all = cfg.rows(), nq = U.norm(st.q), words = nq ? nq.split(' ') : [];
      current = all.filter(r => {
        for (const f of (cfg.filters || [])) { const v = st.f[f.k]; if (v && !f.test(r, v)) return false; }
        if (words.length) { const hay = U.norm(text(r)); if (!words.every(w => hay.includes(w))) return false; }
        return true;
      });
      const filtered = !!(nq || Object.values(st.f).some(Boolean));
      $('[data-clear]', root).classList.toggle('hide', !filtered);
      if (!all.length) { body.innerHTML = '<div class="card">' + UI.empty((cfg.empty && cfg.empty.t) || 'Chưa có dữ liệu', (cfg.empty && cfg.empty.p) || 'Bấm "Thêm" để nhập bản ghi đầu tiên, hoặc "Nhập Excel" để đưa dữ liệu có sẵn vào.') + '</div>'; return; }
      if (!current.length) { body.innerHTML = '<div class="card">' + UI.empty('Không có dòng nào khớp điều kiện lọc', 'Thử bỏ bớt điều kiện hoặc từ khóa tìm kiếm.', '<button class="btn" data-clear2>Bỏ lọc</button>') + '</div>'; $('[data-clear2]', body).onclick = clear; return; }
      if (cfg.render) cfg.render(body, current); else UI.table(body, { cols: cfg.cols, rows: current, onRow: cfg.onRow, sort: cfg.sort, state: st.tbl, foot: cfg.foot, rowCls: cfg.rowCls });
    };
    const clear = () => { st.q = ''; st.f = {}; $('.search input', root).value = ''; $$('[data-f]', root).forEach(s => s.value = ''); draw(); };
    $('.search input', root).addEventListener('input', U.debounce(x => { st.q = x.target.value; st.tbl.page = 0; draw(); }, 160));
    $$('[data-f]', root).forEach(s => s.onchange = () => { st.f[s.dataset.f] = s.value; st.tbl.page = 0; draw(); });
    $('[data-clear]', root).onclick = clear;
    const add = $('[data-add]', root); if (add) add.onclick = () => typeof cfg.add === 'function' ? cfg.add() : UI.form(Object.assign({ coll: cfg.coll }, cfg.formOpts || {}));
    const xls = $('[data-xls]', root); if (xls) xls.onclick = () => UI.exportColl(cfg.coll, current, cfg.xlsName);
    const imp = $('[data-imp]', root); if (imp) imp.onclick = () => UI.importColl(cfg.coll, cfg.importDefaults);
    draw();
    return { draw, rows: () => current };
  };

  /* ============================================================
     EXCEL
     ============================================================ */
  UI.xlsx = (name, sheets) => {
    const wb = XLSX.utils.book_new();
    sheets.forEach(s => { const ws = XLSX.utils.aoa_to_sheet(s.aoa); if (s.widths) ws['!cols'] = s.widths.map(w => ({ wch: w })); if (s.merges) ws['!merges'] = s.merges; XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31)); });
    XLSX.writeFile(wb, name);
  };
  const xField = f => f.type !== 'files';
  const xVal = (f, v) => {
    if (v === undefined || v === null || v === '') return '';
    if (f.type === 'money' || f.type === 'number' || f.type === 'percent' || f.type === 'year') return +v;
    if (f.type === 'rows') return (v || []).map(r => f.cols.map(c => Sc.text(c, r[c.k])).join(' | ')).join('\n');
    if (f.type === 'ref' && f.ref === 'canbo') { const c = S.get('canbo', v); return c ? c.hoTen : ''; }
    if (f.type === 'refs' && f.ref === 'canbo') return (v || []).map(id => { const c = S.get('canbo', id); return c ? c.hoTen : ''; }).filter(Boolean).join('; ');
    if (f.type === 'ref' && f.ref === 'donvi') { const c = S.get('donvi', v); return c ? c.ten : ''; }
    if (f.type === 'refs') return (v || []).map(id => Sc.refName(f.ref, id)).filter(Boolean).join('; ');
    return Sc.text(f, v);
  };
  UI.exportColl = (coll, rows, name) => {
    const sc = Sc.C[coll], fs = sc.fields.filter(xField);
    const aoa = [fs.map(f => f.label)].concat(rows.map(r => fs.map(f => xVal(f, r[f.k]))));
    UI.xlsx((name || U.norm(sc.label).replace(/[^a-z0-9]+/g, '-')) + '-' + UI.stamp() + '.xlsx', [{ name: 'Du lieu', aoa, widths: fs.map(f => ['textarea', 'rows'].includes(f.type) ? 46 : f.type === 'money' ? 18 : 22) }]);
    UI.toast('Đã xuất ' + rows.length + ' dòng ra Excel.', 'ok');
  };
  UI.templateColl = coll => {
    const sc = Sc.C[coll], fs = sc.fields.filter(f => xField(f) && f.type !== 'rows');
    const guide = [['Cột', 'Bắt buộc', 'Kiểu dữ liệu / giá trị cho phép']].concat(fs.map(f => [f.label, f.required ? 'Có' : '', f.type === 'date' ? 'Ngày dạng dd/mm/yyyy' : f.type === 'money' ? 'Số (đồng)' : f.type === 'percent' ? 'Số 0–100' : f.type === 'year' ? 'Năm, ví dụ 2026' : f.type === 'bool' ? 'x hoặc Có' : (f.type === 'select' || f.type === 'multi') ? Sc.options(f).filter(o => o[0] !== '').map(o => o[1]).join(' / ') : f.type === 'ref' ? 'Tên đúng như trong phần mềm (' + Sc.C[f.ref].label + ')' : f.type === 'refs' ? 'Nhiều tên, cách nhau bằng dấu chấm phẩy (' + Sc.C[f.ref].label + ')' : 'Văn bản']));
    UI.xlsx('mau-nhap-' + U.norm(sc.label).replace(/[^a-z0-9]+/g, '-') + '.xlsx', [{ name: 'Du lieu', aoa: [fs.map(f => f.label)], widths: fs.map(() => 24) }, { name: 'Huong dan', aoa: guide, widths: [36, 10, 90] }]);
  };
  UI.pickFile = accept => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
  UI.readWorkbook = async file => XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
  // Chuyển giá trị ô Excel → giá trị trường. Trả {v} hoặc {err}
  function xParse(f, cell) {
    if (cell === null || cell === undefined || String(cell).trim() === '') return { v: ['refs', 'multi'].includes(f.type) ? [] : '' };
    const s = String(cell).trim(), n = U.norm(s);
    switch (f.type) {
      case 'date': { const d = U.parseDate(cell); return d === null ? { err: 'ngày "' + s + '" không hợp lệ' } : { v: d }; }
      case 'money': case 'number': case 'percent': case 'year': { const x = U.parseNum(cell); return (x === null || x === '') ? { err: '"' + s + '" không phải số' } : { v: f.type === 'year' ? Math.round(x) : x }; }
      case 'bool': return { v: ['x', 'co', '1', 'true', 'yes'].includes(n) };
      case 'select': { const o = Sc.options(f).find(q => U.norm(q[1]) === n || U.norm(q[0]) === n); if (o) return { v: o[0] }; return f.list ? { v: s } : { err: 'giá trị "' + s + '" không có trong danh sách' }; }
      case 'multi': { const out = []; for (const p of s.split(/[;,]/)) { const o = Sc.options(f).find(q => U.norm(q[1]) === U.norm(p) || U.norm(q[0]) === U.norm(p)); if (!o) return { err: 'giá trị "' + p.trim() + '" không có trong danh sách' }; out.push(o[0]); } return { v: out }; }
      case 'ref': { const r = findRef(f.ref, s); return r ? { v: r.id } : { err: 'không tìm thấy ' + Sc.C[f.ref].label.toLowerCase() + ' "' + U.trunc(s, 50) + '"' }; }
      case 'refs': { const out = []; for (const p of s.split(';')) { if (!p.trim()) continue; const r = findRef(f.ref, p.trim()); if (!r) return { err: 'không tìm thấy ' + Sc.C[f.ref].label.toLowerCase() + ' "' + U.trunc(p.trim(), 50) + '"' }; out.push(r.id); } return { v: out }; }
      default: return { v: s };
    }
  }
  function findRef(coll, s) {
    const n = U.norm(s);
    return S.all(coll).find(r => [r.hoTen, r.tenGoi, r.ten, r.tenTat, r.ma, r.soKyHieu, r.so].some(x => x && U.norm(x) === n)) || null;
  }
  UI.importColl = async (coll, defaults) => {
    const sc = Sc.C[coll], fs = sc.fields.filter(f => xField(f) && f.type !== 'rows');
    const m = UI.modal({
      title: 'Nhập ' + sc.label.toLowerCase() + ' từ Excel', body: '<p>Dùng tệp Excel có dòng tiêu đề trùng tên cột của phần mềm. Dòng sai dữ liệu hoặc trùng sẽ được báo trước khi nhập; không có gì được ghi cho đến khi bấm "Nhập".</p><div class="gap"><button class="btn" data-tpl>' + ic('download', 16) + 'Tải tệp mẫu</button><button class="btn primary" data-pick>' + ic('upload', 16) + 'Chọn tệp Excel</button></div><div data-res class="mt"></div>',
      buttons: [{ label: 'Đóng', on: a => a.close() }]
    });
    $('[data-tpl]', m.body).onclick = () => UI.templateColl(coll);
    $('[data-pick]', m.body).onclick = async () => {
      const file = await UI.pickFile('.xlsx,.xls,.csv'); if (!file) return;
      try {
        const wb = await UI.readWorkbook(file), ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
        let hr = -1, map = {};
        for (let i = 0; i < Math.min(rows.length, 15); i++) { const mm = {}; (rows[i] || []).forEach((c, j) => { const f = fs.find(q => U.norm(q.label) === U.norm(c)); if (f) mm[f.k] = j; }); if (Object.keys(mm).length >= 2 || (Object.keys(mm).length === 1 && fs.length < 3)) { hr = i; map = mm; break; } }
        const res = $('[data-res]', m.body);
        if (hr < 0) { res.innerHTML = '<div class="note bad">Không nhận ra dòng tiêu đề. Tên cột phải trùng với tệp mẫu (ví dụ: "' + e(fs[0].label) + '", "' + e(fs[1].label) + '").</div>'; return; }
        const miss = fs.filter(f => f.required && map[f.k] === undefined && !(defaults && defaults[f.k] !== undefined));
        if (miss.length) { res.innerHTML = '<div class="note bad">Tệp thiếu cột bắt buộc: ' + miss.map(f => e(f.label)).join(', ') + '.</div>'; return; }
        const good = [], bad = [], dup = [], seen = new Set();
        for (let i = hr + 1; i < rows.length; i++) {
          const row = rows[i] || []; if (!row.some(c => c !== null && String(c).trim() !== '')) continue;
          const rec = Object.assign({}, defaults || {}), errs = [];
          fs.forEach(f => { if (map[f.k] === undefined) return; const p = xParse(f, row[map[f.k]]); if (p.err) errs.push(f.label + ': ' + p.err); else rec[f.k] = p.v; });
          sc.fields.forEach(f => { if (rec[f.k] === undefined) { if (f.def !== undefined) rec[f.k] = f.def; else if (['rows', 'files', 'refs', 'multi'].includes(f.type)) rec[f.k] = []; } });
          const chk = errs.length ? { errors: errs, warnings: [] } : Sc.check(coll, rec);
          if (chk.errors.length) { bad.push({ line: i + 1, errs: chk.errors }); continue; }
          const key = sc.unique ? sc.unique(rec) : '';
          const isDup = chk.warnings.some(x => x.startsWith('Đã có bản ghi trùng')) || (key && key.replace(/\|/g, '') && seen.has(key));
          if (key) seen.add(key);
          (isDup ? dup : good).push({ line: i + 1, rec });
        }
        res.innerHTML = '<div class="note">Tệp <b>' + e(file.name) + '</b> — nhận ' + Object.keys(map).length + '/' + fs.length + ' cột.</div>' +
          '<div class="kpis mt"><div class="kpi ok static"><span class="k-l">Hợp lệ</span><span class="k-v">' + good.length + '</span></div><div class="kpi warn static"><span class="k-l">Trùng với dữ liệu đã có</span><span class="k-v">' + dup.length + '</span></div><div class="kpi bad static"><span class="k-l">Lỗi, không nhập</span><span class="k-v">' + bad.length + '</span></div></div>' +
          (bad.length ? '<div class="note bad mt"><b>Các dòng lỗi:</b><ul style="margin:4px 0 0;padding-left:18px">' + bad.slice(0, 12).map(b => '<li>Dòng ' + b.line + ': ' + e(b.errs.join('; ')) + '</li>').join('') + (bad.length > 12 ? '<li>… và ' + (bad.length - 12) + ' dòng khác</li>' : '') + '</ul></div>' : '') +
          (dup.length ? '<label class="check mt"><input type="checkbox" data-dup> Nhập cả ' + dup.length + ' dòng trùng (tạo bản ghi mới)</label>' : '');
        m.setFooter([{ label: 'Đóng', on: a => a.close() }, {
          label: 'Nhập ' + good.length + ' dòng hợp lệ', cls: 'primary', icon: 'check', on: async a => {
            const withDup = $('[data-dup]', m.body) && $('[data-dup]', m.body).checked, list = good.concat(withDup ? dup : []);
            if (!list.length) { UI.toast('Không có dòng nào để nhập.', 'bad'); return; }
            try {
              const items = []; let seq = 0;
              list.forEach(x => { if (sc.autoMa && !x.rec.ma) { const base = Sc.nextMa(coll); x.rec.ma = base.replace(/(\d+)$/, d => String(+d + seq++).padStart(3, '0')); } if (sc.normalize) sc.normalize(x.rec); items.push({ c: coll, rec: x.rec }); });
              await S.saveMany(items, { note: 'Nhập ' + items.length + ' ' + sc.label.toLowerCase() + ' từ tệp ' + file.name });
              a.close(); UI.toast('Đã nhập ' + items.length + ' dòng.', 'ok');
            } catch (er) { UI.fail(er); }
          }
        }]);
      } catch (er) { UI.fail(er); }
    };
  };

  /* ============================================================
     BIỂU ĐỒ SVG (không phụ thuộc thư viện ngoài)
     ============================================================ */
  UI.PAL = { ok: 'var(--ok)', info: 'var(--info)', warn: 'var(--warn)', bad: 'var(--bad)', idle: 'var(--idle)', teal: 'var(--teal)', violet: 'var(--violet)', acc: 'var(--accent)' };
  const nice = max => { if (max <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(max))), n = max / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
  // Cột nhóm. o: {cats:[], series:[{name,color,vals:[]}], fmt, h, line:{name,color,vals}}
  UI.bars = o => {
    const W = 720, H = o.h || 250, L = 46, R = 10, T = 14, B = 30, n = o.cats.length, fmt = o.fmt || (v => U.fmtNum(v, 0));
    const all = o.series.flatMap(s => s.vals).concat(o.line ? o.line.vals : []).filter(v => v !== null && v !== undefined);
    const max = nice(Math.max(1, ...all)), pw = (W - L - R) / n, y = v => T + (H - T - B) * (1 - v / max);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = max * i / 4, yy = y(v); g += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + e(fmt(v)) + '</text>'; }
    const bw = Math.min(28, (pw - 8) / o.series.length);
    o.cats.forEach((c, i) => {
      const x0 = L + pw * i + (pw - bw * o.series.length) / 2;
      o.series.forEach((s, j) => { const v = s.vals[i]; if (v === null || v === undefined) return; const yy = y(v), hh = Math.max(0, H - B - yy); g += '<rect x="' + (x0 + j * bw + 1) + '" y="' + yy + '" width="' + (bw - 2) + '" height="' + hh + '" rx="3" fill="' + s.color + '"><title>' + e(c + ' — ' + s.name + ': ' + fmt(v)) + '</title></rect>'; if (o.labels && v > 0) g += '<text class="vl" x="' + (x0 + j * bw + bw / 2) + '" y="' + (yy - 4) + '" text-anchor="middle">' + e(fmt(v)) + '</text>'; });
      g += '<text x="' + (L + pw * i + pw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + e(c) + '</text>';
    });
    if (o.line) {
      const pts = o.line.vals.map((v, i) => v === null || v === undefined ? null : [L + pw * i + pw / 2, y(v)]).filter(Boolean);
      if (pts.length) g += '<polyline fill="none" stroke="' + o.line.color + '" stroke-width="2.5" stroke-linejoin="round" points="' + pts.map(p => p.join(',')).join(' ') + '"/>' + pts.map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="' + o.line.color + '"><title>' + e(o.cats[i] + ' — ' + o.line.name + ': ' + fmt(o.line.vals[i])) + '</title></circle>').join('');
    }
    const leg = o.series.concat(o.line ? [o.line] : []);
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + e(o.label || 'Biểu đồ cột') + '">' + g + '</svg><div class="legend">' + leg.map(s => '<span><i style="background:' + s.color + '"></i>' + e(s.name) + '</span>').join('') + '</div>';
  };
  // Vành khuyên. parts:[{name,val,color}]
  UI.donut = (parts, center, sub) => {
    const tot = U.sum(parts, p => p.val), R = 62, C = 2 * Math.PI * R; let off = 0, g = '';
    if (!tot) g = '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="var(--grid)" stroke-width="18"/>';
    else parts.forEach(p => { if (!p.val) return; const len = p.val / tot * C; g += '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="' + p.color + '" stroke-width="18" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 80 80)"><title>' + e(p.name + ': ' + p.val + ' (' + U.fmtPct(p.val / tot * 100) + ')') + '</title></circle>'; off += len; });
    return '<div class="donut-wrap"><svg class="chart" style="width:160px;height:160px;flex:none" viewBox="0 0 160 160" role="img" aria-label="' + e(sub || 'Tỷ lệ') + '">' + g + '<text class="donut-c" x="80" y="82" text-anchor="middle">' + e(center) + '</text><text class="donut-s" x="80" y="100" text-anchor="middle">' + e(sub || '') + '</text></svg><div class="legend" style="flex-direction:column;gap:6px;margin:0">' + parts.map(p => '<span><i style="background:' + p.color + '"></i>' + e(p.name) + ' <b style="color:var(--text)">' + p.val + '</b></span>').join('') + '</div></div>';
  };
  // Thanh ngang xếp chồng. rows:[{name, parts:[{val,color,name}], total, right, act}]
  UI.hbars = rows => {
    const max = Math.max(1, ...rows.map(r => r.total !== undefined ? r.total : U.sum(r.parts, p => p.val)));
    return '<div class="hbars">' + rows.map(r => '<div class="hbar"' + (r.act ? ' data-act="' + e(r.act) + '" style="cursor:pointer"' : '') + '><span class="nm" title="' + e(r.name) + '">' + e(r.name) + '</span><span class="tr">' + r.parts.map(p => '<i style="width:' + (p.val / max * 100) + '%;background:' + p.color + '" title="' + e(p.name + ': ' + (p.label || p.val)) + '"></i>').join('') + '</span><span class="vv">' + e(r.right !== undefined ? r.right : U.sum(r.parts, p => p.val)) + '</span></div>').join('') + '</div>';
  };

  /* ============================================================
     GANTT. rows:[{label, group, bars:[{a,b,st,title,thin}], dots:[{d,st,title}], act}]
     ============================================================ */
  UI.gantt = (rows, o) => {
    o = o || {}; const ds = [];
    rows.forEach(r => { (r.bars || []).forEach(b => { if (U.isISO(b.a)) ds.push(b.a); if (U.isISO(b.b)) ds.push(b.b); }); (r.dots || []).forEach(d => { if (U.isISO(d.d)) ds.push(d.d); }); });
    if (!ds.length) return '<div class="note">Chưa có mốc nào có ngày bắt đầu hoặc hạn hoàn thành nên chưa vẽ được biểu đồ tiến độ.</div>';
    ds.sort(); const today = U.today();
    let a = ds[0].slice(0, 8) + '01', bEnd = ds[ds.length - 1];
    if (today >= U.addDays(a, -62) && today <= U.addDays(bEnd, 62)) { if (today < a) a = today.slice(0, 8) + '01'; if (today > bEnd) bEnd = today; }
    const by = +bEnd.slice(0, 4), bm = +bEnd.slice(5, 7); const b = by + '-' + U.pad(bm) + '-' + U.pad(U.lastDayOfMonth(by, bm));
    const span = Math.max(1, U.diffDays(b, a) + 1), pos = d => (U.diffDays(d, a) / span * 100);
    const months = []; let y = +a.slice(0, 4), m = +a.slice(5, 7);
    while (y < by || (y === by && m <= bm)) { months.push([y, m]); m++; if (m > 12) { m = 1; y++; } if (months.length > 240) break; }
    const step = months.length > 30 ? 3 : 1;
    const head = months.map(([yy, mm], i) => { const s = yy + '-' + U.pad(mm) + '-01', w = U.lastDayOfMonth(yy, mm) / span * 100; return '<div class="g-m" style="left:' + pos(s) + '%;width:' + w + '%">' + (i % step === 0 ? 'T' + mm + (mm === 1 || i === 0 ? '/' + yy : '') : '') + '</div>'; }).join('');
    const grid = months.map(([yy, mm]) => '<div class="g-m" style="left:' + pos(yy + '-' + U.pad(mm) + '-01') + '%"></div>').join('');
    const todayLine = (today >= a && today <= b) ? '<div class="g-today" style="left:' + pos(today) + '%"></div>' : '';
    const minW = Math.max(760, 260 + months.length * (step === 3 ? 26 : 54));
    return '<div class="gantt"><div class="gantt-in" style="min-width:' + minW + 'px;--gl:' + (o.labelW || 260) + 'px"><div class="g-row head"><div class="g-l">' + e(o.head || 'Nội dung') + '</div><div class="g-t">' + head + '</div></div>' +
      rows.map(r => r.group ? '<div class="g-row grp"' + (r.act ? ' data-act="' + e(r.act) + '"' : '') + '><div class="g-l" title="' + e(r.label) + '">' + e(r.label) + '</div><div class="g-t">' + grid + todayLine + (r.bars || []).map(bar).join('') + '</div></div>'
        : '<div class="g-row"' + (r.act ? ' data-act="' + e(r.act) + '" style="cursor:pointer"' : '') + '><div class="g-l" title="' + e(r.label) + '">' + (r.chip || '') + '<span style="overflow:hidden;text-overflow:ellipsis">' + e(r.label) + '</span></div><div class="g-t">' + grid + todayLine + (r.bars || []).map(bar).join('') + (r.dots || []).filter(d => U.isISO(d.d)).map(d => '<div class="g-dot ' + e(d.st) + '" style="left:' + pos(d.d) + '%" title="' + e(d.title) + '"></div>').join('') + '</div></div>').join('') + '</div></div>' +
      '<div class="legend"><span><i style="background:var(--ok)"></i>Đã hoàn thành</span><span><i style="background:var(--info)"></i>Đang thực hiện</span><span><i style="background:var(--warn)"></i>Sắp đến hạn</span><span><i style="background:var(--bad)"></i>Quá hạn</span><span><i style="background:var(--idle)"></i>Chưa thực hiện</span><span><i style="background:var(--violet)"></i>Hôm nay</span></div>';
    function bar(x) {
      let s = U.isISO(x.a) ? x.a : x.b, t = U.isISO(x.b) ? x.b : x.a; if (!U.isISO(s)) return '';
      if (t < s) t = s; const l = pos(s), w = Math.max(0.6, (U.diffDays(t, s) + 1) / span * 100);
      return '<div class="g-bar ' + e(x.st || '') + (x.thin ? ' thin' : '') + '" style="left:' + l + '%;width:' + w + '%" title="' + e(x.title || '') + '"></div>';
    }
  };
})(App);
