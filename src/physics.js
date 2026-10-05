import {Vector3, MathUtils} from '../vendor/three.module.js';

export const STEP=1/120;
const clamp=MathUtils.clamp;
const horizontal=v=>Math.hypot(v.x,v.z);
export function makeBody(id,x,y,z,width=9,length=22){
  return {id,pos:new Vector3(x,y,z),prev:new Vector3(x,y,z),delta:new Vector3(),velocity:new Vector3(),width,length,obstacles:[],anchors:[],active:true};
}
export function moveBody(body,x,y,z,dt){
  body.prev.copy(body.pos);body.pos.set(x,y,z);body.delta.subVectors(body.pos,body.prev);body.velocity.copy(body.delta).divideScalar(dt||STEP);
}
export function anchorPosition(anchor){return anchor.local.clone().add(anchor.body.pos);}
export function surfaceAt(body,x,z){
  if(!body.active||Math.abs(x-body.pos.x)>body.width/2||Math.abs(z-body.pos.z)>body.length/2)return null;
  let height=body.pos.y;
  for(const o of body.obstacles){if(o.broken||o.overhead)continue;if(Math.abs(x-body.pos.x-o.x)<o.width/2&&Math.abs(z-body.pos.z-o.z)<o.depth/2)height=Math.max(height,body.pos.y+o.height);}
  return height;
}

// Positions live in the convoy reference frame. Ground velocity is relative to
// the support; airborne velocity is inertial. Convert only at contact changes.
export class Controller {
  constructor(){this.position=new Vector3();this.velocity=new Vector3();this.previous=new Vector3();this.support=null;this.grounded=false;this.jumps=0;this.coyote=0;this.jumpBuffer=0;this.dashCooldown=0;this.dashTime=0;this.state='fall';this.rope=null;this.fallTime=0;this.slideTime=0;this.wallTime=0;this.landing=0;this.mod={};this.events=[];}
  reset(position,support=null){this.position.copy(position);this.previous.copy(position);this.velocity.set(0,0,0);this.support=support;this.grounded=!!support;this.jumps=0;this.rope=null;this.dashCooldown=0;this.dashTime=0;this.jumpBuffer=0;this.slideTime=0;this.wallTime=0;this.landing=0;this.coyote=support?.12:0;this.fallTime=0;this.state=support?'idle':'fall';this.events=[];}
  attach(anchor,mode='PULL'){if(this.grounded){this.velocity.add(this.support?.velocity||new Vector3());this.support=null;this.grounded=false;}this.rope={anchor,mode,length:this.position.distanceTo(anchorPosition(anchor)),charge:0};this.events.push('hook');}
  release(launch=false,direction=null){if(!this.rope)return;const rope=this.rope;this.rope=null;if(launch){const dir=direction?.clone()||anchorPosition(rope.anchor).sub(this.position).normalize();dir.y=Math.max(dir.y,.3);dir.normalize();this.velocity.addScaledVector(dir,(30+rope.charge*22)*(this.mod.slingshot_plus?1.4:1));this.events.push('slingshot');}this.state='fall';}
  step(dt,input,bodies){
    this.events.length=0;this.previous.copy(this.position);this.landing=Math.max(0,this.landing-dt*3);
    this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.dashTime=Math.max(0,this.dashTime-dt);this.slideTime=Math.max(0,this.slideTime-dt);
    if(this.support&&!this.support.active){this.velocity.add(this.support.velocity);this.support=null;this.grounded=false;}
    if(this.grounded&&this.support){this.position.add(this.support.delta);this.previous.add(this.support.delta);this.coyote=.13;this.jumps=0;}else this.coyote-=dt;
    if(input.jump)this.jumpBuffer=.13;else this.jumpBuffer-=dt;
    const dir=new Vector3(input.x||0,0,input.z||0);if(dir.lengthSq()>1)dir.normalize();
    const speed=(input.sprint?20:12)*(this.mod.overclock?1.13:1)*(1+(this.mod.engineLevel||0)*.08);
    if(input.slide&&this.grounded){if(this.slideTime===0)this.events.push('slide');this.slideTime=Math.max(this.slideTime,.18);}
    const localX=this.support?this.position.x-this.support.pos.x:0;
    let grind=this.grounded&&input.slide&&this.support&&Math.abs(localX)>this.support.width/2-1.3;
    if(grind){this.position.x=this.support.pos.x+Math.sign(localX)*(this.support.width/2-.42);this.velocity.x=0;this.velocity.z=-Math.max(25,Math.abs(this.velocity.z));this.state='grind';}
    else if(this.grounded){
      this.state=this.slideTime>0?'slide':dir.lengthSq()>.01?(input.sprint?'sprint':'run'):'idle';
      const accel=this.slideTime>0?2.1:(dir.lengthSq()?9:5);
      const keep=this.mod.momentum_bank?.88:.55;
      const targetSpeed=this.slideTime>0?Math.max(speed,horizontal(this.velocity)):Math.max(speed,horizontal(this.velocity)*keep);
      if(this.slideTime>0&&dir.lengthSq()<.01)dir.copy(this.velocity).setY(0).normalize();
      this.velocity.x=MathUtils.damp(this.velocity.x,dir.x*targetSpeed,accel,dt);
      this.velocity.z=MathUtils.damp(this.velocity.z,dir.z*targetSpeed,accel,dt);
      this.velocity.y=0;
    }else {
      const airAccel=this.mod.wind_rider?22:14;this.velocity.addScaledVector(dir,airAccel*dt);
      const h=horizontal(this.velocity);if(h>65){this.velocity.x*=65/h;this.velocity.z*=65/h;}
      this.state=this.velocity.y>0?'jump':'fall';
      if(this.dashTime<=0)this.velocity.y-=26*(this.rope?.mode==='SWING'?.72:1)*dt;
      this.velocity.x*=Math.exp(-dt*.075);this.velocity.z*=Math.exp(-dt*.075);
    }
    // A side run is a deliberate contact state, not an invisible rescue plane.
    let wall=null;
    if(!this.grounded&&!this.rope&&dir.lengthSq()>.1){for(const b of bodies){if(!b.active)continue;const rx=this.position.x-b.pos.x,rz=this.position.z-b.pos.z;const near=Math.abs(Math.abs(rx)-b.width/2)<.72;
      if(near&&Math.abs(rz)<b.length/2&&this.position.y>b.pos.y-3.8&&this.position.y<b.pos.y+.6){wall={body:b,side:Math.sign(rx)};break;}
      for(const o of b.obstacles){if(o.broken||o.overhead)continue;const ox=this.position.x-b.pos.x-o.x,oz=this.position.z-b.pos.z-o.z;if(Math.abs(Math.abs(ox)-o.width/2)<.65&&Math.abs(oz)<o.depth/2+.2&&this.position.y>b.pos.y&&this.position.y<b.pos.y+o.height){wall={body:b,side:Math.sign(ox),obstacle:o};break;}}
    }}
    if(wall){this.wallTime+=dt;if(this.wallTime<(this.mod.magnetic_boots?3.6:1.5)){this.state='wallrun';this.velocity.y=Math.max(this.velocity.y,-1.4);this.velocity.z=Math.min(this.velocity.z,-16);this.velocity.x=0;
      if(input.autoMantle!==false&&this.position.y>wall.body.pos.y-.85&&!wall.obstacle){this.position.x=wall.body.pos.x+wall.side*(wall.body.width/2-.65);this.position.y=wall.body.pos.y+.05;this.velocity.y=2;this.state='mantle';this.events.push('mantle');}
    }}else this.wallTime=0;
    if(this.jumpBuffer>0&&(this.grounded||this.coyote>0||this.jumps<2||wall)){
      const supportVertical=this.support?.velocity.y||0;
      if(this.support)this.velocity.add(this.support.velocity);
      this.support=null;this.grounded=false;this.velocity.y=(wall?12.8:11.7)+supportVertical;
      if(wall){this.velocity.x=wall.side*8;this.jumps=1;}else this.jumps++;
      this.slideTime=0;this.jumpBuffer=0;this.coyote=0;this.state=this.jumps>1?'airkick':'jump';this.events.push(this.jumps>1?'doublejump':'jump');
    }
    if(input.dash&&this.dashCooldown===0){if(this.support)this.velocity.add(this.support.velocity);this.support=null;this.grounded=false;const dashDir=dir.lengthSq()>0?dir:new Vector3(input.forwardX||0,0,input.forwardZ??-1);this.velocity.addScaledVector(dashDir,23);this.velocity.y=Math.max(this.velocity.y,2.5);this.dashTime=.2;this.dashCooldown=this.mod.air_dash?1.3:2.5;this.state='dash';this.events.push('dash');}
    if(this.rope){
      const {anchor,mode}=this.rope;if(!anchor.body.active){this.release();}else{
        const target=anchorPosition(anchor),delta=target.clone().sub(this.position),dist=delta.length(),radial=delta.normalize();
        this.rope.charge=Math.min(1.5,this.rope.charge+dt);this.state=mode==='SWING'?'swing':'grapple';
        if(mode==='PULL'||mode==='SLINGSHOT'){
          const targetSpeed=(mode==='PULL'?36:13)*(1+(this.mod.engineLevel||0)*.08);const desired=radial.clone().multiplyScalar(targetSpeed).add(anchor.body.velocity);
          this.velocity.lerp(desired,1-Math.exp(-dt*(mode==='PULL'?6:3)));
          if(dist<2.5&&mode==='PULL'){this.release();this.velocity.y=Math.max(this.velocity.y,5);this.jumps=1;this.events.push('hookland');}
        }else if(mode==='SWING'){
          this.rope.length=Math.max(5,this.rope.length-dt*1.2);
          if(dist>this.rope.length){this.position.copy(target).addScaledVector(radial,-this.rope.length);const relative=this.velocity.clone().sub(anchor.body.velocity),out=relative.dot(radial);if(out<0)this.velocity.addScaledVector(radial,-out);this.velocity.addScaledVector(dir,dt*20);}
        }
      }
    }
    const oldY=this.position.y;this.position.addScaledVector(this.velocity,dt);
    // Catch a reachable leading ledge while moving toward it. This is also the
    // forgiving beginner route across short gaps between couplings.
    if(!this.grounded&&!this.rope&&input.autoMantle!==false){for(const b of bodies){if(!b.active||b.width<2)continue;const x=this.position.x-b.pos.x,z=this.position.z-b.pos.z;if(Math.abs(x)<b.width/2-.35&&Math.abs(Math.abs(z)-b.length/2)<.65&&dir.z*Math.sign(z)<-.1&&this.position.y>b.pos.y-1.2&&this.position.y<b.pos.y+.12&&this.velocity.y<4){this.position.z=b.pos.z+Math.sign(z)*(b.length/2-.55);this.position.y=b.pos.y+.03;this.velocity.y=0;this.state='mantle';this.events.push('mantle');break;}}}
    let landingBody=null,landingY=-Infinity;
    for(const b of bodies){
      if(!b.active)continue;const x=this.position.x-b.pos.x,z=this.position.z-b.pos.z;
      if(Math.abs(x)<b.width/2+.05&&Math.abs(z)<b.length/2+.05){
        const h=surfaceAt(b,this.position.x,this.position.z);
        const wasOn=this.support===b&&this.grounded;
        if(h!==null&&(oldY>=h-.22||wasOn&&this.position.y>=h-.65)&&this.position.y<=h+.1&&(wasOn||this.velocity.y<=b.velocity.y+1)&&h>landingY){landingBody=b;landingY=h;}
      }
      for(const o of b.obstacles){
        if(o.broken)continue;const px=this.position.x-b.pos.x-o.x,pz=this.position.z-b.pos.z-o.z;const hw=o.width/2+.32,hd=o.depth/2+.32;
        if(Math.abs(px)>=hw||Math.abs(pz)>=hd)continue;
        if(o.overhead){if(this.slideTime>0||this.position.y+1.75<b.pos.y+o.bottom)continue;if(this.position.y>b.pos.y+o.height)continue;}
        else if(this.position.y>=b.pos.y+o.height-.18||this.position.y+1.75<b.pos.y)continue;
        if(!o.overhead&&o.height<1.5&&input.autoMantle!==false&&dir.lengthSq()>.1){this.position.y=b.pos.y+o.height+.02;this.velocity.y=Math.max(1,this.velocity.y);this.state='vault';this.events.push('vault');continue;}
        const dx=hw-Math.abs(px),dz=hd-Math.abs(pz);if(dx<dz){this.position.x+=Math.sign(px||1)*dx;this.velocity.x=0;}else{this.position.z+=Math.sign(pz||1)*dz;this.velocity.z=0;}
      }
    }
    if(landingBody){
      if(this.grounded&&this.support!==landingBody)this.velocity.add(this.support?.velocity||new Vector3()).sub(landingBody.velocity);
      if(!this.grounded){const impact=-this.velocity.y;this.velocity.sub(landingBody.velocity);this.landing=clamp(impact/25,0,1);this.events.push('land');if(impact>12&&this.mod.impact)this.events.push('impact');}
      this.position.y=landingY;this.velocity.y=0;this.support=landingBody;this.grounded=true;this.jumps=0;this.fallTime=0;
      if(this.rope?.mode==='PULL')this.rope=null;
    }else if(this.grounded){this.velocity.add(this.support?.velocity||new Vector3());this.grounded=false;this.support=null;}
    if(this.position.y<-4)this.fallTime+=dt;else this.fallTime=0;
    // Numeric hard-stop protects a run from corrupted input / a stale anchor.
    if(!Number.isFinite(this.position.lengthSq()+this.velocity.lengthSq()))throw new Error('Non-finite controller state');
  }
  get speed(){return horizontal(this.velocity);}
}
