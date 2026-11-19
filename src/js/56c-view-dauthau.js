/* ============================================================
   56c-view-dauthau.js — Tổng quan gói thầu, hợp đồng do Sở làm chủ đầu tư
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$, P = UI.PAL;
  const fs = U.fmtShort;
  const kpi = (cls, l, v, s, act) => '<button class="kpi ' + cls + (act ? '' : ' static') + '"' + (act ? ' data-dk="' + e(act) + '"' : ' tabindex="-1"') + '><span class="k-l">' + e(l) + '</span><span class="k-v">' + v + '</span><span class="k-s">' + (s || '&nbsp;') + '</span></button>';
  const opt = (list, v) => list.map(o => '<option value="' + e(o[0]) + '"' + (String(v || '') === String(o[0]) ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('');

  // Thanh bước tình trạng gói thầu (dùng trong hộp chi tiết)
  A.gtStepper = g => {
    if (g.trangThai === 'huy') return '<div class="note warn mb">Gói thầu đã hủy, không thực hiện.</div>';
    const steps = A.OPT.ttGT.filter(o => o[0] !== 'huy'), cur = L.gtBuoc(g), tt = g.tienTrinh || [];
    return '<ol class="stepper mb" aria-label="Tiến trình gói thầu">' + steps.map((o, i) => '<li class="' + (i < cur ? 'done' : i === cur ? 'cur' : '') + '"' + (i === cur ? ' aria-current="step"' : '') + '><span class="dot">' + (i < cur ? '✓' : i + 1) + '</span><span class="lb">' + e(o[1]) + '</span></li>').join('') + '</ol>' +
      (tt.length ? '<div class="small soft mb">Tiến trình đã ghi: ' + tt.map(x => e(x.buoc) + (x.ngay ? ' (' + U.fmtDate(x.ngay) + ')' : '')).join(' → ') + '</div>' : '');
  };

  // Hộp tìm và chọn bản ghi để liên kết (nhiều hoặc một lựa chọn)
  // o: {title, sub, items:[{id, t, s, tag}], chon:[ids], multi, onOk(ids)}
  A.lkPicker = o => {
    let chon = new Set(o.chon || []);
    const body = '<div class="lk-q mb">' + ic('search', 16) + '<input class="inp" type="search" data-lkq placeholder="Gõ tên, số quyết định, nhà thầu… để tìm" aria-label="Tìm"></div>' +
      (o.multi ? '<label class="check small mb"><input type="checkbox" data-lkchon> Chỉ hiện mục đang chọn</label>' : '') + '<div class="lk-list" data-lkl role="listbox"></div><div class="small muted mt" data-lkn></div>';
    const m = UI.modal({ title: o.title, sub: o.sub, size: 'lg', body, buttons: [{ label: 'Hủy', on: a => a.close() }, 'sp', { label: o.multi ? 'Lưu liên kết' : 'Liên kết', cls: 'primary', icon: 'link', on: async a => { try { await o.onOk(Array.from(chon)); a.close(true); } catch (er) { UI.fail(er); } } }] });
    const q = $('[data-lkq]', m.body), list = $('[data-lkl]', m.body), chi = $('[data-lkchon]', m.body);
    const draw = () => {
      const ws = U.norm(q.value).split(' ').filter(Boolean);
      const hien = o.items.filter(x => (!chi || !chi.checked || chon.has(x.id)) && ws.every(w => U.norm(x.t + ' ' + (x.s || '')).includes(w))).slice(0, 200);
      list.innerHTML = hien.length ? hien.map(x => '<label class="lk-i' + (chon.has(x.id) ? ' on' : '') + '"><input type="' + (o.multi ? 'checkbox' : 'radio') + '" name="lkp" value="' + e(x.id) + '"' + (chon.has(x.id) ? ' checked' : '') + '><span><span class="t1">' + e(x.t) + '</span>' + (x.s ? '<span class="t2">' + e(x.s) + '</span>' : '') + (x.tag ? '<span class="t2" style="color:var(--warn-fg)">' + e(x.tag) + '</span>' : '') + '</span></label>').join('') : '<div class="small muted" style="padding:10px">Không tìm thấy mục phù hợp.</div>';
      $('[data-lkn]', m.body).textContent = 'Hiện ' + hien.length + ' / ' + o.items.length + ' mục' + (o.multi ? ' · đang chọn ' + chon.size : '');
    };
    list.addEventListener('change', x => { const v = x.target.value; if (!o.multi) chon = new Set([v]); else if (x.target.checked) chon.add(v); else chon.delete(v); draw(); });
    q.addEventListener('input', U.debounce(draw, 120)); if (chi) chi.onchange = draw;
    draw(); q.focus();
    return m;
  };
  const nsItems = () => S.all('ngansach').slice().sort((a, b) => (+b.nam || 0) - (+a.nam || 0)).map(r => ({ id: r.id, t: Sc.C.ngansach.title(r), s: (Sc.refName('donvi', r.donViId) || '') + ' · năm ' + (r.nam || '') + ' · được sử dụng ' + fs(L.nsTong(r)) + (r.canBoId ? ' · ' + Sc.refName('canbo', r.canBoId) : '') }));
  // Từ dòng dự toán: chọn các gói thầu dùng nguồn này
  A.lkGoiThau = (r, xong) => {
    const gts = S.all('goithau').filter(g => g.trangThai !== 'huy' || g.nsId === r.id);
    A.lkPicker({
      title: 'Liên kết gói thầu với nguồn kinh phí', sub: U.trunc(Sc.C.ngansach.title(r), 110), multi: true, chon: gts.filter(g => g.nsId === r.id).map(g => g.id),
      items: gts.map(g => ({ id: g.id, t: g.ten || '(chưa có tên)', s: [g.qdKHSo ? 'KHLCNT ' + g.qdKHSo : '', g.giaGoiThau ? 'giá ' + fs(U.num(g.giaGoiThau)) : '', g.nguonVon || '', g.nhaThau || '', g.canBoId ? Sc.refName('canbo', g.canBoId) : ''].filter(Boolean).join(' · '), tag: g.nsId && g.nsId !== r.id && S.get('ngansach', g.nsId) ? 'Đang gắn nguồn khác: ' + U.trunc(Sc.C.ngansach.title(S.get('ngansach', g.nsId)), 80) + ' — chọn sẽ chuyển sang nguồn này' : '' })),
      onOk: async ids => {
        const set = new Set(ids), items = gts.filter(g => set.has(g.id) !== (g.nsId === r.id)).map(g => ({ c: 'goithau', rec: { id: g.id, nsId: set.has(g.id) ? r.id : '' } }));
        if (!items.length) { UI.toast('Không có thay đổi liên kết.'); return; }
        await S.saveMany(items, { note: 'Liên kết gói thầu với dòng dự toán ' + U.trunc(Sc.C.ngansach.title(r), 80) });
        UI.toast('Đã cập nhật liên kết ' + items.length + ' gói thầu.', 'ok'); if (xong) xong();
      }
    });
  };
  // Từ gói thầu / hợp đồng: chọn dòng dự toán nguồn kinh phí
  A.lkNguon = (coll, rec, xong) => {
    A.lkPicker({
      title: 'Liên kết nguồn kinh phí (dòng dự toán)', sub: U.trunc(Sc.C[coll].title(rec), 110), chon: rec.nsId ? [rec.nsId] : [],
      items: [{ id: '', t: '— Bỏ liên kết nguồn kinh phí —', s: '' }].concat(nsItems()),
      onOk: async ids => {
        const v = ids[0] || ''; if (v === (rec.nsId || '')) { UI.toast('Không có thay đổi liên kết.'); return; }
        await S.save(coll, { id: rec.id, nsId: v }, { note: v ? 'Liên kết nguồn kinh phí' : 'Bỏ liên kết nguồn kinh phí' });
        UI.toast(v ? 'Đã liên kết nguồn kinh phí.' : 'Đã bỏ liên kết nguồn kinh phí.', 'ok'); if (xong) xong();
      }
    });
  };

  // Dòng phụ "gói thầu, hợp đồng" dưới nội dung dự toán trên các bảng tài chính, giải ngân
  A.nsLKTag = (nsId, m) => {
    const o = m && m.get(nsId); if (!o) return '';
    return '<div class="t2 ns-lk">' + ic('gavel', 13) + ' ' + (o.gt ? o.gt + ' gói thầu · giá ' + fs(o.giaGT) : '') + (o.hd ? (o.gt ? ' · ' : '') + o.hd + ' HĐ ' + fs(o.giaHD) + ' · đã TT ' + fs(o.tt) : '') + '</div>';
  };

  // Liên kết khi nhập form: chọn dòng dự toán / gói thầu → điền sẵn các ô còn trống (không ghi đè ô đã có)
  A.lienKetForm = (coll, form, rec0) => {
    if (!['goithau', 'hopdong', 'khlcnt'].includes(coll)) return;
    const el = k => form.querySelector('[data-k="' + k + '"]');
    const dien = (k, v) => {
      const x = el(k); if (!x || v === undefined || v === null || v === '' || (typeof v === 'number' && !(v > 0))) return false;
      if (x.type === 'hidden') { if (x.value) return false; UI.refSet(x.closest('.refpick'), v); return true; }
      if (String(x.value || '').trim()) return false;
      if (x.tagName === 'SELECT' && !Array.from(x.options).some(o => o.value === v)) return false;
      x.value = x.hasAttribute('data-money') ? U.fmtNum(v, 0) : v; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change', { bubbles: true })); return true;
    };
    const ghiChu = (k, html) => { const fl = form.querySelector('[data-fld="' + k + '"]'); if (!fl) return; let n = fl.querySelector('[data-lk-note]'); if (!n) { n = document.createElement('div'); n.className = 'help'; n.setAttribute('data-lk-note', ''); fl.appendChild(n); } n.innerHTML = html; };
    const tomNS = id => {
      const lk = id ? L.nsLienKet(id) : null; if (!lk) return '';
      return 'Dòng dự toán: được sử dụng <b>' + fs(lk.tong) + '</b> · đã giải ngân ' + fs(lk.gn) + ' (' + U.fmtPct(U.pct(lk.gn, lk.tong)) + ') · đã có ' + lk.gts.length + ' gói thầu, ' + lk.hds.length + ' hợp đồng' + (lk.r.canBoId ? ' · cán bộ theo dõi: ' + e(Sc.refName('canbo', lk.r.canBoId)) : '') + (lk.canhBao.length ? '<br><span style="color:var(--bad-fg)">' + e(lk.canhBao[0].t) + '</span>' : '');
    };
    const tuNS = (id, boQua) => {
      const r = id && S.get('ngansach', id); if (!r) return [];
      const lk = L.nsLienKet(id), da = [];
      const thu = (k, v, nhan) => { if (k !== boQua && dien(k, v)) da.push(nhan); };
      thu('duAnId', r.duAnId, 'chương trình, dự án'); thu('canBoId', r.canBoId, 'cán bộ theo dõi');
      if (coll === 'goithau') { thu('donViId', r.donViId, 'đơn vị'); thu('nguonVon', 'NSNN năm ' + (r.nam || '') + (r.nhomKP ? ' — ' + r.nhomKP : ''), 'nguồn vốn'); thu('duToan', lk ? lk.tong : 0, 'dự toán'); }
      return da;
    };
    const tuGT = id => {
      const g = id && S.get('goithau', id); if (!g) return [];
      const da = [], thu = (k, v, nhan) => { if (dien(k, v)) da.push(nhan); };
      thu('ten', g.ten, 'nội dung'); thu('duAnId', g.duAnId, 'dự án'); thu('nhaThau', g.nhaThau, 'nhà thầu'); thu('giaTri', U.num(g.giaTrung) || U.num(g.giaGoiThau), 'giá trị'); thu('loaiHD', g.loaiHD, 'loại hợp đồng'); thu('thoiGianTH', g.tgThucHienHD, 'thời gian thực hiện'); thu('nsId', g.nsId, 'dòng dự toán'); thu('canBoId', g.canBoId, 'cán bộ theo dõi');
      return da;
    };
    const bao = (k, da, goc) => { ghiChu(k, goc + (da.length ? '<div style="color:var(--ok-fg)">Đã điền sẵn: ' + da.join(', ') + ' (chỉ các ô còn trống).</div>' : '')); };
    const ns = el('nsId');
    const moi = !(rec0 && rec0.id);   // bản ghi mới mở sẵn dòng dự toán / gói thầu (từ nút "Tạo gói thầu", "Tạo hợp đồng") → điền sẵn ngay
    if (ns) { ghiChu('nsId', tomNS(ns.value)); if (moi && ns.value) bao('nsId', tuNS(ns.value), tomNS(ns.value)); ns.addEventListener('change', () => bao('nsId', tuNS(ns.value), tomNS(ns.value))); }
    const gt = coll === 'hopdong' && el('goiThauId');
    if (gt) {
      const tomGT = id => { const g = id && S.get('goithau', id); return g ? 'Gói thầu: giá ' + fs(U.num(g.giaGoiThau)) + (U.num(g.giaTrung) ? ' · giá trúng ' + fs(U.num(g.giaTrung)) : '') + (g.nguonVon ? ' · nguồn vốn: ' + e(g.nguonVon) : '') + (g.nhaThau ? ' · nhà thầu: ' + e(g.nhaThau) : '') : ''; };
      ghiChu('goiThauId', tomGT(gt.value)); if (moi && gt.value) bao('goiThauId', tuGT(gt.value), tomGT(gt.value));
      gt.addEventListener('change', () => { const da = tuGT(gt.value); if (ns && ns.value) ghiChu('nsId', tomNS(ns.value)); bao('goiThauId', da, tomGT(gt.value)); });
    }
  };

  // Khối "nguồn kinh phí" trong chi tiết gói thầu / hợp đồng / dòng dự toán
  A.nsLKHtml = (nsId, mode) => {
    const lk = nsId ? L.nsLienKet(nsId) : null, fs = U.fmtShort;
    if (!lk) return mode === 'ns' ? '' : '<div class="note mb">Chưa gắn dòng dự toán nguồn kinh phí. Bấm Sửa → chọn "Dòng dự toán nguồn kinh phí" để theo dõi gói thầu, thanh toán theo nguồn.</div>';
    const cb = lk.canhBao.map(c => '<div class="issue s' + c.sev + '" style="cursor:default"><span class="lv"></span><span><span class="t">' + e(c.t) + '</span></span></div>').join('');
    const head = '<div class="kpis mb">' + [['acc', 'Kinh phí được sử dụng', fs(lk.tong), 'Đã giải ngân ' + fs(lk.gn) + ' (' + U.fmtPct(U.pct(lk.gn, lk.tong)) + ')'], ['info', 'Gói thầu dùng nguồn này', lk.gts.length, 'Tổng giá gói thầu ' + fs(lk.giaGT)], ['teal', 'Hợp đồng', lk.hds.length, 'Giá trị ' + fs(lk.giaHD) + ' (' + U.fmtPct(U.pct(lk.giaHD, lk.tong), 0) + ' nguồn)'], ['ok', 'Đã thanh toán hợp đồng', fs(lk.daTT), 'Kinh phí chưa bố trí gói thầu, HĐ: ' + fs(Math.max(0, lk.chuaBoTri))]].map(k => '<div class="kpi ' + k[0] + ' static"><span class="k-l">' + e(k[1]) + '</span><span class="k-v"><small>' + k[2] + '</small></span><span class="k-s">' + e(k[3]) + '</span></div>').join('') + '</div>';
    const tbl = (lk.gts.length || lk.hds.length) ? '<div class="tbl-wrap mb"><table class="tbl"><thead><tr><th>Gói thầu / hợp đồng</th><th class="num">Giá gói thầu</th><th class="num">Giá trị HĐ</th><th class="num">Đã thanh toán</th><th>Tình trạng</th></tr></thead><tbody>' +
      lk.gts.map(g => { const hs = lk.hx.filter(o => o.h.goiThauId === g.id); return '<tr><td class="wrap"><a href="#" data-open="goithau:' + g.id + '">' + e(U.trunc(g.ten, 90)) + '</a>' + hs.map(o => '<div class="t2">HĐ <a href="#" data-open="hopdong:' + o.h.id + '">' + e(o.h.so || '') + '</a> · ' + e(o.h.nhaThau || '') + '</div>').join('') + '</td><td class="num">' + U.fmtMoney(g.giaGoiThau) + '</td><td class="num">' + (hs.length ? U.fmtMoney(U.sum(hs, o => o.x.giaTriHL)) : '—') + '</td><td class="num">' + (hs.length ? U.fmtMoney(U.sum(hs, o => o.x.thanhToan)) : '—') + '</td><td>' + UI.chip(L.gt(g).st, L.gt(g).label) + '</td></tr>'; }).join('') +
      lk.hx.filter(o => !lk.gts.some(g => g.id === o.h.goiThauId)).map(o => '<tr><td class="wrap">HĐ <a href="#" data-open="hopdong:' + o.h.id + '">' + e(o.h.so || '') + '</a> ' + e(U.trunc(o.h.ten || '', 70)) + '</td><td class="num">—</td><td class="num">' + U.fmtMoney(o.x.giaTriHL) + '</td><td class="num">' + U.fmtMoney(o.x.thanhToan) + '</td><td>' + UI.chip(o.x.st, o.x.label) + '</td></tr>').join('') + '</tbody></table></div>' : '';
    if (mode === 'ns') return (lk.gts.length || lk.hds.length) ? '<div class="card mb"><div class="card-h"><h3>Gói thầu, hợp đồng sử dụng nguồn kinh phí này</h3></div><div class="card-b">' + head + cb + tbl + '</div></div>' : '';
    return '<div class="card mb"><div class="card-h"><h3>Nguồn kinh phí</h3><div class="sub"><a href="#" data-open="ngansach:' + lk.r.id + '">' + e(U.trunc(A.Schema.C.ngansach.title(lk.r), 120)) + '</a> — ' + e(A.Schema.refName('donvi', lk.r.donViId)) + ' năm ' + e(lk.r.nam || '') + '</div></div><div class="card-b">' + head + cb + '</div></div>';
  };

  function tongQuan(root, T) {
    const f = { duan: T.duan, cb: T.cb }, t = L.dtTong(f), viec = L.dtViec(f), lich = L.dtLich(f, 60);
    const daOpts = [['', 'Tất cả chương trình, dự án']].concat(S.all('duan').filter(d => S.all('goithau').some(g => g.duAnId === d.id) || S.all('hopdong').some(h => h.duAnId === d.id)).map(d => [d.id, U.trunc(d.ten, 70)]));
    const cbOpts = [['', 'Tất cả cán bộ']].concat(S.all('canbo').filter(c => c.trangThai !== 'nghi').map(c => [c.id, c.hoTen]));
    let h = '<div class="toolbar"><select class="sel" data-fda aria-label="Chương trình, dự án">' + opt(daOpts, T.duan) + '</select><select class="sel" data-fcb aria-label="Cán bộ theo dõi">' + opt(cbOpts, T.cb) + '</select><span class="sp"></span><button class="btn" data-rep>' + ic('report', 16) + 'Lập báo cáo</button><button class="btn" data-addgt>' + ic('plus', 16) + 'Thêm gói thầu</button><button class="btn primary" data-vbd>' + ic('inbox', 16) + 'Cập nhật từ văn bản</button></div>';
    if (!t.soGT && !t.soHD) {
      root.innerHTML = h + '<div class="card">' + UI.empty('Chưa có gói thầu, hợp đồng nào', 'Thêm trực tiếp, hoặc đưa quyết định phê duyệt kế hoạch lựa chọn nhà thầu, quyết định phê duyệt kết quả, hợp đồng vào trang "Văn bản đến" để phần mềm đọc và điền sẵn thông tin.') + '</div>';
      bind(); return;
    }
    h += '<div class="kpis mb">' +
      kpi('acc', 'Gói thầu, nội dung mua sắm', t.soGT, 'Tổng giá gói thầu ' + fs(t.giaGT), 'gt:') +
      kpi('warn', 'Chưa tổ chức lựa chọn', t.soChuaTC, t.soDangLC + ' gói đang lựa chọn nhà thầu', 'gt:') +
      kpi('ok', 'Đã có kết quả LCNT', t.soCoKQ, 'Giá trúng thầu ' + fs(t.giaTrung), 'gt:') +
      kpi('teal', 'Giá trị tiết kiệm qua đấu thầu', t.tietKiem ? '<small>' + fs(t.tietKiem) + '</small>' : '—', t.tietKiem ? U.fmtPct(t.tyLeTK) + ' giá các gói đã có kết quả' : '') +
      kpi('info', 'Hợp đồng', t.soHD, t.soHDDang + ' đang thực hiện · giá trị ' + fs(t.giaHD), 'hd:') +
      kpi('ok', 'Đã thanh toán hợp đồng', t.giaHD ? U.fmtPct(t.tyLeTT) : '—', fs(t.daTT) + ' · còn ' + fs(t.conPhaiTT), 'hd:') +
      kpi(t.tamUngCon > 0.5 ? 'warn' : '', 'Tạm ứng chưa thu hồi', t.tamUngCon > 0.5 ? '<small>' + fs(t.tamUngCon) + '</small>' : '0', t.blCanhBao ? t.blCanhBao + ' bảo lãnh cần gia hạn, theo dõi' : '', 'hd:') +
      kpi(t.quaHanLC + t.quaHanHD ? 'bad' : 'ok', 'Quá hạn', t.quaHanLC + t.quaHanHD, t.quaHanLC + ' gói quá hạn LCNT · ' + t.quaHanHD + ' hợp đồng quá hạn', t.quaHanHD ? 'hd:quahan' : t.quaHanLC ? 'gt:quahan' : '') + '</div>';
    const funnel = t.byTT.filter(o => o.n).map(o => ({ name: o.ten, act: 'gt:' + o.k, parts: [{ val: o.n, color: o.k === 'huy' ? P.idle : ['cokq', 'dakyhd'].includes(o.k) ? P.ok : o.k === 'danglcnt' ? P.info : P.warn, name: o.ten }], right: o.n + ' gói · ' + fs(o.gia) }));
    h += '<div class="grid2"><div class="card"><div class="card-h"><h3>Gói thầu theo bước</h3><div class="sub">Từ nhu cầu mua sắm đến ký hợp đồng; bấm để xem danh sách</div></div><div class="card-b" data-hb>' + UI.hbars(funnel) + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>Việc cần xử lý (' + viec.length + ')</h3><div class="sub">Quá hạn lựa chọn nhà thầu, hợp đồng sắp hết hạn, bảo lãnh sắp hết hiệu lực, nghiệm thu chưa thanh toán</div></div><div class="card-b">' + (viec.length ? viec.slice(0, 8).map(A.issueHtml).join('') + (viec.length > 8 ? '<div class="small muted" style="padding-top:6px">… và ' + (viec.length - 8) + ' việc khác</div>' : '') : '<div class="note ok">Không có việc cần xử lý.</div>') + '</div></div></div>';
    h += '<div class="grid2 mt"><div class="card"><div class="card-h"><h3>Lịch hạn trong 60 ngày tới</h3><div class="sub">Gồm cả mốc đã quá hạn chưa xử lý</div></div><div class="card-b">' + (lich.length ? '<table class="tbl"><tbody>' + lich.slice(0, 14).map(x => '<tr class="click" data-go="' + x.coll + ':' + x.id + '"><td class="nowrap" style="padding-left:0"><b' + (x.qua ? ' style="color:var(--bad-fg)"' : '') + '>' + U.fmtDate(x.d) + '</b><div class="t2">' + (x.qua ? 'Đã quá ' + U.diffDays(U.today(), x.d) + ' ngày' : 'Còn ' + U.diffDays(x.d, U.today()) + ' ngày') + '</div></td><td class="wrap"><div class="t1">' + e(x.loai) + '</div><div class="t2">' + e(U.trunc(x.ten, 90)) + '</div></td></tr>').join('') + '</tbody></table>' : '<div class="note ok">Không có mốc hạn nào trong 60 ngày tới.</div>') + '</div></div>';
    const dang = t.hx.filter(o => (o.h.trangThai || 'dang') === 'dang' || o.h.trangThai === 'nghiemthu').sort((a, b) => b.x.giaTriHL - a.x.giaTriHL).slice(0, 10);
    h += '<div class="card"><div class="card-h"><h3>Thanh toán hợp đồng đang thực hiện</h3><div class="sub">Đã thanh toán / giá trị hợp đồng sau phụ lục</div></div><div class="card-b" data-hb>' + (dang.length ? UI.hbars(dang.map(o => ({ name: (o.h.so || '') + ' ' + (o.h.nhaThau || ''), act: 'hdopen:' + o.h.id, total: o.x.giaTriHL, parts: [{ val: o.x.thanhToan, color: P.ok, name: 'Đã thanh toán', label: fs(o.x.thanhToan) }, { val: Math.max(0, o.x.nghiemThu - o.x.thanhToan), color: P.warn, name: 'Đã nghiệm thu, chưa thanh toán', label: fs(Math.max(0, o.x.nghiemThu - o.x.thanhToan)) }, { val: Math.max(0, o.x.giaTriHL - Math.max(o.x.nghiemThu, o.x.thanhToan)), color: 'var(--grid)', name: 'Còn lại', label: fs(Math.max(0, o.x.giaTriHL - Math.max(o.x.nghiemThu, o.x.thanhToan))) }], right: U.fmtPct(o.x.tyLeTT, 0) }))) + '<div class="legend"><span><i style="background:var(--ok)"></i>Đã thanh toán</span><span><i style="background:var(--warn)"></i>Nghiệm thu chưa thanh toán</span><span><i style="background:var(--grid)"></i>Còn lại</span></div>' : '<div class="note">Không có hợp đồng đang thực hiện.</div>') + '</div></div></div>';
    const gRows = t.hx.filter(o => o.h.ngayBD || o.h.ngayKy || o.x.han).sort((a, b) => U.cmp(a.x.han, b.x.han)).slice(0, 25).map(o => ({ label: (o.h.so || '') + ' — ' + (o.h.ten || o.h.nhaThau || ''), act: 'hdopen:' + o.h.id, bars: [{ a: o.h.ngayBD || o.h.ngayKy, b: o.x.han, st: o.h.trangThai === 'thanhly' ? 'ok' : o.x.over ? 'bad' : o.x.near ? 'warn' : 'info', title: 'Từ ' + U.fmtDate(o.h.ngayBD || o.h.ngayKy) + ' đến ' + U.fmtDate(o.x.han) }], dots: (o.h.phuLuc || []).filter(p => p.giaHanDen).map(p => ({ d: p.ngay || p.giaHanDen, st: 'warn', title: 'Phụ lục ' + p.so + (p.giaHanDen ? ': gia hạn đến ' + U.fmtDate(p.giaHanDen) : '') })) }));
    if (gRows.length) h += '<div class="card mt"><div class="card-h"><h3>Tiến độ thực hiện hợp đồng</h3><div class="sub">Từ ngày bắt đầu (hoặc ngày ký) đến thời hạn hợp đồng sau gia hạn</div></div><div class="card-b">' + UI.gantt(gRows, { head: 'Hợp đồng' }) + '</div></div>';
    root.innerHTML = h; bind();
    function bind() {
      $('[data-fda]', root).onchange = x => { T.duan = x.target.value; A.render(); };
      $('[data-fcb]', root).onchange = x => { T.cb = x.target.value; A.render(); };
      $('[data-addgt]', root).onclick = () => UI.form({ coll: 'goithau', rec: { duAnId: T.duan || '', canBoId: T.cb || '' } });
      $('[data-vbd]', root).onclick = () => A.go('vanbanden');
      $('[data-rep]', root).onclick = () => { const td = U.today(); A.vs.bc = Object.assign(A.vs.bc || { kind: 'nam', n: 1, from: td.slice(0, 8) + '01', to: td, nhom: '', dv: '', secs: [] }, { type: 'dauthau', kind: 'nam', y: +td.slice(0, 4), duan: T.duan || '', cb: T.cb || '' }); A.go('baocao'); };
      A.bindGo(root);
      UI.on(root, 'click', '[data-act]', b => { const [k, v] = b.dataset.act.split(':'); if (k === 'hdopen') A.open('hopdong', v); else if (k === 'gt') goList('gt', v); });
      UI.on(root, 'click', '[data-dk]', b => { const [k, v] = b.dataset.dk.split(':'); goList(k, v); });
    }
    function goList(tab, tt) { T.t = tab; const key = tab === 'gt' ? 'goithau' : 'hopdong', vs = A.vs[key] || (A.vs[key] = { q: '', f: {}, tbl: {} }); vs.f = tt ? { tt } : {}; vs.q = ''; vs.tbl.page = 0; A.render(); }
  }

  /* ---------- Nhóm gói thầu, hợp đồng theo kế hoạch lựa chọn nhà thầu ---------- */
  const soKH = A.L0.soKH, KHONG_KH = '';
  const khCua = k => k ? S.all('khlcnt').find(r => soKH(r.so) === k) || null : null;
  // Gợi ý tên kế hoạch: đoạn chữ chung dài nhất của tên các gói (bỏ "Gói thầu số NN:")
  const goiYTen = gs => {
    const ws = gs.map(g => String(g.ten || '').replace(/^\s*Gói thầu số\s*\d+\s*[:.-]\s*/i, '').split(/\s+/).filter(Boolean)); if (ws.length < 2) return '';
    const nn = ws.map(w => ' ' + U.norm(w.join(' ')) + ' '), a = ws[0];
    for (let n = Math.min(a.length, 40); n >= 5; n--) for (let i = 0; i + n <= a.length; i++) { const cum = a.slice(i, i + n), k = ' ' + U.norm(cum.join(' ')) + ' '; if (nn.every(x => x.includes(k))) return cum.join(' ').replace(/^(thuộc|của|cho|gói|dự án:?|nhiệm vụ:?)\s+/i, '').replace(/[,;:\s]+$/, ''); }
    return '';
  };
  const ngayKH = (k, gs) => { const r = khCua(k); return (r && r.ngay) || gs.map(g => g.qdKHNgay).filter(U.isISO).sort()[0] || ''; };
  const tieuDeKH = (k, gs) => {
    const r = khCua(k), so = r ? r.so : (gs.find(g => g.qdKHSo) || {}).qdKHSo, ng = ngayKH(k, gs), ten = (r && r.ten) || goiYTen(gs);
    return '<span class="grp-t">' + (k ? 'KHLCNT ' + e(so) + (ng ? ' ngày ' + U.fmtDate(ng) : '') : 'Chưa ghi quyết định phê duyệt KHLCNT') + '</span>' + (k ? '<span class="grp-s">' + (ten ? e(U.trunc(ten, 140)) + (r && r.ten ? '' : ' <i>(gợi ý)</i>') : '<i>chưa đặt tên kế hoạch</i>') + '</span>' : '');
  };
  A.dtNhom = {
    goithau: [{ k: 'kh', label: 'Kế hoạch LCNT', key: g => soKH(g.qdKHSo) || KHONG_KH,
      order: (a, b, ga, gb) => (a === KHONG_KH) - (b === KHONG_KH) || U.cmp(ngayKH(b, gb), ngayKH(a, ga)) || U.cmp(a, b),
      head: (k, gs) => {
        const tong = U.sum(gs, g => g.giaGoiThau), kq = gs.filter(g => ['cokq', 'dakyhd'].includes(g.trangThai)), ky = gs.filter(g => g.trangThai === 'dakyhd').length, tk = U.sum(kq.filter(g => U.num(g.giaTrung) && U.num(g.giaGoiThau)), g => U.num(g.giaGoiThau) - U.num(g.giaTrung));
        return '<span class="grp-h">' + tieuDeKH(k, gs) + '<span class="grp-s"><b>' + gs.length + '</b> gói · tổng giá <b>' + U.fmtShort(tong) + '</b> · có kết quả <b>' + kq.length + '/' + gs.length + '</b> · đã ký HĐ <b>' + ky + '</b> <span class="grp-bar" title="Tỷ lệ gói đã có kết quả"><i style="width:' + Math.round(kq.length / gs.length * 100) + '%"></i></span>' + (kq.length ? ' · giá trúng ' + U.fmtShort(U.sum(kq, g => g.giaTrung)) + (tk > 0 ? ' · tiết kiệm ' + U.fmtShort(tk) : '') : '') + '</span>' +
          (k ? '<span class="grp-s"><button type="button" class="btn sm ghost" data-grp-act data-kh-sua="' + e(k) + '">' + ic('edit', 14) + (khCua(k) ? 'Sửa kế hoạch' : 'Đặt tên kế hoạch') + '</button><button type="button" class="btn sm ghost" data-grp-act data-kh-them="' + e(k) + '">' + ic('plus', 14) + 'Thêm gói</button></span>' : '') + '</span>';
      },
      after: (box, nhom0) => {
        // draw() của bảng gọi lại after mỗi lần mở/thu nhóm, sắp xếp — chỉ gắn sự kiện một lần, dùng nhóm của lần vẽ gần nhất
        box._khNhom = nhom0; if (box._khBound) return; box._khBound = true;
        const nhomNay = () => box._khNhom || [];
        UI.on(box, 'click', '[data-kh-sua]', b => { const nhom = nhomNay(), k = b.dataset.khSua, gs = (nhom.find(x => x[0] === k) || [0, []])[1], r = khCua(k); UI.form({ coll: 'khlcnt', rec: r || { so: (gs.find(g => g.qdKHSo) || {}).qdKHSo || '', ngay: ngayKH(k, gs), ten: goiYTen(gs), duAnId: (gs.find(g => g.duAnId) || {}).duAnId || '', nsId: (gs.find(g => g.nsId) || {}).nsId || '' } }); });
        UI.on(box, 'click', '[data-kh-them]', b => { const nhom = nhomNay(), k = b.dataset.khThem, gs = (nhom.find(x => x[0] === k) || [0, []])[1], g0 = gs[0] || {}, r = khCua(k); UI.form({ coll: 'goithau', rec: { qdKHSo: g0.qdKHSo || (r && r.so) || '', qdKHNgay: g0.qdKHNgay || (r && r.ngay) || '', duAnId: g0.duAnId || (r && r.duAnId) || '', nsId: g0.nsId || (r && r.nsId) || '', trangThai: 'khlcnt' } }); });
      } }],
    hopdong: [{ k: 'kh', label: 'Kế hoạch LCNT', key: h => soKH((S.get('goithau', h.goiThauId) || {}).qdKHSo) || KHONG_KH,
      order: (a, b) => (a === KHONG_KH) - (b === KHONG_KH) || U.cmp(b, a),
      head: (k, hs) => { const gs = S.all('goithau').filter(g => soKH(g.qdKHSo) === k), x = hs.map(L.hd); return '<span class="grp-h">' + (k ? tieuDeKH(k, gs) : '<span class="grp-t">Hợp đồng chưa gắn gói thầu có KHLCNT</span>') + '<span class="grp-s"><b>' + hs.length + '</b> hợp đồng · giá trị <b>' + U.fmtShort(U.sum(x, o => o.giaTriHL)) + '</b> · đã thanh toán <b>' + U.fmtShort(U.sum(x, o => o.thanhToan)) + '</b> (' + U.fmtPct(U.pct(U.sum(x, o => o.thanhToan), U.sum(x, o => o.giaTriHL)), 0) + ')</span></span>'; } },
      { k: 'nt', label: 'Nhà thầu', key: h => h.nhaThau || '(chưa ghi nhà thầu)', order: (a, b) => U.cmp(a, b), head: (k, hs) => '<span class="grp-h"><span class="grp-t">' + e(k) + '</span><span class="grp-s"><b>' + hs.length + '</b> hợp đồng · ' + U.fmtShort(U.sum(hs, h => L.hdGiaTri(h))) + '</span></span>' }]
  };

  const base = A.views.dauthau.render;
  A.views.dauthau.sub = 'Gói thầu, hợp đồng do Sở làm chủ đầu tư: kế hoạch lựa chọn nhà thầu, kết quả, tạm ứng, bảo lãnh, nghiệm thu, thanh toán, thanh lý';
  A.views.dauthau.render = (root, p) => {
    const T = A.vs.dtTab || (A.vs.dtTab = { t: 'tq' }); if (p && p.tab) T.t = p.tab;
    if (T.t === 'tq') {
      const gts = S.count('goithau'), hds = S.count('hopdong');
      root.innerHTML = '<div class="tabs" role="tablist"><button role="tab" class="on" data-t="tq">Tổng quan</button><button role="tab" data-t="gt">Gói thầu, mua sắm (' + gts + ')</button><button role="tab" data-t="hd">Hợp đồng (' + hds + ')</button></div><div data-tq></div>';
      $$('[data-t]', root).forEach(b => b.onclick = () => { T.t = b.dataset.t; A.render(); });
      tongQuan($('[data-tq]', root), T); return;
    }
    base(root, p);
    // Mục 5: gói còn ghi hình thức cũ "Đặt hàng, giao nhiệm vụ" → chuyển hàng loạt sang "Đặt hàng" hoặc "Giao nhiệm vụ"
    const CU = 'Đặt hàng, giao nhiệm vụ', cu = S.all('goithau').filter(g => g.hinhThuc === CU);
    if (cu.length) {
      const nt = document.createElement('div'); nt.className = 'note warn mb';
      nt.innerHTML = cu.length + ' gói thầu còn ghi hình thức cũ "' + e(CU) + '". Hình thức này nay tách thành "Đặt hàng" và "Giao nhiệm vụ". <button class="btn sm" data-chuyenht>Chuyển hình thức</button>';
      const tb0 = $('.tabs', root); root.insertBefore(nt, tb0);
      $('[data-chuyenht]', nt).onclick = () => {
        const doan = g => /giao nhiem vu/.test(U.norm([g.ten, g.ghiChu, g.qdDHSo, (g.tienTrinh || []).map(x => x.ghiChu + ' ' + x.buoc).join(' ')].join(' '))) ? 'Giao nhiệm vụ' : 'Đặt hàng';
        const m = UI.modal({ title: 'Chuyển hình thức cho ' + cu.length + ' gói', size: 'lg',
          body: '<p class="small soft">Phần mềm đoán theo tên, ghi chú và tiến trình của gói (có chữ "giao nhiệm vụ" thì chọn Giao nhiệm vụ, còn lại Đặt hàng). Kiểm tra từng gói trước khi lưu.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Gói thầu</th><th class="num">Giá gói thầu</th><th style="width:190px">Hình thức mới</th></tr></thead><tbody>' +
            cu.map(g => '<tr><td class="wrap">' + e(g.ten) + '<div class="t2">' + e(UI.refSub('goithau', g.id)) + '</div></td><td class="num">' + U.fmtMoney(g.giaGoiThau) + '</td><td><select class="sel" data-ht="' + e(g.id) + '" aria-label="Hình thức mới"><option>Đặt hàng</option><option' + (doan(g) === 'Giao nhiệm vụ' ? ' selected' : '') + '>Giao nhiệm vụ</option><option value="">(giữ nguyên)</option></select></td></tr>').join('') + '</tbody></table></div>',
          buttons: [{ label: 'Hủy', on: a => a.close() }, { label: 'Lưu', cls: 'primary', icon: 'check', on: async a => {
            const ds = $$('[data-ht]', m.body).filter(x => x.value).map(x => ({ c: 'goithau', rec: { id: x.dataset.ht, hinhThuc: x.value, loai: (S.get('goithau', x.dataset.ht) || {}).loai || 'Dịch vụ sự nghiệp công' } }));
            if (!ds.length) { a.close(); return; }
            try { await S.saveMany(ds, { note: 'Chuyển hình thức "' + CU + '" của ' + ds.length + ' gói' }); a.close(); UI.toast('Đã chuyển ' + ds.length + ' gói.', 'ok'); A.render(); } catch (er) { UI.fail(er); }
          } }] });
      };
    }
    const tabs = $('.tabs', root);
    if (tabs) { const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.dataset.t = 'tq'; b.textContent = 'Tổng quan'; b.onclick = () => { T.t = 'tq'; A.render(); }; tabs.prepend(b); }
  };
})(App);
