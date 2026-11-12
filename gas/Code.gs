/**
 * Phòng KH-TC số — máy chủ Google Apps Script (phiên bản 2)
 *  1. Đồng bộ dữ liệu giữa các máy (đẩy lên / tải về toàn bộ, chống ghi đè khi máy chủ có bản mới hơn).
 *  2. Văn bản đến: tự quét thư mục Google Drive, nhận dạng chữ (Drive OCR cho bản scan), gọi AI Cloudflare
 *     bóc tách thông tin (gói thầu, KHLCNT, kết quả LCNT, hợp đồng, phụ lục, nghiệm thu, thanh lý, dự toán),
 *     đưa vào hàng đợi "Chờ duyệt". Phần mềm chỉ ghi vào dữ liệu khi cán bộ duyệt.
 *
 * CÀI ĐẶT (một lần):
 *  1. script.google.com → Dự án mới → dán toàn bộ tệp này vào Code.gs. Đổi MA_BI_MAT bên dưới.
 *  2. Bên trái → Dịch vụ (Services) → thêm "Drive API" (để nhận dạng chữ PDF scan, ảnh chụp).
 *  3. Cài đặt dự án → Thuộc tính tập lệnh (Script properties), tùy chọn:
 *       CF_WORKER_URL  — địa chỉ Worker AI dùng chung (mặc định Worker rasoatvanban của anh/chị)
 *       hoặc gọi thẳng Cloudflare: CF_ACCOUNT_ID, CF_API_TOKEN (quyền Workers AI: Read), CF_AI_MODEL
 *  4. Triển khai → Triển khai mới → Ứng dụng web → Thực thi với tư cách: Tôi; Ai có quyền: Bất kỳ ai.
 *  5. Chạy hàm caiDatVanBanDen một lần (cấp quyền, bật quét tự động 15 phút).
 *  6. Dán URL .../exec và MA_BI_MAT vào phần mềm: Thiết lập → Đồng bộ qua Google Apps Script.
 * Mỗi lần sửa tệp này: Triển khai → Quản lý triển khai → Sửa → Phiên bản mới (giữ nguyên URL).
 */
var MA_BI_MAT = 'DOI-MA-NAY-TRUOC-KHI-DUNG';
var APP_ID = 'khtc-so-son-la';
var PHIEN_BAN_MAY_CHU = 2;
var TEN_TEP = 'khtc-so-son-la-du-lieu.json';          // dữ liệu đồng bộ (giữ tên cũ để tương thích phiên bản 1)
var TEN_TEP_HANG_DOI = 'khtc-so-van-ban-den.json';     // hàng đợi văn bản đến
var TEN_THU_MUC_VB = 'KHTC_So_VAN_BAN_DEN';            // thư mục nhận văn bản (tự tạo nếu chưa chọn)
var TEN_THU_MUC_DA_DOC = 'Đã đọc';
var CF_WORKER_MAC_DINH = 'https://rasoatvanban.letunglam1992.workers.dev';
var QUET_MOI_PHUT = 15, TOI_DA_MOI_LAN = 5, GIU_DA_XU_LY = 60, FILE_TOI_DA_MB = 20;

/* ======================= Cổng vào ======================= */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.app !== APP_ID) return out_({ ok: false, error: 'Sai ứng dụng' });
    if (MA_BI_MAT === 'DOI-MA-' + 'NAY-TRUOC-KHI-DUNG') return out_({ ok: false, error: 'Chưa đổi MA_BI_MAT trong Code.gs' });   // ghép chuỗi để lệnh "Thay thế tất cả" không sửa nhầm dòng này
    if (req.key !== MA_BI_MAT) return out_({ ok: false, error: 'Sai mã bí mật — mã ở Thiết lập phải trùng MA_BI_MAT trong Code.gs, và Code.gs phải được Triển khai phiên bản mới sau khi sửa' });
    lock.waitLock(25000);
    var a = req.action || 'info';
    if (a === 'info') return out_(info_());
    if (a === 'pull' || a === 'push') return out_(dongBo_(req));
    if (a === 'inboxGet') return out_(hangDoi_());
    if (a === 'inboxSetFolder') return out_(datThuMuc_(req.folder));
    if (a === 'inboxSetAuto') return out_({ ok: true, msg: caiDatTrigger_(!!req.on), state: hangDoi_() });
    if (a === 'inboxUpload') return out_(taiLen_(req));
    if (a === 'inboxProcess') return out_(xuLy_({ max: Math.min(+req.max || TOI_DA_MOI_LAN, TOI_DA_MOI_LAN), id: req.id || '' }));
    if (a === 'inboxRetry') return out_(thuLai_(req.id));
    if (a === 'inboxResolve') return out_(danhDau_(req));
    if (a === 'aiTest') return out_(thuAI_());
    return out_({ ok: false, error: 'Không rõ thao tác' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
function doGet() { return out_({ ok: true, service: APP_ID, version: PHIEN_BAN_MAY_CHU, note: 'Dùng POST từ phần mềm.' }); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function props_() { return PropertiesService.getScriptProperties(); }
function info_() {
  var p = props_(), q = docHangDoi_();
  return { ok: true, version: PHIEN_BAN_MAY_CHU, rev: Number(p.getProperty('rev') || 0), savedAt: p.getProperty('savedAt'), savedBy: p.getProperty('savedBy'),
    ai: moTaAI_(), driveOcr: typeof Drive !== 'undefined' && !!Drive.Files, tuDong: dangBatTrigger_(), summary: tomTat_(q) };
}

/* ======================= 1. Đồng bộ dữ liệu ======================= */
function tepDuLieu_() { var it = DriveApp.getFilesByName(TEN_TEP); return it.hasNext() ? it.next() : null; }
function dongBo_(req) {
  var p = props_(), rev = Number(p.getProperty('rev') || 0);
  if (req.action === 'pull') { var f = tepDuLieu_(); return { ok: true, rev: rev, savedAt: p.getProperty('savedAt'), payload: f ? JSON.parse(f.getBlob().getDataAsString('UTF-8')) : null }; }
  if (!req.payload || req.payload.app !== APP_ID || !req.payload.data) return { ok: false, error: 'Dữ liệu gửi lên không đúng cấu trúc' };
  if (!req.force && rev > 0 && Number(req.baseRev || 0) !== rev) return { ok: false, conflict: true, rev: rev, savedAt: p.getProperty('savedAt'), savedBy: p.getProperty('savedBy') };
  var text = JSON.stringify(req.payload), file = tepDuLieu_();
  if (file) file.setContent(text); else DriveApp.createFile(TEN_TEP, text, 'application/json');
  rev += 1;
  p.setProperties({ rev: String(rev), savedAt: new Date().toISOString(), savedBy: String(req.payload.exportedBy || '') });
  return { ok: true, rev: rev, savedAt: p.getProperty('savedAt') };
}

/* ======================= 2. Văn bản đến ======================= */
// Trạng thái: cho_doc (đã nhận, chưa đọc) | cho_duyet (đã đọc, chờ cán bộ duyệt) | loi | da_xu_ly | bo_qua
function tepHangDoi_() { var it = DriveApp.getFilesByName(TEN_TEP_HANG_DOI); return it.hasNext() ? it.next() : null; }
function docHangDoi_() { var f = tepHangDoi_(); var q = f ? JSON.parse(f.getBlob().getDataAsString('UTF-8')) : {}; q.items = q.items || []; return q; }
function ghiHangDoi_(q) {
  var mo = q.items.filter(function (x) { return ['cho_doc', 'cho_duyet', 'loi'].indexOf(x.status) >= 0; });
  var xong = q.items.filter(function (x) { return ['cho_doc', 'cho_duyet', 'loi'].indexOf(x.status) < 0; })
    .sort(function (a, b) { return String(b.done_at || '').localeCompare(String(a.done_at || '')); }).slice(0, GIU_DA_XU_LY);
  q.items = mo.concat(xong);
  var text = JSON.stringify(q), f = tepHangDoi_();
  if (f) f.setContent(text); else DriveApp.createFile(TEN_TEP_HANG_DOI, text, 'application/json');
}
function tomTat_(q) { var n = function (s) { return q.items.filter(function (x) { return x.status === s; }).length; }; return { cho_doc: n('cho_doc'), cho_duyet: n('cho_duyet'), loi: n('loi') }; }
function thuMucVB_() {
  var id = props_().getProperty('INBOX_FOLDER_ID');
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  var it = DriveApp.getFoldersByName(TEN_THU_MUC_VB), folder = it.hasNext() ? it.next() : DriveApp.createFolder(TEN_THU_MUC_VB);
  props_().setProperty('INBOX_FOLDER_ID', folder.getId());
  return folder;
}
function thuMucDaDoc_(vb) { var it = vb.getFoldersByName(TEN_THU_MUC_DA_DOC); return it.hasNext() ? it.next() : vb.createFolder(TEN_THU_MUC_DA_DOC); }
function datThuMuc_(url) {
  var m = String(url || '').match(/folders\/([\w-]{10,})/) || String(url || '').match(/[?&]id=([\w-]{10,})/) || String(url || '').match(/^([\w-]{10,})$/);
  if (!m) return { ok: false, error: 'Hãy dán liên kết thư mục Google Drive (drive.google.com/drive/folders/...) hoặc ID thư mục.' };
  var f; try { f = DriveApp.getFolderById(m[1]); } catch (e) { return { ok: false, error: 'Không mở được thư mục. Kiểm tra liên kết và quyền của tài khoản chạy Apps Script.' }; }
  if (f.isTrashed()) return { ok: false, error: 'Thư mục đang trong Thùng rác.' };
  if (f.getName() === TEN_THU_MUC_DA_DOC) return { ok: false, error: 'Không chọn thư mục "Đã đọc"; chọn thư mục nhận văn bản.' };
  props_().setProperty('INBOX_FOLDER_ID', f.getId());
  return hangDoi_();
}
function quet_(q) {
  var vb = thuMucVB_(), biet = {}, them = 0;
  q.items.forEach(function (x) { biet[x.file_id] = true; });
  var it = vb.getFiles();
  while (it.hasNext()) {
    var f = it.next(); if (biet[f.getId()]) continue;
    q.items.push({ id: 'vb_' + f.getId(), file_id: f.getId(), name: f.getName(), mime: f.getMimeType(), size: f.getSize(), url: f.getUrl(),
      received: new Date(f.getDateCreated()).toISOString(), status: 'cho_doc' });
    them++;
  }
  return them;
}
function hangDoi_() {
  var q = docHangDoi_(); if (quet_(q)) ghiHangDoi_(q);
  var vb = thuMucVB_();
  return { ok: true, items: q.items, summary: tomTat_(q), folder_url: vb.getUrl(), folder_name: vb.getName(), tuDong: dangBatTrigger_(), ai: moTaAI_(), driveOcr: typeof Drive !== 'undefined' && !!Drive.Files };
}
function taiLen_(req) {
  if (!req.data) return { ok: false, error: 'Thiếu nội dung tệp.' };
  if (String(req.data).length * 0.75 > FILE_TOI_DA_MB * 1048576) return { ok: false, error: 'Tệp quá lớn (tối đa ' + FILE_TOI_DA_MB + ' MB).' };
  var blob = Utilities.newBlob(Utilities.base64Decode(String(req.data)), String(req.mime || 'application/octet-stream'), String(req.name || 'van-ban'));
  var f = thuMucVB_().createFile(blob), q = docHangDoi_(); quet_(q); ghiHangDoi_(q);
  return { ok: true, id: 'vb_' + f.getId(), state: hangDoi_() };
}

/* ---- Lấy chữ từ tệp ---- */
function layChu_(f) {
  var mime = f.getMimeType(), ten = f.getName();
  if (mime === 'application/vnd.google-apps.document') return { text: DocumentApp.openById(f.getId()).getBody().getText(), cach: 'Google Docs' };
  if (/^text\//.test(mime)) return { text: f.getBlob().getDataAsString('UTF-8'), cach: 'tệp chữ' };
  if (/officedocument\.wordprocessingml/.test(mime) || /\.docx$/i.test(ten)) {
    var parts = Utilities.unzip(f.getBlob().setContentType('application/zip'));
    var doc = parts.filter(function (b) { return b.getName() === 'word/document.xml'; })[0];
    if (!doc) throw new Error('Tệp Word hỏng hoặc không phải .docx.');
    var xml = doc.getDataAsString('UTF-8').replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, '\t').replace(/<w:br\/>/g, '\n').replace(/<[^>]+>/g, '');
    return { text: xml.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"), cach: 'Word .docx' };
  }
  if (mime === 'application/pdf' || /\.pdf$/i.test(ten) || /^image\//.test(mime)) return { text: ocr_(f), cach: 'Drive OCR' };
  throw new Error('Chưa hỗ trợ định dạng ' + mime + '. Dùng PDF, ảnh chụp, Word .docx hoặc Google Docs.');
}
// Drive chuyển PDF/ảnh sang Google Docs có nhận dạng chữ tiếng Việt; bản chuyển đổi chỉ là tạm, xóa ngay sau khi lấy chữ.
function ocr_(f) {
  if (typeof Drive === 'undefined' || !Drive.Files) throw new Error('Chưa bật dịch vụ Drive API trong Apps Script (Dịch vụ → Drive API) nên chưa nhận dạng được PDF scan, ảnh.');
  var tam = null;
  try {
    if (Drive.Files.create) tam = Drive.Files.create({ name: 'OCR tạm - ' + f.getName(), mimeType: 'application/vnd.google-apps.document' }, f.getBlob(), { ocrLanguage: 'vi', fields: 'id' });
    else tam = Drive.Files.insert({ title: 'OCR tạm - ' + f.getName(), mimeType: 'application/vnd.google-apps.document' }, f.getBlob(), { ocr: true, ocrLanguage: 'vi' });
    var text = String(DocumentApp.openById(tam.id).getBody().getText() || '').trim();
    if (text.length < 30) throw new Error('Không nhận dạng được đủ chữ (bản scan mờ hoặc tệp rỗng).');
    return text;
  } finally {
    if (tam && tam.id) { try { (Drive.Files.remove || Drive.Files.trash).call(Drive.Files, tam.id); } catch (e) { try { DriveApp.getFileById(tam.id).setTrashed(true); } catch (e2) {} } }
  }
}

/* ---- Gọi AI Cloudflare ---- */
function moTaAI_() {
  var p = props_();
  if (p.getProperty('CF_ACCOUNT_ID') && p.getProperty('CF_API_TOKEN')) return 'Cloudflare Workers AI (khóa riêng)';
  return 'Worker ' + (p.getProperty('CF_WORKER_URL') || CF_WORKER_MAC_DINH).replace(/^https?:\/\//, '');
}
function goiAI_(system, user) {
  var p = props_(), acc = p.getProperty('CF_ACCOUNT_ID'), tok = p.getProperty('CF_API_TOKEN'), r, j, text;
  var msgs = [{ role: 'system', content: system }, { role: 'user', content: user }];
  if (acc && tok) {
    var model = p.getProperty('CF_AI_MODEL') || '@cf/google/gemma-4-26b-a4b-it';
    r = UrlFetchApp.fetch('https://api.cloudflare.com/client/v4/accounts/' + acc + '/ai/v1/chat/completions', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + tok }, payload: JSON.stringify({ model: model, messages: msgs, max_tokens: 3000, temperature: 0.1, chat_template_kwargs: { enable_thinking: false } }) });
    j = JSON.parse(r.getContentText() || '{}');
    text = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
  } else {
    r = UrlFetchApp.fetch(p.getProperty('CF_WORKER_URL') || CF_WORKER_MAC_DINH, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ messages: msgs, max_tokens: 3000 }) });
    j = JSON.parse(r.getContentText() || '{}');
    text = j.text || '';
  }
  var code = r.getResponseCode();
  if (code === 429 || code === 503) { var e = new Error('AI Cloudflare đang hết hạn mức hoặc quá tải (HTTP ' + code + ')'); e.tam = true; throw e; }
  if (code >= 300 || !text) throw new Error('AI không trả nội dung (HTTP ' + code + (j.error ? ': ' + JSON.stringify(j.error).slice(0, 200) : '') + ')');
  return String(text);
}
function thuAI_() {
  try { var t = goiAI_('Chỉ trả lời đúng một từ.', 'Trả lời: OK'); return { ok: true, ai: moTaAI_(), reply: t.slice(0, 50) }; }
  catch (e) { return { ok: false, ai: moTaAI_(), error: String(e.message || e) }; }
}

/* ---- Đọc văn bản trong hàng đợi ---- */
function docMot_(it) {
  var f = DriveApp.getFileById(it.file_id), c = layChu_(f), text = String(c.text || '').replace(/\r/g, '');
  var qt = TrichVB.trichQuyTac(text), kq, aiLoi = '';
  try { kq = TrichVB.ghep(TrichVB.docJson(goiAI_(TrichVB.LOI_NHAC_HE_THONG, TrichVB.loiNhacNguoiDung(text, it.name))), qt); }
  catch (e) { if (e.tam) throw e; aiLoi = String(e.message || e); kq = TrichVB.chuanHoa(qt); kq.nguon_trich = 'quy_tac'; }
  kq.ai_loi = aiLoi; kq.cach_doc = c.cach; kq.van_ban = text.slice(0, 8000); kq.van_ban_cat = text.length > 8000;
  return { kq: kq, file: f };
}
function xuLy_(opts) {
  var q = docHangDoi_(); quet_(q);
  var now = new Date().toISOString(), cho = q.items.filter(function (x) { return x.status === 'cho_doc' && (!x.retry_at || x.retry_at <= now) && (!opts.id || x.id === opts.id); }).slice(0, opts.max || TOI_DA_MOI_LAN);
  var daDoc = thuMucDaDoc_(thuMucVB_()), n = 0, hoan = false;
  cho.forEach(function (it) {
    if (hoan) return;
    var f = null;
    try { var r = docMot_(it); f = r.file; it.result = r.kq; it.status = 'cho_duyet'; delete it.error; delete it.retry_at; n++; }
    catch (e) {
      if (e.tam) { it.retry_at = new Date(Date.now() + 15 * 60000).toISOString(); it.error = String(e.message) + ' — sẽ tự thử lại.'; hoan = true; return; }
      it.status = 'loi'; it.error = String(e && e.message || e); try { f = DriveApp.getFileById(it.file_id); } catch (e2) {}
    }
    it.processed_at = new Date().toISOString();
    try { if (f) f.moveTo(daDoc); } catch (e3) {}
  });
  ghiHangDoi_(q);
  var s = hangDoi_(); s.processed = n; s.deferred = hoan; return s;
}
function thuLai_(id) {
  var q = docHangDoi_(), it = q.items.filter(function (x) { return x.id === id; })[0];
  if (!it) return { ok: false, error: 'Không tìm thấy văn bản trong hàng đợi.' };
  it.status = 'cho_doc'; delete it.error; delete it.result; delete it.retry_at; ghiHangDoi_(q);
  return xuLy_({ max: 1, id: id });
}
function danhDau_(req) {
  var q = docHangDoi_(), it = q.items.filter(function (x) { return x.id === req.id; })[0];
  if (!it) return { ok: false, error: 'Không tìm thấy văn bản trong hàng đợi.' };
  if (['da_xu_ly', 'bo_qua', 'cho_duyet'].indexOf(req.status) < 0) return { ok: false, error: 'Trạng thái không hợp lệ.' };
  it.status = req.status;
  if (req.status === 'cho_duyet') { delete it.done_at; delete it.done_by; delete it.applied; }
  else { it.done_at = new Date().toISOString(); it.done_by = String(req.by || ''); it.applied = String(req.applied || '').slice(0, 500); }
  ghiHangDoi_(q);
  return { ok: true, summary: tomTat_(q) };
}

/* ---- Tự động ---- */
function dangBatTrigger_() { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'xuLyVanBanDen'; }); }
function caiDatTrigger_(on) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'xuLyVanBanDen') ScriptApp.deleteTrigger(t); });
  if (!on) return 'Đã tắt tự động đọc văn bản đến.';
  ScriptApp.newTrigger('xuLyVanBanDen').timeBased().everyMinutes(QUET_MOI_PHUT).create();
  return 'Đã bật tự động đọc văn bản đến mỗi ' + QUET_MOI_PHUT + ' phút.';
}
/** Chạy tay một lần để cấp quyền và bật quét tự động. */
function caiDatVanBanDen() { thuMucVB_(); Logger.log(caiDatTrigger_(true)); Logger.log(JSON.stringify(thuAI_())); }
/** Trigger gọi định kỳ. */
function xuLyVanBanDen() {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { var r = xuLy_({ max: TOI_DA_MOI_LAN }); Logger.log('Đã đọc ' + r.processed + ' văn bản; chờ duyệt ' + r.summary.cho_duyet + ', lỗi ' + r.summary.loi + '.'); }
  finally { lock.releaseLock(); }
}

/* ======================= Mô-đun dùng chung (chép tự động khi build — không sửa tay) ======================= */
// @@BEGIN trich-van-ban
/* ============================================================
   trich-van-ban.js — Nhận dạng loại văn bản và bóc tách thông tin
   Dùng chung: trình duyệt (phần mềm) và Google Apps Script (máy chủ quét thư mục Drive).
   - phanLoai(text): đoán loại văn bản theo câu chữ đặc trưng
   - trichQuyTac(text): bóc tách theo mẫu câu (không cần AI) — dự phòng khi AI không dùng được
   - LOI_NHAC_HE_THONG + loiNhacNguoiDung(text): lời nhắc cho AI, yêu cầu trả JSON theo cấu trúc cố định
   - docJson(text): đọc JSON trả về từ AI (chịu được ``` và chữ thừa)
   - chuanHoa(obj) / ghep(ai, quyTac): chuẩn hóa số tiền, ngày; bổ sung trường AI bỏ sót bằng kết quả quy tắc
   Không chứa khóa API, không gọi mạng.
   ============================================================ */
var TrichVB = (function () {
  'use strict';
  var LOAI = [
    ['khlcnt_qd', 'Quyết định phê duyệt kế hoạch lựa chọn nhà thầu'],
    ['khlcnt_trinh', 'Tờ trình, kế hoạch lựa chọn nhà thầu (chưa phê duyệt)'],
    ['kqlcnt_qd', 'Quyết định phê duyệt kết quả lựa chọn nhà thầu'],
    ['hop_dong', 'Hợp đồng'],
    ['phu_luc_hd', 'Phụ lục hợp đồng'],
    ['nghiem_thu', 'Biên bản nghiệm thu'],
    ['thanh_ly_hd', 'Biên bản thanh lý hợp đồng'],
    ['du_toan_qd', 'Quyết định giao, bổ sung, điều chỉnh, thu hồi dự toán'],
    ['khac', 'Văn bản khác']
  ];
  var MA_LOAI = LOAI.map(function (x) { return x[0]; });

  function boDau(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function gon(s) { return String(s == null ? '' : s).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ngayHopLe(y, m, d) {
    if (!(y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
    var t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
  }
  /** "05/11/2026" | "5-11-2026" | "ngày 5 tháng 11 năm 2026" | "2026-11-05" → "2026-11-05"; không đọc được → "" */
  function ngayISO(v) {
    if (v == null) return '';
    var s = String(v).trim(), m;
    if ((m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) { if (ngayHopLe(+m[1], +m[2], +m[3])) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]); }
    if ((m = boDau(s).match(/ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})/))) { if (ngayHopLe(+m[3], +m[2], +m[1])) return m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]); }
    if ((m = s.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})/))) { if (ngayHopLe(+m[3], +m[2], +m[1])) return m[3] + '-' + pad(+m[2]) + '-' + pad(+m[1]); }
    return '';
  }
  /** "1.234.567.890 đồng" | "1,5 tỷ đồng" | "350 triệu" | 1234 → số nguyên đồng; không đọc được → null */
  function soTien(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? Math.round(v) : null;
    var s = boDau(v).replace(/\s+/g, ' ').trim(), nhan = 1;
    if (/ty\b|ty dong/.test(s)) nhan = 1e9; else if (/trieu/.test(s)) nhan = 1e6; else if (/nghin|ngan\b/.test(s)) nhan = 1e3;
    var m = s.match(/-?\d[\d.,\s]*/); if (!m) return null;
    var t = m[0].replace(/\s/g, '');
    if (nhan > 1) { t = t.replace(/\./g, '').replace(',', '.'); }   // "1,5 tỷ"
    else {
      var dots = (t.match(/\./g) || []).length, commas = (t.match(/,/g) || []).length;
      if (dots && commas) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
      else if (dots > 1 || (dots === 1 && /\.\d{3}$/.test(t))) t = t.replace(/\./g, '');
      else if (commas > 1 || (commas === 1 && /,\d{3}$/.test(t))) t = t.replace(/,/g, '');
      else t = t.replace(',', '.');
    }
    var n = parseFloat(t); if (!isFinite(n)) return null;
    return Math.round(n * nhan);
  }

  /* ---------- Nhận dạng loại văn bản ---------- */
  function phanLoai(text) {
    var d = boDau(text).replace(/\s+/g, ' '), dau = d.slice(0, 2500);
    if (/thanh ly hop dong/.test(dau) && /bien ban/.test(dau)) return 'thanh_ly_hd';
    if (/phu luc hop dong/.test(dau)) return 'phu_luc_hd';
    if (/bien ban nghiem thu/.test(dau)) return 'nghiem_thu';
    if (/phe duyet ket qua lua chon nha thau|phe duyet ket qua (dau thau|chi dinh thau|chao hang)/.test(dau)) return 'kqlcnt_qd';
    if (/quyet dinh/.test(dau) && /phe duyet ke hoach lua chon nha thau/.test(dau)) return 'khlcnt_qd';
    if (/ke hoach lua chon nha thau/.test(dau) && /to trinh|de nghi (tham dinh|phe duyet)/.test(dau)) return 'khlcnt_trinh';
    if (/quyet dinh/.test(dau) && /(giao|bo sung|dieu chinh|thu hoi|phan bo)[^.]{0,40}du toan/.test(dau)) return 'du_toan_qd';
    if (/hop dong/.test(dau.slice(0, 900)) && /ben (a|giao thau)/.test(d) && /ben (b|nhan thau)/.test(d)) return 'hop_dong';
    return 'khac';
  }

  /* ---------- Bóc tách theo mẫu câu ---------- */
  function sau(text, nhan, toiDa) {   // giá trị sau nhãn "Tên gói thầu:" trên cùng dòng
    var re = new RegExp('(?:^|\\n)\\s*(?:[-+•*]\\s*|\\d+[.)]\\s*|[a-zđ][.)]\\s*)?(?:' + nhan + ')\\s*[:：]\\s*([^\\n]{2,' + (toiDa || 300) + '})', 'i');
    var m = String(text).match(re); return m ? gon(m[1]).replace(/[;.,]\s*$/, '') : '';
  }
  function soVB(text) {
    var m = String(text).slice(0, 1500).match(/\bS[ốô]\s*[:：]?\s*([0-9]{1,6}\s*\/\s*[0-9]{0,4}\s*\/?\s*[A-ZĐ][A-ZĐ0-9\-–&]*(?:\s*-\s*[A-ZĐ0-9&]+)*)/);
    return m ? m[1].replace(/\s+/g, '').replace(/–/g, '-') : '';
  }
  function ngayVB(text) {
    var dau = String(text).slice(0, 2000), m = dau.match(/ngày\s*\d{1,2}\s*tháng\s*\d{1,2}\s*năm\s*\d{4}/i);
    return m ? ngayISO(m[0]) : ngayISO((dau.match(/\d{1,2}\/\d{1,2}\/\d{4}/) || [''])[0]);
  }
  function coQuan(text) {
    var dong = String(text).split('\n').slice(0, 8).map(gon).filter(Boolean), kq = '';
    for (var i = 0; i < dong.length; i++) {
      if (/CỘNG HÒA|CỘNG HOÀ|Độc lập/i.test(dong[i])) continue;
      if (/^(UBND|ỦY BAN|UỶ BAN|SỞ|BAN|PHÒNG|TRUNG TÂM|CHI CỤC|VĂN PHÒNG|CÔNG TY|BỘ)\b/.test(dong[i])) { kq = kq ? kq + ' ' + dong[i] : dong[i]; if (/^(SỞ|BAN|PHÒNG|TRUNG TÂM|CHI CỤC|VĂN PHÒNG|CÔNG TY|BỘ)\b/.test(dong[i])) break; }
    }
    return kq.replace(/\s+/g, ' ');
  }
  function trichYeu(text) {
    var t = String(text), m = t.match(/(?:QUYẾT ĐỊNH|TỜ TRÌNH|BIÊN BẢN|HỢP ĐỒNG|PHỤ LỤC HỢP ĐỒNG)\s*\n\s*([^\n]{8,240}(?:\n[^\n]{3,200}){0,2})/);
    if (m) { var s = gon(m[1]).split('\n'); var out = []; for (var i = 0; i < s.length; i++) { if (/^(Căn cứ|GIÁM ĐỐC|CHỦ TỊCH|Kính gửi|Số:|Hôm nay|Điều\s+\d|QUYẾT ĐỊNH|[-+•*]\s)/i.test(s[i])) break; out.push(s[i]); } if (out.length) return out.join(' ').replace(/\s+/g, ' '); }
    var v = t.match(/V\/v\s*([^\n]{5,240})/i); return v ? gon(v[1]) : '';
  }
  function tien(text, nhan) { var s = sau(text, nhan, 200); return s ? soTien(s) : null; }
  function trichQuyTac(text) {
    var t = gon(text), loai = phanLoai(t), r = { loai: loai, so_van_ban: soVB(t) || null, ngay_van_ban: ngayVB(t) || null, co_quan_ban_hanh: coQuan(t) || null, trich_yeu: trichYeu(t) || null, nguon_trich: 'quy_tac' };
    var tenDA = sau(t, 'Tên dự án|Tên nhiệm vụ|Tên dự toán|Dự án|Nhiệm vụ', 250); if (tenDA) r.ten_du_an_nhiem_vu = tenDA;
    var goi = { ten: sau(t, 'Tên gói thầu', 300) || null, gia_goi_thau: tien(t, 'Giá gói thầu'), nguon_von: sau(t, 'Nguồn vốn', 200) || null, hinh_thuc_lcnt: sau(t, 'Hình thức lựa chọn nhà thầu', 150) || null, phuong_thuc: sau(t, 'Phương thức lựa chọn nhà thầu', 150) || null, thoi_gian_bat_dau_lcnt: sau(t, 'Thời gian (?:bắt đầu )?tổ chức lựa chọn nhà thầu', 150) || null, loai_hop_dong: sau(t, 'Loại hợp đồng', 100) || null, thoi_gian_thuc_hien_hd: sau(t, 'Thời gian thực hiện (?:gói thầu|hợp đồng)', 150) || null };
    if (loai === 'khlcnt_qd' || loai === 'khlcnt_trinh') r.goi_thau = goi.ten || goi.gia_goi_thau ? [goi] : [];
    if (loai === 'kqlcnt_qd') r.ket_qua = { ten_goi_thau: goi.ten, nha_thau: sau(t, 'Tên nhà thầu(?: trúng thầu)?|Nhà thầu trúng thầu|Đơn vị trúng thầu', 250) || null, gia_trung_thau: tien(t, 'Giá trúng thầu|Giá đề nghị trúng thầu'), thoi_gian_thuc_hien_hd: goi.thoi_gian_thuc_hien_hd, loai_hop_dong: goi.loai_hop_dong };
    if (loai === 'hop_dong') {
      var so = (t.match(/H[ỢO]P Đ[ỒO]NG[^\n]*\n?\s*S[ốô]\s*[:：]?\s*([^\n]{3,60})/i) || [])[1] || r.so_van_ban || '';
      r.hop_dong = { so_hop_dong: gon(so).replace(/\s+/g, '') || null, ngay_ky: r.ngay_van_ban, ten: sau(t, 'Tên hợp đồng|Gói thầu|Tên gói thầu', 300) || r.trich_yeu, ten_goi_thau: goi.ten, nha_thau: sau(t, 'Bên B|Bên nhận thầu|Nhà thầu|Bên nhận', 250) || null, ben_a: sau(t, 'Bên A|Bên giao thầu|Chủ đầu tư', 250) || null, gia_tri: tien(t, 'Giá (?:trị )?hợp đồng|Tổng giá trị hợp đồng|Giá hợp đồng'), loai_hop_dong: goi.loai_hop_dong, thoi_gian_thuc_hien: goi.thoi_gian_thuc_hien_hd, tam_ung: tien(t, 'Tạm ứng|Giá trị tạm ứng|Mức tạm ứng'), bao_lanh_thuc_hien: tien(t, 'Bảo đảm thực hiện hợp đồng|Bảo lãnh thực hiện hợp đồng') };
    }
    if (loai === 'phu_luc_hd') r.phu_luc = { so_hop_dong: sau(t, 'Hợp đồng số|Căn cứ Hợp đồng số', 80) || null, so_phu_luc: r.so_van_ban, noi_dung: r.trich_yeu, gia_tri_dieu_chinh: tien(t, 'Giá trị điều chỉnh|Giá trị tăng|Giá trị giảm'), gia_han_den: ngayISO(sau(t, 'Gia hạn (?:thời gian thực hiện )?(?:hợp đồng )?đến', 80)) || null };
    if (loai === 'nghiem_thu') r.nghiem_thu = { so_hop_dong: sau(t, 'Hợp đồng số|Căn cứ Hợp đồng số', 80) || null, noi_dung: r.trich_yeu, gia_tri: tien(t, 'Giá trị nghiệm thu|Giá trị khối lượng hoàn thành|Giá trị đề nghị thanh toán') };
    if (loai === 'thanh_ly_hd') r.thanh_ly = { so_hop_dong: sau(t, 'Hợp đồng số|Căn cứ Hợp đồng số', 80) || null, gia_tri_quyet_toan: tien(t, 'Giá trị quyết toán|Giá trị thanh lý|Giá trị hoàn thành'), da_thanh_toan: tien(t, 'Đã thanh toán|Giá trị đã thanh toán') };
    if (loai === 'du_toan_qd') { var dd = boDau(t.slice(0, 1500)); r.du_toan = { loai_dieu_chinh: /thu hoi/.test(dd) ? 'thu_hoi' : /bo sung/.test(dd) ? 'bo_sung' : /dieu chinh/.test(dd) ? 'dieu_chinh' : 'giao', dong: [], tong_so_tien: tien(t, 'Tổng (?:số )?(?:kinh phí|dự toán|số tiền)') } ; }
    return r;
  }

  /* ---------- Lời nhắc AI ---------- */
  var LOI_NHAC_HE_THONG = [
    'Bạn là chuyên viên Phòng Kế hoạch - Tài chính, Sở Nông nghiệp và Môi trường tỉnh Sơn La. Nhiệm vụ: đọc văn bản và trích thông tin để nhập vào phần mềm quản lý.',
    'Trả về DUY NHẤT một đối tượng JSON hợp lệ, không giải thích, không dùng ```.',
    'Quy tắc bắt buộc:',
    '1. Chỉ lấy thông tin có trong văn bản. Không có thì để null. Không suy đoán, không tự tính.',
    '2. Số tiền ghi số nguyên, đơn vị đồng, không dấu chấm, dấu phẩy (ví dụ 1250000000).',
    '3. Ngày ghi dạng dd/mm/yyyy.',
    '4. "loai" là một trong: khlcnt_qd (QĐ phê duyệt kế hoạch lựa chọn nhà thầu), khlcnt_trinh (tờ trình/KHLCNT chưa phê duyệt), kqlcnt_qd (QĐ phê duyệt kết quả lựa chọn nhà thầu), hop_dong, phu_luc_hd, nghiem_thu, thanh_ly_hd, du_toan_qd (QĐ giao/bổ sung/điều chỉnh/thu hồi dự toán), khac.',
    '5. Bảng danh mục gói thầu: mỗi dòng gói thầu là một phần tử của "goi_thau", giữ nguyên tên gói thầu.',
    '6. "trich_dan": với mỗi số tiền, ghi nguyên văn ngắn (dưới 120 ký tự) câu chứa số tiền đó để người duyệt đối chiếu.',
    'Cấu trúc JSON (chỉ điền phần đúng với loại văn bản, phần khác để null):',
    '{"loai":"","so_van_ban":null,"ngay_van_ban":null,"co_quan_ban_hanh":null,"trich_yeu":null,"ten_du_an_nhiem_vu":null,',
    '"goi_thau":[{"ten":null,"gia_goi_thau":null,"nguon_von":null,"hinh_thuc_lcnt":null,"phuong_thuc":null,"thoi_gian_bat_dau_lcnt":null,"loai_hop_dong":null,"thoi_gian_thuc_hien_hd":null}],',
    '"ket_qua":{"ten_goi_thau":null,"nha_thau":null,"gia_trung_thau":null,"thoi_gian_thuc_hien_hd":null,"loai_hop_dong":null},',
    '"hop_dong":{"so_hop_dong":null,"ngay_ky":null,"ten":null,"ten_goi_thau":null,"ben_a":null,"nha_thau":null,"gia_tri":null,"loai_hop_dong":null,"ngay_bat_dau":null,"ngay_ket_thuc":null,"thoi_gian_thuc_hien":null,"tam_ung":null,"bao_lanh_thuc_hien":null,"bao_lanh_thuc_hien_den":null},',
    '"phu_luc":{"so_hop_dong":null,"so_phu_luc":null,"noi_dung":null,"gia_tri_dieu_chinh":null,"gia_han_den":null},',
    '"nghiem_thu":{"so_hop_dong":null,"noi_dung":null,"gia_tri":null},',
    '"thanh_ly":{"so_hop_dong":null,"gia_tri_quyet_toan":null,"da_thanh_toan":null},',
    '"du_toan":{"loai_dieu_chinh":null,"tong_so_tien":null,"dong":[{"don_vi":null,"noi_dung":null,"so_tien":null}]},',
    '"trich_dan":{}}'
  ].join('\n');
  var TOI_DA_KY_TU = 14000;
  function loiNhacNguoiDung(text, tenTep) {
    var t = gon(text), cat = t.length > TOI_DA_KY_TU;
    return 'Văn bản' + (tenTep ? ' "' + tenTep + '"' : '') + (cat ? ' (đã cắt, chỉ gửi ' + TOI_DA_KY_TU + ' ký tự đầu)' : '') + ':\n\n' + t.slice(0, TOI_DA_KY_TU);
  }

  /* ---------- Đọc, chuẩn hóa kết quả ---------- */
  function docJson(text) {
    var s = String(text || '').replace(/```(?:json)?/gi, '').trim(), a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('AI không trả về JSON');
    var j = s.slice(a, b + 1);
    try { return JSON.parse(j); }
    catch (e) { return JSON.parse(j.replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"')); }
  }
  var TRUONG_TIEN = { goi_thau: ['gia_goi_thau'], ket_qua: ['gia_trung_thau'], hop_dong: ['gia_tri', 'tam_ung', 'bao_lanh_thuc_hien'], phu_luc: ['gia_tri_dieu_chinh'], nghiem_thu: ['gia_tri'], thanh_ly: ['gia_tri_quyet_toan', 'da_thanh_toan'], du_toan: ['tong_so_tien'] };
  var TRUONG_NGAY = { hop_dong: ['ngay_ky', 'ngay_bat_dau', 'ngay_ket_thuc', 'bao_lanh_thuc_hien_den'], phu_luc: ['gia_han_den'] };
  function rong(v) { return v == null || v === '' || (typeof v === 'string' && /^(null|không có|khong co|n\/a|-)$/i.test(v.trim())); }
  function chuanHoa(o) {
    o = o && typeof o === 'object' ? o : {};
    var r = {};
    Object.keys(o).forEach(function (k) { r[k] = o[k]; });
    if (MA_LOAI.indexOf(r.loai) < 0) r.loai = 'khac';
    ['so_van_ban', 'co_quan_ban_hanh', 'trich_yeu', 'ten_du_an_nhiem_vu'].forEach(function (k) { r[k] = rong(r[k]) ? null : gon(r[k]); });
    if (r.so_van_ban) r.so_van_ban = r.so_van_ban.replace(/^S[ốô]\s*[:：]?\s*/i, '').replace(/\s+/g, '');
    r.ngay_van_ban = rong(r.ngay_van_ban) ? null : (ngayISO(r.ngay_van_ban) || null);
    var lam = function (obj, sec) {
      if (!obj || typeof obj !== 'object') return obj;
      Object.keys(obj).forEach(function (k) { if (rong(obj[k])) obj[k] = null; else if (typeof obj[k] === 'string') obj[k] = gon(obj[k]); });
      (TRUONG_TIEN[sec] || []).forEach(function (k) { if (obj[k] != null) obj[k] = soTien(obj[k]); });
      (TRUONG_NGAY[sec] || []).forEach(function (k) { if (obj[k] != null) obj[k] = ngayISO(obj[k]) || null; });
      return obj;
    };
    if (Array.isArray(r.goi_thau)) r.goi_thau = r.goi_thau.map(function (g) { return lam(g, 'goi_thau'); }).filter(function (g) { return g && (g.ten || g.gia_goi_thau); }); else r.goi_thau = [];
    ['ket_qua', 'hop_dong', 'phu_luc', 'nghiem_thu', 'thanh_ly', 'du_toan'].forEach(function (k) { if (r[k] && typeof r[k] === 'object') r[k] = lam(r[k], k); else r[k] = null; });
    if (r.du_toan && Array.isArray(r.du_toan.dong)) r.du_toan.dong = r.du_toan.dong.map(function (d) { return { don_vi: rong(d && d.don_vi) ? null : gon(d.don_vi), noi_dung: rong(d && d.noi_dung) ? null : gon(d.noi_dung), so_tien: soTien(d && d.so_tien) }; }).filter(function (d) { return d.noi_dung || d.so_tien; });
    if (r.trich_dan && typeof r.trich_dan !== 'object') r.trich_dan = {};
    return r;
  }
  /** Ưu tiên AI; trường AI để trống thì lấy từ quy tắc. Ghi lại trường nào lấy từ đâu. */
  function ghep(ai, qt) {
    var a = chuanHoa(ai), q = chuanHoa(qt), bu = [];
    if (a.loai === 'khac' && q.loai !== 'khac') { a.loai = q.loai; bu.push('loai'); }
    ['so_van_ban', 'ngay_van_ban', 'co_quan_ban_hanh', 'trich_yeu', 'ten_du_an_nhiem_vu'].forEach(function (k) { if (!a[k] && q[k]) { a[k] = q[k]; bu.push(k); } });
    ['ket_qua', 'hop_dong', 'phu_luc', 'nghiem_thu', 'thanh_ly', 'du_toan'].forEach(function (k) {
      if (!q[k]) return; if (!a[k]) { a[k] = q[k]; bu.push(k); return; }
      Object.keys(q[k]).forEach(function (f) { if (a[k][f] == null && q[k][f] != null && f !== 'dong') { a[k][f] = q[k][f]; bu.push(k + '.' + f); } });
    });
    if (!a.goi_thau.length && q.goi_thau.length) { a.goi_thau = q.goi_thau; bu.push('goi_thau'); }
    a.bo_sung_quy_tac = bu; a.nguon_trich = 'ai';
    return a;
  }
  /** Mức giống nhau của hai tên (0..1) theo tập từ — dùng để gợi ý gói thầu, hợp đồng đã có */
  function giongTen(a, b) {
    var ta = boDau(a).split(/[^a-z0-9]+/).filter(function (x) { return x.length > 1; }), tb = boDau(b).split(/[^a-z0-9]+/).filter(function (x) { return x.length > 1; });
    if (!ta.length || !tb.length) return 0;
    var sb = {}; tb.forEach(function (x) { sb[x] = 1; }); var chung = ta.filter(function (x) { return sb[x]; }).length;
    return 2 * chung / (ta.length + tb.length);
  }
  return { LOAI: LOAI, boDau: boDau, ngayISO: ngayISO, soTien: soTien, phanLoai: phanLoai, trichQuyTac: trichQuyTac, LOI_NHAC_HE_THONG: LOI_NHAC_HE_THONG, loiNhacNguoiDung: loiNhacNguoiDung, docJson: docJson, chuanHoa: chuanHoa, ghep: ghep, giongTen: giongTen, TOI_DA_KY_TU: TOI_DA_KY_TU };
})();
// @@END trich-van-ban
