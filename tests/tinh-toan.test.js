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
