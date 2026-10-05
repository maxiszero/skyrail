/* Accelerated input-driven playthrough. This is not a manual play session.
 * Only normal movement input, aiming, weapon selection, firing, grapple and F
 * interaction are used. Player/actor positions, health, inventory, cooldowns,
 * target HP, progression and saves are never patched by the pilot.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const runs = Number(process.env.PILOT_RUNS || 2);
const maxSeconds = Number(process.env.PILOT_LIMIT || 600);
const screenshots = path.join(ROOT, 'screenshots');
const output = path.join(ROOT, 'test-results');
fs.mkdirSync(screenshots, { recursive: true });
fs.mkdirSync(output, { recursive: true });
const sourceHashes = () => Object.fromEntries(['game', 'world', 'physics', 'combat', 'assets'].map(name => [name, createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src', `${name}.js`))).digest('hex')]));

async function installPilot(page) {
  // Replace only the wall-clock frame scheduler. The game still executes its
  // ordinary fixed-step tick, and rendering remains its own animate method.
  await page.addInitScript(() => {
    window.requestAnimationFrame = callback => { window.__pilotPendingFrame = callback; return 1; };
  });
  await page.goto('http://127.0.0.1:4177/?test');
  await page.waitForFunction(() => Boolean(window.skyrail?.game));
  await page.locator('[data-action="start"]').first().click();
  await page.waitForFunction(() => skyrail.game.mode === 'playing');
  return page.evaluate(() => {
    const g = skyrail.game;
    const pilot = window.__pilot = {
      seed: g.seed, frames: 0, shots: 0, jumps: 0, hooks: 0, interacts: 0,
      rescues: 0, minHealth: g.health, slides: 0, modes: [], sectors: [],
      lastPosition: g.player.position.clone(), lastProgressTime: 0,
      lastInteract: -10, lastJump: -10, lastHook: -10, lastMode: '',
      previousSector: -1, stopped: null, framesSinceProgress: 0, extractionLanded: false,
    };
    const originalRescue = g.rescue.bind(g);
    g.rescue = () => { pilot.rescues++; originalRescue(); };
    g.combat.switch(3);
    g.useHook(); pilot.hooks++;
    pilot.step = count => {
      const dt = 1 / 120, Vec = g.player.position.constructor;
      for (let frame = 0; frame < count; frame++) {
        if (g.mode !== 'playing') break;
        const p = g.player, now = g.elapsed;
        if (pilot.previousSector !== g.sector) {
          pilot.previousSector = g.sector;
          pilot.sectors.push({ sector: g.sector, biome: g.biome, health: g.health, elapsed: g.elapsed });
          pilot.lastProgressTime = now; pilot.lastPosition.copy(p.position);
        }
        const active = g.world.objectives().filter(t => !g.world.boss || t.phase === g.bossPhase);
        active.sort((a, b) => a.world.distanceTo(p.position) - b.world.distanceTo(p.position));
        let target = active[0];
        let goal;
        if (g.world.boss && g.extractionReady) goal = g.world.extraction.pos.clone().add(new Vec(0, 0, 4));
        else if (target) {
          goal = target.world.clone();
          if (g.world.boss) goal.x = target.body.pos.x + Math.sign(target.local.x) * 4.0;
          else goal.z += 3.1;
        } else goal = g.world.end.pos.clone().add(new Vec(0, 0, 5));

        // Approach normal F sabotage range while retaining the game's checks.
        const canInteract = target && p.position.distanceTo(target.world) < 4.35;
        if (g.world.boss && g.extractionReady && p.support === g.world.extraction && p.grounded) pilot.extractionLanded = true;
        const exitNear = !target && (g.world.boss
          ? p.support === g.world.extraction && p.grounded && p.position.distanceTo(g.world.extraction.pos) < 10.7
          : p.position.distanceTo(g.world.end.pos) < 15.0);
        if ((canInteract || exitNear) && now - pilot.lastInteract > .25) {
          g.interact(); pilot.interacts++; pilot.lastInteract = now;
          if (g.mode !== 'playing' || (target && target.dead)) continue;
        }

        const delta = goal.clone().sub(p.position);
        let distance = Math.hypot(delta.x, delta.z);
        g.keys.clear(); g.pressed.clear();
        if (distance > 1.8) {
          // Head toward the next roof, not the center of the nearest tank.
          let navX = goal.x, navZ = goal.z;
          if (!g.world.boss) {
            const main = g.world.bodies.filter(b => b.kind === 'main');
            const lane = main.find(b => Math.abs(p.position.z - b.pos.z) < b.length / 2 + 4) || main[0];
            if (lane && Math.abs(goal.z - p.position.z) > 7) {
              navX = lane.pos.x; navZ = Math.max(goal.z, p.position.z - 12);
            }
          } else if (!g.extractionReady && p.support === g.world.bossBody) {
            // Bridge wings occupy the sides. Cross to the center before moving
            // longitudinally, then approach each active generator from inboard.
            if (Math.abs(delta.z) > 6) { navX = g.world.bossBody.pos.x; navZ = goal.z; }
          }
          const dx = navX - p.position.x, dz = navZ - p.position.z;
          g.yaw = Math.atan2(-dx, -dz);
          g.keys.add('KeyW');
          if (distance > 9) g.keys.add('ShiftLeft');
        }

        // Jump from the current roof edge; steering in the air uses the same
        // WASD controller. No position correction is applied by this test.
        if (p.support && p.grounded && distance > 7 && now - pilot.lastJump > .65) {
          const b = p.support;
          const dx = -Math.sin(g.yaw), dz = -Math.cos(g.yaw);
          const edgeX = dx > .2 ? (b.pos.x + b.width / 2 - p.position.x) / dx : dx < -.2 ? (b.pos.x - b.width / 2 - p.position.x) / dx : Infinity;
          const edgeZ = dz > .2 ? (b.pos.z + b.length / 2 - p.position.z) / dz : dz < -.2 ? (b.pos.z - b.length / 2 - p.position.z) / dz : Infinity;
          if (Math.min(edgeX, edgeZ) < 3.8) { g.pressed.add('Space'); pilot.jumps++; pilot.lastJump = now; }
        }
        if (p.support && p.grounded) {
          const overhead = p.support.obstacles.find(o => o.overhead && Math.abs(p.position.z - p.support.pos.z - o.z) < 5 && Math.abs(p.position.x - p.support.pos.x - o.x) < o.width / 2);
          if (overhead) { g.keys.add('ControlLeft'); pilot.slides++; }
        }

        if (!p.rope && now - pilot.lastHook > 1.1 && g.hookCooldown <= 0) {
          const bossTransfer = g.world.boss && (!p.support || p.support !== g.world.bossBody) && !g.extractionReady;
          const extractTransfer = g.world.boss && g.extractionReady && !p.grounded;
          const falling = p.position.y < -2.5;
          if ((bossTransfer && !p.grounded && p.position.z < -46) || extractTransfer || falling) {
            g.forward.copy(goal).sub(p.position).setY(0).normalize();
            g.camera.lookAt(goal.clone().add(new Vec(0, 1, 0))); g.camera.updateMatrixWorld();
            g.hookMode = 0; g.useHook(); pilot.hooks++; pilot.lastHook = now;
          }
        }

        // Aim from the normal third-person camera and fire through Combat.fire;
        // line of sight, ammo, rate limits, shield reduction and reload all apply.
        g.cameraUpdate(dt);
        const threats = g.combat.alive().filter(e => e.position.distanceTo(p.position) < 100);
        threats.sort((a, b) => (a.position.distanceTo(p.position) - (a.elite ? 12 : 0)) - (b.position.distanceTo(p.position) - (b.elite ? 12 : 0)));
        const enemy = threats.find(e => g.combat.lineClear(p.position.clone().add(new Vec(0, 1.35, 0)), e.position.clone().add(new Vec(0, 1.05, 0))));
        if (enemy) {
          const aim = enemy.position.clone().add(new Vec(0, 1.05, 0));
          g.camera.lookAt(aim); g.camera.updateMatrixWorld();
          if (enemy.shield && enemy.position.distanceTo(p.position) < 48 && g.hookCooldown <= 0 && !p.rope) {
            g.forward.copy(enemy.position).sub(p.position).setY(0).normalize(); g.hookMode = 4; g.useHook(); g.hookMode = 0; pilot.hooks++;
          }
          if (g.combat.fire()) pilot.shots++;
          if (enemy.position.distanceTo(p.position) < 3.5) g.combat.melee();
        } else {
          // A hunter can take cover behind a boiler. Use the ordinary DRAG
          // grapple mode to bring that close opponent into the open instead of
          // waiting forever for a clear rifle shot. Cooldown and target checks
          // still belong to the production action.
          const covered = threats.find(e => e.position.distanceTo(p.position) < 12);
          if (covered && !p.rope && g.hookCooldown <= 0 && now - pilot.lastHook > 1.2) {
            g.forward.copy(covered.position).sub(p.position).setY(0).normalize();
            g.camera.lookAt(covered.position.clone().add(new Vec(0, 1, 0))); g.camera.updateMatrixWorld();
            g.hookMode = 3; g.useHook(); g.hookMode = 0; pilot.hooks++; pilot.lastHook = now;
          }
          if (!g.combat.reloadTime && g.combat.ammo[g.combat.weaponIndex] < g.combat.capacity) g.combat.reload();
        }

        g.tick(dt); g.effects.update(dt); pilot.frames++;
        pilot.minHealth = Math.min(pilot.minHealth, g.health);
        if (p.position.distanceTo(pilot.lastPosition) > 4) { pilot.lastProgressTime = now; pilot.lastPosition.copy(p.position); }
        if (now - pilot.lastProgressTime > 4 && p.grounded && now - pilot.lastJump > 1.1 && distance > 4) {
          g.pressed.add('Space'); pilot.jumps++; pilot.lastJump = now;
          // Jump is consumed next tick. Step clears only after processing input.
          g.tick(dt); g.effects.update(dt); pilot.frames++;
        }
        if (now - pilot.lastProgressTime > 25) { pilot.stopped = 'No route progress for 25 simulation seconds'; break; }
      }
      // Keep visual state and screenshots representative without rendering every
      // accelerated simulation tick. animate still follows the production path.
      g.animate(g.lastFrame + 1000 / 60); g.updateHUD();
      return { ...g.snapshot(), seed: pilot.seed, kills: g.totalKills, pilot: { frames: pilot.frames, shots: pilot.shots, jumps: pilot.jumps, hooks: pilot.hooks, interacts: pilot.interacts, rescues: pilot.rescues, minHealth: pilot.minHealth, slides: pilot.slides, stopped: pilot.stopped, sectors: pilot.sectors, extractionLanded: pilot.extractionLanded }, target: g.world.objectives().map(t => ({ name: t.name, position: t.world.toArray(), phase: t.phase })), nearby: g.combat.alive().filter(e => e.position.distanceTo(g.player.position) < 30).map(e => ({ type: e.type, hp: e.hp, pos: e.position.toArray() })) };
    };
    return { seed: g.seed };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const reports = [];
  try {
    for (let run = 0; run < runs; run++) {
      const sourcesAtStart = sourceHashes();
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      const initial = await installPilot(page);
      const history = [], captured = new Set();
      let state;
      for (let batch = 0; batch < maxSeconds; batch++) {
        state = await page.evaluate(() => window.__pilot.step(120));
        if (batch % 5 === 0 || state.mode !== 'playing') { history.push(state); console.log(JSON.stringify({ run: run + 1, batch, mode: state.mode, sector: state.sector, phase: state.bossPhase, pos: state.position.map(n => Math.round(n * 10) / 10), health: state.health, objectives: state.objectives, kills: state.kills, score: state.score, pilot: state.pilot })); }
        const captureId = `${state.sector}-${state.bossPhase}`;
        if (!captured.has(captureId) && (state.sector > 0 || batch > 4)) {
          captured.add(captureId);
          await page.screenshot({ path: path.join(screenshots, `pilot-${run + 1}-sector-${state.sector + 1}-phase-${state.bossPhase}.png`) });
        }
        if (state.mode === 'upgrades') {
          const choices = page.locator('[data-action="upgrade"]');
          if (!await choices.count()) throw new Error('Upgrade screen has no actionable choices');
          await choices.first().click();
        }
        if (await page.evaluate(() => skyrail.game.mode === 'routes')) {
          const choices = page.locator('[data-action="route"]');
          const count = await choices.count();
          if (!count) throw new Error('Route screen has no actionable choices');
          await choices.nth(run % count).click();
        }
        if (['victory', 'death'].includes(state.mode) || state.pilot.stopped) break;
      }
      await page.screenshot({ path: path.join(screenshots, `pilot-${run + 1}-result.png`) });
      const sourceUnchanged = JSON.stringify(sourcesAtStart) === JSON.stringify(sourceHashes());
      reports.push({ run: run + 1, seed: initial.seed, sources: sourcesAtStart, sourceUnchanged, method: 'Accelerated fixed-step simulation, normal player inputs and production action methods; no teleports, HP edits, cooldown overrides or direct target damage. Extraction requires an observed grounded landing on the extraction train before normal F interaction.', passed: state.mode === 'victory' && state.pilot.extractionLanded && sourceUnchanged, final: state, errors, history });
      fs.writeFileSync(path.join(output, 'pilot.json'), JSON.stringify(reports, null, 2));
      await context.close();
    }
  } finally { await browser.close(); }
  if (reports.some(r => !r.passed || r.errors.length)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
