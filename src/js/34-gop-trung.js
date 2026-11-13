/* ============================================================
   34-gop-trung.js — Gộp bản ghi trùng (cán bộ, đơn vị, đầu mục chức năng)
   Nguyên nhân: mỗi máy tự nạp danh mục ban đầu với mã riêng; "Tải về và gộp" từ máy khác sinh 2 bản cùng tên.
   Cách gộp: giữ bản sửa gần nhất (bổ sung trường còn trống từ bản kia), đổi mọi tham chiếu sang bản giữ lại, xóa bản thừa.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L;
  const KHOA = { canbo: r => U.norm(r.hoTen), donvi: r => U.norm(r.ten), danhmuc: r => U.norm(r.ma) };
  const rong = v => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

  // Trả về số bản ghi đã gộp. dryRun: chỉ đếm.
  L.gopTrung = async dryRun => {
    const doi = new Map(), xoa = [], giu = new Map();
    Object.keys(KHOA).forEach(c => {
      const nhom = new Map();
      S.all(c).forEach(r => { const k = KHOA[c](r); if (!k) return; (nhom.get(k) || nhom.set(k, []).get(k)).push(r); });
      nhom.forEach(list => {
        if (list.length < 2) return;
        list.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        const w = Object.assign({}, list[0]);
        list.slice(1).forEach(r => { Object.keys(r).forEach(k => { if (rong(w[k]) && !rong(r[k])) w[k] = r[k]; }); doi.set(r.id, w.id); xoa.push([c, r.id]); });
        giu.set(c + ':' + w.id, { c, rec: w });
      });
    });
    if (!xoa.length || dryRun) return xoa.length;
    const sua = new Map(giu);
    const thay = v => typeof v === 'string' ? (doi.get(v) || v) : Array.isArray(v) ? Array.from(new Set(v.map(thay))) : (v && typeof v === 'object' ? thayObj(v) : v);
    const thayObj = o => { let ch = false; const n = Array.isArray(o) ? [] : {}; Object.keys(o).forEach(k => { const v = thay(o[k]); if (v !== o[k] && JSON.stringify(v) !== JSON.stringify(o[k])) ch = true; n[k] = v; }); return ch ? n : o; };
    Object.keys(S.data).forEach(c => {
      if (c === 'lichsu') return;
      S.all(c).forEach(r => {
        if (doi.has(r.id)) return;
        const key = c + ':' + r.id, base = sua.has(key) ? sua.get(key).rec : r, n = {};
        let ch = false;
        Object.keys(base).forEach(k => { if (k === 'id') { n[k] = base[k]; return; } const v = thay(base[k]); if (JSON.stringify(v) !== JSON.stringify(base[k])) ch = true; n[k] = v; });
        if (ch || sua.has(key)) sua.set(key, { c, rec: n });
      });
    });
    const items = Array.from(sua.values());
    await S.saveMany(items, { silent: true, note: 'Gộp ' + xoa.length + ' bản ghi trùng tên (cán bộ, đơn vị, chức năng) và đổi tham chiếu sang bản giữ lại' });
    await S.removeMany(xoa, 'Xóa ' + xoa.length + ' bản ghi trùng sau khi gộp');
    return xoa.length;
  };

  // Gộp tự động sau khi tải về và gộp dữ liệu từ máy khác / bản sao lưu
  const imp = S.importAll.bind(S);
  S.importAll = async (obj, mode) => { const r = await imp(obj, mode); try { r.gopTrung = await L.gopTrung(); } catch (x) { console.warn(x); } return r; };
})(App);
