/**
 * Phòng KH-TC số — dịch vụ đồng bộ tối giản trên Google Apps Script.
 * Lưu toàn bộ dữ liệu (một tệp JSON) trong Google Drive của tài khoản triển khai.
 *
 * Cài đặt:
 *  1. Vào script.google.com → Dự án mới → dán toàn bộ tệp này vào Code.gs.
 *  2. Đổi MA_BI_MAT thành một chuỗi riêng, khó đoán.
 *  3. Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web →
 *     Thực thi với tư cách: Tôi; Người có quyền truy cập: Bất kỳ ai.
 *  4. Sao chép URL .../exec dán vào Thiết lập → Đồng bộ trong phần mềm, nhập cùng mã bí mật.
 *
 * Giới hạn: mỗi lần đẩy/tải là toàn bộ dữ liệu (không kèm tệp đính kèm); không phân quyền theo người.
 * Ai có URL và mã bí mật đều đọc, ghi được dữ liệu — chỉ chia sẻ trong Phòng.
 */
var MA_BI_MAT = 'DOI-MA-NAY-TRUOC-KHI-DUNG';
var TEN_TEP = 'khtc-so-son-la-du-lieu.json';
var APP_ID = 'khtc-so-son-la';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var req = JSON.parse(e.postData.contents);
    if (req.app !== APP_ID) return out_({ ok: false, error: 'Sai ứng dụng' });
    if (MA_BI_MAT === 'DOI-MA-NAY-TRUOC-KHI-DUNG') return out_({ ok: false, error: 'Chưa đổi MA_BI_MAT trong Code.gs' });
    if (req.key !== MA_BI_MAT) return out_({ ok: false, error: 'Sai mã bí mật' });
    var props = PropertiesService.getScriptProperties();
    var rev = Number(props.getProperty('rev') || 0);
    if (req.action === 'info') return out_({ ok: true, rev: rev, savedAt: props.getProperty('savedAt'), savedBy: props.getProperty('savedBy') });
    if (req.action === 'pull') {
      var f = tep_();
      return out_({ ok: true, rev: rev, savedAt: props.getProperty('savedAt'), payload: f ? JSON.parse(f.getBlob().getDataAsString('UTF-8')) : null });
    }
    if (req.action === 'push') {
      if (!req.payload || req.payload.app !== APP_ID || !req.payload.data) return out_({ ok: false, error: 'Dữ liệu gửi lên không đúng cấu trúc' });
      if (!req.force && rev > 0 && Number(req.baseRev || 0) !== rev)
        return out_({ ok: false, conflict: true, rev: rev, savedAt: props.getProperty('savedAt'), savedBy: props.getProperty('savedBy') });
      var text = JSON.stringify(req.payload), file = tep_();
      if (file) file.setContent(text); else DriveApp.createFile(TEN_TEP, text, 'application/json');
      rev += 1;
      props.setProperties({ rev: String(rev), savedAt: new Date().toISOString(), savedBy: String(req.payload.exportedBy || '') });
      return out_({ ok: true, rev: rev, savedAt: props.getProperty('savedAt') });
    }
    return out_({ ok: false, error: 'Không rõ thao tác' });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
function doGet() { return out_({ ok: true, service: APP_ID, note: 'Dùng POST từ phần mềm.' }); }
function tep_() { var it = DriveApp.getFilesByName(TEN_TEP); return it.hasNext() ? it.next() : null; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
