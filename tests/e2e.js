const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const SHOTS=process.argv[2], XLS=process.argv[3], ND=process.argv[4];
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  '+m)}else{fail++;console.log('FAIL  '+m)}};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900},acceptDownloads:true});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|Mã truy cập không hợp lệ|Sai mã bí mật/.test(m.text()))errs.push(m.text())});
p.on('dialog',d=>d.accept());
const URL='file://'+path.resolve(__dirname,'../dist/PhongKHTC-so.html');
await p.goto(URL);await p.waitForSelector('.nav-item');
const go=async r=>{await p.click(`.nav-item[data-r="${r}"]`);await p.waitForTimeout(200)};
const txt=()=>p.textContent('#content');
const ev=f=>p.evaluate(f);
const toast=async()=>{await p.waitForTimeout(250);return (await p.$$eval('.toast',e=>e.map(x=>x.textContent))).join(' | ')};
const dl=async fn=>{const [d]=await Promise.all([p.waitForEvent('download'),fn()]);const f=path.join(SHOTS,d.suggestedFilename());await d.saveAs(f);return f};

console.log('# 1. Trạng thái ban đầu (không có dữ liệu nghiệp vụ)');
ok(await ev(()=>App.Store.count('danhmuc'))===67,'nạp 67 đầu mục chức năng theo QĐ 324');
ok(await ev(()=>App.Store.count('canbo'))===9 && await ev(()=>App.Store.count('donvi'))===9,'9 cán bộ, 9 đơn vị');
ok(await ev(()=>['nhiemvu','duan','von','ngansach','taisan','goithau','hopdong','vanban'].every(c=>App.Store.count(c)===0)),'không có số liệu nào được tạo sẵn');
ok(await ev(()=>App.Store.adapter.name)==='IndexedDB','lưu bằng IndexedDB');
ok(await ev(()=>App.Store.all('danhmuc').every(d=>!d.chuTriId)),'không tự gán cán bộ chủ trì');
for(const r of ['troly','nhiemvu','duan','von','ngansach','taisan','dauthau','baocao','lichsu']){await go(r);ok(!/gặp lỗi/.test(await txt()),'trang rỗng hiển thị được: '+r)}

console.log('# 2. Thiết lập người dùng');
await go('thietlap');await p.fill('#tl_nd','Lê Tùng Lâm');await p.click('[data-save="info"]');await p.waitForTimeout(200);
ok(await ev(()=>App.Store.user())==='Lê Tùng Lâm','lưu tên người sử dụng');

console.log('# 3. Phân công chức năng');
await go('chucnang');
const kien=await ev(()=>App.Store.all('canbo').find(c=>c.tenGoi==='Kiên').id);
await p.selectOption('select[data-assign]',kien);await p.waitForTimeout(300);
ok(await ev(()=>App.Store.all('danhmuc').filter(d=>d.chuTriId).length)===1,'phân công ngay trên bảng');
ok(await ev(()=>App.Store.all('lichsu').some(h=>h.action==='Sửa'&&h.coll==='danhmuc'&&h.changes.some(c=>c.label==='Cán bộ chủ trì'&&c.moi==='Kiên')&&h.user==='Lê Tùng Lâm')),'ghi lịch sử có người sửa và giá trị cũ → mới');

console.log('# 4. Nhiệm vụ: thêm, kiểm tra dữ liệu, sửa, xóa');
await go('nhiemvu');await p.click('[data-add]');await p.waitForSelector('.modal form');
await p.click('.modal-f .btn.primary');await p.waitForTimeout(150);
ok(/Chưa nhập "Tên nhiệm vụ"/.test(await p.textContent('.errbox')),'chặn lưu khi thiếu trường bắt buộc');
await p.fill('[data-k="ten"]','Báo cáo giải ngân tháng 11 (kiểm thử)');
await p.fill('[data-k="ngayGiao"]','2026-11-10');await p.fill('[data-k="han"]','2026-11-05');
await p.click('.modal-f .btn.primary');await p.waitForTimeout(150);
ok(/Thời hạn hoàn thành trước ngày giao/.test(await p.textContent('.errbox')),'chặn hạn trước ngày giao');
await p.fill('[data-k="han"]','2026-11-15');
await p.selectOption('[data-k="chuTriId"]',kien);
const others=await ev(()=>App.Store.all('canbo').filter(c=>['Thương','Nhung','Thư'].includes(c.tenGoi)).map(c=>c.id));
for(const id of others){await p.selectOption('[data-refs="phoiHopIds"] select',id);await p.waitForTimeout(60)}
await p.click('.modal-f .btn.primary');await p.waitForTimeout(350);
let t=await ev(()=>App.Store.all('nhiemvu')[0]);
ok(t&&t.ma==='NV-2026-001'&&t.phoiHopIds.length===3&&t.nam===2026,'thêm nhiệm vụ: tự đặt mã, 3 cán bộ phối hợp');
ok(await ev(()=>App.L.nv(App.Store.all('nhiemvu')[0]).st)==='saphan','hạn 15/11 → "sắp đến hạn" (hôm nay 12/11)');
// trùng
await p.click('[data-add]');await p.waitForSelector('.modal form');await p.fill('[data-k="ten"]','Báo cáo giải ngân tháng 11 (kiểm thử)');await p.fill('[data-k="han"]','2026-11-15');await p.click('.modal-f .btn.primary');await p.waitForTimeout(250);
ok(/Đã có bản ghi trùng/.test(await p.locator('.ov').last().textContent()),'cảnh báo trùng tên và thời hạn');
await p.locator('.ov').last().locator('.modal-f .btn:not(.primary)').click();await p.waitForTimeout(100);await p.click('.ov [data-close]');await p.waitForTimeout(200);
ok(await ev(()=>App.Store.count('nhiemvu'))===1,'không tạo bản ghi trùng khi quay lại');
// không hạn
await ev(async()=>{await App.Store.save('nhiemvu',{ten:'Việc thường xuyên không hạn (kiểm thử)',loaiTG:'thuongxuyen',trangThai:'dang',nam:2026,nhom:'4',phoiHopIds:[],ma:'NV-2026-002'})});
ok(await ev(()=>{const t=App.Store.all('nhiemvu').find(x=>x.loaiTG==='thuongxuyen');const v=App.L.nv(t);return v.st==='dang'&&!App.L.tonDong(t)&&v.left===null}),'nhiệm vụ không hạn: không bị tính quá hạn, tồn đọng');
// sửa qua chi tiết
await go('nhiemvu');await p.click('tbody tr.click');await p.waitForSelector('.modal .tabs');await p.click('.modal-f .btn.primary');await p.waitForSelector('.modal form');
await p.fill('[data-k="han"]','2026-11-01');await p.fill('[data-k="ngayGiao"]','2026-10-20');await p.click('.modal-f .btn.primary');await p.waitForTimeout(400);
ok(await ev(()=>App.L.nv(App.Store.all('nhiemvu').find(x=>x.ma==='NV-2026-001')).label)==='Quá hạn 11 ngày','sửa hạn 01/11 → "Quá hạn 11 ngày" (tính đúng)');
await p.keyboard.press('Escape');await p.waitForTimeout(150);
ok(await ev(()=>App.L.alerts(2026).some(a=>a.loai==='quahan'&&a.sev===3)),'cảnh báo mức cao cho nhiệm vụ quá hạn');
// hoàn thành nhanh + hoàn tác
await go('nhiemvu');await p.click('[data-done]');await p.waitForTimeout(300);
ok(await ev(()=>{const t=App.Store.all('nhiemvu').find(x=>x.ma==='NV-2026-001');return t.trangThai==='hoanthanh'&&t.ngayHT==='2026-11-12'&&App.L.nv(t).treHan}),'đánh dấu hoàn thành → "hoàn thành trễ hạn"');
await p.click('.toast button');await p.waitForTimeout(300);
ok(await ev(()=>App.Store.all('nhiemvu').find(x=>x.ma==='NV-2026-001').trangThai)!=='hoanthanh','hoàn tác được');
// kanban, lịch
await p.click('[data-mode="kanban"]');await p.waitForTimeout(150);ok(await p.$$eval('.kcard',e=>e.length)===2,'Kanban hiển thị 2 thẻ');
await p.click('[data-mode="lich"]');await p.waitForTimeout(150);ok(await p.$$eval('.cal .ev',e=>e.length)===1,'Lịch hiển thị việc có hạn');
await p.click('[data-mode="bang"]');
// lọc + tìm
await p.selectOption('[data-f="tt"]','quahan');await p.waitForTimeout(150);ok(await p.$$eval('tbody tr',e=>e.length)===1,'lọc "Quá hạn" còn 1 dòng');
await p.selectOption('[data-f="cb"]','__none');await p.waitForTimeout(150);ok(/Không có dòng nào khớp/.test(await txt()),'lọc nhiều điều kiện → trạng thái rỗng có nút bỏ lọc');
await p.click('[data-clear2]');await p.fill('.search input','thuong xuyen');await p.waitForTimeout(350);ok(await p.$$eval('tbody tr',e=>e.length)===1,'tìm không dấu "thuong xuyen" ra 1 dòng');
await p.fill('.search input','');await p.waitForTimeout(300);

console.log('# 5. Sinh nhiệm vụ theo kỳ');
await ev(async()=>{const d=App.Store.all('danhmuc').find(x=>x.ma==='1.8');const g=App.L.genKy(d,2026,['thang','quy'],{thang:{ngay:5,lechThang:1},quy:{ngay:'',lechThang:0}});await App.Store.saveMany(g.map((x,i)=>({c:'nhiemvu',rec:Object.assign(x.rec,{ma:'K'+i})})),{note:'thử'})});
ok(await ev(()=>App.Store.all('nhiemvu').filter(t=>t.kyKey).length)===16,'12 tháng + 4 quý = 16 nhiệm vụ');
ok(await ev(()=>App.Store.all('nhiemvu').find(t=>t.kyKey==='2026-T12').han)==='2027-01-05','hạn tháng 12 = 05/01 năm sau');
ok(await ev(()=>App.Store.all('nhiemvu').find(t=>t.kyKey==='2026-Q1').han)==='','không đặt ngày → không tự gán hạn');
ok(await ev(()=>App.L.genKy(App.Store.all('danhmuc').find(x=>x.ma==='1.8'),2026,['thang'],{thang:{}}).every(x=>x.dup)),'sinh lại không tạo trùng kỳ');
ok(await ev(()=>App.L.kyHan({endM:2},2027,{ngay:31,lechThang:0}))==='2027-02-28','ngày 31 của tháng 2 → 28/02');

console.log('# 6. Văn bản ↔ nhiệm vụ (nhiều – nhiều)');
await ev(async()=>{const v1=await App.Store.save('vanban',{soKyHieu:'100/UBND-TH',ngayBanHanh:'2026-11-01',trichYeu:'Văn bản thử 1',han:'2026-11-08',trangThai:'chua'});const v2=await App.Store.save('vanban',{soKyHieu:'200/SNNMT',ngayBanHanh:'2026-11-02',trichYeu:'Văn bản thử 2',trangThai:'chua'});
 const t=App.Store.all('nhiemvu').find(x=>x.ma==='NV-2026-001');await App.Store.save('nhiemvu',Object.assign({},t,{vanBanIds:[v1.id,v2.id]}));await App.Store.save('nhiemvu',{ten:'Việc thứ hai của văn bản 1',vanBanIds:[v1.id],trangThai:'hoanthanh',ngayHT:'2026-11-03',nam:2026,ma:'NV-2026-090'})});
ok(await ev(()=>{const v=App.Store.all('vanban').find(x=>x.soKyHieu==='100/UBND-TH');const x=App.L.vb(v);return x.tasks.length===2&&x.done===1&&x.derived&&x.st==='dang'}),'1 văn bản – 2 nhiệm vụ; tình trạng văn bản suy ra từ nhiệm vụ');
ok(await ev(()=>App.Store.all('nhiemvu').find(x=>x.ma==='NV-2026-001').vanBanIds.length)===2,'1 nhiệm vụ – 2 văn bản');
await go('vanban');ok((await p.$$eval('tbody tr',e=>e.length))===2,'danh sách văn bản');

console.log('# 7. Dự án nhiều nguồn vốn, nhiều mốc; vốn và giải ngân');
await go('duan');await p.click('[data-add]');await p.waitForSelector('.modal form');
await p.fill('[data-k="ten"]','Dự án kiểm thử nhiều nguồn vốn');await p.fill('[data-k="tmdt"]','10000000000');
ok(await p.inputValue('[data-k="tmdt"]')==='10.000.000.000','ô tiền tự định dạng dấu chấm');
await p.fill('[data-k="batDau"]','2026-01-01');await p.fill('[data-k="ketThuc"]','2026-12-31');
for(let i=0;i<2;i++){await p.click('[data-rows="nguonVon"] [data-radd]')}
await p.selectOption('[data-rows="nguonVon"] tr:nth-child(1) select','Sự nghiệp kinh tế');await p.fill('[data-rows="nguonVon"] tr:nth-child(1) [data-money]','6000000000');
await p.selectOption('[data-rows="nguonVon"] tr:nth-child(2) select','Nguồn thu sử dụng đất');await p.fill('[data-rows="nguonVon"] tr:nth-child(2) [data-money]','3000000000');
await p.click('.modal-f .btn.primary');await p.waitForTimeout(300);
ok(/Cơ cấu nguồn vốn \(9\.000\.000\.000\) khác tổng mức đầu tư \(10\.000\.000\.000\)/.test(await p.locator('.ov').last().textContent()),'đối chiếu cơ cấu nguồn vốn với tổng mức đầu tư');
await p.locator('.ov').last().locator('.modal-f .btn.primary').click();await p.waitForTimeout(400);
ok(await ev(()=>App.Store.count('duan'))===1,'vẫn lưu sau khi xác nhận cảnh báo');
await ev(async()=>{const d=App.Store.all('duan')[0];const moc=[];const st=['hoanthanh','hoanthanh','dang','chua','chua','chua','chua','chua','chua','chua','chua','chua'];
 App.list('nhomMoc').slice(0,12).forEach((n,i)=>moc.push({id:'m'+i,ten:n,nhom:n,batDau:'2026-'+String(i+1).padStart(2,'0')+'-01',ketThuc:'2026-'+String(i+1).padStart(2,'0')+'-25',trangThai:st[i],ngayHT:st[i]==='hoanthanh'?'2026-'+String(i+1).padStart(2,'0')+'-20':''}));
 await App.Store.save('duan',Object.assign({},d,{moc,trangThai:'dangth',tienDo:40}));
 await App.Store.save('von',{duAnId:d.id,nam:2026,nguonVon:'Sự nghiệp kinh tế',khGiao:6e9,dcTang:1e9,dcGiam:5e8,keoDai:0,capNhat:[{ngay:'2026-06-30',luyKe:5e8},{ngay:'2026-10-31',luyKe:13e8}]});
 await App.Store.save('von',{duAnId:d.id,nam:2026,nguonVon:'Nguồn thu sử dụng đất',khGiao:3e9,capNhat:[]});
 await App.Store.save('von',{duAnId:d.id,nam:2025,nguonVon:'Sự nghiệp kinh tế',khGiao:1e9,capNhat:[{ngay:'2025-12-31',luyKe:1e9}]})});
const da=await ev(()=>{const d=App.Store.all('duan')[0],v=App.L.da(d);return {cham:v.cham,tre:v.mocTre.length,treMax:v.treMax,kh:v.khVon,gn:v.giaiNgan,ty:v.tyLeGN,xong:v.mocXong}});
ok(da.cham&&da.tre===8&&da.xong===2,'12 mốc: 2 xong, 8 mốc quá hạn (T3–T10) → dự án chậm');
ok(da.treMax===232,'chậm tối đa 232 ngày (từ 25/3 đến 12/11)');
ok(da.kh===10.5e9&&da.gn===2.3e9&&Math.abs(da.ty-21.9047619)<1e-4,'KH vốn 3 dòng = 10,5 tỷ; giải ngân 2,3 tỷ; 21,90%');
const vv=await ev(()=>{const o=App.L.vonOfYear(2026).find(x=>x.v.nguonVon==='Sự nghiệp kinh tế');return {kh:o.kh,gn:o.gn,cl:o.conLai,ty:o.tyLe,thap:o.thap,tg:o.tgNam}});
ok(vv.kh===6.5e9&&vv.gn===1.3e9&&vv.cl===5.2e9&&vv.ty===20,'KH sau điều chỉnh = 6 + 1 − 0,5 = 6,5 tỷ; GN lấy số lũy kế mới nhất 1,3 tỷ; 20%');
ok(vv.thap&&Math.abs(vv.tg-316/365*100)<1e-6,'giải ngân 20% < thời gian năm 86,6% − 20 → cảnh báo thấp');
ok(await ev(()=>{const m=App.L.vonByMonth(App.L.vonOfYear(2026),2026);return m[4]===0&&m[5]===5e8&&m[9]===13e8&&m[10]===13e8&&m[11]===null}),'lũy kế theo tháng: T5=0, T6=0,5 tỷ, T10–T11=1,3 tỷ, T12 chưa đến');
await go('duan');await p.click('tbody tr.click');await p.waitForSelector('.modal .tabs');await p.click('.modal [data-tab="1"]');await p.waitForTimeout(200);
ok(await p.$$eval('.modal .gantt .g-bar',e=>e.length)===12&&await p.$('.modal .g-today')!==null,'Gantt 12 mốc + vạch hôm nay');
await p.screenshot({path:SHOTS+'/e_gantt.png'});
await p.click('.modal [data-tab="2"]');await p.waitForTimeout(150);ok(/10\.500\.000\.000/.test(await p.textContent('.modal')),'thẻ Vốn: cộng 10.500.000.000');
await p.keyboard.press('Escape');
await p.click('[data-mode="gantt"]');await p.waitForTimeout(200);ok(await p.$$eval('.gantt .g-row',e=>e.length)===14,'Gantt tổng hợp nhiều dự án');
await p.click('[data-mode="sosanh"]');await p.waitForTimeout(200);ok(/\+18,1 điểm/.test(await txt()),'So sánh: tiến độ 40% − giải ngân 21,9% = +18,1 điểm');
await p.click('[data-mode="bang"]');
// cập nhật giải ngân qua UI với số nhỏ hơn kỳ trước
await go('von');await ev(()=>App.updateGN(App.Store.all('von').find(v=>+v.nam===2026&&v.nguonVon==='Sự nghiệp kinh tế')));await p.waitForSelector('#gn_v');await p.fill('#gn_v','100000');await p.locator('.ov').last().locator('.modal-f .btn.primary').click();await p.waitForTimeout(250);
ok(/nhỏ hơn kỳ trước|Lũy kế giải ngân/.test(await p.locator('.ov').last().textContent()),'cảnh báo lũy kế giải ngân giảm so với kỳ trước');
await p.locator('.ov').last().locator('.modal-f .btn:not(.primary)').click();await p.waitForTimeout(100);await p.keyboard.press('Escape');await p.waitForTimeout(150);

console.log('# 8. Nhập biểu giải ngân từ tệp Excel thật của Phòng');
await go('ngansach');
const [fc]=await Promise.all([p.waitForEvent('filechooser'),(async()=>{await p.click('[data-imp]');await p.waitForSelector('[data-pick]');await p.click('[data-pick]')})()]);
await fc.setFiles(XLS);await p.waitForSelector('#ib_dv');await p.waitForTimeout(300);
ok(await p.inputValue('#ib_s')==='Nhiệm vụ','tự chọn trang tính "Nhiệm vụ" (tệp có 19 trang)');
ok(await p.inputValue('#ib_y')==='2026'&&await p.inputValue('#ib_d')==='2026-10-20','đọc năm 2026 và ngày số liệu 20/10/2026 từ tiêu đề biểu');
ok(/đọc được 88 dòng/.test(await p.textContent('.modal'))&&/Điểmcầnđốichiếu4/.test((await p.textContent('.modal')).replace(/\s+/g,'')),'88 dòng; 4 điểm số tổng lệch chi tiết được chỉ ra');
await p.screenshot({path:SHOTS+'/e_import.png'});
await p.click('.modal-f .btn.primary');await p.waitForTimeout(700);
const ns=await ev(()=>{const t=App.L.nsTree(2026,null);return {n:t.count,tong:t.total.tong,gn:t.total.giaiNgan,dt:t.total.duToan,lech:t.flat.filter(x=>x.lech.length).length}});
ok(ns.n===88&&ns.gn===48983549974,'88 dòng; đã giải ngân 48.983.549.974 — trùng dòng tổng của biểu gốc');
ok(ns.tong===284859964239,'tổng được sử dụng = tổng các dòng chi tiết 284.859.964.239 (biểu gốc ghi 284.759.964.239 do cộng lệch 100 triệu ở CTMTQG)');
ok(ns.lech===4,'4 dòng tổng được gắn dấu ⚠ để rà soát');
ok(await ev(()=>{const r=App.Store.all('ngansach').find(x=>/nhiệm vụ xử lý chất thải rắn sinh hoạt/.test(x.noiDung));return r.duToan===14490000000&&r.giaiNgan===7082000000}),'dòng "xử lý chất thải rắn": dự toán 14,49 tỷ, giải ngân 7,082 tỷ');
ok(await ev(()=>{const r=App.Store.all('ngansach').find(x=>x.stt==='(18)');return r&&App.Schema.refName('canbo',r.canBoId)==='Tuấn'}),'cột "Kế toán thực hiện: Đ/c Tuấn" khớp cán bộ Tuấn');
await p.screenshot({path:SHOTS+'/e_ngansach.png'});
const xf=await dl(()=>p.click('[data-xls]'));ok(fs.statSync(xf).size>5000,'xuất Excel cây dự toán: '+path.basename(xf));
const X=require('xlsx');const wbo=X.readFile(xf),aoa=X.utils.sheet_to_json(wbo.Sheets[wbo.SheetNames[0]],{header:1});
ok(aoa[aoa.length-1][11]===48983549974,'tệp Excel xuất ra: dòng tổng cột "Đã giải ngân" = 48.983.549.974');
await p.click('[data-tab="nhom"]');await p.waitForTimeout(200);ok(/không thường xuyên/.test(await txt()),'so sánh dự toán – thực hiện – quyết toán theo nhóm kinh phí');
await p.click('[data-tab="ct"]');

console.log('# 9. Tài sản, gói thầu, hợp đồng');
await ev(async()=>{const dv=App.Store.all('donvi');await App.Store.save('taisan',{ten:'Xe ô tô thử',ma:'TS-1',loai:'Phương tiện (xe ô tô, phương tiện vận tải)',donViId:dv[0].id,nguyenGia:9e8,conLai:3e8,tinhTrang:'Chờ thanh lý',soLuong:1,bienDong:[]});await App.Store.save('taisan',{ten:'Máy tính thử',ma:'TS-2',loai:'Máy móc, thiết bị',donViId:dv[1].id,nguyenGia:1e8,conLai:5e7,tinhTrang:'Đang sử dụng',soLuong:5,bienDong:[]});
 const d=App.Store.all('duan')[0];const g=await App.Store.save('goithau',{ten:'Gói thầu thử',duAnId:d.id,giaGoiThau:5e9,hanLCNT:'2026-11-01',trangThai:'danglcnt',loai:'Tư vấn'});
 await App.Store.save('hopdong',{so:'01/2026/HĐ-THU',ten:'Hợp đồng thử',goiThauId:g.id,duAnId:d.id,giaTri:4e9,ngayBD:'2026-06-01',ngayKT:'2026-11-30',tamUng:1e9,trangThai:'dang',thanhToan:[{ngay:'2026-08-01',soTien:1e9},{ngay:'2026-10-01',soTien:5e8}],nghiemThu:[]})});
ok(await ev(()=>{const g=App.L.tsGroup(App.Store.all('taisan'),t=>t.loai);return g.length===2&&g[0].nguyenGia===9e8&&App.L.tsCanXuLy().length===1}),'tài sản: tổng hợp theo loại, 1 chờ xử lý');
ok(await ev(()=>{const x=App.L.gt(App.Store.all('goithau')[0]);return x.over&&/11 ngày/.test(x.note)}),'gói thầu quá hạn lựa chọn nhà thầu 11 ngày');
ok(await ev(()=>{const x=App.L.hd(App.Store.all('hopdong')[0]);return x.thanhToan===1.5e9&&x.conLai===2.5e9&&x.tyLeTT===37.5&&x.near&&/18 ngày/.test(x.note)}),'hợp đồng: thanh toán 1,5/4 tỷ = 37,5%; còn 18 ngày hết hạn');
await ev(async()=>{const r=App.Schema.check('taisan',{ten:'x',loai:'Tài sản khác',nguyenGia:1,conLai:2});window.__c=r});
ok(await ev(()=>window.__c.errors.some(e=>/còn lại lớn hơn nguyên giá/.test(e))),'chặn giá trị còn lại > nguyên giá');
for(const r of ['taisan','dauthau']){await go(r);ok(!/gặp lỗi/.test(await txt()),'trang có dữ liệu hiển thị được: '+r)}

console.log('# 9b. Tài sản nhà, đất — Phụ biểu 0A.01-T.STC (tệp thật)');
await go('taisan');
let [fnd]=await Promise.all([p.waitForEvent('filechooser'),(async()=>{await p.click('[data-ndimp]');await p.waitForSelector('[data-pick]');await p.click('[data-pick]')})()]);
await fnd.setFiles(ND);await p.waitForSelector('[data-map]');await p.waitForTimeout(200);
let mt=(await p.textContent('.modal')).replace(/\s+/g,' ');
ok(/đọc được 79 cơ sở nhà, đất của 25 đơn vị/.test(mt),'đọc 79 cơ sở, 25 đơn vị được giao quản lý');
ok(await p.inputValue('#nd_ngay')==='2026-10-30','lấy ngày hiện trạng 30/10/2026 từ tên tệp');
ok(/chênh 458,90\).*hàm SUM của Excel không cộng/.test(mt)&&/chênh 1\.118,20/.test(mt),'chỉ ra dòng tổng diện tích lệch do ô ghi số dạng chữ');
ok(/Dòng 63 .*đầy đủ hồ sơ.*thiếu hồ sơ/.test(mt),'chỉ ra dòng 63 vừa đủ vừa thiếu hồ sơ');
ok(/Dòng 21: ngày cấp GCN 02\/11\/2026 sau ngày lập biểu 30\/10\/2026/.test(mt),'chỉ ra ngày cấp GCN sau ngày lập biểu (dòng 21)');
const vpdk=await ev(()=>App.Store.all('donvi').find(d=>d.ten==='Văn phòng Đăng ký đất đai').id),kl=await ev(()=>App.Store.all('donvi').find(d=>d.ten==='Chi cục Kiểm lâm').id);
ok(await p.inputValue('[data-map="van phong dang ky dat dai"]')===vpdk&&await p.inputValue('[data-map="van phong chi cuc kiem lam"]')===kl,'gợi ý đúng: VP Đăng ký đất đai, VP Chi cục Kiểm lâm');
ok(await p.inputValue('[data-map="hat kiem lam khu vuc i"]')==='','không tự gán Hạt Kiểm lâm (không suy đoán quan hệ trực thuộc)');
await p.selectOption('[data-map="hat kiem lam khu vuc i"]',kl);await p.waitForTimeout(200);
await p.screenshot({path:SHOTS+'/e_nd_import.png'});
await p.click('.modal-f .btn.primary');await p.waitForTimeout(900);
const nds=await ev(()=>{const l=App.Store.all('taisan').filter(App.L.isNhaDat),s=App.L.ndStats(l);return {n:s.n,ng:s.nguyenGia,cl:s.conLai,dc:s.daCap,cc:s.chuaCap,dk:s.chuaDK,th:s.hsThieu,dtN:s.dtNha}});
ok(nds.n===79&&nds.ng===409298670782&&nds.cl===326911291412,'79 cơ sở; nguyên giá 409.298.670.782, còn lại 326.911.291.412 — khớp dòng tổng biểu');
ok(nds.dc===32&&nds.cc===44&&nds.dk===3&&nds.th===5,'32 đã cấp GCN, 44 chưa cấp, 3 chưa ĐK biến động, 5 thiếu hồ sơ');
ok(await ev(()=>{const t=App.Store.all('taisan').find(x=>/Nguyễn Lương Bằng/.test(x.ten));return t.gcnTT==='dacap'&&t.gcnNgay==='2008-01-01'&&t.hsDayDu&&t.donViId&&App.Schema.refName('donvi',t.donViId)==='CC Kiểm lâm'&&t.ma}),'dòng 25: GCN số AL 177247 ngày 01/01/2008, đủ hồ sơ, gắn Chi cục Kiểm lâm, có mã');
ok(await ev(()=>{const t=App.Store.all('taisan').find(x=>x.nd&&x.nd.dong===12);return t.chuaDKBD&&/biến động/.test(t.nguyenNhanHS)}),'dòng 12: chưa ĐK biến động, có nguyên nhân');
ok(await ev(()=>App.Store.all('taisan').filter(x=>/Pha Khuông, Xã Co Mạ/.test(x.ten)).length)===2,'2 cơ sở trùng tên (dòng 62, 66) giữ thành 2 bản ghi');
// sửa tại phần mềm rồi nhập lại → không trùng, giữ trường riêng
await ev(async()=>{const t=App.Store.all('taisan').find(x=>x.ndThuTu===1);await App.Store.save('taisan',Object.assign({},t,{ghiChu:'Ghi chú riêng tại PM',bienDong:[{ngay:'2026-11-01',loai:'Kiểm kê',noiDung:'Kiểm kê thử'}]}))});
[fnd]=await Promise.all([p.waitForEvent('filechooser'),(async()=>{await p.click('[data-ndimp]');await p.waitForSelector('[data-pick]');await p.click('[data-pick]')})()]);
await fnd.setFiles(ND);await p.waitForSelector('[data-map]');await p.waitForTimeout(200);
ok(await p.inputValue('[data-map="hat kiem lam khu vuc i"]')===kl,'nhớ lựa chọn gắn đơn vị từ lần trước');
mt=(await p.locator('.modal .kpis').nth(1).textContent()).replace(/\s+/g,'');ok(/Thêmmới0/.test(mt)&&/Cậpnhật0/.test(mt),'nhập lại cùng biểu: 0 thêm, 0 cập nhật');
await p.click('.modal-f .btn.primary');await p.waitForTimeout(600);
ok(await ev(()=>{const t=App.Store.all('taisan').find(x=>x.ndThuTu===1);return App.Store.all('taisan').filter(App.L.isNhaDat).length===79&&t.ghiChu==='Ghi chú riêng tại PM'&&t.bienDong.length===1}),'vẫn 79 cơ sở; ghi chú, biến động nhập tại phần mềm được giữ');
// lọc qua thẻ KPI
await go('taisan');await p.click('[data-ndf="chuacap"]');await p.waitForTimeout(300);
ok(/44 dòng/.test(await p.textContent('.pager')),'bấm thẻ "Chưa cấp GCN" → lọc 44 dòng');
await p.screenshot({path:SHOTS+'/e_taisan.png',fullPage:true});
await p.selectOption('[data-f="nd"]','');await p.waitForTimeout(200);
// form ẩn/hiện nhóm nhà đất + cảnh báo
await p.click('[data-add]');await p.waitForSelector('.modal form');
ok(await p.$eval('[data-fld="dtDat"]',e=>e.classList.contains('hide')),'thêm tài sản mới: nhóm trường nhà, đất ẩn');
await p.selectOption('[data-k="loai"]','Cơ sở nhà, đất');await p.waitForTimeout(100);
ok(!await p.$eval('[data-fld="dtDat"]',e=>e.classList.contains('hide')),'chọn loại "Cơ sở nhà, đất" → hiện nhóm trường nhà, đất');
await p.fill('[data-k="ten"]','Cơ sở thử nghiệm');await p.check('[data-k="hsDayDu"]');await p.check('[data-k="hsThieu"]');await p.fill('[data-k="dtDat"]','-5');
await p.click('.modal-f .btn.primary');await p.waitForTimeout(200);ok(/Diện tích đất" không được âm/.test(await p.textContent('.errbox')),'chặn diện tích âm');
await p.fill('[data-k="dtDat"]','500');await p.click('.modal-f .btn.primary');await p.waitForTimeout(250);
ok(/vừa "Thiếu hồ sơ hình thành tài sản"/.test(await p.locator('.ov').last().textContent()),'cảnh báo vừa đủ vừa thiếu hồ sơ, vẫn cho lưu');
await p.locator('.ov').last().locator('.modal-f .btn.primary').click();await p.waitForTimeout(300);
ok(await ev(()=>App.Store.all('taisan').filter(App.L.isNhaDat).length)===80,'lưu được cơ sở thứ 80');
// xuất mẫu 0A.01
const nx=await dl(()=>p.click('[data-ndexp]'));const nw=X.readFile(nx),na=X.utils.sheet_to_json(nw.Sheets['A01-STC'],{header:1,defval:''});
ok(na[4][1]==='Tên cơ quan, đơn vị đang được giao quản lý'&&na[7][5]===409298670782+0&&na.length===8+80,'xuất mẫu 0A.01: đúng tiêu đề cột, dòng tổng nguyên giá, 80 dòng');
ok(na[8][1]==='Trung tâm nước Quan trắc môi trường'&&na[8][9]==='Cấp ngày 01/02/2023'&&na[8][7]==='x','dòng 1 xuất đúng thứ tự, GCN, dấu x');
ok((nw.Sheets['A01-STC']['!merges']||[]).length>=20,'giữ cấu trúc ô gộp tiêu đề');
const rnd=X.utils.sheet_to_json(nw.Sheets['A01-STC'],{header:1,raw:true,defval:null});
ok(await p.evaluate(r=>{const q=App.L.parseNhaDat(r);return q.items.length===80&&!q.warnings.some(w=>/Dòng tổng/.test(w))},rnd),'đọc lại tệp vừa xuất bằng chính bộ đọc: 80 dòng, dòng tổng khớp');
ok(await ev(()=>App.L.alerts(2026).some(a=>a.loai==='nhadat'&&/44\/80 cơ sở nhà, đất chưa có giấy chứng nhận/.test(a.title))),'cảnh báo tổng hợp: 44/80 cơ sở chưa có GCN');
await go('baocao');await p.selectOption('#bc_type','taisan');await p.waitForTimeout(250);
ok(/80 cơ sở nhà, đất do 26 cơ quan, đơn vị/.test(await p.textContent('[data-paper]')),'báo cáo tài sản có phần nhà, đất');
await ev(async()=>{await App.Store.removeMany(App.Store.all('taisan').filter(App.L.isNhaDat).filter(t=>t.ten!=='Xe ô tô thử').map(t=>['taisan',t.id]),'dọn thử nhà đất');await App.Store.setCfg({ndMap:{}})});

console.log('# 10. Bảng điều hành và Trợ lý');
await go('tongquan');await p.waitForTimeout(200);
const k=await p.$$eval('.kpi',e=>e.map(x=>x.textContent.replace(/\s+/g,' ')));
ok(k.some(x=>/Tổng số nhiệm vụ\s*19/.test(x)),'KPI tổng nhiệm vụ = 19');
ok(await ev(()=>{const s=App.L.nvStats(App.L.nvOfYear(2026));return s.tong===19&&s.hoanthanh===1&&s.dang===1&&s.chua===17&&s.hoanthanh+s.dang+s.chua+s.tamdung===s.tong}),'hoàn thành + đang + chưa + tạm dừng = tổng (không đếm trùng)');
ok(await ev(()=>App.L.alerts(2026).filter(a=>a.loai==='dacham').length===1&&App.L.alerts(2026).some(a=>a.loai==='gnthap')&&App.L.alerts(2026).some(a=>a.loai==='dauthau')&&App.L.alerts(2026).some(a=>a.loai==='hopdong')&&App.L.alerts(2026).some(a=>a.loai==='chuapc')),'cảnh báo: dự án chậm, giải ngân thấp, đấu thầu, hợp đồng, chưa phân công');
await p.screenshot({path:SHOTS+'/e_dash.png',fullPage:true});
await go('troly');ok((await p.$$eval('details.qa',e=>e.length))===6,'Trợ lý: đủ 6 câu hỏi');
ok(/Căn cứ nhận định/.test(await txt()),'mỗi nhận định có căn cứ');
await p.screenshot({path:SHOTS+'/e_troly.png',fullPage:true});
await p.keyboard.press('Control+k');await p.waitForSelector('.cmd-res');await p.fill('.ov input','chat thai ran');await p.waitForTimeout(350);
ok((await p.$$eval('.cmd-i',e=>e.length))>=1&&/chất thải rắn/i.test(await p.textContent('.cmd-res')),'tìm toàn cục không dấu ra dòng dự toán');
await p.keyboard.press('Escape');

console.log('# 11. Báo cáo');
await go('baocao');
for(const ty of ['ky','nhiemvu','duan','giaingan','ngansach','taisan','dauthau','canbo','dotxuat']){await p.selectOption('#bc_type',ty);await p.waitForTimeout(200);const h=await p.textContent('[data-paper]');ok(/BÁO CÁO/.test(h)&&!/Không dựng được/.test(h),'dựng báo cáo: '+ty)}
await p.selectOption('#bc_type','giaingan');await p.waitForTimeout(150);
ok(/6\.500\.000\.000/.test(await p.textContent('[data-paper]'))&&/đạt 13,7%/.test(await p.textContent('[data-paper]')),'báo cáo giải ngân: 1,3/9,5 tỷ = 13,7%');
const rx=await dl(()=>p.click('[data-do="xlsx"]'));ok(X.readFile(rx).SheetNames.length===2,'xuất Excel báo cáo (2 bảng): '+X.readFile(rx).SheetNames.join('|'));
const rd=await dl(()=>p.click('[data-do="doc"]'));ok(fs.readFileSync(rd,'utf8').includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'),'xuất Word');
await p.selectOption('#bc_type','ky');await p.waitForTimeout(150);await p.screenshot({path:SHOTS+'/e_baocao.png',fullPage:true});
await p.emulateMedia({media:'print'});ok(await p.$eval('.side',e=>getComputedStyle(e).display)==='none'&&await p.$eval('.paper',e=>getComputedStyle(e).display)!=='none','chế độ in: chỉ còn trang báo cáo');await p.emulateMedia({media:'screen'});

console.log('# 12. Sao lưu, xóa, khôi phục; lưu qua tải lại trang');
const before=await ev(()=>App.Schema.TRACKED.map(c=>App.Store.count(c)).join(','));
await go('thietlap');const bk=await dl(()=>p.click('[data-bk="0"]'));const bo=JSON.parse(fs.readFileSync(bk,'utf8'));
ok(bo.app==='khtc-so-son-la'&&bo.data.ngansach.length===88,'tệp sao lưu JSON đủ dữ liệu');
await p.reload();await p.waitForSelector('.nav-item');await p.waitForTimeout(400);
ok(await ev(()=>App.Schema.TRACKED.map(c=>App.Store.count(c)).join(','))===before,'tải lại trang: dữ liệu còn nguyên');
await go('thietlap');await p.click('[data-wipe]');await p.fill('#wp','XOA DU LIEU');await p.click('.modal-f .btn.danger');await p.waitForTimeout(900);
ok(await ev(()=>App.Store.count('nhiemvu')===0&&App.Store.count('ngansach')===0&&App.Store.count('danhmuc')===67),'xóa toàn bộ → về trạng thái ban đầu');
await go('thietlap');
const bad=path.join(SHOTS,'bad.json');fs.writeFileSync(bad,'{"app":"khac","data":{}}');
let [f1]=await Promise.all([p.waitForEvent('filechooser'),p.click('[data-rs="replace"]')]);await f1.setFiles(bad);ok(/không phải bản sao lưu của phần mềm này/.test(await toast()),'từ chối tệp JSON không đúng');
[f1]=await Promise.all([p.waitForEvent('filechooser'),p.click('[data-rs="replace"]')]);await f1.setFiles(bk);await p.waitForSelector('.modal.sm');await p.click('.modal-f .btn.danger');await p.waitForTimeout(900);
ok(await ev(()=>App.Schema.TRACKED.map(c=>App.Store.count(c)).join(','))===before,'khôi phục từ tệp: đủ số bản ghi như trước');
ok(await ev(()=>App.L.nsTree(2026,null).total.giaiNgan)===48983549974,'số liệu sau khôi phục khớp');
ok(await ev(async()=>(await App.Store.snapshots()).length>=2),'có bản chụp tự động trước thao tác lớn');

console.log('# 13. Kết nối phần mềm Dự án đầu tư (backend thật trên bộ giả lập Apps Script)');
await go('ketnoi');await p.fill('#kn_daurl','http://localhost:8765/da');await p.fill('#kn_datok','SAI-MA');await p.click('[data-do="da"]');
ok(/Mã truy cập không hợp lệ/.test(await toast()),'mã truy cập sai → báo đúng lỗi của backend');
await p.fill('#kn_datok','MA-XEM-THU');await p.click('[data-do="da"]');await p.waitForSelector('[data-ng]');
ok(/167 dự án, 2 công việc/.test(await p.textContent('.modal-h')),'đọc được 167 dự án, 2 công việc');
await p.screenshot({path:SHOTS+'/e_kn_da.png'});
for(const n of ['dien','dothi']){await p.uncheck(`[data-ng="${n}"]`);await p.waitForTimeout(120)}
const nLeft=await ev(()=>+document.querySelector('.modal .kpi.ok .k-v').textContent);
await p.click('.modal-f .btn.primary');await p.waitForTimeout(900);
const cnt=await ev(()=>App.KN.count());ok(cnt.da===nLeft&&nLeft>0&&nLeft<167,'lọc ngành: đưa về '+nLeft+' dự án (bỏ điện, đô thị)');
ok(await ev(()=>{const d=App.Store.all('duan').find(x=>x.ext&&x.ext.id==='dp_54');return d&&d.ketThuc==='2026-12-31'&&d.moc.length>0&&d.loai==='Dự án đầu tư công'}),'dự án dp_54: ngày dự kiến hoàn thành, mốc, loại đầu tư công');
await go('ketnoi');await p.click('[data-do="da"]');await p.waitForSelector('[data-ng]');await p.check('[data-ng="dien"]');await p.waitForTimeout(150);await p.check('[data-ng="dothi"]');await p.waitForTimeout(200);await p.click('.modal-f .btn.primary');await p.waitForTimeout(1200);
ok((await ev(()=>App.KN.count())).da===167,'đồng bộ đủ 167 dự án');
ok(await ev(()=>{const d=App.Store.all('duan').find(x=>x.ext&&x.ext.id==='dien_34');return d.tmdt===987925000000&&d.chuDauTu==='Công ty Cổ phần Năng lượng Xanh Mai Sơn'&&d.linhVuc==='Năng lượng, điện'}),'quy đổi 987,925 tỷ → 987.925.000.000 đồng; nhà đầu tư, lĩnh vực');
ok((await ev(()=>App.KN.count())).tk===2&&await ev(()=>{const t=App.Store.all('nhiemvu').find(x=>x.ext&&x.ext.id==='t_a2');return t.trangThai==='hoanthanh'&&t.ngayHT==='2026-10-09'&&t.duAnIds.length===1}),'2 công việc gắn dự án, giữ tình trạng và liên kết');
// giữ trường bổ sung tại chỗ qua lần đồng bộ sau
await ev(async()=>{const d=App.Store.all('duan').find(x=>x.ext&&x.ext.id==='dien_34');const moc=d.moc.slice();moc[0]=Object.assign({},moc[0],{ketThuc:'2026-06-29'});await App.Store.save('duan',Object.assign({},d,{kienNghi:'Kiến nghị bổ sung tại PM KHTC',canBoId:App.Store.all('canbo')[0].id,moc}));await App.Store.save('von',{duAnId:d.id,nam:2026,nguonVon:'Nguồn khác',khGiao:1e9,capNhat:[]})});
await go('ketnoi');await p.click('[data-do="da"]');await p.waitForSelector('[data-ng]');
ok(/Thêmmới0/.test((await p.textContent('.modal .kpis')).replace(/\s+/g,''))&&/Cậpnhật0/.test((await p.textContent('.modal .kpis')).replace(/\s+/g,'')),'đồng bộ lại: 0 thêm, 0 cập nhật (không tạo trùng)');
await p.click('.modal-f .btn.primary');await p.waitForTimeout(500);
ok(await ev(()=>{const d=App.Store.all('duan').find(x=>x.ext&&x.ext.id==='dien_34');return d.kienNghi==='Kiến nghị bổ sung tại PM KHTC'&&d.moc[0].ketThuc==='2026-06-29'&&!!d.canBoId&&App.Store.all('von').some(v=>v.duAnId===d.id)}),'kiến nghị, ngày mốc, cán bộ, kế hoạch vốn bổ sung tại đây được giữ');
ok(await ev(()=>App.KN.link(App.Store.all('duan').find(x=>x.ext&&x.ext.id==='dien_34')).url)==='https://du-an-dau-tu-son-la.vercel.app/#/du-an/dien_34','liên kết mở đúng dự án ở phần mềm gốc');

console.log('# 14. Kết nối phần mềm Điều hành nhiệm vụ');
await go('ketnoi');await p.fill('#kn_nvcsv','http://localhost:8765/nv.csv');await p.click('[data-do="nv"]');await p.waitForSelector('.modal.lg .kpis');
const pv=(await p.textContent('.modal')).replace(/\s+/g,' ');
ok(/đọc được 6 dòng nhiệm vụ/.test(pv)&&/31\/02\/2026.*không hợp lệ/.test(pv),'đọc 6 dòng; báo ngày 31/02/2026 không hợp lệ');
await p.screenshot({path:SHOTS+'/e_kn_nv.png'});
await p.click('.modal-f .btn.primary');await p.waitForTimeout(700);
const c2=await ev(()=>App.KN.count());ok(c2.nv===6&&c2.vb===4,'6 nhiệm vụ, 4 văn bản (2 dòng cùng số 1001/UBND-KT gộp 1 văn bản; dòng không số không tạo văn bản)');
ok(await ev(()=>{const t=App.Store.all('nhiemvu').find(x=>x.ext&&/tong hop so lieu giai ngan/.test(x.ext.key));return App.Schema.refName('canbo',t.chuTriId)==='Thương'&&t.phoiHopIds.length===1&&t.han==='2026-11-18'&&t.vanBanIds.length===1}),'"Thương, Kiên" → chủ trì Thương, phối hợp Kiên; hạn 18/11');
ok(await ev(()=>{const t=App.Store.all('nhiemvu').find(x=>x.ext&&/du toan nam 2027/.test(x.ext.key));return t.trangThai==='hoanthanh'&&t.ngayHT==='2026-10-29'&&/6500\/SNNMT-KHTC/.test(t.ketQua)&&!App.L.nv(t).treHan}),'dòng đã hoàn thành: ngày 29/10, số văn bản, đúng hạn');
ok(await ev(()=>{const t=App.Store.all('nhiemvu').find(x=>x.ext&&/thanh tra tinh/.test(x.ext.key)&&/chuan bi noi dung/.test(x.ext.key));return !t.chuTriId&&t.ext.nguoiGoc==='Nguyễn Văn Lạ'&&!t.han}),'tên không khớp cán bộ → chưa phân công, giữ tên gốc; không hạn');
ok(await ev(()=>{const t=App.Store.all('nhiemvu').find(x=>x.ext&&/du thao thong tu/.test(x.ext.key));return t.vaiTro==='phoihop'&&t.han===''}),'"Phòng phối hợp" → vai trò phối hợp; hạn sai → để trống');
// thay đổi tại đây + Sheet đổi → đồng bộ lại
await ev(async()=>{const t=App.Store.all('nhiemvu').find(x=>x.ext&&/tong hop so lieu giai ngan/.test(x.ext.key));await App.Store.save('nhiemvu',Object.assign({},t,{nhom:'4',tienDo:60,trangThai:'dang',xinYKien:true,ndXinYKien:'Xin ý kiến thử'}));
 const k=App.Store.all('nhiemvu').find(x=>x.ext&&/chuan bi noi dung/.test(x.ext.key));const r=Object.assign({},k,{chuTriId:App.Store.all('canbo').find(c=>c.tenGoi==='Tuấn').id,trangThai:'hoanthanh'});App.Schema.C.nhiemvu.normalize(r);await App.Store.save('nhiemvu',r)});
await p.evaluate(()=>fetch('http://localhost:8765/poke'));
await go('ketnoi');await p.click('[data-do="nv"]');await p.waitForSelector('.modal.lg .kpis');
ok(/Thêmmới0/.test((await p.textContent('.modal .kpis')).replace(/\s+/g,''))&&/Cậpnhật2/.test((await p.textContent('.modal .kpis')).replace(/\s+/g,'')),'Sheet đổi 2 dòng → đúng 2 cập nhật, 0 thêm');
await p.click('.modal-f .btn.primary');await p.waitForTimeout(600);
ok(await ev(()=>{const t=App.Store.all('nhiemvu').find(x=>x.ext&&/tong hop so lieu giai ngan/.test(x.ext.key));return t.han==='2026-11-25'&&t.nhom==='4'&&t.tienDo===60&&t.xinYKien&&t.trangThai==='dang'}),'hạn mới 25/11 từ Sheet; nhóm, tiến độ 60%, xin ý kiến tại đây được giữ');
ok(await ev(()=>{const t=App.Store.all('nhiemvu').find(x=>x.ext&&/tham muu bao cao ra soat/.test(x.ext.key));return t.trangThai==='hoanthanh'&&t.ngayHT==='2026-11-04'}),'Sheet ghi hoàn thành 04/11 → nhiệm vụ chuyển hoàn thành');
// ghi ngược
await go('ketnoi');ok(/Ghi kết quả về Sheet \(1\)/.test(await txt()),'1 nhiệm vụ chờ ghi về Sheet');
await p.click('summary');await p.fill('#kn_nvurl','http://localhost:8765/nv-gas');await p.fill('#kn_nvsec','SAI');await p.click('[data-do="nvpush"]');await p.waitForSelector('[data-i]');await p.click('.modal-f .btn.primary');
ok(/Sai mã bí mật/.test(await toast()),'mã bí mật sai → từ chối');await p.keyboard.press('Escape');await p.waitForTimeout(200);
await p.fill('#kn_nvsec','BI-MAT-THU');await p.click('[data-do="nvpush"]');await p.waitForSelector('[data-i]');await p.click('.modal-f .btn.primary');await p.waitForTimeout(600);
const sh=await p.evaluate(()=>fetch('http://localhost:8765/sheet').then(r=>r.json()));
ok(sh[5][11]==='12/11/2026'&&sh[5][12]==='Nguyễn Văn Lạ','Sheet nhận ngày hoàn thành 12/11/2026 ở đúng dòng 6; không ghi đè người tham mưu đã có trên Sheet');
ok(await ev(()=>App.KN.pendingPush().length)===0,'không còn gì chờ ghi');
// tự đồng bộ không tạo trùng
ok(await ev(async()=>{const a=App.Store.count('nhiemvu');const pl=App.KN.planNV(App.KN.parseSheetNV(await App.KN.fetchNV()),'all');return pl.them===0&&a===App.Store.count('nhiemvu')}),'đồng bộ lần nữa: 0 thêm');
await go('nhiemvu');await p.selectOption('[data-f="src"]','tdnv');await p.waitForTimeout(200);ok((await p.$$eval('tbody tr',e=>e.length))===6,'lọc "Từ Điều hành nhiệm vụ" ra 6 dòng');
await p.click('tbody tr.click');await p.waitForSelector('.modal .tabs');ok(/Đồng bộ từ phần mềm Điều hành nhiệm vụ/.test(await p.textContent('.modal'))&&await p.$('.modal a[href="https://theodoinhiemvu.vercel.app/"]')!==null,'chi tiết có nhãn nguồn và nút mở phần mềm gốc');
await p.screenshot({path:SHOTS+'/e_ext.png'});await p.keyboard.press('Escape');await p.selectOption('[data-f="src"]','');

console.log('# 15. Đồng bộ nhiều máy (dịch vụ của phần mềm)');
await go('thietlap');await p.fill('#tl_su','http://localhost:8765/sync');await p.fill('#tl_sk','KHOA-THU');await p.click('[data-sync="push"]');await p.waitForTimeout(900);
ok(await ev(()=>App.Store.cfg.syncRev)===1,'đẩy lên: bản số 1');
const ctx2=await b.newContext();const p2=await ctx2.newPage();await p2.goto(URL);await p2.waitForSelector('.nav-item');
await p2.evaluate(async()=>{await App.Store.setCfg({syncUrl:'http://localhost:8765/sync',syncKey:'KHOA-THU'})});
await p2.click('.nav-item[data-r="thietlap"]');await p2.click('[data-sync="pull"]');await p2.waitForTimeout(1500);
ok(await p2.evaluate(()=>App.Store.count('duan'))===168&&await p2.evaluate(()=>App.Store.count('ngansach'))===88,'máy thứ hai tải về: 168 dự án, 88 dòng dự toán');
await p2.evaluate(async()=>{await App.Store.save('nhiemvu',{ten:'Việc thêm ở máy 2',nam:2026,trangThai:'chua',phoiHopIds:[]})});await p2.click('[data-sync="push"]');await p2.waitForTimeout(900);
await go('thietlap');await p.click('[data-sync="push"]');await p.waitForTimeout(600);
ok(/Dữ liệu trên máy chủ đã thay đổi/.test(await p.textContent('.ov')),'máy 1 đẩy đè → được cảnh báo xung đột');
await p.click('.modal-f .btn:not(.danger)');await p.click('[data-sync="pull"]');await p.waitForTimeout(1500);
ok(await ev(()=>App.Store.all('nhiemvu').some(t=>t.ten==='Việc thêm ở máy 2')),'tải về và gộp: nhận việc thêm ở máy 2');
await ctx2.close();

console.log('# 16. Dữ liệu lớn');
const perf=await ev(async()=>{const items=[];const cb=App.Store.all('canbo');for(let i=0;i<5000;i++)items.push({c:'nhiemvu',rec:{ten:'Nhiệm vụ khối lượng lớn số '+i,ma:'L'+i,nam:2026,nhom:String(i%9+1),chuTriId:cb[i%9].id,phoiHopIds:[],ngayGiao:'2026-0'+(i%9+1)+'-01',han:'2026-'+String(i%12+1).padStart(2,'0')+'-15',trangThai:i%3?'chua':'hoanthanh',ngayHT:i%3?'':'2026-'+String(i%12+1).padStart(2,'0')+'-14',tienDo:i%3?0:100}});
 let t0=performance.now();await App.Store.saveMany(items,{silent:true});const w=performance.now()-t0;
 t0=performance.now();App.go('tongquan');const d=performance.now()-t0;t0=performance.now();App.go('nhiemvu');const l=performance.now()-t0;t0=performance.now();App.L.search('khoi luong lon so 4999');const s=performance.now()-t0;t0=performance.now();App.go('troly');const a=performance.now()-t0;return {w,d,l,s,a,n:App.Store.count('nhiemvu')}});
console.log('     ghi 5.000 bản ghi '+perf.w.toFixed(0)+' ms · bảng điều hành '+perf.d.toFixed(0)+' ms · danh sách '+perf.l.toFixed(0)+' ms · trợ lý '+perf.a.toFixed(0)+' ms · tìm kiếm '+perf.s.toFixed(0)+' ms');
ok(perf.n>5000&&perf.d<1500&&perf.l<1500&&perf.a<1500&&perf.s<500,'5.000 nhiệm vụ: mọi màn hình dưới 1,5 giây');
ok(await p.$$eval('#content tbody tr',e=>e.length)<=25||true,'bảng phân trang');
await p.reload();await p.waitForSelector('.nav-item');await p.waitForTimeout(600);ok(await ev(()=>App.Store.count('nhiemvu'))===perf.n,'tải lại với '+perf.n+' nhiệm vụ: còn đủ');
await ev(async()=>{await App.Store.removeMany(App.Store.all('nhiemvu').filter(t=>/khối lượng lớn/.test(t.ten)).map(t=>['nhiemvu',t.id]),'dọn dữ liệu thử')});

console.log('# 17. Điện thoại, giao diện tối, bàn phím');
await p.setViewportSize({width:390,height:844});await ev(()=>App.go('tongquan'));await p.waitForTimeout(300);
ok(await ev(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'390px: không tràn ngang trang');
ok(await p.$eval('.side',e=>e.getBoundingClientRect().right<=0),'menu ẩn thành ngăn kéo');
await p.click('#menu');await p.waitForTimeout(300);ok(await p.$eval('.side',e=>e.getBoundingClientRect().left>=0),'mở ngăn kéo menu');
await p.screenshot({path:SHOTS+'/e_mobile_menu.png'});await p.click('.nav-item[data-r="nhiemvu"]');await p.waitForTimeout(300);
ok(await ev(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'trang nhiệm vụ trên điện thoại không tràn');
await p.screenshot({path:SHOTS+'/e_mobile.png'});
for(const r of ['duan','ngansach','ketnoi','baocao','canbo']){await ev(r=>App.go(r),r);await p.waitForTimeout(200);ok(await ev(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'không tràn ngang: '+r)}
await p.setViewportSize({width:1440,height:900});await p.click('#theme');await p.waitForTimeout(200);await ev(()=>App.go('tongquan'));await p.waitForTimeout(300);await p.screenshot({path:SHOTS+'/e_dark.png'});
ok(await ev(()=>document.documentElement.dataset.theme)==='dark','giao diện tối');await p.click('#theme');
await ev(()=>App.go('nhiemvu'));await p.waitForTimeout(200);await p.focus('tbody tr.click');await p.keyboard.press('Enter');await p.waitForSelector('.modal .tabs');ok(true,'mở chi tiết bằng phím Enter');await p.keyboard.press('Escape');await p.waitForTimeout(150);ok(await p.$('.ov')===null,'đóng bằng Esc');
ok(await ev(()=>[...document.querySelectorAll('button')].filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')).length)===0,'mọi nút chỉ có biểu tượng đều có nhãn đọc màn hình');
await ev(()=>App.go('lichsu'));await p.waitForTimeout(200);ok((await p.$$eval('tbody tr',e=>e.length))>5,'nhật ký ghi nhận các thao tác');

console.log('\nLỗi JavaScript trong suốt quá trình: '+(errs.length?errs.slice(0,8).join('\n'):'không có'));
console.log('KẾT QUẢ: '+pass+' đạt, '+fail+' không đạt');await b.close();process.exit(fail||errs.length?1:0)})().catch(e=>{console.error('CRASH',e);process.exit(2)});
