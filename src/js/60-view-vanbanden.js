/* ============================================================
   60-view-vanbanden.js — Văn bản đến: tự quét thư mục Google Drive (qua Apps Script) hoặc đọc ngay trên máy,
   bóc tách thông tin (AI Cloudflare + quy tắc), người dùng xem, sửa rồi mới cập nhật vào phần mềm.
   ============================================================ */
'use strict';
(function (A) {
  const U = A.U, S = A.Store, L = A.L, UI = A.UI, Sc = A.Schema, e = U.esc, ic = A.icon, $ = UI.$, $$ = UI.$$;
  const TV = typeof TrichVB !== 'undefined' ? TrichVB : null;
  const LOAI = TV ? TV.LOAI : [['khac', 'Văn bản khác']], loaiTen = k => (LOAI.find(x => x[0] === k) || [k, 'Văn bản khác'])[1];
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const VB = A.VBD = { state: null, loading: false, err: '' };

  /* ---------- Máy chủ Apps Script ---------- */
  const coMayChu = () => /^(https:\/\/script\.google(usercontent)?\.com\/|http:\/\/localhost[:/])/.test((S.cfg.syncUrl || '').trim()) && !!S.cfg.syncKey;   // localhost: máy chủ thử nghiệm
  VB.coMayChu = coMayChu;
  VB.gas = async body => {
    const url = (S.cfg.syncUrl || '').trim();
    if (!coMayChu()) throw new Error('Chưa cấu hình máy chủ Apps Script (Thiết lập → Đồng bộ qua Google Apps Script).');
    let r;
    try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ key: S.cfg.syncKey, app: A.APP_ID }, body)), redirect: 'follow', credentials: 'omit', cache: 'no-store' }); }
    catch (er) { throw new Error('Không kết nối được máy chủ Apps Script: ' + (er.message || er)); }
    if (!r.ok) throw new Error('Máy chủ trả mã ' + r.status);
    const j = await r.json().catch(() => { throw new Error('Máy chủ không trả dữ liệu hợp lệ — kiểm tra đã triển khai Code.gs bản mới (Deploy → New version).'); });
    if (!j.ok) throw new Error(j.error || 'Máy chủ từ chối yêu cầu');
    return j;
  };
  VB.refresh = async (action, extra) => {
    VB.loading = true; VB.err = '';
    try { const j = await VB.gas(Object.assign({ action: action || 'inboxGet' }, extra || {})); VB.state = apDung(j.state || j); if (j.msg) UI.toast(j.msg, 'ok'); return j; }
    catch (er) { VB.err = er.message; throw er; }
    finally { VB.loading = false; badge(); }
  };
  const choDuyet = () => (VB.state && VB.state.items ? VB.state.items.filter(x => x.status === 'cho_duyet').length : 0) + S.all('vbden').filter(x => x.status === 'cho_duyet').length;
  const badge = () => { const b = $('#nav-vbd'); if (!b) return; const n = choDuyet(); b.textContent = n; b.classList.toggle('hide', !n); };
  VB.badge = badge;
  // Khi mở phần mềm: lấy trạng thái hàng đợi trên máy chủ (không đọc văn bản), cập nhật số chờ duyệt
  VB.autoCheck = () => { if (coMayChu() && VB.guiLai) VB.guiLai(); if (coMayChu()) VB.refresh('inboxGet').then(() => { if (A.route === 'vanbanden') A.render(); }).catch(() => { }); else badge(); };

  /* ---------- Đọc chữ trên trình duyệt ---------- */
  const loadPdfJs = () => window.pdfjsLib ? Promise.resolve(window.pdfjsLib) : new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js'; s.crossOrigin = 'anonymous';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => rej(new Error('Không tải được thư viện đọc PDF (cần mạng Internet).')); document.head.appendChild(s);
  });
  async function pdfText(buf) {
    const pdfjs = await loadPdfJs(), doc = await pdfjs.getDocument({ data: buf }).promise, out = [];
    for (let p = 1; p <= Math.min(doc.numPages, 40); p++) {
      // Dựng dòng theo toạ độ, đặt chữ vào đúng cột ký tự (như pdftotext -layout) để đọc được bảng nhiều cột.
      // Số, ngày do chữ ký số đóng vào nằm trong ô chữ ký (Widget), không có trong lớp chữ → lấy từ lệnh vẽ của ô.
      const pg = await doc.getPage(p), tc = await pg.getTextContent(), lines = [];
      const it2 = tc.items.filter(it => it.str && it.str.trim()).map(it => ({ x: it.transform[4], y: it.transform[5], w: it.width, t: it.str }));
      try {
        const ol = await pg.getOperatorList({ annotationMode: pdfjs.AnnotationMode.ENABLE }), O = pdfjs.OPS; let cur = null;
        ol.fnArray.forEach((fn, i) => {
          const a = ol.argsArray[i];
          if (fn === O.beginAnnotation) cur = { r: a[1], t: '' };
          else if (fn === O.endAnnotation) { if (cur && cur.t.trim()) it2.push({ x: cur.r[0], y: cur.r[1] + Math.min(5, (cur.r[3] - cur.r[1]) / 3), w: cur.t.trim().length * 5, t: cur.t.trim(), ky: true }); cur = null; }
          else if (cur && (fn === O.showText || fn === O.showSpacedText)) (a[0] || []).forEach(g => { if (g && typeof g === 'object' && g.unicode) cur.t += g.unicode; else if (typeof g === 'number' && g < -200) cur.t += ' '; });
        });
      } catch (x) { }
      const ws = it2.filter(it => !it.ky).map(it => it.w / Math.max(1, it.t.length)).filter(w => w > 0).sort((a, b) => a - b), cw = (ws.length ? ws[Math.floor(ws.length / 2)] : 5) * 0.8;   // lưới ký tự hơi dày hơn chữ thật để giữ khoảng trống giữa các cột
      it2.filter(it => !it.ky).forEach(it => { let l = lines.find(x => Math.abs(x.y - it.y) <= 2); if (!l) lines.push(l = { y: Math.round(it.y), parts: [] }); l.parts.push(it); });
      // Chữ trong ô chữ ký: gắn vào dòng có chữ kết thúc ngay bên trái ô (vd. "Số:" → số văn bản, "ngày" → ngày ký)
      it2.filter(it => it.ky).forEach(it => {
        let best = null, bd = 1e9;
        lines.forEach(l => { if (Math.abs(l.y - it.y) > 14) return; l.parts.forEach(q => { const d = it.x - (q.x + q.w); if (d > -cw && d < bd) { bd = d; best = l; } }); });
        if (!best || bd > cw * 12) { best = lines.find(x => Math.abs(x.y - it.y) <= 6); if (!best) lines.push(best = { y: Math.round(it.y), parts: [] }); }
        best.parts.push(it);
      });
      lines.sort((a, b) => b.y - a.y).forEach(l => {
        let s2 = '', het = -1e9;
        l.parts.sort((a, b) => a.x - b.x).forEach(it => {
          const col = Math.round(it.x / cw);
          if (s2.length < col - 1 && it.x - het > cw * 1.5) s2 += ' '.repeat(col - s2.length);
          else if (s2 && !/\s$/.test(s2) && it.x - het > cw * 0.25) s2 += ' ';
          s2 += it.t; het = it.x + it.w;
        });
        out.push(s2.replace(/\s+$/, ''));
      });
      out.push('');
    }
    return out.join('\n').trim();
  }
  // Đọc 1 mục trong tệp .zip (docx) bằng DecompressionStream, không cần thư viện ngoài
  async function unzipEntry(buf, name) {
    const v = new DataView(buf), u8 = new Uint8Array(buf);
    let eo = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { eo = i; break; }
    if (eo < 0) throw new Error('Tệp không phải .docx hợp lệ.');
    let p = v.getUint32(eo + 16, true); const n = v.getUint16(eo + 10, true), dec = new TextDecoder();
    for (let k = 0; k < n; k++) {
      if (v.getUint32(p, true) !== 0x02014b50) break;
      const meth = v.getUint16(p + 10, true), cs = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
      const nm = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      if (nm === name) {
        const start = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), data = u8.subarray(start, start + cs);
        if (meth === 0) return dec.decode(data);
        if (typeof DecompressionStream === 'undefined') throw new Error('Trình duyệt chưa hỗ trợ giải nén .docx; hãy dùng Chrome/Edge bản mới.');
        return await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      }
      p += 46 + nl + xl + cl;
    }
    throw new Error('Không thấy nội dung văn bản trong tệp .docx.');
  }
  VB.readFile = async file => {
    const buf = await file.arrayBuffer(), nm = file.name || '';
    if (/\.pdf$/i.test(nm) || file.type === 'application/pdf') {
      const t = await pdfText(buf);
      if (t.replace(/\s/g, '').length < 60) throw Object.assign(new Error('Tệp PDF là bản scan (không có lớp chữ). Hãy đưa tệp vào thư mục Văn bản đến trên Google Drive để máy chủ nhận dạng chữ (OCR).'), { scan: true });
      return { text: t, cach: 'PDF có lớp chữ (đọc trên máy)' };
    }
    if (/\.docx$/i.test(nm)) return { text: TV.docxText(await unzipEntry(buf, 'word/document.xml')), cach: 'Word .docx (đọc trên máy, giữ bảng)' };
    if (/\.(txt|md)$/i.test(nm) || /^text\//.test(file.type)) return { text: new TextDecoder().decode(buf), cach: 'tệp chữ' };
    if (/\.doc$/i.test(nm)) throw new Error('Tệp Word cũ (.doc) chưa đọc được. Lưu lại thành .docx hoặc PDF.');
    if (/^image\//.test(file.type)) throw Object.assign(new Error('Ảnh chụp văn bản cần nhận dạng chữ trên máy chủ: đưa vào thư mục Văn bản đến trên Google Drive.'), { scan: true });
    throw new Error('Chưa hỗ trợ định dạng tệp này. Dùng PDF, Word .docx hoặc dán nội dung.');
  };
  // Bóc tách: quy tắc + AI (nếu có), AI lỗi vẫn có kết quả theo quy tắc
  VB.extract = async (text, ten) => {
    text = String(text || '').replace(/\r/g, '');
    const qt = TV.trichQuyTac(text); let kq, aiLoi = '', mh = '';
    if (A.AI && A.AI.coSan()) {
      try { const r = await A.AI.goi([{ role: 'system', content: TV.LOI_NHAC_HE_THONG }, { role: 'user', content: TV.loiNhacNguoiDung(text, ten) }], { max_tokens: 3000, timeout: 90000 }); kq = TV.ghep(TV.docJson(r.text), qt); mh = r.tenMoHinh; }
      catch (er) { aiLoi = er.message; }
    } else aiLoi = 'Chưa cấu hình AI';
    if (!kq) { kq = TV.chuanHoa(qt); kq.nguon_trich = 'quy_tac'; }
    kq.ai_loi = aiLoi; kq.mo_hinh = mh; kq.van_ban = text.slice(0, 8000); kq.van_ban_cat = text.length > 8000;
    return kq;
  };
  async function docTrenMay(files) {
    const list = Array.from(files || []); if (!list.length) return;
    UI.toast('Đang đọc ' + list.length + ' văn bản…');
    let ok = 0;
    for (const f of list) {
      const it = { id: U.uid('vbd'), name: f.name, size: f.size, mime: f.type, received: U.nowStamp(), src: 'may' };
      try {
        const c = await VB.readFile(f);
        it.result = await VB.extract(c.text, f.name); it.result.cach_doc = c.cach; it.status = 'cho_duyet'; ok++;
        if (f.size <= 15 * 1048576 && !S.adapter.noFiles) { try { it.dinhKem = await S.addFile(f); } catch (x) { } }
      } catch (er) {
        if (er.scan && coMayChu() && f.size <= 20 * 1048576 && await UI.confirm({ title: 'Gửi lên máy chủ để nhận dạng chữ?', msg: er.message + '\n\nGửi tệp "' + f.name + '" vào thư mục Văn bản đến trên Google Drive ngay bây giờ?', ok: 'Gửi lên Drive' })) { await taiLen([f]); continue; }
        it.status = 'loi'; it.error = er.message;
      }
      await S.save('vbden', it, { silent: true });
    }
    S.emit({ c: 'vbden' }); badge();
    if (ok) UI.toast('Đã đọc ' + ok + ' văn bản — xem và duyệt ở danh sách "Chờ duyệt".', 'ok');
  }
  function danNoiDung() {
    const m = UI.modal({ title: 'Dán nội dung văn bản', size: 'lg', body: '<div class="fld"><label for="vb_t">Tên văn bản (tùy chọn)</label><input class="inp" id="vb_t" placeholder="Ví dụ: QĐ phê duyệt KHLCNT gói thầu số 01"></div><div class="fld mt"><label for="vb_x">Nội dung (sao chép từ PDF, Word, email…)</label><textarea class="inp" id="vb_x" rows="14"></textarea></div>',
      buttons: [{ label: 'Hủy', on: x => x.close() }, { label: 'Đọc và trích thông tin', cls: 'primary', icon: 'spark', on: async x => {
        const t = $('#vb_x', m.body).value.trim(), ten = $('#vb_t', m.body).value.trim() || 'Nội dung dán ' + U.fmtDate(U.today());
        if (t.length < 40) { UI.toast('Nội dung quá ngắn để trích thông tin.', 'bad'); return; }
        x.close(); UI.toast('Đang đọc văn bản…');
        const it = { id: U.uid('vbd'), name: ten, size: t.length, mime: 'text/plain', received: U.nowStamp(), src: 'may' };
        try { it.result = await VB.extract(t, ten); it.result.cach_doc = 'nội dung dán'; it.status = 'cho_duyet'; } catch (er) { it.status = 'loi'; it.error = er.message; }
        await S.save('vbden', it); badge(); if (it.status === 'cho_duyet') review(it);
      } }] });
  }
  async function taiLen(files) {
    for (const f of Array.from(files || [])) {
      if (f.size > 20 * 1048576) { UI.toast('"' + f.name + '" lớn hơn 20 MB, hãy chép thẳng vào thư mục Drive.', 'bad'); continue; }
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
      try { await VB.refresh('inboxUpload', { name: f.name, mime: f.type || 'application/octet-stream', data: b64 }); UI.toast('Đã gửi "' + f.name + '" vào thư mục Văn bản đến.', 'ok'); } catch (er) { UI.fail(er); }
    }
    A.render();
  }

  /* ---------- Hộp duyệt, sửa trước khi cập nhật ---------- */
  const parseMoney = v => { const s = String(v || '').replace(/\s|đồng|đ/gi, ''); if (!s) return ''; const n = +s.replace(/\./g, '').replace(',', '.'); return isNaN(n) ? '' : n; };
  function inputFor(f, v, path) {
    const id = 'vo_' + path.replace(/\W/g, '_'), lab = '<label for="' + id + '">' + e(f.label) + '</label>';
    let inner;
    if (f.type === 'date') inner = '<input class="inp" type="date" id="' + id + '" data-p="' + e(path) + '" data-t="date" value="' + e(v || '') + '">';
    else if (f.type === 'money') inner = '<input class="inp num" inputmode="numeric" id="' + id + '" data-p="' + e(path) + '" data-t="money" value="' + (v === '' || v === null || v === undefined ? '' : U.fmtMoney(v)) + '">';
    else if (f.type === 'select') inner = '<select class="sel" id="' + id + '" data-p="' + e(path) + '"><option value=""></option>' + Sc.options(f).map(o => '<option value="' + e(o[0]) + '"' + (o[0] === v ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + (v && !Sc.options(f).some(o => o[0] === v) ? '<option selected value="' + e(v) + '">' + e(v) + '</option>' : '') + '</select>';
    else if (f.type === 'ref') inner = '<select class="sel" id="' + id + '" data-p="' + e(path) + '"><option value="">(không chọn)</option>' + S.all(f.ref).map(r => '<option value="' + r.id + '"' + (r.id === v ? ' selected' : '') + '>' + e(Sc.refName(f.ref, r.id)) + '</option>').join('') + '</select>';
    else if (f.type === 'textarea') inner = '<textarea class="inp" rows="2" id="' + id + '" data-p="' + e(path) + '">' + e(v || '') + '</textarea>';
    else inner = '<input class="inp" id="' + id + '" data-p="' + e(path) + '" value="' + e(v === null || v === undefined ? '' : v) + '">';
    return '<div class="fld' + (f.type === 'textarea' ? ' full' : '') + '">' + lab + inner + '</div>';
  }
  const ADD_TEN = [['duToan', 'Dự toán giao đầu năm'], ['boSung', 'Bổ sung trong năm'], ['dcTang', 'Điều chỉnh tăng'], ['dcGiam', 'Điều chỉnh giảm'], ['thuHoi', 'Thu hồi']];
  function opHtml(o, i) {
    const sc = Sc.C[o.coll];
    return '<div class="card vb-op' + (o.on ? '' : ' off') + '" data-op="' + i + '"><div class="card-h"><label class="check" style="font-weight:600"><input type="checkbox" data-on' + (o.on ? ' checked' : '') + '> ' + e(o.title) + '</label><span class="grow"></span><span class="tag">' + e(sc.label) + '</span></div><div class="card-b">' +
      (o.choices && o.choices.length ? '<div class="fld"><label for="vt_' + i + '">' + (o.mustExist ? 'Bản ghi cần cập nhật' : 'Tạo mới hay cập nhật bản ghi đã có') + '</label><select class="sel" id="vt_' + i + '" data-target>' + (o.mustExist ? '<option value="">— chọn —</option>' : '') + o.choices.map(c => '<option value="' + e(c[0]) + '"' + (c[0] === o.id ? ' selected' : '') + '>' + e(c[1]) + '</option>').join('') + '</select></div>' : '') +
      (o.keys.length ? '<div class="form mt">' + o.keys.map(k => { const f = Sc.field(o.coll, k); return f ? inputFor(f, o.fields[k], i + '.f.' + k) : ''; }).join('') + '</div>' : '') +
      (o.push || []).map((p, j) => { const f = Sc.field(o.coll, p.k); return '<div class="mt"><label class="check"><input type="checkbox" data-push="' + j + '"' + (p.skip ? '' : ' checked') + '> ' + e(p.label + ' — thêm 1 dòng vào "' + f.label + '"') + '</label><div class="form mt">' + f.cols.map(cf => inputFor(cf, p.row[cf.k], i + '.p.' + j + '.' + cf.k)).join('') + '</div></div>'; }).join('') +
      (o.add ? '<div class="form mt"><div class="fld"><label for="va_' + i + '">Cộng vào cột</label><select class="sel" id="va_' + i + '" data-addt>' + ADD_TEN.map(a => '<option value="' + a[0] + '"' + (a[0] === o.add.truong ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select></div>' + inputFor({ label: 'Số tiền (đồng)', type: 'money' }, o.add.soTien, i + '.a.soTien') + '</div>' : '') +
      (o.sau ? '<div class="small soft mt">Kèm theo: ' + e(o.sau.note) + '</div>' : '') +
      ((o.dinhKem || []).length ? '<div class="small muted mt">' + ic('clip', 14) + ' Đính kèm tệp văn bản gốc vào hồ sơ</div>' : '') + '</div></div>';
  }
  function review(it, onDone) {
    const r = it.result || {}, dk = it.src === 'may' ? (it.dinhKem || null) : (it.url ? { url: it.url, ten: it.name } : null);
    let ops = L.vbPlan(r, { ten: it.name, dinhKem: dk });
    const trich = r.trich_dan && typeof r.trich_dan === 'object' ? Object.keys(r.trich_dan).map(k => [k, r.trich_dan[k]]).filter(x => x[1]) : [];
    const body = document.createElement('div');
    const draw = () => {
      body.innerHTML = '<div class="vb-rv"><div class="vb-meta"><div class="form"><div class="fld"><label for="vr_l">Loại văn bản</label><select class="sel" id="vr_l">' + LOAI.map(l => '<option value="' + l[0] + '"' + (l[0] === r.loai ? ' selected' : '') + '>' + e(l[1]) + '</option>').join('') + '</select></div><div class="fld"><label for="vr_s">Số, ký hiệu</label><input class="inp" id="vr_s" value="' + e(r.so_van_ban || '') + '"></div><div class="fld"><label for="vr_n">Ngày văn bản</label><input class="inp" type="date" id="vr_n" value="' + e(r.ngay_van_ban || '') + '"></div><div class="fld full"><label for="vr_t">Trích yếu</label><textarea class="inp" rows="2" id="vr_t">' + e(r.trich_yeu || '') + '</textarea></div></div>' +
        '<div class="small muted mt">' + e([it.src === 'may' ? 'Đọc trên máy' : 'Thư mục Drive', r.cach_doc, r.nguon_trich === 'ai' ? 'AI Cloudflare' + (r.mo_hinh ? ' (' + r.mo_hinh + ')' : '') + ' + quy tắc' : 'Chỉ theo quy tắc' + (r.ai_loi ? ' — AI: ' + r.ai_loi : '')].filter(Boolean).join(' · ')) + '</div>' +
        (r.so_trong || r.ngay_trong ? '<div class="note bad mt">Văn bản ký số: ' + [r.so_trong ? 'số văn bản' : '', r.ngay_trong ? 'ngày ban hành' : ''].filter(Boolean).join(' và ') + ' để trống ở đầu văn bản (đóng ở chữ ký số). Hãy nhập ' + (r.so_trong ? 'số' : '') + (r.so_trong && r.ngay_trong ? ', ' : '') + (r.ngay_trong ? 'ngày' : '') + ' theo bản đã ký.</div>' : '') + '<div class="note warn mt">Thông tin do máy đọc tự động — hãy đối chiếu với văn bản gốc trước khi cập nhật. Đổi "Loại văn bản" để phần mềm lập lại phương án.</div>' +
        (trich.length ? '<details class="mt"><summary class="small">Câu trích nguyên văn chứa số tiền (' + trich.length + ')</summary>' + trich.map(x => '<div class="small soft" style="margin:4px 0">• ' + e(String(x[1]).slice(0, 200)) + '</div>').join('') + '</details>' : '') +
        '<details class="mt"' + (ops.filter(o => o.on).length ? '' : ' open') + '><summary class="small">Nội dung văn bản đã đọc' + (r.van_ban_cat ? ' (8.000 ký tự đầu)' : '') + '</summary><pre class="vb-text">' + e(r.van_ban || '') + '</pre></details>' +
        (it.url ? '<div class="mt"><a class="btn sm" href="' + e(it.url) + '" target="_blank" rel="noopener">' + ic('eye', 15) + 'Mở tệp gốc trên Drive</a></div>' : '') + '</div>' +
        '<div class="vb-ops"><div class="eyebrow" style="margin-top:0">Phương án cập nhật (' + ops.filter(o => o.on).length + ' thao tác được chọn)</div>' + ops.map(opHtml).join('') + '</div></div>';
      $('#vr_l', body).onchange = x => { r.loai = x.target.value; ops = L.vbPlan(r, { ten: it.name, dinhKem: dk }); draw(); };
      [['vr_s', 'so_van_ban'], ['vr_n', 'ngay_van_ban'], ['vr_t', 'trich_yeu']].forEach(([id, k]) => $('#' + id, body).addEventListener('change', x => { r[k] = x.target.value; ops = L.vbPlan(r, { ten: it.name, dinhKem: dk }); draw(); }));
      $$('[data-op]', body).forEach(card => {
        const o = ops[+card.dataset.op];
        $('[data-on]', card).onchange = x => { o.on = x.target.checked; card.classList.toggle('off', !o.on); };
        const t = $('[data-target]', card); if (t) t.onchange = x => { o.id = x.target.value; if (o.mustExist && o.id) { o.on = true; $('[data-on]', card).checked = true; card.classList.remove('off'); } };
        $$('[data-push]', card).forEach(c => c.onchange = x => { o.push[+c.dataset.push].skip = !x.target.checked; });
        const at = $('[data-addt]', card); if (at) at.onchange = x => { o.add.truong = x.target.value; };
        $$('[data-p]', card).forEach(inp => inp.addEventListener('change', () => {
          const parts = inp.dataset.p.split('.'), v = inp.dataset.t === 'money' ? parseMoney(inp.value) : inp.value.trim();
          if (inp.dataset.t === 'money' && v !== '') inp.value = U.fmtMoney(v);
          if (parts[1] === 'f') o.fields[parts[2]] = v; else if (parts[1] === 'p') o.push[+parts[2]].row[parts[3]] = v; else if (parts[1] === 'a') o.add.soTien = v;
        }));
      });
    };
    draw();
    const m = UI.modal({ title: 'Duyệt văn bản: ' + U.trunc(it.name, 70), sub: loaiTen(r.loai), size: 'xl', body,
      buttons: [{ label: 'Đóng', on: x => x.close() }, { label: 'Bỏ qua văn bản này', on: async x => { x.close(true); await resolve(it, 'bo_qua', ''); UI.toast('Đã chuyển văn bản sang "Đã xử lý" (bỏ qua).', 'ok'); } }, { label: 'Cập nhật vào phần mềm', cls: 'primary', icon: 'check', on: async x => {
        let plan; try { plan = L.vbApply(ops); } catch (er) { UI.toast(er.message, 'bad'); return; }
        if (!plan.items.length) { UI.toast('Chưa chọn thao tác nào. Bỏ chọn hết thì dùng "Bỏ qua văn bản này".', 'bad'); return; }
        if (!await UI.confirm({ title: 'Cập nhật ' + plan.items.length + ' bản ghi?', msg: plan.tomTat.map(t => '• ' + t).join('\n'), ok: 'Cập nhật' })) return;
        try {
          await S.saveMany(plan.items, { note: 'Cập nhật từ văn bản đến "' + U.trunc(it.name, 80) + '": ' + plan.tomTat.length + ' thao tác' });
          await resolve(it, 'da_xu_ly', plan.tomTat.join('; '));
          x.close(); UI.toast('Đã cập nhật ' + plan.items.length + ' bản ghi từ văn bản.', 'ok'); if (onDone) onDone();
        } catch (er) { UI.fail(er); }
      } }] });
    return m;
  }
  /* Đánh dấu đã xử lý / bỏ qua: cập nhật ngay trên máy (phản hồi tức thì), gửi máy chủ chạy nền, thử lại nếu máy chủ bận.
     Mục chưa gửi được giữ trong cấu hình (vbdChoGui) và gửi lại ở lần mở trang sau. */
  const choGui = () => Object.assign({}, S.cfg.vbdChoGui || {});
  const apDung = st => { if (!st || !st.items) return st; const cg = choGui(); st.items.forEach(x => { const c = cg[x.id]; if (c && x.status !== c.status) { x.status = c.status; x.applied = c.applied; } }); st.summary = { cho_doc: st.items.filter(x => x.status === 'cho_doc').length, cho_duyet: st.items.filter(x => x.status === 'cho_duyet').length, loi: st.items.filter(x => x.status === 'loi').length }; return st; };
  VB.apDung = apDung;
  async function guiMayChu(id, lan) {
    const c = choGui()[id]; if (!c) return;
    try {
      await VB.gas({ action: 'inboxResolve', id, status: c.status, by: c.by, applied: c.applied });
      const cg = choGui(); delete cg[id]; await S.setCfg({ vbdChoGui: cg });
    } catch (er) {
      if ((lan || 0) < 3) setTimeout(() => guiMayChu(id, (lan || 0) + 1), [5000, 20000, 60000][lan || 0]);
      else UI.toast('Chưa ghi được trạng thái văn bản lên máy chủ (' + er.message + '). Phần mềm sẽ gửi lại ở lần mở trang sau.', 'bad');
    }
  }
  VB.guiLai = () => Object.keys(choGui()).forEach(id => guiMayChu(id, 3));
  async function resolve(it, status, applied) {
    if (it.src === 'may') { await S.save('vbden', Object.assign({}, it, { status, applied, done_at: U.nowStamp(), done_by: S.user() })); badge(); return; }
    it.status = status; it.applied = applied;
    await S.setCfg({ vbdChoGui: Object.assign(choGui(), { [it.id]: { status, applied: String(applied || '').slice(0, 500), by: S.user() } }) });
    apDung(VB.state); badge(); A.render();
    guiMayChu(it.id, 0);
  }
  VB.review = review;

  /* ---------- Trang Văn bản đến ---------- */
  A.views.vanbanden = {
    title: 'Văn bản đến', sub: 'Đưa văn bản vào thư mục — phần mềm tự đọc, trích thông tin gói thầu, hợp đồng, dự toán; anh/chị duyệt, sửa rồi mới cập nhật',
    render(root) {
      const T = A.vs.vbd || (A.vs.vbd = { t: 'cho' }), st = VB.state, may = coMayChu();
      const srv = (st && st.items) ? st.items.map(x => Object.assign({ src: 'drive' }, x)) : [], loc = S.all('vbden');
      const all = srv.concat(loc).sort((a, b) => String(b.processed_at || b.received || '').localeCompare(String(a.processed_at || a.received || '')));
      const grp = { cho: all.filter(x => x.status === 'cho_duyet'), doi: all.filter(x => x.status === 'cho_doc' || x.status === 'loi'), xong: all.filter(x => x.status === 'da_xu_ly' || x.status === 'bo_qua') };
      let h = '<div class="card mb"><div class="card-b vbd-src">';
      if (may) {
        h += '<div class="grow" style="min-width:0"><div class="eyebrow" style="margin:0">Thư mục nhận văn bản trên Google Drive</div><div style="font-size:16px;font-weight:600;margin:2px 0 6px">' + (st ? '<a href="' + e(st.folder_url) + '" target="_blank" rel="noopener">' + e(st.folder_name) + '</a>' : (VB.loading ? 'Đang kết nối máy chủ…' : '—')) + '</div>' +
          (st ? '<div class="gap">' + UI.chip(st.summary.cho_duyet ? 'saphan' : 'hoanthanh', st.summary.cho_duyet + ' chờ duyệt') + UI.chip(st.summary.cho_doc ? 'dang' : 'chua', st.summary.cho_doc + ' chờ đọc') + (st.summary.loi ? UI.chip('quahan', st.summary.loi + ' lỗi') : '') + '<span class="small muted">AI: ' + e(st.ai || '') + ' · nhận dạng chữ PDF scan: ' + (st.driveOcr ? 'đã bật' : '<b style="color:var(--bad-fg)">chưa bật Drive API</b>') + '</span></div>' : '') +
          (VB.err ? '<div class="note bad mt">' + e(VB.err) + '</div>' : '') + '</div>' +
          '<div class="gap" style="align-self:flex-start"><label class="check"><input type="checkbox" data-auto' + (st && st.tuDong ? ' checked' : '') + (st ? '' : ' disabled') + '> Tự quét mỗi 15 phút</label><button class="btn" data-folder' + (st ? '' : ' disabled') + '>' + ic('link', 16) + 'Đổi thư mục</button><label class="btn">' + ic('upload', 16) + 'Gửi tệp lên thư mục<input type="file" multiple class="sr" data-up accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"></label><button class="btn primary" data-scan>' + ic('sync', 16) + 'Quét và đọc ngay</button></div>';
      } else h += '<div class="grow" style="min-width:0"><div class="eyebrow" style="margin:0">Chưa kết nối thư mục Google Drive</div><p class="soft" style="margin:4px 0 0">Để tự động quét thư mục và đọc cả PDF scan, ảnh chụp (nhận dạng chữ trên máy chủ): triển khai <b>gas/Code.gs</b> bản 2 rồi nhập địa chỉ Web App và mã bí mật tại <a href="#" data-goto="thietlap">Thiết lập</a> (xem HUONG-DAN.md, mục 4d). Hiện vẫn đọc được ngay trên máy: PDF có lớp chữ, Word .docx, nội dung dán.</p></div>';
      h += '<div class="gap" style="align-self:flex-start"><label class="btn">' + ic('doc', 16) + 'Đọc văn bản trên máy này<input type="file" multiple class="sr" data-local accept=".pdf,.docx,.txt"></label><button class="btn" data-paste>' + ic('copy', 16) + 'Dán nội dung</button></div></div></div>';
      const tab = (k, l) => '<button role="tab" data-t="' + k + '" class="' + (T.t === k ? 'on' : '') + '">' + l + ' (' + grp[k].length + ')</button>';
      h += '<div class="tabs" role="tablist">' + tab('cho', 'Chờ duyệt') + tab('doi', 'Chờ đọc, lỗi') + tab('xong', 'Đã xử lý') + '</div>';
      const list = grp[T.t];
      h += list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Văn bản</th><th>Loại, số ký hiệu</th><th>Thông tin chính</th><th>Nguồn</th><th></th></tr></thead><tbody>' + list.map(x => {
        const r = x.result || {}, chinh = r.loai === 'hop_dong' && r.hop_dong ? [r.hop_dong.nha_thau, r.hop_dong.gia_tri ? U.fmtMoney(r.hop_dong.gia_tri) + ' đồng' : ''].filter(Boolean).join(' · ') : r.loai === 'kqlcnt_qd' && r.ket_qua ? [r.ket_qua.nha_thau, r.ket_qua.gia_trung_thau ? U.fmtMoney(r.ket_qua.gia_trung_thau) + ' đồng' : ''].filter(Boolean).join(' · ') : (r.goi_thau || []).length ? r.goi_thau.length + ' gói thầu · ' + U.fmtMoney(U.sum(r.goi_thau, g => g.gia_goi_thau)) + ' đồng' : '';
        return '<tr data-row="' + e(x.id) + '"><td class="wrap" style="min-width:220px"><div class="t1">' + e(x.name) + '</div><div class="t2">' + U.fmtDateTime(x.processed_at || x.received) + '</div></td><td class="wrap">' + (x.result ? '<div>' + e(loaiTen(r.loai)) + '</div><div class="t2">' + e([r.so_van_ban, r.ngay_van_ban ? U.fmtDate(r.ngay_van_ban) : ''].filter(Boolean).join(' ngày ')) + '</div>' : '<span class="muted">—</span>') + '</td><td class="wrap" style="min-width:220px"><div class="small">' + e(U.trunc(r.trich_yeu || '', 140)) + '</div>' + (chinh ? '<div class="t2">' + e(chinh) + '</div>' : '') + (x.error ? '<div class="t2 lech">' + e(x.error) + '</div>' : '') + (x.applied ? '<div class="t2">' + e(U.trunc(x.applied, 160)) + '</div>' : '') + '</td><td class="small nowrap">' + (x.src === 'may' ? 'Đọc trên máy' : 'Drive') + '</td><td class="nowrap">' +
          (x.status === 'cho_duyet' ? '<button class="btn sm primary" data-rv="' + e(x.id) + '">Xem và cập nhật</button>' : x.status === 'loi' && x.src !== 'may' ? '<button class="btn sm" data-retry="' + e(x.id) + '">Đọc lại</button>' : x.status === 'cho_doc' ? '<span class="small muted">' + (x.retry_at ? 'Hẹn đọc lại' : 'Chờ đọc') + '</span>' : (x.result ? '<button class="btn sm ghost" data-rv="' + e(x.id) + '">Xem lại</button>' : '')) +
          (x.src === 'may' && x.status !== 'cho_duyet' ? '<button class="btn icon sm" data-del="' + e(x.id) + '" aria-label="Xóa khỏi danh sách" title="Xóa khỏi danh sách">' + ic('trash', 15) + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card">' + UI.empty(T.t === 'cho' ? 'Không có văn bản chờ duyệt' : T.t === 'doi' ? 'Không có văn bản chờ đọc hoặc lỗi' : 'Chưa có văn bản đã xử lý', T.t === 'cho' ? 'Đưa quyết định phê duyệt kế hoạch lựa chọn nhà thầu, quyết định phê duyệt kết quả, hợp đồng, phụ lục, biên bản nghiệm thu, thanh lý hoặc quyết định giao dự toán vào thư mục (hoặc đọc trên máy) — phần mềm sẽ trích thông tin để anh/chị duyệt.' : '') + '</div>';
      root.innerHTML = h;
      const find = id => all.find(x => x.id === id);
      $$('[data-t]', root).forEach(b => b.onclick = () => { T.t = b.dataset.t; A.render(); });
      UI.on(root, 'click', '[data-rv]', b => { const it = find(b.dataset.rv); if (it) review(it); });
      UI.on(root, 'click', '[data-goto]', (b, x) => { x.preventDefault(); A.go(b.dataset.goto); });
      UI.on(root, 'click', '[data-del]', async b => { await S.remove('vbden', b.dataset.del); badge(); });
      UI.on(root, 'click', '[data-retry]', async b => { b.disabled = true; try { await VB.refresh('inboxRetry', { id: b.dataset.retry }); } catch (er) { UI.fail(er); } A.render(); });
      $('[data-local]', root).onchange = x => docTrenMay(x.target.files);
      $('[data-paste]', root).onclick = danNoiDung;
      if (may) {
        $('[data-up]', root).onchange = x => taiLen(x.target.files);
        $('[data-scan]', root).onclick = async b => { const btn = b.currentTarget; btn.disabled = true; btn.innerHTML = ic('sync', 16) + 'Đang đọc…'; try { const j = await VB.refresh('inboxProcess'); UI.toast(j.processed ? 'Đã đọc ' + j.processed + ' văn bản mới.' : j.deferred ? 'AI đang hết hạn mức; máy chủ sẽ tự thử lại sau 15 phút.' : 'Không có văn bản mới cần đọc.', j.processed ? 'ok' : ''); if (j.processed) T.t = 'cho'; } catch (er) { UI.fail(er); } A.render(); };
        const au = $('[data-auto]', root); if (au) au.onchange = async x => { try { await VB.refresh('inboxSetAuto', { on: x.target.checked }); } catch (er) { UI.fail(er); } A.render(); };
        const fd = $('[data-folder]', root); if (fd) fd.onclick = () => { const m = UI.modal({ title: 'Đổi thư mục nhận văn bản', body: '<div class="fld"><label for="vf_u">Liên kết thư mục Google Drive</label><input class="inp" id="vf_u" placeholder="https://drive.google.com/drive/folders/…"><div class="help">Tài khoản chạy Apps Script phải có quyền chỉnh sửa thư mục. Tệp đã đọc được chuyển vào thư mục con "Đã đọc".</div></div>', buttons: [{ label: 'Hủy', on: x => x.close() }, { label: 'Lưu thư mục', cls: 'primary', on: async x => { try { await VB.refresh('inboxSetFolder', { folder: $('#vf_u', m.body).value.trim() }); x.close(); A.render(); } catch (er) { UI.toast(er.message, 'bad'); } } }] }); };
        if (!st && !VB.loading && !VB.err) VB.refresh('inboxGet').then(() => A.render()).catch(() => A.render());
      }
    }
  };
})(App);
