/* ============================================================
   56h-ns-mo-rong.js — Mở rộng Tài chính, giải ngân:
   (1) Sổ quyết định dự toán (giao, bổ sung, điều chỉnh, thu hồi) và đối chiếu với số trên dòng dự toán
   (2) Mã ngân sách: Chương, Loại, Khoản, mã nguồn
   (3) Đơn vị dự toán / phòng, bộ phận thực hiện
   (5) Đối chiếu số Kho bạc theo đơn vị; tạm ứng chưa thanh toán
   (7) Xử lý cuối năm: đề nghị chuyển nguồn, hủy dự toán, thu hồi; ghi số quyết toán
   Không sửa công thức tổng kinh phí (L.nsTong); các phần mới chỉ ghi thêm trường và đối chiếu.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const F = (k, label, type, o) => Object.assign({ k, label, type: type || 'text' }, o || {});
  const fs = U.fmtShort;

  /* ---------- Trường dữ liệu mới ---------- */
  const fLoai = Sc.field('donvi', 'loai');
  if (fLoai) { fLoai.type = 'select'; fLoai.options = [['dutoan', 'Đơn vị dự toán'], ['phong', 'Phòng, bộ phận (không phải đơn vị dự toán)']]; fLoai.help = 'Phòng thuộc Văn phòng Sở (KHTC, QLMT…) chọn "Phòng, bộ phận": không hiện khi chọn đơn vị nhập biểu, chỉ dùng làm nơi thực hiện.'; }
  Sc.C.donvi.fields.splice(3, 0, F('maQHNS', 'Mã đơn vị quan hệ ngân sách', 'text', { table: true }), F('thuocId', 'Thuộc đơn vị dự toán', 'ref', { ref: 'donvi', help: 'Với phòng, bộ phận: đơn vị dự toán quản lý (thường là Văn phòng Sở)' }));
  const nsF = Sc.C.ngansach.fields, sau = (k, ...fs_) => { const i = nsF.findIndex(f => f.k === k); nsF.splice(i + 1, 0, ...fs_); };
  sau('donViId', F('phongId', 'Phòng, bộ phận thực hiện', 'ref', { ref: 'donvi', help: 'Nơi thực hiện nội dung (ví dụ Phòng KH-TC thuộc Văn phòng Sở); đơn vị dự toán vẫn là đơn vị được giao.' }));
  sau('chuongKhoan', F('chuong', 'Chương'), F('loaiNS', 'Loại'), F('khoan', 'Khoản'), F('maNguon', 'Mã nguồn kinh phí', 'select', { options: L.NS_NGUON, help: 'Bỏ trống: phần mềm tự xác định theo nội dung dòng và dòng cha' }));
  sau('ngayGN', F('tamUng', 'Trong đó: tạm ứng chưa thanh toán (đồng)', 'money', { help: 'Phần đã giải ngân dưới hình thức tạm ứng, chưa đủ hồ sơ thanh toán' }));
  nsF.push(F('cuoiNamXL', 'Đề xuất xử lý cuối năm', 'select', { options: [['tiep', 'Tiếp tục giải ngân trước 31/12'], ['chuyennguon', 'Đề nghị chuyển nguồn sang năm sau'], ['huy', 'Hủy dự toán'], ['thuhoi', 'Thu hồi về ngân sách']] }), F('cuoiNamTien', 'Số tiền xử lý cuối năm (đồng)', 'money'), F('cuoiNamLyDo', 'Lý do, căn cứ xử lý cuối năm', 'textarea'));
  Sc.C.ngansach.sections = [
    { t: 'Vị trí trong biểu', keys: ['donViId', 'phongId', 'nam', 'parentId', 'stt', 'noiDung', 'nhomKP', 'quyetDinh'] },
    { t: 'Mã ngân sách (bỏ trống: lấy theo chữ của dòng hoặc dòng cha)', keys: ['chuong', 'loaiNS', 'khoan', 'maNguon', 'chuongKhoan'] },
    { t: 'Dự toán — cột 3 đến 8 của biểu (chỉ nhập ở dòng chi tiết; dòng có dòng con tự cộng)', keys: ['chuyenNguon', 'duToan', 'boSung', 'dcTang', 'dcGiam', 'thuHoi', 'tietKiem'] },
    { t: 'Thực hiện — cột 10 của biểu, quyết toán', keys: ['giaiNgan', 'ngayGN', 'tamUng', 'quyetToan', 'tienDo'] },
    { t: 'Quyết định thu hồi kinh phí', keys: ['qdThuHoi', 'qdThuHoiNgay', 'qdThuHoiTien'] },
    { t: 'Xử lý cuối năm', keys: ['cuoiNamXL', 'cuoiNamTien', 'cuoiNamLyDo'] },
    { t: 'Theo dõi', keys: ['ghiChuBieu', 'canBoId', 'duAnId', 'ghiChu'] }];

  const LOAI_QD = [['giao', 'Giao dự toán đầu năm'], ['bosung', 'Bổ sung dự toán'], ['dieuchinh', 'Điều chỉnh dự toán'], ['thuhoi', 'Thu hồi dự toán'], ['tietkiem', 'Tiết kiệm chi'], ['chuyennguon', 'Chuyển nguồn']];
  Sc.C.qddt = {
    label: 'Quyết định dự toán', title: r => (r.so || '(chưa có số)') + (r.ngay ? ' ngày ' + U.fmtDate(r.ngay) : '') + (r.trichYeu ? ' — ' + U.trunc(r.trichYeu, 60) : ''),
    fields: [
      F('nam', 'Năm ngân sách', 'year', { required: true }),
      F('so', 'Số, ký hiệu', 'text', { required: true, table: true, help: 'Ví dụ 1155/QĐ-SNNMT' }),
      F('ngay', 'Ngày ký', 'date', { table: true }),
      F('coQuan', 'Cơ quan ban hành', 'select', { options: [['ubnd', 'UBND tỉnh'], ['so', 'Sở Nông nghiệp và Môi trường'], ['khac', 'Cơ quan khác']], def: 'so' }),
      F('loai', 'Loại quyết định', 'select', { options: LOAI_QD, required: true, table: true }),
      F('trichYeu', 'Trích yếu', 'textarea', { full: true }),
      F('dong', 'Các dòng dự toán theo quyết định', 'rows', { full: true, help: 'Mỗi dòng: dòng dự toán, cột chịu tác động và số tiền theo quyết định. Một dòng dự toán có thể có nhiều quyết định; phần mềm cộng lại để đối chiếu với số trên dòng.',
        cols: [F('nsId', 'Dòng dự toán', 'ref', { ref: 'ngansach', required: true }), F('cot', 'Cột', 'select', { options: L.QD_COT, required: true }), F('soTien', 'Số tiền (đồng)', 'money', { required: true }), F('ghiChu', 'Ghi chú')] }),
      F('dinhKem', 'Tệp quyết định', 'files'),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    normalize(r) { (r.dong || []).forEach(d => { const ns = S.get('ngansach', d.nsId); if (ns) d.donViId = ns.donViId; }); }
  };
  Sc.TRACKED.push('qddt');
  A.openers.qddt = id => UI.detail({ coll: 'qddt', id });
  const tenQD = q => Sc.C.qddt.title(q), cotTen = c => (L.QD_COT.find(x => x[0] === c) || [c, c])[1];
  const dvSel = (Sel, k, all) => '<select class="sel" ' + k + ' aria-label="Đơn vị dự toán"><option value="">' + (all || 'Tất cả đơn vị') + '</option>' + L.dvDuToan().map(d => '<option value="' + d.id + '"' + (d.id === Sel.dv ? ' selected' : '') + '>' + e(d.tenTat || d.ten) + '</option>').join('') + '</select>';

  /* ---------- (1) Thẻ "Quyết định dự toán" ---------- */
  A.nsQD = (box, y, Sel) => {
    const qds = S.all('qddt').filter(q => +q.nam === y).sort((a, b) => (a.ngay || '') < (b.ngay || '') ? -1 : 1);
    const dvDong = d => d.donViId || (S.get('ngansach', d.nsId) || {}).donViId;
    const loc = q => !Sel.dv || !(q.dong || []).length || (q.dong || []).some(d => dvDong(d) === Sel.dv), ds = qds.filter(loc);
    const dc = L.qdDoiChieu(y, Sel.dv || null), lech = dc.dong.filter(x => x.st !== 'khop'), khop = dc.dong.length - lech.length;
    const tongQD = q => U.sum((q.dong || []).filter(d => !Sel.dv || dvDong(d) === Sel.dv), d => U.num(d.soTien));
    let h = '<div class="toolbar">' + dvSel(Sel, 'data-qdv') + '<span class="sp"></span><button class="btn" data-gan>' + ic('link', 16) + 'Gắn số đang có vào quyết định</button><button class="btn primary" data-qadd>' + ic('plus', 16) + 'Thêm quyết định</button></div>';
    h += '<div class="note mb small">Sổ quyết định là căn cứ của mọi con số dự toán: mỗi quyết định giao, bổ sung, điều chỉnh, thu hồi ghi các dòng dự toán chịu tác động. Phần mềm cộng các quyết định theo từng dòng, từng cột và so với số đang ghi trên dòng để phát hiện số không có căn cứ, giảm trùng, giảm quá số được giao.</div>';
    h += '<div class="kpis mb"><div class="kpi static"><span class="k-l">Quyết định năm ' + y + '</span><span class="k-v">' + ds.length + '</span><span class="k-s">' + LOAI_QD.map(l => { const n = ds.filter(q => q.loai === l[0]).length; return n ? n + ' ' + l[1].toLowerCase() : ''; }).filter(Boolean).join(' · ') + '</span></div>' +
      '<div class="kpi ok static"><span class="k-l">Số khớp quyết định</span><span class="k-v">' + khop + '</span><span class="k-s">ô số (dòng × cột)</span></div>' +
      '<div class="kpi warn static"><span class="k-l">Chưa có căn cứ quyết định</span><span class="k-v">' + lech.filter(x => x.st === 'chuaqd').length + '</span><span class="k-s">' + fs(U.sum(lech.filter(x => x.st === 'chuaqd'), x => x.chenh)) + '</span></div>' +
      '<div class="kpi bad static"><span class="k-l">Lệch quyết định, âm, mất dòng</span><span class="k-v">' + (lech.filter(x => x.st !== 'chuaqd').length + dc.am.length + dc.mat.length) + '</span><span class="k-s">' + (dc.am.length ? dc.am.length + ' dòng âm · ' : '') + (dc.mat.length ? dc.mat.length + ' dòng QĐ trỏ tới dòng đã xóa' : '') + '</span></div></div>';
    h += '<div class="card mb"><div class="card-h"><h3>Sổ quyết định dự toán năm ' + y + '</h3></div>' + (ds.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Số, ngày</th><th>Loại</th><th>Cơ quan</th><th>Trích yếu</th><th class="num">Số dòng</th><th class="num">Tổng tiền' + (Sel.dv ? ' (đơn vị đang lọc)' : '') + '</th></tr></thead><tbody>' +
      ds.map(q => '<tr class="click" data-qid="' + q.id + '"><td class="nowrap"><b>' + e(q.so || '') + '</b><div class="t2">' + U.fmtDate(q.ngay) + '</div></td><td class="small">' + e((LOAI_QD.find(l => l[0] === q.loai) || ['', ''])[1]) + '</td><td class="small">' + e({ ubnd: 'UBND tỉnh', so: 'Sở NN&MT', khac: 'Khác' }[q.coQuan] || '') + '</td><td class="wrap small">' + e(q.trichYeu || '') + '</td><td class="num">' + (q.dong || []).length + '</td><td class="num">' + U.fmtMoney(tongQD(q)) + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="card-b">' + UI.empty('Chưa có quyết định nào năm ' + y, 'Thêm quyết định giao dự toán đầu năm (ví dụ QĐ 1155/QĐ-SNNMT), rồi dùng "Gắn số đang có vào quyết định" để ghi căn cứ cho các dòng đã nhập từ biểu.') + '</div>') + '</div>';
    const ten = r => (r.stt ? r.stt + ' ' : '') + U.trunc(r.noiDung, 90), ST = { lech: ['quahan', 'Lệch quyết định'], chuaqd: ['saphan', 'Chưa có quyết định'], thuaqd: ['quahan', 'Quyết định có, dòng không ghi số'] };
    const ds2 = lech.slice().sort((a, b) => (a.st === 'chuaqd') - (b.st === 'chuaqd') || Math.abs(b.chenh) - Math.abs(a.chenh));
    h += '<div class="card"><div class="card-h"><h3>Đối chiếu số trên dòng dự toán với sổ quyết định</h3><div class="sub">Chỉ liệt kê ô chưa khớp. Chênh = số trên dòng − cộng các quyết định.</div></div>' +
      ((dc.am.length || dc.mat.length) ? '<div class="card-b">' + dc.am.map(x => '<div class="note bad small mb">Dòng <b>' + e(ten(x.r)) + '</b> (' + e(Sc.refName('donvi', x.r.donViId)) + ') có tổng kinh phí được sử dụng âm: ' + U.fmtMoney(x.tong) + ' đồng. Thường do giảm, thu hồi vượt số được giao (giảm trùng giữa các quyết định).</div>').join('') + dc.mat.map(x => '<div class="note warn small mb">Quyết định <b>' + e(x.qd.so || '') + '</b> có dòng trỏ tới dòng dự toán đã xóa hoặc thay khi nhập lại biểu (' + U.fmtMoney(x.d.soTien) + ' đồng, cột ' + e(cotTen(x.d.cot)) + '): mở quyết định để chọn lại dòng.</div>').join('') + '</div>' : '') +
      (ds2.length ? '<div class="tbl-wrap" style="max-height:60vh;overflow:auto"><table class="tbl"><thead><tr><th>Dòng dự toán</th><th>Cột</th><th class="num">Số trên dòng</th><th class="num">Theo quyết định</th><th class="num">Chênh</th><th>Tình trạng</th></tr></thead><tbody>' +
        ds2.slice(0, 300).map(x => '<tr class="click" data-nsid="' + x.r.id + '"><td class="wrap" style="min-width:240px">' + e(ten(x.r)) + '<div class="t2">' + e(Sc.refName('donvi', x.r.donViId)) + '</div></td><td class="small">' + e(cotTen(x.cot)) + '</td><td class="num">' + U.fmtMoney(x.so) + '</td><td class="num">' + U.fmtMoney(x.qd) + '</td><td class="num"><b>' + U.fmtMoney(x.chenh) + '</b></td><td>' + UI.chip(ST[x.st][0], ST[x.st][1]) + '</td></tr>').join('') + '</tbody></table></div>' + (ds2.length > 300 ? '<div class="pager"><span>Hiện 300 / ' + ds2.length + ' ô</span></div>' : '')
        : '<div class="card-b"><div class="note ok">Mọi ô số dự toán' + (Sel.dv ? ' của đơn vị đang lọc' : '') + ' đều khớp sổ quyết định.</div></div>') + '</div>';
    box.innerHTML = h;
    $('[data-qdv]', box).onchange = x => { Sel.dv = x.target.value; A.render(); };
    $('[data-qadd]', box).onclick = () => UI.form({ coll: 'qddt', rec: { nam: y, coQuan: 'so' } });
    $('[data-gan]', box).onclick = () => ganSoDangCo(y, Sel.dv);
    $$('[data-qid]', box).forEach(tr => tr.onclick = () => A.open('qddt', tr.dataset.qid));
    $$('[data-nsid]', box).forEach(tr => tr.onclick = () => A.open('ngansach', tr.dataset.nsid));
  };

  // Ghi phần số chưa có căn cứ của một đơn vị, một cột vào một quyết định (lập sổ nhanh từ số đã nhập theo biểu)
  function ganSoDangCo(y, dv0) {
    const qds = S.all('qddt').filter(q => +q.nam === y);
    if (!qds.length) { UI.toast('Thêm quyết định trước (ví dụ quyết định giao dự toán đầu năm), sau đó gắn số.', 'bad'); return; }
    const m = UI.modal({ title: 'Gắn số đang có vào quyết định', size: 'sm',
      body: '<p class="small soft">Phần số trên các dòng chi tiết chưa có căn cứ (chênh giữa số trên dòng và cộng các quyết định đã ghi) của cột đã chọn được ghi vào quyết định. Dùng để lập sổ nhanh cho các dòng nhập từ biểu; kiểm tra lại số trên quyết định gốc trước khi gắn.</p>' +
        '<div class="fld"><label for="g_qd">Quyết định</label><select class="sel" id="g_qd">' + qds.map(q => '<option value="' + q.id + '">' + e(tenQD(q)) + '</option>').join('') + '</select></div>' +
        '<div class="fld"><label for="g_dv">Đơn vị dự toán</label>' + dvSel({ dv: dv0 }, 'id="g_dv"', '— Chọn đơn vị —') + '</div>' +
        '<div class="fld"><label for="g_cot">Cột</label><select class="sel" id="g_cot">' + L.QD_COT.map(c => '<option value="' + c[0] + '">' + c[1] + '</option>').join('') + '</select></div><div class="note small" data-gxem></div>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, 'sp', { label: 'Gắn vào quyết định', cls: 'primary', icon: 'check', on: async a => {
        const t = tinh(); if (!t.ds.length) { UI.toast('Không có số chưa có căn cứ.', 'bad'); return; }
        const q = S.get('qddt', $('#g_qd', m.body).value);
        try { await S.save('qddt', { id: q.id, dong: (q.dong || []).concat(t.ds.map(x => ({ nsId: x.r.id, donViId: x.r.donViId, cot: x.cot, soTien: x.chenh, ghiChu: 'Gắn từ số đã nhập theo biểu' }))) }, { note: 'Gắn ' + t.ds.length + ' dòng dự toán vào ' + q.so }); a.close(); UI.toast('Đã gắn ' + t.ds.length + ' dòng.', 'ok'); A.render(); } catch (er) { UI.fail(er); }
      } }] });
    const tinh = () => { const dv = $('#g_dv', m.body).value, cot = $('#g_cot', m.body).value; const ds = dv ? L.qdDoiChieu(y, dv).dong.filter(x => x.cot === cot && x.st === 'chuaqd' || (x.cot === cot && x.st === 'lech' && x.chenh > 0)) : []; return { ds }; };
    const xem = () => { const t = tinh(); $('[data-gxem]', m.body).textContent = t.ds.length ? t.ds.length + ' dòng, cộng ' + U.fmtMoney(U.sum(t.ds, x => x.chenh)) + ' đồng sẽ được ghi vào quyết định.' : 'Không có số chưa có căn cứ ở lựa chọn này.'; };
    $$('select', m.body).forEach(s => s.onchange = xem); xem();
  }

  /* ---------- (7) Thẻ "Cuối năm" ---------- */
  const XL = [['', '— Chưa đề xuất —'], ['tiep', 'Tiếp tục giải ngân'], ['chuyennguon', 'Chuyển nguồn'], ['huy', 'Hủy dự toán'], ['thuhoi', 'Thu hồi']];
  const goiY = n => { const ma = L.nsMa(n.r); if (n.r.qdThuHoi) return 'Đã có QĐ thu hồi'; if (ma.nguon === 'cctl') return 'Nguồn CCTL: thường chuyển nguồn theo quy định'; if (U.num(n.r.tamUng) > 0) return 'Còn tạm ứng ' + fs(n.r.tamUng) + ': thanh toán hoặc thu hồi tạm ứng'; if (ma.nguon === 'thuong') return 'Tiền thưởng: chi trước 31/12'; return ''; };
  A.nsCuoiNam = (box, y, Sel) => {
    const la = L.gnLeaves(y, { dv: Sel.dv }), con = la.filter(n => n.sum.conLai > 0.5).sort((a, b) => b.sum.conLai - a.sum.conLai);
    const cong = k => U.sum(con.filter(n => (n.r.cuoiNamXL || '') === k), n => n.r.cuoiNamXL ? U.num(n.r.cuoiNamTien || n.sum.conLai) : n.sum.conLai);
    let h = '<div class="toolbar">' + dvSel(Sel, 'data-cdv') + '<span class="sp"></span><button class="btn" data-qt>' + ic('check', 16) + 'Ghi số quyết toán bằng số giải ngân</button><button class="btn" data-cxls>' + ic('download', 16) + 'Xuất danh sách đề nghị</button></div>';
    h += '<div class="note mb small">Rà soát các nội dung còn kinh phí để đề xuất xử lý trước khi khóa sổ: tiếp tục giải ngân trước 31/12, đề nghị chuyển nguồn, hủy dự toán hoặc thu hồi. Đề xuất được lưu trên từng dòng; danh sách xuất Excel theo đơn vị để lập văn bản trình. Phần mềm không tự xác định nội dung đủ điều kiện chuyển nguồn: căn cứ quy định hiện hành và hướng dẫn của Sở Tài chính.</div>';
    h += '<div class="kpis mb">' + [['', 'Chưa đề xuất', 'warn'], ['tiep', 'Tiếp tục giải ngân', 'ok'], ['chuyennguon', 'Chuyển nguồn', 'teal'], ['huy', 'Hủy dự toán', 'bad'], ['thuhoi', 'Thu hồi', 'violet']].map(x => '<div class="kpi ' + x[2] + ' static"><span class="k-l">' + x[1] + '</span><span class="k-v"><small>' + fs(cong(x[0])) + '</small></span><span class="k-s">' + con.filter(n => (n.r.cuoiNamXL || '') === x[0]).length + ' nội dung</span></div>').join('') + '</div>';
    h += con.length ? '<div class="tbl-wrap" style="max-height:66vh;overflow:auto"><table class="tbl"><thead><tr><th>Nội dung</th><th class="num">Được sử dụng</th><th class="num">Còn lại</th><th class="num">Tạm ứng</th><th style="min-width:170px">Đề xuất xử lý</th><th class="num" style="min-width:140px">Số tiền</th><th style="min-width:200px">Lý do, căn cứ</th></tr></thead><tbody>' +
      con.map(n => { const g = goiY(n); return '<tr data-cn="' + n.r.id + '"><td class="wrap" style="min-width:240px"><a href="#" data-open="ngansach:' + e(n.r.id) + '">' + e((n.r.stt ? n.r.stt + ' ' : '') + U.trunc(n.r.noiDung, 100)) + '</a><div class="t2">' + e(Sc.refName('donvi', n.r.donViId)) + ' · ' + e(L.nsNguonTen(L.nsMa(n.r).nguon)) + (g ? ' · <b>' + e(g) + '</b>' : '') + '</div></td><td class="num">' + U.fmtMoney(n.sum.tong) + '</td><td class="num">' + U.fmtMoney(n.sum.conLai) + '</td><td class="num">' + (U.num(n.r.tamUng) ? U.fmtMoney(n.r.tamUng) : '') + '</td>' +
        '<td><select class="sel" data-xl aria-label="Đề xuất xử lý">' + XL.map(x => '<option value="' + x[0] + '"' + ((n.r.cuoiNamXL || '') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></td><td><input class="inp num" data-tien inputmode="numeric" aria-label="Số tiền xử lý" value="' + (n.r.cuoiNamTien ? U.fmtMoney(n.r.cuoiNamTien) : '') + '" placeholder="' + U.fmtMoney(n.sum.conLai) + '"></td><td><input class="inp" data-lydo aria-label="Lý do" value="' + e(n.r.cuoiNamLyDo || '') + '"></td></tr>'; }).join('') + '</tbody></table></div>'
      : '<div class="card">' + UI.empty('Không còn nội dung nào còn kinh phí', 'Các dòng chi tiết' + (Sel.dv ? ' của đơn vị đang lọc' : '') + ' đã giải ngân hết.') + '</div>';
    box.innerHTML = h;
    $('[data-cdv]', box).onchange = x => { Sel.dv = x.target.value; A.render(); };
    $$('[data-open]', box).forEach(a => a.onclick = x => { x.preventDefault(); const [c, id] = a.dataset.open.split(':'); A.open(c, id); });
    $$('[data-cn]', box).forEach(tr => {
      const id = tr.dataset.cn, luu = async patch => { try { await S.save('ngansach', Object.assign({ id }, patch), { note: 'Đề xuất xử lý cuối năm' }); } catch (er) { UI.fail(er); } };
      $('[data-xl]', tr).onchange = x => luu({ cuoiNamXL: x.target.value });
      $('[data-tien]', tr).onchange = x => { const v = x.target.value.trim(); luu({ cuoiNamTien: v ? U.num(v.replace(/[.\s]/g, '').replace(',', '.')) : '' }); };
      $('[data-lydo]', tr).onchange = x => luu({ cuoiNamLyDo: x.target.value.trim() });
    });
    $('[data-cxls]', box).onclick = () => {
      const ds = con.filter(n => n.r.cuoiNamXL && n.r.cuoiNamXL !== 'tiep'); if (!ds.length) { UI.toast('Chưa có nội dung nào được đề xuất chuyển nguồn, hủy dự toán hoặc thu hồi.', 'bad'); return; }
      const hd = ['TT', 'Đơn vị dự toán', 'Nội dung', 'Chương', 'Loại', 'Khoản', 'Nguồn', 'Được sử dụng', 'Đã giải ngân', 'Còn lại', 'Đề xuất', 'Số tiền', 'Lý do, căn cứ'];
      const aoa = [['DANH SÁCH ĐỀ NGHỊ XỬ LÝ KINH PHÍ CUỐI NĂM ' + y], [Sel.dv ? Sc.refName('donvi', Sel.dv) : 'Tất cả đơn vị'], [], hd];
      ['chuyennguon', 'huy', 'thuhoi'].forEach(k => { const l = ds.filter(n => n.r.cuoiNamXL === k); if (!l.length) return; aoa.push(['', XL.find(x => x[0] === k)[1].toUpperCase()]); l.forEach((n, i) => { const ma = L.nsMa(n.r); aoa.push([i + 1, Sc.refName('donvi', n.r.donViId), (n.r.stt ? n.r.stt + ' ' : '') + n.r.noiDung, ma.chuong, ma.loai, ma.khoan, L.nsNguonTen(ma.nguon), n.sum.tong, n.sum.giaiNgan, n.sum.conLai, XL.find(x => x[0] === k)[1], U.num(n.r.cuoiNamTien || n.sum.conLai), n.r.cuoiNamLyDo || '']); }); aoa.push(['', 'Cộng', '', '', '', '', '', '', '', '', '', U.sum(l, n => U.num(n.r.cuoiNamTien || n.sum.conLai)), '']); });
      UI.xlsx('de-nghi-xu-ly-cuoi-nam-' + y + '-' + UI.stamp() + '.xlsx', [{ name: 'De nghi ' + y, aoa, widths: [5, 22, 60, 8, 8, 8, 24, 16, 16, 16, 20, 16, 40] }]);
    };
    $('[data-qt]', box).onclick = async () => {
      const ds = la.filter(n => !U.num(n.r.quyetToan) && n.sum.giaiNgan > 0);
      if (!ds.length) { UI.toast('Không có dòng nào cần ghi (các dòng đã có số quyết toán hoặc chưa giải ngân).', 'bad'); return; }
      if (!await UI.confirm({ title: 'Ghi số quyết toán', msg: 'Ghi số giải ngân hiện tại làm số quyết toán cho ' + ds.length + ' dòng chi tiết chưa có số quyết toán' + (Sel.dv ? ' của ' + Sc.refName('donvi', Sel.dv) : ' (tất cả đơn vị)') + ', cộng ' + U.fmtMoney(U.sum(ds, n => n.sum.giaiNgan)) + ' đồng.\n\nChỉ dùng khi số giải ngân đã chốt theo báo cáo quyết toán; dòng đã có số quyết toán giữ nguyên.', ok: 'Ghi số' })) return;
      try { await S.snapshot('Trước khi ghi số quyết toán năm ' + y); await S.saveMany(ds.map(n => ({ c: 'ngansach', rec: { id: n.r.id, quyetToan: n.sum.giaiNgan } })), { note: 'Ghi số quyết toán bằng số giải ngân cho ' + ds.length + ' dòng năm ' + y }); UI.toast('Đã ghi ' + ds.length + ' dòng.', 'ok'); } catch (er) { UI.fail(er); }
    };
  };

  /* ---------- (5) Đối chiếu với Kho bạc theo đơn vị (thêm trên thẻ Đối chiếu) ---------- */
  Sc.C.kbdc = { label: 'Đối chiếu Kho bạc', title: r => Sc.refName('donvi', r.donViId) + ' năm ' + r.nam, fields: [F('donViId', 'Đơn vị', 'ref', { ref: 'donvi' }), F('nam', 'Năm', 'year'), F('ngay', 'Số liệu Kho bạc đến ngày', 'date'), F('soKB', 'Lũy kế thanh toán qua Kho bạc (đồng)', 'money'), F('tamUngKB', 'Trong đó tạm ứng (đồng)', 'money'), F('ghiChu', 'Ghi chú')] };
  const gocDC = A.gnDoiChieu;
  A.gnDoiChieu = (box, y, Sel) => {
    if (box.hasAttribute('data-dch')) return gocDC(box, y, Sel);
    box.innerHTML = '<div data-kbdc></div><div data-dch class="mt"></div>';
    kbDoiChieu($('[data-kbdc]', box), y, Sel);
    A.gnDoiChieu($('[data-dch]', box), y, Sel);
  };
  function kbDoiChieu(box, y, Sel) {
    const ds = L.dvDuToan().filter(d => !Sel.dv || d.id === Sel.dv).map(d => { const la = L.gnLeaves(y, { dv: d.id }); const kb = S.get('kbdc', 'kb_' + d.id + '_' + y) || {}; return { d, la, gn: U.sum(la, n => n.sum.giaiNgan), tu: U.sum(la, n => U.num(n.r.tamUng)), kb }; }).filter(x => x.la.length || x.kb.soKB);
    const chenh = x => x.kb.soKB === undefined || x.kb.soKB === '' ? null : x.gn - U.num(x.kb.soKB);
    box.innerHTML = '<div class="card"><div class="card-h"><h3>Đối chiếu với Kho bạc theo đơn vị</h3><div class="sub">Nhập lũy kế thanh toán qua Kho bạc (theo bảng đối chiếu tình hình sử dụng dự toán của Kho bạc) để so với số giải ngân đơn vị báo cáo. Chênh khác 0 cần đơn vị giải trình.</div></div>' +
      (ds.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Đơn vị</th><th class="num">Giải ngân đơn vị báo cáo</th><th class="num">Trong đó tạm ứng</th><th class="num" style="min-width:150px">Lũy kế Kho bạc</th><th class="num" style="min-width:130px">Tạm ứng theo Kho bạc</th><th style="min-width:130px">Kho bạc đến ngày</th><th class="num">Chênh lệch</th></tr></thead><tbody>' +
        ds.map(x => { const c = chenh(x); return '<tr data-kb="' + x.d.id + '"><td><b>' + e(x.d.tenTat || x.d.ten) + '</b></td><td class="num">' + U.fmtMoney(x.gn) + '</td><td class="num">' + (x.tu ? U.fmtMoney(x.tu) : '') + '</td><td><input class="inp num" data-k="soKB" inputmode="numeric" aria-label="Lũy kế Kho bạc" value="' + (x.kb.soKB !== undefined && x.kb.soKB !== '' ? U.fmtMoney(x.kb.soKB) : '') + '"></td><td><input class="inp num" data-k="tamUngKB" inputmode="numeric" aria-label="Tạm ứng theo Kho bạc" value="' + (x.kb.tamUngKB ? U.fmtMoney(x.kb.tamUngKB) : '') + '"></td><td><input class="inp" type="date" data-k="ngay" aria-label="Ngày số liệu Kho bạc" value="' + e(x.kb.ngay || '') + '"></td><td class="num">' + (c === null ? '<span class="muted">Chưa nhập</span>' : Math.abs(c) < 1000 ? UI.chip('hoanthanh', 'Khớp') : '<b style="color:var(--bad-fg)">' + (c > 0 ? '+' : '') + U.fmtMoney(c) + '</b>') + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="card-b small soft">Chênh dương: đơn vị báo cáo cao hơn Kho bạc (có thể tính cả khoản chưa gửi Kho bạc); chênh âm: Kho bạc đã thanh toán nhưng đơn vị chưa cập nhật.</div>'
        : '<div class="card-b">' + UI.empty('Chưa có số liệu', 'Nhập biểu giải ngân của đơn vị trước.') + '</div>') + '</div>';
    $$('[data-kb]', box).forEach(tr => $$('[data-k]', tr).forEach(inp => inp.onchange = async () => {
      const k = inp.dataset.k, raw = inp.value.trim(), v = k === 'ngay' ? raw : (raw === '' ? '' : U.num(raw.replace(/[.\s]/g, '').replace(',', '.')));
      try { await S.save('kbdc', { id: 'kb_' + tr.dataset.kb + '_' + y, donViId: tr.dataset.kb, nam: y, [k]: v }, { note: 'Đối chiếu Kho bạc ' + Sc.refName('donvi', tr.dataset.kb) + ' năm ' + y }); } catch (er) { UI.fail(er); }
    }));
  }

  /* ---------- Gắn hai thẻ mới vào trang Tài chính ---------- */
  const gocPane = A.gnPane;
  A.gnPane = (tab, box, y, Sel, ctx) => tab === 'qd' ? A.nsQD(box, y, Sel) : tab === 'cuoinam' ? A.nsCuoiNam(box, y, Sel) : gocPane(tab, box, y, Sel, ctx);

  /* ---------- Bảng theo mã ngân sách, theo nguồn (thẻ Dự toán – thực hiện – quyết toán) ---------- */
  A.nsBangMa = (y, dv) => {
    const la = L.gnLeaves(y, { dv }), bang = (title, rows, sub) => '<div class="card"><div class="card-h"><h3>' + title + '</h3><div class="sub">' + sub + '</div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + (title.includes('nguồn') ? 'Nguồn' : 'Chương - Loại - Khoản') + '</th><th class="num">Số dòng</th><th class="num">Được sử dụng</th><th class="num">Đã giải ngân</th><th class="num">Trong đó tạm ứng</th><th style="min-width:120px">Tỷ lệ</th></tr></thead><tbody>' + rows.map(g => '<tr><td>' + e(g.ten) + '</td><td class="num">' + g.n + '</td><td class="num">' + U.fmtMoney(g.tong) + '</td><td class="num">' + U.fmtMoney(g.gn) + '</td><td class="num">' + (g.tamUng ? U.fmtMoney(g.tamUng) : '') + '</td><td>' + UI.pbar(g.ty || 0) + '</td></tr>').join('') + '</tbody></table></div></div>';
    if (!la.length) return '';
    return '<div class="grid2 mt">' + bang('Theo Chương - Loại - Khoản', L.nsTheoMa(la, 'khoan'), 'Mã lấy từ trường đã nhập, chữ của dòng hoặc dòng cha') + bang('Theo nguồn kinh phí', L.nsTheoMa(la, 'nguon'), 'Nguồn tiết kiệm CCTL và tiền thưởng là nguồn để dành, không tính vào tỷ lệ nhiệm vụ chuyên môn') + '</div>';
  };

  /* ---------- Ghi căn cứ quyết định khi sửa số tiền ở thẻ Cập nhật giải ngân ---------- */
  // Gọi từ hộp "Sửa số tiền dự toán": các cột dự toán đổi số được ghi thêm vào quyết định đã chọn (phần chênh)
  A.nsGhiQD = async (qdId, r, rec) => {
    const q = S.get('qddt', qdId); if (!q) return 0;
    const them = L.QD_COT.filter(([c]) => rec[c] !== undefined && U.num(rec[c]) !== U.num(r[c])).map(([c]) => ({ nsId: r.id, donViId: r.donViId, cot: c, soTien: U.num(rec[c]) - U.num(r[c]), ghiChu: 'Ghi khi sửa số tiền' }));
    if (them.length) await S.save('qddt', { id: q.id, dong: (q.dong || []).concat(them) }, { note: 'Ghi ' + them.length + ' khoản vào ' + q.so });
    return them.length;
  };
})(App);
