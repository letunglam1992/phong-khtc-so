/* ============================================================
   trich-van-ban.js — Nhận dạng loại văn bản và bóc tách thông tin
   Dùng chung: trình duyệt (phần mềm) và Google Apps Script (máy chủ quét thư mục Drive).
   - phanLoai(text): đoán loại văn bản theo câu chữ đặc trưng
   - trichQuyTac(text): bóc tách theo mẫu câu (không cần AI) — dự phòng khi AI không dùng được
   - LOI_NHAC_HE_THONG + loiNhacNguoiDung(text): lời nhắc cho AI, yêu cầu trả JSON theo cấu trúc cố định
   - docJson(text): đọc JSON trả về từ AI (chịu được ``` và chữ thừa)
   - chuanHoa(obj) / ghep(ai, quyTac): chuẩn hóa số tiền, ngày; bổ sung trường AI bỏ sót bằng kết quả quy tắc
   Không chứa khóa API, không gọi mạng.
   ============================================================ */
var TrichVB = (function () {
  'use strict';
  var LOAI = [
    ['khlcnt_qd', 'Quyết định phê duyệt kế hoạch lựa chọn nhà thầu'],
    ['khlcnt_trinh', 'Tờ trình, kế hoạch lựa chọn nhà thầu (chưa phê duyệt)'],
    ['lcnt_buoc', 'Văn bản trong quá trình lựa chọn nhà thầu (HSMT, HSYC, danh sách đáp ứng kỹ thuật…)'],
    ['kqlcnt_qd', 'Quyết định phê duyệt kết quả lựa chọn nhà thầu'],
    ['hop_dong', 'Hợp đồng'],
    ['phu_luc_hd', 'Phụ lục hợp đồng'],
    ['nghiem_thu', 'Biên bản nghiệm thu'],
    ['thanh_ly_hd', 'Biên bản thanh lý hợp đồng'],
    ['du_toan_qd', 'Quyết định giao, bổ sung, điều chỉnh, thu hồi dự toán'],
    ['khac', 'Văn bản khác']
  ];
  var MA_LOAI = LOAI.map(function (x) { return x[0]; });

  function boDau(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function gon(s) { return String(s == null ? '' : s).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ngayHopLe(y, m, d) {
    if (!(y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
    var t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
  }
  /** "05/11/2026" | "5-11-2026" | "ngày 5 tháng 11 năm 2026" | "2026-11-05" → "2026-11-05"; không đọc được → "" */
  function ngayISO(v) {
    if (v == null) return '';
    var s = String(v).trim(), m;
    if ((m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) { if (ngayHopLe(+m[1], +m[2], +m[3])) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]); }
    if ((m = boDau(s).match(/ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})/))) { if (ngayHopLe(+m[3], +m[2], +m[1])) return m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]); }
    if ((m = s.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})/))) { if (ngayHopLe(+m[3], +m[2], +m[1])) return m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]); }
    return '';
  }
  /** "1.234.567.890 đồng" | "1,5 tỷ đồng" | "350 triệu" | 1234 → số nguyên đồng; không đọc được → null */
  function soTien(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? Math.round(v) : null;
    var s = boDau(v).replace(/\s+/g, ' ').trim(), nhan = 1;
    if (/ty\b|ty dong/.test(s)) nhan = 1e9; else if (/trieu/.test(s)) nhan = 1e6; else if (/nghin|ngan\b/.test(s)) nhan = 1e3;
    var m = s.match(/-?\d[\d.,\s]*/); if (!m) return null;
    var t = m[0].replace(/\s/g, '');
    if (nhan > 1) { t = t.replace(/\./g, '').replace(',', '.'); }   // "1,5 tỷ"
    else {
      var dots = (t.match(/\./g) || []).length, commas = (t.match(/,/g) || []).length;
      if (dots && commas) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
      else if (dots > 1 || (dots === 1 && /\.\d{3}$/.test(t))) t = t.replace(/\./g, '');
      else if (commas > 1 || (commas === 1 && /,\d{3}$/.test(t))) t = t.replace(/,/g, '');
      else t = t.replace(',', '.');
    }
    var n = parseFloat(t); if (!isFinite(n)) return null;
    return Math.round(n * nhan);
  }

  /* ---------- Nhận dạng loại văn bản ---------- */
  // Văn bản các bước giữa KHLCNT và kết quả: [mẫu không dấu, tên bước (trùng danh mục "Bước" của phần mềm)]
  var BUOC_LCNT = [
    [/phe duyet danh sach nha thau dap ung (yeu cau )?(ve )?ky thuat/, 'Phê duyệt danh sách nhà thầu đáp ứng yêu cầu kỹ thuật'],
    [/phe duyet danh sach ngan/, 'Phê duyệt danh sách ngắn'],
    [/phe duyet ho so (moi thau|yeu cau|moi quan tam|moi so tuyen)/, 'Phê duyệt hồ sơ mời thầu, hồ sơ yêu cầu'],
    [/(phe duyet|thanh lap) to chuyen gia|thanh lap to tham dinh/, 'Thành lập tổ chuyên gia, tổ thẩm định']
  ];
  function buocLCNT(text) { var d = boDau(text).replace(/\s+/g, ' ').slice(0, 1500); for (var i = 0; i < BUOC_LCNT.length; i++) if (BUOC_LCNT[i][0].test(d)) return BUOC_LCNT[i][1]; return null; }
  /** Tên gói thầu nằm trong trích yếu: "…của gói thầu Tư vấn xây dựng…" */
  function tenGoiTuTrichYeu(ty) { var m = String(ty || '').match(/g[óo]i\s+th[ầa]u\s*(?:s[ốô]\s*\d+\s*[:.-]?\s*)?[:：]?\s*(.{6,})$/i); return m ? gon(m[1]).replace(/[.;,]\s*$/, '') : null; }
  function phanLoai(text) {
    var d = boDau(text).replace(/\s+/g, ' '), dau = d.slice(0, 2500);
    if (/thanh ly hop dong/.test(dau) && /bien ban/.test(dau)) return 'thanh_ly_hd';
    if (/phu luc hop dong/.test(dau)) return 'phu_luc_hd';
    if (/bien ban nghiem thu/.test(dau)) return 'nghiem_thu';
    if (BUOC_LCNT.some(function (b) { return b[0].test(dau.slice(0, 1500)); })) return 'lcnt_buoc';
    if (/phe duyet ket qua lua chon nha thau|phe duyet ket qua (dau thau|chi dinh thau|chao hang)/.test(dau)) return 'kqlcnt_qd';
    if (/quyet dinh/.test(dau) && /phe duyet ke hoach lua chon nha thau/.test(dau)) return 'khlcnt_qd';
    if (/ke hoach lua chon nha thau/.test(dau) && /to trinh|de nghi (tham dinh|phe duyet)/.test(dau)) return 'khlcnt_trinh';
    if (/quyet dinh/.test(dau) && /(giao|bo sung|dieu chinh|thu hoi|phan bo)[^.]{0,40}du toan/.test(dau)) return 'du_toan_qd';
    if (/hop dong/.test(dau.slice(0, 900)) && /ben (a|giao thau)/.test(d) && /ben (b|nhan thau)/.test(d)) return 'hop_dong';
    return 'khac';
  }

  /* ---------- Bóc tách theo mẫu câu ---------- */
  function sau(text, nhan, toiDa) {   // giá trị sau nhãn "Tên gói thầu:" trên cùng dòng
    var re = new RegExp('(?:^|\\n)\\s*(?:[-+•*]\\s*|\\d+[.)]\\s*|[a-zđ][.)]\\s*)?(?:' + nhan + ')\\s*[:：]\\s*([^\\n]{2,' + (toiDa || 300) + '})', 'i');
    var m = String(text).match(re); return m ? gon(m[1]).replace(/[;.,]\s*$/, '') : '';
  }
  function soVB(text) {
    var m = String(text).slice(0, 1500).match(/\bS[ốô]\s*[:：]?\s*([0-9]{1,6}\s*\/\s*[0-9]{0,4}\s*\/?\s*[A-ZĐ][A-ZĐ0-9\-–&]*(?:\s*-\s*[A-ZĐ0-9&]+)*)/);
    return m ? m[1].replace(/\s+/g, '').replace(/–/g, '-') : '';
  }
  function ngayVB(text) { return ngayVBct(text).ngay; }
  // {ngay, dau: 'co' (đọc từ dòng địa danh, ngày) | 'trong' (dòng ngày để trống — văn bản ký số) | 'khong'}
  function ngayVBct(text) {
    var t = String(text), dau = t.slice(0, 2500), m;
    var ky = t.match(/(?:Thời gian ký|Ngày ký|Ký ngày|Signing time|Date)\s*[:：]?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})/i), ngayKy = ky ? ngayISO(ky[1].replace(/\./g, '/')) : '';
    if ((m = dau.match(/[A-ZĐÂ][^\n,]{1,30},\s*ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/))) { var v = ngayISO('ngày ' + m[1] + ' tháng ' + m[2] + ' năm ' + m[3]); if (v) return { ngay: v, dau: 'co' }; }
    if (/[A-ZĐÂ][^\n,]{1,30},\s*ngày\s*(tháng|\.{2,}|…)/.test(dau) || /,\s*ngày\s+tháng\s+(\d{1,2}\s+)?năm/.test(dau)) return { ngay: ngayKy, dau: 'trong' };
    if (ngayKy) return { ngay: ngayKy, dau: 'khong' };
    // Không có dòng địa danh: lấy ngày đầu tiên không nằm sau "từ", "đến", "áp dụng"
    var re = /(từ|đến|trước|sau|áp dụng|kể từ)?\s*ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/gi, x;
    while ((x = re.exec(dau))) { if (!x[1]) { var w = ngayISO('ngày ' + x[2] + ' tháng ' + x[3] + ' năm ' + x[4]); if (w) return { ngay: w, dau: 'khong' }; } }
    return { ngay: '', dau: 'khong' };
  }
  function coQuan(text) {
    var dong = String(text).split('\n').slice(0, 8).map(gon).filter(Boolean), kq = '';
    for (var i = 0; i < dong.length; i++) {
      if (/CỘNG HÒA|CỘNG HOÀ|Độc lập/i.test(dong[i])) continue;
      if (/^(UBND|ỦY BAN|UỶ BAN|SỞ|BAN|PHÒNG|TRUNG TÂM|CHI CỤC|VĂN PHÒNG|CÔNG TY|BỘ)\b/.test(dong[i])) { kq = kq ? kq + ' ' + dong[i] : dong[i]; if (/^(SỞ|BAN|PHÒNG|TRUNG TÂM|CHI CỤC|VĂN PHÒNG|CÔNG TY|BỘ)\b/.test(dong[i])) break; }
    }
    return kq.replace(/\s+/g, ' ');
  }
  function trichYeu(text) {
    var t = String(text), m = t.match(/(?:QUYẾT ĐỊNH|TỜ TRÌNH|BIÊN BẢN|HỢP ĐỒNG|PHỤ LỤC HỢP ĐỒNG)\s*\n\s*([^\n]{8,240}(?:\n[^\n]{3,200}){0,2})/);
    if (m) { var s = gon(m[1]).split('\n'); var out = []; for (var i = 0; i < s.length; i++) { if (/^(Căn cứ|GIÁM ĐỐC|CHỦ TỊCH|Kính gửi|Số:|Hôm nay|Điều\s+\d|QUYẾT ĐỊNH|[-+•*]\s)/i.test(s[i])) break; out.push(s[i]); } if (out.length) return out.join(' ').replace(/\s+/g, ' '); }
    var v = t.match(/V\/v\s*([^\n]{5,240})/i); return v ? gon(v[1]) : '';
  }
  function tien(text, nhan) { var s = sau(text, nhan, 200); return s ? soTien(s) : null; }
  function trichQuyTac(text) {
    var t = gon(text), loai = phanLoai(t), nv = ngayVBct(t), r = { loai: loai, so_van_ban: soVB(t) || null, ngay_van_ban: nv.ngay || null, ngay_dau: nv.dau, so_trong: /\bS[ốô]\s*[:：]?\s*\/\s*[A-ZĐ]/.test(t.slice(0, 1500)) || undefined, co_quan_ban_hanh: coQuan(t) || null, trich_yeu: trichYeu(t) || null, nguon_trich: 'quy_tac' };
    var tenDA = sau(t, 'Tên dự án|Tên nhiệm vụ|Tên dự toán|Dự án|Nhiệm vụ', 250); if (tenDA) r.ten_du_an_nhiem_vu = tenDA;
    var goi = { ten: sau(t, 'Tên gói thầu', 300) || null, gia_goi_thau: tien(t, 'Giá gói thầu'), nguon_von: sau(t, 'Nguồn vốn', 200) || null, hinh_thuc_lcnt: sau(t, 'Hình thức lựa chọn nhà thầu', 150) || null, phuong_thuc: sau(t, 'Phương thức lựa chọn nhà thầu', 150) || null, thoi_gian_bat_dau_lcnt: sau(t, 'Thời gian (?:bắt đầu )?tổ chức lựa chọn nhà thầu', 150) || null, loai_hop_dong: sau(t, 'Loại hợp đồng', 100) || null, thoi_gian_thuc_hien_hd: sau(t, 'Thời gian thực hiện (?:gói thầu|hợp đồng)', 150) || null };
    if (loai === 'khlcnt_qd' || loai === 'khlcnt_trinh') r.goi_thau = goi.ten || goi.gia_goi_thau ? [goi] : [];
    var tenTY = tenGoiTuTrichYeu(r.trich_yeu);
    if (loai === 'lcnt_buoc') r.lcnt_buoc = { ten_goi_thau: goi.ten || tenTY, buoc: buocLCNT(t) };
    if (loai === 'kqlcnt_qd') r.ket_qua = { ten_goi_thau: goi.ten || tenTY, nha_thau: sau(t, 'Tên nhà thầu(?: trúng thầu)?|Nhà thầu trúng thầu|Đơn vị trúng thầu', 250) || null, gia_trung_thau: tien(t, 'Giá trúng thầu|Giá đề nghị trúng thầu'), thoi_gian_thuc_hien_hd: goi.thoi_gian_thuc_hien_hd, loai_hop_dong: goi.loai_hop_dong };
    if (loai === 'hop_dong') {
      var so = (t.match(/H[ỢO]P Đ[ỒO]NG[^\n]*\n?\s*S[ốô]\s*[:：]?\s*([^\n]{3,60})/i) || [])[1] || r.so_van_ban || '';
      r.hop_dong = { so_hop_dong: gon(so).replace(/\s+/g, '') || null, ngay_ky: r.ngay_van_ban, ten: sau(t, 'Tên hợp đồng|Gói thầu|Tên gói thầu', 300) || r.trich_yeu, ten_goi_thau: goi.ten || tenTY, nha_thau: sau(t, 'Bên B|Bên nhận thầu|Nhà thầu|Bên nhận', 250) || null, ben_a: sau(t, 'Bên A|Bên giao thầu|Chủ đầu tư', 250) || null, gia_tri: tien(t, 'Giá (?:trị )?hợp đồng|Tổng giá trị hợp đồng|Giá hợp đồng'), loai_hop_dong: goi.loai_hop_dong, thoi_gian_thuc_hien: goi.thoi_gian_thuc_hien_hd, tam_ung: tien(t, 'Tạm ứng|Giá trị tạm ứng|Mức tạm ứng'), bao_lanh_thuc_hien: tien(t, 'Bảo đảm thực hiện hợp đồng|Bảo lãnh thực hiện hợp đồng') };
    }
    if (loai === 'phu_luc_hd') r.phu_luc = { so_hop_dong: sau(t, 'Hợp đồng số|Căn cứ Hợp đồng số', 80) || null, so_phu_luc: r.so_van_ban, noi_dung: r.trich_yeu, gia_tri_dieu_chinh: tien(t, 'Giá trị điều chỉnh|Giá trị tăng|Giá trị giảm'), gia_han_den: ngayISO(sau(t, 'Gia hạn (?:thời gian thực hiện )?(?:hợp đồng )?đến', 80)) || null };
    if (loai === 'nghiem_thu') r.nghiem_thu = { so_hop_dong: sau(t, 'Hợp đồng số|Căn cứ Hợp đồng số', 80) || null, noi_dung: r.trich_yeu, gia_tri: tien(t, 'Giá trị nghiệm thu|Giá trị khối lượng hoàn thành|Giá trị đề nghị thanh toán') };
    if (loai === 'thanh_ly_hd') r.thanh_ly = { so_hop_dong: sau(t, 'Hợp đồng số|Căn cứ Hợp đồng số', 80) || null, gia_tri_quyet_toan: tien(t, 'Giá trị quyết toán|Giá trị thanh lý|Giá trị hoàn thành'), da_thanh_toan: tien(t, 'Đã thanh toán|Giá trị đã thanh toán') };
    if (loai === 'du_toan_qd') { var dd = boDau(t.slice(0, 1500)); r.du_toan = { loai_dieu_chinh: /thu hoi/.test(dd) ? 'thu_hoi' : /bo sung/.test(dd) ? 'bo_sung' : /dieu chinh/.test(dd) ? 'dieu_chinh' : 'giao', dong: [], tong_so_tien: tien(t, 'Tổng (?:số )?(?:kinh phí|dự toán|số tiền)') } ; }
    return r;
  }

  /* ---------- Lời nhắc AI ---------- */
  var LOI_NHAC_HE_THONG = [
    'Bạn là chuyên viên Phòng Kế hoạch - Tài chính, Sở Nông nghiệp và Môi trường tỉnh Sơn La. Nhiệm vụ: đọc văn bản và trích thông tin để nhập vào phần mềm quản lý.',
    'Trả về DUY NHẤT một đối tượng JSON hợp lệ, không giải thích, không dùng ```.',
    'Quy tắc bắt buộc:',
    '1. Chỉ lấy thông tin có trong văn bản. Không có thì để null. Không suy đoán, không tự tính.',
    '2. Số tiền ghi số nguyên, đơn vị đồng, không dấu chấm, dấu phẩy (ví dụ 1250000000).',
    '3. Ngày ghi dạng dd/mm/yyyy. "ngay_van_ban" là ngày ban hành ở dòng "<địa danh>, ngày … tháng … năm …" dưới số văn bản, KHÔNG lấy ngày nằm trong trích yếu hay nội dung (ví dụ "áp dụng từ ngày …"). Văn bản ký số để trống số hoặc ngày thì để null.',
    '4. "loai" là một trong: khlcnt_qd (QĐ phê duyệt kế hoạch lựa chọn nhà thầu), khlcnt_trinh (tờ trình/KHLCNT chưa phê duyệt), lcnt_buoc (QĐ, văn bản các bước giữa KHLCNT và kết quả: phê duyệt hồ sơ mời thầu/hồ sơ yêu cầu, danh sách nhà thầu đáp ứng yêu cầu kỹ thuật, danh sách ngắn, thành lập tổ chuyên gia), kqlcnt_qd (QĐ phê duyệt kết quả lựa chọn nhà thầu), hop_dong, phu_luc_hd, nghiem_thu, thanh_ly_hd, du_toan_qd (QĐ giao/bổ sung/điều chỉnh/thu hồi dự toán), khac.',
    '5. Bảng danh mục gói thầu: mỗi dòng gói thầu là một phần tử của "goi_thau", giữ nguyên tên gói thầu.',
    '6. "trich_dan": với mỗi số tiền, ghi nguyên văn ngắn (dưới 120 ký tự) câu chứa số tiền đó để người duyệt đối chiếu.',
    'Cấu trúc JSON (chỉ điền phần đúng với loại văn bản, phần khác để null):',
    '{"loai":"","so_van_ban":null,"ngay_van_ban":null,"co_quan_ban_hanh":null,"trich_yeu":null,"ten_du_an_nhiem_vu":null,',
    '"goi_thau":[{"ten":null,"gia_goi_thau":null,"nguon_von":null,"hinh_thuc_lcnt":null,"phuong_thuc":null,"thoi_gian_bat_dau_lcnt":null,"loai_hop_dong":null,"thoi_gian_thuc_hien_hd":null}],',
    '"lcnt_buoc":{"ten_goi_thau":null,"buoc":null},',
    '"ket_qua":{"ten_goi_thau":null,"nha_thau":null,"gia_trung_thau":null,"thoi_gian_thuc_hien_hd":null,"loai_hop_dong":null},',
    '"hop_dong":{"so_hop_dong":null,"ngay_ky":null,"ten":null,"ten_goi_thau":null,"ben_a":null,"nha_thau":null,"gia_tri":null,"loai_hop_dong":null,"ngay_bat_dau":null,"ngay_ket_thuc":null,"thoi_gian_thuc_hien":null,"tam_ung":null,"bao_lanh_thuc_hien":null,"bao_lanh_thuc_hien_den":null},',
    '"phu_luc":{"so_hop_dong":null,"so_phu_luc":null,"noi_dung":null,"gia_tri_dieu_chinh":null,"gia_han_den":null},',
    '"nghiem_thu":{"so_hop_dong":null,"noi_dung":null,"gia_tri":null},',
    '"thanh_ly":{"so_hop_dong":null,"gia_tri_quyet_toan":null,"da_thanh_toan":null},',
    '"du_toan":{"loai_dieu_chinh":null,"tong_so_tien":null,"dong":[{"don_vi":null,"noi_dung":null,"so_tien":null}]},',
    '"trich_dan":{}}'
  ].join('\n');
  var TOI_DA_KY_TU = 14000;
  function loiNhacNguoiDung(text, tenTep) {
    var t = gon(text), cat = t.length > TOI_DA_KY_TU;
    return 'Văn bản' + (tenTep ? ' "' + tenTep + '"' : '') + (cat ? ' (đã cắt, chỉ gửi ' + TOI_DA_KY_TU + ' ký tự đầu)' : '') + ':\n\n' + t.slice(0, TOI_DA_KY_TU);
  }

  /* ---------- Đọc, chuẩn hóa kết quả ---------- */
  function docJson(text) {
    var s = String(text || '').replace(/```(?:json)?/gi, '').trim(), a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('AI không trả về JSON');
    var j = s.slice(a, b + 1);
    try { return JSON.parse(j); }
    catch (e) { return JSON.parse(j.replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"')); }
  }
  var TRUONG_TIEN = { goi_thau: ['gia_goi_thau'], ket_qua: ['gia_trung_thau'], hop_dong: ['gia_tri', 'tam_ung', 'bao_lanh_thuc_hien'], phu_luc: ['gia_tri_dieu_chinh'], nghiem_thu: ['gia_tri'], thanh_ly: ['gia_tri_quyet_toan', 'da_thanh_toan'], du_toan: ['tong_so_tien'] };
  var TRUONG_NGAY = { hop_dong: ['ngay_ky', 'ngay_bat_dau', 'ngay_ket_thuc', 'bao_lanh_thuc_hien_den'], phu_luc: ['gia_han_den'] };
  function rong(v) { return v == null || v === '' || (typeof v === 'string' && /^(null|không có|khong co|n\/a|-)$/i.test(v.trim())); }
  function chuanHoa(o) {
    o = o && typeof o === 'object' ? o : {};
    var r = {};
    Object.keys(o).forEach(function (k) { r[k] = o[k]; });
    if (MA_LOAI.indexOf(r.loai) < 0) r.loai = 'khac';
    ['so_van_ban', 'co_quan_ban_hanh', 'trich_yeu', 'ten_du_an_nhiem_vu'].forEach(function (k) { r[k] = rong(r[k]) ? null : gon(r[k]); });
    if (r.so_van_ban) r.so_van_ban = r.so_van_ban.replace(/^S[ốô]\s*[:：]?\s*/i, '').replace(/\s+/g, '');
    if (r.so_van_ban && !/^\d/.test(r.so_van_ban)) { r.so_van_ban = null; r.so_trong = true; }   // "/QĐ-SNNMT": văn bản ký số, số nằm ở chữ ký
    r.ngay_van_ban = rong(r.ngay_van_ban) ? null : (ngayISO(r.ngay_van_ban) || null);
    var lam = function (obj, sec) {
      if (!obj || typeof obj !== 'object') return obj;
      Object.keys(obj).forEach(function (k) { if (rong(obj[k])) obj[k] = null; else if (typeof obj[k] === 'string') obj[k] = gon(obj[k]); });
      (TRUONG_TIEN[sec] || []).forEach(function (k) { if (obj[k] != null) obj[k] = soTien(obj[k]); });
      (TRUONG_NGAY[sec] || []).forEach(function (k) { if (obj[k] != null) obj[k] = ngayISO(obj[k]) || null; });
      return obj;
    };
    if (Array.isArray(r.goi_thau)) r.goi_thau = r.goi_thau.map(function (g) { return lam(g, 'goi_thau'); }).filter(function (g) { return g && (g.ten || g.gia_goi_thau); }); else r.goi_thau = [];
    ['lcnt_buoc', 'ket_qua', 'hop_dong', 'phu_luc', 'nghiem_thu', 'thanh_ly', 'du_toan'].forEach(function (k) { if (r[k] && typeof r[k] === 'object') r[k] = lam(r[k], k); else r[k] = null; });
    if (r.du_toan && Array.isArray(r.du_toan.dong)) r.du_toan.dong = r.du_toan.dong.map(function (d) { return { don_vi: rong(d && d.don_vi) ? null : gon(d.don_vi), noi_dung: rong(d && d.noi_dung) ? null : gon(d.noi_dung), so_tien: soTien(d && d.so_tien) }; }).filter(function (d) { return d.noi_dung || d.so_tien; });
    if (r.trich_dan && typeof r.trich_dan !== 'object') r.trich_dan = {};
    return r;
  }
  /** Ưu tiên AI; trường AI để trống thì lấy từ quy tắc. Ghi lại trường nào lấy từ đâu. */
  function ghep(ai, qt) {
    var a = chuanHoa(ai), q = chuanHoa(qt), bu = [];
    if (a.so_van_ban && q.so_van_ban && a.so_van_ban !== q.so_van_ban && /^\d/.test(q.so_van_ban)) { a.so_van_ban = q.so_van_ban; bu.push('so_van_ban'); }
    if (a.loai === 'khac' && q.loai !== 'khac') { a.loai = q.loai; bu.push('loai'); }
    ['so_van_ban', 'ngay_van_ban', 'co_quan_ban_hanh', 'trich_yeu', 'ten_du_an_nhiem_vu'].forEach(function (k) { if (!a[k] && q[k]) { a[k] = q[k]; bu.push(k); } });
    if (qt && qt.ngay_dau === 'co' && q.ngay_van_ban && a.ngay_van_ban !== q.ngay_van_ban) { a.ngay_van_ban = q.ngay_van_ban; bu.push('ngay_van_ban'); }
    if (qt && qt.ngay_dau === 'trong') { a.ngay_van_ban = q.ngay_van_ban || null; a.ngay_trong = true; }
    if (qt && qt.so_trong) a.so_trong = true;
    if (q.loai === 'lcnt_buoc' && a.loai === 'kqlcnt_qd') { a.loai = 'lcnt_buoc'; bu.push('loai'); }
    ['lcnt_buoc', 'ket_qua', 'hop_dong', 'phu_luc', 'nghiem_thu', 'thanh_ly', 'du_toan'].forEach(function (k) {
      if (!q[k]) return; if (!a[k]) { a[k] = q[k]; bu.push(k); return; }
      Object.keys(q[k]).forEach(function (f) { if (a[k][f] == null && q[k][f] != null && f !== 'dong') { a[k][f] = q[k][f]; bu.push(k + '.' + f); } });
    });
    if (!a.goi_thau.length && q.goi_thau.length) { a.goi_thau = q.goi_thau; bu.push('goi_thau'); }
    a.bo_sung_quy_tac = bu; a.nguon_trich = 'ai';
    return a;
  }
  /** Mức giống nhau của hai tên (0..1) theo tập từ — dùng để gợi ý gói thầu, hợp đồng đã có */
  function giongTen(a, b) {
    var ta = boDau(a).split(/[^a-z0-9]+/).filter(function (x) { return x.length > 1; }), tb = boDau(b).split(/[^a-z0-9]+/).filter(function (x) { return x.length > 1; });
    if (!ta.length || !tb.length) return 0;
    var sb = {}; tb.forEach(function (x) { sb[x] = 1; }); var chung = ta.filter(function (x) { return sb[x]; }).length;
    return 2 * chung / (ta.length + tb.length);
  }
  return { LOAI: LOAI, buocLCNT: buocLCNT, tenGoiTuTrichYeu: tenGoiTuTrichYeu, ngayVBct: ngayVBct, boDau: boDau, ngayISO: ngayISO, soTien: soTien, phanLoai: phanLoai, trichQuyTac: trichQuyTac, LOI_NHAC_HE_THONG: LOI_NHAC_HE_THONG, loiNhacNguoiDung: loiNhacNguoiDung, docJson: docJson, chuanHoa: chuanHoa, ghep: ghep, giongTen: giongTen, TOI_DA_KY_TU: TOI_DA_KY_TU };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TrichVB;
