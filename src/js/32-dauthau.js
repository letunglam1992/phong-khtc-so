/* ============================================================
   32-dauthau.js — Tổng hợp gói thầu, hợp đồng do Sở làm chủ đầu tư; việc cần xử lý, lịch hạn
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, Sc = A.Schema;

  L.dtLoc = f => {
    f = f || {};
    const okGT = g => (!f.duan || g.duAnId === f.duan) && (!f.cb || g.canBoId === f.cb) && (!f.nam || !g.qdKHNgay || +g.qdKHNgay.slice(0, 4) === +f.nam || ['nhucau', 'dutoan', 'trinhkh', 'khlcnt', 'danglcnt'].includes(g.trangThai || 'nhucau'));
    const gts = S.all('goithau').filter(okGT), ids = new Set(gts.map(g => g.id));
    const hds = S.all('hopdong').filter(h => (!f.duan || h.duAnId === f.duan) && (!f.cb || h.canBoId === f.cb) && (!f.nam || !h.goiThauId || ids.has(h.goiThauId) || !S.get('goithau', h.goiThauId)));
    return { gts, hds };
  };

  L.dtTong = f => {
    const { gts, hds } = L.dtLoc(f), gx = gts.map(g => ({ g, x: L.gt(g) })), hx = hds.map(h => ({ h, x: L.hd(h) }));
    const byTT = A.OPT.ttGT.map(o => ({ k: o[0], ten: o[1], n: gts.filter(g => (g.trangThai || 'nhucau') === o[0]).length, gia: U.sum(gts.filter(g => (g.trangThai || 'nhucau') === o[0]), g => g.giaGoiThau) }));
    const coKQ = gts.filter(g => U.num(g.giaTrung) > 0 && U.num(g.giaGoiThau) > 0);
    const tietKiem = U.sum(coKQ, g => U.num(g.giaGoiThau) - U.num(g.giaTrung)), giaCoKQ = U.sum(coKQ, g => g.giaGoiThau);
    const dang = hx.filter(o => (o.h.trangThai || 'dang') === 'dang');
    const o = {
      gts, hds, gx, hx, byTT,
      soGT: gts.length, giaGT: U.sum(gts, g => g.giaGoiThau), soChuaTC: gts.filter(g => ['nhucau', 'dutoan', 'trinhkh', 'khlcnt'].includes(g.trangThai || 'nhucau')).length,
      soDangLC: gts.filter(g => g.trangThai === 'danglcnt').length, soCoKQ: gts.filter(g => ['cokq', 'dakyhd'].includes(g.trangThai)).length,
      giaTrung: U.sum(gts, g => g.giaTrung), tietKiem, tyLeTK: U.pct(tietKiem, giaCoKQ),
      soHD: hds.length, soHDDang: dang.length, giaHD: U.sum(hx, o => o.x.giaTriHL), daTT: U.sum(hx, o => o.x.thanhToan), daNT: U.sum(hx, o => o.x.nghiemThu),
      tamUngCon: U.sum(hx, o => o.x.tamUngCon), conPhaiTT: U.sum(hx.filter(o => o.h.trangThai !== 'chamdut'), o => Math.max(0, o.x.conLai)),
      quaHanLC: gx.filter(o => o.x.over).length, quaHanHD: hx.filter(o => o.x.over).length, sapHetHD: hx.filter(o => o.x.near).length,
      chuaTL: hx.filter(o => o.x.chuaThanhLy).length, chuaHD: gx.filter(o => o.x.chuaHD).length,
      blCanhBao: hx.reduce((s, o) => s + o.x.canhBao.filter(c => /Bảo/.test(c.t)).length, 0)
    };
    o.tyLeTT = U.pct(o.daTT, o.giaHD);
    return o;
  };

  // Danh sách việc cần xử lý về đấu thầu, hợp đồng (sắp theo mức độ)
  L.dtViec = f => {
    const t = L.dtTong(f), out = [], add = (sev, title, detail, coll, id) => out.push({ sev, loai: coll === 'hopdong' ? 'hopdong' : 'dauthau', title, detail, coll, id });
    t.gx.forEach(({ g, x }) => {
      const ten = 'Gói thầu: ' + U.trunc(g.ten, 90);
      if (x.over) add(3, ten, x.note + ' (hạn ' + U.fmtDate(g.hanLCNT) + ')', 'goithau', g.id);
      else if (x.near) add(2, ten, x.note, 'goithau', g.id);
      if (x.chuaHD) add(2, ten, 'Đã có kết quả lựa chọn nhà thầu, chưa nhập hợp đồng', 'goithau', g.id);
      if ((g.trangThai || 'nhucau') === 'khlcnt' && !g.hanLCNT && !g.tgBatDauLCNT) add(1, ten, 'Đã phê duyệt KHLCNT nhưng chưa ghi thời gian bắt đầu tổ chức lựa chọn nhà thầu', 'goithau', g.id);
    });
    t.hx.forEach(({ h, x }) => {
      const ten = 'Hợp đồng ' + (h.so || '') + (h.ten ? ': ' + U.trunc(h.ten, 80) : '');
      if (x.over) add(3, ten, x.note + ' (hạn ' + U.fmtDate(x.han) + (x.giaHan ? ', đã gia hạn' : '') + ')', 'hopdong', h.id);
      else if (x.near) add(2, ten, x.note + ' (hạn ' + U.fmtDate(x.han) + ')', 'hopdong', h.id);
      if (x.chuaThanhLy) add(1, ten, x.note, 'hopdong', h.id);
      x.canhBao.forEach(c => add(c.sev, ten, c.t, 'hopdong', h.id));
    });
    return out.sort((a, b) => b.sev - a.sev);
  };

  // Lịch các mốc hạn trong n ngày tới (kể cả đã quá hạn chưa xử lý)
  L.dtLich = (f, n) => {
    const t = L.dtTong(f), today = U.today(), den = U.addDays(today, n || 60), out = [];
    const push = (d, loai, ten, coll, id) => { if (U.isISO(d) && d <= den) out.push({ d, loai, ten, coll, id, qua: d < today }); };
    t.gx.forEach(({ g }) => { if (['nhucau', 'dutoan', 'trinhkh', 'khlcnt', 'danglcnt'].includes(g.trangThai || 'nhucau')) push(g.hanLCNT, 'Hạn lựa chọn nhà thầu', g.ten, 'goithau', g.id); });
    t.hx.forEach(({ h, x }) => {
      const xong = ['thanhly', 'chamdut'].includes(h.trangThai);
      if ((h.trangThai || 'dang') === 'dang') push(x.han, 'Hết thời hạn hợp đồng', (h.so || '') + ' ' + (h.ten || ''), 'hopdong', h.id);
      if (!xong) push(h.baoLanhTHHan, 'Hết hiệu lực bảo đảm thực hiện HĐ', (h.so || '') + ' ' + (h.ten || ''), 'hopdong', h.id);
      if (!xong && x.tamUngCon > 0.5) push(h.baoLanhTUHan, 'Hết hiệu lực bảo lãnh tạm ứng', (h.so || '') + ' ' + (h.ten || ''), 'hopdong', h.id);
    });
    return out.sort((a, b) => a.d < b.d ? -1 : 1);
  };
})(App);
/* Liên kết nguồn kinh phí (dòng dự toán) ↔ gói thầu ↔ hợp đồng */
(function (A) {
  const U = A.U, S = A.Store, L = A.L;
  L.hdNsId = h => h.nsId || ((S.get('goithau', h.goiThauId) || {}).nsId) || '';
  L.nsLienKet = nsId => {
    const r = S.get('ngansach', nsId); if (!r) return null;
    const gts = S.all('goithau').filter(g => g.nsId === nsId), hds = S.all('hopdong').filter(h => L.hdNsId(h) === nsId), hx = hds.map(h => ({ h, x: L.hd(h) }));
    const node = L.nsTree(+r.nam, r.donViId).flat.find(n => n.r.id === nsId), tong = node ? node.sum.tong : L.nsTong(r), gn = node ? node.sum.giaiNgan : U.num(r.giaiNgan);
    const o = { r, gts, hds, hx, tong, gn, giaGT: U.sum(gts.filter(g => g.trangThai !== 'huy'), g => g.giaGoiThau), giaHD: U.sum(hx.filter(o => o.h.trangThai !== 'chamdut'), o => o.x.giaTriHL), daTT: U.sum(hx, o => o.x.thanhToan), canhBao: [] };
    o.chuaBoTri = o.tong - Math.max(o.giaHD, U.sum(gts.filter(g => !['dakyhd', 'huy'].includes(g.trangThai)), g => U.num(g.giaTrung) || U.num(g.giaGoiThau)) + o.giaHD);
    if (o.giaHD > o.tong + 0.5) o.canhBao.push({ sev: 3, t: 'Tổng giá trị hợp đồng (' + U.fmtShort(o.giaHD) + ') vượt kinh phí được sử dụng của dòng dự toán (' + U.fmtShort(o.tong) + ')' });
    else if (o.giaGT > o.tong + 0.5) o.canhBao.push({ sev: 2, t: 'Tổng giá gói thầu (' + U.fmtShort(o.giaGT) + ') vượt kinh phí được sử dụng (' + U.fmtShort(o.tong) + ')' });
    if (o.daTT > o.gn + 0.5) o.canhBao.push({ sev: 1, t: 'Đã thanh toán hợp đồng ' + U.fmtShort(o.daTT) + ' nhưng số giải ngân của dòng dự toán mới ' + U.fmtShort(o.gn) + ' — cần cập nhật số giải ngân' });
    return o;
  };
  // Đưa cảnh báo nguồn kinh phí vào danh sách việc cần xử lý đấu thầu
  const base = L.dtViec;
  L.dtViec = f => {
    const out = base(f), ids = new Set(L.dtLoc(f).gts.map(g => g.nsId).concat(L.dtLoc(f).hds.map(L.hdNsId)).filter(Boolean));
    ids.forEach(id => { const lk = L.nsLienKet(id); if (lk) lk.canhBao.forEach(c => out.push({ sev: c.sev, loai: 'dauthau', title: 'Nguồn kinh phí: ' + U.trunc(A.Schema.C.ngansach.title(lk.r), 90), detail: c.t, coll: 'ngansach', id })); });
    return out.sort((a, b) => b.sev - a.sev);
  };
})(App);
