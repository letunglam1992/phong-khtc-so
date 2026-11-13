/* ============================================================
   33-vbplan.js — Từ kết quả đọc văn bản (TrichVB) lập phương án cập nhật dữ liệu
   Mỗi thao tác: {key, title, coll, id ('' = tạo mới), choices, fields:{k:v}, keys:[...], push:[{k,label,row,cols}], add:{k:số cộng thêm}, on}
   Người dùng xem, sửa, bỏ chọn từng thao tác trước khi cập nhật. Không có thông tin thì để trống, không tự suy đoán.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, Sc = A.Schema, T = typeof TrichVB !== 'undefined' ? TrichVB : null;
  const giong = (a, b) => T ? T.giongTen(a || '', b || '') : (U.norm(a) === U.norm(b) ? 1 : 0);
  const best = (list, f, ten, nguong) => { let r = null, s = 0; if (!ten) return null; list.forEach(x => { const v = giong(ten, f(x)); if (v > s) { s = v; r = x; } }); return s >= (nguong || 0.55) ? r : null; };
  const soHD = s => U.norm(s).replace(/\s+/g, '').replace(/^so:?/, '');
  L.vbTimGT = ten => best(S.all('goithau'), g => g.ten, ten, 0.55);
  L.vbTimHD = (so, ten, nhaThau) => {
    if (so) { const k = soHD(so), h = S.all('hopdong').find(x => soHD(x.so) === k) || S.all('hopdong').find(x => x.so && k && (soHD(x.so).includes(k) || k.includes(soHD(x.so)))); if (h) return h; }
    return ten ? best(S.all('hopdong').filter(h => !nhaThau || !h.nhaThau || giong(h.nhaThau, nhaThau) > 0.5), h => h.ten || '', ten, 0.6) : null;
  };
  L.vbTimDA = ten => best(S.all('duan'), d => d.ten, ten, 0.5);
  // "60 ngày", "12 tháng" + ngày bắt đầu → ngày kết thúc (ước tính để người duyệt kiểm tra).
  // Ngày đầu không tính, thời hạn tháng kết thúc vào ngày tương ứng của tháng cuối (Điều 147, 148 Bộ luật Dân sự 2015).
  L.vbCongThoiGian = (tu, chu) => {
    if (!U.isISO(tu) || !chu) return '';
    const n = String(chu).match(/(\d+)\s*ngày/i), t = String(chu).match(/(\d+)\s*tháng/i);
    if (n) return U.addDays(tu, +n[1]);
    if (t) { const y0 = +tu.slice(0, 4), m0 = +tu.slice(5, 7) - 1 + +t[1], y = y0 + Math.floor(m0 / 12), m = m0 % 12 + 1; return y + '-' + U.pad(m) + '-' + U.pad(Math.min(+tu.slice(8, 10), U.lastDayOfMonth(y, m))); }
    return '';
  };
  const pickList = (k, v) => { if (!v) return ''; const l = A.list(k); const m = l.find(x => U.norm(x) === U.norm(v)) || l.find(x => U.norm(v).includes(U.norm(x)) || U.norm(x).includes(U.norm(v))); return m || v; };
  const choicesOf = (coll, label) => [['', 'Tạo mới']].concat(S.all(coll).map(r => [r.id, U.trunc(label ? label(r) : Sc.C[coll].title(r), 90)]));
  const vbTen = r => [r.so_van_ban, r.ngay_van_ban ? U.fmtDate(r.ngay_van_ban) : ''].filter(Boolean).join(' ngày ');

  L.vbPlan = (r, src) => {
    r = r || {}; src = src || {};
    const ops = [], dk = src.dinhKem ? [src.dinhKem] : [], so = r.so_van_ban || '', ngay = r.ngay_van_ban || '';
    const da = L.vbTimDA(r.ten_du_an_nhiem_vu);
    const ghiNguon = 'Cập nhật từ văn bản ' + (vbTen(r) || src.ten || '');
    if (r.loai === 'khlcnt_qd' || r.loai === 'khlcnt_trinh') {
      const qd = r.loai === 'khlcnt_qd';
      (r.goi_thau || []).forEach((g, i) => {
        const cu = L.vbTimGT(g.ten), f = { ten: g.ten || '', giaGoiThau: g.gia_goi_thau || '', nguonVon: g.nguon_von || '', hinhThuc: pickList('hinhThucLCNT', g.hinh_thuc_lcnt), phuongThuc: g.phuong_thuc || '', loaiHD: pickList('loaiHopDong', g.loai_hop_dong), tgBatDauLCNT: g.thoi_gian_bat_dau_lcnt || '', tgThucHienHD: g.thoi_gian_thuc_hien_hd || '', duAnId: (cu && cu.duAnId) || (da ? da.id : '') };
        if (qd) Object.assign(f, { qdKHSo: so, qdKHNgay: ngay, trangThai: cu && L.gtBuoc(cu) > 3 ? cu.trangThai : 'khlcnt' }); else f.trangThai = cu && L.gtBuoc(cu) > 2 ? cu.trangThai : 'trinhkh';
        ops.push({ key: 'gt' + i, title: (cu ? 'Cập nhật' : 'Thêm') + ' gói thầu ' + (i + 1) + '/' + r.goi_thau.length, coll: 'goithau', id: cu ? cu.id : '', choices: choicesOf('goithau'), fields: f, keys: ['ten', 'duAnId', 'giaGoiThau', 'nguonVon', 'hinhThuc', 'phuongThuc', 'loaiHD', 'tgBatDauLCNT', 'tgThucHienHD'].concat(qd ? ['qdKHSo', 'qdKHNgay', 'hanLCNT'] : []).concat(['trangThai', 'canBoId']), push: [{ k: 'tienTrinh', label: 'Ghi bước vào tiến trình', row: { buoc: qd ? 'Phê duyệt kế hoạch lựa chọn nhà thầu' : 'Trình thẩm định kế hoạch lựa chọn nhà thầu', ngay, soVB: so, ghiChu: '' } }], dinhKem: dk, on: true });
      });
      if (!(r.goi_thau || []).length) ops.push({ key: 'gt0', title: 'Thêm gói thầu (văn bản không có bảng gói thầu đọc được — nhập tay)', coll: 'goithau', id: '', choices: choicesOf('goithau'), fields: { ten: r.ten_du_an_nhiem_vu || '', duAnId: da ? da.id : '', qdKHSo: qd ? so : '', qdKHNgay: qd ? ngay : '', trangThai: qd ? 'khlcnt' : 'trinhkh' }, keys: ['ten', 'duAnId', 'giaGoiThau', 'hinhThuc', 'qdKHSo', 'qdKHNgay', 'trangThai'], push: [], dinhKem: dk, on: true });
    }
    if (r.loai === 'lcnt_buoc') {
      const b = r.lcnt_buoc || {}, ten = b.ten_goi_thau || (T ? T.tenGoiTuTrichYeu(r.trich_yeu) : ''), cu = L.vbTimGT(ten);
      ops.push({ key: 'buoc', title: cu ? 'Ghi bước vào tiến trình gói thầu' : '[Chưa tìm thấy gói thầu "' + U.trunc(ten || '', 60) + '" — chọn gói thầu]', coll: 'goithau', id: cu ? cu.id : '', mustExist: true, choices: choicesOf('goithau').slice(1),
        fields: { trangThai: cu && L.gtBuoc(cu) >= 4 ? cu.trangThai : 'danglcnt' }, keys: ['trangThai'], push: [{ k: 'tienTrinh', label: 'Bước lựa chọn nhà thầu', row: { buoc: b.buoc || r.trich_yeu || '', ngay, soVB: so, ghiChu: r.trich_yeu || '' } }], dinhKem: dk, on: !!cu });
    }
    if (r.loai === 'kqlcnt_qd') {
      const k = r.ket_qua || {}, cu = L.vbTimGT(k.ten_goi_thau);
      ops.push({ key: 'kq', title: cu ? 'Cập nhật kết quả lựa chọn nhà thầu' : 'Thêm gói thầu đã có kết quả (chưa tìm thấy gói thầu tương ứng)', coll: 'goithau', id: cu ? cu.id : '', choices: choicesOf('goithau'),
        fields: { ten: (cu && cu.ten) || k.ten_goi_thau || '', nhaThau: k.nha_thau || '', giaTrung: k.gia_trung_thau || '', qdKQSo: so, qdKQNgay: ngay, loaiHD: pickList('loaiHopDong', k.loai_hop_dong) || (cu && cu.loaiHD) || '', tgThucHienHD: k.thoi_gian_thuc_hien_hd || (cu && cu.tgThucHienHD) || '', trangThai: cu && cu.trangThai === 'dakyhd' ? 'dakyhd' : 'cokq', duAnId: (cu && cu.duAnId) || (da ? da.id : '') },
        keys: ['ten', 'duAnId', 'nhaThau', 'giaTrung', 'qdKQSo', 'qdKQNgay', 'loaiHD', 'tgThucHienHD', 'trangThai'], push: [{ k: 'tienTrinh', label: 'Ghi bước vào tiến trình', row: { buoc: 'Phê duyệt kết quả lựa chọn nhà thầu', ngay, soVB: so, ghiChu: '' } }], dinhKem: dk, on: true });
    }
    if (r.loai === 'hop_dong') {
      const h = r.hop_dong || {}, cu = L.vbTimHD(h.so_hop_dong || so, h.ten, h.nha_thau), gt = L.vbTimGT(h.ten_goi_thau || h.ten) || (h.nha_thau ? S.all('goithau').find(g => g.nhaThau && giong(g.nhaThau, h.nha_thau) > 0.7 && !S.all('hopdong').some(x => x.goiThauId === g.id)) : null);
      const bd = h.ngay_bat_dau || h.ngay_ky || '', kt = h.ngay_ket_thuc || L.vbCongThoiGian(bd, h.thoi_gian_thuc_hien);
      ops.push({ key: 'hd', title: cu ? 'Cập nhật hợp đồng đã có' : 'Thêm hợp đồng', coll: 'hopdong', id: cu ? cu.id : '', choices: choicesOf('hopdong'),
        fields: { so: h.so_hop_dong || so || '', ngayKy: h.ngay_ky || ngay || '', ten: h.ten || r.trich_yeu || '', goiThauId: (cu && cu.goiThauId) || (gt ? gt.id : ''), duAnId: (cu && cu.duAnId) || (gt && gt.duAnId) || (da ? da.id : ''), nhaThau: h.nha_thau || '', giaTri: h.gia_tri || '', loaiHD: pickList('loaiHopDong', h.loai_hop_dong), ngayBD: bd, ngayKT: kt, baoLanhTH: h.bao_lanh_thuc_hien || '', baoLanhTHHan: h.bao_lanh_thuc_hien_den || '', ghiChu: [(cu && cu.ghiChu) || '', h.tam_ung ? 'Mức tạm ứng theo hợp đồng: ' + U.fmtMoney(h.tam_ung) + ' đồng.' : '', !h.ngay_ket_thuc && kt ? 'Thời hạn ước tính từ "' + h.thoi_gian_thuc_hien + '" kể từ ' + U.fmtDate(bd) + ' (ngày đầu không tính) — cần đối chiếu điều khoản hiệu lực của hợp đồng.' : ''].filter(Boolean).join(' ') },
        keys: ['so', 'ngayKy', 'ten', 'goiThauId', 'duAnId', 'nhaThau', 'giaTri', 'loaiHD', 'ngayBD', 'ngayKT', 'baoLanhTH', 'baoLanhTHHan', 'canBoId', 'ghiChu'], push: [], dinhKem: dk, on: true, sau: gt && gt.trangThai !== 'dakyhd' ? { coll: 'goithau', id: gt.id, rec: { trangThai: 'dakyhd' }, note: 'Chuyển gói thầu "' + U.trunc(gt.ten, 60) + '" sang "Đã ký hợp đồng"' } : null });
    }
    const hdOp = (key, title, h, push, fields, keys) => ops.push({ key, title: (h ? '' : '[Chưa tìm thấy hợp đồng — chọn hợp đồng] ') + title, coll: 'hopdong', id: h ? h.id : '', mustExist: true, choices: choicesOf('hopdong').slice(1), fields: fields || {}, keys: keys || [], push, dinhKem: dk, on: !!h });
    if (r.loai === 'phu_luc_hd') { const p = r.phu_luc || {}, h = L.vbTimHD(p.so_hop_dong); hdOp('pl', 'Ghi phụ lục hợp đồng', h, [{ k: 'phuLuc', label: 'Phụ lục', row: { so: p.so_phu_luc || so || '', ngay, noiDung: p.noi_dung || r.trich_yeu || '', giaTriDC: p.gia_tri_dieu_chinh || '', giaHanDen: p.gia_han_den || '' } }]); }
    if (r.loai === 'nghiem_thu') { const n = r.nghiem_thu || {}, h = L.vbTimHD(n.so_hop_dong); hdOp('nt', 'Ghi lần nghiệm thu', h, [{ k: 'nghiemThu', label: 'Nghiệm thu', row: { ngay: ngay || U.today(), noiDung: n.noi_dung || r.trich_yeu || '', giaTri: n.gia_tri || '' } }], h && (h.trangThai || 'dang') === 'dang' ? { trangThai: 'dang' } : {}, ['trangThai']); }
    if (r.loai === 'thanh_ly_hd') { const t = r.thanh_ly || {}, h = L.vbTimHD(t.so_hop_dong); hdOp('tl', 'Thanh lý hợp đồng', h, [], { trangThai: 'thanhly', thanhLyNgay: ngay || U.today(), thanhLySo: so, quyetToanHD: t.gia_tri_quyet_toan || '' }, ['trangThai', 'thanhLyNgay', 'thanhLySo', 'quyetToanHD']); }
    if (r.loai === 'du_toan_qd') {
      const dt = r.du_toan || {}, nam = ngay ? +ngay.slice(0, 4) : +U.today().slice(0, 4), lv = L.nsTree(nam, null).flat.filter(n => !n.children.length);
      const loai = U.norm(dt.loai_dieu_chinh || r.trich_yeu || ''), truong = /thu hoi/.test(loai) ? 'thuHoi' : /giam/.test(loai) ? 'dcGiam' : /dieu chinh tang|tang/.test(loai) ? 'dcTang' : /giao du toan|giao dau nam/.test(loai) ? 'duToan' : 'boSung';
      (dt.dong || []).forEach((d, i) => {
        const m = best(lv, n => n.r.noiDung, d.noi_dung, 0.5);
        ops.push({ key: 'dt' + i, title: 'Dự toán: ' + U.trunc(d.noi_dung || '(không rõ nội dung)', 80), coll: 'ngansach', id: m ? m.r.id : '', mustExist: true, choices: lv.map(n => [n.r.id, U.trunc((n.r.stt ? n.r.stt + ' ' : '') + n.r.noiDung, 90) + ' — ' + Sc.refName('donvi', n.r.donViId)]), fields: {}, keys: [], add: { truong, soTien: d.so_tien || '' }, push: [], on: !!m && !!d.so_tien, dinhKem: [] });
      });
    }
    // Luôn đề xuất lưu văn bản vào danh mục văn bản (bỏ chọn nếu không cần)
    const vbCu = so ? S.all('vanban').find(v => U.norm(v.soKyHieu) === U.norm(so) && (!ngay || !v.ngayBanHanh || v.ngayBanHanh === ngay)) : null;
    ops.push({ key: 'vb', title: vbCu ? 'Văn bản đã có trong danh mục — cập nhật tệp' : 'Lưu vào danh mục văn bản', coll: 'vanban', id: vbCu ? vbCu.id : '', choices: choicesOf('vanban'), fields: { soKyHieu: so, ngayBanHanh: ngay, coQuan: r.co_quan_ban_hanh || '', trichYeu: r.trich_yeu || src.ten || '', trangThai: r.loai === 'khac' ? 'chua' : 'khongyc', vaiTro: 'thammuu', duAnIds: da ? [da.id] : [], ghiChu: ghiNguon }, keys: ['soKyHieu', 'ngayBanHanh', 'coQuan', 'trichYeu', 'trangThai', 'chuTriId', 'han'], push: [], dinhKem: dk, on: r.loai === 'khac' || !vbCu });
    return ops;
  };

  // Áp dụng các thao tác đã duyệt. Trả về {items, tomTat}
  L.vbApply = ops => {
    const items = [], tomTat = [];
    ops.filter(o => o.on).forEach(o => {
      const old = o.id ? S.get(o.coll, o.id) : null;
      if (o.mustExist && !old) throw new Error('"' + o.title + '": chưa chọn bản ghi cần cập nhật.');
      const rec = Object.assign({}, old || {});
      Object.keys(o.fields).forEach(k => { const v = o.fields[k]; if (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length)) { if (!old) rec[k] = v === undefined ? '' : v; return; } rec[k] = v; });
      (o.push || []).forEach(p => { if (p.skip) return; rec[p.k] = (rec[p.k] || []).concat([Object.assign({}, p.row)]); });
      if (o.add && o.add.soTien) { rec[o.add.truong] = U.num(rec[o.add.truong]) + U.num(o.add.soTien); }
      if ((o.dinhKem || []).length && Sc.C[o.coll].fields.some(f => f.k === 'dinhKem')) { const cur = rec.dinhKem || []; o.dinhKem.forEach(d => { if (!cur.some(x => (x.url && x.url === d.url) || (x.fileId && x.fileId === d.fileId))) cur.push(d); }); rec.dinhKem = cur; }
      if (Sc.C[o.coll].normalize) Sc.C[o.coll].normalize(rec);
      const chk = Sc.check(o.coll, rec);
      if (chk.errors.length) throw new Error('"' + o.title + '": ' + chk.errors.join(' '));
      items.push({ c: o.coll, rec });
      tomTat.push((old ? 'Cập nhật ' : 'Thêm ') + Sc.C[o.coll].label.toLowerCase() + ': ' + U.trunc(Sc.C[o.coll].title(rec), 80));
      if (o.sau) { items.push({ c: o.sau.coll, rec: Object.assign({}, S.get(o.sau.coll, o.sau.id), o.sau.rec) }); tomTat.push(o.sau.note); }
    });
    return { items, tomTat };
  };
})(App);
