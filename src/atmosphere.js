import * as THREE from '../vendor/three.module.js';
export { createAudio } from './audio.js';

const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const temp = new THREE.Object3D();
const PALETTES = {
  iron: ['#178bd0', '#9dd5ef', '#487bb3', '#fffef5', '#95bfd3'],
  cloud: ['#218bd0', '#a6dff2', '#598ec0', '#ffffff', '#a3cfe2'],
  storm: ['#273c51', '#7f9ca4', '#284c60', '#cce1e9', '#63828b'],
  scrap: ['#318bb1', '#c9dce0', '#687fa0', '#ffe4bd', '#acc6cf'],
  sun: ['#299dde', '#c4e5f5', '#749bd0', '#fff0c9', '#c0d6e1'],
  under: ['#182935', '#688389', '#254048', '#9bc9d1', '#506e77'],
};

function paletteName(value) {
  if (typeof value === 'number') return ['iron', 'cloud', 'storm', 'scrap', 'sun', 'under'][value % 6];
  const s = String(value || 'iron').toLowerCase();
  return Object.keys(PALETTES).find(k => s.includes(k)) || 'iron';
}

function rng(seed = 811) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const skyVertex = `varying vec3 vRay; void main(){vRay=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const skyFragment = `
  varying vec3 vRay;
  uniform vec3 uZenith,uHorizon,uShadow,uSunlight,uSun,uEye;
  uniform float uTime,uStorm,uFlash,uClouds,uQuality,uScroll;
  float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){return noise(p)*.58+noise(p*2.03+13.1)*.28+noise(p*4.07+29.3)*.14;}
  float cloud(vec3 p){
    vec3 q=vec3(p.x*.007,p.y*.019,p.z*.007+uScroll*.007);
    q.x+=uTime*.011;
    float n=fbm(q);float b=noise(q*.31+7.);
    float top=-88.+n*n*90.+b*22.;
    float cap=1.-smoothstep(top-17.,top,p.y);
    float base=smoothstep(-153.,-98.,p.y);
    return cap*base*smoothstep(.26,.71,n+b*.33)*.058;
  }
  void main(){
    vec3 rd=normalize(vRay);float up=max(rd.y,0.);float sun=max(dot(rd,uSun),0.);
    vec3 col=mix(uHorizon,uZenith,pow(clamp(up*2.6,0.,1.),.46));
    col+=uSunlight*pow(sun,10.)*.16+uSunlight*pow(sun,320.)*.55;
    col=mix(col,uSunlight*3.3,smoothstep(.99962,.99981,sun)*(1.-uStorm*.94));
    vec3 haze=mix(uHorizon,vec3(.14,.2,.25),uStorm*.76);
    col=mix(col,haze,uStorm*.46);
    float wisps=fbm(vec3(rd.xz/(up+.13)*2.2,uTime*.008));
    float cirrus=smoothstep(.57,.77,wisps)*smoothstep(.01,.25,up)*(1.-smoothstep(.35,.8,up));
    col=mix(col,uHorizon,cirrus*.3);
    if(rd.y<-.001 && uClouds>.5){
      float start=max(0.,(-5.-uEye.y)/rd.y),end=min(2300.,(-156.-uEye.y)/rd.y);
      float steps=mix(18.,38.,uQuality),stepSize=max(0.,end-start)/steps;
      float jitter=.15+hash(vec3(gl_FragCoord.xy,0.))*.7;float trans=1.;vec3 accum=vec3(0.);
      for(int i=0;i<38;i++){
        if(float(i)>=steps||trans<.015)break;
        float t=start+(float(i)+jitter)*stepSize;vec3 p=uEye+rd*t;
        float density=cloud(p);float a=1.-exp(-density*stepSize);
        if(a>.003){
          float elevation=smoothstep(-125.,-38.,p.y);
          float occlusion=cloud(p+uSun*24.)*19.;
          float light=clamp(elevation*.87+.17-occlusion,.06,1.);
          vec3 shade=mix(uShadow,uSunlight,light);
          shade=mix(shade,shade*vec3(.52,.61,.7),uStorm*.74);
          shade+=uSunlight*pow(sun,9.)*.16*elevation;
          shade=mix(shade,haze,smoothstep(600.,2300.,t)*.72);
          accum+=shade*a*trans;trans*=1.-a;
        }
      }
      col=col*trans+accum;
      float cloudDistance=max(0.,(-52.-uEye.y)/rd.y);
      col=mix(col,mix(uHorizon,uSunlight,.62),smoothstep(300.,1000.,cloudDistance)*.88);
    }else if(rd.y<0.){col=mix(col,uShadow,min(-rd.y*2.,.7));}
    col+=vec3(.7,.84,1.)*uFlash*.5;
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function archGeometry() {
  const shape = new THREE.Shape();
  // One continuous U-shaped boundary: a hole touching the boundary is not a valid polygon.
  shape.moveTo(-26, 0); shape.lineTo(-19, 154); shape.bezierCurveTo(-19, 174, 19, 174, 19, 154); shape.lineTo(26, 0);
  shape.lineTo(15, 0); shape.lineTo(9.5, 141); shape.bezierCurveTo(9.5, 155, -9.5, 155, -9.5, 141); shape.lineTo(-15, 0); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 16, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.5, bevelSegments: 1, steps: 1, curveSegments: 10 });
  g.translate(0, 0, -8); return g;
}

function rockGeometry(seed) {
  const random = rng(seed), rings = 19, sides = 39, positions = [], colors = [], indices = [];
  const phase = random() * 9, stone = new THREE.Color();
  for (let j = 0; j <= rings; j++) {
    const t = j / rings, profile = t < .78 ? .11 + Math.pow(t / .78, .7) * .91 : 1 - (t - .78) * 2.4;
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * Math.PI * 2;
      const ridge = 1 + Math.sin(a * 5 + phase) * .16 + Math.sin(a * 9 - phase + t * 8) * .065 + Math.sin(t * 41 + a * 3) * .045;
      const radius = profile * ridge;
      positions.push(Math.cos(a) * radius, (t - .82) * 2.1 + Math.sin(a * 4 + phase) * .055 * t, Math.sin(a) * radius * .78);
      const band = .64 + Math.sin(t * 69 + Math.sin(a * 2) * .9) * .125 + Math.sin(t * 24) * .095;
      stone.setRGB(band * .34, band * .43, band * .43);
      if (t > .83) stone.setRGB(band * .34, band * .48, band * .39);
      colors.push(stone.r, stone.g, stone.b);
      if (j < rings && i < sides) { const n = j * (sides + 1) + i; indices.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2); }
    }
  }
  const center = positions.length / 3; positions.push(0, .378, 0); colors.push(.28, .38, .3);
  for (let i = 0; i < sides; i++) indices.push(center, rings * (sides + 1) + i + 1, rings * (sides + 1) + i);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}

function beam(parts, from, to, width = .7) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  parts.push({ p: a.add(b).multiplyScalar(.5).toArray(), s: [width, d.length(), width], r: [rotation.x, rotation.y, rotation.z] });
}

function cloudBankMaterial(uniforms) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { uStorm: uniforms.uStorm, uHorizon: uniforms.uHorizon, uTime: uniforms.uTime },
    vertexShader: `varying vec2 vUv;varying float vSeed;varying float vDepth;void main(){vUv=uv;vSeed=fract(modelMatrix[3].x*.017+modelMatrix[3].z*.0017);vec4 p=modelViewMatrix*vec4(0,0,0,1.);vDepth=-p.z;p.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));gl_Position=projectionMatrix*p;}`,
    fragmentShader: `
      varying vec2 vUv;varying float vSeed;varying float vDepth;uniform float uStorm,uTime;uniform vec3 uHorizon;
      float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float shape(vec3 p){
        float d=length((p-vec3(-.58,-.2,0.))/vec3(.39,.44,.62))-1.;
        d=min(d,length((p-vec3(-.28,.16,.04))/vec3(.35,.51,.63))-1.);
        d=min(d,length((p-vec3(.06,.34,-.07))/vec3(.34,.5,.57))-1.);
        d=min(d,length((p-vec3(.37,.05,.07))/vec3(.38,.5,.6))-1.);
        d=min(d,length((p-vec3(.67,-.23,-.05))/vec3(.31,.37,.5))-1.);
        d=min(d,length((p-vec3(0.,-.31,0.))/vec3(.73,.36,.59))-1.);
        d+=(noise(p*8.+vSeed*17.)-.5)*.26+(noise(p*20.)-.5)*.065;
        return d;
      }
      void main(){vec2 uv=(vUv-.5)*2.3;uv.x*=1.03;uv.x+=sin(vSeed*37.)*.04;float trans=1.;vec3 color=vec3(0.);
        for(int i=0;i<15;i++){vec3 p=vec3(uv,.91-float(i)*.13);float d=shape(p);float density=(1.-smoothstep(-.16,.06,d))*.43;
          if(density>.003){float light=clamp((shape(p+vec3(-.2,.3,.05))-d)*1.9+.47,.07,1.);
            vec3 shade=mix(vec3(.25,.43,.69),vec3(1.08,1.09,1.07),light);
            shade=mix(shade,shade*vec3(.35,.44,.56),uStorm*.88);
            shade=mix(shade,uHorizon,smoothstep(350.,1900.,vDepth)*.44);
            color+=shade*density*trans;trans*=1.-density;
          }
        }
        float alpha=1.-trans;if(alpha<.015)discard;gl_FragColor=vec4(color/max(alpha,.001),alpha*.99);
        #include <colorspace_fragment>
      }` });
}

function buildCloudBanks(uniforms) {
  const group = new THREE.Group(), random = rng(141), geometry = new THREE.PlaneGeometry(1, 1), material = cloudBankMaterial(uniforms), banks = [];
  for (let i = 0; i < 30; i++) {
    const mesh = new THREE.Mesh(geometry, material), side = i % 2 ? -1 : 1;
    mesh.position.set(side * (160 + random() * 580), -60 - random() * 55, -random() * 2400);
    mesh.scale.set(230 + random() * 360, 120 + random() * 130, 1); mesh.userData.z = mesh.position.z;
    mesh.frustumCulled = false; group.add(mesh); banks.push(mesh);
  }
  return { group, banks };
}

function batch(geometry, material, parts, parent) {
  if (!parts.length) return null;
  const m = new THREE.InstancedMesh(geometry, material, parts.length);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]; temp.position.set(...p.p); temp.scale.set(...(p.s || [1, 1, 1])); temp.rotation.set(...(p.r || [0, 0, 0])); temp.updateMatrix(); m.setMatrixAt(i, temp.matrix);
  }
  m.castShadow = false; m.receiveShadow = false; m.computeBoundingSphere(); parent.add(m); return m;
}

function buildScenery() {
  const random = rng(); const group = new THREE.Group(); const sectors = [];
  const steel = new THREE.MeshStandardMaterial({ color: '#53737a', roughness: .85, metalness: .24 });
  const ivory = new THREE.MeshStandardMaterial({ color: '#c6c6ab', roughness: .88, metalness: .08 });
  const bronze = new THREE.MeshStandardMaterial({ color: '#9d8051', roughness: .7, metalness: .42 });
  const dark = new THREE.MeshStandardMaterial({ color: '#344e57', roughness: .8, metalness: .35 });
  const rock = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98, metalness: .02 });
  const lit = new THREE.MeshBasicMaterial({ color: '#ffd99b', toneMapped: false });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(.75, 1, 1, 8);
  const arch = archGeometry();
  const ring = new THREE.TorusGeometry(1, .05, 4, 20);
  for (let s = 0; s < 8; s++) {
    const sector = new THREE.Group(); group.add(sector); sector.userData.base = -s * 290;
    const stoneParts = [], metalParts = [], goldParts = [], lightParts = [], towerParts = [], ringParts = [];
    const side = s % 2 ? -1 : 1;
    const x = side * (230 + random() * 200), z = random() * 100;
    const monument = new THREE.Mesh(arch, ivory); monument.position.set(x, -137, z); monument.rotation.y = side * .12; sector.add(monument);
    // The layered cap, buttresses and aviation beacon make the arch read as infrastructure.
    stoneParts.push({ p: [x, 25, z], s: [56, 5, 27] }, { p: [x, 32, z], s: [45, 4, 23] });
    metalParts.push({ p: [x, 37, z], s: [41, 4, 19] }, { p: [x, 48, z], s: [1.5, 22, 1.5] });
    goldParts.push({ p: [x, 41, z], s: [48, .8, 24] });
    lightParts.push({ p: [x, 59, z], s: [1.5, 1.4, 1.5] });
    for (const dx of [-20, 20]) for (const dz of [-9, 9]) metalParts.push({ p: [x + dx, -46, z + dz], s: [1.3, 132, 1.3], r: [0, 0, -dx * .0005] });
    // Parallel elevated aqueduct/rail branches remain far outside the playable corridor.
    metalParts.push({ p: [x, 28, z - 116], s: [6, 3.5, 250] });
    for (const dx of [-3.8, 3.8]) goldParts.push({ p: [x + dx, 31, z - 116], s: [.4, .5, 254] });
    for (let j = 0; j < 10; j++) {
      const zz = z - j * 25;
      metalParts.push({ p: [x, 24, zz], s: [12, 1, 2] });
      for (const dx of [-5.2, 5.2]) {
        beam(metalParts, [x + dx, 22, zz], [x + dx, 34, zz - 25], .8);
        beam(metalParts, [x + dx, 34, zz], [x + dx, 22, zz - 25], .8);
        const t = j / 10, t2 = (j + 1) / 10;
        const y = 58 - Math.sin(t * Math.PI) * 20, y2 = 58 - Math.sin(t2 * Math.PI) * 20;
        beam(goldParts, [x + dx, y, zz], [x + dx, y2, zz - 25], .65);
        beam(metalParts, [x + dx, 31, zz], [x + dx, y, zz], .35);
      }
    }
    // Suspended settlements, fine spires and terraced floating foundations.
    const cityX = -side * (560 + random() * 330), cityZ = z - 110;
    towerParts.push({ p: [cityX, -70, cityZ], s: [67, 8, 47] });
    const island = new THREE.Mesh(rockGeometry(800 + s * 7), rock); island.position.set(cityX, -91, cityZ); island.scale.set(99, 105, 96); island.rotation.y = random() * 3; sector.add(island);
    for (let k = 0; k < 13; k++) {
      const dx = (random() - .5) * 104, dz = (random() - .5) * 75, h = 8 + random() ** 3 * 60;
      const xx = cityX + dx, zz = cityZ + dz;
      stoneParts.push({ p: [xx, -57 + h / 2, zz], s: [5 + random() * 9, h, 6 + random() * 9] });
      goldParts.push({ p: [xx, -56 + h, zz], s: [3, 2, 3] });
      if (h > 30) metalParts.push({ p: [xx, -51 + h, zz], s: [.55, 14, .55] });
      if (k % 4 === 0) lightParts.push({ p: [xx, -57 + h * .8, zz + 5], s: [.5, 1, .5] });
    }
    ringParts.push({ p: [cityX, -60, cityZ], s: [73, 49, 73], r: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 3; k++) {
      const crag = new THREE.Mesh(rockGeometry(190 + s * 13 + k * 31), rock);
      const size = 50 + random() * 65;
      crag.position.set(side * (300 + random() * 610), -30 + random() * 50, z - 80 - k * 80);
      crag.scale.set(size, size * (1.2 + random() * 1.2), size * (.75 + random() * .4)); crag.rotation.y = random() * 6;
      sector.add(crag);
      if (k === 1) {
        const cap = new THREE.Mesh(arch, ivory); cap.position.copy(crag.position).add(new THREE.Vector3(0, 12, 0)); cap.scale.set(.38, .48, .48); cap.rotation.y = .6; sector.add(cap);
      }
    }
    // A three-sail wind collector has a tapered profile instead of box blades.
    const turbine = new THREE.Group(); turbine.position.set(x + side * 70, -9, z - 112); sector.add(turbine);
    turbine.scale.setScalar(s % 3 === 0 ? .65 : s % 3 === 1 ? 1 : .8);
    const sailShape = new THREE.Shape(); sailShape.moveTo(-1.3, 3); sailShape.lineTo(-3.1, 12); sailShape.lineTo(-1.5, 35); sailShape.lineTo(.7, 39); sailShape.lineTo(1.4, 9); sailShape.closePath();
    const sailGeo = new THREE.ExtrudeGeometry(sailShape, { depth: .45, bevelEnabled: false });
    batch(sailGeo, ivory, Array.from({ length: 3 }, (_, b) => ({ p: [0, 0, 0], r: [0, 0, b * Math.PI * 2 / 3] })), turbine);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 6, 10), bronze); hub.rotation.x = Math.PI / 2; turbine.add(hub);
    metalParts.push({ p: [turbine.position.x, -75, turbine.position.z + 4], s: [4, 130, 5] });
    ringParts.push({ p: [turbine.position.x, -9, turbine.position.z], s: [41, 41, 41] });
    batch(box, ivory, stoneParts, sector); batch(box, steel, metalParts, sector); batch(box, bronze, goldParts, sector);
    batch(box, lit, lightParts, sector); batch(cylinder, dark, towerParts, sector); batch(ring, bronze, ringParts, sector);
    sectors.push({ group: sector, turbine });
  }
  return { group, sectors, materials: [steel, ivory, bronze, dark, lit, rock] };
}

function buildBirds() {
  const random = rng(717); const positions = new Float32Array(32 * 12);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: '#415c60', transparent: true, opacity: .55 });
  const mesh = new THREE.LineSegments(geo, mat); mesh.frustumCulled = false;
  const birds = Array.from({ length: 32 }, () => ({ x: (random() - .5) * 340, y: 10 + random() * 80, z: -100 - random() * 730, t: random() * 30 }));
  return { mesh, birds, positions };
}

export function createAtmosphere(scene) {
  const root = new THREE.Group(); root.name = 'Skyrail atmosphere'; scene.add(root);
  const palette = PALETTES.iron;
  const uniforms = {
    uZenith: { value: new THREE.Color(palette[0]) }, uHorizon: { value: new THREE.Color(palette[1]) },
    uShadow: { value: new THREE.Color(palette[2]) }, uSunlight: { value: new THREE.Color(palette[3]) },
    uSun: { value: new THREE.Vector3(-.44, .46, -.73).normalize() }, uEye: { value: new THREE.Vector3(0, 8, 0) },
    uTime: { value: 0 }, uStorm: { value: 0 }, uFlash: { value: 0 }, uClouds: { value: 1 }, uQuality: { value: .65 }, uScroll: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2700, 32, 18), new THREE.ShaderMaterial({ uniforms, vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
  sky.renderOrder = -100; sky.frustumCulled = false; root.add(sky);
  const hemi = new THREE.HemisphereLight('#e3f5ef', '#54757c', 2.1); root.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0cf', 3.2); sun.position.set(-90, 140, -130); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -62; sun.shadow.camera.right = 62; sun.shadow.camera.top = 62; sun.shadow.camera.bottom = -62;
  sun.shadow.camera.near = 2; sun.shadow.camera.far = 420; sun.shadow.bias = -.0003; sun.shadow.normalBias = .035; sun.shadow.radius = 2;
  const fill = new THREE.DirectionalLight('#a8d8ec', .65); fill.position.set(80, 30, 60); root.add(fill);
  const flashLight = new THREE.DirectionalLight('#c6e9ff', 0); flashLight.position.set(100, 180, -200); root.add(flashLight);
  const scenery = buildScenery(); root.add(scenery.group);
  const cloudBanks = buildCloudBanks(uniforms); root.add(cloudBanks.group);
  const flock = buildBirds(); root.add(flock.mesh);
  const rainPositions = new Float32Array(1200 * 6); const rainSeeds = new Float32Array(1200 * 3); const random = rng(672);
  for (let i = 0; i < rainSeeds.length; i++) rainSeeds[i] = random();
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: '#d2eaf0', transparent: true, opacity: .2, depthWrite: false });
  const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; rain.visible = false; root.add(rain);
  const boltGeo = new THREE.BufferGeometry(); const boltPositions = new Float32Array(80 * 3); boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPositions, 3));
  const boltMat = new THREE.LineBasicMaterial({ color: '#d6faff', transparent: true, opacity: 0, toneMapped: false });
  const bolt = new THREE.LineSegments(boltGeo, boltMat); bolt.frustumCulled = false; root.add(bolt);
  const fog = new THREE.FogExp2('#95bfd3', .00078); scene.fog = fog;
  const targetColors = palette.map(c => new THREE.Color(c)); const targetPos = new THREE.Vector3();
  let quality = 2, elapsed = 0, travel = 0, weather = 0, lightning = 0, nextLightning = 8, lastBiome = 'iron', disposed = false;

  function setQuality(value) {
    const settings = typeof value === 'object' ? value : { quality: value };
    const raw = settings.quality ?? 'high';
    quality = typeof raw === 'number' ? clamp(raw, 0, 3) : Math.max(0, ['low', 'medium', 'high', 'ultra'].indexOf(String(raw).toLowerCase()));
    uniforms.uQuality.value = [0, .3, .65, 1][quality];
    uniforms.uClouds.value = settings.clouds === false ? 0 : 1;
    cloudBanks.group.visible = settings.clouds !== false;
    cloudBanks.banks.forEach((bank, i) => { bank.visible = i < [14, 22, 30, 30][quality]; });
    sun.castShadow = settings.shadows !== false && quality > 0;
    const size = quality >= 3 ? 2048 : quality >= 2 ? 1536 : 1024;
    if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    scenery.sectors.forEach((s, i) => { s.group.visible = quality > 0 || i < 5; });
    flock.mesh.visible = quality > 0;
  }

  function update(dt, state = {}) {
    if (disposed) return;
    dt = Math.min(dt, .1); elapsed += dt;
    const time = state.time ?? elapsed;
    const p = state.player?.position || state.player || state.camera?.position || targetPos.set(0, 4, 0);
    const cp = state.camera?.position || p;
    const speed = Math.abs(Number(state.speed) || 24);
    const biome = paletteName(state.biome);
    if (biome !== lastBiome) { PALETTES[biome].forEach((c, i) => targetColors[i].set(c)); lastBiome = biome; }
    const transition = 1 - Math.exp(-dt * .35);
    ['uZenith', 'uHorizon', 'uShadow', 'uSunlight'].forEach((key, i) => uniforms[key].value.lerp(targetColors[i], transition));
    const stormTarget = clamp(Number(state.storm) || (biome === 'storm' ? .9 : biome === 'under' ? .65 : .08), 0, 1);
    weather = mix(weather, stormTarget, 1 - Math.exp(-dt * .5));
    travel += dt * speed * .64;
    sky.position.copy(cp); sky.scale.setScalar((state.camera?.far || 3000) * .96 / 2700); uniforms.uEye.value.copy(cp); uniforms.uTime.value = time; uniforms.uStorm.value = weather; uniforms.uScroll.value = travel;
    scenery.group.position.set((p.x || 0) * .1, 0, p.z || 0);
    scenery.sectors.forEach((s, i) => {
      s.group.position.z = ((s.group.userData.base + travel + 2400) % 2320) - 1970;
      s.turbine.rotation.z = time * (.16 + weather * .5) + i;
    });
    cloudBanks.group.position.z = p.z || 0;
    cloudBanks.banks.forEach((bank, i) => { bank.position.z = ((bank.userData.z + travel * .72 + 2800) % 2600) - 2200; bank.position.x += Math.sin(time * .018 + i) * dt * .65; });
    fog.color.lerp(targetColors[4], transition); fog.density = mix(.00072, .0026, weather) + (biome === 'under' ? .0008 : 0);
    hemi.intensity = mix(2, 1.35, weather); hemi.color.copy(uniforms.uHorizon.value); sun.intensity = mix(3.35, 1.1, weather); sun.color.copy(uniforms.uSunlight.value);
    sun.position.set((p.x || 0) - 80, (p.y || 0) + 130, (p.z || 0) - 120); sun.target.position.set(p.x || 0, p.y || 0, (p.z || 0) - 18);
    fill.intensity = mix(.6, .95, weather);
    nextLightning -= dt;
    if (nextLightning <= 0 && weather > .48) {
      nextLightning = 4 + random() * 10; lightning = .7 + random() * .3;
      let x = (p.x || 0) + (random() > .5 ? 1 : -1) * (150 + random() * 180), y = 220, z = (p.z || 0) - 550 - random() * 500;
      for (let i = 0; i < 40; i++) {
        const o = i * 6; boltPositions.set([x, y, z], o); x += (random() - .5) * 21; y -= 7 + random() * 5; z += (random() - .5) * 11; boltPositions.set([x, y, z], o + 3);
      }
      boltGeo.attributes.position.needsUpdate = true;
    }
    lightning = Math.max(0, lightning - dt * 3.4); const flash = lightning * (Math.sin(time * 71) > -.2 ? 1 : .2);
    uniforms.uFlash.value = flash; flashLight.intensity = flash * 6; boltMat.opacity = flash; bolt.visible = flash > .01;
    rain.visible = weather > .43;
    if (rain.visible) {
      const count = [150, 380, 720, 1200][quality]; rainGeo.setDrawRange(0, count * 2); rainMat.opacity = (weather - .3) * .33;
      for (let i = 0; i < count; i++) {
        const r = i * 3, a = i * 6; const x = cp.x + (rainSeeds[r] - .5) * 100 + Math.sin(time * .5) * 4;
        const y = cp.y + ((rainSeeds[r + 1] * 95 - time * 47) % 95 + 95) % 95 - 40;
        const z = cp.z + (rainSeeds[r + 2] - .5) * 130;
        rainPositions.set([x, y, z, x - 1.1 - weather, y + 4.5, z - 1.2 - speed * .045], a);
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    if (flock.mesh.visible) {
      flock.birds.forEach((b, i) => {
        const x = b.x + Math.sin(time * .07 + b.t) * 42 + cp.x * .2;
        const y = b.y + Math.sin(time * .3 + b.t) * 3;
        const z = (p.z || 0) + b.z + Math.sin(time * .09 + b.t) * 20;
        const wing = Math.sin(time * 3.7 + b.t) * .48;
        flock.positions.set([x - 1.1, y + wing, z + .35, x, y, z, x, y, z, x + 1.1, y + wing, z + .35], i * 12);
      }); flock.mesh.geometry.attributes.position.needsUpdate = true;
    }
  }

  function dispose() {
    disposed = true; scene.remove(root);
    const geometries = new Set(), materials = new Set();
    root.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); sun.shadow.map?.dispose(); if (scene.fog === fog) scene.fog = null;
  }
  return { update, setQuality, dispose };
}

export function createEffects(scene) {
  const maxParticles = 1400, maxTrails = 180;
  const positions = new Float32Array(maxParticles * 3), colors = new Float32Array(maxParticles * 3), sizes = new Float32Array(maxParticles);
  const velocity = new Float32Array(maxParticles * 3), life = new Float32Array(maxParticles), total = new Float32Array(maxParticles), baseSize = new Float32Array(maxParticles);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    vertexShader: `attribute float size;varying vec3 vColor;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=min(40.,size*280./max(1.,-p.z));gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 vColor;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=pow(1.-r,1.7);gl_FragColor=vec4(vColor,a);#include <colorspace_fragment>}`.replace(';#include', ';\n#include') });
  const sparks = new THREE.Points(geo, mat); sparks.frustumCulled = false; scene.add(sparks);
  const trailPos = new Float32Array(maxTrails * 6), trailColor = new Float32Array(maxTrails * 6), trailLife = new Float32Array(maxTrails), trailTotal = new Float32Array(maxTrails), trailBase = new Float32Array(maxTrails * 3);
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(trailPos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(trailColor, 3));
  const tm = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .88, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(tg, tm); lines.frustumCulled = false; scene.add(lines);
  const smokeCount = 160, smokePositions = new Float32Array(smokeCount * 3), smokeData = new Float32Array(smokeCount * 3), smokeVelocity = new Float32Array(smokeCount * 3), smokeLife = new Float32Array(smokeCount), smokeDuration = new Float32Array(smokeCount), smokeSize = new Float32Array(smokeCount);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3)); sg.setAttribute('particle', new THREE.BufferAttribute(smokeData, 3));
  const sm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: `attribute vec3 particle;varying vec2 vData;void main(){vData=particle.yz;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=min(145.,particle.x*310./max(1.,-p.z));gl_Position=projectionMatrix*p;}`,
    fragmentShader: `
      varying vec2 vData;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec2 uv=gl_PointCoord;float n=noise(uv*6.+vData.y*2.)*.7+noise(uv*13.)*.3;
        float r=length(uv-.5)*2.;float alpha=(1.-smoothstep(.35+n*.25,.85+n*.15,r))*vData.x;
        if(alpha<.005)discard;float fire=(1.-smoothstep(.015,.33,vData.y))*max(0.,1.-r*1.1);
        vec3 color=mix(vec3(.18,.205,.20)+n*.11,vec3(2.5,.75,.11),fire);
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const smoke = new THREE.Points(sg, sm); smoke.frustumCulled = false; scene.add(smoke);
  let particleCursor = 0, trailCursor = 0, smokeCursor = 0, scale = 1; const color = new THREE.Color();
  function burst(position, value = 0xffd699, count = 20, power = 8) {
    color.set(value); count = Math.min(maxParticles, Math.ceil(count * scale));
    for (let j = 0; j < count; j++) {
      const i = particleCursor++ % maxParticles, p = i * 3; positions[p] = position.x; positions[p + 1] = position.y; positions[p + 2] = position.z;
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, v = Math.sqrt(1 - u * u), speed = power * (.2 + Math.random() * .8);
      velocity[p] = Math.cos(a) * v * speed; velocity[p + 1] = u * speed + power * .24; velocity[p + 2] = Math.sin(a) * v * speed;
      life[i] = total[i] = .3 + Math.random() * .55; baseSize[i] = .1 + Math.random() * .3;
      colors[p] = color.r * 1.9; colors[p + 1] = color.g * 1.9; colors[p + 2] = color.b * 1.9;
    }
    geo.attributes.color.needsUpdate = true;
    if (count >= 22 * scale && power >= 10 && scale > 0) {
      for (let j = 0; j < Math.ceil(9 * scale); j++) {
        const i = smokeCursor++ % smokeCount, p = i * 3;
        smokePositions.set([position.x + (Math.random() - .5) * 2, position.y + Math.random(), position.z + (Math.random() - .5) * 2], p);
        smokeVelocity.set([(Math.random() - .5) * power * .5, 1 + Math.random() * power * .23, (Math.random() - .5) * power * .5], p);
        smokeLife[i] = smokeDuration[i] = 1.7 + Math.random() * 1.2; smokeSize[i] = 2 + Math.random() * 2;
      }
    }
  }
  function trail(from, to, value = 0xffdd88, lifetime = .12) {
    if (scale <= 0) return;
    const i = trailCursor++ % maxTrails, p = i * 6; color.set(value); trailPos.set([from.x, from.y, from.z, to.x, to.y, to.z], p);
    trailBase.set([color.r, color.g, color.b], i * 3); trailLife[i] = trailTotal[i] = Math.max(.01, lifetime); tg.attributes.position.needsUpdate = true;
  }
  function update(dt) {
    for (let i = 0; i < maxParticles; i++) {
      if (life[i] <= 0) continue; life[i] -= dt; const p = i * 3;
      if (life[i] <= 0) { sizes[i] = 0; continue; }
      velocity[p + 1] -= dt * 15; positions[p] += velocity[p] * dt; positions[p + 1] += velocity[p + 1] * dt; positions[p + 2] += velocity[p + 2] * dt;
      sizes[i] = baseSize[i] * Math.min(1, life[i] / total[i] * 2.5);
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.size.needsUpdate = true;
    for (let i = 0; i < maxTrails; i++) {
      if (trailLife[i] <= 0) continue; trailLife[i] = Math.max(0, trailLife[i] - dt); const f = trailLife[i] / trailTotal[i], c = i * 3, p = i * 6;
      trailColor[p] = trailColor[p + 3] = trailBase[c] * f; trailColor[p + 1] = trailColor[p + 4] = trailBase[c + 1] * f; trailColor[p + 2] = trailColor[p + 5] = trailBase[c + 2] * f;
    }
    tg.attributes.color.needsUpdate = true;
    for (let i = 0; i < smokeCount; i++) {
      if (smokeLife[i] <= 0) continue; smokeLife[i] = Math.max(0, smokeLife[i] - dt); const p = i * 3, progress = 1 - smokeLife[i] / smokeDuration[i];
      smokePositions[p] += smokeVelocity[p] * dt; smokePositions[p + 1] += smokeVelocity[p + 1] * dt; smokePositions[p + 2] += smokeVelocity[p + 2] * dt;
      const drag = Math.exp(-dt * 1.2); smokeVelocity[p] *= drag; smokeVelocity[p + 2] *= drag;
      smokeData[p] = smokeSize[i] * (1 + progress * 2); smokeData[p + 1] = (1 - progress) ** 1.5 * .66; smokeData[p + 2] = progress;
    }
    sg.attributes.position.needsUpdate = true; sg.attributes.particle.needsUpdate = true;
  }
  function setQuality(value) {
    const settings = typeof value === 'object' ? value : { quality: value };
    scale = settings.particles === false ? 0 : ({ low: .3, medium: .6, high: 1, ultra: 1.35 }[String(settings.quality).toLowerCase()] ?? 1);
    if (!scale) { life.fill(0); sizes.fill(0); trailLife.fill(0); trailColor.fill(0); smokeLife.fill(0); smokeData.fill(0); geo.attributes.size.needsUpdate = true; tg.attributes.color.needsUpdate = true; sg.attributes.particle.needsUpdate = true; }
  }
  function dispose() { scene.remove(sparks, lines, smoke); geo.dispose(); mat.dispose(); tg.dispose(); tm.dispose(); sg.dispose(); sm.dispose(); }
  return { burst, trail, update, setQuality, dispose };
}
