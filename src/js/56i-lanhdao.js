/* ============================================================
   56i-lanhdao.js — Trang tóm tắt cho lãnh đạo (mục 8): một màn hình gọn, đọc trên điện thoại.
   Tỷ lệ giải ngân toàn Sở, theo đơn vị (chậm nhất trước), nội dung còn nhiều kinh phí, việc đấu thầu, hợp đồng quá hạn.
   Chỉ đọc số liệu đã có; tài khoản "chỉ xem" mở phần mềm vào thẳng trang này.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const fs = U.fmtShort, pct = v => v === null || v === undefined ? '—' : U.fmtPct(v);

  A.views.lanhdao = {
    title: 'Tóm tắt cho lãnh đạo', sub: 'Giải ngân, đấu thầu, hợp đồng — số liệu đã cập nhật trong phần mềm',
    render(root) {
      const y = A.year(), g = L.giaiNgan(y, {}), dvs = L.nsByDonVi(y), cm = L.nsTyLeCM ? L.nsTyLeCM(g.leaves) : null;
      const dong = L.gnDong(y, {}), cham = dong.filter(x => x.cham).sort((a, b) => b.con - a.con).slice(0, 5);
      const gts = S.all('goithau'), hds = S.all('hopdong'), gx = gts.map(x => ({ g: x, o: L.gt(x) })), hx = hds.map(h => ({ h, o: L.hd(h) }));
      const qhLCNT = gx.filter(x => x.o.over), qhHD = hx.filter(x => x.o.over), sapHD = hx.filter(x => x.o.near), chuaTL = hx.filter(x => x.o.chuaThanhLy);
      const muc = g.lech >= 0 ? 'ok' : g.lech > -10 ? 'warn' : 'bad';
      let h = '<div class="ld">';
      h += '<div class="small soft mb">Năm ' + y + ' · số liệu giải ngân đến <b>' + U.fmtDate(g.asOf) + '</b></div>';
      h += '<div class="ld-big ' + muc + '"><div class="ld-v">' + pct(g.tyLe) + '</div><div class="ld-l">đã giải ngân toàn Sở</div><div class="ld-s">' + fs(g.gn) + ' / ' + fs(g.tong) + ' · còn ' + fs(g.conLai) + '</div>' +
        '<div class="ld-s">' + (g.mt.tuDat ? 'Mục tiêu tháng ' + g.thang + ': ' + pct(g.mtNay) : 'Tỷ lệ thời gian đã qua: ' + pct(g.tyLeTG)) + ' · ' + (g.lech >= 0 ? 'vượt ' : 'chậm ') + U.fmtNum(Math.abs(g.lech), 1) + ' điểm %' + (cm && cm.ty !== null ? ' · nhiệm vụ chuyên môn ' + pct(cm.ty) : '') + '</div></div>';
      // Theo đơn vị: chậm nhất trước
      const ds = dvs.filter(x => x.total.tong > 0).sort((a, b) => (a.total.tyLe || 0) - (b.total.tyLe || 0));
      h += '<h3 class="ld-h">Giải ngân theo đơn vị</h3><div class="ld-list">' + ds.map(x => '<button class="ld-row" data-dv="' + e(x.dv.id) + '"><span class="ld-t">' + e(x.dv.tenTat || x.dv.ten) + '<span class="ld-s">' + fs(x.total.giaiNgan) + ' / ' + fs(x.total.tong) + '</span></span><span class="ld-p">' + UI.pbar(x.total.tyLe || 0, (x.total.tyLe || 0) < (g.mt.tuDat ? g.mtNay : g.tyLeTG) - 10 ? 'bad' : '') + '</span></button>').join('') + '</div>';
      // Nội dung chậm, còn nhiều kinh phí
      h += '<h3 class="ld-h">5 nội dung chậm còn nhiều kinh phí nhất</h3>' + (cham.length ? '<div class="ld-list">' + cham.map(x => '<button class="ld-row" data-ns="' + e(x.r.id) + '"><span class="ld-t">' + e(U.trunc(x.r.noiDung, 90)) + '<span class="ld-s">' + e(Sc.refName('donvi', x.r.donViId)) + ' · còn ' + fs(x.con) + '</span></span><span class="ld-n">' + pct(x.ty) + '</span></button>').join('') + '</div>' : '<p class="small soft">Không có nội dung giải ngân chậm.</p>');
      // Đấu thầu, hợp đồng
      const the = (n, l, cls) => '<div class="ld-k ' + (n ? cls : 'ok') + '"><b>' + n + '</b><span>' + l + '</span></div>';
      h += '<h3 class="ld-h">Đấu thầu, hợp đồng</h3><div class="ld-ks">' + the(qhLCNT.length, 'gói quá hạn lựa chọn nhà thầu', 'bad') + the(qhHD.length, 'hợp đồng quá hạn', 'bad') + the(sapHD.length, 'hợp đồng sắp hết hạn', 'warn') + the(chuaTL.length, 'hợp đồng nghiệm thu chưa thanh lý', 'warn') + '</div>';
      const viec = qhLCNT.map(x => ({ t: x.g.ten, s: x.o.note, c: 'goithau', id: x.g.id })).concat(qhHD.map(x => ({ t: (x.h.so || '') + ' — ' + (x.h.ten || x.h.nhaThau || ''), s: x.o.note, c: 'hopdong', id: x.h.id }))).slice(0, 6);
      if (viec.length) h += '<div class="ld-list mt">' + viec.map(v => '<button class="ld-row" data-open="' + v.c + ':' + e(v.id) + '"><span class="ld-t">' + e(U.trunc(v.t, 90)) + '<span class="ld-s" style="color:var(--bad-fg)">' + e(v.s || '') + '</span></span></button>').join('') + '</div>';
      // Cuối năm
      const cn = g.leaves.filter(n => n.r.cuoiNamXL && n.r.cuoiNamXL !== 'tiep'), tien = k => U.sum(cn.filter(n => n.r.cuoiNamXL === k), n => U.num(n.r.cuoiNamTien || n.sum.conLai));
      if (cn.length) h += '<h3 class="ld-h">Đề xuất xử lý cuối năm</h3><div class="ld-ks">' + the(fs(tien('chuyennguon')), 'đề nghị chuyển nguồn', 'info') + the(fs(tien('huy')), 'hủy dự toán', 'warn') + the(fs(tien('thuhoi')), 'thu hồi', 'warn') + '</div>';
      h += '<div class="gap mt mb"><button class="btn" data-full>' + ic('home', 16) + 'Mở bảng điều hành đầy đủ</button></div></div>';
      root.innerHTML = h;
      UI.on(root, 'click', '[data-dv]', b => { A.vs.nsSel = Object.assign(A.vs.nsSel || {}, { dv: b.dataset.dv, tab: 'tq' }); A.go('ngansach'); });
      UI.on(root, 'click', '[data-ns]', b => A.open('ngansach', b.dataset.ns));
      UI.on(root, 'click', '[data-open]', b => { const [c, id] = b.dataset.open.split(':'); A.open(c, id); });
      $('[data-full]', root).onclick = () => A.go('tongquan');
    }
  };
})(App);
