import * as THREE from '../vendor/three.module.js';
import {createCharacter,animateCharacter} from './assets.js';
const V=THREE.Vector3;
export const GUNS=[
 {id:'repeater',name:'REPEATER',damage:26,rate:.17,ammo:24,reload:1.35,range:100,color:0xffd88d},
 {id:'thunder',name:'THUNDER COIL',damage:33,rate:.42,ammo:12,reload:1.7,range:60,color:0x86e9ff},
 {id:'scatter',name:'SCATTER CANNON',damage:92,rate:.8,ammo:6,reload:1.9,range:25,color:0xffbc78},
 {id:'harpoon',name:'HARPOON',damage:112,rate:1.1,ammo:4,reload:2.1,range:115,color:0xe8e5c5},
 {id:'flare',name:'FLARE GUN',damage:86,rate:.9,ammo:6,reload:2,range:85,color:0xff7750}
];
const STATS={guard:[65,2.6,8],rusher:[75,1.5,10],shield:[140,3.5,12],sniper:[60,4.2,18],jet:[80,2.6,9],engineer:[85,3.2,8],hunter:[400,1.5,14]};
export class Combat {
 constructor(game){this.game=game;this.enemies=[];this.bullets=[];this.links=[];this.kills=0;this.cooldown=0;this.reloadTime=0;this.weaponIndex=0;this.ammo=GUNS.map(w=>w.ammo);this.attackTime=0;this.meleeCooldown=0;}
 get weapon(){return GUNS[this.weaponIndex];}
 get capacity(){return Math.ceil(this.weapon.ammo*(this.game.mods.deep_magazine?1.4:1)*(1+(this.game.save.workshop.magazine||0)*.1));}
 reset(){for(const e of this.enemies)this.game.scene.remove(e.mesh);this.enemies=[];this.bullets=[];this.links=[];this.kills=0;this.ammo=GUNS.map(w=>Math.ceil(w.ammo*(this.game.mods.deep_magazine?1.4:1)*(1+(this.game.save.workshop.magazine||0)*.1)));this.cooldown=0;this.reloadTime=0;this.spawn();}
 spawn(){const {world,scene}=this.game;for(const sp of world.spawnPoints){const st=STATS[sp.type]||STATS.guard,mesh=createCharacter({enemy:true,type:sp.type});scene.add(mesh);const e={...sp,mesh,hp:st[0]*(1+world.sector*.14),maxHp:st[0]*(1+world.sector*.14),rate:st[1],damage:st[2],position:sp.local.clone().add(sp.body.pos),home:sp.local.clone(),velocity:new V(),cooldown:1+world.random()*3,telegraph:0,dead:false,deathTime:0,shield:sp.type==='shield',stun:0,aiPhase:world.random()*6,air:null,linked:null};mesh.position.copy(e.position);this.enemies.push(e);}}
 switch(index){if(index<0||index>=GUNS.length)return;this.weaponIndex=index;this.reloadTime=0;this.game.audio.play('equip');this.game.setWeaponModel();}
 reload(){if(this.reloadTime||this.ammo[this.weaponIndex]>=this.capacity)return;this.reloadTime=this.weapon.reload*(this.game.mods.quick_hands?.68:1);this.game.audio.play('reload');}
 alive(){return this.enemies.filter(e=>!e.dead);}
 lineClear(a,b,ignore=null){
   const delta=b.clone().sub(a),length=delta.length();if(length<.0001)return true;
   const ray=new THREE.Ray(a,delta.divideScalar(length)),box=new THREE.Box3(),point=new V();
   const blocks=(min,max)=>{box.set(min,max);if(box.containsPoint(a))return true;const hit=ray.intersectBox(box,point);return hit&&hit.distanceTo(a)<length-.001;};
   for(const body of this.game.world.bodies){if(!body.active||body.width<1)continue;const p=body.pos;
     if(blocks(new V(p.x-body.width/2,p.y-6.5,p.z-body.length/2),new V(p.x+body.width/2,p.y-.04,p.z+body.length/2)))return false;
     for(const o of body.obstacles){if(o===ignore||o.broken)continue;
       if(blocks(new V(p.x+o.x-o.width/2,p.y+(o.overhead?o.bottom:0),p.z+o.z-o.depth/2),new V(p.x+o.x+o.width/2,p.y+o.height,p.z+o.z+o.depth/2)))return false;
     }
   }return true;
 }
 aimTarget(includeProps=true){
   const {camera,player,world}=this.game,origin=player.position.clone().add(new V(0,1.35,0)),direction=camera.getWorldDirection(new V()),candidates=this.alive().map(e=>({item:e,pos:e.position.clone().add(new V(0,1.05,0)),enemy:true}));
   if(includeProps)for(const t of world.targets)if(!t.dead)candidates.push({item:t,pos:t.world.clone().add(new V(0,1,0)),enemy:false});
   let selected=null,best=Infinity;
   for(const c of candidates){const d=c.pos.distanceTo(origin);if(d>this.weapon.range)continue;const angle=direction.angleTo(c.pos.clone().sub(camera.position));const threshold=c.enemy?(this.game.mods.deadeye?.17:.12):.105;if(angle>threshold)continue;const score=angle*140+d*.012;if(score<best&&this.lineClear(origin,c.pos,c.item.obstacle)){best=score;selected=c;}}
   return selected;
 }
 fire(){
   if(this.cooldown>0||this.reloadTime>0||this.game.mode!=='playing')return false;if(this.ammo[this.weaponIndex]<=0){this.reload();return false;}
   const {player,camera,effects,audio,mods}=this.game,w=this.weapon;this.ammo[this.weaponIndex]--;this.cooldown=w.rate;this.attackTime=.2;
   const from=player.position.clone().add(new V(0,1.35,0)),dir=camera.getWorldDirection(new V()),target=this.aimTarget(),to=target?target.pos:from.clone().addScaledVector(dir,w.range);
   effects.trail(from,to,w.color,w.id==='thunder'?.24:.1);effects.burst(from.clone().addScaledVector(dir,.7),w.color,6,3);audio.play(w.id,from);
   let damage=w.damage;if(!player.grounded&&mods.aerial_ace)damage*=1.4;if(mods.high_velocity)damage*=1+Math.min(player.speed/60,.65);if(mods.executioner&&target?.enemy&&target.item.hp<target.item.maxHp*.3)damage*=1.5;
   if(target){if(target.enemy){this.damageEnemy(target.item,damage,dir.clone().multiplyScalar(w.id==='scatter'?25:w.id==='harpoon'?32:3));if(w.id==='harpoon')target.item.stun=2;}else this.damageTarget(target.item,damage);this.game.hitMarker=.16;}
   if(w.id==='thunder'&&target){const radius=mods.storm_cell?16:10;for(const e of this.alive())if(e!==target.item&&e.position.distanceTo(to)<radius){this.damageEnemy(e,damage*.7,new V());effects.trail(to,e.position.clone().add(new V(0,1,0)),w.color,.25);} }
   if(w.id==='scatter'){player.velocity.addScaledVector(dir,-8);for(const e of this.alive())if(e!==target?.item&&e.position.distanceTo(from)<17&&dir.angleTo(e.position.clone().sub(from))<.35)this.damageEnemy(e,damage*.55,dir.clone().multiplyScalar(18));}
   if(w.id==='flare'){this.explode(to,6,damage*.65);}
   return true;
 }
 damageEnemy(e,damage,impulse=new V()){
   if(e.dead)return;if(e.shield)damage*=.28;e.hp-=damage;e.stun=Math.max(e.stun,.18);e.velocity.add(impulse);this.game.effects.burst(e.position.clone().add(new V(0,1,0)),0xffb86b,8,4);this.game.audio.play('hit',e.position);
   if(e.hp<=0){e.dead=true;e.deathTime=0;e.velocity.y=Math.max(e.velocity.y,4);this.kills++;this.game.onKill(e);}
 }
 damageTarget(t,damage){
   if(t.dead)return;if(this.game.world.boss&&t.objective&&t.phase!==this.game.bossPhase){this.game.ui.toast('ARMOR LOCKED','Сначала уничтожьте активные системы.');return;}
   t.hp-=damage;this.game.effects.burst(t.world.clone().add(new V(0,1,0)),0xffca73,10,5);
   if(t.hp<=0){t.dead=true;t.mesh.visible=false;if(t.obstacle)t.obstacle.broken=true;this.game.audio.play('explosion',t.world);this.game.effects.burst(t.world,0xffa75c,38,11);if(t.type==='fuel')this.explode(t.world,9,100,t);if(t.reward)this.game.collectCache(t);if(t.objective)this.game.onObjective(t);}
 }
 explode(position,radius,damage,source=null){this.game.effects.burst(position,0xffb66a,28,12);this.game.audio.play('explosion',position);for(const e of this.alive()){const d=e.position.distanceTo(position);if(d<radius)this.damageEnemy(e,damage*(1-d/radius*.6),e.position.clone().sub(position).normalize().multiplyScalar(18));}for(const t of this.game.world.targets)if(t!==source&&!t.dead&&t.world.distanceTo(position)<radius)this.damageTarget(t,damage*.7);}
 melee(){if(this.meleeCooldown>0)return;this.meleeCooldown=.5;this.attackTime=.32;this.game.audio.play('melee');const p=this.game.player.position;let hit=false;for(const e of this.alive())if(e.position.distanceTo(p)<3.7){this.damageEnemy(e,55,e.position.clone().sub(p).normalize().multiplyScalar(19).setY(6));hit=true;}if(hit)this.game.comboEvent('AIR KICK',120);}
 grappleEnemy(mode){
   const p=this.game.player.position,forward=this.game.forward;let e=null,best=50;for(const candidate of this.alive()){const d=candidate.position.distanceTo(p);if(d<best&&candidate.position.clone().sub(p).normalize().dot(forward)>.2){e=candidate;best=d;}}
   if(!e)return false;
   const from=p.clone().add(new V(0,1.2,0)),to=e.position.clone().add(new V(0,1,0));this.game.effects.trail(from,to,0x8cecd5,.65);this.game.audio.play('hook');
   if(mode==='DRAG'){e.velocity.copy(p).sub(e.position).normalize().multiplyScalar(24);e.velocity.y=5;e.stun=1.4;this.damageEnemy(e,this.game.mods.thunder_line?40:12);this.game.comboEvent('GET OVER HERE',100);}
   if(mode==='RIP'){if(e.shield){e.shield=false;if(e.mesh.userData.rig?.shield)e.mesh.userData.rig.shield.visible=false;this.damageEnemy(e,45);this.game.effects.burst(e.position,0xc7ecdc,24,10);this.game.comboEvent('SHIELD RIPPED',180);}else this.damageEnemy(e,45,new V(0,7,0));}
   if(mode==='LINK'){const body=this.game.world.bodies.filter(b=>b!==e.body).sort((a,b)=>a.pos.distanceTo(e.position)-b.pos.distanceTo(e.position))[0];if(body){e.linked={body,local:new V(0,1,0),remaining:7};this.game.comboEvent('MAGNETIC LINK',160);}}
   return true;
 }
 update(dt){
   const g=this.game,p=g.player;this.cooldown=Math.max(0,this.cooldown-dt);this.attackTime=Math.max(0,this.attackTime-dt);this.meleeCooldown=Math.max(0,this.meleeCooldown-dt);
   if(this.reloadTime>0){this.reloadTime-=dt;if(this.reloadTime<=0){this.reloadTime=0;this.ammo[this.weaponIndex]=this.capacity;g.audio.play('reloadDone');}}
   if(g.mods.kinetic_reload&&p.state==='grind'){this.kinetic=(this.kinetic||0)+dt;if(this.kinetic>.18){this.kinetic=0;this.ammo[this.weaponIndex]=Math.min(this.capacity,this.ammo[this.weaponIndex]+1);}}
   for(const e of this.enemies){
     if(e.dead){e.deathTime+=dt;if(e.deathTime<2.8){e.position.addScaledVector(e.velocity,dt);e.velocity.y-=18*dt;e.mesh.position.copy(e.position);e.mesh.rotation.z+=dt*1.4;e.mesh.rotation.x+=dt*.8;}else e.mesh.visible=false;continue;}
     e.stun=Math.max(0,e.stun-dt);const distance=e.position.distanceTo(p.position);e.cooldown-=dt;
     if(e.linked){const a=e.linked.body.pos.clone().add(e.linked.local),delta=a.clone().sub(e.position);e.velocity.addScaledVector(delta,dt*6);e.stun=.2;e.linked.remaining-=dt;g.effects.trail(e.position.clone().add(new V(0,1,0)),a,0x8cd7d0,.04);if(e.linked.remaining<0)e.linked=null;}
     if(e.air){e.air.t+=dt;const t=Math.min(1,e.air.t/e.air.duration),dest=e.air.to.pos.clone().add(e.air.local);e.position.lerpVectors(e.air.from,dest,t);e.position.y+=Math.sin(Math.PI*t)*4;if(t>=1){e.body=e.air.to;e.local.copy(e.air.local);e.air=null;}}
     else {
       if(e.stun<=0&&distance<95){
         const localPlayer=p.position.clone().sub(e.body.pos),same=p.support===e.body;
         if((e.type==='rusher'||e.type==='hunter'||e.type==='jet')&&!same&&distance<43&&e.cooldown<.5&&p.support){
           const nearEdge=Math.abs(e.local.z)>e.body.length/2-3||e.type==='jet'||e.type==='hunter';
           if(nearEdge){e.air={from:e.position.clone(),to:p.support,local:new V(THREE.MathUtils.clamp(localPlayer.x,-p.support.width/2+1,p.support.width/2-1),.02,THREE.MathUtils.clamp(localPlayer.z,-p.support.length/2+2,p.support.length/2-2)),t:0,duration:e.type==='jet'?1.2:.8};e.cooldown=2;g.effects.trail(e.position,p.position,0xefb565,.5);}
         }
         const melee=e.type==='rusher'||e.type==='hunter';
         const desiredX=same&&melee?localPlayer.x:Math.sin(g.time*.55+e.aiPhase)*(e.body.width/2-1.2);
         const desiredZ=same&&melee?localPlayer.z:e.home.z+Math.sin(g.time*.4+e.aiPhase)*3;
         e.local.x=THREE.MathUtils.damp(e.local.x,THREE.MathUtils.clamp(desiredX,-e.body.width/2+.7,e.body.width/2-.7),melee?2:1,dt);
         e.local.z=THREE.MathUtils.damp(e.local.z,THREE.MathUtils.clamp(desiredZ,-e.body.length/2+1,e.body.length/2-1),melee?2:1,dt);
         for(const o of e.body.obstacles){if(!o.broken&&!o.overhead&&Math.abs(e.local.x-o.x)<o.width/2+.6&&Math.abs(e.local.z-o.z)<o.depth/2+.6)e.local.x=THREE.MathUtils.clamp(o.x+(e.local.x>=o.x?1:-1)*(o.width/2+.7),-e.body.width/2+.5,e.body.width/2-.5);}
       }
       e.local.addScaledVector(e.velocity,dt);e.velocity.x*=Math.exp(-dt*4);e.velocity.z*=Math.exp(-dt*4);e.velocity.y-=22*dt;if(e.local.y<=.02){e.local.y=.02;e.velocity.y=Math.max(0,e.velocity.y);}e.position.copy(e.body.pos).add(e.local);if(e.type==='jet')e.position.y+=1.8+Math.sin(g.time*2+e.aiPhase)*.4;
       if(Math.abs(e.local.x)>e.body.width/2+1.8||Math.abs(e.local.z)>e.body.length/2+2){this.damageEnemy(e,10000,new V(e.velocity.x,-2,e.velocity.z));g.comboEvent('OVERBOARD',200);continue;}
     }
     e.mesh.position.copy(e.position);const facing=p.position.clone().sub(e.position);e.mesh.rotation.y=Math.atan2(-facing.x,-facing.z);animateCharacter(e.mesh,{time:g.time+e.aiPhase,speed:distance<85?4:0,grounded:!e.air,state:e.air?'grapple':e.telegraph?'shooting':'run',attack:e.telegraph,weapon:'repeater'},dt);
     if(e.stun>0||distance>90||g.intro)continue;
     if(e.type==='engineer'&&!e.deployed&&distance<42&&g.time>5){const turret=g.world.addTarget(e.body,'turret',-e.local.x,e.local.z+3,{hp:65,name:'SENTRY TURRET'});turret.cooldown=2;turret.hostile=true;e.deployed=true;g.ui.toast('SENTRY DEPLOYED','Инженер установил турель. RIP сорвёт её с опоры.');}
     if(distance<2.6&&(e.type==='rusher'||e.type==='hunter')&&e.cooldown<=0){g.damage(e.damage);e.cooldown=e.rate;g.effects.burst(p.position.clone().add(new V(0,1,0)),0xff8668,8,5);}
     else if(e.cooldown<=0&&distance>3){
       if(!e.telegraph){e.telegraph=e.type==='sniper'?.95:e.type==='hunter'?.45:.7;e.aim=p.position.clone().add(new V(0,1,0));}
       e.telegraph-=dt;
       const from=e.position.clone().add(new V(0,1.3,0));if(e.type==='sniper'||e.type==='hunter')g.effects.trail(from,e.aim,0xf07155,.035);
       if(e.telegraph<=0){e.telegraph=0;e.cooldown=e.rate+g.world.random()*.5;if(this.lineClear(from,e.aim)){const velocity=e.aim.clone().sub(from).normalize().multiplyScalar(e.type==='sniper'?64:36);this.bullets.push({pos:from,velocity,life:3,damage:e.damage});g.audio.play('enemyShot',from);}}
     }
   }
   for(const t of g.world.targets){if(t.dead)continue;if(t.link){const anchor=t.link.body.pos.clone().add(t.link.local),delta=anchor.clone().sub(t.world);t.loose??=new V();t.loose.addScaledVector(delta,dt*5);g.effects.trail(t.world,anchor,0x8cddd7,.04);if(delta.length()<3&&t.type==='fuel'){this.damageTarget(t,999);continue;}t.link.time-=dt;if(t.link.time<0)t.link=null;}if(!t.hostile)continue;t.cooldown-=dt;const from=t.world.clone().add(new V(0,1.72,0));if(t.cooldown<=0&&from.distanceTo(p.position)<50){t.cooldown=1.9;const aim=p.position.clone().add(new V(0,1,0));if(this.lineClear(from,aim,t.obstacle)){this.bullets.push({pos:from,velocity:aim.sub(from).normalize().multiplyScalar(32),life:3,damage:7});g.audio.play('enemyShot',from);}}}
   for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i],old=b.pos.clone();b.pos.addScaledVector(b.velocity,dt);b.life-=dt;if(!this.lineClear(old,b.pos)){this.bullets.splice(i,1);continue;}g.effects.trail(old,b.pos,0xff7e52,.09);const line=new THREE.Line3(old,b.pos),closest=line.closestPointToPoint(p.position.clone().add(new V(0,1,0)),true,new V());if(closest.distanceTo(p.position.clone().add(new V(0,1,0)))<.6){g.damage(b.damage);b.life=0;}if(b.life<=0)this.bullets.splice(i,1);}
 }
}
