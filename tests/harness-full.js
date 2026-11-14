// Nạp lõi, logic tài chính – đấu thầu – giải ngân và các mô-đun tính toán của giao diện vào Node (Store giả trong bộ nhớ).
// Dùng cho tests/tinh-toan.test.js. Không cần trình duyệt, không cần tệp Excel.
const path = require('path'), fs = require('fs');
module.exports = function nap(opt) {
  opt = opt || {};
  const el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, setAttribute() {}, addEventListener() {} });
  global.document = { createElement: el, head: el(), body: el(), querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, readyState: 'loading' };
  global.window = { addEventListener() {}, innerWidth: 1280, innerHeight: 800 };
  global.App = {};
  const data = {};
  const Store = { cfg: {}, data, coll: c => data[c] || (data[c] = new Map()), all: c => Array.from(Store.coll(c).values()), get: (c, id) => id ? Store.coll(c).get(id) || null : null, count: c => Store.coll(c).size,
    put: (c, r) => { if (!r.id) r.id = c + '_' + (Store.coll(c).size + 1); Store.coll(c).set(r.id, r); return r; }, user: () => 'test', on() {}, emit() {},
    reset: () => { Object.keys(data).forEach(k => delete data[k]); Store.cfg = {}; } };
  const UI = { $: () => null, $$: () => [], on() {}, PAL: { ok: 'ok', info: 'info', warn: 'warn', bad: 'bad', idle: 'idle', teal: 'teal', violet: 'violet', acc: 'acc' }, el: () => el(), modal: () => ({ body: el(), close() {} }), toast() {}, chip: (a, b) => b, pbar: v => String(v), bars: () => '', hbars: () => '', who: x => x || '', empty: t => t };
  const nap1 = f => { const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); (0, eval)(src.replace("var App = (typeof App !== 'undefined') ? App : {};", '')); };
  nap1('src/shared/nhac-viec.js');
  ['00-core', 'STORE', '20-schema', '30-logic', '31-giaingan', '32-dauthau'].forEach(f => {
    if (f === 'STORE') { App.Store = Store; return; }
    nap1('src/js/' + f + '.js');
  });
  // Giao diện tối thiểu cho các mô-đun tính toán nằm trong tệp giao diện
  App.UI = Object.assign(UI, App.UI || {}); App.views = App.views || {}; App.openers = App.openers || {}; App.vs = App.vs || {};
  ['thietlap', 'dauthau', 'ngansach', 'tongquan'].forEach(v => { App.views[v] = App.views[v] || { render() {} }; });
  App.icon = App.icon || (() => '');
  ['56c-view-dauthau', '56d-vanban-mau', '56e-chidao', '56f-quytrinh', '56g-doichieu'].forEach(f => nap1('src/js/' + f + '.js'));
  return App;
};
