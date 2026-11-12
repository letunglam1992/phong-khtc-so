// Đóng gói toàn bộ mã nguồn thành một tệp HTML độc lập: node build.js
const fs = require('fs'), path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, p), 'utf8');
const jsDir = path.join(__dirname, 'src/js');
const js = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort().map(f => '/* ===== ' + f + ' ===== */\n' + R('src/js/' + f)).join('\n');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!DOCTYPE html>
<html lang="vi" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Phòng Kế hoạch - Tài chính số</title>
<meta name="theme-color" content="#0d3327">
<meta name="description" content="Phần mềm điều hành Phòng Kế hoạch - Tài chính, Sở Nông nghiệp và Môi trường tỉnh Sơn La">
<meta name="apple-mobile-web-app-title" content="KH-TC số">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${Buffer.from(R('assets/icon.svg')).toString('base64')}">
<link rel="apple-touch-icon" sizes="180x180" href="icon-180.png">
<script>if(/^https?:$/.test(location.protocol)){var l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l);}</script>
<style>
${R('vendor/font.css')}
${R('src/styles.css')}
</style>
</head>
<body>
<div class="app" id="app"><div style="padding:48px;font-family:sans-serif">Đang mở dữ liệu…</div></div>
<noscript><p style="padding:24px">Phần mềm cần bật JavaScript để hoạt động.</p></noscript>
<script>
/* SheetJS Community Edition 0.18.5 — Apache-2.0 */
${safe(R('vendor/xlsx.full.min.js'))}
</script>
<script>
${safe(js)}
</script>
</body>
</html>
`;
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
const out = path.join(__dirname, 'dist/PhongKHTC-so.html');
fs.writeFileSync(out, html);
// Bản triển khai web (Vercel): index.html + biểu tượng + manifest
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html);
fs.readdirSync(path.join(__dirname, 'assets')).forEach(f => fs.copyFileSync(path.join(__dirname, 'assets', f), path.join(__dirname, 'dist', f)));
fs.copyFileSync(path.join(__dirname, 'gas/Code.gs'), path.join(__dirname, 'dist/Code.gs'));
fs.copyFileSync(path.join(__dirname, 'HUONG-DAN.md'), path.join(__dirname, 'dist/HUONG-DAN.md'));
console.log('Đã tạo', out, (html.length / 1048576).toFixed(2) + ' MB');
