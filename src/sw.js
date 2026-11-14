/* Service worker — cho phép mở phần mềm khi mất mạng (dữ liệu vẫn nằm trong IndexedDB của trình duyệt).
   Trang chính: lấy bản mới từ mạng trước; mất mạng hoặc quá 4 giây thì dùng bản đã lưu.
   Biểu tượng, manifest: dùng bản đã lưu, cập nhật ngầm. Không lưu đệm yêu cầu tới máy chủ Apps Script, AI. */
const BAN = 'khtc-so-__VER__';
const TEP = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon-180.png', 'icon.svg'];
self.addEventListener('install', ev => { ev.waitUntil(caches.open(BAN).then(c => c.addAll(TEP)).then(() => self.skipWaiting())); });
self.addEventListener('activate', ev => { ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('khtc-so-') && k !== BAN).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const henGio = (p, ms) => new Promise((ok, loi) => { const t = setTimeout(() => loi(new Error('timeout')), ms); p.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); loi(e); }); });
self.addEventListener('fetch', ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    ev.respondWith(henGio(fetch(req), 4000).then(r => { if (r.ok) { const c = r.clone(); caches.open(BAN).then(x => x.put('index.html', c)); } return r; })
      .catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }
  ev.respondWith(caches.match(req).then(cu => { const moi = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(BAN).then(x => x.put(req, c)); } return r; }).catch(() => cu); return cu || moi; }));
});
