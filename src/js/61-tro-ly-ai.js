/* ============================================================
   61-tro-ly-ai.js — Hộp chat Trợ lý AI (bong bóng góc phải dưới)
   Mỗi câu hỏi: chọn các đoạn số liệu liên quan trong phần mềm (đánh số [n]) → gửi Worker Cloudflare Workers AI
   → trả lời có dẫn nguồn [n], bấm vào [n] để mở bản ghi. Hội thoại chỉ lưu tạm trong thẻ trình duyệt.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$;
  const KHOA = 'khtc-so-chat', TOI_DA = 40, fm = v => U.fmtMoney(Math.round(U.num(v))) + ' đồng';
  const CHI_DAN = `Bạn là trợ lý điều hành của Phòng Kế hoạch - Tài chính, Sở Nông nghiệp và Môi trường tỉnh Sơn La, trả lời bằng tiếng Việt cho lãnh đạo Phòng, lãnh đạo Sở.
Quy tắc bắt buộc:
1. Chỉ dùng số liệu trong các ĐOẠN DỮ LIỆU được cung cấp (đánh số [1], [2]…), lấy từ phần mềm quản lý của Phòng. Không dùng số liệu bên ngoài, không bịa số.
2. Mỗi ý có số liệu phải ghi nguồn dạng [n] ngay sau ý đó. Giữ nguyên số tiền, tỷ lệ, ngày như trong đoạn dữ liệu.
3. Nếu dữ liệu không đủ để trả lời, nói rõ "Phần mềm chưa có dữ liệu về …" và gợi ý cần cập nhật gì; không suy đoán.
4. Khi được hỏi phương án, đề xuất: nêu các phương án có căn cứ trên số liệu (ví dụ đôn đốc, rà soát điều chỉnh dự toán, đề xuất thu hồi, gia hạn hợp đồng, yêu cầu gia hạn bảo lãnh), không viện dẫn điều khoản pháp luật nếu đoạn dữ liệu không có.
5. Trả lời ngắn gọn, có cấu trúc (gạch đầu dòng khi liệt kê), không quá 300 từ.`;
  const GOI_Y = ['Tiến độ giải ngân dự toán năm nay thế nào, có nguy cơ không giải ngân hết không?', 'Những nội dung nào giải ngân chậm nhất?', 'Hợp đồng nào sắp hết hạn hoặc bảo lãnh sắp hết hiệu lực?', 'Đề xuất phương án chỉ đạo để đẩy nhanh giải ngân'];

  /* ---------- Đoạn dữ liệu (ngữ cảnh) ---------- */
  function doan() {
    const out = [], y = A.year() || +U.today().slice(0, 4), add = (tieuDe, noiDung, lk, tu) => out.push({ tieuDe, noiDung, lk, tu: tu || '' });
    try {
      const g = L.giaiNgan(y, {});
      if (g.tong) {
        add('Tổng quan giải ngân dự toán năm ' + y, 'Số liệu đến ngày ' + U.fmtDate(g.asOf) + ': tổng kinh phí được sử dụng ' + fm(g.tong) + '; đã giải ngân ' + fm(g.gn) + ' (' + U.fmtPct(g.tyLe) + '); còn ' + fm(g.conLai) + '. ' + (g.mt.tuDat ? 'Mục tiêu lũy kế hết tháng ' + g.lastM + ': ' + U.fmtPct(g.mtNay) : 'Tỷ lệ thời gian đã qua: ' + U.fmtPct(g.tyLeTG)) + '. Dự báo đến 31/12: ' + fm(g.duBao) + ' (' + U.fmtPct(U.pct(g.duBao, g.tong)) + ')' + (g.nguyCo ? ', có nguy cơ không giải ngân hết' : '') + '.' + (g.canMoiThang !== null && g.conLai > 0.5 ? ' Cần bình quân ' + fm(g.canMoiThang) + '/tháng để hết kế hoạch.' : ''), 'route:ngansach', 'giai ngan du toan ngan sach tien do tong quan kinh phi du bao nguy co');
        L.gnDeXuat(y, {}).forEach(x => add('Đề xuất về giải ngân: ' + x.t, x.d, 'route:ngansach', 'de xuat phuong an chi dao giai ngan cham'));
        L.gnNhom(y, 'dv').forEach(o => add('Giải ngân của đơn vị ' + o.ten, 'Được sử dụng ' + fm(o.tong) + ', đã giải ngân ' + fm(o.gn) + ' (' + U.fmtPct(o.ty) + '), còn ' + fm(o.con) + '; ' + o.n + ' nội dung, ' + o.cham + ' nội dung chậm, ' + o.chuaGN + ' chưa giải ngân.', 'route:ngansach', 'don vi giai ngan ' + U.norm(o.ten)));
        L.gnNhom(y, 'cb').forEach(o => add('Giải ngân do ' + o.ten + ' theo dõi', o.n + ' nội dung, được sử dụng ' + fm(o.tong) + ', đã giải ngân ' + U.fmtPct(o.ty) + ', ' + o.cham + ' nội dung chậm.', 'route:ngansach', 'can bo theo doi giai ngan ' + U.norm(o.ten)));
        L.gnDong(y, {}).filter(x => x.cham || x.chuaGN).sort((a, b) => b.con - a.con).slice(0, 25).forEach(x => add('Nội dung dự toán ' + (x.cham ? 'giải ngân chậm' : 'chưa giải ngân') + ': ' + U.trunc(x.r.noiDung, 120), 'Đơn vị ' + Sc.refName('donvi', x.r.donViId) + '; được sử dụng ' + fm(x.tong) + '; đã giải ngân ' + fm(x.gn) + ' (' + U.fmtPct(x.ty) + '); còn ' + fm(x.con) + (x.r.tienDo ? '; tiến độ: ' + U.trunc(x.r.tienDo, 200) : '') + '; cán bộ: ' + (Sc.refName('canbo', x.r.canBoId) || 'chưa giao') + '.', 'ngansach:' + x.r.id, 'giai ngan cham nhat thap noi dung'));
      }
    } catch (x) { console.warn(x); }
    try {
      const t = L.dtTong({});
      if (t.soGT || t.soHD) add('Tổng quan đấu thầu, hợp đồng', t.soGT + ' gói thầu (tổng giá ' + fm(t.giaGT) + '): ' + t.soChuaTC + ' chưa tổ chức, ' + t.soDangLC + ' đang lựa chọn nhà thầu, ' + t.soCoKQ + ' đã có kết quả (giá trúng ' + fm(t.giaTrung) + ', tiết kiệm ' + fm(t.tietKiem) + '). ' + t.soHD + ' hợp đồng, giá trị ' + fm(t.giaHD) + ', đã thanh toán ' + fm(t.daTT) + ' (' + U.fmtPct(t.tyLeTT) + '), tạm ứng chưa thu hồi ' + fm(t.tamUngCon) + '.', 'route:dauthau', 'dau thau goi thau hop dong tong quan lua chon nha thau');
      L.dtViec({}).slice(0, 25).forEach(v => add(v.title, v.detail, v.coll + ':' + v.id, 'can xu ly qua han sap het han bao lanh tam ung nghiem thu thanh ly hop dong goi thau'));
      S.all('goithau').slice(0, 60).forEach(g => { const x = L.gt(g); add('Gói thầu: ' + U.trunc(g.ten, 120), 'Giá gói thầu ' + fm(g.giaGoiThau) + '; hình thức ' + (g.hinhThuc || 'chưa ghi') + '; ' + x.label + (g.qdKHSo ? '; KHLCNT ' + g.qdKHSo : '') + (g.nhaThau ? '; nhà thầu ' + g.nhaThau + ', giá trúng ' + fm(g.giaTrung) : '') + (x.note ? '; ' + x.note : '') + '.', 'goithau:' + g.id, 'goi thau ' + U.norm(g.nhaThau || '')); });
      S.all('hopdong').slice(0, 60).forEach(h => { const x = L.hd(h); add('Hợp đồng ' + (h.so || '') + ': ' + U.trunc(h.ten || '', 100), 'Nhà thầu ' + (h.nhaThau || 'chưa ghi') + '; giá trị ' + fm(x.giaTriHL) + '; đã thanh toán ' + fm(x.thanhToan) + ' (' + U.fmtPct(x.tyLeTT) + '); thời hạn ' + (U.fmtDate(x.han) || 'chưa ghi') + '; ' + x.label + (x.note ? '; ' + x.note : '') + (x.canhBao.length ? '; ' + x.canhBao.map(c => c.t).join('; ') : '') + '.', 'hopdong:' + h.id, 'hop dong ' + U.norm(h.nhaThau || '')); });
    } catch (x) { console.warn(x); }
    try {
      const vons = L.vonOfYear(y);
      if (vons.length) add('Kế hoạch vốn đầu tư năm ' + y, 'Kế hoạch vốn ' + fm(U.sum(vons, o => o.kh)) + ', đã giải ngân ' + fm(U.sum(vons, o => o.gn)) + ' (' + U.fmtPct(U.pct(U.sum(vons, o => o.gn), U.sum(vons, o => o.kh))) + '); ' + vons.filter(o => o.thap).length + ' dòng vốn giải ngân thấp.', 'route:von', 'von dau tu ke hoach von giai ngan du an');
      const ts = S.all('taisan');
      if (ts.length) add('Tài sản công', ts.length + ' tài sản; nguyên giá ' + fm(U.sum(ts, t => t.nguyenGia)) + '; giá trị còn lại ' + fm(U.sum(ts, t => t.conLai)) + '; ' + ts.filter(L.isNhaDat).length + ' cơ sở nhà, đất.', 'route:taisan', 'tai san cong nha dat kiem ke nguyen gia');
      A.dashAlerts(A.year()).filter(a => a.sev >= 2 && !['hopdong', 'dauthau', 'giaingan'].includes(a.loai)).slice(0, 15).forEach(a => add('Cảnh báo: ' + a.title, a.detail, a.coll === 'link' ? 'route:ketnoi' : a.coll + ':' + a.id, 'canh bao van de can xu ly'));
    } catch (x) { console.warn(x); }
    return out;
  }
  function chon(cauHoi, tat) {
    const q = U.norm(cauHoi).split(/[^a-z0-9]+/).filter(w => w.length > 1), stop = new Set(['cac', 'nao', 'nhung', 'the', 'co', 'khong', 'la', 'va', 'cua', 'cho', 'den', 'nay', 'duoc', 'trong', 'bao', 'nhieu']);
    const kw = q.filter(w => !stop.has(w));
    const sc = tat.map((d, i) => { const t = U.norm(d.tieuDe + ' ' + d.noiDung + ' ' + d.tu); let s = 0; kw.forEach(w => { if (t.includes(w)) s += w.length > 3 ? 2 : 1; }); for (let k = 0; k < kw.length - 1; k++) if (t.includes(kw[k] + ' ' + kw[k + 1])) s += 3; if (i === 0) s += 1.5; return { d, s, i }; });
    return sc.filter(x => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 10).map(x => x.d);
  }

  /* ---------- Giao diện ---------- */
  let ds = [], dangHoi = false, nut, khung, than, o, gui;
  const doc = () => { try { ds = JSON.parse(sessionStorage.getItem(KHOA) || '[]'); } catch (x) { ds = []; } };
  const ghi = () => { ds = ds.slice(-TOI_DA); try { sessionStorage.setItem(KHOA, JSON.stringify(ds)); } catch (x) { } };
  const md = (t, nguon) => {
    const lines = e(t).split('\n'), out = []; let ul = false;
    lines.forEach(l => {
      let x = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(\d{1,2})\]/g, (m, n) => nguon[+n - 1] ? '<a href="#" class="cite" data-lk="' + e(nguon[+n - 1].lk) + '" title="' + e(nguon[+n - 1].tieuDe) + '">[' + n + ']</a>' : m);
      if (/^\s*[-*•]\s+/.test(l)) { if (!ul) { out.push('<ul>'); ul = true; } out.push('<li>' + x.replace(/^\s*[-*•]\s+/, '') + '</li>'); }
      else { if (ul) { out.push('</ul>'); ul = false; } if (x.trim()) out.push('<p>' + x + '</p>'); }
    });
    if (ul) out.push('</ul>'); return out.join('');
  };
  function tin(t) {
    if (t.vai === 'nguoi') return '<div class="cb-row me"><div class="cb-bub">' + e(t.noiDung).replace(/\n/g, '<br>') + '</div></div>';
    const nguon = t.nguon || [];
    return '<div class="cb-row ai"><span class="cb-av" aria-hidden="true">' + ic('spark', 16) + '</span><div class="cb-bub' + (t.loi ? ' err' : '') + '">' + (t.traLoi ? md(t.traLoi, nguon) : '<p>' + e(t.thongBao || '') + '</p>') +
      (nguon.length ? '<details class="cb-src"><summary>Đoạn dữ liệu đã dùng (' + nguon.length + ')</summary><ol>' + nguon.map(x => '<li><a href="#" data-lk="' + e(x.lk) + '">' + e(U.trunc(x.tieuDe, 100)) + '</a></li>').join('') + '</ol></details>' : '') +
      (t.traLoi ? '<div class="cb-tag">AI Cloudflare' + (t.mh ? ' · ' + e(t.mh) : '') + ' — đối chiếu số liệu trước khi sử dụng</div>' : '') + '</div></div>';
  }
  function ve() {
    if (!than) return;
    const chao = '<div class="cb-row ai"><span class="cb-av" aria-hidden="true">' + ic('spark', 16) + '</span><div class="cb-bub"><p>Xin chào! Tôi trả lời câu hỏi về <b>giải ngân, dự toán, đấu thầu, hợp đồng, vốn đầu tư, tài sản</b> dựa trên số liệu đang có trong phần mềm, có dẫn nguồn [n].</p><p class="small muted">Câu hỏi và các đoạn số liệu liên quan được gửi tới Worker AI Cloudflare của Phòng để soạn câu trả lời.</p></div></div>';
    const goiY = ds.length ? '' : '<div class="cb-sug">' + GOI_Y.map(g => '<button type="button" data-gy="' + e(g) + '">' + e(g) + '</button>').join('') + '</div>';
    const go = dangHoi ? '<div class="cb-row ai"><span class="cb-av" aria-hidden="true">' + ic('spark', 16) + '</span><div class="cb-bub cb-typing" aria-label="Đang soạn câu trả lời"><i></i><i></i><i></i></div></div>' : '';
    than.innerHTML = chao + ds.map(tin).join('') + go + goiY;
    const hm = A.AI.hanMuc(), hmEl = $('[data-hm]', khung);
    hmEl.textContent = !A.AI.coSan() ? 'Chưa cấu hình AI' : hm.het ? 'Hạn mức AI hôm nay đã hết' : 'Còn ' + hm.conLai + '/' + hm.toiDa + ' lượt hỏi hôm nay';
    than.scrollTop = than.scrollHeight;
  }
  async function hoi(cauHoi) {
    cauHoi = String(cauHoi || '').trim().slice(0, 600); if (!cauHoi || dangHoi) return;
    ds.push({ vai: 'nguoi', noiDung: cauHoi }); ghi();
    const nguon = chon(cauHoi, doan());
    const tra = t => { ds.push(Object.assign({ vai: 'ai', nguon }, t)); ghi(); dangHoi = false; gui.disabled = false; ve(); o.focus(); };
    if (!nguon.length) return tra({ thongBao: 'Phần mềm chưa có số liệu liên quan đến câu hỏi. Hãy nhập dự toán, giải ngân, gói thầu, hợp đồng… hoặc hỏi cách khác (ví dụ: "giải ngân", "hợp đồng sắp hết hạn").', loi: true });
    if (!A.AI.coSan()) return tra({ thongBao: 'Trợ lý AI chưa được cấu hình (bấm biểu tượng bánh răng để nhập địa chỉ Worker). Dưới đây là các đoạn dữ liệu liên quan nhất.' });
    dangHoi = true; gui.disabled = true; ve();
    const truoc = ds.slice(0, -1).filter(t => t.vai === 'nguoi' || t.traLoi).slice(-4).map(t => ({ role: t.vai === 'nguoi' ? 'user' : 'assistant', content: t.vai === 'nguoi' ? t.noiDung : t.traLoi }));
    const user = 'ĐOẠN DỮ LIỆU (trích từ phần mềm ngày ' + U.fmtDate(U.today()) + '):\n' + nguon.map((x, i) => '[' + (i + 1) + '] ' + x.tieuDe + '\n' + x.noiDung).join('\n\n') + '\n\nCÂU HỎI: ' + cauHoi;
    try { const r = await A.AI.goi([{ role: 'system', content: CHI_DAN }].concat(truoc).concat([{ role: 'user', content: user }]), { max_tokens: 1200 }); tra({ traLoi: r.text, mh: r.tenMoHinh }); }
    catch (er) { tra({ thongBao: 'Không gọi được AI: ' + er.message + '. Dưới đây là các đoạn dữ liệu liên quan nhất.', loi: true }); }
  }
  function caiDat() {
    const c = A.AI.cfg();
    const m = UI.modal({ title: 'Cấu hình Trợ lý AI', body: '<div class="fld"><label for="ai_u">Địa chỉ Worker Cloudflare Workers AI</label><input class="inp" id="ai_u" value="' + e(c.url) + '" placeholder="' + e(A.AI.MAC_DINH) + '"><div class="help">Worker nhận POST {messages, max_tokens} và trả {text, model} (cùng giao thức với phần mềm Rà soát văn bản, Tra cứu TTHC đất đai). Khóa API nằm trong biến bí mật của Worker, không lưu trên phần mềm. Để trống để tắt AI.</div></div><div class="fld mt"><label for="ai_l">Số lượt gọi AI tối đa mỗi ngày trên trình duyệt này</label><input class="inp" id="ai_l" type="number" min="1" max="500" value="' + c.gioiHan + '"><div class="help">Workers AI miễn phí 10.000 Neurons/ngày cho cả tài khoản; giới hạn này giúp không làm cạn hạn mức chung. Đọc văn bản đến trên máy cũng tính lượt.</div></div><div class="small mt" data-kq></div>',
      buttons: [{ label: 'Hủy', on: x => x.close() }, { label: 'Kiểm tra kết nối', on: async () => { const kq = $('[data-kq]', m.body); await save(); kq.textContent = 'Đang kiểm tra…'; try { kq.textContent = await A.AI.kiemTra(); kq.style.color = 'var(--ok-fg)'; } catch (er) { kq.textContent = er.message; kq.style.color = 'var(--bad-fg)'; } } }, { label: 'Lưu', cls: 'primary', on: async x => { await save(); x.close(); ve(); UI.toast('Đã lưu cấu hình AI.', 'ok'); } }] });
    async function save() { await S.setCfg({ aiUrl: $('#ai_u', m.body).value.trim(), aiGioiHan: Math.max(1, Math.min(500, +$('#ai_l', m.body).value || 30)) }); }
  }
  const moLk = lk => { const i = String(lk).indexOf(':'), c = lk.slice(0, i), id = lk.slice(i + 1); if (c === 'route') A.go(id); else A.open(c, id); };
  A.chat = {
    CHI_DAN, doan, chon,
    mount() {
      if (nut || typeof document === 'undefined') return;
      doc();
      nut = UI.el('<button class="cb-fab" type="button" aria-label="Mở Trợ lý AI" title="Hỏi Trợ lý AI">' + ic('chat', 24) + '</button>');
      khung = UI.el('<section class="cb-panel" role="dialog" aria-label="Trợ lý AI" hidden><header class="cb-h"><span class="cb-av" aria-hidden="true">' + ic('spark', 16) + '</span><div class="grow" style="min-width:0"><b>Trợ lý AI</b><div class="small muted" data-hm></div></div><button class="btn icon sm" data-new title="Hội thoại mới" aria-label="Hội thoại mới">' + ic('plus', 16) + '</button><button class="btn icon sm" data-cfg title="Cấu hình AI" aria-label="Cấu hình AI">' + ic('gear', 16) + '</button><button class="btn icon sm" data-x title="Đóng" aria-label="Đóng">' + ic('x', 16) + '</button></header><div class="cb-body" aria-live="polite"></div><form class="cb-f"><textarea class="inp" rows="1" maxlength="600" placeholder="Hỏi về giải ngân, hợp đồng, đấu thầu…" aria-label="Câu hỏi"></textarea><button class="btn primary icon" type="submit" aria-label="Gửi">' + ic('send', 17) + '</button></form></section>');
      document.body.appendChild(nut); document.body.appendChild(khung);
      than = $('.cb-body', khung); o = $('textarea', khung); gui = $('button[type=submit]', khung);
      const mo = v => { khung.hidden = !v; nut.classList.toggle('on', v); if (v) { ve(); o.focus(); } };
      nut.onclick = () => mo(khung.hidden);
      $('[data-x]', khung).onclick = () => mo(false);
      $('[data-cfg]', khung).onclick = caiDat;
      $('[data-new]', khung).onclick = () => { ds = []; ghi(); ve(); };
      $('form', khung).onsubmit = x => { x.preventDefault(); const v = o.value; o.value = ''; hoi(v); };
      o.addEventListener('keydown', x => { if (x.key === 'Enter' && !x.shiftKey) { x.preventDefault(); $('form', khung).requestSubmit(); } });
      khung.addEventListener('keydown', x => { if (x.key === 'Escape') { mo(false); nut.focus(); } });
      UI.on(khung, 'click', '[data-gy]', b => hoi(b.dataset.gy));
      UI.on(khung, 'click', '[data-lk]', (b, x) => { x.preventDefault(); moLk(b.dataset.lk); if (window.innerWidth < 760) mo(false); });
    }
  };
})(App);
