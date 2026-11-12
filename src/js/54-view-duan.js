/* ============================================================
   54-view-duan.js — Chương trình, dự án · Kế hoạch vốn và giải ngân
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const cbOpts = () => [['__none', 'Chưa phân công']].concat(S.all('canbo').filter(c => c.trangThai !== 'nghi').map(c => [c.id, c.hoTen]));

  Sc.C.duan.sections = [
    { t: 'Thông tin chung', keys: ['ten', 'ma', 'loai', 'vaiTroSo', 'linhVuc', 'chuDauTu', 'donViQL', 'diaDiem'] },
    { t: 'Quy mô, nguồn vốn, thời gian', keys: ['tmdt', 'batDau', 'ketThuc', 'nguonVon'] },
    { t: 'Quyết định', keys: ['qdCTSo', 'qdCTNgay', 'qdDTSo', 'qdDTNgay'] },
    { t: 'Theo dõi thực hiện', keys: ['canBoId', 'trangThai', 'tienDo', 'phoiHopIds'] },
    { t: 'Các mốc công việc (tùy từng dự án, không bắt buộc đủ)', keys: ['moc'] },
    { t: 'Khó khăn, kiến nghị', keys: ['khoKhan', 'nguyenNhanCham', 'kienNghi'] },
    { t: 'Quyết toán', keys: ['qtTrangThai', 'qtGiaTri', 'qtSo', 'qtNgay'] },
    { t: 'Hồ sơ', keys: ['dinhKem', 'ghiChu'] }];
  Sc.C.von.sections = [
    { t: 'Kế hoạch vốn', keys: ['duAnId', 'nam', 'nguonVon', 'qdGiao', 'khGiao', 'keoDai', 'dcTang', 'dcGiam'] },
    { t: 'Giải ngân', keys: ['capNhat'] },
    { t: 'Điều chỉnh, khó khăn', keys: ['nhuCauDC', 'nguyenNhan', 'ghiChu'] }];

  const mocSt = m => { const t = U.today(); if (m.trangThai === 'hoanthanh') return 'hoanthanh'; if (m.trangThai === 'khongad') return 'tamdung'; if (U.isISO(m.ketThuc) && m.ketThuc < t) return 'quahan'; if (U.isISO(m.ketThuc) && U.diffDays(m.ketThuc, t) <= A.nguong('sapHan')) return 'saphan'; return m.trangThai === 'dang' ? 'dang' : 'chua'; };
  const mocLabel = m => { const s = mocSt(m), t = U.today(); return s === 'quahan' ? 'Quá hạn ' + U.diffDays(t, m.ketThuc) + ' ngày' : s === 'saphan' ? 'Còn ' + U.diffDays(m.ketThuc, t) + ' ngày' : A.optLabel('ttMoc', m.trangThai || 'chua'); };
  const sortMoc = moc => moc.slice().sort((a, b) => U.cmp(a.batDau || a.ketThuc, b.batDau || b.ketThuc));
  const ganttRows = d => sortMoc(d.moc || []).filter(m => m.trangThai !== 'khongad').map(m => ({ label: m.ten, chip: '', bars: [{ a: m.batDau || m.ketThuc, b: m.trangThai === 'hoanthanh' && m.ngayHT ? (m.ngayHT > (m.batDau || m.ngayHT) ? m.ngayHT : m.ketThuc) : m.ketThuc, st: mocSt(m), title: m.ten + ': ' + (U.fmtDate(m.batDau) || '?') + ' → ' + (U.fmtDate(m.ketThuc) || '?') + ' — ' + mocLabel(m) }], dots: m.batDau ? [] : [] }));

  function updateGN(v, after) {
    const o = L.von(v), d = S.get('duan', v.duAnId);
    const m = UI.modal({
      title: 'Cập nhật giải ngân', sub: (d ? U.trunc(d.ten, 80) : '') + ' — ' + v.nguonVon + ' ' + v.nam, size: 'sm',
      body: '<div class="note mb">Kế hoạch vốn sau điều chỉnh: <b>' + U.fmtMoney(o.kh) + '</b> đồng. Lũy kế gần nhất: <b>' + U.fmtMoney(o.gn) + '</b> đồng' + (o.ngayGN ? ' (đến ' + U.fmtDate(o.ngayGN) + ')' : '') + '.</div><div class="fld"><label for="gn_d">Số liệu đến ngày</label><input class="inp" type="date" id="gn_d" value="' + U.today() + '"></div><div class="fld mt"><label for="gn_v">Lũy kế giải ngân từ đầu năm (đồng)</label><input class="inp num" id="gn_v" data-money inputmode="numeric" autocomplete="off"></div><div class="fld mt"><label for="gn_n">Ghi chú</label><input class="inp" id="gn_n"></div><div class="fld mt"><label for="gn_nn">Khó khăn, nguyên nhân giải ngân chậm</label><textarea class="inp" id="gn_nn" rows="2">' + e(v.nguyenNhan || '') + '</textarea></div>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, {
        label: 'Lưu số giải ngân', cls: 'primary', icon: 'check', on: async a => {
          const ngay = $('#gn_d', a.body).value, val = U.parseNum($('#gn_v', a.body).value);
          if (!U.isISO(ngay)) { UI.toast('Ngày không hợp lệ.', 'bad'); return; }
          if (val === '' || val === null || val < 0) { UI.toast('Nhập số lũy kế giải ngân (không âm).', 'bad'); return; }
          const rows = (v.capNhat || []).filter(r => r.ngay !== ngay).concat([{ ngay, luyKe: val, ghiChu: $('#gn_n', a.body).value.trim() }]);
          const r = Object.assign({}, v, { capNhat: rows, nguyenNhan: $('#gn_nn', a.body).value.trim() }); Sc.C.von.normalize(r);
          const w = Sc.C.von.validate(r);
          if (w.length && !await UI.confirm({ title: 'Kiểm tra lại số liệu', msg: w.map(x => '• ' + x).join('\n') + '\n\nVẫn lưu?', ok: 'Vẫn lưu', cancel: 'Quay lại sửa' })) return;
          try { await S.save('von', r); a.close(); UI.toast('Đã cập nhật giải ngân.', 'ok'); if (after) after(); } catch (er) { UI.fail(er); }
        }
      }]
    });
    $('#gn_v', m.body).addEventListener('input', x => { const el = x.target; el.value = el.value.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); });
  }
  A.updateGN = updateGN;

  function addStages(d, reopen) {
    const have = new Set((d.moc || []).map(m => m.nhom));
    const m = UI.modal({
      title: 'Thêm mốc theo giai đoạn', sub: 'Chỉ chọn những giai đoạn dự án này thực sự có. Tên, ngày và tình trạng sửa lại sau khi thêm.', size: 'sm',
      body: '<div class="checks" style="flex-direction:column;align-items:flex-start">' + A.list('nhomMoc').filter(x => x !== 'Khác').map(x => '<label class="check"><input type="checkbox" value="' + e(x) + '"' + (have.has(x) ? ' disabled' : '') + '> ' + e(x) + (have.has(x) ? ' <span class="muted small">(đã có)</span>' : '') + '</label>').join('') + '</div>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, { label: 'Thêm mốc đã chọn', cls: 'primary', on: async a => { const pick = $$('input:checked', a.body).map(i => i.value); if (!pick.length) { UI.toast('Chưa chọn giai đoạn nào.', 'bad'); return; } try { await S.save('duan', { id: d.id, moc: (d.moc || []).concat(pick.map(x => ({ id: U.uid('m'), ten: x, nhom: x, trangThai: 'chua', batDau: '', ketThuc: '', ngayHT: '' }))) }); a.close(); UI.toast('Đã thêm ' + pick.length + ' mốc. Bấm "Sửa" để đặt ngày.', 'ok'); reopen(); } catch (er) { UI.fail(er); } } }]
    });
  }

  A.openers.duan = (id, tab) => {
    const opts = {
      coll: 'duan', id, tab,
      keys: ['ma', 'loai', 'vaiTroSo', 'linhVuc', 'chuDauTu', 'donViQL', 'diaDiem', 'tmdt', 'nguonVon', 'batDau', 'ketThuc', 'qdCTSo', 'qdCTNgay', 'qdDTSo', 'qdDTNgay', 'canBoId', 'phoiHopIds', 'khoKhan', 'nguyenNhanCham', 'kienNghi', 'qtTrangThai', 'qtGiaTri', 'qtSo', 'qtNgay', 'dinhKem', 'ghiChu'],
      head: d => {
        const v = L.da(d);
        return '<div class="gap mb">' + UI.chip(v.st, v.label) + (v.treMax ? '<span class="chip plain quahan">Chậm ' + v.treMax + ' ngày</span>' : '') + (v.cham && !d.nguyenNhanCham ? '<span class="chip plain saphan">Chưa ghi nguyên nhân chậm</span>' : '') + '</div>' +
          '<div class="kpis mb"><div class="kpi teal static"><span class="k-l">Tổng mức đầu tư / dự toán</span><span class="k-v"><small>' + (U.num(d.tmdt) ? U.fmtShort(d.tmdt) : '—') + '</small></span></div><div class="kpi acc static"><span class="k-l">Tiến độ thực hiện</span><span class="k-v">' + U.num(d.tienDo) + '<small>%</small></span><span class="k-s">' + (v.moc.length ? v.mocXong + '/' + v.moc.length + ' mốc hoàn thành' : 'Chưa đặt mốc') + '</span></div><div class="kpi violet static"><span class="k-l">Kế hoạch vốn (các năm)</span><span class="k-v"><small>' + (v.khVon ? U.fmtShort(v.khVon) : '—') + '</small></span></div><div class="kpi ' + (v.khVon && (v.tyLeGN || 0) < 30 ? 'warn' : 'ok') + ' static"><span class="k-l">Đã giải ngân</span><span class="k-v">' + (v.khVon ? U.fmtPct(v.tyLeGN) : '—') + '</span><span class="k-s">' + (v.khVon ? U.fmtShort(v.giaiNgan) : '') + '</span></div></div>';
      },
      extraTabs: [
        {
          t: 'Mốc tiến độ', html: d => {
            const moc = sortMoc(d.moc || []);
            if (!moc.length) return '<div class="note">Dự án chưa có mốc công việc. Mỗi dự án tự đặt các mốc phù hợp với tính chất của mình (quy hoạch, chủ trương đầu tư, lựa chọn nhà thầu, thi công, nghiệm thu, quyết toán…), không bắt buộc đủ mọi giai đoạn.</div><div class="gap mt"><button class="btn primary" data-stages>' + ic('plus', 16) + 'Thêm mốc theo giai đoạn</button></div>';
            return '<div class="gap mb"><button class="btn sm" data-stages>' + ic('plus', 15) + 'Thêm mốc theo giai đoạn</button><span class="small muted">Đổi tình trạng ngay tại danh sách; muốn sửa tên, ngày thì bấm "Sửa".</span></div>' + UI.gantt(ganttRows(d), { head: 'Mốc công việc', labelW: 230 }) +
              '<div class="eyebrow">Dòng thời gian</div><div class="tl">' + moc.map(m => '<div class="tl-i ' + mocSt(m) + '"><div class="gap"><span class="tt grow">' + e(m.ten) + (m.nhom && m.nhom !== m.ten ? ' <span class="tag">' + e(m.nhom) + '</span>' : '') + '</span>' + UI.chip(mocSt(m), mocLabel(m)) + '<select class="sel" data-mst="' + e(m.id) + '" style="width:auto;height:30px" aria-label="Tình trạng mốc ' + e(m.ten) + '">' + A.OPT.ttMoc.map(o => '<option value="' + o[0] + '"' + (o[0] === (m.trangThai || 'chua') ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div><div class="dd">' + (m.batDau ? U.fmtDate(m.batDau) + ' → ' : '') + (m.ketThuc ? 'hạn ' + U.fmtDate(m.ketThuc) : 'chưa đặt hạn') + (m.ngayHT ? ' · hoàn thành ' + U.fmtDate(m.ngayHT) : '') + (m.ghiChu ? ' · ' + e(m.ghiChu) : '') + '</div></div>').join('') + '</div>';
          },
          bind: (body, d, m) => {
            const reopen = () => { m.close(true); A.openers.duan(d.id, 1); };
            $$('[data-stages]', body).forEach(b => b.onclick = () => addStages(d, reopen));
            $$('[data-mst]', body).forEach(s => s.onchange = async () => { const moc = U.clone(d.moc || []); const x = moc.find(q => q.id === s.dataset.mst); if (!x) return; x.trangThai = s.value; const r = Object.assign({}, d, { moc }); Sc.C.duan.normalize(r); try { await S.save('duan', r); reopen(); } catch (er) { UI.fail(er); } });
          }
        },
        {
          t: 'Vốn và giải ngân', html: d => {
            const vs = S.all('von').filter(v => v.duAnId === d.id).map(L.von).sort((a, b) => (a.v.nam - b.v.nam) || U.cmp(a.v.nguonVon, b.v.nguonVon));
            return (vs.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Năm</th><th>Nguồn vốn</th><th class="num">KH đầu năm</th><th class="num">KH sau điều chỉnh</th><th class="num">Đã giải ngân</th><th class="num">Còn lại</th><th>Tỷ lệ</th><th></th></tr></thead><tbody>' + vs.map(o => '<tr class="click" data-open="von:' + o.v.id + '"><td>' + o.v.nam + '</td><td>' + e(o.v.nguonVon) + '</td><td class="num">' + U.fmtMoney(o.khDauNam) + '</td><td class="num">' + U.fmtMoney(o.kh) + '</td><td class="num">' + U.fmtMoney(o.gn) + '</td><td class="num">' + U.fmtMoney(o.conLai) + '</td><td style="min-width:120px">' + UI.pbar(o.tyLe || 0, o.thap ? 'bad' : '') + '</td><td class="acts"><button class="btn sm" data-gn="' + o.v.id + '">Cập nhật</button></td></tr>').join('') + '</tbody><tfoot><tr><td colspan="2">Cộng</td><td class="num">' + U.fmtMoney(U.sum(vs, o => o.khDauNam)) + '</td><td class="num">' + U.fmtMoney(U.sum(vs, o => o.kh)) + '</td><td class="num">' + U.fmtMoney(U.sum(vs, o => o.gn)) + '</td><td class="num">' + U.fmtMoney(U.sum(vs, o => o.conLai)) + '</td><td>' + U.fmtPct(U.pct(U.sum(vs, o => o.gn), U.sum(vs, o => o.kh))) + '</td><td></td></tr></tfoot></table></div>' : '<div class="note">Chưa có kế hoạch vốn cho dự án này.</div>') + '<div class="gap mt"><button class="btn" data-addvon>' + ic('plus', 16) + 'Thêm kế hoạch vốn năm</button></div>';
          },
          bind: (body, d, m) => {
            $('[data-addvon]', body).onclick = () => { m.close(true); UI.form({ coll: 'von', rec: { duAnId: d.id, nguonVon: ((d.nguonVon || [])[0] || {}).ten || '' }, onSaved: () => A.openers.duan(d.id, 2) }); };
            $$('[data-gn]', body).forEach(b => b.onclick = x => { x.stopPropagation(); updateGN(S.get('von', b.dataset.gn), () => { m.close(true); A.openers.duan(d.id, 2); }); });
          }
        },
        {
          t: 'Gói thầu, hợp đồng, nhiệm vụ', html: d => {
            const gt = S.all('goithau').filter(g => g.duAnId === d.id), hd = S.all('hopdong').filter(h => h.duAnId === d.id || gt.some(g => g.id === h.goiThauId));
            const nv = S.all('nhiemvu').filter(t => (t.duAnIds || []).includes(d.id)), vb = S.all('vanban').filter(v => (v.duAnIds || []).includes(d.id)), ns = S.all('ngansach').filter(n => n.duAnId === d.id);
            const blk = (t, list, row) => '<div class="eyebrow">' + t + ' (' + list.length + ')</div>' + (list.length ? '<table class="tbl"><tbody>' + list.map(row).join('') + '</tbody></table>' : '<div class="small muted">Không có.</div>');
            return blk('Gói thầu', gt, g => { const x = L.gt(g); return '<tr class="click" data-open="goithau:' + g.id + '"><td class="wrap">' + e(g.ten) + '</td><td class="num">' + U.fmtMoney(g.giaGoiThau) + '</td><td>' + UI.chip(x.st, x.label) + '</td></tr>'; }) +
              blk('Hợp đồng', hd, h => { const x = L.hd(h); return '<tr class="click" data-open="hopdong:' + h.id + '"><td class="wrap"><b>' + e(h.so) + '</b> ' + e(U.trunc(h.ten, 80)) + '<div class="t2">' + e(h.nhaThau || '') + '</div></td><td class="num">' + U.fmtMoney(h.giaTri) + '</td><td>' + UI.chip(x.st, x.note || x.label) + '</td></tr>'; }) +
              blk('Nhiệm vụ liên quan', nv, t => { const x = L.nv(t); return '<tr class="click" data-open="nhiemvu:' + t.id + '"><td class="wrap">' + e(t.ten) + '</td><td class="nowrap">' + U.fmtDate(t.han) + '</td><td>' + UI.chip(x.st, x.label) + '</td></tr>'; }) +
              blk('Văn bản liên quan', vb, v => '<tr class="click" data-open="vanban:' + v.id + '"><td class="nowrap"><b>' + e(v.soKyHieu) + '</b></td><td class="wrap">' + e(v.trichYeu) + '</td><td class="nowrap">' + U.fmtDate(v.ngayBanHanh) + '</td></tr>') +
              blk('Dòng dự toán ngân sách liên quan', ns, n => '<tr class="click" data-open="ngansach:' + n.id + '"><td class="wrap">' + e(n.noiDung) + '</td><td>' + n.nam + '</td><td class="num">' + U.fmtMoney(L.nsTong(n)) + '</td></tr>') +
              '<div class="gap mt"><button class="btn sm" data-mkgt>' + ic('plus', 15) + 'Thêm gói thầu</button><button class="btn sm" data-mknv>' + ic('plus', 15) + 'Thêm nhiệm vụ</button></div>';
          },
          bind: (body, d, m) => {
            $('[data-mkgt]', body).onclick = () => { m.close(true); UI.form({ coll: 'goithau', rec: { duAnId: d.id, canBoId: d.canBoId }, onSaved: () => A.openers.duan(d.id, 3) }); };
            $('[data-mknv]', body).onclick = () => { m.close(true); UI.form({ coll: 'nhiemvu', rec: { duAnIds: [d.id], chuTriId: d.canBoId, nhom: '3' }, onSaved: () => A.openers.duan(d.id, 3) }); };
          }
        }]
    };
    return UI.detail(opts);
  };
  A.openers.von = id => UI.detail({
    coll: 'von', id,
    head: v => { const o = L.von(v); return '<div class="gap mb">' + (o.thap ? UI.chip('quahan', 'Giải ngân thấp') : UI.chip('hoanthanh', 'Trong ngưỡng')) + (o.thapSoTienDo ? '<span class="chip plain saphan">Thấp hơn tiến độ thực hiện dự án</span>' : '') + '</div><div class="kpis mb"><div class="kpi violet static"><span class="k-l">Kế hoạch vốn sau điều chỉnh</span><span class="k-v"><small>' + U.fmtShort(o.kh) + '</small></span><span class="k-s">= giao đầu năm + kéo dài + tăng − giảm</span></div><div class="kpi acc static"><span class="k-l">Đã giải ngân</span><span class="k-v"><small>' + U.fmtShort(o.gn) + '</small></span><span class="k-s">' + (o.ngayGN ? 'đến ' + U.fmtDate(o.ngayGN) : 'chưa có số liệu') + '</span></div><div class="kpi static"><span class="k-l">Còn lại</span><span class="k-v"><small>' + U.fmtShort(o.conLai) + '</small></span></div><div class="kpi ' + (o.thap ? 'bad' : 'ok') + ' static"><span class="k-l">Tỷ lệ giải ngân</span><span class="k-v">' + U.fmtPct(o.tyLe || 0) + '</span><span class="k-s">Thời gian năm đã qua ' + U.fmtPct(o.tgNam, 0) + '</span></div></div>'; },
    actions: [{ label: 'Cập nhật giải ngân', icon: 'coins', on: (v, a, reopen) => updateGN(v, reopen) }]
  });

  A.views.duan = {
    title: 'Chương trình, dự án', sub: 'Chương trình, dự án, nhiệm vụ do Sở làm chủ đầu tư hoặc Phòng theo dõi, tham mưu',
    render(root, p) {
      const V = A.vs.daMode || (A.vs.daMode = { m: 'bang' }), y = A.year();
      const lv = UI.listView(root, {
        key: 'duan', coll: 'duan', preset: p && p.preset, rows: () => L.daOfYear(y), addLabel: 'Thêm dự án',
        empty: { t: 'Chưa có chương trình, dự án nào', p: 'Thêm từng dự án, nhập từ Excel, hoặc nạp sẵn tên các nhiệm vụ, dự án theo biểu kèm Thông báo 279/TB-KHTC (chỉ có tên và lĩnh vực, chưa có số liệu) tại Thiết lập.' },
        filters: [
          { k: 'tt', label: 'Tình trạng', opts: () => [['cham', 'Chậm tiến độ'], ['nguyco', 'Có nguy cơ chậm'], ['mo', 'Đang triển khai (chưa xong)']].concat(A.OPT.ttDA), test: (r, v) => { const x = L.da(r); return v === 'cham' ? x.cham : v === 'nguyco' ? x.nguyCo : v === 'mo' ? !x.xong : r.trangThai === v; } },
          { k: 'loai', label: 'Loại', opts: () => A.list('loaiDuAn').map(x => [x, x]), test: (r, v) => r.loai === v },
          { k: 'lv', label: 'Lĩnh vực', opts: () => A.list('linhVucDA').map(x => [x, x]), test: (r, v) => r.linhVuc === v },
          { k: 'cb', label: 'Cán bộ', opts: cbOpts, test: (r, v) => v === '__none' ? !r.canBoId : (r.canBoId === v || (r.phoiHopIds || []).includes(v)) },
          { k: 'src', label: 'Nguồn dữ liệu', opts: () => [['local', 'Nhập tại phần mềm này'], ['dadt', 'Từ Dự án đầu tư']], test: (r, v) => v === 'local' ? !r.ext : !!(r.ext && r.ext.src.indexOf(v) === 0) }],
        extra: ['<div class="seg" role="tablist" aria-label="Kiểu hiển thị">' + [['bang', 'Bảng', 'table'], ['gantt', 'Gantt', 'gantt'], ['sosanh', 'So sánh', 'layers']].map(s => '<button data-mode="' + s[0] + '" class="' + (V.m === s[0] ? 'on' : '') + '">' + ic(s[2], 14) + s[1] + '</button>').join('') + '</div>'],
        sort: { k: 'trangThai', dir: 1 },
        cols: [
          { k: 'ma', label: 'Mã', cls: 'nowrap', html: d => '<span class="muted small">' + e(d.ma || '') + '</span>' },
          { k: 'ten', label: 'Chương trình, dự án', cls: 'wrap', html: d => '<div class="t1">' + e(d.ten) + '</div><div class="t2">' + e([d.linhVuc, d.chuDauTu].filter(Boolean).join(' · ')) + '</div>' },
          { k: 'tmdt', label: 'Tổng mức đầu tư', cls: 'num', val: d => U.num(d.tmdt), html: d => U.num(d.tmdt) ? U.fmtMoney(d.tmdt) : '<span class="muted">—</span>' },
          { k: 'canBoId', label: 'Cán bộ theo dõi', val: d => Sc.refName('canbo', d.canBoId), html: d => UI.who(d.canBoId) },
          { k: 'ketThuc', label: 'Kết thúc', cls: 'nowrap', html: d => U.fmtDate(d.ketThuc) || '<span class="muted">—</span>' },
          { k: 'tienDo', label: 'Tiến độ', val: d => U.num(d.tienDo), html: d => '<div style="min-width:110px">' + UI.pbar(d.tienDo, L.da(d).cham ? 'bad' : '') + '</div>' },
          { k: '_gn', label: 'Giải ngân', val: d => L.da(d).tyLeGN, html: d => { const x = L.da(d); return x.khVon ? '<div style="min-width:100px">' + UI.pbar(x.tyLeGN || 0) + '</div>' : '<span class="muted small">Chưa có KH vốn</span>'; } },
          { k: 'trangThai', label: 'Tình trạng', val: d => ({ quahan: 0, saphan: 1, dang: 2, chua: 3, tamdung: 4, hoanthanh: 5 }[L.da(d).st]), html: d => { const x = L.da(d); return UI.chip(x.st, x.label); } }],
        onRow: d => A.open('duan', d.id),
        render(body, rows) {
          if (V.m === 'gantt') {
            const gr = [];
            rows.slice().sort((a, b) => U.cmp(a.batDau, b.batDau)).forEach(d => {
              const x = L.da(d);
              gr.push({ group: true, label: d.ten, act: 'duan:' + d.id, bars: (d.batDau || d.ketThuc) ? [{ a: d.batDau || d.ketThuc, b: d.ketThuc || d.batDau, st: x.st, thin: true, title: d.ten + ' — ' + x.label }] : [] });
              ganttRows(d).forEach(r => gr.push(r));
            });
            body.innerHTML = '<div class="small muted mb">Mỗi dự án một dòng tổng (thanh mảnh), bên dưới là các mốc công việc. Bấm tên dự án để mở chi tiết.</div>' + UI.gantt(gr, { head: 'Dự án / mốc công việc', labelW: 300 });
            UI.on(body, 'click', '[data-act]', t => A.open('duan', t.dataset.act.split(':')[1]));
            return;
          }
          if (V.m === 'sosanh') {
            const st = A.vs.daCmp || (A.vs.daCmp = {});
            UI.table(body, {
              rows, state: st, onRow: d => A.open('duan', d.id), sort: { k: 'tre', dir: -1 },
              cols: [{ k: 'ten', label: 'Dự án', cls: 'wrap', html: d => '<b>' + e(U.trunc(d.ten, 90)) + '</b>' },
              { k: 'tmdt', label: 'Tổng mức đầu tư', cls: 'num', val: d => U.num(d.tmdt), html: d => U.fmtMoney(d.tmdt) },
              { k: 'kh', label: 'Kế hoạch vốn', cls: 'num', val: d => L.da(d).khVon, html: d => U.fmtMoney(L.da(d).khVon) },
              { k: 'gn', label: 'Đã giải ngân', cls: 'num', val: d => L.da(d).giaiNgan, html: d => U.fmtMoney(L.da(d).giaiNgan) },
              { k: 'tl', label: '% giải ngân', cls: 'num', val: d => L.da(d).tyLeGN, html: d => U.fmtPct(L.da(d).tyLeGN) },
              { k: 'td', label: '% tiến độ', cls: 'num', val: d => U.num(d.tienDo), html: d => U.num(d.tienDo) + '%' },
              { k: 'lech', label: 'Tiến độ − giải ngân', cls: 'num', val: d => { const x = L.da(d); return x.khVon ? U.num(d.tienDo) - (x.tyLeGN || 0) : ''; }, html: d => { const x = L.da(d); if (!x.khVon) return '—'; const l = U.num(d.tienDo) - (x.tyLeGN || 0); return '<span class="' + (l > A.nguong('gnLech') ? 'lech' : '') + '">' + (l > 0 ? '+' : '') + U.fmtNum(l, 1) + ' điểm</span>'; } },
              { k: 'moc', label: 'Mốc xong', cls: 'num', val: d => L.da(d).mocPct, html: d => { const x = L.da(d); return x.moc.length ? x.mocXong + '/' + x.moc.length : '—'; } },
              { k: 'tre', label: 'Số ngày chậm', cls: 'num', val: d => L.da(d).treMax, html: d => { const x = L.da(d); return x.treMax ? '<b class="lech">' + x.treMax + '</b>' : '0'; } },
              { k: 'ketThuc', label: 'Kết thúc', cls: 'nowrap', html: d => U.fmtDate(d.ketThuc) }],
              foot: rs => '<tr><td>Cộng ' + rs.length + ' dự án</td><td class="num">' + U.fmtMoney(U.sum(rs, d => d.tmdt)) + '</td><td class="num">' + U.fmtMoney(U.sum(rs, d => L.da(d).khVon)) + '</td><td class="num">' + U.fmtMoney(U.sum(rs, d => L.da(d).giaiNgan)) + '</td><td class="num">' + U.fmtPct(U.pct(U.sum(rs, d => L.da(d).giaiNgan), U.sum(rs, d => L.da(d).khVon))) + '</td><td colspan="5"></td></tr>'
            });
            return;
          }
          UI.table(body, { cols: this.cols, rows, onRow: this.onRow, sort: this.sort, state: A.vs.duan.tbl, foot: rs => '<tr><td colspan="2">Cộng ' + rs.length + ' dự án</td><td class="num">' + U.fmtMoney(U.sum(rs, d => d.tmdt)) + '</td><td colspan="5"></td></tr>' });
        }
      });
      $$('[data-mode]', root).forEach(b => b.onclick = () => { V.m = b.dataset.mode; $$('[data-mode]', root).forEach(x => x.classList.toggle('on', x === b)); lv.draw(); });
    }
  };

  /* ================= KẾ HOẠCH VỐN VÀ GIẢI NGÂN ================= */
  A.views.von = {
    title: 'Kế hoạch vốn và giải ngân', sub: 'Kế hoạch vốn giao, điều chỉnh, giải ngân theo dự án, chủ đầu tư, nguồn vốn, lĩnh vực và năm ngân sách',
    render(root, p) {
      const y = A.year(), all = L.vonOfYear(y), G = A.vs.vonG || (A.vs.vonG = { g: 'nguon' });
      const kh = U.sum(all, o => o.kh), gn = U.sum(all, o => o.gn), dn = U.sum(all, o => o.khDauNam), thap = all.filter(o => o.thap), ndc = all.filter(o => U.num(o.v.nhuCauDC) !== 0);
      const keyFns = { duan: o => { const d = S.get('duan', o.v.duAnId); return d ? U.trunc(d.ten, 70) : ''; }, cdt: o => (S.get('duan', o.v.duAnId) || {}).chuDauTu, nguon: o => o.v.nguonVon, linhvuc: o => (S.get('duan', o.v.duAnId) || {}).linhVuc, nam: o => String(o.v.nam) };
      const groups = L.vonGroup(all, keyFns[G.g]);
      const ty = v => U.fmtNum(v / 1e9, v >= 1e10 ? 0 : 1);
      const top = '<div class="kpis mb"><div class="kpi violet static"><span class="k-l">Kế hoạch vốn giao đầu năm</span><span class="k-v"><small>' + (all.length ? U.fmtShort(dn) : '—') + '</small></span><span class="k-s">' + all.length + ' dòng vốn' + (y ? ' năm ' + y : '') + '</span></div><div class="kpi violet static"><span class="k-l">Kế hoạch vốn sau điều chỉnh</span><span class="k-v"><small>' + (all.length ? U.fmtShort(kh) : '—') + '</small></span><span class="k-s">' + (all.length ? 'Chênh ' + (kh - dn >= 0 ? '+' : '') + U.fmtShort(kh - dn) + ' so với đầu năm' : '') + '</span></div><div class="kpi acc static"><span class="k-l">Vốn đã giải ngân</span><span class="k-v"><small>' + (all.length ? U.fmtShort(gn) : '—') + '</small></span></div><div class="kpi static"><span class="k-l">Vốn chưa giải ngân</span><span class="k-v"><small>' + (all.length ? U.fmtShort(kh - gn) : '—') + '</small></span></div><div class="kpi ' + (thap.length ? 'bad' : 'ok') + ' static"><span class="k-l">Tỷ lệ giải ngân</span><span class="k-v">' + (all.length ? U.fmtPct(U.pct(gn, kh)) : '—') + '</span><span class="k-s">' + thap.length + ' dòng giải ngân thấp</span></div><div class="kpi ' + (ndc.length ? 'warn' : '') + ' static"><span class="k-l">Nhu cầu điều chỉnh vốn</span><span class="k-v">' + ndc.length + '</span><span class="k-s">' + (ndc.length ? 'Ròng ' + U.fmtShort(U.sum(ndc, o => o.v.nhuCauDC)) : 'Không có') + '</span></div></div>' +
        (all.length ? '<div class="grid2 mb"><div class="card"><div class="card-h"><h3>Tổng hợp</h3><span class="grow"></span><div class="seg">' + [['nguon', 'Nguồn vốn'], ['duan', 'Dự án'], ['cdt', 'Chủ đầu tư'], ['linhvuc', 'Lĩnh vực'], ['nam', 'Năm']].map(s => '<button data-g="' + s[0] + '" class="' + (G.g === s[0] ? 'on' : '') + '">' + s[1] + '</button>').join('') + '</div></div><div class="card-b"><div style="max-height:330px;overflow:auto"><table class="tbl"><thead><tr><th>Nhóm</th><th class="num">Kế hoạch</th><th class="num">Giải ngân</th><th class="num">Còn lại</th><th>Tỷ lệ</th></tr></thead><tbody>' + groups.map(g => '<tr><td class="wrap" style="min-width:160px">' + e(g.k) + '</td><td class="num">' + U.fmtMoney(g.kh) + '</td><td class="num">' + U.fmtMoney(g.gn) + '</td><td class="num">' + U.fmtMoney(g.conLai) + '</td><td style="min-width:110px">' + UI.pbar(g.tyLe || 0) + '</td></tr>').join('') + '</tbody><tfoot><tr><td>Cộng</td><td class="num">' + U.fmtMoney(kh) + '</td><td class="num">' + U.fmtMoney(gn) + '</td><td class="num">' + U.fmtMoney(kh - gn) + '</td><td>' + U.fmtPct(U.pct(gn, kh)) + '</td></tr></tfoot></table></div></div></div>' +
          '<div class="card"><div class="card-h"><h3>Kế hoạch vốn và thực tế giải ngân</h3><div class="sub">Tỷ đồng — 8 nhóm lớn nhất</div></div><div class="card-b">' + UI.bars({ cats: groups.slice(0, 8).map(g => U.trunc(g.k.replace('Vốn đầu tư công - ', 'ĐTC ').replace('ngân sách ', 'NS '), 14)), fmt: ty, labels: true, series: [{ name: 'Kế hoạch vốn', color: 'var(--violet)', vals: groups.slice(0, 8).map(g => g.kh) }, { name: 'Đã giải ngân', color: 'var(--accent)', vals: groups.slice(0, 8).map(g => g.gn) }] }) + '</div></div></div>' : '') +
        '<div class="note mb">Cảnh báo giải ngân thấp khi tỷ lệ giải ngân thấp hơn tỷ lệ thời gian đã qua của năm ngân sách trên ' + A.nguong('gnLech') + ' điểm phần trăm, hoặc thấp hơn tiến độ thực hiện dự án trên ' + A.nguong('gnLech') + ' điểm. Đây là ngưỡng nội bộ để nhắc việc (đổi được ở Thiết lập), không phải quy định pháp lý.</div>';
      UI.listView(root, {
        key: 'von', coll: 'von', top, preset: p && p.preset, rows: () => S.all('von').filter(v => !y || +v.nam === y), addLabel: 'Thêm kế hoạch vốn',
        empty: { t: 'Chưa có kế hoạch vốn' + (y ? ' năm ' + y : ''), p: 'Mỗi dòng là kế hoạch vốn của một dự án, một nguồn vốn, một năm. Cần có dự án trước khi nhập kế hoạch vốn.' },
        searchText: v => [Sc.refName('duan', v.duAnId), v.nguonVon, v.qdGiao, v.nguyenNhan, v.ghiChu].join(' '),
        filters: [
          { k: 'ng', label: 'Nguồn vốn', opts: () => A.list('nguonVon').map(x => [x, x]), test: (r, v) => r.nguonVon === v },
          { k: 'tt', label: 'Tình trạng', opts: () => [['thap', 'Giải ngân thấp'], ['chuagn', 'Chưa có số giải ngân'], ['ndc', 'Có nhu cầu điều chỉnh']], test: (r, v) => { const o = L.von(r); return v === 'thap' ? (o.thap || o.thapSoTienDo) : v === 'chuagn' ? !o.rows.length : U.num(r.nhuCauDC) !== 0; } }],
        sort: { k: 'tl', dir: 1 },
        cols: [
          { k: 'duAnId', label: 'Chương trình, dự án', cls: 'wrap', val: v => Sc.refName('duan', v.duAnId), html: v => '<div class="t1">' + (e(Sc.refName('duan', v.duAnId)) || '<span class="muted">(dự án đã xóa)</span>') + '</div><div class="t2">' + e(v.nguonVon) + ' · ' + v.nam + '</div>' },
          { k: 'dn', label: 'KH đầu năm', cls: 'num', val: v => U.num(v.khGiao), html: v => U.fmtMoney(U.num(v.khGiao)) },
          { k: 'kh', label: 'KH sau điều chỉnh', cls: 'num', val: v => L.von(v).kh, html: v => U.fmtMoney(L.von(v).kh) },
          { k: 'gn', label: 'Đã giải ngân', cls: 'num', val: v => L.von(v).gn, html: v => { const o = L.von(v); return U.fmtMoney(o.gn) + '<div class="t2">' + (o.ngayGN ? 'đến ' + U.fmtDate(o.ngayGN) : 'chưa có số') + '</div>'; } },
          { k: 'cl', label: 'Chưa giải ngân', cls: 'num', val: v => L.von(v).conLai, html: v => U.fmtMoney(L.von(v).conLai) },
          { k: 'tl', label: 'Tỷ lệ', val: v => L.von(v).tyLe || 0, html: v => { const o = L.von(v); return '<div style="min-width:110px">' + UI.pbar(o.tyLe || 0, o.thap ? 'bad' : o.thapSoTienDo ? 'warn' : '') + '</div>' + (o.thap ? '<div class="t2 lech">Thấp so với thời gian năm</div>' : o.thapSoTienDo ? '<div class="t2" style="color:var(--warn-fg)">Thấp so với tiến độ dự án</div>' : ''); } },
          { k: '_a', label: '', noSort: true, cls: 'acts', html: v => '<button class="btn sm" data-gn="' + v.id + '">Cập nhật giải ngân</button>' }],
        onRow: v => A.open('von', v.id),
        foot: rs => { const os = rs.map(L.von); return '<tr><td>Cộng ' + rs.length + ' dòng</td><td class="num">' + U.fmtMoney(U.sum(os, o => o.khDauNam)) + '</td><td class="num">' + U.fmtMoney(U.sum(os, o => o.kh)) + '</td><td class="num">' + U.fmtMoney(U.sum(os, o => o.gn)) + '</td><td class="num">' + U.fmtMoney(U.sum(os, o => o.conLai)) + '</td><td>' + U.fmtPct(U.pct(U.sum(os, o => o.gn), U.sum(os, o => o.kh))) + '</td><td></td></tr>'; }
      });
      UI.on(root, 'click', '[data-gn]', (t, x) => { x.stopPropagation(); updateGN(S.get('von', t.dataset.gn)); });
      $$('[data-g]', root).forEach(b => b.onclick = () => { G.g = b.dataset.g; A.render(); });
    }
  };
})(App);
