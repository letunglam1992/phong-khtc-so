/* ============================================================
   31-giaingan.js — Theo dõi, dự báo tiến độ giải ngân dự toán NSNN
   Mỗi dòng dự toán chi tiết lưu lịch sử lũy kế giải ngân gnHist: [{ngay, giaiNgan, nguon, by}]
   (số lũy kế từ đầu năm tính đến ngày). Mọi chuỗi thời gian, dự báo đều tính từ lịch sử này.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, Sc = A.Schema;

  /* ---------- Lịch sử giải ngân ---------- */
  // Thêm 1 mốc vào lịch sử (thay mốc cùng ngày). Trả về mảng mới, sắp theo ngày.
  L.gnPush = (hist, ngay, giaiNgan, nguon) => {
    const h = (hist || []).filter(x => x.ngay !== ngay);
    h.push({ ngay, giaiNgan: U.num(giaiNgan), nguon: nguon || 'tay', by: S.user() });
    return h.sort((a, b) => a.ngay < b.ngay ? -1 : 1);
  };
  // Lịch sử của 1 dòng; dòng cũ chưa có lịch sử thì dùng số hiện tại tại ngày ngayGN (nếu có)
  L.gnHistOf = r => {
    const h = (r.gnHist || []).filter(x => U.isISO(x.ngay));
    if (!h.length && U.num(r.giaiNgan) && U.isISO(r.ngayGN)) return [{ ngay: r.ngayGN, giaiNgan: U.num(r.giaiNgan), nguon: 'goc' }];
    return h;
  };
  // Lũy kế của 1 dòng tại ngày d: mốc gần nhất ≤ d
  const valAt = (h, d) => { let v = 0; for (const x of h) { if (x.ngay <= d) v = x.giaiNgan; else break; } return v; };

  Sc.C.ngansach.normalize = r => {
    const old = r.id ? S.get('ngansach', r.id) : null;
    if (!old) { if (U.num(r.giaiNgan)) r.gnHist = L.gnPush([], U.isISO(r.ngayGN) ? r.ngayGN : U.today(), r.giaiNgan, 'tay'); return; }
    if (U.num(old.giaiNgan) !== U.num(r.giaiNgan) || (r.ngayGN && r.ngayGN !== old.ngayGN)) {
      const base = old.gnHist && old.gnHist.length ? old.gnHist : L.gnHistOf(old);
      r.gnHist = L.gnPush(base, U.isISO(r.ngayGN) ? r.ngayGN : U.today(), r.giaiNgan, 'tay');
    }
  };

  /* ---------- Dòng chi tiết trong phạm vi ---------- */
  // Dòng lá (không có dòng con) của năm, lọc theo đơn vị / cán bộ
  L.gnLeaves = (nam, f) => {
    f = f || {};
    const t = L.nsTree(nam, f.dv || null);
    return t.flat.filter(n => !n.children.length && (!f.cb || (f.cb === '__none' ? !n.r.canBoId : n.r.canBoId === f.cb)));
  };

  /* ---------- Mục tiêu giải ngân lũy kế theo tháng (% kế hoạch) ----------
     Do Phòng tự đặt tại Thiết lập (theo chỉ đạo của UBND tỉnh/Sở từng năm). Chưa đặt: lấy tỷ lệ thời gian trôi qua. */
  L.gnMucTieu = nam => {
    const m = (S.cfg.gnMucTieu || {})[nam];
    if (Array.isArray(m) && m.length === 12 && m.some(v => U.num(v) > 0)) return { vals: m.map(v => U.num(v)), tuDat: true };
    return { vals: Array.from({ length: 12 }, (_, i) => Math.round((i + 1) / 12 * 1000) / 10), tuDat: false };
  };
  const monthEnd = (y, m) => y + '-' + U.pad(m) + '-' + U.pad(U.lastDayOfMonth(y, m));

  /* ---------- Tổng hợp tiến độ, dự báo ---------- */
  L.giaiNgan = (nam, f) => {
    const today = U.today(), cy = +today.slice(0, 4);
    const leaves = L.gnLeaves(nam, f), hs = leaves.map(n => ({ n, h: L.gnHistOf(n.r) }));
    const tong = U.sum(leaves, n => n.sum.tong), gn = U.sum(leaves, n => n.sum.giaiNgan);
    const asOfDates = hs.flatMap(x => x.h.map(y => y.ngay)).filter(d => +d.slice(0, 4) === nam).sort();
    const asOf = asOfDates.length ? asOfDates[asOfDates.length - 1] : (nam < cy ? nam + '-12-31' : today);
    const at = d => U.sum(hs, x => x.h.length ? valAt(x.h, d) : (d >= asOf ? x.n.sum.giaiNgan : 0));
    // Chuỗi tháng: lũy kế tại cuối mỗi tháng đã qua (tháng tương lai = null)
    const lastM = nam < cy ? 12 : nam > cy ? 0 : +asOf.slice(5, 7);
    const thang = Array.from({ length: 12 }, (_, i) => i + 1 <= lastM ? (i + 1 === lastM ? gn : at(monthEnd(nam, i + 1))) : null);
    const mt = L.gnMucTieu(nam), mtTien = mt.vals.map(p => tong * p / 100);
    // Thời gian
    const d0 = nam + '-01-01', d1 = nam + '-12-31', soNgay = U.diffDays(d1, d0) + 1;
    const daQua = Math.max(0, Math.min(soNgay, U.diffDays(asOf, d0) + 1)), conNgay = Math.max(0, soNgay - daQua);
    const tyLeTG = daQua / soNgay * 100, tyLe = U.pct(gn, tong);
    // Dự báo 1: theo tốc độ bình quân từ đầu năm
    const duBao1 = daQua > 0 ? gn / daQua * soNgay : gn;
    // Dự báo 2: theo tốc độ 60 ngày gần nhất (nếu có đủ lịch sử)
    const dTruoc = U.addDays(asOf, -60), coLS = asOfDates.some(d => d <= dTruoc) || asOfDates.filter(d => d < asOf).length > 0;
    let duBao2 = null, tocDoGan = null;
    if (coLS) {
      const ref = asOfDates.filter(d => d <= dTruoc).pop() || asOfDates.filter(d => d < asOf)[0];
      const span = Math.max(1, U.diffDays(asOf, ref)); tocDoGan = (gn - at(ref)) / span;
      duBao2 = gn + tocDoGan * conNgay;
    }
    const duBao = Math.min(tong, duBao2 === null ? duBao1 : (duBao1 + duBao2) / 2);
    const thangCon = Math.max(0, 12 - lastM) + (lastM && +asOf.slice(8, 10) < U.lastDayOfMonth(nam, lastM) ? (U.lastDayOfMonth(nam, lastM) - +asOf.slice(8, 10)) / U.lastDayOfMonth(nam, lastM) : 0);
    const canMoiThang = thangCon > 0.05 ? (tong - gn) / thangCon : null;
    const mtNay = lastM ? mt.vals[lastM - 1] : 0;
    // Mức đánh giá
    const lech = (tyLe || 0) - (mt.tuDat ? mtNay : tyLeTG);
    const nguyCo = tong > 0 && nam >= cy && duBao < tong * 0.95;
    const muc = !tong ? 'chua' : (tyLe || 0) >= 99.5 ? 'xong' : lech <= -A.nguong('gnLech') ? 'cham' : lech < 0 ? 'theodoi' : 'dat';
    return { nam, asOf, tong, gn, conLai: tong - gn, tyLe, tyLeTG, daQua, conNgay, soNgay, thang, mt, mtTien, mtNay, lastM, duBao, duBao1, duBao2, tocDoGan, canMoiThang, lech, nguyCo, muc, leaves, coLS };
  };
  L.GN_MUC = { chua: ['chua', 'Chưa có số liệu'], xong: ['hoanthanh', 'Đã giải ngân hết'], dat: ['hoanthanh', 'Đạt tiến độ'], theodoi: ['saphan', 'Chậm hơn mục tiêu'], cham: ['quahan', 'Chậm nhiều so với mục tiêu'] };

  // Đánh giá từng dòng chi tiết: chậm so với tỷ lệ thời gian / mục tiêu tháng
  L.gnDong = (nam, f) => {
    const g = L.giaiNgan(nam, f), chuan = g.mt.tuDat ? g.mtNay : g.tyLeTG;
    return g.leaves.filter(n => n.sum.tong > 0).map(n => {
      const ty = U.pct(n.sum.giaiNgan, n.sum.tong) || 0, lech = ty - chuan, con = n.sum.tong - n.sum.giaiNgan;
      return { n, r: n.r, tong: n.sum.tong, gn: n.sum.giaiNgan, con, ty, lech, cham: con > 0.5 && lech <= -A.nguong('gnLech'), chuaGN: n.sum.giaiNgan <= 0 };
    });
  };
  // Nhóm theo đơn vị / cán bộ
  L.gnNhom = (nam, by) => {
    const rows = L.gnDong(nam, {}), m = new Map();
    rows.forEach(x => {
      const k = by === 'cb' ? (x.r.canBoId || '__none') : x.r.donViId;
      const o = m.get(k) || { k, ten: by === 'cb' ? (k === '__none' ? 'Chưa giao cán bộ theo dõi' : Sc.refName('canbo', k)) : (S.get('donvi', k) || {}).ten || '(không rõ đơn vị)', tong: 0, gn: 0, n: 0, cham: 0, chuaGN: 0 };
      o.tong += x.tong; o.gn += x.gn; o.n++; if (x.cham) o.cham++; if (x.chuaGN) o.chuaGN++; m.set(k, o);
    });
    return Array.from(m.values()).map(o => Object.assign(o, { ty: U.pct(o.gn, o.tong), con: o.tong - o.gn })).sort((a, b) => b.con - a.con);
  };

  // Đề xuất phương án để lãnh đạo chỉ đạo — chỉ dựa trên số liệu, không suy diễn
  L.gnDeXuat = (nam, f) => {
    const g = L.giaiNgan(nam, f), rows = L.gnDong(nam, f), out = [];
    if (!g.tong) return out;
    const fm = U.fmtShort;
    if (g.nguyCo) out.push({ sev: 3, t: 'Nguy cơ không giải ngân hết dự toán năm ' + nam, d: 'Dự báo đến 31/12 giải ngân khoảng ' + fm(g.duBao) + ' (' + U.fmtPct(U.pct(g.duBao, g.tong)) + '), còn khoảng ' + fm(g.tong - g.duBao) + ' có thể không sử dụng hết. Đề nghị rà soát, xác định cụ thể nội dung không có khả năng thực hiện để kịp thời điều chỉnh dự toán hoặc đề xuất cấp có thẩm quyền thu hồi, điều chuyển theo quy định.' });
    if (g.canMoiThang !== null && g.conLai > 0.5) out.push({ sev: g.nguyCo ? 2 : 1, t: 'Để giải ngân hết kế hoạch cần bình quân ' + fm(g.canMoiThang) + '/tháng', d: 'Còn ' + fm(g.conLai) + ' trong khoảng ' + U.fmtNum(g.conNgay, 0) + ' ngày còn lại của năm' + (g.tocDoGan !== null ? '; tốc độ giải ngân gần đây khoảng ' + fm(g.tocDoGan * 30) + '/tháng.' : '.') });
    const cham = rows.filter(x => x.cham).sort((a, b) => b.con - a.con);
    if (cham.length) out.push({ sev: 2, t: cham.length + ' nội dung giải ngân chậm (tổng còn ' + fm(U.sum(cham, x => x.con)) + ')', d: 'Lớn nhất: ' + cham.slice(0, 3).map(x => U.trunc(x.r.noiDung, 60) + ' — ' + U.fmtPct(x.ty)).join('; ') + '. Đề nghị đơn vị, cán bộ theo dõi báo cáo vướng mắc, tiến độ hoàn thiện hồ sơ thanh toán.', rows: cham });
    const chuaGN = rows.filter(x => x.chuaGN && x.tong > 0);
    if (chuaGN.length && g.tyLeTG > 25) out.push({ sev: 2, t: chuaGN.length + ' nội dung chưa giải ngân đồng nào (' + fm(U.sum(chuaGN, x => x.tong)) + ')', d: 'Đã qua ' + U.fmtPct(g.tyLeTG, 0) + ' thời gian năm. Cần làm rõ khả năng thực hiện; nội dung không còn nhu cầu nên đề xuất điều chỉnh sớm.', rows: chuaGN });
    const khongCB = rows.filter(x => !x.r.canBoId && x.con > 0.5);
    if (khongCB.length) out.push({ sev: 1, t: khongCB.length + ' nội dung chưa giao cán bộ theo dõi giải ngân', d: 'Giao cán bộ để theo dõi, đôn đốc và cập nhật số liệu định kỳ.', rows: khongCB });
    if (!g.coLS) out.push({ sev: 1, t: 'Chưa có số liệu giải ngân theo nhiều kỳ', d: 'Cập nhật lũy kế giải ngân định kỳ (tuần/tháng) để phần mềm vẽ diễn biến và dự báo theo tốc độ thực tế.' });
    return out;
  };

  // Cảnh báo tổng hợp: thêm cảnh báo giải ngân dự toán
  const baseAlerts = L.alerts;
  L.alerts = y => {
    const out = baseAlerts(y), nam = y || +U.today().slice(0, 4);
    try {
      if (S.all('ngansach').some(r => +r.nam === nam)) {
        const g = L.giaiNgan(nam, {});
        if (g.nguyCo) out.push({ sev: 3, loai: 'giaingan', title: 'Dự toán năm ' + nam + ': nguy cơ không giải ngân hết', detail: 'Đã giải ngân ' + U.fmtPct(g.tyLe) + '; dự báo cuối năm khoảng ' + U.fmtPct(U.pct(g.duBao, g.tong)) + ' (còn ' + U.fmtShort(g.tong - g.duBao) + ')', coll: 'route', id: 'ngansach' });
        else if (g.muc === 'cham') out.push({ sev: 2, loai: 'giaingan', title: 'Giải ngân dự toán năm ' + nam + ' chậm so với mục tiêu', detail: 'Đã giải ngân ' + U.fmtPct(g.tyLe) + ', mục tiêu ' + U.fmtPct(g.mt.tuDat ? g.mtNay : g.tyLeTG) + (g.mt.tuDat ? '' : ' (tỷ lệ thời gian)'), coll: 'route', id: 'ngansach' });
        const cham = L.gnDong(nam, {}).filter(x => x.cham).length;
        if (cham) out.push({ sev: 1, loai: 'giaingan', title: cham + ' nội dung dự toán giải ngân chậm', detail: 'Xem danh sách tại Tài chính, ngân sách → Tổng quan giải ngân', coll: 'route', id: 'ngansach' });
      }
    } catch (x) { console.warn(x); }
    return out.sort((a, b) => b.sev - a.sev);
  };
})(App);
