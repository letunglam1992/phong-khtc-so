/* ============================================================
   35-ketnoi.js — Kết nối với 2 phần mềm sẵn có của Phòng
   (1) "Điều hành nhiệm vụ" (theodoinhiemvu): đọc Google Sheet nhiệm vụ qua link CSV; tùy chọn ghi kết quả
       hoàn thành ngược về Sheet qua Apps Script (action "update", khóa nhận diện + giá trị gốc để chống ghi đè).
   (2) "Theo dõi dự án đầu tư tỉnh Sơn La" (du-an-dau-tu-son-la): đọc qua backend Apps Script
       POST {action:"getAll", token} — chỉ đọc; hoặc nạp từ tệp JSON sao lưu của phần mềm đó.
   Nguyên tắc: phần mềm gốc là nơi quản lý chính dữ liệu của nó. Bản ghi đồng bộ về mang nhãn nguồn (ext);
   lần đồng bộ sau cập nhật lại các trường do nguồn quản lý, giữ nguyên các trường bổ sung tại đây.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store;
  const K = A.KN = {};
  K.DEF = { nvApp: 'https://theodoinhiemvu.vercel.app/', daApp: 'https://du-an-dau-tu-son-la.vercel.app/' };
  K.cfg = () => Object.assign({ nvCsv: '', nvUrl: '', nvSecret: '', nvApp: K.DEF.nvApp, nvLoc: 'all', daUrl: '', daToken: '', daApp: K.DEF.daApp, daNganh: null, daTasks: true }, S.cfg.ketNoi || {});
  K.SRC = { tdnv: 'Điều hành nhiệm vụ', dadt: 'Dự án đầu tư', 'dadt-task': 'Dự án đầu tư (công việc)' };

  /* ---------- Phần mềm nhiệm vụ: cột của Sheet (đúng bảng COT_DU_LIEU trong Code.gs của phần mềm đó) ---------- */
  const COT = [
    ['stt', ['stt', 'tt', 'so thu tu']], ['so_hieu_vb', ['so ky hieu', 'so hieu van ban']], ['noi_dung_vb', ['trich yeu']], ['loai_van_ban', ['loai van ban']],
    ['cq_giao', ['co quan ban hanh']], ['ngay_ban_hanh', ['ngay thang nam ban hanh', 'ngay ban hanh']], ['nhiem_vu', ['noi dung nhiem vu']],
    ['cq_chu_tri', ['phong don vi chu tri']], ['cq_phoi_hop', ['phong don vi phoi hop']], ['han', ['han hoan thanh']], ['so_cv_hoan_thanh', ['so van ban hoan thanh']],
    ['ngay_hoan_thanh', ['ngay thang nam hoan thanh', 'ngay hoan thanh']], ['nguoi_phu_trach', ['nguoi tham muu']], ['delay_reason', ['ly do cham']], ['ghi_chu', ['ghi chu']], ['vai_tro_phong', ['vai tro phong']]];
  const kd = s => U.norm(s).replace(/[*:()\[\].,;\/\\-]+/g, ' ').replace(/\s+/g, ' ').trim();   // như khongDau_ của Code.gs
  const cell = v => (v === null || v === undefined) ? '' : String(v).replace(/\s+/g, ' ').trim();
  K.normalizeCsvUrl = url => {
    url = (url || '').trim(); if (!url) return url;
    if (/\/pubhtml/.test(url) && !/output=csv/.test(url)) return url.replace(/\/pubhtml.*$/, '/pub?output=csv');
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m && /\/edit/.test(url) && !/\/d\/e\//.test(url)) { const g = url.match(/[#&?]gid=(\d+)/); return 'https://docs.google.com/spreadsheets/d/' + m[1] + '/export?format=csv' + (g ? '&gid=' + g[1] : ''); }
    return url;
  };
  // rows: mảng 2 chiều (đọc từ CSV). Trả {headerRow, map, items:[{row, ...trường}], missing:[]}
  K.parseSheetNV = rows => {
    let best = { row: -1, score: 0, map: {} };
    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const map = {}; let score = 0;
      (rows[r] || []).forEach((c, ci) => { const n = kd(c); if (!n) return; COT.forEach(([f, al]) => { if (map[f] === undefined && al.includes(n)) { map[f] = ci; score++; } }); });
      if (score > best.score) best = { row: r, score, map };
    }
    const out = { headerRow: best.row, map: best.map, items: [], missing: [], gid: '' };
    if (best.score < 4 || best.map.nhiem_vu === undefined && best.map.noi_dung_vb === undefined) { out.error = 'Không nhận ra dòng tiêu đề của Sheet nhiệm vụ (cần các cột: Số ký hiệu, Trích yếu, Nội dung nhiệm vụ, Hạn hoàn thành…).'; return out; }
    out.missing = COT.filter(([f]) => best.map[f] === undefined && f !== 'vai_tro_phong' && f !== 'stt').map(([f, al]) => al[0]);
    for (let r = best.row + 1; r < rows.length; r++) {
      const row = rows[r] || [], it = { row: r + 1 };
      COT.forEach(([f]) => { it[f] = best.map[f] === undefined ? '' : cell(row[best.map[f]]); });
      if (!it.nhiem_vu && !it.noi_dung_vb && !it.so_hieu_vb) continue;
      out.items.push(it);
    }
    return out;
  };
  K.nvKey = it => [it.so_hieu_vb, it.noi_dung_vb, it.nhiem_vu].map(x => U.norm(x)).join('|');
  const findCB = name => {
    const n = U.norm(String(name || '').replace(/^(đ\/c|đc|dc|đồng chí)\.?\s+/i, '')); if (!n || n === 'chua phan cong') return null;
    const cbs = S.all('canbo');
    return cbs.find(c => U.norm(c.hoTen) === n) || cbs.find(c => U.norm(c.tenGoi) === n) || cbs.find(c => U.norm(c.hoTen).endsWith(' ' + n)) || null;
  };
  K.findCB = findCB;
  const nguonVB = cq => { const n = U.norm(cq); return /ubnd tinh|uy ban nhan dan tinh/.test(n) ? 'UBND tỉnh' : /tinh uy|hdnd|hoi dong nhan dan|ban thuong vu/.test(n) ? 'Tỉnh ủy, HĐND tỉnh' : /^so nong nghiep|giam doc so|lanh dao so/.test(n) ? 'Giám đốc Sở, lãnh đạo Sở' : /^bo |chinh phu|thu tuong|tong cuc|^cuc /.test(n) ? 'Bộ, ngành Trung ương' : n ? 'Sở, ngành, cơ quan, đơn vị khác' : 'Khác'; };
  const laCuaPhong = it => { const s = U.norm([it.cq_chu_tri, it.cq_phoi_hop, it.vai_tro_phong].join(' ')); return !!it.nguoi_phu_trach && U.norm(it.nguoi_phu_trach) !== 'chua phan cong' || /khtc|kh tc|ke hoach tai chinh|ke hoach - tai chinh|phong chu tri|phong phoi hop|ca nhan tham muu/.test(s); };

  /* Lập kế hoạch đồng bộ nhiệm vụ: không ghi gì, chỉ trả danh sách thêm / cập nhật / giữ nguyên */
  K.planNV = (parsed, loc) => {
    const plan = { items: [], them: 0, sua: 0, giu: 0, boQua: 0, loiNgay: [], vangMat: [], vbThem: 0 };
    const cu = new Map(S.all('nhiemvu').filter(t => t.ext && t.ext.src === 'tdnv').map(t => [t.ext.key, t]));
    const vbCu = new Map(S.all('vanban').filter(v => v.ext && v.ext.src === 'tdnv').map(v => [v.ext.key, v]));
    const vbTay = S.all('vanban').filter(v => !v.ext), seen = new Set(), vbNew = new Map();
    parsed.items.forEach(it => {
      if (loc === 'phong' && !laCuaPhong(it)) { plan.boQua++; return; }
      const key = K.nvKey(it); if (seen.has(key)) { plan.boQua++; return; } seen.add(key);
      const han = U.parseDate(it.han), nbh = U.parseDate(it.ngay_ban_hanh), nht = U.parseDate(it.ngay_hoan_thanh);
      if (han === null) plan.loiNgay.push('Dòng ' + it.row + ': hạn hoàn thành "' + it.han + '" không hợp lệ — coi như chưa có hạn.');
      if (nht === null) plan.loiNgay.push('Dòng ' + it.row + ': ngày hoàn thành "' + it.ngay_hoan_thanh + '" không hợp lệ.');
      const names = it.nguoi_phu_trach.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean), cbs = names.map(findCB).filter(Boolean);
      const xong = !!(nht || it.so_cv_hoan_thanh), old = cu.get(key);
      // --- văn bản ---
      let vbKey = it.so_hieu_vb ? U.norm(it.so_hieu_vb) + '|' + (nbh || '') : '', vbRec = null;
      if (vbKey) {
        const tay = vbTay.find(v => U.norm(v.soKyHieu) === U.norm(it.so_hieu_vb) && (v.ngayBanHanh || '') === (nbh || ''));
        const src = { soKyHieu: it.so_hieu_vb, ngayBanHanh: nbh || '', coQuan: it.cq_giao, trichYeu: it.noi_dung_vb || it.nhiem_vu, nguon: nguonVB(it.cq_giao) };
        if (tay) vbRec = { id: tay.id, _keep: true };
        else if (vbCu.has(vbKey)) vbRec = Object.assign({}, vbCu.get(vbKey), src);
        else if (vbNew.has(vbKey)) vbRec = vbNew.get(vbKey);
        else { vbRec = Object.assign({ id: U.uid('va'), trangThai: 'chua', vaiTro: 'chutri', phoiHopIds: [], duAnIds: [], dinhKem: [], ext: { src: 'tdnv', key: vbKey } }, src, { ghiChu: it.loai_van_ban ? 'Loại văn bản: ' + it.loai_van_ban : '' }); vbNew.set(vbKey, vbRec); plan.vbThem++; }
      }
      // --- nhiệm vụ: các trường do Sheet quản lý ---
      const src = {
        ten: it.nhiem_vu || it.noi_dung_vb, canCu: [it.so_hieu_vb ? 'Văn bản số ' + it.so_hieu_vb : '', nbh ? 'ngày ' + U.fmtDate(nbh) : '', it.cq_giao ? 'của ' + it.cq_giao : ''].filter(Boolean).join(' '),
        ngayGiao: nbh || '', han: han || '', vaiTro: /phoi hop/.test(U.norm(it.vai_tro_phong)) ? 'phoihop' : 'chutri',
        chuTriId: cbs[0] ? cbs[0].id : '', phoiHopIds: cbs.slice(1).map(c => c.id), nguyenNhanCham: it.delay_reason,
        nguon: 'Văn bản giao', loaiTG: 'phatsinh'
      };
      const ext = { src: 'tdnv', key, row: it.row, base: { so_cv_hoan_thanh: it.so_cv_hoan_thanh, ngay_hoan_thanh_iso: it.ngay_hoan_thanh, delay_reason: it.delay_reason, nguoi_phu_trach: it.nguoi_phu_trach }, k: { so_hieu_vb: it.so_hieu_vb, noi_dung_vb: it.noi_dung_vb, nhiem_vu: it.nhiem_vu }, nguoiGoc: names.length && !cbs.length ? it.nguoi_phu_trach : '', dv: [it.cq_chu_tri, it.cq_phoi_hop].filter(Boolean).join(' / ') };
      let rec;
      if (old) {
        rec = Object.assign({}, old, src, { ext });
        if (!cbs.length && old.chuTriId) { rec.chuTriId = old.chuTriId; rec.phoiHopIds = old.phoiHopIds || []; }   // Sheet chưa ghi người, hoặc ghi tên không khớp cán bộ nào → giữ phân công đã làm tại đây
        if (xong) { rec.trangThai = 'hoanthanh'; rec.ngayHT = nht || old.ngayHT || U.today(); rec.tienDo = 100; if (it.so_cv_hoan_thanh) rec.ketQua = 'Văn bản hoàn thành: ' + it.so_cv_hoan_thanh; }
        else if (old.trangThai === 'hoanthanh' && old.ext && old.ext.base && (old.ext.base.ngay_hoan_thanh_iso || old.ext.base.so_cv_hoan_thanh)) { rec.trangThai = 'dang'; rec.ngayHT = ''; rec.tienDo = Math.min(90, U.num(old.tienDo)); } // Sheet đã gỡ hoàn thành
      } else {
        rec = Object.assign({ id: U.uid('nh'), nam: U.yearOf(han || '') || U.yearOf(nbh || '') || +U.today().slice(0, 4), trangThai: xong ? 'hoanthanh' : 'chua', tienDo: xong ? 100 : 0, ngayHT: xong ? (nht || U.today()) : '', ketQua: it.so_cv_hoan_thanh ? 'Văn bản hoàn thành: ' + it.so_cv_hoan_thanh : '', uuTien: 'thuong', vanBanIds: [], duAnIds: [], dinhKem: [], ghiChu: it.ghi_chu, noiDung: it.noi_dung_vb && it.nhiem_vu ? it.noi_dung_vb : '' }, src, { ext });
      }
      if (vbRec && !(rec.vanBanIds || []).includes(vbRec.id)) rec.vanBanIds = (rec.vanBanIds || []).concat([vbRec.id]);
      const changed = !old || A.Schema.diff('nhiemvu', old, rec).length > 0 || JSON.stringify(old.ext) !== JSON.stringify(ext);
      const real = !old || A.Schema.diff('nhiemvu', old, rec).length > 0;
      if (!old) plan.them++; else if (real) plan.sua++; else plan.giu++;
      plan.items.push({ rec, changed, isNew: !old, real, vb: vbRec && !vbRec._keep ? vbRec : null });
    });
    cu.forEach((t, key) => { if (!seen.has(key) && !(loc === 'phong')) plan.vangMat.push(t); });
    return plan;
  };
  K.applyNV = async (plan, note) => {
    const items = [], vbDone = new Set();
    plan.items.forEach(p => {
      if (p.vb && !vbDone.has(p.vb.id)) { vbDone.add(p.vb.id); const cur = S.get('vanban', p.vb.id); if (!cur || A.Schema.diff('vanban', cur, p.vb).length) items.push({ c: 'vanban', rec: p.vb }); }
      if (p.changed) { if (p.isNew && !p.rec.ma) p._ma = true; items.push({ c: 'nhiemvu', rec: p.rec }); }
    });
    let seq = 0; const base = A.Schema.nextMa('nhiemvu');
    items.forEach(x => { if (x.c === 'nhiemvu' && !x.rec.ma) x.rec.ma = base.replace(/(\d+)$/, d => String(+d + seq++).padStart(3, '0')); });
    if (items.length) await S.saveMany(items, { note });
    return items.length;
  };
  // Việc đã hoàn thành tại đây nhưng Sheet chưa ghi → danh sách có thể đẩy về Sheet
  K.pendingPush = () => S.all('nhiemvu').filter(t => t.ext && t.ext.src === 'tdnv' && t.ext.base).map(t => {
    const b = t.ext.base, f = {};
    const d = t.trangThai === 'hoanthanh' && t.ngayHT ? U.fmtDate(t.ngayHT) : '';
    if (d && !b.ngay_hoan_thanh_iso) f.ngay_hoan_thanh_iso = d;
    const so = ((t.ketQua || '').match(/Văn bản hoàn thành:\s*(.+)$/m) || [])[1];
    if (t.trangThai === 'hoanthanh' && so && !b.so_cv_hoan_thanh) f.so_cv_hoan_thanh = so.trim();
    if ((t.nguyenNhanCham || '') !== (b.delay_reason || '') && (t.nguyenNhanCham || '').trim()) f.delay_reason = t.nguyenNhanCham.trim();
    const cb = t.chuTriId ? S.get('canbo', t.chuTriId) : null;
    if (cb && (!b.nguoi_phu_trach || U.norm(b.nguoi_phu_trach) === 'chua phan cong')) f.nguoi_phu_trach = cb.tenGoi || cb.hoTen;
    return Object.keys(f).length ? { t, fields: f, base: Object.keys(f).reduce((o, k) => (o[k] = b[k] || '', o), {}) } : null;
  }).filter(Boolean);
  K.pushNV = async list => {
    const c = K.cfg(), gid = (K.normalizeCsvUrl(c.nvCsv).match(/[?&#]gid=(\d+)/) || [])[1] || '';
    const body = { action: 'update', secret: c.nvSecret, gid, items: list.map(x => ({ id: x.t.id, sync_row: x.t.ext.row, key: x.t.ext.k, fields: x.fields, base: x.base })) };
    const r = await fetch(c.nvUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', credentials: 'omit', cache: 'no-store' });
    if (!r.ok) throw new Error('Apps Script trả mã ' + r.status);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error === 'unauthorized' ? 'Sai mã bí mật' : j.error === 'secret_not_configured' ? 'Apps Script chưa đặt MA_BI_MAT' : (j.message || j.error || 'Apps Script từ chối'));
    const res = { ok: 0, conflict: [], fail: [] }, saves = [];
    (j.results || []).forEach(o => {
      const x = list.find(q => q.t.id === o.id); if (!x) return;
      if (o.status === 'ok' || o.status === 'partial') {
        const nb = Object.assign({}, x.t.ext.base); (o.written || []).forEach(f => { nb[f] = x.fields[f]; });
        saves.push({ c: 'nhiemvu', rec: Object.assign({}, x.t, { ext: Object.assign({}, x.t.ext, { base: nb, row: o.row || x.t.ext.row }) }) });
        if (o.status === 'ok') res.ok++; else res.conflict.push({ t: x.t, c: o.conflicts || [] });
      } else res.fail.push({ t: x.t, msg: o.message || o.status });
    });
    if (saves.length) await S.saveMany(saves, { silent: false });
    return res;
  };
  K.fetchNV = async () => {
    const url = K.normalizeCsvUrl(K.cfg().nvCsv); if (!/^https?:\/\//i.test(url)) throw new Error('Chưa nhập link CSV của Google Sheet nhiệm vụ.');
    const r = await fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store' });
    if (!r.ok) throw new Error('Tải Sheet thất bại (HTTP ' + r.status + '). Kiểm tra link và quyền chia sẻ/công bố của Sheet.');
    const text = await r.text();
    if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('Link trả về trang web chứ không phải CSV. Dùng link "Xuất bản lên web" dạng CSV như đã cấu hình ở phần mềm Điều hành nhiệm vụ.');
    return K.csvRows(text);
  };
  K.csvRows = text => { const wb = XLSX.read(text, { type: 'string', raw: true }); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }); };

  /* ---------- Phần mềm dự án đầu tư ---------- */
  // Trọng số mốc — chép đúng hàm milestoneWeight của phần mềm dự án để % tiến độ trùng nhau
  const mw = name => { const n = (name || '').toLowerCase(); if (n.includes('xây dựng công trình')) return 3; if (n.includes('giám sát') || n.includes('nghiệm thu') || n.includes('quyết toán') || n.includes('giấy phép xây dựng')) return 2; if (n.includes('giao đất') || n.includes('chuyển mục đích') || n.includes('thu hồi đất') || n.includes('cấp gcn') || n.includes('quyết định đầu tư') || n.includes('chấp thuận') || n.includes('đấu thầu lựa chọn') || n.includes('tiền sử dụng đất') || n.includes('tiền thuê đất') || n.includes('giá đất')) return 2; return 1; };
  K.daProgress = p => { let d = 0, t = 0; (p.moc || []).forEach(m => { if (m.st === 'khong') return; const w = mw(m.name); t += w; if (m.st === 'xong') d += w; }); return t ? Math.round(d / t * 100) : 0; };
  K.nganhTen = n => n === 'dien' ? 'Năng lượng, điện' : n === 'dothi' ? 'Đô thị, nhà ở' : (n || 'Chưa phân ngành');
  const ST = { xong: 'hoanthanh', dang: 'dang', khong: 'khongad' };
  K.mapDA = (p, old) => {
    const pct = K.daProgress(p), cb = findCB(p.nguoi_phu_trach), oldMoc = new Map(((old && old.moc) || []).map(m => [m.ten, m]));
    const src = {
      ten: p.ten, loai: p.nganh === 'Đầu tư công' ? 'Dự án đầu tư công' : 'Dự án của tỉnh (tham gia ý kiến chủ trương đầu tư)', vaiTroSo: 'Tham gia ý kiến, thẩm định', linhVuc: K.nganhTen(p.nganh),
      chuDauTu: p.ndt || '', diaDiem: p.dia_diem || [p.huyen].filter(Boolean).join(', '), tmdt: (p.von === null || p.von === undefined || p.von === '') ? '' : Math.round(+p.von * 1e9),
      ketThuc: U.isISO(String(p.ngay_hoan_thanh_du_kien || '').slice(0, 10)) ? String(p.ngay_hoan_thanh_du_kien).slice(0, 10) : '',
      tienDo: pct, trangThai: pct >= 100 ? 'hoanthanh' : pct === 0 ? 'chuanbi' : 'dangth', khoKhan: p.ghi_chu || '',
      moc: (p.moc || []).map(m => { const o = oldMoc.get(m.name) || {}; return { id: o.id || U.uid('m'), ten: m.name, nhom: o.nhom || '', batDau: o.batDau || '', ketThuc: o.ketThuc || '', trangThai: ST[m.st] || 'chua', ngayHT: m.st === 'xong' ? (o.ngayHT || '') : '', ghiChu: m.vb || '' }; })
    };
    const ext = { src: 'dadt', id: String(p.id), nganh: p.nganh, dt_ha: p.dt_ha, hinhThuc: p.hinh_thuc || '', loaiHinh: p.loai || '', tienDoMoTa: p.tien_do_du_an || '', nguoiGoc: p.nguoi_phu_trach && !cb ? p.nguoi_phu_trach : '', capNhat: p.updated_at || '' };
    const rec = old ? Object.assign({}, old, src, { ext }) : Object.assign({ id: U.uid('du'), ma: 'DADT-' + String(p.id).replace(/[^a-zA-Z0-9]+/g, '-'), nguonVon: [], phoiHopIds: [], dinhKem: [], canBoId: '' }, src, { ext });
    if (cb) rec.canBoId = cb.id;
    return rec;
  };
  K.planDA = (data, nganhPick, withTasks) => {
    const plan = { items: [], them: 0, sua: 0, giu: 0, boQua: 0, vangMat: [], nganh: {}, tk: { them: 0, sua: 0, giu: 0 } };
    const cu = new Map(S.all('duan').filter(d => d.ext && d.ext.src === 'dadt').map(d => [d.ext.id, d])), seen = new Set(), idMap = new Map();
    (data.projects || []).forEach(p => {
      if (!p || p.id === undefined || p.deleted_at) return;
      plan.nganh[p.nganh || ''] = (plan.nganh[p.nganh || ''] || 0) + 1;
      if (nganhPick && !nganhPick.includes(p.nganh || '')) { plan.boQua++; return; }
      const old = cu.get(String(p.id)); seen.add(String(p.id));
      const rec = K.mapDA(p, old); idMap.set(String(p.id), rec.id);
      const real = !old || A.Schema.diff('duan', old, rec).length > 0, changed = real || JSON.stringify(old.ext) !== JSON.stringify(rec.ext);
      if (!old) plan.them++; else if (real) plan.sua++; else plan.giu++;
      plan.items.push({ c: 'duan', rec, changed });
    });
    cu.forEach((d, id) => { if (!seen.has(id) && !(nganhPick && !nganhPick.includes(d.ext.nganh || ''))) plan.vangMat.push(d); });
    if (withTasks) {
      const tcu = new Map(S.all('nhiemvu').filter(t => t.ext && t.ext.src === 'dadt-task').map(t => [t.ext.id, t]));
      (data.tasks || []).forEach(t => {
        if (!t || !t.id || t.deleted_at || !t.tieu_de) return;
        const did = t.project_id !== null && t.project_id !== undefined ? idMap.get(String(t.project_id)) : null;
        if (t.project_id && !did) return;                       // dự án không thuộc ngành được chọn
        const old = tcu.get(String(t.id)), xong = t.trang_thai === 'xong', han = U.isISO(String(t.han || '').slice(0, 10)) ? String(t.han).slice(0, 10) : '';
        const src = { ten: t.tieu_de, han, uuTien: t.uu_tien === 'cao' ? 'cao' : 'thuong', canCu: t.can_cu || '', nguon: 'Khác', loaiTG: 'phatsinh', nhom: '9' };
        const ext = { src: 'dadt-task', id: String(t.id), pid: t.project_id ? String(t.project_id) : '' };
        let rec;
        if (old) { rec = Object.assign({}, old, src, { ext }); if (xong) { rec.trangThai = 'hoanthanh'; rec.tienDo = 100; rec.ngayHT = String(t.done_at || '').slice(0, 10) || old.ngayHT || U.today(); } else if (old.trangThai === 'hoanthanh') { rec.trangThai = 'dang'; rec.ngayHT = ''; rec.tienDo = 90; } }
        else rec = Object.assign({ id: U.uid('nh'), nam: U.yearOf(han) || +U.today().slice(0, 4), trangThai: xong ? 'hoanthanh' : (t.trang_thai === 'cho' ? 'tamdung' : 'chua'), tienDo: xong ? 100 : 0, ngayHT: xong ? (String(t.done_at || '').slice(0, 10) || U.today()) : '', ngayGiao: String(t.created_at || '').slice(0, 10), chuTriId: '', phoiHopIds: [], vanBanIds: [], dinhKem: [], vaiTro: 'chutri', ghiChu: [t.moc_name ? 'Mốc: ' + t.moc_name : '', t.ghi_chu || ''].filter(Boolean).join('. ') }, src, { ext });
        if (did && !(rec.duAnIds || []).includes(did)) rec.duAnIds = (rec.duAnIds || []).concat([did]); if (!rec.duAnIds) rec.duAnIds = [];
        const real = !old || A.Schema.diff('nhiemvu', old, rec).length > 0;
        plan.tk[!old ? 'them' : real ? 'sua' : 'giu']++;
        plan.items.push({ c: 'nhiemvu', rec, changed: real });
      });
    }
    return plan;
  };
  K.applyDA = async (plan, note) => {
    const items = plan.items.filter(x => x.changed).map(x => ({ c: x.c, rec: x.rec }));
    let seq = 0; const base = A.Schema.nextMa('nhiemvu');
    items.forEach(x => { if (x.c === 'nhiemvu' && !x.rec.ma) x.rec.ma = base.replace(/(\d+)$/, d => String(+d + seq++).padStart(3, '0')); });
    // bổ sung lĩnh vực mới vào danh mục để lọc được
    const lv = new Set(A.list('linhVucDA')); let add = false; items.forEach(x => { if (x.c === 'duan' && x.rec.linhVuc && !lv.has(x.rec.linhVuc)) { lv.add(x.rec.linhVuc); add = true; } });
    if (add) await S.setCfg({ lists: Object.assign({}, S.cfg.lists || {}, { linhVucDA: Array.from(lv) }) });
    if (items.length) await S.saveMany(items, { note });
    return items.length;
  };
  K.fetchDA = async () => {
    const c = K.cfg(); if (!/^https?:\/\//i.test(c.daUrl)) throw new Error('Chưa nhập địa chỉ Web App (backend) của phần mềm dự án.');
    const r = await fetch(c.daUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getAll', token: c.daToken }), redirect: 'follow', credentials: 'omit', cache: 'no-store' });
    if (!r.ok) throw new Error('Backend trả mã ' + r.status);
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    if (!Array.isArray(j.projects)) throw new Error('Phản hồi không có danh mục dự án.');
    return j;
  };
  // Tệp JSON: bản sao lưu của phần mềm dự án (có projects) hoặc RAW_DATA
  K.readDAFile = obj => { const d = obj && (Array.isArray(obj.projects) ? obj : obj.data && Array.isArray(obj.data.projects) ? obj.data : obj.RAW_DATA); if (!d || !Array.isArray(d.projects)) throw new Error('Tệp không có danh mục dự án (trường "projects").'); if (!d.projects.every(p => p && p.id !== undefined && typeof p.ten === 'string')) throw new Error('Danh mục dự án trong tệp không đúng cấu trúc (thiếu id hoặc ten).'); return d; };

  K.link = rec => { const c = K.cfg(), e = rec && rec.ext; if (!e) return null; if (e.src === 'dadt') return { url: c.daApp.replace(/[#?].*$/, '') + '#/du-an/' + encodeURIComponent(e.id), label: 'Mở trong phần mềm Dự án đầu tư' }; if (e.src === 'dadt-task') return { url: c.daApp.replace(/[#?].*$/, '') + (e.pid ? '#/du-an/' + encodeURIComponent(e.pid) : '#/tasks'), label: 'Mở trong phần mềm Dự án đầu tư' }; if (e.src === 'tdnv') return { url: c.nvApp, label: 'Mở phần mềm Điều hành nhiệm vụ' }; return null; };
  K.count = () => ({ nv: S.all('nhiemvu').filter(t => t.ext && t.ext.src === 'tdnv').length, vb: S.all('vanban').filter(t => t.ext && t.ext.src === 'tdnv').length, da: S.all('duan').filter(t => t.ext && t.ext.src === 'dadt').length, tk: S.all('nhiemvu').filter(t => t.ext && t.ext.src === 'dadt-task').length });
})(App);
