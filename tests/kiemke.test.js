global.document=undefined;
const A=require('./harness'),X=require('xlsx');
for(const f of process.argv.slice(2)){const ws=(w=>w.Sheets[w.SheetNames[0]])(X.readFile(f));
 const p=A.L.parseKiemKe(X.utils.sheet_to_json(ws,{header:1,raw:true,defval:null}));
 const s=A.L.kkSum(p.items.map((x,i)=>Object.assign({thuTu:i},x)));
 console.log('##',p.mau,p.maMau,'|',p.ten,'|',p.phamVi,'|',p.donVi,p.maDonVi,'| ngay',p.ngay,'| items',p.items.length);
 console.log('   cols',JSON.stringify(p.cols));
 console.log('   sum',JSON.stringify(s),' tong',JSON.stringify({sl:p.tong&&p.tong.slKK,ng:p.tong&&p.tong.nguyenGia,cl:p.tong&&p.tong.gtcl,h:p.tong&&p.tong.hong}));
 p.warnings.forEach(w=>console.log('   W',w));}
