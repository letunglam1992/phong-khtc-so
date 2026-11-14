/* ============================================================
   nhac-viec.js — Bản tin nhắc việc (hợp đồng sắp hết hạn, bảo lãnh sắp hết hiệu lực, nội dung giải ngân chậm),
   dùng chung trình duyệt (xem trước) và Code.gs (gửi email sáng thứ Hai). UMD: var NhacViec. ES5 để chạy được trên Apps Script.
   Quy tắc trùng với phần mềm: thời hạn HĐ = ngày kết thúc hoặc ngày gia hạn muộn nhất ở phụ lục (L.hdHan);
   bảo lãnh xét như L.hd; nội dung chậm = còn phải giải ngân và tỷ lệ thấp hơn mốc so sánh (mục tiêu tháng nếu đã đặt,
   nếu không thì tỷ lệ thời gian) từ ngưỡng "gnLech" điểm % trở lên (như L.gnDong).
   ============================================================ */
var NhacViec = (function () {
  'use strict';
  function num(v) { var n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
  function iso(d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d); }
  function ngay(a, b) { return Math.round((Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)) - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))) / 86400000); }
  function dd(d) { return iso(d) ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : ''; }
  function tien(v) { var n = num(v), a = Math.abs(n); return a >= 1e9 ? (n / 1e9).toFixed(2).replace('.', ',') + ' tỷ' : a >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' triệu' : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sum(a, f) { var t = 0; (a || []).forEach(function (x) { t += num(f(x)); }); return t; }
  function nsTong(x) { return num(x.chuyenNguon) + num(x.duToan) + num(x.boSung) + num(x.dcTang) - num(x.dcGiam) - num(x.thuHoi) - num(x.tietKiem); }
  function hdHan(h) { var g = (h.phuLuc || []).map(function (x) { return x.giaHanDen; }).filter(iso).sort().pop(); return g && (!h.ngayKT || g > h.ngayKT) ? g : (h.ngayKT || ''); }

  /**
   * data: { hopdong:[], ngansach:[], canbo:[], donvi:[] }
   * o: { today:'YYYY-MM-DD', sapHet: số ngày (mặc định 30), gnLech: điểm % (mặc định 20), mucTieu: {nam:[12 số %]} , canBoId: lọc theo cán bộ }
   * Trả về { hd:[], bl:[], gn:[], nam, asOf }
   */
  function tomTat(data, o) {
    o = o || {};
    var today = o.today, sapHet = o.sapHet || 30, gnLech = o.gnLech || 20, cb = o.canBoId || '';
    var dv = {}; (data.donvi || []).forEach(function (d) { dv[d.id] = d.tenTat || d.ten; });
    var cbTen = {}; (data.canbo || []).forEach(function (c) { cbTen[c.id] = c.hoTen; });
    var out = { hd: [], bl: [], gn: [], nam: +today.slice(0, 4), asOf: '' };
    (data.hopdong || []).forEach(function (h) {
      if (cb && h.canBoId !== cb) return;
      var tt = h.trangThai || 'dang', ten = (h.so || '') + (h.ten ? ' — ' + h.ten : ''), nguoi = cbTen[h.canBoId] || '';
      var han = hdHan(h);
      if (tt === 'dang' && iso(han)) { var con = ngay(han, today); if (con <= sapHet) out.hd.push({ ten: ten, nhaThau: h.nhaThau || '', han: han, con: con, cb: nguoi }); }
      var chuaTL = tt !== 'thanhly' && tt !== 'chamdut', tuCon = Math.max(0, num(h.tamUng) - num(h.tamUngThuHoi));
      var xet = function (d, loai) { if (!iso(d)) return; var c = ngay(d, today); if (c <= sapHet) out.bl.push({ ten: ten, loai: loai, han: d, con: c, cb: nguoi }); };
      if (chuaTL && tt !== 'nghiemthu') xet(h.baoLanhTHHan, 'Bảo đảm thực hiện hợp đồng');
      if (chuaTL && tuCon > 0.5) xet(h.baoLanhTUHan, 'Bảo lãnh tạm ứng (còn ' + tien(tuCon) + ' chưa thu hồi)');
    });
    out.hd.sort(function (a, b) { return a.con - b.con; }); out.bl.sort(function (a, b) { return a.con - b.con; });
    // Giải ngân: các dòng chi tiết (không có dòng con) của năm hiện hành
    var nam = out.nam, ns = (data.ngansach || []).filter(function (r) { return +r.nam === nam; }), cha = {};
    ns.forEach(function (r) { if (r.parentId) cha[r.parentId] = 1; });
    var la = ns.filter(function (r) { return !cha[r.id]; });
    var ds = []; la.forEach(function (r) { (r.gnHist || []).forEach(function (x) { if (iso(x.ngay) && +x.ngay.slice(0, 4) === nam) ds.push(x.ngay); }); if (iso(r.ngayGN) && +r.ngayGN.slice(0, 4) === nam) ds.push(r.ngayGN); });
    ds.sort(); var asOf = ds.length ? ds[ds.length - 1] : today; out.asOf = asOf;
    var d0 = nam + '-01-01', soNgay = ngay(nam + '-12-31', d0) + 1, daQua = Math.max(0, Math.min(soNgay, ngay(asOf, d0) + 1)), tyLeTG = daQua / soNgay * 100;
    var mt = (o.mucTieu || {})[nam], tuDat = mt && mt.length === 12 && mt.some(function (v) { return num(v) > 0; }), thang = +asOf.slice(5, 7);
    var chuan = tuDat ? num(mt[thang - 1]) : tyLeTG; out.chuan = chuan; out.tuDat = !!tuDat;
    var tong = 0, gn = 0;
    la.forEach(function (r) {
      var t = nsTong(r), g = num(r.giaiNgan); if (!(t > 0)) return;
      if (!cb || r.canBoId === cb) { tong += t; gn += g; }
      var ty = g / t * 100, conLai = t - g;
      if (conLai > 0.5 && ty - chuan <= -gnLech && (!cb || r.canBoId === cb)) out.gn.push({ ten: (r.stt ? r.stt + ' ' : '') + r.noiDung, dv: dv[r.donViId] || '', tong: t, gn: g, con: conLai, ty: ty, cb: cbTen[r.canBoId] || '' });
    });
    out.gn.sort(function (a, b) { return b.con - a.con; });
    out.tong = tong; out.daGN = gn; out.tyLe = tong ? gn / tong * 100 : 0;
    return out;
  }

  /** Thư HTML (và tiêu đề) từ kết quả tomTat. o: { ten: tên người nhận, coQuan, url } */
  function thu(t, o) {
    o = o || {};
    var n = t.hd.length + t.bl.length + t.gn.length;
    var td = 'Nhắc việc tuần ' + dd(o.today || '') + ': ' + t.hd.length + ' hợp đồng, ' + t.bl.length + ' bảo lãnh, ' + t.gn.length + ' nội dung giải ngân chậm';
    var th = 'style="border:1px solid #d9d9d9;padding:6px 8px;background:#f3f5f2;text-align:left;font-size:13px"', tdS = 'style="border:1px solid #d9d9d9;padding:6px 8px;font-size:13px;vertical-align:top"', tdR = 'style="border:1px solid #d9d9d9;padding:6px 8px;font-size:13px;text-align:right;white-space:nowrap"';
    var bang = function (cols, rows) { return '<table style="border-collapse:collapse;width:100%;margin:6px 0 16px">' + '<tr>' + cols.map(function (c) { return '<th ' + th + '>' + c + '</th>'; }).join('') + '</tr>' + rows.join('') + '</table>'; };
    var conTxt = function (c) { return c < 0 ? '<b style="color:#b42318">Quá ' + (-c) + ' ngày</b>' : c === 0 ? '<b style="color:#b42318">Hôm nay</b>' : 'Còn ' + c + ' ngày'; };
    var h = '<div style="font-family:Arial,sans-serif;color:#1c2521;max-width:900px">';
    h += '<p>Kính gửi ' + esc(o.ten || 'anh/chị') + ',</p><p>Phần mềm Phòng KH-TC số tổng hợp các việc cần chú ý trong tuần' + (o.coQuan ? ' (' + esc(o.coQuan) + ')' : '') + ':</p>';
    if (!n) h += '<p style="color:#2e7d32"><b>Không có hợp đồng sắp hết hạn, bảo lãnh sắp hết hiệu lực hay nội dung giải ngân chậm.</b></p>';
    if (t.hd.length) h += '<h3 style="font-size:15px;margin:12px 0 4px">1. Hợp đồng sắp hết hạn, quá hạn (' + t.hd.length + ')</h3>' + bang(['Hợp đồng', 'Nhà thầu', 'Thời hạn', 'Tình trạng', 'Cán bộ'], t.hd.map(function (x) { return '<tr><td ' + tdS + '>' + esc(x.ten) + '</td><td ' + tdS + '>' + esc(x.nhaThau) + '</td><td ' + tdS + '>' + dd(x.han) + '</td><td ' + tdS + '>' + conTxt(x.con) + '</td><td ' + tdS + '>' + esc(x.cb) + '</td></tr>'; }));
    if (t.bl.length) h += '<h3 style="font-size:15px;margin:12px 0 4px">2. Bảo lãnh sắp hết hiệu lực (' + t.bl.length + ')</h3>' + bang(['Hợp đồng', 'Loại bảo lãnh', 'Hiệu lực đến', 'Tình trạng', 'Cán bộ'], t.bl.map(function (x) { return '<tr><td ' + tdS + '>' + esc(x.ten) + '</td><td ' + tdS + '>' + esc(x.loai) + '</td><td ' + tdS + '>' + dd(x.han) + '</td><td ' + tdS + '>' + conTxt(x.con) + '</td><td ' + tdS + '>' + esc(x.cb) + '</td></tr>'; }));
    if (t.gn.length) h += '<h3 style="font-size:15px;margin:12px 0 4px">3. Nội dung giải ngân chậm năm ' + t.nam + ' (' + t.gn.length + ')</h3><p style="font-size:13px;margin:0">Số liệu đến ngày ' + dd(t.asOf) + '. Đã giải ngân ' + t.tyLe.toFixed(1).replace('.', ',') + '% (' + tien(t.daGN) + '/' + tien(t.tong) + '); mốc so sánh ' + t.chuan.toFixed(1).replace('.', ',') + '% (' + (t.tuDat ? 'mục tiêu tháng' : 'tỷ lệ thời gian') + ').</p>' +
      bang(['Nội dung', 'Đơn vị', 'Được sử dụng', 'Đã giải ngân', 'Còn lại', 'Tỷ lệ', 'Cán bộ'], t.gn.slice(0, 40).map(function (x) { return '<tr><td ' + tdS + '>' + esc(x.ten) + '</td><td ' + tdS + '>' + esc(x.dv) + '</td><td ' + tdR + '>' + tien(x.tong) + '</td><td ' + tdR + '>' + tien(x.gn) + '</td><td ' + tdR + '>' + tien(x.con) + '</td><td ' + tdR + '>' + x.ty.toFixed(1).replace('.', ',') + '%</td><td ' + tdS + '>' + esc(x.cb) + '</td></tr>'; })) + (t.gn.length > 40 ? '<p style="font-size:13px">… và ' + (t.gn.length - 40) + ' nội dung khác.</p>' : '');
    h += (o.url ? '<p><a href="' + esc(o.url) + '">Mở phần mềm để xem chi tiết</a></p>' : '') + '<p style="color:#667;font-size:12px">Thư gửi tự động mỗi sáng thứ Hai từ dữ liệu đã đồng bộ lên máy chủ. Số liệu chỉ đúng tới lần đồng bộ gần nhất.</p></div>';
    return { tieuDe: td, html: h, soViec: n };
  }
  return { tomTat: tomTat, thu: thu, hdHan: hdHan };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = NhacViec;
