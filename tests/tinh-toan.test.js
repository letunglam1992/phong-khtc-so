// Kiểm thử các phép tính tiền, tỷ lệ của phần mềm (không cần trình duyệt, không cần Excel): node --test tests/tinh-toan.test.js
// Số kỳ vọng tính tay, ghi rõ ở từng trường hợp.
const test = require('node:test'), assert = require('node:assert/strict');
const A = require('./harness-full')();
const S = A.Store, L = A.L, ty = 1e6;
const gan = (a, b, sai) => assert.ok(Math.abs(a - b) <= (sai || 1e-6), a + ' ≠ ' + b);
const lam = () => { S.reset(); A._today = '2026-11-14'; };
const ns = (id, o) => S.put('ngansach', Object.assign({ id, nam: 2026, donViId: 'dv1' }, o));

test('nsTong: chuyển nguồn + dự toán + bổ sung + tăng − giảm − thu hồi − tiết kiệm', () => {
  gan(L.nsTong({ chuyenNguon: 100, duToan: 600, boSung: 50, dcTang: 20, dcGiam: 10, thuHoi: 5, tietKiem: 15 }), 740);
  gan(L.nsTong({ duToan: '1.000' }), 1000);
});

test('nsTree: dòng cha bằng tổng dòng con; phát hiện số tổng trên biểu lệch', () => {
  lam(); S.put('donvi', { id: 'dv1', ten: 'VP Sở' });
  ns('P', { stt: 'I', noiDung: 'Nhóm', goc: { tong: 1100 * ty, duToan: 900 * ty, boSung: 0 } });
  ns('a', { parentId: 'P', stt: '1', noiDung: 'A', chuyenNguon: 100 * ty, duToan: 600 * ty, tietKiem: 50 * ty, giaiNgan: 130 * ty });
  ns('b', { parentId: 'P', stt: '2', noiDung: 'B', duToan: 350 * ty });
  const t = L.nsTree(2026, null), p = t.flat.find(n => n.r.id === 'P');
  gan(p.sum.tong, 1000 * ty); gan(p.sum.giaiNgan, 130 * ty); gan(t.total.tyLe, 13);
  assert.deepEqual(p.lech.map(l => l.f).sort(), ['duToan', 'tong']);   // biểu: dự toán 900 ≠ 600 + 350; tổng 1.100 ≠ 1.000; ô bổ sung = 0 trên dòng tổng không coi là lệch
});

test('giaiNgan: tỷ lệ, tỷ lệ thời gian, dự báo theo tốc độ từ đầu năm', () => {
  lam(); S.put('donvi', { id: 'dv1', ten: 'VP Sở' });
  ns('a', { noiDung: 'A', chuyenNguon: 100 * ty, duToan: 600 * ty, tietKiem: 50 * ty, giaiNgan: 130 * ty, gnHist: [{ ngay: '2026-06-30', giaiNgan: 130 * ty }] });
  ns('b', { noiDung: 'B', duToan: 350 * ty, giaiNgan: 0 });
  const g = L.giaiNgan(2026, {});
  gan(g.tong, 1000 * ty); gan(g.gn, 130 * ty); gan(g.tyLe, 13);
  assert.equal(g.asOf, '2026-06-30');
  gan(g.tyLeTG, 181 / 365 * 100, 1e-9);               // 01/01 → 30/06 = 181 ngày
  gan(g.duBao, 130 * ty / 181 * 365, 1);               // một kỳ số liệu: dự báo theo tốc độ bình quân từ đầu năm
  gan(g.conLai, 870 * ty);
  // Nội dung chậm: ngưỡng mặc định 20 điểm so với tỷ lệ thời gian 49,6%
  const d = L.gnDong(2026, {});
  assert.deepEqual(d.filter(x => x.cham).map(x => x.r.id).sort(), ['a', 'b']);   // A: 20% (lệch −29,6), B: 0%
  // Đã có QĐ thu hồi (kể cả gõ thiếu "thu hồ") → không chậm; mới "đề nghị thu hồi" → vẫn chậm
  S.get('ngansach', 'b').tienDo = 'Đã có QĐ thu hồ tại số 580/QĐ-SNNMT ngày 27/8/2026';
  assert.deepEqual(L.gnDong(2026, {}).filter(x => x.cham).map(x => x.r.id), ['a']);
  S.get('ngansach', 'b').tienDo = 'Đề nghị thu hồi số tiền 85.000.000đ'; S.get('ngansach', 'b').ghiChu = 'Quyết định số 12/QĐ-SNNMT thu hồi kinh phí';
  assert.deepEqual(L.gnDong(2026, {}).filter(x => x.cham).map(x => x.r.id), ['a']);
  S.get('ngansach', 'b').ghiChu = '';
  assert.deepEqual(L.gnDong(2026, {}).filter(x => x.cham).map(x => x.r.id).sort(), ['a', 'b']);
  // Ô riêng "Quyết định thu hồi" được ưu tiên; tách số, ngày QĐ từ ghi chú
  S.get('ngansach', 'b').qdThuHoi = '580/QĐ-SNNMT';
  assert.deepEqual(L.gnDong(2026, {}).filter(x => x.cham).map(x => x.r.id), ['a']);
  assert.equal(L.gnDong(2026, {}).find(x => x.r.id === 'b').qdTH, true);
  assert.deepEqual(NhacViec.tachQDThuHoi({ tienDo: 'Đã có QĐ thu hồ tại số 580/QĐ-SNNMT ngày 27/8/2026 - Lý do' }), { so: '580/QĐ-SNNMT', ngay: '2026-08-27' });
  assert.equal(NhacViec.tachQDThuHoi({ tienDo: 'Đề nghị thu hồi số tiền 85.000.000đ' }), null);
  // Đặt mục tiêu tháng 6 = 15% → A (20%) không chậm; B (0%, lệch −15) chưa tới ngưỡng 20 điểm
  S.cfg.gnMucTieu = { 2026: [2, 4, 6, 8, 10, 15, 30, 40, 50, 60, 80, 100] };
  const g2 = L.giaiNgan(2026, {}); assert.equal(g2.mt.tuDat, true); gan(g2.mtNay, 15); gan(g2.lech, -2);
  assert.deepEqual(L.gnDong(2026, {}).filter(x => x.cham).map(x => x.r.id), []);
});

test('hd: giá trị sau phụ lục, thời hạn gia hạn, còn phải thanh toán, tạm ứng chưa thu hồi', () => {
  lam();
  const x = L.hd({ giaTri: 1000 * ty, ngayKT: '2026-11-30', phuLuc: [{ so: 'PL1', giaTriDC: 100 * ty, giaHanDen: '2026-12-31' }, { so: 'PL2', giaTriDC: -20 * ty }], thanhToan: [{ ngay: '2026-08-01', soTien: 300 * ty }], nghiemThu: [{ ngay: '2026-07-01', giaTri: 500 * ty }], tamUng: 200 * ty, tamUngThuHoi: 50 * ty });
  gan(x.giaTriHL, 1080 * ty); assert.equal(x.han, '2026-12-31'); gan(x.conLai, 780 * ty); gan(x.tamUngCon, 150 * ty); gan(x.ntChuaTT, 200 * ty);
  const q = L.hd({ giaTri: 100, ngayKT: '2026-11-01' }); assert.equal(q.over, true); assert.match(q.note, /13 ngày/);
});

test('bangChu: đọc số tiền bằng chữ', () => {
  const c = [[0, 'Không đồng'], [5, 'Năm đồng'], [15, 'Mười lăm đồng'], [21, 'Hai mươi mốt đồng'], [24, 'Hai mươi tư đồng'], [105, 'Một trăm linh năm đồng'], [110, 'Một trăm mười đồng'],
    [1000005, 'Một triệu không trăm linh năm đồng'], [1250000, 'Một triệu hai trăm năm mươi nghìn đồng'], [2130000000, 'Hai tỷ một trăm ba mươi triệu đồng'],
    [17498748000, 'Mười bảy tỷ bốn trăm chín mươi tám triệu bảy trăm bốn mươi tám nghìn đồng'], [1545000000, 'Một tỷ năm trăm bốn mươi lăm triệu đồng']];
  c.forEach(([v, s]) => assert.equal(A.bangChu(v), s));
});

test('kịch bản giải ngân: thu hồi phần chưa giải ngân, hợp đồng thanh toán không vượt phần còn lại', () => {
  lam(); S.put('donvi', { id: 'dv1', ten: 'VP Sở' });
  ns('nsA', { noiDung: 'A', duToan: 2000 * ty, giaiNgan: 0 });
  ns('nsB', { noiDung: 'B', duToan: 5000 * ty, giaiNgan: 2500 * ty });
  ns('nsC', { noiDung: 'C', duToan: 3000 * ty, giaiNgan: 600 * ty });
  S.put('hopdong', { id: 'h1', so: 'HĐ1', nsId: 'nsB', giaTri: 2000 * ty });
  // Thu hồi A (2.000), HĐ trên B thanh toán 1.500 → (3.100 + 1.500) / (10.000 − 2.000) = 57,5%
  const r = L.kbTinh(2026, { thu: ['nsA'], them: [{ k: 'hd', id: 'h1', tien: 1500 * ty }] }, {});
  gan(r.tong, 8000 * ty); gan(r.gn, 4600 * ty); gan(r.tyLe, 57.5); gan(r.thu, 2000 * ty); gan(r.them, 1500 * ty);
  // Giải ngân thêm vượt phần còn lại của dòng (B còn 2.500) bị chặn; thu hồi cùng dòng chỉ thu phần còn lại sau giải ngân thêm
  const r2 = L.kbTinh(2026, { thu: ['nsB'], them: [{ k: 'ns', id: 'nsB', tien: 9000 * ty }] }, {});
  gan(r2.them, 2500 * ty); gan(r2.thu, 0); gan(r2.gn, 5600 * ty); gan(r2.tong, 10000 * ty);
});

test('so sánh kỳ: lũy kế tại từng kỳ số liệu', () => {
  lam(); S.put('donvi', { id: 'dv1', ten: 'VP Sở' });
  const H = a => a.map(([ngay, g]) => ({ ngay, giaiNgan: g * ty }));
  ns('a', { noiDung: 'A', duToan: 5000 * ty, giaiNgan: 2500 * ty, gnHist: H([['2026-08-31', 1000], ['2026-09-30', 1800], ['2026-10-31', 2500]]) });
  ns('b', { noiDung: 'B', duToan: 3000 * ty, giaiNgan: 600 * ty, gnHist: H([['2026-09-30', 600]]) });
  const K = L.gnKy(2026, {});
  assert.deepEqual(K.ky, ['2026-08-31', '2026-09-30', '2026-10-31']);
  gan(K.gnTai('2026-08-31'), 1000 * ty); gan(K.gnTai('2026-09-30'), 2400 * ty); gan(K.gnTai('2026-10-31'), 3100 * ty); gan(K.gnTai('2026-09-15'), 1000 * ty);
});

test('đối chiếu: giải ngân so với thanh toán, tạm ứng hợp đồng gắn nguồn đến ngày số liệu', () => {
  lam(); S.put('donvi', { id: 'dv1', ten: 'VP Sở' });
  ns('k', { noiDung: 'Khớp', duToan: 1000 * ty, giaiNgan: 300 * ty, ngayGN: '2026-10-31' });
  ns('t', { noiDung: 'Thiếu', duToan: 2000 * ty, giaiNgan: 100 * ty, ngayGN: '2026-10-31' });
  ns('d', { noiDung: 'Dư', duToan: 1000 * ty, giaiNgan: 500 * ty, ngayGN: '2026-10-31' });
  ns('n', { noiDung: 'Không HĐ', duToan: 1000 * ty, giaiNgan: 200 * ty, ngayGN: '2026-10-31' });
  S.put('hopdong', { id: 'h1', nsId: 'k', tamUng: 100 * ty, thanhToan: [{ ngay: '2026-09-01', soTien: 200 * ty }] });
  S.put('hopdong', { id: 'h2', nsId: 't', thanhToan: [{ ngay: '2026-09-01', soTien: 400 * ty }, { ngay: '2026-11-05', soTien: 50 * ty }, { ngay: '2025-12-01', soTien: 999 * ty }] });
  S.put('hopdong', { id: 'h3', nsId: 'd', thanhToan: [{ ngay: '2026-08-01', soTien: 380 * ty }] });
  S.put('hopdong', { id: 'h4', thanhToan: [{ ngay: '2026-08-01', soTien: 50 * ty }] });
  const m = o => Object.fromEntries(L.doiChieu(2026, o).rows.map(x => [x.r.id, [x.st, Math.round(x.chenh / ty)]]));
  assert.deepEqual(m({ tamUng: true }), { k: ['khop', 0], t: ['thieu', -300], d: ['du', 120], n: ['khonghd', 200] });   // t: 50 trả sau ngày số liệu, 999 năm trước không tính
  assert.deepEqual(m({ tamUng: false }).k, ['du', 100]);
  assert.equal(L.doiChieu(2026, {}).hdKhongNguon.length, 1);
  // Giải trình chỉ còn hiệu lực khi số chênh không đổi
  S.get('ngansach', 'd').dcGiaiTrinh = { noiDung: 'Chi ngoài HĐ', chenh: 120 * ty };
  assert.ok(L.doiChieu(2026, {}).rows.find(x => x.r.id === 'd').giaiTrinh);
  S.get('ngansach', 'd').giaiNgan = 520 * ty;
  const d = L.doiChieu(2026, {}).rows.find(x => x.r.id === 'd'); assert.equal(d.giaiTrinh, null); assert.ok(d.giaiTrinhCu);
});

test('quy trình LCNT: bước bị bỏ qua, hạn bước tiếp theo chỉ tính khi đã đối chiếu', () => {
  lam();
  S.cfg.qtLCNT = { 'Chỉ định thầu': { buoc: [{ ten: 'Trình thẩm định kế hoạch lựa chọn nhà thầu' }, { ten: 'Phê duyệt kế hoạch lựa chọn nhà thầu' }, { ten: 'Phê duyệt hồ sơ yêu cầu', han: 10, xn: true, canCu: 'x' }, { ten: 'Phê duyệt kết quả', han: 15 }] } };
  const g = { hinhThuc: 'Chỉ định thầu', trangThai: 'khlcnt', tienTrinh: [{ buoc: 'Phê duyệt kế hoạch lựa chọn nhà thầu', ngay: '2026-10-01' }] };
  const q = L.gtQT(g);
  assert.deepEqual(q.thieu.map(b => b.ten), ['Trình thẩm định kế hoạch lựa chọn nhà thầu']);
  assert.equal(q.tiep.ten, 'Phê duyệt hồ sơ yêu cầu'); assert.equal(q.han, '2026-10-11'); assert.equal(q.qua, true);
  g.tienTrinh.push({ buoc: 'Phê duyệt hồ sơ yêu cầu', ngay: '2026-10-05' });
  const q2 = L.gtQT(g); assert.equal(q2.tiep.ten, 'Phê duyệt kết quả'); assert.equal(q2.han, ''); assert.equal(q2.chuaXN, true);   // 15 ngày chưa đối chiếu → không tính hạn
  assert.equal(L.gtQT({ hinhThuc: 'Đấu thầu rộng rãi' }), null);
});

test('nhắc việc: giải ngân chậm theo mục tiêu tháng đã đặt', () => {
  const t = NhacViec.tomTat({ hopdong: [], canbo: [], donvi: [], ngansach: [{ id: 'a', nam: 2026, noiDung: 'A', duToan: 100, giaiNgan: 30, ngayGN: '2026-10-31' }, { id: 'b', nam: 2026, noiDung: 'B', duToan: 100, giaiNgan: 10, ngayGN: '2026-10-31' }] },
    { today: '2026-11-14', gnLech: 20, mucTieu: { 2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 0, 0] } });
  assert.equal(t.tuDat, true); gan(t.chuan, 40); assert.deepEqual(t.gn.map(x => x.ten), ['B']);   // A: 30% (−10), B: 10% (−30)
});

test('đọc biểu: lấy cột lũy kế, ngày "đến ngày", STT có dấu chấm cuối', () => {
  const H = ['TT', 'Nội dung', 'KP chuyển nguồn', 'Dự toán giao đầu năm 2026', 'KP Bổ sung trong năm', 'Tổng KP được sử dụng', 'Kinh phí đã giải ngân (từ ngày 16/10/2026 đến ngày 15/11/2026)', 'Lũy kế giải ngân', 'Kinh phí còn lại'];
  const rows = [['BÁO CÁO GIẢI NGÂN'], H,
    ['I', 'Đơn vị A', 0, 300, 0, 300, 15, 150, 150],
    [1, 'Mục 1', 0, 100, 0, 100, 5, 60, 40],
    ['1.1.', 'Việc 1.1', 0, 100, 0, 100, 5, 60, 40],
    ['1.2.', 'Việc 1.2', 0, 0, 0, 0, 0, 0, 0],
    [2, 'Mục 2', 0, 200, 0, 200, 10, 90, 110]];
  const p = L.parseBudget(rows, rows);
  assert.equal(p.cols.giaiNgan, 7); assert.equal(p.ngaySoLieu, '2026-11-15');
  const it = p.items; assert.equal(it[2].level, 2); assert.equal(it[3].level, 2); assert.equal(it[4].level, 1);   // 1.2. là anh em của 1.1., không phải con
  gan(it[2].giaiNgan, 60); assert.equal(p.warnings.length, 0);
});

test('sổ nhận biểu: mỗi ngày nhập biểu là một kỳ, lũy kế cộng dòng chi tiết, tăng so với kỳ trước', () => {
  lam();
  S.put('ngansach', { id: 'g', nam: 2026, donViId: 'dv1', noiDung: 'Nhóm' });
  ns('a', { parentId: 'g', duToan: 100 * ty, gnHist: [{ ngay: '2026-10-15', giaiNgan: 20 * ty, nguon: 'excel', tep: 'pl10.xls' }, { ngay: '2026-11-15', giaiNgan: 50 * ty, nguon: 'excel', tep: 'pl11.xls', vb: 'CV 12' }] });
  ns('b', { parentId: 'g', duToan: 100 * ty, gnHist: [{ ngay: '2026-10-15', giaiNgan: 10 * ty, nguon: 'excel' }, { ngay: '2026-11-02', giaiNgan: 15 * ty, nguon: 'tay' }] });
  const k = L.nsKyBieu(2026);
  assert.deepEqual(k.map(x => x.ngay), ['2026-11-15', '2026-10-15']);   // mốc nhập tay không là một kỳ
  gan(k[1].gn, 30 * ty); gan(k[0].gn, 65 * ty); gan(k[0].tang, 35 * ty); assert.equal(k[1].tang, null);   // 50 + 15 (b lấy mốc gần nhất ≤ 15/11)
  gan(k[0].ty, 32.5); assert.equal(k[0].vb, 'CV 12'); assert.equal(k[1].tep, 'pl10.xls');
  assert.equal(L.nsKyBieu(2026, 'dv2').length, 0);
});

test('mã ngân sách: tách Chương-Loại-Khoản, lấy theo dòng cha, xác định nguồn', () => {
  lam();
  assert.deepEqual(L.nsMaTach('Kinh phí được giao tự chủ Chương 412, Loại 340, khoản 341'), { chuong: '412', loai: '340', khoan: '341' });
  assert.deepEqual(L.nsMaTach('C412; K341'), { chuong: '412', loai: '', khoan: '341' });
  assert.equal(L.nsMaTach('(Chương 412, Loại 100 - Khoản 123)').khoan, '123');
  ns('g', { noiDung: 'Kinh phí không tự chủ Chương 412, Loại 280, khoản 282' });
  ns('a', { parentId: 'g', noiDung: 'Điều tra rừng', duToan: 100 * ty, giaiNgan: 40 * ty });
  ns('c', { noiDung: 'Tiết kiệm 10% thực hiện CCTL', duToan: 50 * ty });
  ns('t', { noiDung: 'Kinh phí khen thưởng theo NĐ 73', duToan: 50 * ty });
  const m = L.nsMa(S.get('ngansach', 'a'));
  assert.equal(m.khoan, '282'); assert.equal(m.nguon, 'khongtuchu'); assert.equal(m.src.khoan, 'cha');
  assert.equal(L.nsMa(S.get('ngansach', 'c')).nguon, 'cctl'); assert.equal(L.nsMa(S.get('ngansach', 't')).nguon, 'thuong');
  S.get('ngansach', 'a').maNguon = 'nstw'; assert.equal(L.nsMa(S.get('ngansach', 'a')).nguon, 'nstw');   // trường đã nhập được ưu tiên
  // tỷ lệ nhiệm vụ chuyên môn: bỏ CCTL, tiền thưởng khỏi mẫu số
  const leaves = ['a', 'c', 't'].map(id => { const r = S.get('ngansach', id); return { r, sum: { tong: L.nsTong(r), giaiNgan: U_num(r.giaiNgan) } }; });
  const cm = L.nsTyLeCM(leaves); gan(cm.ty, 40); assert.equal(cm.boQua, 2);   // chung: 40/200 = 20%
});
function U_num(v) { return +v || 0; }

test('đơn vị dự toán và phòng: phòng không hiện trừ khi đang có dòng dự toán', () => {
  lam();
  S.put('donvi', { id: 'vp', ten: 'Văn phòng Sở' }); S.put('donvi', { id: 'kh', ten: 'Phòng Kế hoạch - Tài chính' }); S.put('donvi', { id: 'ql', ten: 'QLMT', loai: 'phong' }); S.put('donvi', { id: 'x', ten: 'Phòng X', loai: 'dutoan' });
  assert.equal(L.laPhong(S.get('donvi', 'vp')), false); assert.equal(L.laPhong(S.get('donvi', 'kh')), true); assert.equal(L.laPhong(S.get('donvi', 'ql')), true); assert.equal(L.laPhong(S.get('donvi', 'x')), false);
  assert.deepEqual(L.dvDuToan().map(d => d.id).sort(), ['vp', 'x']);
  S.put('ngansach', { id: 'n', nam: 2026, donViId: 'kh', noiDung: 'Nhập nhầm', boSung: 1 });
  assert.deepEqual(L.dvDuToan().map(d => d.id).sort(), ['kh', 'vp', 'x']);
});

test('sổ quyết định: khớp, chưa có căn cứ, giảm trùng làm dòng âm', () => {
  lam();
  ns('d', { noiDung: 'Đề án trung tâm chế biến', duToan: 1450 * ty, dcGiam: 1995.4865 * ty });   // giảm hai lần 1.450 + 545,4865
  ns('e', { noiDung: 'Phần mềm', duToan: 29 * ty, tietKiem: 2 * ty });
  S.put('qddt', { id: 'q1', nam: 2026, so: '1155/QĐ-SNNMT', loai: 'giao', dong: [{ nsId: 'd', cot: 'duToan', soTien: 1450 * ty }, { nsId: 'e', cot: 'duToan', soTien: 29 * ty }] });
  S.put('qddt', { id: 'q2', nam: 2026, so: '580/QĐ-SNNMT', loai: 'dieuchinh', dong: [{ nsId: 'd', cot: 'dcGiam', soTien: 1450 * ty }, { nsId: 'xoa', cot: 'dcTang', soTien: 5 }] });
  const dc = L.qdDoiChieu(2026);
  const o = (id, c) => dc.dong.find(x => x.r.id === id && x.cot === c);
  assert.equal(o('d', 'duToan').st, 'khop'); assert.equal(o('e', 'tietKiem').st, 'chuaqd');
  assert.equal(o('d', 'dcGiam').st, 'lech'); gan(o('d', 'dcGiam').chenh, 545.4865 * ty);
  assert.equal(dc.am.length, 1); assert.equal(dc.am[0].r.id, 'd');   // 1.450 − 1.995,4865 < 0
  assert.equal(dc.mat.length, 1);
});

test('nhắc việc: gói có kết quả chưa có HĐ, chưa ghi đăng tải kết quả, sắp hạn LCNT, HĐ nghiệm thu chưa thanh lý', () => {
  const t = NhacViec.tomTat({ hopdong: [{ id: 'h', so: 'HD1', trangThai: 'nghiemthu', giaTri: 100, nghiemThu: [{ ngay: '2026-10-01', giaTri: 100 }], thanhToan: [] }],
    goithau: [{ id: 'g1', ten: 'A', trangThai: 'cokq', qdKQSo: '9/QĐ', qdKQNgay: '2026-09-01' }, { id: 'g2', ten: 'B', trangThai: 'danglcnt', hanLCNT: '2026-11-25' }, { id: 'g3', ten: 'C', hinhThuc: 'Đặt hàng', trangThai: 'dakyhd', qdKQSo: '1/QĐ' }],
    ngansach: [], canbo: [], donvi: [] }, { today: '2026-11-19' });
  assert.deepEqual(t.dt.map(x => x.ten + ':' + x.viec.slice(0, 20)), ['A:Đã có kết quả từ 01/', 'HD1:Đã nghiệm thu ngày 0', 'A:Chưa ghi bước "Đăng ', 'B:Sắp đến hạn lựa chọn']);
  assert.match(NhacViec.thu(t, { today: '2026-11-19' }).html, /4\. Gói thầu, hợp đồng cần xử lý tiếp \(4\)/);
});

test('đọc biểu: STT "3.1" bị Excel đổi thành ngày (46025) được trả lại; ghép dòng đánh số lại, viết khác giữa biểu đơn vị và biểu tổng hợp', () => {
  const rows = [['BÁO CÁO'], ['TT', 'Nội dung', 'KP chuyển nguồn', 'Dự toán giao đầu năm', 'KP bổ sung', 'Tăng', 'Giảm', 'Thu hồi', 'Tổng KP được sử dụng', 'Kinh phí đã giải ngân đến 26/11/2026', 'Còn lại'],
    ['I', 'ĐƠN VỊ THỬ', 0, 100, 0, 0, 0, 0, 100, 10, 90], [3, 'Kinh phí không tự chủ', 0, 100, 0, 0, 0, 0, 100, 10, 90], [46025, 'Chương 412, khoản 332', 0, 100, 0, 0, 0, 0, 100, 10, 90],
    ['-', 'Kinh phí tiếp nhận dân di cư tự do năm 2026', 0, 90, 0, 0, 0, 0, 90, 10, 80], ['-', 'Lệ phí cấp giấy', 0, 10, 0, 0, 0, 0, 10, 0, 10]];
  const p = L.parseBudget(rows, null), c = p.items.find(x => /Chương 412/.test(x.noiDung));
  assert.equal(c.stt, '3.1'); assert.ok(c.isGroup);
  const old = [{ id: 'a', stt: '(3)', noiDung: 'Kinh phí tiếp nhận dân di cư tự do', duToan: 90, parentId: 'g' }, { id: 'g', stt: '3', noiDung: 'Kinh phí không tự chủ' }];
  const m = L.nsGhepDong(p.items, old), i = p.items.findIndex(x => /dân di cư/.test(x.noiDung));
  assert.equal(m[i] && m[i].id, 'a');
});
