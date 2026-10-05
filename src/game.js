import * as THREE from '../vendor/three.module.js';
import {Controller,STEP,anchorPosition} from './physics.js';
import {World,seeded} from './world.js';
import {Combat,GUNS} from './combat.js';
import {createCharacter,animateCharacter,createGlider,createWeapon} from './assets.js';
import {createAtmosphere,createEffects} from './atmosphere.js';
import {createAudio} from './audio.js';
import {createUI,UPGRADES} from './ui.js';
const V=THREE.Vector3, clamp=THREE.MathUtils.clamp;
const SAVE_KEY='skyrail-save-v1';
const HOOKS=['PULL','SWING','SLINGSHOT','DRAG','RIP','LINK'];
const BIOMES={iron:'THE IRON RUN',cloud:'CLOUD CITY',storm:'STORM BELT',scrap:'SCRAP FIELDS',sun:'SUN TEMPLE',under:'THE UNDERCLOUD'};
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s&&s.version===1)return {...s,workshop:{...(s.workshop||{})}};}catch{}return {version:1,scrap:0,best:0,runs:0,wins:0,workshop:{},weaponIndex:0,checkpoint:null};}

export class Game {
 constructor(canvas){
  this.canvas=canvas;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.12,3000);
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.atmosphere=createAtmosphere(this.scene);this.effects=createEffects(this.scene);this.audio=createAudio();this.world=new World(this.scene);this.player=new Controller();this.hero=createCharacter();this.scene.add(this.hero);this.glider=createGlider();this.scene.add(this.glider);
  this.save=loadSave();this.mods={};this.combat=new Combat(this);this.mode='menu';this.time=0;this.visualTime=0;this.elapsed=0;this.sector=0;this.biome='iron';this.seed=0;this.score=0;this.combo=0;this.comboTime=0;this.totalKills=0;this.health=100;this.maxHealth=100;this.hookMode=0;this.hookCooldown=0;this.invulnerability=0;this.keys=new Set();this.pressed=new Set();this.forward=new V(0,0,-1);this.yaw=0;this.pitch=.08;this.cameraPos=new V();this.fireHeld=false;this.mouseDrag=false;this.looked=false;this.bossPhase=1;this.extractionReady=false;this.hintTime=0;this.hitMarker=0;this.damageFlash=0;this.fps=60;this.accumulator=0;this.sprintToggled=false;
  this.ui=createUI({onStart:()=>this.start(),onContinue:()=>this.continueRun(),onResume:()=>this.resume(),onMenu:()=>this.menu(),onSettings:s=>this.applySettings(s),onWeapon:i=>{this.combat.switch(Number(i));this.save.weaponIndex=Number(i);this.persist();},onUpgrade:id=>this.chooseUpgrade(id),onRoute:id=>this.chooseRoute(id),onWorkshop:id=>this.buyWorkshop(id),onRetry:()=>this.retry(),onHub:()=>this.hub()});
  this.settings=this.ui.getSettings();this.applySettings(this.settings);this.ui.setSave(this.save);this.setupMarkers();this.bindInput();this.menu();this.setWeaponModel();this.lastFrame=performance.now();this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);
 }
 setupMarkers(){
  this.markerLayer=document.createElement('div');this.markerLayer.id='world-markers';this.markerLayer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:4;overflow:hidden;font-family:Consolas,monospace';document.body.append(this.markerLayer);
  this.markers=[];for(let i=0;i<14;i++){const e=document.createElement('div');e.style.cssText='position:absolute;transform:translate(-50%,-50%);text-align:center;white-space:nowrap;font-size:10px;font-weight:600;letter-spacing:1px;text-shadow:0 2px 5px #071b24,0 0 12px #071b24;color:#ffda8b;display:none';this.markerLayer.append(e);this.markers.push(e);}
  this.flash=document.createElement('div');this.flash.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:3;box-shadow:inset 0 0 130px 40px #cc392f;opacity:0';document.body.append(this.flash);
  this.ropeGeometry=new THREE.BufferGeometry();this.ropePoints=new Float32Array(33*3);this.ropeGeometry.setAttribute('position',new THREE.BufferAttribute(this.ropePoints,3));this.ropeLine=new THREE.Line(this.ropeGeometry,new THREE.LineBasicMaterial({color:0xf6d791}));this.ropeLine.frustumCulled=false;this.scene.add(this.ropeLine);
 }
 bindInput(){
  window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.resize();});
  window.addEventListener('keydown',e=>{
   if(e.target.matches('input,select,textarea'))return;
   if(['Space','ControlLeft','ControlRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code)&&this.mode==='playing')e.preventDefault();
   if(!this.keys.has(e.code))this.pressed.add(e.code);this.keys.add(e.code);
   if(e.repeat)return;
   if(e.code==='Escape'){if(this.mode==='playing')this.pause();else if(['pause','controls'].includes(this.mode))this.resume();}
   if(e.code==='KeyH'){if(this.mode==='playing'){this.mode='controls';document.exitPointerLock?.();this.ui.show('controls');}else if(this.mode==='controls')this.resume();}
   if(this.mode!=='playing')return;
   if(e.code==='KeyQ'){this.hookMode=(this.hookMode+1)%HOOKS.length;this.ui.toast(HOOKS[this.hookMode],['Притянуться к точке крепления','Раскачаться и сохранить скорость','Удерживайте E, отпустите для броска','Притянуть противника','Сорвать щит или оборудование','Привязать врага к соседнему транспорту'][this.hookMode]);}
   if(e.code==='KeyE')this.useHook();if(e.code==='KeyR')this.combat.reload();if(e.code==='KeyX')this.combat.melee();if(e.code==='KeyF')this.interact();
   if(e.code.startsWith('Digit')){const index=Number(e.code.slice(5))-1;if(index>=0&&index<5)this.combat.switch(index);}
   if(e.code==='ShiftLeft'&&this.settings.toggleSprint)this.sprintToggled=!this.sprintToggled;
  });
  window.addEventListener('keyup',e=>{this.keys.delete(e.code);if(e.code==='KeyE'&&this.player.rope?.mode==='SLINGSHOT')this.player.release(true,this.forward);});
  canvasEvents(this);
  window.addEventListener('blur',()=>{this.keys.clear();this.pressed.clear();this.fireHeld=false;if(this.mode==='playing')this.pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.mode==='playing')this.pause();this.accumulator=0;this.lastFrame=performance.now();});
 }
 applySettings(s){this.settings={...this.settings,...s};this.renderer.shadowMap.enabled=s.shadows!==false;this.atmosphere.setQuality(this.settings);this.effects.setQuality(this.settings);this.audio.setVolumes({master:s.master??.8,music:s.music??.45,sfx:s.sfx??.85});this.resize();}
 resize(){const q=String(this.settings?.quality||'high').toLowerCase();let scale=Number(this.settings?.renderScale)||1;if(scale>2)scale/=100;this.renderer.setPixelRatio(Math.min(devicePixelRatio,q==='low'?1:1.5)*clamp(scale,.5,1.5));this.renderer.setSize(innerWidth,innerHeight);}
 persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.save));}catch{}this.ui?.setSave(this.save);}
 menu(){this.persist();this.mode='menu';document.exitPointerLock?.();this.keys.clear();this.fireHeld=false;this.world.build(0,'iron',8245);this.clearEnemies();this.hero.visible=false;this.glider.visible=false;this.biome='iron';this.time=0;this.ui.show('menu');this.ui.setSave(this.save);}
 clearEnemies(){for(const e of this.combat.enemies){this.scene.remove(e.mesh);this.disposeObject(e.mesh);}this.combat.enemies=[];this.combat.bullets=[];}
 disposeObject(object){const geometries=new Set(),materials=new Set();object.traverse(o=>{if(o.userData?.ownedGeometry)geometries.add(o.geometry);if(o.userData?.ownedMaterial)materials.add(o.material);});geometries.forEach(g=>g?.dispose());materials.forEach(m=>m?.dispose());}
 async start(){await this.audio.unlock();this.seed=Math.floor(Math.random()*999999)+1;this.sector=0;this.biome='iron';this.elapsed=0;this.score=0;this.totalKills=0;this.mods={};this.hookMode=0;this.secretUpgrade=false;this.introHint=false;this.sprintToggled=false;this.save.runs++;this.combat.weaponIndex=this.save.weaponIndex||0;this.launchSector(true);}
 async continueRun(){await this.audio.unlock();const cp=this.save.checkpoint;if(!cp){this.start();return;}this.seed=cp.seed;this.sector=cp.sector;this.biome=cp.biome;this.mods={...cp.mods};this.elapsed=cp.elapsed||0;this.score=cp.score||0;this.totalKills=cp.kills||0;this.launchSector(false);}
 launchSector(intro=false){
  this.mode='playing';this.time=0;this.hintTime=0;this.intro=intro;this.introTime=0;this.bossPhase=1;this.extractionReady=false;this.lastBossPhase=1;this.sectorComplete=false;this.hookCooldown=0;this.invulnerability=3;this.health=this.maxHealth=100+(this.save.workshop.armor||0)*15+(this.mods.reinforced?30:0);this.combo=0;
  this.clearEnemies();if(this.sector>=4)this.world.buildBoss(this.seed);else this.world.build(this.sector,this.biome,this.seed);
  const start=this.world.start;
  if(intro)this.player.reset(new V(-12,9,17));else this.player.reset(start.pos.clone().add(new V(0,.01,7)),start);
  this.player.mod={...this.mods,engineLevel:this.save.workshop.engine||0};this.hero.visible=true;this.glider.visible=intro;this.yaw=0;this.pitch=.07;this.looked=false;this.cameraPos.copy(this.player.position).add(new V(1.7,4.5,10));this.combat.reset();this.setWeaponModel();this.ui.show('hud');this.ui.toast(this.sector>=4?'THE ADMIRAL':BIOMES[this.biome],this.sector>=4?'Разорвите броню. Уничтожьте внешние системы.':'Три индукционных замка. Один груз. Никаких остановок.');this.checkpoint();this.keys.clear();this.pressed.clear();this.accumulator=0;this.canvas.focus();
 }
 checkpoint(){this.save.checkpoint={seed:this.seed,sector:this.sector,biome:this.biome,mods:{...this.mods},elapsed:this.elapsed,score:this.score,kills:this.totalKills};this.persist();}
 retry(){this.continueRun();}
 pause(){if(this.mode!=='playing')return;this.mode='pause';this.fireHeld=false;this.keys.clear();document.exitPointerLock?.();this.ui.show('pause');}
 resume(){this.mode='playing';this.keys.clear();this.pressed.clear();this.ui.show('hud');this.canvas.focus();this.audio.unlock();this.lastFrame=performance.now();this.accumulator=0;}
 hub(){this.persist();this.mode='hub';document.exitPointerLock?.();this.world.buildHub(Math.min(4,Object.values(this.save.workshop).reduce((a,b)=>a+b,0)));this.clearEnemies();this.hero.visible=true;this.glider.visible=false;this.player.reset(new V(0,0,4),this.world.start);this.biome='cloud';this.time=0;this.ui.setSave(this.save);this.ui.show('hub',this.save);}
 buyWorkshop(id){const costs={armor:80,engine:100,magazine:90,medbay:120};if(!(id in costs))return;const level=this.save.workshop[id]||0,cost=costs[id]*(level+1);if(level>=4){this.ui.toast('MAXIMUM TIER','Модификация полностью улучшена.');return;}if(this.save.scrap<cost){this.ui.toast('NOT ENOUGH SALVAGE',`Нужно ${cost} деталей.`);return;}this.save.scrap-=cost;this.save.workshop[id]=level+1;this.persist();this.audio.play('upgrade');this.ui.toast('WORKSHOP UPGRADED',`${id.toUpperCase()} · TIER ${level+1}`);}
 setWeaponModel(){animateCharacter(this.hero,{time:this.visualTime,weapon:GUNS[this.combat.weaponIndex].id,state:'idle'},.016);}
 comboEvent(name,points=50){this.combo=Math.min(8,this.combo+1);this.comboTime=5;this.score+=Math.round(points*(1+this.combo*.2));if(name)this.ui.toast(name,`FLOW ×${this.combo}  +${points}`);}
 damage(amount){if(this.mode!=='playing'||this.invulnerability>0||this.intro)return;this.health-=amount*(this.mods.blast_shield?.78:1);this.invulnerability=.4;this.damageFlash=.8;this.audio.play('damage');if(this.health<=0){this.health=0;this.mode='death';this.glider.visible=false;document.exitPointerLock?.();this.save.best=Math.max(this.save.best,this.score);this.persist();this.ui.show('death',{score:this.score,kills:this.totalKills,elapsed:this.elapsed,scrap:this.save.scrap,sector:this.sector+1});this.audio.play('death');}}
 onKill(e){this.totalKills++;this.save.scrap+=this.mods.salvage?13:9;this.health=Math.min(this.maxHealth,this.health+(this.mods.field_medic?9:3));this.comboEvent(e.elite?'HUNTER DOWN':'',e.elite?500:100);this.persist();if(e.elite){this.ui.toast('THE ENGINE IS YOURS','Доберитесь до навигационного маяка и нажмите F.');this.audio.play('success');}}
 collectCache(t){this.save.scrap+=t.secret?65:25;this.health=Math.min(this.maxHealth,this.health+20);this.combat.ammo=this.combat.ammo.map((a,i)=>Math.max(a,GUNS[i].ammo));this.ui.toast(t.secret?'SECRET FOUND':'SALVAGE SECURED',t.secret?'+65 деталей · тайник воздушного курьера':'+25 деталей · боеприпасы пополнены');this.audio.play('pickup');this.persist();if(t.secret&&!this.secretUpgrade){this.secretUpgrade=true;this.offerUpgrades(false);}}
 onObjective(t){
  this.score+=350;this.save.scrap+=30;this.persist();this.effects.burst(t.world,0x85e1d0,65,18);this.audio.play('success');this.ui.toast(t.name+' / OFFLINE','Магнитная защита отключена. +30 деталей');
  if(this.world.boss){const alive=this.world.objectives().filter(t=>t.phase===this.bossPhase);if(!alive.length){if(this.bossPhase<3){this.bossPhase++;this.invulnerability=3;this.health=Math.min(this.maxHealth,this.health+25);this.ui.toast('ADMIRAL · PHASE '+this.bossPhase,this.bossPhase===2?'Шторм усиливается. Атакуйте генераторы щита.':'Двигатели разрушены. Уничтожьте сердечник и уходите!');}else{this.extractionReady=true;this.extractionTimer=65;this.ui.toast('ABANDON SHIP','Цепляйтесь за красный поезд слева впереди. F — эвакуация.');}}}
 }
 chooseUpgrade(id){const upgrade=UPGRADES.find(u=>u.id===id);if(!upgrade||this.mods[id])return;this.mods[id]=true;this.player.mod={...this.mods,engineLevel:this.save.workshop.engine||0};this.maxHealth=100+(this.save.workshop.armor||0)*15+(this.mods.reinforced?30:0);this.audio.play('upgrade');this.health=Math.min(this.maxHealth,this.health+30);this.checkpoint();if(this.afterUpgradeRoutes)this.offerRoutes();else this.resume();}
 offerUpgrades(routes=true){this.afterUpgradeRoutes=routes;this.mode='upgrades';document.exitPointerLock?.();const pool=UPGRADES.filter(u=>!this.mods[u.id]);const random=seeded(this.seed+this.sector*71+this.totalKills);const choices=[];while(choices.length<3&&pool.length)choices.push(pool.splice(Math.floor(random()*pool.length),1)[0]);if(!choices.length){if(routes)this.offerRoutes();else this.resume();return;}this.ui.show('upgrades',{choices});}
 offerRoutes(){this.mode='routes';const options=this.sector===0?['cloud','scrap']:this.sector===1?['sun','storm']:['under','storm'];this.routeChoices=options.map((id,i)=>({id,name:BIOMES[id],description:{cloud:'Вертикальные грузовые пути над воздушным городом.',scrap:'Старые машины, тайники и засады сборщиков.',sun:'Солнечные арки и открытые скоростные маршруты.',storm:'Военный конвой в грозе. Много охраны и металла.',under:'Забытые транспортные линии под облаками.'}[id],risk:i?'HIGH RISK':'MEDIUM RISK',reward:i?'+80 SALVAGE':'FIELD REPAIR',biome:id}));this.ui.show('routes',{routes:this.routeChoices});}
 chooseRoute(id){const index=this.routeChoices?.findIndex(r=>r.id===id);if(index===undefined||index<0)return;if(index===1)this.save.scrap+=80;this.sector++;this.biome=id;this.secretUpgrade=false;this.launchSector(false);}
 nextSector(){if(this.sectorComplete)return;this.sectorComplete=true;this.save.scrap+=100;this.score+=1000;this.persist();if(this.sector>=3){this.sector=4;this.biome='storm';this.launchSector(false);}else this.offerUpgrades(true);}
 win(){this.mode='victory';this.save.wins++;this.save.scrap+=300;this.score+=3000;this.save.best=Math.max(this.save.best,this.score);this.save.checkpoint=null;this.persist();document.exitPointerLock?.();this.ui.show('victory',{score:this.score,kills:this.totalKills,elapsed:this.elapsed,scrap:this.save.scrap,upgrades:Object.keys(this.mods).length,rank:this.elapsed<1200?'S':'A'});this.audio.play('success');}
 useHook(){
  if(this.player.rope){this.player.release(this.player.rope.mode==='SLINGSHOT',this.forward);this.audio.play('cable');return;}
  if(this.hookCooldown>0){this.ui.toast('RECHARGING','Магнитному крюку нужно ещё немного времени.');return;}
  const mode=this.intro?'PULL':HOOKS[this.hookMode];if(this.intro)this.hookMode=0;if(['DRAG','RIP','LINK'].includes(mode)){
   if(this.combat.grappleEnemy(mode)){this.hookCooldown=this.mods.double_hook?.3:1.2;return;}
   const t=this.world.targets.filter(t=>!t.dead&&(!t.objective||mode==='RIP')&&t.world.distanceTo(this.player.position)<22).sort((a,b)=>a.world.distanceTo(this.player.position)-b.world.distanceTo(this.player.position))[0];if(t){this.effects.trail(this.player.position.clone().add(new V(0,1,0)),t.world,0xf4d18b,.5);if(mode==='RIP')this.combat.damageTarget(t,130);if(mode==='DRAG')t.loose=this.player.position.clone().sub(t.world).normalize().multiplyScalar(16).setY(7);if(mode==='LINK'){const b=this.world.bodies.filter(b=>b.width>3&&!b.bridge&&b!==t.body).sort((a,b)=>a.pos.distanceTo(t.world)-b.pos.distanceTo(t.world))[0];if(b)t.link={body:b,local:new V(0,1,0),time:6};}this.hookCooldown=1;this.audio.play('hook');return;}
   this.ui.toast('NO MAGNETIC TARGET','Повернитесь к противнику или оборудованию.');return;
  }
  let target=this.world.nearestAnchor(this.player.position,this.camera.getWorldDirection(new V()),this.mods.long_line?95:64);
  if(this.intro){target=this.world.anchors[0];this.intro=false;this.glider.visible=false;this.comboEvent('BOARDING CARGO 07',100);}
  if(!target){this.ui.toast('OUT OF RANGE','Подойдите ближе к золотой точке крепления.');return;}
  this.player.attach(target,mode);this.audio.play('hook');this.hookCooldown=this.mods.chain_hook?.2:this.mods.double_hook?.35:.8;
  if(this.mods.thunder_line)for(const e of this.combat.alive())if(e.position.distanceTo(anchorPosition(target))<9)this.combat.damageEnemy(e,35);
 }
 interact(){
  if(this.intro){this.useHook();return;}
  const p=this.player.position;
  if(this.world.boss&&this.extractionReady&&p.distanceTo(this.world.extraction.pos)<11&&this.player.support===this.world.extraction){this.win();return;}
  let found=false;for(const t of this.world.targets){if(t.dead||p.distanceTo(t.world)>4.5)continue;if(t.objective){this.combat.damageTarget(t,999);found=true;break;}if(t.reward){this.combat.damageTarget(t,999);found=true;break;}}
  if(found)return;
  if(!this.world.boss&&p.distanceTo(this.world.end.pos)<17){
   if(this.world.objectives().length){this.ui.toast('CARGO MAGNETICALLY LOCKED',`Отключите ещё ${this.world.objectives().length} индукционных замка.`);return;}
   if(this.combat.alive().some(e=>e.elite)){this.ui.toast('HUNTER HOLDS THE ENGINE','Победите элитного охотника у локомотива.');return;}
   this.nextSector();return;
  }
  this.ui.toast('KEEP MOVING','F у генераторов, тайников и маяка локомотива.');
 }
 rescue(){
  const body=this.world.bodies.filter(b=>b.active&&b.width>2&&!b.bridge).sort((a,b)=>a.pos.distanceTo(this.player.position)-b.pos.distanceTo(this.player.position))[0];if(!body)return;
  const healthCost=(this.mods.life_line?5:18)-(this.save.workshop.medbay||0)*10;this.player.reset(body.pos.clone().add(new V(0,3,body.length/2-3)));this.player.velocity.y=-1;this.health=clamp(this.health-healthCost,1,this.maxHealth);this.invulnerability=3;this.ui.toast('EMERGENCY LINE',`Страховочный трос сработал. ${healthCost>0?'−':'+'}${Math.abs(healthCost)} здоровья`);this.effects.burst(this.player.position,0x91dbd6,28,6);this.audio.play('hook');
 }
 tick(dt){
  this.time+=dt;this.elapsed+=dt;this.invulnerability=Math.max(0,this.invulnerability-dt);this.hookCooldown=Math.max(0,this.hookCooldown-dt);this.comboTime-=dt;if(this.comboTime<=0)this.combo=0;
  this.world.tick(this.time,dt,this.bossPhase);
  if(this.keys.has('ArrowLeft'))this.yaw+=dt*1.6;if(this.keys.has('ArrowRight'))this.yaw-=dt*1.6;if(this.keys.has('ArrowUp'))this.pitch=clamp(this.pitch-dt,-1.1,1.15);if(this.keys.has('ArrowDown'))this.pitch=clamp(this.pitch+dt,-1.1,1.15);
  this.forward.set(-Math.sin(this.yaw),0,-Math.cos(this.yaw));const right=new V(Math.cos(this.yaw),0,-Math.sin(this.yaw));
  const z=(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0),x=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0),direction=this.forward.clone().multiplyScalar(z).addScaledVector(right,x);
  if(this.intro){this.introTime+=dt;this.player.position.x=-12+Math.sin(this.time*.4)*1.1;this.player.position.y=9+Math.sin(this.time*.7)*.3;this.player.position.z=17-this.introTime*.12;this.player.state='glide';if(this.pressed.has('Space')){this.intro=false;this.glider.visible=false;this.player.velocity.set(0,-2,-5);}if(this.introTime>8&&!this.introHint){this.introHint=true;this.ui.toast('E · MAGNETIC GRAPPLE','Зацепитесь за последний вагон. Space — отпустить дельтаплан.');}}
  else{
   this.player.step(dt,{x:direction.x,z:direction.z,forwardX:this.forward.x,forwardZ:this.forward.z,sprint:this.settings.toggleSprint?this.sprintToggled:this.keys.has('ShiftLeft')||this.keys.has('ShiftRight'),slide:this.keys.has('ControlLeft')||this.keys.has('ControlRight'),jump:this.pressed.has('Space'),dash:this.pressed.has('KeyC'),autoMantle:this.settings.autoMantle},this.world.bodies);
   for(const event of this.player.events){this.audio.play(event,this.player.position);if(['dash','doublejump','hookland','vault','mantle'].includes(event))this.comboEvent('',30);if(event==='impact')this.combat.explode(this.player.position,7,65);if(event==='land'&&this.player.landing>.4)this.effects.burst(this.player.position,0xe5c28d,15,4);}
   if(this.player.position.y<-38)this.rescue();
   if(this.biome==='storm'||this.world.boss){if(!this.player.grounded&&!this.player.rope)this.player.velocity.x+=Math.sin(this.time*.7)*dt*(this.mods.wind_rider?1.5:4);}
  }
  if(this.fireHeld)this.combat.fire();this.combat.update(dt);this.pressed.clear();
  if(this.extractionReady){this.extractionTimer-=dt;if(this.extractionTimer<=0){this.damage(999);this.extractionTimer=0;}}
  if(this.mods.field_medic&&this.time%12<dt)this.health=Math.min(this.maxHealth,this.health+3);
 }
 cameraUpdate(dt){
  if(['menu','hub'].includes(this.mode)){
   const hub=this.mode==='hub';const t=this.visualTime;this.camera.position.set(hub?23:38+Math.sin(t*.075)*7,hub?14:20+Math.sin(t*.12)*2,hub?27:42+Math.sin(t*.07)*10);this.camera.lookAt(hub?new V(0,0,0):new V(0,-.4,-74));this.camera.fov=hub?58:53;this.camera.updateProjectionMatrix();return;
  }
  const p=this.player.position,speed=this.player.speed;const aimDirection=new V(-Math.sin(this.yaw)*Math.cos(this.pitch),-Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch));const desired=p.clone().add(new V(0,1.8,0)).addScaledVector(aimDirection,-8.5).add(new V(Math.cos(this.yaw)*1.4,.65,-Math.sin(this.yaw)*1.4));
  const eye=p.clone().add(new V(0,1.5,0));
  // Keep the camera above decks/props when backing into adjacent cargo.
  for(const b of this.world.bodies){if(Math.abs(desired.x-b.pos.x)<b.width/2+.6&&Math.abs(desired.z-b.pos.z)<b.length/2+.6){desired.y=Math.max(desired.y,b.pos.y+2);for(const o of b.obstacles)if(!o.broken&&!o.overhead&&Math.abs(desired.x-b.pos.x-o.x)<o.width/2+.8&&Math.abs(desired.z-b.pos.z-o.z)<o.depth/2+.8)desired.y=Math.max(desired.y,b.pos.y+o.height+1);}}
  const toCamera=desired.clone().sub(eye),cameraDistance=toCamera.length();this.cameraRay??=new THREE.Raycaster();this.cameraRay.set(eye,toCamera.normalize());this.cameraRay.near=.2;this.cameraRay.far=cameraDistance;
  const nearby=this.world.bodies.filter(b=>b.width>2&&b.pos.distanceTo(p)<b.length/2+25).map(b=>{b.mesh.updateMatrixWorld(true);return b.mesh;});const obstruction=this.cameraRay.intersectObjects(nearby,true)[0];if(obstruction)desired.copy(eye).addScaledVector(toCamera,Math.max(1.2,obstruction.distance-.4));
  this.cameraPos.lerp(desired,1-Math.exp(-dt*11));this.camera.position.copy(this.cameraPos);const shake=Number(this.settings.cameraShake)||0;this.camera.position.y-=this.player.landing*.3*shake;this.camera.position.x+=Math.sin(this.visualTime*44)*this.combat.attackTime*.15*shake;
  this.camera.lookAt(this.camera.position.clone().addScaledVector(aimDirection,50));if(this.player.state==='swing')this.camera.rotateZ(clamp(this.player.velocity.x*.004,-.15,.15)*shake);
  this.camera.fov=THREE.MathUtils.damp(this.camera.fov,(Number(this.settings.fov)||72)+Math.min(14,speed*.24),3,dt);this.camera.updateProjectionMatrix();
 }
 renderMarkers(){
  this.markers.forEach(e=>e.style.display='none');if(this.mode!=='playing')return;let index=0;
  const place=(pos,html,color='#ffdb91')=>{if(index>=this.markers.length)return;const v=pos.clone().project(this.camera);if(v.z>1||v.z<0||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1)return;const e=this.markers[index++];e.style.display='block';e.style.left=(v.x*.5+.5)*innerWidth+'px';e.style.top=(-v.y*.5+.5)*innerHeight+'px';e.style.color=color;e.innerHTML=html;};
  if(this.targetAnchor){const p=anchorPosition(this.targetAnchor),d=Math.round(p.distanceTo(this.player.position));place(p,`<span style="font-size:29px;font-weight:300">◇</span><br>E · ${d} M`,'#ffe3a5');}
  for(const t of this.world.objectives()){if(this.world.boss&&t.phase!==this.bossPhase)continue;const d=Math.round(t.world.distanceTo(this.player.position));if(d<130)place(t.world.clone().add(new V(0,3.4,0)),`<span style="font-size:18px">⌑</span><br>${t.name}<br><span style="font-size:9px;opacity:.8">${d<5?'F · SABOTAGE':d+' M'}</span>`,this.world.boss?'#ffb78a':'#a8f3df');}
  for(const e of this.combat.alive()){const d=e.position.distanceTo(this.player.position);if(d<42)place(e.position.clone().add(new V(0,e.elite?3.2:2.4,0)),`${e.elite?'HUNTER':e.shield?'SHIELD':''}<div style="width:${e.elite?72:32}px;height:3px;background:#1c343c;margin:4px auto"><div style="height:3px;background:#f2ae78;width:${e.hp/e.maxHp*100}%"></div></div>`,'#ffc096');}
  if(this.extractionReady)place(this.world.extraction.pos.clone().add(new V(0,3,0)),`◇<br>EXTRACTION · ${Math.ceil(this.extractionTimer)}s`,'#9ef5de');
 }
 updateHUD(){
  if(this.mode!=='playing')return;const p=this.player,w=this.combat.weapon;const objectives=this.world.objectives();let objective,subobjective,hint;
  if(this.intro){objective='BOARD CARGO 07';subobjective='THE IRON RUN · FIRST CONTACT';hint='E — зацепиться за поезд  /  Space — отпустить дельтаплан';}
  else if(this.extractionReady){objective='ABANDON SHIP';subobjective=`До разрушения ${Math.ceil(this.extractionTimer)} с · поезд слева впереди`;hint='E — спасательный прыжок к поезду. F — эвакуация.';}
  else if(this.world.boss){objective='BRING DOWN THE ADMIRAL';subobjective=`PHASE ${this.bossPhase} · ${['','Внешние турбины','Генераторы щита','Сердечник корабля'][this.bossPhase]}`;hint='Жёлтые точки — крюк. Зелёные маркеры — уязвимые системы.';}
  else if(objectives.length){objective='BREAK THE INDUCTION LOCKS';subobjective=`${3-objectives.length} / 3 DISABLED · пробейтесь к локомотиву`;hint='WASD движение · Shift бег · Space прыжок · E крюк · ЛКМ огонь · H помощь';}
  else{objective=this.combat.alive().some(e=>e.elite)?'TAKE DOWN THE HUNTER':'STEAL THE CARGO';subobjective='Двигайтесь к голове состава · F у маяка локомотива';hint='Жёлтый маяк в конце состава — следующий маршрут.';}
  if(p.position.y<-5)hint='EMERGENCY · E — зацепитесь за ближайший вагон!';
  else if(p.support){const nearby=p.support.obstacles.find(o=>o.overhead&&Math.abs(p.position.z-p.support.pos.z-o.z)<6);if(nearby)hint='LOW PIPE · удерживайте Ctrl, чтобы проскользнуть под трубой.';}
  const activeBoss=this.world.boss?this.world.targets.filter(t=>t.objective&&t.phase===this.bossPhase):[];
  this.ui.update({health:this.health,maxHealth:this.maxHealth,ammo:this.combat.ammo[this.combat.weaponIndex],maxAmmo:this.combat.capacity,weapon:w.name,weaponIndex:this.combat.weaponIndex,speed:42+p.speed,grappleMode:HOOKS[this.hookMode],grappleReady:this.hookCooldown<=0,dashCooldown:p.dashCooldown,objective,subobjective,progress:this.world.boss?(this.bossPhase-1)/3:clamp(-p.position.z/(this.world.end.base.z*-1),0,1),kills:this.totalKills,scrap:this.save.scrap,combo:this.combo,bossHealth:activeBoss.reduce((a,t)=>a+Math.max(0,t.hp),0),bossMax:activeBoss.reduce((a,t)=>a+t.maxHp,0),bossPhase:this.world.boss?this.bossPhase:0,hint,act:this.sector+1,location:BIOMES[this.biome],upgrades:Object.keys(this.mods),elapsed:this.elapsed,hookTarget:this.targetAnchor?'MAGNETIC ANCHOR':'NO TARGET',hookDistance:this.targetAnchor?Math.round(anchorPosition(this.targetAnchor).distanceTo(p.position)):0,reloading:this.combat.reloadTime>0,score:this.score,state:p.state,hitMarker:this.hitMarker>0});
 }
 animate(now){
  const raw=(now-this.lastFrame)/1000;this.lastFrame=now;const dt=Math.min(.05,raw||.016);this.fps=THREE.MathUtils.damp(this.fps,1/Math.max(raw,.001),2,dt);this.visualTime+=dt;
  if(this.mode==='playing'){this.accumulator+=dt;let n=0;while(this.accumulator>=STEP&&n++<8){if(this.mode!=='playing')break;this.tick(STEP);this.accumulator-=STEP;}}
  else if(['menu','hub'].includes(this.mode)){this.time+=dt;this.world.tick(this.time,dt);}
  this.hitMarker=Math.max(0,this.hitMarker-dt);this.damageFlash=Math.max(0,this.damageFlash-dt*2);this.flash.style.opacity=this.damageFlash*.65;
  if(this.hero.visible){this.hero.position.copy(this.player.position);if(this.mode==='hub'){this.hero.rotation.y=-.5;animateCharacter(this.hero,{time:this.visualTime,speed:0,grounded:true,state:'idle'},dt);}else{let yaw=this.yaw;if(this.player.speed>1&&!this.fireHeld)yaw=Math.atan2(-this.player.velocity.x,-this.player.velocity.z);const diff=Math.atan2(Math.sin(yaw-this.hero.rotation.y),Math.cos(yaw-this.hero.rotation.y));this.hero.rotation.y+=diff*(1-Math.exp(-dt*13));animateCharacter(this.hero,{time:this.visualTime,speed:this.player.speed,grounded:this.player.grounded,state:this.intro?'grapple':this.combat.reloadTime?'reload':this.player.state,attack:this.combat.attackTime,aim:this.fireHeld,weapon:this.combat.weapon.id},dt);}}
  this.glider.visible=this.mode==='playing'&&!!this.intro;if(this.glider.visible){this.glider.position.copy(this.player.position).add(new V(0,2.4,0));this.glider.rotation.z=Math.sin(this.time)*.05;}
  this.ropeLine.visible=this.mode==='playing'&&!!this.player.rope;if(this.ropeLine.visible){const a=this.player.position.clone().add(new V(.4,1.35,0)),b=anchorPosition(this.player.rope.anchor);for(let i=0;i<=32;i++){const t=i/32;this.ropePoints[i*3]=THREE.MathUtils.lerp(a.x,b.x,t);this.ropePoints[i*3+1]=THREE.MathUtils.lerp(a.y,b.y,t)-Math.sin(t*Math.PI)*.22;this.ropePoints[i*3+2]=THREE.MathUtils.lerp(a.z,b.z,t);}this.ropeGeometry.attributes.position.needsUpdate=true;}
  this.cameraUpdate(dt);this.targetAnchor=this.world.nearestAnchor(this.player.position,this.camera.getWorldDirection(new V()),this.mods.long_line?95:64);
  const storm=this.world.boss?.45+this.bossPhase*.16:this.biome==='storm'?.85:this.biome==='under'?.65:this.sector===0?clamp(-this.player.position.z/400-.3,0,.55):.05;
  this.atmosphere.update(dt,{time:this.visualTime,player:['menu','hub'].includes(this.mode)?new V(0,0,-80):this.player.position,camera:this.camera,speed:this.mode==='hub'?7:42+this.player.speed,storm,biome:this.biome,boss:this.world.boss});this.effects.update(dt);
  this.audio.update(dt,{speed:this.mode==='playing'?42+this.player.speed:5,combat:this.mode==='playing'&&this.combat.alive().some(e=>e.position.distanceTo(this.player.position)<45),boss:this.world.boss,storm,grinding:this.player.state==='grind',paused:this.mode!=='playing',listener:this.camera});
  this.renderMarkers();if(this.visualTime-(this.lastHUD||0)>.05){this.updateHUD();this.lastHUD=this.visualTime;}this.renderer.render(this.scene,this.camera);requestAnimationFrame(this.animate);
 }
 snapshot(){return {mode:this.mode,sector:this.sector,biome:this.biome,position:this.player.position.toArray(),velocity:this.player.velocity.toArray(),state:this.player.state,grounded:this.player.grounded,support:this.player.support?.id,health:this.health,ammo:this.combat.ammo,weapon:this.combat.weapon.id,rope:this.player.rope?.mode||null,enemies:this.combat.alive().length,objectives:this.world.objectives().length,bossPhase:this.bossPhase,extraction:this.extractionReady,score:this.score,elapsed:this.elapsed,fps:Math.round(this.fps),drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}
}

function canvasEvents(g){const c=g.canvas;c.addEventListener('contextmenu',e=>e.preventDefault());
 c.addEventListener('pointerdown',e=>{if(g.mode!=='playing')return;g.audio.unlock();if(e.button===0){g.fireHeld=true;if(!document.pointerLockElement)c.requestPointerLock?.()?.catch?.(()=>{});}if(e.button===2)g.mouseDrag=true;c.focus();});
 window.addEventListener('pointerup',e=>{if(e.button===0)g.fireHeld=false;if(e.button===2)g.mouseDrag=false;});
 window.addEventListener('mousemove',e=>{if(g.mode!=='playing'||!(document.pointerLockElement===c||g.mouseDrag))return;const sensitivity=Number(g.settings.sensitivity)||1;g.yaw-=e.movementX*.0022*sensitivity;g.pitch=clamp(g.pitch+e.movementY*.0016*sensitivity,-1.1,1.15);g.looked=true;});
}
