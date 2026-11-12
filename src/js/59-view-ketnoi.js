/* ============================================================
   59-view-ketnoi.js — Màn hình "Kết nối phần mềm"
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, UI = A.UI, K = A.KN, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const setKN = patch => S.setCfg({ ketNoi: Object.assign({}, S.cfg.ketNoi || {}, patch) });

  // Nhãn nguồn hiển thị trong cửa sổ chi tiết của bản ghi đồng bộ
  A.extNote = rec => {
    if (!rec || !rec.ext) return '';
    const l = K.link(rec), x = rec.ext;
    const extra = x.src === 'dadt' ? [x.dt_ha ? 'Diện tích ' + U.fmtNum(x.dt_ha) + ' ha' : '', x.hinhThuc, x.nguoiGoc ? 'Người phụ trách ghi ở nguồn: ' + x.nguoiGoc + ' (chưa khớp cán bộ nào trong Phòng)' : ''].filter(Boolean).join(' · ')
      : x.src === 'tdnv' ? [x.row ? 'Dòng ' + x.row + ' trên Sheet' : '', x.dv ? 'Đơn vị chủ trì / phối hợp: ' + x.dv : '', x.nguoiGoc ? 'Người tham mưu ghi trên Sheet: ' + x.nguoiGoc + ' (chưa khớp cán bộ nào)' : ''].filter(Boolean).join(' · ') : '';
    return '<div class="note mb" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + ic('link', 16) + '<span class="grow"><b>Đồng bộ từ phần mềm ' + e(K.SRC[x.src] || x.src) + '.</b> Tên, thời hạn, tình trạng, mốc tiến độ do phần mềm đó quản lý — sửa tại đây sẽ bị ghi lại ở lần đồng bộ sau. Liên kết, tài liệu, kế hoạch vốn, ghi chú bổ sung tại đây được giữ nguyên.' + (extra ? '<br><span class="small">' + e(extra) + '</span>' : '') + (x.src === 'dadt' && x.tienDoMoTa ? '<br><span class="small">Tiến độ theo nguồn: ' + e(U.trunc(x.tienDoMoTa, 260)) + '</span>' : '') + '</span>' + (l ? '<a class="btn sm" href="' + e(l.url) + '" target="_blank" rel="noopener">' + e(l.label) + '</a>' : '') + '</div>';
  };

  const kq = (a, b, c) => '<div class="kpis mt"><div class="kpi ok static"><span class="k-l">Thêm mới</span><span class="k-v">' + a + '</span></div><div class="kpi info static"><span class="k-l">Cập nhật</span><span class="k-v">' + b + '</span></div><div class="kpi static"><span class="k-l">Không đổi</span><span class="k-v">' + c + '</span></div></div>';
  const vang = (list, label) => list.length ? '<div class="note warn mt"><b>' + list.length + ' ' + label + ' đã đồng bộ trước đây không còn ở nguồn</b> (có thể đã bị xóa hoặc đổi nội dung ở phần mềm gốc): ' + e(list.slice(0, 5).map(x => U.trunc(x.ten, 60)).join('; ')) + (list.length > 5 ? '…' : '') + '<br><label class="check" style="margin-top:6px"><input type="checkbox" data-xoavang> Xóa các bản ghi này khỏi phần mềm (mặc định giữ lại)</label></div>' : '';

  /* ----- Nhiệm vụ: xem trước rồi đồng bộ ----- */
  async function syncNV(rows, srcName, silent) {
    const parsed = K.parseSheetNV(rows);
    if (parsed.error) throw new Error(parsed.error);
    const c = K.cfg(), plan = K.planNV(parsed, c.nvLoc);
    const commit = async del => {
      const n = await K.applyNV(plan, 'Đồng bộ từ phần mềm Điều hành nhiệm vụ (' + srcName + '): ' + plan.them + ' thêm, ' + plan.sua + ' cập nhật');
      if (del && plan.vangMat.length) await S.removeMany(plan.vangMat.map(t => ['nhiemvu', t.id]), 'Xóa ' + plan.vangMat.length + ' nhiệm vụ không còn trên Sheet nhiệm vụ');
      await setKN({ nvAt: U.nowStamp(), nvStat: plan.them + ' thêm · ' + plan.sua + ' cập nhật · ' + plan.giu + ' không đổi' });
      return n;
    };
    if (silent) { await commit(false); return plan; }
    const m = UI.modal({
      title: 'Đồng bộ nhiệm vụ từ phần mềm Điều hành nhiệm vụ', sub: 'Nguồn: ' + srcName + ' — đọc được ' + parsed.items.length + ' dòng nhiệm vụ', size: 'lg',
      body: (parsed.missing.length ? '<div class="note warn">Sheet thiếu cột: ' + e(parsed.missing.join(', ')) + '. Các trường tương ứng để trống.</div>' : '') + kq(plan.them, plan.sua, plan.giu) +
        '<div class="note mt">Tạo thêm ' + plan.vbThem + ' văn bản giao việc (gộp theo số ký hiệu và ngày ban hành) và liên kết với nhiệm vụ.' + (plan.boQua ? ' Bỏ qua ' + plan.boQua + ' dòng (trùng khóa hoặc không thuộc phạm vi lọc).' : '') + ' Người tham mưu được khớp với danh sách cán bộ theo tên; tên không khớp thì nhiệm vụ để "Chưa phân công" và ghi lại tên gốc.</div>' +
        (plan.loiNgay.length ? '<div class="note warn mt"><b>Ngày không hợp lệ trên Sheet:</b><ul style="margin:4px 0 0;padding-left:18px">' + plan.loiNgay.slice(0, 8).map(x => '<li>' + e(x) + '</li>').join('') + (plan.loiNgay.length > 8 ? '<li>… và ' + (plan.loiNgay.length - 8) + ' dòng khác</li>' : '') + '</ul></div>' : '') + vang(plan.vangMat, 'nhiệm vụ') +
        '<div class="tbl-wrap mt" style="max-height:280px;overflow:auto"><table class="tbl"><thead><tr><th></th><th>Nhiệm vụ</th><th>Chủ trì</th><th>Hạn</th><th>Tình trạng</th></tr></thead><tbody>' + plan.items.filter(p => p.isNew || p.real).slice(0, 150).map(p => '<tr><td>' + UI.chip(p.isNew ? 'hoanthanh' : 'dang', p.isNew ? 'Thêm' : 'Cập nhật') + '</td><td class="wrap">' + e(U.trunc(p.rec.ten, 130)) + '</td><td>' + UI.who(p.rec.chuTriId) + '</td><td class="nowrap">' + U.fmtDate(p.rec.han) + '</td><td>' + e(A.optLabel('ttNV', p.rec.trangThai)) + '</td></tr>').join('') + '</tbody></table></div>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, { label: 'Đồng bộ ' + (plan.them + plan.sua) + ' nhiệm vụ', cls: 'primary', icon: 'check', on: async a => { try { const del = $('[data-xoavang]', a.body) && $('[data-xoavang]', a.body).checked; if (del || plan.sua > 20) await S.snapshot('Trước khi đồng bộ nhiệm vụ'); await commit(del); a.close(); UI.toast('Đã đồng bộ: ' + plan.them + ' thêm, ' + plan.sua + ' cập nhật.', 'ok'); } catch (er) { UI.fail(er); } } }]
    });
    return plan;
  }
  /* ----- Dự án: chọn ngành, xem trước rồi đồng bộ ----- */
  async function syncDA(data, srcName, silent) {
    const c = K.cfg();
    let pick = c.daNganh, plan = K.planDA(data, pick, c.daTasks);
    const commit = async del => {
      await K.applyDA(plan, 'Đồng bộ từ phần mềm Dự án đầu tư (' + srcName + '): ' + plan.them + ' dự án thêm, ' + plan.sua + ' cập nhật');
      if (del && plan.vangMat.length) await S.removeMany(plan.vangMat.map(t => ['duan', t.id]), 'Xóa ' + plan.vangMat.length + ' dự án không còn ở phần mềm Dự án đầu tư');
      await setKN({ daAt: U.nowStamp(), daNganh: pick, daStat: plan.them + ' thêm · ' + plan.sua + ' cập nhật · ' + plan.giu + ' không đổi' + (c.daTasks ? ' · công việc: ' + plan.tk.them + ' thêm, ' + plan.tk.sua + ' cập nhật' : '') });
    };
    if (silent) { await commit(false); return plan; }
    const m = UI.modal({ title: 'Đồng bộ dự án từ phần mềm Dự án đầu tư', sub: 'Nguồn: ' + srcName + ' — ' + (data.projects || []).length + ' dự án, ' + (data.tasks || []).length + ' công việc' + (data.backend_version ? ' · backend v' + (data.backend_version / 10) : ''), size: 'lg', body: '<div data-pv></div>', buttons: [] });
    const draw = () => {
      plan = K.planDA(data, pick, c.daTasks);
      const ng = Object.keys(plan.nganh).sort((a, b) => plan.nganh[b] - plan.nganh[a]);
      $('[data-pv]', m.body).innerHTML = '<div class="fld"><span class="lb">Ngành, lĩnh vực cần đưa về (bỏ chọn những ngành Phòng không theo dõi)</span><div class="checks">' + ng.map(n => '<label class="check"><input type="checkbox" data-ng="' + e(n) + '"' + (!pick || pick.includes(n) ? ' checked' : '') + '> ' + e(K.nganhTen(n)) + ' (' + plan.nganh[n] + ')</label>').join('') + '</div></div>' + kq(plan.them, plan.sua, plan.giu) +
        '<div class="note mt">Tổng mức đầu tư ở nguồn tính bằng tỷ đồng, được quy đổi sang đồng. Tỷ lệ tiến độ tính theo đúng cách tính có trọng số mốc của phần mềm Dự án đầu tư. Mốc tiến độ ở nguồn không có ngày nên chưa vẽ được Gantt cho đến khi anh/chị bổ sung ngày tại đây (ngày bổ sung được giữ qua các lần đồng bộ).' + (c.daTasks ? ' Công việc gắn dự án: ' + plan.tk.them + ' thêm, ' + plan.tk.sua + ' cập nhật, ' + plan.tk.giu + ' không đổi.' : '') + (plan.boQua ? ' Bỏ qua ' + plan.boQua + ' dự án thuộc ngành không chọn.' : '') + '</div>' + vang(plan.vangMat, 'dự án') +
        '<div class="tbl-wrap mt" style="max-height:260px;overflow:auto"><table class="tbl"><thead><tr><th></th><th>Dự án</th><th>Lĩnh vực</th><th class="num">Tổng mức đầu tư</th><th class="num">Tiến độ</th></tr></thead><tbody>' + plan.items.filter(p => p.c === 'duan' && p.changed).slice(0, 200).map(p => '<tr><td>' + UI.chip(S.get('duan', p.rec.id) ? 'dang' : 'hoanthanh', S.get('duan', p.rec.id) ? 'Cập nhật' : 'Thêm') + '</td><td class="wrap">' + e(U.trunc(p.rec.ten, 110)) + '</td><td>' + e(p.rec.linhVuc) + '</td><td class="num">' + U.fmtMoney(p.rec.tmdt) + '</td><td class="num">' + p.rec.tienDo + '%</td></tr>').join('') + '</tbody></table></div>';
      $$('[data-ng]', m.body).forEach(cb => cb.onchange = () => { const all = $$('[data-ng]', m.body), on = all.filter(x => x.checked).map(x => x.dataset.ng); pick = on.length === all.length ? null : on; draw(); });
      m.setFooter([{ label: 'Hủy', on: a => a.close() }, { label: 'Đồng bộ ' + (plan.them + plan.sua) + ' dự án', cls: 'primary', icon: 'check', on: async a => { try { const del = $('[data-xoavang]', a.body) && $('[data-xoavang]', a.body).checked; if (del) await S.snapshot('Trước khi đồng bộ dự án'); await commit(del); a.close(); UI.toast('Đã đồng bộ: ' + plan.them + ' dự án thêm, ' + plan.sua + ' cập nhật.', 'ok'); } catch (er) { UI.fail(er); } } }]);
    };
    draw(); return plan;
  }
  async function pushDialog() {
    const list = K.pendingPush(), c = K.cfg();
    if (!list.length) { UI.toast('Không có gì cần ghi về Sheet: mọi nhiệm vụ đồng bộ đều khớp với Sheet.'); return; }
    if (!/^https?:\/\//i.test(c.nvUrl)) { UI.toast('Chưa nhập địa chỉ Web App (Apps Script) của phần mềm Điều hành nhiệm vụ.', 'bad'); return; }
    const NM = { ngay_hoan_thanh_iso: 'Ngày hoàn thành', so_cv_hoan_thanh: 'Số văn bản hoàn thành', delay_reason: 'Lý do chậm', nguoi_phu_trach: 'Người tham mưu' };
    UI.modal({
      title: 'Ghi kết quả về Google Sheet nhiệm vụ', sub: list.length + ' nhiệm vụ có thay đổi tại đây mà Sheet chưa có', size: 'lg',
      body: '<div class="note">Chỉ ghi vào ô đang trống hoặc chưa đổi kể từ lần đọc gần nhất. Nếu ô trên Sheet đã bị người khác sửa, Apps Script từ chối ghi ô đó và báo xung đột — không ghi đè.</div><div class="tbl-wrap mt" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th><input type="checkbox" data-all checked aria-label="Chọn tất cả"></th><th>Nhiệm vụ</th><th>Sẽ ghi</th></tr></thead><tbody>' + list.map((x, i) => '<tr><td><input type="checkbox" data-i="' + i + '" checked aria-label="Chọn"></td><td class="wrap">' + e(U.trunc(x.t.ten, 120)) + '<div class="t2">Dòng ' + x.t.ext.row + '</div></td><td>' + Object.keys(x.fields).map(f => '<div class="small"><b>' + NM[f] + ':</b> ' + e(x.fields[f]) + '</div>').join('') + '</td></tr>').join('') + '</tbody></table></div>',
      buttons: [{ label: 'Hủy', on: a => a.close() }, {
        label: 'Ghi về Sheet', cls: 'primary', icon: 'upload', on: async (a, btn) => {
          const sel = $$('[data-i]', a.body).filter(x => x.checked).map(x => list[+x.dataset.i]); if (!sel.length) { UI.toast('Chưa chọn nhiệm vụ nào.', 'bad'); return; }
          btn.disabled = true;
          try { const r = await K.pushNV(sel); a.close(); UI.toast('Đã ghi ' + r.ok + ' nhiệm vụ' + (r.conflict.length ? '; ' + r.conflict.length + ' có ô xung đột (Sheet đã đổi, không ghi đè)' : '') + (r.fail.length ? '; ' + r.fail.length + ' không tìm thấy dòng: ' + r.fail.slice(0, 2).map(f => f.msg).join('; ') : '') + '.', r.fail.length || r.conflict.length ? '' : 'ok'); } catch (er) { btn.disabled = false; UI.fail(er); }
        }
      }]
    });
    setTimeout(() => { const all = $('[data-all]'); if (all) all.onchange = () => $$('[data-i]').forEach(x => x.checked = all.checked); }, 50);
  }
  // Tự đồng bộ khi mở phần mềm (nếu bật): không hỏi, không xóa gì, chỉ thêm và cập nhật
  A.autoSync = async () => {
    const c = K.cfg(); if (!c.tuDong) return;
    const old = k => !c[k] || (Date.now() - new Date(c[k]).getTime()) > 60 * 60000, msgs = [];
    if (c.nvCsv && old('nvAt')) { try { const p = await syncNV(await K.fetchNV(), 'Google Sheet', true); msgs.push('nhiệm vụ: ' + p.them + ' thêm, ' + p.sua + ' cập nhật'); } catch (er) { msgs.push('nhiệm vụ lỗi (' + er.message + ')'); } }
    if (c.daUrl && old('daAt')) { try { const p = await syncDA(await K.fetchDA(), 'backend', true); msgs.push('dự án: ' + p.them + ' thêm, ' + p.sua + ' cập nhật'); } catch (er) { msgs.push('dự án lỗi (' + er.message + ')'); } }
    if (msgs.length) UI.toast('Tự đồng bộ — ' + msgs.join('; ') + '.');
  };

  A.views.ketnoi = {
    title: 'Kết nối phần mềm', sub: 'Đưa dữ liệu từ phần mềm Điều hành nhiệm vụ và phần mềm Dự án đầu tư về bảng điều hành chung của Phòng',
    render(root) {
      const c = K.cfg(), n = K.count(), pend = K.pendingPush().length;
      const inp = (id, label, val, ph, type, help) => '<div class="fld"><label for="' + id + '">' + label + '</label><input class="inp" id="' + id + '" type="' + (type || 'text') + '" value="' + e(val || '') + '" placeholder="' + e(ph || '') + '" autocomplete="off">' + (help ? '<div class="help">' + help + '</div>' : '') + '</div>';
      root.innerHTML = '<div class="note mb"><b>Cách ba phần mềm phối hợp.</b> Hai phần mềm sẵn có vẫn là nơi cập nhật chính: văn bản đến và nhiệm vụ nhập ở <i>Điều hành nhiệm vụ</i>; danh mục, mốc tiến độ dự án đầu tư của tỉnh nhập ở <i>Dự án đầu tư</i>. Phần mềm này kéo dữ liệu về để phân công, gắn với chức năng của Phòng, theo dõi vốn – ngân sách – tài sản và lên bảng điều hành, báo cáo chung. Bản ghi kéo về mang nhãn nguồn và có nút mở lại đúng phần mềm gốc.</div><div class="grid2">' +
        /* --- Nhiệm vụ --- */
        '<div class="card"><div class="card-h"><h3>Phần mềm Điều hành nhiệm vụ</h3><span class="grow"></span><a class="btn sm" href="' + e(c.nvApp) + '" target="_blank" rel="noopener">' + ic('link', 15) + 'Mở phần mềm</a><div class="sub">Đọc Google Sheet nhiệm vụ (link CSV đang dùng ở phần mềm đó); tùy chọn ghi kết quả hoàn thành ngược về Sheet</div></div><div class="card-b">' +
        '<div class="kpis mb"><div class="kpi acc static"><span class="k-l">Nhiệm vụ đã đồng bộ</span><span class="k-v">' + n.nv + '</span><span class="k-s">' + n.vb + ' văn bản giao việc</span></div><div class="kpi ' + (pend ? 'warn' : 'ok') + ' static"><span class="k-l">Chờ ghi về Sheet</span><span class="k-v">' + pend + '</span><span class="k-s">Hoàn thành tại đây, Sheet chưa có</span></div></div>' +
        '<div class="small muted mb">Lần đồng bộ gần nhất: ' + (c.nvAt ? U.fmtDateTime(c.nvAt) + ' — ' + e(c.nvStat || '') : 'chưa có') + '</div><div class="stack" style="gap:12px">' +
        inp('kn_nvcsv', 'Link CSV của Google Sheet nhiệm vụ', c.nvCsv, 'https://docs.google.com/spreadsheets/d/e/…/pub?gid=…&output=csv', 'text', 'Chép đúng link ở mục "Đồng bộ Google Sheet" của phần mềm Điều hành nhiệm vụ. Link dạng …/edit#gid=… cũng được, miễn là Sheet cho phép xem bằng link.') +
        '<div class="fld"><label for="kn_nvloc">Phạm vi lấy về</label><select class="sel" id="kn_nvloc"><option value="all"' + (c.nvLoc === 'all' ? ' selected' : '') + '>Tất cả các dòng trên Sheet</option><option value="phong"' + (c.nvLoc === 'phong' ? ' selected' : '') + '>Chỉ dòng giao Phòng KH-TC hoặc đã có người tham mưu</option></select></div>' +
        '<details><summary class="small" style="cursor:pointer;font-weight:600">Ghi ngược về Sheet (tùy chọn)</summary><div class="stack mt" style="gap:12px">' + inp('kn_nvurl', 'Địa chỉ Web App (Apps Script) của Sheet nhiệm vụ', c.nvUrl, 'https://script.google.com/macros/s/…/exec') + inp('kn_nvsec', 'Mã bí mật (MA_BI_MAT)', c.nvSecret, '', 'password') + '</div></details>' +
        inp('kn_nvapp', 'Địa chỉ mở phần mềm', c.nvApp, K.DEF.nvApp) + '</div>' +
        '<div class="gap mt"><button class="btn primary" data-do="nv">' + ic('sync', 16) + 'Kiểm tra và đồng bộ</button><button class="btn" data-do="nvfile">' + ic('upload', 16) + 'Nạp từ tệp CSV / Excel</button><button class="btn" data-do="nvpush"' + (pend ? '' : ' disabled') + '>' + ic('upload', 16) + 'Ghi kết quả về Sheet (' + pend + ')</button></div>' +
        '<div class="note mt"><b>Trường do Sheet quản lý</b> (ghi lại mỗi lần đồng bộ): nội dung nhiệm vụ, căn cứ văn bản, ngày giao, hạn, người tham mưu, lý do chậm, tình trạng hoàn thành. <b>Trường giữ tại đây:</b> nhóm chức năng, tiến độ %, kết quả, xin ý kiến lãnh đạo, liên kết dự án, tệp đính kèm. Sheet chưa ghi người tham mưu thì phân công tại đây được giữ và có thể ghi ngược về Sheet.</div></div></div>' +
        /* --- Dự án --- */
        '<div class="card"><div class="card-h"><h3>Phần mềm Dự án đầu tư tỉnh Sơn La</h3><span class="grow"></span><a class="btn sm" href="' + e(c.daApp) + '" target="_blank" rel="noopener">' + ic('link', 15) + 'Mở phần mềm</a><div class="sub">Chỉ đọc: lấy danh mục dự án, mốc tiến độ, công việc qua backend Apps Script bằng mã truy cập</div></div><div class="card-b">' +
        '<div class="kpis mb"><div class="kpi teal static"><span class="k-l">Dự án đã đồng bộ</span><span class="k-v">' + n.da + '</span><span class="k-s">' + (c.daNganh ? 'Lọc ' + c.daNganh.length + ' ngành' : 'Tất cả các ngành') + '</span></div><div class="kpi static"><span class="k-l">Công việc gắn dự án</span><span class="k-v">' + n.tk + '</span><span class="k-s">Vào nhóm 9 — nhiệm vụ khác</span></div></div>' +
        '<div class="small muted mb">Lần đồng bộ gần nhất: ' + (c.daAt ? U.fmtDateTime(c.daAt) + ' — ' + e(c.daStat || '') : 'chưa có') + '</div><div class="stack" style="gap:12px">' +
        inp('kn_daurl', 'Địa chỉ Web App (backend) của phần mềm dự án', c.daUrl, 'https://script.google.com/macros/s/…/exec', 'text', 'Chính là địa chỉ đang nhập ở "Cài đặt đồng bộ" của phần mềm Dự án đầu tư.') +
        inp('kn_datok', 'Mã truy cập', c.daToken, '', 'password', 'Nên tạo riêng một mã vai trò "xem" bằng hàm taoMaTruyCap cho phần mềm này. Phần mềm này không ghi gì vào dữ liệu dự án.') +
        '<label class="check" style="align-self:flex-start"><input type="checkbox" id="kn_datasks"' + (c.daTasks ? ' checked' : '') + '> Lấy cả công việc gắn dự án</label>' +
        inp('kn_daapp', 'Địa chỉ mở phần mềm', c.daApp, K.DEF.daApp) + '</div>' +
        '<div class="gap mt"><button class="btn primary" data-do="da">' + ic('sync', 16) + 'Kiểm tra và đồng bộ</button><button class="btn" data-do="dafile">' + ic('upload', 16) + 'Nạp từ tệp JSON sao lưu</button></div>' +
        '<div class="note mt"><b>Trường do phần mềm dự án quản lý:</b> tên, ngành, nhà đầu tư, địa điểm, tổng mức đầu tư, ngày dự kiến hoàn thành, mốc và tình trạng từng mốc, tỷ lệ tiến độ, vướng mắc. <b>Trường giữ tại đây:</b> cán bộ theo dõi (khi nguồn chưa ghi), ngày của từng mốc, kế hoạch vốn, gói thầu, nhiệm vụ và văn bản liên kết, kiến nghị, nguyên nhân chậm, hồ sơ.</div></div></div></div>' +
        '<div class="card mt"><div class="card-b"><label class="check"><input type="checkbox" id="kn_auto"' + (c.tuDong ? ' checked' : '') + '> Tự đồng bộ khi mở phần mềm (mỗi nguồn tối đa một lần mỗi giờ; chỉ thêm và cập nhật, không xóa)</label> <button class="btn sm" data-do="save">Lưu cấu hình kết nối</button><div class="small muted mt">Mã truy cập và mã bí mật được lưu trong trình duyệt của máy này và có trong tệp sao lưu JSON — giữ tệp sao lưu cẩn thận. Kết nối cần mạng; khi không có mạng, dữ liệu đã đồng bộ vẫn xem được bình thường.</div></div></div>';
      const read = () => ({ nvCsv: $('#kn_nvcsv', root).value.trim(), nvLoc: $('#kn_nvloc', root).value, nvUrl: $('#kn_nvurl', root).value.trim(), nvSecret: $('#kn_nvsec', root).value, nvApp: $('#kn_nvapp', root).value.trim() || K.DEF.nvApp, daUrl: $('#kn_daurl', root).value.trim(), daToken: $('#kn_datok', root).value, daTasks: $('#kn_datasks', root).checked, daApp: $('#kn_daapp', root).value.trim() || K.DEF.daApp, tuDong: $('#kn_auto', root).checked });
      UI.on(root, 'click', '[data-do]', async b => {
        const k = b.dataset.do, lbl = b.innerHTML;
        try {
          S.cfg.ketNoi = Object.assign({}, S.cfg.ketNoi || {}, read()); await S.adapter.setMeta('config', S.cfg);   // lưu lặng lẽ, không vẽ lại
          if (k === 'save') { UI.toast('Đã lưu cấu hình kết nối.', 'ok'); return; }
          b.disabled = true; b.textContent = 'Đang tải…';
          if (k === 'nv') await syncNV(await K.fetchNV(), 'Google Sheet');
          if (k === 'nvfile') { const f = await UI.pickFile('.csv,.xlsx,.xls'); if (f) { const rows = /\.csv$/i.test(f.name) ? K.csvRows(await f.text()) : (wb => XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames.find(s => U.norm(s).includes('nhiem vu')) || wb.SheetNames[0]], { header: 1, raw: false, defval: '' }))(await UI.readWorkbook(f)); await syncNV(rows, 'tệp ' + f.name); } }
          if (k === 'nvpush') await pushDialog();
          if (k === 'da') await syncDA(await K.fetchDA(), 'backend Apps Script');
          if (k === 'dafile') { const f = await UI.pickFile('.json,application/json'); if (f) { let o; try { o = JSON.parse(await f.text()); } catch (x) { throw new Error('Tệp không phải JSON hợp lệ.'); } await syncDA(K.readDAFile(o), 'tệp ' + f.name); } }
        } catch (er) { UI.fail(new Error(er.message + (/Failed to fetch|NetworkError/i.test(er.message) ? ' — không kết nối được. Kiểm tra mạng, địa chỉ, và quyền truy cập "Bất kỳ ai" của Web App / chế độ công bố của Sheet.' : ''))); }
        finally { b.disabled = k === 'nvpush' && !K.pendingPush().length; b.innerHTML = lbl; }
      });
    }
  };
})(App);
