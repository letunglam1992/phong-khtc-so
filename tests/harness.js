// Nạp lõi + logic vào Node với Store giả trong bộ nhớ
const path=require('path');
global.App={};
['00-core','20-schema','25-seed','30-logic'].forEach((f,i)=>{
  if(i===1){ // Store giả trước khi nạp schema
    const data={};
    App.Store={cfg:{},data,coll:c=>data[c]||(data[c]=new Map()),all:c=>Array.from(App.Store.coll(c).values()),get:(c,id)=>id?App.Store.coll(c).get(id)||null:null,count:c=>App.Store.coll(c).size,
      put:(c,r)=>{if(!r.id)r.id=c+'_'+(App.Store.coll(c).size+1);App.Store.coll(c).set(r.id,r);return r},reset:()=>{Object.keys(data).forEach(k=>delete data[k])}};
  }
  const src=require('fs').readFileSync(path.join(__dirname,'../src/js/'+f+'.js'),'utf8');
  (0,eval)(src.replace("var App = (typeof App !== 'undefined') ? App : {};",''));
});
module.exports=App;
