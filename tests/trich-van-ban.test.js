// node --test tests/trich-van-ban.test.js — văn bản mẫu dưới đây do kiểm thử tự soạn, KHÔNG phải số liệu thật
const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../src/shared/trich-van-ban.js');

const QD_KHLCNT = `UBND TỈNH SƠN LA
SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG
Số: 812/QĐ-SNNMT
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Sơn La, ngày 05 tháng 11 năm 2026
QUYẾT ĐỊNH
Phê duyệt kế hoạch lựa chọn nhà thầu nhiệm vụ Đo đạc lập bản đồ địa chính xã Thử Nghiệm
Căn cứ Luật Đấu thầu;
GIÁM ĐỐC SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG
QUYẾT ĐỊNH:
Điều 1. Phê duyệt kế hoạch lựa chọn nhà thầu như sau:
- Tên gói thầu: Gói thầu số 01: Đo đạc, lập bản đồ địa chính
- Giá gói thầu: 12.345.678.000 đồng
- Nguồn vốn: Ngân sách tỉnh
- Hình thức lựa chọn nhà thầu: Đấu thầu rộng rãi trong nước
- Phương thức lựa chọn nhà thầu: Một giai đoạn một túi hồ sơ
- Loại hợp đồng: Trọn gói
- Thời gian thực hiện hợp đồng: 360 ngày`;

const HD = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
HỢP ĐỒNG
Số: 15/2026/HĐ-TV
Về việc tư vấn lập hồ sơ mời thầu
Hôm nay, ngày 10 tháng 11 năm 2026, tại Sở Nông nghiệp và Môi trường, chúng tôi gồm:
Bên A: Sở Nông nghiệp và Môi trường tỉnh Sơn La
Bên B: Công ty TNHH Tư Vấn Thử Nghiệm
Giá hợp đồng: 1,5 tỷ đồng
Tạm ứng: 300.000.000 đồng
Thời gian thực hiện hợp đồng: 60 ngày kể từ ngày ký`;

test('số tiền, ngày', () => {
  assert.equal(T.soTien('12.345.678.000 đồng'), 12345678000);
  assert.equal(T.soTien('1,5 tỷ đồng'), 1500000000);
  assert.equal(T.soTien('350 triệu đồng'), 350000000);
  assert.equal(T.soTien('1,234,567'), 1234567);
  assert.equal(T.soTien('abc'), null);
  assert.equal(T.ngayISO('ngày 05 tháng 11 năm 2026'), '2026-11-05');
  assert.equal(T.ngayISO('31/02/2026'), '');
  assert.equal(T.ngayISO('5/1/2027'), '2027-01-05');
});
test('nhận dạng loại văn bản', () => {
  assert.equal(T.phanLoai(QD_KHLCNT), 'khlcnt_qd');
  assert.equal(T.phanLoai(HD), 'hop_dong');
  assert.equal(T.phanLoai('QUYẾT ĐỊNH\nPhê duyệt kết quả lựa chọn nhà thầu gói thầu số 01'), 'kqlcnt_qd');
  assert.equal(T.phanLoai('BIÊN BẢN NGHIỆM THU khối lượng hoàn thành'), 'nghiem_thu');
  assert.equal(T.phanLoai('BIÊN BẢN THANH LÝ HỢP ĐỒNG số 15'), 'thanh_ly_hd');
  assert.equal(T.phanLoai('QUYẾT ĐỊNH\nVề việc bổ sung dự toán chi ngân sách nhà nước năm 2026'), 'du_toan_qd');
  assert.equal(T.phanLoai('Công văn đôn đốc báo cáo'), 'khac');
});
test('bóc tách quy tắc: QĐ phê duyệt KHLCNT', () => {
  const r = T.trichQuyTac(QD_KHLCNT);
  assert.equal(r.so_van_ban, '812/QĐ-SNNMT');
  assert.equal(r.ngay_van_ban, '2026-11-05');
  assert.match(r.trich_yeu, /^Phê duyệt kế hoạch lựa chọn nhà thầu nhiệm vụ Đo đạc/);
  assert.equal(r.goi_thau.length, 1);
  assert.equal(r.goi_thau[0].gia_goi_thau, 12345678000);
  assert.equal(r.goi_thau[0].hinh_thuc_lcnt, 'Đấu thầu rộng rãi trong nước');
  assert.equal(r.goi_thau[0].loai_hop_dong, 'Trọn gói');
});
test('bóc tách quy tắc: hợp đồng', () => {
  const r = T.trichQuyTac(HD);
  assert.equal(r.hop_dong.so_hop_dong, '15/2026/HĐ-TV');
  assert.equal(r.hop_dong.ngay_ky, '2026-11-10');
  assert.equal(r.hop_dong.nha_thau, 'Công ty TNHH Tư Vấn Thử Nghiệm');
  assert.equal(r.hop_dong.gia_tri, 1500000000);
  assert.equal(r.hop_dong.tam_ung, 300000000);
});
test('đọc JSON AI có rào ``` và dấu phẩy thừa; ghép bổ sung từ quy tắc', () => {
  const ai = T.docJson('Đây là kết quả:\n```json\n{"loai":"hop_dong","so_van_ban":null,"hop_dong":{"so_hop_dong":"15/2026/HĐ-TV","gia_tri":"1.500.000.000 đồng","nha_thau":null,},}\n```');
  const g = T.ghep(ai, T.trichQuyTac(HD));
  assert.equal(g.hop_dong.gia_tri, 1500000000);
  assert.equal(g.hop_dong.nha_thau, 'Công ty TNHH Tư Vấn Thử Nghiệm');
  assert.ok(g.bo_sung_quy_tac.includes('hop_dong.nha_thau'));
  assert.equal(g.nguon_trich, 'ai');
});
test('chuẩn hóa: loại lạ → khác, ngày sai → null, chuỗi "null" → null', () => {
  const r = T.chuanHoa({ loai: 'xyz', ngay_van_ban: '31/02/2026', trich_yeu: 'null', goi_thau: [{ ten: 'A', gia_goi_thau: '2 tỷ' }, { ten: null }] });
  assert.equal(r.loai, 'khac'); assert.equal(r.ngay_van_ban, null); assert.equal(r.trich_yeu, null);
  assert.equal(r.goi_thau.length, 1); assert.equal(r.goi_thau[0].gia_goi_thau, 2000000000);
});
test('giống tên', () => {
  assert.ok(T.giongTen('Gói thầu số 01: Đo đạc, lập bản đồ địa chính', 'Đo đạc lập bản đồ địa chính') > 0.6);
  assert.ok(T.giongTen('Tư vấn giám sát', 'Mua sắm thiết bị') < 0.2);
});
test('trích yếu dừng ở "Điều 1." và gạch đầu dòng', () => {
  const r = T.trichQuyTac('QUYẾT ĐỊNH\nPhê duyệt kế hoạch lựa chọn nhà thầu nhiệm vụ A\nĐiều 1. Phê duyệt như sau:\n- Tên gói thầu: X\n- Giá gói thầu: 1.000.000 đồng');
  assert.equal(r.trich_yeu, 'Phê duyệt kế hoạch lựa chọn nhà thầu nhiệm vụ A');
});
// Mẫu tự soạn mô phỏng văn bản ký số: số và ngày để trống ở đầu văn bản, ngày nằm trong trích yếu không phải ngày ban hành
const KY_SO = `UBND TỈNH SƠN LA
SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG
Số: /QĐ-SNNMT
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Sơn La, ngày tháng năm 2026
QUYẾT ĐỊNH
Về việc phê duyệt danh sách nhà thầu đáp ứng yêu cầu về kỹ thuật của gói thầu Tư vấn xây dựng hệ số điều chỉnh giá đất thử nghiệm để áp dụng từ ngày 01 tháng 01 năm 2027
Căn cứ Luật Đấu thầu;`;
test('văn bản ký số: không nhận số "/QĐ", không lấy ngày trong trích yếu; nhận loại "bước LCNT" và tên gói thầu', () => {
  const r = T.trichQuyTac(KY_SO);
  assert.equal(r.loai, 'lcnt_buoc'); assert.equal(r.so_van_ban, null); assert.equal(r.ngay_van_ban, null); assert.equal(r.ngay_dau, 'trong');
  assert.equal(r.lcnt_buoc.buoc, 'Phê duyệt danh sách nhà thầu đáp ứng yêu cầu kỹ thuật');
  assert.match(r.lcnt_buoc.ten_goi_thau, /^Tư vấn xây dựng hệ số điều chỉnh giá đất thử nghiệm/);
  const g = T.ghep({ loai: 'kqlcnt_qd', so_van_ban: '/QĐ-SNNMT', ngay_van_ban: '01/01/2027' }, r);
  assert.equal(g.loai, 'lcnt_buoc'); assert.equal(g.so_van_ban, null); assert.equal(g.ngay_van_ban, null); assert.ok(g.so_trong && g.ngay_trong);
  const k = T.trichQuyTac(KY_SO + '\nNgười ký: Sở Nông nghiệp\nThời gian ký: 05.11.2026 10:15');
  assert.equal(k.ngay_van_ban, '2026-11-05', 'lấy ngày ký trong chữ ký số');
  assert.equal(T.trichQuyTac('UBND\nSố: 12/QĐ-X\nSơn La, ngày 03 tháng 11 năm 2026\nQUYẾT ĐỊNH\nPhê duyệt từ ngày 01 tháng 01 năm 2027').ngay_van_ban, '2026-11-03');
});
test('AiTI: bỏ khối JSON chỉ có suy luận, gộp system, token cho mô hình suy luận', () => {
  const A = require('../src/shared/ai-tien-ich.js');
  assert.equal(A.layNoiDung('{"id":"chatcmpl-1","choices":[{"index":0,"message":{"role":"assistant","content":null,"reasoning":"1. Analyze"}}]}'), '');
  assert.equal(A.layNoiDung('{"choices":[{"message":{"content":"Có 3 gói thầu [1]."}}]}'), 'Có 3 gói thầu [1].');
  assert.equal(A.layNoiDung('<think>abc</think>\nTrả lời'), 'Trả lời');
  assert.equal(A.layNoiDung('Trả lời thường'), 'Trả lời thường');
  const g = A.gopHeThong([{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }]);
  assert.equal(g.length, 1); assert.match(g[0].content, /^CHỈ DẪN[\s\S]*S[\s\S]*U$/);
  assert.equal(A.soToken('@cf/zai-org/glm-4.7-flash', 1200), 3500); assert.equal(A.soToken('', 1200), 1200);
});
