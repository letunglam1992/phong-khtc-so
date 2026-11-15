/* ============================================================
   50b-view-canhan.js — "Việc của tôi": bảng điều hành riêng của từng cán bộ
   Gom nhiệm vụ, văn bản chủ trì; nội dung giải ngân; gói thầu, hợp đồng do cán bộ theo dõi.
   Đăng nhập bằng tài khoản cán bộ thì mặc định là cán bộ đó; quản lý chọn được cán bộ bất kỳ.
   Chỉ đọc dữ liệu, bấm từng dòng để mở và cập nhật.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const fs = v => U.fmtShort(v);
  const ten = (c, r) => (Sc.C[c] && Sc.C[c].title ? Sc.C[c].title(r) : r.ten || r.noiDung || r.id);
  const xepNV = (a, b) => (b.v.st === 'quahan') - (a.v.st === 'quahan') || (b.v.st === 'saphan') - (a.v.st === 'saphan') || String(a.r.han || '9999').localeCompare(String(b.r.han || '9999'));

  // Tính toàn bộ việc của một cán bộ (dùng cho trang và kiểm thử)
  L.viecCanBo = (cb, y) => {
    const viec = c => S.all(c).filter(r => r.chuTriId === cb && L.open(r)).map(r => ({ c, r, v: L.nv(r) })).sort(xepNV);
    const phoiHop = ['nhiemvu', 'vanban'].reduce((n, c) => n + S.all(c).filter(r => (r.phoiHopIds || []).includes(cb) && L.open(r)).length, 0);
    const nv = viec('nhiemvu'), vb = viec('vanban');
    const gnR = L.gnDong(y, { cb }), g = { tong: U.sum(gnR, x => x.tong), gn: U.sum(gnR, x => x.gn) };
    g.ty = U.pct(g.gn, g.tong); g.cham = gnR.filter(x => x.cham).sort((a, b) => b.con - a.con); g.qdTH = gnR.filter(x => x.qdTH && x.con > 0.5);
    g.chuaGN = gnR.filter(x => x.chuaGN && !x.cham && !x.qdTH); g.n = gnR.length;
    const dt = (L.dtViec ? L.dtViec({ cb, nam: y }) : []).filter(x => x.coll !== 'route' && x.coll !== 'hopdong');   // hợp đồng có thẻ riêng bên dưới
    const hd = S.all('hopdong').filter(h => h.canBoId === cb && !['thanhly', 'chamdut'].includes(h.trangThai)).map(h => ({ r: h, x: L.hd(h) }))
      .filter(o => o.x.over || o.x.near || o.x.chuaThanhLy || o.x.canhBao.length).sort((a, b) => (b.x.over - a.x.over) || (b.x.near - a.x.near));
    const nvQH = nv.concat(vb).filter(o => o.v.st === 'quahan').length, nvSH = nv.concat(vb).filter(o => o.v.st === 'saphan').length;
    return { nv, vb, phoiHop, g, dt, hd, nvQH, nvSH, canXuLy: nvQH + g.cham.length + dt.filter(x => x.sev >= 3).length + hd.filter(o => o.x.over).length };
  };

  A.views.canhan = {
    title: 'Việc của tôi', sub: 'Nhiệm vụ, văn bản chủ trì; giải ngân, gói thầu, hợp đồng do cán bộ theo dõi — sắp theo mức cần xử lý',
    render(root) {
      const y = A.year() || +U.today().slice(0, 4), u = A.MC && A.MC.nguoiDung ? A.MC.nguoiDung() : null;
      const cbs = S.all('canbo').sort((a, b) => String(a.hoTen || '').localeCompare(String(b.hoTen || ''), 'vi'));
      const T = A.vs.canhan || (A.vs.canhan = {}), khoa = !!(u && u.canBoId && u.vaiTro !== 'quanly');
      if (khoa) T.cb = u.canBoId; else if (!T.cb || !S.get('canbo', T.cb)) T.cb = (u && u.canBoId) || (cbs[0] || {}).id || '';
      if (!T.cb) { root.innerHTML = '<div class="card">' + UI.empty('Chưa có cán bộ', 'Thêm cán bộ ở mục "Cán bộ, phân công" rồi giao việc cho từng người.', '<button class="btn primary" data-kpi="route:canbo">' + ic('users', 16) + 'Mở danh sách cán bộ</button>') + '</div>'; $$('[data-kpi]', root).forEach(b => b.onclick = () => A.go('canbo')); return; }
      const cb = T.cb, k = L.viecCanBo(cb, y), g = k.g;
      const kpi = (cls, l, v, s, to) => '<div class="kpi ' + cls + (to ? '" data-to="' + to + '" tabindex="0"' : ' static"') + '><span class="k-l">' + l + '</span><span class="k-v">' + v + '</span><span class="k-s">' + (s || '') + '</span></div>';
      let h = '<div class="toolbar"><label class="small" for="ch_cb">Cán bộ</label><select class="inp" id="ch_cb" style="width:auto;min-width:220px"' + (khoa ? ' disabled title="Tài khoản cán bộ chỉ xem việc của mình"' : '') + '>' + cbs.map(c => '<option value="' + e(c.id) + '"' + (c.id === cb ? ' selected' : '') + '>' + e(c.hoTen || c.tenGoi || c.id) + '</option>').join('') + '</select><span class="small muted">Năm ' + y + '</span><span class="sp"></span>' +
        '<button class="btn" data-loc>' + ic('filter', 16) + 'Lọc trang Tài chính theo cán bộ này</button></div>';
      h += '<div class="kpis mb">' +
        kpi(k.canXuLy ? 'bad' : 'ok', 'Cần xử lý ngay', k.canXuLy, k.canXuLy ? 'Quá hạn, giải ngân chậm, cảnh báo mức cao' : 'Không có') +
        kpi(k.nvQH ? 'bad' : k.nvSH ? 'warn' : 'info', 'Nhiệm vụ, văn bản đang mở', k.nv.length + k.vb.length, (k.nvQH ? k.nvQH + ' quá hạn · ' : '') + (k.nvSH ? k.nvSH + ' sắp đến hạn · ' : '') + k.phoiHop + ' việc phối hợp', 'nv') +
        kpi(g.cham.length ? 'bad' : 'ok', 'Giải ngân theo dõi', g.tong ? U.fmtPct(g.ty) : '—', g.n + ' nội dung · ' + g.cham.length + ' chậm' + (g.qdTH.length ? ' · ' + g.qdTH.length + ' có QĐ thu hồi' : ''), 'gn') +
        kpi(k.dt.length ? 'warn' : 'ok', 'Đấu thầu cần xử lý', k.dt.length, 'Bước lựa chọn nhà thầu, nguồn kinh phí', 'dt') +
        kpi(k.hd.some(o => o.x.over) ? 'bad' : k.hd.length ? 'warn' : 'ok', 'Hợp đồng cần chú ý', k.hd.length, 'Quá hạn, sắp hết hạn, bảo lãnh, chưa thanh lý', 'hd') + '</div>';
      const the = (id, tieuDe, sub, noi, rong) => '<div class="card mb" id="ch-' + id + '"><div class="card-h"><h3>' + tieuDe + '</h3><div class="sub">' + sub + '</div></div><div class="card-b">' + (noi || '<div class="note ok">' + rong + '</div>') + '</div></div>';
      const bang = (cols, rows) => rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(c => '<th' + (c[1] ? ' class="' + c[1] + '"' : '') + '>' + c[0] + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' : '';
      const dongNV = o => '<tr class="click" data-c="' + o.c + '" data-id="' + e(o.r.id) + '" tabindex="0"><td class="wrap" style="min-width:260px">' + e(U.trunc(ten(o.c, o.r), 150)) + '</td><td class="small">' + (o.c === 'vanban' ? 'Văn bản' : 'Nhiệm vụ') + '</td><td class="nowrap">' + (o.r.han ? U.fmtDate(o.r.han) : '<span class="muted">—</span>') + '</td><td>' + UI.chip(o.v.st, o.v.label) + '</td></tr>';
      h += the('nv', 'Nhiệm vụ, văn bản chủ trì (' + (k.nv.length + k.vb.length) + ')', 'Chưa hoàn thành; quá hạn và sắp đến hạn lên đầu', bang([['Nội dung'], ['Loại'], ['Thời hạn'], ['Tình trạng']], k.nv.concat(k.vb).sort(xepNV).slice(0, 60).map(dongNV)), 'Không có nhiệm vụ, văn bản đang mở.');
      const dongGN = x => '<tr class="click" data-c="ngansach" data-id="' + e(x.r.id) + '" tabindex="0"><td class="wrap" style="min-width:260px">' + e(x.r.stt ? x.r.stt + ' ' : '') + e(U.trunc(x.r.noiDung, 130)) + (x.qdTH ? ' <span class="chip plain tamdung">Đã có QĐ thu hồi</span>' : '') + (x.r.tienDo ? '<div class="t2">' + e(U.trunc(x.r.tienDo, 110)) + '</div>' : '') + '</td><td class="small">' + e(Sc.refName('donvi', x.r.donViId)) + '</td><td class="num">' + fs(x.tong) + '</td><td class="num">' + fs(x.gn) + '</td><td class="num">' + fs(x.con) + '</td><td style="min-width:110px">' + UI.pbar(x.ty, x.cham ? 'bad' : '') + '</td></tr>';
      const gnRows = g.cham.concat(g.chuaGN);
      h += the('gn', 'Giải ngân dự toán năm ' + y + ' — chậm và chưa giải ngân (' + gnRows.length + ')', g.tong ? 'Đang theo dõi ' + g.n + ' nội dung, được sử dụng ' + fs(g.tong) + ', đã giải ngân ' + fs(g.gn) + ' (' + U.fmtPct(g.ty) + ')' + (g.qdTH.length ? '. ' + g.qdTH.length + ' nội dung đã có QĐ thu hồi, không tính chậm' : '') : 'Chưa được giao theo dõi nội dung dự toán nào',
        bang([['Nội dung'], ['Đơn vị'], ['Được sử dụng', 'num'], ['Đã giải ngân', 'num'], ['Còn lại', 'num'], ['Tỷ lệ']], gnRows.slice(0, 40).map(dongGN)), 'Không có nội dung giải ngân chậm.');
      h += the('dt', 'Đấu thầu, nguồn kinh phí cần xử lý (' + k.dt.length + ')', 'Gói thầu đến bước tiếp theo, quá hạn bước, nguồn kinh phí chưa khớp', k.dt.length ? k.dt.slice(0, 40).map(x => '<div class="issue s' + x.sev + '" data-c="' + e(x.coll) + '" data-id="' + e(x.id) + '" tabindex="0"><span class="lv"></span><span><span class="t">' + e(x.title) + '</span><span class="d">' + e(x.detail || '') + '</span></span></div>').join('') : '', 'Không có gói thầu cần xử lý.');
      h += the('hd', 'Hợp đồng cần chú ý (' + k.hd.length + ')', 'Quá thời hạn, sắp hết hạn, bảo lãnh sắp hết hiệu lực, đã nghiệm thu chưa thanh lý',
        bang([['Hợp đồng'], ['Thời hạn'], ['Còn phải thanh toán', 'num'], ['Ghi chú']], k.hd.slice(0, 40).map(o => '<tr class="click" data-c="hopdong" data-id="' + e(o.r.id) + '" tabindex="0"><td class="wrap" style="min-width:240px">' + e(U.trunc(ten('hopdong', o.r), 130)) + '</td><td class="nowrap">' + (o.x.han ? U.fmtDate(o.x.han) : '—') + '</td><td class="num">' + fs(o.x.conLai) + '</td><td class="small wrap">' + e([o.x.note].concat(o.x.canhBao.map(c => c.t)).filter(Boolean).join('; ')) + '</td></tr>')), 'Không có hợp đồng cần chú ý.');
      root.innerHTML = h;
      const sel = $('#ch_cb', root); if (sel) sel.onchange = () => { T.cb = sel.value; A.render(); };
      $('[data-loc]', root).onclick = () => { const v = A.vs.nsSel || (A.vs.nsSel = { dv: '', lv: 9, tab: 'tq' }); v.cb = cb; v.tab = 'tq'; A.go('ngansach'); };
      $$('[data-to]', root).forEach(b => { const di = () => { const t = $('#ch-' + b.dataset.to, root); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; b.onclick = di; b.onkeydown = x => { if (x.key === 'Enter') di(); }; });
      $$('[data-c][data-id]', root).forEach(tr => { const mo = () => { const c = tr.dataset.c; if (c === 'route') A.go(tr.dataset.id); else A.open(c, tr.dataset.id); }; tr.onclick = mo; tr.onkeydown = x => { if (x.key === 'Enter') mo(); }; });
    }
  };
})(App);
