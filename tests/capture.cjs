const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4177/?test');await page.waitForTimeout(4000);
 console.log(JSON.stringify({errors,body:(await page.locator('body').innerText()).slice(0,1500),snapshot:await page.evaluate(()=>window.skyrail?.snapshot())},null,2));
 await page.screenshot({path:path.join(__dirname,'../screenshots/01-menu.png')});
 if(await page.locator('[data-action="start"]').count()){
 await page.locator('[data-action="start"]').first().click();await page.waitForTimeout(2000);await page.screenshot({path:path.join(__dirname,'../screenshots/02-glider.png')});
 await page.keyboard.press('KeyE');await page.waitForTimeout(2200);console.log('AFTER HOOK',JSON.stringify(await page.evaluate(()=>window.skyrail?.snapshot())));await page.screenshot({path:path.join(__dirname,'../screenshots/03-boarded.png')});
 await page.keyboard.down('KeyW');await page.keyboard.down('Shift');await page.waitForTimeout(1600);await page.keyboard.press('Space');await page.waitForTimeout(400);await page.keyboard.press('Space');await page.waitForTimeout(600);await page.keyboard.up('KeyW');await page.keyboard.up('Shift');await page.waitForTimeout(500);console.log('RUN',JSON.stringify(await page.evaluate(()=>window.skyrail?.snapshot())));await page.screenshot({path:path.join(__dirname,'../screenshots/04-traversal.png')});}
 console.log('ERRORS',JSON.stringify(errors));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
