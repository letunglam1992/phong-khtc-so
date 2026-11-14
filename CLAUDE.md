# Phòng KH-TC số

Ứng dụng web một tệp (Vercel) + máy chủ Google Apps Script. Mã nguồn ở `src/`, `node build.js` đóng gói ra `dist/` (không sửa `dist/`). Bảng cấu trúc: xem `README.md`.

## Cách sửa mã (tiết kiệm token)
- Sửa bằng Edit đúng đoạn cần đổi. Không dùng Write ghi đè tệp đã có, không in lại cả tệp.
- Tìm vị trí bằng Grep trước, rồi Read có offset/limit quanh dòng đó. Nhiều tệp 30–90 KB, không đọc cả tệp.
- Không đọc `vendor/`, `dist/`, `package-lock.json`, `tests/e2e.js`, `HUONG-DAN.md` (trừ khi được yêu cầu).
- Không refactor, không đổi tên, không sửa ngoài phạm vi yêu cầu.
- Công thức nghiệp vụ đã có: không tự sửa. Gặp mâu thuẫn số liệu hoặc căn cứ pháp lý: nêu rõ và hỏi lại, không tự quyết.
- Báo cáo cuối lượt tối đa 8 dòng: tệp nào, hàm nào đã đổi, cách kiểm tra. Không mô tả lại tính năng.
- Chỉ cập nhật `HUONG-DAN.md` khi được yêu cầu.

## gas/Code.gs (máy chủ Apps Script)
- Dòng 1–460: phần máy chủ, sửa trực tiếp.
- Từ dòng `// @@BEGIN ai-tien-ich` đến hết tệp: bản chép tự động từ `src/shared/*.js`. KHÔNG sửa trong Code.gs; sửa `src/shared/` rồi chạy `node build.js`.
- Sau khi đổi Code.gs, ghi rõ tên các hàm đã đổi và nhắc: dán lại vào Apps Script → Triển khai → Quản lý triển khai → Sửa → Phiên bản mới.

## Kiểm thử (chỉ chạy phần liên quan)
- Đổi `gas/` hoặc `src/shared/`: `node --test tests/gas.test.js tests/trich-van-ban.test.js`
- Đổi kiểm kê, nhà đất, ngân sách: `node --test tests/kiemke.test.js` (hoặc `nhadat.test.js`, `budget.test.js`)
- Đổi giao diện `src/js/`: `node build.js` để chắc chắn build chạy được.
- `tests/e2e.js` cần các tệp Excel đầu vào, chỉ chạy khi được yêu cầu.

## Git
- Nhánh `main` tự triển khai lên Vercel. Không push `main` khi chưa được yêu cầu.
