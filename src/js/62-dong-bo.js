/* ============================================================
   62-dong-bo.js — Máy chủ Apps Script: đăng nhập, phân quyền, đồng bộ theo bản ghi, sao lưu Google Drive
   - Mỗi thay đổi trên máy được ghi vào hàng chờ _dongbo (bản ghi nào, thêm/sửa hay xóa).
   - Đồng bộ: gửi hàng chờ, nhận thay đổi của máy khác kể từ lần trước (syncDelta). Hai máy cùng sửa một
     bản ghi: máy chủ giữ bản sửa sau cùng và báo xung đột.
   - Đăng nhập: mã quản trị (MA_BI_MAT) hoặc tài khoản cán bộ (tên + mật khẩu → phiên ký số 30 ngày).
     Vai trò: quản lý (toàn quyền), cán bộ (sửa bản ghi mình phụ trách), chỉ xem. Máy chủ kiểm tra lại quyền.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const KHONG = { lichsu: 1, _dongbo: 1, vbden: 1 };
  const CHU = { nhiemvu: 'chuTriId', vanban: 'chuTriId', ngansach: 'canBoId', goithau: 'canBoId', hopdong: 'canBoId', duan: 'canBoId', von: 'canBoId' };
  const VAI = { quanly: 'Quản lý', canbo: 'Cán bộ', xem: 'Chỉ xem' };

  /* ---------- Gọi máy chủ ---------- */
  const MC = A.MC = {
    url: () => (S.cfg.syncUrl || '').trim(),
    hopLe: () => /^(https:\/\/script\.google(usercontent)?\.com\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(MC.url()),
    coCauHinh: () => MC.hopLe() && !!(S.cfg.mcToken || S.cfg.syncKey),
    nguoiDung: () => S.cfg.mcToken ? (S.cfg.mcUser || null) : (S.cfg.syncKey && MC.hopLe() ? { ten: S.cfg.nguoiDung || 'Quản trị', vaiTro: 'quanly', quanTri: true } : null),
    vaiTro: () => { const u = MC.nguoiDung(); return u ? u.vaiTro : 'quanly'; },   // chưa nối máy chủ: dùng một mình, toàn quyền
    async goi(body) {
      if (!MC.hopLe()) throw new Error('Chưa cấu hình máy chủ Apps Script (Thiết lập → Máy chủ, đồng bộ).');
      const auth = S.cfg.mcToken ? { token: S.cfg.mcToken } : { key: S.cfg.syncKey || '', by: S.user() };
      let r;
      try { r = await fetch(MC.url(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ app: A.APP_ID }, body.action === 'login' ? {} : auth, body)), redirect: 'follow', credentials: 'omit', cache: 'no-store' }); }
      catch (er) { throw new Error('Không kết nối được máy chủ Apps Script: ' + (er.message || er)); }
      if (!r.ok) throw new Error('Máy chủ trả mã ' + r.status);
      const j = await r.json().catch(() => { throw new Error('Máy chủ không trả dữ liệu hợp lệ — kiểm tra đã triển khai Code.gs bản mới (Triển khai → Phiên bản mới).'); });
      if (j.auth && S.cfg.mcToken) { await S.setCfg({ mcToken: '', mcUser: null }); apVaiTro(); UI.toast('Phiên đăng nhập hết hạn — hãy đăng nhập lại ở Thiết lập.', 'bad'); }
      if (!j.ok && !j.conflict) throw Object.assign(new Error(j.error || 'Máy chủ từ chối yêu cầu'), { auth: !!j.auth });
      return j;
    }
  };

  /* ---------- Người dùng hiện tại, phân quyền trên máy ---------- */
  const userGoc = S.user.bind(S);
  S.user = () => (S.cfg.mcToken && S.cfg.mcUser && S.cfg.mcUser.ten) || userGoc();
  const duocSua = (c, cu, moi) => {
    if (KHONG[c] || !S.cfg.mcToken || !S.cfg.mcUser) return true;
    const u = S.cfg.mcUser; if (u.vaiTro === 'quanly') return true; if (u.vaiTro !== 'canbo') return false;
    const k = CHU[c]; if (!k) return false;
    const a = cu ? cu[k] : '', b = moi ? (moi[k] !== undefined ? moi[k] : a) : '';
    return (!a || a === u.canBoId) && (!b || b === u.canBoId);
  };
  const loiQuyen = c => new Error(S.cfg.mcUser && S.cfg.mcUser.vaiTro === 'xem' ? 'Tài khoản chỉ xem: không thêm, sửa, xóa được dữ liệu.' : 'Tài khoản cán bộ chỉ sửa được ' + (CHU[c] ? 'bản ghi do mình phụ trách hoặc chưa giao' : 'dữ liệu có cán bộ phụ trách (nhiệm vụ, dự toán, gói thầu, hợp đồng…); "' + ((Sc.C[c] || {}).label || c) + '" do quản lý cập nhật') + '.');
  MC.duocSua = duocSua;
  function apVaiTro() {
    const u = MC.nguoiDung(), xem = !!(S.cfg.mcToken && u && u.vaiTro === 'xem');
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('vai-xem', xem);
  }
  MC.apVaiTro = apVaiTro;

  /* ---------- Hàng chờ đồng bộ ---------- */
  const danhDau = (pairs, xoa) => {
    if (!pairs.length) return Promise.resolve();
    const at = U.nowStamp(), ops = pairs.filter(([c]) => !KHONG[c]).map(([c, id]) => { const v = { id: c + '|' + id, c, rid: id, xoa: !!xoa, at }; S.coll('_dongbo').set(v.id, v); return { op: 'put', c: '_dongbo', v }; });
    return ops.length ? S.adapter.bulk(ops) : Promise.resolve();
  };
  const save0 = S.save.bind(S), saveMany0 = S.saveMany.bind(S), remove0 = S.remove.bind(S), removeMany0 = S.removeMany.bind(S), import0 = S.importAll.bind(S);
  S.save = async (c, rec, opts) => {
    if (!duocSua(c, rec.id ? S.get(c, rec.id) : null, rec)) throw loiQuyen(c);
    const v = await save0(c, rec, opts); await danhDau([[c, v.id]]); hen(); return v;
  };
  S.saveMany = async (items, opts) => {
    const sai = items.find(x => !duocSua(x.c, x.rec.id ? S.get(x.c, x.rec.id) : null, x.rec)); if (sai) throw loiQuyen(sai.c);
    items.forEach(x => { if (!x.rec.id) x.rec.id = U.uid(x.c.slice(0, 2)); });   // cấp mã trước để ghi đúng hàng chờ đồng bộ
    const r = await saveMany0(items, opts);
    await danhDau(items.map(x => [x.c, x.rec.id])); hen(); return r;
  };
  S.remove = async (c, id, opts) => { if (!duocSua(c, S.get(c, id), null)) throw loiQuyen(c); await remove0(c, id, opts); await danhDau([[c, id]], true); hen(); };
  S.removeMany = async (pairs, note) => { const sai = pairs.find(([c, id]) => !duocSua(c, S.get(c, id), null)); if (sai) throw loiQuyen(sai[0]); await removeMany0(pairs, note); await danhDau(pairs, true); hen(); };
  S.importAll = async (obj, mode) => {
    const r = await import0(obj, mode);
    // Khôi phục, gộp từ bản sao lưu: đưa bản ghi vừa nhập vào hàng chờ để máy chủ nhận
    const pairs = []; Object.keys(obj.data || {}).forEach(c => { if (!KHONG[c]) (obj.data[c] || []).forEach(v => v && v.id && S.get(c, v.id) && pairs.push([c, v.id])); });
    await danhDau(pairs); hen(); return r;
  };

  /* ---------- Đồng bộ ---------- */
  let dang = false, henTimer = null, apDung = false;
  const hen = () => { if (apDung || !MC.coCauHinh() || S.cfg.dbTuDong === false) return; clearTimeout(henTimer); henTimer = setTimeout(() => MC.dongBo().catch(er => console.warn(er)), 15000); };
  MC.choGui = () => S.count('_dongbo');
  MC.dongBo = async (o) => {
    o = o || {};
    if (!MC.coCauHinh() || dang) return null;
    dang = true;
    try {
      if (S.cfg.dbRev === undefined || S.cfg.dbRev === null) {   // lần đầu: gửi toàn bộ dữ liệu trên máy (máy chủ giữ bản sửa sau cùng)
        const pairs = []; Object.keys(S.data).forEach(c => { if (!KHONG[c] && Sc.C[c]) S.all(c).forEach(v => pairs.push([c, v.id])); });
        await danhDau(pairs);
      }
      const hang = S.all('_dongbo'), daGui = new Map(), changes = [], deletes = [];
      hang.forEach(x => {
        const v = S.get(x.c, x.rid);
        if (x.xoa || !v) { deletes.push({ c: x.c, id: x.rid, at: x.at }); daGui.set(x.id, null); }
        else { changes.push({ c: x.c, v }); daGui.set(x.id, v.updatedAt || ''); }
      });
      const j = await MC.goi({ action: 'syncDelta', since: +S.cfg.dbRev || 0, changes, deletes });
      // Áp thay đổi từ máy khác (bỏ qua bản ghi đang sửa dở trên máy này mà chưa gửi)
      const ops = [], conDoi = new Set(S.all('_dongbo').filter(x => !daGui.has(x.id)).map(x => x.id));
      (j.changes || []).forEach(x => { if (Sc.C[x.c] || x.c === 'kiemke') { if (!conDoi.has(x.c + '|' + x.v.id)) ops.push({ op: 'put', c: x.c, v: x.v }); } });
      (j.deletes || []).forEach(x => { if (!conDoi.has(x.c + '|' + x.id) && S.get(x.c, x.id)) ops.push({ op: 'del', c: x.c, id: x.id }); });
      (j.rejected || []).forEach(x => { if (x.v) ops.push({ op: 'put', c: x.c, v: x.v }); else if (S.get(x.c, x.id)) ops.push({ op: 'del', c: x.c, id: x.id }); });
      // Bỏ khỏi hàng chờ các mục đã gửi (nếu không bị sửa tiếp trong lúc gửi)
      daGui.forEach((at, k) => { const x = S.get('_dongbo', k); if (!x) return; const v = S.get(x.c, x.rid); if (at === null ? (x.xoa || !v) : (v && (v.updatedAt || '') === at)) ops.push({ op: 'del', c: '_dongbo', id: k }); });
      if (ops.length) {
        apDung = true;
        try { await S.adapter.bulk(ops); ops.forEach(op => { if (op.op === 'put') S.coll(op.c).set(op.v.id, op.v); else S.coll(op.c).delete(op.id); }); }
        finally { apDung = false; }
      }
      const xd = (j.conflicts || []).map(x => ({ luc: U.nowStamp(), c: x.c, id: x.id, ten: (Sc.C[x.c] && S.get(x.c, x.id)) ? U.trunc(Sc.C[x.c].title(S.get(x.c, x.id)), 90) : x.id, giu: x.giu, mayBy: x.mayBy, khacBy: x.khacBy, khacAt: x.khacAt, xoa: !!x.xoa }));
      const tc = (j.rejected || []).map(x => ({ luc: U.nowStamp(), c: x.c, id: x.id, ten: (Sc.C[x.c] && S.get(x.c, x.id)) ? U.trunc(Sc.C[x.c].title(S.get(x.c, x.id)), 90) : x.id, ly: x.ly }));
      const patch = { dbRev: j.rev, dbAt: U.nowStamp(), dbXungDot: xd.concat(S.cfg.dbXungDot || []).slice(0, 50), dbTuChoi: tc.concat(S.cfg.dbTuChoi || []).slice(0, 50) };
      if (j.user && S.cfg.mcToken) patch.mcUser = Object.assign({}, S.cfg.mcUser || {}, j.user);
      await S.setCfg(patch);
      const nhan = (j.changes || []).length + (j.deletes || []).length;
      if (nhan || ops.length) S.emit({ bulk: true, dongBo: true });
      if (o.baoCao || xd.length || tc.length) UI.toast('Đồng bộ xong: gửi ' + (changes.length + deletes.length) + ', nhận ' + nhan + ' thay đổi' + (xd.length ? ' · ' + xd.length + ' xung đột (giữ bản sửa sau cùng)' : '') + (tc.length ? ' · ' + tc.length + ' thay đổi không đủ quyền, đã hoàn tác' : '') + '.', xd.length || tc.length ? '' : 'ok');
      return { gui: changes.length + deletes.length, nhan, xungDot: xd.length, tuChoi: tc.length };
    } finally { dang = false; }
  };
  MC.khoiDong = () => {
    apVaiTro();
    if (!MC.coCauHinh() || S.cfg.dbTuDong === false) return;
    setTimeout(() => MC.dongBo().catch(er => console.warn(er)), 2500);
    setInterval(() => { if (!document.hidden) MC.dongBo().catch(er => console.warn(er)); }, 180000);
    window.addEventListener('online', () => MC.dongBo().catch(() => { }));
  };

  /* ---------- Thẻ Thiết lập: máy chủ, đăng nhập, đồng bộ, tài khoản, sao lưu Drive ---------- */
  function theMayChu() {
    const c = S.cfg, u = MC.nguoiDung(), cg = MC.choGui(), xd = c.dbXungDot || [], tc = c.dbTuChoi || [];
    return '<div class="card" data-mc><div class="card-h"><h3>Máy chủ, đăng nhập, đồng bộ</h3><div class="sub">Google Apps Script (gas/Code.gs bản 3): đồng bộ nhiều máy theo từng bản ghi, văn bản đến, sao lưu Drive</div></div><div class="card-b">' +
      '<div class="fld"><label for="mc_url">Địa chỉ Web App</label><input class="inp" id="mc_url" value="' + e(c.syncUrl || '') + '" placeholder="https://script.google.com/macros/s/…/exec"></div>' +
      (u ? '<div class="note ok mt" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="grow">Đang dùng: <b>' + e(u.ten) + '</b> — ' + e(VAI[u.vaiTro] || u.vaiTro) + (u.quanTri ? ' (mã quản trị)' : '') + (u.canBoId ? ' · cán bộ ' + e(Sc.refName('canbo', u.canBoId)) : '') + '</span>' + (c.mcToken ? '<button class="btn sm" data-mc="pass">Đổi mật khẩu</button>' : '') + '<button class="btn sm" data-mc="out">Đăng xuất</button></div>' :
        '<div class="seg mt" role="tablist"><button data-cach="tk" class="' + ((A.vs.mcCach || 'tk') === 'tk' ? 'on' : '') + '">Tài khoản cán bộ</button><button data-cach="ma" class="' + (A.vs.mcCach === 'ma' ? 'on' : '') + '">Mã quản trị</button></div>' +
        ((A.vs.mcCach || 'tk') === 'tk' ? '<div class="form mt"><div class="fld"><label for="mc_tdn">Tên đăng nhập</label><input class="inp" id="mc_tdn" autocomplete="username"></div><div class="fld"><label for="mc_mk">Mật khẩu</label><input class="inp" type="password" id="mc_mk" autocomplete="current-password"></div></div><div class="gap mt"><button class="btn primary" data-mc="login">' + ic('check', 16) + 'Đăng nhập</button><span class="small muted">Tài khoản do quản lý tạo. Phiên đăng nhập có hiệu lực 30 ngày.</span></div>'
          : '<div class="fld mt"><label for="mc_key">Mã quản trị (trùng MA_BI_MAT trong Code.gs)</label><input class="inp" type="password" id="mc_key" value="' + e(c.syncKey || '') + '" autocomplete="off"></div><div class="gap mt"><button class="btn primary" data-mc="key">Lưu, kết nối</button><span class="small muted">Toàn quyền. Chỉ người quản lý giữ mã này.</span></div>')) +
      (MC.coCauHinh() ? '<div class="mt" style="border-top:1px solid var(--border);padding-top:12px"><div class="gap"><label class="check"><input type="checkbox" data-mc-tudong' + (c.dbTuDong === false ? '' : ' checked') + '> Tự đồng bộ (khi mở, mỗi 3 phút, sau khi sửa)</label><span class="sp"></span><button class="btn primary sm" data-mc="sync">' + ic('sync', 15) + 'Đồng bộ ngay</button></div>' +
        '<div class="small muted mt">Lần gần nhất: ' + (c.dbAt ? U.fmtDateTime(c.dbAt) + ' · bản số ' + c.dbRev : 'chưa đồng bộ') + ' · <b>' + cg + '</b> thay đổi chờ gửi</div>' +
        (xd.length ? '<details class="mt"><summary class="small">Xung đột gần đây (' + xd.length + ') — hai máy cùng sửa một bản ghi, đã giữ bản sửa sau cùng</summary>' + xd.slice(0, 15).map(x => '<div class="small soft" style="margin:4px 0">• ' + U.fmtDateTime(x.luc) + ' — ' + e(x.ten) + ': ' + (x.giu === 'may' ? 'giữ bản của máy này' : 'giữ bản của ' + e(x.khacBy || 'máy khác') + ' (' + U.fmtDateTime(x.khacAt) + ')') + '</div>').join('') + '</details>' : '') +
        (tc.length ? '<details class="mt"><summary class="small" style="color:var(--bad-fg)">Thay đổi bị máy chủ từ chối vì không đủ quyền (' + tc.length + ')</summary>' + tc.slice(0, 15).map(x => '<div class="small soft" style="margin:4px 0">• ' + U.fmtDateTime(x.luc) + ' — ' + e(x.ten) + ': ' + e(x.ly) + ' (đã hoàn tác trên máy này)</div>').join('') + '</details>' : '') +
        (MC.vaiTro() === 'quanly' ? '<details class="mt"><summary class="small">Nâng cao: ghi đè, tải toàn bộ</summary><div class="gap mt"><button class="btn sm" data-sync="pull">' + ic('download', 15) + 'Tải toàn bộ và gộp</button><button class="btn sm danger" data-sync="push">' + ic('upload', 15) + 'Ghi đè toàn bộ lên máy chủ</button></div></details>' : '') + '</div>' : '') +
      '</div></div>';
  }
  function theQuanLy() {
    if (!MC.coCauHinh() || MC.vaiTro() !== 'quanly') return '';
    return '<div class="card" data-tk><div class="card-h"><h3>Tài khoản cán bộ</h3><span class="grow"></span><button class="btn sm primary" data-tk-add>' + ic('plus', 15) + 'Thêm tài khoản</button><div class="sub">Quản lý: toàn quyền · Cán bộ: sửa nhiệm vụ, dự toán, gói thầu, hợp đồng… do mình phụ trách hoặc chưa giao · Chỉ xem: xem, báo cáo, hỏi AI</div></div><div class="card-b" data-tk-ds><span class="small muted">Đang tải…</span></div></div>' +
      '<div class="card" data-sl><div class="card-h"><h3>Sao lưu trên Google Drive</h3><div class="sub">Máy chủ chép toàn bộ dữ liệu đã đồng bộ sang thư mục KHTC_So_SAO_LUU mỗi ngày, giữ 30 bản</div></div><div class="card-b" data-sl-b><span class="small muted">Đang tải…</span></div></div>';
  }
  async function veTaiKhoan(root) {
    const box = $('[data-tk-ds]', root); if (!box) return;
    try {
      const j = await MC.goi({ action: 'userList' }), cbs = S.all('canbo');
      box.innerHTML = j.users.length ? '<table class="tbl"><thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Vai trò</th><th>Cán bộ phụ trách</th><th></th></tr></thead><tbody>' + j.users.map(u => '<tr><td><b>' + e(u.tenDN) + '</b>' + (u.khoa ? ' <span class="chip quahan">Khóa</span>' : '') + '</td><td>' + e(u.ten) + '</td><td>' + e(VAI[u.vaiTro] || u.vaiTro) + '</td><td>' + e(Sc.refName('canbo', u.canBoId) || '—') + '</td><td class="nowrap"><button class="btn sm" data-tk-sua="' + e(u.tenDN) + '">Sửa</button></td></tr>').join('') + '</tbody></table>' : UI.empty('Chưa có tài khoản cán bộ', 'Tạo tài khoản để mỗi cán bộ đăng nhập riêng: nhật ký ghi đúng người, mỗi người chỉ sửa phần mình phụ trách.');
      const form = u => {
        const m = UI.modal({ title: u ? 'Sửa tài khoản ' + u.tenDN : 'Thêm tài khoản', body: '<div class="form"><div class="fld"><label for="tk_dn">Tên đăng nhập</label><input class="inp" id="tk_dn" value="' + e(u ? u.tenDN : '') + '"' + (u ? ' readonly' : '') + ' placeholder="vd: kien"></div><div class="fld"><label for="tk_ten">Họ tên</label><input class="inp" id="tk_ten" value="' + e(u ? u.ten : '') + '"></div><div class="fld"><label for="tk_vt">Vai trò</label><select class="sel" id="tk_vt">' + Object.keys(VAI).map(k => '<option value="' + k + '"' + ((u ? u.vaiTro : 'canbo') === k ? ' selected' : '') + '>' + VAI[k] + '</option>').join('') + '</select></div><div class="fld"><label for="tk_cb">Cán bộ phụ trách (vai trò Cán bộ)</label><select class="sel" id="tk_cb"><option value="">—</option>' + cbs.map(c => '<option value="' + c.id + '"' + (u && u.canBoId === c.id ? ' selected' : '') + '>' + e(c.hoTen) + '</option>').join('') + '</select></div><div class="fld"><label for="tk_mk">' + (u ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu ban đầu') + '</label><input class="inp" id="tk_mk" type="text" autocomplete="off"><div class="help">Ít nhất 8 ký tự; gửi riêng cho cán bộ và đề nghị đổi sau khi đăng nhập.</div></div>' + (u ? '<div class="fld"><label class="check"><input type="checkbox" id="tk_khoa"' + (u.khoa ? ' checked' : '') + '> Khóa tài khoản (phiên đang mở mất hiệu lực ngay)</label></div>' : '') + '</div>',
          buttons: [{ label: 'Hủy', on: x => x.close() }].concat(u ? [{ label: 'Xóa tài khoản', cls: 'danger', on: async x => { if (!await UI.confirm({ title: 'Xóa tài khoản ' + u.tenDN + '?', msg: 'Cán bộ này sẽ không đăng nhập được nữa. Dữ liệu đã nhập không bị xóa.', ok: 'Xóa', danger: true })) return; try { await MC.goi({ action: 'userDel', tenDN: u.tenDN }); x.close(); veTaiKhoan(root); } catch (er) { UI.toast(er.message, 'bad'); } } }] : []).concat([{ label: 'Lưu', cls: 'primary', on: async x => {
            const cbId = $('#tk_cb', m.body).value, ten = $('#tk_ten', m.body).value.trim() || (cbId ? (S.get('canbo', cbId) || {}).hoTen : '');
            try { await MC.goi({ action: 'userSet', tenDN: $('#tk_dn', m.body).value.trim().toLowerCase(), ten, vaiTro: $('#tk_vt', m.body).value, canBoId: cbId, matKhau: $('#tk_mk', m.body).value, khoa: !!($('#tk_khoa', m.body) && $('#tk_khoa', m.body).checked) }); x.close(); UI.toast('Đã lưu tài khoản.', 'ok'); veTaiKhoan(root); }
            catch (er) { UI.toast(er.message, 'bad'); }
          } }]) });
        $('#tk_cb', m.body).onchange = x => { const c = S.get('canbo', x.target.value); if (c && !$('#tk_ten', m.body).value) $('#tk_ten', m.body).value = c.hoTen; };
      };
      $('[data-tk-add]', root).onclick = () => form(null);
      $$('[data-tk-sua]', box).forEach(b => b.onclick = () => form(j.users.find(u => u.tenDN === b.dataset.tkSua)));
    } catch (er) { box.innerHTML = '<div class="note bad">' + e(er.message) + '</div>'; }
  }
  async function veSaoLuu(root) {
    const box = $('[data-sl-b]', root); if (!box) return;
    try {
      const j = await MC.goi({ action: 'backupList' });
      box.innerHTML = '<div class="gap"><label class="check"><input type="checkbox" data-sl-tu' + (j.tuDong ? ' checked' : '') + '> Tự sao lưu hằng ngày (khoảng 23 giờ)</label><span class="sp"></span><a class="btn sm" href="' + e(j.folder_url) + '" target="_blank" rel="noopener">' + ic('link', 15) + 'Mở thư mục</a><button class="btn sm primary" data-sl-ngay>' + ic('upload', 15) + 'Sao lưu ngay</button></div>' +
        '<div class="small muted mt">Lần gần nhất: ' + (j.luc ? U.fmtDateTime(j.luc) : 'chưa có') + ' · ' + j.items.length + ' bản</div>' +
        (j.items.length ? '<div class="tbl-wrap mt" style="max-height:240px;overflow:auto"><table class="tbl"><tbody>' + j.items.map(x => '<tr><td>' + U.fmtDate(x.ngay) + '</td><td class="num small">' + U.fmtNum(x.kb, 0) + ' KB</td><td class="nowrap"><button class="btn sm" data-sl-tai="' + e(x.id) + '">Tải về</button><button class="btn sm" data-sl-kp="' + e(x.id) + '">Khôi phục…</button></td></tr>').join('') + '</tbody></table></div>' : '');
      $('[data-sl-tu]', box).onchange = async x => { try { const r = await MC.goi({ action: 'backupAuto', on: x.target.checked }); UI.toast(r.msg, 'ok'); } catch (er) { UI.fail(er); } };
      $('[data-sl-ngay]', box).onclick = async () => { try { if (MC.choGui()) await MC.dongBo(); const r = await MC.goi({ action: 'backupNow' }); UI.toast('Đã sao lưu: ' + r.ten, 'ok'); veSaoLuu(root); } catch (er) { UI.fail(er); } };
      $$('[data-sl-tai]', box).forEach(b => b.onclick = async () => { try { const r = await MC.goi({ action: 'backupGet', id: b.dataset.slTai }); UI.download(new Blob([JSON.stringify(r.payload)], { type: 'application/json' }), r.ten); } catch (er) { UI.fail(er); } });
      $$('[data-sl-kp]', box).forEach(b => b.onclick = async () => {
        try {
          const r = await MC.goi({ action: 'backupGet', id: b.dataset.slKp }), n = Object.values(r.payload.data || {}).reduce((s, l) => s + l.length, 0);
          const m = UI.modal({ title: 'Khôi phục từ ' + r.ten, body: '<p>Bản sao lưu có <b>' + n + '</b> bản ghi.</p><p class="soft">Gộp: bản ghi trong bản sao lưu mới hơn trên máy thì thay, bản ghi chỉ có trên máy giữ nguyên. Sau khi gộp, phần mềm đồng bộ lên máy chủ. Phần mềm lưu bản chụp dữ liệu trước khi khôi phục.</p>', buttons: [{ label: 'Hủy', on: x => x.close() }, { label: 'Gộp vào dữ liệu trên máy', cls: 'primary', on: async x => { try { await S.snapshot('Trước khi khôi phục từ ' + r.ten); const st = await S.importAll(r.payload, 'merge'); x.close(); UI.toast('Đã gộp: ' + st.them + ' mới, ' + st.capNhat + ' cập nhật.', 'ok'); MC.dongBo({ baoCao: true }).catch(() => { }); } catch (er) { UI.fail(er); } } }] });
        } catch (er) { UI.fail(er); }
      });
    } catch (er) { box.innerHTML = '<div class="note bad">' + e(er.message) + '</div>'; }
  }
  const tlGoc = A.views.thietlap.render;
  A.views.thietlap.render = (root, p) => {
    tlGoc(root, p);
    // thay thẻ "Đồng bộ qua Google Apps Script" cũ bằng thẻ máy chủ mới
    const cu = $$('.card', root).find(c => /Đồng bộ qua Google Apps Script/.test(($('h3', c) || {}).textContent || ''));
    const div = document.createElement('div'); div.className = 'stack'; div.innerHTML = theMayChu() + theQuanLy();
    if (cu) cu.replaceWith(div); else root.appendChild(div);
    $$('[data-cach]', div).forEach(b => b.onclick = () => { A.vs.mcCach = b.dataset.cach; A.render(); });
    const luuUrl = async () => { const u = $('#mc_url', div).value.trim(); if (u !== (S.cfg.syncUrl || '')) await S.setCfg({ syncUrl: u, dbRev: null, dbAt: null }); };
    UI.on(div, 'click', '[data-mc]', async b => {
      const k = b.dataset.mc;
      try {
        if (k === 'login') {
          await luuUrl();
          const j = await MC.goi({ action: 'login', tenDN: $('#mc_tdn', div).value.trim(), matKhau: $('#mc_mk', div).value });
          await S.setCfg({ mcToken: j.token, mcUser: j.user, syncKey: '', dbRev: null }); apVaiTro();
          UI.toast('Đã đăng nhập: ' + j.user.ten + ' (' + VAI[j.user.vaiTro] + '). Đang đồng bộ…', 'ok');
          await MC.dongBo({ baoCao: true }); MC.khoiDongMot();
        } else if (k === 'key') {
          await luuUrl(); await S.setCfg({ syncKey: $('#mc_key', div).value, mcToken: '', mcUser: null, dbRev: null });
          await MC.goi({ action: 'info' }); apVaiTro(); UI.toast('Đã kết nối máy chủ bằng mã quản trị. Đang đồng bộ…', 'ok'); await MC.dongBo({ baoCao: true }); MC.khoiDongMot();
        } else if (k === 'out') {
          if (MC.choGui() && !await UI.confirm({ title: 'Còn ' + MC.choGui() + ' thay đổi chưa gửi lên máy chủ', msg: 'Đăng xuất bây giờ thì các thay đổi này chỉ nằm trên máy. Vẫn đăng xuất?', ok: 'Đăng xuất' })) return;
          await S.setCfg({ mcToken: '', mcUser: null, syncKey: '' }); apVaiTro(); A.render();
        } else if (k === 'sync') { b.disabled = true; await MC.dongBo({ baoCao: true }); }
        else if (k === 'pass') {
          const m = UI.modal({ title: 'Đổi mật khẩu', body: '<div class="fld"><label for="pw_c">Mật khẩu hiện tại</label><input class="inp" type="password" id="pw_c" autocomplete="current-password"></div><div class="fld mt"><label for="pw_n">Mật khẩu mới (ít nhất 8 ký tự)</label><input class="inp" type="password" id="pw_n" autocomplete="new-password"></div>', buttons: [{ label: 'Hủy', on: x => x.close() }, { label: 'Đổi mật khẩu', cls: 'primary', on: async x => { try { await MC.goi({ action: 'userPass', matKhauCu: $('#pw_c', m.body).value, matKhau: $('#pw_n', m.body).value }); x.close(); UI.toast('Đã đổi mật khẩu.', 'ok'); } catch (er) { UI.toast(er.message, 'bad'); } } }] });
        }
      } catch (er) { UI.toast(er.message, 'bad'); }
      finally { b.disabled = false; }
      if (k !== 'pass') A.render();
    });
    const td = $('[data-mc-tudong]', div); if (td) td.onchange = x => S.setCfg({ dbTuDong: x.target.checked });
    $$('[data-sync]', div).forEach(b => b.onclick = () => A.syncCu && A.syncCu(b.dataset.sync));
    veTaiKhoan(div); veSaoLuu(div);
  };
  let daKhoiDong = false;
  MC.khoiDongMot = () => { if (daKhoiDong) return; daKhoiDong = true; MC.khoiDong(); };
})(App);
