/* ============================================================
   50-view-dashboard.js — Dashboard điều hành + Trợ lý điều hành
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  A.views = A.views || {};
  const P = UI.PAL;

  const issueHtml = a => '<button class="issue s' + a.sev + '" data-go="' + e(a.coll + ':' + a.id) + '"><span class="lv" aria-hidden="true"></span><span><span class="t">' + e(a.title) + '</span><span class="d">' + e(a.detail) + '</span></span><span class="tag">' + e(L.ALERT_LABEL[a.loai] || '') + '</span></button>';
  const bindGo = root => UI.on(root, 'click', '[data-go]', t => { const v = t.dataset.go, i = v.indexOf(':'), c = v.slice(0, i), id = v.slice(i + 1); if (c === 'route') A.go(id); else if (c === 'link') { if (id) window.open(id, '_blank', 'noopener'); } else A.open(c, id); });
  A.issueHtml = issueHtml; A.bindGo = bindGo;

  const kpi = (cls, label, val, sub, act, hot) => '<button class="kpi ' + cls + (hot ? ' hot' : '') + (act ? '' : ' static') + '"' + (act ? ' data-kpi="' + e(act) + '"' : ' tabindex="-1"') + '><span class="k-l">' + e(label) + '</span><span class="k-v">' + val + '</span><span class="k-s">' + (sub || '&nbsp;') + '</span></button>';

  const NOISE = ['dmchuapc'];   // cảnh báo không hiển thị trên bảng điều hành (đầu mục chức năng chưa phân công: Trưởng phòng tự phân công lại)
  A.dashAlerts = y => L.alerts(y).filter(a => !NOISE.includes(a.loai));

  A.views.tongquan = {
    title: 'Bảng điều hành', sub: 'Tài chính, ngân sách, giải ngân, đấu thầu – hợp đồng, tài sản của Sở và tóm tắt từ các phần mềm chuyên dụng',
    render(root) {
      const y = A.year(), yy = y || +U.today().slice(0, 4), today = U.today(), fs = U.fmtShort;
      const al = A.dashAlerts(y), cats = Array.from({ length: 12 }, (_, i) => 'T' + (i + 1)), ty = v => U.fmtNum(v / 1e9, Math.abs(v) >= 1e10 ? 0 : 1);
      const g = L.giaiNgan(yy, {}), dt = L.dtTong({}), vons = L.vonOfYear(yy), khVon = U.sum(vons, o => o.kh), gnVon = U.sum(vons, o => o.gn);
      const ts = S.all('taisan'), kk = L.kkKys && L.kkKys().length ? L.kkLatest() : null, vbd = A.VBD ? (A.VBD.state && A.VBD.state.items ? A.VBD.state.items.filter(x => x.status === 'cho_duyet').length : 0) + S.all('vbden').filter(x => x.status === 'cho_duyet').length : 0;
      const noData = !S.count('ngansach') && !S.count('goithau') && !S.count('hopdong') && !S.count('taisan') && !S.count('von');
      const ASF = A.vs.dashAl || (A.vs.dashAl = { f: 'all' });
      const groups = { all: al, ngay: al.filter(a => a.sev === 3), tc: al.filter(a => ['giaingan', 'gnthap', 'quyettoan'].includes(a.loai)), dt: al.filter(a => ['dauthau', 'hopdong'].includes(a.loai)), ts: al.filter(a => ['nhadat', 'kiemke', 'taisan'].includes(a.loai)), ngoai: al.filter(a => a.loai === 'ngoai'), khac: al.filter(a => !['giaingan', 'gnthap', 'quyettoan', 'dauthau', 'hopdong', 'nhadat', 'kiemke', 'taisan', 'ngoai'].includes(a.loai)) };
      const segs = [['all', 'Tất cả'], ['ngay', 'Cần xử lý ngay'], ['tc', 'Tài chính, giải ngân'], ['dt', 'Đấu thầu, hợp đồng'], ['ts', 'Tài sản'], ['ngoai', 'Phần mềm khác'], ['khac', 'Việc khác']].filter(s => s[0] === 'all' || groups[s[0]].length);
      if (!segs.some(s => s[0] === ASF.f)) ASF.f = 'all';

      let h = '';
      if (noData) h += '<div class="card mb"><div class="card-b" style="padding:22px 24px"><div class="eyebrow">Bắt đầu sử dụng</div><h2 style="font-size:20px">Chưa có số liệu tài chính, đấu thầu, tài sản</h2><p class="soft" style="max-width:860px">Phần mềm không tự tạo số liệu. Nên làm trước:</p><div class="gap"><button class="btn primary" data-kpi="route:ngansach">' + ic('upload', 16) + 'Nhập biểu giải ngân từ Excel</button><button class="btn" data-kpi="route:vanbanden">' + ic('inbox', 16) + 'Đọc văn bản đến</button><button class="btn" data-kpi="route:dauthau">' + ic('gavel', 16) + 'Thêm gói thầu, hợp đồng</button><button class="btn" data-kpi="route:ketnoi">' + ic('link', 16) + 'Kết nối 2 phần mềm</button></div></div></div>';

      /* --- Chỉ số chính --- */
      const mucTieu = g.mt.tuDat ? g.mtNay : g.tyLeTG;
      h += '<div class="kpis mb">' +
        kpi('acc', 'Kinh phí được sử dụng ' + yy, g.tong ? '<small>' + fs(g.tong) + '</small>' : '—', g.tong ? 'Còn ' + fs(g.conLai) + ' chưa giải ngân' : 'Chưa nhập dự toán', 'route:ngansach') +
        kpi(!g.tong ? '' : g.muc === 'cham' ? 'bad' : g.muc === 'theodoi' ? 'warn' : 'ok', 'Giải ngân dự toán', g.tong ? U.fmtPct(g.tyLe) : '—', g.tong ? 'Mục tiêu ' + U.fmtPct(mucTieu) + ' · dự báo 31/12: ' + U.fmtPct(U.pct(g.duBao, g.tong), 0) : '', 'route:ngansach', g.nguyCo) +
        kpi(vons.some(o => o.thap) ? 'warn' : 'violet', 'Giải ngân vốn đầu tư ' + yy, vons.length ? U.fmtPct(U.pct(gnVon, khVon)) : '—', vons.length ? fs(gnVon) + ' / ' + fs(khVon) : 'Chưa nhập kế hoạch vốn', 'route:von') +
        kpi(dt.quaHanLC ? 'bad' : 'info', 'Gói thầu', dt.soGT || '—', dt.soGT ? dt.soChuaTC + ' chưa tổ chức · ' + dt.soDangLC + ' đang LCNT' + (dt.quaHanLC ? ' · ' + dt.quaHanLC + ' quá hạn' : '') : '', 'route:dauthau', dt.quaHanLC > 0) +
        kpi(dt.quaHanHD ? 'bad' : 'teal', 'Hợp đồng đang thực hiện', dt.soHD ? dt.soHDDang : '—', dt.soHD ? 'Đã thanh toán ' + U.fmtPct(dt.tyLeTT, 0) + ' · còn ' + fs(dt.conPhaiTT) : '', 'route:dauthau', dt.quaHanHD > 0) +
        kpi('', 'Tài sản công', kk ? '<small>' + fs(Object.values(kk).reduce((s, x) => s + L.kkSum(x.rows).nguyenGia, 0)) + '</small>' : ts.length ? '<small>' + fs(U.sum(ts, t => t.nguyenGia)) + '</small>' : '—', kk ? 'Nguyên giá theo kiểm kê ' + U.fmtDate(L.kkKys()[0]) : ts.length ? ts.length + ' tài sản · ' + ts.filter(L.isNhaDat).length + ' cơ sở nhà, đất' : 'Chưa nhập tài sản', 'route:taisan') +
        kpi(vbd ? 'warn' : '', 'Văn bản đến chờ duyệt', vbd, vbd ? 'Đã đọc, chờ anh/chị duyệt cập nhật' : 'Không có', 'route:vanbanden', vbd > 0) + '</div>';

      /* --- Vấn đề cần quan tâm --- */
      h += '<div class="card mb" id="dash-issues"><div class="card-h"><h3>Những vấn đề cần quan tâm</h3><span class="chip plain ' + (groups.ngay.length ? 'quahan' : 'hoanthanh') + '">' + (groups.ngay.length ? groups.ngay.length + ' việc cần xử lý ngay' : 'Không có việc mức cao') + '</span><span class="grow"></span><button class="btn sm" data-kpi="route:troly">' + ic('spark', 15) + 'Trợ lý điều hành</button></div><div class="card-b">' +
        (segs.length > 2 ? '<div class="seg mb" role="tablist">' + segs.map(s => '<button role="tab" data-seg="' + s[0] + '" class="' + (ASF.f === s[0] ? 'on' : '') + '">' + s[1] + '<span class="c">' + groups[s[0]].length + '</span></button>').join('') + '</div>' : '') + '<div class="issues" data-issues></div></div></div>';

      /* --- Giải ngân --- */
      const dx = L.gnDeXuat(yy, {}).slice(0, 4);
      const duBaoVals = cats.map((_, i) => i + 1 > g.lastM && g.lastM < 12 ? g.gn + (g.duBao - g.gn) * (i + 1 - g.lastM) / (12 - g.lastM) : null);
      h += '<div class="grid-21"><div class="card"><div class="card-h"><h3>Tiến độ giải ngân dự toán năm ' + yy + '</h3><span class="grow"></span><button class="btn sm ghost" data-kpi="route:ngansach">Chi tiết</button><div class="sub">Tỷ đồng, lũy kế' + (g.tong ? ' — số liệu đến ' + U.fmtDate(g.asOf) : '') + '</div></div><div class="card-b">' +
        (g.tong ? UI.bars({ cats, fmt: ty, series: [{ name: 'Đã giải ngân', color: P.acc, vals: g.thang }, { name: 'Dự báo', color: 'var(--idle)', vals: duBaoVals }], line: { name: 'Mục tiêu', color: 'var(--violet)', vals: g.mtTien }, label: 'Giải ngân lũy kế' }) : '<div class="note">Chưa có dự toán năm ' + yy + '. Nhập biểu giải ngân tại Tài chính, ngân sách.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Đề xuất chỉ đạo về giải ngân</h3></div><div class="card-b">' + (dx.length ? dx.map(x => '<button class="issue s' + x.sev + '" data-go="route:ngansach"><span class="lv"></span><span><span class="t">' + e(x.t) + '</span><span class="d">' + e(U.trunc(x.d, 220)) + '</span></span></button>').join('') : '<div class="note ' + (g.tong ? 'ok' : '') + '">' + (g.tong ? 'Tiến độ giải ngân đang đạt mục tiêu.' : 'Chưa có số liệu.') + '</div>') + '</div></div></div>';

      /* --- Đấu thầu, hợp đồng --- */
      const viec = L.dtViec({}).slice(0, 6), lich = L.dtLich({}, 45).slice(0, 6);
      if (dt.soGT || dt.soHD) h += '<div class="grid2 mt"><div class="card"><div class="card-h"><h3>Đấu thầu, hợp đồng cần xử lý</h3><span class="grow"></span><button class="btn sm ghost" data-kpi="route:dauthau">Chi tiết</button></div><div class="card-b">' + (viec.length ? viec.map(A.issueHtml).join('') : '<div class="note ok">Không có gói thầu, hợp đồng cần xử lý.</div>') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Lịch hạn 45 ngày tới</h3><div class="sub">Hạn lựa chọn nhà thầu, hạn hợp đồng, hạn bảo lãnh</div></div><div class="card-b">' + (lich.length ? '<table class="tbl"><tbody>' + lich.map(x => '<tr class="click" data-go="' + x.coll + ':' + x.id + '"><td class="nowrap" style="padding-left:0"><b' + (x.qua ? ' style="color:var(--bad-fg)"' : '') + '>' + U.fmtDate(x.d) + '</b></td><td class="wrap"><div class="t1">' + e(x.loai) + '</div><div class="t2">' + e(U.trunc(x.ten, 80)) + '</div></td></tr>').join('') + '</tbody></table>' : '<div class="note ok">Không có mốc hạn nào.</div>') + '</div></div></div>';

      /* --- Theo đơn vị & vốn đầu tư --- */
      const dvG = L.gnNhom(yy, 'dv'), nguon = L.vonGroup(vons, o => o.v.nguonVon).slice(0, 7);
      if (dvG.length || nguon.length) h += '<div class="grid2 mt">' +
        (dvG.length ? '<div class="card"><div class="card-h"><h3>Giải ngân dự toán theo đơn vị</h3></div><div class="card-b"><table class="tbl"><thead><tr><th>Đơn vị</th><th class="num">Được sử dụng</th><th class="num">Đã giải ngân</th><th style="width:140px">Tỷ lệ</th></tr></thead><tbody>' + dvG.map(o => '<tr><td>' + e(o.ten) + (o.cham ? '<div class="t2 lech">' + o.cham + ' nội dung chậm</div>' : '') + '</td><td class="num">' + fs(o.tong) + '</td><td class="num">' + fs(o.gn) + '</td><td>' + UI.pbar(o.ty || 0, (o.ty || 0) < mucTieu - A.nguong('gnLech') ? 'bad' : '') + '</td></tr>').join('') + '</tbody></table></div></div>' : '') +
        (nguon.length ? '<div class="card"><div class="card-h"><h3>Vốn đầu tư theo nguồn — năm ' + yy + '</h3><span class="grow"></span><button class="btn sm ghost" data-kpi="route:von">Chi tiết</button><div class="sub">Tỷ đồng</div></div><div class="card-b">' + UI.bars({ cats: nguon.map(x => U.trunc(x.k.replace('Vốn đầu tư công - ', 'ĐTC ').replace('ngân sách ', 'NS '), 16)), fmt: ty, labels: true, series: [{ name: 'Kế hoạch vốn', color: 'var(--violet)', vals: nguon.map(x => x.kh) }, { name: 'Đã giải ngân', color: P.acc, vals: nguon.map(x => x.gn) }], label: 'Vốn đầu tư theo nguồn' }) + '</div></div>' : '') + '</div>';

      /* --- Tóm tắt từ 2 phần mềm chuyên dụng --- */
      if (A.KN) {
        const c = A.KN.cfg(), nvE = S.all('nhiemvu').filter(t => t.ext && t.ext.src === 'tdnv'), daE = S.all('duan').filter(d => d.ext && d.ext.src === 'dadt');
        const nvMo = nvE.filter(t => L.open(t)), nvQH = nvMo.filter(t => L.nv(t).st === 'quahan').length, nvSH = nvMo.filter(t => L.nv(t).st === 'saphan').length, daCham = daE.filter(d => L.da(d).cham).length;
        const card = (t, ic2, rows, at, url, ket) => '<div class="card ext-card"><div class="card-b"><div class="gap" style="margin-bottom:8px">' + ic(ic2, 20) + '<b style="font-size:15px">' + e(t) + '</b><span class="grow"></span><a class="btn sm primary" href="' + e(url) + '" target="_blank" rel="noopener">' + ic('link', 14) + 'Mở phần mềm</a></div>' + (ket ? '<div class="ext-nums">' + rows.map(r => '<div><span class="k-v" style="' + (r[2] ? 'color:var(--bad-fg)' : '') + '">' + r[1] + '</span><span class="k-l">' + e(r[0]) + '</span></div>').join('') + '</div><div class="small muted mt">Đồng bộ lần cuối: ' + (at ? U.fmtDateTime(at) : 'chưa') + '</div>' : '<div class="small muted">Chưa đồng bộ dữ liệu. <a href="#" data-goto="ketnoi">Kết nối</a> để xem tóm tắt tại đây.</div>') + '</div></div>';
        h += '<div class="eyebrow">Phần mềm chuyên dụng — xử lý chi tiết tại phần mềm gốc</div><div class="grid2">' +
          card('Điều hành nhiệm vụ', 'task', [['Đang theo dõi', nvMo.length], ['Quá hạn', nvQH, nvQH > 0], ['Sắp đến hạn', nvSH]], c.nvAt, c.nvApp, nvE.length > 0) +
          card('Quản lý dự án đầu tư', 'project', [['Dự án', daE.length], ['Chậm tiến độ', daCham, daCham > 0], ['Hoàn thành', daE.filter(d => L.da(d).xong).length]], c.daAt, c.daApp, daE.length > 0) + '</div>';
      }

      root.innerHTML = h;
      const drawIssues = () => {
        const list = groups[ASF.f] || [], box = $('[data-issues]', root);
        box.innerHTML = list.length ? list.slice(0, 8).map(a => a.coll === 'link' ? '<a class="issue s' + a.sev + '" href="' + e(a.id || '#') + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="lv"></span><span><span class="t">' + e(a.title) + '</span><span class="d">' + e(a.detail) + '</span></span><span class="tag">' + e(L.ALERT_LABEL[a.loai] || '') + '</span></a>' : issueHtml(a)).join('') + (list.length > 8 ? '<div style="padding-top:10px"><button class="btn sm" data-kpi="route:troly">Xem đủ ' + list.length + ' mục trong Trợ lý điều hành</button></div>' : '')
          : '<div class="note ok">Không có vấn đề nào theo dữ liệu hiện có.</div>';
      };
      drawIssues();
      $$('[data-seg]', root).forEach(b => b.onclick = () => { ASF.f = b.dataset.seg; $$('[data-seg]', root).forEach(x => x.classList.toggle('on', x === b)); drawIssues(); });
      bindGo(root);
      UI.on(root, 'click', '[data-goto]', (b, x) => { x.preventDefault(); A.go(b.dataset.goto); });
      UI.on(root, 'click', '[data-kpi]', t => { const [k, v] = t.dataset.kpi.split(':'); if (k === 'route') A.go(v); });
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
        cd.quyetToan.map(A.issueHtml).join('') + (cd.nhaDat || []).map(A.issueHtml).join('') +
        (cd.ts.length ? '<button class="issue s1" data-go="route:taisan"><span class="lv"></span><span><span class="t">' + cd.ts.length + ' tài sản đang ở tình trạng chờ xử lý</span><span class="d">' + e(cd.ts.slice(0, 4).map(t => t.ten + ' (' + t.tinhTrang + ')').join('; ')) + '</span></span><span class="tag">Tài sản</span></button>' : '');
      const nCd = cd.items.length + cd.quyetToan.length + (cd.nhaDat || []).length + (cd.ts.length ? 1 : 0);

      root.innerHTML = '<div class="asst mb"><div class="brand-mark" style="width:52px;height:52px;background:rgba(255,255,255,.14)">' + ic('spark', 26) + '</div><div class="grow"><h2>TRỢ LÝ ĐIỀU HÀNH PHÒNG KẾ HOẠCH - TÀI CHÍNH</h2><p>Tổng hợp tại thời điểm ' + U.fmtDate(today) + (y ? ', dữ liệu năm ' + y : ', dữ liệu tất cả các năm') + ': <b>' + a.counts.al + '</b> vấn đề được phát hiện, trong đó <b>' + a.counts.cao + '</b> ở mức cần xử lý ngay. Mọi nhận định đều kèm căn cứ tính toán; phần mềm chỉ đọc dữ liệu đã nhập, không thay cho đánh giá của lãnh đạo Phòng.</p></div><button class="tbtn" data-copy>' + ic('copy', 16) + 'Sao chép bản tóm tắt</button></div><div class="stack">' +
        sec('Tiến độ giải ngân dự toán có đạt mục tiêu không?', a.giaiNgan.items.length, a.giaiNgan.items.length ? a.giaiNgan.items.map(x => '<button class="issue s' + x.sev + '" data-go="route:ngansach"><span class="lv"></span><span><span class="t">' + e(x.t) + '</span><span class="d">' + e(x.d) + '</span></span><span class="tag">Giải ngân</span></button>').join('') : none('Tiến độ giải ngân đạt mục tiêu hoặc chưa có số liệu dự toán.'), a.giaiNgan.basis, a.giaiNgan.items.some(x => x.sev >= 2)) +
        sec('Gói thầu, hợp đồng nào cần xử lý?', a.dauThau.items.length, a.dauThau.items.length ? a.dauThau.items.map(A.issueHtml).join('') : none('Không có gói thầu, hợp đồng quá hạn, sắp hết hạn hay bảo lãnh sắp hết hiệu lực.'), a.dauThau.basis, a.dauThau.items.some(x => x.sev >= 2)) +
        sec('Việc của Phòng cần xử lý ngay?', a.xuLyNgay.items.length, a.xuLyNgay.items.length ? a.xuLyNgay.items.map(nvRow).join('') : none('Không có nhiệm vụ (nhập trên phần mềm này) quá hạn, sắp đến hạn hay ưu tiên cao. Nhiệm vụ đồng bộ từ phần mềm Điều hành nhiệm vụ được theo dõi tại phần mềm đó.'), a.xuLyNgay.basis, a.xuLyNgay.items.length > 0) +
        sec('Dự án nào đang có nguy cơ chậm tiến độ?', a.duAnNguyCo.items.length, a.duAnNguyCo.items.length ? a.duAnNguyCo.items.map(A.issueHtml).join('') : none('Không phát hiện dự án chậm, có nguy cơ chậm hoặc giải ngân thấp theo dữ liệu hiện có.'), a.duAnNguyCo.basis, a.duAnNguyCo.items.length > 0) +
        sec('Nhiệm vụ nào chưa được phân công?', a.chuaPhanCong.items.length, a.chuaPhanCong.items.length ? a.chuaPhanCong.items.map(A.issueHtml).join('') : none('Mọi nhiệm vụ đang mở và mọi đầu mục chức năng đều đã có cán bộ chủ trì.'), a.chuaPhanCong.basis) +
        (lv.length ? sec('Lĩnh vực nào đang tồn đọng nhiều công việc?', lv.filter(g => g.quahan).length, lvHtml, a.linhVuc.basis) : '') +
        sec('Những nội dung nào cần báo cáo lãnh đạo?', a.baoCaoLanhDao.items.length, a.baoCaoLanhDao.items.length ? a.baoCaoLanhDao.items.map(A.issueHtml).join('') : none('Chưa có nội dung nào được đánh dấu cần xin ý kiến; không có tồn đọng kéo dài.'), a.baoCaoLanhDao.basis) +
        sec('Những vấn đề nào cần chủ động tham mưu?', nCd, nCd ? cdHtml : none('Chưa phát hiện nội dung cần chủ động tham mưu theo các tiêu chí đang áp dụng.'), cd.basis) + '</div>';
      A.bindGo(root);
      UI.on(root, 'click', '[data-act]', t => { const [k, v] = t.dataset.act.split(':'); if (k === 'nvnhom') A.go('nhiemvu', { preset: { nhom: v === '?' ? '' : v, tt: 'mo' } }); });
      $('[data-copy]', root).onclick = async () => {
        const lines = ['TÓM TẮT ĐIỀU HÀNH — ' + A.cfg('tenDonVi') + ' — ' + U.fmtDate(today), ''];
        lines.push('A. Giải ngân dự toán:'); a.giaiNgan.items.forEach(x => lines.push('  - ' + x.t + ': ' + x.d));
        lines.push('B. Đấu thầu, hợp đồng (' + a.dauThau.items.length + '):'); a.dauThau.items.forEach(x => lines.push('  - ' + x.title + ': ' + x.detail));
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
