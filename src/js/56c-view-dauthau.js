/* ============================================================
   56c-view-dauthau.js — Tổng quan gói thầu, hợp đồng do Sở làm chủ đầu tư
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$, P = UI.PAL;
  const fs = U.fmtShort;
  const kpi = (cls, l, v, s, act) => '<button class="kpi ' + cls + (act ? '' : ' static') + '"' + (act ? ' data-dk="' + e(act) + '"' : ' tabindex="-1"') + '><span class="k-l">' + e(l) + '</span><span class="k-v">' + v + '</span><span class="k-s">' + (s || '&nbsp;') + '</span></button>';
  const opt = (list, v) => list.map(o => '<option value="' + e(o[0]) + '"' + (String(v || '') === String(o[0]) ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('');

  // Thanh bước tình trạng gói thầu (dùng trong hộp chi tiết)
  A.gtStepper = g => {
    if (g.trangThai === 'huy') return '<div class="note warn mb">Gói thầu đã hủy, không thực hiện.</div>';
    const steps = A.OPT.ttGT.filter(o => o[0] !== 'huy'), cur = L.gtBuoc(g), tt = g.tienTrinh || [];
    return '<ol class="stepper mb" aria-label="Tiến trình gói thầu">' + steps.map((o, i) => '<li class="' + (i < cur ? 'done' : i === cur ? 'cur' : '') + '"' + (i === cur ? ' aria-current="step"' : '') + '><span class="dot">' + (i < cur ? '✓' : i + 1) + '</span><span class="lb">' + e(o[1]) + '</span></li>').join('') + '</ol>' +
      (tt.length ? '<div class="small soft mb">Tiến trình đã ghi: ' + tt.map(x => e(x.buoc) + (x.ngay ? ' (' + U.fmtDate(x.ngay) + ')' : '')).join(' → ') + '</div>' : '');
  };

  function tongQuan(root, T) {
    const f = { duan: T.duan, cb: T.cb }, t = L.dtTong(f), viec = L.dtViec(f), lich = L.dtLich(f, 60);
    const daOpts = [['', 'Tất cả chương trình, dự án']].concat(S.all('duan').filter(d => S.all('goithau').some(g => g.duAnId === d.id) || S.all('hopdong').some(h => h.duAnId === d.id)).map(d => [d.id, U.trunc(d.ten, 70)]));
    const cbOpts = [['', 'Tất cả cán bộ']].concat(S.all('canbo').filter(c => c.trangThai !== 'nghi').map(c => [c.id, c.hoTen]));
    let h = '<div class="toolbar"><select class="sel" data-fda aria-label="Chương trình, dự án">' + opt(daOpts, T.duan) + '</select><select class="sel" data-fcb aria-label="Cán bộ theo dõi">' + opt(cbOpts, T.cb) + '</select><span class="sp"></span><button class="btn" data-rep>' + ic('report', 16) + 'Lập báo cáo</button><button class="btn" data-addgt>' + ic('plus', 16) + 'Thêm gói thầu</button><button class="btn primary" data-vbd>' + ic('inbox', 16) + 'Cập nhật từ văn bản</button></div>';
    if (!t.soGT && !t.soHD) {
      root.innerHTML = h + '<div class="card">' + UI.empty('Chưa có gói thầu, hợp đồng nào', 'Thêm trực tiếp, hoặc đưa quyết định phê duyệt kế hoạch lựa chọn nhà thầu, quyết định phê duyệt kết quả, hợp đồng vào trang "Văn bản đến" để phần mềm đọc và điền sẵn thông tin.') + '</div>';
      bind(); return;
    }
    h += '<div class="kpis mb">' +
      kpi('acc', 'Gói thầu, nội dung mua sắm', t.soGT, 'Tổng giá gói thầu ' + fs(t.giaGT), 'gt:') +
      kpi('warn', 'Chưa tổ chức lựa chọn', t.soChuaTC, t.soDangLC + ' gói đang lựa chọn nhà thầu', 'gt:') +
      kpi('ok', 'Đã có kết quả LCNT', t.soCoKQ, 'Giá trúng thầu ' + fs(t.giaTrung), 'gt:') +
      kpi('teal', 'Giá trị tiết kiệm qua đấu thầu', t.tietKiem ? '<small>' + fs(t.tietKiem) + '</small>' : '—', t.tietKiem ? U.fmtPct(t.tyLeTK) + ' giá các gói đã có kết quả' : '') +
      kpi('info', 'Hợp đồng', t.soHD, t.soHDDang + ' đang thực hiện · giá trị ' + fs(t.giaHD), 'hd:') +
      kpi('ok', 'Đã thanh toán hợp đồng', t.giaHD ? U.fmtPct(t.tyLeTT) : '—', fs(t.daTT) + ' · còn ' + fs(t.conPhaiTT), 'hd:') +
      kpi(t.tamUngCon > 0.5 ? 'warn' : '', 'Tạm ứng chưa thu hồi', t.tamUngCon > 0.5 ? '<small>' + fs(t.tamUngCon) + '</small>' : '0', t.blCanhBao ? t.blCanhBao + ' bảo lãnh cần gia hạn, theo dõi' : '', 'hd:') +
      kpi(t.quaHanLC + t.quaHanHD ? 'bad' : 'ok', 'Quá hạn', t.quaHanLC + t.quaHanHD, t.quaHanLC + ' gói quá hạn LCNT · ' + t.quaHanHD + ' hợp đồng quá hạn', t.quaHanHD ? 'hd:quahan' : t.quaHanLC ? 'gt:quahan' : '') + '</div>';
    const funnel = t.byTT.filter(o => o.n).map(o => ({ name: o.ten, act: 'gt:' + o.k, parts: [{ val: o.n, color: o.k === 'huy' ? P.idle : ['cokq', 'dakyhd'].includes(o.k) ? P.ok : o.k === 'danglcnt' ? P.info : P.warn, name: o.ten }], right: o.n + ' gói · ' + fs(o.gia) }));
    h += '<div class="grid2"><div class="card"><div class="card-h"><h3>Gói thầu theo bước</h3><div class="sub">Từ nhu cầu mua sắm đến ký hợp đồng; bấm để xem danh sách</div></div><div class="card-b" data-hb>' + UI.hbars(funnel) + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Việc cần xử lý (' + viec.length + ')</h3><div class="sub">Quá hạn lựa chọn nhà thầu, hợp đồng sắp hết hạn, bảo lãnh sắp hết hiệu lực, nghiệm thu chưa thanh toán</div></div><div class="card-b">' + (viec.length ? viec.slice(0, 8).map(A.issueHtml).join('') + (viec.length > 8 ? '<div class="small muted" style="padding-top:6px">… và ' + (viec.length - 8) + ' việc khác</div>' : '') : '<div class="note ok">Không có việc cần xử lý.</div>') + '</div></div></div>';
    h += '<div class="grid2 mt"><div class="card"><div class="card-h"><h3>Lịch hạn trong 60 ngày tới</h3><div class="sub">Gồm cả mốc đã quá hạn chưa xử lý</div></div><div class="card-b">' + (lich.length ? '<table class="tbl"><tbody>' + lich.slice(0, 14).map(x => '<tr class="click" data-go="' + x.coll + ':' + x.id + '"><td class="nowrap" style="padding-left:0"><b' + (x.qua ? ' style="color:var(--bad-fg)"' : '') + '>' + U.fmtDate(x.d) + '</b><div class="t2">' + (x.qua ? 'Đã quá ' + U.diffDays(U.today(), x.d) + ' ngày' : 'Còn ' + U.diffDays(x.d, U.today()) + ' ngày') + '</div></td><td class="wrap"><div class="t1">' + e(x.loai) + '</div><div class="t2">' + e(U.trunc(x.ten, 90)) + '</div></td></tr>').join('') + '</tbody></table>' : '<div class="note ok">Không có mốc hạn nào trong 60 ngày tới.</div>') + '</div></div>';
    const dang = t.hx.filter(o => (o.h.trangThai || 'dang') === 'dang' || o.h.trangThai === 'nghiemthu').sort((a, b) => b.x.giaTriHL - a.x.giaTriHL).slice(0, 10);
    h += '<div class="card"><div class="card-h"><h3>Thanh toán hợp đồng đang thực hiện</h3><div class="sub">Đã thanh toán / giá trị hợp đồng sau phụ lục</div></div><div class="card-b" data-hb>' + (dang.length ? UI.hbars(dang.map(o => ({ name: (o.h.so || '') + ' ' + (o.h.nhaThau || ''), act: 'hdopen:' + o.h.id, total: o.x.giaTriHL, parts: [{ val: o.x.thanhToan, color: P.ok, name: 'Đã thanh toán', label: fs(o.x.thanhToan) }, { val: Math.max(0, o.x.nghiemThu - o.x.thanhToan), color: P.warn, name: 'Đã nghiệm thu, chưa thanh toán', label: fs(Math.max(0, o.x.nghiemThu - o.x.thanhToan)) }, { val: Math.max(0, o.x.giaTriHL - Math.max(o.x.nghiemThu, o.x.thanhToan)), color: 'var(--grid)', name: 'Còn lại', label: fs(Math.max(0, o.x.giaTriHL - Math.max(o.x.nghiemThu, o.x.thanhToan))) }], right: U.fmtPct(o.x.tyLeTT, 0) }))) + '<div class="legend"><span><i style="background:var(--ok)"></i>Đã thanh toán</span><span><i style="background:var(--warn)"></i>Nghiệm thu chưa thanh toán</span><span><i style="background:var(--grid)"></i>Còn lại</span></div>' : '<div class="note">Không có hợp đồng đang thực hiện.</div>') + '</div></div></div>';
    const gRows = t.hx.filter(o => o.h.ngayBD || o.h.ngayKy || o.x.han).sort((a, b) => U.cmp(a.x.han, b.x.han)).slice(0, 25).map(o => ({ label: (o.h.so || '') + ' — ' + (o.h.ten || o.h.nhaThau || ''), act: 'hdopen:' + o.h.id, bars: [{ a: o.h.ngayBD || o.h.ngayKy, b: o.x.han, st: o.h.trangThai === 'thanhly' ? 'ok' : o.x.over ? 'bad' : o.x.near ? 'warn' : 'info', title: 'Từ ' + U.fmtDate(o.h.ngayBD || o.h.ngayKy) + ' đến ' + U.fmtDate(o.x.han) }], dots: (o.h.phuLuc || []).filter(p => p.giaHanDen).map(p => ({ d: p.ngay || p.giaHanDen, st: 'warn', title: 'Phụ lục ' + p.so + (p.giaHanDen ? ': gia hạn đến ' + U.fmtDate(p.giaHanDen) : '') })) }));
    if (gRows.length) h += '<div class="card mt"><div class="card-h"><h3>Tiến độ thực hiện hợp đồng</h3><div class="sub">Từ ngày bắt đầu (hoặc ngày ký) đến thời hạn hợp đồng sau gia hạn</div></div><div class="card-b">' + UI.gantt(gRows, { head: 'Hợp đồng' }) + '</div></div>';
    root.innerHTML = h; bind();
    function bind() {
      $('[data-fda]', root).onchange = x => { T.duan = x.target.value; A.render(); };
      $('[data-fcb]', root).onchange = x => { T.cb = x.target.value; A.render(); };
      $('[data-addgt]', root).onclick = () => UI.form({ coll: 'goithau', rec: { duAnId: T.duan || '', canBoId: T.cb || '' } });
      $('[data-vbd]', root).onclick = () => A.go('vanbanden');
      $('[data-rep]', root).onclick = () => { const td = U.today(); A.vs.bc = Object.assign(A.vs.bc || { kind: 'nam', n: 1, from: td.slice(0, 8) + '01', to: td, nhom: '', dv: '', secs: [] }, { type: 'dauthau', kind: 'nam', y: +td.slice(0, 4), duan: T.duan || '', cb: T.cb || '' }); A.go('baocao'); };
      A.bindGo(root);
      UI.on(root, 'click', '[data-act]', b => { const [k, v] = b.dataset.act.split(':'); if (k === 'hdopen') A.open('hopdong', v); else if (k === 'gt') goList('gt', v); });
      UI.on(root, 'click', '[data-dk]', b => { const [k, v] = b.dataset.dk.split(':'); goList(k, v); });
    }
    function goList(tab, tt) { T.t = tab; const key = tab === 'gt' ? 'goithau' : 'hopdong', vs = A.vs[key] || (A.vs[key] = { q: '', f: {}, tbl: {} }); vs.f = tt ? { tt } : {}; vs.q = ''; vs.tbl.page = 0; A.render(); }
  }

  const base = A.views.dauthau.render;
  A.views.dauthau.sub = 'Gói thầu, hợp đồng do Sở làm chủ đầu tư: kế hoạch lựa chọn nhà thầu, kết quả, tạm ứng, bảo lãnh, nghiệm thu, thanh toán, thanh lý';
  A.views.dauthau.render = (root, p) => {
    const T = A.vs.dtTab || (A.vs.dtTab = { t: 'tq' }); if (p && p.tab) T.t = p.tab;
    if (T.t === 'tq') {
      const gts = S.count('goithau'), hds = S.count('hopdong');
      root.innerHTML = '<div class="tabs" role="tablist"><button role="tab" class="on" data-t="tq">Tổng quan</button><button role="tab" data-t="gt">Gói thầu, mua sắm (' + gts + ')</button><button role="tab" data-t="hd">Hợp đồng (' + hds + ')</button></div><div data-tq></div>';
      $$('[data-t]', root).forEach(b => b.onclick = () => { T.t = b.dataset.t; A.render(); });
      tongQuan($('[data-tq]', root), T); return;
    }
    base(root, p);
    const tabs = $('.tabs', root);
    if (tabs) { const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.dataset.t = 'tq'; b.textContent = 'Tổng quan'; b.onclick = () => { T.t = 'tq'; A.render(); }; tabs.prepend(b); }
  };
})(App);
