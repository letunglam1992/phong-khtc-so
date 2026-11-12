// Máy chủ giả lập cho kiểm thử kết nối:
//  /da      — chạy ĐÚNG gas-backend/Code.gs của phần mềm Dự án đầu tư trên bộ giả lập Apps Script của kho đó, nạp 167 dự án từ data.js
//  /nv.csv  — Sheet nhiệm vụ dạng CSV (dữ liệu THỬ, chỉ dùng trong kiểm thử)
//  /nv-gas  — action "update" theo đúng luật của Code.gs phần mềm nhiệm vụ (khóa nhận diện + so giá trị gốc)
//  /sync    — dịch vụ đồng bộ của chính phần mềm này (rút gọn)
//  /gas     — chạy ĐÚNG gas/Code.gs của phần mềm này (đồng bộ + văn bản đến) trên tests/gas-env.js; AI giả lập trả JSON rỗng để phần quy tắc tự điền
const http = require('http'), fs = require('fs'), path = require('path');
const DA = process.env.DA_REPO || '/home/user/du-an-dau-tu-son-la';
const { createGasEnv } = require(path.join(DA, 'tests/gas-mock.js'));
const env = createGasEnv();
env.props.USER_TOKENS = JSON.stringify({ 'MA-XEM-THU': { ten: 'PM KHTC số', vai_tro: 'xem' } });
const raw = fs.readFileSync(path.join(DA, 'data.js'), 'utf8'), data = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
const folder = env.g.getDataFolder_();
data.projects.forEach(p => folder.createFile('project_' + p.id + '.json', JSON.stringify(p)));
folder.createFile('land_quota.json', JSON.stringify({ xa_names: [], codes: [] })); folder.createFile('meta.json', JSON.stringify({ data_version: 14 }));
const p0 = data.projects[0].id;
const G = require('./gas-env.js').env({ ai: () => ({ code: 200, json: { text: '{"loai":null}' } }) });
global.__G = G;
[{ id: 't_a1', tieu_de: 'Việc thử gắn dự án: rà soát hồ sơ đất đai', project_id: p0, han: '2026-11-20', uu_tien: 'cao', trang_thai: 'chua', created_at: '2026-11-01T02:00:00Z' }, { id: 't_a2', tieu_de: 'Việc thử đã xong', project_id: p0, han: '2026-10-10', trang_thai: 'xong', done_at: '2026-10-09T03:00:00Z', created_at: '2026-10-01T02:00:00Z' }].forEach(t => folder.createFile('task_' + t.id + '.json', JSON.stringify(t)));

const H = ['STT', 'Số ký hiệu', 'Trích yếu', 'Loại văn bản', 'Cơ quan ban hành', 'Ngày tháng năm ban hành', 'Nội dung nhiệm vụ', 'Phòng, đơn vị chủ trì', 'Phòng, đơn vị phối hợp', 'Hạn hoàn thành', 'Số văn bản hoàn thành', 'Ngày tháng năm hoàn thành', 'Người tham mưu', 'Lý do chậm', 'Ghi chú', 'Vai trò phòng'];
const sheet = [H,
  ['1', '1001/UBND-KT', 'V/v rà soát kế hoạch đầu tư công (THỬ)', 'Công văn', 'UBND tỉnh', '01/11/2026', 'Tham mưu báo cáo rà soát kế hoạch đầu tư công', 'Phòng KHTC', '', '05/11/2026', '', '', 'Kiên', '', '', 'Phòng chủ trì'],
  ['2', '1001/UBND-KT', 'V/v rà soát kế hoạch đầu tư công (THỬ)', 'Công văn', 'UBND tỉnh', '01/11/2026', 'Tổng hợp số liệu giải ngân phục vụ báo cáo', 'Phòng KHTC', '', '18/11/2026', '', '', 'Thương, Kiên', '', '', 'Phòng chủ trì'],
  ['3', '2002/STC-QLNS', 'V/v xây dựng dự toán 2027 (THỬ)', 'Công văn', 'Sở Tài chính', '20/10/2026', 'Tổng hợp dự toán năm 2027 gửi Sở Tài chính', 'Phòng KHTC', 'Văn phòng Sở', '30/10/2026', '6500/SNNMT-KHTC', '29/10/2026', 'Thương', '', '', 'Phòng chủ trì'],
  ['4', '3003/BNNMT-KHTC', 'V/v góp ý dự thảo Thông tư (THỬ)', 'Công văn', 'Bộ Nông nghiệp và Môi trường', '05/11/2026', 'Tham gia ý kiến dự thảo Thông tư', 'Phòng Pháp chế', 'Phòng KHTC', '31/02/2026', '', '', 'Chưa phân công', '', '', 'Phòng phối hợp'],
  ['5', '', 'Kết luận giao ban tuần 45 (THỬ)', 'Thông báo', 'Sở Nông nghiệp và Môi trường', '09/11/2026', 'Chuẩn bị nội dung làm việc với Thanh tra tỉnh', 'Phòng KHTC', '', '', '', '', 'Nguyễn Văn Lạ', '', 'Không hạn', 'Phòng chủ trì'],
  ['6', '4004/TTr-TT', 'Kế hoạch thanh tra (THỬ)', 'Kế hoạch', 'Thanh tra tỉnh', '01/10/2026', 'Cung cấp hồ sơ phục vụ thanh tra', 'Phòng Tổ chức', '', '15/11/2026', '', '', '', '', '', '']];
const csv = () => '﻿' + sheet.map(r => r.map(c => /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c).join(',')).join('\n');
const F = { so_hieu_vb: 1, noi_dung_vb: 2, nhiem_vu: 6, so_cv_hoan_thanh: 10, ngay_hoan_thanh_iso: 11, nguoi_phu_trach: 12, delay_reason: 13 };
const ch = v => { let s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + m[3]; m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : s; };
const kk = v => ch(v).toLowerCase();
function nvUpdate(req) {
  if (req.secret !== 'BI-MAT-THU') return { ok: false, error: 'unauthorized' };
  return { ok: true, version: 7, results: (req.items || []).map(it => {
    const out = { sync_row: it.sync_row, id: it.id, status: 'ok', written: [], conflicts: [] }, key = it.key || {};
    const match = r => sheet[r - 1] && ['so_hieu_vb', 'noi_dung_vb', 'nhiem_vu'].every(f => kk(sheet[r - 1][F[f]]) === kk(key[f]));
    let row = match(it.sync_row) ? it.sync_row : 0; if (!row) for (let r = 2; r <= sheet.length; r++) if (match(r)) { row = r; break; }
    if (!row) { out.status = 'not_found'; out.message = 'Không tìm thấy dòng'; return out; } out.row = row;
    Object.keys(it.fields || {}).forEach(f => { if (F[f] === undefined) return; const cur = ch(sheet[row - 1][F[f]]), moi = ch(it.fields[f]), goc = ch((it.base || {})[f]); if (cur === moi) return out.written.push(f); if (cur === goc) { sheet[row - 1][F[f]] = it.fields[f]; return out.written.push(f); } out.conflicts.push({ field: f, sheetValue: sheet[row - 1][F[f]], yourValue: it.fields[f] }); });
    if (out.conflicts.length) out.status = 'partial'; return out; }) };
}
let store = null, rev = 0, savedAt = null, savedBy = '';
function sync(req) {
  if (req.app !== 'khtc-so-son-la') return { ok: false, error: 'Sai ứng dụng' }; if (req.key !== 'KHOA-THU') return { ok: false, error: 'Sai mã bí mật' };
  if (req.action === 'pull') return { ok: true, rev, savedAt, payload: store };
  if (req.action === 'push') { if (!req.force && rev > 0 && Number(req.baseRev || 0) !== rev) return { ok: false, conflict: true, rev, savedAt, savedBy }; store = req.payload; rev++; savedAt = new Date().toISOString(); savedBy = req.payload.exportedBy; return { ok: true, rev, savedAt }; }
  return { ok: false, error: '?' };
}
http.createServer((q, s) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
  if (q.method === 'OPTIONS') { s.writeHead(204, cors); return s.end(); }
  if (q.url.startsWith('/nv.csv')) { s.writeHead(200, Object.assign({ 'Content-Type': 'text/csv; charset=utf-8' }, cors)); return s.end(csv()); }
  if (q.url.startsWith('/poke')) { sheet[2][9] = '25/11/2026'; sheet[1][10] = '7000/SNNMT-KHTC'; sheet[1][11] = '04/11/2026'; s.writeHead(200, cors); return s.end('ok'); }
  if (q.url.startsWith('/sheet')) { s.writeHead(200, cors); return s.end(JSON.stringify(sheet)); }
  let b = ''; q.on('data', c => b += c); q.on('end', () => {
    let out; try { const req = JSON.parse(b || '{}'); out = q.url.startsWith('/da') ? env.post(req) : q.url.startsWith('/nv-gas') ? nvUpdate(req) : q.url.startsWith('/sync') ? sync(req) : q.url.startsWith('/gas') ? JSON.parse(G.g.doPost({ postData: { contents: JSON.stringify(req) } }).s) : { error: 'no route' }; } catch (e) { out = { ok: false, error: String(e) }; }
    s.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors)); s.end(JSON.stringify(out));
  });
}).listen(8765, () => console.log('mock ready'));
