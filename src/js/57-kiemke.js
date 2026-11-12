/* ============================================================
   57-kiemke.js — Kết quả kiểm kê tài sản theo nhóm của Sở
   Đọc các mẫu báo cáo kiểm kê dùng chung một khung cột:
     Mẫu 01c-BC/TSCĐ (tài sản cố định tại cơ quan, tổ chức, đơn vị)
     Mẫu 08đ-BC/HTNS (tài sản kết cấu hạ tầng cấp nước sạch)
     Mẫu 09đ-BC/HTTL (tài sản kết cấu hạ tầng thủy lợi)
   Mỗi dòng của biểu là một bản ghi (nhóm tài sản × kỳ kiểm kê). Số liệu lưu nguyên như biểu; số tổng tính lại để đối chiếu.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const F = (k, label, type, extra) => Object.assign({ k, label, type: type || 'text' }, extra || {});

  A.OPT.kkMau = [['tscd', 'Tài sản cố định tại cơ quan, tổ chức, đơn vị (Mẫu 01c-BC/TSCĐ)'], ['thuyloi', 'Tài sản kết cấu hạ tầng thủy lợi (Mẫu 09đ-BC/HTTL)'], ['nuocsach', 'Tài sản kết cấu hạ tầng cấp nước sạch (Mẫu 08đ-BC/HTNS)'], ['khac', 'Mẫu kiểm kê khác']];
  const MAU_NGAN = { tscd: 'Tài sản cố định', thuyloi: 'Hạ tầng thủy lợi', nuocsach: 'Hạ tầng cấp nước sạch', khac: 'Mẫu khác' };
  const NUMS = ['slKK', 'slTang', 'slGiam', 'hvKK', 'hvTang', 'hvGiam', 'nguyenGia', 'gtcl', 'gtNangCap', 'daGhiSo', 'chuaGhiSo', 'sdDung', 'sdKhongDung', 'khongSD', 'hong', 'ttCo', 'ttKhong', 'ttSoLan'];

  Sc.C.kiemke = {
    label: 'Dòng kiểm kê tài sản', title: r => (r.stt ? r.stt + '. ' : '') + r.danhMuc + ' — ' + (MAU_NGAN[r.mau] || '') + ' ' + U.fmtDate(r.ky),
    unique: r => (r.mau || '') + '|' + (r.ky || '') + '|' + U.norm(r.stt) + '|' + U.norm(r.danhMuc), uniqueLabel: 'mẫu, kỳ, số thứ tự và danh mục',
    fields: [
      F('mau', 'Mẫu báo cáo', 'select', { opt: 'kkMau', required: true }),
      F('maMau', 'Ký hiệu mẫu (theo biểu)'),
      F('ky', 'Kỳ kiểm kê (ngày báo cáo)', 'date', { required: true }),
      F('donViTH', 'Đơn vị tổng hợp'),
      F('stt', 'Số thứ tự'),
      F('danhMuc', 'Danh mục tài sản', 'textarea', { required: true }),
      F('slDvt', 'Số lượng — đơn vị tính'), F('slKK', 'Số lượng theo thực tế kiểm kê', 'number'), F('slTang', 'Số lượng — chênh lệch tăng', 'number'), F('slGiam', 'Số lượng — chênh lệch giảm', 'number'),
      F('hvDvt', 'Hiện vật — đơn vị tính'), F('hvKK', 'Hiện vật theo thực tế kiểm kê', 'number'), F('hvTang', 'Hiện vật — chênh lệch tăng', 'number'), F('hvGiam', 'Hiện vật — chênh lệch giảm', 'number'),
      F('nguyenGia', 'Nguyên giá (đồng)', 'money'), F('gtcl', 'Giá trị còn lại (đồng)', 'money'), F('gtNangCap', 'Giá trị đầu tư nâng cấp, mở rộng, cải tạo (đồng)', 'money'),
      F('daGhiSo', 'Đã ghi sổ kế toán', 'number'), F('chuaGhiSo', 'Chưa ghi sổ kế toán', 'number'),
      F('sdDung', 'Còn sử dụng được — đúng mục đích', 'number'), F('sdKhongDung', 'Còn sử dụng được — không đúng mục đích', 'number'), F('khongSD', 'Còn sử dụng được — không sử dụng', 'number'), F('hong', 'Hỏng, không sử dụng được', 'number'),
      F('ttCo', 'Chịu ảnh hưởng thiên tai — có', 'number'), F('ttKhong', 'Chịu ảnh hưởng thiên tai — không', 'number'), F('ttSoLan', 'Số lần xảy ra thiên tai', 'number'),
      F('ghiChu', 'Ghi chú', 'textarea')
    ],
    validate(r) { const e2 = []; NUMS.forEach(k => { if (typeof r[k] === 'number' && r[k] < 0) e2.push('"' + Sc.field('kiemke', k).label + '" không được âm.'); }); return e2; },
    warn(r) {
      const w = [], n = k => U.num(r[k]);
      if (n('gtcl') > n('nguyenGia') + 0.5) w.push('Giá trị còn lại lớn hơn nguyên giá.');
      if (typeof r.slKK === 'number') {
        if ((has(r.daGhiSo) || has(r.chuaGhiSo)) && n('daGhiSo') + n('chuaGhiSo') !== r.slKK) w.push('Đã ghi sổ + chưa ghi sổ (' + (n('daGhiSo') + n('chuaGhiSo')) + ') khác số lượng kiểm kê (' + r.slKK + ').');
        const tt = n('sdDung') + n('sdKhongDung') + n('khongSD') + n('hong'); if (tt && tt !== r.slKK) w.push('Tổng các cột tình trạng (' + tt + ') khác số lượng kiểm kê (' + r.slKK + ').');
      }
      return w;
    }
  };
  const has = v => v !== undefined && v !== null && v !== '';
  Sc.TRACKED.push('kiemke');

  /* ---------- Đọc biểu ---------- */
  L.parseKiemKe = rows => {
    const out = { mau: 'khac', maMau: '', ten: '', phamVi: '', donVi: '', maDonVi: '', ngay: '', items: [], warnings: [], cols: {}, tong: null };
    const str = x => (x === null || x === undefined) ? '' : String(x).replace(/\s+/g, ' ').trim();
    const T = (r, c) => U.norm((rows[r] || [])[c]).replace(/[^a-z0-9]+/g, ' ').trim();
    // Thông tin đầu biểu, ngày ký
    rows.forEach((row, r) => (row || []).forEach(c => {
      const s = typeof c === 'string' ? c : ''; if (!s) return;
      const m = s.match(/Mẫu\s*số\s*([0-9]{1,2}[a-zđ]*)\s*-\s*BC\s*\/\s*([A-ZĐa-zđ]+)/i);
      if (m && !out.maMau) { out.maMau = m[1] + '-BC/' + m[2].toUpperCase(); const k = U.norm(m[2]); out.mau = k.startsWith('tsc') ? 'tscd' : k === 'httl' ? 'thuyloi' : k === 'htns' ? 'nuocsach' : 'khac'; }
      if (/^Tên đơn vị tổng hợp:/i.test(s.trim()) && !out.donVi) out.donVi = s.replace(/^Tên đơn vị tổng hợp:\s*/i, '').trim();
      if (/^Mã đơn vị tổng hợp:/i.test(s.trim()) && !out.maDonVi) out.maDonVi = s.replace(/^Mã đơn vị tổng hợp:\s*/i, '').trim();
      if (/^BÁO CÁO/i.test(s.trim()) && /KIỂM KÊ/i.test(s) && !out.ten) { const ls = s.split(/\n/).map(x => x.trim()).filter(Boolean); out.ten = ls[0]; out.phamVi = ls.slice(1).join(' — '); }
      const d = s.match(/ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i);
      if (d && !out.ngay) out.ngay = U.parseDate(d[1] + '/' + d[2] + '/' + d[3]) || '';
    }));
    let hr = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) { const r = (rows[i] || []).map((_, c) => T(i, c)); if (r.includes('stt') && r.some(c => c.startsWith('danh muc tai san'))) { hr = i; break; } }
    if (hr < 0) { out.warnings.push('Không tìm thấy dòng tiêu đề có cột "STT" và "Danh mục tài sản". Tệp không đúng mẫu báo cáo kiểm kê.'); return out; }
    const C = out.cols, set = (k, c) => { if (C[k] === undefined) C[k] = c; };
    (rows[hr] || []).forEach((_, c) => { const t = T(hr, c); if (t === 'stt') set('stt', c); if (t.startsWith('danh muc tai san')) set('danhMuc', c); });
    // Nhóm cột cấp 1 → phân loại cột cấp 2
    const groups = [];
    (rows[hr] || []).forEach((_, c) => { const t = T(hr, c); const g = t.includes('so luong') ? 'sl' : t.includes('hien vat') ? 'hv' : t.includes('gia tri') ? 'gt' : t.includes('hach toan') ? 'ht' : t.includes('tinh trang') ? 'tt' : t.includes('thien tai') ? 'tn' : ''; if (g) groups.push([c, g]); });
    const grp = c => { let g = ''; groups.forEach(([s, k]) => { if (s <= c) g = k; }); return g; };
    (rows[hr + 1] || []).forEach((_, c) => {
      const t = T(hr + 1, c), g = grp(c); if (!t || !g) return;
      if (g === 'sl' || g === 'hv') { const k = t.startsWith('don vi tinh') ? 'Dvt' : t.includes('thuc te kiem ke') ? 'KK' : t.includes('chenh lech tang') ? 'Tang' : t.includes('chenh lech giam') ? 'Giam' : ''; if (k) set(g + k, c); }
      else if (g === 'gt') { if (t.startsWith('nguyen gia')) set('nguyenGia', c); else if (t.startsWith('gtcl') || t.startsWith('gia tri con lai')) set('gtcl', c); else if (t.includes('nang cap')) set('gtNangCap', c); }
      else if (g === 'ht') { if (t.startsWith('da ghi so')) set('daGhiSo', c); else if (t.startsWith('chua ghi so')) set('chuaGhiSo', c); }
      else if (g === 'tt') { if (t.includes('khong dung muc dich')) set('sdKhongDung', c); else if (t.includes('khong sd') || t.endsWith('khong su dung')) set('khongSD', c); else if (t.startsWith('hong')) set('hong', c); else if (t.startsWith('con su dung duoc')) set('sdDung', c); }
      else if (g === 'tn') { if (t === 'co') set('ttCo', c); else if (t === 'khong') set('ttKhong', c); else if (t.includes('so lan')) set('ttSoLan', c); }
    });
    if (C.danhMuc === undefined) { out.warnings.push('Thiếu cột "Danh mục tài sản".'); return out; }
    const NEED = { slKK: 'Số lượng theo thực tế kiểm kê', nguyenGia: 'Nguyên giá', gtcl: 'Giá trị còn lại' };
    Object.keys(NEED).forEach(k => { if (C[k] === undefined) out.warnings.push('Không nhận ra cột: ' + NEED[k] + '.'); });
    const v = (row, k) => C[k] === undefined ? null : row[C[k]];
    const num = (x, r, k) => { if (x === null || x === undefined || str(x) === '' || str(x) === '-') return ''; const n = typeof x === 'number' ? x : U.parseNum(x); if (n === null || n === '') { out.warnings.push('Dòng ' + (r + 1) + ': "' + str(x) + '" ở cột ' + Sc.field('kiemke', k).label + ' không phải số — để trống.'); return ''; } return n; };
    const dvt = x => { const s = str(x); return s === '-' ? '' : s; };
    for (let r = hr + 2; r < rows.length; r++) {
      const row = rows[r] || [], dm = str(v(row, 'danhMuc')), stt = str(v(row, 'stt'));
      if (!dm || /^\(\d+\)$/.test(dm)) continue;
      const it = { row: r + 1, stt, danhMuc: dm, slDvt: dvt(v(row, 'slDvt')), hvDvt: dvt(v(row, 'hvDvt')) };
      NUMS.forEach(k => { it[k] = num(v(row, k), r, k); });
      if (U.norm(dm) === 'tong cong') { out.tong = it; continue; }
      it.level = stt ? stt.split('.').length - 1 : 0;
      it.parentStt = stt.includes('.') ? stt.split('.').slice(0, -1).join('.') : '';
      out.items.push(it);
    }
    // Đối chiếu: dòng cha = tổng dòng con; dòng TỔNG CỘNG = tổng cấp 1; số lượng = tổng các dòng lá
    const kids = new Map(); out.items.forEach(it => { if (it.parentStt) { const l = kids.get(it.parentStt) || []; l.push(it); kids.set(it.parentStt, l); } });
    out.items.forEach(it => { it.isGroup = kids.has(it.stt); });
    const NM = { nguyenGia: 'Nguyên giá', gtcl: 'Giá trị còn lại', daGhiSo: 'Đã ghi sổ', hong: 'Hỏng' };
    out.items.filter(it => it.isGroup).forEach(it => Object.keys(NM).forEach(k => {
      const ch = kids.get(it.stt); if (!has(it[k]) && !ch.some(c => has(c[k]))) return;
      const s = U.sum(ch, c => c[k]); if (Math.abs(s - U.num(it[k])) > 0.5) out.warnings.push('Dòng ' + it.row + ' "' + U.trunc(it.danhMuc, 50) + '": ' + NM[k] + ' ghi ' + U.fmtNum(U.num(it[k])) + ', tổng các dòng con là ' + U.fmtNum(s) + '.');
    }));
    out.items.forEach(it => {
      if (U.num(it.gtcl) > U.num(it.nguyenGia) + 0.5) out.warnings.push('Dòng ' + it.row + ' "' + U.trunc(it.danhMuc, 50) + '": giá trị còn lại lớn hơn nguyên giá.');
      if (!it.isGroup && typeof it.slKK === 'number') {
        const ht = U.num(it.daGhiSo) + U.num(it.chuaGhiSo); if ((has(it.daGhiSo) || has(it.chuaGhiSo)) && ht !== it.slKK) out.warnings.push('Dòng ' + it.row + ' "' + U.trunc(it.danhMuc, 50) + '": đã ghi sổ + chưa ghi sổ (' + ht + ') khác số lượng kiểm kê (' + it.slKK + ').');
        const tt = U.num(it.sdDung) + U.num(it.sdKhongDung) + U.num(it.khongSD) + U.num(it.hong); if (tt && tt !== it.slKK) out.warnings.push('Dòng ' + it.row + ' "' + U.trunc(it.danhMuc, 50) + '": tổng các cột tình trạng (' + tt + ') khác số lượng kiểm kê (' + it.slKK + ').');
        if (typeof it.nguyenGia === 'number' && it.nguyenGia > 0 && !has(it.gtcl)) it.gtclTrong = true;
      }
    });
    const thieuGtcl = out.items.filter(it => it.gtclTrong);
    if (thieuGtcl.length) out.warnings.push('Có nguyên giá nhưng để trống giá trị còn lại (đọc là 0 — có thể đã hao mòn hết hoặc chưa nhập): ' + thieuGtcl.map(it => 'dòng ' + it.row + ' "' + U.trunc(it.danhMuc, 40) + '"').join('; ') + '.');
    if (out.tong) {
      const top = out.items.filter(it => it.level === 0), leaves = out.items.filter(it => !it.isGroup);
      [['nguyenGia', top], ['gtcl', top], ['daGhiSo', top], ['hong', top], ['slKK', leaves]].forEach(([k, list]) => {
        if (!has(out.tong[k])) return; const s = U.sum(list, x => x[k]);
        if (Math.abs(s - out.tong[k]) > 0.5) out.warnings.push('Dòng TỔNG CỘNG: ' + Sc.field('kiemke', k).label + ' ghi ' + U.fmtNum(out.tong[k]) + ', tổng các dòng là ' + U.fmtNum(s) + '.');
      });
    }
    return out;
  };

  /* ---------- Tổng hợp ---------- */
  L.kkKys = () => Array.from(new Set(S.all('kiemke').map(r => r.ky).filter(Boolean))).sort().reverse();
  L.kkRows = (mau, ky) => S.all('kiemke').filter(r => r.mau === mau && r.ky === ky).sort((a, b) => U.num(a.thuTu) - U.num(b.thuTu) || U.cmp(a.stt, b.stt));
  L.kkSum = rows => {   // cấp 1 cho giá trị; dòng lá cho số lượng, tình trạng (không cộng trùng dòng nhóm)
    const isG = new Set(rows.filter(r => rows.some(x => x.parentStt === r.stt)).map(r => r.stt));
    const top = rows.filter(r => U.num(r.level) === 0), leaf = rows.filter(r => !isG.has(r.stt));
    const s = { n: rows.length, nguyenGia: U.sum(top, r => r.nguyenGia), gtcl: U.sum(top, r => r.gtcl), gtNangCap: U.sum(top, r => r.gtNangCap) };
    ['slKK', 'daGhiSo', 'chuaGhiSo', 'sdDung', 'sdKhongDung', 'khongSD', 'hong', 'ttCo'].forEach(k => { s[k] = U.sum(leaf, r => r[k]); });
    s.tyLe = U.pct(s.gtcl, s.nguyenGia); return s;
  };
  L.kkLatest = () => { const out = {}; A.OPT.kkMau.forEach(([m]) => { const k = L.kkKys().find(ky => S.all('kiemke').some(r => r.mau === m && r.ky === ky)); if (k) out[m] = { ky: k, rows: L.kkRows(m, k) }; }); return out; };
  L.kkFind = (rows, ...keys) => rows.find(r => keys.some(k => U.norm(r.danhMuc) === k));

  // Cảnh báo từ kết quả kiểm kê mới nhất của từng mẫu
  const baseAlerts = L.alerts;
  L.alerts = y => {
    const out = baseAlerts(y), lt = L.kkLatest(), add = (sev, title, detail) => out.push({ sev, loai: 'kiemke', title, detail, coll: 'route', id: 'taisan' });
    Object.keys(lt).forEach(m => {
      const s = L.kkSum(lt[m].rows), nm = MAU_NGAN[m].toLowerCase(), ky = ' (kiểm kê ' + U.fmtDate(lt[m].ky) + ')';
      if (s.hong + s.khongSD) add(1, (s.hong + s.khongSD) + ' ' + nm + ' hỏng hoặc không sử dụng' + ky, s.hong + ' hỏng, không sử dụng được; ' + s.khongSD + ' còn dùng được nhưng không sử dụng — cần xem xét phương án xử lý: ' + lt[m].rows.filter(r => !r.isGroup && (U.num(r.hong) + U.num(r.khongSD))).map(r => r.danhMuc + ' ' + (U.num(r.hong) + U.num(r.khongSD))).slice(0, 4).join('; '));
      if (s.chuaGhiSo) add(2, s.chuaGhiSo + ' ' + nm + ' chưa ghi sổ kế toán' + ky, 'Theo cột "Chưa ghi sổ kế toán" của biểu ' + (lt[m].rows[0].maMau || ''));
      if (s.sdKhongDung) add(2, s.sdKhongDung + ' ' + nm + ' sử dụng không đúng mục đích' + ky, 'Theo cột tình trạng của biểu ' + (lt[m].rows[0].maMau || ''));
    });
    return out.sort((a, b) => (b.sev - a.sev) || ((b.days || 0) - (a.days || 0)));
  };
  L.ALERT_LABEL.kiemke = 'Kiểm kê';
  const baseAsst = L.assistant;
  L.assistant = y => { const a = baseAsst(y); a.chuDong.nhaDat = (a.chuDong.nhaDat || []).concat(L.alerts(y).filter(x => x.loai === 'kiemke')); return a; };

  /* ---------- Nhập biểu (nhiều tệp một lần) ---------- */
  const pickFiles = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = '.xlsx,.xls'; i.onchange = () => res(Array.from(i.files || [])); i.click(); });
  async function importKiemKe() {
    const m = UI.modal({
      title: 'Nhập biểu kết quả kiểm kê tài sản', sub: 'Mẫu 01c-BC/TSCĐ, 08đ-BC/HTNS, 09đ-BC/HTTL — chọn được nhiều tệp cùng lúc', size: 'lg',
      body: '<p class="soft">Phần mềm tự nhận mẫu theo ký hiệu "Mẫu số …" trên biểu, nhận cột theo tiêu đề, giữ nguyên từng dòng nhóm tài sản và đối chiếu dòng nhóm với dòng con, dòng TỔNG CỘNG với các dòng chi tiết. Nhập lại cùng mẫu, cùng kỳ sẽ thay số liệu kỳ đó (có bản chụp để khôi phục); các kỳ khác giữ nguyên để so sánh.</p><div class="gap"><button class="btn primary" data-pick>' + ic('upload', 16) + 'Chọn tệp Excel</button></div><div data-out class="mt"></div>',
      buttons: [{ label: 'Đóng', on: a => a.close() }]
    });
    let list = [];
    const draw = () => {
      $('[data-out]', m.body).innerHTML = list.map((f, i) => {
        const p = f.p, s = L.kkSum(p.items.map((it, j) => Object.assign({}, it, { thuTu: j }))), cu = f.ky ? S.all('kiemke').filter(r => r.mau === p.mau && r.ky === f.ky).length : 0;
        return '<div class="card mb"><div class="card-h"><h3>' + e(MAU_NGAN[p.mau]) + '</h3><span class="tag">' + e(p.maMau || 'không rõ mẫu') + '</span><span class="grow"></span><span class="small muted">' + e(f.name) + '</span><div class="sub">' + e([p.ten, p.phamVi].filter(Boolean).join(' — ')) + (p.donVi ? ' · Đơn vị tổng hợp: ' + e(p.donVi) + (p.maDonVi ? ' (' + e(p.maDonVi) + ')' : '') : '') + '</div></div><div class="card-b">' +
          (!p.items.length ? '<div class="note bad">' + e(p.warnings.join(' ') || 'Không đọc được dòng nào.') + '</div>' :
            '<div class="kpis"><div class="kpi acc static"><span class="k-l">Số dòng nhóm tài sản</span><span class="k-v">' + p.items.length + '</span><span class="k-s">' + p.items.filter(x => NUMS.some(k => has(x[k]))).length + ' dòng có số liệu</span></div><div class="kpi static"><span class="k-l">Số lượng (dòng chi tiết)</span><span class="k-v">' + U.fmtNum(s.slKK, 0) + '</span><span class="k-s">' + (p.tong && has(p.tong.slKK) ? 'Dòng tổng ghi ' + U.fmtNum(p.tong.slKK, 0) : '&nbsp;') + '</span></div><div class="kpi teal static"><span class="k-l">Nguyên giá</span><span class="k-v"><small>' + U.fmtShort(s.nguyenGia) + '</small></span><span class="k-s">Còn lại ' + U.fmtShort(s.gtcl) + '</span></div><div class="kpi ' + (s.hong + s.khongSD ? 'warn' : 'ok') + ' static"><span class="k-l">Hỏng · không sử dụng</span><span class="k-v">' + s.hong + ' · ' + s.khongSD + '</span></div></div>' +
            '<div class="form mt"><div class="fld"><label for="kk_ky' + i + '">Kỳ kiểm kê (ngày báo cáo)</label><input class="inp" type="date" id="kk_ky' + i + '" data-ky="' + i + '" value="' + e(f.ky) + '"><div class="help">' + (f.kySrc || 'Chưa xác định — nhập ngày') + '</div></div><div class="fld"><label>Tình trạng</label><div>' + (cu ? UI.chip('saphan', 'Đã có ' + cu + ' dòng kỳ này — sẽ thay thế') : UI.chip('hoanthanh', 'Kỳ mới')) + '</div></div></div>' +
            (p.warnings.length ? '<div class="note warn mt"><b>Kiểm tra biểu:</b><ul style="margin:4px 0 0;padding-left:18px">' + p.warnings.map(w => '<li>' + e(w) + '</li>').join('') + '</ul></div>' : '<div class="note ok mt">Dòng nhóm khớp tổng dòng con; dòng TỔNG CỘNG khớp các dòng chi tiết.</div>')) + '</div></div>';
      }).join('');
      $$('[data-ky]', m.body).forEach(el => el.onchange = () => { list[+el.dataset.ky].ky = U.isISO(el.value) ? el.value : ''; list[+el.dataset.ky].kySrc = 'Nhập tay'; draw(); });
      const ok = list.filter(f => f.p.items.length);
      m.setFooter(ok.length ? [{ label: 'Đóng', on: a => a.close() }, { label: 'Nhập ' + ok.length + ' biểu (' + U.sum(ok, f => f.p.items.length) + ' dòng)', cls: 'primary', icon: 'check', on: commit }] : [{ label: 'Đóng', on: a => a.close() }]);
    };
    const commit = async a => {
      const ok = list.filter(f => f.p.items.length);
      if (ok.some(f => !f.ky)) { UI.toast('Còn biểu chưa có ngày kỳ kiểm kê.', 'bad'); return; }
      const dup = new Set(); for (const f of ok) { const k = f.p.mau + '|' + f.ky; if (dup.has(k)) { UI.toast('Có hai tệp cùng mẫu "' + MAU_NGAN[f.p.mau] + '" và cùng kỳ ' + U.fmtDate(f.ky) + '. Bỏ bớt một tệp hoặc sửa ngày.', 'bad'); return; } dup.add(k); }
      const old = S.all('kiemke').filter(r => ok.some(f => r.mau === f.p.mau && r.ky === f.ky));
      if (old.length && !await UI.confirm({ title: 'Thay số liệu kiểm kê đã có?', msg: 'Có ' + old.length + ' dòng kiểm kê cùng mẫu, cùng kỳ sẽ được thay bằng số liệu trong tệp. Phần mềm lưu bản chụp trước khi thay (khôi phục tại Thiết lập).', ok: 'Thay số liệu' })) return;
      try {
        if (old.length) { await S.snapshot('Trước khi nhập lại biểu kiểm kê'); await S.removeMany(old.map(r => ['kiemke', r.id]), 'Thay ' + old.length + ' dòng kiểm kê cũ cùng mẫu, cùng kỳ'); }
        const items = []; ok.forEach(f => f.p.items.forEach((it, j) => { const rec = { mau: f.p.mau, maMau: f.p.maMau, ky: f.ky, donViTH: [f.p.donVi, f.p.maDonVi].filter(Boolean).join(' — '), thuTu: j, level: it.level, parentStt: it.parentStt, isGroup: it.isGroup, stt: it.stt, danhMuc: it.danhMuc, slDvt: it.slDvt, hvDvt: it.hvDvt, ghiChu: '', nguon: { tep: f.name, dong: it.row, ten: f.p.ten, phamVi: f.p.phamVi } }; NUMS.forEach(k => { rec[k] = it[k]; }); items.push({ c: 'kiemke', rec }); }));
        await S.saveMany(items, { note: 'Nhập ' + ok.length + ' biểu kiểm kê (' + ok.map(f => f.p.maMau + ' kỳ ' + U.fmtDate(f.ky)).join('; ') + ')' });
        A.vs.kk = { ky: ok[0].ky, an: true }; A.vs.tsTab = { t: 'kk' };
        a.close(); UI.toast('Đã nhập ' + items.length + ' dòng kiểm kê của ' + ok.length + ' biểu.', 'ok');
      } catch (er) { UI.fail(er); }
    };
    $('[data-pick]', m.body).onclick = async () => {
      const files = await pickFiles(); if (!files.length) return;
      try {
        list = [];
        for (const f of files) {
          const wb = await UI.readWorkbook(f), ws = wb.Sheets[wb.SheetNames[0]];
          const p = L.parseKiemKe(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }));
          const fm = f.name.match(/(?:^|[^0-9])(\d{2})[-_.]?(\d{2})[-_.]?(20\d{2})(?:[^0-9]|$)/), fromName = fm ? (U.parseDate(fm[1] + '/' + fm[2] + '/' + fm[3]) || '') : '';
          list.push({ name: f.name, p, ky: p.ngay || fromName, kySrc: p.ngay ? 'Lấy từ dòng ký "ngày … tháng … năm …" trên biểu' : fromName ? 'Lấy từ tên tệp — biểu không ghi ngày ký' : '' });
        }
        draw();
      } catch (er) { UI.fail(er); }
    };
  }

  /* ---------- Màn hình ---------- */
  function renderKK(root) {
    const kys = L.kkKys(), St = A.vs.kk || (A.vs.kk = { ky: kys[0] || '', an: true });
    if (!kys.includes(St.ky)) St.ky = kys[0] || '';
    const ky = St.ky, maus = A.OPT.kkMau.map(o => o[0]).filter(m => S.all('kiemke').some(r => r.mau === m && r.ky === ky));
    let h = '<div class="toolbar"><label class="small" for="kk_ky">Kỳ kiểm kê</label><select class="sel" id="kk_ky">' + (kys.length ? kys.map(k => '<option value="' + k + '"' + (k === ky ? ' selected' : '') + '>' + U.fmtDate(k) + '</option>').join('') : '<option>Chưa có</option>') + '</select><label class="check"><input type="checkbox" id="kk_an"' + (St.an ? ' checked' : '') + '> Ẩn dòng không có số liệu</label><span class="sp"></span><button class="btn" data-kkx' + (maus.length ? '' : ' disabled') + '>' + ic('download', 16) + 'Xuất Excel</button><button class="btn primary" data-kki>' + ic('upload', 16) + 'Nhập biểu kiểm kê</button></div>';
    if (!maus.length) { root.innerHTML = h + '<div class="card">' + UI.empty('Chưa có kết quả kiểm kê', 'Nhập các biểu tổng hợp kết quả kiểm kê của Sở (Mẫu 01c-BC/TSCĐ, 08đ-BC/HTNS, 09đ-BC/HTTL). Chọn được nhiều tệp cùng lúc.') + '</div>'; bind(); return; }
    const sums = maus.map(m => ({ m, s: L.kkSum(L.kkRows(m, ky)) })), tot = { ng: U.sum(sums, x => x.s.nguyenGia), cl: U.sum(sums, x => x.s.gtcl) };
    h += '<div class="kpis mb"><div class="kpi acc static"><span class="k-l">Tổng nguyên giá ' + maus.length + ' nhóm</span><span class="k-v"><small>' + U.fmtShort(tot.ng) + '</small></span><span class="k-s">Còn lại ' + U.fmtShort(tot.cl) + ' (' + U.fmtPct(U.pct(tot.cl, tot.ng)) + ')</span></div>' +
      sums.map(({ m, s }) => '<div class="kpi ' + (m === 'tscd' ? 'teal' : m === 'thuyloi' ? 'info' : 'violet') + ' static"><span class="k-l">' + e(MAU_NGAN[m]) + '</span><span class="k-v"><small>' + U.fmtShort(s.nguyenGia) + '</small></span><span class="k-s">' + U.fmtNum(s.slKK, 0) + ' tài sản · còn lại ' + U.fmtPct(s.tyLe) + (s.hong + s.khongSD ? ' · <b style="color:var(--warn-fg)">' + (s.hong + s.khongSD) + ' hỏng, không SD</b>' : '') + '</span></div>').join('') + '</div>';
    // Đối chiếu với biểu nhà, đất 0A.01
    const ts = L.kkRows('tscd', ky), nd = S.all('taisan').filter(L.isNhaDat);
    const dat = L.kkFind(ts, 'dat'), nha = L.kkFind(ts, 'nha');
    if ((dat || nha) && nd.length) {
      const ns = L.ndStats(nd), ndNgay = nd.map(t => t.ndNgay).filter(Boolean).sort().pop();
      const row = (t, a, b, f) => { const d = (typeof a === 'number' && typeof b === 'number') ? b - a : null; return '<tr><td>' + t + '</td><td class="num">' + (a === '' || a === null ? '—' : f(a)) + '</td><td class="num">' + (b === '' || b === null ? '—' : f(b)) + '</td><td class="num ' + (d && Math.abs(d) > 0.5 ? 'lech' : '') + '">' + (d === null ? '' : (d > 0 ? '+' : '') + f(d)) + '</td></tr>'; };
      const ngNhaDat = U.num(dat && dat.nguyenGia) + U.num(nha && nha.nguyenGia), clNhaDat = U.num(dat && dat.gtcl) + U.num(nha && nha.gtcl);
      h += '<div class="card mb"><div class="card-h"><h3>Đối chiếu đất, nhà: kiểm kê (01c) và hiện trạng nhà, đất (0A.01)</h3><div class="sub">Kiểm kê ' + U.fmtDate(ky) + ' · hiện trạng nhà, đất ' + (ndNgay ? U.fmtDate(ndNgay) : '(chưa ghi ngày)') + '. Hai biểu khác thời điểm và khác cách đếm (01c đếm khuôn viên đất và từng ngôi nhà; 0A.01 đếm cơ sở nhà, đất). Chênh lệch chỉ để rà soát, phần mềm không tự sửa số liệu nào.</div></div><div class="card-b"><table class="tbl"><thead><tr><th>Chỉ tiêu</th><th class="num">Kiểm kê 01c</th><th class="num">Hiện trạng 0A.01</th><th class="num">0A.01 − 01c</th></tr></thead><tbody>' +
        row('Số khuôn viên đất (01c) / số cơ sở nhà, đất (0A.01)', dat ? dat.slKK : '', ns.n, v => U.fmtNum(v, 0)) +
        row('Diện tích đất (m²)', dat ? dat.hvKK : '', ns.dtDat, v => U.fmtNum(v, 1)) +
        row('Diện tích nhà (m²)', nha ? nha.hvKK : '', ns.dtNha, v => U.fmtNum(v, 1)) +
        row('Nguyên giá đất + nhà (đồng)', ngNhaDat, ns.nguyenGia, U.fmtMoney) +
        row('Giá trị còn lại đất + nhà (đồng)', clNhaDat, ns.conLai, U.fmtMoney) + '</tbody></table><div class="small muted mt">0A.01 ghi "giá trị tài sản" của cả cơ sở nhà, đất; 01c tách riêng đất, nhà, vật kiến trúc (vật kiến trúc 01c chưa cộng vào dòng trên).</div></div></div>';
    }
    // Kỳ trước để so sánh
    const prevOf = m => kys.filter(k => k < ky).find(k => S.all('kiemke').some(r => r.mau === m && r.ky === k));
    maus.forEach(m => {
      const rows = L.kkRows(m, ky), pk = prevOf(m), prev = pk ? L.kkRows(m, pk) : [], pm = new Map(prev.map(r => [U.norm(r.stt) + '|' + U.norm(r.danhMuc), r]));
      const show = St.an ? rows.filter(r => NUMS.some(k => has(r[k]) && r[k] !== 0)) : rows, s = L.kkSum(rows), r0 = rows[0] || {};
      const tr = r => { const p = pm.get(U.norm(r.stt) + '|' + U.norm(r.danhMuc)), dN = p ? U.num(r.nguyenGia) - U.num(p.nguyenGia) : null, dS = p ? U.num(r.slKK) - U.num(p.slKK) : null;
        const ttc = [['sdKhongDung', 'không đúng MĐ'], ['khongSD', 'không SD'], ['hong', 'hỏng']].filter(([k]) => U.num(r[k])).map(([k, l]) => '<span class="' + (k === 'hong' ? 'lech' : '') + '">' + r[k] + ' ' + l + '</span>').join(', ');
        return '<tr class="click lv' + Math.min(U.num(r.level), 2) + '" data-id="' + r.id + '" tabindex="0"><td class="nowrap">' + e(r.stt) + '</td><td class="wrap" style="min-width:240px;padding-left:' + (12 + U.num(r.level) * 14) + 'px">' + e(r.danhMuc) + '</td><td class="num">' + (has(r.slKK) ? U.fmtNum(r.slKK) + ' <span class="muted small">' + e(r.slDvt) + '</span>' : '') + '</td><td class="num">' + (has(r.hvKK) ? U.fmtNum(r.hvKK) + ' <span class="muted small">' + e(r.hvDvt) + '</span>' : '') + '</td><td class="num">' + (has(r.nguyenGia) ? U.fmtMoney(r.nguyenGia) : '') + '</td><td class="num">' + (has(r.gtcl) ? U.fmtMoney(r.gtcl) : '') + '</td><td style="min-width:100px">' + (U.num(r.nguyenGia) ? UI.pbar(U.pct(U.num(r.gtcl), U.num(r.nguyenGia))) : '') + '</td><td class="num">' + (has(r.daGhiSo) || has(r.chuaGhiSo) ? U.num(r.daGhiSo) + (U.num(r.chuaGhiSo) ? ' / <span class="lech">' + r.chuaGhiSo + ' chưa</span>' : '') : '') + '</td><td class="small">' + (ttc || (U.num(r.sdDung) ? '<span class="muted">' + r.sdDung + ' đúng MĐ</span>' : '')) + '</td><td class="num">' + (U.num(r.ttCo) ? r.ttCo + (U.num(r.ttSoLan) ? ' (' + r.ttSoLan + ' lần)' : '') : '') + '</td>' + (pk ? '<td class="num small">' + (p ? (dS ? (dS > 0 ? '+' : '') + U.fmtNum(dS) + ' SL<br>' : '') + (dN ? (dN > 0 ? '+' : '') + U.fmtShort(dN) : (dS ? '' : '—')) : '<span class="muted">mới</span>') + '</td>' : '') + '</tr>'; };
      h += '<div class="card mb"><div class="card-h"><h3>' + e(MAU_NGAN[m]) + '</h3><span class="tag">' + e(r0.maMau || '') + '</span><div class="sub">' + e([r0.nguon && r0.nguon.phamVi, r0.donViTH].filter(Boolean).join(' · ')) + (pk ? ' · so sánh với kỳ ' + U.fmtDate(pk) : '') + '</div></div><div class="card-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>STT</th><th>Danh mục tài sản</th><th class="num">Số lượng</th><th class="num">Hiện vật</th><th class="num">Nguyên giá</th><th class="num">Giá trị còn lại</th><th>Còn lại</th><th class="num">Ghi sổ</th><th>Tình trạng bất thường</th><th class="num">Thiên tai</th>' + (pk ? '<th class="num">So kỳ trước</th>' : '') + '</tr></thead><tbody>' + show.map(tr).join('') + '</tbody><tfoot><tr><td></td><td>Cộng (dòng cấp 1; số lượng theo dòng chi tiết)</td><td class="num">' + U.fmtNum(s.slKK, 0) + '</td><td></td><td class="num">' + U.fmtMoney(s.nguyenGia) + '</td><td class="num">' + U.fmtMoney(s.gtcl) + '</td><td>' + U.fmtPct(s.tyLe) + '</td><td class="num">' + s.daGhiSo + (s.chuaGhiSo ? ' / ' + s.chuaGhiSo + ' chưa' : '') + '</td><td class="small">' + [s.sdKhongDung ? s.sdKhongDung + ' không đúng MĐ' : '', s.khongSD ? s.khongSD + ' không SD' : '', s.hong ? s.hong + ' hỏng' : ''].filter(Boolean).join(', ') + '</td><td class="num">' + (s.ttCo || '') + '</td>' + (pk ? '<td></td>' : '') + '</tr></tfoot></table></div>' + (St.an && show.length < rows.length ? '<div class="small muted mt">Đang ẩn ' + (rows.length - show.length) + ' dòng danh mục không có số liệu.</div>' : '') + '</div></div>';
    });
    root.innerHTML = h; bind();
    $$('tr[data-id]', root).forEach(t => { const go = () => A.open('kiemke', t.dataset.id); t.onclick = go; t.onkeydown = x => { if (x.key === 'Enter') go(); }; });
    function bind() {
      const s1 = $('#kk_ky', root); if (s1) s1.onchange = () => { St.ky = s1.value; A.render(); };
      const s2 = $('#kk_an', root); if (s2) s2.onchange = () => { St.an = s2.checked; A.render(); };
      $('[data-kki]', root).onclick = importKiemKe;
      const x = $('[data-kkx]', root); if (x) x.onclick = () => exportKK(ky, maus);
    }
  }
  function exportKK(ky, maus) {
    const H = ['STT', 'Danh mục tài sản', 'ĐVT số lượng', 'Số lượng kiểm kê', 'Chênh lệch tăng', 'Chênh lệch giảm', 'ĐVT hiện vật', 'Hiện vật kiểm kê', 'Chênh lệch tăng', 'Chênh lệch giảm', 'Nguyên giá (đồng)', 'GTCL (đồng)', 'Giá trị nâng cấp, mở rộng, cải tạo (đồng)', 'Đã ghi sổ kế toán', 'Chưa ghi sổ kế toán', 'Còn SD — đúng mục đích', 'Còn SD — không đúng mục đích', 'Còn SD — không SD', 'Hỏng, không SD được', 'Thiên tai — có', 'Thiên tai — không', 'Số lần xảy ra'];
    const sheets = maus.map(m => { const rows = L.kkRows(m, ky), r0 = rows[0] || {}, s = L.kkSum(rows);
      return { name: MAU_NGAN[m].slice(0, 28), widths: [7, 54].concat(H.slice(2).map(() => 14)), aoa: [[(r0.maMau || '') + ' — ' + MAU_NGAN[m].toUpperCase()], ['Kỳ kiểm kê ' + U.fmtDate(ky) + (r0.donViTH ? ' · ' + r0.donViTH : '') + ' · xuất từ phần mềm ngày ' + U.fmtDate(U.today())], [], H].concat(rows.map(r => [r.stt, r.danhMuc, r.slDvt, r.slKK, r.slTang, r.slGiam, r.hvDvt, r.hvKK, r.hvTang, r.hvGiam, r.nguyenGia, r.gtcl, r.gtNangCap, r.daGhiSo, r.chuaGhiSo, r.sdDung, r.sdKhongDung, r.khongSD, r.hong, r.ttCo, r.ttKhong, r.ttSoLan])).concat([['', 'TỔNG CỘNG', '', s.slKK, '', '', '', '', '', '', s.nguyenGia, s.gtcl, s.gtNangCap, s.daGhiSo, s.chuaGhiSo, s.sdDung, s.sdKhongDung, s.khongSD, s.hong, s.ttCo, '', '']]) }; });
    UI.xlsx('kiem-ke-tai-san-' + ky.replace(/-/g, '') + '.xlsx', sheets);
    UI.toast('Đã xuất kết quả kiểm kê ' + maus.length + ' nhóm.', 'ok');
  }
  A.openers.kiemke = id => UI.detail({ coll: 'kiemke', id, head: r => '<div class="gap mb"><span class="tag">' + e(r.maMau || '') + '</span><span class="tag">Kỳ ' + U.fmtDate(r.ky) + '</span>' + (r.nguon ? '<span class="small muted">Tệp ' + e(r.nguon.tep) + ', dòng ' + r.nguon.dong + '</span>' : '') + '</div>' + (Sc.C.kiemke.warn(r).length ? '<div class="note warn mb">' + Sc.C.kiemke.warn(r).map(e).join('<br>') + '</div>' : '') });

  // Gắn thẻ "Kiểm kê theo nhóm" vào màn hình Tài sản công
  const base = A.views.taisan.render;
  A.views.taisan.render = function (root, p) {
    const T = A.vs.tsTab || (A.vs.tsTab = { t: 'ds' }); if (p && p.tab) T.t = p.tab; if (p && p.preset) T.t = 'ds';
    const nKK = L.kkKys().length;
    root.innerHTML = '<div class="tabs" role="tablist"><button role="tab" data-tst="ds" class="' + (T.t === 'ds' ? 'on' : '') + '">Danh mục tài sản, nhà đất</button><button role="tab" data-tst="kk" class="' + (T.t === 'kk' ? 'on' : '') + '">Kiểm kê theo nhóm (01c, 08đ, 09đ)' + (nKK ? ' <span class="tag">' + nKK + ' kỳ</span>' : '') + '</button></div><div data-tspane></div>';
    $$('[data-tst]', root).forEach(b => b.onclick = () => { T.t = b.dataset.tst; A.render(); });
    const pane = $('[data-tspane]', root);
    if (T.t === 'kk') renderKK(pane); else base.call(this, pane, p);
  };
  A.importKiemKe = importKiemKe;
})(App);
