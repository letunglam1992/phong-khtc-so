/* ============================================================
   56-view-taichinh.js — Tài chính, ngân sách · Tài sản công · Mua sắm, đấu thầu, hợp đồng
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const cbOpts = () => [['__none', 'Chưa phân công']].concat(S.all('canbo').filter(c => c.trangThai !== 'nghi').map(c => [c.id, c.hoTen]));
  const dvOpts = () => S.all('donvi').map(d => [d.id, d.tenTat || d.ten]);

  Sc.C.ngansach.sections = [
    { t: 'Vị trí trong biểu', keys: ['donViId', 'nam', 'parentId', 'stt', 'noiDung', 'nhomKP', 'chuongKhoan', 'quyetDinh'] },
    { t: 'Dự toán (chỉ nhập ở dòng chi tiết; dòng có dòng con tự cộng)', keys: ['chuyenNguon', 'duToan', 'boSung', 'dcTang', 'dcGiam', 'thuHoi', 'tietKiem'] },
    { t: 'Thực hiện, quyết toán', keys: ['giaiNgan', 'ngayGN', 'quyetToan', 'tienDo'] },
    { t: 'Theo dõi', keys: ['canBoId', 'duAnId', 'ghiChu'] }];
  Sc.C.taisan.sections = [
    { t: 'Tài sản', keys: ['ten', 'ma', 'loai', 'donViId', 'thongSo', 'nguon', 'namSD', 'soLuong'] },
    { t: 'Giá trị, tình trạng', keys: ['nguyenGia', 'conLai', 'tinhTrang', 'ngayKiemKe'] },
    { t: 'Cơ sở nhà, đất (theo Phụ biểu 0A.01-T.STC)', key: 'nhadat', keys: ['donViGiao', 'ndNgay', 'dtNha', 'dtDat', 'htSD', 'gcnTT', 'gcnSo', 'gcnNgay', 'hsDayDu', 'hsThieu', 'chuaDKBD', 'nguyenNhanHS', 'ghiChuBieu'] },
    { t: 'Biến động và hồ sơ', keys: ['bienDong', 'dinhKem', 'ghiChu'] }];
  Sc.C.goithau.sections = [
    { t: 'Gói thầu, nhu cầu mua sắm', keys: ['ten', 'duAnId', 'donViId', 'loai', 'nguonVon', 'nsId', 'duToan', 'giaGoiThau'] },
    { t: 'Kế hoạch lựa chọn nhà thầu', keys: ['hinhThuc', 'phuongThuc', 'loaiHD', 'tgBatDauLCNT', 'tgThucHienHD', 'qdKHSo', 'qdKHNgay', 'hanLCNT'] },
    { t: 'Tổ chức lựa chọn nhà thầu', keys: ['soTBMT', 'tienTrinh', 'trangThai'] },
    { t: 'Kết quả lựa chọn nhà thầu', keys: ['nhaThau', 'giaTrung', 'qdKQSo', 'qdKQNgay'] },
    { t: 'Theo dõi', keys: ['canBoId', 'dinhKem', 'ghiChu'] }];
  Sc.C.hopdong.sections = [
    { t: 'Hợp đồng', keys: ['so', 'ngayKy', 'ten', 'goiThauId', 'duAnId', 'nhaThau', 'loaiHD', 'giaTri', 'nsId', 'ngayBD', 'ngayKT'] },
    { t: 'Bảo lãnh, tạm ứng', keys: ['baoLanhTH', 'baoLanhTHHan', 'tamUng', 'baoLanhTU', 'baoLanhTUHan', 'tamUngThuHoi'] },
    { t: 'Phụ lục, điều chỉnh hợp đồng', keys: ['phuLuc'] },
    { t: 'Thực hiện, nghiệm thu, thanh toán', keys: ['tienDoKL', 'nghiemThu', 'thanhToan'] },
    { t: 'Thanh lý, quyết toán, theo dõi', keys: ['trangThai', 'thanhLyNgay', 'thanhLySo', 'quyetToanHD', 'canBoId', 'dinhKem', 'ghiChu'] }];

  /* ================= TÀI CHÍNH, NGÂN SÁCH ================= */
  const NS_COLS = [['chuyenNguon', 'Chuyển nguồn'], ['duToan', 'Dự toán đầu năm'], ['boSung', 'Bổ sung'], ['dcTang', 'ĐC tăng'], ['dcGiam', 'ĐC giảm'], ['thuHoi', 'Thu hồi'], ['tietKiem', 'Tiết kiệm'], ['tong', 'Tổng được sử dụng'], ['giaiNgan', 'Đã giải ngân'], ['conLai', 'Còn lại']];
  A.openers.ngansach = id => UI.detail({
    coll: 'ngansach', id,
    head: r => { const kids = S.all('ngansach').filter(x => x.parentId === r.id); return '<div class="kpis mb"><div class="kpi acc static"><span class="k-l">Tổng kinh phí được sử dụng</span><span class="k-v"><small>' + U.fmtMoney(L.nsTong(r)) + '</small></span><span class="k-s">= chuyển nguồn + dự toán + bổ sung + tăng − giảm − thu hồi − tiết kiệm</span></div><div class="kpi ok static"><span class="k-l">Đã giải ngân</span><span class="k-v">' + U.fmtPct(U.pct(U.num(r.giaiNgan), L.nsTong(r))) + '</span><span class="k-s">' + U.fmtMoney(U.num(r.giaiNgan)) + ' đồng</span></div></div>' + (kids.length ? '<div class="note warn mb">Dòng này có ' + kids.length + ' dòng con. Trên bảng, số của dòng được tính bằng tổng các dòng con; số nhập trực tiếp ở dòng này không được cộng.</div>' : A.gnHistHtml(r)); }
  });

  async function importBudget() {
    const y0 = A.year() || +U.today().slice(0, 4);
    const m = UI.modal({
      title: 'Nhập biểu giải ngân, thanh toán NSNN từ Excel', size: 'lg',
      body: '<p class="soft">Dùng cho biểu "Báo cáo tình hình thực hiện giải ngân thanh toán ngân sách nhà nước" Phòng đang lập (cột: TT, Nội dung, Quyết định, Chuyển nguồn, Dự toán giao đầu năm, Bổ sung, Điều chỉnh tăng/giảm, Thu hồi, Tiết kiệm, Tổng kinh phí, Đã giải ngân…). Phần mềm đọc giá trị đã tính của ô công thức, dựng lại cấp bậc theo số thứ tự (I → 1 → 3.1 → (1) → -) và đối chiếu số tổng với các dòng chi tiết. Số liệu gốc trong tệp không bị thay đổi.</p><div class="gap"><button class="btn primary" data-pick>' + ic('upload', 16) + 'Chọn tệp Excel</button></div><div data-step class="mt"></div>',
      buttons: [{ label: 'Đóng', on: a => a.close() }]
    });
    let wb = null, parsed = null, fname = '';
    const step = $('[data-step]', m.body);
    const parseSheet = name => {
      const ws = wb.Sheets[name];
      parsed = L.parseBudget(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }), XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null }));
      const leaf = parsed.items.filter(i => !i.isGroup), tong = U.sum(leaf, L.nsTong), gn = U.sum(leaf, i => i.giaiNgan);
      const dm = (parsed.title.match(/(\d{1,2}\/\d{1,2}\/\d{4})/) || [])[1], dIso = dm ? U.parseDate(dm) : '';
      const dv = S.all('donvi'), guess = dv.find(d => parsed.items[0] && U.norm(parsed.items[0].noiDung).includes(U.norm(d.ten))) || dv[0];
      $('[data-out]', step).innerHTML = !parsed.items.length ? '<div class="note bad">' + e(parsed.warnings.join(' ') || 'Không đọc được dòng dữ liệu nào.') + '</div>' :
        '<div class="note">' + e(parsed.title || 'Biểu không có tiêu đề') + ' — đọc được <b>' + parsed.items.length + '</b> dòng (' + leaf.length + ' dòng chi tiết, ' + (parsed.items.length - leaf.length) + ' dòng tổng).</div>' +
        '<div class="kpis mt"><div class="kpi acc static"><span class="k-l">Tổng kinh phí được sử dụng</span><span class="k-v"><small>' + U.fmtShort(tong) + '</small></span><span class="k-s">Cộng các dòng chi tiết</span></div><div class="kpi ok static"><span class="k-l">Đã giải ngân</span><span class="k-v"><small>' + U.fmtShort(gn) + '</small></span><span class="k-s">' + U.fmtPct(U.pct(gn, tong)) + '</span></div><div class="kpi ' + (parsed.warnings.length ? 'warn' : 'ok') + ' static"><span class="k-l">Điểm cần đối chiếu</span><span class="k-v">' + parsed.warnings.length + '</span><span class="k-s">Số tổng khác tổng chi tiết</span></div></div>' +
        (parsed.warnings.length ? '<div class="note warn mt"><b>Kết quả đối chiếu số học trên biểu</b> (vẫn nhập được; phần mềm dùng tổng các dòng chi tiết và đánh dấu chỗ lệch để anh/chị rà soát):<ul style="margin:4px 0 0;padding-left:18px">' + parsed.warnings.slice(0, 10).map(w => '<li>' + e(w) + '</li>').join('') + (parsed.warnings.length > 10 ? '<li>… và ' + (parsed.warnings.length - 10) + ' điểm khác</li>' : '') + '</ul></div>' : '') +
        '<div class="form mt"><div class="fld"><label for="ib_dv">Đơn vị dự toán</label><select class="sel" id="ib_dv">' + dv.map(d => '<option value="' + d.id + '"' + (guess && d.id === guess.id ? ' selected' : '') + '>' + e(d.ten) + '</option>').join('') + '</select></div><div class="fld"><label for="ib_y">Năm ngân sách</label><input class="inp" id="ib_y" type="number" value="' + (dIso ? dIso.slice(0, 4) : y0) + '"></div><div class="fld"><label for="ib_d">Số giải ngân tính đến ngày</label><input class="inp" id="ib_d" type="date" value="' + e(dIso || '') + '"></div></div>' +
        '<div style="max-height:260px;overflow:auto" class="tbl-wrap mt"><table class="tbl"><thead><tr><th>TT</th><th>Nội dung</th><th class="num">Dự toán đầu năm</th><th class="num">Tổng được sử dụng</th><th class="num">Đã giải ngân</th></tr></thead><tbody>' + parsed.items.slice(0, 200).map(i => '<tr class="lv' + Math.min(i.level, 3) + '"><td class="nowrap">' + e(i.stt) + '</td><td style="padding-left:' + (12 + i.level * 16) + 'px">' + e(U.trunc(i.noiDung, 110)) + '</td><td class="num">' + U.fmtMoney(i.duToan) + '</td><td class="num">' + (i.isGroup ? '<span class="muted">(tổng)</span>' : U.fmtMoney(L.nsTong(i))) + '</td><td class="num">' + U.fmtMoney(i.giaiNgan) + '</td></tr>').join('') + '</tbody></table></div>';
      m.setFooter(parsed.items.length ? [{ label: 'Đóng', on: a => a.close() }, { label: 'Nhập ' + parsed.items.length + ' dòng', cls: 'primary', icon: 'check', on: commit }] : [{ label: 'Đóng', on: a => a.close() }]);
    };
    const commit = async () => {
      const dvId = $('#ib_dv', m.body).value, nam = +$('#ib_y', m.body).value, ngay = $('#ib_d', m.body).value;
      if (!dvId) { UI.toast('Chưa có đơn vị dự toán. Thêm đơn vị ở trang Cán bộ và phân công.', 'bad'); return; }
      if (!(nam >= 2000 && nam <= 2100)) { UI.toast('Năm ngân sách không hợp lệ.', 'bad'); return; }
      const old = S.all('ngansach').filter(r => r.donViId === dvId && +r.nam === nam);
      // Ghép với dòng cũ theo số thứ tự + nội dung: giữ mã dòng, lịch sử giải ngân, cán bộ theo dõi, số quyết toán
      const key = r => U.norm(r.stt) + '|' + U.norm(r.noiDung), byKey = new Map(), byND = new Map();
      old.forEach(r => { if (!byKey.has(key(r))) byKey.set(key(r), r); const k2 = U.norm(r.noiDung); if (!byND.has(k2)) byND.set(k2, r); });
      const used = new Set(), match = parsed.items.map(it => { let r = byKey.get(key(it)); if (!r || used.has(r.id)) r = byND.get(U.norm(it.noiDung)); if (r && used.has(r.id)) r = null; if (r) used.add(r.id); return r || null; });
      const bo = old.filter(r => !used.has(r.id));
      if (old.length && !await UI.confirm({ title: 'Cập nhật số liệu giải ngân?', msg: 'Đơn vị "' + Sc.refName('donvi', dvId) + '" năm ' + nam + ' đã có ' + old.length + ' dòng dự toán.\n\n• ' + used.size + ' dòng khớp: cập nhật số mới, ghi thêm mốc giải ngân ngày ' + (U.fmtDate(ngay) || 'hôm nay') + ' vào lịch sử, giữ cán bộ theo dõi.\n• ' + (parsed.items.length - used.size) + ' dòng mới được thêm.' + (bo.length ? '\n• ' + bo.length + ' dòng cũ không còn trên biểu sẽ bị xóa.' : '') + '\n\nPhần mềm tự lưu một bản chụp dữ liệu trước khi cập nhật (khôi phục tại Thiết lập).', ok: 'Cập nhật' })) return;
      try {
        if (old.length) await S.snapshot('Trước khi nhập lại biểu dự toán ' + nam);
        if (bo.length) await S.removeMany(bo.map(r => ['ngansach', r.id]), 'Xóa ' + bo.length + ' dòng dự toán không còn trên biểu mới của ' + Sc.refName('donvi', dvId) + ' năm ' + nam);
        const ids = parsed.items.map((_, i) => match[i] ? match[i].id : U.uid('ns')), cbs = S.all('canbo'), ngayHS = U.isISO(ngay) ? ngay : U.today();
        const items = parsed.items.map((it, i) => {
          const n = U.norm(it.noiDung), kt = U.norm(it.keToan).replace(/^d\/c\s*/, '');
          const cb = kt ? cbs.find(c => U.norm(c.tenGoi) === kt || U.norm(c.hoTen) === kt) : null;
          const cu = match[i];
          const rec = { id: ids[i], nam, donViId: dvId, parentId: it.parent >= 0 ? ids[it.parent] : '', stt: it.stt, noiDung: it.noiDung, thuTu: i, quyetDinh: it.quyetDinh, tienDo: it.tienDo, canBoId: cb ? cb.id : (cu && cu.canBoId) || '', ghiChu: it.keToan && !cb ? 'Người thực hiện ghi trên biểu: ' + it.keToan : (cu && cu.ghiChu) || '', ngayGN: ngay, nhomKP: (cu && cu.nhomKP) || '' };
          if (!cu) rec.createdAt = U.nowStamp();
          if (!it.isGroup) rec.gnHist = L.gnPush(cu ? (cu.gnHist && cu.gnHist.length ? cu.gnHist : L.gnHistOf(cu)) : [], ngayHS, it.giaiNgan, 'excel');
          ['chuyenNguon', 'duToan', 'boSung', 'dcTang', 'dcGiam', 'thuHoi', 'tietKiem', 'giaiNgan'].forEach(k => { rec[k] = it[k]; });
          if (it.level <= 1 && !rec.nhomKP) rec.nhomKP = n.includes('khong tu chu') ? 'Kinh phí không thường xuyên (không tự chủ)' : (n.includes('tu chu') || n.includes('tien thuong') || n.includes('tien luong')) ? 'Kinh phí thường xuyên (tự chủ)' : n.includes('chuong trinh') ? 'Kinh phí chương trình, đề án' : '';
          if (it.isGroup) { rec.goc = { tong: it.tongGoc }; ['chuyenNguon', 'duToan', 'boSung', 'dcTang', 'dcGiam', 'thuHoi', 'tietKiem', 'giaiNgan'].forEach(k => { rec.goc[k] = it[k]; }); }
          const m2 = it.noiDung.match(/Ch[ưu]ơng\s*\d+[;,\s-]*(Kho[ảa]n|Lo[ạa]i)\s*\d+/i); if (m2) rec.chuongKhoan = m2[0];
          return { c: 'ngansach', rec };
        });
        await S.saveMany(items, { note: 'Nhập ' + items.length + ' dòng dự toán năm ' + nam + ' của ' + Sc.refName('donvi', dvId) + ' từ tệp ' + fname });
        if (!A.Store.cfg.nam || A.Store.cfg.nam !== nam) await S.setCfg({ nam });
        A.vs.nsSel = { dv: dvId, lv: 9, tab: 'tq' };
        m.close(); UI.toast('Đã nhập ' + items.length + ' dòng dự toán.', 'ok');
      } catch (er) { UI.fail(er); }
    };
    $('[data-pick]', m.body).onclick = async () => {
      const file = await UI.pickFile('.xlsx,.xls'); if (!file) return;
      try {
        wb = await UI.readWorkbook(file); fname = file.name;
        const pref = wb.SheetNames.find(n => U.norm(n) === 'nhiem vu') || wb.SheetNames[0];
        step.innerHTML = '<div class="fld"><label for="ib_s">Trang tính (tệp có ' + wb.SheetNames.length + ' trang — chọn trang chứa số liệu mới nhất)</label><select class="sel" id="ib_s">' + wb.SheetNames.map(n => '<option' + (n === pref ? ' selected' : '') + '>' + e(n) + '</option>').join('') + '</select></div><div data-out class="mt"></div>';
        $('#ib_s', step).onchange = x => parseSheet(x.target.value);
        parseSheet(pref);
      } catch (er) { UI.fail(er); }
    };
  }

  A.views.ngansach = {
    title: 'Tài chính, ngân sách', sub: 'Dự toán, phân bổ, điều chỉnh, giải ngân thanh toán và quyết toán kinh phí của các đơn vị dự toán thuộc Sở',
    render(root) {
      const y = A.year() || +U.today().slice(0, 4), Sel = A.vs.nsSel || (A.vs.nsSel = { dv: '', lv: 9, tab: 'tq' });
      const dvs = S.all('donvi'); if (Sel.dv && !S.get('donvi', Sel.dv)) Sel.dv = '';
      const tree = L.nsTree(y, Sel.dv || null), T = tree.total, has = tree.count > 0;
      const nLech = tree.flat.filter(n => n.lech.length).length;
      const years = Array.from(new Set(S.all('ngansach').map(r => +r.nam))).sort();
      let h = (!A.year() ? '<div class="note mb">Đang chọn "Tất cả các năm" — dự toán luôn xem theo từng năm, nên trang này hiển thị năm ' + y + '.' + (years.length ? ' Các năm có dữ liệu: ' + years.join(', ') + '.' : '') + '</div>' : '') +
        '<div class="kpis mb"><div class="kpi static"><span class="k-l">Dự toán giao đầu năm ' + y + '</span><span class="k-v"><small>' + (has ? U.fmtShort(T.duToan) : '—') + '</small></span><span class="k-s">' + (has ? 'Chuyển nguồn ' + U.fmtShort(T.chuyenNguon) : '') + '</span></div><div class="kpi static"><span class="k-l">Điều chỉnh, bổ sung trong năm</span><span class="k-v"><small>' + (has ? U.fmtShort(T.boSung + T.dcTang - T.dcGiam - T.thuHoi) : '—') + '</small></span><span class="k-s">' + (has ? 'Bổ sung ' + U.fmtShort(T.boSung) + ' · thu hồi ' + U.fmtShort(T.thuHoi) : '') + '</span></div><div class="kpi acc static"><span class="k-l">Tổng kinh phí được sử dụng</span><span class="k-v"><small>' + (has ? U.fmtShort(T.tong) : '—') + '</small></span><span class="k-s">' + (has ? 'Tiết kiệm ' + U.fmtShort(T.tietKiem) : '') + '</span></div><div class="kpi ok static"><span class="k-l">Đã giải ngân, thanh toán</span><span class="k-v">' + (has ? U.fmtPct(T.tyLe) : '—') + '</span><span class="k-s">' + (has ? U.fmtShort(T.giaiNgan) : '') + '</span></div><div class="kpi warn static"><span class="k-l">Kinh phí còn lại</span><span class="k-v"><small>' + (has ? U.fmtShort(T.conLai) : '—') + '</small></span></div><div class="kpi teal static"><span class="k-l">Đã quyết toán</span><span class="k-v"><small>' + (has && T.quyetToan ? U.fmtShort(T.quyetToan) : '—') + '</small></span><span class="k-s">' + (has && T.quyetToan ? U.fmtPct(U.pct(T.quyetToan, T.tong)) + ' so với được sử dụng' : 'Chưa nhập số quyết toán') + '</span></div></div>' +
        '<div class="tabs" role="tablist">' + [['tq', 'Tổng quan giải ngân'], ['cn', 'Cập nhật giải ngân'], ['ct', 'Chi tiết dự toán'], ['dv', 'Theo đơn vị'], ['nhom', 'Dự toán – thực hiện – quyết toán'], ['ls', 'Lịch sử giải ngân']].map(t => '<button role="tab" data-tab="' + t[0] + '" class="' + (Sel.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>';
      if (Sel.tab === 'ct') {
        h += '<div class="toolbar"><select class="sel" data-dv aria-label="Đơn vị dự toán"><option value="">Tất cả đơn vị</option>' + dvs.map(d => '<option value="' + d.id + '"' + (d.id === Sel.dv ? ' selected' : '') + '>' + e(d.ten) + '</option>').join('') + '</select><div class="seg" aria-label="Mức chi tiết">' + [[0, 'Cấp 1'], [1, 'Cấp 2'], [2, 'Cấp 3'], [9, 'Tất cả']].map(s => '<button data-lv="' + s[0] + '" class="' + (Sel.lv === s[0] ? 'on' : '') + '">' + s[1] + '</button>').join('') + '</div><div class="search" style="max-width:260px">' + ic('search', 16) + '<input class="inp" type="search" data-q placeholder="Tìm nội dung…" aria-label="Tìm nội dung"></div><span class="sp"></span><button class="btn" data-xls>' + ic('download', 16) + 'Xuất Excel</button><button class="btn" data-imp>' + ic('upload', 16) + 'Nhập biểu giải ngân</button><button class="btn primary" data-add>' + ic('plus', 16) + 'Thêm dòng dự toán</button></div>' +
          (nLech ? '<div class="note warn mb"><b>' + nLech + ' dòng tổng có số nhập từ Excel khác tổng các dòng chi tiết</b> (đánh dấu ⚠). Phần mềm hiển thị tổng các dòng chi tiết; số gốc trên biểu xem khi rê chuột vào dấu ⚠. Cần rà soát lại biểu gốc.</div>' : '') + '<div data-tree></div>';
      } else if (Sel.tab === 'dv') {
        const rows = L.nsByDonVi(y);
        h += rows.length ? '<div class="grid-21"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Đơn vị dự toán</th><th class="num">Dự toán đầu năm</th><th class="num">Tổng được sử dụng</th><th class="num">Đã giải ngân</th><th class="num">Còn lại</th><th class="num">Quyết toán</th><th>Tỷ lệ giải ngân</th></tr></thead><tbody>' + rows.map(x => '<tr class="click" data-pick="' + x.dv.id + '"><td><b>' + e(x.dv.ten) + '</b></td><td class="num">' + U.fmtMoney(x.total.duToan) + '</td><td class="num">' + U.fmtMoney(x.total.tong) + '</td><td class="num">' + U.fmtMoney(x.total.giaiNgan) + '</td><td class="num">' + U.fmtMoney(x.total.conLai) + '</td><td class="num">' + U.fmtMoney(x.total.quyetToan) + '</td><td style="min-width:130px">' + UI.pbar(x.total.tyLe || 0) + '</td></tr>').join('') + '</tbody><tfoot><tr><td>Toàn ngành (' + rows.length + ' đơn vị có dữ liệu)</td><td class="num">' + U.fmtMoney(U.sum(rows, x => x.total.duToan)) + '</td><td class="num">' + U.fmtMoney(U.sum(rows, x => x.total.tong)) + '</td><td class="num">' + U.fmtMoney(U.sum(rows, x => x.total.giaiNgan)) + '</td><td class="num">' + U.fmtMoney(U.sum(rows, x => x.total.conLai)) + '</td><td class="num">' + U.fmtMoney(U.sum(rows, x => x.total.quyetToan)) + '</td><td>' + U.fmtPct(U.pct(U.sum(rows, x => x.total.giaiNgan), U.sum(rows, x => x.total.tong))) + '</td></tr></tfoot></table></div><div class="card"><div class="card-h"><h3>Đơn vị chưa có dự toán năm ' + y + '</h3></div><div class="card-b">' + (dvs.filter(d => !rows.some(x => x.dv.id === d.id)).map(d => '<div class="small">' + e(d.ten) + '</div>').join('') || '<div class="small muted">Mọi đơn vị đều đã có dữ liệu.</div>') + '</div></div></div>' : '<div class="card">' + UI.empty('Chưa có dự toán năm ' + y, 'Nhập biểu giải ngân từ Excel hoặc thêm từng dòng ở thẻ "Chi tiết dự toán".') + '</div>';
      } else if (Sel.tab === 'nhom') {
        const g = L.nsByNhom(y), ty = v => U.fmtNum(v / 1e9, v >= 1e10 ? 0 : 1);
        h += g.length ? '<div class="grid2"><div class="card"><div class="card-h"><h3>So sánh dự toán, thực hiện, quyết toán</h3><div class="sub">Tỷ đồng — theo nhóm kinh phí, năm ' + y + '</div></div><div class="card-b">' + UI.bars({ cats: g.map(x => U.trunc(x.k.replace('Kinh phí ', ''), 22)), fmt: ty, labels: true, series: [{ name: 'Được sử dụng', color: 'var(--violet)', vals: g.map(x => x.tong) }, { name: 'Đã giải ngân', color: 'var(--accent)', vals: g.map(x => x.giaiNgan) }, { name: 'Quyết toán', color: 'var(--teal)', vals: g.map(x => x.quyetToan) }] }) + '</div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nhóm kinh phí</th><th class="num">Dự toán đầu năm</th><th class="num">Được sử dụng</th><th class="num">Đã giải ngân</th><th class="num">Quyết toán</th><th class="num">Giải ngân − quyết toán</th></tr></thead><tbody>' + g.map(x => '<tr><td>' + e(x.k) + '</td><td class="num">' + U.fmtMoney(x.duToan) + '</td><td class="num">' + U.fmtMoney(x.tong) + '</td><td class="num">' + U.fmtMoney(x.giaiNgan) + '</td><td class="num">' + U.fmtMoney(x.quyetToan) + '</td><td class="num">' + (x.quyetToan ? U.fmtMoney(x.giaiNgan - x.quyetToan) : '—') + '</td></tr>').join('') + '</tbody><tfoot><tr><td>Cộng</td><td class="num">' + U.fmtMoney(U.sum(g, x => x.duToan)) + '</td><td class="num">' + U.fmtMoney(U.sum(g, x => x.tong)) + '</td><td class="num">' + U.fmtMoney(U.sum(g, x => x.giaiNgan)) + '</td><td class="num">' + U.fmtMoney(U.sum(g, x => x.quyetToan)) + '</td><td></td></tr></tfoot></table></div></div><div class="note mt">Nhóm kinh phí lấy theo trường "Nhóm kinh phí" của dòng hoặc của dòng cấp trên gần nhất. Dòng chưa phân nhóm được gộp vào "(chưa phân nhóm)".</div>' : '<div class="card">' + UI.empty('Chưa có dự toán năm ' + y, '') + '</div>';
      } else h += '<div data-gn></div>';
      root.innerHTML = h;
      $$('[data-tab]', root).forEach(b => b.onclick = () => { Sel.tab = b.dataset.tab; A.render(); });
      $$('[data-pick]', root).forEach(tr => tr.onclick = () => { Sel.dv = tr.dataset.pick; Sel.tab = 'ct'; A.render(); });
      if ($('[data-gn]', root)) { A.gnPane(Sel.tab, $('[data-gn]', root), y, Sel, { importBudget }); return; }
      if (Sel.tab !== 'ct') return;
      const box = $('[data-tree]', root);
      const draw = q => {
        if (!has) { box.innerHTML = '<div class="card">' + UI.empty('Chưa có dự toán năm ' + y + (Sel.dv ? ' của đơn vị này' : ''), 'Cách nhanh nhất: bấm "Nhập biểu giải ngân" và chọn tệp Excel theo dõi giải ngân Phòng đang dùng. Phần mềm không tạo sẵn số liệu tài chính.') + '</div>'; return; }
        const nq = U.norm(q || ''); let list = tree.flat.filter(n => n.level <= Sel.lv);
        if (nq) list = tree.flat.filter(n => U.norm(n.r.stt + ' ' + n.r.noiDung + ' ' + (n.r.quyetDinh || '') + ' ' + (n.r.tienDo || '')).includes(nq));
        const multi = !Sel.dv;
        box.innerHTML = '<div class="tbl-wrap" style="max-height:74vh;overflow:auto"><table class="tbl"><thead><tr><th>TT</th><th>Nội dung</th>' + NS_COLS.map(c => '<th class="num">' + c[1] + '</th>').join('') + '<th>Tỷ lệ</th><th>Tiến độ, theo dõi</th></tr></thead><tbody>' +
          list.map(n => '<tr class="click lv' + Math.min(n.level, 3) + '" data-id="' + n.r.id + '" tabindex="0"><td class="nowrap">' + e(n.r.stt || '') + '</td><td class="wrap" style="min-width:300px;padding-left:' + (12 + (nq ? 0 : n.level) * 16) + 'px">' + e(n.r.noiDung) + (multi && n.level === 0 ? ' <span class="tag">' + e(Sc.refName('donvi', n.r.donViId)) + '</span>' : '') + (n.lech.length ? ' <span class="lech" title="' + e('Số trên biểu Excel khác tổng các dòng con — ' + n.lech.map(l => (NS_COLS.find(c => c[0] === l.f) || [0, l.f])[1] + ': biểu ' + U.fmtMoney(l.goc) + ', tính ' + U.fmtMoney(l.tinh)).join('; ')) + '">⚠</span>' : '') + '</td>' + NS_COLS.map(c => '<td class="num">' + (n.sum[c[0]] ? U.fmtMoney(n.sum[c[0]]) : '<span class="muted">0</span>') + '</td>').join('') + '<td style="min-width:110px">' + (n.sum.tong > 0 ? UI.pbar(n.sum.tyLe || 0) : '') + '</td><td class="small" style="min-width:180px;max-width:280px">' + e(U.trunc(n.r.tienDo || '', 90)) + (n.r.canBoId ? '<div class="t2">' + e(Sc.refName('canbo', n.r.canBoId)) + '</div>' : '') + '</td></tr>').join('') +
          '</tbody>' + (nq ? '' : '<tfoot><tr><td></td><td>TỔNG CỘNG</td>' + NS_COLS.map(c => '<td class="num">' + U.fmtMoney(T[c[0]]) + '</td>').join('') + '<td>' + U.fmtPct(T.tyLe) + '</td><td></td></tr></tfoot>') + '</table></div><div class="pager"><span>' + list.length + ' / ' + tree.flat.length + ' dòng</span></div>';
        $$('tr[data-id]', box).forEach(tr => { tr.onclick = () => A.open('ngansach', tr.dataset.id); tr.onkeydown = x => { if (x.key === 'Enter') A.open('ngansach', tr.dataset.id); }; });
      };
      draw('');
      $('[data-dv]', root).onchange = x => { Sel.dv = x.target.value; A.render(); };
      $$('[data-lv]', root).forEach(b => b.onclick = () => { Sel.lv = +b.dataset.lv; $$('[data-lv]', root).forEach(x => x.classList.toggle('on', x === b)); draw($('[data-q]', root).value); });
      $('[data-q]', root).addEventListener('input', U.debounce(x => draw(x.target.value), 160));
      $('[data-add]', root).onclick = () => UI.form({ coll: 'ngansach', rec: { nam: y, donViId: Sel.dv || (dvs[0] || {}).id || '' } });
      $('[data-imp]', root).onclick = importBudget;
      $('[data-xls]', root).onclick = () => {
        if (!has) { UI.toast('Chưa có dữ liệu để xuất.', 'bad'); return; }
        const aoa = [['BÁO CÁO TÌNH HÌNH THỰC HIỆN GIẢI NGÂN THANH TOÁN NGÂN SÁCH NHÀ NƯỚC NĂM ' + y], ['Đơn vị: ' + (Sel.dv ? S.get('donvi', Sel.dv).ten : 'Tất cả đơn vị') + ' — xuất ngày ' + U.fmtDate(U.today())], ['ĐVT: đồng'], ['TT', 'Nội dung', 'Quyết định'].concat(NS_COLS.map(c => c[1])).concat(['Tỷ lệ giải ngân (%)', 'Quyết toán', 'Tiến độ triển khai', 'Cán bộ theo dõi'])];
        tree.flat.forEach(n => aoa.push([n.r.stt || '', '  '.repeat(n.level) + n.r.noiDung, n.r.quyetDinh || ''].concat(NS_COLS.map(c => n.sum[c[0]])).concat([n.sum.tyLe === null ? '' : Math.round(n.sum.tyLe * 100) / 100, n.sum.quyetToan, n.r.tienDo || '', Sc.refName('canbo', n.r.canBoId)])));
        aoa.push(['', 'TỔNG CỘNG', ''].concat(NS_COLS.map(c => T[c[0]])).concat([T.tyLe === null ? '' : Math.round(T.tyLe * 100) / 100, T.quyetToan, '', '']));
        UI.xlsx('giai-ngan-nsnn-' + y + '-' + UI.stamp() + '.xlsx', [{ name: 'Giai ngan ' + y, aoa, widths: [7, 70, 30].concat(NS_COLS.map(() => 18)).concat([12, 18, 50, 18]) }]);
        UI.toast('Đã xuất ' + tree.flat.length + ' dòng.', 'ok');
      };
    }
  };

  /* ================= TÀI SẢN CÔNG ================= */
  function bienDongDialog(t, reopen) {
    const m = UI.modal({
      title: 'Ghi biến động tài sản', sub: t.ten,
      body: '<div class="form"><div class="fld"><label for="bd_d">Ngày</label><input class="inp" type="date" id="bd_d" value="' + U.today() + '"></div><div class="fld"><label for="bd_l">Loại biến động</label><select class="sel" id="bd_l">' + A.list('loaiBienDongTS').map(x => '<option>' + e(x) + '</option>').join('') + '</select></div><div class="fld full"><label for="bd_n">Nội dung</label><input class="inp" id="bd_n"></div><div class="fld"><label for="bd_q">Số quyết định</label><input class="inp" id="bd_q"></div><div class="fld"><label for="bd_g">Giá trị (đồng)</label><input class="inp num" id="bd_g" data-money inputmode="numeric"></div>' +
        '<div class="fsec">Cập nhật tài sản sau biến động (bỏ trống là giữ nguyên)</div><div class="fld"><label for="bd_t">Tình trạng sử dụng mới</label><select class="sel" id="bd_t"><option value="">— Giữ nguyên: ' + e(t.tinhTrang || 'chưa ghi') + ' —</option>' + A.list('tinhTrangTS').map(x => '<option>' + e(x) + '</option>').join('') + '</select></div><div class="fld"><label for="bd_dv">Đơn vị sử dụng mới (khi điều chuyển)</label><select class="sel" id="bd_dv"><option value="">— Giữ nguyên —</option>' + dvOpts().map(o => '<option value="' + o[0] + '">' + e(o[1]) + '</option>').join('') + '</select></div><div class="fld"><label for="bd_c">Giá trị còn lại mới (đồng)</label><input class="inp num" id="bd_c" data-money inputmode="numeric"></div></div>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, {
        label: 'Ghi biến động', cls: 'primary', icon: 'check', on: async a => {
          const g = id => $('#' + id, a.body).value.trim(), ngay = g('bd_d');
          if (!U.isISO(ngay)) { UI.toast('Ngày không hợp lệ.', 'bad'); return; }
          const gv = U.parseNum(g('bd_g')), cl = U.parseNum(g('bd_c'));
          if (gv === null || cl === null) { UI.toast('Giá trị phải là số.', 'bad'); return; }
          const r = Object.assign({}, t, { bienDong: (t.bienDong || []).concat([{ ngay, loai: g('bd_l'), noiDung: g('bd_n'), soQD: g('bd_q'), giaTri: gv }]) });
          if (g('bd_t')) r.tinhTrang = g('bd_t'); if (g('bd_dv')) r.donViId = g('bd_dv'); if (cl !== '') r.conLai = cl;
          if (g('bd_l') === 'Kiểm kê') r.ngayKiemKe = ngay;
          const chk = Sc.check('taisan', r); if (chk.errors.length) { UI.toast(chk.errors[0], 'bad'); return; }
          try { await S.save('taisan', r); a.close(); UI.toast('Đã ghi biến động.', 'ok'); if (reopen) reopen(); } catch (er) { UI.fail(er); }
        }
      }]
    });
    UI.on(m.body, 'input', '[data-money]', el => { el.value = el.value.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); });
  }
  A.openers.taisan = id => UI.detail({
    coll: 'taisan', id,
    head: t => {
      let h = '<div class="gap mb">' + UI.chip(t.tinhTrang === 'Đang sử dụng' ? 'hoanthanh' : ['Đã thanh lý', 'Đã điều chuyển'].includes(t.tinhTrang) ? '' : t.tinhTrang ? 'saphan' : '', t.tinhTrang || 'Chưa ghi tình trạng') + '<span class="tag">' + e(t.loai || '') + '</span>' + (U.num(t.nguyenGia) ? '<span class="tag">Hao mòn lũy kế: ' + U.fmtMoney(U.num(t.nguyenGia) - U.num(t.conLai)) + ' đồng</span>' : '') + '</div>';
      if (L.isNhaDat(t)) {
        const hs = L.ndHoSo(t), w = A.Schema.C.taisan.warn(t);
        h += '<div class="kpis mb"><div class="kpi teal static"><span class="k-l">Diện tích đất</span><span class="k-v">' + (t.dtDat === '' || t.dtDat === undefined ? '—' : U.fmtNum(t.dtDat)) + '<small> m²</small></span></div><div class="kpi static"><span class="k-l">Diện tích nhà</span><span class="k-v">' + (t.dtNha === '' || t.dtNha === undefined ? '—' : U.fmtNum(t.dtNha)) + '<small> m²</small></span></div><div class="kpi ' + (t.gcnTT === 'dacap' ? 'ok' : t.gcnTT ? 'bad' : '') + ' static"><span class="k-l">Giấy chứng nhận</span><span class="k-v" style="font-size:16px">' + e(hs[1]) + '</span><span class="k-s">' + e(t.gcnSo || '') + '</span></div><div class="kpi ' + (t.chuaDKBD || t.hsThieu ? 'warn' : 'ok') + ' static"><span class="k-l">Hồ sơ</span><span class="k-v" style="font-size:16px">' + (t.hsThieu ? 'Thiếu hồ sơ' : t.hsDayDu ? 'Đầy đủ hồ sơ' : 'Chưa ghi') + '</span><span class="k-s">' + (t.chuaDKBD ? 'Chưa đăng ký biến động đất đai' : '&nbsp;') + '</span></div></div>' +
          (w.length ? '<div class="note warn mb">' + w.map(e).join('<br>') + '</div>' : '') + (t.nd ? '<div class="small muted mb">Nguồn: Phụ biểu 0A.01-T.STC, dòng ' + t.nd.dong + (t.nd.tep ? ' tệp ' + e(t.nd.tep) : '') + (t.ndNgay ? ', hiện trạng đến ' + U.fmtDate(t.ndNgay) : '') + '.</div>' : '');
      }
      return h;
    },
    actions: [{ label: 'Ghi biến động', icon: 'history', on: (t, a, reopen) => bienDongDialog(t, reopen) }]
  });

  /* ---------- Nhập Phụ biểu 0A.01-T.STC ---------- */
  const tokens = s => new Set(U.norm(s).split(/[^a-z0-9]+/).filter(x => x && x !== 'va'));
  const suggestDV = name => {   // chỉ gợi ý khi tên trên biểu chứa đủ các từ của tên đơn vị dự toán — không suy diễn quan hệ cấp trên
    const tk = tokens(name); let best = null, bn = 0;
    S.all('donvi').forEach(d => { const dt = tokens(d.ten); if (dt.size && [...dt].every(x => tk.has(x)) && dt.size > bn) { best = d; bn = dt.size; } });
    return best ? best.id : '';
  };
  async function importNhaDat() {
    const m = UI.modal({
      title: 'Nhập biểu hiện trạng tài sản nhà, đất', sub: 'Phụ biểu 0A.01-T.STC — Tổng hợp hiện trạng tài sản nhà, đất', size: 'lg',
      body: '<p class="soft">Mỗi dòng của biểu là một cơ sở nhà, đất. Phần mềm nhận cột theo tiêu đề (chịu được việc chèn, đổi vị trí cột), đọc giá trị đã tính của ô công thức, đối chiếu với dòng tổng. Nhập lại biểu kỳ sau sẽ cập nhật đúng cơ sở theo đơn vị được giao và tên tài sản, không tạo trùng; mã tài sản, biến động, hồ sơ đính kèm đã nhập tại phần mềm được giữ nguyên.</p><div class="gap"><button class="btn primary" data-pick>' + ic('upload', 16) + 'Chọn tệp Excel</button></div><div data-step class="mt"></div>',
      buttons: [{ label: 'Đóng', on: a => a.close() }]
    });
    let wb = null, fname = '', parsed = null, map = {}, ngay = '';
    const step = $('[data-step]', m.body);
    const plan = () => {
      const exist = new Map(S.all('taisan').filter(L.isNhaDat).map(t => [L.ndKey(t), t])), out = { items: [], them: 0, sua: 0, giu: 0, vangMat: [] }, seen = new Set();
      parsed.items.forEach(it => {
        const old = exist.get(it.ndKey) || exist.get(U.norm(it.donViGiao) + '|' + U.norm(it.ten)); seen.add(old ? old.id : null);
        const src = { ten: it.ten, donViGiao: it.donViGiao, donViId: map[U.norm(it.donViGiao)] || '', dtNha: it.dtNha, dtDat: it.dtDat, nguyenGia: it.nguyenGia, conLai: it.conLai, htSD: it.htSD, gcnTT: it.gcnTT, gcnSo: it.gcnSo, gcnNgay: it.gcnNgay, hsDayDu: it.hsDayDu, hsThieu: it.hsThieu, chuaDKBD: it.chuaDKBD, nguyenNhanHS: it.nguyenNhanHS, ghiChuBieu: it.ghiChuBieu, ndNgay: ngay, ndKey: it.ndKey, ndThuTu: it.stt, nd: { bieu: '0A.01-T.STC', dong: it.row, tep: fname } };
        let rec;
        if (old) { rec = Object.assign({}, old, src); if (!map[U.norm(it.donViGiao)] && old.donViId) rec.donViId = old.donViId; }
        else rec = Object.assign({ loai: 'Cơ sở nhà, đất', soLuong: 1, tinhTrang: it.htSD ? 'Đang sử dụng' : '', bienDong: [], dinhKem: [], ghiChu: '' }, src);
        const real = !old || A.Schema.diff('taisan', old, rec).length > 0;
        if (!old) out.them++; else if (real) out.sua++; else out.giu++;
        out.items.push({ rec, real, isNew: !old });
      });
      exist.forEach(t => { if (t.nd && !seen.has(t.id)) out.vangMat.push(t); });
      return out;
    };
    const draw = () => {
      const s = L.ndStats(parsed.items), units = U.groupBy(parsed.items, x => U.norm(x.donViGiao)), dvs = S.all('donvi'), p = plan();
      const after = parsed.items.filter(x => x.gcnNgay && ngay && x.gcnNgay > ngay);
      $('[data-out]', step).innerHTML = !parsed.items.length ? '<div class="note bad">' + e(parsed.warnings.join(' ') || 'Không đọc được dòng tài sản nào.') + '</div>' :
        '<div class="note">' + e(parsed.title || 'Biểu không có tiêu đề') + ' — đọc được <b>' + parsed.items.length + '</b> cơ sở nhà, đất của <b>' + units.size + '</b> đơn vị được giao quản lý.</div>' +
        '<div class="kpis mt"><div class="kpi teal static"><span class="k-l">Diện tích đất</span><span class="k-v"><small>' + U.fmtNum(s.dtDat, 1) + ' m²</small></span></div><div class="kpi static"><span class="k-l">Diện tích nhà</span><span class="k-v"><small>' + U.fmtNum(s.dtNha, 1) + ' m²</small></span></div><div class="kpi acc static"><span class="k-l">Nguyên giá</span><span class="k-v"><small>' + U.fmtShort(s.nguyenGia) + '</small></span><span class="k-s">Còn lại ' + U.fmtShort(s.conLai) + '</span></div><div class="kpi ok static"><span class="k-l">Đã cấp GCN</span><span class="k-v">' + s.daCap + '</span><span class="k-s">Chưa cấp ' + s.chuaCap + ' · chưa ghi ' + s.chuaRo + '</span></div><div class="kpi warn static"><span class="k-l">Chưa ĐK biến động · thiếu hồ sơ</span><span class="k-v">' + s.chuaDK + ' · ' + s.hsThieu + '</span></div></div>' +
        '<div class="kpis mt"><div class="kpi ok static"><span class="k-l">Thêm mới</span><span class="k-v">' + p.them + '</span></div><div class="kpi info static"><span class="k-l">Cập nhật</span><span class="k-v">' + p.sua + '</span></div><div class="kpi static"><span class="k-l">Không đổi</span><span class="k-v">' + p.giu + '</span></div></div>' +
        '<div class="form mt"><div class="fld"><label for="nd_ngay">Hiện trạng tính đến ngày</label><input class="inp" type="date" id="nd_ngay" value="' + e(ngay) + '"><div class="help">Lấy từ tên tệp nếu có; sửa nếu khác.</div></div></div>' +
        (parsed.warnings.length || after.length ? '<div class="note warn mt"><b>Kết quả kiểm tra biểu</b> (vẫn nhập được; các điểm này được ghi lại để rà soát):<ul style="margin:4px 0 0;padding-left:18px">' + parsed.warnings.map(w => '<li>' + e(w) + '</li>').join('') + after.map(x => '<li>Dòng ' + x.row + ': ngày cấp GCN ' + U.fmtDate(x.gcnNgay) + ' sau ngày lập biểu ' + U.fmtDate(ngay) + ' — khả năng bị đảo ngày, tháng.</li>').join('') + '</ul></div>' : '') +
        (p.vangMat.length ? '<div class="note mt">' + p.vangMat.length + ' cơ sở nhập từ biểu trước không có trong biểu này (được giữ lại, không xóa): ' + e(p.vangMat.slice(0, 4).map(t => U.trunc(t.ten, 50)).join('; ')) + (p.vangMat.length > 4 ? '…' : '') + '</div>' : '') +
        '<div class="eyebrow">Gắn đơn vị được giao quản lý với đơn vị dự toán (tùy chọn)</div><p class="small soft" style="margin-top:-4px">Dùng để tổng hợp theo đơn vị dự toán. Phần mềm chỉ gợi ý khi tên trên biểu chứa đủ tên đơn vị dự toán; các đơn vị cấp dưới (Hạt Kiểm lâm, Ban quản lý rừng…) anh/chị tự chọn — phần mềm không suy đoán quan hệ trực thuộc. Lựa chọn được nhớ cho lần nhập sau.</p>' +
        '<div class="gap mb"><span class="small">Gán các đơn vị chưa gán vào</span><select class="sel" style="width:auto" data-bulk aria-label="Đơn vị dự toán để gán hàng loạt"><option value="">— chọn —</option>' + dvs.map(d => '<option value="' + d.id + '">' + e(d.ten) + '</option>').join('') + '</select></div>' +
        '<div class="tbl-wrap" style="max-height:260px;overflow:auto"><table class="tbl"><thead><tr><th>Đơn vị được giao quản lý (theo biểu)</th><th class="num">Số cơ sở</th><th>Đơn vị dự toán</th></tr></thead><tbody>' + [...units.entries()].map(([k, l]) => '<tr><td class="wrap">' + e(l[0].donViGiao) + '</td><td class="num">' + l.length + '</td><td><select class="sel" style="height:32px;min-width:220px" data-map="' + e(k) + '" aria-label="Đơn vị dự toán của ' + e(l[0].donViGiao) + '"><option value="">— Chưa gán —</option>' + dvs.map(d => '<option value="' + d.id + '"' + (map[k] === d.id ? ' selected' : '') + '>' + e(d.ten) + '</option>').join('') + '</select></td></tr>').join('') + '</tbody></table></div>';
      $$('[data-map]', step).forEach(s2 => s2.onchange = () => { map[s2.dataset.map] = s2.value; draw(); });
      const bulk = $('[data-bulk]', step); if (bulk) bulk.onchange = () => { if (!bulk.value) return; units.forEach((_, k) => { if (!map[k]) map[k] = bulk.value; }); draw(); };
      const nd = $('#nd_ngay', step); if (nd) nd.onchange = () => { ngay = U.isISO(nd.value) ? nd.value : ''; draw(); };
      m.setFooter(parsed.items.length ? [{ label: 'Đóng', on: a => a.close() }, { label: 'Nhập ' + parsed.items.length + ' cơ sở nhà, đất', cls: 'primary', icon: 'check', on: commit }] : [{ label: 'Đóng', on: a => a.close() }]);
    };
    const commit = async a => {
      if (!ngay) { UI.toast('Nhập ngày tính hiện trạng của biểu.', 'bad'); return; }
      const p = plan();
      try {
        if (p.sua) await S.snapshot('Trước khi nhập lại biểu nhà, đất');
        const items = p.items.filter(x => x.real || x.isNew).map(x => ({ c: 'taisan', rec: x.rec }));
        let seq = 0; const base = A.Schema.nextMa('taisan');
        items.forEach(x => { if (!x.rec.ma) x.rec.ma = base.replace(/(\d+)$/, d => String(+d + seq++).padStart(3, '0')); });
        // giữ thứ tự dòng của biểu cho cả bản ghi không đổi
        const keep = p.items.filter(x => !x.real && !x.isNew).map(x => x.rec);
        if (items.length) await S.saveMany(items, { note: 'Nhập biểu hiện trạng nhà, đất (0A.01-T.STC) tệp ' + fname + ': ' + p.them + ' thêm, ' + p.sua + ' cập nhật' });
        if (keep.length) await S.saveMany(keep.map(r => ({ c: 'taisan', rec: r })), { silent: true });
        const ndMap = Object.assign({}, S.cfg.ndMap || {}, map); await S.setCfg({ ndMap });
        a.close(); UI.toast('Đã nhập: ' + p.them + ' cơ sở thêm, ' + p.sua + ' cập nhật, ' + p.giu + ' không đổi.', 'ok');
        A.vs.tsG = { g: 'dvg' };
      } catch (er) { UI.fail(er); }
    };
    $('[data-pick]', m.body).onclick = async () => {
      const file = await UI.pickFile('.xlsx,.xls'); if (!file) return;
      try {
        wb = await UI.readWorkbook(file); fname = file.name;
        const fm = fname.match(/(\d{1,2})[-_.](\d{1,2})[-_.](\d{4})/); ngay = fm ? (U.parseDate(fm[1] + '/' + fm[2] + '/' + fm[3]) || '') : '';
        const rowsOf = n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null });
        const pref = wb.SheetNames.find(n => L.parseNhaDat(rowsOf(n)).items.length) || wb.SheetNames[0];
        step.innerHTML = '<div class="fld"><label for="nd_s">Trang tính</label><select class="sel" id="nd_s">' + wb.SheetNames.map(n => '<option' + (n === pref ? ' selected' : '') + '>' + e(n) + '</option>').join('') + '</select></div><div data-out class="mt"></div>';
        const load = n => { parsed = L.parseNhaDat(rowsOf(n)); map = {}; const saved = S.cfg.ndMap || {}; parsed.items.forEach(x => { const k = U.norm(x.donViGiao); if (map[k] === undefined) map[k] = saved[k] !== undefined ? saved[k] : suggestDV(x.donViGiao); }); draw(); };
        $('#nd_s', step).onchange = x => load(x.target.value);
        load(pref);
      } catch (er) { UI.fail(er); }
    };
  }

  /* ---------- Xuất đúng mẫu Phụ biểu 0A.01-T.STC ---------- */
  A.exportNhaDat = list => {
    list = list.slice().sort((a, b) => (U.num(a.ndThuTu) || 1e9) - (U.num(b.ndThuTu) || 1e9) || U.cmp(L.ndDonVi(a), L.ndDonVi(b)) || U.cmp(a.ten, b.ten));
    const x = v => v ? 'x' : '', n = v => (v === '' || v === undefined || v === null) ? '' : +v, s = L.ndStats(list);
    const ngay = list.map(t => t.ndNgay).filter(Boolean).sort().pop();
    const aoa = [
      ['', '', '', '', '', '', '', '', 'Phụ biểu số 0A.01-T.STC'],
      ['TỔNG HỢP HIỆN TRẠNG TÀI SẢN NHÀ, ĐẤT'],
      ['(' + A.cfg('coQuan') + (ngay ? ' — hiện trạng đến ngày ' + U.fmtDate(ngay) : '') + '; xuất từ phần mềm ngày ' + U.fmtDate(U.today()) + ')'],
      [],
      ['STT', 'Tên cơ quan, đơn vị đang được giao quản lý', 'Tên tài sản', 'Diện tích nhà (m²)', 'Diện tích đất (m²)', 'Giá trị tài sản (đồng)', '', 'Hiện trạng sử dụng (tích dấu X vào ô tương ứng)', '', 'Hồ sơ pháp lý (tích dấu X vào ô tương ứng)', '', '', '', '', '', '', 'Ghi chú'],
      ['', '', '', '', '', 'Nguyên giá', 'Giá trị còn lại', 'Tiếp tục sử dụng', '', 'Đã được cấp giấy chứng nhận QSD đất, tài sản', 'Đầy đủ hồ sơ hình thành tài sản', 'Đã được cấp GCN, hồ sơ tài sản nhưng mất mát, thất lạc', 'Chưa được cấp giấy chứng nhận QSD đất, tài sản', 'Chưa đăng ký hồ sơ biến động đất đai', 'Thiếu hồ sơ hình thành tài sản', 'Nguyên nhân chưa đăng ký biến động, chưa đầy đủ hồ sơ tài sản', ''],
      ['', '', '', '', '', '', '', 'Đúng mục đích', 'Không đúng mục đích', '', '', '', '', '', '', '', ''],
      ['', A.cfg('coQuan').replace(/ tỉnh .*$/i, '').toUpperCase(), '', s.dtNha, s.dtDat, s.nguyenGia, s.conLai, '', '', '', '', '', '', '', '', '', '']
    ].concat(list.map((t, i) => [i + 1, L.ndDonVi(t), t.ten, n(t.dtNha), n(t.dtDat), n(t.nguyenGia), n(t.conLai), x(t.htSD === 'dung'), x(t.htSD === 'khongdung'), t.gcnTT === 'dacap' ? (t.gcnSo || 'x') : '', x(t.hsDayDu), x(t.gcnTT === 'matmat'), x(t.gcnTT === 'chuacap'), x(t.chuaDKBD), x(t.hsThieu), t.nguyenNhanHS || '', t.ghiChuBieu || '']));
    const M = (r1, c1, r2, c2) => ({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
    UI.xlsx('hien-trang-nha-dat-0A01-' + UI.stamp() + '.xlsx', [{
      name: 'A01-STC', aoa, widths: [5, 34, 46, 12, 12, 17, 17, 9, 9, 24, 10, 12, 12, 12, 10, 30, 28],
      merges: [M(1, 0, 1, 16), M(2, 0, 2, 16), M(4, 0, 6, 0), M(4, 1, 6, 1), M(4, 2, 6, 2), M(4, 3, 6, 3), M(4, 4, 6, 4), M(4, 5, 4, 6), M(5, 5, 6, 5), M(5, 6, 6, 6), M(4, 7, 4, 8), M(5, 7, 5, 8), M(4, 9, 4, 15)].concat([9, 10, 11, 12, 13, 14, 15].map(c => M(5, c, 6, c))).concat([M(4, 16, 6, 16)])
    }]);
    UI.toast('Đã xuất ' + list.length + ' cơ sở nhà, đất theo mẫu 0A.01-T.STC.', 'ok');
  };

  A.views.taisan = {
    title: 'Tài sản công', sub: 'Tài sản của các đơn vị thuộc phạm vi tổng hợp, tham mưu của Phòng: nhà, đất, phương tiện, máy móc; nguyên giá, giá trị còn lại, hồ sơ pháp lý, biến động',
    render(root, p) {
      const all = S.all('taisan'), G = A.vs.tsG || (A.vs.tsG = { g: 'dv' }), nd = all.filter(L.isNhaDat), ns = L.ndStats(nd);
      const kf = { dv: t => Sc.refName('donvi', t.donViId), dvg: t => L.isNhaDat(t) ? L.ndDonVi(t) : Sc.refName('donvi', t.donViId), loai: t => t.loai, tt: t => t.tinhTrang, nguon: t => t.nguon, gcn: t => L.isNhaDat(t) ? L.ndHoSo(t)[1] : '(không phải nhà, đất)' };
      const groups = L.tsGroup(G.g === 'dvg' || G.g === 'gcn' ? nd : all, kf[G.g] || kf.dv), cho = L.tsCanXuLy();
      const y = +U.today().slice(0, 4), bd = all.flatMap(t => (t.bienDong || []).filter(b => U.yearOf(b.ngay) === y).map(b => ({ t, b })));
      const ndNgay = nd.map(t => t.ndNgay).filter(Boolean).sort().pop();
      const k = (cls, label, val, sub, f) => '<button class="kpi ' + cls + '"' + (f ? ' data-ndf="' + f + '"' : ' tabindex="-1"') + '><span class="k-l">' + label + '</span><span class="k-v">' + val + '</span><span class="k-s">' + (sub || '&nbsp;') + '</span></button>';
      const top = '<div class="kpis mb"><div class="kpi acc static"><span class="k-l">Tổng số tài sản</span><span class="k-v">' + (all.length ? U.fmtNum(U.sum(all, t => U.num(t.soLuong) || 1), 0) : '—') + '</span><span class="k-s">' + all.length + ' dòng theo dõi</span></div><div class="kpi static"><span class="k-l">Tổng nguyên giá</span><span class="k-v"><small>' + (all.length ? U.fmtShort(U.sum(all, t => t.nguyenGia)) : '—') + '</small></span></div><div class="kpi static"><span class="k-l">Giá trị còn lại</span><span class="k-v"><small>' + (all.length ? U.fmtShort(U.sum(all, t => t.conLai)) : '—') + '</small></span><span class="k-s">' + (all.length ? U.fmtPct(U.pct(U.sum(all, t => t.conLai), U.sum(all, t => t.nguyenGia))) + ' nguyên giá' : '') + '</span></div><div class="kpi ' + (cho.length ? 'warn' : 'ok') + ' static"><span class="k-l">Chờ xử lý</span><span class="k-v">' + cho.length + '</span><span class="k-s">Hư hỏng, chờ điều chuyển, thanh lý</span></div><div class="kpi info static"><span class="k-l">Biến động năm ' + y + '</span><span class="k-v">' + bd.length + '</span><span class="k-s">' + ['Mua sắm, tiếp nhận', 'Điều chuyển', 'Thanh lý'].map(q => bd.filter(x => x.b.loai === q).length + ' ' + q.split(',')[0].toLowerCase()).join(' · ') + '</span></div></div>' +
        '<div class="card mb"><div class="card-h"><h3>Tài sản nhà, đất</h3><span class="grow"></span><button class="btn sm" data-ndimp>' + ic('upload', 15) + 'Nhập biểu 0A.01</button><button class="btn sm" data-ndexp' + (nd.length ? '' : ' disabled') + '>' + ic('download', 15) + 'Xuất theo mẫu 0A.01</button><div class="sub">Theo Phụ biểu 0A.01-T.STC "Tổng hợp hiện trạng tài sản nhà, đất"' + (ndNgay ? ' — hiện trạng đến ' + U.fmtDate(ndNgay) : '') + '. Bấm thẻ để lọc danh sách.</div></div><div class="card-b">' +
        (nd.length ? '<div class="kpis">' + k('teal', 'Cơ sở nhà, đất', ns.n, ns.soDonVi + ' đơn vị được giao quản lý', 'nd') + k('', 'Diện tích đất', '<small>' + U.fmtNum(ns.dtDat, 1) + ' m²</small>', 'Diện tích nhà ' + U.fmtNum(ns.dtNha, 1) + ' m²') + k('acc', 'Nguyên giá nhà, đất', '<small>' + U.fmtShort(ns.nguyenGia) + '</small>', 'Còn lại ' + U.fmtShort(ns.conLai)) + k('ok', 'Đã cấp GCN', ns.daCap + '<small>/' + ns.n + '</small>', ns.chuaRo ? ns.chuaRo + ' cơ sở chưa ghi tình trạng GCN' : '', 'dacap') + k(ns.chuaCap ? 'bad' : 'ok', 'Chưa cấp GCN', ns.chuaCap, ns.matMat ? ns.matMat + ' GCN mất, thất lạc' : '', 'chuacap') + k(ns.chuaDK ? 'warn' : 'ok', 'Chưa đăng ký biến động', ns.chuaDK, '', 'chuadk') + k(ns.hsThieu ? 'warn' : 'ok', 'Thiếu hồ sơ hình thành', ns.hsThieu, ns.hsDayDu + ' cơ sở đủ hồ sơ', 'thieu') + k(ns.khongDung ? 'bad' : 'ok', 'Sử dụng không đúng mục đích', ns.khongDung, ns.dung + ' đúng mục đích', 'khongdung') + '</div>'
          : '<div class="empty" style="padding:16px"><p>Chưa có dữ liệu nhà, đất. Bấm "Nhập biểu 0A.01" để đưa biểu tổng hợp hiện trạng nhà, đất của Sở vào, hoặc thêm từng tài sản với loại "Cơ sở nhà, đất".</p></div>') + '</div></div>' +
        (all.length ? '<div class="card mb"><div class="card-h"><h3>Tổng hợp tài sản</h3><span class="grow"></span><div class="seg">' + [['dv', 'Đơn vị dự toán'], ['dvg', 'Đơn vị được giao (nhà, đất)'], ['gcn', 'Hồ sơ pháp lý (nhà, đất)'], ['loai', 'Loại'], ['tt', 'Tình trạng'], ['nguon', 'Nguồn hình thành']].map(s => '<button data-g="' + s[0] + '" class="' + (G.g === s[0] ? 'on' : '') + '">' + s[1] + '</button>').join('') + '</div></div><div class="card-b"><div style="max-height:380px;overflow:auto"><table class="tbl"><thead><tr><th>Nhóm</th><th class="num">Số lượng</th>' + (nd.length ? '<th class="num">Diện tích đất (m²)</th><th class="num">Diện tích nhà (m²)</th>' : '') + '<th class="num">Nguyên giá</th><th class="num">Giá trị còn lại</th><th>Tỷ lệ còn lại</th></tr></thead><tbody>' + groups.map(g => '<tr><td>' + e(g.k) + '</td><td class="num">' + U.fmtNum(g.n, 0) + '</td>' + (nd.length ? '<td class="num">' + (g.dtDat ? U.fmtNum(g.dtDat, 1) : '') + '</td><td class="num">' + (g.dtNha ? U.fmtNum(g.dtNha, 1) : '') + '</td>' : '') + '<td class="num">' + U.fmtMoney(g.nguyenGia) + '</td><td class="num">' + U.fmtMoney(g.conLai) + '</td><td style="min-width:130px">' + (g.nguyenGia ? UI.pbar(U.pct(g.conLai, g.nguyenGia)) : '') + '</td></tr>').join('') + '</tbody><tfoot><tr><td>Cộng</td><td class="num">' + U.fmtNum(U.sum(groups, g => g.n), 0) + '</td>' + (nd.length ? '<td class="num">' + U.fmtNum(U.sum(groups, g => g.dtDat), 1) + '</td><td class="num">' + U.fmtNum(U.sum(groups, g => g.dtNha), 1) + '</td>' : '') + '<td class="num">' + U.fmtMoney(U.sum(groups, g => g.nguyenGia)) + '</td><td class="num">' + U.fmtMoney(U.sum(groups, g => g.conLai)) + '</td><td></td></tr></tfoot></table></div></div></div>' : '');
      const ND_F = [['nd', 'Chỉ nhà, đất'], ['khac', 'Tài sản khác'], ['dacap', 'Nhà, đất — đã cấp GCN'], ['chuacap', 'Nhà, đất — chưa cấp GCN'], ['matmat', 'Nhà, đất — GCN mất, thất lạc'], ['chuaro', 'Nhà, đất — chưa ghi GCN'], ['chuadk', 'Nhà, đất — chưa ĐK biến động'], ['thieu', 'Nhà, đất — thiếu hồ sơ'], ['khongdung', 'Nhà, đất — không đúng mục đích']];
      const ndTest = (r, v) => { const isN = L.isNhaDat(r); if (v === 'khac') return !isN; if (!isN) return false; return v === 'nd' || (v === 'chuaro' ? !r.gcnTT : v === 'chuadk' ? !!r.chuaDKBD : v === 'thieu' ? !!r.hsThieu : v === 'khongdung' ? r.htSD === 'khongdung' : r.gcnTT === v); };
      const lv = UI.listView(root, {
        key: 'taisan', coll: 'taisan', top, preset: p && p.preset, rows: () => S.all('taisan'), addLabel: 'Thêm tài sản',
        empty: { t: 'Chưa có tài sản nào', p: 'Nhập biểu hiện trạng nhà, đất (0A.01), thêm từng tài sản hoặc nhập danh sách từ Excel.' },
        filters: [
          { k: 'nd', label: 'Nhà, đất', opts: () => ND_F, test: ndTest },
          { k: 'dvg', label: 'Đơn vị được giao', opts: () => [...new Set(S.all('taisan').filter(L.isNhaDat).map(L.ndDonVi))].sort(U.cmp).map(x => [x, x]), test: (r, v) => L.isNhaDat(r) && L.ndDonVi(r) === v },
          { k: 'dv', label: 'Đơn vị dự toán', opts: dvOpts, test: (r, v) => r.donViId === v },
          { k: 'loai', label: 'Loại', opts: () => A.list('loaiTaiSan').map(x => [x, x]), test: (r, v) => r.loai === v },
          { k: 'tt', label: 'Tình trạng', opts: () => A.list('tinhTrangTS').map(x => [x, x]), test: (r, v) => r.tinhTrang === v }],
        searchText: t => [t.ma, t.ten, t.loai, t.thongSo, t.donViGiao, Sc.refName('donvi', t.donViId), t.gcnSo, t.nguyenNhanHS, t.ghiChuBieu, t.ghiChu].join(' '),
        sort: { k: 'stt', dir: 1 },
        cols: [
          { k: 'stt', label: 'Mã', cls: 'nowrap', val: t => (U.num(t.ndThuTu) || 1e6) + (t.ma ? 0 : 0.5), html: t => '<span class="muted small">' + e(t.ma || '') + '</span>' + (t.ndThuTu ? '<div class="t2">Dòng biểu ' + t.ndThuTu + '</div>' : '') },
          { k: 'ten', label: 'Tài sản', cls: 'wrap', html: t => '<div class="t1">' + e(t.ten) + '</div><div class="t2">' + e(L.isNhaDat(t) ? [t.dtDat !== '' && t.dtDat !== undefined ? 'Đất ' + U.fmtNum(t.dtDat) + ' m²' : '', t.dtNha !== '' && t.dtNha !== undefined ? 'nhà ' + U.fmtNum(t.dtNha) + ' m²' : '', t.gcnSo].filter(Boolean).join(' · ') : [t.loai, t.thongSo].filter(Boolean).join(' · ')) + '</div>' },
          { k: 'donViId', label: 'Đơn vị', cls: 'wrap', val: t => L.isNhaDat(t) ? L.ndDonVi(t) : Sc.refName('donvi', t.donViId), html: t => { const g = L.isNhaDat(t) && t.donViGiao, d = Sc.refName('donvi', t.donViId); return (g ? e(t.donViGiao) + (d && U.norm(d) !== U.norm(t.donViGiao) ? '<div class="t2">' + e(d) + '</div>' : '') : (d ? e(d) : '<span class="muted">—</span>')); } },
          { k: 'nguyenGia', label: 'Nguyên giá', cls: 'num', val: t => U.num(t.nguyenGia), html: t => U.fmtMoney(t.nguyenGia) },
          { k: 'conLai', label: 'Giá trị còn lại', cls: 'num', val: t => U.num(t.conLai), html: t => U.fmtMoney(t.conLai) },
          { k: 'hoso', label: 'Hồ sơ pháp lý', val: t => L.isNhaDat(t) ? L.ndHoSo(t)[1] : '', html: t => { if (!L.isNhaDat(t)) return '<span class="muted small">—</span>'; const h = L.ndHoSo(t); return UI.chip(h[0], h[1]) + (t.chuaDKBD ? '<div class="t2" style="color:var(--warn-fg)">Chưa ĐK biến động</div>' : '') + (t.hsThieu ? '<div class="t2" style="color:var(--warn-fg)">Thiếu hồ sơ</div>' : '') + (t.htSD === 'khongdung' ? '<div class="t2 lech">Không đúng mục đích</div>' : ''); } },
          { k: 'tinhTrang', label: 'Tình trạng', html: t => UI.chip(t.tinhTrang === 'Đang sử dụng' ? 'hoanthanh' : ['Đã thanh lý', 'Đã điều chuyển'].includes(t.tinhTrang) ? '' : t.tinhTrang ? 'saphan' : '', t.tinhTrang || 'Chưa ghi') }],
        onRow: t => A.open('taisan', t.id),
        foot: rs => '<tr><td colspan="3">Cộng ' + rs.length + ' dòng' + (rs.some(L.isNhaDat) ? ' · đất ' + U.fmtNum(U.sum(rs, t => t.dtDat), 1) + ' m² · nhà ' + U.fmtNum(U.sum(rs, t => t.dtNha), 1) + ' m²' : '') + '</td><td class="num">' + U.fmtMoney(U.sum(rs, t => t.nguyenGia)) + '</td><td class="num">' + U.fmtMoney(U.sum(rs, t => t.conLai)) + '</td><td colspan="2"></td></tr>'
      });
      $$('[data-g]', root).forEach(b => b.onclick = () => { G.g = b.dataset.g; A.render(); });
      $('[data-ndimp]', root).onclick = importNhaDat;
      $('[data-ndexp]', root).onclick = () => { const rows = lv.rows().filter(L.isNhaDat); A.exportNhaDat(rows.length ? rows : nd); };
      UI.on(root, 'click', '[data-ndf]', b => A.go('taisan', { preset: { nd: b.dataset.ndf } }));
    }
  };

  /* ================= MUA SẮM, ĐẤU THẦU, HỢP ĐỒNG ================= */
  function payDialog(h, reopen, kind) {
    const isNT = kind === 'nt', x = L.hd(h);
    const m = UI.modal({
      title: isNT ? 'Ghi nghiệm thu' : 'Ghi thanh toán', sub: 'Hợp đồng ' + h.so, size: 'sm',
      body: '<div class="note mb">Giá trị hợp đồng ' + U.fmtMoney(h.giaTri) + ' · đã thanh toán ' + U.fmtMoney(x.thanhToan) + ' · đã nghiệm thu ' + U.fmtMoney(x.nghiemThu) + ' đồng.</div><div class="fld"><label for="pd_d">Ngày</label><input class="inp" type="date" id="pd_d" value="' + U.today() + '"></div><div class="fld mt"><label for="pd_v">' + (isNT ? 'Giá trị nghiệm thu' : 'Số tiền thanh toán') + ' (đồng)</label><input class="inp num" id="pd_v" data-money inputmode="numeric"></div><div class="fld mt"><label for="pd_n">Nội dung</label><input class="inp" id="pd_n"></div>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, {
        label: 'Lưu', cls: 'primary', icon: 'check', on: async a => {
          const ngay = $('#pd_d', a.body).value, v = U.parseNum($('#pd_v', a.body).value), nd = $('#pd_n', a.body).value.trim();
          if (!U.isISO(ngay)) { UI.toast('Ngày không hợp lệ.', 'bad'); return; }
          if (!isNT && (v === '' || v === null || v <= 0)) { UI.toast('Nhập số tiền thanh toán.', 'bad'); return; }
          const r = Object.assign({}, h); if (isNT) r.nghiemThu = (h.nghiemThu || []).concat([{ ngay, noiDung: nd, giaTri: v === null ? '' : v }]); else r.thanhToan = (h.thanhToan || []).concat([{ ngay, soTien: v, noiDung: nd }]);
          const w = Sc.C.hopdong.validate(r);
          if (w.length && !await UI.confirm({ title: 'Kiểm tra lại số liệu', msg: w.map(q => '• ' + q).join('\n') + '\n\nVẫn lưu?', ok: 'Vẫn lưu', cancel: 'Quay lại sửa' })) return;
          try { await S.save('hopdong', r); a.close(); UI.toast('Đã lưu.', 'ok'); if (reopen) reopen(); } catch (er) { UI.fail(er); }
        }
      }]
    });
    UI.on(m.body, 'input', '[data-money]', el => { el.value = el.value.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); });
  }
  A.openers.goithau = id => UI.detail({
    coll: 'goithau', id,
    head: g => { const x = L.gt(g), hd = S.all('hopdong').filter(h => h.goiThauId === g.id); return '<div class="gap mb">' + UI.chip(x.st, x.label) + (x.note ? '<span class="chip plain ' + (x.over ? 'quahan' : 'saphan') + '">' + e(x.note) + '</span>' : '') + (x.chuaHD ? '<span class="chip plain saphan">Đã có kết quả, chưa nhập hợp đồng</span>' : '') + (U.num(g.giaTrung) && U.num(g.giaGoiThau) ? '<span class="tag">Chênh lệch so với giá gói thầu: ' + U.fmtMoney(U.num(g.giaGoiThau) - U.num(g.giaTrung)) + ' đồng (' + U.fmtPct(U.pct(U.num(g.giaGoiThau) - U.num(g.giaTrung), U.num(g.giaGoiThau))) + ')</span>' : '') + '</div>' + A.gtStepper(g) + (hd.length ? '<div class="note mb">Hợp đồng: ' + hd.map(h => '<a href="#" data-open="hopdong:' + h.id + '">' + e(h.so) + '</a>').join(', ') + '</div>' : ''); },
    actions: [{ label: 'Tạo hợp đồng', icon: 'plus', on: (g, a) => { a.close(true); UI.form({ coll: 'hopdong', rec: { goiThauId: g.id, duAnId: g.duAnId, nhaThau: g.nhaThau, giaTri: g.giaTrung || '', ten: g.ten, canBoId: g.canBoId }, onSaved: async h => { if (g.trangThai !== 'dakyhd') await S.save('goithau', { id: g.id, trangThai: 'dakyhd' }); A.open('hopdong', h.id); } }); } }]
  });
  A.openers.hopdong = id => UI.detail({
    coll: 'hopdong', id,
    head: h => { const x = L.hd(h), K = (c, l, v, sub) => '<div class="kpi ' + c + ' static"><span class="k-l">' + l + '</span><span class="k-v">' + v + '</span><span class="k-s">' + (sub || '&nbsp;') + '</span></div>';
      return '<div class="gap mb">' + UI.chip(x.st, x.label) + (x.note ? '<span class="chip plain ' + (x.over ? 'quahan' : 'saphan') + '">' + e(x.note) + '</span>' : '') + (x.giaHan ? '<span class="chip plain">Đã gia hạn đến ' + U.fmtDate(x.han) + '</span>' : '') + (x.tamUngCao ? '<span class="chip plain saphan">Tạm ứng lớn hơn số đã thanh toán</span>' : '') + '</div>' +
        (x.canhBao.length ? '<div class="mb">' + x.canhBao.map(c => '<div class="issue s' + c.sev + '" style="cursor:default"><span class="lv"></span><span><span class="t">' + e(c.t) + '</span></span></div>').join('') + '</div>' : '') +
        '<div class="kpis mb">' + K('acc', 'Giá trị hợp đồng' + ((h.phuLuc || []).length ? ' sau ' + h.phuLuc.length + ' phụ lục' : ''), '<small>' + U.fmtShort(x.giaTriHL) + '</small>', (h.phuLuc || []).length ? 'Ký ban đầu ' + U.fmtShort(h.giaTri) : (h.loaiHD || '')) +
        K('', 'Tạm ứng còn phải thu hồi', '<small>' + U.fmtShort(x.tamUngCon) + '</small>', 'Đã tạm ứng ' + U.fmtShort(h.tamUng)) +
        K('teal', 'Đã nghiệm thu', '<small>' + U.fmtShort(x.nghiemThu) + '</small>', (h.nghiemThu || []).length + ' lần' + (x.ntChuaTT > 0.5 ? ' · chưa thanh toán ' + U.fmtShort(x.ntChuaTT) : '')) +
        K('ok', 'Đã thanh toán', U.fmtPct(x.tyLeTT), U.fmtShort(x.thanhToan) + ' · còn ' + U.fmtShort(x.conLai)) +
        K(x.over ? 'bad' : x.near ? 'warn' : 'info', 'Thời hạn hợp đồng', x.han ? '<small>' + U.fmtDate(x.han) + '</small>' : '—', h.tienDoKL ? 'Khối lượng thực hiện ' + U.fmtPct(h.tienDoKL, 0) : '') + '</div>'; },
    actions: [{ label: 'Ghi nghiệm thu', icon: 'check', on: (h, a, reopen) => payDialog(h, reopen, 'nt') }, { label: 'Ghi thanh toán', icon: 'coins', on: (h, a, reopen) => payDialog(h, reopen, 'tt') }]
  });
  A.views.dauthau = {
    title: 'Mua sắm, đấu thầu và hợp đồng', sub: 'Nhu cầu mua sắm, kế hoạch lựa chọn nhà thầu, gói thầu, hợp đồng, tạm ứng, thanh toán, nghiệm thu, thanh lý',
    render(root, p) {
      const T = A.vs.dtTab || (A.vs.dtTab = { t: 'gt' }); if (p && p.tab) T.t = p.tab;
      const gts = S.all('goithau'), hds = S.all('hopdong'), hx = hds.map(h => ({ h, x: L.hd(h) })), gx = gts.map(g => L.gt(g));
      root.innerHTML = '<div class="kpis mb"><div class="kpi acc static"><span class="k-l">Gói thầu, nhu cầu mua sắm</span><span class="k-v">' + gts.length + '</span><span class="k-s">Tổng giá gói thầu ' + U.fmtShort(U.sum(gts, g => g.giaGoiThau)) + '</span></div><div class="kpi info static"><span class="k-l">Đang lựa chọn nhà thầu</span><span class="k-v">' + gts.filter(g => g.trangThai === 'danglcnt').length + '</span><span class="k-s">' + gts.filter(g => ['nhucau', 'dutoan', 'khlcnt'].includes(g.trangThai || 'nhucau')).length + ' gói chưa tổ chức</span></div><div class="kpi ' + (gx.some(x => x.over) ? 'bad' : 'ok') + ' static"><span class="k-l">Quá hạn lựa chọn nhà thầu</span><span class="k-v">' + gx.filter(x => x.over).length + '</span><span class="k-s">Theo hạn trong KHLCNT đã nhập</span></div><div class="kpi teal static"><span class="k-l">Hợp đồng đang thực hiện</span><span class="k-v">' + hds.filter(h => (h.trangThai || 'dang') === 'dang').length + '</span><span class="k-s">Tổng giá trị ' + U.fmtShort(U.sum(hds, h => h.giaTri)) + '</span></div><div class="kpi ' + (hx.some(q => q.x.over) ? 'bad' : 'warn') + ' static"><span class="k-l">Hợp đồng quá hạn · sắp hết hạn</span><span class="k-v">' + hx.filter(q => q.x.over).length + ' · ' + hx.filter(q => q.x.near).length + '</span><span class="k-s">Ngưỡng ' + A.nguong('hdSapHet') + ' ngày</span></div><div class="kpi static"><span class="k-l">Đã thanh toán</span><span class="k-v">' + (hds.length ? U.fmtPct(U.pct(U.sum(hx, q => q.x.thanhToan), U.sum(hds, h => h.giaTri))) : '—') + '</span><span class="k-s">' + hx.filter(q => q.x.chuaThanhLy).length + ' HĐ nghiệm thu chưa thanh lý</span></div></div>' +
        '<div class="tabs" role="tablist"><button role="tab" data-t="gt" class="' + (T.t === 'gt' ? 'on' : '') + '">Gói thầu, mua sắm (' + gts.length + ')</button><button role="tab" data-t="hd" class="' + (T.t === 'hd' ? 'on' : '') + '">Hợp đồng (' + hds.length + ')</button></div><div data-pane></div>';
      $$('[data-t]', root).forEach(b => b.onclick = () => { T.t = b.dataset.t; A.render(); });
      const pane = $('[data-pane]', root);
      if (T.t === 'gt') UI.listView(pane, {
        key: 'goithau', coll: 'goithau', rows: () => S.all('goithau'), addLabel: 'Thêm gói thầu',
        empty: { t: 'Chưa có gói thầu, nhu cầu mua sắm nào', p: 'Theo dõi từ khi phát sinh nhu cầu, duyệt dự toán, duyệt kế hoạch lựa chọn nhà thầu đến khi ký hợp đồng.' },
        filters: [
          { k: 'tt', label: 'Tình trạng', opts: () => [['quahan', 'Quá hạn lựa chọn nhà thầu']].concat(A.OPT.ttGT), test: (r, v) => v === 'quahan' ? !!L.gt(r).over : (r.trangThai || 'nhucau') === v },
          { k: 'ht', label: 'Hình thức', opts: () => A.list('hinhThucLCNT').map(x => [x, x]), test: (r, v) => r.hinhThuc === v },
          { k: 'loai', label: 'Loại', opts: () => A.list('loaiGoiThau').map(x => [x, x]), test: (r, v) => r.loai === v },
          { k: 'cb', label: 'Cán bộ', opts: cbOpts, test: (r, v) => v === '__none' ? !r.canBoId : r.canBoId === v }],
        cols: [
          { k: 'ten', label: 'Gói thầu', cls: 'wrap', html: g => '<div class="t1">' + e(g.ten) + '</div><div class="t2">' + e([Sc.refName('duan', g.duAnId), g.loai].filter(Boolean).join(' · ')) + '</div>' },
          { k: 'giaGoiThau', label: 'Giá gói thầu', cls: 'num', val: g => U.num(g.giaGoiThau), html: g => U.fmtMoney(g.giaGoiThau) },
          { k: 'hinhThuc', label: 'Hình thức LCNT', html: g => e(g.hinhThuc || '') + (g.qdKHSo ? '<div class="t2">KHLCNT: ' + e(g.qdKHSo) + '</div>' : '') },
          { k: 'hanLCNT', label: 'Hạn LCNT', cls: 'nowrap', html: g => U.fmtDate(g.hanLCNT) || '<span class="muted">—</span>' },
          { k: 'nhaThau', label: 'Nhà thầu trúng thầu', html: g => g.nhaThau ? e(g.nhaThau) + (U.num(g.giaTrung) ? '<div class="t2">' + U.fmtMoney(g.giaTrung) + ' đồng</div>' : '') : '<span class="muted">—</span>' },
          { k: 'canBoId', label: 'Cán bộ', val: g => Sc.refName('canbo', g.canBoId), html: g => UI.who(g.canBoId) },
          { k: 'trangThai', label: 'Tình trạng', val: g => A.OPT.ttGT.findIndex(o => o[0] === (g.trangThai || 'nhucau')), html: g => { const x = L.gt(g); return UI.chip(x.st, x.label) + (x.note ? '<div class="t2 ' + (x.over ? 'lech' : '') + '">' + e(x.note) + '</div>' : ''); } }],
        onRow: g => A.open('goithau', g.id),
        foot: rs => '<tr><td>Cộng ' + rs.length + ' gói</td><td class="num">' + U.fmtMoney(U.sum(rs, g => g.giaGoiThau)) + '</td><td colspan="5"></td></tr>'
      });
      else UI.listView(pane, {
        key: 'hopdong', coll: 'hopdong', rows: () => S.all('hopdong'), addLabel: 'Thêm hợp đồng',
        empty: { t: 'Chưa có hợp đồng nào', p: 'Thêm hợp đồng trực tiếp hoặc tạo từ gói thầu đã có kết quả lựa chọn nhà thầu.' },
        filters: [
          { k: 'tt', label: 'Tình trạng', opts: () => [['quahan', 'Quá hạn hợp đồng'], ['saphet', 'Sắp hết hạn'], ['chuatl', 'Nghiệm thu, chưa thanh lý'], ['baolanh', 'Bảo lãnh sắp, đã hết hiệu lực'], ['tamung', 'Còn tạm ứng chưa thu hồi']].concat(A.OPT.ttHD), test: (r, v) => { const x = L.hd(r); return v === 'quahan' ? !!x.over : v === 'saphet' ? !!x.near : v === 'chuatl' ? !!x.chuaThanhLy : v === 'baolanh' ? x.canhBao.some(c => /Bảo/.test(c.t)) : v === 'tamung' ? x.tamUngCon > 0.5 : (r.trangThai || 'dang') === v; } },
          { k: 'cb', label: 'Cán bộ', opts: cbOpts, test: (r, v) => v === '__none' ? !r.canBoId : r.canBoId === v }],
        sort: { k: 'ngayKT', dir: 1 },
        cols: [
          { k: 'so', label: 'Số hợp đồng', cls: 'nowrap', html: h => '<b>' + e(h.so) + '</b><div class="t2">' + U.fmtDate(h.ngayKy) + '</div>' },
          { k: 'ten', label: 'Nội dung', cls: 'wrap', html: h => '<div>' + e(h.ten || '') + '</div><div class="t2">' + e(h.nhaThau || '') + '</div>' },
          { k: 'giaTri', label: 'Giá trị', cls: 'num', val: h => L.hdGiaTri(h), html: h => U.fmtMoney(L.hdGiaTri(h)) + ((h.phuLuc || []).length ? '<div class="t2">' + h.phuLuc.length + ' phụ lục</div>' : '') },
          { k: '_tt', label: 'Đã thanh toán', val: h => L.hd(h).tyLeTT || 0, html: h => { const x = L.hd(h); return '<div style="min-width:120px">' + UI.pbar(x.tyLeTT || 0) + '</div><div class="t2">' + U.fmtMoney(x.thanhToan) + '</div>'; } },
          { k: 'ngayKT', label: 'Hạn hoàn thành', cls: 'nowrap', val: h => L.hdHan(h), html: h => { const x = L.hd(h); return (U.fmtDate(x.han) || '<span class="muted">—</span>') + (x.giaHan ? '<div class="t2">đã gia hạn</div>' : '') + (x.canhBao.length ? '<div class="t2 lech">' + x.canhBao.length + ' cảnh báo</div>' : ''); } },
          { k: 'canBoId', label: 'Cán bộ', val: h => Sc.refName('canbo', h.canBoId), html: h => UI.who(h.canBoId) },
          { k: 'trangThai', label: 'Tình trạng', val: h => L.hd(h).st, html: h => { const x = L.hd(h); return UI.chip(x.st, x.label) + (x.note ? '<div class="t2 ' + (x.over ? 'lech' : '') + '">' + e(x.note) + '</div>' : ''); } }],
        onRow: h => A.open('hopdong', h.id),
        foot: rs => '<tr><td colspan="2">Cộng ' + rs.length + ' hợp đồng</td><td class="num">' + U.fmtMoney(U.sum(rs, h => L.hdGiaTri(h))) + '</td><td class="num">' + U.fmtMoney(U.sum(rs, h => L.hd(h).thanhToan)) + '</td><td colspan="3"></td></tr>'
      });
    }
  };
})(App);
