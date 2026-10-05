import * as THREE from '../vendor/three.module.js';

/* SKYRAIL's local, deterministic art pipeline.
 * Direct profile/extrusion/lathe modelling keeps the deliverable portable where
 * Blender is unavailable. Bevels, panel seams, layered materials and printed
 * markings are authored here; static components are merged by material.
 * All materials and cached primitive geometries are shared between instances.
 */
const PI = Math.PI;
const geometryCache = new Map();
const textureCache = new Map();
const paintCache = new Map();
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = THREE.MathUtils.clamp;

function seeded(seed) {
  let n = seed;
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
}

function canvasTexture(key, draw, width = 512, height = 512) {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

function metalMap() {
  const texture = canvasTexture('paint-weathering', (ctx, w, h) => {
    ctx.fillStyle = '#d2d3ce'; ctx.fillRect(0, 0, w, h);
    const rand = seeded(808);
    for (let i = 0; i < 6500; i++) {
      const x = rand() * w, y = rand() * h;
      ctx.fillStyle = rand() > 0.6 ? 'rgba(255,255,238,.12)' : 'rgba(33,40,39,.10)';
      ctx.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 5);
    }
    ctx.strokeStyle = 'rgba(17,29,29,.22)'; ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    for (let i = 0; i < 55; i++) {
      const x = rand() * w, y = rand() * h;
      ctx.fillStyle = 'rgba(23,36,35,.16)';
      ctx.fillRect(x, y, 1, 3 + rand() * 34);
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function deckMap() {
  const texture = canvasTexture('diamond-deck', (ctx, w, h) => {
    ctx.fillStyle = '#a6b2b1'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 24) for (let x = 0; x < w; x += 24) {
      ctx.save(); ctx.translate(x + ((y / 24) % 2) * 12, y); ctx.rotate(PI / 4);
      ctx.fillStyle = '#c4cccc'; ctx.fillRect(-8, -2, 16, 3);
      ctx.fillStyle = '#677c7b'; ctx.fillRect(-8, 1, 16, 2); ctx.restore();
    }
    const rand = seeded(443);
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = 'rgba(18,37,36,.13)';
      ctx.fillRect(rand() * w, rand() * h, rand() * 25, 1);
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(.42, .42);
  return texture;
}

function markingMap(text, secondary = 'AERONAUTICAL FREIGHT DIVISION', dark = false) {
  const key = `mark:${text}:${secondary}:${dark}`;
  return canvasTexture(key, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = dark ? '#142b2c' : '#f3e8c9';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 120px Arial, sans-serif';
    ctx.fillText(text, w / 2, h * .40, w * .92);
    ctx.font = '600 24px Arial, sans-serif';
    ctx.fillText(secondary, w / 2, h * .79, w * .90);
    ctx.fillRect(w * .07, h * .66, w * .86, 3);
    ctx.globalCompositeOperation = 'destination-out';
    const rand = seeded(145);
    for (let i = 0; i < 450; i++) ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 5, 1 + rand() * 2);
  }, 1024, 256);
}

function hazardMap() {
  const texture = canvasTexture('warning-stripes', (ctx, w, h) => {
    ctx.fillStyle = '#ddad48'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#273330';
    for (let x = -h; x < w + h; x += 90) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0);
      ctx.lineTo(x + 40 + h, h); ctx.lineTo(x + h, h); ctx.fill();
    }
    const rand = seeded(335);
    ctx.fillStyle = 'rgba(247,218,158,.4)';
    for (let i = 0; i < 1200; i++) ctx.fillRect(rand() * w, rand() * h, rand() * 7, 1);
  }, 512, 128);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

let materials;
function M() {
  if (materials) return materials;
  const std = (color, metalness = .4, roughness = .5, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  materials = {
    steel: std(0x24383b, .78, .37, { map: metalMap() }),
    dark: std(0x101f25, .6, .48),
    iron: std(0x688182, .73, .42, { map: metalMap() }),
    brass: std(0xd5aa62, .79, .31),
    paleBrass: std(0xf2cc85, .65, .38),
    cream: std(0xe6d9b2, .28, .56, { map: metalMap() }),
    red: std(0xa63d34, .4, .4, { map: metalMap() }),
    teal: std(0x2f7476, .42, .42, { map: metalMap() }),
    yellow: std(0xe8b644, .34, .43),
    deck: std(0x627d7c, .75, .48, { map: deckMap() }),
    rubber: std(0x101b1b, .05, .88),
    wood: std(0x65432d, .06, .76),
    canvas: std(0xd0b789, .01, .93),
    leather: std(0x553d30, .06, .69),
    jacket: std(0xb07b46, .02, .79),
    cloth: std(0x29444b, .03, .91),
    skin: std(0xc89873, 0, .84),
    scarf: std(0xb72e35, .04, .87, { side: THREE.DoubleSide }),
    glass: std(0x72c5c4, .57, .17),
    glow: std(0x64e4d0, .22, .24, { emissive: 0x37c6b4, emissiveIntensity: 1.3 }),
    warm: std(0xffd38a, .15, .27, { emissive: 0xffa54a, emissiveIntensity: 1.1 }),
    danger: std(0xfe6550, .15, .29, { emissive: 0xff3322, emissiveIntensity: .8 }),
    hazard: std(0xffffff, .42, .54, { map: hazardMap() }),
  };
  return materials;
}

function paint(color) {
  if (color === undefined) return M().red;
  const key = new THREE.Color(color).getHex();
  if (!paintCache.has(key)) paintCache.set(key, new THREE.MeshStandardMaterial({ color: key, metalness: .44, roughness: .44, map: metalMap() }));
  return paintCache.get(key);
}

function cached(key, build) {
  if (!geometryCache.has(key)) {
    const geometry = build(); geometry.userData.skyrailShared = true;
    geometryCache.set(key, geometry);
  }
  return geometryCache.get(key);
}

function bevelBox(w, h, d, bevel = .06) {
  bevel = Math.min(bevel, w * .22, h * .22, d * .22);
  return cached(`b:${w}:${h}:${d}:${bevel}`, () => {
    const x = w / 2 - bevel, y = h / 2 - bevel;
    const shape = new THREE.Shape();
    shape.moveTo(-x, -y); shape.lineTo(x, -y); shape.lineTo(x, y); shape.lineTo(-x, y); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * bevel, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 1, steps: 1 });
    geometry.translate(0, 0, -d / 2 + bevel);
    return geometry;
  });
}

function cylinder(rt, rb, height, segments = 16, open = false) {
  return cached(`c:${rt}:${rb}:${height}:${segments}:${open}`, () => new THREE.CylinderGeometry(rt, rb, height, segments, 1, open));
}

function sphere(r, width = 16, height = 10) {
  return cached(`s:${r}:${width}:${height}`, () => new THREE.SphereGeometry(r, width, height));
}

function torus(r, tube = .04, radial = 6, tubular = 24) {
  return cached(`t:${r}:${tube}:${radial}:${tubular}`, () => new THREE.TorusGeometry(r, tube, radial, tubular));
}

function loft(rings, sides = 12) {
  const positions = [], indices = [], uv = [];
  for (let i = 0; i < rings.length; i++) {
    const [y, rx, rz, cx = 0, cz = 0] = rings[i];
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * PI * 2;
      positions.push(cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz);
      uv.push(j / sides, i / (rings.length - 1));
      if (i < rings.length - 1 && j < sides) {
        const n = i * (sides + 1) + j, k = n + sides + 1;
        indices.push(n, k, n + 1, n + 1, k, k + 1);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}

function tube(points, radius = .07, segments = 20) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => v3(...p))), segments, radius, 7, false);
}

function mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale) {
  const obj = new THREE.Mesh(geometry, material);
  obj.position.set(...position); obj.rotation.set(...rotation);
  if (scale) obj.scale.set(...scale);
  obj.castShadow = true; obj.receiveShadow = true;
  obj.userData.ownedGeometry = !geometry.userData.skyrailShared;
  obj.userData.ownedMaterial = Boolean(material.userData.skyrailOwned);
  return obj;
}

// Merging preserves UVs and normals and turns hundreds of rivets into one draw.
class Batch {
  constructor() { this.parts = new Map(); }
  add(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
    const matrix = new THREE.Matrix4().compose(v3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), scale ? v3(...scale) : v3(1, 1, 1));
    const transformed = geo.index ? geo.toNonIndexed() : geo.clone();
    transformed.applyMatrix4(matrix);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(transformed);
    return this;
  }
  box(w, h, d, mat, pos, rot, bevel = .06) { return this.add(bevelBox(w, h, d, bevel), mat, pos, rot); }
  cyl(rt, rb, h, mat, pos, rot, sides = 16) { return this.add(cylinder(rt, rb, h, sides), mat, pos, rot); }
  ball(r, mat, pos, scale) { return this.add(r < .085 ? sphere(r, 7, 5) : sphere(r), mat, pos, [0, 0, 0], scale); }
  ring(r, t, mat, pos, rot) { return this.add(torus(r, t), mat, pos, rot); }
  pipe(points, radius, mat) { const geo = tube(points, radius); this.add(geo, mat); geo.dispose(); return this; }
  finish(group = new THREE.Group()) {
    for (const [mat, parts] of this.parts) {
      const length = parts.reduce((n, g) => n + g.attributes.position.count, 0);
      const positions = new Float32Array(length * 3), normals = new Float32Array(length * 3), uvs = new Float32Array(length * 2);
      let offset = 0;
      for (const geo of parts) {
        positions.set(geo.attributes.position.array, offset * 3);
        normals.set(geo.attributes.normal.array, offset * 3);
        if (geo.attributes.uv) uvs.set(geo.attributes.uv.array, offset * 2);
        offset += geo.attributes.position.count; geo.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.computeBoundingSphere(); group.add(mesh(geo, mat));
    }
    this.parts.clear(); return group;
  }
}

function mergeStatic(group) {
  const batch = new Batch();
  group.updateMatrixWorld(true);
  const old = [];
  group.traverse(child => {
    if (!child.isMesh) return;
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    child.matrixWorld.decompose(p, q, s);
    const e = new THREE.Euler().setFromQuaternion(q);
    batch.add(child.geometry, child.material, p.toArray(), [e.x, e.y, e.z], s.toArray());
    old.push(child.geometry);
  });
  group.clear(); batch.finish(group);
  for (const geo of old) geo.dispose();
  return group;
}

let characterPaletteMaterial;
function mergeCharacterPart(group) {
  // Vertex colour preserves every garment/gear colour with one draw per joint.
  // Lenses and luminous inserts retain their individual surface response.
  characterPaletteMaterial ||= new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .19, roughness: .62 });
  const eligible = group.children.filter(child => child.isMesh && !child.material.transparent && child.material !== M().glow && child.material !== M().danger && child.material !== M().glass);
  if (!eligible.length) return;
  const parts = [], total = eligible.reduce((n, child) => n + (child.geometry.index ? child.geometry.index.count : child.geometry.attributes.position.count), 0);
  const position = new Float32Array(total * 3), normal = new Float32Array(total * 3), colors = new Float32Array(total * 3);
  let offset = 0;
  for (const child of eligible) {
    child.updateMatrix();
    const geo = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone(); geo.applyMatrix4(child.matrix);
    const count = geo.attributes.position.count;
    position.set(geo.attributes.position.array, offset * 3); normal.set(geo.attributes.normal.array, offset * 3);
    const color = child.material.color;
    for (let i = 0; i < count; i++) {
      colors[(offset + i) * 3] = color.r; colors[(offset + i) * 3 + 1] = color.g; colors[(offset + i) * 3 + 2] = color.b;
    }
    offset += count; parts.push(geo); group.remove(child);
    // Cached primitive geometry may be referenced by other characters.
    if (![...geometryCache.values()].includes(child.geometry)) child.geometry.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  group.add(mesh(geometry, characterPaletteMaterial));
  for (const geo of parts) geo.dispose();
}

function decal(group, text, subtitle, w, h, position, rotation = [0, 0, 0], dark = false) {
  const mat = new THREE.MeshStandardMaterial({ map: markingMap(text, subtitle, dark), transparent: true, depthWrite: false, roughness: .85, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
  mat.userData.skyrailOwned = true;
  const plane = mesh(new THREE.PlaneGeometry(w, h), mat, position, rotation);
  plane.castShadow = false; group.add(plane); return plane;
}

function rivetLine(b, from, to, count, mat = M().brass, radius = .04) {
  const a = v3(...from), delta = v3(...to).sub(a);
  for (let i = 0; i < count; i++) {
    const p = a.clone().addScaledVector(delta, i / Math.max(1, count - 1));
    b.ball(radius, mat, [p.x, p.y, p.z]);
  }
}

function turbine(b, x, y, z, r = .8, length = 2.4, exterior = M().red) {
  const m = M();
  b.cyl(r * .92, r * .72, length, exterior, [x, y, z], [PI / 2, 0, 0], 24);
  b.cyl(r * .72, r * .67, .17, m.dark, [x, y, z - length / 2 - .025], [PI / 2, 0, 0], 24);
  b.ring(r * .77, r * .11, m.brass, [x, y, z - length / 2 - .08]);
  b.cyl(r * .22, r * .12, .45, m.iron, [x, y, z - length / 2 - .13], [PI / 2, 0, 0]);
  for (let i = 0; i < 8; i++) {
    const a = i * PI / 4;
    b.box(r * .17, r * .7, .07, m.iron, [x + Math.sin(a) * r * .38, y + Math.cos(a) * r * .38, z - length / 2 - .1], [0, .35, -a + .32], .015);
  }
  b.ring(r * .61, .075, m.steel, [x, y, z + length / 2]);
  b.cyl(r * .4, r * .55, .18, m.glow, [x, y, z + length / 2 + .02], [PI / 2, 0, 0]);
  for (const side of [-1, 1]) b.box(.10, .09, length * .64, m.brass, [x + side * r * .94, y, z]);
}

function anchor(b, x, y, z) {
  const m = M();
  b.cyl(.16, .24, .27, m.brass, [x, y - .12, z]);
  b.ring(.28, .075, m.glow, [x, y + .15, z]);
  b.box(.49, .09, .4, m.dark, [x, y - .28, z]);
}

function addUndercarriage(b, length, width, color) {
  const m = M();
  b.box(width - .25, .32, length - .3, m.dark, [0, -1.6, 0], undefined, .12);
  for (const side of [-1, 1]) {
    b.box(.23, .42, length - 1.1, m.steel, [side * (width / 2 - .72), -2.06, 0]);
    b.pipe([[side * (width / 2 - .18), -1.0, -length / 2 + 1], [side * (width / 2 + .12), -1.2, 0], [side * (width / 2 - .18), -1.0, length / 2 - 1]], .085, m.brass);
  }
  for (const z of [-length * .32, length * .32]) {
    b.box(width - 1.1, .5, 3.5, m.steel, [0, -2.35, z]);
    b.box(width - 2.3, .55, 2.6, color, [0, -2.8, z], undefined, .16);
    for (const side of [-1, 1]) {
      for (const dz of [-1.0, 1.0]) {
        const x = side * (width / 2 - .6);
        b.cyl(.69, .69, .29, m.rubber, [x, -2.65, z + dz], [0, 0, PI / 2], 20);
        b.cyl(.44, .44, .32, m.iron, [x + side * .12, -2.65, z + dz], [0, 0, PI / 2], 20);
        b.cyl(.2, .2, .38, m.brass, [x + side * .18, -2.65, z + dz], [0, 0, PI / 2]);
        for (let k = 0; k < 4; k++) b.ring(.18, .055, m.iron, [x - side * .3, -1.8 - k * .14, z + dz], [PI / 2, 0, 0]);
      }
      b.box(.14, .13, 2.5, m.brass, [side * (width / 2 - .24), -2.6, z]);
    }
    b.cyl(.33, .33, width - 1.1, m.dark, [0, -2.58, z], [0, 0, PI / 2]);
  }
  for (const end of [-1, 1]) {
    b.box(1.8, .45, 1.2, m.steel, [0, -1.14, end * (length / 2 + .23)]);
    b.cyl(.28, .28, 1.5, m.brass, [0, -.95, end * (length / 2 + .1)], [PI / 2, 0, 0]);
    for (const x of [-width * .29, width * .29]) {
      b.cyl(.25, .25, .8, m.steel, [x, -1, end * (length / 2 + .1)], [PI / 2, 0, 0]);
      b.box(.7, .5, .18, m.rubber, [x, -1, end * (length / 2 + .46)]);
    }
  }
}

export function createCar({ kind = 'cargo', index = 0, length = 22, width = 9, color } = {}) {
  const group = new THREE.Group(); group.name = `Skyrail ${kind} ${index}`;
  const b = new Batch(), m = M();
  const bodyMat = color !== undefined ? paint(color) : (index % 3 === 1 ? m.teal : index % 3 === 2 ? m.cream : m.red);
  const obstacles = [], anchors = [];
  const openFrame = kind === 'flatbed' || kind === 'platform';
  // Play takes place on roof height zero, with full-sized railcars beneath it.
  // All rolling stock shares the same lower frame and wheel height.
  b.box(width, openFrame ? 1.05 : 4.75, length, bodyMat, [0, openFrame ? -.695 : -2.545, 0], undefined, openFrame ? .24 : .43);
  b.box(width + .15, .3, length + .05, m.steel, [0, -.21, 0], undefined, .10);
  b.box(width - .20, .09, length - .26, m.deck, [0, -.045, 0], undefined, .025);
  const underBatch = new Batch(); addUndercarriage(underBatch, length, width, bodyMat);
  const under = underBatch.finish(); under.position.y = -3.6; group.add(under);
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - .06);
    b.box(.26, .25, length - .3, m.steel, [x, -4.96, 0]);
    b.box(.05, .14, length - .8, m.cream, [x + side * .17, -4.63, 0]);
    if (openFrame) {
      for (let z = -length / 2 + 1; z < length / 2 - 1; z += 3.35) {
        b.box(.20, 3.8, .22, m.steel, [x - side * .12, -2.96, z]);
        b.pipe([[x - side * .12, -4.79, z], [x - side * .12, -1.12, Math.min(z + 3.2, length / 2 - 1)]], .095, m.brass);
      }
      for (const z of [-length * .27, length * .27]) {
        b.cyl(.58, .58, width - 1.3, m.red, [0, -3.6, z], [0, 0, PI / 2], 20);
        b.box(width - 1.1, .19, 1.8, m.steel, [0, -4.5, z]);
      }
    } else {
      for (let z = -length / 2 + .9; z < length / 2 - .6; z += .70) {
        b.box(.11, 3.62, .14, bodyMat, [x + side * .085, -2.60, z], undefined, .035);
      }
      for (const z of [-length / 2 + .68, -length * .23, length * .23, length / 2 - .68]) {
        b.box(.21, 4.1, .17, m.steel, [x + side * .12, -2.53, z]);
        rivetLine(b, [x + side * .24, -.71, z], [x + side * .24, -4.42, z], 7, m.brass, .045);
      }
      b.box(.11, 3.6, 4.7, m.steel, [x + side * .16, -2.55, 0], undefined, .04);
      b.box(.13, 3.24, 4.3, bodyMat, [x + side * .24, -2.55, 0], undefined, .04);
      b.box(.20, .12, 5.2, m.brass, [x + side * .31, -.72, 0]);
      b.box(.16, .11, 4.95, m.steel, [x + side * .31, -4.33, 0]);
      b.box(.16, .55, .095, m.brass, [x + side * .34, -2.5, 1.4]);
      b.box(.14, .13, 1.3, m.cream, [x + side * .33, -3.66, 0]);
    }
  }
  // End ladders and brake wheels give each freight body a railway silhouette.
  for (const end of [-1, 1]) {
    const z = end * (length / 2 + .08), ladderX = width * .34;
    for (const x of [ladderX - .32, ladderX + .32]) b.cyl(.045, .045, 4.85, m.brass, [x, -2.44, z]);
    for (let y = -4.6; y < .05; y += .42) b.cyl(.036, .036, .66, m.steel, [ladderX, y, z], [0, 0, PI / 2]);
    b.ring(.44, .04, m.brass, [-width * .33, -2.65, z]);
    for (const a of [0, PI / 3, -PI / 3]) b.box(.032, .85, .034, m.brass, [-width * .33, -2.65, z], [0, 0, a]);
    b.cyl(.06, .06, 2.3, m.steel, [-width * .33, -3.75, z]);
  }
  for (const side of [-1, 1]) {
    const x = side * (width / 2 + .01);
    b.box(.045, .2, length - 1.1, m.cream, [x, -.83, 0]);
    for (let z = -length / 2 + 1.1; z <= length / 2 - 1; z += 2.15) {
      b.box(.06, 1.03, .1, m.steel, [x + side * .025, -.83, z]);
      b.ball(.05, m.brass, [x + side * .07, -.42, z]);
      b.ball(.05, m.brass, [x + side * .07, -1.24, z]);
    }
    // Grind rails and narrow deck edge strips keep the playable center open.
    b.cyl(.055, .055, length - 1.8, m.paleBrass, [side * (width / 2 - .23), .31, 0], [PI / 2, 0, 0]);
    for (let z = -length / 2 + 1; z < length / 2; z += 2.8) b.box(.09, .33, .12, m.steel, [side * (width / 2 - .23), .15, z]);
    b.box(.16, .016, length - 1, m.yellow, [side * (width / 2 - .58), .009, 0], undefined, .003);
    for (let z = -length / 2 + 1.2; z <= length / 2 - 1.1; z += 3.4) {
      b.box(.78, .019, .65, m.hazard, [side * (width / 2 - .60), .013, z], undefined, .003);
    }
    for (const end of [-1, 1]) {
      const z = end * (length / 2 - .8);
      anchor(b, side * (width / 2 - .8), .58, z);
      anchors.push({ x: side * (width / 2 - .8), y: .92, z });
      b.box(.3, .22, .18, m.warm, [x, -.45, z]);
    }
  }
  // Inset bolted access hatches break up the diamond-plate roof.
  for (const z of [-length * .30, 0, length * .30]) {
    b.box(width * .42, .025, 1.35, m.steel, [0, .006, z], undefined, .02);
    b.box(width * .39, .028, 1.2, m.deck, [0, .018, z], undefined, .015);
    for (const x of [-width * .18, width * .18]) for (const dz of [-.47, .47]) b.ball(.035, m.brass, [x, .038, z + dz]);
  }
  for (let z = -length / 2 + 2.7; z < length / 2 - 1; z += 2.7) b.box(width - .8, .007, .023, m.dark, [0, .004, z], undefined, .001);
  for (const z of [-length / 2 + .27, length / 2 - .27]) b.box(width - .65, .027, .3, m.hazard, [0, .019, z], undefined, .004);

  const addObstacle = (type, x, z, w, d, h, scale = 1) => {
    const prop = createProp(type); prop.position.set(x, 0, z); prop.scale.setScalar(scale); group.add(prop);
    obstacles.push({ x, z, width: w, depth: d, height: h, object: prop });
  };
  if (kind === 'cargo' || kind === 'armored' || kind === 'military' || kind === 'freight') {
    for (const side of [-1, 1]) {
      const x = side * (width / 2 - 1.35), z = side * length * .16;
      addObstacle('crate', x, z, 1.7, 2.1, 1.35);
      if (kind !== 'cargo') addObstacle('panel', x, -z - 2, 1.8, .45, 1.85);
    }
  } else if (kind === 'tanker' || kind === 'fuel') {
    for (const side of [-1, 1]) {
      const x = side * (width / 2 - 1.34), tankLength = Math.min(14, length - 5);
      b.cyl(1.07, 1.07, tankLength, index % 2 ? m.cream : m.teal, [x, 1.25, 0], [PI / 2, 0, 0], 28);
      for (const end of [-1, 1]) b.ball(1.07, index % 2 ? m.cream : m.teal, [x, 1.25, end * tankLength / 2], [1, 1, .37]);
      for (let z = -tankLength / 2 + .7; z < tankLength / 2; z += 2.4) {
        b.ring(1.095, .057, m.brass, [x, 1.25, z]);
        b.box(2.13, .18, .22, m.steel, [x, .12, z]);
      }
      b.cyl(.34, .40, .14, m.red, [x, 2.36, -.9]);
      b.ring(.30, .034, m.brass, [x, 2.45, -.9], [PI / 2, 0, 0]);
      b.pipe([[x - side * .55, 2.2, -tankLength / 2 + 1], [x - side * .55, 2.57, 0], [x - side * .55, 2.2, tankLength / 2 - 1]], .045, m.steel);
      obstacles.push({ x, z: 0, width: 2.23, depth: tankLength + .8, height: 2.64 });
    }
    b.pipe([[-width / 2 + .9, .12, -length * .3], [-width / 2 + .9, .25, 0], [-width / 2 + .9, .12, length * .3]], .13, m.brass);
  } else if (kind === 'generator' || kind === 'engine' || kind === 'power') {
    for (const side of [-1, 1]) addObstacle('generator', side * (width / 2 - 1.35), 0, 1.8, 2.7, 1.9);
  } else if (kind === 'passenger' || kind === 'express') {
    for (const side of [-1, 1]) {
      for (let z = -length / 2 + 2; z <= length / 2 - 2; z += 2.7) {
        b.box(.065, .61, 1.67, m.brass, [side * (width / 2 + .026), -.7, z]);
        b.box(.07, .47, 1.51, m.glass, [side * (width / 2 + .07), -.7, z]);
      }
      b.box(.58, .3, length * .42, m.cream, [side * (width / 2 - .84), .15, 0], undefined, .13);
      obstacles.push({ x: side * (width / 2 - .84), z: 0, width: .6, depth: length * .42, height: .3 });
    }
  }
  if (openFrame && index % 2 === 0) {
    const span = width - 2.0, z = -length * .16;
    b.pipe([[-span / 2, .09, z], [-span / 2, 1.42, z], [-span / 2 + .28, 1.63, z], [span / 2 - .28, 1.63, z], [span / 2, 1.42, z], [span / 2, .09, z]], .14, m.yellow);
    b.box(span - .4, .22, .16, m.hazard, [0, 1.6, z - .10]);
    obstacles.push({ x: 0, z, width: span + .28, depth: .42, height: 1.96, bottom: 1.40, overhead: true });
  }
  b.finish(group);
  const serial = `${kind === 'passenger' ? 'EXPRESS' : 'S.K.R. FREIGHT'} · ${String(index + 1).padStart(2, '0')}`;
  for (const side of [-1, 1]) {
    decal(group, serial, 'HIGH ALTITUDE RAIL AUTHORITY  /  1928', length * .57, openFrame ? .72 : 1.15, [side * (width / 2 + .36), openFrame ? -.75 : -2.05, 0], [0, side * PI / 2, 0]);
    if (!openFrame) decal(group, String(index + 1).padStart(2, '0'), 'SKY / 07', 2.5, 1.3, [side * (width / 2 + .27), -3.44, -length * .35], [0, side * PI / 2, 0]);
  }
  decal(group, String(index + 1).padStart(2, '0'), 'STAY INSIDE THE YELLOW LINE', 2.0, 1.4, [0, .055, length * .30], [-PI / 2, 0, 0], true);
  group.userData = { kind, length, width, obstacles, anchors, deckHeight: 0 };
  return mergeStatic(group);
}

export function createLocomotive() {
  const group = createCar({ kind: 'locomotive', length: 26, width: 9, color: 0x9e302c });
  group.name = 'The Iron Run — No. 07 locomotive';
  const b = new Batch(), m = M();
  // Streamlined lower prow, a split boiler and a cockpit allow roof traversal.
  const nose = loft([[-3.2, .8, .8], [-2.6, 2.6, 1.7], [-1.2, 4.1, 2.4], [-.2, 4.18, 2.1]], 20);
  b.add(nose, m.red, [0, 0, -11.1]); nose.dispose();
  b.ball(3.96, m.red, [0, -3.2, -11.16], [1, .79, .66]);
  b.ring(2.43, .15, m.brass, [0, -2.74, -13.5]);
  b.cyl(.83, .83, .16, m.steel, [0, -2.74, -13.74], [PI / 2, 0, 0], 24);
  b.cyl(.67, .67, .19, m.red, [0, -2.74, -13.77], [PI / 2, 0, 0], 24);
  for (let a = 0; a < PI * 2; a += PI / 4) b.ball(.07, m.brass, [Math.cos(a) * .71, -2.74 + Math.sin(a) * .71, -13.89]);
  b.box(8.1, .22, .18, m.cream, [0, -.72, -13.25]);
  for (const side of [-1, 1]) {
    const x = side * 3.13;
    b.cyl(.84, .84, 11.7, m.red, [x, .57, -1.5], [PI / 2, 0, 0], 24);
    b.box(1.8, .24, 12.0, m.steel, [x, .10, -1.5], undefined, .1);
    b.cyl(.7, .8, .3, m.iron, [x, .58, -7.48], [PI / 2, 0, 0], 24);
    b.ring(.61, .095, m.brass, [x, .58, -7.66]);
    for (const z of [-6.3, -3.9, -1.5, .9, 3.3]) b.ring(.86, .042, m.brass, [x, .57, z]);
    b.pipe([[x - side * .85, .5, -6], [x - side * 1.0, 1, -5], [x - side * 1.0, 1, 3], [x, 1.25, 4]], .075, m.brass);
    for (let z = -5.3; z < 4; z += .46) b.box(.43, .03, .17, m.dark, [x + side * .42, 1.31, z], [0, 0, side * -.34]);
    b.cyl(.45, .57, 2.46, m.steel, [x, 2.26, -4.5]);
    b.cyl(.68, .43, .47, m.dark, [x, 3.68, -4.5]);
    b.ring(.61, .07, m.brass, [x, 3.91, -4.5], [PI / 2, 0, 0]);
    b.ring(.49, .045, m.brass, [x, 2.02, -4.5], [PI / 2, 0, 0]);
    b.ring(.49, .045, m.brass, [x, 2.23, -4.5], [PI / 2, 0, 0]);
    b.pipe([[x, 1.36, 2.8], [x, 2.01, 3.2], [x, 2.01, 4.2], [x, 1.45, 4.6]], .12, m.brass);
    b.box(.41, .18, 21, m.cream, [side * 4.53, -2.12, -.4]);
    b.pipe([[side * 4.6, -3.8, -10.8], [side * 4.9, -3.5, -8], [side * 4.9, -3.5, 8], [side * 4.6, -3.8, 10]], .14, m.brass);
    turbine(b, side * 5.0, -1.7, 3.0, .8, 4.0, m.red);
    b.box(1.0, .23, 3.4, m.steel, [side * 4.3, -1.3, 3]);
    group.userData.obstacles.push({ x, z: -1.5, width: 1.9, depth: 12, height: 3.98 });
    b.box(1.7, 1.9, 3.1, m.red, [side * 3.15, .95, 7.4], undefined, .20);
    b.box(1.54, .71, .065, m.glass, [side * 3.15, 1.34, 5.81]);
    b.box(.065, .71, 2.3, m.glass, [side * 4.025, 1.34, 7.4]);
    b.box(1.9, .21, 3.6, m.steel, [side * 3.15, 1.99, 7.4], undefined, .12);
    b.box(1.59, .08, .07, m.brass, [side * 3.15, .94, 5.76]);
    b.box(.07, .08, 2.7, m.brass, [side * 4.07, .94, 7.4]);
    group.userData.obstacles.push({ x: side * 3.15, z: 7.4, width: 1.9, depth: 3.6, height: 2.1 });
    b.cyl(.42, .42, .3, m.brass, [side * 2.8, -.24, -13.25], [PI / 2, 0, 0]);
    b.cyl(.32, .32, .32, m.warm, [side * 2.8, -.24, -13.30], [PI / 2, 0, 0]);
  }
  // Cowcatcher fan, visible from the flying approach.
  for (let i = -5; i <= 5; i++) {
    b.pipe([[i * .68, -4.72, -12.85], [i * .79, -5.92, -13.7], [i * .76, -6.12, -14.0]], .087, m.brass);
  }
  b.box(8.8, .20, .22, m.steel, [0, -6.1, -14.0]);
  b.finish(group);
  decal(group, 'IRON RUN', 'SKYRAIL No. 07', 5.8, 1.25, [0, .048, -8.7], [-PI / 2, 0, 0]);
  group.userData.smokeStacks = [v3(-3.13, 4.02, -4.5), v3(3.13, 4.02, -4.5)];
  return mergeStatic(group);
}

export function createProp(type = 'crate') {
  const group = new THREE.Group(), b = new Batch(), m = M(); group.name = type;
  if (type === 'fuel') {
    b.cyl(.47, .51, 1.43, m.red, [0, .78, 0], undefined, 20);
    b.cyl(.42, .48, .15, m.steel, [0, 1.52, 0]);
    for (const y of [.21, .58, 1.14, 1.41]) b.ring(.495, .037, m.brass, [0, y, 0], [PI / 2, 0, 0]);
    b.cyl(.12, .12, .11, m.brass, [.2, 1.63, 0]);
    b.box(.47, .36, .027, m.cream, [0, .86, -.495]);
    b.box(.23, .23, .04, m.red, [0, .86, -.516], [0, 0, PI / 4]);
    b.box(1.22, .12, 1.22, m.steel, [0, .06, 0]);
    group.userData = { explosive: true, height: 1.72, width: 1.2, depth: 1.2 };
  } else if (type === 'generator') {
    b.box(1.7, .22, 2.5, m.steel, [0, .11, 0], undefined, .10);
    b.box(1.38, 1.35, 2.05, m.teal, [0, .88, 0], undefined, .18);
    b.box(1.16, .11, 1.8, m.cream, [0, 1.58, 0], undefined, .04);
    for (const side of [-1, 1]) {
      b.cyl(.19, .19, 2.17, m.brass, [side * .75, 1.12, 0], [PI / 2, 0, 0]);
      for (let z = -.75; z <= .76; z += .22) b.box(.07, .55, .09, m.dark, [side * .705, .76, z]);
    }
    b.box(1.04, .71, .055, m.steel, [0, 1.02, -1.07]);
    for (let i = -1; i <= 1; i++) {
      b.cyl(.105, .105, .06, m.brass, [i * .3, 1.14, -1.115], [PI / 2, 0, 0]);
      b.cyl(.079, .079, .069, m.cream, [i * .3, 1.14, -1.13], [PI / 2, 0, 0]);
      b.box(.025, .1, .013, m.dark, [i * .3, 1.15, -1.17], [0, 0, -.7 + i * .5]);
      b.ball(.055, i === 0 ? m.danger : m.glow, [i * .3, .87, -1.14]);
    }
    b.pipe([[.3, 1.5, .6], [.3, 1.8, .6], [-.3, 1.8, .6], [-.3, 1.5, .6]], .065, m.brass);
    group.userData = { height: 1.9, width: 1.8, depth: 2.6, generator: true };
  } else if (type === 'turret') {
    b.cyl(.71, .86, .2, m.steel, [0, .1, 0]);
    b.cyl(.42, .51, .42, m.red, [0, .41, 0]);
    b.cyl(.58, .58, .16, m.brass, [0, .67, 0]);
    b.box(.97, .51, 1.1, m.steel, [0, 1.04, -.05], undefined, .15);
    b.box(.61, .36, .82, m.red, [0, 1.22, .05], undefined, .08);
    for (const side of [-1, 1]) {
      b.cyl(.22, .22, .16, m.brass, [side * .55, 1.03, 0], [0, 0, PI / 2]);
      b.cyl(.105, .145, 1.33, m.dark, [side * .24, 1.08, -.91], [PI / 2, 0, 0]);
      b.ring(.14, .03, m.brass, [side * .24, 1.08, -1.47]);
      for (let z = -.55; z > -1.25; z -= .19) b.ring(.13, .021, m.iron, [side * .24, 1.08, z]);
    }
    b.box(.25, .16, .12, m.danger, [0, 1.36, -.4]);
    for (let i = 0; i < 8; i++) b.ball(.055, m.brass, [Math.cos(i * PI / 4) * .69, .22, Math.sin(i * PI / 4) * .69]);
    group.userData = { turret: true, height: 1.48, width: 1.6, depth: 2.2 };
  } else if (type === 'panel') {
    b.box(1.74, 1.76, .18, m.steel, [0, .9, 0], undefined, .12);
    b.box(1.48, 1.48, .19, m.red, [0, .94, -.03], undefined, .1);
    b.box(1.42, .25, .22, m.hazard, [0, .39, -.06]);
    b.box(.89, .07, .13, m.brass, [0, 1.07, -.2]);
    for (const x of [-.63, .63]) for (const y of [.37, 1.54]) b.ball(.045, m.brass, [x, y, -.17]);
    b.box(1.9, .10, .65, m.steel, [0, .05, 0]);
    group.userData = { rippable: true, height: 1.85, width: 1.9, depth: .65 };
  } else {
    b.box(1.55, 1.14, 1.87, m.teal, [0, .69, 0], undefined, .10);
    for (const x of [-.77, .77]) {
      b.box(.10, 1.31, 2.03, m.steel, [x, .68, 0]);
      for (const z of [-.95, .95]) b.box(.23, 1.31, .15, m.brass, [x, .68, z]);
    }
    for (const z of [-.93, .93]) {
      b.box(1.49, .14, .11, m.cream, [0, .3, z]);
      b.box(1.49, .12, .11, m.cream, [0, 1.1, z]);
      b.box(.28, .13, .12, m.brass, [0, .84, z * 1.045]);
      rivetLine(b, [-.57, .28, z * 1.02], [.57, .28, z * 1.02], 5, m.brass, .026);
    }
    for (const x of [-.43, .43]) b.box(.15, .11, 1.88, m.brass, [x, 1.29, 0]);
    b.box(.67, .025, .52, m.hazard, [0, 1.31, 0]);
    group.userData = { height: 1.35, width: 1.7, depth: 2.1, rippable: true };
  }
  b.finish(group); return group;
}

export function createAirship({ boss = false } = {}) {
  const group = new THREE.Group(), b = new Batch(), m = M();
  group.name = boss ? 'The Admiral — armoured carrier' : 'Aurelia freight zeppelin';
  const anchors = [], obstacles = [];
  if (boss) {
    // Twin lifting hulls give a readable aircraft-carrier silhouette and an open deck.
    b.box(20, 1.6, 72, m.red, [0, -1.02, 0], undefined, .62);
    b.box(19.8, .38, 71.8, m.steel, [0, -.22, 0], undefined, .14);
    b.box(19.4, .09, 70.9, m.deck, [0, -.045, 0], undefined, .035);
    for (const side of [-1, 1]) {
      const hull = loft([[-36, .2, .18], [-32, 2.9, 3.2], [-25, 4.1, 4.3], [-12, 4.6, 4.7], [12, 4.6, 4.7], [27, 3.2, 3.8], [35, .4, .6]], 32);
      b.add(hull, m.steel, [side * 13.2, -1.7, 0], [PI / 2, 0, 0]); hull.dispose();
      for (let z = -29; z <= 29; z += 5.8) {
        b.ring(4.28, .12, m.brass, [side * 13.2, -1.7, z]);
        b.box(2.8, .28, 1.0, m.steel, [side * 10.2, -.9, z]);
      }
      b.box(1.1, .05, 64, m.hazard, [side * 8.8, .03, 0]);
      b.box(.19, .31, 64, m.brass, [side * 9.7, .17, 0]);
      for (let z = -29; z <= 29; z += 11.6) {
        anchor(b, side * 8.3, .57, z); anchors.push({ x: side * 8.3, y: .94, z });
        b.box(2.2, .3, 3.6, m.red, [side * 7.5, .17, z]);
      }
      for (const z of [-20, 3, 23]) turbine(b, side * 16.2, -4.0, z, 2.25, 7.2, m.red);
      // Tall bridge wings never span the central path.
      b.box(3.4, 3.6, 10.5, m.red, [side * 7.1, 1.8, 15.8], undefined, .38);
      b.box(3.5, 1.1, 7.9, m.glass, [side * 7.1, 3.3, 15.3], undefined, .17);
      b.box(4.0, .35, 11.0, m.cream, [side * 7.1, 4.02, 15.8], undefined, .13);
      b.cyl(.1, .16, 7.8, m.brass, [side * 7.1, 6.3, 17.8]);
      b.box(3.0, .09, .1, m.brass, [side * 7.1, 8.75, 17.8]);
      b.ball(.22, m.danger, [side * 7.1, 10.3, 17.8]);
      obstacles.push({ x: side * 7.1, z: 15.8, width: 4, depth: 11, height: 4.2 });
      for (const z of [-24, -8, 7]) {
        const turret = createProp('turret'); turret.position.set(side * 6.9, .16, z); turret.scale.setScalar(1.5); group.add(turret);
        obstacles.push({ x: side * 6.9, z, width: 2.4, depth: 3.3, height: 2.4, object: turret });
      }
    }
    b.box(.1, .012, 58, m.cream, [-2.25, .017, -4]);
    b.box(.1, .012, 58, m.cream, [2.25, .017, -4]);
    for (let z = -30; z <= 29; z += 6) b.box(.28, .014, 2.3, m.yellow, [0, .019, z]);
    const stern = loft([[-4.2, 1.7, 3], [-2.7, 5.5, 4.4], [-.25, 9.2, 5.7]], 20);
    b.add(stern, m.red, [0, 0, -33]); stern.dispose();
    b.finish(group);
    decal(group, 'ADMIRAL', 'IMPERIAL AERIAL FLEET / A–01', 12, 3.7, [0, .064, 8], [-PI / 2, 0, 0]);
    group.userData = { boss: true, length: 72, width: 20, anchors, obstacles, deckHeight: 0 };
    return mergeStatic(group);
  }
  const hull = loft([[-34, .03, .03], [-31, 2.2, 2.6], [-25, 5.5, 5.6], [-16, 7.8, 7.3], [0, 8.6, 8.0], [17, 7.1, 6.6], [29, 3.5, 3.6], [35, .1, .1]], 40);
  b.add(hull, m.cream, [0, 13.4, 0], [PI / 2, 0, 0]); hull.dispose();
  for (let z = -26; z < 28; z += 6.5) {
    const r = 8.25 * Math.sqrt(Math.max(.1, 1 - (z / 35) ** 2));
    b.add(torus(r, .037, 4, 48), m.brass, [0, 13.4, z], undefined, [1, .94, 1]);
  }
  // Hull gores and the red longitudinal livery emphasize the shaped volume.
  for (let k = 0; k < 12; k++) {
    const a = k * PI / 6, points = [];
    for (let z = -30; z <= 30; z += 5) {
      const r = 8.25 * Math.sqrt(Math.max(.02, 1 - (z / 33) ** 2));
      points.push([Math.cos(a) * r, 13.4 + Math.sin(a) * r * .94, z]);
    }
    b.pipe(points, k === 0 || k === 6 ? .17 : .025, k === 0 || k === 6 ? m.red : m.brass);
  }
  b.box(5.8, 2.6, 18.5, m.red, [0, 1.35, 0], undefined, .75);
  b.box(5.4, .3, 17.7, m.steel, [0, .13, 0], undefined, .14);
  b.box(5.2, 1.6, 6.2, m.glass, [0, 3.1, -5.1], undefined, .3);
  b.box(5.6, .27, 7, m.cream, [0, 3.98, -5.1], undefined, .12);
  for (const side of [-1, 1]) {
    for (const z of [-6.2, -1.5, 4.5]) {
      b.pipe([[side * 2.2, 3.0, z], [side * 4.0, 7.4, z]], .1, m.steel);
      b.box(.065, .85, 1.3, m.warm, [side * 2.93, 1.7, z]);
    }
    turbine(b, side * 5.25, 3.6, 7, 1.15, 4.6, m.red);
    b.box(3.2, .2, 2, m.steel, [side * 3.8, 3.6, 7]);
  }
  const finShape = new THREE.Shape();
  finShape.moveTo(-1, 0); finShape.lineTo(6.5, 1); finShape.lineTo(12, 7); finShape.lineTo(2, 4); finShape.closePath();
  const fin = new THREE.ExtrudeGeometry(finShape, { depth: .22, bevelEnabled: true, bevelSize: .09, bevelThickness: .09, bevelSegments: 1, steps: 1 });
  for (const a of [0, PI / 2, PI, -PI / 2]) b.add(fin, m.red, [0, 13.4, 21], [0, PI / 2, a]);
  fin.dispose();
  b.finish(group);
  for (const side of [-1, 1]) decal(group, 'AURELIA', 'TRANS-OCEANIC AIR POST', 24, 4.5, [side * 8.17, 13.4, 0], [0, side * PI / 2, 0], true);
  group.userData = { length: 70, width: 18, anchors: [{ x: 0, y: 4.3, z: -5 }], obstacles: [], background: true };
  return group;
}

const WEAPON_IDS = ['repeater', 'thunder', 'scatter', 'harpoon', 'flare'];
function weaponId(type) {
  if (typeof type === 'number') return WEAPON_IDS[type] || 'repeater';
  const str = String(type || 'repeater').toLowerCase();
  if (str.includes('coil') || str.includes('thunder')) return 'thunder';
  if (str.includes('scatter') || str.includes('shotgun')) return 'scatter';
  if (str.includes('harpoon')) return 'harpoon';
  if (str.includes('flare')) return 'flare';
  return 'repeater';
}

export function createWeapon(type = 'repeater') {
  const id = weaponId(type), group = new THREE.Group(), b = new Batch(), m = M();
  group.name = `Weapon: ${id}`;
  // Weapons use their grip as origin and fire along -Z.
  b.box(.13, .26, .16, m.leather, [0, -.06, .055], [.17, 0, 0], .035);
  b.box(.17, .17, .43, m.steel, [0, .12, -.08], undefined, .04);
  b.ring(.072, .012, m.brass, [.01, -.055, -.09], [0, PI / 2, 0]);
  let muzzle = -.8;
  if (id === 'repeater') {
    b.box(.13, .21, .36, m.wood, [0, .075, .30], [.08, 0, 0], .045);
    b.box(.14, .13, .32, m.wood, [0, .08, -.39], undefined, .04);
    b.cyl(.034, .052, .69, m.iron, [0, .155, -.66], [PI / 2, 0, 0]);
    b.cyl(.046, .046, .38, m.brass, [0, .084, -.53], [PI / 2, 0, 0]);
    b.box(.04, .055, .06, m.steel, [0, .21, -.92]);
    b.cyl(.043, .043, .29, m.dark, [0, .28, -.17], [PI / 2, 0, 0]);
    b.ring(.045, .012, m.brass, [0, .28, -.32]);
    b.box(.1, .18, .16, m.brass, [0, -.025, -.23], [.13, 0, 0]);
    muzzle = -1.01;
  } else if (id === 'thunder') {
    b.box(.26, .24, .47, m.teal, [0, .15, -.24], undefined, .055);
    b.cyl(.081, .081, .49, m.glow, [0, .18, -.61], [PI / 2, 0, 0]);
    for (let z = -.42; z >= -.82; z -= .08) b.ring(.12, .019, m.brass, [0, .18, z]);
    for (const x of [-.16, .16]) {
      b.box(.052, .052, .39, m.steel, [x, .18, -.79]);
      b.ball(.053, m.glow, [x, .18, -.985]);
    }
    b.cyl(.09, .09, .30, m.red, [.18, .15, -.12], [PI / 2, 0, 0]);
    b.pipe([[-.13, .27, .02], [-.22, .33, -.3], [-.1, .25, -.52]], .025, m.brass);
    muzzle = -1.03;
  } else if (id === 'scatter') {
    b.box(.21, .21, .35, m.red, [0, .13, -.21], undefined, .05);
    for (const x of [-.068, .068]) {
      b.cyl(.065, .061, .45, m.steel, [x, .17, -.52], [PI / 2, 0, 0]);
      b.ring(.065, .012, m.brass, [x, .17, -.75]);
      b.cyl(.048, .048, .006, m.dark, [x, .17, -.755], [PI / 2, 0, 0]);
    }
    b.box(.17, .095, .25, m.wood, [0, .065, -.47], undefined, .025);
    b.box(.16, .18, .28, m.wood, [0, .12, .24], [.15, 0, 0], .04);
    for (let i = 0; i < 4; i++) b.cyl(.025, .025, .12, m.brass, [.125, .13, -.12 - i * .05]);
    muzzle = -.78;
  } else if (id === 'harpoon') {
    b.box(.18, .2, .64, m.wood, [0, .13, -.3], undefined, .05);
    b.box(.05, .055, 1.05, m.brass, [0, .24, -.51]);
    b.cyl(.025, .025, .95, m.iron, [0, .27, -.55], [PI / 2, 0, 0]);
    const head = new THREE.ConeGeometry(.065, .22, 4);
    b.add(head, m.iron, [0, .27, -1.06], [-PI / 2, 0, 0]); head.dispose();
    b.cyl(.155, .155, .19, m.steel, [0, .045, -.35], [0, 0, PI / 2]);
    for (let i = -2; i <= 2; i++) b.ring(.145, .016, m.brass, [i * .034, .045, -.35], [0, PI / 2, 0]);
    for (const x of [-.11, .11]) b.box(.055, .06, .66, m.steel, [x, .23, -.46]);
    muzzle = -1.16;
  } else {
    b.box(.19, .20, .23, m.red, [0, .14, -.16], undefined, .05);
    b.cyl(.095, .082, .29, m.brass, [0, .19, -.40], [PI / 2, 0, 0]);
    b.ring(.10, .021, m.red, [0, .19, -.555]);
    b.cyl(.07, .07, .01, m.dark, [0, .19, -.56], [PI / 2, 0, 0]);
    b.cyl(.045, .045, .05, m.iron, [.12, .1, -.17], [0, 0, PI / 2]);
    muzzle = -.59;
  }
  b.finish(group);
  const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: .92, depthWrite: false });
  flashMaterial.userData.skyrailOwned = true;
  const flash = mesh(new THREE.ConeGeometry(.11, .28, 7), flashMaterial, [0, .17, muzzle - .13], [-PI / 2, 0, 0]);
  flash.visible = false; flash.castShadow = false; group.add(flash);
  group.userData = { id, muzzle: v3(0, .17, muzzle), flash };
  return group;
}

function limbMesh(length, topRadius, bottomRadius, depth, material) {
  return mesh(loft([[0, topRadius * .65, depth * .75], [-.04, topRadius, depth], [-length * .72, bottomRadius * 1.04, depth * .88], [-length, bottomRadius, depth * .76]], 10), material);
}

function makeLeg(side, enemy) {
  const m = M(), leg = new THREE.Group(); leg.position.set(side * .128, .88, 0);
  const upper = limbMesh(.405, .12, .084, .115, m.cloth); leg.add(upper);
  const shin = new THREE.Group(); shin.position.y = -.395; leg.add(shin);
  shin.add(limbMesh(.35, .083, .064, .085, enemy ? m.dark : m.cloth));
  const b = new Batch();
  b.box(.145, .15, .073, m.iron, [0, -.035, -.09], undefined, .033);
  b.box(.18, .19, .33, m.leather, [0, -.343, -.047], undefined, .053);
  b.box(.193, .049, .352, m.dark, [0, -.435, -.052], undefined, .015);
  b.box(.17, .065, .10, m.iron, [0, -.325, -.181], undefined, .021);
  b.box(.188, .028, .058, m.brass, [0, -.405, -.192]);
  b.box(.175, .051, .17, m.steel, [0, -.25, .01]);
  b.box(.188, .026, .12, m.glow, [0, -.369, .098]);
  b.finish(shin);
  return { leg, shin };
}

function makeArm(side, enemy) {
  const m = M(), arm = new THREE.Group(); arm.position.set(side * .265, 1.365, 0);
  arm.add(limbMesh(.295, .105, .073, .11, enemy ? m.red : m.jacket));
  const shoulder = mesh(sphere(.12), enemy ? m.steel : m.leather, [side * .008, -.035, -.002], undefined, [1.03, .66, 1.05]); arm.add(shoulder);
  const forearm = new THREE.Group(); forearm.position.y = -.28; arm.add(forearm);
  forearm.add(limbMesh(.255, .079, .059, .083, enemy ? m.red : m.jacket));
  const b = new Batch();
  b.box(.16, .082, .17, m.leather, [0, -.206, 0], undefined, .025);
  b.ball(.075, m.leather, [0, -.285, -.006], [.89, 1.18, .8]);
  if (side === -1 && !enemy) {
    b.box(.13, .21, .1, m.steel, [-.038, -.12, -.06], undefined, .029);
    b.cyl(.067, .067, .05, m.brass, [-.038, -.12, -.127], [PI / 2, 0, 0]);
    b.cyl(.044, .044, .055, m.glow, [-.038, -.12, -.14], [PI / 2, 0, 0]);
    b.pipe([[-.09, -.04, 0], [-.13, -.14, .04], [-.075, -.22, .03]], .012, m.brass);
  }
  b.finish(forearm);
  const hand = new THREE.Group(); hand.position.set(0, -.27, -.016); forearm.add(hand);
  return { arm, forearm, hand };
}

export function createCharacter({ enemy = false, type = 'guard' } = {}) {
  const group = new THREE.Group(), m = M(); group.name = enemy ? `Aerial ${type}` : 'Ari — sky courier';
  const root = new THREE.Group(); group.add(root);
  const torso = new THREE.Group(); root.add(torso);
  const b = new Batch();
  const heavy = enemy && (type === 'shield' || type === 'hunter');
  const coat = enemy ? (type === 'sniper' ? m.teal : type === 'engineer' ? m.yellow : m.red) : m.jacket;
  const jacketGeo = loft([[.88, .145, .13], [.95, .19, .14], [1.17, .202, .135], [1.36, .245, .145], [1.40, .19, .12]], 12);
  b.add(jacketGeo, coat); jacketGeo.dispose();
  b.box(.32, .15, .24, m.cloth, [0, .86, 0], undefined, .045);
  b.box(.4, .071, .294, m.leather, [0, .944, 0], undefined, .018);
  b.box(.069, .055, .025, m.brass, [0, .948, -.161]);
  b.box(.018, .37, .025, m.brass, [0, 1.19, -.144]);
  for (const side of [-1, 1]) {
    b.box(.063, .47, .034, m.leather, [side * .114, 1.19, -.138], [0, 0, side * -.14], .009);
    b.box(.06, .085, .034, m.brass, [side * .101, 1.11, -.164], undefined, .008);
    b.box(.104, .115, .044, coat, [side * .146, 1.22, -.137], undefined, .012);
    b.box(.09, .032, .049, m.leather, [side * .146, 1.264, -.157], undefined, .009);
    b.box(.10, .14, .10, m.leather, [side * .208, .93, .014], undefined, .017);
    b.box(.025, .06, .11, m.brass, [side * .239, .94, .014], undefined, .008);
  }
  // Collar, compact flight pack, canister, belt pouches and a sidearm holster.
  b.ring(.116, .048, m.cream, [0, 1.407, 0], [PI / 2, 0, 0]);
  b.box(.31, .4, .19, m.leather, [0, 1.18, .213], [.03, 0, 0], .057);
  b.box(.25, .11, .20, m.canvas, [0, 1.377, .215], undefined, .04);
  b.box(.035, .37, .025, m.brass, [-.08, 1.18, .322]);
  b.box(.035, .37, .025, m.brass, [.08, 1.18, .322]);
  b.cyl(.073, .073, .25, m.steel, [-.205, 1.20, .21]);
  b.ring(.077, .012, m.brass, [-.205, 1.3, .21], [PI / 2, 0, 0]);
  b.box(.11, .28, .10, m.leather, [.211, .755, .02], [0, 0, -.13], .023);
  b.box(.066, .11, .09, m.steel, [.226, .902, .02], [0, 0, -.2]);
  if (heavy) b.box(.34, .30, .095, m.steel, [0, 1.22, -.17], undefined, .045);
  if (enemy && type === 'rusher') {
    b.box(.061, .51, .042, m.cream, [0, 1.16, -.165], [0, 0, -.55], .008);
    for (const side of [-1, 1]) {
      b.box(.041, .31, .035, m.iron, [side * .235, .91, -.09], [0, 0, side * -.33], .008);
      b.box(.13, .025, .04, m.brass, [side * .265, 1.063, -.09], [0, 0, side * -.33]);
    }
  }
  if (enemy && type === 'engineer') {
    for (let i = 0; i < 3; i++) b.box(.035, .15 + i * .014, .035, m.iron, [-.14 + i * .058, .969, -.194], undefined, .008);
    b.box(.18, .03, .045, m.leather, [-.078, .91, -.199]);
  }
  if (enemy && type === 'hunter') {
    b.box(.34, .052, .048, m.brass, [0, 1.36, -.21]);
    b.cyl(.069, .069, .047, m.glow, [0, 1.21, -.233], [PI / 2, 0, 0]);
  }
  if (enemy && (type === 'jet' || type === 'jet-trooper' || type === 'hunter')) {
    for (const side of [-1, 1]) {
      b.cyl(.09, .13, .43, m.iron, [side * .17, 1.22, .34]);
      b.cyl(.085, .064, .08, m.glow, [side * .17, .977, .34]);
    }
  }
  b.finish(torso);
  const head = new THREE.Group(); head.position.y = 1.44; torso.add(head);
  const hb = new Batch();
  const face = loft([[0, .07, .075], [.045, .088, .092, 0, -.009], [.14, .107, .097], [.245, .102, .101, 0, .006], [.295, .073, .076, 0, .012], [.31, .012, .02, 0, .012]], 14);
  hb.add(face, m.skin); face.dispose();
  hb.ball(.037, m.skin, [-.106, .14, 0], [.65, 1, .7]); hb.ball(.037, m.skin, [.106, .14, 0], [.65, 1, .7]);
  hb.box(.042, .046, .043, m.skin, [0, .127, -.102], undefined, .016);
  hb.box(.051, .012, .011, m.leather, [0, .067, -.09], undefined, .003);
  // Leather flying cap with a sculpted brow; enemy variants get a metal crown.
  const cap = loft([[.178, .112, .102, 0, .013], [.254, .112, .108, 0, .015], [.308, .071, .074, 0, .012], [.326, .006, .008]], 14);
  hb.add(cap, enemy ? m.steel : m.leather); cap.dispose();
  hb.box(.206, .024, .11, enemy ? m.red : m.leather, [0, .209, -.095], [-.14, 0, 0], .013);
  for (const side of [-1, 1]) {
    hb.ring(.041, .009, m.brass, [side * .048, .183, -.102]);
    hb.cyl(.034, .034, .018, enemy ? m.danger : m.glass, [side * .048, .183, -.103], [PI / 2, 0, 0]);
    hb.box(.024, .108, .087, enemy ? m.steel : m.leather, [side * .105, .133, .019], undefined, .01);
  }
  hb.box(.027, .013, .021, m.brass, [0, .185, -.119]);
  if (enemy) {
    hb.box(.119, .073, .065, m.dark, [0, .083, -.104], undefined, .025);
    for (const side of [-1, 1]) hb.cyl(.027, .027, .024, m.brass, [side * .065, .074, -.132], [PI / 2, 0, 0]);
  }
  hb.finish(head);
  const left = makeLeg(-1, enemy), right = makeLeg(1, enemy);
  root.add(left.leg, right.leg);
  const leftArm = makeArm(-1, enemy), rightArm = makeArm(1, enemy);
  torso.add(leftArm.arm, rightArm.arm);
  const scarf = new THREE.Group(); scarf.position.set(-.078, 1.397, .11); torso.add(scarf);
  const scarfMaterial = enemy ? m.dark : m.scarf;
  const scarfBand = mesh(torus(.128, .039, 7, 18), scarfMaterial, [0, 1.427, 0], [PI / 2, 0, 0]); torso.add(scarfBand);
  const scarfPieces = []; let scarfParent = scarf;
  for (let i = 0; i < 4; i++) {
    const part = new THREE.Group(); if (i) part.position.z = .12;
    scarfParent.add(part);
    part.add(mesh(bevelBox(.11 - i * .013, .018, .145, .005), scarfMaterial, [0, 0, .064]));
    scarfPieces.push(part); scarfParent = part;
  }
  const weaponMount = new THREE.Group(); weaponMount.rotation.x = -PI / 2; rightArm.hand.add(weaponMount);
  const weapon = createWeapon(enemy && type === 'sniper' ? 'harpoon' : 'repeater'); weaponMount.add(weapon);
  let shield = null;
  if (enemy && type === 'shield') {
    shield = createProp('panel'); shield.scale.set(.47, .59, .6); shield.position.set(-.11, -.38, -.08); leftArm.forearm.add(shield);
  }
  const rig = { root, torso, head, leftLeg: left.leg, rightLeg: right.leg, leftShin: left.shin, rightShin: right.shin, leftArm: leftArm.arm, rightArm: rightArm.arm, leftForearm: leftArm.forearm, rightForearm: rightArm.forearm, leftHand: leftArm.hand, rightHand: rightArm.hand, scarf: scarfPieces, weaponMount, weapon, shield, phase: Math.random() * PI * 2, enemy, type };
  group.userData = { rig, height: 1.8, enemy, type };
  for (const part of [torso, head, left.leg, right.leg, left.shin, right.shin, leftArm.arm, rightArm.arm, leftArm.forearm, rightArm.forearm, weapon]) mergeCharacterPart(part);
  if (heavy) root.scale.set(1.13, 1.03, 1.12);
  animateCharacter(group, { time: 0, speed: 0, grounded: true, state: 'idle' }, 1);
  return group;
}

export function animateCharacter(group, { time = 0, speed = 0, grounded = true, state = 'idle', aim = false, attack = false, weapon } = {}, dt = .016) {
  const r = group.userData.rig; if (!r) return;
  const name = String(state).toLowerCase();
  const run = clamp(Math.abs(speed) / 8, 0, 1.45);
  const t = time * (8 + run * 3) + r.phase;
  const stride = Math.sin(t) * .67 * Math.min(1.3, run);
  const blend = 1 - Math.exp(-Math.min(.1, dt) * 16);
  const pose = { bodyY: 0, bodyX: 0, bodyZ: 0, ll: stride, rl: -stride, ls: Math.max(0, -Math.sin(t)) * 1.1 * run, rs: Math.max(0, Math.sin(t)) * 1.1 * run, la: -stride * .7, ra: -.28 + stride * .22, lf: -.25 - run * .4, rf: -.65 - run * .12, laz: .09, raz: -.09 };
  pose.bodyY = grounded ? Math.abs(Math.cos(t)) * .035 * run + Math.sin(time * 2.2 + r.phase) * .007 : 0;
  pose.bodyX = grounded ? -.075 * run : .07;
  pose.bodyZ = grounded ? Math.sin(t) * .025 * run : .03;
  if (!grounded || name.includes('jump') || name.includes('fall') || name.includes('air')) {
    pose.ll = -.46; pose.rl = .2; pose.ls = .76; pose.rs = .46;
    pose.la = -.8; pose.ra = -.45; pose.laz = .32; pose.raz = -.32;
  }
  if (name.includes('slide')) {
    pose.bodyY = -.61; pose.bodyX = -.42; pose.ll = -1.25; pose.rl = -.5;
    pose.ls = .24; pose.rs = 1.52; pose.la = .45; pose.ra = -.8;
  } else if (name.includes('grind')) {
    pose.bodyY = -.17; pose.ll = -.31; pose.rl = -.24; pose.ls = .65; pose.rs = .57;
    pose.la = -.35; pose.ra = -.34; pose.laz = 1.02; pose.raz = -1.05; pose.bodyZ = Math.sin(time * 3) * .11;
  } else if (name.includes('wall')) {
    pose.bodyZ = name.includes('left') ? -.36 : .36; pose.la = -.8; pose.laz = .68;
    pose.ll = stride * .7 - .4; pose.rl = -stride * .7 - .4; pose.ls = .6; pose.rs = .6;
  } else if (name.includes('grapple') || name.includes('swing') || name.includes('pull') || name.includes('sling') || name.includes('hang')) {
    pose.la = -2.6; pose.lf = -.24; pose.laz = .11; pose.ra = -.55;
    pose.ll = -.27; pose.rl = .21; pose.ls = .57; pose.rs = .84; pose.bodyX = -.18;
  } else if (name.includes('vault') || name.includes('mantle')) {
    pose.la = -1.68; pose.ra = -1.54; pose.ll = -1.18; pose.rl = -.42;
    pose.ls = 1.4; pose.rs = .56; pose.bodyX = -.32;
  } else if (name.includes('glid')) {
    pose.la = -2.77; pose.ra = -2.77; pose.laz = .30; pose.raz = -.30;
    pose.ll = .12; pose.rl = .1; pose.ls = .28; pose.rs = .31;
  }
  if (aim || name.includes('shoot') || r.enemy) {
    pose.ra = -1.46; pose.rf = -.13; pose.raz = -.10;
    if (!name.includes('grapple') && !name.includes('swing')) { pose.la = -.9; pose.lf = -.58; pose.laz = .78; }
  }
  if (name.includes('reload')) { pose.ra = -.84; pose.rf = -.76; pose.la = -1.16; pose.lf = -.77; }
  if (name.includes('melee')) { pose.ra = -1.6 + Math.sin(time * 22) * 1.2; pose.rl = -1.12; pose.rs = .1; pose.bodyZ = -.3; }
  if (name.includes('dead')) { pose.bodyY = -.7; pose.bodyZ = 1.4; pose.ll = -.25; pose.rl = .25; }
  const lerp = (obj, key, value) => { obj[key] += (value - obj[key]) * blend; };
  lerp(r.root.position, 'y', pose.bodyY);
  lerp(r.torso.rotation, 'x', pose.bodyX); lerp(r.root.rotation, 'z', pose.bodyZ);
  lerp(r.leftLeg.rotation, 'x', -pose.ll); lerp(r.rightLeg.rotation, 'x', -pose.rl);
  lerp(r.leftShin.rotation, 'x', -pose.ls); lerp(r.rightShin.rotation, 'x', -pose.rs);
  lerp(r.leftArm.rotation, 'x', -pose.la); lerp(r.rightArm.rotation, 'x', -pose.ra);
  lerp(r.leftArm.rotation, 'z', pose.laz); lerp(r.rightArm.rotation, 'z', pose.raz);
  lerp(r.leftForearm.rotation, 'x', -pose.lf); lerp(r.rightForearm.rotation, 'x', -pose.rf);
  r.head.rotation.y = aim && typeof aim === 'number' ? clamp(aim, -.7, .7) : Math.sin(time * .53 + r.phase) * (run > .1 ? .015 : .065);
  r.head.rotation.x = -pose.bodyX * .45;
  for (let i = 0; i < r.scarf.length; i++) {
    r.scarf[i].rotation.x = Math.sin(time * 11 - i * 1.1) * (.13 + run * .09) - .16;
    r.scarf[i].rotation.y = Math.sin(time * 6.5 - i * .7) * .13;
  }
  if (weapon !== undefined && weaponId(weapon) !== r.weapon.userData.id) {
    const old = r.weapon; r.weaponMount.remove(old);
    old.traverse(child => { if (child.isMesh) { if (child.userData.ownedGeometry) child.geometry.dispose(); if (child.userData.ownedMaterial) child.material.dispose(); } });
    r.weapon = createWeapon(weapon); mergeCharacterPart(r.weapon); r.weaponMount.add(r.weapon);
  }
  r.weapon.userData.flash.visible = Boolean(attack) && !name.includes('melee') && Math.sin(time * 65) > -.35;
  r.weapon.position.z = attack ? .018 + Math.sin(time * 50) * .013 : 0;
}

export function createGlider() {
  const group = new THREE.Group(), b = new Batch(), m = M();
  group.name = 'Kestrel folding courier glider';
  // Swept, cambered fabric wings with exposed wooden ribs and steel cables.
  for (const side of [-1, 1]) {
    const positions = [], uv = [], indices = [];
    const sections = 12;
    for (let i = 0; i <= sections; i++) {
      const f = i / sections, x = side * (f * 3.6 + .1);
      const sweep = f * .65, chord = 1.62 - f * .88;
      for (let j = 0; j <= 4; j++) {
        const g = j / 4;
        positions.push(x, .19 * Math.sin(g * PI) - f * .10, sweep + (g - .4) * chord);
        uv.push(f, g);
        if (i < sections && j < 4) {
          const n = i * 5 + j, k = n + 5;
          indices.push(n, k, n + 1, k, k + 1, n + 1);
        }
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals();
    const fabric = m.canvas.clone(); fabric.side = THREE.DoubleSide; fabric.userData.skyrailOwned = true;
    group.add(mesh(geo, fabric));
    for (let i = 0; i <= 6; i++) {
      const f = i / 6, x = side * (f * 3.6 + .1), sweep = f * .65, chord = 1.62 - f * .88;
      b.pipe([[x, -f * .1, sweep - chord * .4], [x, .19 - f * .1, sweep + chord * .1], [x, -f * .1, sweep + chord * .6]], .018, m.wood);
    }
    b.pipe([[side * .12, 0, -.66], [side * 1.8, -.04, -.12], [side * 3.7, -.1, .34]], .04, m.red);
    b.pipe([[side * .12, 0, .98], [side * 1.8, -.04, 1.05], [side * 3.7, -.1, 1.10]], .035, m.wood);
    b.pipe([[0, -.77, .2], [side * 2.7, -.075, .2]], .011, m.iron);
    b.pipe([[0, .31, .45], [side * 2.7, -.075, .2]], .011, m.iron);
    b.pipe([[side * .14, 0, 0], [side * .52, -.72, .13], [side * .33, -.79, -.23]], .033, m.steel);
    b.box(.34, .016, .79, m.red, [side * 2.9, -.063, .69], [0, -.1 * side, 0], .003);
  }
  b.box(.21, .24, 2.43, m.red, [0, .04, .38], undefined, .072);
  b.box(1.13, .07, .7, m.canvas, [0, .12, 1.74], [0, 0, .02], .026);
  b.box(.09, .62, .73, m.red, [0, .42, 1.75], [.13, 0, 0], .04);
  b.cyl(.16, .21, .5, m.steel, [0, .035, -.98], [PI / 2, 0, 0]);
  b.box(.065, 1.25, .037, m.wood, [0, .035, -1.26], [0, 0, .45], .017);
  b.ball(.09, m.brass, [0, .035, -1.29]);
  b.box(.79, .07, .073, m.leather, [0, -.79, -.23]);
  b.finish(group); group.userData = { width: 7.4, length: 3.4 };
  return group;
}
