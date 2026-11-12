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

```
                         BẢNG ĐIỀU HÀNH  ←  TRỢ LÝ ĐIỀU HÀNH (cảnh báo, ưu tiên, 6 câu hỏi)
                                ▲
   ┌────────────────┬───────────┼─────────────┬───────────────┬──────────────┐
Chức năng,      Nhiệm vụ,     Chương trình,  Kế hoạch vốn,   Tài chính,     Tài sản công
nhiệm vụ   ──▶  công việc ◀─▶ dự án     ──▶  giải ngân       ngân sách
(QĐ 324)         ▲   ▲          │  ▲          (theo dự án,   (cây dự toán   (theo đơn vị,
   │             │   │          │  │           nguồn, năm)    theo đơn vị)   biến động)
   │       Văn bản   Cán bộ     ▼  └── dòng dự toán liên quan
   └─ phân công ─────┘       Gói thầu ──▶ Hợp đồng (tạm ứng, thanh toán, nghiệm thu, thanh lý)

Báo cáo, thống kê · Nhật ký cập nhật · Sao lưu/khôi phục · Kết nối 2 phần mềm sẵn có
```

- Một văn bản ↔ nhiều nhiệm vụ; một nhiệm vụ ↔ nhiều văn bản, nhiều dự án.
- Một dự án có nhiều nguồn vốn, nhiều mốc tự đặt, nhiều dòng kế hoạch vốn (mỗi dòng: dự án × nguồn × năm), nhiều gói thầu, hợp đồng.
- Mọi bản ghi đều gắn được tệp hoặc liên kết, và có lịch sử chỉnh sửa (ai, lúc nào, giá trị cũ → mới).

## 3. Bắt đầu trong 15 phút

1. **Thiết lập, sao lưu** → nhập tên người sử dụng (được ghi vào nhật ký).
2. **Chức năng, nhiệm vụ** → chọn cán bộ ở cột "Chủ trì" cho từng đầu mục; hoặc **Cán bộ, phân công → Bảng phân công chức năng** để phân công dạng ma trận (C = chủ trì, P = phối hợp) và xuất Excel.
3. **Tài chính, ngân sách → Nhập biểu giải ngân** → chọn tệp Excel theo dõi giải ngân, chọn trang tính mới nhất. Phần mềm dựng lại cấp bậc dòng và chỉ ra chỗ số tổng khác tổng chi tiết.
4. **Kết nối phần mềm** → dán link CSV của Sheet nhiệm vụ và địa chỉ, mã truy cập của phần mềm dự án (mục 6).
5. **Chức năng, nhiệm vụ → Sinh nhiệm vụ định kỳ** → tạo nhiệm vụ theo tháng, quý, năm cho các đầu mục định kỳ. Ngày hạn do anh/chị đặt; để trống thì không gán hạn.

## 4. Cách tính các con số (để đối chiếu)

- **Quá hạn**: chưa hoàn thành và hạn < hôm nay. **Sắp đến hạn**: còn ≤ 7 ngày. **Hoàn thành trễ hạn**: ngày hoàn thành > hạn.
- **Tồn đọng kéo dài**: quá hạn trên 30 ngày, hoặc việc không hạn (không phải việc thường xuyên) 30 ngày chưa cập nhật.
- **Nguy cơ không hoàn thành**: sắp đến hạn mà tiến độ dưới 50%, hoặc đã ghi nhận khó khăn.
- **Dự án chậm**: có mốc quá hạn chưa xong, hoặc quá ngày kết thúc mà chưa hoàn thành.
- **Kế hoạch vốn sau điều chỉnh** = giao đầu năm + kéo dài + điều chỉnh tăng − điều chỉnh giảm. **Giải ngân** = số lũy kế mới nhất đã nhập.
- **Giải ngân thấp**: tỷ lệ giải ngân thấp hơn tỷ lệ thời gian đã qua của năm trên 20 điểm %, hoặc thấp hơn tiến độ dự án trên 20 điểm.
- **Tổng kinh phí được sử dụng** = chuyển nguồn + dự toán đầu năm + bổ sung + tăng − giảm − thu hồi − tiết kiệm (đúng công thức cột 10 biểu của Phòng). Dòng có dòng con = tổng các dòng con.
- **Điểm ưu tiên** (Trợ lý): quá hạn +100 và cộng số ngày quá hạn; sắp đến hạn +60; ưu tiên cao +25; cần xin ý kiến +20; chưa phân công +15.

Các ngưỡng 7, 30, 20 đổi được ở Thiết lập. Đây là ngưỡng nhắc việc nội bộ, không phải quy định pháp luật.

## 4b. Tài sản nhà, đất (Phụ biểu 0A.01-T.STC)

Mỗi tài sản loại **"Cơ sở nhà, đất"** (hoặc "Trụ sở, nhà làm việc") có thêm nhóm trường theo đúng biểu tổng hợp hiện trạng nhà, đất: cơ quan, đơn vị đang được giao quản lý; diện tích nhà, diện tích đất (m²); hiện trạng sử dụng (đúng / không đúng mục đích); giấy chứng nhận (đã cấp — số, ngày cấp / mất, thất lạc / chưa cấp); đầy đủ hồ sơ, thiếu hồ sơ hình thành tài sản; chưa đăng ký biến động đất đai; nguyên nhân; ghi chú theo biểu; ngày tính hiện trạng.

- **Tài sản công → Nhập biểu 0A.01**: chọn tệp Excel biểu. Phần mềm nhận cột theo tiêu đề, đọc giá trị đã tính của ô công thức, đối chiếu với dòng tổng, báo các điểm cần rà soát trước khi ghi. Nhập lại biểu kỳ sau cập nhật đúng cơ sở (theo đơn vị được giao + tên tài sản), không tạo trùng; mã, biến động, hồ sơ, ghi chú nhập tại phần mềm được giữ.
- **Gắn đơn vị được giao với đơn vị dự toán**: phần mềm chỉ gợi ý khi tên trên biểu chứa đủ tên đơn vị dự toán (ví dụ "Văn phòng Chi cục Kiểm lâm" → Chi cục Kiểm lâm). Đơn vị cấp dưới (Hạt Kiểm lâm, Ban quản lý rừng…) do anh/chị chọn; lựa chọn được nhớ cho lần sau.
- **Xuất theo mẫu 0A.01**: ra lại đúng bố cục biểu (tiêu đề nhiều tầng, dấu x, dòng tổng) theo danh sách đang lọc.
- Thẻ chỉ số (chưa cấp GCN, chưa đăng ký biến động, thiếu hồ sơ, không đúng mục đích) bấm được để lọc; các mục này đồng thời vào "Những vấn đề cần quan tâm" và Trợ lý điều hành; báo cáo tài sản công có phần nhà, đất.



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

- **Một máy, một người dùng tại một thời điểm.** Chưa có đăng nhập, chưa phân quyền. Hai người mở hai máy là hai bộ dữ liệu riêng.
- **Đồng bộ nhiều máy (tùy chọn)** qua Google Apps Script (`gas/Code.gs`): đẩy lên – tải về toàn bộ dữ liệu, không kèm tệp đính kèm; hai người cùng sửa một bản ghi thì bản sửa sau cùng được giữ; có cảnh báo khi máy chủ đã có bản mới hơn.
- Tệp đính kèm lưu trong trình duyệt, tối đa 15 MB mỗi tệp. Hồ sơ lớn nên dùng liên kết (iOffice, Drive).
- Xuất PDF bằng lệnh In của trình duyệt → "Lưu dưới dạng PDF".
- Trợ lý điều hành chạy theo luật cố định trên dữ liệu đã nhập, không dùng AI, không tự suy diễn.

## 8. Nâng cấp

- Bản mới chỉ cần thay tệp HTML ở **đúng vị trí cũ** (cùng đường dẫn, cùng trình duyệt) thì dữ liệu còn nguyên. Luôn sao lưu trước khi thay.
- Mã nguồn tách mô-đun trong `src/`; `node build.js` ghép thành một tệp. Khai báo trường tập trung ở `src/js/20-schema.js`: thêm một trường là form, bảng, Excel, kiểm tra dữ liệu và lịch sử tự có.
- Lớp lưu trữ (`src/js/10-store.js`) tách khỏi giao diện qua một adapter 8 hàm. Lên hệ thống nhiều người dùng chỉ cần viết adapter gọi máy chủ, không phải viết lại các phân hệ.
- Kiểm thử: `node tests/mock-server.js &` rồi `node tests/e2e.js <thư mục ảnh> <tệp Excel giải ngân>`.

## 9. Nội dung cần anh/chị xác nhận

1. **Tiết d điểm 4.2 QĐ 324** ghi "Theo thẩm quyền các nội dung về quản lý, sử dụng tài sản công theo phân cấp…" — thiếu động từ. Đang ghi nguyên văn, đánh dấu cần rà soát.
2. **Điểm 1.10** còn ghi "UBND cấp huyện"; **tiết d điểm 4.1** dẫn Thông tư 99/2018/TT-BTC — cần rà soát theo tổ chức chính quyền 2 cấp và hiệu lực văn bản.
3. **Chu kỳ thực hiện**: QĐ 324 chỉ nêu rõ kỳ ở 18 đầu mục. 49 đầu mục còn lại do phần mềm phân loại (thường xuyên / đột xuất), có nhãn "cần rà soát".
4. **Chức vụ**: Thông báo 279 chỉ ghi "Chuyên viên" cho 4 đồng chí; các đồng chí khác để trống. Đ/c Lê Tùng Lâm ghi "Phụ trách Phòng" theo thông tin anh cung cấp — cần chỉnh đúng chức danh.
5. **Biểu giải ngân 20/10/2026** có 4 chỗ số tổng khác tổng chi tiết (xem mục cảnh báo khi nhập), trong đó dòng "Kinh phí tự chủ" lệch 707,6 triệu và phần CTMTQG nông thôn mới lệch 100 triệu.
6. **Danh mục hình thức lựa chọn nhà thầu, loại hợp đồng, giai đoạn dự án** là danh mục mở, sửa ở Thiết lập; phần mềm không gắn điều khoản pháp luật vào các danh mục này.
