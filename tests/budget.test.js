const A=require('./harness'),X=require('xlsx');
const wb=X.readFile(process.argv[2]);const ws=wb.Sheets['Nhiệm vụ'];
const raw=X.utils.sheet_to_json(ws,{header:1,raw:true,defval:null}),fmt=X.utils.sheet_to_json(ws,{header:1,raw:false,defval:null});
const p=A.L.parseBudget(raw,fmt);
console.log('header row',p.headerRow,'cols',JSON.stringify(p.cols),'items',p.items.length);
p.items.forEach(i=>console.log(String(i.row).padStart(3),'  '.repeat(i.level)+'['+i.stt+']',i.noiDung.slice(0,48),'| DT',i.duToan,'GN',i.giaiNgan,i.isGroup?'(nhóm)':''));
console.log('WARN',p.warnings.length);p.warnings.forEach(w=>console.log(' -',w));
const leaf=p.items.filter(i=>!i.isGroup);const s=k=>leaf.reduce((a,i)=>a+i[k],0);
console.log('SUM leaves DT',s('duToan'),'GN',s('giaiNgan'),'CN',s('chuyenNguon'),'tong',leaf.reduce((a,i)=>a+A.L.nsTong(i),0));
