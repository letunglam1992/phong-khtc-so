const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
await p.goto('file://'+path.resolve(__dirname,'../dist/PhongKHTC-so.html'));await p.waitForSelector('.nav-item');await p.waitForTimeout(500);
const routes=await p.$$eval('.nav-item',e=>e.map(x=>x.dataset.r));
for(const r of routes){await p.click(`.nav-item[data-r="${r}"]`);await p.waitForTimeout(250);const t=await p.textContent('#content');if(/gặp lỗi khi hiển thị/.test(t))errs.push('VIEW '+r+': '+t.slice(0,300));
 await p.screenshot({path:process.argv[2]+'/s_'+r+'.png'});}
console.log('routes',routes.join(','));console.log(errs.length?errs.join('\n'):'NO ERRORS');await b.close()})();
