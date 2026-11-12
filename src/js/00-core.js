/* ============================================================
   00-core.js — Tiện ích dùng chung (không phụ thuộc DOM khi nạp)
   ============================================================ */
'use strict';
var App = (typeof App !== 'undefined') ? App : {};
App.VERSION = '1.0.0';
App.APP_ID = 'khtc-so-son-la';

(function (A) {
  const U = A.U = {};

  /* ---------- Thời gian ---------- */
  // Cho phép kiểm thử ghi đè "hôm nay" qua A._today (YYYY-MM-DD)
  U.pad = n => String(n).padStart(2, '0');
  U.toISO = d => d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  U.today = () => A._today || U.toISO(new Date());
  U.nowStamp = () => new Date().toISOString();
  U.isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && U.validYMD(+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10));
  U.validYMD = (y, m, d) => {
    if (!(y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  };
  // Nhận: 'dd/mm/yyyy', 'd-m-yyyy', 'yyyy-mm-dd', số serial Excel, Date. Trả ISO hoặc '' (trống) hoặc null (sai).
  U.parseDate = v => {
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date) return isNaN(v) ? null : U.toISO(v);
    if (typeof v === 'number') {
      if (v < 1 || v > 110000) return null;
      const ms = Math.round((v - 25569) * 86400000);
      const d = new Date(ms);
      return d.getUTCFullYear() + '-' + U.pad(d.getUTCMonth() + 1) + '-' + U.pad(d.getUTCDate());
    }
    const s = String(v).trim();
    if (!s) return '';
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return U.validYMD(+m[1], +m[2], +m[3]) ? m[1] + '-' + U.pad(+m[2]) + '-' + U.pad(+m[3]) : null;
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) return U.validYMD(+m[3], +m[2], +m[1]) ? m[3] + '-' + U.pad(+m[2]) + '-' + U.pad(+m[1]) : null;
    return null;
  };
  U.fmtDate = iso => U.isISO(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
  U.fmtDateTime = stamp => {
    if (!stamp) return '';
    const d = new Date(stamp); if (isNaN(d)) return '';
    return U.pad(d.getDate()) + '/' + U.pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  };
  U.dayNum = iso => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);
  U.diffDays = (a, b) => U.dayNum(a) - U.dayNum(b);           // a - b (ngày)
  U.addDays = (iso, n) => { const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 86400000); return d.getUTCFullYear() + '-' + U.pad(d.getUTCMonth() + 1) + '-' + U.pad(d.getUTCDate()); };
  U.yearOf = iso => U.isISO(iso) ? +iso.slice(0, 4) : null;
  U.lastDayOfMonth = (y, m) => new Date(y, m, 0).getDate();
  U.weekRange = iso => { // Thứ Hai → Chủ nhật
    const dow = (new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay() + 6) % 7;
    const a = U.addDays(iso, -dow); return [a, U.addDays(a, 6)];
  };

  /* ---------- Số, tiền ---------- */
  U.num = v => { const n = typeof v === 'number' ? v : U.parseNum(v); return (n === null || n === '' || isNaN(n)) ? 0 : n; };
  // Chuỗi số kiểu Việt Nam: "1.234.567,5" | "1,234,567" | "1234567". Trả số, '' (trống) hoặc null (sai).
  U.parseNum = v => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).trim().replace(/\s|đ|₫|VND|%/gi, '');
    if (!s) return '';
    const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
    s = s.replace(/[()\-]/g, '');
    const dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
    if (dots && commas) { // dấu xuất hiện sau cùng là dấu thập phân
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (dots > 1) s = s.replace(/\./g, '');
    else if (commas > 1) s = s.replace(/,/g, '');
    else if (dots === 1) { if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace('.', ''); }
    else if (commas === 1) { s = /^\d{1,3},\d{3}$/.test(s) ? s.replace(',', '') : s.replace(',', '.'); }
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const n = parseFloat(s);
    return neg ? -n : n;
  };
  U.fmtNum = (n, dec) => {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '';
    const d = dec === undefined ? (Number.isInteger(+n) ? 0 : 2) : dec;
    const parts = (+n).toFixed(d).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  };
  U.fmtMoney = n => (n === '' || n === null || n === undefined) ? '' : U.fmtNum(Math.round(+n), 0);
  // Rút gọn cho thẻ KPI: 1.234,5 tỷ / 345,6 triệu
  U.fmtShort = n => {
    n = +n || 0; const a = Math.abs(n);
    if (a >= 1e9) return U.fmtNum(n / 1e9, a >= 1e11 ? 1 : 2) + ' tỷ';
    if (a >= 1e6) return U.fmtNum(n / 1e6, 1) + ' triệu';
    return U.fmtNum(n, 0) + ' đ';
  };
  U.pct = (a, b) => (b > 0 ? (a / b) * 100 : null);
  U.fmtPct = (p, dec) => (p === null || p === undefined || isNaN(p)) ? '—' : U.fmtNum(p, dec === undefined ? 1 : dec) + '%';
  U.sum = (arr, f) => arr.reduce((s, x) => s + (U.num(f ? f(x) : x)), 0);

  /* ---------- Chuỗi ---------- */
  U.esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.norm = s => String(s === null || s === undefined ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
  U.uid = p => (p || 'r') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.clone = o => JSON.parse(JSON.stringify(o));
  U.trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  U.groupBy = (arr, f) => { const m = new Map(); arr.forEach(x => { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; };
  U.cmp = (a, b) => {
    const ea = a === '' || a === null || a === undefined, eb = b === '' || b === null || b === undefined;
    if (ea && eb) return 0; if (ea) return 1; if (eb) return -1;   // trống luôn xếp cuối
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'vi', { numeric: true, sensitivity: 'base' });
  };
  U.fileSize = n => n > 1048576 ? U.fmtNum(n / 1048576, 1) + ' MB' : U.fmtNum(Math.max(1, Math.round(n / 1024)), 0) + ' KB';
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.roman = n => { const r = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; r.forEach(([v, c]) => { while (n >= v) { s += c; n -= v; } }); return s; };

  /* ---------- Biểu tượng (SVG nét, 24x24) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7M8 11h7"/>',
    task: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 2.5h6V6H9z"/><path d="m8.5 13 2.2 2.2 4.8-4.8"/>',
    doc: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    project: '<path d="M3 20h18"/><path d="M5 20V9l7-5 7 5v11"/><path d="M9 20v-6h6v6"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M15 11.2c3.3.2 6 1.4 6 2.8 0 1.7-2.7 3-6 3-1 0-2-.1-2.800-.3"/><path d="M21 14v4c0 1.700-2.700 3-6 3s-6-1.300-6-3v-1"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h16V9H5a2 2 0 0 1-2-2z"/><circle cx="17" cy="14.500" r="1.200"/>',
    building: '<rect x="4" y="3" width="11" height="18"/><path d="M15 9h5v12h-5M8 7h3M8 11h3M8 15h3"/>',
    gavel: '<path d="m13 5 6 6M10 8l6 6M11.500 6.500 8 10M17.500 12.500 14 16"/><path d="m9 13-6 6 2 2 6-6"/><path d="M14 21h7"/>',
    users: '<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20c.5-3.500 3.200-5.500 6.500-5.500s6 2 6.500 5.500"/><path d="M16 5a3.500 3.500 0 0 1 0 6.500M18.500 15c1.800.800 2.800 2.500 3 5"/>',
    report: '<path d="M4 20V4h16v16z"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    history: '<path d="M3.500 12a8.500 8.500 0 1 0 2.600-6.100"/><path d="M3 4v4.500h4.500M12 7.500V12l3 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.400 13.500a7.500 7.500 0 0 0 0-3l2-1.500-2-3.400-2.300 1a7.500 7.500 0 0 0-2.600-1.500L14 2.500h-4l-.5 2.600a7.500 7.500 0 0 0-2.600 1.500l-2.300-1-2 3.400 2 1.500a7.500 7.500 0 0 0 0 3l-2 1.500 2 3.400 2.300-1a7.500 7.500 0 0 0 2.600 1.500l.5 2.600h4l.5-2.600a7.500 7.500 0 0 0 2.600-1.500l2.300 1 2-3.400z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="m16 16 4.500 4.500"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.500 6.500 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6.500 7l1 13h9l1-13"/>',
    eye: '<path d="M2 12s3.500-6.500 10-6.500S22 12 22 12s-3.500 6.500-10 6.500S2 12 2 12z"/><circle cx="12" cy="12" r="2.800"/>',
    download: '<path d="M12 4v11M7.500 10.500 12 15l4.500-4.500M4 20h16"/>',
    upload: '<path d="M12 16V5M7.500 9.500 12 5l4.500 4.500M4 20h16"/>',
    print: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="1.500"/><path d="M7 14h10v7H7z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', chevL: '<path d="m14.500 5-7 7 7 7"/>', chevR: '<path d="m9.500 5 7 7-7 7"/>', chevD: '<path d="m5 9.500 7 7 7-7"/>',
    alert: '<path d="M12 3 2 20.500h20z"/><path d="M12 10v5M12 17.800v.2"/>',
    clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7v5l3.500 2"/>',
    check: '<path d="m4.500 12.500 5 5 10-11"/>', link: '<path d="M10 14a4 4 0 0 0 5.700 0l3.500-3.500a4 4 0 0 0-5.700-5.700L12.500 5.800"/><path d="M14 10a4 4 0 0 0-5.700 0l-3.500 3.500a4 4 0 0 0 5.700 5.700l1-1"/>',
    clip: '<path d="m20 11.500-8.500 8.500a5 5 0 0 1-7-7L13 4.500a3.300 3.300 0 0 1 4.700 4.700L9.500 17.500a1.700 1.700 0 0 1-2.400-2.400L14.500 7.500"/>',
    moon: '<path d="M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300 7 7M17 17l1.700 1.700M18.700 5.300 17 7M7 17l-1.700 1.700"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', calendar: '<rect x="3.500" y="5" width="17" height="15.500" rx="2"/><path d="M3.500 10h17M8 3v4M16 3v4"/>',
    table: '<rect x="3.500" y="4.500" width="17" height="15" rx="1.500"/><path d="M3.500 9.500h17M3.500 14.500h17M9.500 4.500v15"/>',
    board: '<rect x="3.500" y="4" width="5" height="16" rx="1"/><rect x="9.500" y="4" width="5" height="11" rx="1"/><rect x="15.500" y="4" width="5" height="7" rx="1"/>',
    gantt: '<path d="M4 6h9M8 12h10M6 18h7"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="1.500"/><path d="M16 8V4H4v12h4"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5.500M12 7.800v.2"/>', user: '<circle cx="12" cy="8" r="3.800"/><path d="M4.500 20.500c.7-4 3.700-6 7.500-6s6.800 2 7.500 6"/>',
    sync: '<path d="M4 12a8 8 0 0 1 13.700-5.700L20 8.500M20 4v4.500h-4.500"/><path d="M20 12a8 8 0 0 1-13.700 5.700L4 15.500M4 20v-4.500h4.500"/>',
    filter: '<path d="M3.500 5h17l-6.500 8v6l-4-2v-4z"/>', layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12.500 9 5 9-5M3 17l9 5 9-5"/>'
  };
  A.icon = (name, size) => '<svg class="ic" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.info).replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
})(App);

if (typeof module !== 'undefined') module.exports = App;
