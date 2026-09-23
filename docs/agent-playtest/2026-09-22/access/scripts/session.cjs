const { chromium } = require('/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('fs');
const readline = require('readline');
const base = 'docs/agent-playtest/2026-09-22/access';
(async () => {
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
let context = await browser.newContext({viewport:{width:1440,height:900}});
let page = await context.newPage();
const logs=[]; const actions=[];
function watch(p) { p.on('console', m=>logs.push({kind:'console',type:m.type(),text:m.text()})); p.on('pageerror',e=>logs.push({kind:'pageerror',text:e.message})); p.on('requestfailed',r=>logs.push({kind:'requestfailed',url:r.url(),error:r.failure()})); p.on('response',r=>{if(r.status()>=400)logs.push({kind:'http',status:r.status(),url:r.url()});}); }
watch(page);
async function state(){return await page.evaluate(()=>({url:location.href,title:document.title,text:document.body.innerText,focus:document.activeElement ? {tag:document.activeElement.tagName,id:document.activeElement.id,cls:document.activeElement.className,text:document.activeElement.innerText,aria:document.activeElement.getAttribute('aria-label')} : null,controls:[...document.querySelectorAll('button,a,input,select,textarea,[tabindex]')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>({tag:e.tagName,id:e.id,text:e.innerText,aria:e.getAttribute('aria-label'),tabindex:e.getAttribute('tabindex'),disabled:e.disabled,rect:{x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}}))}));}
await page.goto('http://127.0.0.1:8766/');
console.log(JSON.stringify({ready:true,state:await state()}));
const rl = readline.createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of rl){try{const c=JSON.parse(line); actions.push({at:new Date().toISOString(),...c}); let result;
if(c.key){await page.keyboard.press(c.key); await page.waitForTimeout(c.wait||250);}
if(c.type){await page.keyboard.type(c.type);}
if(c.wait&&!c.key)await page.waitForTimeout(c.wait);
if(c.shot){await page.screenshot({path:base+'/evidence/'+c.shot+'.png',fullPage:false});}
if(c.new){await context.close();context=await browser.newContext({viewport:c.new,isMobile:!!c.mobile,hasTouch:!!c.mobile});page=await context.newPage();watch(page);await page.goto('http://127.0.0.1:8766/');await page.waitForTimeout(300);}
if(c.resize)await page.setViewportSize(c.resize);
if(c.clickText){await page.getByText(c.clickText,{exact:true}).click(); await page.waitForTimeout(300);}
if(c.save){fs.writeFileSync(base+'/evidence/session-log.json',JSON.stringify({actions,logs},null,2));}
if(c.close){await browser.close();break;}
result=await state(); console.log(JSON.stringify({result,logs:logs.slice(-15)}));
}catch(e){console.log(JSON.stringify({error:e.message}));}}
})();
