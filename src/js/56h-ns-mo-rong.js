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

  /* ---------- Mục 3: thứ tự đơn vị trên báo cáo, danh sách ---------- */
  // Có "Thứ tự trên báo cáo" thì theo số đó; không có thì theo nhóm: Văn phòng Sở → chi cục → trung tâm → Văn phòng Đăng ký đất đai → khác
  const hangDV = d => { const t = U.norm(d && d.ten); return /^van phong so\b/.test(t) ? 1 : /^chi cuc/.test(t) ? 2 : /^trung tam/.test(t) ? 3 : /^van phong dang ky/.test(t) ? 4 : /^phong\b/.test(t) ? 6 : 5; };
  L.dvCmp = (a, b) => { const ta = U.num(a && a.thuTu) || 0, tb = U.num(b && b.thuTu) || 0; if (ta || tb) return (ta || 999) - (tb || 999) || U.cmp(a.ten, b.ten); return hangDV(a) - hangDV(b) || 0; };
  const goc1 = L.nsByDonVi; L.nsByDonVi = nam => goc1(nam).sort((x, y) => L.dvCmp(x.dv, y.dv));
  const goc2 = L.dvDuToan; L.dvDuToan = () => goc2().slice().sort(L.dvCmp);

  /* ---------- Trường dữ liệu mới ---------- */
  const fLoai = Sc.field('donvi', 'loai');
  if (fLoai) { fLoai.type = 'select'; fLoai.options = [['dutoan', 'Đơn vị dự toán'], ['phong', 'Phòng, bộ phận (không phải đơn vị dự toán)']]; fLoai.help = 'Phòng thuộc Văn phòng Sở (KHTC, QLMT…) chọn "Phòng, bộ phận": không hiện khi chọn đơn vị nhập biểu, chỉ dùng làm nơi thực hiện.'; }
  Sc.C.donvi.fields.splice(3, 0, F('thuTu', 'Thứ tự trên báo cáo', 'number', { help: 'Số nhỏ đứng trước (ví dụ Văn phòng Sở = 1). Bỏ trống: Văn phòng Sở, chi cục, trung tâm, Văn phòng Đăng ký đất đai theo thứ tự đó.' }), F('maQHNS', 'Mã đơn vị quan hệ ngân sách', 'text', { table: true }), F('thuocId', 'Thuộc đơn vị dự toán', 'ref', { ref: 'donvi', help: 'Với phòng, bộ phận: đơn vị dự toán quản lý (thường là Văn phòng Sở)' }));
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
    let h = '<div class="toolbar">' + dvSel(Sel, 'data-cdv') + '<span class="sp"></span><button class="btn" data-qt>' + ic('check', 16) + 'Ghi số quyết toán bằng số giải ngân</button><button class="btn" data-cxls>' + ic('download', 16) + 'Xuất danh sách đề nghị</button><button class="btn" data-cvb>' + ic('doc', 16) + 'Soạn văn bản đề nghị</button><button class="btn" data-cnam>' + ic('plus', 16) + 'Lập dòng chuyển nguồn năm ' + (y + 1) + '</button><button class="btn" data-ssnam>' + ic('table', 16) + 'So sánh ' + y + ' – ' + (y + 1) + '</button></div>';
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
    $('[data-cvb]', box).onclick = () => A.vbCuoiNam(y, Sel.dv);
    $('[data-cnam]', box).onclick = () => A.nsLapChuyenNguon(y, Sel.dv);
    $('[data-ssnam]', box).onclick = () => A.nsSoSanhNam(y);
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
    return '<div class="toolbar mt"><span class="sp"></span><button class="btn" data-gan-nguon="' + y + '">' + ic('filter', 16) + 'Gán mã nguồn theo quy tắc</button></div><div class="grid2">' + bang('Theo Chương - Loại - Khoản', L.nsTheoMa(la, 'khoan'), 'Mã lấy từ trường đã nhập, chữ của dòng hoặc dòng cha') + bang('Theo nguồn kinh phí', L.nsTheoMa(la, 'nguon'), 'Nguồn tiết kiệm CCTL và tiền thưởng là nguồn để dành, không tính vào tỷ lệ nhiệm vụ chuyên môn') + '</div>';
  };

  /* ---------- Mục 4: gán mã nguồn hàng loạt theo quy tắc chữ ---------- */
  // Quy tắc: { chua: chữ trong nội dung dòng, cha: chữ trong các dòng cha, nguon: mã } — quy tắc trên cùng khớp trước. Lưu ở Thiết lập máy này (cfg.nsQuyTacNguon).
  L.nsApQuyTac = (leaves, rules, ghiDe) => {
    const qt = (rules || []).filter(x => x.nguon && (x.chua || x.cha)), out = [];
    leaves.forEach(n => {
      if (n.r.maNguon && !ghiDe) return;
      const t = U.norm(n.r.noiDung); let ch = '', x = S.get('ngansach', n.r.parentId), c = 0; while (x && c++ < 12) { ch += ' ' + U.norm(x.noiDung); x = S.get('ngansach', x.parentId); }
      const q = qt.find(r => (!r.chua || t.includes(U.norm(r.chua))) && (!r.cha || ch.includes(U.norm(r.cha)))); if (!q) return;
      const cu = L.nsMa(n.r).nguon || ''; if (cu === q.nguon && n.r.maNguon === q.nguon) return;
      out.push({ n, cu, moi: q.nguon, q });
    });
    return out;
  };
  A.nsGanNguon = y => {
    const la = L.gnLeaves(y, {}), opt = v => L.NS_NGUON.map(o => '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('');
    let rules = (S.cfg.nsQuyTacNguon || []).map(x => Object.assign({}, x)); if (!rules.length) rules = [{ chua: '', cha: '', nguon: 'khongtuchu' }];
    const body = document.createElement('div'); let gd = false;
    const doc = () => { rules = $$('[data-qt]', body).map(r => ({ chua: $('[data-chua]', r).value.trim(), cha: $('[data-cha]', r).value.trim(), nguon: $('[data-ng]', r).value })); };
    const ve = () => {
      const kq = L.nsApQuyTac(la, rules, gd);
      body.innerHTML = '<p class="small soft">Mỗi quy tắc: dòng chi tiết có <b>nội dung chứa</b> và/hoặc <b>dòng cha chứa</b> cụm chữ thì gán mã nguồn đã chọn. Quy tắc trên cùng được xét trước. Không phân biệt dấu, hoa thường. Dòng đã chọn mã nguồn bằng tay giữ nguyên trừ khi tích "Ghi đè".</p>' +
        '<table class="tbl"><thead><tr><th>Nội dung chứa</th><th>Dòng cha chứa</th><th>Gán nguồn</th><th></th></tr></thead><tbody>' + rules.map((r, i) => '<tr data-qt="' + i + '"><td><input class="inp" data-chua value="' + e(r.chua || '') + '" placeholder="vd. CCTL" aria-label="Nội dung chứa"></td><td><input class="inp" data-cha value="' + e(r.cha || '') + '" placeholder="vd. không tự chủ" aria-label="Dòng cha chứa"></td><td><select class="sel" data-ng aria-label="Nguồn">' + opt(r.nguon) + '</select></td><td><button class="btn icon sm" data-xoaqt="' + i + '" aria-label="Xóa quy tắc" title="Xóa quy tắc">' + ic('trash', 14) + '</button></td></tr>').join('') + '</tbody></table>' +
        '<div class="gap mt"><button class="btn sm" data-themqt>' + ic('plus', 14) + 'Thêm quy tắc</button><button class="btn sm" data-xemqt>Xem trước</button><label class="check"><input type="checkbox" id="gn_gd"' + (gd ? ' checked' : '') + '> Ghi đè cả dòng đã chọn mã nguồn bằng tay</label></div>' +
        '<div class="eyebrow mt">Sẽ đổi ' + kq.length + ' dòng · ' + U.fmtShort(U.sum(kq, x => x.n.sum.tong)) + '</div>' +
        (kq.length ? '<div class="tbl-wrap" style="max-height:320px;overflow:auto"><table class="tbl"><thead><tr><th>Đơn vị</th><th>Nội dung</th><th class="num">Được sử dụng</th><th>Nguồn hiện tại</th><th>Nguồn mới</th></tr></thead><tbody>' + kq.map(x => '<tr><td class="small">' + e(Sc.refName('donvi', x.n.r.donViId)) + '</td><td class="wrap">' + e(U.trunc((x.n.r.stt ? x.n.r.stt + ' ' : '') + x.n.r.noiDung, 90)) + '</td><td class="num">' + U.fmtMoney(x.n.sum.tong) + '</td><td class="small">' + e(L.nsNguonTen(x.cu)) + '</td><td class="small"><b>' + e(L.nsNguonTen(x.moi)) + '</b></td></tr>').join('') + '</tbody></table></div>' : '<p class="small muted">Chưa có dòng nào khớp.</p>');
    };
    ve();
    UI.on(body, 'click', '[data-themqt]', () => { doc(); rules.push({ chua: '', cha: '', nguon: 'khongtuchu' }); ve(); });
    UI.on(body, 'click', '[data-xoaqt]', b => { doc(); rules.splice(+b.dataset.xoaqt, 1); if (!rules.length) rules.push({ chua: '', cha: '', nguon: 'khongtuchu' }); ve(); });
    UI.on(body, 'click', '[data-xemqt]', () => { doc(); ve(); });
    UI.on(body, 'change', '#gn_gd', x => { gd = x.checked; doc(); ve(); });
    UI.modal({ title: 'Gán mã nguồn theo quy tắc — năm ' + y, size: 'xl', body,
      buttons: [{ label: 'Đóng', on: a => a.close() }, { label: 'Lưu quy tắc, áp dụng', cls: 'primary', icon: 'check', on: async a => {
        doc(); const kq = L.nsApQuyTac(la, rules, gd);
        await S.setCfg({ nsQuyTacNguon: rules.filter(x => x.chua || x.cha) });
        if (!kq.length) { a.close(); UI.toast('Đã lưu quy tắc; không có dòng nào cần đổi.', 'ok'); return; }
        if (!await UI.confirm({ title: 'Gán mã nguồn cho ' + kq.length + ' dòng?', msg: 'Ghi mã nguồn vào ' + kq.length + ' dòng chi tiết năm ' + y + '. Có thể sửa lại từng dòng ở trường "Mã nguồn kinh phí".', ok: 'Gán mã' })) return;
        try { await S.saveMany(kq.map(x => ({ c: 'ngansach', rec: { id: x.n.r.id, maNguon: x.moi } })), { note: 'Gán mã nguồn theo quy tắc cho ' + kq.length + ' dòng năm ' + y }); a.close(); UI.toast('Đã gán mã nguồn cho ' + kq.length + ' dòng.', 'ok'); A.render(); } catch (er) { UI.fail(er); }
      } }] });
  };
  UI.on(document.body, 'click', '[data-gan-nguon]', b => A.nsGanNguon(+b.dataset.ganNguon));

  /* ---------- Ghi căn cứ quyết định khi sửa số tiền ở thẻ Cập nhật giải ngân ---------- */
  // Gọi từ hộp "Sửa số tiền dự toán": các cột dự toán đổi số được ghi thêm vào quyết định đã chọn (phần chênh)
  A.nsGhiQD = async (qdId, r, rec) => {
    const q = S.get('qddt', qdId); if (!q) return 0;
    const them = L.QD_COT.filter(([c]) => rec[c] !== undefined && U.num(rec[c]) !== U.num(r[c])).map(([c]) => ({ nsId: r.id, donViId: r.donViId, cot: c, soTien: U.num(rec[c]) - U.num(r[c]), ghiChu: 'Ghi khi sửa số tiền' }));
    if (them.length) await S.save('qddt', { id: q.id, dong: (q.dong || []).concat(them) }, { note: 'Ghi ' + them.length + ' khoản vào ' + q.so });
    return them.length;
  };
  /* Mục 10: báo cáo theo mẫu Phụ lục I (tổng hợp theo nguồn, theo đơn vị) và Phụ lục II (chi tiết từng đơn vị) như biểu của Sở.
     Cột: chuyển nguồn, dự toán đầu năm, bổ sung, điều chỉnh tăng/giảm, thu hồi, [tiết kiệm nếu có], tổng được sử dụng, đã giải ngân, còn lại, tỷ lệ. */
  /* ---------- Mục 8: dự toán năm sau ---------- */
  // Lập (hoặc cập nhật) các dòng năm y+1 từ nội dung đề nghị chuyển nguồn năm y: mỗi đơn vị một dòng nhóm "Kinh phí chuyển nguồn từ năm y",
  // dòng con giữ nội dung, mã Chương-Loại-Khoản, nguồn; số = số đề nghị chuyển nguồn (ghi vào cột "chuyển nguồn"). Liên kết dòng gốc qua tuNamTruocId.
  A.nsLapChuyenNguon = async (y, dvId) => {
    const ds = L.gnLeaves(y, { dv: dvId || '' }).filter(n => n.r.cuoiNamXL === 'chuyennguon'), y2 = y + 1;
    if (!ds.length) { UI.toast('Chưa có nội dung nào được đề xuất chuyển nguồn năm ' + y + '.', 'bad'); return; }
    const cu = S.all('ngansach').filter(r => +r.nam === y2 && r.tuNamTruocId), soMoi = ds.filter(n => !cu.some(r => r.tuNamTruocId === n.r.id)).length;
    if (!await UI.confirm({ title: 'Lập dòng chuyển nguồn năm ' + y2 + '?', msg: ds.length + ' nội dung đề nghị chuyển nguồn, cộng ' + U.fmtMoney(U.sum(ds, n => U.num(n.r.cuoiNamTien || n.sum.conLai))) + ' đồng.\n\n• ' + soMoi + ' dòng mới được tạo trong dự toán năm ' + y2 + ' (cột "KP chuyển nguồn năm trước sang").\n• ' + (ds.length - soMoi) + ' dòng đã lập trước đây được cập nhật số tiền.\n\nSố chuyển nguồn chính thức theo quyết định của cấp có thẩm quyền: khi có quyết định, sửa lại số hoặc nhập biểu năm ' + y2 + '.', ok: 'Lập dòng' })) return;
    const ops = [], nhom = {};
    ds.forEach(n => {
      const dv = n.r.donViId;
      if (!nhom[dv]) { const g = S.all('ngansach').find(r => +r.nam === y2 && r.donViId === dv && r.nhomChuyenNguon === y); nhom[dv] = g ? g.id : U.uid('ns'); if (!g) ops.push({ c: 'ngansach', rec: { id: nhom[dv], nam: y2, donViId: dv, parentId: '', stt: 'CN', noiDung: 'Kinh phí chuyển nguồn từ năm ' + y + ' sang năm ' + y2, nhomChuyenNguon: y, thuTu: -1 } }); }
      const ma = L.nsMa(n.r), old = cu.find(r => r.tuNamTruocId === n.r.id), so = U.num(n.r.cuoiNamTien || n.sum.conLai);
      ops.push({ c: 'ngansach', rec: Object.assign(old ? { id: old.id } : { id: U.uid('ns'), nam: y2, donViId: dv, parentId: nhom[dv], stt: n.r.stt || '', noiDung: n.r.noiDung, tuNamTruocId: n.r.id, canBoId: n.r.canBoId || '', phongId: n.r.phongId || '', chuong: ma.chuong, loaiNS: ma.loai, khoan: ma.khoan, maNguon: ma.nguon || '' }, { chuyenNguon: so, ghiChu: 'Lập từ đề nghị chuyển nguồn năm ' + y + (n.r.cuoiNamLyDo ? ': ' + n.r.cuoiNamLyDo : '') }) });
    });
    try { await S.saveMany(ops, { note: 'Lập ' + ds.length + ' dòng chuyển nguồn năm ' + y2 + ' từ đề nghị cuối năm ' + y }); UI.toast('Đã lập ' + ds.length + ' dòng chuyển nguồn trong dự toán năm ' + y2 + '. Chọn năm ' + y2 + ' để xem.', 'ok'); } catch (er) { UI.fail(er); }
  };
  // So sánh dự toán năm y với năm y+1 theo đơn vị
  A.nsSoSanhNam = y => {
    const y2 = y + 1, dvs = L.dvDuToan().filter(d => S.all('ngansach').some(r => r.donViId === d.id && (+r.nam === y || +r.nam === y2)));
    const t = (nam, id) => L.nsTree(nam, id).total, rows = dvs.map(d => ({ d, a: t(y, d.id), b: t(y2, d.id) }));
    if (!rows.length) { UI.toast('Chưa có dữ liệu năm ' + y + ' hoặc ' + y2 + '.', 'bad'); return; }
    const sum = (k, f) => U.sum(rows, x => x[k][f] || 0), cl = (a, b) => b - a, mm = v => U.fmtMoney(v || 0);
    const hd = ['Đơn vị', 'DT đầu năm ' + y, 'Được sử dụng ' + y, 'Đã giải ngân ' + y, 'DT đầu năm ' + y2, 'Chuyển nguồn sang ' + y2, 'Được sử dụng ' + y2, 'Chênh DT đầu năm'];
    const dong = (ten, a, b) => [ten, a.duToan || 0, a.tong || 0, a.giaiNgan || 0, b.duToan || 0, b.chuyenNguon || 0, b.tong || 0, cl(a.duToan || 0, b.duToan || 0)];
    const T = { a: {}, b: {} }; ['duToan', 'tong', 'giaiNgan', 'chuyenNguon'].forEach(f => { T.a[f] = sum('a', f); T.b[f] = sum('b', f); });
    const all = rows.map(x => dong(x.d.ten, x.a, x.b)).concat([dong('Cộng', T.a, T.b)]);
    const m = UI.modal({ title: 'So sánh dự toán năm ' + y + ' và ' + y2, size: 'xl',
      body: '<p class="small soft">Năm ' + y2 + ' gồm số đã nhập (biểu dự toán năm ' + y2 + ', dòng lập từ đề nghị chuyển nguồn). Cột "Chênh" = dự toán đầu năm ' + y2 + ' trừ dự toán đầu năm ' + y + '.</p><div class="tbl-wrap"><table class="tbl"><thead><tr>' + hd.map((h, i) => '<th' + (i ? ' class="num"' : '') + '>' + e(h) + '</th>').join('') + '</tr></thead><tbody>' +
        all.map((r, i) => '<tr' + (i === all.length - 1 ? ' style="font-weight:600"' : '') + '><td>' + e(r[0]) + '</td>' + r.slice(1).map((v, j) => '<td class="num"' + (j === 6 && v < 0 ? ' style="color:var(--bad-fg)"' : '') + '>' + mm(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>',
      buttons: [{ label: 'Đóng', on: a => a.close() }, { label: 'Xuất Excel', icon: 'download', on: () => UI.xlsx('so-sanh-du-toan-' + y + '-' + y2 + '.xlsx', [{ name: 'So sanh ' + y + '-' + y2, aoa: [['SO SÁNH DỰ TOÁN NĂM ' + y + ' VÀ NĂM ' + y2], [], hd].concat(all), widths: [44].concat(hd.slice(1).map(() => 18)) }]) }] });
    return m;
  };

  // Hỏi cách nhóm nguồn rồi xuất (nhớ lựa chọn)
  A.nsXuatMauPLHoi = y => {
    const cur = S.cfg.plNhom || 'mauso';
    const m = UI.modal({ title: 'Xuất theo mẫu Phụ lục I, II', size: 'sm',
      body: '<div class="fld"><label>Cách nhóm nguồn ở Phụ lục I</label><label class="check"><input type="radio" name="pl_n" value="mauso"' + (cur === 'mauso' ? ' checked' : '') + '> Theo mẫu của Sở: tự chủ (gồm tiền thưởng NĐ 73) · tiết kiệm CCTL · không tự chủ (gồm KH-CN, chuyển đổi số, NSTW) · từng chương trình MTQG · viện trợ</label><label class="check mt"><input type="radio" name="pl_n" value="chitiet"' + (cur === 'chitiet' ? ' checked' : '') + '> Chi tiết: tách riêng tiền thưởng, KH-CN và chuyển đổi số, NSTW bổ sung có mục tiêu</label></div><p class="small soft mt">Thứ tự đơn vị theo trường "Thứ tự trên báo cáo" ở danh mục đơn vị (bỏ trống: Văn phòng Sở, chi cục, trung tâm, Văn phòng Đăng ký đất đai).</p>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, { label: 'Xuất Excel', cls: 'primary', icon: 'download', on: async a => { const v = (m.body.querySelector('[name=pl_n]:checked') || {}).value || 'mauso'; if (v !== cur) await S.setCfg({ plNhom: v }); a.close(); A.nsXuatMauPL(y); } }] });
  };
  A.nsXuatMauPL = y => {
    const dvs = L.nsByDonVi(y).filter(x => x.count); if (!dvs.length) { UI.toast('Chưa có dữ liệu năm ' + y + '.', 'bad'); return; }
    const all = L.gnLeaves(y, {}), ky = S.all('ngansach').filter(r => +r.nam === y).map(r => r.ngayGN || r.bieuNgay).concat(all.map(n => ((n.r.gnHist || []).slice(-1)[0] || {}).ngay)).filter(U.isISO).sort().pop() || U.today();
    const coTK = all.some(n => U.num(n.sum.tietKiem));
    const F = ['chuyenNguon', 'duToan', 'boSung', 'dcTang', 'dcGiam', 'thuHoi'].concat(coTK ? ['tietKiem'] : []);
    const cong = ns => { const o = {}; F.concat(['giaiNgan']).forEach(k => { o[k] = U.sum(ns, n => n.sum[k]); }); o.tong = U.sum(ns, n => n.sum.tong); o.con = o.tong - o.giaiNgan; o.ty = o.tong ? o.giaiNgan / o.tong : ''; return o; };
    const dong = (stt, ten, o) => [stt, ten].concat(F.map(k => o[k] || 0)).concat([o.tong || 0, o.giaiNgan || 0, o.con || 0, o.ty === '' ? '' : Math.round(o.ty * 10000) / 100]);
    // Nhóm nguồn: tách riêng từng chương trình MTQG
    const MAU_SO = (S.cfg.plNhom || 'mauso') === 'mauso', vienTro = n => { let x = n.r, c = 0; while (x && c++ < 12) { if (/vien tro/.test(U.norm(x.noiDung))) return true; x = S.get('ngansach', x.parentId); } return false; };
    const nhom = n => { if (vienTro(n)) return 'vientro'; const k0 = L.nsMa(n.r).nguon || 'khac', k = MAU_SO ? ({ thuong: 'tuchu', nstw: 'khongtuchu', khcn: 'khongtuchu', sdd: 'khongtuchu', khac: 'khongtuchu' }[k0] || k0) : k0; if (k !== 'ctmtqg') return k; const t = U.norm([n.r.noiDung, (S.get('ngansach', n.r.parentId) || {}).noiDung].join(' ')); return /dan toc|1719/.test(t) ? 'mtqg_dtts' : /giam ngheo/.test(t) ? 'mtqg_gn' : /nong thon moi/.test(t) ? 'mtqg_ntm' : 'ctmtqg'; };
    const TEN = MAU_SO ? { tuchu: 'Kinh phí tự chủ, thường xuyên', cctl: 'Kinh phí tiết kiệm 10% CCTL', khongtuchu: 'Kinh phí không tự chủ, không thường xuyên', vientro: 'Nguồn viện trợ không hoàn lại', mtqg_dtts: 'Chương trình MTQG phát triển KT-XH vùng đồng bào DTTS và miền núi', mtqg_ntm: 'Chương trình MTQG xây dựng nông thôn mới', mtqg_gn: 'Chương trình MTQG giảm nghèo bền vững' } : { vientro: 'Nguồn viện trợ không hoàn lại', mtqg_dtts: 'Chương trình MTQG phát triển KT-XH vùng đồng bào DTTS và miền núi', mtqg_ntm: 'Chương trình MTQG xây dựng nông thôn mới', mtqg_gn: 'Chương trình MTQG giảm nghèo bền vững' };
    const tenNhom = k => TEN[k] || L.nsNguonTen(k === 'khac' ? '' : k) || 'Nguồn khác';
    const THU = ['tuchu', 'cctl', 'thuong', 'khongtuchu', 'nstw', 'khcn', 'sdd', 'mtqg_dtts', 'mtqg_ntm', 'mtqg_gn', 'ctmtqg', 'khac', 'vientro'];
    const theoNhom = ns => { const m = new Map(); ns.forEach(n => { const k = nhom(n); (m.get(k) || m.set(k, []).get(k)).push(n); }); return Array.from(m.entries()).sort((a, b) => (THU.indexOf(a[0]) + 99) % 99 - (THU.indexOf(b[0]) + 99) % 99); };
    const ngay = U.fmtDate(ky), coQuan = (A.cfg('coQuan') || 'Sở Nông nghiệp và Môi trường').toUpperCase();
    const head = ten => { const h1 = ['STT', ten, 'Kinh phí chuyển nguồn năm ' + (y - 1) + ' sang năm ' + y, 'Dự toán giao đầu năm ' + y, 'KP bổ sung trong năm', 'Điều chỉnh', '', 'KP thu hồi trong năm'].concat(coTK ? ['Tiết kiệm chi'] : []).concat(['Tổng KP được sử dụng trong năm ' + y, 'Kinh phí đã giải ngân đến ' + ngay, 'Kinh phí còn lại', 'Tỷ lệ giải ngân %']);
      const h2 = ['', '', '', '', '', 'Tăng', 'Giảm', ''].concat(coTK ? [''] : []).concat(['', '', '', '']), h3 = h1.map((_, i) => i + 1); return [h1, h2, h3]; };
    const nc = 2 + F.length + 4, mg = (r, c1, r2, c2) => ({ s: { r, c: c1 }, e: { r: r2, c: c2 } });
    const mergeHead = r0 => { const m = [mg(r0, 5, r0, 6)]; for (let c = 0; c < nc; c++) if (c !== 5 && c !== 6) m.push(mg(r0, c, r0 + 1, c)); return m; };
    // Phụ lục I
    const p1 = [['Phụ lục I'], ['TỔNG HỢP TÌNH HÌNH THỰC HIỆN DỰ TOÁN CỦA ' + coQuan + ' NĂM ' + y], ['Từ ngày 01/01/' + y + ' đến ngày ' + ngay], ['ĐVT: Đồng']].concat(head('Đơn vị'));
    p1.push(dong('A', coQuan, cong(all)));
    theoNhom(all).forEach(([k, ns], i) => p1.push(dong(i + 1, tenNhom(k), cong(ns))));
    p1.push(dong('B', 'CHI TIẾT THEO ĐƠN VỊ DỰ TOÁN', cong(all)));
    dvs.forEach((x, i) => { const ns = L.gnLeaves(y, { dv: x.dv.id }); p1.push(dong(i + 1, x.dv.ten, cong(ns))); theoNhom(ns).forEach(([k, g]) => p1.push(dong('-', tenNhom(k), cong(g)))); });
    // Phụ lục II
    const LM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
    const p2 = [['Phụ lục II'], ['BÁO CÁO TÌNH HÌNH THỰC HIỆN GIẢI NGÂN THANH TOÁN NGUỒN CHI THƯỜNG XUYÊN NĂM ' + y], ['ĐƠN VỊ: ' + coQuan], ['ĐVT: Đồng']].concat(head('Nội dung'));
    p2.push(dong('', 'TỔNG CỘNG (' + LM[0] + (dvs.length > 1 ? '+…+' + (LM[dvs.length - 1] || dvs.length) : '') + ')', cong(all)));
    dvs.forEach((x, i) => {
      const t = L.nsTree(y, x.dv.id); p2.push(dong(LM[i] || String(i + 1), x.dv.ten.toUpperCase(), cong(t.flat.filter(n => !n.children.length))));
      t.flat.forEach(n => { const o = Object.assign({}, n.sum, { con: n.sum.tong - n.sum.giaiNgan, ty: n.sum.tong ? n.sum.giaiNgan / n.sum.tong : '' }); p2.push(dong(n.r.stt || '', '  '.repeat(n.level) + n.r.noiDung, o)); });
    });
    const w = [6, 62].concat(F.map(() => 17)).concat([18, 18, 17, 9]);
    UI.xlsx('PL-giai-ngan-' + y + '-den-' + ky + '.xlsx', [{ name: 'Tổng hợp', aoa: p1, widths: w, merges: mergeHead(4) }, { name: 'Chi tiết', aoa: p2, widths: w, merges: mergeHead(4) }]);
    UI.toast('Đã xuất báo cáo theo mẫu Phụ lục I, II (số liệu đến ' + ngay + ').', 'ok');
  };
})(App);
