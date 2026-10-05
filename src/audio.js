// SKYRAIL's score and sound palette are generated locally. No network or audio assets.
export function createAudio() {
  let ctx, output, master, musicBus, sfxBus, windGain, windFilter, engineGain, engineOsc, grindGain, grindFilter;
  let noiseBuffer, impulse, room, roomGain, musicRoom, unlocked = false, disposed = false;
  let nextStep = 0, step = 0, lastThunder = 0, lastClack = 0, clock = 0;
  let current = { speed: 0, combat: 0, boss: false, storm: 0, grinding: false, paused: false };
  const volumes = { master: .7, music: .4, sfx: .8 };
  const voices = new Set(), cooldowns = new Map();
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const note = midi => 440 * 2 ** ((midi - 69) / 12);

  function ramp(param, value, seconds = .12) {
    if (!ctx) return;
    param.setTargetAtTime(Math.max(0, value), ctx.currentTime, seconds);
  }

  function initialize() {
    if (ctx || disposed) return;
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    ctx = new AudioContext();
    master = ctx.createGain(); musicBus = ctx.createGain(); sfxBus = ctx.createGain();
    output = ctx.createDynamicsCompressor(); output.threshold.value = -12; output.knee.value = 14; output.ratio.value = 5; output.attack.value = .003; output.release.value = .22;
    musicBus.connect(master); sfxBus.connect(master); master.connect(output); output.connect(ctx.destination);
    master.gain.value = volumes.master; musicBus.gain.value = volumes.music; sfxBus.gain.value = volumes.sfx;
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0); let pink = 0;
    for (let i = 0; i < data.length; i++) { const white = Math.random() * 2 - 1; pink = pink * .97 + white * .03; data[i] = white * .55 + pink * 1.6; }
    impulse = ctx.createBuffer(2, ctx.sampleRate * 1.25, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = impulse.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3 * .6; }
    room = ctx.createConvolver(); room.buffer = impulse; roomGain = ctx.createGain(); roomGain.gain.value = .17; room.connect(roomGain); roomGain.connect(sfxBus);
    musicRoom = ctx.createConvolver(); musicRoom.buffer = impulse; const musicRoomGain = ctx.createGain(); musicRoomGain.gain.value = .22; musicRoom.connect(musicRoomGain); musicRoomGain.connect(musicBus);
    const wind = ctx.createBufferSource(); wind.buffer = noiseBuffer; wind.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 520; windFilter.Q.value = .3;
    windGain = ctx.createGain(); windGain.gain.value = .005; wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(sfxBus); wind.start();
    const lowWind = ctx.createOscillator(); lowWind.type = 'sine'; lowWind.frequency.value = .17;
    const modulation = ctx.createGain(); modulation.gain.value = 115; lowWind.connect(modulation); modulation.connect(windFilter.frequency); lowWind.start();
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 38;
    const engineFilter = ctx.createBiquadFilter(); engineFilter.type = 'lowpass'; engineFilter.frequency.value = 135; engineFilter.Q.value = .65;
    engineGain = ctx.createGain(); engineGain.gain.value = .018; engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(sfxBus); engineOsc.start();
    const grind = ctx.createBufferSource(); grind.buffer = noiseBuffer; grind.loop = true;
    grindFilter = ctx.createBiquadFilter(); grindFilter.type = 'bandpass'; grindFilter.frequency.value = 1300; grindFilter.Q.value = 2;
    grindGain = ctx.createGain(); grindGain.gain.value = 0; grind.connect(grindFilter); grindFilter.connect(grindGain); grindGain.connect(sfxBus); grind.start();
    nextStep = ctx.currentTime + .12;
    // Ambient nodes have a fixed lifetime matching the context.
    voices.add({ nodes: [wind, lowWind, modulation, windFilter, windGain, engineOsc, engineFilter, engineGain, grind, grindFilter, grindGain], permanent: true });
  }

  async function unlock() {
    if (disposed) return false;
    try {
      initialize();
      if (!ctx) return false;
      if (ctx.state === 'suspended') await ctx.resume();
      unlocked = ctx.state === 'running';
      if (unlocked && nextStep < ctx.currentTime) nextStep = ctx.currentTime + .08;
      return unlocked;
    } catch { return false; }
  }

  function destination(position, bus = sfxBus) {
    if (!position) return { input: bus, nodes: [] };
    const pan = ctx.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 7; pan.maxDistance = 550; pan.rolloffFactor = .65;
    pan.positionX.value = Number(position.x) || 0; pan.positionY.value = Number(position.y) || 0; pan.positionZ.value = Number(position.z) || 0;
    pan.connect(bus); return { input: pan, nodes: [pan] };
  }

  function synth({ frequency = 200, end = frequency, duration = .2, gain = .12, type = 'sine', time = ctx.currentTime, position, bus = sfxBus, attack = .003, cutoff = 0, reverb = false, detune = 0 }) {
    if (voices.size > 100) return;
    const osc = ctx.createOscillator(), envelope = ctx.createGain(), route = destination(position, bus), nodes = [osc, envelope, ...route.nodes];
    osc.type = type; osc.frequency.setValueAtTime(Math.max(20, frequency), time); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), time + duration); osc.detune.value = detune;
    envelope.gain.setValueAtTime(.0001, time); envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, gain), time + attack); envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    if (cutoff) { const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff; osc.connect(filter); filter.connect(envelope); nodes.push(filter); } else osc.connect(envelope);
    envelope.connect(route.input); if (reverb) envelope.connect(bus === musicBus ? musicRoom : room);
    const voice = { nodes }; voices.add(voice);
    osc.onended = () => { nodes.forEach(n => n.disconnect()); voices.delete(voice); };
    osc.start(time); osc.stop(time + duration + .03);
  }

  function noise({ duration = .12, gain = .15, frequency = 1200, end = frequency, type = 'bandpass', q = .7, position, time = ctx.currentTime, bus = sfxBus, attack = .002, reverb = false }) {
    if (voices.size > 100) return;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain(), route = destination(position, bus);
    source.buffer = noiseBuffer; filter.type = type; filter.Q.value = q; filter.frequency.setValueAtTime(Math.max(20, frequency), time); filter.frequency.exponentialRampToValueAtTime(Math.max(20, end), time + duration);
    envelope.gain.setValueAtTime(.0001, time); envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, gain), time + attack); envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(route.input); if (reverb) envelope.connect(bus === musicBus ? musicRoom : room);
    const nodes = [source, filter, envelope, ...route.nodes], voice = { nodes }; voices.add(voice);
    source.onended = () => { nodes.forEach(n => n.disconnect()); voices.delete(voice); };
    source.start(time, Math.random() * .5); source.stop(time + duration + .03);
  }

  function play(name, position) {
    if (!ctx || !unlocked || disposed || current.paused) return;
    name = String(name).toLowerCase(); const now = ctx.currentTime;
    const cooldown = name.includes('step') ? .09 : name.includes('hit') ? .04 : .015;
    if (now - (cooldowns.get(name) ?? -999) < cooldown) return;
    cooldowns.set(name, now);
    const n = options => noise({ position, ...options });
    const s = options => synth({ position, ...options });
    if (/explosion|explode|boom/.test(name)) {
      n({ duration: 1.65, gain: .9, frequency: 1500, end: 80, type: 'lowpass', reverb: true });
      s({ frequency: 75, end: 23, gain: .66, duration: .95 });
      n({ duration: .19, gain: .5, frequency: 5500, end: 400 });
    } else if (/weatherthunder|distantthunder/.test(name)) {
      n({ duration: 2.4, gain: .65, frequency: 460, end: 60, type: 'lowpass', attack: .05, reverb: true });
      s({ frequency: 44, end: 24, duration: 1.8, gain: .22 });
    } else if (/shotgun|scatter/.test(name)) {
      n({ duration: .32, gain: .8, frequency: 3500, end: 380, type: 'lowpass', reverb: true }); s({ frequency: 110, end: 35, duration: .24, gain: .43 });
      n({ duration: .12, gain: .24, frequency: 2400, time: now + .23 });
    } else if (/railgun|railshot|coil|sniper|thunder/.test(name)) {
      s({ frequency: 1200, end: 90, type: 'sawtooth', duration: .38, gain: .16, cutoff: 5000, reverb: true });
      n({ duration: .18, gain: .6, frequency: 7200, end: 600 }); s({ frequency: 80, end: 30, duration: .3, gain: .28 });
    } else if (/harpoon/.test(name)) {
      s({ frequency: 170, end: 38, duration: .26, gain: .35 }); n({ duration: .18, gain: .46, frequency: 2000, end: 450 });
      s({ frequency: 740, end: 290, duration: .34, gain: .09, type: 'triangle', reverb: true });
    } else if (/flare/.test(name)) {
      s({ frequency: 240, end: 60, duration: .2, gain: .28 }); n({ duration: .65, gain: .37, frequency: 3900, end: 850, reverb: true });
    } else if (/shoot|fire|rifle|pistol|smg|carbine|weapon|repeater|enemyshot/.test(name)) {
      n({ duration: .13, gain: .41, frequency: 3900, end: 450, type: 'lowpass', reverb: true });
      s({ frequency: 150, end: 48, duration: .11, gain: .25 }); n({ duration: .04, gain: .11, frequency: 7500, time: now + .06 });
    } else if (/grapple|hook|cable/.test(name)) {
      if (/attach|hit|latch/.test(name)) {
        [340, 570, 910].forEach((f, i) => s({ frequency: f, end: f * .77, gain: .11 / (i + 1), type: 'triangle', duration: .3, reverb: true }));
        n({ duration: .08, gain: .34, frequency: 3300 });
      } else {
        n({ duration: .28, gain: .3, frequency: 1500, end: 7000, q: 2 });
        s({ frequency: 480, end: 140, type: 'sawtooth', duration: .22, gain: .08, cutoff: 2500 });
      }
    } else if (/dash|swing|glide|whoosh|slingshot|melee/.test(name)) {
      n({ duration: .43, gain: .33, frequency: 900, end: 6200, q: .9, attack: .055 });
    } else if (/hit|impact|land|metal|damage/.test(name)) {
      const hard = /land|impact/.test(name);
      n({ duration: hard ? .21 : .09, gain: hard ? .35 : .21, frequency: hard ? 1400 : 3700, end: 350 });
      [240, 418, 749].forEach((f, i) => s({ frequency: f, end: f * .96, duration: .2 + i * .07, gain: .09 / (i + 1), type: 'triangle' }));
      if (hard) s({ frequency: 86, end: 42, gain: .25, duration: .17 });
    } else if (/reloaddone|equip/.test(name)) {
      n({ duration: .07, gain: .2, frequency: 2900 }); s({ frequency: 720, end: 480, duration: .1, gain: .07, type: 'triangle' });
    } else if (/reload/.test(name)) {
      [0, .15, .34].forEach((offset, i) => { n({ duration: .055, gain: .16, frequency: 2100 + i * 700, time: now + offset }); s({ frequency: 530 + i * 140, gain: .055, duration: .06, type: 'square', cutoff: 1300, time: now + offset }); });
    } else if (/jump/.test(name)) {
      n({ duration: .15, gain: .15, frequency: 800, end: 2600 }); s({ frequency: 115, end: 70, duration: .09, gain: .1 });
    } else if (/step|foot/.test(name)) {
      n({ duration: .06, gain: .09, frequency: 1500, end: 700 }); s({ frequency: 120, end: 70, duration: .045, gain: .065 });
    } else if (/pickup|upgrade|reward|complete|success/.test(name)) {
      [74, 81, 86, 88].forEach((m, i) => s({ frequency: note(m), duration: .4, gain: .09, type: 'sine', time: now + i * .07, reverb: true }));
    } else if (/alarm|warning|boss/.test(name)) {
      [0, .3, .6].forEach(t => s({ frequency: 390, end: 510, duration: .2, gain: .12, type: 'triangle', time: now + t, reverb: true }));
    } else if (/death|fail/.test(name)) {
      [57, 53, 45].forEach((m, i) => s({ frequency: note(m), end: note(m - 2), duration: .65, gain: .12, type: 'triangle', time: now + i * .2, reverb: true }));
    } else {
      s({ frequency: 780, end: 510, duration: .065, gain: .04, type: 'sine' });
    }
  }

  function score(time, beat) {
    const boss = Boolean(current.boss), combat = clamp(Number(current.combat) || 0), speed = clamp(current.speed / 65);
    const bar = Math.floor(beat / 16), sixteenth = beat % 16;
    // Original modal progressions: D dorian in traversal, D phrygian for the Admiral.
    const roots = boss ? [38, 39, 34, 36] : [38, 41, 43, 36];
    const root = roots[bar % 4];
    const s = options => synth({ time, bus: musicBus, ...options });
    const n = options => noise({ time, bus: musicBus, ...options });
    if (sixteenth % 4 === 0 || (boss && [7, 14].includes(sixteenth))) {
      s({ frequency: boss ? 130 : 106, end: 39, duration: .27, gain: boss ? .28 : .21 });
      n({ duration: .025, gain: .07, frequency: 2300, type: 'highpass' });
    }
    if (sixteenth === 4 || sixteenth === 12) {
      n({ duration: .16, gain: .11 + combat * .065, frequency: 2200, end: 1100, type: 'highpass' });
      s({ frequency: 181, end: 122, duration: .09, gain: .055, type: 'triangle' });
    }
    if (sixteenth % 2 === 0 || combat > .4 || boss) {
      n({ duration: sixteenth === 14 ? .13 : .04, gain: (.031 + speed * .02) * (sixteenth % 4 === 2 ? 1.5 : 1), frequency: 7200, type: 'highpass' });
    }
    if (sixteenth % 4 === 0 || (combat > .25 && sixteenth === 10)) {
      const octave = sixteenth === 12 ? 12 : 0;
      s({ frequency: note(root + octave), type: 'sawtooth', duration: .27, gain: .105, cutoff: 320 + combat * 380 + speed * 240 });
      s({ frequency: note(root), duration: .3, gain: .075 });
    }
    const arp = boss ? [0, 1, 7, 12, 13, 7, 3, 1] : [0, 7, 12, 14, 7, 12, 3, 7];
    if (sixteenth % 2 === 0) {
      s({ frequency: note(root + 24 + arp[(sixteenth / 2 + bar) % 8]), duration: .3, gain: boss ? .068 : .045, type: 'triangle', cutoff: 1800 + speed * 1900, reverb: true });
    }
    if (sixteenth === 0) {
      [0, boss ? 1 : 3, 7, 14].forEach((interval, i) => s({ frequency: note(root + 24 + interval), duration: 2.25, attack: .3, gain: .019, type: 'sine', detune: i % 2 ? 4 : -4, reverb: true }));
      if (boss) n({ duration: .5, gain: .055, frequency: 8500, type: 'highpass' });
    }
    if ((combat > .45 || boss) && [3, 6, 11, 15].includes(sixteenth)) {
      s({ frequency: [290, 370, 180, 440][sixteenth % 4], end: 140, duration: .09, type: 'triangle', gain: .065 });
      n({ duration: .05, frequency: 3200, gain: .035 });
    }
  }

  function update(dt, state = {}) {
    current = { ...current, ...state };
    if (!ctx || !unlocked || disposed) return;
    dt = Math.min(.1, Math.max(0, dt)); clock += dt;
    const speed = Math.max(0, Number(current.speed) || 0), storm = clamp(Number(current.storm) || 0), paused = Boolean(current.paused);
    ramp(master.gain, volumes.master * (paused ? .35 : 1), .15);
    ramp(windGain.gain, paused ? .015 : .038 + clamp(speed / 75) * .23 + storm * .13, .45);
    ramp(windFilter.frequency, 380 + speed * 15 + storm * 1000, .4);
    ramp(engineGain.gain, paused ? .008 : .024 + Math.min(speed, 80) * .0005, .4);
    ramp(engineOsc.frequency, 31 + speed * .53, .7);
    ramp(grindGain.gain, current.grinding && !paused ? .18 + speed * .002 : 0, .035);
    ramp(grindFilter.frequency, 1150 + speed * 16, .1);
    const listener = current.listener;
    if (listener) {
      const p = listener.position || listener, l = ctx.listener;
      let fx = 0, fy = 0, fz = -1, ux = 0, uy = 1, uz = 0;
      const q = listener.quaternion;
      if (q) {
        fx = -2 * (q.x * q.z + q.w * q.y); fy = -2 * (q.y * q.z - q.w * q.x); fz = -(1 - 2 * (q.x * q.x + q.y * q.y));
        ux = 2 * (q.x * q.y - q.w * q.z); uy = 1 - 2 * (q.x * q.x + q.z * q.z); uz = 2 * (q.y * q.z + q.w * q.x);
      } else if (listener.forward) { ({ x: fx, y: fy, z: fz } = listener.forward); }
      if (l.positionX) {
        l.positionX.value = p.x || 0; l.positionY.value = p.y || 0; l.positionZ.value = p.z || 0;
        l.forwardX.value = fx; l.forwardY.value = fy; l.forwardZ.value = fz; l.upX.value = ux; l.upY.value = uy; l.upZ.value = uz;
      } else { l.setPosition(p.x || 0, p.y || 0, p.z || 0); l.setOrientation(fx, fy, fz, ux, uy, uz); }
    }
    if (paused) { nextStep = ctx.currentTime + .1; return; }
    if (ctx.currentTime - nextStep > .5) nextStep = ctx.currentTime + .05;
    const bpm = (current.boss ? 126 : 108) + clamp(speed / 80) * 16;
    let scheduled = 0;
    while (nextStep < ctx.currentTime + .16 && scheduled++ < 8) { score(nextStep, step++); nextStep += 60 / bpm / 4; }
    if (storm > .55 && clock - lastThunder > 9 + Math.random() * 8) {
      lastThunder = clock; const lp = listener?.position || listener || { x: 0, y: 0, z: 0 };
      play('weatherthunder', { x: (lp.x || 0) + 90, y: (lp.y || 0) + 80, z: (lp.z || 0) - 200 });
    }
    if (speed > 4 && clock - lastClack > Math.max(.16, .65 - speed * .005)) {
      lastClack = clock;
      noise({ duration: .075, gain: .032, frequency: 740 + Math.random() * 600, type: 'bandpass' });
      synth({ frequency: 140, end: 80, duration: .07, gain: .018, type: 'triangle' });
    }
  }

  function setVolumes(values = {}) {
    for (const name of ['master', 'music', 'sfx']) {
      if (values[name] != null && Number.isFinite(Number(values[name]))) { const n = Number(values[name]); volumes[name] = clamp(n > 1 ? n / 100 : n); }
    }
    if (ctx) { ramp(master.gain, volumes.master); ramp(musicBus.gain, volumes.music); ramp(sfxBus.gain, volumes.sfx); }
  }

  function dispose() {
    disposed = true; unlocked = false;
    for (const voice of voices) voice.nodes.forEach(n => { try { n.stop?.(); } catch {} n.disconnect(); });
    voices.clear(); cooldowns.clear();
    if (ctx) { ctx.close(); ctx = null; }
  }
  return { unlock, update, play, setVolumes, dispose };
}
