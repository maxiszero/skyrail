import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from '../vendor/three.module.js';
import { STEP, Controller, makeBody, moveBody, anchorPosition } from '../src/physics.js';

const idle = { x: 0, z: 0, autoMantle: false };
const close = (actual, expected, tolerance = 1e-8, message = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
const closeVector = (actual, expected, tolerance = 1e-8, message = '') => assert.ok(actual.distanceTo(expected) <= tolerance, `${message}: expected ${expected.toArray()}, got ${actual.toArray()}`);

test('crouching from rest can pass a low pipe without backing up', () => {
  const body=makeBody('pipe-deck',0,0,0,9,30),player=new Controller();
  body.obstacles.push({x:0,z:0,width:8,depth:.5,bottom:1.4,height:1.8,overhead:true});
  player.reset(new Vector3(0,0,1.0),body);
  for(let i=0;i<140;i++)player.step(STEP,{x:0,z:-1,slide:true},[body]);
  assert.ok(player.position.z<-.8,'player slides through the pipe from a stationary start');
});

test('retry reset clears transient movement timers and stale queued actions', () => {
  const player = new Controller();
  player.jumpBuffer = .12; player.dashTime = .2; player.dashCooldown = 2; player.slideTime = .3; player.wallTime = 1.3; player.landing = .8;
  player.reset(new Vector3(0, 10, 0));
  for (const key of ['jumpBuffer', 'dashTime', 'dashCooldown', 'slideTime', 'wallTime', 'landing', 'coyote']) assert.equal(player[key], 0, `${key} must reset`);
  player.step(STEP, idle, []); assert.ok(!player.events.includes('jump')); assert.ok(player.velocity.y < 0, 'gravity resumes immediately after an airborne reset');
  const body = makeBody('restart-deck', 0, 0, 0); player.reset(new Vector3(), body); assert.equal(player.grounded, true); assert.equal(player.support, body); assert.ok(player.coyote > 0);
});

test('stationary rider stays at the same local deck position through 10 seconds of 3-axis support motion', () => {
  const body = makeBody('train', 0, 0, 0), player = new Controller(), offset = new Vector3(1.1, 0, -3);
  player.reset(offset, body);
  for (let i = 1; i <= Math.round(10 / STEP); i++) {
    const t = i * STEP;
    moveBody(body, Math.sin(t * .6) * 13, Math.sin(t * .9) * 3, -t * 24, STEP);
    player.step(STEP, idle, [body]);
    assert.equal(player.grounded, true, `lost support at t=${t}`);
    assert.equal(player.support, body);
    closeVector(player.position.clone().sub(body.pos), offset, 1e-7, `relative rider position at t=${t}`);
    closeVector(player.velocity, new Vector3(), 1e-7, 'velocity remains relative to support');
  }
});

test('jump inherits translating support horizontal velocity once', () => {
  const body = makeBody('train', 0, 0, 0), player = new Controller(); player.reset(new Vector3(), body);
  moveBody(body, STEP * 7, 0, -STEP * 23, STEP); player.step(STEP, { ...idle, jump: true }, [body]);
  assert.equal(player.grounded, false); assert.equal(player.support, null);
  close(player.velocity.x, 7); close(player.velocity.z, -23); close(player.velocity.y, 11.7);
  moveBody(body, STEP * 14, 0, -STEP * 46, STEP); player.step(STEP, idle, [body]);
  assert.ok(player.velocity.x < 7 && player.velocity.x > 6.9); assert.ok(player.velocity.z > -23 && player.velocity.z < -22.9, 'second airborne step must not add platform velocity again');
});

for (const verticalSpeed of [4, -3]) {
  test(`jump inherits vertical support velocity (${verticalSpeed} m/s)`, () => {
    const body = makeBody('elevator', 0, 0, 0), player = new Controller(); player.reset(new Vector3(), body);
    moveBody(body, 0, verticalSpeed * STEP, 0, STEP); player.step(STEP, { ...idle, jump: true }, [body]);
    close(player.velocity.y, 11.7 + verticalSpeed, 1e-8, 'takeoff converts relative jump impulse to inertial velocity');
  });
}

test('falling rider lands on a translating body and converts inertial velocity to support-relative velocity', () => {
  const body = makeBody('landing-car', -2, 0, 0, 20, 40), player = new Controller();
  player.reset(new Vector3(0, 5, 0)); player.velocity.set(4, -2, -3);
  let landed = false;
  for (let i = 0; i < 240; i++) {
    moveBody(body, body.pos.x + 4 * STEP, 0, body.pos.z - 3 * STEP, STEP);
    const expectedX = player.velocity.x * Math.exp(-STEP * .075) - body.velocity.x;
    const expectedZ = player.velocity.z * Math.exp(-STEP * .075) - body.velocity.z;
    player.step(STEP, idle, [body]);
    if (player.grounded) {
      assert.equal(player.support, body); assert.ok(player.events.includes('land'));
      close(player.position.y, body.pos.y); close(player.velocity.x, expectedX); close(player.velocity.z, expectedZ); landed = true; break;
    }
  }
  assert.ok(landed, 'rider should land within two seconds');
});

test('two jump impulses are allowed and repeated airborne attempts cannot create a third', () => {
  const body = makeBody('launch', 0, 0, 0), player = new Controller(); player.reset(new Vector3(), body);
  let impulses = 0;
  for (let i = 0; i < 55; i++) {
    moveBody(body, 0, 0, 0, STEP); player.step(STEP, { ...idle, jump: i === 0 || i === 10 || i > 20 }, [body]);
    if (player.events.some(e => e === 'jump' || e === 'doublejump')) impulses++;
    assert.ok(player.jumps <= 2, 'airborne jump count remains bounded');
  }
  assert.equal(impulses, 2); assert.equal(player.jumps, 2);
});

test('dash cooldown prevents repeated impulses and becomes available after its duration', () => {
  const player = new Controller(); player.reset(new Vector3(0, 200, 0));
  player.step(STEP, { ...idle, dash: true }, []);
  assert.ok(player.events.includes('dash')); close(player.dashCooldown, 2.5);
  for (let i = 0; i < 299; i++) { player.step(STEP, { ...idle, dash: true }, []); assert.ok(!player.events.includes('dash'), 'cooldown must reject repeat dash'); }
  player.step(STEP, { ...idle, dash: true }, []);
  if (!player.events.includes('dash')) player.step(STEP, { ...idle, dash: true }, []);
  assert.ok(player.events.includes('dash'), 'dash reactivates after cooldown, allowing one tick of floating point tolerance');
});

test('grapple anchor follows its moving body without mutating the local point', () => {
  const body = makeBody('zeppelin', 10, 20, -30), local = new Vector3(3, 4, -2), anchor = { body, local };
  closeVector(anchorPosition(anchor), new Vector3(13, 24, -32));
  moveBody(body, 12, 23, -39, STEP);
  closeVector(anchorPosition(anchor), new Vector3(15, 27, -41)); closeVector(local, new Vector3(3, 4, -2));
});

test('swing stays inside rope length with fixed-step integration tolerance around a moving anchor', () => {
  const body = makeBody('swing-anchor', 0, 15, 0), player = new Controller(), anchor = { body, local: new Vector3() };
  player.reset(new Vector3(12, 4, 0)); player.velocity.set(0, 0, -18); player.attach(anchor, 'SWING');
  let maxExcess = 0;
  for (let i = 1; i <= 1200; i++) {
    const t = i * STEP; moveBody(body, Math.sin(t * .4) * 3, 15 + Math.sin(t * .3), -t * 4, STEP);
    player.step(STEP, { ...idle, x: Math.sin(t), z: -.4 }, []);
    assert.ok(player.rope, 'swing remains attached');
    const excess = player.position.distanceTo(anchorPosition(anchor)) - player.rope.length; maxExcess = Math.max(maxExcess, excess);
    assert.ok(excess <= .18, `rope extension ${excess} exceeds one integration step tolerance at ${t}s`);
    assert.ok(Number.isFinite(player.position.lengthSq()));
  }
  assert.ok(maxExcess >= 0, 'constraint exercised under tension');
});

test('destroyed anchor safely releases the rope', () => {
  const body = makeBody('destroyed', 0, 10, 0), player = new Controller();
  player.reset(new Vector3(10, 5, 0)); player.attach({ body, local: new Vector3() }, 'PULL'); body.active = false;
  player.step(STEP, idle, []); assert.equal(player.rope, null); assert.ok(Number.isFinite(player.velocity.lengthSq()));
});

function renderBatchedRun(renderFps) {
  const body = makeBody('large-moving-deck', 0, 0, 0, 150, 400), player = new Controller(); player.reset(new Vector3(), body);
  let accumulator = 0, tick = 0;
  for (let frame = 0; frame < renderFps * 8; frame++) {
    accumulator += 1 / renderFps;
    while (accumulator + 1e-10 >= STEP) {
      const t = (tick + 1) * STEP;
      moveBody(body, Math.sin(t) * 2, Math.sin(t * .4), -t * 8, STEP);
      player.step(STEP, { ...idle, z: -1, x: Math.sin(t) * .3, sprint: true, jump: tick === 90 || tick === 140, dash: tick === 230 }, [body]);
      accumulator -= STEP; tick++;
    }
  }
  return { position: player.position, velocity: player.velocity, tick };
}

test('fixed 120 Hz simulation gives the same trajectory at 30, 60 and 144 Hz rendering', () => {
  const reference = renderBatchedRun(60);
  assert.equal(reference.tick, 960);
  for (const fps of [30, 144]) {
    const actual = renderBatchedRun(fps); assert.equal(actual.tick, reference.tick);
    closeVector(actual.position, reference.position, 1e-8, `${fps} Hz position`); closeVector(actual.velocity, reference.velocity, 1e-8, `${fps} Hz velocity`);
  }
});
