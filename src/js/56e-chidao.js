/* ============================================================
   56e-chidao.js — Phục vụ lãnh đạo chỉ đạo
   9. Kịch bản giải ngân (kéo thả nội dung, hợp đồng vào phương án A/B/C; tỷ lệ đạt cuối năm)
   10. Trang giao ban một trang A4 ngang (số chính, biểu đồ, 5 việc cần chỉ đạo)
   11. So sánh giữa các kỳ số liệu, cùng kỳ năm trước, nội dung đứng yên 3 kỳ liên tiếp
   Mọi con số tính từ dữ liệu đã nhập; phương án chỉ để so sánh, không ghi vào dữ liệu.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$, P = UI.PAL;
  const fs = U.fmtShort, ty = v => U.fmtNum(v / 1e9, Math.abs(v) >= 1e10 ? 0 : 1);
  const valAt = (h, d) => { let v = 0; for (const x of h) { if (x.ngay <= d) v = x.giaiNgan; else break; } return v; };
  const tenNS = r => (r.stt ? r.stt + ' ' : '') + r.noiDung;

  /* ======================= 9. KỊCH BẢN GIẢI NGÂN ======================= */
  const PA = ['A', 'B', 'C'];
  const kbLay = y => { const all = S.cfg.gnKichBan || {}, o = all[y] || {}; PA.forEach(k => { o[k] = o[k] || { ten: 'Phương án ' + k, thu: [], them: [] }; }); return o; };
  const kbLuu = (y, o) => S.setCfg({ gnKichBan: Object.assign({}, S.cfg.gnKichBan || {}, { [y]: o }) });
  // Tính một phương án: thu hồi phần chưa giải ngân của dòng; giải ngân thêm (từ dòng hoặc hợp đồng) không vượt phần còn lại của dòng
  function kbTinh(y, pa, f) {
    const g = L.giaiNgan(y, f || {}), leaves = L.gnLeaves(y, f || {}), by = {};
    leaves.forEach(n => { by[n.r.id] = { tong: n.sum.tong, gn: n.sum.giaiNgan, them: 0, thu: false }; });
    const ghiChu = [];
    (pa.them || []).forEach(x => { const id = x.k === 'hd' ? L.hdNsId(S.get('hopdong', x.id) || {}) : x.id, o = by[id]; if (!o) { ghiChu.push('Bỏ qua 1 khoản chưa gắn dòng dự toán trong phạm vi.'); return; } o.them += U.num(x.tien); });
    (pa.thu || []).forEach(id => { if (by[id]) by[id].thu = true; });
    let tong = 0, gn = 0, them = 0, thu = 0;
    Object.values(by).forEach(o => { const con = Math.max(0, o.tong - o.gn), t = Math.min(con, o.them), th = o.thu ? con - t : 0; them += t; thu += th; tong += o.tong - th; gn += o.gn + t; });
    return { g, tong, gn, them, thu, tyLe: U.pct(gn, tong), ghiChu };
  }
  A.gnKichBan = (box, y, Sel) => {
    const f = { dv: Sel.dv }, kb = kbLay(y), g = L.giaiNgan(y, f);
    if (!g.tong) { box.innerHTML = '<div class="card">' + UI.empty('Chưa có số liệu dự toán năm ' + y, '') + '</div>'; return; }
    const st = A.vs.kb || (A.vs.kb = { q: '' });
    const rows = L.gnDong(y, f).filter(x => x.con > 0.5).sort((a, b) => b.con - a.con);
    const hds = S.all('hopdong').filter(h => ['dang', 'nghiemthu'].includes(h.trangThai || 'dang')).map(h => ({ h, x: L.hd(h), ns: S.get('ngansach', L.hdNsId(h)) })).filter(o => o.x.conLai > 0.5 && o.ns && +o.ns.nam === y);
    const nq = U.norm(st.q || '');
    const item = (k, id, t, s, tien) => '<div class="kb-i" draggable="true" tabindex="0" data-k="' + k + '" data-id="' + e(id) + '" data-tien="' + Math.round(tien) + '"><span class="kb-tag ' + k + '">' + (k === 'hd' ? 'HĐ' : 'DT') + '</span><span class="grow" style="min-width:0"><span class="t1">' + e(U.trunc(t, 90)) + '</span><span class="t2">' + s + '</span></span></div>';
    const nguon = rows.filter(x => !nq || U.norm(tenNS(x.r)).includes(nq)).slice(0, 80).map(x => item('ns', x.r.id, tenNS(x.r), 'Còn ' + fs(x.con) + ' · đã GN ' + U.fmtPct(x.ty, 0) + (x.cham ? ' · <b style="color:var(--bad-fg)">chậm</b>' : ''), x.con)).join('') +
      hds.filter(o => !nq || U.norm((o.h.so || '') + ' ' + (o.h.ten || '') + ' ' + (o.h.nhaThau || '')).includes(nq)).map(o => item('hd', o.h.id, (o.h.so || '') + ' ' + (o.h.ten || o.h.nhaThau || ''), 'Còn phải thanh toán ' + fs(o.x.conLai) + ' · nguồn ' + e(U.trunc(tenNS(o.ns), 40)), o.x.conLai)).join('');
    const kq = PA.map(k => kbTinh(y, kb[k], f)), max = Math.max(1, ...kq.map(r => r.tyLe || 0), g.tyLe || 0, U.pct(g.duBao, g.tong) || 0);
    const muc = g.mt.tuDat ? g.mt.vals[11] : 100;
    const cot = (k, i) => {
      const pa = kb[k], r = kq[i], dong = id => S.get('ngansach', id);
      return '<div class="card kb-pa"><div class="card-h"><input class="inp kb-ten" data-ten="' + k + '" value="' + e(pa.ten) + '" aria-label="Tên phương án ' + k + '"><button class="btn sm ghost" data-xoa-pa="' + k + '" title="Xóa hết nội dung phương án">' + ic('trash', 14) + '</button></div><div class="card-b">' +
        '<div class="kb-kq"><b>' + U.fmtPct(r.tyLe) + '</b><span>đạt cuối năm (' + fs(r.gn) + ' / ' + fs(r.tong) + ')' + ((r.tyLe || 0) < muc - 0.05 ? ' · <b style="font-size:inherit;color:var(--bad-fg)">chưa đạt mục tiêu ' + U.fmtPct(muc) + '</b>' : '') + '</span><span class="small soft">' + (r.tyLe - (g.tyLe || 0) >= 0 ? '+' : '') + U.fmtNum((r.tyLe || 0) - (g.tyLe || 0), 1) + ' điểm so với hiện tại · giải ngân thêm ' + fs(r.them) + ' · thu hồi ' + fs(r.thu) + '</span></div>' +
        '<div class="kb-drop" data-pa="' + k + '" data-loai="them"><div class="eyebrow">Giải ngân thêm đến 31/12</div>' + ((pa.them || []).map((x, j) => { const ten = x.k === 'hd' ? ((S.get('hopdong', x.id) || {}).so || '(HĐ đã xóa)') + ' ' + ((S.get('hopdong', x.id) || {}).ten || '') : dong(x.id) ? tenNS(dong(x.id)) : '(dòng đã xóa)'; return '<div class="kb-c"><span class="kb-tag ' + x.k + '">' + (x.k === 'hd' ? 'HĐ' : 'DT') + '</span><span class="grow small" style="min-width:0">' + e(U.trunc(ten, 60)) + '</span><input class="inp num kb-tien" data-money data-tien-pa="' + k + '" data-j="' + j + '" value="' + U.fmtNum(U.num(x.tien), 0) + '" aria-label="Số tiền"><button class="btn icon sm ghost" data-bo="' + k + ':them:' + j + '" aria-label="Bỏ">' + ic('x', 13) + '</button></div>'; }).join('') || '<div class="small muted kb-trong">Kéo nội dung, hợp đồng vào đây</div>') + '</div>' +
        '<div class="kb-drop" data-pa="' + k + '" data-loai="thu"><div class="eyebrow">Thu hồi, điều chỉnh giảm phần chưa giải ngân</div>' + ((pa.thu || []).map((id, j) => '<div class="kb-c"><span class="kb-tag thu">TH</span><span class="grow small" style="min-width:0">' + e(U.trunc(dong(id) ? tenNS(dong(id)) : '(dòng đã xóa)', 60)) + '</span><button class="btn icon sm ghost" data-bo="' + k + ':thu:' + j + '" aria-label="Bỏ">' + ic('x', 13) + '</button></div>').join('') || '<div class="small muted kb-trong">Kéo nội dung dự toán vào đây</div>') + '</div>' +
        (r.ghiChu.length ? '<div class="small" style="color:var(--warn-fg)">' + e(r.ghiChu[0]) + '</div>' : '') + '</div></div>';
    };
    box.innerHTML = '<div class="note mb small">Kéo nội dung dự toán (DT) hoặc hợp đồng (HĐ) từ cột trái vào ô "Giải ngân thêm" hay "Thu hồi" của từng phương án; trên điện thoại bấm vào mục để chọn. Phương án chỉ để so sánh trước khi trình, <b>không thay đổi số liệu</b>. Tỷ lệ cuối năm = (đã giải ngân + giải ngân thêm) / (kinh phí được sử dụng − phần thu hồi); chưa cộng phần giải ngân khác ngoài phương án.</div>' +
      '<div class="kpis mb">' + [['acc', 'Hiện tại', U.fmtPct(g.tyLe), fs(g.gn) + ' / ' + fs(g.tong) + ' đến ' + U.fmtDate(g.asOf)], ['teal', 'Dự báo theo tốc độ hiện tại', U.fmtPct(U.pct(g.duBao, g.tong)), 'Khoảng ' + fs(g.duBao) + ' đến 31/12'], ['violet', 'Mục tiêu cuối năm', U.fmtPct(muc), g.mt.tuDat ? 'Theo mục tiêu đã đặt' : 'Chưa đặt mục tiêu riêng']].map(k => '<div class="kpi ' + k[0] + ' static"><span class="k-l">' + k[1] + '</span><span class="k-v">' + k[2] + '</span><span class="k-s">' + k[3] + '</span></div>').join('') + '</div>' +
      '<div class="kb-wrap"><div class="card kb-src"><div class="card-h"><h3>Nội dung, hợp đồng</h3><div class="sub">' + rows.length + ' nội dung còn phải giải ngân · ' + hds.length + ' hợp đồng còn phải thanh toán</div></div><div class="card-b"><div class="lk-q mb">' + ic('search', 16) + '<input class="inp" type="search" data-kbq value="' + e(st.q || '') + '" placeholder="Tìm nội dung, số hợp đồng…" aria-label="Tìm"></div><div class="kb-list">' + (nguon || '<div class="small muted">Không có mục phù hợp.</div>') + '</div></div></div>' +
      '<div class="kb-cols">' + PA.map(cot).join('') + '</div></div>' +
      '<div class="card mt"><div class="card-h"><h3>So sánh phương án</h3></div><div class="card-b">' + UI.hbars([{ name: 'Hiện tại', parts: [{ val: g.tyLe || 0, color: P.idle, name: 'Hiện tại', label: U.fmtPct(g.tyLe) }], total: max, right: U.fmtPct(g.tyLe) }, { name: 'Dự báo tốc độ hiện tại', parts: [{ val: U.pct(g.duBao, g.tong) || 0, color: P.teal, name: 'Dự báo', label: U.fmtPct(U.pct(g.duBao, g.tong)) }], total: max, right: U.fmtPct(U.pct(g.duBao, g.tong)) }].concat(PA.map((k, i) => ({ name: kb[k].ten, parts: [{ val: kq[i].tyLe || 0, color: P.acc, name: kb[k].ten, label: U.fmtPct(kq[i].tyLe) }], total: max, right: U.fmtPct(kq[i].tyLe) })))) + '</div></div>';
    // ---- tương tác ----
    const luu = () => kbLuu(y, kb).then(() => A.gnKichBan(box, y, Sel));
    const them = (k, loai, it) => {
      const pa = kb[k];
      if (loai === 'thu') { if (it.k !== 'ns') { UI.toast('Thu hồi áp dụng cho nội dung dự toán, không áp dụng cho hợp đồng.', 'bad'); return; } if (!pa.thu.includes(it.id)) pa.thu.push(it.id); }
      else { if (pa.them.some(x => x.k === it.k && x.id === it.id)) { UI.toast('Mục này đã có trong phương án.'); return; } pa.them.push({ k: it.k, id: it.id, tien: it.tien }); }
      luu();
    };
    $$('.kb-i', box).forEach(el => {
      const it = { k: el.dataset.k, id: el.dataset.id, tien: +el.dataset.tien };
      el.addEventListener('dragstart', x => { x.dataTransfer.setData('text/plain', JSON.stringify(it)); x.dataTransfer.effectAllowed = 'copy'; });
      const chon = () => { const m = UI.modal({ title: 'Đưa vào phương án', size: 'sm', footer: false, body: PA.map(k => '<button class="cmd-i" data-to="' + k + ':them">' + ic('plus', 16) + '<span class="ct">' + e(kb[k].ten) + ': giải ngân thêm</span></button>' + (it.k === 'ns' ? '<button class="cmd-i" data-to="' + k + ':thu">' + ic('trash', 16) + '<span class="ct">' + e(kb[k].ten) + ': thu hồi</span></button>' : '')).join('') }); UI.on(m.body, 'click', '[data-to]', b => { m.close(true); const [k, l] = b.dataset.to.split(':'); them(k, l, it); }); };
      el.onclick = chon; el.onkeydown = x => { if (x.key === 'Enter') chon(); };
    });
    $$('.kb-drop', box).forEach(z => {
      z.addEventListener('dragover', x => { x.preventDefault(); z.classList.add('on'); });
      z.addEventListener('dragleave', () => z.classList.remove('on'));
      z.addEventListener('drop', x => { x.preventDefault(); z.classList.remove('on'); try { them(z.dataset.pa, z.dataset.loai, JSON.parse(x.dataTransfer.getData('text/plain'))); } catch (er) { } });
    });
    $$('[data-bo]', box).forEach(b => b.onclick = () => { const [k, l, j] = b.dataset.bo.split(':'); kb[k][l].splice(+j, 1); luu(); });
    $$('[data-xoa-pa]', box).forEach(b => b.onclick = () => { const k = b.dataset.xoaPa; kb[k].thu = []; kb[k].them = []; luu(); });
    $$('[data-ten]', box).forEach(i => i.onchange = () => { kb[i.dataset.ten].ten = i.value.trim() || 'Phương án ' + i.dataset.ten; luu(); });
    $$('[data-tien-pa]', box).forEach(i => i.onchange = () => { const n = U.parseNum(i.value); kb[i.dataset.tienPa].them[+i.dataset.j].tien = n === null ? 0 : n; luu(); });
    $('[data-kbq]', box).addEventListener('input', U.debounce(x => { st.q = x.target.value; A.gnKichBan(box, y, Sel); const q = $('[data-kbq]', box); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250));
  };

  /* ======================= 11. SO SÁNH GIỮA CÁC KỲ ======================= */
  // Kỳ số liệu = các ngày có mốc giải ngân (mỗi lần nhập biểu, cập nhật số giải ngân)
  L.gnKy = (y, f) => {
    const leaves = L.gnLeaves(y, f || {}), hs = leaves.map(n => ({ n, h: L.gnHistOf(n.r) }));
    const ky = Array.from(new Set(hs.flatMap(x => x.h.map(z => z.ngay)).filter(d => +d.slice(0, 4) === y))).sort();
    const at = (x, d) => x.h.length ? valAt(x.h, d) : (d >= (ky[ky.length - 1] || '') ? x.n.sum.giaiNgan : 0);
    return { leaves, hs, ky, at, tong: U.sum(leaves, n => n.sum.tong), gnTai: d => U.sum(hs, x => at(x, d)) };
  };
  A.gnSoSanh = (box, y, Sel) => {
    const f = { dv: Sel.dv }, K = L.gnKy(y, f), st = A.vs.ss || (A.vs.ss = {});
    if (!K.ky.length) { box.innerHTML = '<div class="card">' + UI.empty('Chưa có kỳ số liệu nào năm ' + y, 'Mỗi lần nhập biểu Excel hoặc cập nhật số giải ngân, phần mềm ghi một kỳ số liệu để so sánh.') + '</div>'; return; }
    const d1 = K.ky.includes(st.d1) ? st.d1 : K.ky[K.ky.length - 1], truoc = K.ky.filter(d => d < d1), d0 = K.ky.includes(st.d0) && st.d0 < d1 ? st.d0 : truoc[truoc.length - 1] || '';
    const g1 = K.gnTai(d1), g0 = d0 ? K.gnTai(d0) : 0, t = K.tong;
    // Cùng kỳ năm trước: lũy kế năm trước đến cùng ngày, tháng
    const K2 = L.gnKy(y - 1, f), dCK = (y - 1) + d1.slice(4), coCK = K2.tong > 0 && K2.ky.length;
    const gCK = coCK ? K2.gnTai(dCK) : 0;
    // Nội dung đứng yên qua 3 kỳ liên tiếp (tính đến kỳ đang xem)
    const ba = K.ky.filter(d => d <= d1).slice(-3);
    const dungYen = ba.length === 3 ? K.hs.filter(x => x.n.sum.tong - x.n.sum.giaiNgan > 0.5 && ba.every(d => Math.abs(K.at(x, d) - K.at(x, ba[0])) < 0.5)).map(x => ({ r: x.n.r, gn: K.at(x, d1), tong: x.n.sum.tong })).sort((a, b) => (b.tong - b.gn) - (a.tong - a.gn)) : null;
    const tang = K.hs.map(x => ({ r: x.n.r, a: d0 ? K.at(x, d0) : 0, b: K.at(x, d1), tong: x.n.sum.tong })).map(o => Object.assign(o, { d: o.b - o.a })).filter(o => Math.abs(o.d) > 0.5).sort((a, b) => b.d - a.d);
    const dvs = Array.from(new Set(K.leaves.map(n => n.r.donViId))).map(id => { const xs = K.hs.filter(x => x.n.r.donViId === id), a = d0 ? U.sum(xs, x => K.at(x, d0)) : 0, b = U.sum(xs, x => K.at(x, d1)), tg = U.sum(xs, x => x.n.sum.tong); return { ten: Sc.refName('donvi', id) || '(không rõ)', a, b, tg }; }).sort((p, q) => (q.b - q.a) - (p.b - p.a));
    const opt = (v, ds) => ds.map(d => '<option value="' + d + '"' + (d === v ? ' selected' : '') + '>' + U.fmtDate(d) + '</option>').join('');
    const kp = (c, l, v, s) => '<div class="kpi ' + c + ' static"><span class="k-l">' + l + '</span><span class="k-v">' + v + '</span><span class="k-s">' + (s || '&nbsp;') + '</span></div>';
    const dp = (a, b) => { const v = (U.pct(b, t) || 0) - (U.pct(a, t) || 0); return (v >= 0 ? '+' : '') + U.fmtNum(v, 1) + ' điểm'; };
    box.innerHTML = '<div class="toolbar"><label class="small">Kỳ đang xem <select class="sel" style="width:auto" data-d1>' + opt(d1, K.ky.slice().reverse()) + '</select></label><label class="small">so với kỳ <select class="sel" style="width:auto" data-d0><option value="">(đầu năm)</option>' + opt(d0, truoc.slice().reverse()) + '</select></label><span class="sp"></span><span class="small muted">' + K.ky.length + ' kỳ số liệu năm ' + y + '</span></div>' +
      '<div class="kpis mb">' + kp('acc', 'Lũy kế đến ' + U.fmtDate(d1), U.fmtPct(U.pct(g1, t)), fs(g1) + ' / ' + fs(t)) + kp('ok', 'Tăng so với ' + (d0 ? 'kỳ ' + U.fmtDate(d0) : 'đầu năm'), '<small>' + (g1 - g0 >= 0 ? '+' : '') + fs(g1 - g0) + '</small>', dp(g0, g1) + (d0 ? ' · ' + U.diffDays(d1, d0) + ' ngày' : '')) +
      kp('teal', 'Cùng kỳ năm ' + (y - 1), coCK ? U.fmtPct(U.pct(gCK, K2.tong)) : '—', coCK ? fs(gCK) + ' / ' + fs(K2.tong) + ' đến ' + U.fmtDate(dCK) + ' · ' + ((U.pct(g1, t) || 0) - (U.pct(gCK, K2.tong) || 0) >= 0 ? 'năm nay cao hơn ' : 'năm nay thấp hơn ') + U.fmtNum(Math.abs((U.pct(g1, t) || 0) - (U.pct(gCK, K2.tong) || 0)), 1) + ' điểm' : 'Chưa có số liệu năm ' + (y - 1)) +
      kp(dungYen && dungYen.length ? 'bad' : 'ok', 'Đứng yên qua 3 kỳ liên tiếp', dungYen ? dungYen.length : '—', dungYen ? 'Các kỳ ' + ba.map(U.fmtDate).join(', ') : 'Cần ít nhất 3 kỳ số liệu') + '</div>' +
      '<div class="grid2"><div class="card"><div class="card-h"><h3>Theo đơn vị</h3><div class="sub">Lũy kế giải ngân hai kỳ</div></div><div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Đơn vị</th><th class="num">' + (d0 ? U.fmtDate(d0) : 'Đầu năm') + '</th><th class="num">' + U.fmtDate(d1) + '</th><th class="num">Tăng</th><th class="num">Tỷ lệ</th></tr></thead><tbody>' + dvs.map(o => '<tr><td>' + e(o.ten) + '</td><td class="num">' + fs(o.a) + '</td><td class="num">' + fs(o.b) + '</td><td class="num"><b>' + (o.b - o.a >= 0 ? '+' : '') + fs(o.b - o.a) + '</b></td><td class="num">' + U.fmtPct(U.pct(o.b, o.tg)) + '</td></tr>').join('') + '</tbody></table></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Nội dung tăng nhiều nhất</h3><div class="sub">' + tang.length + ' nội dung có thay đổi giữa hai kỳ</div></div><div class="card-b">' + (tang.length ? '<div class="tbl-wrap"><table class="tbl"><tbody>' + tang.slice(0, 10).map(o => '<tr class="click" data-id="' + o.r.id + '"><td class="wrap">' + e(U.trunc(tenNS(o.r), 90)) + '<div class="t2">' + fs(o.a) + ' → ' + fs(o.b) + ' · ' + U.fmtPct(U.pct(o.b, o.tong), 0) + '</div></td><td class="num"><b' + (o.d < 0 ? ' style="color:var(--bad-fg)"' : '') + '>' + (o.d >= 0 ? '+' : '') + fs(o.d) + '</b></td></tr>').join('') + '</tbody></table></div>' : '<div class="small muted">Không có nội dung thay đổi.</div>') + '</div></div></div>' +
      '<div class="card mt"><div class="card-h"><h3>Nội dung đứng yên qua 3 kỳ liên tiếp' + (dungYen ? ' (' + dungYen.length + ')' : '') + '</h3><div class="sub">Còn phải giải ngân nhưng lũy kế không đổi ở 3 kỳ số liệu gần nhất tính đến kỳ đang xem — cần đôn đốc</div></div><div class="card-b">' +
      (!dungYen ? '<div class="note">Mới có ' + ba.length + ' kỳ số liệu tính đến ' + U.fmtDate(d1) + '; cần ít nhất 3 kỳ.</div>' : dungYen.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nội dung</th><th>Đơn vị</th><th class="num">Được sử dụng</th><th class="num">Đã giải ngân</th><th class="num">Còn lại</th><th>Cán bộ</th></tr></thead><tbody>' + dungYen.map(o => '<tr class="click" data-id="' + o.r.id + '"><td class="wrap" style="min-width:240px">' + e(U.trunc(tenNS(o.r), 110)) + '</td><td class="small">' + e(Sc.refName('donvi', o.r.donViId)) + '</td><td class="num">' + fs(o.tong) + '</td><td class="num">' + fs(o.gn) + '</td><td class="num">' + fs(o.tong - o.gn) + '</td><td>' + UI.who(o.r.canBoId) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="note ok">Không có nội dung nào đứng yên qua 3 kỳ.</div>') + '</div></div>';
    $('[data-d1]', box).onchange = x => { st.d1 = x.target.value; st.d0 = ''; A.gnSoSanh(box, y, Sel); };
    $('[data-d0]', box).onchange = x => { st.d0 = x.target.value; A.gnSoSanh(box, y, Sel); };
    $$('tr[data-id]', box).forEach(tr => tr.onclick = () => A.open('ngansach', tr.dataset.id));
  };

  /* ======================= 10. TRANG GIAO BAN A4 NGANG ======================= */
  A.giaoBan = y => {
    y = y || A.year() || +U.today().slice(0, 4);
    const g = L.giaiNgan(y, {}), muc = g.mt.tuDat ? g.mtNay : g.tyLeTG, M = L.GN_MUC[g.muc] || ['', ''];
    let dt = null; try { dt = L.dtTong({}); } catch (x) { }
    const dx = (L.gnDeXuat ? L.gnDeXuat(y, {}) : []).map(x => ({ sev: x.sev, t: x.t, d: x.d }));
    const al = (A.dashAlerts ? A.dashAlerts(y) : L.alerts(y)).filter(a => a.sev >= 2 && !(dx.length && a.loai === 'giaingan')).map(a => ({ sev: a.sev, t: a.title, d: a.detail }));
    const viec = dx.concat(al).filter((x, i, arr) => arr.findIndex(z => z.t === x.t) === i).sort((a, b) => b.sev - a.sev).slice(0, 5);
    const thang = Array.from({ length: 12 }, (_, i) => 'T' + (i + 1)), duBaoVals = thang.map((_, i) => i + 1 > g.lastM && g.lastM < 12 ? g.gn + (g.duBao - g.gn) * (i + 1 - g.lastM) / (12 - g.lastM) : null);
    const dvG = L.gnNhom(y, 'dv').slice(0, 8);
    const k = (c, l, v, s) => '<div class="kpi ' + c + ' static"><span class="k-l">' + l + '</span><span class="k-v">' + v + '</span><span class="k-s">' + (s || '&nbsp;') + '</span></div>';
    const t = U.today();
    const html = '<div class="gb-page"><div class="gb-head"><div><div class="gb-eye">' + e(A.cfg('tenDonVi')) + ' · ' + e(A.cfg('coQuan')) + '</div><h1>Tình hình tài chính, giải ngân, đấu thầu năm ' + y + '</h1></div><div class="gb-date">Giao ban ngày ' + U.fmtDate(t) + '<br><span>Số liệu giải ngân đến ' + U.fmtDate(g.asOf) + '</span></div></div>' +
      '<div class="kpis gb-kpis">' + k('acc', 'Kinh phí được sử dụng', '<small>' + fs(g.tong) + '</small>', g.leaves.length + ' nội dung') + k(g.muc === 'cham' ? 'bad' : 'ok', 'Đã giải ngân', U.fmtPct(g.tyLe), fs(g.gn) + ' · ' + M[1]) + k('violet', g.mt.tuDat ? 'Mục tiêu tháng ' + g.lastM : 'Tỷ lệ thời gian', U.fmtPct(muc), (g.lech >= 0 ? 'Vượt ' : 'Thấp hơn ') + U.fmtNum(Math.abs(g.lech), 1) + ' điểm') + k(g.nguyCo ? 'bad' : 'teal', 'Dự báo đến 31/12', U.fmtPct(U.pct(g.duBao, g.tong)), fs(g.duBao)) + k('warn', 'Còn phải giải ngân', '<small>' + fs(g.conLai) + '</small>', g.canMoiThang !== null && g.conLai > 0.5 ? fs(g.canMoiThang) + '/tháng' : '') +
        (dt ? k(dt.quaHanLC + dt.quaHanHD ? 'bad' : 'info', 'Gói thầu, hợp đồng', dt.soGT + ' gói · ' + dt.soHD + ' HĐ', dt.soChuaTC + ' gói chưa tổ chức LCNT · ' + (dt.quaHanLC + dt.quaHanHD) + ' quá hạn') : '') + '</div>' +
      '<div class="gb-body"><div class="gb-chart"><h3>Giải ngân lũy kế theo tháng (tỷ đồng)</h3>' + UI.bars({ cats: thang, fmt: ty, labels: false, series: [{ name: 'Đã giải ngân', color: P.acc, vals: g.thang }, { name: 'Dự báo', color: 'var(--idle)', vals: duBaoVals }], line: { name: 'Mục tiêu', color: 'var(--violet)', vals: g.mtTien }, label: 'Giải ngân lũy kế' }) +
        (dvG.length > 1 ? '<h3 style="margin-top:8px">Tỷ lệ giải ngân theo đơn vị</h3>' + UI.hbars(dvG.map(o => ({ name: U.trunc(o.ten, 34), parts: [{ val: o.ty || 0, color: (o.ty || 0) < muc - A.nguong('gnLech') ? P.bad : P.ok, name: 'Tỷ lệ', label: U.fmtPct(o.ty) }], total: 100, right: fs(o.gn) + '/' + fs(o.tong) }))) : '') + '</div>' +
        '<div class="gb-viec"><h3>' + viec.length + ' việc cần chỉ đạo</h3>' + (viec.length ? viec.map((v, i) => '<div class="gb-v s' + v.sev + '"><span class="gb-n">' + (i + 1) + '</span><div><b>' + e(v.t) + '</b>' + (v.d ? '<p>' + e(U.trunc(v.d, 230)) + '</p>' : '') + '</div></div>').join('') : '<p>Không có việc cần chỉ đạo theo dữ liệu hiện có.</p>') + '</div></div>' +
      '<div class="gb-foot">Tổng hợp tự động từ phần mềm Phòng KH-TC số lúc ' + U.fmtDateTime(U.nowStamp()) + '. Số liệu phụ thuộc lần cập nhật gần nhất của các đơn vị.</div></div>';
    const css = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
    const w = window.open('', '_blank');
    if (!w) { UI.toast('Trình duyệt chặn cửa sổ mới. Cho phép cửa sổ bật lên để mở trang giao ban.', 'bad'); return; }
    w.document.write('<!DOCTYPE html><html lang="vi" data-theme="light"><head><meta charset="utf-8"><title>Giao ban ' + U.fmtDate(t) + '</title><style>' + css + '\n' + GB_CSS + '</style></head><body class="gb"><div class="gb-tools"><button class="btn primary" onclick="window.print()">In / lưu PDF</button><button class="btn" onclick="document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()">Trình chiếu toàn màn hình</button><span>Khổ A4 ngang — chọn "Ngang" và tắt "Đầu trang, chân trang" khi in</span></div>' + html + '</body></html>');
    w.document.close();
  };
  const GB_CSS = '@page{size:A4 landscape;margin:8mm}body.gb{background:#e9ece8;margin:0;padding:16px}.gb-tools{display:flex;gap:8px;align-items:center;max-width:281mm;margin:0 auto 10px;font-size:13px;color:#556}' +
    '.gb-page{background:var(--card,#fff);width:281mm;height:194mm;margin:0 auto;padding:7mm 9mm;box-sizing:border-box;display:flex;flex-direction:column;gap:5mm;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.12)}' +
    '.gb-head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--accent);padding-bottom:3mm}.gb-head h1{font-size:21px;margin:2px 0 0}.gb-eye{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.gb-date{text-align:right;font-weight:700;font-size:14px}.gb-date span{font-weight:400;font-size:12px;color:var(--muted)}' +
    '.gb-kpis{grid-template-columns:repeat(6,minmax(0,1fr))!important;margin:0}.gb-kpis .kpi{padding:9px 11px}.gb-kpis .k-v{font-size:24px}' +
    '.gb-body{flex:1;min-height:0;display:grid;grid-template-columns:1.25fr 1fr;gap:6mm}.gb-chart,.gb-viec{min-height:0;overflow:hidden}.gb-body h3{font-size:14px;margin:0 0 4px}.gb-chart svg{max-height:62mm}' +
    '.gb-v{display:flex;gap:10px;padding:7px 9px;border-left:4px solid var(--info);background:var(--hover);border-radius:6px;margin-bottom:6px;font-size:13px}.gb-v.s3{border-color:var(--bad)}.gb-v.s2{border-color:var(--warn)}.gb-v p{margin:2px 0 0;color:var(--soft,#445);font-size:12px}.gb-n{font-weight:800;font-size:16px;min-width:18px}' +
    '.gb-foot{font-size:10px;color:var(--muted)}@media print{body.gb{background:#fff;padding:0}.gb-tools{display:none}.gb-page{box-shadow:none;margin:0;width:auto;height:190mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

  /* ---------- CSS trong ứng dụng cho kịch bản ---------- */
  const st = document.createElement('style');
  st.textContent = '.kb-wrap{display:grid;grid-template-columns:minmax(260px,1fr) 3fr;gap:14px;align-items:start}.kb-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.kb-list{max-height:62vh;overflow:auto;display:flex;flex-direction:column;gap:6px}' +
    '.kb-i{display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--card);cursor:grab}.kb-i:hover{border-color:var(--accent)}.kb-i .t1,.kb-i .t2{display:block}' +
    '.kb-tag{font-size:10.5px;font-weight:700;border-radius:4px;padding:1px 5px;flex:none;margin-top:2px;background:var(--accent-soft);color:var(--accent)}.kb-tag.hd{background:var(--info-bg);color:var(--info-fg)}.kb-tag.thu{background:var(--bad-bg,#fde8e6);color:var(--bad-fg)}' +
    '.kb-ten{font-weight:700;height:32px;flex:1}.kb-kq{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}.kb-kq b{font-size:26px}.kb-drop{border:1.5px dashed var(--border-strong);border-radius:var(--r-md);padding:8px;margin-bottom:8px;min-height:64px}.kb-drop.on{border-color:var(--accent);background:var(--accent-soft)}.kb-drop .eyebrow{margin:0 0 6px}' +
    '.kb-c{display:flex;gap:6px;align-items:center;margin-bottom:4px}.kb-tien{width:118px;height:30px;font-size:12.5px}@media (max-width:1100px){.kb-wrap{grid-template-columns:minmax(0,1fr)}.kb-cols{grid-template-columns:minmax(0,1fr)}}';
  if (typeof document !== 'undefined') document.head.appendChild(st);
})(App);
