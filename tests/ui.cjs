const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');

// Real UI interactions in an isolated browser. Test-only game access seeds currency
// so the purchase path can be verified without changing the player's saved game.
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const action=id=>page.locator(`[data-action="${id}"]`).first();
 const screen=()=>page.locator('#ui').getAttribute('data-screen');
 const shot=name=>page.screenshot({path:path.join(__dirname,`../screenshots/ui-${name}.png`)});
 try {
  await page.goto('http://127.0.0.1:4177/?test');
  await page.waitForFunction(()=>window.skyrail?.game?.ui);
  assert.equal(await screen(),'menu');
  assert.equal(await action('continue').isDisabled(),true);
  await shot('menu-1440');

  await action('loadout').click();
  await page.locator('[data-action="weapon"][data-index="2"]').click();
  assert.equal(await page.evaluate(()=>window.skyrail.game.save.weaponIndex),2);
  assert.equal(await page.locator('.sr-weapon-detail h2').textContent(),'SCATTER CANNON');
  await shot('loadout-1440');
  await action('back').click();
  assert.equal(await screen(),'menu');

  await action('settings').click();
  await page.locator('#sr-quality').selectOption('low');
  await page.locator('#sr-shadows').uncheck();
  assert.equal(await page.evaluate(()=>window.skyrail.game.renderer.shadowMap.enabled),false);
  await page.locator('[data-action="settingtab"][data-id="gameplay"]').click();
  await page.locator('#sr-fov').focus();
  await page.locator('#sr-fov').press('Home');
  await page.locator('#sr-fov').press('ArrowRight');
  assert.equal(await page.evaluate(()=>window.skyrail.game.settings.fov),56);
  await action('controls').click();
  assert.equal(await screen(),'controls');
  assert.match(await page.locator('.sr-controls-groups').innerText(),/Воздушный рывок/);
  await action('back').click();
  assert.equal(await screen(),'settings');
  await action('back').click();
  assert.equal(await screen(),'menu');
  await page.reload();
  await page.waitForFunction(()=>window.skyrail?.game?.ui);
  assert.equal(await page.evaluate(()=>window.skyrail.game.settings.fov),56);
  assert.equal(await page.evaluate(()=>window.skyrail.game.settings.quality),'low');
  await action('settings').click();
  await action('resetsettings').click();
  assert.equal(await page.evaluate(()=>window.skyrail.game.settings.fov),76);
  await shot('settings-1440');
  await action('back').click();

  await action('workshop').click();
  assert.equal(await page.locator('[data-action="purchase"][data-id="armor"]').isDisabled(),true);
  await page.evaluate(()=>{const game=window.skyrail.game;game.save.scrap=1000;game.ui.setSave(game.save);});
  await page.locator('[data-action="purchase"][data-id="armor"]').click();
  assert.deepEqual(await page.evaluate(()=>({scrap:window.skyrail.game.save.scrap,armor:window.skyrail.game.save.workshop.armor})),{scrap:920,armor:1});
  assert.match(await page.locator('[data-action="purchase"][data-id="armor"]').innerText(),/160/);
  await shot('workshop-1440');
  await action('back').click();

  for(const width of [1024,768,320]){
   await page.setViewportSize({width,height:width===320?780:768});
   await shot(`menu-${width}`);
   const overflow=await page.evaluate(()=>{const el=document.querySelector('.sr-screen');return el.scrollWidth>el.clientWidth+1;});
   assert.equal(overflow,false,`Menu horizontally overflows at ${width}px`);
   await action('settings').click();
   await shot(`settings-${width}`);
   assert.equal(await page.evaluate(()=>{const el=document.querySelector('.sr-screen');return el.scrollWidth>el.clientWidth+1;}),false,`Settings horizontally overflow at ${width}px`);
   await action('back').click();
  }

  await page.setViewportSize({width:1440,height:900});
  await action('start').click();
  await page.waitForFunction(()=>window.skyrail.game.mode==='playing');
  await page.keyboard.press('Escape');
  assert.equal(await screen(),'pause');
  await action('settings').click();
  await action('back').click();
  assert.equal(await screen(),'pause');
  await action('resume').click();
  assert.equal(await page.evaluate(()=>window.skyrail.game.mode),'playing');
  await page.keyboard.press('KeyH');
  assert.equal(await screen(),'controls');
  await shot('controls-1440');
  await page.keyboard.press('KeyH');
  assert.equal(await screen(),'hud');
  await shot('hud-1440');
  await page.keyboard.press('Escape');
  await action('menu').click();
  assert.equal(await screen(),'menu');
  assert.equal(await action('continue').isDisabled(),false);
  await action('quit').click();
  assert.equal(await screen(),'quit');
  await action('hub').click();
  assert.equal(await screen(),'hub');
  await shot('hub-1440');

  // UI fixtures exercise real upgrade/route callbacks independently of combat QA.
  await action('start').click();
  await page.waitForFunction(()=>window.skyrail.game.mode==='playing');
  await page.evaluate(()=>window.skyrail.game.offerUpgrades(true));
  assert.equal(await screen(),'upgrades');
  const upgrade=await page.locator('[data-action="upgrade"]').first().getAttribute('data-id');
  await shot('upgrades-1440');
  await page.locator('[data-action="upgrade"]').first().click();
  assert.equal(await page.evaluate(id=>Boolean(window.skyrail.game.mods[id]),upgrade),true);
  assert.equal(await screen(),'routes');
  await shot('routes-1440');
  await page.locator('[data-action="route"]').first().click();
  assert.equal(await page.evaluate(()=>window.skyrail.game.sector),1);
  assert.equal(await screen(),'hud');
  await page.evaluate(()=>{const game=window.skyrail.game;game.intro=false;game.invulnerability=0;game.damage(9999);});
  assert.equal(await screen(),'death');
  await shot('death-1440');
  await action('retry').click();
  await page.waitForFunction(()=>window.skyrail.game.mode==='playing');
  assert.equal(await page.evaluate(()=>window.skyrail.game.sector),1);
  await page.evaluate(()=>window.skyrail.game.win());
  assert.equal(await screen(),'victory');
  await shot('victory-1440');
  await action('hub').click();
  assert.equal(await screen(),'hub');
  assert.equal(await page.evaluate(()=>window.skyrail.game.save.wins),1);

  assert.deepEqual(errors,[],'Browser must not emit unhandled errors');
  console.log('PASS: menu/loadout, live settings and persistence, nested back, workshop purchase/cost, 320/768/1024/1440 responsive layout, pause/resume, H guide, continue, quit/base, real upgrade/route callbacks, death retry checkpoint, victory/base.');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
