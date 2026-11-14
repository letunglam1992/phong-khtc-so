// Đo độ chính xác bóc tách trên văn bản thật (văn bản và đáp án KHÔNG đưa vào kho mã):
//   node tests/do-chinh-xac.js <thư mục .txt> <tệp đáp án .js> [layout|raw]
// Lấy chữ PDF: pdftotext -layout tệp.pdf <id>.txt (giống cách phần mềm dựng dòng bằng pdf.js trên trình duyệt)
const T = require(require('path').join(__dirname, '../src/shared/trich-van-ban.js')), fs = require('fs'), DA = require(require('path').resolve(process.argv[3]));
const dir = process.argv[2], kieu = process.argv[4] || 'layout'; let dung = 0, tong = 0;
const kt = (ten, ok, thuc) => { tong++; if (ok) dung++; else console.log('   SAI ' + ten + ': ' + JSON.stringify(thuc)); };
const khop = (re, v) => re instanceof RegExp ? re.test(String(v || '')) : re === v;
for (const id of Object.keys(DA)) {
  const t = fs.readFileSync(dir + '/' + id + (kieu === 'raw' ? '.raw' : '') + '.txt', 'utf8'), r = T.trichQuyTac(t), d = DA[id];
  console.log('== ' + id + ' (' + d.loai + ')');
  kt('loai', r.loai === d.loai, r.loai); kt('so', r.so_van_ban === d.so, r.so_van_ban); kt('ngay', r.ngay_van_ban === d.ngay, r.ngay_van_ban);
  if (d.goi) { kt('so goi', (r.goi_thau || []).length === d.goi.length, (r.goi_thau || []).length); d.goi.forEach((g, i) => { const x = (r.goi_thau || [])[i] || {}; kt('goi' + i + '.ten', khop(g.ten, x.ten), x.ten); kt('goi' + i + '.gia', x.gia_goi_thau === g.gia, x.gia_goi_thau); kt('goi' + i + '.ht', khop(g.ht, x.hinh_thuc_lcnt), x.hinh_thuc_lcnt); kt('goi' + i + '.loaiHD', khop(g.loaiHD, x.loai_hop_dong), x.loai_hop_dong); kt('goi' + i + '.tg', khop(g.tg, x.thoi_gian_thuc_hien_hd), x.thoi_gian_thuc_hien_hd); kt('goi' + i + '.bd', khop(g.bd, x.thoi_gian_bat_dau_lcnt), x.thoi_gian_bat_dau_lcnt); }); }
  if (d.kq) { const k = r.ket_qua || {}; kt('kq.ten', khop(d.kq.ten, k.ten_goi_thau), k.ten_goi_thau); kt('kq.nhaThau', khop(d.kq.nt, k.nha_thau), k.nha_thau); kt('kq.giaTrung', k.gia_trung_thau === d.kq.gt, k.gia_trung_thau); if (d.kq.giaGoi) kt('kq.giaGoi', k.gia_goi_thau === d.kq.giaGoi, k.gia_goi_thau); if (d.kq.tbmt) kt('kq.tbmt', k.so_tbmt === d.kq.tbmt, k.so_tbmt); kt('kq.loaiHD', khop(d.kq.loaiHD, k.loai_hop_dong), k.loai_hop_dong); kt('kq.tg', khop(d.kq.tg, k.thoi_gian_thuc_hien_hd), k.thoi_gian_thuc_hien_hd); }
}
console.log('\nĐÚNG ' + dung + '/' + tong + ' trường (' + Math.round(dung / tong * 100) + '%)');
