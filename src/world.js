import * as THREE from '../vendor/three.module.js';
import {createCar,createLocomotive,createAirship,createProp} from './assets.js';
import {makeBody,moveBody} from './physics.js';
const V=THREE.Vector3;
export function seeded(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const colors={iron:0x28616b,cloud:0x578791,storm:0x354652,scrap:0x8b5743,sun:0xc5b98a,under:0x334451};

export class World {
  constructor(scene){this.scene=scene;this.root=new THREE.Group();scene.add(this.root);this.bodies=[];this.anchors=[];this.targets=[];this.spawnPoints=[];this.decor=[];this.beacons=[];this.time=0;this.id=0;this.sector=0;}
  clear(){
    this.scene.remove(this.root);const geometries=new Set(),materials=new Set();this.root.traverse(o=>{if(o.userData?.ownedGeometry)geometries.add(o.geometry);if(o.userData?.ownedMaterial)materials.add(o.material);});geometries.forEach(g=>g?.dispose());materials.forEach(m=>m?.dispose());this.root=new THREE.Group();this.scene.add(this.root);
    this.bodies=[];this.anchors=[];this.targets=[];this.spawnPoints=[];this.decor=[];this.beacons=[];this.id=0;
  }
  addBody(model,x,y,z,width,length,kind='main',phase=0){
    const b=makeBody('body-'+this.id++,x,y,z,width,length);b.base=new V(x,y,z);b.kind=kind;b.phase=phase;b.mesh=model;b.obstacles=(model.userData.obstacles||[]).map(o=>({...o}));b.phase=phase;this.root.add(model);model.position.copy(b.pos);this.bodies.push(b);
    const spots=model.userData.anchors?.length?model.userData.anchors:[{x:-width/2+.6,y:2,z:length/2-2},{x:width/2-.6,y:2,z:-length/2+2}];
    for(const a of spots){const anchor={id:'anchor-'+this.anchors.length,body:b,local:new V(a.x,a.y,a.z)};this.anchors.push(anchor);}
    return b;
  }
  addTarget(body,type,x,z,{objective=false,hp=45,y=0,name=type}={}){
    const mesh=createProp(type);mesh.position.set(x,y,z);body.mesh.add(mesh);
    const obstacle={x,z,width:mesh.userData.width||1.6,depth:mesh.userData.depth||1.6,height:mesh.userData.height||1.7};body.obstacles.push(obstacle);
    const target={id:'target-'+this.targets.length,type,name,body,local:new V(x,y,z),mesh,hp,maxHp:hp,objective,dead:false,radius:type==='generator'?1.5:1,world:new V(),obstacle};this.targets.push(target);this.positionOf(target);return target;
  }
  positionOf(item){return item.world.copy(item.body.pos).add(item.local);}
  build(sector=0,biome='iron',seed=1){
    this.clear();this.sector=sector;this.biome=biome;this.time=0;this.random=seeded(seed+sector*8191);this.boss=false;
    const count=sector===0?14:16,shade=colors[biome]||colors.iron;
    for(let i=0;i<count;i++){
      const last=i===count-1,model=last?createLocomotive():createCar({kind:i%4===2?'flatbed':i%4===1?'tanker':'cargo',index:count-i,color:i%3===0?0x963f32:shade});
      const b=this.addBody(model,0,0,-i*26,9,last?26:22,'main',i*.06);b.car=i;
      if([3,7,11].includes(i)){this.addTarget(b,'generator',0,-2,{objective:true,hp:115+sector*20,name:'INDUCTION LOCK '+([3,7,11].indexOf(i)+1)});}
      if(i>0&&i<count-1){
        const types=['guard','rusher','shield','sniper','jet','engineer','guard'];this.spawnPoints.push({body:b,local:new V(i%4===1?0:i%2?2.5:-2.5,.02,i%3===0?-6:2),type:types[(i+sector)%types.length]});
        if(i%3===0)this.spawnPoints.push({body:b,local:new V(-2.5,.02,-7),type:'guard'});
        if(i%2===0)this.addTarget(b,'fuel',i%4?3:-3,-6,{hp:24,name:'VOLATILE FUEL'});
      }
      if(i===4||i===8){const crate=this.addTarget(b,'crate',-3,6,{hp:28,name:'SALVAGE CACHE'});crate.reward=true;}
    }
    const main=this.bodies.slice();this.start=main[0];this.end=main.at(-1);
    this.buildRailway(main);
    this.spawnPoints.push({body:this.end,local:new V(0,.02,0),type:'hunter',elite:true});
    // Parallel convoy and a raised cargo lane have their own time-varying transforms.
    for(let i=0;i<7;i++){const b=this.addBody(createCar({kind:i%2?'flatbed':'cargo',index:i+21,color:0xa67540}),18,3,-100-i*26,9,22,'parallel',i*.08);b.car=4+i;this.spawnPoints.push({body:b,local:new V(0,.02,-3),type:i%3===0?'sniper':'guard'});if(i===3){const t=this.addTarget(b,'crate',0,-6,{name:'RARE AETHER CACHE'});t.secret=true;t.reward=true;}}
    for(let i=0;i<3;i++){const b=this.addBody(createCar({kind:'flatbed',index:31+i,color:0x415d60}),-19,7,-70-i*65,8,22,'cargo',i*1.8);if(i===1){const t=this.addTarget(b,'crate',0,-3,{name:'COURIER STASH'});t.secret=true;t.reward=true;}this.spawnPoints.push({body:b,local:new V(0,.02,1),type:'jet'});}
    const zeppelin=createAirship();zeppelin.position.set(68,29,-148);zeppelin.scale.setScalar(1.1);this.root.add(zeppelin);this.decor.push({mesh:zeppelin,base:zeppelin.position.clone(),type:'zeppelin'});
    const farship=createAirship();farship.position.set(-98,57,-365);farship.scale.setScalar(.7);this.root.add(farship);this.decor.push({mesh:farship,base:farship.position.clone(),type:'zeppelin'});
    // Two physically reachable route beacons at the engine, plus F selection.
    this.addBeacon(this.end,new V(-2.7,1,-7),'LEFT ROUTE',0x6fdecf);this.addBeacon(this.end,new V(2.7,1,-7),'RIGHT ROUTE',0xf7bc61);
    this.tick(0,1/120);
  }
  buildRailway(cars){
    const steel=new THREE.MeshStandardMaterial({color:0x476677,metalness:.65,roughness:.47}),brass=new THREE.MeshStandardMaterial({color:0xb99a61,metalness:.62,roughness:.35});
    const pieces=[];const add=(geometry,material,pos)=>{const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.userData.ownedGeometry=true;m.userData.ownedMaterial=true;this.root.add(m);return m;};
    const endZ=cars.at(-1).base.z-350,startZ=240,length=startZ-endZ,mid=(startZ+endZ)/2;
    for(const x of [-3.9,3.9])add(new THREE.BoxGeometry(.24,.32,length),brass,[x,-7.15,mid]);
    const sleepers=new THREE.InstancedMesh(new THREE.BoxGeometry(9,.25,.65),steel,Math.ceil(length/3));sleepers.userData.ownedGeometry=true;sleepers.userData.ownedMaterial=true;const dummy=new THREE.Object3D();for(let i=0;i<sleepers.count;i++){dummy.position.set(0,-7.45,startZ-i*3);dummy.updateMatrix();sleepers.setMatrixAt(i,dummy.matrix);}this.root.add(sleepers);
    for(let i=1;i<cars.length;i++){
      if(i===5||i===10)continue;
      const prev=cars[i-1],next=cars[i],bridge=new THREE.Group();const plate=new THREE.Mesh(new THREE.BoxGeometry(7.8,.18,4.4),steel);plate.position.y=-.09;plate.userData.ownedGeometry=true;plate.userData.ownedMaterial=true;bridge.add(plate);
      const b=this.addBody(bridge,0,-.05,(prev.base.z+next.base.z)/2,7.8,4.4,'main',(prev.phase+next.phase)/2);b.bridge=true;
    }
    const cablePoints=[];for(let z=180;z>endZ;z-=65){
      const frame=new THREE.Group();frame.userData.obstacles=[];frame.userData.anchors=[{x:-5.8,y:11,z:0},{x:5.8,y:11,z:0}];
      for(const x of [-8.5,8.5]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.22,.38,26,8),steel);pole.position.set(x,4,0);frame.add(pole);pole.userData.ownedGeometry=true;pole.userData.ownedMaterial=true;}
      const cross=new THREE.Mesh(new THREE.BoxGeometry(17.6,.45,.55),steel);cross.position.y=17;frame.add(cross);cross.userData.ownedGeometry=true;cross.userData.ownedMaterial=true;
      for(const x of [-5.8,5.8]){const cable=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,6,5),brass);cable.position.set(x,14,0);frame.add(cable);cable.userData.ownedGeometry=true;cable.userData.ownedMaterial=true;const ring=new THREE.Mesh(new THREE.TorusGeometry(.45,.09,6,18),new THREE.MeshBasicMaterial({color:0xffd071}));ring.position.set(x,11,0);frame.add(ring);ring.userData.ownedGeometry=true;ring.userData.ownedMaterial=true;}
      this.addBody(frame,0,0,z,0,0,'rail');
      for(const x of [-8.5,8.5])cablePoints.push(new V(x,16.7,z),new V(x,16.7,z-65));
    }
    const cable=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cablePoints),new THREE.LineBasicMaterial({color:0x334954}));cable.userData.ownedGeometry=true;cable.userData.ownedMaterial=true;this.root.add(cable);
  }
  addBeacon(body,local,name,color){
    const g=new THREE.Group(),material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8});const ring=new THREE.Mesh(new THREE.TorusGeometry(.85,.055,6,28),material);ring.rotation.x=Math.PI/2;g.add(ring);const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,4,5),material);shaft.position.y=2;g.add(shaft);g.position.copy(local);body.mesh.add(g);this.beacons.push({body,local,name,mesh:g});
  }
  buildBoss(seed=1){
    this.clear();this.boss=true;this.biome='storm';this.time=0;this.random=seeded(seed);
    const escort=this.addBody(createCar({kind:'flatbed',index:1}),-21,0,-35,9,22,'parallel');this.start=escort;
    const ship=this.addBody(createAirship({boss:true}),0,7,-93,20,72,'boss');this.bossBody=ship;this.end=ship;
    const layouts=[[-8,25], [8,25],[-8,-4],[8,-4],[-8,-27],[8,-27]];
    for(let i=0;i<layouts.length;i++){const [x,z]=layouts[i];const t=this.addTarget(ship,'generator',x,z,{objective:true,hp:210,name:['PORT TURBINE','STARBOARD TURBINE','SHIELD RELAY A','SHIELD RELAY B','CORE INDUCTOR A','CORE INDUCTOR B'][i]});t.phase=Math.floor(i/2)+1;}
    for(let i=0;i<4;i++){const x=i%2?16:-16,z=-65-Math.floor(i/2)*40;const b=this.addBody(createCar({kind:'flatbed',index:70+i}),x,5,z,7,18,'cargo',i*1.5);this.spawnPoints.push({body:b,local:new V(0,0,0),type:i<2?'jet':'engineer'});}
    this.spawnPoints.push({body:ship,local:new V(0,0,0),type:'hunter',elite:true});
    this.anchors.push(...[-27,-8,12,28].flatMap(z=>[-7,7].map(x=>({id:'boss-anchor-'+x+z,body:ship,local:new V(x,5,z)}))));
    this.extraction=this.addBody(createCar({kind:'cargo',index:7,color:0xb54736}),-25,3,-153,9,22,'extraction');this.addBeacon(this.extraction,new V(0,1,0),'EXTRACTION',0x9cf4dc);
    this.tick(0,1/120);
  }
  buildHub(level=0){
    this.clear();this.boss=false;this.biome='cloud';this.time=0;const deck=this.addBody(createCar({kind:'flatbed',index:0,color:0x577b79}),0,0,0,14,30,'hub');deck.mesh.scale.set(14/9,1,30/22);this.start=deck;this.end=deck;
    for(let i=0;i<3+level;i++)this.addTarget(deck,i%2?'crate':'generator',i%2?-4:4,-9+i*3,{name:'WORKSHOP'});
    const ship=createAirship();ship.position.set(32,17,-35);this.root.add(ship);this.decor.push({mesh:ship,base:ship.position.clone(),type:'zeppelin'});this.tick(0,1/120);
  }
  tick(time,dt,bossPhase=1){
    this.time=time;
    for(const b of this.bodies){let {x,y,z}=b.base;
      if(b.kind==='main'){x+=Math.sin(time*.14+b.phase)*1.25;y+=Math.sin(time*.8+b.phase)*.08;}
      if(b.kind==='parallel'){x+=Math.sin(time*.16)*2;y+=Math.sin(time*.35)*.35;z+=Math.sin(time*.15)*12;}
      if(b.kind==='cargo'){x+=Math.sin(time*.27+b.phase)*3;y+=Math.sin(time*.4+b.phase)*1.5;z+=Math.sin(time*.21+b.phase)*9;}
      if(b.kind==='boss'){x+=Math.sin(time*.16)*2;y+=Math.sin(time*.35)*.4-(bossPhase===3?Math.sin(time*.08)*1.6:0);b.mesh.rotation.z=bossPhase===3?Math.sin(time*.6)*.05:0;}
      if(b.kind==='extraction'){x+=Math.sin(time*.25)*3;z+=Math.sin(time*.2)*9;}
      if(b.kind==='hub')y+=Math.sin(time*.4)*.2;
      moveBody(b,x,y,z,dt);b.mesh.position.copy(b.pos);
    }
    for(const d of this.decor){d.mesh.position.copy(d.base);d.mesh.position.z+=Math.sin(time*.08)*30;d.mesh.position.y+=Math.sin(time*.24)*2;d.mesh.rotation.z=Math.sin(time*.16)*.035;}
    for(const a of this.anchors)if(a.marker){a.marker.rotation.z=time*.8;a.marker.scale.setScalar(1+Math.sin(time*2)*.12);}
    for(const beacon of this.beacons)beacon.mesh.rotation.y=time*.7;
    for(const t of this.targets){
      if(t.loose&&!t.dead){t.loose.y-=20*dt;t.local.addScaledVector(t.loose,dt).sub(t.body.delta);t.obstacle.broken=true;
        if(t.local.y<0&&Math.abs(t.local.x)<t.body.width/2&&Math.abs(t.local.z)<t.body.length/2){t.local.y=0;t.loose.multiplyScalar(Math.exp(-dt*5));t.loose.y=0;if(t.loose.length()<.5){t.loose=null;t.obstacle.broken=false;}}
        t.mesh.position.copy(t.local);t.obstacle.x=t.local.x;t.obstacle.z=t.local.z;if(t.local.y<-60){t.dead=true;t.mesh.visible=false;}
      }
      this.positionOf(t);
    }
  }
  nearestAnchor(position,forward,range=60){
    let choice=null,best=Infinity;for(const a of this.anchors){if(!a.body.active)continue;const delta=a.local.clone().add(a.body.pos).sub(position),d=delta.length();if(d>range||d<3)continue;const dot=delta.normalize().dot(forward);if(dot<-.28&&position.y>-4)continue;const score=d*(1.4-dot)+(position.y<-3?Math.max(0,-delta.y)*50:0);if(score<best){best=score;choice=a;}}
    return choice;
  }
  objectives(){return this.targets.filter(t=>t.objective&&!t.dead);}
}
