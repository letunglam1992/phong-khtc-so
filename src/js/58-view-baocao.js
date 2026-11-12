/* ============================================================
   58-view-baocao.js — Báo cáo, thống kê · Nhật ký cập nhật · Thiết lập, sao lưu, đồng bộ
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;

  /* ---------- Bộ dựng văn bản báo cáo: sinh đồng thời HTML (xem, in, Word) và bảng (Excel) ---------- */
  function Doc() {
    const d = { html: '', sheets: [], text: [] };
    d.h2 = t => { d.html += '<h2>' + e(t) + '</h2>'; d.text.push('', t); };
    d.h3 = t => { d.html += '<h3>' + e(t) + '</h3>'; d.text.push(t); };
    d.p = t => { d.html += '<p>' + e(t) + '</p>'; d.text.push(t); };
    d.li = arr => { arr.forEach(t => { d.html += '<p>- ' + e(t) + '</p>'; d.text.push('- ' + t); }); };
    // cols: [{t:'Tiêu đề', num:true, w:20}], rows: mảng mảng; foot: mảng
    d.table = (name, cols, rows, foot) => {
      if (!rows.length) { d.p('(Không có dữ liệu.)'); return; }
      const cell = (v, c) => '<td class="' + (c.num ? 'num' : '') + '">' + e(c.num ? (v === '' || v === null || v === undefined ? '' : (c.pct ? U.fmtPct(v) : U.fmtMoney(v))) : v) + '</td>';
      d.html += '<table><thead><tr><th>TT</th>' + cols.map(c => '<th>' + e(c.t) + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r, i) => '<tr><td style="text-align:center">' + (i + 1) + '</td>' + r.map((v, j) => cell(v, cols[j])).join('') + '</tr>').join('') + (foot ? '<tr style="font-weight:bold"><td></td>' + foot.map((v, j) => cell(v, cols[j])).join('') + '</tr>' : '') + '</tbody></table>';
      const num = (v, c) => c.num && v !== '' && v !== null && v !== undefined ? (c.pct ? Math.round(v * 100) / 100 : +v) : (v === null || v === undefined ? '' : v);
      d.sheets.push({ name, aoa: [['TT'].concat(cols.map(c => c.t))].concat(rows.map((r, i) => [i + 1].concat(r.map((v, j) => num(v, cols[j]))))).concat(foot ? [[''].concat(foot.map((v, j) => num(v, cols[j])))] : []), widths: [5].concat(cols.map(c => c.w || (c.num ? 18 : 30))) });
      d.text.push('[Bảng: ' + name + ' — ' + rows.length + ' dòng]');
    };
    return d;
  }
  const cb = id => Sc.refName('canbo', id) || 'Chưa phân công';
  const N = t => ({ t, num: true }), PC = t => ({ t, num: true, pct: true, w: 10 });

  const SEC = {
    nhiemvu(d, P) {
      const all = S.all('nhiemvu').filter(t => (!P.nhom || String(t.nhom) === P.nhom) && (!P.cb || t.chuTriId === P.cb || (t.phoiHopIds || []).includes(P.cb)));
      const rel = all.filter(t => (t.trangThai === 'hoanthanh' && L.inRange(t.ngayHT, P.from, P.to)) || (L.open(t) && (!t.ngayGiao || t.ngayGiao <= P.to) && (+t.nam <= +P.to.slice(0, 4))));
      const st = L.nvStats(rel);
      d.p('Trong kỳ, Phòng theo dõi ' + st.tong + ' nhiệm vụ; đã hoàn thành ' + st.hoanthanh + ' nhiệm vụ' + (st.tong ? ' (' + U.fmtPct(st.tyLeHT) + ')' : '') + (st.treHan ? ', trong đó ' + st.treHan + ' nhiệm vụ hoàn thành trễ hạn' : '') + '; đang thực hiện ' + st.dang + '; chưa triển khai ' + st.chua + '; quá hạn ' + st.quahan + '; sắp đến hạn ' + st.saphan + '; chưa phân công cán bộ chủ trì ' + st.chuaPC + '.');
      d.h3('Tổng hợp theo lĩnh vực');
      const g = A.NHOM.map(n => { const l = rel.filter(t => String(t.nhom) === n[0]); return l.length ? [n[1]].concat((s => [s.tong, s.hoanthanh, s.dang, s.chua, s.quahan])(L.nvStats(l))) : null; }).filter(Boolean);
      const ng = rel.filter(t => !t.nhom); if (ng.length) g.push(['(Chưa gắn nhóm chức năng)'].concat((s => [s.tong, s.hoanthanh, s.dang, s.chua, s.quahan])(L.nvStats(ng))));
      d.table('Nhiem vu theo linh vuc', [{ t: 'Lĩnh vực', w: 50 }, N('Tổng số'), N('Hoàn thành'), N('Đang thực hiện'), N('Chưa triển khai'), N('Quá hạn')], g, ['Cộng', st.tong, st.hoanthanh, st.dang, st.chua, st.quahan]);
      const qh = rel.filter(t => L.nv(t).st === 'quahan').sort((a, b) => U.cmp(a.han, b.han));
      d.h3('Nhiệm vụ quá hạn (' + qh.length + ')');
      d.table('Nhiem vu qua han', [{ t: 'Nhiệm vụ', w: 60 }, { t: 'Chủ trì', w: 18 }, { t: 'Thời hạn', w: 12 }, N('Số ngày quá hạn'), { t: 'Nguyên nhân', w: 40 }], qh.map(t => [t.ten, cb(t.chuTriId), U.fmtDate(t.han), L.nv(t).late, t.nguyenNhanCham || '(chưa ghi)']));
      const ht = rel.filter(t => t.trangThai === 'hoanthanh').sort((a, b) => U.cmp(a.ngayHT, b.ngayHT));
      d.h3('Nhiệm vụ hoàn thành trong kỳ (' + ht.length + ')');
      d.table('Nhiem vu hoan thanh', [{ t: 'Nhiệm vụ', w: 60 }, { t: 'Chủ trì', w: 18 }, { t: 'Thời hạn', w: 12 }, { t: 'Ngày hoàn thành', w: 14 }, { t: 'Kết quả', w: 50 }], ht.map(t => [t.ten, cb(t.chuTriId), U.fmtDate(t.han), U.fmtDate(t.ngayHT), t.ketQua || '']));
      const mo = rel.filter(t => L.open(t) && L.nv(t).st !== 'quahan').sort((a, b) => U.cmp(a.han, b.han));
      d.h3('Nhiệm vụ đang triển khai, trong hạn (' + mo.length + ')');
      d.table('Nhiem vu dang trien khai', [{ t: 'Nhiệm vụ', w: 60 }, { t: 'Chủ trì', w: 18 }, { t: 'Thời hạn', w: 12 }, N('Tiến độ (%)'), { t: 'Tình trạng', w: 20 }], mo.map(t => [t.ten, cb(t.chuTriId), t.han ? U.fmtDate(t.han) : 'Không hạn', U.num(t.tienDo), L.nv(t).label]));
    },
    duan(d, P) {
      const list = S.all('duan').filter(x => (!P.duan || x.id === P.duan) && (!P.cb || x.canBoId === P.cb)).filter(x => { const a = x.batDau, b = x.ketThuc; return !(a && a > P.to) && !(b && b < P.from && (x.trangThai === 'hoanthanh' || x.trangThai === 'quyettoan')); });
      const vs = list.map(x => ({ x, v: L.da(x) }));
      d.p('Phòng đang theo dõi ' + list.length + ' chương trình, dự án, nhiệm vụ với tổng mức đầu tư, dự toán ' + U.fmtMoney(U.sum(list, x => x.tmdt)) + ' đồng; ' + vs.filter(q => q.v.xong).length + ' đã hoàn thành; ' + vs.filter(q => q.v.cham).length + ' chậm tiến độ; ' + vs.filter(q => q.v.nguyCo).length + ' có nguy cơ chậm.');
      d.table('Chuong trinh du an', [{ t: 'Chương trình, dự án', w: 60 }, { t: 'Chủ đầu tư', w: 24 }, N('Tổng mức đầu tư (đồng)'), { t: 'Thời gian thực hiện', w: 22 }, N('Tiến độ (%)'), N('Kế hoạch vốn (đồng)'), N('Đã giải ngân (đồng)'), PC('Tỷ lệ GN'), { t: 'Tình trạng', w: 20 }, { t: 'Cán bộ theo dõi', w: 16 }],
        vs.map(q => [q.x.ten, q.x.chuDauTu || '', U.num(q.x.tmdt), [U.fmtDate(q.x.batDau), U.fmtDate(q.x.ketThuc)].filter(Boolean).join(' – '), U.num(q.x.tienDo), q.v.khVon, q.v.giaiNgan, q.v.khVon ? q.v.tyLeGN : '', q.v.label, cb(q.x.canBoId)]),
        ['Cộng', '', U.sum(list, x => x.tmdt), '', '', U.sum(vs, q => q.v.khVon), U.sum(vs, q => q.v.giaiNgan), U.pct(U.sum(vs, q => q.v.giaiNgan), U.sum(vs, q => q.v.khVon)) || '', '', '']);
      const kk = vs.filter(q => q.v.cham || (q.x.khoKhan || '').trim() || (q.x.kienNghi || '').trim());
      d.h3('Dự án chậm tiến độ, khó khăn, kiến nghị (' + kk.length + ')');
      d.table('Kho khan kien nghi', [{ t: 'Chương trình, dự án', w: 50 }, { t: 'Tình hình', w: 30 }, { t: 'Khó khăn, nguyên nhân', w: 50 }, { t: 'Kiến nghị, đề xuất', w: 50 }], kk.map(q => [q.x.ten, q.v.cham ? 'Chậm ' + q.v.treMax + ' ngày' + (q.v.mocTre.length ? ' (' + q.v.mocTre.map(m => m.ten).join('; ') + ')' : '') : q.v.label, [q.x.khoKhan, q.x.nguyenNhanCham].filter(Boolean).join(' ') || '(chưa ghi)', q.x.kienNghi || '']));
    },
    giaingan(d, P) {
      const y = +P.to.slice(0, 4), all = S.all('von').filter(v => +v.nam === y && (!P.duan || v.duAnId === P.duan)).map(L.von);
      const kh = U.sum(all, o => o.kh), gn = U.sum(all, o => o.gn);
      d.p('Năm ' + y + ': kế hoạch vốn giao đầu năm ' + U.fmtMoney(U.sum(all, o => o.khDauNam)) + ' đồng; kế hoạch vốn sau điều chỉnh ' + U.fmtMoney(kh) + ' đồng; đã giải ngân ' + U.fmtMoney(gn) + ' đồng, đạt ' + U.fmtPct(U.pct(gn, kh)) + ' kế hoạch; còn lại chưa giải ngân ' + U.fmtMoney(kh - gn) + ' đồng. Số giải ngân là số lũy kế mới nhất đã nhập của từng dòng vốn.');
      d.h3('Theo nguồn vốn');
      const g = L.vonGroup(all, o => o.v.nguonVon);
      d.table('Giai ngan theo nguon', [{ t: 'Nguồn vốn', w: 44 }, N('Kế hoạch đầu năm'), N('Kế hoạch sau điều chỉnh'), N('Đã giải ngân'), N('Còn lại'), PC('Tỷ lệ')], g.map(x => [x.k, x.khDauNam, x.kh, x.gn, x.conLai, x.tyLe === null ? '' : x.tyLe]), ['Cộng', U.sum(g, x => x.khDauNam), kh, gn, kh - gn, U.pct(gn, kh) || '']);
      d.h3('Theo chương trình, dự án');
      d.table('Giai ngan theo du an', [{ t: 'Chương trình, dự án', w: 60 }, { t: 'Nguồn vốn', w: 30 }, N('Kế hoạch sau điều chỉnh'), N('Đã giải ngân'), { t: 'Số liệu đến ngày', w: 14 }, N('Còn lại'), PC('Tỷ lệ'), N('Nhu cầu điều chỉnh'), { t: 'Khó khăn, nguyên nhân', w: 50 }],
        all.sort((a, b) => (a.tyLe || 0) - (b.tyLe || 0)).map(o => [Sc.refName('duan', o.v.duAnId), o.v.nguonVon, o.kh, o.gn, U.fmtDate(o.ngayGN), o.conLai, o.tyLe === null ? '' : o.tyLe, U.num(o.v.nhuCauDC) || '', o.v.nguyenNhan || '']));
      const th = all.filter(o => o.thap || o.thapSoTienDo);
      d.h3('Dòng vốn giải ngân thấp (' + th.length + ')');
      d.li(th.map(o => Sc.refName('duan', o.v.duAnId) + ' (' + o.v.nguonVon + '): giải ngân ' + U.fmtPct(o.tyLe || 0) + '; ' + (o.v.nguyenNhan ? 'nguyên nhân: ' + o.v.nguyenNhan : 'chưa ghi nguyên nhân') + '.'));
      if (!th.length) d.p('Không có dòng vốn nào dưới ngưỡng cảnh báo nội bộ (thấp hơn tỷ lệ thời gian năm ' + A.nguong('gnLech') + ' điểm phần trăm).');
    },
    ngansach(d, P) {
      const y = +P.to.slice(0, 4), tree = L.nsTree(y, P.dv || null), T = tree.total;
      d.p('Năm ' + y + (P.dv ? ', ' + S.get('donvi', P.dv).ten : ', toàn bộ các đơn vị đã nhập') + ': dự toán giao đầu năm ' + U.fmtMoney(T.duToan) + ' đồng; chuyển nguồn ' + U.fmtMoney(T.chuyenNguon) + ' đồng; bổ sung ' + U.fmtMoney(T.boSung) + ' đồng; điều chỉnh tăng ' + U.fmtMoney(T.dcTang) + ' đồng, giảm ' + U.fmtMoney(T.dcGiam) + ' đồng; thu hồi ' + U.fmtMoney(T.thuHoi) + ' đồng; tiết kiệm ' + U.fmtMoney(T.tietKiem) + ' đồng. Tổng kinh phí được sử dụng ' + U.fmtMoney(T.tong) + ' đồng; đã giải ngân, thanh toán ' + U.fmtMoney(T.giaiNgan) + ' đồng, đạt ' + U.fmtPct(T.tyLe) + '; còn lại ' + U.fmtMoney(T.conLai) + ' đồng' + (T.quyetToan ? '; số quyết toán ' + U.fmtMoney(T.quyetToan) + ' đồng' : '') + '.');
      if (!P.dv) { d.h3('Theo đơn vị dự toán'); const r = L.nsByDonVi(y); d.table('Du toan theo don vi', [{ t: 'Đơn vị', w: 44 }, N('Dự toán đầu năm'), N('Tổng được sử dụng'), N('Đã giải ngân'), N('Còn lại'), N('Quyết toán'), PC('Tỷ lệ GN')], r.map(x => [x.dv.ten, x.total.duToan, x.total.tong, x.total.giaiNgan, x.total.conLai, x.total.quyetToan, x.total.tyLe === null ? '' : x.total.tyLe]), ['Cộng', T.duToan, T.tong, T.giaiNgan, T.conLai, T.quyetToan, T.tyLe === null ? '' : T.tyLe]); }
      d.h3('Dự toán – thực hiện – quyết toán theo nhóm kinh phí');
      const g = L.nsByNhom(y).filter(() => true);
      d.table('Theo nhom kinh phi', [{ t: 'Nhóm kinh phí', w: 44 }, N('Dự toán đầu năm'), N('Được sử dụng'), N('Đã giải ngân'), N('Quyết toán')], (P.dv ? (() => { const t2 = L.nsTree(y, P.dv); const m = new Map(); const byId = new Map(t2.flat.map(n => [n.r.id, n])); t2.flat.filter(n => !n.children.length).forEach(n => { let c = n, k = '(chưa phân nhóm)', gd = 0; while (c && gd++ < 20) { if (c.r.nhomKP) { k = c.r.nhomKP; break; } c = byId.get(c.r.parentId); } const x = m.get(k) || [k, 0, 0, 0, 0]; x[1] += n.sum.duToan; x[2] += n.sum.tong; x[3] += n.sum.giaiNgan; x[4] += n.sum.quyetToan; m.set(k, x); }); return Array.from(m.values()); })() : g.map(x => [x.k, x.duToan, x.tong, x.giaiNgan, x.quyetToan])));
      d.h3('Chi tiết đến cấp 3');
      d.table('Chi tiet du toan', [{ t: 'Số TT', w: 8 }, { t: 'Nội dung', w: 70 }, N('Dự toán đầu năm'), N('Tổng được sử dụng'), N('Đã giải ngân'), N('Còn lại'), PC('Tỷ lệ')], tree.flat.filter(n => n.level <= 2).map(n => [n.r.stt || '', '  '.repeat(n.level) + n.r.noiDung, n.sum.duToan, n.sum.tong, n.sum.giaiNgan, n.sum.conLai, n.sum.tyLe === null ? '' : n.sum.tyLe]));
    },
    taisan(d, P) {
      const all = S.all('taisan').filter(t => !P.dv || t.donViId === P.dv);
      d.p((P.dv ? S.get('donvi', P.dv).ten : 'Các đơn vị đã nhập') + ' đang theo dõi ' + U.fmtNum(U.sum(all, t => U.num(t.soLuong) || 1), 0) + ' tài sản (' + all.length + ' dòng), tổng nguyên giá ' + U.fmtMoney(U.sum(all, t => t.nguyenGia)) + ' đồng, giá trị còn lại ' + U.fmtMoney(U.sum(all, t => t.conLai)) + ' đồng.');
      const tb = (name, key) => { const g = L.tsGroup(all, key); d.table(name, [{ t: 'Nhóm', w: 44 }, N('Số lượng'), N('Nguyên giá'), N('Giá trị còn lại')], g.map(x => [x.k, x.n, x.nguyenGia, x.conLai]), ['Cộng', U.sum(g, x => x.n), U.sum(g, x => x.nguyenGia), U.sum(g, x => x.conLai)]); };
      d.h3('Theo đơn vị sử dụng'); tb('Tai san theo don vi', t => Sc.refName('donvi', t.donViId));
      d.h3('Theo loại tài sản'); tb('Tai san theo loai', t => t.loai);
      d.h3('Theo tình trạng sử dụng'); tb('Tai san theo tinh trang', t => t.tinhTrang);
      const nd = all.filter(L.isNhaDat);
      if (nd.length) {
        const s = L.ndStats(nd), ng = nd.map(t => t.ndNgay).filter(Boolean).sort().pop();
        d.h3('Tài sản nhà, đất' + (ng ? ' (hiện trạng đến ngày ' + U.fmtDate(ng) + ')' : ''));
        d.p('Có ' + s.n + ' cơ sở nhà, đất do ' + s.soDonVi + ' cơ quan, đơn vị được giao quản lý; tổng diện tích đất ' + U.fmtNum(s.dtDat, 1) + ' m², diện tích nhà ' + U.fmtNum(s.dtNha, 1) + ' m²; nguyên giá ' + U.fmtMoney(s.nguyenGia) + ' đồng, giá trị còn lại ' + U.fmtMoney(s.conLai) + ' đồng. Hiện trạng sử dụng: ' + s.dung + ' cơ sở tiếp tục sử dụng đúng mục đích' + (s.khongDung ? ', ' + s.khongDung + ' cơ sở không đúng mục đích' : '') + '. Hồ sơ pháp lý: ' + s.daCap + ' cơ sở đã được cấp giấy chứng nhận; ' + s.chuaCap + ' cơ sở chưa được cấp' + (s.matMat ? '; ' + s.matMat + ' cơ sở đã cấp nhưng mất mát, thất lạc' : '') + (s.chuaRo ? '; ' + s.chuaRo + ' cơ sở chưa ghi tình trạng giấy chứng nhận' : '') + '; ' + s.chuaDK + ' cơ sở chưa đăng ký biến động đất đai; ' + s.hsThieu + ' cơ sở thiếu hồ sơ hình thành tài sản.');
        const byDv = [...U.groupBy(nd, L.ndDonVi).entries()].map(([k, l]) => { const q = L.ndStats(l); return [k, q.n, q.dtDat, q.dtNha, q.nguyenGia, q.conLai, q.daCap, q.chuaCap + q.matMat, q.chuaDK, q.hsThieu]; });
        d.table('Nha dat theo don vi', [{ t: 'Cơ quan, đơn vị được giao quản lý', w: 44 }, N('Số cơ sở'), N('Diện tích đất (m²)'), N('Diện tích nhà (m²)'), N('Nguyên giá'), N('Giá trị còn lại'), N('Đã cấp GCN'), N('Chưa có GCN'), N('Chưa ĐK biến động'), N('Thiếu hồ sơ')], byDv, ['Cộng', s.n, s.dtDat, s.dtNha, s.nguyenGia, s.conLai, s.daCap, s.chuaCap + s.matMat, s.chuaDK, s.hsThieu]);
        const ton = nd.filter(t => t.gcnTT !== 'dacap' || t.chuaDKBD || t.hsThieu || t.htSD === 'khongdung');
        d.h3('Cơ sở nhà, đất còn tồn tại về hồ sơ, hiện trạng (' + ton.length + ')');
        d.table('Nha dat ton tai', [{ t: 'Đơn vị', w: 36 }, { t: 'Tài sản', w: 50 }, { t: 'Tồn tại', w: 40 }, { t: 'Nguyên nhân', w: 40 }], ton.map(t => [L.ndDonVi(t), t.ten, [t.gcnTT === 'chuacap' ? 'Chưa cấp GCN' : t.gcnTT === 'matmat' ? 'GCN mất, thất lạc' : !t.gcnTT ? 'Chưa ghi tình trạng GCN' : '', t.chuaDKBD ? 'Chưa ĐK biến động' : '', t.hsThieu ? 'Thiếu hồ sơ' : '', t.htSD === 'khongdung' ? 'Không đúng mục đích' : ''].filter(Boolean).join('; '), t.nguyenNhanHS || '']));
      }
      const bd = all.flatMap(t => (t.bienDong || []).filter(b => L.inRange(b.ngay, P.from, P.to)).map(b => [U.fmtDate(b.ngay), b.loai, t.ten, Sc.refName('donvi', t.donViId), b.noiDung || '', b.soQD || '', U.num(b.giaTri) || '']));
      d.h3('Biến động trong kỳ (' + bd.length + ')');
      d.table('Bien dong tai san', [{ t: 'Ngày', w: 12 }, { t: 'Loại biến động', w: 20 }, { t: 'Tài sản', w: 40 }, { t: 'Đơn vị', w: 24 }, { t: 'Nội dung', w: 40 }, { t: 'Số quyết định', w: 18 }, N('Giá trị')], bd);
      if (P.dv) { d.h3('Danh mục tài sản'); d.table('Danh muc tai san', [{ t: 'Mã', w: 14 }, { t: 'Tài sản', w: 40 }, { t: 'Loại', w: 26 }, { t: 'Năm SD', w: 8 }, N('Nguyên giá'), N('Giá trị còn lại'), { t: 'Tình trạng', w: 22 }], all.map(t => [t.ma || '', t.ten, t.loai || '', t.namSD || '', U.num(t.nguyenGia), U.num(t.conLai), t.tinhTrang || ''])); }
    },
    dauthau(d, P) {
      const gts = S.all('goithau').filter(g => (!P.duan || g.duAnId === P.duan) && (!P.dv || g.donViId === P.dv)), hds = S.all('hopdong').filter(h => !P.duan || h.duAnId === P.duan);
      d.p('Đang theo dõi ' + gts.length + ' gói thầu, nội dung mua sắm với tổng giá gói thầu ' + U.fmtMoney(U.sum(gts, g => g.giaGoiThau)) + ' đồng; ' + gts.filter(g => ['cokq', 'dakyhd'].includes(g.trangThai)).length + ' gói đã có kết quả lựa chọn nhà thầu với tổng giá trúng thầu ' + U.fmtMoney(U.sum(gts, g => g.giaTrung)) + ' đồng. Có ' + hds.length + ' hợp đồng, tổng giá trị ' + U.fmtMoney(U.sum(hds, h => h.giaTri)) + ' đồng, đã thanh toán ' + U.fmtMoney(U.sum(hds, h => L.hd(h).thanhToan)) + ' đồng.');
      d.h3('Gói thầu, mua sắm');
      d.table('Goi thau', [{ t: 'Gói thầu', w: 60 }, { t: 'Loại', w: 16 }, N('Giá gói thầu'), { t: 'Hình thức LCNT', w: 22 }, { t: 'QĐ phê duyệt KHLCNT', w: 24 }, { t: 'Nhà thầu trúng thầu', w: 30 }, N('Giá trúng thầu'), { t: 'Tình trạng', w: 22 }], gts.map(g => [g.ten, g.loai || '', U.num(g.giaGoiThau), g.hinhThuc || '', [g.qdKHSo, U.fmtDate(g.qdKHNgay)].filter(Boolean).join(' ngày '), g.nhaThau || '', U.num(g.giaTrung) || '', L.gt(g).label + (L.gt(g).note ? ' — ' + L.gt(g).note : '')]), ['Cộng', '', U.sum(gts, g => g.giaGoiThau), '', '', '', U.sum(gts, g => g.giaTrung), '']);
      d.h3('Hợp đồng');
      d.table('Hop dong', [{ t: 'Số hợp đồng', w: 20 }, { t: 'Nội dung', w: 50 }, { t: 'Nhà thầu', w: 30 }, N('Giá trị'), N('Tạm ứng'), N('Đã thanh toán'), N('Còn lại'), { t: 'Hạn hoàn thành', w: 14 }, { t: 'Tình trạng', w: 26 }], hds.map(h => { const x = L.hd(h); return [h.so, h.ten || '', h.nhaThau || '', U.num(h.giaTri), U.num(h.tamUng), x.thanhToan, x.conLai, U.fmtDate(h.ngayKT), x.label + (x.note ? ' — ' + x.note : '')]; }), ['Cộng', '', '', U.sum(hds, h => h.giaTri), U.sum(hds, h => h.tamUng), U.sum(hds, h => L.hd(h).thanhToan), U.sum(hds, h => L.hd(h).conLai), '', '']);
    },
    canbo(d, P) {
      const y = +P.to.slice(0, 4), nvs = L.nvOfYear(y), rows = L.canBoStats(nvs).filter(r => !P.cb || r.c.id === P.cb), dms = S.all('danhmuc');
      d.table('Tien do theo can bo', [{ t: 'Cán bộ', w: 26 }, N('Chức năng chủ trì'), N('Nhiệm vụ chủ trì'), N('Phối hợp'), N('Hoàn thành'), N('Đang thực hiện'), N('Chưa triển khai'), N('Quá hạn'), PC('Tỷ lệ đúng hạn')], rows.map(r => [r.c.hoTen, dms.filter(x => x.chuTriId === r.c.id).length, r.s.tong, r.phoiHop, r.s.hoanthanh, r.s.dang, r.s.chua, r.s.quahan, r.tyLeDungHan === null ? '' : r.tyLeDungHan]));
      rows.forEach(r => { const l = nvs.filter(t => t.chuTriId === r.c.id && L.open(t)).sort((a, b) => U.cmp(a.han, b.han)); if (!l.length && !P.cb) return; d.h3(r.c.hoTen + ' — ' + l.length + ' nhiệm vụ đang mở'); d.table('NV ' + (r.c.tenGoi || r.c.hoTen), [{ t: 'Nhiệm vụ', w: 60 }, { t: 'Thời hạn', w: 12 }, N('Tiến độ (%)'), { t: 'Tình trạng', w: 22 }], l.map(t => [t.ten, t.han ? U.fmtDate(t.han) : 'Không hạn', U.num(t.tienDo), L.nv(t).label])); });
      const cp = nvs.filter(t => !t.chuTriId && L.open(t)); if (cp.length && !P.cb) { d.h3('Nhiệm vụ chưa phân công (' + cp.length + ')'); d.li(cp.map(t => t.ten + (t.han ? ' (hạn ' + U.fmtDate(t.han) + ')' : ''))); }
    },
    /* Báo cáo kỳ theo bố cục báo cáo tháng của Phòng: I. Kết quả — II. Tồn tại — III. Nhiệm vụ trọng tâm kỳ tới */
    ky(d, P) {
      const all = S.all('nhiemvu'), ht = all.filter(t => t.trangThai === 'hoanthanh' && L.inRange(t.ngayHT, P.from, P.to));
      const dang = all.filter(t => L.open(t) && t.trangThai === 'dang' && (!t.ngayGiao || t.ngayGiao <= P.to));
      const vb = S.all('vanban').filter(v => L.inRange(v.ngayBanHanh, P.from, P.to));
      d.h2('I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ ' + P.label.toUpperCase());
      d.p('Trong kỳ, Phòng tiếp nhận ' + vb.length + ' văn bản giao nhiệm vụ đã nhập phần mềm; hoàn thành ' + ht.length + ' nhiệm vụ; đang triển khai ' + dang.length + ' nhiệm vụ. Kết quả cụ thể như sau:');
      let i = 0;
      A.NHOM.forEach(n => {
        const a = ht.filter(t => String(t.nhom) === n[0]), b = dang.filter(t => String(t.nhom) === n[0]); if (!a.length && !b.length) return;
        d.h3(++i + '. ' + n[1]);
        d.li(a.map(t => t.ten + (t.ketQua ? ': ' + t.ketQua : '') + ' (đ/c ' + cb(t.chuTriId) + '; hoàn thành ' + U.fmtDate(t.ngayHT) + ').'));
        d.li(b.map(t => 'Đang thực hiện: ' + t.ten + ' — tiến độ ' + U.num(t.tienDo) + '%' + (t.ketQua ? '; ' + t.ketQua : '') + ' (đ/c ' + cb(t.chuTriId) + ').'));
      });
      const kn = ht.concat(dang).filter(t => !t.nhom); if (kn.length) { d.h3(++i + '. Nội dung khác'); d.li(kn.map(t => t.ten + (t.ketQua ? ': ' + t.ketQua : '') + '.')); }
      if (!i) d.p('(Chưa có nhiệm vụ nào hoàn thành hoặc đang thực hiện trong kỳ được nhập vào phần mềm.)');
      const y = +P.to.slice(0, 4), vons = S.all('von').filter(v => +v.nam === y).map(L.von), ns = L.nsTree(y, null);
      if (vons.length || ns.count) { d.h3(++i + '. Số liệu vốn, kinh phí năm ' + y); if (vons.length) d.li(['Kế hoạch vốn các chương trình, dự án: ' + U.fmtMoney(U.sum(vons, o => o.kh)) + ' đồng; đã giải ngân ' + U.fmtMoney(U.sum(vons, o => o.gn)) + ' đồng, đạt ' + U.fmtPct(U.pct(U.sum(vons, o => o.gn), U.sum(vons, o => o.kh))) + '.']); if (ns.count) d.li(['Dự toán ngân sách: tổng kinh phí được sử dụng ' + U.fmtMoney(ns.total.tong) + ' đồng; đã giải ngân, thanh toán ' + U.fmtMoney(ns.total.giaiNgan) + ' đồng, đạt ' + U.fmtPct(ns.total.tyLe) + '.']); }
      d.h2('II. TỒN TẠI, KHÓ KHĂN');
      const qh = all.filter(t => L.nv(t).st === 'quahan'), dc = S.all('duan').filter(x => L.da(x).cham);
      d.li(qh.map(t => 'Quá hạn ' + L.nv(t).late + ' ngày: ' + t.ten + ' (đ/c ' + cb(t.chuTriId) + ')' + (t.nguyenNhanCham ? '. Nguyên nhân: ' + t.nguyenNhanCham : '') + '.'));
      d.li(dc.map(x => 'Dự án chậm tiến độ: ' + x.ten + (x.nguyenNhanCham || x.khoKhan ? '. ' + [x.khoKhan, x.nguyenNhanCham].filter(Boolean).join(' ') : '') + '.'));
      if (!qh.length && !dc.length) d.p('Không có nhiệm vụ quá hạn hoặc dự án chậm tiến độ tại thời điểm lập báo cáo.');
      const yk = all.filter(t => L.open(t) && t.xinYKien); if (yk.length) { d.h3('Nội dung xin ý kiến lãnh đạo'); d.li(yk.map(t => t.ten + ': ' + (t.ndXinYKien || '(chưa ghi nội dung)') + '.')); }
      d.h2('III. NHIỆM VỤ TRỌNG TÂM KỲ TỚI');
      const nx = P.next, tt = all.filter(t => L.open(t) && t.trangThai !== 'tamdung' && (L.inRange(t.han, nx[0], nx[1]) || L.nv(t).st === 'quahan')).sort((a, b) => U.cmp(a.han, b.han));
      d.p('Từ ' + U.fmtDate(nx[0]) + ' đến ' + U.fmtDate(nx[1]) + ', tập trung các nhiệm vụ sau:');
      i = 0;
      A.NHOM.forEach(n => { const a = tt.filter(t => String(t.nhom) === n[0]); if (!a.length) return; d.h3(++i + '. ' + n[1]); d.li(a.map(t => t.ten + ' (hạn ' + U.fmtDate(t.han) + '; đ/c ' + cb(t.chuTriId) + ').')); });
      const o = tt.filter(t => !t.nhom); if (o.length) { d.h3(++i + '. Nội dung khác'); d.li(o.map(t => t.ten + ' (hạn ' + U.fmtDate(t.han) + ').')); }
      if (!i) d.p('(Chưa có nhiệm vụ nào có hạn trong kỳ tới được nhập vào phần mềm.)');
      const tx = all.filter(t => L.open(t) && t.loaiTG === 'thuongxuyen'); if (tx.length) { d.h3('Nhiệm vụ thường xuyên tiếp tục thực hiện'); d.li(tx.map(t => t.ten + '.')); }
    }
  };
  const TYPES = [
    ['ky', 'Báo cáo kết quả công tác kỳ (tháng, quý, 6 tháng, năm)', 'Kết quả thực hiện nhiệm vụ'],
    ['nhiemvu', 'Báo cáo tổng hợp nhiệm vụ của Phòng', 'Tổng hợp tình hình thực hiện nhiệm vụ'],
    ['duan', 'Báo cáo tình hình thực hiện chương trình, dự án', 'Tình hình thực hiện chương trình, dự án'],
    ['giaingan', 'Báo cáo giải ngân vốn', 'Tình hình giải ngân vốn'],
    ['ngansach', 'Báo cáo tài chính, ngân sách', 'Tình hình thực hiện dự toán ngân sách'],
    ['taisan', 'Báo cáo quản lý tài sản công', 'Tình hình quản lý, sử dụng tài sản công'],
    ['dauthau', 'Báo cáo tình hình mua sắm, đấu thầu', 'Tình hình mua sắm, đấu thầu, thực hiện hợp đồng'],
    ['canbo', 'Báo cáo tiến độ công việc theo cán bộ', 'Tiến độ công việc theo cán bộ'],
    ['dotxuat', 'Báo cáo đột xuất (tự chọn nội dung)', 'Báo cáo theo yêu cầu']];
  A.buildReport = P => {
    const d = Doc(), ty = TYPES.find(t => t[0] === P.type);
    if (P.type === 'dotxuat') { let i = 0; (P.secs || []).forEach(s => { const t = TYPES.find(x => x[0] === s); d.h2(U.roman(++i) + '. ' + t[2].toUpperCase()); SEC[s](d, P); }); if (!i) d.p('Chưa chọn nội dung nào.'); }
    else SEC[P.type](d, P);
    const title = P.type === 'ky' ? 'Kết quả thực hiện nhiệm vụ ' + P.label + (P.kind === 'thang' || P.kind === 'quy' ? '; phương hướng, nhiệm vụ trọng tâm kỳ tới' : '') : ty[2] + ' ' + P.label;
    const filt = [P.nhom ? 'lĩnh vực: ' + A.nhomTen(P.nhom) : '', P.dv ? 'đơn vị: ' + S.get('donvi', P.dv).ten : '', P.duan ? 'dự án: ' + U.trunc(S.get('duan', P.duan).ten, 60) : '', P.cb ? 'cán bộ: ' + S.get('canbo', P.cb).hoTen : ''].filter(Boolean).join('; ');
    const t = U.today();
    const html = '<div class="qh"><div>' + e(A.cfg('coQuan').toUpperCase()) + '<b>' + e(A.cfg('tenDonVi').toUpperCase()) + '</b></div><div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><b>Độc lập - Tự do - Hạnh phúc</b><i>Sơn La, ngày ' + +t.slice(8) + ' tháng ' + +t.slice(5, 7) + ' năm ' + t.slice(0, 4) + '</i></div></div><h1>BÁO CÁO</h1><div class="sub"><b>' + e(title) + '</b><br>(Kỳ báo cáo từ ' + U.fmtDate(P.from) + ' đến ' + U.fmtDate(P.to) + (filt ? '; ' + e(filt) : '') + ')</div>' + d.html + '<div class="src">Báo cáo được tổng hợp tự động từ dữ liệu đã nhập trong phần mềm tại thời điểm ' + U.fmtDateTime(U.nowStamp()) + '; tình trạng nhiệm vụ, dự án tính theo ngày lập báo cáo. Cần rà soát, bổ sung nhận định trước khi ký ban hành.</div><div class="sign"><div></div><div><b>' + e(A.cfg('tenDonVi').toUpperCase()) + '</b></div></div>';
    return { title, html, sheets: d.sheets, text: ['BÁO CÁO', title, 'Kỳ báo cáo từ ' + U.fmtDate(P.from) + ' đến ' + U.fmtDate(P.to)].concat(d.text).join('\n') };
  };

  A.views.baocao = {
    title: 'Báo cáo, thống kê', sub: 'Tổng hợp tự động từ dữ liệu đã nhập — xem trước, in, lưu PDF, xuất Excel và Word',
    render(root) {
      const t = U.today(), St = A.vs.bc || (A.vs.bc = { type: 'ky', kind: 'thang', n: +t.slice(5, 7), y: A.year() || +t.slice(0, 4), from: t.slice(0, 8) + '01', to: t, nhom: '', dv: '', duan: '', cb: '', secs: ['nhiemvu', 'duan', 'giaingan'] });
      const sel = (k, label, opts, w) => '<div class="fld" style="min-width:' + (w || 150) + 'px"><label for="bc_' + k + '">' + label + '</label><select class="sel" id="bc_' + k + '">' + opts.map(o => '<option value="' + e(o[0]) + '"' + (String(St[k]) === String(o[0]) ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + '</select></div>';
      const nOpts = St.kind === 'thang' ? Array.from({ length: 12 }, (_, i) => [i + 1, 'Tháng ' + (i + 1)]) : St.kind === 'quy' ? [1, 2, 3, 4].map(i => [i, 'Quý ' + U.roman(i)]) : null;
      root.innerHTML = '<div class="card no-print"><div class="card-b"><div class="gap" style="align-items:flex-end">' +
        sel('type', 'Loại báo cáo', TYPES.map(x => [x[0], x[1]]), 330) +
        sel('kind', 'Kỳ báo cáo', [['thang', 'Tháng'], ['quy', 'Quý'], ['6thang', '6 tháng đầu năm'], ['9thang', '9 tháng'], ['nam', 'Cả năm'], ['tuy', 'Tùy chọn từ ngày – đến ngày']], 190) +
        (nOpts ? sel('n', St.kind === 'thang' ? 'Tháng' : 'Quý', nOpts, 110) : '') +
        (St.kind === 'tuy' ? '<div class="fld"><label for="bc_from">Từ ngày</label><input class="inp" type="date" id="bc_from" value="' + St.from + '"></div><div class="fld"><label for="bc_to">Đến ngày</label><input class="inp" type="date" id="bc_to" value="' + St.to + '"></div>' : '<div class="fld" style="width:100px"><label for="bc_y">Năm</label><input class="inp" type="number" id="bc_y" min="2000" max="2100" value="' + St.y + '"></div>') + '</div>' +
        '<div class="gap mt" style="align-items:flex-end">' + sel('nhom', 'Lĩnh vực', [['', 'Tất cả lĩnh vực']].concat(A.NHOM.map(n => [n[0], n[2]])), 200) + sel('dv', 'Đơn vị', [['', 'Tất cả đơn vị']].concat(S.all('donvi').map(x => [x.id, x.tenTat || x.ten])), 180) + sel('duan', 'Chương trình, dự án', [['', 'Tất cả dự án']].concat(S.all('duan').map(x => [x.id, U.trunc(x.ten, 60)])), 240) + sel('cb', 'Cán bộ', [['', 'Tất cả cán bộ']].concat(S.all('canbo').map(x => [x.id, x.hoTen])), 180) + '</div>' +
        (St.type === 'dotxuat' ? '<div class="fld mt"><span class="lb">Nội dung đưa vào báo cáo đột xuất</span><div class="checks">' + TYPES.filter(x => !['ky', 'dotxuat'].includes(x[0])).map(x => '<label class="check"><input type="checkbox" data-sec="' + x[0] + '"' + (St.secs.includes(x[0]) ? ' checked' : '') + '> ' + e(x[2]) + '</label>').join('') + '</div></div>' : '') +
        '<div class="gap mt"><button class="btn primary" data-do="print">' + ic('print', 16) + 'In / Lưu PDF</button><button class="btn" data-do="xlsx">' + ic('download', 16) + 'Xuất Excel</button><button class="btn" data-do="doc">' + ic('doc', 16) + 'Xuất Word</button><button class="btn" data-do="copy">' + ic('copy', 16) + 'Sao chép nội dung</button><span class="small muted">Bộ lọc chỉ áp dụng cho những phần báo cáo có trường tương ứng. Để lưu PDF: bấm In rồi chọn máy in "Lưu dưới dạng PDF".</span></div></div></div><div class="paper mt" data-paper></div>';
      const period = () => {
        if (St.kind === 'tuy') { const f = U.isISO(St.from) ? St.from : t, to = U.isISO(St.to) && St.to >= f ? St.to : f; const len = U.diffDays(to, f) + 1; return { from: f, to, label: 'từ ngày ' + U.fmtDate(f) + ' đến ngày ' + U.fmtDate(to), next: [U.addDays(to, 1), U.addDays(to, len)] }; }
        const n = St.kind === 'thang' ? Math.min(12, Math.max(1, +St.n || 1)) : St.kind === 'quy' ? Math.min(4, Math.max(1, +St.n || 1)) : 0;
        const p = L.period(St.kind, +St.y, n); let nx;
        if (St.kind === 'thang') nx = n === 12 ? L.period('thang', +St.y + 1, 1) : L.period('thang', +St.y, n + 1);
        else if (St.kind === 'quy') nx = n === 4 ? L.period('quy', +St.y + 1, 1) : L.period('quy', +St.y, n + 1);
        else if (St.kind === '6thang') nx = [St.y + '-07-01', St.y + '-12-31']; else if (St.kind === '9thang') nx = [St.y + '-10-01', St.y + '-12-31']; else nx = L.period('nam', +St.y + 1, 0);
        return { from: p[0], to: p[1], label: p[2], next: nx };
      };
      let rep = null;
      const draw = () => { try { rep = A.buildReport(Object.assign({}, St, period())); $('[data-paper]', root).innerHTML = rep.html; } catch (er) { console.error(er); $('[data-paper]', root).innerHTML = '<p>Không dựng được báo cáo: ' + e(er.message) + '</p>'; } };
      ['type', 'kind', 'n', 'nhom', 'dv', 'duan', 'cb'].forEach(k => { const el = $('#bc_' + k, root); if (el) el.onchange = () => { St[k] = el.value; if (k === 'kind') St.n = St.kind === 'thang' ? +t.slice(5, 7) : Math.ceil(+t.slice(5, 7) / 3); if (k === 'type' || k === 'kind') A.render(); else draw(); }; });
      ['y', 'from', 'to'].forEach(k => { const el = $('#bc_' + k, root); if (el) el.onchange = () => { St[k] = k === 'y' ? (+el.value >= 2000 && +el.value <= 2100 ? +el.value : St.y) : el.value; draw(); }; });
      $$('[data-sec]', root).forEach(c => c.onchange = () => { St.secs = $$('[data-sec]', root).filter(x => x.checked).map(x => x.dataset.sec); draw(); });
      draw();
      const fn = () => U.norm(rep.title).replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + UI.stamp();
      UI.on(root, 'click', '[data-do]', async b => {
        const k = b.dataset.do;
        if (k === 'print') window.print();
        else if (k === 'xlsx') { if (!rep.sheets.length) { UI.toast('Báo cáo này không có bảng số liệu để xuất Excel. Hãy dùng Xuất Word.', 'bad'); return; } const used = {}; UI.xlsx(fn() + '.xlsx', rep.sheets.map(s => { let n = s.name.slice(0, 28); if (used[n]) n = n.slice(0, 25) + ' ' + (++used[n]); else used[n] = 1; return Object.assign({}, s, { name: n }); })); UI.toast('Đã xuất ' + rep.sheets.length + ' bảng ra Excel.', 'ok'); }
        else if (k === 'doc') { const css = 'body{font-family:"Times New Roman";font-size:14pt;line-height:1.4}h1{font-size:14pt;text-align:center}h2,h3{font-size:14pt}h3{font-style:italic}p{text-align:justify;margin:4pt 0}table{border-collapse:collapse;width:100%;font-size:11pt}th,td{border:1px solid #000;padding:3pt 5pt;vertical-align:top}th{text-align:center}td.num{text-align:right}.qh{display:table;width:100%;text-align:center;font-size:13pt}.qh>div{display:table-cell;width:50%}.qh b{display:block}.sub{text-align:center;font-style:italic}.src{font-size:11pt;font-style:italic}.sign{text-align:right;margin-top:24pt}'; UI.download(new Blob(['﻿<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' + e(rep.title) + '</title><style>@page{size:A4;margin:2cm 1.5cm 2cm 3cm}' + css + '</style></head><body>' + rep.html + '</body></html>'], { type: 'application/msword' }), fn() + '.doc'); UI.toast('Đã xuất tệp Word.', 'ok'); }
        else { try { await navigator.clipboard.writeText(rep.text); UI.toast('Đã sao chép nội dung báo cáo.', 'ok'); } catch (x) { UI.modal({ title: 'Nội dung báo cáo', body: '<textarea class="inp" rows="18" readonly>' + e(rep.text) + '</textarea>', buttons: [{ label: 'Đóng', on: m => m.close() }] }); } }
      });
    }
  };

  /* ================= NHẬT KÝ CẬP NHẬT ================= */
  A.views.lichsu = {
    title: 'Nhật ký cập nhật dữ liệu', sub: 'Mọi thao tác thêm, sửa, xóa, nhập hàng loạt, khôi phục đều được ghi lại kèm người thực hiện',
    render(root) {
      const st = A.vs.ls || (A.vs.ls = { q: '', c: '', a: '', tbl: {} });
      const colls = Sc.TRACKED.map(c => [c, Sc.C[c].label]).concat([['hethong', 'Hệ thống']]);
      root.innerHTML = '<div class="toolbar"><div class="search">' + ic('search', 16) + '<input class="inp" type="search" placeholder="Tìm theo tên bản ghi, người sửa…" value="' + e(st.q) + '" aria-label="Tìm trong nhật ký"></div><select class="sel" data-c aria-label="Loại dữ liệu"><option value="">Loại dữ liệu: tất cả</option>' + colls.map(c => '<option value="' + c[0] + '"' + (st.c === c[0] ? ' selected' : '') + '>' + e(c[1]) + '</option>').join('') + '</select><select class="sel" data-a aria-label="Thao tác"><option value="">Thao tác: tất cả</option>' + ['Thêm', 'Sửa', 'Xóa', 'Nhập hàng loạt', 'Xóa hàng loạt', 'Khôi phục'].map(a => '<option' + (st.a === a ? ' selected' : '') + '>' + a + '</option>').join('') + '</select><span class="sp"></span><button class="btn" data-x>' + ic('download', 16) + 'Xuất Excel</button></div><div data-b></div>';
      const body = $('[data-b]', root); let cur = [];
      const draw = () => {
        const nq = U.norm(st.q);
        cur = S.all('lichsu').filter(h => (!st.c || h.coll === st.c) && (!st.a || (h.action || '').startsWith(st.a)) && (!nq || U.norm([h.title, h.user, h.note, (h.changes || []).map(c => c.label + ' ' + c.cu + ' ' + c.moi).join(' ')].join(' ')).includes(nq)));
        if (!cur.length) { body.innerHTML = '<div class="card">' + UI.empty('Chưa có nhật ký phù hợp', 'Nhật ký được ghi tự động khi dữ liệu thay đổi.') + '</div>'; return; }
        UI.table(body, {
          rows: cur, state: st.tbl, sort: { k: 'time', dir: -1 }, page: 50, onRow: h => { if (h.recId && S.get(h.coll, h.recId)) A.open(h.coll, h.recId); else UI.toast(h.recId ? 'Bản ghi này đã bị xóa.' : 'Mục nhật ký này không gắn với một bản ghi cụ thể.'); },
          cols: [{ k: 'time', label: 'Thời điểm', cls: 'nowrap', html: h => U.fmtDateTime(h.time) }, { k: 'user', label: 'Người thực hiện' }, { k: 'action', label: 'Thao tác', html: h => UI.chip(h.action === 'Thêm' ? 'hoanthanh' : h.action === 'Sửa' ? 'dang' : (h.action || '').startsWith('Xóa') ? 'quahan' : 'tamdung', h.action) },
          { k: 'coll', label: 'Loại dữ liệu', val: h => (Sc.C[h.coll] || {}).label || 'Hệ thống', html: h => e((Sc.C[h.coll] || {}).label || 'Hệ thống') },
          { k: 'title', label: 'Bản ghi', cls: 'wrap', html: h => '<div class="t1">' + e(h.title || '') + '</div>' + (h.changes || []).slice(0, 4).map(c => '<div class="t2"><b>' + e(c.label) + ':</b> ' + (e(c.cu) || '(trống)') + ' → ' + (e(c.moi) || '(trống)') + '</div>').join('') + ((h.changes || []).length > 4 ? '<div class="t2">… và ' + (h.changes.length - 4) + ' trường khác</div>' : '') }]
        });
      };
      $('.search input', root).addEventListener('input', U.debounce(x => { st.q = x.target.value; st.tbl.page = 0; draw(); }, 160));
      $('[data-c]', root).onchange = x => { st.c = x.target.value; draw(); }; $('[data-a]', root).onchange = x => { st.a = x.target.value; draw(); };
      $('[data-x]', root).onclick = () => { UI.xlsx('nhat-ky-cap-nhat-' + UI.stamp() + '.xlsx', [{ name: 'Nhat ky', aoa: [['Thời điểm', 'Người thực hiện', 'Thao tác', 'Loại dữ liệu', 'Bản ghi', 'Thay đổi']].concat(cur.sort((a, b) => a.time < b.time ? 1 : -1).map(h => [U.fmtDateTime(h.time), h.user, h.action, (Sc.C[h.coll] || {}).label || 'Hệ thống', h.title, (h.changes || []).map(c => c.label + ': ' + (c.cu || '(trống)') + ' → ' + (c.moi || '(trống)')).join('\n')])), widths: [18, 20, 16, 22, 60, 80] }]); };
      draw();
    }
  };

  /* ================= THIẾT LẬP ================= */
  const LIST_LABEL = { nguonVB: 'Nguồn văn bản giao nhiệm vụ', nguonNV: 'Nguồn giao nhiệm vụ', loaiDuAn: 'Loại chương trình, dự án', vaiTroSo: 'Vai trò của Sở, Phòng với dự án', linhVucDA: 'Lĩnh vực dự án', nguonVon: 'Nguồn vốn', nhomKP: 'Nhóm kinh phí', loaiTaiSan: 'Loại tài sản', nguonTaiSan: 'Nguồn hình thành tài sản', tinhTrangTS: 'Tình trạng tài sản', loaiBienDongTS: 'Loại biến động tài sản', loaiGoiThau: 'Loại gói thầu', hinhThucLCNT: 'Hình thức lựa chọn nhà thầu', loaiHopDong: 'Loại hợp đồng', nhomMoc: 'Giai đoạn, mốc dự án' };
  A.backupNow = async withFiles => {
    try { const o = await S.exportAll(withFiles); UI.download(new Blob([JSON.stringify(o)], { type: 'application/json' }), 'sao-luu-khtc-' + UI.stamp() + '-' + new Date().toTimeString().slice(0, 5).replace(':', '') + '.json'); await S.setCfg({ lastBackup: U.nowStamp() }); UI.toast('Đã tải tệp sao lưu về máy. Hãy cất tệp ở nơi an toàn.', 'ok'); } catch (er) { UI.fail(er); }
  };
  async function sync(action, force) {
    const url = (S.cfg.syncUrl || '').trim(), key = S.cfg.syncKey || '';
    if (!/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(url)) { UI.toast('Chưa có địa chỉ dịch vụ đồng bộ hợp lệ (https://…).', 'bad'); return; }
    const call = async body => { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ key, app: A.APP_ID }, body)), redirect: 'follow' }); if (!r.ok) throw new Error('Máy chủ trả mã ' + r.status); const j = await r.json(); if (!j.ok && !j.conflict) throw new Error(j.error || 'Máy chủ từ chối'); return j; };
    try {
      if (action === 'push') {
        const payload = await S.exportAll(false);
        const j = await call({ action: 'push', baseRev: force ? null : (S.cfg.syncRev || 0), force: !!force, payload });
        if (j.conflict) { if (await UI.confirm({ title: 'Dữ liệu trên máy chủ đã thay đổi', msg: 'Bản trên máy chủ (lưu lúc ' + U.fmtDateTime(j.savedAt) + ' bởi ' + (j.savedBy || '?') + ') mới hơn lần đồng bộ gần nhất của máy này.\n\nNên "Tải về và gộp" trước rồi mới đẩy lên. Vẫn ghi đè bản trên máy chủ?', ok: 'Ghi đè', danger: true })) return sync('push', true); return; }
        await S.setCfg({ syncRev: j.rev, syncAt: U.nowStamp() }); UI.toast('Đã đẩy dữ liệu lên máy chủ (bản số ' + j.rev + ').', 'ok');
      } else {
        const j = await call({ action: 'pull' });
        if (!j.payload) { UI.toast('Máy chủ chưa có dữ liệu. Hãy đẩy lên trước.', 'bad'); return; }
        const err = S.validateBackup(j.payload); if (err) throw new Error(err);
        await S.snapshot('Trước khi tải dữ liệu từ máy chủ');
        const keep = { syncUrl: S.cfg.syncUrl, syncKey: S.cfg.syncKey, nguoiDung: S.cfg.nguoiDung, theme: S.cfg.theme };
        const stat = await S.importAll(j.payload, 'merge'); await S.setCfg(Object.assign(keep, { syncRev: j.rev, syncAt: U.nowStamp() }));
        UI.toast('Đã tải và gộp: ' + stat.them + ' bản ghi mới, ' + stat.capNhat + ' cập nhật, ' + stat.boQua + ' giữ nguyên.', 'ok');
      }
    } catch (er) { UI.fail(new Error('Đồng bộ lỗi — ' + er.message + '. Kiểm tra địa chỉ, mã bí mật và kết nối mạng.')); }
  }
  A.views.thietlap = {
    title: 'Thiết lập và dữ liệu', sub: 'Thông tin đơn vị, ngưỡng cảnh báo, danh mục, sao lưu, khôi phục, đồng bộ',
    render(root) {
      const c = S.cfg, ng = k => A.nguong(k), T = A.vs.tl || (A.vs.tl = { lk: 'nguonVon' });
      const counts = Sc.TRACKED.map(k => Sc.C[k].label + ': ' + S.count(k)).join(' · ');
      root.innerHTML = '<div class="grid2"><div class="stack">' +
        '<div class="card"><div class="card-h"><h3>Đơn vị và người sử dụng</h3></div><div class="card-b"><div class="form"><div class="fld full"><label for="tl_cq">Cơ quan chủ quản</label><input class="inp" id="tl_cq" value="' + e(A.cfg('coQuan')) + '"></div><div class="fld full"><label for="tl_dv">Tên phòng</label><input class="inp" id="tl_dv" value="' + e(A.cfg('tenDonVi')) + '"></div><div class="fld full"><label for="tl_nd">Người đang sử dụng máy này</label><input class="inp" id="tl_nd" value="' + e(c.nguoiDung || '') + '" placeholder="Ví dụ: Lê Tùng Lâm"><div class="help">Tên này được ghi vào nhật ký mỗi lần thêm, sửa, xóa dữ liệu.</div></div></div><div class="gap mt"><button class="btn primary" data-save="info">Lưu thông tin</button></div></div></div>' +
        '<div class="card"><div class="card-h"><h3>Ngưỡng cảnh báo</h3><div class="sub">Ngưỡng nội bộ để nhắc việc; không phải quy định pháp luật</div></div><div class="card-b"><div class="form"><div class="fld"><label for="tl_sh">Sắp đến hạn (ngày)</label><input class="inp" type="number" min="1" max="60" id="tl_sh" value="' + ng('sapHan') + '"></div><div class="fld"><label for="tl_td">Tồn đọng kéo dài (ngày)</label><input class="inp" type="number" min="1" max="365" id="tl_td" value="' + ng('tonDong') + '"></div><div class="fld"><label for="tl_gn">Giải ngân chậm hơn thời gian năm (điểm %)</label><input class="inp" type="number" min="1" max="100" id="tl_gn" value="' + ng('gnLech') + '"></div><div class="fld"><label for="tl_hd">Hợp đồng sắp hết hạn (ngày)</label><input class="inp" type="number" min="1" max="180" id="tl_hd" value="' + ng('hdSapHet') + '"></div></div><div class="gap mt"><button class="btn primary" data-save="nguong">Lưu ngưỡng</button></div></div></div>' +
        '<div class="card"><div class="card-h"><h3>Danh mục dùng chung</h3><div class="sub">Mỗi dòng một giá trị. Cập nhật khi quy định thay đổi; bản ghi cũ giữ nguyên giá trị đã chọn.</div></div><div class="card-b"><select class="sel" id="tl_lk" aria-label="Chọn danh mục">' + Object.keys(LIST_LABEL).map(k => '<option value="' + k + '"' + (T.lk === k ? ' selected' : '') + '>' + e(LIST_LABEL[k]) + '</option>').join('') + '</select><textarea class="inp mt" id="tl_lv" rows="9" aria-label="Giá trị danh mục">' + e(A.list(T.lk).join('\n')) + '</textarea><div class="gap mt"><button class="btn primary" data-save="list">Lưu danh mục</button><button class="btn" data-save="listdef">Về mặc định</button></div></div></div>' +
        '</div><div class="stack">' +
        '<div class="card"><div class="card-h"><h3>Sao lưu và khôi phục</h3><div class="sub">Sao lưu gần nhất: ' + (c.lastBackup ? U.fmtDateTime(c.lastBackup) : '<b style="color:var(--bad-fg)">chưa từng sao lưu</b>') + '</div></div><div class="card-b"><p class="small soft">Dữ liệu nằm trong trình duyệt của máy này (' + e(S.adapter.name) + '). Xóa dữ liệu duyệt web, đổi trình duyệt hoặc đổi máy sẽ không thấy dữ liệu — vì vậy cần sao lưu định kỳ ra tệp JSON.</p><div class="small muted mb">' + e(counts) + '</div><div class="gap"><button class="btn primary" data-bk="1">' + ic('download', 16) + 'Sao lưu (kèm tệp đính kèm)</button><button class="btn" data-bk="0">Sao lưu, không kèm tệp</button></div><div class="gap mt"><button class="btn" data-rs="merge">' + ic('upload', 16) + 'Khôi phục: gộp vào dữ liệu hiện có</button><button class="btn" data-rs="replace">Khôi phục: thay toàn bộ</button></div><div class="eyebrow">Bản chụp tự động trước thao tác lớn</div><div data-snaps class="small muted">Đang đọc…</div><div class="eyebrow">Vùng nguy hiểm</div><button class="btn danger" data-wipe>' + ic('trash', 16) + 'Xóa toàn bộ dữ liệu trên máy này</button></div></div>' +
        '<div class="card"><div class="card-h"><h3>Dữ liệu tham khảo</h3></div><div class="card-b"><p class="small soft">Nạp tên ' + A.Seed.DA279.length + ' nhiệm vụ, dự án theo biểu "Phân công theo dõi - quản lý nhiệm vụ dự án" kèm Thông báo 279/TB-KHTC. Chỉ có tên và lĩnh vực; không có số liệu tài chính, không gán cán bộ. Tên đã có sẽ được bỏ qua.</p><button class="btn" data-da279>' + ic('project', 16) + 'Nạp tên nhiệm vụ, dự án theo Thông báo 279</button></div></div>' +
        '<div class="card"><div class="card-h"><h3>Đồng bộ qua Google Apps Script (tùy chọn)</h3><div class="sub">Dùng khi làm việc trên nhiều máy. Đồng bộ theo kiểu đẩy lên – tải về toàn bộ dữ liệu, không kèm tệp đính kèm.</div></div><div class="card-b"><div class="fld"><label for="tl_su">Địa chỉ Web App</label><input class="inp" id="tl_su" value="' + e(c.syncUrl || '') + '" placeholder="https://script.google.com/macros/s/…/exec"></div><div class="fld mt"><label for="tl_sk">Mã bí mật (trùng MA_BI_MAT trong Code.gs)</label><input class="inp" id="tl_sk" type="password" value="' + e(c.syncKey || '') + '" autocomplete="off"></div><div class="small muted mt">Lần đồng bộ gần nhất: ' + (c.syncAt ? U.fmtDateTime(c.syncAt) + ' (bản số ' + (c.syncRev || 0) + ')' : 'chưa có') + '</div><div class="gap mt"><button class="btn" data-save="sync">Lưu cấu hình</button><button class="btn" data-sync="pull">' + ic('download', 16) + 'Tải về và gộp</button><button class="btn primary" data-sync="push">' + ic('upload', 16) + 'Đẩy lên máy chủ</button></div><div class="note mt">Mã Apps Script mẫu nằm trong tệp <b>gas/Code.gs</b> kèm theo. Hai người cùng sửa một bản ghi thì bản sửa sau cùng được giữ. Đây chưa phải hệ thống nhiều người dùng có phân quyền.</div></div></div>' +
        '<div class="card"><div class="card-h"><h3>Giới thiệu</h3></div><div class="card-b small soft"><p><b>Phòng Kế hoạch - Tài chính số</b>, phiên bản ' + A.VERSION + '. Danh mục chức năng, nhiệm vụ lấy từ ' + e(A.Seed.QD) + '. Phần mềm không tự tạo số liệu tài chính; mọi con số trên bảng điều hành đều tính từ dữ liệu đã nhập.</p><p data-quota>Dung lượng lưu trữ: đang kiểm tra…</p></div></div>' +
        '</div></div>';
      const v = id => $('#' + id, root).value.trim();
      UI.on(root, 'click', '[data-save]', async b => {
        const k = b.dataset.save;
        try {
          if (k === 'info') { if (!v('tl_dv')) { UI.toast('Tên phòng không được để trống.', 'bad'); return; } await S.setCfg({ coQuan: v('tl_cq'), tenDonVi: v('tl_dv'), nguoiDung: v('tl_nd') }); UI.toast('Đã lưu thông tin.', 'ok'); }
          if (k === 'nguong') { const n = { sapHan: +v('tl_sh'), tonDong: +v('tl_td'), gnLech: +v('tl_gn'), hdSapHet: +v('tl_hd') }; if (Object.values(n).some(x => !(x >= 1 && x <= 365))) { UI.toast('Ngưỡng phải là số từ 1 đến 365.', 'bad'); return; } await S.setCfg({ nguong: n }); UI.toast('Đã lưu ngưỡng cảnh báo.', 'ok'); }
          if (k === 'list') { const arr = Array.from(new Set($('#tl_lv', root).value.split('\n').map(x => x.trim()).filter(Boolean))); if (!arr.length) { UI.toast('Danh mục phải có ít nhất một giá trị.', 'bad'); return; } await S.setCfg({ lists: Object.assign({}, c.lists || {}, { [T.lk]: arr }) }); UI.toast('Đã lưu danh mục "' + LIST_LABEL[T.lk] + '" (' + arr.length + ' giá trị).', 'ok'); }
          if (k === 'listdef') { const l = Object.assign({}, c.lists || {}); delete l[T.lk]; await S.setCfg({ lists: l }); UI.toast('Đã đưa danh mục về mặc định.', 'ok'); }
          if (k === 'sync') { await S.setCfg({ syncUrl: v('tl_su'), syncKey: $('#tl_sk', root).value }); UI.toast('Đã lưu cấu hình đồng bộ.', 'ok'); }
        } catch (er) { UI.fail(er); }
      });
      $('#tl_lk', root).onchange = x => { T.lk = x.target.value; $('#tl_lv', root).value = A.list(T.lk).join('\n'); };
      $$('[data-bk]', root).forEach(b => b.onclick = () => A.backupNow(b.dataset.bk === '1'));
      $$('[data-sync]', root).forEach(b => b.onclick = async () => { await S.setCfg({ syncUrl: v('tl_su'), syncKey: $('#tl_sk', root).value }); sync(b.dataset.sync); });
      $$('[data-rs]', root).forEach(b => b.onclick = async () => {
        const mode = b.dataset.rs, file = await UI.pickFile('.json,application/json'); if (!file) return;
        let obj; try { obj = JSON.parse(await file.text()); } catch (x) { UI.toast('Tệp không đọc được: không phải JSON hợp lệ.', 'bad'); return; }
        const err = S.validateBackup(obj); if (err) { UI.toast(err, 'bad'); return; }
        const n = Object.keys(obj.data).filter(k => k !== 'lichsu').reduce((s, k) => s + obj.data[k].length, 0);
        if (!await UI.confirm({ title: mode === 'replace' ? 'Thay toàn bộ dữ liệu hiện có?' : 'Gộp bản sao lưu vào dữ liệu hiện có?', msg: 'Tệp: ' + file.name + '\nSao lưu lúc: ' + U.fmtDateTime(obj.exportedAt) + ' bởi ' + (obj.exportedBy || '?') + '\nSố bản ghi: ' + n + (obj.files && obj.files.length ? ' · ' + obj.files.length + ' tệp đính kèm' : '') + '\n\n' + (mode === 'replace' ? 'Toàn bộ dữ liệu đang có trên máy này sẽ bị thay bằng nội dung tệp.' : 'Bản ghi mới được thêm; bản ghi trùng mã thì giữ bản sửa sau cùng.') + ' Phần mềm lưu một bản chụp trước khi thực hiện.', ok: mode === 'replace' ? 'Thay toàn bộ' : 'Gộp dữ liệu', danger: mode === 'replace' })) return;
        try { await S.snapshot('Trước khi khôi phục từ ' + file.name); const s2 = await S.importAll(obj, mode); UI.toast('Khôi phục xong: ' + s2.them + ' thêm, ' + s2.capNhat + ' cập nhật, ' + s2.boQua + ' giữ nguyên.', 'ok'); A.render(); } catch (er) { UI.fail(er); }
      });
      $('[data-da279]', root).onclick = async () => { if (!await UI.confirm({ title: 'Nạp tên nhiệm vụ, dự án?', msg: 'Thêm tối đa ' + A.Seed.DA279.length + ' chương trình, dự án chỉ có tên và lĩnh vực (nguồn: biểu kèm Thông báo 279/TB-KHTC). Số liệu, cán bộ theo dõi cần anh/chị cập nhật sau.', ok: 'Nạp' })) return; try { const n = await A.Seed.napDuAn279(); UI.toast(n ? 'Đã nạp ' + n + ' tên nhiệm vụ, dự án.' : 'Tất cả các tên đã có sẵn, không nạp thêm.', 'ok'); } catch (er) { UI.fail(er); } };
      $('[data-wipe]', root).onclick = () => {
        const m = UI.modal({ title: 'Xóa toàn bộ dữ liệu trên máy này?', size: 'sm', body: '<p>Mọi nhiệm vụ, dự án, số liệu, tệp đính kèm và nhật ký trên trình duyệt này sẽ bị xóa. Phần mềm sẽ nạp lại danh mục chức năng ban đầu.</p><p>Hãy <b>sao lưu</b> trước. Gõ <b>XOA DU LIEU</b> để xác nhận:</p><input class="inp" id="wp" autocomplete="off" aria-label="Gõ XOA DU LIEU để xác nhận">', buttons: [{ label: 'Hủy', on: a => a.close() }, { label: 'Xóa toàn bộ', cls: 'danger', on: async a => { if ($('#wp', a.body).value.trim() !== 'XOA DU LIEU') { UI.toast('Chưa gõ đúng cụm xác nhận.', 'bad'); return; } try { await S.snapshot('Trước khi xóa toàn bộ dữ liệu'); await S.wipe(); await S.setCfg({ seeded: false }); await A.Seed.firstRun(); a.close(); UI.toast('Đã xóa và nạp lại danh mục ban đầu.', 'ok'); A.go('tongquan'); } catch (er) { UI.fail(er); } } }] });
      };
      S.snapshots().then(list => {
        const box = $('[data-snaps]', root); if (!box) return;
        box.innerHTML = list.length ? list.map((s, i) => '<div class="gap" style="padding:4px 0"><span class="grow">' + U.fmtDateTime(s.exportedAt) + ' — ' + e(s.reason || '') + '</span><button class="btn sm" data-snap="' + i + '">Khôi phục bản này</button></div>').join('') : 'Chưa có bản chụp nào. Phần mềm tự chụp trước khi khôi phục, nhập lại biểu dự toán, tải dữ liệu đồng bộ hoặc xóa toàn bộ.';
        $$('[data-snap]', box).forEach(b => b.onclick = async () => { const s = list[+b.dataset.snap]; if (!await UI.confirm({ title: 'Khôi phục bản chụp?', msg: 'Thay toàn bộ dữ liệu hiện có bằng bản chụp lúc ' + U.fmtDateTime(s.exportedAt) + ' (' + (s.reason || '') + '). Tệp đính kèm thêm sau thời điểm đó được giữ lại trong kho nhưng có thể mất liên kết.', ok: 'Khôi phục', danger: true })) return; try { await S.importAll(s, 'replace'); UI.toast('Đã khôi phục bản chụp.', 'ok'); A.render(); } catch (er) { UI.fail(er); } });
      });
      if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(q => { const el = $('[data-quota]', root); if (el) el.textContent = 'Dung lượng lưu trữ: đang dùng ' + U.fileSize(q.usage || 0) + ' trên hạn mức khoảng ' + U.fileSize(q.quota || 0) + ' của trình duyệt.'; }).catch(() => { });
    }
  };
})(App);
