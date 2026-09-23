const { chromium } = require('/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('node:fs');
const readline = require('node:readline');
const path = require('node:path');
const dir = __dirname;
const logPath = path.join(dir,'events.jsonl');
function log(type,data){fs.appendFileSync(logPath,JSON.stringify({at:new Date().toISOString(),type,...data})+'\n');}
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage();
 page.on('console',m=>log('console',{level:m.type(),text:m.text()}));
 page.on('pageerror',e=>log('pageerror',{message:e.message,stack:e.stack}));
 page.on('requestfailed',r=>log('requestfailed',{url:r.url(),failure:r.failure()}));
 page.on('response',r=>{if(r.status()>=400)log('http-error',{url:r.url(),status:r.status()});});
 page.on('dialog',async d=>{log('dialog',{type:d.type(),message:d.message()});await d.accept();});
 await page.goto('http://127.0.0.1:8766/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);
 async function snapshot(name){
  const screenshot=name?path.join(dir,name+'.png'):null;
  if(screenshot){try{await page.screenshot({path:screenshot,fullPage:false,timeout:10000});}catch(e){log('harness-screenshot-error',{name,message:e.message});}}
  const text=await page.locator('body').innerText();
  const aria=await page.locator('body').ariaSnapshot();
  const focus=await page.locator(':focus').evaluateAll(es=>es.map(e=>({tag:e.tagName,text:e.textContent,aria:e.getAttribute('aria-label')})));
  log('snapshot',{name,url:page.url(),text,aria,focus});
  return {url:page.url(),text,aria,focus,screenshot};
 }
 console.log(JSON.stringify({ready:true,...await snapshot('01-entry')}));
 const rl=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
 for await(const line of rl){
  try{
   const a=JSON.parse(line);log('action',a);
   if(a.kind==='click')await page.getByRole(a.role||'button',{name:a.name,exact:a.exact!==false}).nth(a.nth||0).click();
   else if(a.kind==='point')await page.mouse.click(a.x,a.y);
   else if(a.kind==='text')await page.getByText(a.text,{exact:a.exact!==false}).click();
   else if(a.kind==='fill')await page.getByRole(a.role||'textbox',{name:a.name,exact:a.exact!==false}).fill(a.value);
   else if(a.kind==='placeholder')await page.getByPlaceholder(a.placeholder,{exact:true}).fill(a.value);
   else if(a.kind==='press')await page.keyboard.press(a.key);
   else if(a.kind==='reload')await page.reload();
   else if(a.kind==='wait')await page.waitForTimeout(a.ms||1000);
   else if(a.kind==='scroll')await page.mouse.wheel(a.x||0,a.y||600);
   else if(a.kind==='close'){await browser.close();console.log(JSON.stringify({closed:true}));break;}
   else if(a.kind!=='snapshot')throw new Error('Unknown action');
   if(a.settle)await page.waitForTimeout(a.settle);
   console.log(JSON.stringify({ok:true,...await snapshot(a.shot)}));
  }catch(e){log('action-error',{message:e.message});console.log(JSON.stringify({ok:false,error:e.message}));}
 }
})();
