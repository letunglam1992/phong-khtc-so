/* ============================================================
   60b-tim-vanban.js — Tìm trong nội dung văn bản đã đọc (Văn bản đến: đọc trên máy và hàng đợi trên Drive)
   Gõ cụm từ (không phân biệt dấu, hoa thường) → văn bản và đoạn chứa cụm từ. Ưu tiên khớp nguyên cụm,
   sau đó văn bản chứa đủ các từ. Nội dung lưu tối đa 8.000 ký tự đầu mỗi văn bản (giới hạn khi đọc).
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, UI = A.UI, e = U.esc, $ = UI.$;
  // Bỏ dấu từng ký tự, giữ nguyên độ dài để vị trí khớp trùng vị trí trong văn bản gốc
  const boDau = s => Array.from(String(s || '')).map(c => { const d = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return (d === 'đ' ? 'd' : d)[0] || ' '; }).join('');
  const nguon = () => {
    const srv = A.VBD && A.VBD.state && A.VBD.state.items ? A.VBD.state.items.map(x => Object.assign({ src: 'drive' }, x)) : [];
    return srv.concat(S.all('vbden')).filter(x => x.result && x.result.van_ban);
  };
  A.timVB = (q, max) => {
    const nq = boDau(q).replace(/\s+/g, ' ').trim(); if (nq.length < 2) return [];
    const ws = nq.split(' ').filter(w => w.length > 1), out = [];
    nguon().forEach(it => {
      const goc = String(it.result.van_ban).replace(/\s+/g, ' '), t = boDau(goc), vt = [];
      let i = t.indexOf(nq); while (i >= 0 && vt.length < 20) { vt.push([i, nq.length]); i = t.indexOf(nq, i + nq.length); }
      const cum = vt.length > 0;
      if (!cum) { if (!ws.length || !ws.every(w => t.includes(w))) return; ws.forEach(w => { const j = t.indexOf(w); if (j >= 0) vt.push([j, w.length]); }); vt.sort((a, b) => a[0] - b[0]); }
      // Gộp các vị trí gần nhau thành đoạn ~240 ký tự
      const doan = [];
      vt.forEach(([p, l]) => { const d = doan[doan.length - 1]; if (d && p - d.a < 200) { d.hl.push([p, l]); d.b = Math.max(d.b, p + l); } else doan.push({ a: p, b: p + l, hl: [[p, l]] }); });
      const html = doan.slice(0, 3).map(d => {
        const s0 = Math.max(0, d.a - 90), s1 = Math.min(goc.length, d.b + 120); let h = '', k = s0;
        d.hl.forEach(([p, l]) => { if (p < k) return; h += e(goc.slice(k, p)) + '<mark>' + e(goc.slice(p, p + l)) + '</mark>'; k = p + l; });
        return (s0 > 0 ? '…' : '') + h + e(goc.slice(k, s1)) + (s1 < goc.length ? '…' : '');
      });
      out.push({ it, ten: it.name || (it.result.so_van_ban || 'Văn bản'), sub: [it.result.so_van_ban, it.result.ngay_van_ban ? U.fmtDate(it.result.ngay_van_ban) : '', U.trunc(it.result.trich_yeu || '', 80)].filter(Boolean).join(' · '), doan: html, n: vt.length, cum });
    });
    return out.sort((a, b) => b.cum - a.cum || b.n - a.n).slice(0, max || 20);
  };
  // Xem toàn văn (phần đã lưu) với cụm từ được tô sáng
  A.vbXemNoiDung = (it, q) => {
    const r = A.timVB(q, 999).find(x => x.it === it || x.it.id === it.id), goc = String(it.result.van_ban), t = boDau(goc), nq = boDau(q).replace(/\s+/g, ' ').trim();
    let h = '', k = 0;
    if (nq.length >= 2) { let i = t.indexOf(nq); while (i >= 0) { h += e(goc.slice(k, i)) + '<mark>' + e(goc.slice(i, i + nq.length)) + '</mark>'; k = i + nq.length; i = t.indexOf(nq, k); } }
    h += e(goc.slice(k));
    const m = UI.modal({
      title: it.name || 'Văn bản', sub: (r ? r.n + ' chỗ khớp' : '') + (it.result.van_ban_cat ? ' · chỉ lưu 8.000 ký tự đầu của văn bản' : ''), size: 'lg',
      body: '<div class="vb-toanvan">' + h + '</div>',
      buttons: [{ label: 'Đóng', on: a => a.close() }, 'sp'].concat(A.VBD && A.VBD.review ? [{ label: it.status === 'cho_duyet' ? 'Xem và cập nhật' : 'Xem thông tin đã trích', cls: 'primary', on: a => { a.close(true); A.VBD.review(it); } }] : [])
    });
    const mk = $('mark', m.body); if (mk) setTimeout(() => mk.scrollIntoView({ block: 'center' }), 50);
  };
  const st = document.createElement('style');
  st.textContent = '.vb-toanvan{white-space:pre-wrap;font-size:14px;line-height:1.55;max-height:65vh;overflow:auto;background:var(--hover);padding:14px;border-radius:var(--r-md)}mark{background:#ffe08a;color:inherit;border-radius:2px;padding:0 1px}.cmd-i .cmd-doan{display:block;font-size:12.5px;color:var(--muted);margin-top:3px;white-space:normal;line-height:1.45}';
  document.head.appendChild(st);
})(App);
