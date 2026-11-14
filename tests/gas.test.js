// Kiểm thử máy chủ Apps Script (gas/Code.gs) trên bộ giả lập tối thiểu. node --test tests/gas.test.js
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');

const { env } = require('./gas-env.js');
const QD = 'SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG\nSố: 900/QĐ-SNNMT\nSơn La, ngày 06 tháng 11 năm 2026\nQUYẾT ĐỊNH\nPhê duyệt kết quả lựa chọn nhà thầu gói thầu tư vấn thử nghiệm\n- Tên gói thầu: Tư vấn lập hồ sơ mời thầu\n- Tên nhà thầu trúng thầu: Công ty Thử Nghiệm\n- Giá trúng thầu: 456.000.000 đồng';

test('xác thực: sai mã, sai ứng dụng', () => {
  const e = env();
  assert.match(e.post({ key: 'SAI', action: 'info' }).error, /Sai mã bí mật/);
  assert.match(JSON.parse(e.g.doPost({ postData: { contents: JSON.stringify({ app: 'khac', key: 'KHOA' }) } }).s).error, /Sai ứng dụng/);
  assert.equal(e.post({ action: 'info' }).version, 3);
});
test('đồng bộ: đẩy, tải, chống ghi đè', () => {
  const e = env(), pl = { app: 'khtc-so-son-la', data: { nhiemvu: [] }, exportedBy: 'A' };
  assert.equal(e.post({ action: 'push', baseRev: 0, payload: pl }).rev, 1);
  assert.deepEqual(e.post({ action: 'pull' }).payload.data, { nhiemvu: [] });
  assert.equal(e.post({ action: 'push', baseRev: 0, payload: pl }).conflict, true);
  assert.equal(e.post({ action: 'push', baseRev: 0, force: true, payload: pl }).rev, 2);
});
test('văn bản đến: tự tạo thư mục, tải lên tệp chữ, AI đọc, chờ duyệt, đánh dấu đã xử lý', () => {
  const e = env({ ai: b => ({ code: 200, json: { text: '```json\n{"loai":"kqlcnt_qd","so_van_ban":"900/QĐ-SNNMT","ket_qua":{"ten_goi_thau":"Tư vấn lập hồ sơ mời thầu","nha_thau":"Công ty Thử Nghiệm","gia_trung_thau":"456.000.000 đồng"}}\n```' } }) });
  const st = e.post({ action: 'inboxGet' });
  assert.equal(st.folder_name, 'KHTC_So_VAN_BAN_DEN');
  const up = e.post({ action: 'inboxUpload', name: 'qd900.txt', mime: 'text/plain', data: Buffer.from(QD).toString('base64') });
  assert.equal(up.state.summary.cho_doc, 1);
  const r = e.post({ action: 'inboxProcess' });
  assert.equal(r.processed, 1); assert.equal(r.summary.cho_duyet, 1);
  const it = r.items[0];
  assert.equal(it.result.loai, 'kqlcnt_qd'); assert.equal(it.result.ket_qua.gia_trung_thau, 456000000); assert.equal(it.result.nguon_trich, 'ai');
  assert.equal(it.result.ngay_van_ban, '2026-11-06', 'ngày AI bỏ sót được bổ sung từ quy tắc');
  assert.match(e.fetches[0].body.messages[0].content, /Trả về DUY NHẤT một đối tượng JSON/);
  assert.equal(e.files.find(f => f.name === 'qd900.txt').folder.name, 'Đã đọc', 'tệp đã đọc chuyển vào thư mục Đã đọc');
  const d = e.post({ action: 'inboxResolve', id: it.id, status: 'da_xu_ly', by: 'Lâm', applied: 'Cập nhật gói thầu' });
  assert.equal(d.summary.cho_duyet, 0);
  assert.equal(e.post({ action: 'inboxProcess' }).processed, 0, 'không đọc lại tệp đã đọc');
});
test('PDF scan: Drive OCR; AI lỗi → vẫn có kết quả theo quy tắc', () => {
  const e = env({ ocrText: QD, ai: () => ({ code: 500, json: { error: 'boom' } }) });
  e.post({ action: 'inboxGet' }); const fd = e.folders.find(f => f.name === 'KHTC_So_VAN_BAN_DEN'); e.mk('scan.pdf', '%PDF', 'application/pdf', fd);
  const r = e.post({ action: 'inboxProcess' }), x = r.items[0];
  assert.equal(x.status, 'cho_duyet'); assert.equal(x.result.cach_doc, 'Drive OCR'); assert.equal(x.result.nguon_trich, 'quy_tac');
  assert.match(x.result.ai_loi, /HTTP 500/); assert.equal(x.result.ket_qua.gia_trung_thau, 456000000);
});
test('AI hết hạn mức (429): giữ ở hàng chờ, hẹn thử lại, không đánh lỗi', () => {
  const e = env({ ai: () => ({ code: 429, json: {} }) });
  e.post({ action: 'inboxUpload', name: 'a.txt', mime: 'text/plain', data: Buffer.from(QD).toString('base64') });
  const r = e.post({ action: 'inboxProcess' });
  assert.equal(r.summary.cho_doc, 1); assert.equal(r.deferred, true); assert.ok(r.items[0].retry_at);
});
test('chưa bật Drive API: PDF báo lỗi rõ ràng; thử lại được', () => {
  const e = env({ noDrive: true });
  e.post({ action: 'inboxGet' }); e.mk('scan.pdf', '%PDF', 'application/pdf', e.folders.find(f => f.name === 'KHTC_So_VAN_BAN_DEN'));
  const r = e.post({ action: 'inboxProcess' });
  assert.equal(r.items[0].status, 'loi'); assert.match(r.items[0].error, /Drive API/);
  assert.equal(e.post({ action: 'inboxRetry', id: r.items[0].id }).items[0].status, 'loi');
});
test('chọn thư mục: liên kết sai, liên kết đúng; bật, tắt tự động', () => {
  const e = env(), fd = e.g.DriveApp.createFolder('Thu muc rieng');
  assert.match(e.post({ action: 'inboxSetFolder', folder: 'C:\\van ban' }).error, /liên kết thư mục/);
  assert.equal(e.post({ action: 'inboxSetFolder', folder: fd.getUrl() }).folder_name, 'Thu muc rieng');
  assert.match(e.post({ action: 'inboxSetAuto', on: true }).msg, /15 phút/); assert.equal(e.triggers.length, 1);
  e.post({ action: 'inboxSetAuto', on: true }); assert.equal(e.triggers.length, 1, 'không tạo trùng trigger');
  e.post({ action: 'inboxSetAuto', on: false }); assert.equal(e.triggers.length, 0);
});
test('gọi thẳng Cloudflare khi có CF_ACCOUNT_ID + CF_API_TOKEN', () => {
  const e = env({ ai: (b, url) => ({ code: 200, json: { choices: [{ message: { content: '{"loai":"khac","trich_yeu":"x"}' } }] } }) });
  e.props.CF_ACCOUNT_ID = 'acc'; e.props.CF_API_TOKEN = 'tok';
  const r = e.post({ action: 'aiTest' }); assert.equal(r.ok, true);
  assert.match(e.fetches[0].url, /api\.cloudflare\.com\/client\/v4\/accounts\/acc\/ai\/v1\/chat\/completions/);
  assert.equal(e.fetches[0].body.chat_template_kwargs.enable_thinking, false);
});
test('aiChat: hộp chat gọi AI qua máy chủ (khi trình duyệt bị Worker chặn tên miền)', () => {
  const e = env({ ai: b => ({ code: 200, json: { text: 'Trả lời ' + b.messages.length + ' tin' } }) });
  const r = e.post({ action: 'aiChat', messages: [{ role: 'system', content: 'a' }, { role: 'user', content: 'b' }, { role: 'tool', content: 'x' }], max_tokens: 500 });
  assert.equal(r.ok, true); assert.equal(r.text, 'Trả lời 1 tin', 'gộp system vào user, bỏ vai lạ'); assert.equal(e.fetches[0].body.max_tokens, 500);
  assert.match(e.post({ action: 'aiChat', messages: [] }).error, /Thiếu/);
  assert.match(e.post({ key: 'SAI', action: 'aiChat', messages: [{ role: 'user', content: 'b' }] }).error, /Sai mã/);
});
test('Worker: mô hình mặc định lỗi 3030 → tự thử mô hình kế tiếp', () => {
  const e = env({ ai: b => b.model ? { code: 200, json: { text: 'OK từ ' + b.model, model: b.model } } : { code: 502, json: { error: '3030: Internal Server Error' } } });
  const r = e.post({ action: 'aiChat', messages: [{ role: 'user', content: 'x' }] });
  assert.equal(r.ok, true); assert.equal(r.model, '@cf/google/gemma-4-26b-a4b-it'); assert.equal(e.fetches.length, 2);
  assert.equal(e.fetches[0].body.messages.length, 1, 'gộp system vào user');
  const e2 = env({ ai: () => ({ code: 502, json: { error: '3030: Internal Server Error' } }) });
  assert.match(e2.post({ action: 'aiChat', messages: [{ role: 'user', content: 'x' }] }).error, /mặc định: 3030.*gemma-4-26b-a4b-it: 3030.*glm-4\.7-flash: 3030/);
});
test('đọc văn bản không chạy chồng; kết quả đọc không ghi đè thao tác duyệt xảy ra trong lúc đọc', () => {
  const e = env();
  e.props.DANG_DOC_DEN = String(Date.now());
  assert.equal(e.post({ action: 'inboxProcess' }).busy, true);
  delete e.props.DANG_DOC_DEN;
  e.post({ action: 'inboxUpload', name: 'a.txt', mime: 'text/plain', data: Buffer.from(QD).toString('base64') });
  e.post({ action: 'inboxUpload', name: 'b.txt', mime: 'text/plain', data: Buffer.from(QD).toString('base64') });
  const r1 = e.post({ action: 'inboxProcess', max: 1 }), a = r1.items.find(x => x.status === 'cho_duyet');
  // Trong lúc đọc tệp b, cán bộ bỏ qua tệp a: mô phỏng bằng cách đánh dấu trước khi đọc tiếp
  e.post({ action: 'inboxResolve', id: a.id, status: 'bo_qua', by: 'x' });
  const r2 = e.post({ action: 'inboxProcess' });
  assert.equal(r2.items.find(x => x.id === a.id).status, 'bo_qua'); assert.equal(r2.summary.cho_duyet, 1);
  assert.equal(e.props.DANG_DOC_DEN, undefined, 'xóa cờ đang đọc sau khi xong');
});
test('Worker trả khối JSON chỉ có suy luận (content null) → thử mô hình kế tiếp', () => {
  const raw = JSON.stringify({ id: 'chatcmpl-x', choices: [{ message: { role: 'assistant', content: null, reasoning: '1. Analyze' } }] });
  const e = env({ ai: b => b.model === '@cf/zai-org/glm-4.7-flash' ? { code: 200, json: { text: 'Có 2 gói thầu [1].', model: b.model } } : { code: 200, json: { text: raw, model: b.model || 'x' } } });
  const r = e.post({ action: 'aiChat', messages: [{ role: 'system', content: 'S' }, { role: 'user', content: 'x' }] });
  assert.equal(r.text, 'Có 2 gói thầu [1].'); assert.equal(e.fetches.length, 3); assert.equal(e.fetches[2].body.max_tokens, 3500);
});

// ---------- Đồng bộ theo bản ghi, tài khoản, sao lưu ----------
const rec = (id, ten, at, extra) => Object.assign({ id, ten, updatedAt: at, updatedBy: 'x' }, extra || {});
test('đồng bộ theo bản ghi: hai máy, gộp thay đổi, xung đột giữ bản sửa sau cùng, xóa', () => {
  const e = env();
  let a = e.post({ action: 'syncDelta', since: 0, changes: [{ c: 'nhiemvu', v: rec('n1', 'Việc 1', '2026-11-10T01:00:00Z') }, { c: 'nhiemvu', v: rec('n2', 'Việc 2', '2026-11-10T01:00:00Z') }, { c: 'lichsu', v: rec('l1', 'x', 'z') }] });
  assert.equal(a.rev, 1); assert.equal(a.changes.length, 0, 'không trả lại bản ghi vừa gửi');
  const b = e.post({ action: 'syncDelta', since: 0, changes: [{ c: 'goithau', v: rec('g1', 'Gói 1', '2026-11-10T02:00:00Z') }] });
  assert.equal(b.changes.length, 2, 'máy B nhận 2 việc của máy A'); assert.ok(!b.changes.some(x => x.c === 'lichsu'), 'không đồng bộ nhật ký');
  // A và B cùng sửa n1 sau lần đồng bộ: B sửa sau → giữ bản B
  e.post({ action: 'syncDelta', since: b.rev, changes: [{ c: 'nhiemvu', v: rec('n1', 'Việc 1 (B sửa)', '2026-11-10T05:00:00Z') }] });
  a = e.post({ action: 'syncDelta', since: 1, changes: [{ c: 'nhiemvu', v: rec('n1', 'Việc 1 (A sửa)', '2026-11-10T04:00:00Z') }], deletes: [{ c: 'nhiemvu', id: 'n2', at: '2026-11-10T04:00:00Z' }] });
  assert.equal(a.conflicts.length, 1); assert.equal(a.conflicts[0].giu, 'maychu');
  assert.equal(a.changes.find(x => x.v.id === 'n1').v.ten, 'Việc 1 (B sửa)', 'máy A nhận bản B (mới hơn)');
  assert.ok(a.changes.some(x => x.c === 'goithau'));
  const c = e.post({ action: 'syncDelta', since: 0 });
  assert.ok(c.deletes.some(x => x.id === 'n2') && !c.changes.some(x => x.v.id === 'n2'), 'máy mới nhận lệnh xóa n2');
  assert.equal(e.post({ action: 'pull' }).payload.data.nhiemvu.length, 1, 'tải toàn bộ (định dạng sao lưu) vẫn dùng được');
});
test('tài khoản: tạo, đăng nhập, phân quyền cán bộ / chỉ xem, phiên giả bị từ chối', () => {
  const e = env();
  assert.match(e.post({ action: 'userSet', tenDN: 'kien', ten: 'Trịnh Trung Kiên', vaiTro: 'canbo', canBoId: 'cb_kien', matKhau: 'ngan' }).error, /ít nhất 8/);
  assert.equal(e.post({ action: 'userSet', tenDN: 'kien', ten: 'Trịnh Trung Kiên', vaiTro: 'canbo', canBoId: 'cb_kien', matKhau: 'matkhau-kien-1' }).ok, true);
  e.post({ action: 'userSet', tenDN: 'lanhdao', ten: 'Lãnh đạo Sở', vaiTro: 'xem', matKhau: 'matkhau-xem-1' });
  const post = b => JSON.parse(e.g.doPost({ postData: { contents: JSON.stringify(Object.assign({ app: 'khtc-so-son-la' }, b)) } }).s);
  assert.match(post({ action: 'login', tenDN: 'kien', matKhau: 'sai-mat-khau' }).error, /Sai tên đăng nhập/);
  const lg = post({ action: 'login', tenDN: 'Kien', matKhau: 'matkhau-kien-1' });
  assert.equal(lg.ok, true); assert.equal(lg.user.vaiTro, 'canbo');
  // quản trị tạo dữ liệu: 1 việc của Kiên, 1 việc của người khác, 1 cán bộ
  e.post({ action: 'syncDelta', since: 0, changes: [{ c: 'nhiemvu', v: rec('n1', 'Việc Kiên', 't1', { chuTriId: 'cb_kien' }) }, { c: 'nhiemvu', v: rec('n2', 'Việc người khác', 't1', { chuTriId: 'cb_nga' }) }, { c: 'canbo', v: rec('cb_kien', 'Kiên', 't1') }] });
  const r = post({ token: lg.token, action: 'syncDelta', since: 1, changes: [{ c: 'nhiemvu', v: rec('n1', 'Kiên sửa', 't2', { chuTriId: 'cb_kien' }) }, { c: 'nhiemvu', v: rec('n2', 'Kiên sửa việc người khác', 't2', { chuTriId: 'cb_nga' }) }, { c: 'canbo', v: rec('cb_kien', 'Kiên đổi tên', 't2') }, { c: 'nhiemvu', v: rec('n3', 'Việc mới của Kiên', 't2', { chuTriId: 'cb_kien' }) }] });
  assert.deepEqual(r.rejected.map(x => x.id).sort(), ['cb_kien', 'n2'], 'cán bộ không sửa được việc người khác, danh mục cán bộ');
  assert.equal(r.user.ten, 'Trịnh Trung Kiên');
  const xem = post({ action: 'login', tenDN: 'lanhdao', matKhau: 'matkhau-xem-1' });
  const r2 = post({ token: xem.token, action: 'syncDelta', since: 0, changes: [{ c: 'nhiemvu', v: rec('n1', 'Lãnh đạo sửa', 't3', { chuTriId: 'cb_kien' }) }] });
  assert.equal(r2.rejected.length, 1); assert.ok(r2.changes.length >= 3, 'chỉ xem vẫn tải được dữ liệu');
  assert.match(post({ token: xem.token, action: 'inboxUpload', name: 'a.txt', data: 'eA==' }).error, /không được/);
  assert.match(post({ token: lg.token, action: 'userList' }).error || '', /^$/); assert.match(post({ token: lg.token, action: 'userSet', tenDN: 'abc', vaiTro: 'quanly', matKhau: '12345678' }).error, /Chỉ quản lý/);
  assert.equal(post({ token: lg.token.slice(0, -3) + 'abc', action: 'info' }).auth, true, 'phiên bị sửa → từ chối');
  e.post({ action: 'userSet', tenDN: 'kien', ten: 'Trịnh Trung Kiên', vaiTro: 'canbo', canBoId: 'cb_kien', khoa: true });
  assert.equal(post({ token: lg.token, action: 'info' }).auth, true, 'tài khoản bị khóa → phiên mất hiệu lực');
});
test('sao lưu hằng ngày: tạo tệp theo ngày, ghi đè trong ngày, giữ 30 bản, lấy lại', () => {
  const e = env({ ngay: '2026-11-14' });
  assert.match(e.post({ action: 'backupNow' }).error, /chưa có dữ liệu/);
  e.post({ action: 'syncDelta', since: 0, changes: [{ c: 'nhiemvu', v: rec('n1', 'Việc', 't') }] });
  assert.equal(e.post({ action: 'backupNow' }).ten, 'khtc-so-sao-luu-2026-11-14.json'); e.post({ action: 'backupNow' });
  const fd = e.folders.find(f => f.name === 'KHTC_So_SAO_LUU');
  assert.equal(e.files.filter(f => f.folder === fd && !f.trashed).length, 1, 'cùng ngày ghi đè');
  for (let i = 1; i <= 32; i++) e.mk('khtc-so-sao-luu-2026-09-' + String(i).padStart(2, '0').replace(/^3/, '0') + (i > 30 ? 'x' : '') + '.json', '{}', 'application/json', fd);
  e.post({ action: 'backupNow' });
  assert.equal(e.files.filter(f => f.folder === fd && !f.trashed && /^khtc-so-sao-luu-\d{4}-\d{2}-\d{2}\.json$/.test(f.name)).length, 30, 'giữ 30 bản');
  const ds = e.post({ action: 'backupList' }); assert.equal(ds.items[0].ten, 'khtc-so-sao-luu-2026-11-14.json');
  assert.equal(e.post({ action: 'backupGet', id: ds.items[0].id }).payload.data.nhiemvu[0].ten, 'Việc');
  assert.match(e.post({ action: 'backupAuto', on: true }).msg, /23 giờ/); assert.ok(e.triggers.some(t => t.getHandlerFunction() === 'saoLuuHangNgay'));
});
