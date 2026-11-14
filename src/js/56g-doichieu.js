/* ============================================================
   56g-doichieu.js — Đối chiếu số giải ngân của dòng dự toán với thanh toán hợp đồng gắn nguồn
   (chỗ dành sẵn cho số Kho bạc khi có mục nhập bảng đối chiếu KBNN).
   Chỉ so sánh, không tự sửa. Mỗi dòng chênh lệch có thể ghi giải trình; giải trình hết hiệu lực khi số chênh thay đổi.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const fs = U.fmtShort, SAI_SO = 1000;   // chênh dưới 1.000 đồng coi là khớp (làm tròn)
  const tenNS = r => (r.stt ? r.stt + ' ' : '') + r.noiDung;

  // o: { dv, tamUng: true/false } → { rows, hdKhongNguon, tong }
  L.doiChieu = (y, o) => {
    o = o || {};
    const la = L.gnLeaves(y, { dv: o.dv }), by = {};
    la.forEach(n => { by[n.r.id] = { r: n.r, gn: n.sum.giaiNgan, tong: n.sum.tong, ngay: n.r.ngayGN || '', hds: [], tt: 0, ttSau: 0, tu: 0 }; });
    const hdKhongNguon = [];
    S.all('hopdong').forEach(h => {
      const id = L.hdNsId(h);
      if (!id) { if ((h.thanhToan || []).some(t => +String(t.ngay || '').slice(0, 4) === y) || U.num(h.tamUng) > 0) hdKhongNguon.push(h); return; }
      const d = by[id]; if (!d) return;
      const ttNam = (h.thanhToan || []).filter(t => +String(t.ngay || '').slice(0, 4) === y);
      const den = d.ngay || U.today();
      const tt = U.sum(ttNam.filter(t => !t.ngay || t.ngay <= den), t => t.soTien), sau = U.sum(ttNam.filter(t => t.ngay && t.ngay > den), t => t.soTien);
      const tu = Math.max(0, U.num(h.tamUng) - U.num(h.tamUngThuHoi));
      d.hds.push({ h, tt, sau, tu }); d.tt += tt; d.ttSau += sau; d.tu += tu;
    });
    const rows = Object.values(by).map(d => {
      const daChi = d.tt + (o.tamUng !== false ? d.tu : 0), chenh = d.gn - daChi, coHD = d.hds.length > 0;
      let st, sev;
      if (!coHD) { st = 'khonghd'; sev = 0; }
      else if (Math.abs(chenh) < SAI_SO) { st = 'khop'; sev = 0; }
      else if (chenh < 0) { st = 'thieu'; sev = 3; }   // thanh toán HĐ nhiều hơn số giải ngân của dòng
      else { st = 'du'; sev = 1; }                    // giải ngân nhiều hơn thanh toán HĐ (có thể có khoản chi ngoài HĐ)
      const gt = d.r.dcGiaiTrinh, conHieuLuc = gt && Math.abs(U.num(gt.chenh) - chenh) < SAI_SO;
      return Object.assign(d, { daChi, chenh, st, sev, giaiTrinh: conHieuLuc ? gt : null, giaiTrinhCu: gt && !conHieuLuc ? gt : null });
    });
    const coHD = rows.filter(x => x.hds.length);
    return { rows, hdKhongNguon, tong: { gn: U.sum(coHD, x => x.gn), tt: U.sum(coHD, x => x.tt), tu: U.sum(coHD, x => x.tu), daChi: U.sum(coHD, x => x.daChi) } };
  };

  const NHAN = { thieu: ['quahan', 'Thanh toán HĐ > giải ngân'], du: ['saphan', 'Giải ngân > thanh toán HĐ'], khop: ['hoanthanh', 'Khớp'], khonghd: ['chua', 'Không có HĐ gắn nguồn'] };
  A.gnDoiChieu = (box, y, Sel) => {
    const T = A.vs.dc || (A.vs.dc = { loc: 'lech', tamUng: true }), kq = L.doiChieu(y, { dv: Sel.dv, tamUng: T.tamUng });
    const dem = k => kq.rows.filter(x => x.st === k).length, chuaGT = kq.rows.filter(x => (x.st === 'thieu' || x.st === 'du') && !x.giaiTrinh);
    let ds = kq.rows.slice();
    if (T.loc === 'lech') ds = ds.filter(x => x.st === 'thieu' || x.st === 'du'); else if (T.loc === 'chuagt') ds = chuaGT; else if (T.loc === 'cohd') ds = ds.filter(x => x.hds.length);
    ds.sort((a, b) => b.sev - a.sev || Math.abs(b.chenh) - Math.abs(a.chenh));
    const kp = (c, l, v, s) => '<div class="kpi ' + c + ' static"><span class="k-l">' + l + '</span><span class="k-v">' + v + '</span><span class="k-s">' + (s || '&nbsp;') + '</span></div>';
    let h = '<div class="note small mb">So sánh <b>số giải ngân</b> của từng dòng dự toán (theo biểu, đến ngày số liệu) với <b>số đã thanh toán các hợp đồng gắn nguồn</b> trong năm ' + y + ' tính đến cùng ngày' + (T.tamUng ? ', cộng <b>tạm ứng còn dư</b>' : '') + '. Chênh dưới 1.000 đồng coi là khớp. Số Kho bạc sẽ được thêm vào khi có chức năng nhập bảng đối chiếu KBNN. Phần mềm chỉ chỉ ra chênh lệch, không tự sửa số.</div>' +
      '<div class="toolbar"><div class="seg">' + [['lech', 'Có chênh lệch'], ['chuagt', 'Chưa giải trình'], ['cohd', 'Dòng có HĐ'], ['tat', 'Tất cả']].map(s => '<button data-loc="' + s[0] + '" class="' + (T.loc === s[0] ? 'on' : '') + '">' + s[1] + '</button>').join('') + '</div><label class="check small"><input type="checkbox" data-tu' + (T.tamUng ? ' checked' : '') + '> Tính tạm ứng còn dư vào số đã chi</label><span class="sp"></span><button class="btn" data-xls>' + ic('download', 16) + 'Xuất bảng đối chiếu</button></div>' +
      '<div class="kpis mb">' + kp(dem('thieu') ? 'bad' : 'ok', 'Thanh toán HĐ lớn hơn giải ngân', dem('thieu'), 'Số giải ngân chưa cập nhật hoặc thanh toán ghi sai nguồn') + kp(dem('du') ? 'warn' : 'ok', 'Giải ngân lớn hơn thanh toán HĐ', dem('du'), 'Có thể có khoản chi ngoài hợp đồng') + kp('ok', 'Khớp', dem('khop'), dem('khonghd') + ' dòng không có HĐ gắn nguồn') + kp(chuaGT.length ? 'warn' : 'ok', 'Chưa giải trình', chuaGT.length, 'Trong các dòng có chênh lệch') +
      kp(kq.hdKhongNguon.length ? 'bad' : 'ok', 'HĐ có thanh toán, chưa gắn nguồn', kq.hdKhongNguon.length, kq.hdKhongNguon.length ? 'Không đối chiếu được — cần gắn nguồn' : '') + '</div>';
    if (kq.hdKhongNguon.length) h += '<div class="note warn mb"><b>' + kq.hdKhongNguon.length + ' hợp đồng có thanh toán hoặc tạm ứng nhưng chưa gắn nguồn kinh phí:</b> ' + kq.hdKhongNguon.slice(0, 8).map(x => '<a href="#" data-hd="' + x.id + '">' + e(x.so || x.ten || 'HĐ') + '</a>').join(', ') + (kq.hdKhongNguon.length > 8 ? '…' : '') + '</div>';
    h += ds.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nội dung dự toán</th><th>Số liệu đến</th><th class="num">Giải ngân (biểu)</th><th class="num">Thanh toán HĐ</th><th class="num">Tạm ứng còn dư</th><th class="num">Chênh lệch</th><th>Kết quả</th><th>Giải trình</th></tr></thead><tbody>' +
      ds.map(x => '<tr data-id="' + x.r.id + '"><td class="wrap" style="min-width:240px"><a href="#" data-ns="' + x.r.id + '">' + e(U.trunc(tenNS(x.r), 100)) + '</a>' + x.hds.map(o => '<div class="t2">HĐ <a href="#" data-hd="' + o.h.id + '">' + e(o.h.so || '') + '</a> · TT ' + fs(o.tt) + (o.tu ? ' · TƯ dư ' + fs(o.tu) : '') + (o.sau ? ' · <span style="color:var(--warn-fg)">' + fs(o.sau) + ' thanh toán sau ngày số liệu</span>' : '') + '</div>').join('') + '</td><td class="nowrap small">' + (x.ngay ? U.fmtDate(x.ngay) : '—') + '</td><td class="num">' + U.fmtMoney(x.gn) + '</td><td class="num">' + (x.hds.length ? U.fmtMoney(x.tt) : '—') + '</td><td class="num">' + (x.hds.length ? U.fmtMoney(x.tu) : '—') + '</td><td class="num"><b' + (x.st === 'thieu' ? ' style="color:var(--bad-fg)"' : '') + '>' + (x.hds.length ? (x.chenh > 0 ? '+' : '') + U.fmtMoney(x.chenh) : '—') + '</b></td><td>' + UI.chip(NHAN[x.st][0], NHAN[x.st][1]) + '</td><td class="small" style="min-width:180px">' +
        (x.st === 'thieu' || x.st === 'du' ? (x.giaiTrinh ? '<div>' + e(U.trunc(x.giaiTrinh.noiDung, 120)) + '</div><div class="t2">' + e(x.giaiTrinh.by || '') + ' · ' + U.fmtDate(String(x.giaiTrinh.at || '').slice(0, 10)) + ' <a href="#" data-gt="' + x.r.id + '">sửa</a></div>' : (x.giaiTrinhCu ? '<div class="t2" style="color:var(--warn-fg)">Giải trình cũ hết hiệu lực (chênh lệch đã đổi)</div>' : '') + '<button class="btn sm" data-gt="' + x.r.id + '">Ghi giải trình</button>') : '') + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td>Cộng các dòng có HĐ</td><td></td><td class="num">' + U.fmtMoney(kq.tong.gn) + '</td><td class="num">' + U.fmtMoney(kq.tong.tt) + '</td><td class="num">' + U.fmtMoney(kq.tong.tu) + '</td><td class="num">' + U.fmtMoney(kq.tong.gn - kq.tong.daChi) + '</td><td colspan="2"></td></tr></tfoot></table></div>' : '<div class="card">' + UI.empty(T.loc === 'lech' || T.loc === 'chuagt' ? 'Không có dòng chênh lệch' + (T.loc === 'chuagt' ? ' chưa giải trình' : '') : 'Không có dòng phù hợp', T.loc === 'lech' ? 'Số giải ngân của các dòng có hợp đồng gắn nguồn khớp với số đã thanh toán.' : '') + '</div>';
    box.innerHTML = h;
    $$('[data-loc]', box).forEach(b => b.onclick = () => { T.loc = b.dataset.loc; A.gnDoiChieu(box, y, Sel); });
    $('[data-tu]', box).onchange = x => { T.tamUng = x.target.checked; A.gnDoiChieu(box, y, Sel); };
    UI.on(box, 'click', '[data-ns]', (b, x) => { x.preventDefault(); A.open('ngansach', b.dataset.ns); });
    UI.on(box, 'click', '[data-hd]', (b, x) => { x.preventDefault(); A.open('hopdong', b.dataset.hd); });
    UI.on(box, 'click', '[data-gt]', (b, x) => {
      x.preventDefault(); const d = kq.rows.find(z => z.r.id === b.dataset.gt); if (!d) return;
      const cu = d.giaiTrinh || d.giaiTrinhCu || {};
      const m = UI.modal({ title: 'Giải trình chênh lệch', sub: U.trunc(tenNS(d.r), 100), body: '<p class="small soft">Giải ngân ' + U.fmtMoney(d.gn) + ' − đã chi qua hợp đồng ' + U.fmtMoney(d.daChi) + ' = <b>' + (d.chenh > 0 ? '+' : '') + U.fmtMoney(d.chenh) + ' đồng</b>. Giải trình gắn với số chênh này; khi số liệu thay đổi làm chênh lệch khác đi, cần giải trình lại.</p><div class="fld"><label for="gt_nd">Nội dung giải trình</label><textarea class="inp" id="gt_nd" rows="4" placeholder="Ví dụ: khoản 120 triệu chi công tác phí, không qua hợp đồng; thanh toán HĐ đợt 2 Kho bạc chưa hạch toán…">' + e(cu.noiDung || '') + '</textarea></div>',
        buttons: [{ label: 'Hủy', on: a => a.close() }].concat(d.giaiTrinh ? [{ label: 'Xóa giải trình', cls: 'ghost', on: async a => { await S.save('ngansach', { id: d.r.id, dcGiaiTrinh: null }, { note: 'Xóa giải trình chênh lệch đối chiếu' }); a.close(); A.gnDoiChieu(box, y, Sel); } }] : []).concat([{ label: 'Lưu giải trình', cls: 'primary', on: async a => {
          const nd = $('#gt_nd', m.body).value.trim(); if (nd.length < 5) { UI.toast('Nhập nội dung giải trình.', 'bad'); return; }
          try { await S.save('ngansach', { id: d.r.id, dcGiaiTrinh: { noiDung: nd, chenh: d.chenh, at: U.nowStamp(), by: S.user() } }, { note: 'Giải trình chênh lệch đối chiếu ' + U.fmtMoney(d.chenh) + ' đồng' }); a.close(); UI.toast('Đã lưu giải trình.', 'ok'); A.gnDoiChieu(box, y, Sel); } catch (er) { UI.fail(er); }
        } }])
      });
    });
    $('[data-xls]', box).onclick = () => {
      const aoa = [['BẢNG ĐỐI CHIẾU SỐ GIẢI NGÂN VỚI THANH TOÁN HỢP ĐỒNG NĂM ' + y], ['Lập ngày ' + U.fmtDate(U.today()) + (T.tamUng ? ' — số đã chi gồm thanh toán và tạm ứng còn dư' : ' — số đã chi chỉ gồm thanh toán')], [], ['TT', 'Nội dung dự toán', 'Đơn vị', 'Số liệu đến ngày', 'Giải ngân (biểu)', 'Thanh toán HĐ', 'Tạm ứng còn dư', 'Chênh lệch', 'Kết quả', 'Hợp đồng', 'Giải trình']];
      kq.rows.filter(x => x.hds.length).sort((a, b) => b.sev - a.sev).forEach((x, i) => aoa.push([i + 1, tenNS(x.r), Sc.refName('donvi', x.r.donViId), U.fmtDate(x.ngay), x.gn, x.tt, x.tu, x.chenh, NHAN[x.st][1], x.hds.map(o => o.h.so).join('; '), x.giaiTrinh ? x.giaiTrinh.noiDung : '']));
      aoa.push(['', 'CỘNG', '', '', kq.tong.gn, kq.tong.tt, kq.tong.tu, kq.tong.gn - kq.tong.daChi]);
      if (kq.hdKhongNguon.length) { aoa.push([]); aoa.push(['', 'Hợp đồng có thanh toán, tạm ứng nhưng chưa gắn nguồn kinh phí:']); kq.hdKhongNguon.forEach(h => aoa.push(['', (h.so || '') + ' ' + (h.ten || ''), '', '', '', U.sum(h.thanhToan || [], t => t.soTien)])); }
      UI.xlsx('doi-chieu-giai-ngan-' + y + '-' + UI.stamp() + '.xlsx', [{ name: 'Doi chieu ' + y, aoa, widths: [5, 60, 18, 12, 17, 17, 17, 17, 22, 24, 50] }]);
    };
  };
})(App);
