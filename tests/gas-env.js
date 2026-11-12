// Bộ giả lập Apps Script tối thiểu chạy ĐÚNG gas/Code.gs (Drive, Properties, UrlFetchApp, OCR, trigger). Dùng cho gas.test.js và mock-server.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = () => fs.readFileSync(path.join(__dirname, '../gas/Code.gs'), 'utf8').replace("var MA_BI_MAT = 'DOI-MA-NAY-TRUOC-KHI-DUNG';", "var MA_BI_MAT = 'KHOA';");
function env(opt) {
  opt = opt || {};
  let seq = 0; const files = [], folders = [], props = {}, triggers = [], fetches = [], docs = {};
  class Blob { constructor(d, mime, name) { this.d = d; this.mime = mime; this.name = name; } getDataAsString() { return typeof this.d === 'string' ? this.d : Buffer.from(this.d).toString('utf8'); } setContentType(m) { this.mime = m; return this; } getBytes() { return Buffer.from(this.getDataAsString()); } }
  class Folder { constructor(name, parent) { this.id = 'D' + (++seq) + 'xxxxxxxxxxxx'; this.name = name; this.parent = parent; folders.push(this); }
    getId() { return this.id; } getName() { return this.name; } getUrl() { return 'https://drive.google.com/drive/folders/' + this.id; } isTrashed() { return false; }
    getFiles() { const l = files.filter(f => f.folder === this && !f.trashed); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; }
    getFoldersByName(n) { const l = folders.filter(f => f.parent === this && f.name === n); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; }
    createFolder(n) { return new Folder(n, this); } createFile(b) { return mk(b.name, b.d, b.mime, this); } }
  const root = new Folder('root');
  function mk(name, content, mime, folder) { const f = { id: 'F' + (++seq) + 'xxxxxxxxxxxx', name, content, mime: mime || 'text/plain', folder: folder || root, created: new Date(), trashed: false,
    getId() { return this.id; }, getName() { return this.name; }, getMimeType() { return this.mime; }, getSize() { return String(this.content).length; }, getUrl() { return 'https://drive.google.com/file/d/' + this.id; },
    getDateCreated() { return this.created; }, getBlob() { return new Blob(this.content, this.mime, this.name); }, setContent(c) { this.content = c; }, moveTo(fd) { this.folder = fd; }, setTrashed(v) { this.trashed = v; } }; files.push(f); return f; }
  const it = l => { let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; };
  const g = {
    Logger: { log() {} }, console,
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] === undefined ? null : props[k], setProperty: (k, v) => { props[k] = String(v); }, setProperties: o => Object.assign(props, o) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType() { return this; }, s }) },
    DriveApp: { getFilesByName: n => it(files.filter(f => f.name === n && !f.trashed)), createFile: (n, c, m) => mk(n, c, m), getFoldersByName: n => it(folders.filter(f => f.name === n && f.parent === root)),
      createFolder: n => new Folder(n, root), getFolderById: id => { const f = folders.find(x => x.id === id); if (!f) throw new Error('not found'); return f; }, getFileById: id => { const f = files.find(x => x.id === id); if (!f) throw new Error('nf'); return f; } },
    Utilities: { newBlob: (d, m, n) => new Blob(Buffer.from(d).toString('utf8'), m, n), base64Decode: s => Buffer.from(s, 'base64'), unzip: () => [] },
    DocumentApp: { openById: id => ({ getBody: () => ({ getText: () => docs[id] || '' }) }) },
    ScriptApp: { getProjectTriggers: () => triggers, deleteTrigger: t => triggers.splice(triggers.indexOf(t), 1), newTrigger: h => ({ timeBased: () => ({ everyMinutes: () => ({ create: () => triggers.push({ getHandlerFunction: () => h }) }) }) }) },
    UrlFetchApp: { fetch: (url, o) => { const body = JSON.parse(o.payload); fetches.push({ url, body }); const r = opt.ai ? opt.ai(body, url) : { code: 200, json: { text: '{"loai":"khac"}' } }; return { getResponseCode: () => r.code, getContentText: () => JSON.stringify(r.json) }; } },
    Drive: opt.noDrive ? undefined : { Files: { create: (meta, blob) => { const id = 'OCR' + (++seq); docs[id] = opt.ocrText || ''; return { id }; }, remove: id => { delete docs[id]; } } }
  };
  vm.createContext(g); vm.runInContext(SRC(), g);
  const post = b => JSON.parse(g.doPost({ postData: { contents: JSON.stringify(Object.assign({ app: 'khtc-so-son-la', key: 'KHOA' }, b)) } }).s);
  return { g, post, files, folders, props, triggers, fetches, mk, root };
}
module.exports = { env };
