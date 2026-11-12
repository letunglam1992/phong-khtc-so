/* ============================================================
   20-schema.js — Mô hình dữ liệu (một nơi duy nhất khai báo trường)
   Form nhập, bảng, nhập/xuất Excel, kiểm tra dữ liệu và lịch sử chỉnh sửa đều sinh ra từ khai báo này.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U;

  /* Danh mục dùng chung — người dùng sửa được ở Thiết lập. Không gắn điều khoản pháp luật vào đây. */
  A.DEFAULT_LISTS = {
    nguonVB: ['UBND tỉnh', 'Tỉnh ủy, HĐND tỉnh', 'Giám đốc Sở, lãnh đạo Sở', 'Bộ, ngành Trung ương', 'Sở, ngành, cơ quan, đơn vị khác', 'Cuộc họp, kết luận, thông báo', 'Khác'],
    nguonNV: ['Chức năng, nhiệm vụ của Phòng', 'Văn bản giao', 'Kết luận, cuộc họp', 'Lãnh đạo Sở giao trực tiếp', 'Nội bộ Phòng', 'Khác'],
    loaiDuAn: ['Dự án đầu tư công', 'Nhiệm vụ, dự toán chi thường xuyên', 'Chương trình, đề án', 'Nhiệm vụ chuyển đổi số, thuê dịch vụ CNTT', 'Nhiệm vụ khoa học và công nghệ', 'Dự án ODA, viện trợ', 'Dự án của tỉnh (tham gia ý kiến chủ trương đầu tư)', 'Khác'],
    vaiTroSo: ['Sở làm chủ đầu tư', 'Đơn vị trực thuộc Sở thực hiện', 'Theo dõi, tổng hợp', 'Tham gia ý kiến, thẩm định'],
    linhVucDA: ['Đo đạc, bản đồ, đăng ký đất đai', 'Tài nguyên đất, giá đất', 'Môi trường', 'Tài nguyên nước', 'Thủy lợi', 'Lâm nghiệp', 'Trồng trọt và bảo vệ thực vật', 'Chăn nuôi, thú y, thủy sản', 'Phát triển nông thôn', 'Khuyến nông', 'Chuyển đổi số', 'Khoa học và công nghệ', 'Khác'],
    nguonVon: ['Vốn đầu tư công - ngân sách Trung ương', 'Vốn đầu tư công - ngân sách địa phương', 'Sự nghiệp kinh tế', 'Nguồn thu sử dụng đất', 'Sự nghiệp bảo vệ môi trường', 'Sự nghiệp khoa học và công nghệ', 'Chuyển đổi số', 'Chương trình mục tiêu quốc gia', 'Vốn ODA, viện trợ', 'Nguồn khác'],
    nhomKP: ['Kinh phí thường xuyên (tự chủ)', 'Kinh phí không thường xuyên (không tự chủ)', 'Kinh phí chương trình, đề án', 'Nguồn kinh phí khác'],
    loaiTaiSan: ['Trụ sở, nhà làm việc', 'Cơ sở nhà, đất', 'Phương tiện (xe ô tô, phương tiện vận tải)', 'Máy móc, thiết bị', 'Trang thiết bị làm việc', 'Tài sản chuyên dùng', 'Tài sản khác'],
    nguonTaiSan: ['Ngân sách nhà nước', 'Tiếp nhận, điều chuyển', 'Dự án, viện trợ', 'Nguồn thu sự nghiệp, quỹ phát triển hoạt động sự nghiệp', 'Khác'],
    tinhTrangTS: ['Đang sử dụng', 'Hư hỏng, chờ sửa chữa', 'Không còn nhu cầu sử dụng', 'Chờ điều chuyển', 'Chờ thanh lý', 'Đã điều chuyển', 'Đã thanh lý'],
    loaiBienDongTS: ['Mua sắm, tiếp nhận', 'Điều chuyển', 'Sửa chữa, bảo dưỡng', 'Thanh lý', 'Kiểm kê', 'Khác'],
    loaiGoiThau: ['Tư vấn', 'Phi tư vấn', 'Mua sắm hàng hóa', 'Xây lắp', 'Hỗn hợp'],
    hinhThucLCNT: ['Đấu thầu rộng rãi', 'Đấu thầu hạn chế', 'Chào hàng cạnh tranh', 'Chỉ định thầu', 'Mua sắm trực tiếp', 'Tự thực hiện', 'Đặt hàng, giao nhiệm vụ', 'Hình thức khác'],
    loaiHopDong: ['Trọn gói', 'Theo đơn giá cố định', 'Theo đơn giá điều chỉnh', 'Theo thời gian', 'Loại khác'],
    nhomMoc: ['Quy hoạch', 'Chuẩn bị đầu tư', 'Chủ trương đầu tư', 'Quyết định đầu tư, phê duyệt dự toán', 'Đánh giá tác động môi trường', 'Đất đai, giải phóng mặt bằng', 'Thủ tục xây dựng', 'Lựa chọn nhà thầu', 'Thi công, triển khai thực hiện', 'Nghiệm thu', 'Bàn giao', 'Quyết toán', 'Khác']
  };
  A.DEFAULT_CFG = {
    tenDonVi: 'Phòng Kế hoạch - Tài chính',
    coQuan: 'Sở Nông nghiệp và Môi trường tỉnh Sơn La',
    nguoiDung: '', nam: null, theme: 'light',
    nguong: { sapHan: 7, tonDong: 30, gnLech: 20, hdSapHet: 30 },
    lists: {}
  };
  A.cfg = k => { const c = A.Store.cfg; return (c[k] !== undefined && c[k] !== null) ? c[k] : A.DEFAULT_CFG[k]; };
  A.nguong = k => Object.assign({}, A.DEFAULT_CFG.nguong, A.Store.cfg.nguong || {})[k];
  A.list = k => { const l = (A.Store.cfg.lists || {})[k]; return (l && l.length) ? l : (A.DEFAULT_LISTS[k] || []); };

  /* Lựa chọn cố định (có mã) */
  A.OPT = {
    ttNV: [['chua', 'Chưa triển khai'], ['dang', 'Đang thực hiện'], ['hoanthanh', 'Đã hoàn thành'], ['tamdung', 'Tạm dừng']],
    loaiTG: [['thuongxuyen', 'Thường xuyên (không hạn cụ thể)'], ['dinhky', 'Định kỳ'], ['phatsinh', 'Phát sinh, đột xuất']],
    vaiTro: [['chutri', 'Chủ trì'], ['phoihop', 'Phối hợp'], ['thammuu', 'Tham mưu']],
    uuTien: [['cao', 'Cao'], ['thuong', 'Bình thường']],
    ttVB: [['chua', 'Chưa xử lý'], ['dang', 'Đang xử lý'], ['hoanthanh', 'Đã xử lý xong'], ['khongyc', 'Để biết, không yêu cầu xử lý']],
    ttDA: [['chuanbi', 'Chuẩn bị'], ['dangth', 'Đang thực hiện'], ['tamdung', 'Tạm dừng, vướng mắc'], ['hoanthanh', 'Đã hoàn thành'], ['quyettoan', 'Đã quyết toán']],
    ttQT: [['', '—'], ['chuaden', 'Chưa đến kỳ quyết toán'], ['chualap', 'Chưa lập hồ sơ'], ['datrinh', 'Đã trình thẩm tra'], ['daduyet', 'Đã phê duyệt quyết toán']],
    ttMoc: [['chua', 'Chưa thực hiện'], ['dang', 'Đang thực hiện'], ['hoanthanh', 'Đã hoàn thành'], ['khongad', 'Không áp dụng']],
    ttGT: [['nhucau', 'Nhu cầu mua sắm'], ['dutoan', 'Đã duyệt dự toán'], ['khlcnt', 'Đã duyệt KHLCNT'], ['danglcnt', 'Đang lựa chọn nhà thầu'], ['cokq', 'Đã có kết quả LCNT'], ['dakyhd', 'Đã ký hợp đồng'], ['huy', 'Hủy, không thực hiện']],
    ttHD: [['dang', 'Đang thực hiện'], ['nghiemthu', 'Đã nghiệm thu'], ['thanhly', 'Đã thanh lý'], ['tamdung', 'Tạm dừng'], ['chamdut', 'Chấm dứt trước hạn']],
    ttCB: [['danglam', 'Đang công tác'], ['nghi', 'Nghỉ, chuyển công tác']],
    // Theo Phụ biểu 0A.01-T.STC "Tổng hợp hiện trạng tài sản nhà, đất"
    htSD: [['dung', 'Tiếp tục sử dụng — đúng mục đích'], ['khongdung', 'Tiếp tục sử dụng — không đúng mục đích']],
    gcnTT: [['dacap', 'Đã được cấp giấy chứng nhận QSD đất, tài sản'], ['matmat', 'Đã được cấp GCN, hồ sơ tài sản nhưng mất mát, thất lạc'], ['chuacap', 'Chưa được cấp giấy chứng nhận QSD đất, tài sản']],
    tinhChatDM: [['thuongxuyen', 'Thường xuyên'], ['dinhky', 'Định kỳ'], ['dotxuat', 'Đột xuất, khi có yêu cầu']],
    kyDM: [['thang', 'Tháng'], ['quy', 'Quý'], ['6thang', '6 tháng'], ['9thang', '9 tháng'], ['nam', 'Năm']],
    loaiDM: [['chinhthuc', 'Nhiệm vụ chính thức (theo quyết định)'], ['noibo', 'Việc hỗ trợ nội bộ (ngoài quyết định)']]
  };
  A.optLabel = (key, v) => { const o = (A.OPT[key] || []).find(x => x[0] === v); return o ? o[1] : (v || ''); };

  /* 10 nhóm chức năng theo Điều 2 Quyết định 324/QĐ-SNNMT */
  A.NHOM = [
    ['1', 'Quy hoạch, kế hoạch, thống kê; chương trình, dự án', 'Kế hoạch, thống kê, dự án'],
    ['2', 'Khoa học công nghệ', 'Khoa học công nghệ'],
    ['3', 'Chương trình, dự án theo phân công của lãnh đạo Sở', 'CT, DA theo phân công'],
    ['4', 'Tài chính, tài sản', 'Tài chính, tài sản'],
    ['5', 'Cơ chế tự chủ, tự chịu trách nhiệm', 'Tự chủ tài chính'],
    ['6', 'Thanh tra, kiểm toán', 'Thanh tra, kiểm toán'],
    ['7', 'Thực hành tiết kiệm, chống lãng phí', 'Tiết kiệm, chống lãng phí'],
    ['8', 'Đề án thu phí, lệ phí', 'Phí, lệ phí'],
    ['9', 'Các nhiệm vụ khác', 'Nhiệm vụ khác'],
    ['10', 'Trực ngoài giờ và nhiệm vụ Ban Giám đốc giao', 'Trực, việc được giao'],
    ['0', 'Việc hỗ trợ nội bộ (ngoài QĐ 324)', 'Nội bộ']
  ];
  A.nhomTen = (id, short) => { const n = A.NHOM.find(x => x[0] === String(id)); return n ? (short ? n[2] : n[1]) : ''; };

  const nhomOpts = () => A.NHOM.map(n => [n[0], (n[0] === '0' ? '' : n[0] + '. ') + n[1]]);
  const F = (k, label, type, extra) => Object.assign({ k, label, type: type || 'text' }, extra || {});

  const C = {};
  C.canbo = {
    label: 'Cán bộ', title: r => r.hoTen, unique: r => U.norm(r.hoTen), uniqueLabel: 'họ tên',
    fields: [
      F('hoTen', 'Họ và tên', 'text', { required: true, table: true }),
      F('tenGoi', 'Tên gọi tắt', 'text', { help: 'Dùng trên biểu đồ, thẻ. Ví dụ: Kiên' }),
      F('chucVu', 'Chức vụ', 'text', { table: true }),
      F('viTri', 'Vị trí công tác', 'text', { table: true }),
      F('linhVuc', 'Lĩnh vực phụ trách', 'textarea', { table: true }),
      F('donViIds', 'Đơn vị dự toán theo dõi', 'refs', { ref: 'donvi' }),
      F('email', 'Thư điện tử'), F('sdt', 'Điện thoại'),
      F('trangThai', 'Trạng thái', 'select', { opt: 'ttCB', def: 'danglam' }),
      F('ghiChu', 'Ghi chú', 'textarea')
    ]
  };
  C.donvi = {
    label: 'Đơn vị', title: r => r.ten, unique: r => U.norm(r.ten), uniqueLabel: 'tên đơn vị',
    fields: [
      F('ten', 'Tên đơn vị', 'text', { required: true, table: true }),
      F('tenTat', 'Tên viết tắt', 'text', { table: true }),
      F('loai', 'Loại', 'text', { table: true, help: 'Ví dụ: Đơn vị dự toán, Phòng thuộc Sở' }),
      F('ghiChu', 'Ghi chú', 'textarea')
    ]
  };
  C.danhmuc = {
    label: 'Chức năng, nhiệm vụ', title: r => (r.ma ? r.ma + ' — ' : '') + r.ten, unique: r => U.norm(r.ma), uniqueLabel: 'mã nhiệm vụ',
    fields: [
      F('ma', 'Mã nhiệm vụ', 'text', { required: true, table: true }),
      F('ten', 'Tên nhiệm vụ', 'textarea', { required: true, table: true }),
      F('nhom', 'Nhóm chức năng', 'select', { options: nhomOpts, required: true, table: true }),
      F('loai', 'Phân loại', 'select', { opt: 'loaiDM', def: 'chinhthuc' }),
      F('canCu', 'Căn cứ giao nhiệm vụ', 'text', { table: true }),
      F('noiDung', 'Nội dung theo văn bản', 'textarea'),
      F('vaiTroText', 'Vai trò của Phòng', 'text', { help: 'Chủ trì / Phối hợp / Tham mưu… theo đúng câu chữ văn bản' }),
      F('tinhChat', 'Tính chất thời gian', 'select', { opt: 'tinhChatDM', def: 'thuongxuyen', table: true }),
      F('ky', 'Kỳ thực hiện (nếu định kỳ)', 'multi', { opt: 'kyDM' }),
      F('kyNguon', 'Nguồn xác định chu kỳ', 'select', { options: [['vanban', 'Văn bản nêu rõ'], ['phanloai', 'Phần mềm phân loại — cần rà soát']], def: 'phanloai' }),
      F('sanPham', 'Sản phẩm đầu ra', 'text'),
      F('chuTriId', 'Cán bộ chủ trì', 'ref', { ref: 'canbo', table: true }),
      F('phoiHopIds', 'Cán bộ phối hợp', 'refs', { ref: 'canbo' }),
      F('goiY', 'Phân công tham khảo', 'text', { help: 'Chỉ để tham khảo, không phải phân công chính thức' }),
      F('ghiChu', 'Ghi chú', 'textarea'),
      F('dinhKem', 'Tài liệu, văn bản liên quan', 'files')
    ]
  };
  C.nhiemvu = {
    label: 'Nhiệm vụ', title: r => r.ten, autoMa: 'NV',
    unique: r => U.norm(r.ten) + '|' + (r.han || '') + '|' + (r.kyNhan || ''), uniqueLabel: 'tên nhiệm vụ và thời hạn',
    fields: [
      F('ma', 'Mã', 'text', { table: true, help: 'Để trống, phần mềm tự đặt mã' }),
      F('ten', 'Tên nhiệm vụ', 'textarea', { required: true, table: true }),
      F('nguon', 'Nguồn giao', 'select', { list: 'nguonNV' }),
      F('dmId', 'Thuộc chức năng, nhiệm vụ', 'ref', { ref: 'danhmuc' }),
      F('nhom', 'Nhóm chức năng', 'select', { options: nhomOpts, table: true }),
      F('canCu', 'Căn cứ giao nhiệm vụ'),
      F('noiDung', 'Nội dung công việc', 'textarea'),
      F('sanPham', 'Sản phẩm đầu ra'),
      F('loaiTG', 'Chu kỳ thực hiện', 'select', { opt: 'loaiTG', def: 'phatsinh' }),
      F('kyNhan', 'Kỳ thực hiện', 'text', { help: 'Ví dụ: Tháng 11/2026, Quý IV/2026' }),
      F('vaiTro', 'Vai trò của Phòng', 'select', { opt: 'vaiTro', def: 'chutri' }),
      F('chuTriId', 'Cán bộ chủ trì', 'ref', { ref: 'canbo', table: true }),
      F('phoiHopIds', 'Cán bộ phối hợp', 'refs', { ref: 'canbo' }),
      F('ngayGiao', 'Ngày giao', 'date'),
      F('han', 'Thời hạn hoàn thành', 'date', { table: true, help: 'Bỏ trống nếu là việc thường xuyên, không có hạn' }),
      F('nam', 'Năm', 'year'),
      F('uuTien', 'Mức ưu tiên', 'select', { opt: 'uuTien', def: 'thuong' }),
      F('trangThai', 'Tình trạng', 'select', { opt: 'ttNV', def: 'chua', table: true }),
      F('tienDo', 'Tiến độ (%)', 'percent'),
      F('ngayHT', 'Ngày hoàn thành', 'date'),
      F('ketQua', 'Kết quả thực hiện', 'textarea'),
      F('nguyenNhanCham', 'Nguyên nhân chậm, khó khăn', 'textarea'),
      F('xinYKien', 'Cần xin ý kiến, quyết định của lãnh đạo', 'bool'),
      F('ndXinYKien', 'Nội dung xin ý kiến', 'textarea'),
      F('vanBanIds', 'Văn bản liên quan', 'refs', { ref: 'vanban' }),
      F('duAnIds', 'Chương trình, dự án liên quan', 'refs', { ref: 'duan' }),
      F('dinhKem', 'Tài liệu đính kèm', 'files'),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    validate(r) {
      const e = [];
      if (r.han && r.ngayGiao && r.han < r.ngayGiao) e.push('Thời hạn hoàn thành trước ngày giao.');
      if (r.ngayHT && r.ngayGiao && r.ngayHT < r.ngayGiao) e.push('Ngày hoàn thành trước ngày giao.');
      if (r.ngayHT && r.ngayHT > U.today()) e.push('Ngày hoàn thành ở tương lai.');
      return e;
    },
    normalize(r) {
      if (r.trangThai === 'hoanthanh') { if (!r.ngayHT) r.ngayHT = U.today(); r.tienDo = 100; }
      else { if (r.ngayHT) r.ngayHT = ''; if (r.tienDo === 100) r.tienDo = 90; }
      if (!r.nam) r.nam = U.yearOf(r.han) || U.yearOf(r.ngayGiao) || A.year() || +U.today().slice(0, 4);
      if (r.dmId && !r.nhom) { const d = A.Store.get('danhmuc', r.dmId); if (d) r.nhom = d.nhom; }
      if (!r.xinYKien) r.ndXinYKien = r.ndXinYKien || '';
    }
  };
  C.vanban = {
    label: 'Văn bản', title: r => (r.soKyHieu || '(chưa có số)') + (r.trichYeu ? ' — ' + r.trichYeu : ''),
    unique: r => U.norm(r.soKyHieu) + '|' + (r.ngayBanHanh || ''), uniqueLabel: 'số ký hiệu và ngày ban hành',
    fields: [
      F('soKyHieu', 'Số, ký hiệu', 'text', { required: true, table: true }),
      F('ngayBanHanh', 'Ngày ban hành', 'date', { table: true }),
      F('coQuan', 'Cơ quan ban hành', 'text', { table: true }),
      F('nguon', 'Nguồn giao', 'select', { list: 'nguonVB', table: true }),
      F('trichYeu', 'Trích yếu', 'textarea', { required: true, table: true }),
      F('noiDungChiDao', 'Nội dung chỉ đạo, giao việc', 'textarea'),
      F('vaiTro', 'Vai trò của Phòng', 'select', { opt: 'vaiTro', def: 'chutri' }),
      F('han', 'Thời hạn hoàn thành', 'date', { table: true }),
      F('chuTriId', 'Người chủ trì', 'ref', { ref: 'canbo', table: true }),
      F('phoiHopIds', 'Người phối hợp', 'refs', { ref: 'canbo' }),
      F('trangThai', 'Tình trạng xử lý', 'select', { opt: 'ttVB', def: 'chua', table: true }),
      F('ngayHT', 'Ngày xử lý xong', 'date'),
      F('ketQua', 'Kết quả thực hiện', 'textarea'),
      F('duAnIds', 'Chương trình, dự án liên quan', 'refs', { ref: 'duan' }),
      F('dinhKem', 'Tệp văn bản', 'files'),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    validate(r) { const e = []; if (r.han && r.ngayBanHanh && r.han < r.ngayBanHanh) e.push('Thời hạn hoàn thành trước ngày ban hành.'); return e; },
    normalize(r) { if (r.trangThai === 'hoanthanh' && !r.ngayHT) r.ngayHT = U.today(); if (r.trangThai !== 'hoanthanh') r.ngayHT = ''; }
  };
  C.duan = {
    label: 'Chương trình, dự án', title: r => r.ten, autoMa: 'DA', unique: r => U.norm(r.ten), uniqueLabel: 'tên',
    fields: [
      F('ma', 'Mã', 'text', { table: true, help: 'Để trống, phần mềm tự đặt mã' }),
      F('ten', 'Tên chương trình, dự án, nhiệm vụ', 'textarea', { required: true, table: true }),
      F('loai', 'Loại', 'select', { list: 'loaiDuAn', table: true }),
      F('vaiTroSo', 'Vai trò của Sở, Phòng', 'select', { list: 'vaiTroSo' }),
      F('linhVuc', 'Lĩnh vực', 'select', { list: 'linhVucDA', table: true }),
      F('chuDauTu', 'Chủ đầu tư', 'text', { table: true }),
      F('donViQL', 'Đơn vị quản lý, thực hiện'),
      F('diaDiem', 'Địa điểm thực hiện'),
      F('tmdt', 'Tổng mức đầu tư / dự toán (đồng)', 'money', { table: true }),
      F('nguonVon', 'Cơ cấu nguồn vốn', 'rows', { cols: [F('ten', 'Nguồn vốn', 'select', { list: 'nguonVon', required: true }), F('soTien', 'Số tiền (đồng)', 'money')] }),
      F('batDau', 'Thời gian bắt đầu', 'date'),
      F('ketThuc', 'Thời gian kết thúc', 'date', { table: true }),
      F('qdCTSo', 'Quyết định chủ trương đầu tư — số'), F('qdCTNgay', 'Quyết định chủ trương — ngày', 'date'),
      F('qdDTSo', 'Quyết định đầu tư / phê duyệt dự toán — số'), F('qdDTNgay', 'Quyết định đầu tư — ngày', 'date'),
      F('canBoId', 'Cán bộ theo dõi', 'ref', { ref: 'canbo', table: true }),
      F('phoiHopIds', 'Cán bộ phối hợp', 'refs', { ref: 'canbo' }),
      F('trangThai', 'Tình trạng', 'select', { opt: 'ttDA', def: 'chuanbi', table: true }),
      F('tienDo', 'Tiến độ thực hiện (%)', 'percent', { table: true }),
      F('moc', 'Các mốc công việc', 'rows', {
        cols: [F('ten', 'Mốc công việc', 'text', { required: true }), F('nhom', 'Giai đoạn', 'select', { list: 'nhomMoc' }), F('batDau', 'Bắt đầu', 'date'),
        F('ketThuc', 'Hạn hoàn thành', 'date'), F('trangThai', 'Tình trạng', 'select', { opt: 'ttMoc', def: 'chua' }), F('ngayHT', 'Ngày hoàn thành', 'date'), F('ghiChu', 'Ghi chú')]
      }),
      F('khoKhan', 'Khó khăn, vướng mắc', 'textarea'),
      F('nguyenNhanCham', 'Nguyên nhân chậm tiến độ', 'textarea'),
      F('kienNghi', 'Kiến nghị, đề xuất xử lý', 'textarea'),
      F('qtTrangThai', 'Tình hình quyết toán', 'select', { opt: 'ttQT' }),
      F('qtSo', 'Quyết định phê duyệt quyết toán — số'), F('qtNgay', 'Quyết định quyết toán — ngày', 'date'),
      F('qtGiaTri', 'Giá trị quyết toán (đồng)', 'money'),
      F('dinhKem', 'Hồ sơ, tài liệu', 'files'),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    validate(r) {
      const e = [];
      if (r.batDau && r.ketThuc && r.ketThuc < r.batDau) e.push('Thời gian kết thúc trước thời gian bắt đầu.');
      (r.moc || []).forEach((m, i) => { if (m.batDau && m.ketThuc && m.ketThuc < m.batDau) e.push('Mốc ' + (i + 1) + ' "' + U.trunc(m.ten, 40) + '": hạn hoàn thành trước ngày bắt đầu.'); });
      const tong = U.sum(r.nguonVon || [], x => x.soTien);
      if (U.num(r.tmdt) > 0 && tong > 0 && Math.abs(tong - U.num(r.tmdt)) > 0.5) e.push('Cơ cấu nguồn vốn (' + U.fmtMoney(tong) + ') khác tổng mức đầu tư (' + U.fmtMoney(r.tmdt) + ').');
      return e;
    },
    warnOnly: true,
    normalize(r) { (r.moc || []).forEach(m => { if (!m.id) m.id = U.uid('m'); if (m.trangThai === 'hoanthanh' && !m.ngayHT) m.ngayHT = U.today(); if (m.trangThai !== 'hoanthanh') m.ngayHT = ''; }); }
  };
  C.von = {
    label: 'Kế hoạch vốn', title: r => { const d = A.Store.get('duan', r.duAnId); return (d ? U.trunc(d.ten, 70) : '(chưa gắn dự án)') + ' — ' + (r.nguonVon || '') + ' — ' + (r.nam || ''); },
    unique: r => (r.duAnId || '') + '|' + (r.nam || '') + '|' + U.norm(r.nguonVon), uniqueLabel: 'dự án, năm và nguồn vốn',
    fields: [
      F('duAnId', 'Chương trình, dự án', 'ref', { ref: 'duan', required: true, table: true }),
      F('nam', 'Năm ngân sách', 'year', { required: true, table: true }),
      F('nguonVon', 'Nguồn vốn', 'select', { list: 'nguonVon', required: true, table: true }),
      F('qdGiao', 'Quyết định giao vốn'),
      F('khGiao', 'Kế hoạch vốn giao đầu năm (đồng)', 'money', { table: true }),
      F('keoDai', 'Vốn năm trước chuyển sang, kéo dài (đồng)', 'money'),
      F('dcTang', 'Điều chỉnh tăng, bổ sung (đồng)', 'money'),
      F('dcGiam', 'Điều chỉnh giảm, thu hồi (đồng)', 'money'),
      F('capNhat', 'Giải ngân lũy kế theo từng thời điểm', 'rows', { cols: [F('ngay', 'Đến ngày', 'date', { required: true }), F('luyKe', 'Lũy kế giải ngân (đồng)', 'money', { required: true }), F('ghiChu', 'Ghi chú')], help: 'Mỗi dòng là số lũy kế từ đầu năm đến ngày đó. Số mới nhất là số giải ngân hiện tại.' }),
      F('nhuCauDC', 'Nhu cầu điều chỉnh vốn (đồng; âm là giảm)', 'money', { signed: true }),
      F('nguyenNhan', 'Khó khăn, nguyên nhân giải ngân chậm', 'textarea'),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    validate(r) {
      const e = []; const rows = (r.capNhat || []).slice().sort((a, b) => a.ngay < b.ngay ? -1 : 1);
      for (let i = 1; i < rows.length; i++) if (U.num(rows[i].luyKe) < U.num(rows[i - 1].luyKe)) e.push('Lũy kế giải ngân đến ' + U.fmtDate(rows[i].ngay) + ' nhỏ hơn kỳ trước (' + U.fmtDate(rows[i - 1].ngay) + ').');
      const kh = U.num(r.khGiao) + U.num(r.keoDai) + U.num(r.dcTang) - U.num(r.dcGiam);
      if (rows.length && U.num(rows[rows.length - 1].luyKe) > kh + 0.5) e.push('Giải ngân lũy kế (' + U.fmtMoney(rows[rows.length - 1].luyKe) + ') vượt kế hoạch vốn sau điều chỉnh (' + U.fmtMoney(kh) + ').');
      if (kh < 0) e.push('Kế hoạch vốn sau điều chỉnh bị âm.');
      return e;
    },
    warnOnly: true,
    normalize(r) { (r.capNhat || []).sort((a, b) => a.ngay < b.ngay ? -1 : 1); }
  };
  C.ngansach = {
    label: 'Dự toán ngân sách', title: r => (r.stt ? r.stt + ' ' : '') + r.noiDung,
    fields: [
      F('nam', 'Năm ngân sách', 'year', { required: true }),
      F('donViId', 'Đơn vị dự toán', 'ref', { ref: 'donvi', required: true }),
      F('parentId', 'Thuộc mục (dòng cha)', 'ref', { ref: 'ngansach', help: 'Bỏ trống nếu là mục cấp cao nhất' }),
      F('stt', 'Số thứ tự'),
      F('noiDung', 'Nội dung', 'textarea', { required: true }),
      F('nhomKP', 'Nhóm kinh phí', 'select', { list: 'nhomKP' }),
      F('chuongKhoan', 'Chương, loại, khoản'),
      F('quyetDinh', 'Quyết định giao, điều chỉnh'),
      F('chuyenNguon', 'Chuyển nguồn năm trước sang (đồng)', 'money'),
      F('duToan', 'Dự toán giao đầu năm (đồng)', 'money'),
      F('boSung', 'Bổ sung trong năm (đồng)', 'money'),
      F('dcTang', 'Điều chỉnh tăng (đồng)', 'money'),
      F('dcGiam', 'Điều chỉnh giảm (đồng)', 'money'),
      F('thuHoi', 'Thu hồi trong năm (đồng)', 'money'),
      F('tietKiem', 'Tiết kiệm (đồng)', 'money'),
      F('giaiNgan', 'Đã giải ngân, thanh toán (đồng)', 'money'),
      F('ngayGN', 'Số giải ngân tính đến ngày', 'date'),
      F('quyetToan', 'Số quyết toán (đồng)', 'money'),
      F('tienDo', 'Tiến độ triển khai', 'textarea'),
      F('canBoId', 'Cán bộ theo dõi', 'ref', { ref: 'canbo' }),
      F('duAnId', 'Chương trình, dự án liên quan', 'ref', { ref: 'duan' }),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    validate(r) {
      const e = [];
      if (r.parentId && r.parentId === r.id) e.push('Dòng không thể là cha của chính nó.');
      return e;
    }
  };
  C.taisan = {
    label: 'Tài sản công', title: r => r.ten, autoMa: 'TS', unique: r => U.norm(r.ma || r.ten) + '|' + (r.donViId || ''), uniqueLabel: 'mã (hoặc tên) và đơn vị sử dụng',
    fields: [
      F('ma', 'Mã tài sản', 'text', { table: true, help: 'Để trống, phần mềm tự đặt mã' }),
      F('ten', 'Tên tài sản', 'text', { required: true, table: true }),
      F('loai', 'Loại tài sản', 'select', { list: 'loaiTaiSan', required: true, table: true }),
      F('donViId', 'Đơn vị sử dụng', 'ref', { ref: 'donvi', table: true }),
      F('thongSo', 'Thông số, đặc điểm', 'text', { help: 'Biển số xe, diện tích, địa chỉ, ký hiệu…' }),
      F('nguon', 'Nguồn hình thành', 'select', { list: 'nguonTaiSan' }),
      F('namSD', 'Năm đưa vào sử dụng', 'year'),
      F('soLuong', 'Số lượng', 'number'),
      F('nguyenGia', 'Nguyên giá (đồng)', 'money', { table: true }),
      F('conLai', 'Giá trị còn lại (đồng)', 'money', { table: true }),
      F('tinhTrang', 'Tình trạng sử dụng', 'select', { list: 'tinhTrangTS', table: true }),
      F('ngayKiemKe', 'Ngày kiểm kê gần nhất', 'date'),
      // --- Cơ sở nhà, đất (Phụ biểu 0A.01-T.STC) ---
      F('donViGiao', 'Cơ quan, đơn vị đang được giao quản lý', 'text', { help: 'Ghi đúng như trên biểu (có thể là đơn vị cấp dưới của đơn vị dự toán, ví dụ Hạt Kiểm lâm)' }),
      F('dtNha', 'Diện tích nhà (m²)', 'number'),
      F('dtDat', 'Diện tích đất (m²)', 'number'),
      F('htSD', 'Hiện trạng sử dụng', 'select', { opt: 'htSD' }),
      F('ndNgay', 'Hiện trạng tính đến ngày', 'date'),
      F('gcnTT', 'Giấy chứng nhận QSD đất, tài sản', 'select', { opt: 'gcnTT' }),
      F('gcnSo', 'Số GCN, ngày cấp', 'text', { help: 'Ghi như trên biểu, ví dụ: Số AL 177247 cấp ngày 01/01/2008' }),
      F('gcnNgay', 'Ngày cấp GCN', 'date'),
      F('hsDayDu', 'Đầy đủ hồ sơ hình thành tài sản', 'bool'),
      F('hsThieu', 'Thiếu hồ sơ hình thành tài sản', 'bool'),
      F('chuaDKBD', 'Chưa đăng ký hồ sơ biến động đất đai', 'bool'),
      F('nguyenNhanHS', 'Nguyên nhân chưa đăng ký biến động, chưa đầy đủ hồ sơ tài sản', 'textarea'),
      F('ghiChuBieu', 'Ghi chú theo biểu nhà, đất', 'textarea'),
      F('bienDong', 'Biến động (mua sắm, điều chuyển, sửa chữa, thanh lý, kiểm kê)', 'rows', {
        cols: [F('ngay', 'Ngày', 'date', { required: true }), F('loai', 'Loại biến động', 'select', { list: 'loaiBienDongTS', required: true }), F('noiDung', 'Nội dung'),
        F('soQD', 'Số quyết định'), F('giaTri', 'Giá trị (đồng)', 'money')]
      }),
      F('dinhKem', 'Hồ sơ tài sản', 'files'),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    validate(r) {
      const e = [];
      if (r.nguyenGia !== '' && r.conLai !== '' && U.num(r.conLai) > U.num(r.nguyenGia)) e.push('Giá trị còn lại lớn hơn nguyên giá.');
      ['dtNha', 'dtDat'].forEach(k => { if (typeof r[k] === 'number' && r[k] < 0) e.push('"' + (k === 'dtNha' ? 'Diện tích nhà' : 'Diện tích đất') + '" không được âm.'); });
      return e;
    },
    // Cảnh báo (vẫn cho lưu): phản ánh đúng mâu thuẫn có thể có trên biểu gốc để rà soát
    warn(r) {
      const w = [];
      if (r.hsDayDu && r.hsThieu) w.push('Vừa đánh dấu "Đầy đủ hồ sơ hình thành tài sản" vừa "Thiếu hồ sơ hình thành tài sản".');
      if (r.gcnTT === 'chuacap' && (r.gcnSo || r.gcnNgay)) w.push('Ghi "Chưa được cấp GCN" nhưng có số hoặc ngày cấp GCN.');
      if (r.gcnNgay && r.gcnNgay > U.today()) w.push('Ngày cấp GCN ở tương lai (' + U.fmtDate(r.gcnNgay) + ') — có thể bị đảo ngày, tháng khi nhập.');
      if (r.gcnNgay && r.ndNgay && r.gcnNgay > r.ndNgay) w.push('Ngày cấp GCN (' + U.fmtDate(r.gcnNgay) + ') sau ngày lập biểu hiện trạng (' + U.fmtDate(r.ndNgay) + ').');
      return w;
    },
    // Ẩn nhóm trường nhà, đất với tài sản khác (phương tiện, máy móc…) để form gọn
    afterRender(form) {
      const keys = ['donViGiao', 'dtNha', 'dtDat', 'htSD', 'ndNgay', 'gcnTT', 'gcnSo', 'gcnNgay', 'hsDayDu', 'hsThieu', 'chuaDKBD', 'nguyenNhanHS', 'ghiChuBieu'];
      const sel = form.querySelector('[data-k="loai"]');
      const filled = () => keys.some(k => { const el = form.querySelector('[data-k="' + k + '"]'); return el && (el.type === 'checkbox' ? el.checked : el.value.trim()); });
      const apply = () => {
        const on = A.L.ND_LOAI.includes(sel && sel.value) || filled();
        keys.forEach(k => { const f = form.querySelector('[data-fld="' + k + '"]'); if (f) f.classList.toggle('hide', !on); });
        const sec = form.querySelector('[data-sec-key="nhadat"]'); if (sec) sec.classList.toggle('hide', !on);
      };
      if (sel) sel.addEventListener('change', apply);
      apply();
    }
  };
  C.goithau = {
    label: 'Gói thầu, mua sắm', title: r => r.ten, unique: r => U.norm(r.ten) + '|' + (r.duAnId || ''), uniqueLabel: 'tên gói thầu trong cùng dự án',
    fields: [
      F('ten', 'Tên gói thầu / nội dung mua sắm', 'textarea', { required: true, table: true }),
      F('duAnId', 'Thuộc chương trình, dự án', 'ref', { ref: 'duan', table: true }),
      F('donViId', 'Đơn vị đề xuất, thực hiện', 'ref', { ref: 'donvi' }),
      F('loai', 'Loại gói thầu', 'select', { list: 'loaiGoiThau', table: true }),
      F('nguonVon', 'Nguồn vốn'),
      F('duToan', 'Dự toán mua sắm (đồng)', 'money'),
      F('giaGoiThau', 'Giá gói thầu (đồng)', 'money', { table: true }),
      F('hinhThuc', 'Hình thức lựa chọn nhà thầu', 'select', { list: 'hinhThucLCNT', table: true }),
      F('qdKHSo', 'Quyết định phê duyệt KHLCNT — số'), F('qdKHNgay', 'Quyết định KHLCNT — ngày', 'date'),
      F('hanLCNT', 'Thời hạn phải hoàn thành lựa chọn nhà thầu', 'date', { help: 'Theo kế hoạch lựa chọn nhà thầu được duyệt' }),
      F('trangThai', 'Tình trạng', 'select', { opt: 'ttGT', def: 'nhucau', table: true }),
      F('nhaThau', 'Nhà thầu trúng thầu'),
      F('qdKQSo', 'Quyết định phê duyệt kết quả LCNT — số'), F('qdKQNgay', 'Quyết định kết quả — ngày', 'date'),
      F('giaTrung', 'Giá trúng thầu (đồng)', 'money'),
      F('canBoId', 'Cán bộ theo dõi', 'ref', { ref: 'canbo', table: true }),
      F('dinhKem', 'Hồ sơ', 'files'),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    validate(r) { const e = []; if (U.num(r.giaTrung) > 0 && U.num(r.giaGoiThau) > 0 && U.num(r.giaTrung) > U.num(r.giaGoiThau)) e.push('Giá trúng thầu lớn hơn giá gói thầu.'); return e; },
    warnOnly: true
  };
  C.hopdong = {
    label: 'Hợp đồng', title: r => (r.so || '(chưa có số)') + (r.ten ? ' — ' + r.ten : ''), unique: r => U.norm(r.so) + '|' + (r.ngayKy || ''), uniqueLabel: 'số hợp đồng và ngày ký',
    fields: [
      F('so', 'Số hợp đồng', 'text', { required: true, table: true }),
      F('ten', 'Nội dung hợp đồng', 'textarea', { table: true }),
      F('ngayKy', 'Ngày ký', 'date', { table: true }),
      F('goiThauId', 'Thuộc gói thầu', 'ref', { ref: 'goithau' }),
      F('duAnId', 'Thuộc chương trình, dự án', 'ref', { ref: 'duan' }),
      F('nhaThau', 'Nhà thầu, đơn vị thực hiện', 'text', { table: true }),
      F('loaiHD', 'Loại hợp đồng', 'select', { list: 'loaiHopDong' }),
      F('giaTri', 'Giá trị hợp đồng (đồng)', 'money', { table: true }),
      F('ngayBD', 'Ngày bắt đầu thực hiện', 'date'),
      F('ngayKT', 'Thời hạn hoàn thành hợp đồng', 'date', { table: true, help: 'Nếu có phụ lục gia hạn, nhập hạn mới và ghi chú phụ lục' }),
      F('tamUng', 'Đã tạm ứng (đồng)', 'money'),
      F('thanhToan', 'Các lần thanh toán', 'rows', { cols: [F('ngay', 'Ngày', 'date', { required: true }), F('soTien', 'Số tiền (đồng)', 'money', { required: true }), F('noiDung', 'Nội dung')] }),
      F('nghiemThu', 'Các lần nghiệm thu', 'rows', { cols: [F('ngay', 'Ngày', 'date', { required: true }), F('noiDung', 'Nội dung, khối lượng'), F('giaTri', 'Giá trị nghiệm thu (đồng)', 'money')] }),
      F('trangThai', 'Tình trạng', 'select', { opt: 'ttHD', def: 'dang', table: true }),
      F('thanhLyNgay', 'Ngày thanh lý', 'date'), F('thanhLySo', 'Số biên bản thanh lý'),
      F('canBoId', 'Cán bộ theo dõi', 'ref', { ref: 'canbo', table: true }),
      F('dinhKem', 'Hồ sơ hợp đồng', 'files'),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    validate(r) {
      const e = [];
      if (r.ngayKT && r.ngayBD && r.ngayKT < r.ngayBD) e.push('Thời hạn hoàn thành trước ngày bắt đầu.');
      const tt = U.sum(r.thanhToan || [], x => x.soTien);
      if (U.num(r.giaTri) > 0 && tt > U.num(r.giaTri) + 0.5) e.push('Tổng thanh toán (' + U.fmtMoney(tt) + ') vượt giá trị hợp đồng (' + U.fmtMoney(r.giaTri) + ').');
      return e;
    },
    warnOnly: true
  };

  const TRACKED = ['canbo', 'donvi', 'danhmuc', 'nhiemvu', 'vanban', 'duan', 'von', 'ngansach', 'taisan', 'goithau', 'hopdong'];
  const Sc = A.Schema = {
    C, TRACKED,
    get: c => C[c] || null,
    tracked: c => TRACKED.includes(c),
    field: (c, k) => C[c].fields.find(f => f.k === k),
    options(f) {
      if (f.options) return typeof f.options === 'function' ? f.options() : f.options;
      if (f.opt) return A.OPT[f.opt];
      if (f.list) return A.list(f.list).map(x => [x, x]);
      return [];
    },
    refName(coll, id) {
      const r = A.Store.get(coll, id); if (!r) return '';
      if (coll === 'canbo') return r.tenGoi || r.hoTen;
      if (coll === 'donvi') return r.tenTat || r.ten;
      return U.trunc(C[coll].title(r), 80);
    },
    /* Giá trị hiển thị dạng văn bản thuần của 1 trường */
    text(f, v) {
      if (v === undefined || v === null || v === '') return '';
      switch (f.type) {
        case 'date': return U.fmtDate(v);
        case 'money': return U.fmtMoney(v);
        case 'number': return U.fmtNum(v);
        case 'percent': return U.fmtNum(v, 0) + '%';
        case 'bool': return v ? 'Có' : '';
        case 'select': { const o = Sc.options(f).find(x => x[0] === v); return o ? o[1] : String(v); }
        case 'multi': return (v || []).map(x => { const o = Sc.options(f).find(y => y[0] === x); return o ? o[1] : x; }).join(', ');
        case 'ref': return Sc.refName(f.ref, v);
        case 'refs': return (v || []).map(id => Sc.refName(f.ref, id)).filter(Boolean).join(', ');
        case 'rows': return (v || []).length ? (v.length + ' dòng') : '';
        case 'files': return (v || []).map(x => x.ten).join('; ');
        default: return String(v);
      }
    },
    diff(c, a, b) {
      const out = [];
      C[c].fields.forEach(f => {
        const x = a[f.k], y = b[f.k];
        const ex = x === undefined || x === null || x === '' || (Array.isArray(x) && !x.length) || x === false;
        const ey = y === undefined || y === null || y === '' || (Array.isArray(y) && !y.length) || y === false;
        if (ex && ey) return;
        if (JSON.stringify(x === undefined ? null : x) === JSON.stringify(y === undefined ? null : y)) return;
        let tx = Sc.text(f, x), ty = Sc.text(f, y);
        if (f.type === 'rows' && tx === ty) { tx = tx + ' (trước khi sửa)'; ty = ty + ' (đã sửa nội dung)'; }
        out.push({ k: f.k, label: f.label, cu: U.trunc(tx, 200), moi: U.trunc(ty, 200) });
      });
      return out;
    },
    /* Kiểm tra 1 bản ghi. Trả {errors:[], warnings:[]} */
    check(c, r) {
      const sc = C[c], errors = [], warnings = [];
      sc.fields.forEach(f => {
        const v = r[f.k];
        const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
        if (f.required && empty) errors.push('Chưa nhập "' + f.label + '".');
        if (empty) return;
        if (f.type === 'date' && !U.isISO(v)) errors.push('"' + f.label + '" không phải ngày hợp lệ.');
        if ((f.type === 'money' || f.type === 'number') && (typeof v !== 'number' || isNaN(v))) errors.push('"' + f.label + '" phải là số.');
        if (f.type === 'money' && !f.signed && v < 0) errors.push('"' + f.label + '" không được âm.');
        if (f.type === 'percent' && (typeof v !== 'number' || v < 0 || v > 100)) errors.push('"' + f.label + '" phải từ 0 đến 100.');
        if (f.type === 'year' && !(v >= 1990 && v <= 2100)) errors.push('"' + f.label + '" không hợp lệ.');
        if (f.type === 'rows') v.forEach((row, i) => f.cols.forEach(cf => {
          const cv = row[cf.k], ce = cv === undefined || cv === null || cv === '';
          if (cf.required && ce) errors.push(f.label + ' — dòng ' + (i + 1) + ': chưa nhập "' + cf.label + '".');
          if (!ce && cf.type === 'date' && !U.isISO(cv)) errors.push(f.label + ' — dòng ' + (i + 1) + ': "' + cf.label + '" không phải ngày hợp lệ.');
          if (!ce && cf.type === 'money' && (typeof cv !== 'number' || isNaN(cv) || cv < 0)) errors.push(f.label + ' — dòng ' + (i + 1) + ': "' + cf.label + '" phải là số không âm.');
        }));
      });
      if (sc.validate && !errors.length) (sc.warnOnly ? warnings : errors).push(...sc.validate(r));
      if (sc.warn && !errors.length) warnings.push(...sc.warn(r));
      if (sc.unique && !errors.length) {
        const key = sc.unique(r);
        if (key && key.replace(/\|/g, '')) {
          const dup = A.Store.all(c).find(x => x.id !== r.id && sc.unique(x) === key);
          if (dup) warnings.push('Đã có bản ghi trùng ' + sc.uniqueLabel + ': "' + U.trunc(sc.title(dup), 90) + '".');
        }
      }
      return { errors, warnings };
    },
    nextMa(c) {
      const pre = C[c].autoMa, y = A.year() || +U.today().slice(0, 4), p = pre + '-' + y + '-';
      let max = 0;
      A.Store.all(c).forEach(r => { if (r.ma && r.ma.startsWith(p)) { const n = parseInt(r.ma.slice(p.length), 10); if (n > max) max = n; } });
      return p + String(max + 1).padStart(3, '0');
    }
  };
  A.year = () => A.Store.cfg.nam || null;      // null = tất cả các năm
})(App);
