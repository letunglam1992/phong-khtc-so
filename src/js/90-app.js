/* ============================================================
   90-app.js — Khung ứng dụng: menu, điều hướng, tìm kiếm toàn cục, khởi động
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const NAV = [
    ['Điều hành', [['tongquan', 'Bảng điều hành', 'home'], ['troly', 'Trợ lý điều hành', 'spark'], ['vanbanden', 'Văn bản đến', 'inbox']]],
    ['Tài chính, đầu tư', [['ngansach', 'Tài chính, giải ngân', 'wallet'], ['dauthau', 'Đấu thầu, hợp đồng', 'gavel'], ['von', 'Kế hoạch vốn đầu tư', 'coins'], ['taisan', 'Tài sản công', 'building']]],
    ['Nhiệm vụ, dự án', [['nhiemvu', 'Nhiệm vụ, công việc', 'task'], ['duan', 'Chương trình, dự án', 'project'], ['vanban', 'Văn bản', 'doc'], ['chucnang', 'Chức năng, nhiệm vụ', 'book'], ['canbo', 'Cán bộ, phân công', 'users']]],
    ['Tổng hợp', [['baocao', 'Báo cáo, thống kê', 'report'], ['ketnoi', 'Kết nối phần mềm', 'link'], ['lichsu', 'Nhật ký cập nhật', 'history'], ['thietlap', 'Thiết lập, sao lưu', 'gear']]]
  ];
  A.route = 'tongquan'; A.params = null;

  A.open = (coll, id) => { const f = A.openers[coll]; if (f) f(id); };
  A.go = (route, params) => {
    if (!A.views[route]) route = 'tongquan';
    A.route = route; A.params = params || null;
    UI.closeAll();
    try { history.replaceState(null, '', '#' + route); } catch (x) { }
    $('.app').classList.remove('drawer');
    A.render(); window.scrollTo(0, 0);
    const main = $('#content'); if (main) main.focus({ preventScroll: true });
  };
  let badgeCache = 0;
  A.render = () => {
    const v = A.views[A.route], old = $('#content'), root = old.cloneNode(false);
    old.replaceWith(root);   // nút mới hoàn toàn: gỡ sạch trình xử lý sự kiện của lần vẽ trước
    $('#t-title').textContent = v.title; $('#t-sub').textContent = v.sub || '';
    $('#t-eye').textContent = A.cfg('tenDonVi') + ' · ' + A.cfg('coQuan');
    document.title = v.title + ' — ' + A.cfg('tenDonVi');
    $$('.nav-item').forEach(b => { const on = b.dataset.r === A.route; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const p = A.params; A.params = null;
    try { v.render(root, p); } catch (er) { console.error(er); root.innerHTML = '<div class="card"><div class="card-b"><h3>Trang này gặp lỗi khi hiển thị</h3><p class="soft">' + e(er.message) + '</p><p class="small muted">Dữ liệu không bị ảnh hưởng. Hãy sao lưu ở Thiết lập và báo lại nội dung lỗi này.</p></div></div>'; }
    try { badgeCache = (A.dashAlerts ? A.dashAlerts(A.year()) : L.alerts(A.year())).filter(a => a.sev === 3).length; } catch (x) { badgeCache = 0; }
    const bd = $('#nav-badge'); if (bd) { bd.textContent = badgeCache; bd.classList.toggle('hide', !badgeCache); }
    if (A.VBD) A.VBD.badge();
    $('#who').textContent = S.cfg.nguoiDung ? S.cfg.nguoiDung : 'Chưa đặt tên người dùng';
    yearSelect();
  };
  function yearSelect() {
    const sel = $('#year'), cy = +U.today().slice(0, 4), ys = new Set([cy - 1, cy, cy + 1]);
    S.all('nhiemvu').forEach(t => t.nam && ys.add(+t.nam)); S.all('von').forEach(t => t.nam && ys.add(+t.nam)); S.all('ngansach').forEach(t => t.nam && ys.add(+t.nam));
    const cur = A.year();
    sel.innerHTML = '<option value="">Tất cả các năm</option>' + Array.from(ys).filter(y => y >= 2000 && y <= 2100).sort((a, b) => b - a).map(y => '<option value="' + y + '"' + (y === cur ? ' selected' : '') + '>Năm ' + y + '</option>').join('');
  }

  /* ---------- Tìm kiếm toàn cục ---------- */
  function openSearch() {
    const m = UI.modal({ title: 'Tìm trong toàn bộ dữ liệu', footer: false, size: 'cmd', body: '<input class="inp" type="search" placeholder="Gõ từ khóa: tên nhiệm vụ, số văn bản, dự án, nhà thầu, cán bộ…" aria-label="Từ khóa"><div class="cmd-res" role="listbox"></div>' });
    $('.modal-b', m.el).style.padding = '0';
    const inp = $('input', m.body), res = $('.cmd-res', m.body); let items = [], idx = 0;
    const pages = NAV.flatMap(g => g[1]);
    const draw = () => {
      const q = inp.value.trim(), nq = U.norm(q);
      const pg = pages.filter(p => !nq || U.norm(p[1]).includes(nq)).slice(0, nq ? 4 : 14).map(p => ({ kind: 'page', r: p[0], title: p[1], label: 'Trang', icon: p[2] }));
      const rs = L.search(q, 40).map(x => ({ kind: 'rec', c: x.c, id: x.r.id, title: x.title, label: x.label, icon: 'doc' }));
      items = rs.concat(pg); idx = 0;
      res.innerHTML = items.length ? items.map((it, i) => '<button class="cmd-i' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" role="option">' + ic(it.icon, 16) + '<span class="ct">' + e(it.title) + '</span><span class="tag">' + e(it.label) + '</span></button>').join('') : '<div class="empty"><p>Không tìm thấy "' + e(q) + '" trong nhiệm vụ, văn bản, dự án, vốn, dự toán, tài sản, gói thầu, hợp đồng, cán bộ.</p></div>';
    };
    const pick = i => { const it = items[i]; if (!it) return; m.close(true); if (it.kind === 'page') A.go(it.r); else A.open(it.c, it.id); };
    inp.addEventListener('input', U.debounce(draw, 120));
    inp.addEventListener('keydown', x => { if (x.key === 'ArrowDown' || x.key === 'ArrowUp') { x.preventDefault(); idx = Math.max(0, Math.min(items.length - 1, idx + (x.key === 'ArrowDown' ? 1 : -1))); $$('.cmd-i', res).forEach((b, i) => { b.classList.toggle('on', i === idx); if (i === idx) b.scrollIntoView({ block: 'nearest' }); }); } if (x.key === 'Enter') { x.preventDefault(); pick(idx); } });
    UI.on(res, 'click', '.cmd-i', b => pick(+b.dataset.i));
    draw();
  }
  A.openSearch = openSearch;

  /* ---------- Khởi động ---------- */
  A.start = async () => {
    const app = $('#app');
    try { await S.init(); }
    catch (er) { app.innerHTML = '<div style="padding:40px;max-width:640px;margin:auto"><h2>Không mở được kho dữ liệu của trình duyệt</h2><p>' + e(er.message || er) + '</p><p>Hãy thử mở bằng Chrome, Edge hoặc Firefox ở cửa sổ thường (không phải cửa sổ ẩn danh).</p></div>'; return; }
    const first = await A.Seed.firstRun();
    document.documentElement.setAttribute('data-theme', S.cfg.theme === 'dark' ? 'dark' : 'light');
    if (S.cfg.nam === undefined) S.cfg.nam = +U.today().slice(0, 4);
    app.innerHTML = '<aside class="side" aria-label="Menu chính"><div class="brand"><div class="brand-mark" aria-hidden="true">KH<br>TC</div><div class="brand-txt">Phòng KH-TC số<small>Sở Nông nghiệp và Môi trường Sơn La</small></div></div><nav class="nav">' +
      NAV.map(g => '<div class="nav-sec">' + g[0] + '</div>' + g[1].map(i => '<button class="nav-item" data-r="' + i[0] + '" title="' + e(i[1]) + '">' + ic(i[2], 19) + '<span class="lbl">' + i[1] + '</span>' + (i[0] === 'vanbanden' ? '<span class="badge hide" id="nav-vbd" aria-label="Văn bản chờ duyệt"></span>' : '') + (i[0] === 'troly' ? '<span class="badge hide" id="nav-badge" aria-label="Số việc cần xử lý ngay"></span>' : '') + '</button>').join('')).join('') +
      '</nav><div class="side-foot"><span class="who" id="who"></span><button class="btn icon collapse-btn" id="collapse" aria-label="Thu gọn hoặc mở rộng menu" title="Thu gọn menu">' + ic('chevL', 17) + '</button></div></aside>' +
      '<div class="main"><header class="top"><button class="tbtn icon menu-btn" id="menu" aria-label="Mở menu">' + ic('menu', 19) + '</button><div class="top-title"><div class="top-eyebrow" id="t-eye"></div><h1 id="t-title"></h1><div class="top-sub" id="t-sub"></div></div><div class="top-tools"><label class="tbtn" title="Năm dữ liệu đang xem">' + ic('calendar', 16) + '<span class="sr">Năm dữ liệu</span><select id="year" aria-label="Năm dữ liệu"></select></label><button class="tbtn search" id="search">' + ic('search', 16) + '<span>Tìm toàn bộ dữ liệu…</span><kbd>Ctrl K</kbd></button><button class="tbtn" id="quickadd">' + ic('plus', 16) + 'Thêm nhanh</button><button class="tbtn icon" id="backup" aria-label="Sao lưu dữ liệu" title="Sao lưu dữ liệu ra tệp JSON">' + ic('download', 17) + '</button><button class="tbtn icon" id="theme" aria-label="Đổi giao diện sáng, tối" title="Giao diện sáng / tối">' + ic('moon', 17) + '</button></div></header><main class="content" id="content" tabindex="-1"></main></div>';
    if (S.cfg.collapsed) app.classList.add('collapsed');
    UI.on(app, 'click', '.nav-item', b => A.go(b.dataset.r));
    $('#collapse').onclick = () => { app.classList.toggle('collapsed'); S.setCfg({ collapsed: app.classList.contains('collapsed') }); };
    $('#menu').onclick = () => app.classList.toggle('drawer');
    app.addEventListener('click', x => { if (x.target === app && app.classList.contains('drawer')) app.classList.remove('drawer'); });
    $('#year').onchange = x => { S.cfg.nam = x.target.value ? +x.target.value : null; S.setCfg({ nam: S.cfg.nam }); };
    $('#search').onclick = openSearch;
    $('#backup').onclick = () => A.backupNow(true);
    $('#theme').onclick = () => { const d = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', d); S.setCfg({ theme: d }); };
    $('#quickadd').onclick = () => {
      const opts = [['nhiemvu', 'Nhiệm vụ, công việc', 'task'], ['vanban', 'Văn bản giao việc', 'doc'], ['duan', 'Chương trình, dự án', 'project'], ['von', 'Kế hoạch vốn', 'coins'], ['goithau', 'Gói thầu, mua sắm', 'gavel'], ['hopdong', 'Hợp đồng', 'gavel'], ['taisan', 'Tài sản công', 'building']];
      const m = UI.modal({ title: 'Thêm nhanh', size: 'sm', footer: false, body: opts.map(o => '<button class="cmd-i" data-c="' + o[0] + '">' + ic(o[2], 17) + '<span class="ct">' + o[1] + '</span></button>').join('') });
      UI.on(m.body, 'click', '[data-c]', b => { m.close(true); UI.form({ coll: b.dataset.c }); });
    };
    document.addEventListener('keydown', x => { if ((x.ctrlKey || x.metaKey) && x.key.toLowerCase() === 'k') { x.preventDefault(); openSearch(); } });
    const rerender = U.debounce(() => { const y = window.scrollY; A.render(); window.scrollTo(0, y); }, 60);
    S.on(() => rerender());
    const h = location.hash.replace('#', '');
    A.route = A.views[h] ? h : 'tongquan';
    A.render();
    S.trimHistory().catch(() => { });
    if (A.autoSync) setTimeout(() => A.autoSync().catch(er => console.warn(er)), 800);
    if (A.VBD) setTimeout(() => A.VBD.autoCheck(), 1500);
    if (A.chat) A.chat.mount();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
    // Nhắc sao lưu: có dữ liệu nghiệp vụ và quá 7 ngày chưa sao lưu
    const biz = S.count('nhiemvu') + S.count('duan') + S.count('ngansach') + S.count('vanban') + S.count('taisan');
    const last = S.cfg.lastBackup ? U.diffDays(U.today(), S.cfg.lastBackup.slice(0, 10)) : null;
    if (!first && biz > 0 && (last === null || last >= 7)) setTimeout(() => UI.toast(last === null ? 'Chưa từng sao lưu dữ liệu trên máy này.' : 'Đã ' + last + ' ngày chưa sao lưu dữ liệu.', '', { label: 'Sao lưu ngay', fn: () => A.backupNow(true) }), 1200);
    if (S.adapter.noFiles) UI.toast('Trình duyệt chặn IndexedDB nên phần mềm chạy ở chế độ lưu dự phòng: không đính kèm được tệp, dung lượng giới hạn khoảng 5 MB.', 'bad');
  };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', A.start); else A.start(); }
})(App);
