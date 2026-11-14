/* ============================================================
   56f-quytrinh.js — Quy trình theo từng hình thức lựa chọn nhà thầu
   Người dùng khai báo cho mỗi hình thức: các bước, hồ sơ cần có, thời hạn tối đa (ngày, tính từ bước liền trước),
   căn cứ pháp lý và đánh dấu "đã đối chiếu văn bản gốc". Phần mềm KHÔNG tự gán thời hạn hay điều khoản:
   chỉ thời hạn đã đánh dấu đối chiếu mới dùng để cảnh báo quá hạn.
   Bước đã làm lấy từ "Tiến trình lựa chọn nhà thầu" (tienTrinh) của gói thầu.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const lay = () => S.cfg.qtLCNT || {};
  const XONG = ['dakyhd', 'huy'];

  // Đánh giá quy trình của một gói thầu. Trả về null nếu hình thức chưa có quy trình.
  L.gtQT = g => {
    const qt = lay()[g.hinhThuc]; if (!qt || !(qt.buoc || []).length) return null;
    const tt = g.tienTrinh || [], today = U.today();
    const buoc = qt.buoc.map(b => { const x = tt.filter(t => U.norm(t.buoc) === U.norm(b.ten) && (U.isISO(t.ngay) || true)).sort((p, q) => (p.ngay || '') < (q.ngay || '') ? -1 : 1)[0]; return Object.assign({}, b, { xong: !!x, ngay: x ? x.ngay || '' : '' }); });
    let cuoi = -1; buoc.forEach((b, i) => { if (b.xong) cuoi = i; });
    const thieu = buoc.filter((b, i) => i < cuoi && !b.xong);
    const iTiep = buoc.findIndex((b, i) => i > cuoi && !b.xong), tiep = iTiep >= 0 ? buoc[iTiep] : null;
    let han = '', qua = false, chuaXN = false;
    if (tiep && !XONG.includes(g.trangThai)) {
      const truoc = buoc.slice(0, iTiep).reverse().find(b => b.xong && U.isISO(b.ngay));
      if (U.num(tiep.han) > 0 && truoc) { if (tiep.xn) { han = U.addDays(truoc.ngay, U.num(tiep.han)); qua = today > han; } else chuaXN = true; }
    }
    return { qt, buoc, thieu, tiep, han, qua, chuaXN, xongHet: !tiep };
  };

  // Khối hiển thị trong chi tiết gói thầu (nối sau thanh bước có sẵn)
  const goc = A.gtStepper;
  A.gtStepper = g => {
    const h = goc ? goc(g) : '', q = L.gtQT(g);
    if (!g.hinhThuc) return h;
    if (!q) return h + '<div class="note small mb">Hình thức "' + e(g.hinhThuc) + '" chưa khai báo quy trình (các bước, hồ sơ, thời hạn). Khai báo tại Thiết lập → Quy trình lựa chọn nhà thầu.</div>';
    return h + '<div class="card mb"><div class="card-h"><h3>Quy trình: ' + e(g.hinhThuc) + '</h3><div class="sub">' + q.buoc.filter(b => b.xong).length + '/' + q.buoc.length + ' bước đã ghi nhận' + (q.thieu.length ? ' · <b style="color:var(--bad-fg)">thiếu ' + q.thieu.length + ' bước</b>' : '') + (q.qua ? ' · <b style="color:var(--bad-fg)">quá hạn bước "' + e(q.tiep.ten) + '"</b>' : '') + '</div></div><div class="card-b"><ol class="qt-ds">' +
      q.buoc.map(b => { const laTiep = q.tiep && b === q.tiep, laThieu = q.thieu.includes(b); return '<li class="' + (b.xong ? 'xong' : laThieu ? 'thieu' : laTiep ? 'tiep' : '') + '"><div class="qt-h"><b>' + e(b.ten) + '</b><span class="small">' + (b.xong ? '✓ ' + (b.ngay ? U.fmtDate(b.ngay) : 'đã ghi, chưa có ngày') : laThieu ? 'Thiếu — các bước sau đã làm' : laTiep ? 'Bước tiếp theo' + (q.han ? ' · hạn ' + U.fmtDate(q.han) + (q.qua ? ' (đã quá ' + U.diffDays(U.today(), q.han) + ' ngày)' : '') : q.chuaXN ? ' · thời hạn chưa được xác nhận' : '') : '') + '</span></div>' +
        (b.hoSo ? '<div class="t2">Hồ sơ: ' + e(b.hoSo) + '</div>' : '') + (U.num(b.han) > 0 || b.canCu ? '<div class="t2">' + (U.num(b.han) > 0 ? 'Tối đa ' + U.num(b.han) + ' ngày từ bước trước' + (b.xn ? '' : ' (chưa đối chiếu)') : '') + (b.canCu ? (U.num(b.han) > 0 ? ' · ' : '') + 'Căn cứ: ' + e(b.canCu) : '') + '</div>' : '') + '</li>'; }).join('') +
      '</ol><div class="small muted">Bước được ghi nhận khi thêm dòng cùng tên ở "Tiến trình lựa chọn nhà thầu" (Sửa gói thầu). Hồ sơ đính kèm: ' + (g.dinhKem || []).length + ' tệp.</div></div></div>';
  };

  // Đưa vào "Việc cần xử lý" của trang Đấu thầu: gói thiếu bước, bước quá hạn đã xác nhận
  const goc2 = L.dtViec;
  L.dtViec = f => {
    const out = goc2(f);
    try {
      L.dtLoc(f).gts.forEach(g => {
        if (XONG.includes(g.trangThai)) return; const q = L.gtQT(g); if (!q) return;
        if (q.qua) out.push({ sev: 3, loai: 'dauthau', title: 'Quá hạn bước "' + q.tiep.ten + '": ' + U.trunc(g.ten, 80), detail: 'Hạn ' + U.fmtDate(q.han) + ' (' + U.num(q.tiep.han) + ' ngày từ bước trước' + (q.tiep.canCu ? ', ' + q.tiep.canCu : '') + ')', coll: 'goithau', id: g.id });
        if (q.thieu.length) out.push({ sev: 2, loai: 'dauthau', title: 'Thiếu ' + q.thieu.length + ' bước quy trình: ' + U.trunc(g.ten, 80), detail: q.thieu.map(b => b.ten).join('; '), coll: 'goithau', id: g.id });
      });
    } catch (x) { console.warn(x); }
    return out.sort((a, b) => b.sev - a.sev);
  };

  /* ---------- Khai báo quy trình (Thiết lập) ---------- */
  A.qtCfgHtml = () => '<div class="card" data-qt><div class="card-h"><h3>Quy trình lựa chọn nhà thầu</h3><div class="sub">Các bước, hồ sơ, thời hạn theo từng hình thức. Phần mềm không tự gán thời hạn, điều khoản — chỉ thời hạn đã đánh dấu "Đã đối chiếu" mới dùng để cảnh báo.</div></div><div class="card-b" data-qt-b></div></div>';
  A.qtCfgBind = root => {
    const box = $('[data-qt-b]', root); if (!box) return;
    const ds = A.list('hinhThucLCNT'), st = A.vs.qt || (A.vs.qt = { ht: ds[0] });
    let rows = JSON.parse(JSON.stringify((lay()[st.ht] || {}).buoc || []));
    const ve = () => {
      const dl = '<datalist id="qt_dl">' + A.list('buocLCNT').map(b => '<option value="' + e(b) + '">').join('') + '</datalist>';
      box.innerHTML = dl + '<div class="gap mb"><select class="sel" style="width:auto" data-qt-ht aria-label="Hình thức lựa chọn nhà thầu">' + ds.map(h => '<option' + (h === st.ht ? ' selected' : '') + '>' + e(h) + '</option>').join('') + '</select><span class="small muted">' + ds.filter(h => (lay()[h] || {}).buoc && lay()[h].buoc.length).length + '/' + ds.length + ' hình thức đã khai báo</span></div>' +
        (rows.length ? '<div class="tbl-wrap"><table class="tbl qt-tbl"><thead><tr><th style="width:28px">#</th><th style="min-width:200px">Bước</th><th style="min-width:200px">Hồ sơ cần có</th><th style="width:96px">Tối đa (ngày)</th><th style="min-width:160px">Căn cứ (văn bản, điều, khoản)</th><th style="width:84px">Đã đối chiếu</th><th style="width:96px"></th></tr></thead><tbody>' +
          rows.map((r, i) => '<tr data-i="' + i + '"><td>' + (i + 1) + '</td><td><input class="inp" list="qt_dl" data-f="ten" value="' + e(r.ten || '') + '" aria-label="Tên bước"></td><td><textarea class="inp" rows="1" data-f="hoSo" aria-label="Hồ sơ cần có">' + e(r.hoSo || '') + '</textarea></td><td><input class="inp" type="number" min="0" data-f="han" value="' + e(r.han || '') + '" aria-label="Thời hạn tối đa"></td><td><input class="inp" data-f="canCu" value="' + e(r.canCu || '') + '" aria-label="Căn cứ"></td><td style="text-align:center"><input type="checkbox" data-f="xn"' + (r.xn ? ' checked' : '') + ' aria-label="Đã đối chiếu văn bản gốc"></td><td class="nowrap"><button class="btn icon sm ghost" data-len="' + i + '" aria-label="Lên"' + (i ? '' : ' disabled') + '>▲</button><button class="btn icon sm ghost" data-xuong="' + i + '" aria-label="Xuống"' + (i < rows.length - 1 ? '' : ' disabled') + '>▼</button><button class="btn icon sm ghost" data-xoa="' + i + '" aria-label="Xóa bước">' + ic('trash', 13) + '</button></td></tr>').join('') + '</tbody></table></div>' : '<div class="note">Hình thức "' + e(st.ht) + '" chưa có bước nào.</div>') +
        '<div class="gap mt"><button class="btn" data-qt-them>' + ic('plus', 15) + 'Thêm bước</button>' + (rows.length ? '' : '<button class="btn" data-qt-nap>Nạp danh mục bước có sẵn (tự xóa bước không áp dụng)</button>') + '<span class="sp"></span><button class="btn primary" data-qt-luu>Lưu quy trình ' + e(st.ht) + '</button></div>';
      $('[data-qt-ht]', box).onchange = x => { st.ht = x.target.value; rows = JSON.parse(JSON.stringify((lay()[st.ht] || {}).buoc || [])); ve(); };
      UI.on(box, 'input', '[data-f]', el => { const i = +el.closest('tr').dataset.i; rows[i][el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; });
      UI.on(box, 'change', '[data-f="xn"]', el => { rows[+el.closest('tr').dataset.i].xn = el.checked; });
      $$('[data-xoa]', box).forEach(b => b.onclick = () => { rows.splice(+b.dataset.xoa, 1); ve(); });
      $$('[data-len]', box).forEach(b => b.onclick = () => { const i = +b.dataset.len; [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; ve(); });
      $$('[data-xuong]', box).forEach(b => b.onclick = () => { const i = +b.dataset.xuong; [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]]; ve(); });
      $('[data-qt-them]', box).onclick = () => { rows.push({ ten: '', hoSo: '', han: '', canCu: '', xn: false }); ve(); };
      if ($('[data-qt-nap]', box)) $('[data-qt-nap]', box).onclick = () => { rows = A.list('buocLCNT').map(t => ({ ten: t, hoSo: '', han: '', canCu: '', xn: false })); ve(); };
      $('[data-qt-luu]', box).onclick = async () => {
        const sach = rows.map(r => ({ ten: String(r.ten || '').trim(), hoSo: String(r.hoSo || '').trim(), han: r.han === '' || r.han === undefined ? '' : Math.max(0, +r.han || 0), canCu: String(r.canCu || '').trim(), xn: !!r.xn })).filter(r => r.ten);
        const trung = sach.map(r => U.norm(r.ten)).filter((t, i, a) => a.indexOf(t) !== i);
        if (trung.length) { UI.toast('Có bước trùng tên — mỗi bước chỉ khai báo một lần.', 'bad'); return; }
        const xnKhongCC = sach.filter(r => r.xn && U.num(r.han) > 0 && !r.canCu);
        if (xnKhongCC.length) { UI.toast('Bước "' + xnKhongCC[0].ten + '" đánh dấu đã đối chiếu nhưng chưa ghi căn cứ.', 'bad'); return; }
        try {
          await S.setCfg({ qtLCNT: Object.assign({}, lay(), { [st.ht]: { buoc: sach, capNhat: U.nowStamp(), by: S.user() } }) });
          const chua = sach.filter(r => U.num(r.han) > 0 && !r.xn).length;
          UI.toast('Đã lưu quy trình ' + st.ht + ' (' + sach.length + ' bước' + (chua ? '; ' + chua + ' thời hạn chưa đối chiếu, chưa dùng để cảnh báo' : '') + ').', 'ok'); rows = JSON.parse(JSON.stringify(sach)); ve();
        } catch (er) { UI.fail(er); }
      };
    };
    ve();
  };

  const st = document.createElement('style');
  st.textContent = '.qt-ds{list-style:none;padding:0;margin:0 0 8px;counter-reset:qt}.qt-ds li{counter-increment:qt;position:relative;padding:6px 8px 6px 34px;border-left:3px solid var(--border);margin-bottom:4px;border-radius:4px}.qt-ds li::before{content:counter(qt);position:absolute;left:8px;top:6px;font-weight:700;color:var(--muted)}' +
    '.qt-ds li.xong{border-color:var(--ok)}.qt-ds li.thieu{border-color:var(--bad);background:var(--bad-bg,#fde8e6)}.qt-ds li.tiep{border-color:var(--warn);background:var(--hover)}.qt-h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.qt-tbl .inp{height:32px;font-size:13px}.qt-tbl textarea.inp{height:32px;min-height:32px;resize:vertical}';
  if (typeof document !== 'undefined') document.head.appendChild(st);
})(App);
