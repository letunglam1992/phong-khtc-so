/* ============================================================
   52-view-nhiemvu.js — Chức năng nhiệm vụ · Nhiệm vụ, công việc · Văn bản · Cán bộ, phân công
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  A.openers = A.openers || {};
  const cbOpts = () => [['__none', 'Chưa phân công']].concat(S.all('canbo').filter(c => c.trangThai !== 'nghi').map(c => [c.id, c.hoTen]));
  const cbTest = (r, v, k) => v === '__none' ? !r[k || 'chuTriId'] : (r[k || 'chuTriId'] === v || (r.phoiHopIds || []).includes(v));
  const nhomOpts = () => A.NHOM.map(n => [n[0], (n[0] === '0' ? '' : n[0] + '. ') + n[2]]);

  /* ---------- Khai báo bố cục form ---------- */
  Sc.C.danhmuc.sections = [
    { t: 'Nhiệm vụ', keys: ['ma', 'nhom', 'ten', 'loai', 'canCu', 'vaiTroText', 'noiDung', 'sanPham'] },
    { t: 'Chu kỳ thực hiện', keys: ['tinhChat', 'kyNguon', 'ky'] },
    { t: 'Phân công', keys: ['chuTriId', 'goiY', 'phoiHopIds'] },
    { t: 'Khác', keys: ['ghiChu', 'dinhKem'] }];
  Sc.C.nhiemvu.sections = [
    { t: 'Nội dung', keys: ['ten', 'ma', 'nguon', 'dmId', 'nhom', 'canCu', 'sanPham', 'noiDung'] },
    { t: 'Phân công và thời hạn', keys: ['vaiTro', 'chuTriId', 'phoiHopIds', 'loaiTG', 'kyNhan', 'ngayGiao', 'han', 'nam', 'uuTien'] },
    { t: 'Tình hình thực hiện', keys: ['trangThai', 'tienDo', 'ngayHT', 'ketQua', 'nguyenNhanCham', 'xinYKien', 'ndXinYKien'] },
    { t: 'Liên kết và tài liệu', keys: ['vanBanIds', 'duAnIds', 'dinhKem', 'ghiChu'] }];
  Sc.C.vanban.sections = [
    { t: 'Văn bản', keys: ['soKyHieu', 'ngayBanHanh', 'coQuan', 'nguon', 'trichYeu', 'noiDungChiDao', 'dinhKem'] },
    { t: 'Giao việc', keys: ['vaiTro', 'han', 'chuTriId', 'phoiHopIds'] },
    { t: 'Kết quả', keys: ['trangThai', 'ngayHT', 'ketQua', 'duAnIds', 'ghiChu'] }];

  /* ================= CHỨC NĂNG, NHIỆM VỤ ================= */
  const kyText = d => d.tinhChat === 'dinhky' ? ('Định kỳ' + ((d.ky || []).length ? ': ' + Sc.text(Sc.field('danhmuc', 'ky'), d.ky).toLowerCase() : ' (chưa nêu kỳ)')) : A.optLabel('tinhChatDM', d.tinhChat);
  function genDialog(dms) {
    const y0 = A.year() || +U.today().slice(0, 4);
    const kys = A.OPT.kyDM.filter(k => dms.some(d => (d.ky || []).includes(k[0])) || dms.length === 1);
    const m = UI.modal({
      title: 'Sinh nhiệm vụ theo kỳ', sub: dms.length === 1 ? dms[0].ma + ' — ' + U.trunc(dms[0].ten, 90) : dms.length + ' đầu mục chức năng định kỳ', size: 'lg',
      body: '<p class="soft">Mỗi kỳ tạo một nhiệm vụ cụ thể, gắn với đầu mục chức năng và cán bộ chủ trì hiện tại. Thời hạn do anh/chị đặt — văn bản quy định chức năng không nêu ngày cụ thể, phần mềm không tự gán. Bỏ trống ngày thì nhiệm vụ được tạo không có hạn.</p>' +
        '<div class="form"><div class="fld"><label for="gy">Năm</label><input class="inp" id="gy" type="number" min="2000" max="2100" value="' + y0 + '"></div><div class="fld"></div>' +
        '<div class="fld full"><div class="rows"><table><thead><tr><th>Loại kỳ</th><th>Tạo</th><th>Hạn: ngày</th><th>của tháng</th></tr></thead><tbody>' + kys.map(k => '<tr><td>' + e(k[1]) + '</td><td><input type="checkbox" data-gk="' + k[0] + '"' + (dms.length === 1 ? ((dms[0].ky || []).includes(k[0]) ? ' checked' : '') : ' checked') + ' aria-label="Tạo kỳ ' + e(k[1]) + '"></td><td><input class="inp" style="width:90px" type="number" min="1" max="31" data-gd="' + k[0] + '" placeholder="trống" aria-label="Ngày hạn"></td><td><select class="sel" data-gm="' + k[0] + '" aria-label="Tháng tính hạn"><option value="0">cuối kỳ</option><option value="1">kế tiếp sau kỳ</option></select></td></tr>').join('') + '</tbody></table></div></div>' +
        '<div class="fld full" data-prev></div></div>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, { label: 'Xem trước', on: () => preview() }, { label: 'Tạo nhiệm vụ', cls: 'primary', icon: 'check', on: () => commit() }]
    });
    const build = () => {
      const y = +$('#gy', m.body).value, types = kys.map(k => k[0]).filter(k => $('[data-gk="' + k + '"]', m.body).checked), rules = {};
      kys.forEach(k => { rules[k[0]] = { ngay: $('[data-gd="' + k[0] + '"]', m.body).value, lechThang: $('[data-gm="' + k[0] + '"]', m.body).value }; });
      if (!(y >= 2000 && y <= 2100)) { UI.toast('Năm không hợp lệ.', 'bad'); return null; }
      let all = [];
      dms.forEach(d => { all = all.concat(L.genKy(d, y, dms.length === 1 ? types : types.filter(t => (d.ky || []).includes(t)), rules)); });
      return all;
    };
    const preview = () => {
      const all = build(); if (!all) return null;
      const neu = all.filter(x => !x.dup);
      $('[data-prev]', m.body).innerHTML = '<div class="note">Sẽ tạo <b>' + neu.length + '</b> nhiệm vụ mới' + (all.length - neu.length ? '; bỏ qua ' + (all.length - neu.length) + ' kỳ đã tạo trước đó' : '') + '.' + (neu.length ? '<ul style="margin:6px 0 0;padding-left:18px">' + neu.slice(0, 8).map(x => '<li>' + e(U.trunc(x.rec.ten, 110)) + ' — ' + (x.rec.han ? 'hạn ' + U.fmtDate(x.rec.han) : 'không hạn') + '</li>').join('') + (neu.length > 8 ? '<li>… và ' + (neu.length - 8) + ' nhiệm vụ khác</li>' : '') + '</ul>' : '') + '</div>';
      return neu;
    };
    const commit = async () => {
      const neu = preview(); if (!neu || !neu.length) { UI.toast('Không có kỳ mới nào để tạo.', 'bad'); return; }
      try {
        let seq = 0; const base = Sc.nextMa('nhiemvu');
        const y = +$('#gy', m.body).value;
        await S.saveMany(neu.map(x => ({ c: 'nhiemvu', rec: Object.assign(x.rec, { ma: base.replace(/-(\d{4})-(\d+)$/, (_, yy, d) => '-' + y + '-' + String(+d + seq++).padStart(3, '0')) }) })), { note: 'Sinh ' + neu.length + ' nhiệm vụ theo kỳ năm ' + y });
        m.close(); UI.toast('Đã tạo ' + neu.length + ' nhiệm vụ theo kỳ.', 'ok');
      } catch (er) { UI.fail(er); }
    };
  }
  A.openers.danhmuc = id => UI.detail({
    coll: 'danhmuc', id,
    head: d => '<div class="gap mb">' + UI.chip(d.chuTriId ? 'hoanthanh' : 'saphan', d.chuTriId ? 'Đã phân công' : 'Chưa phân công') + '<span class="tag">' + e(A.nhomTen(d.nhom, true)) + '</span><span class="tag">' + e(kyText(d)) + '</span>' + (d.kyNguon !== 'vanban' ? '<span class="chip plain">Chu kỳ do phần mềm phân loại — cần rà soát</span>' : '') + (d.loai === 'noibo' ? '<span class="chip plain tamdung">Việc nội bộ, ngoài QĐ 324</span>' : '') + '</div>',
    extraTabs: [{
      t: 'Nhiệm vụ đã tạo', html: d => { const l = S.all('nhiemvu').filter(t => t.dmId === d.id).sort((a, b) => U.cmp(b.han, a.han)); return l.length ? '<table class="tbl"><thead><tr><th>Nhiệm vụ</th><th>Hạn</th><th>Chủ trì</th><th>Tình trạng</th></tr></thead><tbody>' + l.map(t => { const v = L.nv(t); return '<tr class="click" data-open="nhiemvu:' + t.id + '"><td class="wrap">' + e(t.ten) + '</td><td class="nowrap">' + U.fmtDate(t.han) + '</td><td>' + UI.who(t.chuTriId) + '</td><td>' + UI.chip(v.st, v.label) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="note">Chưa có nhiệm vụ cụ thể nào gắn với đầu mục này.</div>'; }
    }],
    actions: [
      { label: 'Sinh theo kỳ', icon: 'calendar', on: (d, a) => { a.close(true); genDialog([d]); } },
      { label: 'Tạo nhiệm vụ', icon: 'plus', on: (d, a) => { a.close(true); UI.form({ coll: 'nhiemvu', rec: { dmId: d.id, nhom: d.nhom, canCu: d.canCu, sanPham: d.sanPham, chuTriId: d.chuTriId, phoiHopIds: (d.phoiHopIds || []).slice(), nguon: 'Chức năng, nhiệm vụ của Phòng', loaiTG: d.tinhChat === 'thuongxuyen' ? 'thuongxuyen' : d.tinhChat === 'dinhky' ? 'dinhky' : 'phatsinh', ten: d.ten }, title: 'Tạo nhiệm vụ từ chức năng ' + d.ma }); } }]
  });
  A.views.chucnang = {
    title: 'Chức năng, nhiệm vụ của Phòng', sub: 'Danh mục nền tảng — bóc tách từ Điều 2 Quyết định 324/QĐ-SNNMT ngày 02/4/2025',
    render(root, p) {
      const all = S.all('danhmuc'), ct = all.filter(d => d.loai !== 'noibo'), y = A.year() || +U.today().slice(0, 4);
      const cnt = new Map(); S.all('nhiemvu').filter(t => +t.nam === y && t.dmId).forEach(t => { const c = cnt.get(t.dmId) || { n: 0, mo: 0 }; c.n++; if (L.open(t)) c.mo++; cnt.set(t.dmId, c); });
      const top = '<div class="kpis mb"><div class="kpi acc static"><span class="k-l">Đầu mục chính thức</span><span class="k-v">' + ct.length + '</span><span class="k-s">10 nhóm chức năng theo Điều 2</span></div><div class="kpi ok static"><span class="k-l">Đã có cán bộ chủ trì</span><span class="k-v">' + ct.filter(d => d.chuTriId).length + '</span><span class="k-s">&nbsp;</span></div><div class="kpi warn static"><span class="k-l">Chưa phân công</span><span class="k-v">' + ct.filter(d => !d.chuTriId).length + '</span><span class="k-s">Phân công ngay tại cột "Chủ trì"</span></div><div class="kpi info static"><span class="k-l">Định kỳ</span><span class="k-v">' + ct.filter(d => d.tinhChat === 'dinhky').length + '</span><span class="k-s">' + ct.filter(d => d.tinhChat === 'dinhky' && !cnt.has(d.id)).length + ' chưa có nhiệm vụ năm ' + y + '</span></div><div class="kpi violet static"><span class="k-l">Việc nội bộ bổ sung</span><span class="k-v">' + (all.length - ct.length) + '</span><span class="k-s">Ngoài QĐ 324, tách riêng</span></div></div>' +
        '<div class="note mb">Mã có hậu tố a, b, c là việc thành phần do phần mềm tách từ một điểm của Quyết định; căn cứ vẫn ghi điểm gốc. Cột "Tham khảo" lấy từ Thông báo 279/TB-KHTC, không phải phân công chính thức.</div>';
      const cbs = S.all('canbo').filter(c => c.trangThai !== 'nghi');
      UI.listView(root, {
        key: 'chucnang', coll: 'danhmuc', top, preset: p && p.preset, rows: () => S.all('danhmuc'), addLabel: 'Thêm đầu mục',
        formOpts: { rec: { loai: 'noibo', nhom: '0', kyNguon: 'phanloai' }, sub: 'Đầu mục tự thêm mặc định là việc hỗ trợ nội bộ, tách khỏi nhiệm vụ chính thức theo QĐ 324.' },
        filters: [
          { k: 'nhom', label: 'Nhóm', opts: nhomOpts, test: (r, v) => String(r.nhom) === v },
          { k: 'tc', label: 'Tính chất', opts: () => A.OPT.tinhChatDM, test: (r, v) => r.tinhChat === v },
          { k: 'cb', label: 'Chủ trì', opts: cbOpts, test: (r, v) => cbTest(r, v) },
          { k: 'loai', label: 'Phân loại', opts: () => A.OPT.loaiDM, test: (r, v) => (r.loai || 'chinhthuc') === v }],
        extra: ['<button class="btn" data-genall>' + ic('calendar', 16) + 'Sinh nhiệm vụ định kỳ</button>'],
        render(body, rows) {
          rows = rows.slice().sort((a, b) => (U.num(a.nhom === '0' ? 99 : a.nhom) - U.num(b.nhom === '0' ? 99 : b.nhom)) || (U.num(a.thuTu) - U.num(b.thuTu)) || U.cmp(a.ma, b.ma));
          let h = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mã</th><th>Nhiệm vụ</th><th>Chu kỳ</th><th>Chủ trì</th><th>Tham khảo</th><th class="num">Nhiệm vụ ' + y + '</th><th></th></tr></thead><tbody>', cur = null;
          rows.forEach(d => {
            if (d.nhom !== cur) { cur = d.nhom; const n = rows.filter(x => x.nhom === cur); h += '<tr class="grp"><td colspan="7">' + (cur === '0' ? '' : e(cur) + '. ') + e(A.nhomTen(cur)) + ' <span class="muted small" style="font-weight:500">— ' + n.length + ' đầu mục, ' + n.filter(x => !x.chuTriId).length + ' chưa phân công</span></td></tr>'; }
            const c = cnt.get(d.id);
            h += '<tr class="click" data-id="' + d.id + '" tabindex="0"><td class="nowrap"><b>' + e(d.ma) + '</b></td><td class="wrap"><div>' + e(d.ten) + '</div><div class="t2">' + e(d.vaiTroText || '') + (d.ghiChu ? ' · <span style="color:var(--warn-fg)">Có ghi chú cần rà soát</span>' : '') + '</div></td><td><span class="small">' + e(kyText(d)) + '</span>' + (d.kyNguon !== 'vanban' ? '<div class="t2">cần rà soát</div>' : '') + '</td>' +
              '<td><select class="sel" data-assign="' + d.id + '" style="height:32px;min-width:150px;' + (d.chuTriId ? '' : 'border-color:var(--warn);background:var(--warn-bg)') + '" aria-label="Cán bộ chủ trì ' + e(d.ma) + '"><option value="">— Chưa phân công —</option>' + cbs.map(cb => '<option value="' + cb.id + '"' + (cb.id === d.chuTriId ? ' selected' : '') + '>' + e(cb.hoTen) + '</option>').join('') + '</select>' + ((d.phoiHopIds || []).length ? '<div class="t2">Phối hợp: ' + e(Sc.text(Sc.field('danhmuc', 'phoiHopIds'), d.phoiHopIds)) + '</div>' : '') + '</td>' +
              '<td class="small muted">' + e(d.goiY || '') + '</td><td class="num">' + (c ? c.mo + ' mở / ' + c.n : '<span class="muted">—</span>') + '</td><td class="acts"><button class="btn icon" data-mk="' + d.id + '" title="Tạo nhiệm vụ cụ thể" aria-label="Tạo nhiệm vụ từ ' + e(d.ma) + '">' + ic('plus', 16) + '</button></td></tr>';
          });
          body.innerHTML = h + '</tbody></table></div><div class="pager"><span>' + rows.length + ' đầu mục</span></div>';
          $$('tr[data-id]', body).forEach(tr => { const go = x => { if (x.target.closest('select,button')) return; A.open('danhmuc', tr.dataset.id); }; tr.onclick = go; tr.onkeydown = x => { if (x.key === 'Enter') go(x); }; });
          $$('[data-assign]', body).forEach(s => s.onchange = async () => { try { await S.save('danhmuc', { id: s.dataset.assign, chuTriId: s.value }); UI.toast(s.value ? 'Đã phân công ' + Sc.refName('canbo', s.value) + '.' : 'Đã bỏ phân công.', 'ok'); } catch (er) { UI.fail(er); } });
          $$('[data-mk]', body).forEach(b => b.onclick = () => { const d = S.get('danhmuc', b.dataset.mk); UI.form({ coll: 'nhiemvu', rec: { dmId: d.id, nhom: d.nhom, canCu: d.canCu, sanPham: d.sanPham, chuTriId: d.chuTriId, phoiHopIds: (d.phoiHopIds || []).slice(), nguon: 'Chức năng, nhiệm vụ của Phòng', ten: d.ten, loaiTG: d.tinhChat === 'thuongxuyen' ? 'thuongxuyen' : d.tinhChat === 'dinhky' ? 'dinhky' : 'phatsinh' }, title: 'Tạo nhiệm vụ từ chức năng ' + d.ma }); });
        }
      });
      $('[data-genall]', root).onclick = () => { const dms = S.all('danhmuc').filter(d => d.tinhChat === 'dinhky' && (d.ky || []).length); if (!dms.length) { UI.toast('Chưa có đầu mục định kỳ nào có khai báo kỳ.', 'bad'); return; } genDialog(dms); };
    }
  };

  /* ================= NHIỆM VỤ, CÔNG VIỆC ================= */
  const TT_FILTER = [['mo', 'Đang mở (chưa hoàn thành)'], ['quahan', 'Quá hạn'], ['saphan', 'Sắp đến hạn'], ['dang', 'Đang thực hiện'], ['chua', 'Chưa triển khai'], ['hoanthanh', 'Đã hoàn thành'], ['trehan', 'Hoàn thành trễ hạn'], ['tamdung', 'Tạm dừng'], ['khonghan', 'Không có thời hạn'], ['tondong', 'Tồn đọng kéo dài'], ['xinykien', 'Cần xin ý kiến']];
  const ttTest = (t, v) => {
    const x = L.nv(t);
    switch (v) {
      case 'mo': return L.open(t) && t.trangThai !== 'tamdung';
      case 'quahan': case 'saphan': return x.st === v;
      case 'dang': return t.trangThai === 'dang'; case 'chua': return (t.trangThai || 'chua') === 'chua';
      case 'hoanthanh': return t.trangThai === 'hoanthanh'; case 'trehan': return x.st === 'hoanthanh' && x.treHan;
      case 'tamdung': return t.trangThai === 'tamdung'; case 'khonghan': return !t.han && L.open(t);
      case 'tondong': return !!L.tonDong(t); case 'xinykien': return !!t.xinYKien && L.open(t);
    } return true;
  };
  function progressDialog(t, after) {
    const m = UI.modal({
      title: 'Cập nhật tiến độ', sub: U.trunc(t.ten, 120),
      body: '<div class="form"><div class="fld"><label for="pg_tt">Tình trạng</label><select class="sel" id="pg_tt">' + A.OPT.ttNV.map(o => '<option value="' + o[0] + '"' + (o[0] === (t.trangThai || 'chua') ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div><div class="fld"><label for="pg_td">Tiến độ (%)</label><input class="inp" id="pg_td" type="number" min="0" max="100" value="' + U.num(t.tienDo) + '"></div>' +
        '<div class="fld"><label for="pg_ht">Ngày hoàn thành</label><input class="inp" id="pg_ht" type="date" value="' + e(t.ngayHT || '') + '" max="' + U.today() + '"><div class="help">Chỉ dùng khi tình trạng là "Đã hoàn thành"; để trống là hôm nay.</div></div><div class="fld"></div>' +
        '<div class="fld full"><label for="pg_kq">Kết quả thực hiện</label><textarea class="inp" id="pg_kq" rows="3">' + e(t.ketQua || '') + '</textarea></div>' +
        '<div class="fld full"><label for="pg_nn">Nguyên nhân chậm, khó khăn (nếu có)</label><textarea class="inp" id="pg_nn" rows="2">' + e(t.nguyenNhanCham || '') + '</textarea></div>' +
        '<div class="fld full"><label class="check"><input type="checkbox" id="pg_yk"' + (t.xinYKien ? ' checked' : '') + '> Cần xin ý kiến, quyết định của lãnh đạo</label><textarea class="inp" id="pg_ykn" rows="2" placeholder="Nội dung xin ý kiến" aria-label="Nội dung xin ý kiến">' + e(t.ndXinYKien || '') + '</textarea></div></div>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, {
        label: 'Lưu tiến độ', cls: 'primary', icon: 'check', on: async a => {
          const r = Object.assign({}, t, { trangThai: $('#pg_tt', a.body).value, tienDo: Math.max(0, Math.min(100, +$('#pg_td', a.body).value || 0)), ngayHT: $('#pg_ht', a.body).value, ketQua: $('#pg_kq', a.body).value.trim(), nguyenNhanCham: $('#pg_nn', a.body).value.trim(), xinYKien: $('#pg_yk', a.body).checked, ndXinYKien: $('#pg_ykn', a.body).value.trim() });
          Sc.C.nhiemvu.normalize(r); const chk = Sc.check('nhiemvu', r);
          if (chk.errors.length) { UI.toast(chk.errors[0], 'bad'); return; }
          if (L.nv(t).st === 'quahan' && r.trangThai !== 'hoanthanh' && !r.nguyenNhanCham) { if (!await UI.confirm({ title: 'Nhiệm vụ đang quá hạn', msg: 'Chưa ghi nguyên nhân chậm. Nên ghi để phục vụ báo cáo. Vẫn lưu?', ok: 'Vẫn lưu', cancel: 'Quay lại ghi' })) return; }
          try { await S.save('nhiemvu', r); a.close(); UI.toast('Đã cập nhật tiến độ.', 'ok'); if (after) after(); } catch (er) { UI.fail(er); }
        }
      }]
    });
  }
  A.progressDialog = progressDialog;
  A.openers.nhiemvu = id => UI.detail({
    coll: 'nhiemvu', id,
    head: t => { const v = L.nv(t), td = L.tonDong(t), nc = L.nguyCo(t); return '<div class="gap mb">' + UI.chip(v.st, v.label) + (t.uuTien === 'cao' ? '<span class="chip plain quahan">Ưu tiên cao</span>' : '') + (t.xinYKien ? '<span class="chip plain saphan">Cần xin ý kiến lãnh đạo</span>' : '') + (td ? '<span class="chip plain quahan">Tồn đọng kéo dài</span>' : '') + (nc ? '<span class="chip plain saphan">Nguy cơ không hoàn thành</span>' : '') + '<span class="grow"></span><div style="width:200px">' + UI.pbar(t.tienDo, v.st === 'quahan' ? 'bad' : '') + '</div></div>' + (v.st === 'quahan' && !t.nguyenNhanCham ? '<div class="note warn mb">Nhiệm vụ quá hạn nhưng chưa ghi nguyên nhân chậm. Dùng "Cập nhật tiến độ" để bổ sung.</div>' : ''); },
    actions: [
      { label: 'Nhân bản', icon: 'copy', on: (t, a) => { a.close(true); const c = U.clone(t); ['id', 'ma', 'createdAt', 'updatedAt', 'ngayHT', 'ketQua', 'kyKey', 'dinhKem'].forEach(k => delete c[k]); c.trangThai = 'chua'; c.tienDo = 0; UI.form({ coll: 'nhiemvu', rec: c, title: 'Nhân bản nhiệm vụ' }); } },
      { label: 'Cập nhật tiến độ', icon: 'clock', on: (t, a, reopen) => progressDialog(t, reopen) }]
  });
  A.views.nhiemvu = {
    title: 'Nhiệm vụ, công việc', sub: 'Nhiệm vụ cụ thể phát sinh từ chức năng của Phòng, văn bản giao, kết luận cuộc họp và việc được giao trực tiếp',
    render(root, p) {
      const V = A.vs.nvMode || (A.vs.nvMode = { m: 'bang', month: U.today().slice(0, 7) });
      const y = A.year();
      const lv = UI.listView(root, {
        key: 'nhiemvu', coll: 'nhiemvu', preset: p && p.preset, rows: () => L.nvOfYear(y),
        empty: { t: 'Chưa có nhiệm vụ nào' + (y ? ' trong năm ' + y : ''), p: 'Thêm nhiệm vụ mới, tạo từ đầu mục chức năng (trang Chức năng, nhiệm vụ) hoặc từ văn bản giao (trang Văn bản).' },
        searchText: t => [t.ma, t.ten, t.noiDung, t.canCu, t.sanPham, t.ketQua, t.kyNhan, t.ghiChu, Sc.refName('canbo', t.chuTriId)].join(' '),
        filters: [
          { k: 'tt', label: 'Tình trạng', opts: () => TT_FILTER, test: ttTest },
          { k: 'nhom', label: 'Lĩnh vực', opts: nhomOpts, test: (r, v) => String(r.nhom) === v },
          { k: 'cb', label: 'Cán bộ', opts: cbOpts, test: (r, v) => cbTest(r, v) },
          { k: 'tg', label: 'Chu kỳ', opts: () => A.OPT.loaiTG, test: (r, v) => r.loaiTG === v },
          { k: 'ng', label: 'Nguồn giao', opts: () => A.list('nguonNV').map(x => [x, x]), test: (r, v) => r.nguon === v },
          { k: 'src', label: 'Nguồn dữ liệu', opts: () => [['local', 'Nhập tại phần mềm này'], ['tdnv', 'Từ Điều hành nhiệm vụ'], ['dadt', 'Từ Dự án đầu tư']], test: (r, v) => v === 'local' ? !r.ext : !!(r.ext && r.ext.src.indexOf(v) === 0) }],
        extra: ['<div class="seg" role="tablist" aria-label="Kiểu hiển thị">' + [['bang', 'Bảng', 'table'], ['kanban', 'Kanban', 'board'], ['lich', 'Lịch', 'calendar']].map(s => '<button data-mode="' + s[0] + '" class="' + (V.m === s[0] ? 'on' : '') + '">' + ic(s[2], 14) + s[1] + '</button>').join('') + '</div>'],
        sort: { k: 'han', dir: 1 },
        cols: [
          { k: 'ma', label: 'Mã', cls: 'nowrap', html: t => '<span class="muted small">' + e(t.ma || '') + '</span>' },
          { k: 'ten', label: 'Nhiệm vụ', cls: 'wrap', html: t => '<div class="t1">' + e(t.ten) + (t.uuTien === 'cao' ? ' <span class="chip plain quahan">Ưu tiên</span>' : '') + '</div><div class="t2">' + e([A.nhomTen(t.nhom, true), t.nguon, y && +t.nam < y ? 'tồn từ năm ' + t.nam : ''].filter(Boolean).join(' · ')) + '</div>' },
          { k: 'chuTriId', label: 'Chủ trì', val: t => Sc.refName('canbo', t.chuTriId), html: t => UI.who(t.chuTriId) + ((t.phoiHopIds || []).length ? '<div class="t2">+' + t.phoiHopIds.length + ' phối hợp</div>' : '') },
          { k: 'han', label: 'Thời hạn', cls: 'nowrap', html: t => t.han ? U.fmtDate(t.han) : '<span class="muted">Không hạn</span>' },
          { k: 'tienDo', label: 'Tiến độ', val: t => U.num(t.tienDo), html: t => '<div style="min-width:110px">' + UI.pbar(t.tienDo, L.nv(t).st === 'quahan' ? 'bad' : '') + '</div>' },
          { k: 'trangThai', label: 'Tình trạng', val: t => ({ quahan: 0, saphan: 1, dang: 2, chua: 3, tamdung: 4, hoanthanh: 5 }[L.nv(t).st]), html: t => { const v = L.nv(t); return UI.chip(v.st, v.label); } },
          { k: '_a', label: '', noSort: true, cls: 'acts', html: t => (L.open(t) ? '<button class="btn icon" data-done="' + t.id + '" title="Đánh dấu hoàn thành" aria-label="Đánh dấu hoàn thành">' + ic('check', 16) + '</button>' : '') + '<button class="btn icon" data-pg="' + t.id + '" title="Cập nhật tiến độ" aria-label="Cập nhật tiến độ">' + ic('clock', 16) + '</button>' }],
        onRow: t => A.open('nhiemvu', t.id),
        render(body, rows) {
          if (V.m === 'kanban') return kanban(body, rows);
          if (V.m === 'lich') return lich(body, rows, V);
          UI.table(body, { cols: this.cols, rows, onRow: this.onRow, sort: this.sort, state: A.vs.nhiemvu.tbl, after: bx => { $$('[data-done]', bx).forEach(b => b.onclick = () => done(b.dataset.done)); $$('[data-pg]', bx).forEach(b => b.onclick = () => progressDialog(S.get('nhiemvu', b.dataset.pg))); } });
        }
      });
      $$('[data-mode]', root).forEach(b => b.onclick = () => { V.m = b.dataset.mode; $$('[data-mode]', root).forEach(x => x.classList.toggle('on', x === b)); lv.draw(); });
      async function done(id) {
        const t = S.get('nhiemvu', id); if (!t) return;
        const prev = { trangThai: t.trangThai, tienDo: t.tienDo, ngayHT: t.ngayHT };
        const r = Object.assign({}, t, { trangThai: 'hoanthanh' }); Sc.C.nhiemvu.normalize(r);
        try { await S.save('nhiemvu', r); UI.toast('Đã đánh dấu hoàn thành ngày ' + U.fmtDate(r.ngayHT) + '.', 'ok', { label: 'Hoàn tác', fn: () => S.save('nhiemvu', Object.assign({}, S.get('nhiemvu', id), prev, { ngayHT: prev.ngayHT || '' })) }); } catch (er) { UI.fail(er); }
      }
      function kanban(body, rows) {
        const cols = [['chua', 'Chưa triển khai'], ['dang', 'Đang thực hiện'], ['hoanthanh', 'Đã hoàn thành'], ['tamdung', 'Tạm dừng']];
        body.innerHTML = '<div class="small muted mb">Kéo thẻ sang cột khác để đổi tình trạng. Bấm vào thẻ để xem chi tiết.</div><div class="kanban">' + cols.map(c => { const l = rows.filter(t => (t.trangThai || 'chua') === c[0]).sort((a, b) => U.cmp(a.han, b.han)); return '<div class="kcol" data-col="' + c[0] + '"><h4>' + c[1] + '<span class="chip plain">' + l.length + '</span></h4>' + l.slice(0, 60).map(t => { const v = L.nv(t); return '<div class="kcard" draggable="true" data-id="' + t.id + '" tabindex="0"><div class="kt">' + e(t.ten) + '</div><div class="km">' + UI.chip(v.st, v.label) + '<span>' + (t.han ? U.fmtDate(t.han) : 'Không hạn') + '</span><span>· ' + e(Sc.refName('canbo', t.chuTriId) || 'Chưa phân công') + '</span></div></div>'; }).join('') + (l.length > 60 ? '<div class="small muted">… còn ' + (l.length - 60) + ' thẻ, dùng bộ lọc để thu hẹp</div>' : '') + '</div>'; }).join('') + '</div>';
        $$('.kcard', body).forEach(k => { k.ondragstart = x => x.dataTransfer.setData('text/plain', k.dataset.id); k.onclick = () => A.open('nhiemvu', k.dataset.id); k.onkeydown = x => { if (x.key === 'Enter') A.open('nhiemvu', k.dataset.id); }; });
        $$('.kcol', body).forEach(c => {
          c.ondragover = x => { x.preventDefault(); c.classList.add('over'); }; c.ondragleave = () => c.classList.remove('over');
          c.ondrop = async x => { x.preventDefault(); c.classList.remove('over'); const t = S.get('nhiemvu', x.dataTransfer.getData('text/plain')); if (!t || (t.trangThai || 'chua') === c.dataset.col) return; const r = Object.assign({}, t, { trangThai: c.dataset.col }); Sc.C.nhiemvu.normalize(r); try { await S.save('nhiemvu', r); } catch (er) { UI.fail(er); } };
        });
      }
      function lich(body, rows, V) {
        const yy = +V.month.slice(0, 4), mm = +V.month.slice(5, 7), first = V.month + '-01', today = U.today();
        const start = U.weekRange(first)[0], by = U.groupBy(rows.filter(t => U.isISO(t.han)), t => t.han);
        let cells = '';
        for (let i = 0; i < 42; i++) { const d = U.addDays(start, i); if (i >= 35 && d.slice(0, 7) !== V.month) break; const l = by.get(d) || []; cells += '<div class="dc' + (d.slice(0, 7) !== V.month ? ' out' : '') + (d === today ? ' today' : '') + '"><span class="dn">' + (+d.slice(8)) + '</span>' + l.slice(0, 4).map(t => '<button class="ev ' + L.nv(t).st + '" data-id="' + t.id + '" title="' + e(t.ten) + '">' + e(t.ten) + '</button>').join('') + (l.length > 4 ? '<div class="small muted">+' + (l.length - 4) + ' việc</div>' : '') + '</div>'; }
        const noHan = rows.filter(t => !t.han && L.open(t)).length;
        body.innerHTML = '<div class="toolbar"><button class="btn sm" data-mv="-1" aria-label="Tháng trước">' + ic('chevL', 14) + '</button><b style="min-width:130px;text-align:center">Tháng ' + mm + '/' + yy + '</b><button class="btn sm" data-mv="1" aria-label="Tháng sau">' + ic('chevR', 14) + '</button><button class="btn sm ghost" data-mv="0">Hôm nay</button><span class="sp"></span><span class="small muted">Hiển thị theo thời hạn hoàn thành' + (noHan ? ' · ' + noHan + ' việc đang mở không có hạn không hiện trên lịch' : '') + '</span></div><div style="overflow-x:auto"><div class="cal" style="min-width:700px">' + ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'].map(d => '<div class="dh">' + d + '</div>').join('') + cells + '</div></div>';
        $$('[data-mv]', body).forEach(b => b.onclick = () => { const k = +b.dataset.mv; if (!k) V.month = today.slice(0, 7); else { let m2 = mm + k, y2 = yy; if (m2 < 1) { m2 = 12; y2--; } if (m2 > 12) { m2 = 1; y2++; } V.month = y2 + '-' + U.pad(m2); } lich(body, rows, V); });
        $$('.ev', body).forEach(b => b.onclick = () => A.open('nhiemvu', b.dataset.id));
      }
    }
  };

  /* ================= VĂN BẢN ================= */
  const taskFromVB = v => ({ ten: v.trichYeu, noiDung: v.noiDungChiDao, canCu: 'Văn bản số ' + v.soKyHieu + (v.ngayBanHanh ? ' ngày ' + U.fmtDate(v.ngayBanHanh) : '') + (v.coQuan ? ' của ' + v.coQuan : ''), nguon: v.nguon === 'Cuộc họp, kết luận, thông báo' ? 'Kết luận, cuộc họp' : 'Văn bản giao', vaiTro: v.vaiTro, han: v.han, ngayGiao: v.ngayBanHanh, chuTriId: v.chuTriId, phoiHopIds: (v.phoiHopIds || []).slice(), vanBanIds: [v.id], duAnIds: (v.duAnIds || []).slice(), loaiTG: 'phatsinh' });
  A.openers.vanban = id => UI.detail({
    coll: 'vanban', id,
    head: v => { const x = L.vb(v); return '<div class="gap mb">' + UI.chip(x.over ? 'quahan' : x.near ? 'saphan' : x.st === 'hoanthanh' ? 'hoanthanh' : x.st === 'dang' ? 'dang' : '', x.label) + (x.derived ? '<span class="tag">Tình trạng tính từ ' + x.done + '/' + x.tasks.length + ' nhiệm vụ liên kết</span>' : (v.han && x.st !== 'hoanthanh' && x.st !== 'khongyc' ? '<span class="chip plain saphan">Có hạn nhưng chưa tạo nhiệm vụ theo dõi</span>' : '')) + '</div>'; },
    extraTabs: [{
      t: 'Nhiệm vụ liên kết', html: v => { const l = L.vbTasks(v.id); return (l.length ? '<table class="tbl"><thead><tr><th>Nhiệm vụ</th><th>Hạn</th><th>Chủ trì</th><th>Tình trạng</th><th></th></tr></thead><tbody>' + l.map(t => { const x = L.nv(t); return '<tr class="click" data-open="nhiemvu:' + t.id + '"><td class="wrap">' + e(t.ten) + '</td><td class="nowrap">' + U.fmtDate(t.han) + '</td><td>' + UI.who(t.chuTriId) + '</td><td>' + UI.chip(x.st, x.label) + '</td><td class="acts"><button class="btn icon" data-unlink="' + t.id + '" title="Gỡ liên kết" aria-label="Gỡ liên kết">' + ic('x', 15) + '</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="note">Chưa có nhiệm vụ nào liên kết với văn bản này. Một văn bản có thể giao nhiều nhiệm vụ; một nhiệm vụ có thể căn cứ nhiều văn bản.</div>') + '<div class="gap mt"><select class="sel" style="max-width:420px" data-linksel aria-label="Chọn nhiệm vụ có sẵn"><option value="">Liên kết nhiệm vụ có sẵn…</option>' + S.all('nhiemvu').filter(t => !(t.vanBanIds || []).includes(v.id)).sort((a, b) => U.cmp(a.ten, b.ten)).map(t => '<option value="' + t.id + '">' + e(U.trunc(t.ten, 90)) + '</option>').join('') + '</select></div>'; },
      bind: (body, v, m) => {
        const sel = $('[data-linksel]', body); if (sel) sel.onchange = async () => { const t = S.get('nhiemvu', sel.value); if (!t) return; await S.save('nhiemvu', Object.assign({}, t, { vanBanIds: (t.vanBanIds || []).concat([v.id]) })); m.close(true); A.open('vanban', v.id); UI.toast('Đã liên kết nhiệm vụ.', 'ok'); };
        $$('[data-unlink]', body).forEach(b => b.onclick = async x => { x.stopPropagation(); const t = S.get('nhiemvu', b.dataset.unlink); await S.save('nhiemvu', Object.assign({}, t, { vanBanIds: (t.vanBanIds || []).filter(i => i !== v.id) })); m.close(true); A.open('vanban', v.id); });
      }
    }],
    actions: [{ label: 'Tạo nhiệm vụ từ văn bản', icon: 'plus', on: (v, a) => { a.close(true); UI.form({ coll: 'nhiemvu', rec: taskFromVB(v), title: 'Tạo nhiệm vụ từ văn bản ' + v.soKyHieu, onSaved: () => A.open('vanban', v.id) }); } }]
  });
  A.views.vanban = {
    title: 'Văn bản và nhiệm vụ được giao', sub: 'Văn bản chỉ đạo, giao việc, kết luận cuộc họp — nguồn phát sinh nhiệm vụ của Phòng',
    render(root, p) {
      const y = A.year();
      UI.listView(root, {
        key: 'vanban', coll: 'vanban', preset: p && p.preset,
        rows: () => S.all('vanban').filter(v => !y || !v.ngayBanHanh || U.yearOf(v.ngayBanHanh) === y || U.yearOf(v.han) === y || (L.vb(v).st !== 'hoanthanh' && L.vb(v).st !== 'khongyc' && U.yearOf(v.ngayBanHanh) < y)),
        empty: { t: 'Chưa có văn bản nào', p: 'Nhập văn bản chỉ đạo của UBND tỉnh, Giám đốc Sở, Bộ ngành, kết luận cuộc họp… rồi tạo nhiệm vụ theo dõi từ văn bản.' },
        filters: [
          { k: 'ng', label: 'Nguồn', opts: () => A.list('nguonVB').map(x => [x, x]), test: (r, v) => r.nguon === v },
          { k: 'tt', label: 'Tình trạng', opts: () => [['quahan', 'Quá hạn'], ['saphan', 'Sắp đến hạn'], ['chuanv', 'Có hạn, chưa tạo nhiệm vụ']].concat(A.OPT.ttVB), test: (r, v) => { const x = L.vb(r); return v === 'quahan' ? !!x.over : v === 'saphan' ? !!x.near : v === 'chuanv' ? (!x.derived && !!r.han && x.st !== 'hoanthanh' && x.st !== 'khongyc') : x.st === v; } },
          { k: 'cb', label: 'Chủ trì', opts: cbOpts, test: (r, v) => cbTest(r, v) }],
        sort: { k: 'ngayBanHanh', dir: -1 },
        cols: [
          { k: 'soKyHieu', label: 'Số, ký hiệu', cls: 'nowrap', html: v => '<b>' + e(v.soKyHieu) + '</b>' + ((v.dinhKem || []).length ? ' ' + ic('clip', 13) : '') },
          { k: 'ngayBanHanh', label: 'Ngày', cls: 'nowrap', html: v => U.fmtDate(v.ngayBanHanh) },
          { k: 'trichYeu', label: 'Trích yếu', cls: 'wrap', html: v => '<div>' + e(v.trichYeu) + '</div><div class="t2">' + e([v.coQuan, v.nguon].filter(Boolean).join(' · ')) + '</div>' },
          { k: 'chuTriId', label: 'Chủ trì', val: v => Sc.refName('canbo', v.chuTriId), html: v => UI.who(v.chuTriId) },
          { k: 'han', label: 'Thời hạn', cls: 'nowrap', html: v => v.han ? U.fmtDate(v.han) : '<span class="muted">—</span>' },
          { k: '_nv', label: 'Nhiệm vụ', val: v => L.vbTasks(v.id).length, html: v => { const x = L.vb(v); return x.tasks.length ? x.done + '/' + x.tasks.length + ' xong' : '<span class="muted">—</span>'; } },
          { k: 'trangThai', label: 'Tình trạng', val: v => L.vb(v).label, html: v => { const x = L.vb(v); return UI.chip(x.over ? 'quahan' : x.near ? 'saphan' : x.st === 'hoanthanh' ? 'hoanthanh' : x.st === 'dang' ? 'dang' : '', x.label); } }],
        onRow: v => A.open('vanban', v.id)
      });
    }
  };

  /* ================= CÁN BỘ VÀ PHÂN CÔNG ================= */
  A.openers.canbo = id => UI.detail({
    coll: 'canbo', id,
    extraTabs: [{
      t: 'Công việc được giao', html: c => {
        const y = A.year(), nv = L.nvOfYear(y).filter(t => t.chuTriId === c.id || (t.phoiHopIds || []).includes(c.id)).sort((a, b) => U.cmp(a.han, b.han));
        const dm = S.all('danhmuc').filter(d => d.chuTriId === c.id), da = S.all('duan').filter(d => d.canBoId === c.id);
        return '<div class="eyebrow">Chức năng chủ trì (' + dm.length + ')</div>' + (dm.length ? dm.map(d => '<div class="small"><a href="#" data-open="danhmuc:' + d.id + '"><b>' + e(d.ma) + '</b> ' + e(U.trunc(d.ten, 120)) + '</a></div>').join('') : '<div class="small muted">Chưa được phân công đầu mục chức năng nào.</div>') +
          '<div class="eyebrow">Nhiệm vụ' + (y ? ' năm ' + y : '') + ' (' + nv.length + ')</div>' + (nv.length ? '<table class="tbl"><tbody>' + nv.map(t => { const v = L.nv(t); return '<tr class="click" data-open="nhiemvu:' + t.id + '"><td class="wrap">' + e(t.ten) + '<div class="t2">' + (t.chuTriId === c.id ? 'Chủ trì' : 'Phối hợp') + '</div></td><td class="nowrap">' + U.fmtDate(t.han) + '</td><td>' + UI.chip(v.st, v.label) + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="small muted">Không có nhiệm vụ.</div>') +
          '<div class="eyebrow">Chương trình, dự án theo dõi (' + da.length + ')</div>' + (da.length ? da.map(d => '<div class="small"><a href="#" data-open="duan:' + d.id + '">' + e(U.trunc(d.ten, 130)) + '</a></div>').join('') : '<div class="small muted">Không có.</div>');
      }
    }]
  });
  A.openers.donvi = id => UI.detail({ coll: 'donvi', id, size: '' });
  A.views.canbo = {
    title: 'Cán bộ và phân công công việc', sub: 'Khối lượng, tiến độ theo từng cán bộ và bảng phân công chức năng, nhiệm vụ',
    render(root, p) {
      const T = A.vs.cbTab || (A.vs.cbTab = { t: 'kl' }); if (p && p.tab) T.t = p.tab;
      const tabs = [['kl', 'Khối lượng công việc'], ['pc', 'Bảng phân công chức năng'], ['ds', 'Danh sách cán bộ'], ['dv', 'Đơn vị dự toán']];
      root.innerHTML = '<div class="tabs" role="tablist">' + tabs.map(t => '<button role="tab" data-t="' + t[0] + '" class="' + (T.t === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div><div data-pane></div>';
      const pane = $('[data-pane]', root);
      $$('[data-t]', root).forEach(b => b.onclick = () => { T.t = b.dataset.t; A.render(); });
      const y = A.year(), nvs = L.nvOfYear(y);
      if (T.t === 'kl') {
        const rows = L.canBoStats(nvs), dms = S.all('danhmuc'), maxMo = Math.max(1, ...rows.map(r => r.dangMo));
        const chua = nvs.filter(t => !t.chuTriId && L.open(t));
        pane.innerHTML = (chua.length ? '<div class="note warn mb"><b>' + chua.length + ' nhiệm vụ đang mở chưa có cán bộ chủ trì.</b> <a href="#" data-none>Xem danh sách</a></div>' : '') +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cán bộ</th><th class="num">Chức năng chủ trì</th><th class="num">Nhiệm vụ chủ trì</th><th class="num">Phối hợp</th><th class="num">Hoàn thành</th><th class="num">Đang thực hiện</th><th class="num">Chưa triển khai</th><th class="num">Quá hạn</th><th>Tỷ lệ đúng hạn</th><th>Khối lượng đang mở</th></tr></thead><tbody>' +
          rows.map(r => '<tr class="click" data-cb="' + r.c.id + '" tabindex="0"><td><div class="t1">' + e(r.c.hoTen) + '</div><div class="t2">' + e([r.c.chucVu, r.c.viTri].filter(Boolean).join(' · ')) + '</div></td><td class="num">' + dms.filter(d => d.chuTriId === r.c.id).length + '</td><td class="num"><b>' + r.s.tong + '</b></td><td class="num">' + r.phoiHop + '</td><td class="num">' + r.s.hoanthanh + '</td><td class="num">' + r.s.dang + '</td><td class="num">' + r.s.chua + '</td><td class="num">' + (r.s.quahan ? '<b style="color:var(--bad-fg)">' + r.s.quahan + '</b>' : '0') + '</td><td>' + (r.tyLeDungHan === null ? '<span class="muted small">Chưa có việc hoàn thành có hạn</span>' : UI.pbar(r.tyLeDungHan)) + '</td><td style="min-width:140px"><div class="pbar"><div class="bar ' + (r.s.quahan ? 'bad' : '') + '"><i style="width:' + (r.dangMo / maxMo * 100) + '%"></i></div><b>' + r.dangMo + '</b></div></td></tr>').join('') +
          '</tbody></table></div><div class="note mt">Tỷ lệ đúng hạn = số nhiệm vụ có hạn hoàn thành không trễ ÷ số nhiệm vụ có hạn đã hoàn thành. Khối lượng đang mở là số nhiệm vụ chủ trì chưa hoàn thành; con số này không phản ánh độ phức tạp của từng việc.</div>';
        $$('[data-cb]', pane).forEach(tr => tr.onclick = () => A.open('canbo', tr.dataset.cb));
        const n = $('[data-none]', pane); if (n) n.onclick = x => { x.preventDefault(); A.go('nhiemvu', { preset: { cb: '__none', tt: 'mo' } }); };
      } else if (T.t === 'pc') {
        const cbs = S.all('canbo').filter(c => c.trangThai !== 'nghi');
        const dms = S.all('danhmuc').slice().sort((a, b) => (U.num(a.nhom === '0' ? 99 : a.nhom) - U.num(b.nhom === '0' ? 99 : b.nhom)) || (U.num(a.thuTu) - U.num(b.thuTu)));
        pane.innerHTML = '<div class="note mb">Ma trận phân công: mỗi hàng là một đầu mục chức năng, mỗi cột là một cán bộ. Chọn <b>C</b> (chủ trì — mỗi đầu mục một người) hoặc <b>P</b> (phối hợp). Thay đổi được lưu ngay và ghi lịch sử. Dùng nút Xuất Excel để in bảng phân công.</div><div class="toolbar"><span class="sp"></span><button class="btn" data-xpc>' + ic('download', 16) + 'Xuất bảng phân công</button></div>' +
          '<div class="tbl-wrap" style="max-height:72vh;overflow:auto"><table class="tbl"><thead><tr><th>Mã</th><th>Nhiệm vụ</th>' + cbs.map(c => '<th class="center" title="' + e(c.hoTen) + '">' + e(c.tenGoi || c.hoTen) + '</th>').join('') + '</tr></thead><tbody>' +
          dms.map((d, i) => (i === 0 || dms[i - 1].nhom !== d.nhom ? '<tr class="grp"><td colspan="' + (cbs.length + 2) + '">' + (d.nhom === '0' ? '' : e(d.nhom) + '. ') + e(A.nhomTen(d.nhom)) + '</td></tr>' : '') +
            '<tr><td class="nowrap"><b>' + e(d.ma) + '</b></td><td class="wrap" style="min-width:300px">' + e(U.trunc(d.ten, 150)) + (d.goiY ? '<div class="t2">Tham khảo TB 279: ' + e(d.goiY) + '</div>' : '') + '</td>' + cbs.map(c => { const v = d.chuTriId === c.id ? 'C' : (d.phoiHopIds || []).includes(c.id) ? 'P' : ''; return '<td class="center"><select class="sel" data-m="' + d.id + ':' + c.id + '" style="height:30px;width:54px;padding:0 4px;font-weight:700;' + (v === 'C' ? 'background:var(--accent-soft);color:var(--accent);border-color:var(--accent)' : v === 'P' ? 'background:var(--info-bg);color:var(--info-fg)' : '') + '" aria-label="' + e(d.ma + ' — ' + c.hoTen) + '"><option value=""></option><option' + (v === 'C' ? ' selected' : '') + '>C</option><option' + (v === 'P' ? ' selected' : '') + '>P</option></select></td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>';
        $$('[data-m]', pane).forEach(s => s.onchange = async () => {
          const [did, cid] = s.dataset.m.split(':'), d = S.get('danhmuc', did), r = { id: did, chuTriId: d.chuTriId || '', phoiHopIds: (d.phoiHopIds || []).filter(x => x !== cid) };
          if (s.value === 'C') r.chuTriId = cid; else { if (r.chuTriId === cid) r.chuTriId = ''; if (s.value === 'P') r.phoiHopIds.push(cid); }
          try { await S.save('danhmuc', r); } catch (er) { UI.fail(er); }
        });
        $('[data-xpc]', pane).onclick = () => {
          const aoa = [['BẢNG PHÂN CÔNG CHỨC NĂNG, NHIỆM VỤ — ' + A.cfg('tenDonVi').toUpperCase()], ['Xuất ngày ' + U.fmtDate(U.today()) + '. C: chủ trì; P: phối hợp'], [], ['Mã', 'Nhiệm vụ', 'Căn cứ'].concat(cbs.map(c => c.hoTen))];
          dms.forEach(d => aoa.push([d.ma, d.ten, d.canCu].concat(cbs.map(c => d.chuTriId === c.id ? 'C' : (d.phoiHopIds || []).includes(c.id) ? 'P' : ''))));
          UI.xlsx('bang-phan-cong-' + UI.stamp() + '.xlsx', [{ name: 'Phan cong', aoa, widths: [9, 80, 34].concat(cbs.map(() => 14)) }]);
        };
      } else if (T.t === 'ds') {
        UI.listView(pane, {
          key: 'canbo', coll: 'canbo', rows: () => S.all('canbo'), onRow: c => A.open('canbo', c.id),
          filters: [{ k: 'tt', label: 'Trạng thái', opts: () => A.OPT.ttCB, test: (r, v) => (r.trangThai || 'danglam') === v }],
          cols: [{ k: 'hoTen', label: 'Họ và tên', html: c => '<b>' + e(c.hoTen) + '</b>' }, { k: 'chucVu', label: 'Chức vụ' }, { k: 'viTri', label: 'Vị trí công tác' }, { k: 'linhVuc', label: 'Lĩnh vực phụ trách', cls: 'wrap' },
          { k: 'donViIds', label: 'Đơn vị theo dõi', val: c => (c.donViIds || []).length, html: c => e(Sc.text(Sc.field('canbo', 'donViIds'), c.donViIds)) }, { k: 'trangThai', label: 'Trạng thái', html: c => UI.chip(c.trangThai === 'nghi' ? '' : 'hoanthanh', A.optLabel('ttCB', c.trangThai || 'danglam')) }]
        });
      } else {
        UI.listView(pane, {
          key: 'donvi', coll: 'donvi', rows: () => S.all('donvi'), onRow: d => A.open('donvi', d.id),
          cols: [{ k: 'ten', label: 'Tên đơn vị', html: d => '<b>' + e(d.ten) + '</b>' }, { k: 'tenTat', label: 'Viết tắt' }, { k: 'loai', label: 'Loại' },
          { k: '_cb', label: 'Cán bộ theo dõi', val: d => S.all('canbo').filter(c => (c.donViIds || []).includes(d.id)).length, html: d => e(S.all('canbo').filter(c => (c.donViIds || []).includes(d.id)).map(c => c.tenGoi || c.hoTen).join(', ')) || '<span class="muted">Chưa phân công</span>' }]
        });
      }
    }
  };
})(App);
