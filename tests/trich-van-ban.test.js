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
test('số tiền: không lấy đơn vị trong phần "Bằng chữ"', () => {
  assert.equal(T.soTien('71.698.000 đồng (Bằng chữ: Bảy mươi mốt triệu, sáu trăm chín mươi tám nghìn đồng chẵn)'), 71698000);
  assert.equal(T.soTien('2 tỷ đồng'), 2000000000); assert.equal(T.soTien('1,5 tỷ'), 1500000000); assert.equal(T.soTien('350 triệu đồng'), 350000000);
});
// Bảng tự soạn mô phỏng phụ lục KHLCNT và bảng nhà thầu trúng thầu (không phải số liệu thật)
test('đọc bảng phụ lục KHLCNT, bảng nhà thầu trúng thầu (văn bản giữ bố cục)', () => {
  const kh = 'QUYẾT ĐỊNH\nVề việc phê duyệt điều chỉnh Kế hoạch lựa chọn nhà thầu dự toán mua sắm thử nghiệm\nCăn cứ Quyết định số 1/QĐ-X phê duyệt dự toán;\n' + T.veBang([
    ['STT', 'Tên gói thầu', 'Giá gói thầu (đồng)', 'Nguồn vốn', 'Hình thức lựa chọn nhà thầu', 'Thời gian bắt đầu tổ chức lựa chọn nhà thầu', 'Loại hợp đồng', 'Thời gian thực hiện gói thầu'],
    ['1', 'Khảo sát, lập đề cương thử nghiệm', '124.000.000', 'Ngân sách tỉnh năm 2026', 'Chỉ định thầu rút gọn', 'Tháng 9/2026', 'Trọn gói', '10 ngày'],
    ['2', 'Điều tra, đánh giá thử nghiệm giai đoạn hai', '2.735.942.609', 'Ngân sách tỉnh năm 2026', 'Đấu thầu rộng rãi', 'Quý IV/2026', 'Đơn giá cố định', '60 ngày']]) + '\nTổng giá gói thầu: 2.859.942.609 đồng\n' + 'dòng   đệm\n'.repeat(20);
  const r = T.trichQuyTac(kh);
  assert.equal(r.loai, 'khlcnt_qd', 'QĐ điều chỉnh KHLCNT có chữ "dự toán" vẫn là KHLCNT');
  assert.equal(r.goi_thau.length, 2);
  assert.equal(r.goi_thau[0].ten, 'Khảo sát, lập đề cương thử nghiệm'); assert.equal(r.goi_thau[0].gia_goi_thau, 124000000);
  assert.equal(r.goi_thau[1].hinh_thuc_lcnt, 'Đấu thầu rộng rãi'); assert.equal(r.goi_thau[1].loai_hop_dong, 'Đơn giá cố định'); assert.equal(r.goi_thau[1].thoi_gian_thuc_hien_hd, '60 ngày'); assert.equal(r.goi_thau[1].thoi_gian_bat_dau_lcnt, 'Quý IV/2026');
  const kq = 'Số: 5/QĐ-X\nSơn La, ngày 22 tháng 9 năm 2026\nQUYẾT ĐỊNH\nVề việc phê duyệt kết quả lựa chọn nhà thầu Gói thầu số 02: Tư vấn thử nghiệm\nCăn cứ Quyết định phê duyệt danh sách nhà thầu đáp ứng yêu cầu kỹ thuật;\nĐiều 1.\n- Số E-TBMT: IB2600000001\n- Tên gói thầu: Gói thầu số 02: Tư vấn thử nghiệm.\n- Giá gói thầu: 1.415.669.017 VND.\n- Loại hợp đồng: Đơn giá cố định\n' + 'dòng   đệm\n'.repeat(22) + 'Phụ lục\nTHÔNG TIN VỀ NHÀ THẦU TRÚNG THẦU\n' + T.veBang([
    ['STT', 'Tên nhà thầu', 'Mã số thuế', 'Giá dự thầu', 'Giá trúng thầu', 'Thời gian thực hiện gói thầu'], ['1', 'Trung tâm Kiểm định thử nghiệm', '0100000000-007', '1.402.555.856 đồng', '1.402.555.856 đồng', '160 ngày']]);
  const k = T.trichQuyTac(kq);
  assert.equal(k.loai, 'kqlcnt_qd', 'phần căn cứ nhắc "danh sách đáp ứng kỹ thuật" không làm sai loại');
  assert.equal(k.ket_qua.nha_thau, 'Trung tâm Kiểm định thử nghiệm'); assert.equal(k.ket_qua.gia_trung_thau, 1402555856); assert.equal(k.ket_qua.ma_so_thue, '0100000000-007');
  assert.equal(k.ket_qua.gia_goi_thau, 1415669017); assert.equal(k.ket_qua.so_tbmt, 'IB2600000001'); assert.equal(k.ket_qua.thoi_gian_thuc_hien_hd, '160 ngày');
  const cd = T.trichQuyTac('Số: 9/QĐ-X\nSơn La, ngày 28 tháng 9 năm 2026\nQUYẾT ĐỊNH\nVề việc phê duyệt kết quả chỉ định thầu gói thầu Thẩm định giá thử\nGIÁM ĐỐC\nĐiều 1.\n1. Tên Gói thầu: Thẩm định giá\n2. Tên nhà thầu được chỉ định: Công ty Thử Nghiệm.\n3. Giá chỉ định thầu (đã bao gồm cả thuế VAT): 53.625.000 đồng (Bằng chữ: Năm mươi ba triệu, sáu trăm hai mươi lăm nghìn đồng).\n4. Loại hợp đồng: Trọn gói.\n5. Thời gian thực hiện hợp đồng: 07 ngày kể từ ngày hợp đồng có hiệu lực.');
  assert.equal(cd.loai, 'kqlcnt_qd'); assert.equal(cd.ket_qua.nha_thau, 'Công ty Thử Nghiệm'); assert.equal(cd.ket_qua.gia_trung_thau, 53625000); assert.equal(cd.ket_qua.thoi_gian_thuc_hien_hd, '07 ngày'); assert.equal(cd.ket_qua.hinh_thuc_lcnt, 'Chỉ định thầu');
});
test('docx: bảng Word dựng thành cột canh thẳng', () => {
  const tc = t => '<w:tc><w:p><w:r><w:t>' + t + '</w:t></w:r></w:p></w:tc>';
  const xml = '<w:body><w:p><w:r><w:t>Đoạn đầu</w:t></w:r></w:p><w:tbl><w:tr>' + tc('STT') + tc('Tên nhà thầu') + '</w:tr><w:tr>' + tc('1') + tc('Công ty A') + '</w:tr></w:tbl><w:p><w:r><w:t>Đoạn cuối</w:t></w:r></w:p></w:body>';
  const t = T.docxText(xml);
  assert.match(t, /^Đoạn đầu\nSTT\s{3,}Tên nhà thầu\n1\s{3,}Công ty A\nĐoạn cuối$/);
});

test('hợp đồng bản quét OCR (sai dấu, số viết tay): loại, số, ngày ký, gói thầu, nhà thầu, giá trị, thời gian', () => {
  const t = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
HỢP ĐÒNG DỊCH VỤ TƯ VÁN
Gói thầu: Tư vấn lập bản đồ thử nghiệm trên địa bàn
xã Thử Nghiệm năm 2027
Số: 09/2026/HĐTV-SNNMT-ABC
Căn cứ Quyết định số 660/QĐ-SNNMT ngày 21/9/2026 về việc Phê duyệt Kế hoạch lựa chọn nhà thầu;
Hôm nay, ngày0 5 tháng L1 năm 2026, chúng tôi gồm:
_ Chủ đầu tư (gọi tắt là Bên A): SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG
- Mã số thuế: 5500000000
Nhà thầu (gọi tắt là Bên B): CÔNG TY TNHH THỬ NGHIỆM ABC ~=
- Mã số thuế: 0312 345678
Điều 3. Giá trị hợp đồng
- Loại hợp đồng: Hợp đồng trọn gói.
- Giá trị thực hiện hợp đồng: 1.270.000.000 đồng (Bằng chữ: Một tỷ hai trăm bảy mươi triệu đồng)
- Tạm ứng: Không.
Điều 4. Thời gian thực hiện hợp đồng
Công việc được tiên hành trong thời gian 49 ngày kê từ ngày ký hợp
đông.`;
  const r = T.chuanHoa(T.trichQuyTac(t)), h = r.hop_dong;
  assert.equal(r.loai, 'hop_dong');
  assert.equal(h.so_hop_dong, '09/2026/HĐTV-SNNMT-ABC');
  assert.equal(h.ngay_ky, '2026-11-05'); assert.equal(h.ngay_bat_dau, '2026-11-05');
  assert.equal(h.ten_goi_thau, 'Tư vấn lập bản đồ thử nghiệm trên địa bàn xã Thử Nghiệm năm 2027');
  assert.equal(h.nha_thau, 'CÔNG TY TNHH THỬ NGHIỆM ABC'); assert.equal(h.ben_a, 'SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG');
  assert.equal(h.gia_tri, 1270000000); assert.equal(h.loai_hop_dong, 'trọn gói'); assert.equal(h.thoi_gian_thuc_hien, '49 ngày');
  assert.equal(h.ma_so_thue, '0312345678'); assert.equal(h.tam_ung, null); assert.equal(h.tam_ung_ghi, 'Không tạm ứng');
});

test('phụ lục hợp đồng: số hợp đồng không có dấu hai chấm, gia hạn đến ngày', () => {
  const t = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
PHỤ LỤC HỢP ĐỒNG SỐ 01
Căn cứ Hợp đồng số 09/2026/HĐTV-SNNMT-ABC ngày 05/11/2026 giữa Bên A và Bên B;
Hai bên thống nhất gia hạn thời gian thực hiện hợp đồng đến ngày 31/3/2027.`;
  const r = T.chuanHoa(T.trichQuyTac(t));
  assert.equal(r.loai, 'phu_luc_hd');
  assert.equal(r.phu_luc.so_hop_dong, '09/2026/HĐTV-SNNMT-ABC'); assert.equal(r.phu_luc.so_phu_luc, '01'); assert.equal(r.phu_luc.gia_han_den, '2027-03-31');
});

test('biên bản thương thảo, hoàn thiện hợp đồng: không nhận nhầm là hợp đồng; giá sau thương thảo, nhà thầu xuống dòng, loại HĐ xuống dòng', () => {
  const t = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Sơn La, ngày26 tháng 10 năm 2026
BIÊN BẢN THƯƠNG THẢO, HOÀN THIỆN HỢP ĐÔNG
Gói thầu số 3: Tư vấn thử nghiệm lập hồ sơ mời thầu
gói thầu thuê phần mềm thử nghiệm
Căn cứ Quyết định số 752/QĐ-SNNMT ngày 15/10/2026 về việc phê duyệt kế hoạch lựa chọn nhà thầu;
Chủ đầu tư (sau đây gọi là Bên A): SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG
Nhà thầu (sau đây gọi là Bên B): CÔNG TY TNHH DỊCH VỤ THỬ
NGHIỆM ABC
Đại diện là: Ông Nguyễn Văn A
Mãsốthuết 0110000000
3.2. Giá trị hợp đồng là: 46.860.000 VNĐ (Bằng chữ: Bốn mươi sáu triệu, tám trăm sáu mươi nghìn đồng).
+ Tạm ứng hợp đồng: Không.
3.4. Thời gian thực hiện hợp đồng:
- Thời gian thực hiện hợp đồng: 60 ngày.
3.5. Loại hợp đồng:
- Hợp đồng trọn gói.`;
  const r = T.chuanHoa(T.trichQuyTac(t)), b = r.thuong_thao;
  assert.equal(r.loai, 'thuong_thao'); assert.equal(r.hop_dong, null); assert.equal(r.ngay_van_ban, '2026-10-26');
  assert.equal(b.ten_goi_thau, 'Tư vấn thử nghiệm lập hồ sơ mời thầu gói thầu thuê phần mềm thử nghiệm');
  assert.equal(b.nha_thau, 'CÔNG TY TNHH DỊCH VỤ THỬ NGHIỆM ABC'); assert.equal(b.ma_so_thue, '0110000000');
  assert.equal(b.gia_sau_thuong_thao, 46860000); assert.equal(b.thoi_gian_thuc_hien, '60 ngày'); assert.equal(b.loai_hop_dong, 'trọn gói'); assert.equal(b.tam_ung_ghi, 'Không tạm ứng');
});

test('biên bản nghiệm thu hoàn thành, thanh lý hợp đồng: số hợp đồng, ngày "Hôm nay", giá trị, đã/còn phải thanh toán', () => {
  const nt = T.chuanHoa(T.trichQuyTac(`CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
BIÊN BẢN NGHIỆM THU HOÀN THÀNH HỢP ĐỒNG
Gói thầu: Tư vấn thử nghiệm lập bản đồ
Căn cứ Hợp đồng số 09/2026/HĐTV-SNNMT-ABC ngày 05/11/2026 giữa Sở và Công ty ABC;
Hôm nay, ngày 20 tháng 12 năm 2026, tại Sở, chúng tôi gồm:
Nhà thầu (Bên B): CÔNG TY TNHH THỬ NGHIỆM ABC
3. Giá trị nghiệm thu: 1.250.000.000 đồng`));
  assert.equal(nt.loai, 'nghiem_thu'); assert.equal(nt.ngay_van_ban, '2026-12-20');
  assert.equal(nt.nghiem_thu.so_hop_dong, '09/2026/HĐTV-SNNMT-ABC'); assert.equal(nt.nghiem_thu.gia_tri, 1250000000); assert.equal(nt.nghiem_thu.hoan_thanh, true);
  assert.equal(nt.nghiem_thu.ten_goi_thau, 'Tư vấn thử nghiệm lập bản đồ');
  const tl = T.chuanHoa(T.trichQuyTac(`CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
BIÊN BẢN THANH LÝ HỢP ĐỒNG
Căn cứ Hợp đồng số 09/2026/HĐTV-SNNMT-ABC ngày 05/11/2026;
Hôm nay, ngày 25 tháng 12 năm 2026, chúng tôi gồm:
- Giá trị hợp đồng: 1.270.000.000 đồng
- Giá trị quyết toán hợp đồng: 1.250.000.000 đồng
- Đã thanh toán: 0 đồng
- Giá trị còn phải thanh toán: 1.250.000.000 đồng`));
  assert.equal(tl.loai, 'thanh_ly_hd'); assert.equal(tl.ngay_van_ban, '2026-12-25');
  assert.equal(tl.thanh_ly.gia_tri_hop_dong, 1270000000); assert.equal(tl.thanh_ly.gia_tri_quyet_toan, 1250000000);
  assert.equal(tl.thanh_ly.da_thanh_toan, 0); assert.equal(tl.thanh_ly.con_phai_thanh_toan, 1250000000);
});

test('QĐ đặt hàng cung cấp dịch vụ sự nghiệp công: không nhận nhầm là QĐ phê duyệt KHLCNT', () => {
  const t = `UBND TỈNH SƠN LA
SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG
Số: 432/QĐ-SNNMT
Sơn La, ngày 31 tháng 12 năm 2024
QUYẾT ĐỊNH
Về việc đặt hàng cung cấp dịch vụ sự nghiệp công sử dụng kinh phí ngân sách nhà nước thuộc lĩnh vực đất đai
Căn cứ Quyết định số 1945/QĐ-UBND ngày 18/9/2024 phê duyệt kế hoạch lựa chọn nhà thầu;
Điều 1. Đặt hàng cho Văn phòng Đăng ký đất đai thực hiện dịch vụ sự nghiệp công lĩnh vực đất đai.
- Tổng kinh phí đặt hàng: 3.985.040.807 đồng
- Thời gian thực hiện: Năm 2025`;
  const r = T.chuanHoa(T.trichQuyTac(t));
  assert.equal(r.loai, 'dat_hang_qd'); assert.equal(r.so_van_ban, '432/QĐ-SNNMT');
  assert.equal(r.dat_hang.hinh_thuc, 'Đặt hàng'); assert.equal(r.dat_hang.don_vi_nhan, 'Văn phòng Đăng ký đất đai');
  assert.equal(r.dat_hang.gia_tri, 3985040807); assert.equal(r.dat_hang.thoi_gian, 'Năm 2025');
  const g = T.ghep({ loai: 'khlcnt_qd' }, T.trichQuyTac(t)); assert.equal(g.loai, 'dat_hang_qd');
});

test('sửa lỗi nhận dạng chữ: cụm từ sai dấu hay gặp, giữ kiểu chữ, không đụng chữ đúng', () => {
  assert.equal(T.suaOCR('HỢP ĐÒNG DỊCH VỤ; Hợp đông; CÔNG TY TNHH THẲM ĐỊNH GIÁ; nhà thâu; sô 580/QĐ; Quyêt định; CHUYỂN ĐÓI SÓ; kê từ ngày; kê khai; số 5; Đất đai'),
    'HỢP ĐỒNG DỊCH VỤ; Hợp đồng; CÔNG TY TNHH THẨM ĐỊNH GIÁ; nhà thầu; số 580/QĐ; Quyết định; CHUYỂN ĐỔI SỐ; kể từ ngày; kê khai; số 5; Đất đai');
});
