/* ============================================================
   58b-suckhoe.js — Trang "Sức khỏe dữ liệu"
   Chỉ ra bản ghi thiếu trường quan trọng, hợp đồng chưa gắn nguồn kinh phí, dòng dự toán lâu chưa cập nhật…
   Chỉ đọc dữ liệu, không tự sửa. Bấm từng bản ghi để mở và bổ sung.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const trong = v => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

  // Danh sách kiểm tra: { k, nhom, sev (3 cao, 2 vừa, 1 nhắc), ten, c, rows, goiY }
  L.sucKhoe = (y, ngayCu) => {
    const out = [], add = (k, nhom, sev, ten, c, rows, goiY) => out.push({ k, nhom, sev, ten, c, rows, goiY });
    const today = U.today();
    // ---- Dự toán, giải ngân (năm đang xem) ----
    const la = L.gnLeaves(y, {}), conGN = la.filter(n => n.sum.tong - n.sum.giaiNgan > 0.5);
    const lanCuoi = r => L.gnHistOf(r).map(x => x.ngay).concat([r.ngayGN, r.bieuNgay]).filter(U.isISO).sort().pop() || '';
    add('ns_cu', 'Dự toán, giải ngân', 2, 'Dòng dự toán lâu chưa cập nhật số giải ngân (quá ' + ngayCu + ' ngày)', 'ngansach', conGN.filter(n => { const d = lanCuoi(n.r); return !d || U.diffDays(today, d) > ngayCu; }).map(n => ({ r: n.r, ghi: lanCuoi(n.r) ? 'Cập nhật lần cuối ' + U.fmtDate(lanCuoi(n.r)) + ' (' + U.diffDays(today, lanCuoi(n.r)) + ' ngày)' : 'Chưa có ngày số liệu' })), 'Nhập biểu giải ngân mới hoặc cập nhật số giải ngân ở thẻ "Cập nhật giải ngân".');
    add('ns_cb', 'Dự toán, giải ngân', 2, 'Dòng dự toán chi tiết chưa giao cán bộ theo dõi', 'ngansach', la.filter(n => !n.r.canBoId).map(n => ({ r: n.r })), 'Giao cán bộ để đôn đốc, nhắc việc và lọc báo cáo theo người.');
    add('ns_0', 'Dự toán, giải ngân', 1, 'Dòng dự toán chi tiết có kinh phí được sử dụng bằng 0', 'ngansach', la.filter(n => !(n.sum.tong > 0)).map(n => ({ r: n.r })), 'Kiểm tra lại số liệu hoặc xóa dòng không còn sử dụng.');
    add('ns_lech', 'Dự toán, giải ngân', 2, 'Dòng tổng có số trên biểu khác tổng các dòng chi tiết (⚠)', 'ngansach', L.nsTree(y, null).flat.filter(n => n.lech && n.lech.length).map(n => ({ r: n.r, ghi: n.lech.length + ' cột lệch' })), 'Rà soát ở thẻ Chi tiết dự toán → "Rà soát, xử lý cảnh báo".');
    if (L.doiChieu) { const dc = L.doiChieu(y, {}).rows.filter(x => x.st === 'thieu' && !x.giaiTrinh); add('dc_thieu', 'Dự toán, giải ngân', 3, 'Thanh toán hợp đồng lớn hơn số giải ngân của dòng dự toán, chưa giải trình', 'ngansach', dc.map(x => ({ r: x.r, ghi: 'Chênh ' + U.fmtShort(x.chenh) })), 'Xem thẻ "Đối chiếu" ở trang Tài chính: cập nhật số giải ngân, sửa nguồn của hợp đồng hoặc ghi giải trình.'); }
    // ---- Hợp đồng ----
    const hds = S.all('hopdong'), dang = hds.filter(h => !['thanhly', 'chamdut'].includes(h.trangThai));
    add('hd_ns', 'Hợp đồng', 3, 'Hợp đồng chưa gắn nguồn kinh phí (dòng dự toán)', 'hopdong', hds.filter(h => !L.hdNsId(h)).map(h => ({ r: h })), 'Mở hợp đồng → "Liên kết nguồn kinh phí", hoặc gắn nguồn cho gói thầu của hợp đồng.');
    add('hd_han', 'Hợp đồng', 2, 'Hợp đồng đang thực hiện chưa có thời hạn hoàn thành', 'hopdong', dang.filter(h => !L.hdHan(h) && !h.thoiGianTH).map(h => ({ r: h })), 'Ghi ngày bắt đầu và thời gian thực hiện để phần mềm tự tính thời hạn.');
    add('hd_gt', 'Hợp đồng', 2, 'Hợp đồng thiếu giá trị, nhà thầu hoặc ngày ký', 'hopdong', hds.filter(h => !(U.num(h.giaTri) > 0) || !h.nhaThau || !h.ngayKy).map(h => ({ r: h, ghi: [!(U.num(h.giaTri) > 0) ? 'giá trị' : '', !h.nhaThau ? 'nhà thầu' : '', !h.ngayKy ? 'ngày ký' : ''].filter(Boolean).join(', ') })), '');
    add('hd_cb', 'Hợp đồng', 1, 'Hợp đồng đang thực hiện chưa giao cán bộ theo dõi', 'hopdong', dang.filter(h => !h.canBoId).map(h => ({ r: h })), '');
    add('hd_tl', 'Hợp đồng', 2, 'Hợp đồng đã thanh lý nhưng thiếu ngày thanh lý hoặc còn tạm ứng chưa thu hồi', 'hopdong', hds.filter(h => h.trangThai === 'thanhly' && (!h.thanhLyNgay || U.num(h.tamUng) - U.num(h.tamUngThuHoi) > 0.5)).map(h => ({ r: h })), '');
    // ---- Gói thầu ----
    const gts = S.all('goithau').filter(g => g.trangThai !== 'huy');
    add('gt_ns', 'Gói thầu', 2, 'Gói thầu chưa gắn nguồn kinh phí', 'goithau', gts.filter(g => !g.nsId).map(g => ({ r: g })), 'Mở gói thầu → "Liên kết nguồn kinh phí".');
    add('gt_tt', 'Gói thầu', 2, 'Gói thầu thiếu giá gói thầu hoặc hình thức lựa chọn nhà thầu', 'goithau', gts.filter(g => !(U.num(g.giaGoiThau) > 0) || !g.hinhThuc).map(g => ({ r: g, ghi: [!(U.num(g.giaGoiThau) > 0) ? 'giá gói thầu' : '', !g.hinhThuc ? 'hình thức' : ''].filter(Boolean).join(', ') })), '');
    add('gt_kq', 'Gói thầu', 2, 'Gói thầu đã có kết quả nhưng thiếu nhà thầu hoặc giá trúng thầu', 'goithau', gts.filter(g => ['cokq', 'dakyhd'].includes(g.trangThai) && (!g.nhaThau || !(U.num(g.giaTrung) > 0))).map(g => ({ r: g })), '');
    add('gt_cb', 'Gói thầu', 1, 'Gói thầu chưa giao cán bộ theo dõi', 'goithau', gts.filter(g => !['dakyhd'].includes(g.trangThai) && !g.canBoId).map(g => ({ r: g })), '');
    // ---- Nhiệm vụ, dự án ----
    const nvs = S.all('nhiemvu').filter(t => L.open(t));
    add('nv_ct', 'Nhiệm vụ, dự án', 2, 'Nhiệm vụ đang mở chưa có cán bộ chủ trì', 'nhiemvu', nvs.filter(t => !t.chuTriId).map(t => ({ r: t })), '');
    add('nv_han', 'Nhiệm vụ, dự án', 1, 'Nhiệm vụ đang mở chưa có thời hạn (kiểm tra xem có phải việc thường xuyên)', 'nhiemvu', nvs.filter(t => !t.han && t.loaiTG !== 'thuongxuyen').map(t => ({ r: t })), '');
    add('da_cb', 'Nhiệm vụ, dự án', 1, 'Chương trình, dự án chưa giao cán bộ theo dõi', 'duan', S.all('duan').filter(d => !d.canBoId).map(d => ({ r: d })), '');
    // ---- Danh mục ----
    add('cb_em', 'Danh mục', 1, 'Cán bộ đang làm việc chưa có thư điện tử (không nhận được email nhắc việc)', 'canbo', S.all('canbo').filter(c => c.trangThai !== 'nghi' && !/@/.test(c.email || '')).map(c => ({ r: c })), '');
    return out;
  };

  A.views.suckhoe = {
    title: 'Sức khỏe dữ liệu', sub: 'Bản ghi thiếu thông tin quan trọng, chưa liên kết, lâu chưa cập nhật — để số liệu báo cáo, cảnh báo, nhắc việc chính xác',
    render(root) {
      const y = A.year() || +U.today().slice(0, 4), T = A.vs.sk || (A.vs.sk = { ngay: 30, mo: {} });
      const ds = L.sucKhoe(y, T.ngay), coVanDe = ds.filter(x => x.rows.length);
      const tongBG = ['ngansach', 'hopdong', 'goithau', 'nhiemvu', 'duan', 'canbo'].reduce((s, c) => s + S.count(c), 0);
      const loi = new Set(); coVanDe.forEach(x => x.rows.forEach(o => loi.add(x.c + ':' + o.r.id)));
      const diem = tongBG ? Math.max(0, Math.round((1 - loi.size / Math.max(tongBG, loi.size)) * 100)) : 100;
      const nhoms = Array.from(new Set(ds.map(x => x.nhom)));
      let h = '<div class="toolbar"><label class="small">Dự toán năm <b>' + y + '</b> · coi là lâu chưa cập nhật sau <input class="inp" type="number" min="7" max="365" data-ngay value="' + T.ngay + '" style="width:76px;height:32px;display:inline-block"> ngày</label><span class="sp"></span><button class="btn" data-xls>' + ic('download', 16) + 'Xuất danh sách Excel</button></div>' +
        '<div class="kpis mb"><div class="kpi ' + (diem >= 90 ? 'ok' : diem >= 70 ? 'warn' : 'bad') + ' static"><span class="k-l">Điểm sức khỏe dữ liệu</span><span class="k-v">' + diem + '/100</span><span class="k-s">' + loi.size + ' / ' + tongBG + ' bản ghi cần bổ sung</span></div>' +
        [3, 2, 1].map(sv => { const xs = coVanDe.filter(x => x.sev === sv); return '<div class="kpi ' + (sv === 3 ? 'bad' : sv === 2 ? 'warn' : 'info') + ' static"><span class="k-l">' + (sv === 3 ? 'Ảnh hưởng số liệu' : sv === 2 ? 'Cần bổ sung' : 'Nên bổ sung') + '</span><span class="k-v">' + U.sum(xs, x => x.rows.length) + '</span><span class="k-s">' + xs.length + ' loại vấn đề</span></div>'; }).join('') + '</div>';
      h += nhoms.map(nh => {
        const xs = ds.filter(x => x.nhom === nh);
        return '<div class="card mb"><div class="card-h"><h3>' + e(nh) + '</h3><span class="chip plain ' + (xs.some(x => x.rows.length) ? 'saphan' : 'hoanthanh') + '">' + U.sum(xs, x => x.rows.length) + ' bản ghi</span></div><div class="card-b">' + xs.map(x => {
          const mo = !!T.mo[x.k];
          return '<div class="sk-i s' + (x.rows.length ? x.sev : 0) + '"><button class="sk-h" data-mo="' + x.k + '" aria-expanded="' + mo + '"' + (x.rows.length ? '' : ' disabled') + '><span class="sk-dot"></span><span class="grow">' + e(x.ten) + '</span><b>' + (x.rows.length || '✓') + '</b></button>' +
            (mo && x.rows.length ? '<div class="sk-b">' + (x.goiY ? '<div class="small soft mb">' + e(x.goiY) + '</div>' : '') + x.rows.slice(0, 100).map(o => '<button class="sk-r" data-skopen="' + x.c + ':' + o.r.id + '"><span class="grow">' + e(U.trunc(Sc.C[x.c].title(o.r) || '(chưa có tên)', 120)) + '</span>' + (o.ghi ? '<span class="small muted">' + e(o.ghi) + '</span>' : '') + ic('edit', 14) + '</button>').join('') + (x.rows.length > 100 ? '<div class="small muted">… và ' + (x.rows.length - 100) + ' bản ghi khác (xem đủ trong tệp Excel).</div>' : '') + '</div>' : '') + '</div>';
        }).join('') + '</div></div>';
      }).join('');
      root.innerHTML = h;
      $$('[data-mo]', root).forEach(b => b.onclick = () => { T.mo[b.dataset.mo] = !T.mo[b.dataset.mo]; A.render(); });
      UI.on(root, 'click', '[data-skopen]', b => { const [c, id] = b.dataset.skopen.split(':'); A.open(c, id); });
      $('[data-ngay]', root).onchange = x => { T.ngay = Math.max(7, Math.min(365, +x.target.value || 30)); A.render(); };
      $('[data-xls]', root).onclick = () => {
        const aoa = [['SỨC KHỎE DỮ LIỆU — ' + U.fmtDate(U.today())], [], ['Nhóm', 'Vấn đề', 'Bản ghi', 'Ghi chú']];
        coVanDe.forEach(x => x.rows.forEach(o => aoa.push([x.nhom, x.ten, Sc.C[x.c].title(o.r), o.ghi || ''])));
        UI.xlsx('suc-khoe-du-lieu-' + UI.stamp() + '.xlsx', [{ name: 'Suc khoe du lieu', aoa, widths: [18, 60, 70, 30] }]);
      };
    }
  };
  const st = document.createElement('style');
  st.textContent = '.sk-i{border-bottom:1px solid var(--border)}.sk-i:last-child{border-bottom:0}.sk-h{display:flex;gap:10px;align-items:center;width:100%;background:none;border:0;padding:10px 4px;font:inherit;color:var(--text);text-align:left;cursor:pointer}.sk-h:disabled{cursor:default;color:var(--muted)}.sk-h:not(:disabled):hover{background:var(--hover)}' +
    '.sk-dot{width:10px;height:10px;border-radius:50%;background:var(--ok);flex:none}.s1 .sk-dot{background:var(--info)}.s2 .sk-dot{background:var(--warn)}.s3 .sk-dot{background:var(--bad)}.sk-b{padding:0 4px 10px 24px}' +
    '.sk-r{display:flex;gap:10px;align-items:center;width:100%;background:none;border:0;border-top:1px dashed var(--border);padding:7px 4px;font:inherit;font-size:13.5px;color:var(--text);text-align:left;cursor:pointer}.sk-r:hover{background:var(--hover)}';
  document.head.appendChild(st);
})(App);
