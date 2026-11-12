# Phòng Kế hoạch - Tài chính số

Phần mềm điều hành Phòng Kế hoạch - Tài chính, Sở Nông nghiệp và Môi trường tỉnh Sơn La: chức năng nhiệm vụ theo QĐ 324/QĐ-SNNMT, nhiệm vụ – văn bản giao việc, cán bộ – phân công, chương trình dự án, kế hoạch vốn – giải ngân, tài chính ngân sách, tài sản công, đấu thầu – hợp đồng, báo cáo; kết nối với phần mềm **Điều hành nhiệm vụ** và **Dự án đầu tư tỉnh Sơn La**.

Địa chỉ sử dụng: **https://phong-khtc-so.vercel.app**

Ứng dụng web một tệp, dữ liệu lưu trong IndexedDB của trình duyệt. Hướng dẫn sử dụng đầy đủ: [HUONG-DAN.md](HUONG-DAN.md).

## Cấu trúc mã nguồn

| Thư mục | Nội dung |
|---|---|
| `src/js/00-core.js` | Tiện ích: ngày, số, chuỗi, biểu tượng |
| `src/js/10-store.js` | Lớp dữ liệu: IndexedDB (dự phòng localStorage), lịch sử, sao lưu, bản chụp |
| `src/js/20-schema.js` | Khai báo mọi trường dữ liệu — form, bảng, Excel, kiểm tra, lịch sử sinh từ đây |
| `src/js/25-seed.js` | Danh mục 67 đầu mục chức năng (QĐ 324), cán bộ, đơn vị (TB 279) |
| `src/js/30-logic.js` | Nghiệp vụ: trạng thái, cảnh báo, trợ lý, đọc biểu giải ngân |
| `src/js/35-ketnoi.js` | Kết nối 2 phần mềm sẵn có |
| `src/js/40-ui.js` | Thành phần giao diện: cửa sổ, form, bảng, biểu đồ SVG, Gantt, Excel |
| `src/js/5x-view-*.js` | Các phân hệ |
| `src/js/90-app.js` | Khung, menu, điều hướng, khởi động |
| `vendor/` | SheetJS 0.18.5 (Apache-2.0), phông Be Vietnam Pro (OFL) |
| `gas/Code.gs` | Dịch vụ đồng bộ nhiều máy trên Google Apps Script (tùy chọn) |
| `assets/` | Biểu tượng, manifest |

## Build và kiểm thử

```bash
node build.js            # tạo dist/index.html (web) và dist/PhongKHTC-so.html (mở trực tiếp)
npm install              # chỉ cần cho kiểm thử
node tests/mock-server.js &
node tests/e2e.js /tmp <đường dẫn tệp Excel theo dõi giải ngân>
```

Kiểm thử kết nối dự án cần kho `du-an-dau-tu-son-la` ở `/home/user/du-an-dau-tu-son-la` (hoặc đặt biến `DA_REPO`).

## Triển khai

Vercel tự build khi đẩy lên nhánh `main` (cấu hình trong `vercel.json`: `node build.js`, thư mục `dist`).
