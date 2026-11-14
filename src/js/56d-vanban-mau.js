/* ============================================================
   56d-vanban-mau.js — Sinh văn bản từ dữ liệu (thể thức Nghị định 30/2020/NĐ-CP), xuất Word để sửa
   Tờ trình, quyết định phê duyệt KHLCNT (từ gói thầu); biên bản nghiệm thu, thanh lý (từ hợp đồng);
   công văn đôn đốc giải ngân (từ số giải ngân). Văn bản là bản dự thảo: người soạn rà soát căn cứ, số liệu trước khi trình ký.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const fm = v => U.fmtMoney(U.num(v));

  /* ---------- Cấu hình văn bản (Thiết lập) ---------- */
  const KY0 = { qh: '', cv: '', ten: '' };
  A.VB_DEF = {
    chuQuan: 'UBND TỈNH SƠN LA', tenSo: 'SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG', khSo: 'SNNMT', khPhong: 'KHTC', diaDanh: 'Sơn La',
    kinhGuiTT: 'Giám đốc Sở Nông nghiệp và Môi trường',
    canCuKH: 'Luật Đấu thầu số 22/2023/QH15 ngày 23/6/2023; Luật số 57/2024/QH15 và Luật số 90/2025/QH15 sửa đổi, bổ sung một số điều của Luật Đấu thầu\nNghị định số 214/2025/NĐ-CP ngày 04/8/2025 của Chính phủ quy định chi tiết thi hành Luật Đấu thầu về lựa chọn nhà thầu',
    ky: { totrinh: { qh: '', cv: 'TRƯỞNG PHÒNG', ten: '' }, qd: { qh: 'KT. GIÁM ĐỐC', cv: 'PHÓ GIÁM ĐỐC', ten: '' }, congvan: { qh: 'KT. GIÁM ĐỐC', cv: 'PHÓ GIÁM ĐỐC', ten: '' }, benA: { qh: '', cv: 'ĐẠI DIỆN BÊN A', ten: '' } }
  };
  A.vbCfg = () => { const c = S.cfg.vb || {}; return Object.assign({}, A.VB_DEF, c, { ky: Object.assign({}, A.VB_DEF.ky, c.ky || {}) }); };

  /* ---------- Đọc số tiền bằng chữ ---------- */
  const CS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  function ba(n, du) {   // đọc nhóm 3 chữ số; du: có nhóm lớn hơn phía trước
    const tr = Math.floor(n / 100), ch = Math.floor(n % 100 / 10), dv = n % 10, o = [];
    if (du || tr) o.push(CS[tr] + ' trăm');
    if (ch === 0 && dv && (du || tr)) o.push('linh');
    if (ch === 1) o.push('mười'); else if (ch > 1) o.push(CS[ch] + ' mươi');
    if (dv) o.push(ch > 1 && dv === 1 ? 'mốt' : ch >= 1 && dv === 5 ? 'lăm' : ch > 1 && dv === 4 ? 'tư' : CS[dv]);
    return o.join(' ');
  }
  A.bangChu = v => {
    let n = Math.round(Math.abs(U.num(v))); if (!n) return 'Không đồng';
    const DV = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'], nh = [];
    while (n > 0) { nh.push(n % 1000); n = Math.floor(n / 1000); }
    const p = [];
    for (let i = nh.length - 1; i >= 0; i--) if (nh[i]) p.push(ba(nh[i], i < nh.length - 1) + DV[i]);
    const s = p.join(' ').replace(/\s+/g, ' ').trim() + ' đồng';
    return (U.num(v) < 0 ? 'Âm ' : '') + s.charAt(0).toUpperCase() + s.slice(1);
  };

  // Tên Sở viết thường đúng chính tả lấy từ Thiết lập ("Sở Nông nghiệp và Môi trường tỉnh Sơn La")
  const soDu = () => A.cfg('coQuan'), soTen = () => A.cfg('coQuan').replace(/\s+tỉnh\s+.*$/i, '');
  /* ---------- Khung văn bản theo thể thức ---------- */
  const nam = () => U.today().slice(0, 4);
  // o: {phong: true nếu Phòng ban hành, soKH: 'TTr' | 'QĐ' | 'BB' | '' (công văn), tenLoai, trichYeu, kinhGui:[], than: html, noiNhan:[], ky:{qh,cv,ten} | hai:[{cv,ten},{cv,ten}], phuLuc: html}
  function khung(o) {
    const c = A.vbCfg(), coQuanBH = o.phong ? A.cfg('tenDonVi').toUpperCase() : c.tenSo, chuQuan = o.phong ? c.tenSo : c.chuQuan;
    const kh = o.soKH ? o.soKH + '-' + c.khSo + (o.phong ? '-' + c.khPhong : '') : c.khSo + '-' + c.khPhong;
    const ngay = '<i>' + e(c.diaDanh) + ', ngày&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tháng&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;năm ' + nam() + '</i>';
    let h = '<table class="vb-hd"><tr><td style="width:42%">' + e(chuQuan) + '<br><b>' + e(coQuanBH) + '</b><div class="vb-gach"></div>Số:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/' + e(kh) + (o.soKH ? '' : '<div class="vb-vv">V/v ' + e(o.trichYeu) + '</div>') + '</td><td style="width:58%"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b class="vb-tn">Độc lập - Tự do - Hạnh phúc</b><div class="vb-gach dai"></div>' + ngay + '</td></tr></table>';
    if (o.soKH) h += '<p class="vb-loai">' + e(o.tenLoai) + '</p><p class="vb-ty">' + e(o.trichYeu) + '</p><div class="vb-gach"></div>';
    if (o.kinhGui && o.kinhGui.length) h += o.kinhGui.length === 1 ? '<p class="vb-kg">Kính gửi: ' + e(o.kinhGui[0]) + '.</p>' : '<table class="vb-kgt"><tr><td style="width:30%;text-align:right;vertical-align:top">Kính gửi:</td><td>' + o.kinhGui.map((k, i) => '- ' + e(k) + (i === o.kinhGui.length - 1 ? '.' : ';')).join('<br>') + '</td></tr></table>';
    h += '<div class="vb-than">' + o.than + '</div>';
    if (o.hai) h += '<table class="vb-ky"><tr>' + o.hai.map(k => '<td><b>' + e(k.cv) + '</b><br><i class="vb-kyc">(Ký, ghi rõ họ tên' + (k.dau ? ', đóng dấu' : '') + ')</i><br><br><br><br><b>' + e(k.ten || '') + '</b></td>').join('') + '</tr></table>';
    else {
      const k = o.ky || KY0;
      h += '<table class="vb-ky"><tr><td class="vb-nn">' + (o.noiNhan ? '<b><i>Nơi nhận:</i></b><br>' + o.noiNhan.map((n, i) => '- ' + e(n) + (i === o.noiNhan.length - 1 ? '.' : ';')).join('<br>') : '') + '</td><td>' + (k.qh ? '<b>' + e(k.qh) + '</b><br>' : '') + '<b>' + e(k.cv || '') + '</b><br><br><br><br><br><b>' + e(k.ten || '') + '</b></td></tr></table>';
    }
    if (o.phuLuc) h += '<div class="vb-pl">' + o.phuLuc + '</div>';
    return h;
  }
  const CSS = 'body{font-family:"Times New Roman";font-size:14pt;line-height:1.3}p{margin:0 0 6pt;text-align:justify;text-indent:1cm}table{border-collapse:collapse}' +
    '.vb-hd,.vb-ky,.vb-kgt{width:100%}.vb-hd td,.vb-ky td,.vb-kgt td{border:0;text-align:center;vertical-align:top;padding:0 2pt}.vb-hd td{font-size:13pt}.vb-tn{font-size:14pt}' +
    '.vb-gach{width:30%;margin:2pt auto 6pt;border-top:1px solid #000;height:0}.vb-gach.dai{width:62%}.vb-vv{font-size:12pt;margin-top:4pt}' +
    '.vb-loai{text-align:center;font-weight:bold;text-indent:0;margin:14pt 0 0}.vb-ty{text-align:center;font-weight:bold;text-indent:0;margin:0 0 6pt}.vb-kg{text-align:center;text-indent:0;margin:10pt 0}.vb-kgt{margin:10pt 0}.vb-kgt td{text-align:left}' +
    '.vb-than{margin-top:8pt}.vb-ky{margin-top:14pt}.vb-ky td{width:50%}.vb-nn{text-align:left!important;font-size:11pt}.vb-nn b{font-size:12pt}.vb-kyc{font-size:12pt;font-weight:normal}' +
    '.vb-tbl{width:100%;font-size:11pt;margin:6pt 0}.vb-tbl th,.vb-tbl td{border:1px solid #000;padding:3pt 4pt;vertical-align:top}.vb-tbl th{text-align:center}.vb-tbl td.num{text-align:right;white-space:nowrap}.vb-pl{page-break-before:always;margin-top:14pt}.vb-pl p{text-indent:0}.vb-c{text-align:center;text-indent:0}';

  /* ---------- Xem trước, xuất Word ---------- */
  A.vbXem = (ten, html, tenTep) => {
    const m = UI.modal({
      title: ten, sub: 'Dự thảo theo thể thức Nghị định 30/2020/NĐ-CP — rà soát căn cứ, số liệu trước khi trình ký', size: 'lg',
      body: '<style>.vb-xem{' + '}' + CSS.replace(/(^|\})([^{}]+)\{/g, (m0, a, sel) => a + sel.split(',').map(s => s.trim() === 'body' ? '.vb-xem' : '.vb-xem ' + s.trim()).join(',') + '{') + '</style><div class="paper vb-xem">' + html + '</div>',
      buttons: [{ label: 'Đóng', on: a => a.close() }, 'sp', { label: 'In', icon: 'print', on: () => { const w = window.open('', '_blank'); if (!w) { UI.toast('Trình duyệt chặn cửa sổ in.', 'bad'); return; } w.document.write('<html><head><meta charset="utf-8"><title>' + e(ten) + '</title><style>@page{size:A4;margin:20mm 15mm 20mm 30mm}' + CSS + '</style></head><body>' + html + '</body></html>'); w.document.close(); w.focus(); w.print(); } },
        { label: 'Tải Word (.doc)', cls: 'primary', icon: 'download', on: () => { UI.download(new Blob(['﻿<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' + e(ten) + '</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--><style>@page Section1{size:21cm 29.7cm;margin:2cm 1.5cm 2cm 3cm}div.Section1{page:Section1}' + CSS + '</style></head><body><div class="Section1">' + html + '</div></body></html>'], { type: 'application/msword' }), (tenTep || 'van-ban') + '-' + UI.stamp() + '.doc'); UI.toast('Đã tải tệp Word.', 'ok'); } }]
    });
    return m;
  };
  const P = t => '<p>' + t + '</p>';
  const canCu = s => s.split('\n').map(x => x.trim()).filter(Boolean).map(x => '<p><i>Căn cứ ' + e(x.replace(/^căn cứ\s*/i, '').replace(/[;.]$/, '')) + ';</i></p>').join('');

  /* ---------- KHLCNT: bảng gói thầu theo Điều 39 Luật Đấu thầu ---------- */
  const tenDS = id => Sc.refName('duan', id);
  function bangKH(gts) {
    const hang = gts.map((g, i) => '<tr><td class="vb-c">' + (i + 1) + '</td><td>' + e(g.ten) + '</td><td class="num">' + fm(g.giaGoiThau) + '</td><td>' + e(g.nguonVon || '') + '</td><td>' + e(g.hinhThuc || '') + '</td><td>' + e(g.phuongThuc || '') + '</td><td>' + e(g.tgBatDauLCNT || '') + '</td><td>' + e(g.loaiHD || '') + '</td><td>' + e(g.tgThucHienHD || '') + '</td></tr>').join('');
    return '<table class="vb-tbl"><thead><tr><th>TT</th><th>Tên gói thầu</th><th>Giá gói thầu (đồng)</th><th>Nguồn vốn</th><th>Hình thức lựa chọn nhà thầu</th><th>Phương thức lựa chọn nhà thầu</th><th>Thời gian bắt đầu tổ chức LCNT</th><th>Loại hợp đồng</th><th>Thời gian thực hiện gói thầu</th></tr></thead><tbody>' + hang + '<tr><td></td><td><b>Tổng cộng</b></td><td class="num"><b>' + fm(U.sum(gts, g => g.giaGoiThau)) + '</b></td><td colspan="6"></td></tr></tbody></table>';
  }
  const tenKH = gts => { const kh = gts[0] && gts[0].qdKHSo && S.all('khlcnt').find(k => L0soKH(k.so) === L0soKH(gts[0].qdKHSo)); return (kh && kh.ten) || (gts[0] && gts[0].duAnId ? tenDS(gts[0].duAnId) : '') || (gts.length === 1 ? gts[0].ten : '') || (gts.map(g => g.nsId && S.get('ngansach', g.nsId)).filter(Boolean).map(r => r.noiDung)[0]) || '[tên dự toán mua sắm, nhiệm vụ]'; };
  const L0soKH = s => (A.L0 && A.L0.soKH) ? A.L0.soKH(s) : U.norm(s || '');
  const nguonGT = gts => { const ns = gts.map(g => g.nsId && S.get('ngansach', g.nsId)).filter(Boolean)[0]; return ns ? 'dòng dự toán "' + U.trunc(Sc.C.ngansach.title(ns), 140) + '" năm ' + (ns.nam || '') + ' của ' + Sc.refName('donvi', ns.donViId) : ''; };

  function toTrinhKH(gts) {
    const c = A.vbCfg(), ten = tenKH(gts), tong = U.sum(gts, g => g.giaGoiThau), ng = nguonGT(gts);
    return khung({
      phong: true, soKH: 'TTr', tenLoai: 'TỜ TRÌNH', trichYeu: 'Về việc phê duyệt kế hoạch lựa chọn nhà thầu ' + ten, kinhGui: [c.kinhGuiTT],
      than: canCu(c.canCuKH) + P('Căn cứ [quyết định phê duyệt dự toán / chủ trương mua sắm số …];') +
        P(e(A.cfg('tenDonVi')) + ' kính trình Giám đốc Sở xem xét, phê duyệt kế hoạch lựa chọn nhà thầu ' + e(ten) + ' với các nội dung sau:') +
        '<p><b>I. Mô tả tóm tắt</b></p>' + P('1. Tên dự toán mua sắm, nhiệm vụ: ' + e(ten) + '.') + P('2. Tổng giá trị các gói thầu: ' + fm(tong) + ' đồng (' + e(A.bangChu(tong).toLowerCase()) + ').') + P('3. Nguồn kinh phí: ' + e(ng || (gts[0] && gts[0].nguonVon) || '[nguồn kinh phí]') + '.') +
        '<p><b>II. Phần công việc đã thực hiện</b></p>' + P('[Ghi các công việc đã thực hiện, nếu có.]') + '<p><b>III. Phần công việc không áp dụng được một trong các hình thức lựa chọn nhà thầu</b></p>' + P('[Ghi nếu có.]') +
        '<p><b>IV. Phần công việc thuộc kế hoạch lựa chọn nhà thầu</b></p>' + P('Gồm ' + gts.length + ' gói thầu, chi tiết như sau:') + bangKH(gts) +
        '<p><b>V. Phần công việc chưa đủ điều kiện lập kế hoạch lựa chọn nhà thầu</b></p>' + P('[Ghi nếu có.]') + '<p><b>VI. Tổng giá trị các phần công việc</b></p>' + P(fm(tong) + ' đồng.') +
        P(e(A.cfg('tenDonVi')) + ' kính trình Giám đốc Sở xem xét, phê duyệt./.'),
      noiNhan: ['Như trên', 'Lưu: ' + c.khPhong], ky: c.ky.totrinh
    });
  }
  function qdKH(gts) {
    const c = A.vbCfg(), ten = tenKH(gts), tong = U.sum(gts, g => g.giaGoiThau);
    return khung({
      soKH: 'QĐ', tenLoai: 'QUYẾT ĐỊNH', trichYeu: 'Phê duyệt kế hoạch lựa chọn nhà thầu ' + ten,
      than: '<p class="vb-loai">GIÁM ĐỐC ' + e(c.tenSo) + '</p>' + canCu('Quyết định số …/QĐ-UBND ngày … của Ủy ban nhân dân tỉnh Sơn La quy định chức năng, nhiệm vụ, quyền hạn và cơ cấu tổ chức của ' + soDu() + '\n' + c.canCuKH) + P('<i>Căn cứ [quyết định phê duyệt dự toán / chủ trương mua sắm số …];</i>') +
        P('<i>Theo đề nghị của Trưởng ' + e(A.cfg('tenDonVi').replace(/^Phòng\s*/i, 'phòng ')) + ' tại Tờ trình số …/TTr-' + e(c.khSo + '-' + c.khPhong) + ' ngày …</i>') +
        '<p class="vb-loai">QUYẾT ĐỊNH:</p>' +
        P('<b>Điều 1.</b> Phê duyệt kế hoạch lựa chọn nhà thầu ' + e(ten) + ', gồm ' + gts.length + ' gói thầu với tổng giá trị ' + fm(tong) + ' đồng (' + e(A.bangChu(tong).toLowerCase()) + '), chi tiết tại Phụ lục kèm theo.') +
        P('<b>Điều 2.</b> Căn cứ kế hoạch lựa chọn nhà thầu được phê duyệt, [đơn vị được giao] tổ chức lựa chọn nhà thầu theo đúng quy định của pháp luật về đấu thầu.') +
        P('<b>Điều 3.</b> Chánh Văn phòng Sở, Trưởng ' + e(A.cfg('tenDonVi').replace(/^Phòng\s*/i, 'phòng ')) + ', Thủ trưởng các đơn vị, cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này./.'),
      noiNhan: ['Như Điều 3', 'Lãnh đạo Sở', 'Lưu: VT, ' + c.khPhong], ky: c.ky.qd,
      phuLuc: '<p class="vb-c"><b>PHỤ LỤC</b></p><p class="vb-c"><b>KẾ HOẠCH LỰA CHỌN NHÀ THẦU ' + e(ten.toUpperCase()) + '</b></p><p class="vb-c"><i>(Kèm theo Quyết định số&nbsp;&nbsp;&nbsp;&nbsp;/QĐ-' + e(c.khSo) + ' ngày&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;/' + nam() + ' của Giám đốc Sở)</i></p>' + bangKH(gts)
    });
  }

  /* ---------- Hợp đồng: biên bản nghiệm thu, thanh lý ---------- */
  const benAB = h => { const c = A.vbCfg(); return '<p><b>Bên A (Bên giao thầu): ' + e(soTen()) + ' tỉnh Sơn La</b></p>' + P('- Ông/Bà: ………………… Chức vụ: …………………') + P('- Ông/Bà: ………………… Chức vụ: …………………') + '<p><b>Bên B (Bên nhận thầu): ' + e(h.nhaThau || '……………') + '</b></p>' + P('- Ông/Bà: ………………… Chức vụ: …………………'); };
  const hdCC = h => P('<i>Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;</i>') + P('<i>Căn cứ Hợp đồng số ' + e(h.so || '…') + (h.ngayKy ? ' ngày ' + U.fmtDate(h.ngayKy) : '') + ' giữa ' + e(soDu()) + ' và ' + e(h.nhaThau || '…') + ' về việc ' + e(h.ten || '…') + (h.phuLuc && h.phuLuc.length ? ' và các phụ lục hợp đồng số ' + h.phuLuc.map(p => e(p.so)).join(', ') : '') + ';</i>');
  function bbNghiemThu(h, i) {
    const nt = (h.nghiemThu || [])[i] || {}, c = A.vbCfg();
    return khung({
      soKH: 'BB', tenLoai: 'BIÊN BẢN', trichYeu: 'Nghiệm thu ' + (nt.noiDung ? nt.noiDung : 'khối lượng, sản phẩm') + ' thuộc Hợp đồng số ' + (h.so || '…'),
      than: hdCC(h) + P('Hôm nay, ngày ' + (nt.ngay ? U.fmtDate(nt.ngay) : '…/…/' + nam()) + ', tại ' + e(soTen()) + ', chúng tôi gồm:') + benAB(h) +
        P('Hai bên cùng tiến hành nghiệm thu với các nội dung sau:') + P('<b>1. Đối tượng nghiệm thu:</b> ' + e(nt.noiDung || '[khối lượng, sản phẩm, hạng mục nghiệm thu]') + '.') +
        P('<b>2. Thời gian thực hiện:</b> từ ngày ' + (h.ngayBD || h.ngayKy ? U.fmtDate(h.ngayBD || h.ngayKy) : '…') + ' đến ngày ' + (nt.ngay ? U.fmtDate(nt.ngay) : '…') + '.') +
        P('<b>3. Đánh giá chất lượng, khối lượng:</b> [Khối lượng, chất lượng sản phẩm so với yêu cầu của hợp đồng; các tồn tại cần khắc phục, nếu có].') +
        P('<b>4. Giá trị nghiệm thu:</b> ' + (nt.giaTri ? fm(nt.giaTri) + ' đồng (' + e(A.bangChu(nt.giaTri).toLowerCase()) + ')' : '[giá trị]') + '.') +
        P('<b>5. Kết luận:</b> Đồng ý nghiệm thu [toàn bộ / một phần] khối lượng nêu trên, làm cơ sở thanh toán theo quy định của hợp đồng.') +
        P('Biên bản được lập thành … bản có giá trị pháp lý như nhau, mỗi bên giữ … bản./.'),
      hai: [{ cv: 'ĐẠI DIỆN BÊN B', dau: true }, { cv: c.ky.benA.cv || 'ĐẠI DIỆN BÊN A', ten: c.ky.benA.ten, dau: true }]
    });
  }
  function bbThanhLy(h) {
    const x = L.hd(h), c = A.vbCfg(), qt = U.num(h.quyetToanHD) || x.nghiemThu, con = qt - x.thanhToan;
    return khung({
      soKH: 'BB', tenLoai: 'BIÊN BẢN', trichYeu: 'Thanh lý Hợp đồng số ' + (h.so || '…'),
      than: hdCC(h) + P('Hôm nay, ngày …/…/' + nam() + ', tại ' + e(soTen()) + ', chúng tôi gồm:') + benAB(h) + P('Hai bên thống nhất thanh lý hợp đồng với các nội dung sau:') +
        P('<b>1. Kết quả thực hiện hợp đồng:</b> Bên B đã hoàn thành các nội dung công việc theo hợp đồng' + ((h.nghiemThu || []).length ? ', đã được nghiệm thu ' + h.nghiemThu.length + ' lần (' + h.nghiemThu.filter(n => n.ngay).map(n => U.fmtDate(n.ngay)).join(', ') + ')' : '') + '.') +
        '<p><b>2. Giá trị hợp đồng và thanh toán:</b></p><table class="vb-tbl"><tbody>' +
        [['Giá trị hợp đồng ký kết', h.giaTri], (h.phuLuc || []).length ? ['Giá trị hợp đồng sau ' + h.phuLuc.length + ' phụ lục', x.giaTriHL] : null, ['Giá trị nghiệm thu', x.nghiemThu], h.quyetToanHD ? ['Giá trị quyết toán hợp đồng', h.quyetToanHD] : null, ['Bên A đã thanh toán cho Bên B', x.thanhToan], ['Tạm ứng đã thu hồi', h.tamUngThuHoi], ['Giá trị Bên A còn phải thanh toán cho Bên B', con]].filter(Boolean).map((r, i) => '<tr><td style="width:6%" class="vb-c">' + (i + 1) + '</td><td>' + e(r[0]) + '</td><td class="num">' + fm(r[1]) + ' đồng</td></tr>').join('') + '</tbody></table>' +
        P('(Bằng chữ số còn phải thanh toán: ' + e(A.bangChu(con).toLowerCase()) + '.)') +
        P('<b>3. Bảo hành, bảo đảm:</b> [Thời hạn bảo hành, xử lý bảo đảm thực hiện hợp đồng' + (h.baoLanhTH ? ' (' + fm(h.baoLanhTH) + ' đồng' + (h.baoLanhTHHan ? ', hiệu lực đến ' + U.fmtDate(h.baoLanhTHHan) : '') + ')' : '') + '].') +
        P('<b>4. Kết luận:</b> Hai bên thống nhất thanh lý Hợp đồng số ' + e(h.so || '…') + '. Sau khi Bên A thanh toán hết số còn lại nêu trên, hai bên không còn nghĩa vụ nào khác với nhau theo hợp đồng.') +
        P('Biên bản được lập thành … bản có giá trị pháp lý như nhau, mỗi bên giữ … bản./.'),
      hai: [{ cv: 'ĐẠI DIỆN BÊN B', dau: true }, { cv: c.ky.benA.cv || 'ĐẠI DIỆN BÊN A', ten: c.ky.benA.ten, dau: true }]
    });
  }

  /* ---------- Công văn đôn đốc giải ngân ---------- */
  function cvDonDoc(y, f, rows) {
    const c = A.vbCfg(), g = L.giaiNgan(y, f || {}), chuan = g.mt.tuDat ? g.mtNay : g.tyLeTG, fs = U.fmtShort;
    const dvs = Array.from(new Set(rows.map(x => x.r.donViId))).map(id => Sc.refName('donvi', id)).filter(Boolean);
    const con = U.sum(rows, x => x.con);
    return khung({
      trichYeu: 'đôn đốc đẩy nhanh tiến độ giải ngân dự toán ngân sách năm ' + y, kinhGui: dvs.length ? dvs : ['[Các phòng, đơn vị]'],
      than: P('Theo số liệu tổng hợp đến ngày ' + U.fmtDate(g.asOf) + ', tổng kinh phí được sử dụng năm ' + y + ' là ' + fm(g.tong) + ' đồng; đã giải ngân ' + fm(g.gn) + ' đồng, đạt ' + U.fmtPct(g.tyLe) + ', ' + (g.lech >= 0 ? 'cao hơn' : 'thấp hơn') + ' ' + (g.mt.tuDat ? 'mục tiêu đề ra' : 'tỷ lệ thời gian') + ' (' + U.fmtPct(chuan) + '). Còn ' + rows.length + ' nội dung giải ngân chậm với tổng số chưa giải ngân ' + fm(con) + ' đồng (' + fs(con) + '), chi tiết tại Phụ lục kèm theo.') +
        P('Để bảo đảm tiến độ giải ngân dự toán ngân sách năm ' + y + ', ' + e(soTen()) + ' đề nghị các phòng, đơn vị:') +
        P('1. Khẩn trương rà soát, hoàn thiện hồ sơ, thủ tục; tổ chức thực hiện và thanh toán ngay khối lượng đã hoàn thành đối với các nội dung tại Phụ lục.') +
        P('2. Đối với nội dung không có khả năng thực hiện, giải ngân hết trong năm, báo cáo rõ nguyên nhân, đề xuất điều chỉnh dự toán hoặc trả lại kinh phí.') +
        P('3. Báo cáo kết quả thực hiện, khó khăn, vướng mắc về Sở (qua ' + e(A.cfg('tenDonVi')) + ') trước ngày …/…/' + y + ' để tổng hợp, báo cáo Lãnh đạo Sở.') +
        P(e(soTen()) + ' đề nghị các phòng, đơn vị quan tâm, thực hiện./.'),
      noiNhan: ['Như trên', 'Lãnh đạo Sở', 'Lưu: VT, ' + c.khPhong], ky: c.ky.congvan,
      phuLuc: '<p class="vb-c"><b>PHỤ LỤC</b></p><p class="vb-c"><b>DANH SÁCH NỘI DUNG GIẢI NGÂN CHẬM NĂM ' + y + '</b></p><p class="vb-c"><i>(Kèm theo Công văn số&nbsp;&nbsp;&nbsp;&nbsp;/' + e(c.khSo + '-' + c.khPhong) + ' ngày&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;/' + y + ')</i></p><p class="vb-c">Đơn vị tính: đồng</p>' +
        '<table class="vb-tbl"><thead><tr><th>TT</th><th>Nội dung</th><th>Đơn vị, phòng thực hiện</th><th>Kinh phí được sử dụng</th><th>Đã giải ngân</th><th>Còn phải giải ngân</th><th>Tỷ lệ (%)</th></tr></thead><tbody>' +
        rows.map((x, i) => '<tr><td class="vb-c">' + (i + 1) + '</td><td>' + e((x.r.stt ? x.r.stt + ' ' : '') + x.r.noiDung) + '</td><td>' + e([Sc.refName('donvi', x.r.donViId), x.r.ghiChuBieu].filter(Boolean).join(' — ')) + '</td><td class="num">' + fm(x.tong) + '</td><td class="num">' + fm(x.gn) + '</td><td class="num">' + fm(x.con) + '</td><td class="num">' + U.fmtNum(x.ty, 1) + '</td></tr>').join('') +
        '<tr><td></td><td><b>Cộng</b></td><td></td><td class="num"><b>' + fm(U.sum(rows, x => x.tong)) + '</b></td><td class="num"><b>' + fm(U.sum(rows, x => x.gn)) + '</b></td><td class="num"><b>' + fm(con) + '</b></td><td class="num"><b>' + U.fmtNum(U.pct(U.sum(rows, x => x.gn), U.sum(rows, x => x.tong)) || 0, 1) + '</b></td></tr></tbody></table>'
    });
  }

  /* ---------- Điểm vào từ giao diện ---------- */
  // Gói thầu: chọn các gói cùng kế hoạch rồi soạn tờ trình / quyết định
  A.vbGoiThau = (g, loai) => {
    const k = L0soKH(g.qdKHSo), all = S.all('goithau').filter(x => x.trangThai !== 'huy');
    const macDinh = all.filter(x => x.id === g.id || (k && L0soKH(x.qdKHSo) === k) || (!k && !x.qdKHSo && x.nsId && x.nsId === g.nsId)).map(x => x.id);
    A.lkPicker({
      title: 'Chọn các gói thầu đưa vào ' + (loai === 'qd' ? 'quyết định' : 'tờ trình') + ' phê duyệt KHLCNT', sub: 'Đã chọn sẵn các gói cùng kế hoạch (cùng số QĐ KHLCNT hoặc cùng dòng dự toán)', multi: true, chon: macDinh,
      items: all.map(x => ({ id: x.id, t: x.ten || '(chưa có tên)', s: [x.qdKHSo ? 'KHLCNT ' + x.qdKHSo : '', x.giaGoiThau ? 'giá ' + U.fmtShort(U.num(x.giaGoiThau)) : '', x.hinhThuc || '', x.nguonVon || ''].filter(Boolean).join(' · ') })),
      onOk: async ids => {
        const gts = all.filter(x => ids.includes(x.id)); if (!gts.length) throw new Error('Chưa chọn gói thầu nào.');
        const thieu = gts.filter(x => !x.giaGoiThau || !x.hinhThuc || !x.loaiHD || !x.tgThucHienHD).length;
        setTimeout(() => { A.vbXem(loai === 'qd' ? 'Quyết định phê duyệt KHLCNT' : 'Tờ trình phê duyệt KHLCNT', loai === 'qd' ? qdKH(gts) : toTrinhKH(gts), loai === 'qd' ? 'qd-phe-duyet-khlcnt' : 'to-trinh-khlcnt'); if (thieu) UI.toast(thieu + ' gói thầu còn thiếu giá, hình thức, loại hợp đồng hoặc thời gian thực hiện — văn bản để trống ô tương ứng.', 'bad'); }, 0);
      }
    });
  };
  A.vbHopDong = (h, loai) => {
    if (loai === 'tl') { A.vbXem('Biên bản thanh lý hợp đồng', bbThanhLy(h), 'bb-thanh-ly-' + U.norm(h.so || 'hd').replace(/[^a-z0-9]+/g, '-')); return; }
    const nt = h.nghiemThu || [];
    if (nt.length <= 1) { A.vbXem('Biên bản nghiệm thu', bbNghiemThu(h, 0), 'bb-nghiem-thu'); return; }
    const m = UI.modal({ title: 'Chọn lần nghiệm thu', size: 'sm', footer: false, body: nt.map((n, i) => '<button class="cmd-i" data-i="' + i + '"><span class="ct">Lần ' + (i + 1) + (n.ngay ? ' — ' + U.fmtDate(n.ngay) : '') + (n.giaTri ? ' · ' + U.fmtShort(U.num(n.giaTri)) : '') + '<span class="t2">' + e(U.trunc(n.noiDung || '', 80)) + '</span></span></button>').join('') });
    UI.on(m.body, 'click', '[data-i]', b => { m.close(true); A.vbXem('Biên bản nghiệm thu', bbNghiemThu(h, +b.dataset.i), 'bb-nghiem-thu'); });
  };
  A.vbDonDoc = (y, f) => {
    const rows = L.gnDong(y, f || {}).filter(x => x.cham).sort((a, b) => b.con - a.con);
    if (!rows.length) { UI.toast('Không có nội dung giải ngân chậm để đôn đốc.', 'ok'); return; }
    A.vbXem('Công văn đôn đốc giải ngân', cvDonDoc(y, f, rows), 'cv-don-doc-giai-ngan-' + y);
  };

  /* ---------- Thẻ cấu hình trong Thiết lập ---------- */
  A.vbCfgHtml = () => {
    const c = A.vbCfg(), f = (id, lb, v, help) => '<div class="fld"><label for="' + id + '">' + lb + '</label><input class="inp" id="' + id + '" value="' + e(v || '') + '">' + (help ? '<div class="help">' + help + '</div>' : '') + '</div>';
    const ky = (k, lb) => '<div class="eyebrow">' + lb + '</div><div class="form">' + f('vb_' + k + '_qh', 'Quyền hạn ký', c.ky[k].qh, 'KT., TL., Q. … (để trống nếu người đứng đầu ký)') + f('vb_' + k + '_cv', 'Chức vụ', c.ky[k].cv) + f('vb_' + k + '_ten', 'Họ tên người ký', c.ky[k].ten) + '</div>';
    return '<div class="card"><div class="card-h"><h3>Văn bản sinh từ dữ liệu</h3><div class="sub">Thể thức Nghị định 30/2020/NĐ-CP — dùng cho tờ trình, quyết định KHLCNT, biên bản nghiệm thu, thanh lý, công văn đôn đốc</div></div><div class="card-b"><div class="form">' +
      f('vb_cq', 'Cơ quan chủ quản', c.chuQuan) + f('vb_so', 'Tên cơ quan ban hành (Sở)', c.tenSo) + f('vb_khs', 'Ký hiệu viết tắt của Sở', c.khSo) + f('vb_khp', 'Ký hiệu viết tắt của Phòng', c.khPhong) + f('vb_dd', 'Địa danh', c.diaDanh) + f('vb_kg', 'Tờ trình KHLCNT kính gửi', c.kinhGuiTT) +
      '<div class="fld full"><label for="vb_cc">Căn cứ pháp lý về lựa chọn nhà thầu (mỗi dòng một căn cứ)</label><textarea class="inp" id="vb_cc" rows="3">' + e(c.canCuKH) + '</textarea><div class="help">Phần mềm không tự cập nhật văn bản pháp luật — rà soát hiệu lực trước khi ban hành.</div></div></div>' +
      ky('totrinh', 'Người ký tờ trình (Phòng)') + ky('qd', 'Người ký quyết định') + ky('congvan', 'Người ký công văn') + ky('benA', 'Đại diện Bên A ký biên bản') +
      '<div class="gap mt"><button class="btn primary" data-save-vb>Lưu cấu hình văn bản</button></div></div></div>';
  };
  A.vbCfgBind = root => {
    const b = $('[data-save-vb]', root); if (!b) return;
    b.onclick = async () => {
      const v = id => ($('#' + id, root) || {}).value || '', ky = {};
      ['totrinh', 'qd', 'congvan', 'benA'].forEach(k => { ky[k] = { qh: v('vb_' + k + '_qh').trim(), cv: v('vb_' + k + '_cv').trim(), ten: v('vb_' + k + '_ten').trim() }; });
      try { await S.setCfg({ vb: { chuQuan: v('vb_cq').trim(), tenSo: v('vb_so').trim(), khSo: v('vb_khs').trim(), khPhong: v('vb_khp').trim(), diaDanh: v('vb_dd').trim(), kinhGuiTT: v('vb_kg').trim(), canCuKH: v('vb_cc').trim(), ky } }); UI.toast('Đã lưu cấu hình văn bản.', 'ok'); } catch (er) { UI.fail(er); }
    };
  };
})(App);
