/* ============================================================
   56j-bieu-nguon.js — Biểu giải ngân dùng chung trên Google Drive: tự cập nhật, so sánh với kỳ trước.
   Máy chủ Apps Script (thao tác bieuNguon) trả tệp Excel khi tệp đổi; phần mềm đọc bằng bộ đọc biểu sẵn có
   (mỗi đơn vị một trang hoặc biểu tổng hợp), so với số đang có, tự nhập đơn vị có số mới hợp lệ, ghi lại một "lần cập nhật"
   (đơn vị nào giải ngân thêm, bao nhiêu, tỷ lệ trước → nay). Đơn vị có số lệch với trang TỔNG HỢP, giải ngân vượt kinh phí
   hoặc trang trống thì bỏ qua, giữ số cũ, ghi lý do. Chỉ máy đăng nhập vai trò quản lý và đã bật "Tự cập nhật" mới tự nhập.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const fm = U.fmtMoney, fs = U.fmtShort, MOI_PHUT = 15;
  const F = (k, label, type, o) => Object.assign({ k, label, type: type || 'text' }, o || {});

  // Lần cập nhật (đồng bộ giữa các máy để không nhập trùng): id = 'bn_' + thời điểm sửa tệp
  Sc.C.bnky = { label: 'Lần cập nhật biểu dùng chung', title: r => 'Cập nhật biểu ' + U.fmtDateTime(r.modified) + (r.tep ? ' — ' + r.tep : ''),
    fields: [F('modified', 'Thời điểm sửa tệp'), F('tep', 'Tệp'), F('ngaySoLieu', 'Số liệu đến ngày', 'date'), F('luc', 'Lúc cập nhật'), F('nguoi', 'Người cập nhật'), F('ghiChu', 'Ghi chú', 'textarea')] };
  if (Sc.TRACKED && !Sc.TRACKED.includes('bnky')) Sc.TRACKED.push('bnky');

  const cfg = () => Object.assign({ link: '', fileId: '', tuDong: false, lastMod: '', lastCheck: '', loi: '' }, S.cfg.bieuNguon || {});
  const luuCfg = o => S.setCfg({ bieuNguon: Object.assign(cfg(), o) });
  const layId = s => (String(s || '').match(/\/d\/([\w-]{20,})/) || String(s || '').match(/[?&]id=([\w-]{20,})/) || String(s || '').match(/^\s*([\w-]{25,})\s*$/) || [])[1] || '';
  const quanLy = () => A.MC && A.MC.coCauHinh && A.MC.coCauHinh() && (!A.MC.vaiTro || A.MC.vaiTro() === 'quanly');

  // Số tổng của từng đơn vị trên trang TỔNG HỢP (mục B "chi tiết theo đơn vị dự toán") để đối chiếu với trang của đơn vị
  const tu = s => new Set(U.norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 1)), dice = (a, b) => { let c = 0; a.forEach(w => { if (b.has(w)) c++; }); return a.size + b.size ? 2 * c / (a.size + b.size) : 0; };
  const doanDV = (ten, dvs) => L.nsDoanDonVi(ten, dvs) || (dvs.map(v => ({ v, k: Math.max(dice(tu(ten), tu(v.ten)), v.tenTat ? dice(tu(ten), tu(v.tenTat)) : 0) })).filter(x => x.k >= 0.8).sort((a, b) => b.k - a.k)[0] || {}).v || null;
  L.nsTongHopDV = (wb, dvs) => {
    const sua = rs => rs.map(r => (r || []).map(c => typeof c === 'string' && U.norm(c) === 'don vi' ? 'Nội dung' : c));
    for (const n of wb.SheetNames) {
      const ws = wb.Sheets[n], raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
      if (!raw.slice(0, 40).some(r => (r || []).some(c => typeof c === 'string' && U.norm(c) === 'don vi'))) continue;
      const it = L.parseBudget(sua(raw), sua(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null }))).items, b = it.findIndex(x => /^b$/i.test(String(x.stt || '').trim()));
      if (b < 0) continue;
      const out = {};
      it.slice(b + 1).forEach(x => { if (!/^\d+$/.test(String(x.stt || '').trim())) return; const d = doanDV(x.noiDung, dvs); if (d && !out[d.id]) out[d.id] = { tong: L.nsTong(x), tongGhi: x.tongGoc, gn: U.num(x.giaiNgan), ten: x.noiDung }; });
      return out;
    }
    return {};
  };

  let dangChay = false;
  /* Kiểm tra tệp; có thay đổi thì đọc, so sánh, (tự) nhập. tay: bấm "Kiểm tra ngay" (luôn tải lại, hỏi trước khi nhập). */
  // opt.xacNhan = mã đơn vị: tải lại tệp, chỉ nhập đơn vị đó (kể cả khi giải ngân giảm), cập nhật dòng trong lần cập nhật đã ghi
  A.bnKiemTra = async (tay, opt) => {
    opt = opt || {};
    const c = cfg(); if (!c.fileId) { if (tay) UI.toast('Chưa nhập đường dẫn biểu trên Google Drive.', 'bad'); return; }
    if (!A.MC || !A.MC.coCauHinh || !A.MC.coCauHinh()) { if (tay) UI.toast('Cần kết nối máy chủ Apps Script (Thiết lập) để đọc tệp trên Drive.', 'bad'); return; }
    if (dangChay) return; dangChay = true;
    try {
      const j = await A.MC.goi({ action: 'bieuNguon', fileId: c.fileId, since: tay ? '' : c.lastMod });
      const luc = U.nowStamp();
      if (!j.changed) { await luuCfg({ lastCheck: luc, loi: '' }); if (tay) UI.toast('Biểu chưa thay đổi từ lần cập nhật trước.', 'ok'); return; }
      if (!tay && S.get('bnky', 'bn_' + j.modified)) { await luuCfg({ lastMod: j.modified, lastCheck: luc, loi: '' }); return; }   // máy khác đã cập nhật
      const bin = atob(j.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const file = new File([u8], j.name || 'bieu-giai-ngan.xlsx'), wb = await UI.readWorkbook(file), dvs = L.dvDuToan();
      const ds = await A.nsDocCacTep([file], dvs, ''), th = L.nsTongHopDV(wb, dvs);
      // Đánh giá từng phần
      const kq = ds.map(o => {
        const r = { ten: (o.dvBieu || o.fname || '').trim(), dvId: o.dvId || '', ngay: o.ngay, nam: o.nam };
        if (o.loi) {
          if (o.dvId) { const t = L.nsTree(o.nam || A.year(), o.dvId).total; Object.assign(r, { tongCu: t.tong, gnCu: t.giaiNgan, giu: true }); }
          return Object.assign(r, { tt: 'boqua', lyDo: /chưa có số liệu/.test(o.loi) ? 'Đơn vị chưa nhập số trên biểu: giữ số kỳ trước' : o.loi.replace(/\.$/, '') });
        }
        if (!o.dvId) return Object.assign(r, { tt: 'boqua', lyDo: 'Chưa xác định được đơn vị (nhập tay một lần để phần mềm nhớ tên)' });
        const ss = L.nsSoSanhBieu(o.parsed, o.dvId, o.nam), t = th[o.dvId];
        Object.assign(r, { tongCu: ss.tongCu, gnCu: ss.gnCu, tongMoi: ss.tongMoi, gnMoi: ss.gnMoi, ngayCu: ss.ngayCu, o, ss });
        // khớp khi tổng bằng số ghi ở cột "Tổng" hoặc số tính từ các cột của dòng đơn vị trên trang TỔNG HỢP
        const lechTong = t && Math.abs(t.tong - ss.tongMoi) > 1000 && !(t.tongGhi !== null && t.tongGhi !== undefined && Math.abs(t.tongGhi - ss.tongMoi) <= 1000);
        if (t && (lechTong || Math.abs(t.gn - ss.gnMoi) > 1000)) return Object.assign(r, { tt: 'boqua', lyDo: 'Số trên trang đơn vị (' + fs(ss.tongMoi) + ' / ' + fs(ss.gnMoi) + ') khác trang TỔNG HỢP (' + fs(t.tong) + ' / ' + fs(t.gn) + '): giữ số cũ, đề nghị đơn vị sửa biểu' });
        if (ss.gnMoi > ss.tongMoi + 0.5) return Object.assign(r, { tt: 'boqua', lyDo: 'Đã giải ngân lớn hơn kinh phí được sử dụng: giữ số cũ' });
        // Giải ngân giảm so với kỳ trước: không tự nhập, chờ người quản lý xác nhận (bấm "Xác nhận nhập")
        if (ss.coCu && ss.gnMoi < ss.gnCu - 0.5 && !(opt.xacNhan && opt.xacNhan === o.dvId)) return Object.assign(r, { tt: 'choxn', lyDo: 'Giải ngân giảm ' + fm(ss.gnCu - ss.gnMoi) + ' đồng so với kỳ trước: giữ số cũ, chờ xác nhận' });
        if (!ss.moi.length && !ss.bo.length && !ss.doi.length) return Object.assign(r, { tt: 'khongdoi' });
        return Object.assign(r, { tt: 'capnhat' });
      });
      // Một đơn vị có nhiều trang trống (vd. "VP Sở", "Dự án KHTC"): giữ một dòng
      for (let i = kq.length - 1; i >= 0; i--) if (kq[i].tt === 'boqua' && kq[i].dvId && kq.some((x, j) => j !== i && x.dvId === kq[i].dvId)) kq.splice(i, 1);
      if (opt.xacNhan) {   // chỉ nhập đơn vị được xác nhận
        const x = kq.find(z => z.dvId === opt.xacNhan);
        if (!x || x.tt !== 'capnhat') { UI.toast(x ? 'Không nhập được: ' + (x.lyDo || 'số không đổi') : 'Không thấy đơn vị trên biểu.', 'bad'); return; }
        if (!await UI.confirm({ title: 'Xác nhận nhập số của ' + Sc.refName('donvi', x.dvId) + '?', msg: 'Giải ngân ' + fm(x.gnCu) + ' → ' + fm(x.gnMoi) + ' (' + fm(x.gnMoi - x.gnCu) + ' đồng). Chỉ xác nhận khi đơn vị đã giải trình số giảm (thu hồi, điều chỉnh chứng từ…).', ok: 'Nhập số mới' })) return;
        await S.snapshot('Trước khi xác nhận nhập số giảm của ' + Sc.refName('donvi', x.dvId));
        const old = S.all('ngansach').filter(r => r.donViId === x.dvId && +r.nam === x.nam), used = new Set(L.nsGhepDong(x.o.parsed.items, old).filter(Boolean).map(r => r.id));
        await A.nsLuuBieu(x.o.parsed, x.dvId, x.nam, x.ngay, new Set(old.filter(r => !used.has(r.id) && !A.nsLyDoGiuDong(r).length).map(r => r.id)), j.name || 'biểu trên Drive', 'Xác nhận nhập số giảm từ biểu dùng chung trên Drive');
        const ky = S.get('bnky', 'bn_' + j.modified);
        if (ky) await S.save('bnky', { id: ky.id, dong: (ky.dong || []).map(d => d.dvId === x.dvId ? Object.assign({}, d, { tt: 'capnhat', lyDo: 'Đã xác nhận nhập số giảm (' + S.user() + ', ' + U.fmtDateTime(luc) + ')' }) : d) });
        UI.toast('Đã nhập số mới của ' + Sc.refName('donvi', x.dvId) + '.', 'ok'); A.render(); return;
      }
      const nhap = kq.filter(x => x.tt === 'capnhat');
      if (tay && nhap.length && !await UI.confirm({ title: 'Cập nhật ' + nhap.length + ' đơn vị từ biểu trên Drive?', msg: nhap.map(x => '• ' + Sc.refName('donvi', x.dvId) + ': giải ngân ' + fm(x.gnCu) + ' → ' + fm(x.gnMoi) + ' (' + ((x.gnMoi - x.gnCu) >= 0 ? '+' : '') + fm(x.gnMoi - x.gnCu) + ')').join('\n') + (kq.some(x => x.tt === 'boqua') ? '\n\nBỏ qua: ' + kq.filter(x => x.tt === 'boqua').map(x => x.ten).join('; ') : ''), ok: 'Cập nhật' })) return;
      if (nhap.length) await S.snapshot('Trước khi tự cập nhật từ biểu trên Drive');
      for (const x of nhap) {
        // Dòng cũ không còn trên biểu: xóa dòng lấy từ biểu cũ; giữ dòng tự thêm, có liên kết (như mặc định khi nhập tay)
        const old = S.all('ngansach').filter(r => r.donViId === x.dvId && +r.nam === x.nam), used = new Set(L.nsGhepDong(x.o.parsed.items, old).filter(Boolean).map(r => r.id));
        const xoa = new Set(old.filter(r => !used.has(r.id) && !A.nsLyDoGiuDong(r).length).map(r => r.id));
        await A.nsLuuBieu(x.o.parsed, x.dvId, x.nam, x.ngay, xoa, j.name || 'biểu trên Drive', 'Tự cập nhật từ biểu dùng chung trên Drive');
      }
      const rec = { id: 'bn_' + j.modified, modified: j.modified, tep: j.name || '', ngaySoLieu: (kq.find(x => x.ngay) || {}).ngay || '', luc, nguoi: S.user(),
        dong: kq.map(x => ({ dvId: x.dvId, ten: x.ten, tt: x.tt, lyDo: x.lyDo || '', tongCu: x.tongCu || 0, gnCu: x.gnCu || 0, tongMoi: x.tongMoi || 0, gnMoi: x.gnMoi || 0, ngayCu: x.ngayCu || '' })) };
      await S.save('bnky', rec, { note: 'Cập nhật biểu dùng chung: ' + nhap.length + ' đơn vị có số mới' });
      await luuCfg({ lastMod: j.modified, lastCheck: luc, loi: '' });
      UI.toast(nhap.length ? 'Đã cập nhật ' + nhap.length + ' đơn vị từ biểu trên Drive (' + U.fmtDateTime(j.modified) + ').' : 'Biểu trên Drive đã đổi nhưng không có đơn vị nào có số mới hợp lệ.', nhap.length ? 'ok' : '');
      if (A.route === 'ngansach') A.render();
    } catch (er) { await luuCfg({ lastCheck: U.nowStamp(), loi: er.message }); if (tay) UI.fail(er); }
    finally { dangChay = false; }
  };
  // Tự kiểm tra khi mở phần mềm và mỗi 15 phút (chỉ máy quản lý đã bật)
  const henGio = () => { const c = cfg(); if (c.tuDong && c.fileId && quanLy()) A.bnKiemTra(false).catch(() => { }); };
  setTimeout(henGio, 8000); setInterval(henGio, MOI_PHUT * 60000);

  /* Thẻ trong Tài chính → Theo đơn vị */
  A.bnVe = (box, y) => {
    const c = cfg(), ky = S.all('bnky').sort((a, b) => String(b.modified).localeCompare(String(a.modified))), k = ky[0];
    const tt = { capnhat: '<span class="chip plain hoanthanh">Đã cập nhật</span>', khongdoi: '<span class="chip plain">Không đổi</span>', boqua: '<span class="chip plain quahan">Bỏ qua</span>', choxn: '<span class="chip plain saphan">Chờ xác nhận</span>' };
    let h = '<div class="card mb"><div class="card-h"><h3>Biểu giải ngân dùng chung trên Google Drive</h3><div class="sub">' +
      (c.fileId ? (c.tuDong ? 'Tự cập nhật khi mở phần mềm và mỗi ' + MOI_PHUT + ' phút' : 'Chưa bật tự cập nhật') + ' · kiểm tra lần cuối ' + (c.lastCheck ? U.fmtDateTime(c.lastCheck) : '—') + (c.loi ? ' · <span style="color:var(--bad-fg)">' + e(c.loi) + '</span>' : '') : 'Dán đường dẫn tệp Excel các đơn vị cùng nhập trên Google Drive') + '</div></div><div class="card-b">' +
      '<div class="gap"><input class="inp grow" data-bn-link placeholder="https://docs.google.com/spreadsheets/d/…" value="' + e(c.link) + '" aria-label="Đường dẫn biểu trên Google Drive" style="min-width:260px"><button class="btn" data-bn-luu>Lưu</button><label class="check"><input type="checkbox" data-bn-tu' + (c.tuDong ? ' checked' : '') + '> Tự cập nhật</label><button class="btn primary" data-bn-kt>' + ic('sync', 16) + 'Kiểm tra ngay</button></div>' +
      '<div class="help">Máy chủ Apps Script đọc tệp (tài khoản chạy Apps Script phải được chia sẻ quyền xem tệp). Đơn vị có số trên trang riêng khác trang TỔNG HỢP, giải ngân vượt kinh phí hoặc trang trống thì bỏ qua, giữ số cũ. Chỉ máy đăng nhập quyền quản lý tự nhập.</div>';
    if (k) {
      const dd = k.dong || [], tang = dd.filter(x => x.tt === 'capnhat'), sum = (a, f) => U.sum(a, f);
      h += '<div class="eyebrow mt">Lần cập nhật ' + U.fmtDateTime(k.modified) + (k.ngaySoLieu ? ' · số liệu đến ' + U.fmtDate(k.ngaySoLieu) : '') + ' · ' + tang.length + ' đơn vị có số mới · giải ngân thêm ' + fm(sum(tang, x => x.gnMoi - x.gnCu)) + ' đồng</div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Đơn vị</th><th class="num">Giải ngân kỳ trước</th><th class="num">Giải ngân nay</th><th class="num">Tăng thêm</th><th class="num">Tỷ lệ trước → nay</th><th>Tình trạng</th></tr></thead><tbody>' +
        dd.map(x => { const t0 = x.tongCu ? x.gnCu / x.tongCu * 100 : null, t1 = x.tongMoi ? x.gnMoi / x.tongMoi * 100 : null, d = x.gnMoi - x.gnCu; return '<tr><td>' + e(x.dvId ? Sc.refName('donvi', x.dvId) : x.ten) + (x.ngayCu ? '<div class="t2">kỳ trước: ' + U.fmtDate(x.ngayCu) + '</div>' : '') + '</td><td class="num">' + (x.tt === 'boqua' && !x.gnCu ? '—' : fm(x.gnCu)) + '</td><td class="num">' + (x.tt === 'boqua' ? '<span class="muted">' + (x.gnMoi ? fm(x.gnMoi) : '—') + '</span>' : fm(x.gnMoi)) + '</td><td class="num">' + (x.tt === 'capnhat' && Math.abs(d) > 0.5 ? '<b style="color:' + (d > 0 ? 'var(--ok-fg)' : 'var(--bad-fg)') + '">' + (d > 0 ? '+' : '') + fm(d) + '</b>' : '—') + '</td><td class="num">' + (t0 === null ? '—' : U.fmtPct(t0)) + ' → ' + (x.tt === 'boqua' || t1 === null ? '—' : '<b>' + U.fmtPct(t1) + '</b>') + '</td><td>' + (tt[x.tt] || '') + (x.lyDo ? '<div class="t2">' + e(x.lyDo) + '</div>' : '') + (x.tt === 'choxn' && k === ky[0] ? '<button class="btn sm mt" data-bn-xn="' + e(x.dvId) + '">Xác nhận nhập số mới</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        (ky.length > 1 ? '<details class="mt"><summary class="small">Các lần cập nhật trước (' + (ky.length - 1) + ')</summary>' + ky.slice(1, 20).map(q => { const t = (q.dong || []).filter(x => x.tt === 'capnhat'); return '<div class="small" style="padding:3px 0">' + U.fmtDateTime(q.modified) + ' · ' + t.length + ' đơn vị · giải ngân thêm ' + fm(U.sum(t, x => x.gnMoi - x.gnCu)) + ' đồng' + (t.length ? ': ' + t.map(x => Sc.refName('donvi', x.dvId) + ' ' + ((x.gnMoi - x.gnCu) >= 0 ? '+' : '') + fs(x.gnMoi - x.gnCu)).join('; ') : '') + '</div>'; }).join('') + '</details>' : '');
    }
    box.innerHTML = h + '</div></div>';
    $('[data-bn-luu]', box).onclick = async () => { const v = $('[data-bn-link]', box).value.trim(), id = layId(v); if (!id) { UI.toast('Đường dẫn không đúng dạng Google Drive / Google Sheets.', 'bad'); return; } await luuCfg({ link: v, fileId: id, lastMod: id === cfg().fileId ? cfg().lastMod : '' }); UI.toast('Đã lưu đường dẫn.', 'ok'); A.render(); };
    $('[data-bn-tu]', box).onchange = async x => { await luuCfg({ tuDong: x.target.checked }); if (x.target.checked) henGio(); };
    $$('[data-bn-xn]', box).forEach(b => b.onclick = async () => { b.disabled = true; try { await A.bnKiemTra(true, { xacNhan: b.dataset.bnXn }); } finally { b.disabled = false; } });
    $('[data-bn-kt]', box).onclick = async b => { const btn = b.currentTarget; btn.disabled = true; try { const v = $('[data-bn-link]', box).value.trim(), id = layId(v); if (id && id !== cfg().fileId) await luuCfg({ link: v, fileId: id, lastMod: '' }); await A.bnKiemTra(true); } finally { btn.disabled = false; A.render(); } };
  };
})(App);
