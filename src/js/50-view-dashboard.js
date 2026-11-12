/* ============================================================
   50-view-dashboard.js — Dashboard điều hành + Trợ lý điều hành
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  A.views = A.views || {};
  const P = UI.PAL;

  const issueHtml = a => '<button class="issue s' + a.sev + '" data-go="' + e(a.coll + ':' + a.id) + '"><span class="lv" aria-hidden="true"></span><span><span class="t">' + e(a.title) + '</span><span class="d">' + e(a.detail) + '</span></span><span class="tag">' + e(L.ALERT_LABEL[a.loai] || '') + '</span></button>';
  const bindGo = root => UI.on(root, 'click', '[data-go]', t => { const [c, id] = t.dataset.go.split(':'); if (c === 'route') A.go(id); else A.open(c, id); });
  A.issueHtml = issueHtml; A.bindGo = bindGo;

  const kpi = (cls, label, val, sub, act, hot) => '<button class="kpi ' + cls + (hot ? ' hot' : '') + (act ? '' : ' static') + '"' + (act ? ' data-kpi="' + e(act) + '"' : ' tabindex="-1"') + '><span class="k-l">' + e(label) + '</span><span class="k-v">' + val + '</span><span class="k-s">' + (sub || '&nbsp;') + '</span></button>';

  A.views.tongquan = {
    title: 'Bảng điều hành', sub: 'Toàn cảnh nhiệm vụ, chương trình dự án, nguồn lực tài chính và tài sản của Phòng',
    render(root) {
      const y = A.year(), yy = y || +U.today().slice(0, 4), today = U.today();
      const nvs = L.nvOfYear(y), st = L.nvStats(nvs), al = L.alerts(y);
      const das = L.daOfYear(y), daV = das.map(d => ({ d, v: L.da(d) })), daMo = daV.filter(x => !x.v.xong);
      const vons = L.vonOfYear(y), khVon = U.sum(vons, o => o.kh), gnVon = U.sum(vons, o => o.gn);
      const ns = L.nsTree(y, null).total, nsCount = S.all('ngansach').filter(r => !y || +r.nam === y).length;
      const ts = S.all('taisan'), hds = S.all('hopdong'), gts = S.all('goithau');
      const dmAll = S.all('danhmuc').filter(d => d.loai !== 'noibo'), dmPC = dmAll.filter(d => d.chuTriId).length;
      const noData = !S.count('nhiemvu') && !S.count('duan') && !S.count('ngansach') && !S.count('vanban');
      const ASF = A.vs.dashAl || (A.vs.dashAl = { f: 'all' });
      const groups = { all: al, ngay: al.filter(a => a.sev === 3), nv: al.filter(a => ['quahan', 'tondong', 'saphan', 'nguyco'].includes(a.loai)), da: al.filter(a => ['dacham', 'danguyco', 'gnthap', 'dauthau', 'hopdong', 'quyettoan'].includes(a.loai)), pc: al.filter(a => ['chuapc', 'dmchuapc'].includes(a.loai)), yk: al.filter(a => a.loai === 'xinykien') };
      const segs = [['all', 'Tất cả'], ['ngay', 'Cần xử lý ngay'], ['nv', 'Nhiệm vụ'], ['da', 'Dự án, vốn, hợp đồng'], ['pc', 'Chưa phân công'], ['yk', 'Xin ý kiến lãnh đạo']];

      let h = '';
      if (noData) h += '<div class="card mb"><div class="card-b" style="padding:22px 24px"><div class="eyebrow">Bắt đầu sử dụng</div><h2 style="font-size:20px">Phần mềm đã nạp sẵn ' + dmAll.length + ' đầu mục chức năng, nhiệm vụ theo ' + e(A.Seed.QD) + '</h2><p class="soft" style="max-width:860px">Danh sách ' + S.count('canbo') + ' cán bộ và ' + S.count('donvi') + ' đơn vị dự toán lấy từ Thông báo 279/TB-KHTC. Chưa có nhiệm vụ cụ thể, dự án hay số liệu tài chính nào — phần mềm không tự tạo số liệu. Ba việc nên làm trước:</p><div class="gap"><button class="btn primary" data-kpi="route:canbo">' + ic('users', 16) + 'Phân công cán bộ chủ trì</button><button class="btn" data-kpi="route:ngansach">' + ic('upload', 16) + 'Nhập biểu giải ngân từ Excel</button><button class="btn" data-kpi="route:nhiemvu">' + ic('plus', 16) + 'Thêm nhiệm vụ đầu tiên</button><button class="btn" data-kpi="route:ketnoi">' + ic('link', 16) + 'Kết nối 2 phần mềm sẵn có</button><button class="btn ghost" data-kpi="route:thietlap">Đặt tên người sử dụng</button></div></div></div>';

      /* --- Những vấn đề cần quan tâm --- */
      h += '<div class="card mb" id="dash-issues"><div class="card-h"><h3>Những vấn đề cần quan tâm</h3><span class="chip plain ' + (groups.ngay.length ? 'quahan' : 'hoanthanh') + '">' + (groups.ngay.length ? groups.ngay.length + ' việc cần xử lý ngay' : 'Không có việc mức cao') + '</span><span class="grow"></span><button class="btn sm" data-kpi="route:troly">' + ic('spark', 15) + 'Mở Trợ lý điều hành</button>' +
        '<div class="sub">Tự động phát hiện từ dữ liệu đã nhập, tính đến ' + U.fmtDate(today) + '. Ngưỡng: sắp đến hạn ' + A.nguong('sapHan') + ' ngày · tồn đọng ' + A.nguong('tonDong') + ' ngày · giải ngân chậm hơn thời gian năm ' + A.nguong('gnLech') + ' điểm %.</div></div><div class="card-b">' +
        '<div class="seg mb" role="tablist">' + segs.map(s => '<button role="tab" data-seg="' + s[0] + '" class="' + (ASF.f === s[0] ? 'on' : '') + '">' + s[1] + '<span class="c">' + groups[s[0]].length + '</span></button>').join('') + '</div><div class="issues" data-issues></div></div></div>';

      /* --- KPI nhiệm vụ --- */
      h += '<div class="eyebrow">Nhiệm vụ ' + (y ? 'năm ' + y : '— tất cả các năm') + '</div><div class="kpis">' +
        kpi('acc', 'Tổng số nhiệm vụ', st.tong, st.khongHan ? st.khongHan + ' việc không có hạn' : '', 'nv:') +
        kpi('ok', 'Đã hoàn thành', st.hoanthanh, st.tong ? U.fmtPct(st.tyLeHT, 0) + (st.treHan ? ' · ' + st.treHan + ' trễ hạn' : '') : '', 'nv:hoanthanh') +
        kpi('info', 'Đang thực hiện', st.dang, '', 'nv:dang') +
        kpi('bad', 'Quá hạn', st.quahan, st.quahan ? 'Cần xử lý ngay' : 'Không có', 'nv:quahan', st.quahan > 0) +
        kpi('warn', 'Sắp đến hạn', st.saphan, 'Trong ' + A.nguong('sapHan') + ' ngày tới', 'nv:saphan') +
        kpi('', 'Chưa triển khai', st.chua, st.chuaPC ? st.chuaPC + ' việc chưa phân công' : '', 'nv:chua') + '</div>';

      /* --- KPI nguồn lực --- */
      h += '<div class="eyebrow">Chương trình, dự án và nguồn lực</div><div class="kpis">' +
        kpi('teal', 'Chương trình, dự án theo dõi', das.length, daMo.length + ' đang triển khai · ' + daV.filter(x => x.v.cham).length + ' chậm' + (das.some(d => d.ext) ? ' · ' + das.filter(d => d.ext).length + ' từ PM Dự án đầu tư' : ''), 'route:duan') +
        kpi('teal', 'Tổng mức đầu tư, dự toán', das.length ? '<small>' + U.fmtShort(U.sum(das, d => d.tmdt)) + '</small>' : '—', das.length ? 'Cộng ' + das.filter(d => U.num(d.tmdt) > 0).length + '/' + das.length + ' dự án có số liệu' : 'Chưa có dự án', 'route:duan') +
        kpi('violet', 'Kế hoạch vốn ' + (y || ''), vons.length ? '<small>' + U.fmtShort(khVon) + '</small>' : '—', vons.length ? 'Sau điều chỉnh · ' + vons.length + ' dòng vốn' : 'Chưa nhập kế hoạch vốn', 'route:von') +
        kpi(vons.some(o => o.thap) ? 'bad' : 'ok', 'Giải ngân vốn', vons.length ? U.fmtPct(U.pct(gnVon, khVon)) : '—', vons.length ? U.fmtShort(gnVon) + ' · ' + vons.filter(o => o.thap).length + ' dòng giải ngân thấp' : '', 'route:von') +
        kpi('acc', 'Dự toán ngân sách ' + (y || ''), nsCount ? '<small>' + U.fmtShort(ns.tong) + '</small>' : '—', nsCount ? 'Đã giải ngân ' + U.fmtPct(ns.tyLe) + ' · còn ' + U.fmtShort(ns.conLai) : 'Chưa nhập dự toán', 'route:ngansach') +
        kpi('', 'Tài sản công', ts.length || '—', ts.length ? 'Nguyên giá ' + U.fmtShort(U.sum(ts, t => t.nguyenGia)) + ' · ' + L.tsCanXuLy().length + ' chờ xử lý' : 'Chưa nhập tài sản', 'route:taisan') +
        kpi('', 'Gói thầu · Hợp đồng', (gts.length || hds.length) ? gts.length + ' · ' + hds.length : '—', hds.length ? hds.filter(x => (x.trangThai || 'dang') === 'dang').length + ' hợp đồng đang thực hiện' : '', 'route:dauthau') +
        kpi(dmPC < dmAll.length ? 'warn' : 'ok', 'Chức năng đã phân công', dmPC + '<small>/' + dmAll.length + '</small>', 'Đầu mục theo QĐ 324 có cán bộ chủ trì', 'route:canbo') + '</div>';

      /* --- Biểu đồ nhiệm vụ --- */
      const mon = L.byMonth(S.all('nhiemvu'), yy), cats = Array.from({ length: 12 }, (_, i) => 'T' + (i + 1));
      const nhomRows = A.NHOM.map(n => { const l = nvs.filter(t => String(t.nhom) === n[0]); if (!l.length) return null; const s = L.nvStats(l); return { name: n[2], act: 'nvnhom:' + n[0], parts: [{ val: s.hoanthanh, color: P.ok, name: 'Hoàn thành' }, { val: s.dang + s.chua - s.quahan, color: P.info, name: 'Đang mở trong hạn' }, { val: s.quahan, color: P.bad, name: 'Quá hạn' }, { val: s.tamdung, color: P.violet, name: 'Tạm dừng' }], right: s.tong }; }).filter(Boolean);
      const cb = L.canBoStats(nvs), chuaPC = nvs.filter(t => !t.chuTriId && L.open(t)).length;
      const cbRows = cb.filter(r => r.s.tong).sort((a, b) => b.dangMo - a.dangMo).map(r => ({ name: r.c.tenGoi || r.c.hoTen, act: 'nvcb:' + r.c.id, parts: [{ val: r.s.hoanthanh, color: P.ok, name: 'Hoàn thành' }, { val: r.s.dang + r.s.chua - r.s.quahan, color: P.info, name: 'Đang mở trong hạn' }, { val: r.s.quahan, color: P.bad, name: 'Quá hạn' }], right: r.s.tong }));
      if (chuaPC) cbRows.push({ name: 'Chưa phân công', act: 'nvcb:__none', parts: [{ val: chuaPC, color: P.warn, name: 'Chưa phân công' }], right: chuaPC });
      const leg4 = '<div class="legend"><span><i style="background:var(--ok)"></i>Hoàn thành</span><span><i style="background:var(--info)"></i>Đang mở, trong hạn</span><span><i style="background:var(--bad)"></i>Quá hạn</span></div>';
      h += '<div class="eyebrow">Phân tích nhiệm vụ</div><div class="grid-21"><div class="card"><div class="card-h"><h3>Tình hình thực hiện nhiệm vụ theo tháng — năm ' + yy + '</h3><div class="sub">Số nhiệm vụ được giao, đến hạn và hoàn thành trong từng tháng</div></div><div class="card-b">' +
        (S.count('nhiemvu') ? UI.bars({ cats, labels: true, series: [{ name: 'Được giao', color: P.idle, vals: mon.map(m => m.giao) }, { name: 'Đến hạn', color: P.warn, vals: mon.map(m => m.denHan) }, { name: 'Hoàn thành', color: P.ok, vals: mon.map(m => m.hoanThanh) }], label: 'Nhiệm vụ theo tháng' }) : '<div class="note">Chưa có nhiệm vụ để vẽ biểu đồ.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Tỷ lệ hoàn thành</h3></div><div class="card-b">' + UI.donut([{ name: 'Hoàn thành đúng hạn', val: st.hoanthanh - st.treHan, color: P.ok }, { name: 'Hoàn thành trễ hạn', val: st.treHan, color: P.teal }, { name: 'Đang thực hiện', val: Math.max(0, st.dang - nvs.filter(t => t.trangThai === 'dang' && L.nv(t).st === 'quahan').length), color: P.info }, { name: 'Chưa triển khai', val: Math.max(0, st.chua - nvs.filter(t => (t.trangThai || 'chua') === 'chua' && L.nv(t).st === 'quahan').length), color: P.idle }, { name: 'Quá hạn', val: st.quahan, color: P.bad }, { name: 'Tạm dừng', val: st.tamdung, color: P.violet }], st.tong ? U.fmtPct(st.tyLeHT, 0) : '—', 'hoàn thành') + '</div></div></div>' +
        '<div class="grid2 mt"><div class="card"><div class="card-h"><h3>Nhiệm vụ theo lĩnh vực</h3><div class="sub">Theo 10 nhóm chức năng của QĐ 324</div></div><div class="card-b" data-hb>' + (nhomRows.length ? UI.hbars(nhomRows) + leg4 : '<div class="note">Chưa có nhiệm vụ nào được gắn nhóm chức năng.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Phân công theo cán bộ</h3><div class="sub">Nhiệm vụ chủ trì; bấm vào tên để xem chi tiết</div></div><div class="card-b" data-hb>' + (cbRows.length ? UI.hbars(cbRows) + leg4 : '<div class="note">Chưa có nhiệm vụ nào được giao cho cán bộ.</div>') + '</div></div></div>';

      /* --- Dự án & vốn --- */
      const daList = daMo.slice().sort((a, b) => (b.v.cham - a.v.cham) || (b.v.treMax - a.v.treMax) || U.cmp(a.d.ketThuc, b.d.ketThuc)).slice(0, 8);
      const nguon = L.vonGroup(vons, o => o.v.nguonVon).slice(0, 7);
      const years = Array.from(new Set(S.all('von').map(v => +v.nam))).filter(Boolean).sort();
      const byYear = years.map(yr => { const l = S.all('von').filter(v => +v.nam === yr).map(L.von); return { yr, kh: U.sum(l, o => o.kh), gn: U.sum(l, o => o.gn) }; });
      const vm = L.vonByMonth(vons.filter(o => +o.v.nam === yy), yy), khYY = U.sum(vons.filter(o => +o.v.nam === yy), o => o.kh);
      const ty = v => U.fmtNum(v / 1e9, v >= 1e10 ? 0 : 1);
      h += '<div class="eyebrow">Chương trình, dự án và giải ngân</div><div class="grid2"><div class="card"><div class="card-h"><h3>Tiến độ chương trình, dự án</h3><span class="grow"></span><button class="btn sm ghost" data-kpi="route:duan">Xem tất cả</button><div class="sub">Dự án đang triển khai; chậm tiến độ xếp trước</div></div><div class="card-b">' +
        (daList.length ? '<table class="tbl" style="font-size:13px"><tbody>' + daList.map(x => '<tr class="click" data-go="duan:' + x.d.id + '"><td class="wrap" style="min-width:0;padding-left:0"><div class="t1">' + e(U.trunc(x.d.ten, 86)) + '</div><div class="t2">' + (x.v.next ? 'Mốc tới: ' + e(U.trunc(x.v.next.ten, 40)) + ' — ' + U.fmtDate(x.v.next.ketThuc) : 'Chưa đặt mốc công việc') + '</div></td><td style="width:120px">' + UI.pbar(x.d.tienDo, x.v.cham ? 'bad' : '') + '</td><td style="padding-right:0">' + UI.chip(x.v.st, x.v.label) + '</td></tr>').join('') + '</tbody></table>' : '<div class="note">Chưa có chương trình, dự án đang triển khai.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Giải ngân lũy kế theo tháng — năm ' + yy + '</h3><div class="sub">Tỷ đồng; đường ngang là kế hoạch vốn sau điều chỉnh</div></div><div class="card-b">' +
        (vons.some(o => +o.v.nam === yy) ? UI.bars({ cats, fmt: ty, labels: true, series: [{ name: 'Giải ngân lũy kế', color: P.acc, vals: vm }], line: { name: 'Kế hoạch vốn', color: 'var(--violet)', vals: cats.map(() => khYY) }, label: 'Giải ngân theo tháng' }) : '<div class="note">Chưa có kế hoạch vốn năm ' + yy + '. Nhập tại phân hệ Kế hoạch vốn và giải ngân.</div>') + '</div></div></div>' +
        '<div class="grid2 mt"><div class="card"><div class="card-h"><h3>Kế hoạch và thực hiện theo nguồn vốn</h3><div class="sub">Tỷ đồng' + (y ? ' — năm ' + y : '') + '</div></div><div class="card-b">' +
        (nguon.length ? UI.bars({ cats: nguon.map(g => U.trunc(g.k.replace('Vốn đầu tư công - ', 'ĐTC ').replace('ngân sách ', 'NS '), 16)), fmt: ty, labels: true, series: [{ name: 'Kế hoạch vốn', color: 'var(--violet)', vals: nguon.map(g => g.kh) }, { name: 'Đã giải ngân', color: P.acc, vals: nguon.map(g => g.gn) }], label: 'Kế hoạch và giải ngân theo nguồn vốn' }) : '<div class="note">Chưa có dữ liệu kế hoạch vốn.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Tình hình giải ngân theo năm</h3><div class="sub">Tỷ đồng — tất cả các năm đã nhập</div></div><div class="card-b">' +
        (byYear.length ? UI.bars({ cats: byYear.map(b => String(b.yr)), fmt: ty, labels: true, series: [{ name: 'Kế hoạch vốn', color: 'var(--violet)', vals: byYear.map(b => b.kh) }, { name: 'Đã giải ngân', color: P.acc, vals: byYear.map(b => b.gn) }], label: 'Giải ngân theo năm' }) : '<div class="note">Chưa có dữ liệu kế hoạch vốn.</div>') + '</div></div></div>';

      /* --- Tài chính, tài sản --- */
      const dvs = L.nsByDonVi(y);
      h += '<div class="eyebrow">Tài chính, tài sản</div><div class="grid2"><div class="card"><div class="card-h"><h3>Thực hiện dự toán theo đơn vị</h3><span class="grow"></span><button class="btn sm ghost" data-kpi="route:ngansach">Chi tiết</button></div><div class="card-b">' +
        (dvs.length ? '<table class="tbl"><thead><tr><th>Đơn vị</th><th class="num">Được sử dụng</th><th class="num">Đã giải ngân</th><th style="width:130px">Tỷ lệ</th></tr></thead><tbody>' + dvs.map(x => '<tr><td>' + e(x.dv.tenTat || x.dv.ten) + '</td><td class="num">' + U.fmtShort(x.total.tong) + '</td><td class="num">' + U.fmtShort(x.total.giaiNgan) + '</td><td>' + UI.pbar(x.total.tyLe || 0) + '</td></tr>').join('') + '</tbody></table>' : '<div class="note">Chưa nhập dự toán ngân sách' + (y ? ' năm ' + y : '') + '. Có thể nhập trực tiếp biểu "Báo cáo tình hình thực hiện giải ngân thanh toán NSNN" từ Excel.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Tài sản công theo đơn vị</h3><span class="grow"></span><button class="btn sm ghost" data-kpi="route:taisan">Chi tiết</button></div><div class="card-b">' +
        (ts.length ? '<table class="tbl"><thead><tr><th>Đơn vị sử dụng</th><th class="num">Số lượng</th><th class="num">Nguyên giá</th><th class="num">Còn lại</th></tr></thead><tbody>' + L.tsGroup(ts, t => Sc.refName('donvi', t.donViId)).map(g => '<tr><td>' + e(g.k) + '</td><td class="num">' + U.fmtNum(g.n, 0) + '</td><td class="num">' + U.fmtShort(g.nguyenGia) + '</td><td class="num">' + U.fmtShort(g.conLai) + '</td></tr>').join('') + '</tbody></table>' : '<div class="note">Chưa nhập tài sản công.</div>') + '</div></div></div>';

      /* --- Tổng hợp công việc theo ngày, tuần, tháng --- */
      const DG = A.vs.dashDg || (A.vs.dashDg = { k: 'tuan' });
      h += '<div class="eyebrow">Tổng hợp công việc</div><div class="card"><div class="card-h"><h3>Công việc theo ngày, tuần, tháng</h3><span class="grow"></span><div class="seg">' + [['ngay', 'Hôm nay'], ['tuan', 'Tuần này'], ['thang', 'Tháng này']].map(s => '<button data-dg="' + s[0] + '" class="' + (DG.k === s[0] ? 'on' : '') + '">' + s[1] + '</button>').join('') + '</div></div><div class="card-b" data-digest></div></div>';

      root.innerHTML = h;
      const drawIssues = () => {
        const list = groups[ASF.f] || [], box = $('[data-issues]', root);
        box.innerHTML = list.length ? list.slice(0, 8).map(issueHtml).join('') + (list.length > 8 ? '<div style="padding-top:10px"><button class="btn sm" data-kpi="route:troly">Xem đủ ' + list.length + ' mục trong Trợ lý điều hành</button></div>' : '')
          : '<div class="note ok">Không có vấn đề nào thuộc nhóm này theo dữ liệu hiện có.</div>';
      };
      const drawDigest = () => {
        const w = DG.k === 'ngay' ? [today, today] : DG.k === 'tuan' ? U.weekRange(today) : [today.slice(0, 8) + '01', today.slice(0, 8) + U.pad(U.lastDayOfMonth(+today.slice(0, 4), +today.slice(5, 7)))];
        const d = L.digest(w[0], w[1]);
        const col = (t, list, cls, f) => '<div><div class="gap mb"><b>' + t + '</b><span class="chip plain ' + cls + '">' + list.length + '</span></div>' + (list.length ? list.slice(0, 6).map(x => '<button class="issue" style="grid-template-columns:minmax(0,1fr) auto" data-go="nhiemvu:' + x.id + '"><span><span class="t" style="font-weight:500">' + e(x.ten) + '</span></span><span class="small muted nowrap">' + e(f(x)) + '</span></button>').join('') + (list.length > 6 ? '<div class="small muted" style="padding-top:6px">… và ' + (list.length - 6) + ' việc khác</div>' : '') : '<div class="small muted">Không có.</div>') + '</div>';
        $('[data-digest]', root).innerHTML = '<div class="small muted mb">Từ ' + U.fmtDate(w[0]) + ' đến ' + U.fmtDate(w[1]) + '</div><div class="grid3">' + col('Đến hạn trong kỳ', d.denHan, 'saphan', x => U.fmtDate(x.han) + ' · ' + (Sc.refName('canbo', x.chuTriId) || 'chưa phân công')) + col('Đã hoàn thành trong kỳ', d.hoanThanh, 'hoanthanh', x => U.fmtDate(x.ngayHT)) + col('Được giao trong kỳ', d.giao, 'dang', x => U.fmtDate(x.ngayGiao)) + '</div>';
      };
      drawIssues(); drawDigest();
      $$('[data-seg]', root).forEach(b => b.onclick = () => { ASF.f = b.dataset.seg; $$('[data-seg]', root).forEach(x => x.classList.toggle('on', x === b)); drawIssues(); });
      $$('[data-dg]', root).forEach(b => b.onclick = () => { DG.k = b.dataset.dg; $$('[data-dg]', root).forEach(x => x.classList.toggle('on', x === b)); drawDigest(); });
      bindGo(root);
      UI.on(root, 'click', '[data-kpi]', t => { const [k, v] = t.dataset.kpi.split(':'); if (k === 'route') A.go(v); else if (k === 'nv') A.go('nhiemvu', { preset: v ? { tt: v } : {} }); });
      UI.on(root, 'click', '[data-act]', t => { const [k, v] = t.dataset.act.split(':'); if (k === 'nvnhom') A.go('nhiemvu', { preset: { nhom: v } }); if (k === 'nvcb') A.go('nhiemvu', { preset: { cb: v } }); });
    }
  };

  /* ================= TRỢ LÝ ĐIỀU HÀNH ================= */
  A.views.troly = {
    title: 'Trợ lý điều hành', sub: 'Nhận định tự động từ dữ liệu đã nhập — có căn cứ, không suy diễn',
    render(root) {
      const y = A.year(), a = L.assistant(y), today = U.today();
      const nvRow = x => '<button class="issue ' + (x.v.st === 'quahan' ? 's3' : x.v.st === 'saphan' ? 's2' : 's1') + '" data-go="nhiemvu:' + x.t.id + '"><span class="lv"></span><span><span class="t">' + e(x.t.ten) + '</span><span class="d">' + e(x.why.join(' · ')) + ' — chủ trì: ' + e(Sc.refName('canbo', x.t.chuTriId) || 'chưa phân công') + '</span></span><span class="tag">' + Math.round(x.score) + ' điểm</span></button>';
      const sec = (q, n, body, basis, open) => '<details class="qa"' + (open ? ' open' : '') + '><summary>' + ic('chevR', 16) + '<span>' + e(q) + '</span><span class="cnt ' + (n ? 'has' : '') + '">' + (n ? n + ' mục' : 'Không có') + '</span></summary><div class="qa-b">' + body + '<div class="basis"><b>Căn cứ nhận định:</b> ' + e(basis) + '</div></div></details>';
      const none = t => '<div class="note ok">' + e(t) + '</div>';
      const lv = a.linhVuc.items;
      const lvHtml = lv.length ? '<table class="tbl"><thead><tr><th>Nhóm chức năng</th><th class="num">Chưa hoàn thành</th><th class="num">Trong đó quá hạn</th><th></th></tr></thead><tbody>' + lv.map(g => '<tr class="click" data-act="nvnhom:' + e(g.k) + '"><td>' + e(g.k === '?' ? '(chưa gắn nhóm chức năng)' : g.k + '. ' + A.nhomTen(g.k)) + '</td><td class="num">' + g.mo + '</td><td class="num">' + (g.quahan ? '<b style="color:var(--bad-fg)">' + g.quahan + '</b>' : '0') + '</td><td>' + (g === lv[0] && (g.quahan || g.mo > 2) ? UI.chip('quahan', 'Tồn đọng nhiều nhất') : '') + '</td></tr>').join('') + '</tbody></table>' : none('Không có nhiệm vụ nào đang mở.');
      const cd = a.chuDong;
      const cdHtml = (cd.items.length ? '<p class="small soft">Đầu mục chức năng có tính định kỳ nhưng chưa có nhiệm vụ nào trong năm — nên chủ động lập kế hoạch thực hiện:</p>' + cd.items.map(d => '<button class="issue s1" data-go="danhmuc:' + d.id + '"><span class="lv"></span><span><span class="t">' + e(d.ma + ' — ' + d.ten) + '</span><span class="d">Kỳ: ' + e(Sc.text(Sc.field('danhmuc', 'ky'), d.ky) || 'chưa xác định') + ' · chủ trì: ' + e(Sc.refName('canbo', d.chuTriId) || 'chưa phân công') + '</span></span><span class="tag">Chức năng</span></button>').join('') : '') +
        cd.quyetToan.map(A.issueHtml).join('') +
        (cd.ts.length ? '<button class="issue s1" data-go="route:taisan"><span class="lv"></span><span><span class="t">' + cd.ts.length + ' tài sản đang ở tình trạng chờ xử lý</span><span class="d">' + e(cd.ts.slice(0, 4).map(t => t.ten + ' (' + t.tinhTrang + ')').join('; ')) + '</span></span><span class="tag">Tài sản</span></button>' : '');
      const nCd = cd.items.length + cd.quyetToan.length + (cd.ts.length ? 1 : 0);

      root.innerHTML = '<div class="asst mb"><div class="brand-mark" style="width:52px;height:52px;background:rgba(255,255,255,.14)">' + ic('spark', 26) + '</div><div class="grow"><h2>TRỢ LÝ ĐIỀU HÀNH PHÒNG KẾ HOẠCH - TÀI CHÍNH</h2><p>Tổng hợp tại thời điểm ' + U.fmtDate(today) + (y ? ', dữ liệu năm ' + y : ', dữ liệu tất cả các năm') + ': <b>' + a.counts.al + '</b> vấn đề được phát hiện, trong đó <b>' + a.counts.cao + '</b> ở mức cần xử lý ngay. Mọi nhận định đều kèm căn cứ tính toán; phần mềm chỉ đọc dữ liệu đã nhập, không thay cho đánh giá của lãnh đạo Phòng.</p></div><button class="tbtn" data-copy>' + ic('copy', 16) + 'Sao chép bản tóm tắt</button></div><div class="stack">' +
        sec('Công việc nào cần xử lý ngay?', a.xuLyNgay.items.length, a.xuLyNgay.items.length ? a.xuLyNgay.items.map(nvRow).join('') : none('Không có nhiệm vụ quá hạn, sắp đến hạn hay ưu tiên cao.'), a.xuLyNgay.basis, true) +
        sec('Dự án nào đang có nguy cơ chậm tiến độ?', a.duAnNguyCo.items.length, a.duAnNguyCo.items.length ? a.duAnNguyCo.items.map(A.issueHtml).join('') : none('Không phát hiện dự án chậm, có nguy cơ chậm hoặc giải ngân thấp theo dữ liệu hiện có.'), a.duAnNguyCo.basis, a.duAnNguyCo.items.length > 0) +
        sec('Nhiệm vụ nào chưa được phân công?', a.chuaPhanCong.items.length, a.chuaPhanCong.items.length ? a.chuaPhanCong.items.map(A.issueHtml).join('') : none('Mọi nhiệm vụ đang mở và mọi đầu mục chức năng đều đã có cán bộ chủ trì.'), a.chuaPhanCong.basis) +
        sec('Lĩnh vực nào đang tồn đọng nhiều công việc?', lv.filter(g => g.quahan).length, lvHtml, a.linhVuc.basis) +
        sec('Những nội dung nào cần báo cáo lãnh đạo?', a.baoCaoLanhDao.items.length, a.baoCaoLanhDao.items.length ? a.baoCaoLanhDao.items.map(A.issueHtml).join('') : none('Chưa có nội dung nào được đánh dấu cần xin ý kiến; không có tồn đọng kéo dài.'), a.baoCaoLanhDao.basis) +
        sec('Những vấn đề nào cần chủ động tham mưu?', nCd, nCd ? cdHtml : none('Chưa phát hiện nội dung cần chủ động tham mưu theo các tiêu chí đang áp dụng.'), cd.basis) + '</div>';
      A.bindGo(root);
      UI.on(root, 'click', '[data-act]', t => { const [k, v] = t.dataset.act.split(':'); if (k === 'nvnhom') A.go('nhiemvu', { preset: { nhom: v === '?' ? '' : v, tt: 'mo' } }); });
      $('[data-copy]', root).onclick = async () => {
        const lines = ['TÓM TẮT ĐIỀU HÀNH — ' + A.cfg('tenDonVi') + ' — ' + U.fmtDate(today), ''];
        lines.push('1. Việc cần xử lý ngay (' + a.xuLyNgay.items.length + '):'); a.xuLyNgay.items.forEach(x => lines.push('  - ' + x.t.ten + ' [' + x.why.join(', ') + '; chủ trì: ' + (Sc.refName('canbo', x.t.chuTriId) || 'chưa phân công') + ']'));
        lines.push('2. Dự án có nguy cơ, giải ngân thấp (' + a.duAnNguyCo.items.length + '):'); a.duAnNguyCo.items.forEach(x => lines.push('  - ' + x.title + ': ' + x.detail));
        lines.push('3. Chưa phân công (' + a.chuaPhanCong.items.length + '):'); a.chuaPhanCong.items.forEach(x => lines.push('  - ' + x.title));
        lines.push('4. Lĩnh vực tồn đọng:'); lv.slice(0, 5).forEach(g => lines.push('  - ' + (g.k === '?' ? 'Chưa gắn nhóm' : A.nhomTen(g.k)) + ': ' + g.mo + ' việc mở, ' + g.quahan + ' quá hạn'));
        lines.push('5. Cần báo cáo lãnh đạo (' + a.baoCaoLanhDao.items.length + '):'); a.baoCaoLanhDao.items.forEach(x => lines.push('  - ' + x.title + ': ' + x.detail));
        lines.push('6. Cần chủ động tham mưu (' + nCd + '):'); cd.items.forEach(d => lines.push('  - ' + d.ma + ' ' + d.ten));
        try { await navigator.clipboard.writeText(lines.join('\n')); UI.toast('Đã sao chép bản tóm tắt.', 'ok'); }
        catch (x) { UI.modal({ title: 'Bản tóm tắt điều hành', body: '<textarea class="inp" rows="18" readonly>' + e(lines.join('\n')) + '</textarea>', buttons: [{ label: 'Đóng', on: m => m.close() }] }); }
      };
    }
  };
})(App);
