# Phòng Kế hoạch - Tài chính số — Hướng dẫn sử dụng

Phiên bản 1.0.0. Dùng trên web tại **https://phong-khtc-so.vercel.app** (trên điện thoại: menu trình duyệt → "Thêm vào màn hình chính" để có biểu tượng như ứng dụng). Hoặc dùng tệp độc lập `PhongKHTC-so.html`. Mở bằng Chrome, Edge hoặc Firefox trên máy tính hay điện thoại; không cần cài đặt, không cần mạng (trừ khi đồng bộ, kết nối).

## 1. Căn cứ và phạm vi

| Nội dung | Nguồn |
|---|---|
| 67 đầu mục chức năng, nhiệm vụ, chia 10 nhóm | Điều 2 Quyết định 324/QĐ-SNNMT ngày 02/4/2025 |
| 9 cán bộ, 9 đơn vị dự toán, cột "Tham khảo" phân công | Thông báo 279/TB-KHTC ngày 27/8/2026 — chỉ để tham khảo, không tự gán chủ trì |
| Mẫu biểu giải ngân, cấu trúc cột dự toán | Tệp Excel theo dõi giải ngân Phòng đang dùng |
| Bố cục báo cáo kỳ (I. Kết quả – II. Tồn tại – III. Trọng tâm kỳ tới) | Báo cáo tháng 10/2026 của Phòng |

Mã có hậu tố a, b, c (ví dụ 1.1a, 1.1b) là việc thành phần do phần mềm tách từ một điểm của Quyết định; cột "Căn cứ" vẫn ghi điểm gốc. Việc tự thêm ngoài Quyết định được xếp riêng vào nhóm "Việc hỗ trợ nội bộ". Phần mềm không tạo sẵn nhiệm vụ cụ thể, dự án hay số liệu tài chính nào.

## 2. Sơ đồ phân hệ và quan hệ dữ liệu

Phần mềm là công cụ **quản lý chung** của Phòng: tài chính – ngân sách – giải ngân, đấu thầu – hợp đồng do Sở làm chủ đầu tư, kế hoạch vốn đầu tư, tài sản công, báo cáo, dự báo. Nội dung xử lý chi tiết nhiệm vụ và dự án đầu tư nằm ở 2 phần mềm chuyên dụng; ở đây chỉ hiện thẻ tóm tắt và một dòng cảnh báo cho mỗi phần mềm, bấm "Mở phần mềm" để xử lý.

```
       BẢNG ĐIỀU HÀNH ← TRỢ LÝ ĐIỀU HÀNH (luật cố định, có căn cứ)      HỘP CHAT TRỢ LÝ AI (Cloudflare, dẫn nguồn [n])
              ▲
   ┌──────────┼──────────────────┬──────────────────┬──────────────┐
Tài chính,  Đấu thầu, hợp đồng   Kế hoạch vốn      Tài sản công   Tóm tắt 2 phần mềm chuyên dụng
giải ngân   (gói thầu → HĐ →     đầu tư            (nhà đất,      (Điều hành nhiệm vụ,
(dự toán,    phụ lục, bảo lãnh,                     kiểm kê)        Dự án đầu tư)
 lịch sử,    tạm ứng, nghiệm thu,
 dự báo)     thanh toán, thanh lý)
     ▲               ▲
     └── VĂN BẢN ĐẾN: thư mục Google Drive / đọc trên máy → AI trích thông tin → anh/chị duyệt, sửa → cập nhật

Báo cáo (Word, Excel, PDF) · Nhật ký cập nhật · Sao lưu/khôi phục · Kết nối 2 phần mềm
```

- Mọi bản ghi gắn được tệp hoặc liên kết, có lịch sử chỉnh sửa (ai, lúc nào, giá trị cũ → mới).
- Mỗi dòng dự toán lưu **lịch sử lũy kế giải ngân theo ngày** để vẽ diễn biến và dự báo.

## 3. Bắt đầu trong 15 phút

1. **Thiết lập, sao lưu** → nhập tên người sử dụng (được ghi vào nhật ký).
2. **Tài chính, giải ngân → Nhập biểu Excel** → chọn tệp theo dõi giải ngân, chọn trang tính mới nhất. Mỗi lần nhập lại biểu, phần mềm ghép đúng dòng cũ (giữ cán bộ theo dõi, số quyết toán) và ghi thêm một mốc giải ngân.
3. **Tài chính, giải ngân → Mục tiêu giải ngân** → nhập tỷ lệ lũy kế phải đạt cuối từng tháng theo chỉ đạo của tỉnh/Sở (không nhập thì so với tỷ lệ thời gian).
4. **Đấu thầu, hợp đồng** → thêm gói thầu, hợp đồng; hoặc đưa văn bản vào **Văn bản đến** để phần mềm điền sẵn.
5. **Kết nối phần mềm** → dán link CSV của Sheet nhiệm vụ và địa chỉ, mã truy cập của phần mềm dự án (mục 6).
6. Bấm nút tròn góc phải dưới để hỏi **Trợ lý AI**.

## 4. Cách tính các con số (để đối chiếu)

- **Quá hạn**: chưa hoàn thành và hạn < hôm nay. **Sắp đến hạn**: còn ≤ 7 ngày. **Hoàn thành trễ hạn**: ngày hoàn thành > hạn.
- **Tồn đọng kéo dài**: quá hạn trên 30 ngày, hoặc việc không hạn (không phải việc thường xuyên) 30 ngày chưa cập nhật.
- **Nguy cơ không hoàn thành**: sắp đến hạn mà tiến độ dưới 50%, hoặc đã ghi nhận khó khăn.
- **Dự án chậm**: có mốc quá hạn chưa xong, hoặc quá ngày kết thúc mà chưa hoàn thành.
- **Kế hoạch vốn sau điều chỉnh** = giao đầu năm + kéo dài + điều chỉnh tăng − điều chỉnh giảm. **Giải ngân** = số lũy kế mới nhất đã nhập.
- **Giải ngân thấp**: tỷ lệ giải ngân thấp hơn tỷ lệ thời gian đã qua của năm trên 20 điểm %, hoặc thấp hơn tiến độ dự án trên 20 điểm.
- **Tổng kinh phí được sử dụng** = chuyển nguồn + dự toán đầu năm + bổ sung + tăng − giảm − thu hồi − tiết kiệm (đúng công thức cột 10 biểu của Phòng). Dòng có dòng con = tổng các dòng con.
- **Giải ngân dự toán, dự báo, đấu thầu – hợp đồng**: xem mục 4d, 4e.
- **Điểm ưu tiên** (Trợ lý): quá hạn +100 và cộng số ngày quá hạn; sắp đến hạn +60; ưu tiên cao +25; cần xin ý kiến +20; chưa phân công +15.

Các ngưỡng 7, 30, 20 đổi được ở Thiết lập. Đây là ngưỡng nhắc việc nội bộ, không phải quy định pháp luật.

## 4b. Tài sản nhà, đất (Phụ biểu 0A.01-T.STC)

Mỗi tài sản loại **"Cơ sở nhà, đất"** (hoặc "Trụ sở, nhà làm việc") có thêm nhóm trường theo đúng biểu tổng hợp hiện trạng nhà, đất: cơ quan, đơn vị đang được giao quản lý; diện tích nhà, diện tích đất (m²); hiện trạng sử dụng (đúng / không đúng mục đích); giấy chứng nhận (đã cấp — số, ngày cấp / mất, thất lạc / chưa cấp); đầy đủ hồ sơ, thiếu hồ sơ hình thành tài sản; chưa đăng ký biến động đất đai; nguyên nhân; ghi chú theo biểu; ngày tính hiện trạng.

- **Tài sản công → Nhập biểu 0A.01**: chọn tệp Excel biểu. Phần mềm nhận cột theo tiêu đề, đọc giá trị đã tính của ô công thức, đối chiếu với dòng tổng, báo các điểm cần rà soát trước khi ghi. Nhập lại biểu kỳ sau cập nhật đúng cơ sở (theo đơn vị được giao + tên tài sản), không tạo trùng; mã, biến động, hồ sơ, ghi chú nhập tại phần mềm được giữ.
- **Gắn đơn vị được giao với đơn vị dự toán**: phần mềm chỉ gợi ý khi tên trên biểu chứa đủ tên đơn vị dự toán (ví dụ "Văn phòng Chi cục Kiểm lâm" → Chi cục Kiểm lâm). Đơn vị cấp dưới (Hạt Kiểm lâm, Ban quản lý rừng…) do anh/chị chọn; lựa chọn được nhớ cho lần sau.
- **Xuất theo mẫu 0A.01**: ra lại đúng bố cục biểu (tiêu đề nhiều tầng, dấu x, dòng tổng) theo danh sách đang lọc.
- Thẻ chỉ số (chưa cấp GCN, chưa đăng ký biến động, thiếu hồ sơ, không đúng mục đích) bấm được để lọc; các mục này đồng thời vào "Những vấn đề cần quan tâm" và Trợ lý điều hành; báo cáo tài sản công có phần nhà, đất.

## 4c. Kiểm kê tài sản theo nhóm (Mẫu 01c-BC/TSCĐ, 08đ-BC/HTNS, 09đ-BC/HTTL)

**Tài sản công → thẻ "Kiểm kê theo nhóm" → Nhập biểu kiểm kê**, chọn được nhiều tệp một lúc.

- Tự nhận mẫu theo ký hiệu "Mẫu số …" trên biểu: tài sản cố định (01c), hạ tầng cấp nước sạch (08đ), hạ tầng thủy lợi (09đ). Nhận cột theo tiêu đề: số lượng, hiện vật, nguyên giá, giá trị còn lại, giá trị nâng cấp, hạch toán, tình trạng, thiên tai.
- Kỳ kiểm kê lấy từ dòng ký "ngày … tháng … năm …"; biểu không có ngày ký thì lấy từ tên tệp (ví dụ …26052026). Sửa được trước khi nhập.
- Đối chiếu dòng nhóm với dòng con, dòng TỔNG CỘNG với dòng chi tiết, ghi sổ và tình trạng với số lượng.
- Nhập lại cùng mẫu, cùng kỳ: thay số liệu kỳ đó (có bản chụp). Kỳ khác: giữ lại, màn hình hiện cột "So kỳ trước".
- Có bảng **đối chiếu đất, nhà** giữa kiểm kê 01c và hiện trạng 0A.01 (số khuôn viên/cơ sở, diện tích, nguyên giá, giá trị còn lại). Chỉ để rà soát; phần mềm không sửa số liệu.
- Tài sản hỏng, không sử dụng, chưa ghi sổ, sử dụng không đúng mục đích được đưa vào cảnh báo và Trợ lý; báo cáo tài sản công có phần kết quả kiểm kê.

## 4d. Theo dõi, dự báo giải ngân dự toán (Tài chính, giải ngân)

- **Mẫu biểu**: "Báo cáo tình hình thực hiện giải ngân thanh toán nguồn chi thường xuyên" (Phụ lục II): TT, Nội dung, (3) KP chuyển nguồn năm trước sang, (4) Dự toán giao đầu năm, (5) KP bổ sung trong năm, (6) Điều chỉnh tăng, (7) Điều chỉnh giảm, (8) KP thu hồi trong năm, Chỉ tiêu tiết kiệm, (9) Tổng KP được sử dụng = 3 + 4 + 5 + 6 − 7 − 8 − tiết kiệm, (10) Kinh phí đã giải ngân đến ngày…, (11) Kinh phí còn lại = 9 − 10, (12) Tỷ lệ giải ngân, Ghi chú. Tên trường trên phần mềm và tệp Excel xuất ra dùng đúng tên, thứ tự cột này; ngày số liệu đọc từ tiêu đề cột 10.
- **Nhập lại biểu**: ghép với dòng đã có theo số thứ tự + nội dung, bỏ qua khác biệt dấu câu, nhận cả dòng được đánh lại số hoặc sửa chữ (cùng số thứ tự, cùng dòng cha, nội dung giống ≥ 75%). Mặc định biểu mới **thay toàn bộ** dự toán của đơn vị trong năm: dòng không còn trên biểu bị xóa (có bản chụp để khôi phục). Chỉ chọn "Giữ lại các dòng cũ…" khi biểu chỉ gồm một phần nguồn kinh phí.
- **Dấu ⚠** trên dòng tổng: số trên biểu Excel khác tổng các dòng chi tiết. Bấm **Rà soát, xử lý cảnh báo** (thẻ Chi tiết dự toán): phần mềm tìm dòng còn sót từ lần nhập biểu trước (nguyên nhân thường gặp) để xóa; chênh lệch còn lại do biểu gốc cộng sai thì chọn "Chấp nhận số tính từ dòng chi tiết". Ô thành phần để trống trên dòng tổng của biểu (ví dụ tiết kiệm) không bị coi là lệch.

- **Tổng quan giải ngân**: tỷ lệ đã giải ngân so với mục tiêu tháng (hoặc tỷ lệ thời gian), dự báo đến 31/12, số tiền cần giải ngân bình quân mỗi tháng còn lại, tiến độ theo đơn vị và theo cán bộ theo dõi, danh sách nội dung giải ngân chậm, **phương án, đề xuất chỉ đạo**. Lọc theo đơn vị, cán bộ.
- **Cập nhật giải ngân**: lưới nhập nhanh **số lũy kế từ đầu năm** đến một ngày cho nhiều dòng; chỉ lưu dòng có thay đổi, cảnh báo khi số vượt kinh phí được sử dụng.
- **Lịch sử giải ngân**: các mốc cập nhật, số tăng giữa hai mốc; trong chi tiết từng dòng có lịch sử riêng.
- Cách tính:
  - Lũy kế tại một ngày = cộng các dòng chi tiết, mỗi dòng lấy mốc gần nhất trước hoặc bằng ngày đó.
  - **Dự báo 31/12** = bình quân của (a) tốc độ bình quân từ đầu năm × số ngày cả năm và (b) số hiện tại + tốc độ khoảng 60 ngày gần nhất × số ngày còn lại; không vượt tổng kế hoạch. Chỉ có một mốc thì dùng (a).
  - **Nguy cơ không giải ngân hết**: dự báo dưới 95% kinh phí được sử dụng (năm hiện tại).
  - **Nội dung giải ngân chậm**: tỷ lệ của dòng thấp hơn mốc so sánh từ 20 điểm % trở lên (ngưỡng đổi ở Thiết lập).
  - Đề xuất chỉ dựa trên số liệu (rà soát điều chỉnh dự toán, đề xuất thu hồi, điều chuyển, giao cán bộ theo dõi…); quyết định thuộc thẩm quyền lãnh đạo và cơ quan tài chính.
- Báo cáo: **Báo cáo, thống kê → Báo cáo tiến độ giải ngân dự toán ngân sách** (diễn biến tháng, theo đơn vị, cán bộ, nội dung chậm, đề xuất).

## 4e. Đấu thầu, hợp đồng do Sở làm chủ đầu tư

- **Nguồn kinh phí**: chọn "Dòng dự toán nguồn kinh phí" cho gói thầu (hợp đồng tự lấy theo gói thầu nếu không chọn riêng). Chi tiết gói thầu, hợp đồng và dòng dự toán hiện: kinh phí được sử dụng, đã giải ngân, giá gói thầu, giá trị hợp đồng, đã thanh toán, kinh phí chưa bố trí; cảnh báo khi giá trị hợp đồng vượt kinh phí, hoặc đã thanh toán hợp đồng nhiều hơn số giải ngân đã cập nhật của dòng dự toán.
- Các ô chọn (đơn vị, dòng dự toán, cán bộ, dự án, gói thầu…) gõ để tìm, không cần dấu; có nút **Thêm … mới** và nút bút chì để sửa bản ghi đang chọn ngay trong biểu mẫu.

- **Tổng quan**: gói thầu theo bước (nhu cầu → dự toán → trình KHLCNT → duyệt KHLCNT → đang LCNT → có kết quả → ký HĐ), giá trị tiết kiệm qua đấu thầu, thanh toán hợp đồng, tạm ứng chưa thu hồi, **việc cần xử lý**, **lịch hạn 60 ngày**, biểu đồ tiến độ hợp đồng.
- Gói thầu: thông tin KHLCNT (hình thức, phương thức, loại HĐ, thời gian bắt đầu LCNT, thời gian thực hiện HĐ), số TBMT, tiến trình từng bước, dòng dự toán nguồn kinh phí. Tình trạng tự nâng khi nhập số QĐ KHLCNT, số TBMT, kết quả.
- Hợp đồng: phụ lục (giá trị tăng/giảm, gia hạn), bảo đảm thực hiện HĐ và bảo lãnh tạm ứng (số tiền, hiệu lực đến ngày), tạm ứng và thu hồi tạm ứng, nghiệm thu, thanh toán, quyết toán, thanh lý.
- **Tự tính thời hạn hoàn thành**: nhập "Thời gian thực hiện hợp đồng" (ví dụ `30 ngày`, `6 tháng`, `1 năm`), phần mềm cộng vào ngày bắt đầu (không có thì ngày ký). Mặc định ngày đầu không tính, thời hạn tháng/năm kết thúc vào ngày tương ứng (Điều 147, 148 Bộ luật Dân sự 2015): ký 01/11/2026 + 30 ngày → 01/12/2026. Chọn "Tính cả ngày bắt đầu" nếu hợp đồng quy định như vậy → 30/11/2026. Ngày nhập tay không bị ghi đè. Tạo hợp đồng từ gói thầu thì lấy sẵn thời gian thực hiện theo KHLCNT.
- Cách tính: **Giá trị hợp đồng** = giá ký + tổng giá trị phụ lục; **thời hạn** = ngày gia hạn muộn nhất trong phụ lục (nếu có), không thì thời hạn ký. Cảnh báo trước 30 ngày (đổi ở Thiết lập) khi hợp đồng, bảo đảm thực hiện HĐ, bảo lãnh tạm ứng (còn số chưa thu hồi) sắp hết hạn; nghiệm thu chưa thanh toán; nghiệm thu chưa thanh lý.

## 4f. Văn bản đến — tự động đọc và cập nhật

Đưa văn bản vào thư mục, phần mềm đọc, nhận dạng loại văn bản và **lập phương án cập nhật**; anh/chị xem, sửa từng trường, bỏ chọn thao tác không cần, rồi mới bấm **Cập nhật vào phần mềm**. Không có gì được ghi khi chưa duyệt.

| Loại văn bản | Phần mềm đề xuất |
|---|---|
| QĐ phê duyệt KHLCNT / tờ trình KHLCNT | Thêm hoặc cập nhật từng gói thầu trong bảng (giá, nguồn vốn, hình thức, phương thức, loại HĐ, thời gian), ghi số QĐ, bước tiến trình |
| QĐ phê duyệt HSMT/HSYC, danh sách nhà thầu đáp ứng kỹ thuật, danh sách ngắn, tổ chuyên gia | Ghi bước vào tiến trình của gói thầu (tìm theo tên gói thầu trong trích yếu), chuyển sang "Đang lựa chọn nhà thầu" |
| QĐ phê duyệt kết quả LCNT | Ghi nhà thầu trúng thầu, giá trúng thầu, số QĐ vào gói thầu tương ứng |
| Hợp đồng | Thêm hợp đồng, gắn gói thầu (theo tên, nhà thầu), chuyển gói thầu sang "Đã ký hợp đồng" |
| Phụ lục, biên bản nghiệm thu, thanh lý | Thêm dòng phụ lục / nghiệm thu; ghi thanh lý vào hợp đồng đã có |
| QĐ giao, bổ sung, điều chỉnh, thu hồi dự toán | Cộng số tiền vào cột tương ứng của dòng dự toán được chọn |
| Mọi văn bản | Lưu vào danh mục Văn bản kèm tệp gốc (bỏ chọn nếu không cần) |

Hai cách đọc:
1. **Đọc trên máy này** (không cần cài gì): PDF có lớp chữ, Word .docx, hoặc dán nội dung. AI gọi qua Worker Cloudflare (mục 4g); AI lỗi hoặc hết hạn mức thì vẫn có kết quả theo quy tắc.
2. **Thư mục Google Drive (tự động)**: đọc cả PDF scan, ảnh chụp (nhận dạng chữ tiếng Việt của Google Drive). Cài đặt một lần:
   1. script.google.com → Dự án mới → dán toàn bộ `gas/Code.gs` (bản 2, có trong thư mục `dist/`), đổi `MA_BI_MAT`.
   2. Bên trái → **Dịch vụ** → thêm **Drive API**.
   3. (Tùy chọn) Cài đặt dự án → Thuộc tính tập lệnh: `CF_WORKER_URL` (mặc định Worker rasoatvanban), hoặc `CF_ACCOUNT_ID` + `CF_API_TOKEN` (+ `CF_AI_MODEL`) để gọi thẳng Cloudflare Workers AI.
   4. Triển khai → Triển khai mới → Ứng dụng web → Thực thi với tư cách: Tôi; Ai có quyền: Bất kỳ ai.
   5. Chạy hàm **`caiDatVanBanDen`** một lần (cấp quyền, tạo thư mục `KHTC_So_VAN_BAN_DEN`, bật quét 15 phút).
   6. Phần mềm → **Thiết lập → Đồng bộ qua Google Apps Script** → dán URL `.../exec` và mã bí mật.
   
   Mỗi lần sửa Code.gs: Triển khai → Quản lý triển khai → Sửa → **Phiên bản mới** (giữ nguyên URL). Tệp đã đọc chuyển vào thư mục con "Đã đọc". Đổi thư mục nhận văn bản ở trang Văn bản đến.

Văn bản ký số thường để trống số và ngày ở đầu văn bản (đóng ở chữ ký số): phần mềm không lấy nhầm ngày trong trích yếu, báo rõ để anh/chị nhập số, ngày theo bản đã ký. "Bỏ qua văn bản này" có hiệu lực ngay; trạng thái gửi lên máy chủ chạy nền, máy chủ bận thì tự gửi lại.

Lưu ý: máy đọc có thể sai — luôn đối chiếu với văn bản gốc (có nút mở tệp gốc và phần nội dung đã đọc). Thời hạn hợp đồng ghi theo số ngày/tháng được ước tính theo cách tính thời hạn tại Điều 147, 148 Bộ luật Dân sự 2015 (ngày đầu không tính) và kèm ghi chú để đối chiếu điều khoản hiệu lực của hợp đồng.

## 4g. Trợ lý AI (hộp chat)

- Nút tròn góc phải dưới. Mỗi câu hỏi, phần mềm chọn các **đoạn số liệu liên quan** (giải ngân, dự toán chậm, gói thầu, hợp đồng, vốn đầu tư, tài sản, cảnh báo) và gửi kèm câu hỏi tới Worker Cloudflare Workers AI; câu trả lời dẫn nguồn [n], bấm [n] để mở bản ghi.
- Mặc định dùng Worker `rasoatvanban.letunglam1992.workers.dev` (giao thức `{messages, max_tokens}` → `{text, model}`, như phần mềm Tra cứu TTHC đất đai). Đổi địa chỉ, giới hạn lượt ở biểu tượng bánh răng trong hộp chat.
- Giới hạn **30 lượt/ngày** trên mỗi trình duyệt (đọc văn bản đến trên máy cũng tính lượt); Worker báo hết hạn mức thì tạm dừng đến hôm sau. Hội thoại chỉ lưu tạm trong thẻ trình duyệt.
- Dữ liệu gửi đi: câu hỏi và các đoạn số liệu tổng hợp liên quan (không gửi tệp đính kèm, không gửi toàn bộ cơ sở dữ liệu).
- Báo "Failed to fetch": Worker chỉ cho phép một số tên miền (biến `ALLOWED_ORIGIN` của Worker). Hai cách khắc phục, làm một trong hai:
  1. Cloudflare → Workers & Pages → `rasoatvanban` → Settings → Variables and Secrets → sửa `ALLOWED_ORIGIN`, thêm `,https://phong-khtc-so.vercel.app` (cách nhau bằng dấu phẩy, không có dấu `/` ở cuối) → Deploy.
  2. Đã nhập máy chủ Apps Script (bản Code.gs mới, có thao tác `aiChat`): phần mềm tự chuyển sang gọi AI qua máy chủ, không cần sửa Worker.

## 5. Sao lưu, khôi phục

- Dữ liệu nằm trong IndexedDB của **trình duyệt trên máy đang dùng**. Xóa dữ liệu duyệt web, dùng cửa sổ ẩn danh, đổi trình duyệt hoặc đổi máy sẽ không thấy dữ liệu.
- **Sao lưu**: nút mũi tên ở thanh trên, hoặc Thiết lập → Sao lưu. Tệp JSON chứa toàn bộ dữ liệu, cấu hình và (tùy chọn) tệp đính kèm. Nên sao lưu hằng tuần; phần mềm nhắc khi quá 7 ngày.
- **Khôi phục**: Thiết lập → "gộp" (giữ bản sửa sau cùng của từng bản ghi) hoặc "thay toàn bộ". Tệp sai định dạng bị từ chối.
- Trước mỗi thao tác lớn (khôi phục, nhập lại biểu dự toán, tải đồng bộ, xóa toàn bộ) phần mềm tự chụp một bản; giữ 3 bản gần nhất, khôi phục tại Thiết lập.
- Mỗi danh sách đều có **Xuất Excel / Nhập Excel** (có tệp mẫu, báo dòng lỗi và dòng trùng trước khi ghi).

## 6. Kết nối với hai phần mềm sẵn có

Hai phần mềm cũ vẫn là nơi cập nhật chính; phần mềm này kéo dữ liệu về để phân công, gắn với chức năng, vốn, ngân sách và lên bảng điều hành chung.

### 6.1. Điều hành nhiệm vụ (theodoinhiemvu.vercel.app)
- Dán **link CSV** của Google Sheet nhiệm vụ (đúng link đang dùng ở mục Đồng bộ Google Sheet của phần mềm đó).
- Mỗi dòng Sheet thành một nhiệm vụ; các dòng cùng số ký hiệu và ngày ban hành gộp thành một văn bản giao việc.
- Sheet quản lý: nội dung, căn cứ, ngày giao, hạn, người tham mưu, lý do chậm, tình trạng hoàn thành. Giữ tại đây: nhóm chức năng, tiến độ %, kết quả, xin ý kiến, liên kết dự án, tệp đính kèm.
- Tên người tham mưu không khớp cán bộ nào thì nhiệm vụ để "Chưa phân công", tên gốc được ghi lại, phân công tại đây được giữ.
- **Ghi ngược về Sheet (tùy chọn)**: nhập địa chỉ Web App và `MA_BI_MAT`. Chỉ ghi ngày hoàn thành, số văn bản hoàn thành, lý do chậm, người tham mưu vào ô còn trống hoặc chưa đổi; ô đã bị sửa trên Sheet thì báo xung đột, không ghi đè.

### 6.2. Dự án đầu tư tỉnh Sơn La (du-an-dau-tu-son-la.vercel.app)
- Nhập **địa chỉ Web App** và **mã truy cập** (nên tạo riêng mã vai trò "xem" bằng `taoMaTruyCap`). Chỉ đọc, không ghi gì vào dữ liệu dự án.
- Chọn ngành cần đưa về. Tổng mức đầu tư quy đổi từ tỷ đồng sang đồng; tỷ lệ tiến độ tính đúng công thức trọng số mốc của phần mềm gốc.
- Nguồn quản lý: tên, ngành, nhà đầu tư, địa điểm, tổng mức đầu tư, ngày dự kiến hoàn thành, mốc, vướng mắc. Giữ tại đây: cán bộ theo dõi (khi nguồn chưa ghi), ngày từng mốc, kế hoạch vốn, gói thầu, kiến nghị, hồ sơ.
- Không có mạng tới backend: dùng "Nạp từ tệp JSON sao lưu".

Bản ghi kéo về có nhãn nguồn và nút mở lại đúng phần mềm gốc. Có thể bật "Tự đồng bộ khi mở phần mềm".

## 7. Giới hạn cần biết

- **Bản ghi trùng tên** (cán bộ, đơn vị, đầu mục chức năng) do mỗi máy tự nạp danh mục ban đầu rồi "Tải về và gộp": phần mềm tự gộp khi mở và sau mỗi lần tải về – gộp, giữ bản sửa gần nhất, chuyển mọi liên kết sang bản giữ lại.

- **Một máy, một người dùng tại một thời điểm.** Chưa có đăng nhập, chưa phân quyền. Hai người mở hai máy là hai bộ dữ liệu riêng.
- **Đồng bộ nhiều máy (tùy chọn)** qua Google Apps Script (`gas/Code.gs`): đẩy lên – tải về toàn bộ dữ liệu, không kèm tệp đính kèm; hai người cùng sửa một bản ghi thì bản sửa sau cùng được giữ; có cảnh báo khi máy chủ đã có bản mới hơn.
- Tệp đính kèm lưu trong trình duyệt, tối đa 15 MB mỗi tệp. Hồ sơ lớn nên dùng liên kết (iOffice, Drive).
- Xuất PDF bằng lệnh In của trình duyệt → "Lưu dưới dạng PDF".
- Trợ lý điều hành chạy theo luật cố định trên dữ liệu đã nhập, không dùng AI. Hộp chat Trợ lý AI và Văn bản đến dùng AI Cloudflare: kết quả là gợi ý, cần đối chiếu.
- Nhiệm vụ, dự án đồng bộ từ 2 phần mềm chuyên dụng chỉ dùng để tóm tắt; cảnh báo chi tiết và xử lý ở phần mềm gốc.

## 8. Nâng cấp

- Bản mới chỉ cần thay tệp HTML ở **đúng vị trí cũ** (cùng đường dẫn, cùng trình duyệt) thì dữ liệu còn nguyên. Luôn sao lưu trước khi thay.
- Mã nguồn tách mô-đun trong `src/`; `node build.js` ghép thành một tệp. Khai báo trường tập trung ở `src/js/20-schema.js`: thêm một trường là form, bảng, Excel, kiểm tra dữ liệu và lịch sử tự có.
- Lớp lưu trữ (`src/js/10-store.js`) tách khỏi giao diện qua một adapter 8 hàm. Lên hệ thống nhiều người dùng chỉ cần viết adapter gọi máy chủ, không phải viết lại các phân hệ.
- Kiểm thử: `node --test tests/gas.test.js tests/trich-van-ban.test.js`; `node tests/mock-server.js &` rồi `node tests/e2e.js <thư mục ảnh> <tệp Excel giải ngân> <tệp nhà đất> <các tệp kiểm kê>`.

## 9. Nội dung cần anh/chị xác nhận

1. **Tiết d điểm 4.2 QĐ 324** ghi "Theo thẩm quyền các nội dung về quản lý, sử dụng tài sản công theo phân cấp…" — thiếu động từ. Đang ghi nguyên văn, đánh dấu cần rà soát.
2. **Điểm 1.10** còn ghi "UBND cấp huyện"; **tiết d điểm 4.1** dẫn Thông tư 99/2018/TT-BTC — cần rà soát theo tổ chức chính quyền 2 cấp và hiệu lực văn bản.
3. **Chu kỳ thực hiện**: QĐ 324 chỉ nêu rõ kỳ ở 18 đầu mục. 49 đầu mục còn lại do phần mềm phân loại (thường xuyên / đột xuất), có nhãn "cần rà soát".
4. **Chức vụ**: Thông báo 279 chỉ ghi "Chuyên viên" cho 4 đồng chí; các đồng chí khác để trống. Đ/c Lê Tùng Lâm ghi "Phụ trách Phòng" theo thông tin anh cung cấp — cần chỉnh đúng chức danh.
5. **Biểu giải ngân 20/10/2026** có 4 chỗ số tổng khác tổng chi tiết (xem mục cảnh báo khi nhập), trong đó dòng "Kinh phí tự chủ" lệch 707,6 triệu và phần CTMTQG nông thôn mới lệch 100 triệu.
6. **Danh mục hình thức lựa chọn nhà thầu, loại hợp đồng, giai đoạn dự án** là danh mục mở, sửa ở Thiết lập; phần mềm không gắn điều khoản pháp luật vào các danh mục này.
