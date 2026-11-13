/* ============================================================
   30-logic.js — Nghiệp vụ: trạng thái, tổng hợp, cảnh báo, trợ lý điều hành
   Tất cả là phép tính trên dữ liệu đã nhập; không sửa số liệu gốc, không suy diễn ngoài dữ liệu.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store;
  const L = A.L = {};

  /* ================= NHIỆM VỤ ================= */
  L.nv = t => {
    const today = U.today(), o = { st: t.trangThai || 'chua', late: 0, left: null, treHan: false };
    if (t.trangThai === 'hoanthanh') { o.treHan = !!(t.han && t.ngayHT && t.ngayHT > t.han); o.late = o.treHan ? U.diffDays(t.ngayHT, t.han) : 0; o.label = o.treHan ? 'Hoàn thành trễ hạn' : 'Đã hoàn thành'; o.st = 'hoanthanh'; return o; }
    if (t.trangThai === 'tamdung') { o.label = 'Tạm dừng'; return o; }
    if (U.isISO(t.han)) {
      o.left = U.diffDays(t.han, today);
      if (o.left < 0) { o.st = 'quahan'; o.late = -o.left; o.label = 'Quá hạn ' + o.late + ' ngày'; return o; }
      if (o.left <= A.nguong('sapHan')) { o.st = 'saphan'; o.label = o.left === 0 ? 'Đến hạn hôm nay' : 'Còn ' + o.left + ' ngày'; o.base = t.trangThai || 'chua'; return o; }
    }
    o.label = t.trangThai === 'dang' ? 'Đang thực hiện' : 'Chưa triển khai';
    return o;
  };
  L.open = t => t.trangThai !== 'hoanthanh';
  // Nhiệm vụ thuộc năm đang xem: của năm đó, hoặc việc năm trước chưa xong (tồn chuyển sang)
  L.nvOfYear = y => {
    const all = S.all('nhiemvu'); if (!y) return all;
    return all.filter(t => +t.nam === y || (+t.nam < y && L.open(t) && t.trangThai !== 'tamdung' && y <= +U.today().slice(0, 4)));
  };
  L.nvStats = list => {
    const s = { tong: list.length, hoanthanh: 0, treHan: 0, dang: 0, chua: 0, quahan: 0, saphan: 0, tamdung: 0, khongHan: 0, chuaPC: 0 };
    list.forEach(t => {
      const v = L.nv(t);
      if (v.st === 'hoanthanh') { s.hoanthanh++; if (v.treHan) s.treHan++; return; }
      if (v.st === 'tamdung') { s.tamdung++; return; }
      if (v.st === 'quahan') s.quahan++; else if (v.st === 'saphan') s.saphan++;
      if (t.trangThai === 'dang') s.dang++; else s.chua++;
      if (!t.han) s.khongHan++;
      if (!t.chuTriId) s.chuaPC++;
    });
    s.tyLeHT = s.tong ? s.hoanthanh / s.tong * 100 : null;
    return s;
  };
  // Tồn đọng kéo dài: quá hạn vượt ngưỡng, hoặc việc không hạn chưa xong và lâu không cập nhật
  L.tonDong = t => {
    if (!L.open(t) || t.trangThai === 'tamdung') return null;
    const n = A.nguong('tonDong'), v = L.nv(t), today = U.today();
    if (v.st === 'quahan' && v.late > n) return { days: v.late, why: 'quá hạn ' + v.late + ' ngày (ngưỡng ' + n + ' ngày)' };
    if (!t.han && t.loaiTG !== 'thuongxuyen') {
      const last = (t.updatedAt || t.createdAt || '').slice(0, 10);
      if (U.isISO(last)) { const d = U.diffDays(today, last); if (d > n) return { days: d, why: 'không có hạn, ' + d + ' ngày chưa cập nhật (ngưỡng ' + n + ' ngày)' }; }
    }
    return null;
  };
  // Nguy cơ không hoàn thành: sắp đến hạn mà tiến độ dưới 50%, hoặc đã ghi nhận khó khăn
  L.nguyCo = t => {
    if (!L.open(t) || t.trangThai === 'tamdung') return null;
    const v = L.nv(t);
    if (v.st === 'saphan' && U.num(t.tienDo) < 50) return 'còn ' + v.left + ' ngày nhưng tiến độ mới ' + U.num(t.tienDo) + '%';
    if (v.st !== 'quahan' && (t.nguyenNhanCham || '').trim() && t.han) return 'đã ghi nhận khó khăn: ' + U.trunc(t.nguyenNhanCham, 90);
    return null;
  };
  // Điểm ưu tiên xử lý (minh bạch, hiển thị kèm lý do)
  L.priority = list => list.filter(t => L.open(t) && t.trangThai !== 'tamdung').map(t => {
    const v = L.nv(t); let score = 0; const why = [];
    if (v.st === 'quahan') { score += 100 + Math.min(v.late, 60); why.push('quá hạn ' + v.late + ' ngày'); }
    else if (v.st === 'saphan') { score += 60 + (A.nguong('sapHan') - v.left) * 4; why.push(v.left === 0 ? 'đến hạn hôm nay' : 'còn ' + v.left + ' ngày'); }
    if (t.uuTien === 'cao') { score += 25; why.push('ưu tiên cao'); }
    if (t.xinYKien) { score += 20; why.push('cần xin ý kiến lãnh đạo'); }
    if (!t.chuTriId) { score += 15; why.push('chưa phân công'); }
    if (L.nguyCo(t) && v.st === 'saphan') score += 10;
    return { t, v, score, why };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  L.byMonth = (list, y) => {
    const m = Array.from({ length: 12 }, () => ({ giao: 0, denHan: 0, hoanThanh: 0 }));
    list.forEach(t => {
      if (U.yearOf(t.ngayGiao) === y) m[+t.ngayGiao.slice(5, 7) - 1].giao++;
      if (U.yearOf(t.han) === y) m[+t.han.slice(5, 7) - 1].denHan++;
      if (t.trangThai === 'hoanthanh' && U.yearOf(t.ngayHT) === y) m[+t.ngayHT.slice(5, 7) - 1].hoanThanh++;
    });
    return m;
  };
  L.canBoStats = list => {
    const cbs = S.all('canbo').filter(c => c.trangThai !== 'nghi');
    const rows = cbs.map(c => {
      const mine = list.filter(t => t.chuTriId === c.id), ph = list.filter(t => (t.phoiHopIds || []).includes(c.id));
      const s = L.nvStats(mine);
      const done = mine.filter(t => t.trangThai === 'hoanthanh' && t.han);
      const dung = done.filter(t => !L.nv(t).treHan).length;
      return { c, s, phoiHop: ph.length, tyLeDungHan: done.length ? dung / done.length * 100 : null, dangMo: s.dang + s.chua };
    });
    return rows;
  };

  /* Sinh nhiệm vụ theo kỳ từ danh mục chức năng */
  L.kyList = (ky, y) => {
    const R = ['I', 'II', 'III', 'IV'];
    if (ky === 'thang') return Array.from({ length: 12 }, (_, i) => ({ key: y + '-T' + U.pad(i + 1), nhan: 'Tháng ' + (i + 1) + '/' + y, endM: i + 1 }));
    if (ky === 'quy') return R.map((r, i) => ({ key: y + '-Q' + (i + 1), nhan: 'Quý ' + r + '/' + y, endM: (i + 1) * 3 }));
    if (ky === '6thang') return [{ key: y + '-6T', nhan: '6 tháng đầu năm ' + y, endM: 6 }];
    if (ky === '9thang') return [{ key: y + '-9T', nhan: '9 tháng năm ' + y, endM: 9 }];
    if (ky === 'nam') return [{ key: y + '-N', nhan: 'Năm ' + y, endM: 12 }];
    return [];
  };
  // rule: {ngay: 1..31 | '', lechThang: 0|1}  — hạn do người dùng đặt; để trống thì không gán hạn
  L.kyHan = (p, y, rule) => {
    if (!rule || !rule.ngay) return '';
    let m = p.endM + (+rule.lechThang || 0), yy = y;
    while (m > 12) { m -= 12; yy++; }
    const d = Math.min(+rule.ngay, U.lastDayOfMonth(yy, m));
    return yy + '-' + U.pad(m) + '-' + U.pad(d);
  };
  L.genKy = (dm, y, kyTypes, rules) => {
    const have = new Set(S.all('nhiemvu').filter(t => t.dmId === dm.id).map(t => t.kyKey));
    const out = [];
    kyTypes.forEach(k => L.kyList(k, y).forEach(p => {
      out.push({
        dup: have.has(p.key),
        rec: {
          ten: dm.ten + ' — ' + p.nhan, dmId: dm.id, nhom: dm.nhom, canCu: dm.canCu, sanPham: dm.sanPham, nguon: 'Chức năng, nhiệm vụ của Phòng',
          loaiTG: 'dinhky', kyNhan: p.nhan, kyKey: p.key, vaiTro: 'chutri', chuTriId: dm.chuTriId || '', phoiHopIds: dm.phoiHopIds || [],
          han: L.kyHan(p, y, rules[k]), nam: y, trangThai: 'chua', tienDo: 0, uuTien: 'thuong'
        }
      });
    }));
    return out;
  };

  /* ================= VĂN BẢN ================= */
  L.vbTasks = vbId => S.all('nhiemvu').filter(t => (t.vanBanIds || []).includes(vbId));
  L.vb = v => {
    const tasks = L.vbTasks(v.id), today = U.today(), o = { tasks, st: v.trangThai || 'chua', late: 0, left: null };
    if (tasks.length) { // tình trạng suy ra từ các nhiệm vụ liên kết
      const done = tasks.filter(t => t.trangThai === 'hoanthanh').length;
      o.derived = true; o.done = done;
      o.st = done === tasks.length ? 'hoanthanh' : (done > 0 || tasks.some(t => t.trangThai === 'dang')) ? 'dang' : 'chua';
    }
    if (o.st === 'hoanthanh' || o.st === 'khongyc') { o.label = A.optLabel('ttVB', o.st); return o; }
    if (U.isISO(v.han)) {
      o.left = U.diffDays(v.han, today);
      if (o.left < 0) { o.over = true; o.late = -o.left; o.label = 'Quá hạn ' + o.late + ' ngày'; return o; }
      if (o.left <= A.nguong('sapHan')) { o.near = true; o.label = o.left === 0 ? 'Đến hạn hôm nay' : 'Còn ' + o.left + ' ngày'; return o; }
    }
    o.label = A.optLabel('ttVB', o.st); return o;
  };

  /* ================= DỰ ÁN ================= */
  L.daOfYear = y => {
    const all = S.all('duan'); if (!y) return all;
    return all.filter(d => {
      const a = U.yearOf(d.batDau), b = U.yearOf(d.ketThuc);
      if (a && a > y) return false;
      if (b && b < y && (d.trangThai === 'hoanthanh' || d.trangThai === 'quyettoan')) return false;
      return true;
    });
  };
  L.da = d => {
    const today = U.today(), near = A.nguong('sapHan');
    const moc = (d.moc || []).filter(m => m.trangThai !== 'khongad');
    const mocTre = moc.filter(m => m.trangThai !== 'hoanthanh' && U.isISO(m.ketThuc) && m.ketThuc < today);
    const mocSap = moc.filter(m => m.trangThai !== 'hoanthanh' && U.isISO(m.ketThuc) && m.ketThuc >= today && U.diffDays(m.ketThuc, today) <= near);
    const mocXong = moc.filter(m => m.trangThai === 'hoanthanh').length;
    const xong = d.trangThai === 'hoanthanh' || d.trangThai === 'quyettoan';
    const quaHanDA = !xong && U.isISO(d.ketThuc) && d.ketThuc < today;
    const o = { moc, mocTre, mocSap, mocXong, mocPct: moc.length ? mocXong / moc.length * 100 : null, xong, quaHanDA, cham: !xong && (mocTre.length > 0 || quaHanDA) };
    o.treMax = mocTre.reduce((mx, m) => Math.max(mx, U.diffDays(today, m.ketThuc)), quaHanDA ? U.diffDays(today, d.ketThuc) : 0);
    o.nguyCo = !xong && !o.cham && (mocSap.some(m => m.trangThai === 'chua') || d.trangThai === 'tamdung');
    o.next = moc.filter(m => m.trangThai !== 'hoanthanh' && U.isISO(m.ketThuc)).sort((a, b) => a.ketThuc < b.ketThuc ? -1 : 1)[0] || null;
    // Vốn của dự án (mọi năm)
    const vs = S.all('von').filter(v => v.duAnId === d.id).map(L.von);
    o.khVon = U.sum(vs, v => v.kh); o.giaiNgan = U.sum(vs, v => v.gn); o.tyLeGN = U.pct(o.giaiNgan, o.khVon);
    o.label = xong ? A.optLabel('ttDA', d.trangThai) : o.cham ? 'Chậm tiến độ' : o.nguyCo ? 'Có nguy cơ chậm' : A.optLabel('ttDA', d.trangThai || 'chuanbi');
    o.st = xong ? 'hoanthanh' : o.cham ? 'quahan' : o.nguyCo ? 'saphan' : (d.trangThai === 'dangth' ? 'dang' : d.trangThai === 'tamdung' ? 'tamdung' : 'chua');
    return o;
  };

  /* ================= KẾ HOẠCH VỐN ================= */
  // Tỷ lệ thời gian đã qua của năm ngân sách (để so tương đối; không phải quy định pháp lý)
  L.yearElapsed = y => {
    const t = U.today(), ty = +t.slice(0, 4);
    if (y < ty) return 100; if (y > ty) return 0;
    const days = U.diffDays(t, y + '-01-01') + 1, total = U.diffDays((y + 1) + '-01-01', y + '-01-01');
    return days / total * 100;
  };
  L.von = v => {
    const rows = (v.capNhat || []).filter(r => U.isISO(r.ngay)).slice().sort((a, b) => a.ngay < b.ngay ? -1 : 1);
    const last = rows[rows.length - 1] || null;
    const kh = U.num(v.khGiao) + U.num(v.keoDai) + U.num(v.dcTang) - U.num(v.dcGiam);
    const gn = last ? U.num(last.luyKe) : 0;
    const o = { v, rows, kh, gn, ngayGN: last ? last.ngay : '', conLai: kh - gn, tyLe: U.pct(gn, kh), khDauNam: U.num(v.khGiao) };
    const el = L.yearElapsed(+v.nam), lech = A.nguong('gnLech');
    o.tgNam = el;
    o.thap = kh > 0 && (o.tyLe === null ? 0 : o.tyLe) < el - lech;
    const d = S.get('duan', v.duAnId);
    o.thapSoTienDo = !!(d && kh > 0 && U.num(d.tienDo) - (o.tyLe || 0) > lech);
    return o;
  };
  L.vonOfYear = y => S.all('von').filter(v => !y || +v.nam === y).map(L.von);
  L.vonGroup = (list, keyFn) => {
    const m = new Map();
    list.forEach(o => {
      const k = keyFn(o) || '(chưa xác định)';
      const g = m.get(k) || { k, kh: 0, khDauNam: 0, gn: 0, n: 0 };
      g.kh += o.kh; g.khDauNam += o.khDauNam; g.gn += o.gn; g.n++; m.set(k, g);
    });
    return Array.from(m.values()).map(g => Object.assign(g, { conLai: g.kh - g.gn, tyLe: U.pct(g.gn, g.kh) })).sort((a, b) => b.kh - a.kh);
  };
  // Giải ngân lũy kế theo tháng (lấy số lũy kế mới nhất tính đến cuối mỗi tháng)
  L.vonByMonth = (list, y) => {
    const out = [], t = U.today(), lastM = +t.slice(0, 4) === y ? +t.slice(5, 7) : (+t.slice(0, 4) > y ? 12 : 0);
    for (let m = 1; m <= 12; m++) {
      if (m > lastM) { out.push(null); continue; }
      const end = y + '-' + U.pad(m) + '-' + U.pad(U.lastDayOfMonth(y, m));
      let s = 0, has = false;
      list.forEach(o => { const r = o.rows.filter(x => x.ngay <= end).pop(); if (r) { s += U.num(r.luyKe); has = true; } });
      out.push(has ? s : 0);
    }
    return out;
  };

  /* ================= NGÂN SÁCH ================= */
  L.NS_F = ['chuyenNguon', 'duToan', 'boSung', 'dcTang', 'dcGiam', 'thuHoi', 'tietKiem', 'giaiNgan', 'quyetToan'];
  L.nsTong = x => U.num(x.chuyenNguon) + U.num(x.duToan) + U.num(x.boSung) + U.num(x.dcTang) - U.num(x.dcGiam) - U.num(x.thuHoi) - U.num(x.tietKiem);
  // Cây dự toán của 1 đơn vị / năm. Dòng có con: số = tổng các con (không cộng trùng).
  L.nsTree = (nam, donViId) => {
    const rows = S.all('ngansach').filter(r => (!nam || +r.nam === nam) && (!donViId || r.donViId === donViId));
    const byId = new Map(rows.map(r => [r.id, { r, children: [], sum: {}, level: 0 }]));
    const roots = [];
    byId.forEach(n => { const p = n.r.parentId && byId.get(n.r.parentId); if (p && p !== n) p.children.push(n); else roots.push(n); });
    const ord = (a, b) => (U.num(a.r.thuTu) - U.num(b.r.thuTu)) || U.cmp(a.r.stt, b.r.stt);
    const seen = new Set();
    const calc = (n, lv) => {
      if (seen.has(n)) return; seen.add(n);
      n.level = lv; n.children.sort(ord);
      n.children.forEach(c => calc(c, lv + 1));
      L.NS_F.forEach(f => { n.sum[f] = n.children.length ? U.sum(n.children, c => c.sum[f]) : U.num(n.r[f]); });
      n.sum.tong = L.nsTong(n.sum); n.sum.conLai = n.sum.tong - n.sum.giaiNgan; n.sum.tyLe = U.pct(n.sum.giaiNgan, n.sum.tong);
      // Đối chiếu: số tổng nhập từ Excel (nếu có) khác tổng các dòng con
      n.lech = [];
      if (n.children.length && n.r.goc) L.NS_F.concat(['tong']).forEach(f => {
        if (n.r.goc[f] !== undefined && n.r.goc[f] !== null && Math.abs(U.num(n.r.goc[f]) - n.sum[f]) > 0.5) n.lech.push({ f, goc: U.num(n.r.goc[f]), tinh: n.sum[f] });
      });
    };
    roots.sort(ord).forEach(r => calc(r, 0));
    const flat = []; const walk = n => { flat.push(n); n.children.forEach(walk); }; roots.forEach(walk);
    const total = {}; L.NS_F.forEach(f => { total[f] = U.sum(roots, r => r.sum[f]); });
    total.tong = L.nsTong(total); total.conLai = total.tong - total.giaiNgan; total.tyLe = U.pct(total.giaiNgan, total.tong);
    return { roots, flat, total, count: rows.length };
  };
  L.nsByDonVi = nam => S.all('donvi').map(dv => { const t = L.nsTree(nam, dv.id); return { dv, total: t.total, count: t.count }; }).filter(x => x.count);
  L.nsByNhom = nam => {
    const t = L.nsTree(nam, null), m = new Map();
    const leafs = t.flat.filter(n => !n.children.length);
    const nhomOf = n => { let cur = n, guard = 0; const byId = new Map(t.flat.map(x => [x.r.id, x])); while (cur && guard++ < 20) { if (cur.r.nhomKP) return cur.r.nhomKP; cur = byId.get(cur.r.parentId); } return '(chưa phân nhóm)'; };
    leafs.forEach(n => { const k = nhomOf(n); const g = m.get(k) || { k, tong: 0, giaiNgan: 0, quyetToan: 0, duToan: 0 }; g.tong += n.sum.tong; g.giaiNgan += n.sum.giaiNgan; g.quyetToan += n.sum.quyetToan; g.duToan += n.sum.duToan; m.set(k, g); });
    return Array.from(m.values());
  };

  /* Ghép dòng biểu mới với dòng dự toán đã có (giữ mã dòng, lịch sử giải ngân, cán bộ):
     1) trùng số thứ tự + nội dung; 2) trùng nội dung; 3) nội dung chỉ khác dấu câu, khoảng trắng;
     4) cùng số thứ tự và cùng dòng cha, nội dung giống ≥ 75% (sửa chữ, đánh lại số) */
  L.nsGhepDong = (items, old) => {
    const ch = s => U.norm(s).replace(/[^a-z0-9]+/g, ' ').trim(), used = new Set(), by = (f) => { const m = new Map(); old.forEach(r => { const k = f(r); if (k && !m.has(k)) m.set(k, r); }); return m; };
    const k1 = by(r => U.norm(r.stt) + '|' + U.norm(r.noiDung)), k2 = by(r => U.norm(r.noiDung)), k3 = by(r => ch(r.noiDung));
    const tu = (a, b) => { const x = ch(a).split(' ').filter(w => w.length > 1), y = new Set(ch(b).split(' ').filter(w => w.length > 1)); if (!x.length || !y.size) return 0; const c = x.filter(w => y.has(w)).length; return 2 * c / (x.length + y.size); };
    const out = items.map(() => null), lay = (i, r) => { if (r && !used.has(r.id)) { used.add(r.id); out[i] = r; return true; } return false; };
    items.forEach((it, i) => { lay(i, k1.get(U.norm(it.stt) + '|' + U.norm(it.noiDung))); });
    items.forEach((it, i) => { if (!out[i]) lay(i, k2.get(U.norm(it.noiDung))); });
    items.forEach((it, i) => { if (!out[i]) lay(i, k3.get(ch(it.noiDung))); });
    items.forEach((it, i) => {
      if (out[i]) return;
      const chaMoi = it.parent >= 0 ? out[it.parent] : null;
      let best = null, bs = 0.75;
      old.forEach(r => { if (used.has(r.id) || U.norm(r.stt) !== U.norm(it.stt)) return; if (chaMoi ? r.parentId !== chaMoi.id : !!r.parentId && it.parent >= 0) return; const v = tu(it.noiDung, r.noiDung); if (v >= bs) { bs = v; best = r; } });
      lay(i, best);
    });
    return out;
  };

  /* Đọc biểu "Báo cáo tình hình thực hiện giải ngân thanh toán NSNN" (mẫu Phòng đang dùng).
     rows: mảng 2 chiều giá trị thô; fmt: mảng 2 chiều chuỗi hiển thị (để lấy STT đúng như trên biểu). */
  L.parseBudget = (rows, fmt) => {
    const nrm = v => U.norm(v), out = { items: [], warnings: [], headerRow: -1, title: '' };
    let hr = -1;
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const r = (rows[i] || []).map(nrm);
      if (r.some(c => c === 'noi dung') && r.some(c => c.includes('du toan giao') || c.includes('du toan duoc giao'))) { hr = i; break; }
    }
    if (hr < 0) { out.warnings.push('Không tìm thấy dòng tiêu đề có cột "Nội dung" và "Dự toán giao đầu năm". Biểu không đúng mẫu.'); return out; }
    out.headerRow = hr;
    for (let i = 0; i < hr; i++) { const t = (rows[i] || []).find(c => typeof c === 'string' && nrm(c).includes('bao cao')); if (t) { out.title = String(t).trim(); break; } }
    const col = {}, H = (rows[hr] || []).map(nrm);
    const find = (key, test) => { const i = H.findIndex(test); if (i >= 0 && col[key] === undefined) col[key] = i; };
    find('stt', c => c === 'tt' || c === 'stt'); find('noiDung', c => c === 'noi dung');
    find('quyetDinh', c => c.startsWith('quyet dinh')); find('chuyenNguon', c => c.includes('chuyen nguon'));
    find('duToan', c => c.includes('du toan giao') || c.includes('du toan duoc giao')); find('boSung', c => /^(kp |kinh phi )?bo sung/.test(c));
    find('thuHoi', c => c.includes('thu hoi')); find('tietKiem', c => c.includes('tiet kiem'));
    find('tong', c => /^tong (kinh phi|kp)/.test(c)); find('giaiNgan', c => c.includes('da giai ngan'));
    find('conLai', c => c.includes('kinh phi con lai') || c === 'con lai'); find('tienDo', c => c.includes('tien do')); find('ghiChu', c => c === 'ghi chu'); find('tyLe', c => c.includes('ty le'));
    find('keToan', c => c.includes('ke toan') || c === 'thuc hien');
    for (let i = hr + 1; i <= hr + 3 && i < rows.length; i++) (rows[i] || []).forEach((c, j) => { const t = nrm(c); if (t === 'tang' && col.dcTang === undefined) col.dcTang = j; if (t === 'giam' && col.dcGiam === undefined) col.dcGiam = j; });
    const dc = H.findIndex(c => c === 'dieu chinh');
    if (col.dcTang === undefined && dc >= 0) { col.dcTang = dc; col.dcGiam = dc + 1; }
    ['noiDung', 'duToan', 'giaiNgan'].forEach(k => { if (col[k] === undefined) out.warnings.push('Thiếu cột bắt buộc: ' + k); });
    if (col.noiDung === undefined) return out;
    out.cols = col;
    if (col.giaiNgan !== undefined) { const m = String(rows[hr][col.giaiNgan] || '').match(/(\d{1,2}\/\d{1,2}\/\d{4})/); if (m) out.ngaySoLieu = U.parseDate(m[1]); }
    { const m = out.title.match(/năm\s*(\d{4})/i) || String(rows[hr][col.duToan] || '').match(/(\d{4})/); if (m) out.nam = +m[1]; }
    // dòng bắt đầu dữ liệu: sau dòng đánh số cột (1,2,3…)
    let start = hr + 1;
    for (let i = hr + 1; i <= hr + 4 && i < rows.length; i++) { const r = rows[i] || []; if (String(r[col.noiDung]).trim() === '2' && String(r[col.stt === undefined ? 0 : col.stt]).trim() === '1') { start = i + 1; break; } if ((r || []).some(c => ['tang', 'giam'].includes(nrm(c)))) start = i + 1; }
    const money = v => { if (typeof v === 'number') return v; const n = U.parseNum(v); return (n === null || n === '') ? 0 : n; };
    const stack = []; // [{level, idx}]
    let lastNumLevel = 0, dashLevel = null, blankLevel = null, prevLevel = 0;
    for (let i = start; i < rows.length; i++) {
      const r = rows[i] || [], nd = r[col.noiDung];
      if (nd === null || nd === undefined || String(nd).trim() === '') continue;
      const rawS = col.stt === undefined ? '' : r[col.stt];
      let sttTxt = (fmt && fmt[i] && col.stt !== undefined && fmt[i][col.stt] !== undefined && fmt[i][col.stt] !== null) ? String(fmt[i][col.stt]).trim() : (rawS === null || rawS === undefined ? '' : String(rawS).trim());
      if (typeof rawS === 'number' && rawS < 0 && Number.isInteger(rawS)) sttTxt = '(' + (-rawS) + ')';  // Excel hiểu "(1)" là -1
      let level, kind;
      const s = sttTxt.replace(/\s/g, '');
      if (/^[IVXLC]+$/.test(s)) { level = 0; kind = 'num'; }
      else if (/^\d+$/.test(s)) { level = 1; kind = 'num'; }
      else if (/^\d+\.\d+$/.test(s)) { level = 2; kind = 'num'; }
      else if (/^\(\d+\)$/.test(s) || /^-\d+$/.test(s)) { level = Math.max(3, lastNumLevel >= 2 ? 3 : lastNumLevel + 1); kind = 'num'; }
      else if (s === '-' || s === '+') { kind = 'dash'; level = dashLevel !== null ? dashLevel : prevLevel + 1; dashLevel = level; blankLevel = null; }
      else if (s === '') { kind = 'blank'; level = blankLevel !== null ? blankLevel : prevLevel + 1; blankLevel = level; }
      else { kind = 'num'; level = Math.min(prevLevel + 1, 3); }
      if (kind === 'num') { lastNumLevel = level; dashLevel = null; blankLevel = null; }
      if (!stack.length && level > 0) level = 0;
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      const parent = stack.length ? stack[stack.length - 1].idx : -1;
      const it = { row: i + 1, stt: sttTxt, noiDung: String(nd).trim().replace(/\s+/g, ' '), level, parent };
      ['chuyenNguon', 'duToan', 'boSung', 'dcTang', 'dcGiam', 'thuHoi', 'tietKiem', 'giaiNgan'].forEach(k => { it[k] = col[k] === undefined ? 0 : money(r[col[k]]); });
      it.tongGoc = col.tong === undefined ? null : money(r[col.tong]);
      it.quyetDinh = col.quyetDinh === undefined || r[col.quyetDinh] == null ? '' : String(r[col.quyetDinh]).trim();
      it.tienDo = col.tienDo === undefined || r[col.tienDo] == null ? '' : String(r[col.tienDo]).trim();
      it.keToan = col.keToan === undefined || r[col.keToan] == null ? '' : String(r[col.keToan]).trim();
      it.ghiChuBieu = col.ghiChu === undefined || r[col.ghiChu] == null ? '' : String(r[col.ghiChu]).trim().replace(/\s+/g, ' ');
      it.conLaiGoc = col.conLai === undefined ? null : money(r[col.conLai]);
      if (/^[0.]+$/.test(it.tienDo)) it.tienDo = '';
      out.items.push(it); stack.push({ level, idx: out.items.length - 1 }); prevLevel = level;
    }
    // Đối chiếu số học ngay trên biểu
    const kids = out.items.map(() => []); out.items.forEach((it, i) => { if (it.parent >= 0) kids[it.parent].push(i); });
    out.items.forEach((it, i) => {
      it.isGroup = kids[i].length > 0;
      if (it.conLaiGoc !== null && it.tongGoc !== null && Math.abs(it.tongGoc - it.giaiNgan - it.conLaiGoc) > 0.5)
        out.warnings.push('Dòng ' + it.row + ' "' + U.trunc(it.noiDung, 50) + '": Kinh phí còn lại trên biểu (' + U.fmtMoney(it.conLaiGoc) + ') khác Tổng KP được sử dụng − Đã giải ngân (' + U.fmtMoney(it.tongGoc - it.giaiNgan) + ').');
      if (!it.isGroup && it.giaiNgan > L.nsTong(it) + 0.5)
        out.warnings.push('Dòng ' + it.row + ' "' + U.trunc(it.noiDung, 50) + '": đã giải ngân (' + U.fmtMoney(it.giaiNgan) + ') lớn hơn tổng kinh phí được sử dụng (' + U.fmtMoney(L.nsTong(it)) + ').');
      if (!it.isGroup && it.tongGoc !== null && Math.abs(L.nsTong(it) - it.tongGoc) > 0.5)
        out.warnings.push('Dòng ' + it.row + ' "' + U.trunc(it.noiDung, 50) + '": cột Tổng kinh phí trên biểu (' + U.fmtMoney(it.tongGoc) + ') khác kết quả tính từ các cột thành phần (' + U.fmtMoney(L.nsTong(it)) + ').');
    });
    const sumKids = (i, k) => kids[i].length ? U.sum(kids[i], j => sumKids(j, k)) : out.items[i][k];
    out.items.forEach((it, i) => {
      if (!it.isGroup) return;
      const NM = { chuyenNguon: 'Chuyển nguồn', duToan: 'Dự toán đầu năm', boSung: 'Bổ sung', dcTang: 'Điều chỉnh tăng', dcGiam: 'Điều chỉnh giảm', thuHoi: 'Thu hồi', giaiNgan: 'Giải ngân' };
      const bad = Object.keys(NM).filter(k => Math.abs(sumKids(i, k) - it[k]) > 0.5);
      if (bad.length) out.warnings.push('Dòng ' + it.row + ' "' + U.trunc(it.noiDung, 50) + '": số trên dòng tổng khác tổng các dòng chi tiết (' + bad.map(k => NM[k] + ': ' + U.fmtMoney(it[k]) + ' ≠ ' + U.fmtMoney(sumKids(i, k))).join('; ') + ').');
    });
    return out;
  };

  /* ================= TÀI SẢN ================= */
  L.tsGroup = (list, keyFn) => {
    const m = new Map();
    list.forEach(t => { const k = keyFn(t) || '(chưa xác định)'; const g = m.get(k) || { k, n: 0, nguyenGia: 0, conLai: 0, dtNha: 0, dtDat: 0 }; g.n += U.num(t.soLuong) || 1; g.nguyenGia += U.num(t.nguyenGia); g.conLai += U.num(t.conLai); g.dtNha += U.num(t.dtNha); g.dtDat += U.num(t.dtDat); m.set(k, g); });
    return Array.from(m.values()).sort((a, b) => b.nguyenGia - a.nguyenGia);
  };
  /* ---- Tài sản nhà, đất (Phụ biểu 0A.01-T.STC) ---- */
  L.ND_LOAI = ['Cơ sở nhà, đất', 'Trụ sở, nhà làm việc'];
  const has = v => v !== undefined && v !== null && v !== '';
  L.isNhaDat = t => L.ND_LOAI.includes(t.loai) || has(t.dtNha) || has(t.dtDat) || !!t.gcnTT || !!t.donViGiao;
  L.ndDonVi = t => t.donViGiao || A.Schema.refName('donvi', t.donViId) || '(chưa ghi đơn vị)';
  L.ndStats = list => {
    const s = { n: list.length, dtNha: 0, dtDat: 0, nguyenGia: 0, conLai: 0, daCap: 0, chuaCap: 0, matMat: 0, chuaRo: 0, chuaDK: 0, hsThieu: 0, hsDayDu: 0, dung: 0, khongDung: 0, donVi: new Set() };
    list.forEach(t => {
      s.dtNha += U.num(t.dtNha); s.dtDat += U.num(t.dtDat); s.nguyenGia += U.num(t.nguyenGia); s.conLai += U.num(t.conLai); s.donVi.add(U.norm(L.ndDonVi(t)));
      if (t.gcnTT === 'dacap') s.daCap++; else if (t.gcnTT === 'chuacap') s.chuaCap++; else if (t.gcnTT === 'matmat') s.matMat++; else s.chuaRo++;
      if (t.chuaDKBD) s.chuaDK++; if (t.hsThieu) s.hsThieu++; if (t.hsDayDu) s.hsDayDu++;
      if (t.htSD === 'dung') s.dung++; else if (t.htSD === 'khongdung') s.khongDung++;
    });
    s.soDonVi = s.donVi.size; return s;
  };
  L.ndHoSo = t => t.gcnTT === 'dacap' ? ['hoanthanh', 'Đã cấp GCN'] : t.gcnTT === 'chuacap' ? ['quahan', 'Chưa cấp GCN'] : t.gcnTT === 'matmat' ? ['saphan', 'GCN mất, thất lạc'] : ['', 'Chưa ghi GCN'];

  /* Đọc Phụ biểu 0A.01-T.STC. rows: mảng 2 chiều giá trị thô (raw:true). Nhận cột theo tiêu đề, không theo vị trí. */
  L.parseNhaDat = rows => {
    const out = { items: [], warnings: [], title: '', cols: {}, tong: null, headerRow: -1 };
    const T = (r, c) => U.norm((rows[r] || [])[c]).replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
    let hr = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) { const r = (rows[i] || []).map((_, c) => T(i, c)); if (r.some(c => c.includes('duoc giao quan ly')) && r.some(c => c === 'ten tai san')) { hr = i; break; } }
    if (hr < 0) { out.warnings.push('Không tìm thấy dòng tiêu đề có cột "Tên cơ quan, đơn vị đang được giao quản lý" và "Tên tài sản". Tệp không đúng Phụ biểu 0A.01-T.STC.'); return out; }
    out.headerRow = hr;
    for (let i = 0; i < hr; i++) { const t = (rows[i] || []).find(c => typeof c === 'string' && /tong hop hien trang/.test(U.norm(c))); if (t) { out.title = String(t).trim(); break; } }
    const C = out.cols, set = (k, c) => { if (C[k] === undefined) C[k] = c; };
    for (let r = hr; r <= hr + 3 && r < rows.length; r++) (rows[r] || []).forEach((_, c) => {
      const t = T(r, c); if (!t) return;
      if (t === 'stt' || t === 'tt') set('stt', c);
      else if (t.includes('duoc giao quan ly')) set('donVi', c);
      else if (t === 'ten tai san') set('ten', c);
      else if (t.startsWith('dien tich nha')) set('dtNha', c);
      else if (t.startsWith('dien tich dat')) set('dtDat', c);
      else if (t === 'nguyen gia') set('nguyenGia', c);
      else if (t.startsWith('gia tri con lai')) set('conLai', c);
      else if (t === 'dung muc dich') set('dung', c);
      else if (t === 'khong dung muc dich') set('khongDung', c);
      else if (t.startsWith('nguyen nhan')) set('nguyenNhan', c);
      else if (t.includes('mat mat') || t.includes('that lac')) set('matMat', c);
      else if (t.startsWith('chua duoc cap giay')) set('chuaCap', c);
      else if (t.startsWith('da duoc cap giay')) set('daCap', c);
      else if (t.includes('day du ho so hinh thanh')) set('hsDayDu', c);
      else if (t.includes('chua dang ky') && t.includes('bien dong')) set('chuaDK', c);
      else if (t.includes('thieu ho so hinh thanh')) set('hsThieu', c);
      else if (t === 'ghi chu') set('ghiChu', c);
    });
    ['donVi', 'ten'].forEach(k => { if (C[k] === undefined) out.warnings.push('Thiếu cột bắt buộc: ' + (k === 'ten' ? 'Tên tài sản' : 'Tên cơ quan, đơn vị đang được giao quản lý')); });
    if (C.ten === undefined || C.donVi === undefined) return out;
    const NAMES = { stt: 'STT', dtNha: 'Diện tích nhà', dtDat: 'Diện tích đất', nguyenGia: 'Nguyên giá', conLai: 'Giá trị còn lại', dung: 'Đúng mục đích', khongDung: 'Không đúng mục đích', daCap: 'Đã được cấp GCN', hsDayDu: 'Đầy đủ hồ sơ', matMat: 'Mất mát, thất lạc', chuaCap: 'Chưa được cấp GCN', chuaDK: 'Chưa đăng ký biến động', hsThieu: 'Thiếu hồ sơ', nguyenNhan: 'Nguyên nhân', ghiChu: 'Ghi chú' };
    const miss = Object.keys(NAMES).filter(k => C[k] === undefined); if (miss.length) out.warnings.push('Biểu không có cột: ' + miss.map(k => NAMES[k]).join(', ') + ' — các trường này để trống.');
    const v = (row, k) => C[k] === undefined ? null : row[C[k]];
    const str = x => (x === null || x === undefined) ? '' : String(x).replace(/\s+/g, ' ').trim();
    const tick = x => str(x) !== '';
    const textSum = { dtNha: 0, dtDat: 0, nguyenGia: 0, conLai: 0 }, excelDate = [];
    const num = (x, r, label, k) => { if (x === null || x === undefined || str(x) === '') return ''; const n = typeof x === 'number' ? x : U.parseNum(x); if (n === null || n === '') { out.warnings.push('Dòng ' + (r + 1) + ': ' + label + ' "' + str(x) + '" không phải số — để trống.'); return ''; } if (typeof x !== 'number') { textSum[k] += n; out.warnings.push('Dòng ' + (r + 1) + ': ' + label + ' ghi dạng chữ "' + str(x) + '", đọc thành ' + U.fmtNum(n) + '.'); } return n; };
    const seen = new Map();
    for (let r = hr + 1; r < rows.length; r++) {
      const row = rows[r] || [], ten = str(v(row, 'ten')), dv = str(v(row, 'donVi')), sttRaw = v(row, 'stt');
      const stt = typeof sttRaw === 'number' ? sttRaw : U.parseNum(sttRaw);
      if (!ten && !dv) continue;
      if (stt === '' || stt === null) {   // dòng tổng hoặc dòng tiêu đề nhóm
        if (dv && !ten && out.tong === null && ['dtNha', 'dtDat', 'nguyenGia', 'conLai'].some(k => typeof v(row, k) === 'number')) out.tong = { row: r + 1, ten: dv, dtNha: U.num(v(row, 'dtNha')), dtDat: U.num(v(row, 'dtDat')), nguyenGia: U.num(v(row, 'nguyenGia')), conLai: U.num(v(row, 'conLai')) };
        continue;
      }
      if (!ten) { out.warnings.push('Dòng ' + (r + 1) + ': thiếu tên tài sản — bỏ qua.'); continue; }
      const it = { row: r + 1, stt, donViGiao: dv, ten, dtNha: num(v(row, 'dtNha'), r, 'diện tích nhà', 'dtNha'), dtDat: num(v(row, 'dtDat'), r, 'diện tích đất', 'dtDat'), nguyenGia: num(v(row, 'nguyenGia'), r, 'nguyên giá', 'nguyenGia'), conLai: num(v(row, 'conLai'), r, 'giá trị còn lại', 'conLai'),
        htSD: '', gcnTT: '', gcnSo: '', gcnNgay: '', hsDayDu: tick(v(row, 'hsDayDu')), hsThieu: tick(v(row, 'hsThieu')), chuaDKBD: tick(v(row, 'chuaDK')), nguyenNhanHS: str(v(row, 'nguyenNhan')), ghiChuBieu: str(v(row, 'ghiChu')) };
      const dung = tick(v(row, 'dung')), kd = tick(v(row, 'khongDung'));
      if (dung && kd) out.warnings.push('Dòng ' + (r + 1) + ' "' + U.trunc(ten, 50) + '": đánh dấu cả "đúng mục đích" và "không đúng mục đích".');
      it.htSD = kd ? 'khongdung' : dung ? 'dung' : '';
      // Cột "Đã được cấp GCN": có thể là dấu x, số GCN, ngày cấp (chuỗi hoặc ngày Excel)
      const dc = v(row, 'daCap'), cc = tick(v(row, 'chuaCap')), mm = tick(v(row, 'matMat'));
      if (typeof dc === 'number') { const d = U.parseDate(dc); if (d) { it.gcnNgay = d; it.gcnSo = 'Cấp ngày ' + U.fmtDate(d); excelDate.push(r + 1); } else it.gcnSo = String(dc); }
      else if (tick(dc) && !/^x$/i.test(str(dc))) {
        it.gcnSo = str(dc);
        const m = it.gcnSo.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) { const d = U.parseDate(m[0]); if (d) it.gcnNgay = d; else out.warnings.push('Dòng ' + (r + 1) + ': ngày cấp GCN "' + m[0] + '" không hợp lệ.'); }
      }
      it.gcnTT = mm ? 'matmat' : cc ? 'chuacap' : tick(dc) ? 'dacap' : '';
      if (cc && tick(dc)) out.warnings.push('Dòng ' + (r + 1) + ' "' + U.trunc(ten, 50) + '": vừa có thông tin "đã cấp GCN" vừa đánh dấu "chưa được cấp" — ghi nhận là chưa cấp.');
      if (it.hsDayDu && it.hsThieu) out.warnings.push('Dòng ' + (r + 1) + ' "' + U.trunc(ten, 50) + '": vừa đánh dấu "đầy đủ hồ sơ" vừa "thiếu hồ sơ hình thành tài sản".');
      if (it.nguyenGia !== '' && it.conLai !== '' && it.conLai > it.nguyenGia) out.warnings.push('Dòng ' + (r + 1) + ' "' + U.trunc(ten, 50) + '": giá trị còn lại lớn hơn nguyên giá.');
      // Khóa nhận diện để nhập lại kỳ sau: đơn vị + tên; trùng trong cùng biểu thì đánh số thứ tự lần xuất hiện
      const key = U.norm(dv) + '|' + U.norm(ten), prev = seen.get(key) || [];
      if (prev.length) out.warnings.push('Dòng ' + (r + 1) + ' trùng đơn vị và tên tài sản với dòng ' + prev.join(', ') + ' (số liệu khác nhau) — vẫn nhập thành cơ sở riêng; nên ghi rõ tên để phân biệt.');
      it.ndKey = key + (prev.length ? '#' + (prev.length + 1) : '');
      seen.set(key, prev.concat([r + 1]));
      out.items.push(it);
    }
    if (excelDate.length) out.warnings.push('Ngày cấp GCN ở các dòng ' + excelDate.join(', ') + ' được lưu dạng ngày của Excel; phần mềm đọc theo ngày/tháng/năm của Excel — đối chiếu với giấy chứng nhận vì khi gõ, Excel có thể đã đảo ngày và tháng.');
    if (out.tong) {
      const NM = { dtNha: 'Diện tích nhà', dtDat: 'Diện tích đất', nguyenGia: 'Nguyên giá', conLai: 'Giá trị còn lại' };
      Object.keys(NM).forEach(k => {
        const sum = U.sum(out.items, x => x[k]), d = sum - out.tong[k]; if (Math.abs(d) <= 0.01) return;
        out.warnings.push('Dòng tổng (dòng ' + out.tong.row + '): ' + NM[k] + ' ghi ' + U.fmtNum(out.tong[k]) + ', tổng các dòng chi tiết là ' + U.fmtNum(sum) + ' (chênh ' + U.fmtNum(d) + ')' + (textSum[k] && Math.abs(d - textSum[k]) <= 0.01 ? ' — đúng bằng các ô ghi số dạng chữ: hàm SUM của Excel không cộng các ô này, cần sửa ô về dạng số trên biểu gốc.' : '.'));
      });
    }
    return out;
  };
  L.ndKey = t => t.ndKey || (U.norm(t.donViGiao) + '|' + U.norm(t.ten));

  L.tsCanXuLy = () => S.all('taisan').filter(t => ['Hư hỏng, chờ sửa chữa', 'Không còn nhu cầu sử dụng', 'Chờ điều chuyển', 'Chờ thanh lý'].includes(t.tinhTrang));

  /* ================= ĐẤU THẦU, HỢP ĐỒNG ================= */
  const GT_THU_TU = ['nhucau', 'dutoan', 'trinhkh', 'khlcnt', 'danglcnt', 'cokq', 'dakyhd'];
  L.gtBuoc = g => Math.max(0, GT_THU_TU.indexOf(g.trangThai || 'nhucau'));
  L.gt = g => {
    const today = U.today(), o = { st: 'chua', label: A.optLabel('ttGT', g.trangThai || 'nhucau') };
    const truocKQ = ['nhucau', 'dutoan', 'trinhkh', 'khlcnt', 'danglcnt'].includes(g.trangThai || 'nhucau');
    if (g.trangThai === 'dakyhd') o.st = 'hoanthanh'; else if (g.trangThai === 'huy') o.st = 'tamdung'; else if (['danglcnt', 'cokq', 'khlcnt', 'trinhkh'].includes(g.trangThai)) o.st = 'dang';
    if (truocKQ && U.isISO(g.hanLCNT)) {
      const left = U.diffDays(g.hanLCNT, today);
      if (left < 0) { o.over = true; o.st = 'quahan'; o.note = 'Quá thời hạn lựa chọn nhà thầu ' + (-left) + ' ngày'; }
      else if (left <= A.nguong('sapHan')) { o.near = true; o.st = 'saphan'; o.note = 'Còn ' + left + ' ngày đến hạn lựa chọn nhà thầu'; }
    }
    if (g.trangThai === 'cokq' && !S.all('hopdong').some(h => h.goiThauId === g.id)) o.chuaHD = true;
    o.tietKiem = U.num(g.giaTrung) > 0 && U.num(g.giaGoiThau) > 0 ? U.num(g.giaGoiThau) - U.num(g.giaTrung) : null;
    o.buocCuoi = (g.tienTrinh || []).filter(x => U.isISO(x.ngay)).sort((a, b) => a.ngay < b.ngay ? 1 : -1)[0] || null;
    return o;
  };
  // Giá trị, thời hạn hiệu lực của hợp đồng sau các phụ lục
  L.hdGiaTri = h => U.num(h.giaTri) + U.sum(h.phuLuc || [], x => x.giaTriDC);
  L.hdHan = h => { const g = (h.phuLuc || []).map(x => x.giaHanDen).filter(U.isISO).sort().pop(); return g && (!h.ngayKT || g > h.ngayKT) ? g : (h.ngayKT || ''); };
  L.hd = h => {
    const today = U.today(), tt = U.sum(h.thanhToan || [], x => x.soTien), nt = U.sum(h.nghiemThu || [], x => x.giaTri), gt = L.hdGiaTri(h), han = L.hdHan(h), dang = (h.trangThai || 'dang') === 'dang', chuaTL = !['thanhly', 'chamdut'].includes(h.trangThai);
    const o = { giaTriHL: gt, han, giaHan: han && h.ngayKT && han !== h.ngayKT, thanhToan: tt, nghiemThu: nt, conLai: gt - tt, tyLeTT: U.pct(tt, gt), st: 'dang', label: A.optLabel('ttHD', h.trangThai || 'dang'), canhBao: [] };
    o.tamUngCon = Math.max(0, U.num(h.tamUng) - U.num(h.tamUngThuHoi)); o.ntChuaTT = Math.max(0, nt - tt);
    if (h.trangThai === 'thanhly') o.st = 'hoanthanh'; else if (h.trangThai === 'tamdung' || h.trangThai === 'chamdut') o.st = 'tamdung';
    const near = A.nguong('hdSapHet'), xet = (ngay, ten) => { if (!U.isISO(ngay)) return; const left = U.diffDays(ngay, today); if (left < 0) o.canhBao.push({ sev: 3, t: ten + ' đã hết hiệu lực ' + (-left) + ' ngày (' + U.fmtDate(ngay) + ')' }); else if (left <= near) o.canhBao.push({ sev: 2, t: ten + ' còn ' + left + ' ngày hết hiệu lực (' + U.fmtDate(ngay) + ')' }); };
    if (dang && U.isISO(han)) {
      const left = U.diffDays(han, today);
      if (left < 0) { o.over = true; o.st = 'quahan'; o.note = 'Quá thời hạn hợp đồng ' + (-left) + ' ngày'; }
      else if (left <= near) { o.near = true; o.st = 'saphan'; o.note = 'Còn ' + left + ' ngày hết thời hạn hợp đồng'; }
    }
    if (chuaTL && h.trangThai !== 'nghiemthu') xet(h.baoLanhTHHan, 'Bảo đảm thực hiện hợp đồng');
    if (chuaTL && o.tamUngCon > 0.5) xet(h.baoLanhTUHan, 'Bảo lãnh tạm ứng (còn ' + U.fmtShort(o.tamUngCon) + ' chưa thu hồi)');
    if (h.trangThai === 'nghiemthu') { o.chuaThanhLy = true; o.note = 'Đã nghiệm thu, chưa thanh lý'; if (o.conLai > 0.5) o.note += '; còn ' + U.fmtMoney(o.conLai) + ' đồng chưa thanh toán'; }
    if (o.ntChuaTT > 0.5 && chuaTL) o.canhBao.push({ sev: 1, t: 'Đã nghiệm thu ' + U.fmtShort(o.ntChuaTT) + ' chưa thanh toán' });
    if (U.num(h.tamUng) > tt + 0.5 && dang) o.tamUngCao = true;
    return o;
  };

  /* ================= CẢNH BÁO TỔNG HỢP ================= */
  // sev: 3 = cần xử lý ngay, 2 = cần quan tâm, 1 = lưu ý
  L.alerts = y => {
    const out = [], add = (sev, loai, title, detail, coll, id, extra) => out.push(Object.assign({ sev, loai, title, detail, coll, id }, extra || {}));
    const nvAll = L.nvOfYear(y), nvs = nvAll.filter(t => !t.ext);
    // Dữ liệu đồng bộ từ 2 phần mềm chuyên dụng: chỉ tổng hợp 1 dòng/phần mềm, xử lý chi tiết tại phần mềm gốc
    const tdnv = nvAll.filter(t => t.ext && t.ext.src === 'tdnv' && L.open(t) && t.trangThai !== 'tamdung');
    if (tdnv.length) { const qh = tdnv.filter(t => L.nv(t).st === 'quahan').length, sh = tdnv.filter(t => L.nv(t).st === 'saphan').length; if (qh || sh) add(qh ? 2 : 1, 'ngoai', 'Phần mềm Điều hành nhiệm vụ: ' + qh + ' nhiệm vụ quá hạn, ' + sh + ' sắp đến hạn', 'Theo dữ liệu đồng bộ lần gần nhất; xử lý tại phần mềm Điều hành nhiệm vụ', 'link', (A.KN ? A.KN.cfg().nvApp : '')); }
    const dadt = L.daOfYear(y).filter(d => d.ext && d.ext.src === 'dadt');
    if (dadt.length) { const ch = dadt.filter(d => L.da(d).cham).length; if (ch) add(1, 'ngoai', 'Phần mềm Dự án đầu tư: ' + ch + ' dự án trễ tiến độ', 'Theo dữ liệu đồng bộ lần gần nhất; xử lý tại phần mềm Dự án đầu tư', 'link', (A.KN ? A.KN.cfg().daApp : '')); }
    nvs.forEach(t => {
      const v = L.nv(t); if (!L.open(t) || t.trangThai === 'tamdung') return;
      const who = t.chuTriId ? A.Schema.refName('canbo', t.chuTriId) : 'chưa phân công';
      if (v.st === 'quahan') { const td = L.tonDong(t); add(3, td ? 'tondong' : 'quahan', t.ten, (td ? 'Tồn đọng kéo dài — ' : '') + 'quá hạn ' + v.late + ' ngày (hạn ' + U.fmtDate(t.han) + '); chủ trì: ' + who + (t.nguyenNhanCham ? '; nguyên nhân: ' + U.trunc(t.nguyenNhanCham, 100) : '; chưa ghi nguyên nhân'), 'nhiemvu', t.id, { days: v.late }); }
      else {
        const td = L.tonDong(t); if (td) add(2, 'tondong', t.ten, 'Tồn đọng: ' + td.why + '; chủ trì: ' + who, 'nhiemvu', t.id, { days: td.days });
        const nc = L.nguyCo(t); if (nc) add(2, 'nguyco', t.ten, 'Nguy cơ không hoàn thành: ' + nc + '; chủ trì: ' + who, 'nhiemvu', t.id);
        else if (v.st === 'saphan') add(1, 'saphan', t.ten, (v.left === 0 ? 'Đến hạn hôm nay' : 'Còn ' + v.left + ' ngày') + ' (hạn ' + U.fmtDate(t.han) + '); chủ trì: ' + who, 'nhiemvu', t.id, { days: v.left });
      }
      if (!t.chuTriId) add(2, 'chuapc', t.ten, 'Nhiệm vụ chưa có cán bộ chủ trì' + (t.han ? ' (hạn ' + U.fmtDate(t.han) + ')' : ''), 'nhiemvu', t.id);
      if (t.xinYKien) add(2, 'xinykien', t.ten, 'Cần xin ý kiến lãnh đạo: ' + (U.trunc(t.ndXinYKien, 140) || '(chưa ghi nội dung)'), 'nhiemvu', t.id);
    });
    S.all('vanban').forEach(v => {
      if (y && U.yearOf(v.ngayBanHanh) && U.yearOf(v.ngayBanHanh) !== y && !(U.yearOf(v.han) === y)) return;
      const x = L.vb(v); if (x.derived) return;      // đã theo dõi qua nhiệm vụ liên kết
      if (x.over) add(3, 'quahan', 'Văn bản ' + v.soKyHieu + ': ' + U.trunc(v.trichYeu, 110), 'Quá hạn ' + x.late + ' ngày, chưa tạo nhiệm vụ theo dõi', 'vanban', v.id, { days: x.late });
      else if (x.near) add(1, 'saphan', 'Văn bản ' + v.soKyHieu + ': ' + U.trunc(v.trichYeu, 110), x.label + ', chưa tạo nhiệm vụ theo dõi', 'vanban', v.id);
    });
    L.daOfYear(y).filter(d => !d.ext).forEach(d => {
      const x = L.da(d);
      if (x.cham) add(3, 'dacham', d.ten, 'Chậm tiến độ ' + x.treMax + ' ngày' + (x.mocTre.length ? ': ' + x.mocTre.length + ' mốc quá hạn (' + x.mocTre.slice(0, 2).map(m => U.trunc(m.ten, 40)).join('; ') + (x.mocTre.length > 2 ? '…' : '') + ')' : ': quá thời gian thực hiện (' + U.fmtDate(d.ketThuc) + ')') + (d.nguyenNhanCham ? '; nguyên nhân: ' + U.trunc(d.nguyenNhanCham, 100) : '; chưa ghi nguyên nhân'), 'duan', d.id, { days: x.treMax });
      else if (x.nguyCo) add(2, 'danguyco', d.ten, d.trangThai === 'tamdung' ? 'Đang tạm dừng, vướng mắc' + (d.khoKhan ? ': ' + U.trunc(d.khoKhan, 110) : '') : 'Có mốc sắp đến hạn chưa bắt đầu: ' + x.mocSap.filter(m => m.trangThai === 'chua').map(m => U.trunc(m.ten, 40) + ' (' + U.fmtDate(m.ketThuc) + ')').join('; '), 'duan', d.id);
      if (!x.xong && (d.kienNghi || '').trim()) add(2, 'xinykien', d.ten, 'Có kiến nghị, đề xuất cần xem xét: ' + U.trunc(d.kienNghi, 140), 'duan', d.id);
      if (d.trangThai === 'hoanthanh' && (!d.qtTrangThai || d.qtTrangThai === 'chualap')) add(1, 'quyettoan', d.ten, 'Đã hoàn thành nhưng chưa lập hồ sơ quyết toán', 'duan', d.id);
    });
    L.vonOfYear(y).forEach(o => {
      const d = S.get('duan', o.v.duAnId), ten = (d ? d.ten : '(chưa gắn dự án)') + ' — ' + o.v.nguonVon + ' ' + o.v.nam;
      if (o.thap) add(o.tyLe !== null && o.tyLe < o.tgNam - 2 * A.nguong('gnLech') ? 3 : 2, 'gnthap', ten, 'Giải ngân ' + U.fmtPct(o.tyLe || 0) + ' (' + U.fmtShort(o.gn) + '/' + U.fmtShort(o.kh) + ')' + (o.ngayGN ? ' đến ' + U.fmtDate(o.ngayGN) : ', chưa có số giải ngân') + '; thời gian năm đã qua ' + U.fmtPct(o.tgNam, 0) + (o.v.nguyenNhan ? '; nguyên nhân: ' + U.trunc(o.v.nguyenNhan, 100) : '; chưa ghi nguyên nhân'), 'von', o.v.id);
      else if (o.thapSoTienDo) add(2, 'gnthap', ten, 'Giải ngân ' + U.fmtPct(o.tyLe || 0) + ' thấp hơn tiến độ thực hiện dự án (' + U.num(d.tienDo) + '%)', 'von', o.v.id);
      if (U.num(o.v.nhuCauDC) !== 0) add(1, 'xinykien', ten, 'Có nhu cầu điều chỉnh vốn: ' + (o.v.nhuCauDC > 0 ? 'tăng ' : 'giảm ') + U.fmtMoney(Math.abs(o.v.nhuCauDC)) + ' đồng', 'von', o.v.id);
    });
    S.all('goithau').forEach(g => { const x = L.gt(g); if (x.over) add(3, 'dauthau', g.ten, x.note, 'goithau', g.id); else if (x.near) add(1, 'dauthau', g.ten, x.note, 'goithau', g.id); if (x.chuaHD) add(1, 'dauthau', g.ten, 'Đã có kết quả lựa chọn nhà thầu nhưng chưa nhập hợp đồng', 'goithau', g.id); });
    S.all('hopdong').forEach(h => { const x = L.hd(h), ten = 'Hợp đồng ' + h.so + (h.ten ? ': ' + U.trunc(h.ten, 90) : ''); if (x.over) add(3, 'hopdong', ten, x.note + ' (hạn ' + U.fmtDate(x.han) + (x.giaHan ? ', đã gia hạn' : '') + ')', 'hopdong', h.id); else if (x.near) add(2, 'hopdong', ten, x.note + ' (hạn ' + U.fmtDate(x.han) + ')', 'hopdong', h.id); else if (x.chuaThanhLy) add(1, 'hopdong', ten, x.note, 'hopdong', h.id); x.canhBao.forEach(c => add(c.sev, 'hopdong', ten, c.t, 'hopdong', h.id)); });
    // Tài sản nhà, đất: tổng hợp hồ sơ pháp lý, hiện trạng sử dụng
    const nd = S.all('taisan').filter(L.isNhaDat), ns = L.ndStats(nd);
    if (ns.khongDung) add(2, 'nhadat', ns.khongDung + ' cơ sở nhà, đất đang sử dụng không đúng mục đích', nd.filter(t => t.htSD === 'khongdung').slice(0, 4).map(t => L.ndDonVi(t) + ': ' + U.trunc(t.ten, 60)).join('; '), 'route', 'taisan');
    if (ns.chuaCap + ns.matMat) add(1, 'nhadat', (ns.chuaCap + ns.matMat) + '/' + ns.n + ' cơ sở nhà, đất chưa có giấy chứng nhận QSD đất' + (ns.matMat ? ' (trong đó ' + ns.matMat + ' đã cấp nhưng mất, thất lạc)' : ''), 'Thuộc ' + new Set(nd.filter(t => t.gcnTT === 'chuacap' || t.gcnTT === 'matmat').map(t => U.norm(L.ndDonVi(t)))).size + ' đơn vị được giao quản lý', 'route', 'taisan');
    if (ns.chuaDK) add(1, 'nhadat', ns.chuaDK + ' cơ sở nhà, đất chưa đăng ký hồ sơ biến động đất đai', nd.filter(t => t.chuaDKBD).slice(0, 4).map(t => L.ndDonVi(t) + (t.nguyenNhanHS ? ' — ' + U.trunc(t.nguyenNhanHS, 60) : '')).join('; '), 'route', 'taisan');
    if (ns.hsThieu) add(1, 'nhadat', ns.hsThieu + ' cơ sở nhà, đất thiếu hồ sơ hình thành tài sản', nd.filter(t => t.hsThieu).slice(0, 4).map(t => L.ndDonVi(t) + ': ' + U.trunc(t.ten, 50)).join('; '), 'route', 'taisan');
    // Bao phủ chức năng: đầu mục chính thức chưa có người chủ trì
    const dmChua = S.all('danhmuc').filter(d => d.loai !== 'noibo' && !d.chuTriId);
    if (dmChua.length) add(2, 'dmchuapc', dmChua.length + ' đầu mục chức năng, nhiệm vụ chưa phân công cán bộ chủ trì', 'Trên tổng số ' + S.all('danhmuc').filter(d => d.loai !== 'noibo').length + ' đầu mục theo ' + A.Seed.QD + '. Mã: ' + dmChua.slice(0, 12).map(d => d.ma).join(', ') + (dmChua.length > 12 ? '…' : ''), 'route', 'canbo');
    return out.sort((a, b) => (b.sev - a.sev) || ((b.days || 0) - (a.days || 0)));
  };
  L.ALERT_LABEL = { quahan: 'Quá hạn', tondong: 'Tồn đọng', saphan: 'Sắp đến hạn', nguyco: 'Nguy cơ', chuapc: 'Chưa phân công', xinykien: 'Xin ý kiến', dacham: 'Dự án chậm', danguyco: 'Dự án có nguy cơ', gnthap: 'Giải ngân thấp', dauthau: 'Đấu thầu', hopdong: 'Hợp đồng', quyettoan: 'Quyết toán', dmchuapc: 'Phân công', nhadat: 'Nhà, đất', ngoai: 'Phần mềm khác', giaingan: 'Giải ngân' };

  /* ================= TRỢ LÝ ĐIỀU HÀNH (theo luật, có căn cứ) ================= */
  L.assistant = y => {
    const al = L.alerts(y), nvs = L.nvOfYear(y).filter(t => !t.ext), pick = (...k) => al.filter(a => k.includes(a.loai));   // nhiệm vụ đồng bộ từ phần mềm khác: xử lý tại phần mềm gốc
    const pri = L.priority(nvs).slice(0, 10);
    // Lĩnh vực tồn đọng
    const g = new Map();
    nvs.filter(t => L.open(t) && t.trangThai !== 'tamdung').forEach(t => { const k = t.nhom || '?'; const x = g.get(k) || { k, mo: 0, quahan: 0 }; x.mo++; if (L.nv(t).st === 'quahan') x.quahan++; g.set(k, x); });
    const linhVuc = Array.from(g.values()).sort((a, b) => (b.quahan - a.quahan) || (b.mo - a.mo));
    // Chức năng chưa có việc trong năm (định kỳ) → gợi ý chủ động tham mưu
    const yy = y || +U.today().slice(0, 4);
    const coViec = new Set(S.all('nhiemvu').filter(t => +t.nam === yy).map(t => t.dmId).filter(Boolean));
    const dmTrong = S.all('danhmuc').filter(d => d.loai !== 'noibo' && d.tinhChat === 'dinhky' && !coViec.has(d.id)).sort((a, b) => U.num(a.thuTu) - U.num(b.thuTu));
    return {
      xuLyNgay: { items: pri, basis: 'Xếp theo điểm ưu tiên: quá hạn (+100, cộng thêm số ngày quá hạn), sắp đến hạn trong ' + A.nguong('sapHan') + ' ngày (+60), ưu tiên cao (+25), cần xin ý kiến (+20), chưa phân công (+15).' },
      duAnNguyCo: { items: pick('dacham', 'danguyco', 'gnthap'), basis: 'Dự án có mốc quá hạn hoặc quá thời gian thực hiện; có mốc đến hạn trong ' + A.nguong('sapHan') + ' ngày chưa bắt đầu; tỷ lệ giải ngân thấp hơn tỷ lệ thời gian đã qua của năm trên ' + A.nguong('gnLech') + ' điểm phần trăm.' },
      chuaPhanCong: { items: pick('chuapc'), basis: 'Nhiệm vụ của Phòng (nhập trên phần mềm này) chưa hoàn thành, không có cán bộ chủ trì.' },
      giaiNgan: { items: L.gnDeXuat ? L.gnDeXuat(yy, {}) : [], basis: 'So sánh tỷ lệ giải ngân lũy kế với mục tiêu Phòng đặt (hoặc tỷ lệ thời gian của năm); dự báo cuối năm theo tốc độ giải ngân từ đầu năm và khoảng 60 ngày gần nhất.' },
      dauThau: { items: L.dtViec ? L.dtViec({}) : [], basis: 'Hạn lựa chọn nhà thầu, thời hạn hợp đồng sau gia hạn, hiệu lực bảo đảm thực hiện hợp đồng và bảo lãnh tạm ứng (cảnh báo trước ' + A.nguong('hdSapHet') + ' ngày), nghiệm thu chưa thanh toán, đã nghiệm thu chưa thanh lý.' },
      linhVuc: { items: linhVuc, basis: 'Đếm nhiệm vụ chưa hoàn thành và quá hạn theo 10 nhóm chức năng của QĐ 324.' },
      baoCaoLanhDao: { items: pick('xinykien', 'tondong').concat(al.filter(a => a.sev === 3 && ['dacham', 'gnthap', 'hopdong', 'dauthau'].includes(a.loai))), basis: 'Mục đã đánh dấu "cần xin ý kiến", kiến nghị của dự án, nhu cầu điều chỉnh vốn, việc tồn đọng quá ' + A.nguong('tonDong') + ' ngày và các cảnh báo mức cao về dự án, giải ngân, hợp đồng.' },
      chuDong: { items: dmTrong, quyetToan: pick('quyettoan'), nhaDat: pick('nhadat'), ts: L.tsCanXuLy(), basis: 'Đầu mục chức năng định kỳ chưa có nhiệm vụ nào trong năm ' + yy + '; dự án hoàn thành chưa quyết toán; tài sản ở tình trạng chờ xử lý; cơ sở nhà, đất chưa có GCN, chưa đăng ký biến động, thiếu hồ sơ hoặc sử dụng không đúng mục đích.' },
      counts: { al: al.length, cao: al.filter(a => a.sev === 3).length }
    };
  };

  /* ================= TỔNG HỢP THEO THỜI GIAN ================= */
  L.inRange = (d, a, b) => U.isISO(d) && d >= a && d <= b;
  L.digest = (from, to) => {
    const nvs = S.all('nhiemvu');
    return {
      from, to,
      giao: nvs.filter(t => L.inRange(t.ngayGiao, from, to)),
      hoanThanh: nvs.filter(t => t.trangThai === 'hoanthanh' && L.inRange(t.ngayHT, from, to)),
      denHan: nvs.filter(t => L.open(t) && L.inRange(t.han, from, to)),
      quaHan: nvs.filter(t => L.open(t) && t.trangThai !== 'tamdung' && U.isISO(t.han) && t.han < from)
    };
  };
  L.period = (kind, y, n) => { // trả [from, to, nhãn]
    const ld = m => U.pad(U.lastDayOfMonth(y, m));
    if (kind === 'thang') return [y + '-' + U.pad(n) + '-01', y + '-' + U.pad(n) + '-' + ld(n), 'tháng ' + n + ' năm ' + y];
    if (kind === 'quy') return [y + '-' + U.pad(n * 3 - 2) + '-01', y + '-' + U.pad(n * 3) + '-' + ld(n * 3), 'quý ' + U.roman(n) + ' năm ' + y];
    if (kind === '6thang') return [y + '-01-01', y + '-06-30', '6 tháng đầu năm ' + y];
    if (kind === '9thang') return [y + '-01-01', y + '-09-30', '9 tháng năm ' + y];
    return [y + '-01-01', y + '-12-31', 'năm ' + y];
  };

  /* ================= TÌM KIẾM TOÀN CỤC ================= */
  L.search = (q, limit) => {
    const nq = U.norm(q); if (nq.length < 2) return [];
    const words = nq.split(' '), res = [];
    A.Schema.TRACKED.forEach(c => {
      const sc = A.Schema.get(c);
      S.all(c).forEach(r => {
        const hay = U.norm(sc.fields.filter(f => ['text', 'textarea', 'select', 'ref'].includes(f.type)).map(f => A.Schema.text(f, r[f.k])).join(' | '));
        if (words.every(w => hay.includes(w))) res.push({ c, r, title: sc.title(r), label: sc.label, hit: U.norm(sc.title(r)).includes(nq) ? 2 : 1 });
      });
    });
    return res.sort((a, b) => b.hit - a.hit).slice(0, limit || 40);
  };
})(App);
