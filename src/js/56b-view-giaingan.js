/* ============================================================
   56b-view-giaingan.js — Tổng quan, cập nhật, lịch sử giải ngân dự toán (thẻ trong trang Tài chính, ngân sách)
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$, P = UI.PAL;
  const fs = U.fmtShort, ty = v => U.fmtNum(v / 1e9, Math.abs(v) >= 1e10 ? 0 : 1);
  const kpi = (cls, l, v, s) => '<div class="kpi ' + cls + ' static"><span class="k-l">' + e(l) + '</span><span class="k-v">' + v + '</span><span class="k-s">' + (s || '&nbsp;') + '</span></div>';
  const cbOpts = () => [['', 'Tất cả cán bộ'], ['__none', 'Chưa giao cán bộ']].concat(S.all('canbo').filter(c => c.trangThai !== 'nghi').map(c => [c.id, c.hoTen]));
  const opt = (list, v) => list.map(o => '<option value="' + e(o[0]) + '"' + (String(v || '') === String(o[0]) ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('');
  const filt = (Sel, withCb) => '<div class="toolbar"><select class="sel" data-gdv aria-label="Đơn vị dự toán">' + opt([['', 'Tất cả đơn vị']].concat(S.all('donvi').map(d => [d.id, d.tenTat || d.ten])), Sel.dv) + '</select>' + (withCb ? '<select class="sel" data-gcb aria-label="Cán bộ theo dõi">' + opt(cbOpts(), Sel.cb) + '</select>' : '');

  /* ---------- Đặt mục tiêu giải ngân lũy kế ---------- */
  function mucTieuDialog(nam) {
    const cur = L.gnMucTieu(nam);
    const m = UI.modal({
      title: 'Mục tiêu giải ngân lũy kế năm ' + nam, size: 'lg',
      body: '<p class="soft">Nhập tỷ lệ giải ngân lũy kế (% tổng kinh phí được sử dụng) phải đạt đến cuối mỗi tháng theo chỉ đạo của UBND tỉnh, của Sở hoặc kế hoạch của Phòng. Bỏ trống tất cả để dùng tỷ lệ thời gian trôi qua của năm làm mốc so sánh.</p><div class="mt-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px">' +
        cur.vals.map((v, i) => '<div class="fld"><label for="mt' + i + '">Hết tháng ' + (i + 1) + '</label><input class="inp" id="mt' + i + '" type="number" min="0" max="100" step="0.1" value="' + (cur.tuDat ? v : '') + '" placeholder="' + U.fmtNum(Math.round((i + 1) / 12 * 1000) / 10, 1) + '"></div>').join('') + '</div>',
      buttons: [{ label: 'Hủy', on: x => x.close() }, { label: 'Dùng tỷ lệ thời gian', on: async x => { const o = Object.assign({}, S.cfg.gnMucTieu || {}); delete o[nam]; await S.setCfg({ gnMucTieu: o }); x.close(); A.render(); } }, {
        label: 'Lưu mục tiêu', cls: 'primary', icon: 'check', on: async x => {
          const vals = cur.vals.map((_, i) => $('#mt' + i, m.body).value.trim()), nums = vals.map(v => v === '' ? null : +v);
          if (nums.every(v => v === null)) { UI.toast('Chưa nhập mục tiêu tháng nào.', 'bad'); return; }
          if (nums.some(v => v !== null && (isNaN(v) || v < 0 || v > 100))) { UI.toast('Tỷ lệ phải từ 0 đến 100%.', 'bad'); return; }
          // Tháng bỏ trống: lấy mục tiêu tháng trước gần nhất (lũy kế không giảm)
          let last = 0; const full = nums.map(v => { if (v !== null) last = Math.max(last, v); return last; });
          await S.setCfg({ gnMucTieu: Object.assign({}, S.cfg.gnMucTieu || {}, { [nam]: full }) }); x.close(); UI.toast('Đã lưu mục tiêu giải ngân năm ' + nam + '.', 'ok'); A.render();
        }
      }]
    });
  }

  /* ---------- Thẻ Tổng quan giải ngân ---------- */
  function tongQuan(box, y, Sel, ctx) {
    const f = { dv: Sel.dv, cb: Sel.cb }, g = L.giaiNgan(y, f);
    if (!g.tong) { box.innerHTML = filt(Sel, true) + '</div><div class="card">' + UI.empty('Chưa có số liệu dự toán năm ' + y + (Sel.dv || Sel.cb ? ' trong phạm vi đang lọc' : ''), 'Nhập biểu giải ngân từ Excel (mỗi lần nhập lại phần mềm tự ghi một mốc giải ngân) hoặc cập nhật số giải ngân ở thẻ "Cập nhật giải ngân".', '<button class="btn primary" data-imp>' + ic('upload', 16) + 'Nhập biểu giải ngân</button>') + '</div>'; bind(); return; }
    const mucTieu = g.mt.tuDat ? g.mtNay : g.tyLeTG, M = L.GN_MUC[g.muc];
    const thangCats = Array.from({ length: 12 }, (_, i) => 'T' + (i + 1));
    const duBaoVals = thangCats.map((_, i) => i + 1 > g.lastM && g.lastM < 12 ? g.gn + (g.duBao - g.gn) * (i + 1 - g.lastM) / (12 - g.lastM) : null);
    const dx = L.gnDeXuat(y, f), rows = L.gnDong(y, f), cham = rows.filter(x => x.cham).sort((a, b) => b.con - a.con);
    const dvG = Sel.dv ? [] : L.gnNhom(y, 'dv'), cbG = L.gnNhom(y, 'cb');
    let h = filt(Sel, true) + '<span class="sp"></span><button class="btn" data-mt>' + ic('flag', 16) + 'Mục tiêu giải ngân</button><button class="btn" data-rep>' + ic('report', 16) + 'Lập báo cáo tiến độ</button><button class="btn" data-imp>' + ic('upload', 16) + 'Nhập biểu Excel</button><button class="btn primary" data-goupd>' + ic('edit', 16) + 'Cập nhật số giải ngân</button></div>';
    h += '<div class="card mb gn-banner"><div class="card-b" style="display:flex;gap:18px;flex-wrap:wrap;align-items:center"><div style="min-width:0;flex:1 1 360px"><div class="eyebrow" style="margin:0">Tiến độ giải ngân năm ' + y + ' — số liệu đến ngày ' + U.fmtDate(g.asOf) + '</div><div style="font-size:18px;font-weight:700;margin-top:4px">Đã giải ngân ' + U.fmtPct(g.tyLe) + ' · ' + (g.mt.tuDat ? 'mục tiêu hết tháng ' + g.lastM + ': ' : 'thời gian đã qua: ') + U.fmtPct(mucTieu) + ' ' + UI.chip(M[0], M[1]) + '</div><div class="soft small">' + (g.lech >= 0 ? 'Vượt ' : 'Thấp hơn ') + U.fmtNum(Math.abs(g.lech), 1) + ' điểm % so với ' + (g.mt.tuDat ? 'mục tiêu Phòng đã đặt' : 'tỷ lệ thời gian (chưa đặt mục tiêu riêng)') + '. Dự báo đến 31/12: khoảng <b>' + U.fmtPct(U.pct(g.duBao, g.tong)) + '</b>.</div></div><div style="flex:0 1 280px;min-width:220px">' + UI.pbar(g.tyLe || 0, g.muc === 'cham' ? 'bad' : '') + '</div></div></div>';
    h += '<div class="kpis mb">' +
      kpi('acc', 'Tổng kinh phí được sử dụng', '<small>' + fs(g.tong) + '</small>', g.leaves.length + ' nội dung chi tiết') +
      kpi('ok', 'Đã giải ngân lũy kế', '<small>' + fs(g.gn) + '</small>', U.fmtPct(g.tyLe) + ' kế hoạch') +
      kpi('warn', 'Còn phải giải ngân', '<small>' + fs(g.conLai) + '</small>', U.fmtNum(g.conNgay, 0) + ' ngày còn lại trong năm') +
      kpi(g.nguyCo ? 'bad' : 'teal', 'Dự báo giải ngân đến 31/12', '<small>' + fs(g.duBao) + '</small>', U.fmtPct(U.pct(g.duBao, g.tong)) + (g.nguyCo ? ' · nguy cơ còn ' + fs(g.tong - g.duBao) : '')) +
      kpi('violet', 'Cần giải ngân bình quân', g.canMoiThang !== null && g.conLai > 0.5 ? '<small>' + fs(g.canMoiThang) + '</small>' : '—', g.canMoiThang !== null && g.conLai > 0.5 ? 'mỗi tháng để hết kế hoạch' : '') +
      kpi(cham.length ? 'bad' : 'ok', 'Nội dung giải ngân chậm', cham.length, cham.length ? 'Còn ' + fs(U.sum(cham, x => x.con)) : 'Không có') + '</div>';
    h += '<div class="grid-21"><div class="card"><div class="card-h"><h3>Diễn biến giải ngân lũy kế theo tháng</h3><div class="sub">Tỷ đồng. Cột xanh: thực hiện; cột nhạt: dự báo theo tốc độ hiện tại; đường: mục tiêu ' + (g.mt.tuDat ? 'đã đặt' : 'theo tỷ lệ thời gian') + '</div></div><div class="card-b">' +
      UI.bars({ cats: thangCats, fmt: ty, labels: false, series: [{ name: 'Đã giải ngân lũy kế', color: P.acc, vals: g.thang }, { name: 'Dự báo', color: 'var(--idle)', vals: duBaoVals }], line: { name: 'Mục tiêu', color: 'var(--violet)', vals: g.mtTien }, label: 'Giải ngân lũy kế theo tháng' }) +
      '<div class="small muted">' + (g.coLS ? 'Dự báo lấy bình quân của hai cách: tốc độ từ đầu năm (' + fs(g.duBao1) + ') và tốc độ khoảng 60 ngày gần nhất (' + fs(g.duBao2) + '); không vượt tổng kế hoạch.' : 'Mới có số liệu một kỳ: dự báo tạm tính theo tốc độ bình quân từ đầu năm. Cập nhật số giải ngân định kỳ để dự báo sát thực tế hơn.') + '</div></div></div>' +
      '<div class="card"><div class="card-h"><h3>Phương án, đề xuất chỉ đạo</h3><div class="sub">Tính từ số liệu đã nhập</div></div><div class="card-b">' + (dx.length ? dx.map(x => '<div class="issue s' + x.sev + '" style="cursor:default"><span class="lv"></span><span><span class="t">' + e(x.t) + '</span><span class="d">' + e(x.d) + '</span></span></div>').join('') : '<div class="note ok">Tiến độ giải ngân đang đạt mục tiêu; chưa có nội dung cần đề xuất.</div>') + '</div></div></div>';
    const grp = (title, list, by) => '<div class="card"><div class="card-h"><h3>' + title + '</h3></div><div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + (by === 'cb' ? 'Cán bộ theo dõi' : 'Đơn vị') + '</th><th class="num">Được sử dụng</th><th class="num">Đã giải ngân</th><th class="num">Còn lại</th><th class="num">Chậm</th><th style="min-width:120px">Tỷ lệ</th></tr></thead><tbody>' + list.map(o => '<tr class="click" data-g' + by + '="' + e(o.k) + '"><td>' + e(o.ten) + '<div class="t2">' + o.n + ' nội dung' + (o.chuaGN ? ' · ' + o.chuaGN + ' chưa giải ngân' : '') + '</div></td><td class="num">' + fs(o.tong) + '</td><td class="num">' + fs(o.gn) + '</td><td class="num">' + fs(o.con) + '</td><td class="num">' + (o.cham ? '<b style="color:var(--bad-fg)">' + o.cham + '</b>' : '0') + '</td><td>' + UI.pbar(o.ty || 0, (o.ty || 0) < mucTieu - A.nguong('gnLech') ? 'bad' : '') + '</td></tr>').join('') + '</tbody></table></div></div></div>';
    const cards = (dvG.length > 1 ? [grp('Tiến độ theo đơn vị dự toán', dvG, 'dv')] : []).concat([grp('Tiến độ theo cán bộ theo dõi', cbG, 'cb')]);
    h += '<div class="' + (cards.length > 1 ? 'grid2 ' : '') + 'mt">' + cards.join('') + '</div>';
    h += '<div class="card mt"><div class="card-h"><h3>Nội dung giải ngân chậm (' + cham.length + ')</h3><div class="sub">Tỷ lệ giải ngân thấp hơn ' + (g.mt.tuDat ? 'mục tiêu' : 'tỷ lệ thời gian') + ' từ ' + A.nguong('gnLech') + ' điểm % trở lên; sắp theo số còn phải giải ngân</div></div><div class="card-b">' +
      (cham.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nội dung</th><th>Đơn vị</th><th class="num">Được sử dụng</th><th class="num">Đã giải ngân</th><th class="num">Còn lại</th><th style="min-width:120px">Tỷ lệ</th><th>Cán bộ</th></tr></thead><tbody>' + cham.slice(0, 30).map(x => '<tr class="click" data-id="' + x.r.id + '"><td class="wrap" style="min-width:260px">' + e(x.r.stt ? x.r.stt + ' ' : '') + e(U.trunc(x.r.noiDung, 120)) + (x.r.tienDo ? '<div class="t2">' + e(U.trunc(x.r.tienDo, 100)) + '</div>' : '') + '</td><td class="small">' + e(Sc.refName('donvi', x.r.donViId)) + '</td><td class="num">' + fs(x.tong) + '</td><td class="num">' + fs(x.gn) + '</td><td class="num">' + fs(x.con) + '</td><td>' + UI.pbar(x.ty, 'bad') + '</td><td>' + UI.who(x.r.canBoId) + '</td></tr>').join('') + '</tbody></table></div>' + (cham.length > 30 ? '<div class="small muted mt">… và ' + (cham.length - 30) + ' nội dung khác (xem đủ trong báo cáo).</div>' : '') : '<div class="note ok">Không có nội dung nào chậm so với mốc so sánh.</div>') + '</div></div>';
    box.innerHTML = h; bind();
    function bind() {
      const q = s => $(s, box);
      if (q('[data-gdv]')) q('[data-gdv]').onchange = x => { Sel.dv = x.target.value; A.render(); };
      if (q('[data-gcb]')) q('[data-gcb]').onchange = x => { Sel.cb = x.target.value; A.render(); };
      if (q('[data-imp]')) q('[data-imp]').onclick = ctx.importBudget;
      if (q('[data-mt]')) q('[data-mt]').onclick = () => mucTieuDialog(y);
      if (q('[data-goupd]')) q('[data-goupd]').onclick = () => { Sel.tab = 'cn'; A.render(); };
      if (q('[data-rep]')) q('[data-rep]').onclick = () => { const t = U.today(); A.vs.bc = Object.assign(A.vs.bc || { kind: 'nam', n: 1, from: t.slice(0, 8) + '01', to: t, nhom: '', duan: '', cb: '', secs: [] }, { type: 'gnns', kind: 'nam', y, dv: Sel.dv || '', cb: Sel.cb && Sel.cb !== '__none' ? Sel.cb : '' }); A.go('baocao'); };
      $$('[data-gdv]', box).forEach(() => { });
      $$('tr[data-gdv]', box).forEach(tr => tr.onclick = () => { Sel.dv = tr.dataset.gdv; A.render(); });
      $$('tr[data-gcb]', box).forEach(tr => tr.onclick = () => { Sel.cb = tr.dataset.gcb; A.render(); });
      $$('tr[data-id]', box).forEach(tr => tr.onclick = () => A.open('ngansach', tr.dataset.id));
    }
  }

  /* ---------- Thẻ Cập nhật giải ngân: nhập nhanh lũy kế cho nhiều dòng ---------- */
  function capNhat(box, y, Sel, ctx) {
    const leaves = L.gnLeaves(y, { dv: Sel.dv, cb: Sel.cb }).filter(n => n.sum.tong > 0 || n.sum.giaiNgan > 0);
    const U2 = A.vs.gnUpd || (A.vs.gnUpd = { ngay: U.today(), q: '', chiChua: false });
    let h = filt(Sel, true) + '<div class="fld" style="margin:0"><label for="gn_d" class="small">Số lũy kế tính đến ngày</label><input class="inp" type="date" id="gn_d" value="' + e(U2.ngay) + '"></div><div class="search" style="max-width:240px">' + ic('search', 16) + '<input class="inp" type="search" data-gq placeholder="Tìm nội dung…" aria-label="Tìm nội dung" value="' + e(U2.q) + '"></div><label class="check"><input type="checkbox" data-gch' + (U2.chiChua ? ' checked' : '') + '> Chỉ dòng chưa giải ngân hết</label><span class="sp"></span><button class="btn" data-imp>' + ic('upload', 16) + 'Nhập lại từ biểu Excel</button></div>';
    if (!leaves.length) { box.innerHTML = h + '<div class="card">' + UI.empty('Chưa có dòng dự toán chi tiết năm ' + y, 'Nhập biểu dự toán, giải ngân từ Excel trước, sau đó cập nhật số giải ngân định kỳ tại đây.') + '</div>'; bindCommon(); return; }
    h += '<div class="note mb">Nhập <b>số lũy kế đã giải ngân từ đầu năm</b> đến ngày đã chọn (không phải số phát sinh). Chỉ những dòng có thay đổi mới được lưu; mỗi lần lưu ghi thêm một mốc vào lịch sử giải ngân của dòng đó.</div><div data-grid></div><div class="gap mt"><span class="small muted" data-cnt>Chưa có thay đổi</span><span class="sp"></span><button class="btn primary" data-save disabled>' + ic('check', 16) + 'Lưu số giải ngân</button></div>';
    box.innerHTML = h; bindCommon();
    const changed = new Map();
    const draw = () => {
      const nq = U.norm(U2.q); let list = leaves;
      if (nq) list = list.filter(n => U.norm((n.r.stt || '') + ' ' + n.r.noiDung).includes(nq));
      if (U2.chiChua) list = list.filter(n => n.sum.giaiNgan < n.sum.tong - 0.5);
      $('[data-grid]', box).innerHTML = '<div class="tbl-wrap" style="max-height:66vh;overflow:auto"><table class="tbl"><thead><tr><th>Nội dung</th><th>Đơn vị · cán bộ</th><th class="num">Được sử dụng</th><th class="num">Lũy kế hiện tại</th><th class="num" style="min-width:170px">Lũy kế mới (đồng)</th><th style="min-width:110px">Tỷ lệ</th></tr></thead><tbody>' +
        list.map(n => { const v = changed.has(n.r.id) ? changed.get(n.r.id) : ''; return '<tr data-r="' + n.r.id + '"><td class="wrap" style="min-width:260px">' + e(n.r.stt ? n.r.stt + ' ' : '') + e(U.trunc(n.r.noiDung, 110)) + '</td><td class="small">' + e(Sc.refName('donvi', n.r.donViId)) + '<div class="t2">' + e(Sc.refName('canbo', n.r.canBoId) || 'chưa giao') + '</div></td><td class="num">' + U.fmtMoney(n.sum.tong) + '</td><td class="num">' + U.fmtMoney(n.sum.giaiNgan) + (n.r.ngayGN ? '<div class="t2">' + U.fmtDate(n.r.ngayGN) + '</div>' : '') + '</td><td><input class="inp num" inputmode="numeric" data-v aria-label="Lũy kế mới" value="' + (v === '' ? '' : U.fmtMoney(v)) + '" placeholder="' + U.fmtMoney(n.sum.giaiNgan) + '"></td><td data-p>' + UI.pbar(U.pct(v === '' ? n.sum.giaiNgan : v, n.sum.tong) || 0) + '</td></tr>'; }).join('') + '</tbody></table></div><div class="pager"><span>' + list.length + ' / ' + leaves.length + ' dòng</span></div>';
      $$('tr[data-r]', box).forEach(tr => {
        const n = leaves.find(x => x.r.id === tr.dataset.r), inp = $('[data-v]', tr);
        inp.addEventListener('input', () => {
          const raw = inp.value.trim();
          if (raw === '') changed.delete(n.r.id);
          else { const v = U.num(raw.replace(/[.\s]/g, '').replace(',', '.')); if (Math.abs(v - n.sum.giaiNgan) > 0.5) changed.set(n.r.id, v); else changed.delete(n.r.id); }
          const v = changed.get(n.r.id); $('[data-p]', tr).innerHTML = UI.pbar(U.pct(v === undefined ? n.sum.giaiNgan : v, n.sum.tong) || 0, v !== undefined && v > n.sum.tong + 0.5 ? 'bad' : '');
          inp.classList.toggle('err', v !== undefined && (v < 0 || v > n.sum.tong + 0.5));
          count();
        });
        inp.addEventListener('blur', () => { const v = changed.get(n.r.id); if (v !== undefined) inp.value = U.fmtMoney(v); });
      });
    };
    const count = () => { const b = $('[data-save]', box); b.disabled = !changed.size; $('[data-cnt]', box).textContent = changed.size ? changed.size + ' dòng có số mới, tăng thêm ' + U.fmtMoney(U.sum(Array.from(changed), ([id, v]) => v - U.num(S.get('ngansach', id).giaiNgan))) + ' đồng' : 'Chưa có thay đổi'; };
    draw();
    $('[data-gq]', box).addEventListener('input', U.debounce(x => { U2.q = x.target.value; draw(); }, 160));
    $('[data-gch]', box).onchange = x => { U2.chiChua = x.target.checked; draw(); };
    $('#gn_d', box).onchange = x => { U2.ngay = x.target.value; };
    $('[data-save]', box).onclick = async () => {
      const ngay = $('#gn_d', box).value;
      if (!U.isISO(ngay)) { UI.toast('Chọn ngày tính số lũy kế.', 'bad'); return; }
      if (+ngay.slice(0, 4) !== y) { UI.toast('Ngày số liệu phải thuộc năm ngân sách ' + y + '.', 'bad'); return; }
      const vuot = Array.from(changed).filter(([id, v]) => { const n = leaves.find(x => x.r.id === id); return v < 0 || v > n.sum.tong + 0.5; });
      if (vuot.length && !await UI.confirm({ title: 'Có số vượt kế hoạch hoặc âm', msg: vuot.length + ' dòng có số lũy kế âm hoặc lớn hơn kinh phí được sử dụng. Vẫn lưu?', ok: 'Vẫn lưu' })) return;
      const items = Array.from(changed).map(([id, v]) => { const r = S.get('ngansach', id); return { c: 'ngansach', rec: { id, giaiNgan: v, ngayGN: ngay, gnHist: L.gnPush(r.gnHist && r.gnHist.length ? r.gnHist : L.gnHistOf(r), ngay, v, 'tay') } }; });
      try { await S.saveMany(items, { note: 'Cập nhật số giải ngân ' + items.length + ' dòng dự toán, tính đến ' + U.fmtDate(ngay) }); changed.clear(); UI.toast('Đã lưu số giải ngân ' + items.length + ' dòng.', 'ok'); }
      catch (er) { UI.fail(er); }
    };
    function bindCommon() {
      if ($('[data-gdv]', box)) $('[data-gdv]', box).onchange = x => { Sel.dv = x.target.value; A.render(); };
      if ($('[data-gcb]', box)) $('[data-gcb]', box).onchange = x => { Sel.cb = x.target.value; A.render(); };
      if ($('[data-imp]', box)) $('[data-imp]', box).onclick = ctx.importBudget;
    }
  }

  /* ---------- Thẻ Lịch sử giải ngân: các mốc cập nhật ---------- */
  function lichSu(box, y, Sel) {
    const leaves = L.gnLeaves(y, { dv: Sel.dv }), hs = leaves.map(n => ({ n, h: L.gnHistOf(n.r) }));
    const dates = Array.from(new Set(hs.flatMap(x => x.h.map(z => z.ngay)))).filter(d => +d.slice(0, 4) === y).sort();
    let h = filt(Sel, false) + '</div>';
    if (!dates.length) { box.innerHTML = h + '<div class="card">' + UI.empty('Chưa có mốc giải ngân nào năm ' + y, 'Mỗi lần nhập biểu Excel hoặc cập nhật số giải ngân, phần mềm ghi một mốc để theo dõi diễn biến.') + '</div>'; $('[data-gdv]', box).onchange = x => { Sel.dv = x.target.value; A.render(); }; return; }
    const tong = U.sum(leaves, n => n.sum.tong);
    const valAt = (h, d) => { let v = 0; for (const x of h) { if (x.ngay <= d) v = x.giaiNgan; else break; } return v; };
    const pts = dates.map(d => ({ d, v: U.sum(hs, x => valAt(x.h, d)), n: hs.filter(x => x.h.some(z => z.ngay === d)).length, nguon: Array.from(new Set(hs.flatMap(x => x.h.filter(z => z.ngay === d).map(z => z.nguon === 'excel' ? 'Nhập Excel' : z.nguon === 'goc' ? 'Số ban đầu' : 'Cập nhật trên phần mềm')))).join(', ') }));
    h += '<div class="card"><div class="card-h"><h3>Các mốc cập nhật giải ngân năm ' + y + '</h3><div class="sub">Lũy kế cộng các dòng chi tiết tại từng mốc; dòng không cập nhật ở mốc đó lấy số mốc gần nhất trước đó</div></div><div class="card-b">' +
      UI.bars({ cats: pts.map(p => U.fmtDate(p.d).slice(0, 5)), fmt: ty, labels: pts.length <= 14, series: [{ name: 'Lũy kế giải ngân', color: P.acc, vals: pts.map(p => p.v) }], label: 'Lũy kế giải ngân theo mốc' }) +
      '<div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>Ngày số liệu</th><th class="num">Lũy kế giải ngân</th><th class="num">Tăng so với mốc trước</th><th>Tỷ lệ</th><th class="num">Số dòng cập nhật</th><th>Nguồn</th></tr></thead><tbody>' +
      pts.slice().reverse().map((p, i, arr) => { const prev = arr[i + 1]; return '<tr><td>' + U.fmtDate(p.d) + '</td><td class="num">' + U.fmtMoney(p.v) + '</td><td class="num">' + (prev ? U.fmtMoney(p.v - prev.v) : '—') + '</td><td style="min-width:120px">' + UI.pbar(U.pct(p.v, tong) || 0) + '</td><td class="num">' + p.n + '</td><td class="small">' + e(p.nguon) + '</td></tr>'; }).join('') + '</tbody></table></div></div></div>';
    box.innerHTML = h;
    $('[data-gdv]', box).onchange = x => { Sel.dv = x.target.value; A.render(); };
  }

  A.gnPane = (tab, box, y, Sel, ctx) => { if (tab === 'tq') tongQuan(box, y, Sel, ctx); else if (tab === 'cn') capNhat(box, y, Sel, ctx); else lichSu(box, y, Sel); };
  // Lịch sử giải ngân trong hộp chi tiết của dòng dự toán
  A.gnHistHtml = r => { const h = L.gnHistOf(r); if (!h.length) return ''; return '<div class="card mb"><div class="card-h"><h3>Lịch sử giải ngân (' + h.length + ' mốc)</h3></div><div class="card-b"><table class="tbl"><thead><tr><th>Ngày số liệu</th><th class="num">Lũy kế</th><th class="num">Tăng thêm</th><th>Nguồn</th><th>Người cập nhật</th></tr></thead><tbody>' + h.slice().reverse().map((x, i, a) => '<tr><td>' + U.fmtDate(x.ngay) + '</td><td class="num">' + U.fmtMoney(x.giaiNgan) + '</td><td class="num">' + (a[i + 1] ? U.fmtMoney(x.giaiNgan - a[i + 1].giaiNgan) : '—') + '</td><td class="small">' + (x.nguon === 'excel' ? 'Nhập Excel' : x.nguon === 'goc' ? 'Số ban đầu' : 'Cập nhật') + '</td><td class="small">' + e(x.by || '') + '</td></tr>').join('') + '</tbody></table></div></div>'; };
})(App);
