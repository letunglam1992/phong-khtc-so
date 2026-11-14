// Thư viện đọc Excel cho các công cụ kiểm tra chạy tay: dùng gói npm "xlsx" nếu đã cài, nếu không dùng bản có sẵn trong vendor/ (cùng phiên bản 0.18.5)
let X; try { X = require('xlsx'); } catch (e) { X = require('../vendor/xlsx.full.min.js'); const fs = require('fs'); X.readFile = (f, o) => X.read(fs.readFileSync(f), Object.assign({}, o, { type: 'buffer' })); }
// Công cụ chạy tay cần tệp Excel thật: báo cách dùng thay vì lỗi khó hiểu
X.canTep = (ten, moTa) => { if (process.argv.length > 2) return true; console.log('Cách dùng: node tests/' + ten + ' <tệp Excel> …\n' + moTa + '\n(Đây là công cụ kiểm tra chạy tay trên biểu thật, không phải bộ kiểm thử tự động. Kiểm thử tự động: node --test tests/tinh-toan.test.js)'); return false; };
module.exports = X;
