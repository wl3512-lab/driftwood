// Parent follow-up after agent quota interruption. UI interactions only.
const {chromium}=require('/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('fs');const path=require('path');const dir=__dirname;
(async()=>{
 const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--mute-audio']});
 const c=await b.newContext({viewport:{width:1280,height:800}});const p=await c.newPage(); const log=[];
 p.on('console',m=>{if(['error','warning'].includes(m.type()))log.push({at:new Date().toISOString(),kind:m.type(),text:m.text()})});p.on('pageerror',e=>log.push({at:new Date().toISOString(),kind:'pageerror',text:e.message}));
 const snap=async(n)=>{await p.screenshot({path:path.join(dir,n+'.png')});log.push({at:new Date().toISOString(),kind:'snapshot',name:n,text:await p.locator('body').innerText()});fs.writeFileSync(path.join(dir,'followup-log.json'),JSON.stringify(log,null,2));};
 try {
 await p.goto('http://127.0.0.1:8766/'); await p.getByRole('button',{name:'Enter Driftwood',exact:true}).click();
 await p.getByRole('button',{name:'Begin',exact:true}).click();await p.locator('#name-input').fill('Resume Verify');await p.getByRole('radio',{name:'they ask me',exact:true}).click();await p.getByRole('button',{name:'enter the garden',exact:true}).click();
 await p.locator('#adopt-cat').click();await p.locator('#go-garden-btn').click();await p.locator('#mood-indicator').click();await p.getByRole('dialog',{name:'Declare your mood'}).locator('button').filter({hasText:/^happy$/}).click();await snap('25-resume-before');
 await p.reload(); await p.getByRole('button',{name:'Enter Driftwood',exact:true}).click();await p.getByRole('button',{name:'Begin',exact:true}).click();await p.getByRole('button',{name:'return to your garden',exact:true}).click();await p.locator('#mood-indicator').waitFor();await snap('26-resume-after');await p.getByRole('button',{name:'Open pet menu',exact:true}).click();await snap('27-resumed-pet-list');await p.getByRole('button',{name:'Open chat with Luna',exact:true}).click();await snap('28-resumed-cat');
 // Separate fresh context for a phone entry check.
 const mc=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const mp=await mc.newPage();await mp.goto('http://127.0.0.1:8766/');await mp.getByRole('button',{name:'Enter Driftwood',exact:true}).click();await mp.getByRole('button',{name:'Begin',exact:true}).click();await mp.locator('#name-input').fill('Phone Test');await mp.getByRole('radio',{name:'they ask me',exact:true}).click();await mp.screenshot({path:path.join(dir,'29-phone-landscape-entry.png')});await mp.getByRole('button',{name:'enter the garden',exact:true}).click();await mp.locator('#adopt-cat').click();await mp.locator('#go-garden-btn').click();await mp.locator('#mood-indicator').waitFor();await mp.screenshot({path:path.join(dir,'30-phone-landscape-garden.png')});log.push({at:new Date().toISOString(),kind:'mobile-result',text:await mp.locator('body').innerText()});
 } catch(e){log.push({at:new Date().toISOString(),kind:'test-error',text:e.message});await snap('followup-error');process.exitCode=1;} finally{fs.writeFileSync(path.join(dir,'followup-log.json'),JSON.stringify(log,null,2));await b.close();} console.log(JSON.stringify(log.filter(x=>x.kind!=='warning'),null,2));
})();
