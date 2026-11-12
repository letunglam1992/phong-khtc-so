const A=require('./harness'),X=require('xlsx');
const wb=X.readFile(process.argv[2]);const ws=wb.Sheets[wb.SheetNames[0]];
const p=A.L.parseNhaDat(X.utils.sheet_to_json(ws,{header:1,raw:true,defval:null}));
console.log('header',p.headerRow,'cols',JSON.stringify(p.cols),'items',p.items.length,'tong',JSON.stringify(p.tong));
const S=A.L.ndStats(p.items);console.log(JSON.stringify(Object.assign({},S,{donVi:undefined})));
p.warnings.forEach(w=>console.log(' W',w));
[1,7,9,14,17,55,61,63].forEach(i=>{const x=p.items[i-1];console.log(i,JSON.stringify(x).slice(0,330))});
