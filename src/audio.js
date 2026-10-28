/* =========================================================
   Основний звук — файли в assets/music, assets/sfx, assets/ambience.
   Синтез лишився як резерв. Файли озвучки — assets/voice.
   Шум для резервного синтезу генерується
   детермінованим ГПВЧ (seeded), без Math.random().
   ========================================================= */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
 
const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, ambBus, voiceBus;
  let enabled = true;
  let noiseBuf = null;
  const fileOk = {};          // name -> true/false (чи є файл)
  let music = null;           // {name, timer, nodes, el}
  let amb = null;
 
  const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
  function f(n) {
    const m = /^([A-G][#b]?)(\d)$/.exec(n);
    if (!m) return 0;
    const midi = NOTE[m[1]] + (parseInt(m[2]) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
 
  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.6; sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.35; ambBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = 0.18; voiceBus.connect(master);
    const r = mulberry32(1615);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    ["click", "ok", "err", "notif", "word", "print", "bell", "step", "paper", "shh", "stamp", "pop", "whoosh", "door", "vibrate", "sparkle", "chime"].forEach(n => probe("assets/sfx/" + n + ".mp3", ok => { fileOk["sfx_" + n] = ok; }));
  }
 
  function tone(freq, t, dur, { type = "sine", gain = 0.2, dest = sfxBus, attack = 0.01, release = 0.08, detune = 0, slide = 0 } = {}) {
    if (!ctx || !freq) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function pluck(freq, t, dur, gain, dest, bright = 2400) {
    if (!ctx) return;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    o.type = "sawtooth"; o2.type = "square"; o.frequency.value = freq; o2.frequency.value = freq * 2;
    fl.type = "lowpass"; fl.frequency.setValueAtTime(bright, t); fl.frequency.exponentialRampToValueAtTime(400, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function noise(t, dur, { gain = 0.2, type = "bandpass", freq = 1200, q = 1, dest = sfxBus, attack = 0.005, sweep = 0 } = {}) {
    if (!ctx) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t); fl.Q.value = q;
    if (sweep) fl.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest);
    s.start(t, (t * 0.37) % 1.5); s.stop(t + dur + 0.05);
  }
 
  /* ---------- SFX ---------- */
  const SFX = {
    click(t) { tone(880, t, 0.05, { type: "triangle", gain: 0.12 }); },
    ok(t) { [523, 659, 784, 1047].forEach((n, i) => tone(n, t + i * 0.07, 0.22, { type: "triangle", gain: 0.16 })); },
    err(t) { tone(120, t, 0.35, { type: "sine", gain: 0.5, slide: 0.5 }); noise(t, 0.12, { gain: 0.15, type: "lowpass", freq: 300 }); },
    notif(t) { tone(1175, t, 0.12, { type: "sine", gain: 0.2 }); tone(1568, t + 0.11, 0.18, { type: "sine", gain: 0.18 }); },
    word(t) { tone(1319, t, 0.1, { type: "triangle", gain: 0.14 }); tone(1760, t + 0.08, 0.25, { type: "triangle", gain: 0.12 }); },
    print(t) { for (let i = 0; i < 22; i++) noise(t + i * 0.11, 0.07, { gain: 0.16, freq: 2400 + (i % 3) * 400, q: 3 }); tone(90, t, 2.5, { type: "sawtooth", gain: 0.03 }); },
    bell(t) { for (let i = 0; i < 14; i++) { tone(1900, t + i * 0.08, 0.07, { type: "square", gain: 0.05 }); tone(2500, t + i * 0.08 + 0.04, 0.05, { type: "sine", gain: 0.05 }); } },
    step(t) { noise(t, 0.06, { gain: 0.08, type: "lowpass", freq: 500 }); },
    paper(t) { noise(t, 0.6, { gain: 0.18, type: "highpass", freq: 2500, sweep: 0.5, attack: 0.05 }); noise(t + 0.35, 0.4, { gain: 0.12, type: "highpass", freq: 3500, attack: 0.03 }); },
    shh(t) { noise(t, 1.2, { gain: 0.2, type: "highpass", freq: 3500, attack: 0.15 }); },
    stamp(t) { tone(80, t, 0.25, { type: "sine", gain: 0.55, slide: 0.6 }); noise(t, 0.08, { gain: 0.3, type: "lowpass", freq: 900 }); },
    pop(t) { for (let i = 0; i < 6; i++) tone(1200 + i * 220, t + i * 0.03, 0.08, { type: "sine", gain: 0.07 }); },
    whoosh(t) { noise(t, 0.6, { gain: 0.15, type: "bandpass", freq: 400, sweep: 6, attack: 0.2 }); },
    door(t) { tone(160, t, 0.2, { type: "triangle", gain: 0.2, slide: 0.7 }); },
    vibrate(t) { for (let i = 0; i < 3; i++) tone(70, t + i * 0.18, 0.12, { type: "sawtooth", gain: 0.12 }); },
    sparkle(t) { [1568, 2093, 2637, 3136, 2637].forEach((n, i) => tone(n, t + i * 0.09, 0.4, { type: "sine", gain: 0.05 })); },
    chime(t) { [784, 988, 1175].forEach((n, i) => tone(n, t + i * 0.18, 1.2, { type: "sine", gain: 0.1 })); }
  };
  function sfx(name) {
    if (!enabled) return;
    init(); if (!ctx) return;
    if (fileOk["sfx_" + name]) { playFile("assets/sfx/" + name + ".mp3", 0.7); return; }
    const fn = SFX[name]; if (fn) fn(ctx.currentTime + 0.01);
  }
 
  /* мовні "бліпи" під час друку тексту */
  let blipN = 0;
  function blip(pitch, whisper) {
    if (!enabled || !ctx) return;
    blipN++;
    if (blipN % 2) return;
    const t = ctx.currentTime;
    if (whisper) { noise(t, 0.05, { gain: 0.05, type: "highpass", freq: 4000, dest: voiceBus }); return; }
    const base = 220 * pitch, steps = [0, 2, 4, 1, 3, 5, 2];
    tone(base * Math.pow(2, steps[blipN % 7] / 12), t, 0.045, { type: "triangle", gain: 0.5, dest: voiceBus, attack: 0.005, release: 0.02 });
  }
 
  /* ---------- Music themes ---------- */
  const THEMES = {
    theme_main: { bpm: 88, wave: "triangle", mel: "A4 1|C5 1|F5 2|E5 1|D5 1|C5 2|D5 1|C5 1|A4 1|G4 1|A4 4|Bb4 1|D5 1|F5 2|E5 1|F5 1|G5 2|F5 1|E5 1|D5 1|E5 1|F5 4",
      chords: ["F3 A3 C4", "C3 E3 G3", "D3 F3 A3", "F3 A3 C4", "Bb2 D3 F3", "C3 E3 G3", "Bb2 D3 G3", "F3 A3 C4"], bass: ["F2", "C2", "D2", "F2", "Bb1", "C2", "G2", "F2"] },
    theme_triumph: { bpm: 104, wave: "square", mel: "A4 .5|C5 .5|F5 1|A5 2|G5 1|F5 1|E5 2|D5 1|C5 1|A4 1|C5 1|F5 4|Bb4 1|D5 1|F5 2|E5 1|F5 1|G5 2|A5 1|G5 1|E5 1|G5 1|F5 4",
      chords: ["F3 A3 C4", "C3 E3 G3", "D3 F3 A3", "F3 A3 C4", "Bb2 D3 F3", "C3 E3 G3", "C3 E3 Bb3", "F3 A3 C4"], bass: ["F2", "C2", "D2", "F2", "Bb1", "C2", "C2", "F2"], drums: true },
    theme_campus: { bpm: 116, wave: "triangle", pluck: true, mel: "G4 .5|B4 .5|D5 .5|B4 .5|C5 .5|E5 .5|D5 1|B4 .5|A4 .5|G4 .5|A4 .5|B4 2|E5 .5|D5 .5|C5 .5|B4 .5|A4 .5|B4 .5|C5 1|D5 3|R 1|G4 .5|B4 .5|D5 .5|G5 .5|F#5 .5|E5 .5|D5 1|C5 .5|B4 .5|A4 .5|B4 .5|C5 2|B4 .5|A4 .5|G4 .5|F#4 .5|A4 1|D5 1|G4 4",
      chords: ["G3 B3 D4", "E3 G3 B3", "C3 E3 G3", "D3 F#3 A3", "G3 B3 D4", "C3 E3 G3", "D3 F#3 A3", "G3 B3 D4"], bass: ["G2", "E2", "C2", "D2", "G2", "C2", "D2", "G2"] },
    theme_baroque: { bpm: 92, harpsi: true, mel: "A5 2|F5 2|G5 2|Bb5 2|A5 2|E5 2|F5 4|F5 2|D5 2|D5 2|G5 2|E5 2|C#5 2|D5 4",
      arps: ["D4 F4 A4 D5 A4 F4 D4 F4", "G3 Bb3 D4 G4 D4 Bb3 G3 Bb3", "A3 C#4 E4 G4 E4 C#4 A3 C#4", "D4 F4 A4 D5 A4 F4 D4 A3", "Bb3 D4 F4 Bb4 F4 D4 Bb3 D4", "G3 Bb3 D4 G4 D4 Bb3 G3 D4", "A3 C#4 E4 A4 E4 C#4 A3 E4", "D4 F4 A4 D5 A4 F4 D4 F4"],
      bass: ["D2", "G2", "A2", "D2", "Bb1", "G2", "A2", "D2"] }
  };
  function compile(th) {
    const ev = []; let beat = 0;
    th.mel.split("|").forEach(tok => {
      const [n, d] = tok.trim().split(" "); const dur = parseFloat(d);
      if (n !== "R") ev.push({ b: beat, n: f(n), d: dur, v: "mel" });
      beat += dur;
    });
    const len = Math.max(beat, 32);
    const bars = 8, perBar = len / bars;
    for (let i = 0; i < bars; i++) {
      const b0 = i * perBar;
      if (th.bass) ev.push({ b: b0, n: f(th.bass[i]), d: perBar * 0.9, v: "bass" });
      if (th.bass) ev.push({ b: b0 + perBar / 2, n: f(th.bass[i]) * 1.5, d: perBar * 0.4, v: "bass" });
      if (th.chords) th.chords[i].split(" ").forEach(n => ev.push({ b: b0, n: f(n), d: perBar * 0.95, v: "pad" }));
      if (th.arps) th.arps[i].split(" ").forEach((n, k) => ev.push({ b: b0 + k * perBar / 8, n: f(n), d: perBar / 8 * 1.6, v: "arp" }));
      if (th.drums) for (let k = 0; k < 4; k++) ev.push({ b: b0 + k * perBar / 4, n: k % 2 ? 1 : 0, d: 0.1, v: "drum" });
    }
    ev.sort((a, b) => a.b - b.b);
    return { ev, len };
  }
  function playEvent(th, e, t, spb) {
    const d = e.d * spb;
    if (e.v === "mel") {
      if (th.harpsi) pluck(e.n, t, Math.min(d * 1.2, 1.6), 0.13, musicBus, 3200);
      else if (th.pluck) { pluck(e.n, t, Math.min(d * 1.3, 0.9), 0.12, musicBus, 2000); }
      else { tone(e.n, t, d * 0.95, { type: th.wave, gain: 0.14, dest: musicBus, attack: 0.02, release: 0.15 }); if (th.wave === "square") tone(e.n / 2, t, d * 0.9, { type: "triangle", gain: 0.06, dest: musicBus }); }
    } else if (e.v === "bass") tone(e.n, t, d, { type: "triangle", gain: 0.16, dest: musicBus, attack: 0.01, release: 0.1 });
    else if (e.v === "pad") tone(e.n, t, d, { type: "sine", gain: 0.035, dest: musicBus, attack: 0.3, release: 0.4 });
    else if (e.v === "arp") pluck(e.n, t, d, 0.07, musicBus, 2600);
    else if (e.v === "drum") { if (e.n) noise(t, 0.12, { gain: 0.12, type: "highpass", freq: 2000, dest: musicBus }); else tone(110, t, 0.2, { gain: 0.3, slide: 0.4, dest: musicBus }); }
  }
 
  function startMusic(name) {
    if (music && music.name === name) return;
    stopMusic();
    music = { name };
    if (!enabled) return;
    init(); if (!ctx) return;
    const m = music;
    probe("assets/music/" + name + ".mp3", ok => {
      if (music !== m) return;
      if (ok) { stopSynth(m); m.el = loopFile("assets/music/" + name + ".mp3", 0.5); }
    });
    const th = THEMES[name]; if (!th) return;
    const c = compile(th), spb = 60 / th.bpm;
    let loopStart = ctx.currentTime + 0.1, idx = 0;
    m.timer = setInterval(() => {
      if (!ctx) return;
      const horizon = ctx.currentTime + 0.25;
      while (true) {
        const e = c.ev[idx];
        const t = loopStart + e.b * spb;
        if (t > horizon) break;
        if (t >= ctx.currentTime - 0.05) playEvent(th, e, t, spb);
        idx++;
        if (idx >= c.ev.length) { idx = 0; loopStart += c.len * spb; }
      }
    }, 60);
  }
  function stopSynth(m) { if (m && m.timer) { clearInterval(m.timer); m.timer = null; } }
  function stopMusic() {
    if (!music) return;
    stopSynth(music);
    if (music.el) { music.el.pause(); music.el = null; }
    music = null;
  }
 
  /* ---------- Ambience ---------- */
  const AMB = {
    yard: { base: { type: "bandpass", freq: 700, q: 0.6, gain: 0.05 }, every: 5.3, ev(t, k) { if (k % 2 === 0) { tone(380, t, 0.25, { type: "sine", gain: 0.05, dest: ambBus, slide: 0.85 }); tone(330, t + 0.3, 0.35, { type: "sine", gain: 0.05, dest: ambBus, slide: 0.9 }); } else noise(t, 0.3, { gain: 0.05, type: "bandpass", freq: 1800, q: 4, dest: ambBus }); } },
    podil: { base: { type: "lowpass", freq: 260, q: 0.7, gain: 0.12 }, every: 7, ev(t, k) { if (k % 3 === 0) { tone(1046, t, 0.5, { type: "triangle", gain: 0.05, dest: ambBus }); tone(1046, t + 0.25, 0.6, { type: "triangle", gain: 0.05, dest: ambBus }); noise(t, 3, { gain: 0.06, type: "lowpass", freq: 180, dest: ambBus, attack: 1 }); } else for (let i = 0; i < 4; i++) noise(t + i * 0.4, 0.05, { gain: 0.04, type: "lowpass", freq: 600, dest: ambBus }); } },
    office: { base: { type: "lowpass", freq: 400, q: 0.5, gain: 0.03 }, every: 2.1, ev(t, k) { if (k % 9 === 4) { for (let i = 0; i < 4; i++) { tone(880, t + i * 0.5, 0.18, { type: "square", gain: 0.03, dest: ambBus }); tone(1100, t + i * 0.5 + 0.09, 0.18, { type: "square", gain: 0.03, dest: ambBus }); } } else { const pat = [0, .12, .2, .37, .5, .58, .7, .9]; pat.forEach(p => noise(t + p, 0.03, { gain: 0.06, type: "bandpass", freq: 3000, q: 2, dest: ambBus })); } } },
    library: { base: { type: "lowpass", freq: 300, q: 0.4, gain: 0.015 }, every: 6.5, ev(t) { noise(t, 0.5, { gain: 0.04, type: "highpass", freq: 3000, sweep: 0.6, attack: 0.1, dest: ambBus }); } },
    evening: { base: { type: "bandpass", freq: 500, q: 0.5, gain: 0.025 }, every: 9, ev(t) { tone(523, t, 3, { type: "sine", gain: 0.03, dest: ambBus, attack: 0.01 }); tone(784, t, 3, { type: "sine", gain: 0.015, dest: ambBus, attack: 0.01 }); } }
  };
  function startAmb(name) {
    if (amb && amb.name === name) return;
    stopAmb();
    amb = { name };
    if (!enabled || !name) return;
    init(); if (!ctx) return;
    const a = AMB[name]; if (!a) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = a.base.type; fl.frequency.value = a.base.freq; fl.Q.value = a.base.q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(a.base.gain, ctx.currentTime + 1.5);
    s.connect(fl); fl.connect(g); g.connect(ambBus); s.start();
    amb.src = s; amb.g = g;
    let k = 0;
    amb.timer = setInterval(() => { if (ctx) a.ev(ctx.currentTime + 0.05, k++); }, a.every * 1000);
    const current = amb, url = "assets/ambience/" + name + ".mp3";
    probe(url, ok => {
      if (!ok || amb !== current) return;
      if (current.timer) { clearInterval(current.timer); current.timer = null; }
      if (current.src) {
        try { current.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12); current.src.stop(ctx.currentTime + 0.5); } catch (e) {}
        current.src = null;
      }
      current.el = loopFile(url, 0.45);
    });
  }
  function stopAmb() {
    if (!amb) return;
    if (amb.timer) clearInterval(amb.timer);
    if (amb.src && ctx) { try { amb.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); amb.src.stop(ctx.currentTime + 1); } catch (e) {} }
    if (amb.el) { amb.el.pause(); amb.el = null; }
    amb = null;
  }
 
  /* ---------- Files (озвучка, музика) ---------- */
  function probe(url, cb) {
    if (fileOk[url] !== undefined) { cb(fileOk[url]); return; }
    let done = false;
    const a = new Audio();
    const fin = ok => { if (done) return; done = true; fileOk[url] = ok; cb(ok); };
    a.addEventListener("canplaythrough", () => fin(true), { once: true });
    a.addEventListener("error", () => fin(false), { once: true });
    setTimeout(() => fin(false), 2500);
    try { a.src = url; a.load(); } catch (e) { fin(false); }
  }
  function playFile(url, vol = 1) { try { const a = new Audio(url); a.volume = vol; a.play().catch(() => {}); return a; } catch (e) { return null; } }
  function loopFile(url, vol) { const a = playFile(url, vol); if (a) a.loop = true; return a; }
  let voiceEl = null;
  function voice(id) {
    if (!enabled || !id) return;
    stopVoice();
    const url = "assets/voice/" + id + ".mp3";
    if (fileOk[url] === false) return;
    probe(url, ok => { if (ok && enabled) voiceEl = playFile(url, 1); });
  }
  function stopVoice() { if (voiceEl) { voiceEl.pause(); voiceEl = null; } }
  function hasVoice(id) { return fileOk["assets/voice/" + id + ".mp3"] === true; }
 
  function setEnabled(v) {
    enabled = v;
    if (!v) { const m = music && music.name, a = amb && amb.name; stopMusic(); stopAmb(); stopVoice(); music = m ? { name: m, off: true } : null; amb = a ? { name: a, off: true } : null; }
    else { init(); const m = music && music.name, a = amb && amb.name; music = null; amb = null; if (m) startMusic(m); if (a) startAmb(a); }
  }
  return { init, sfx, blip, startMusic, stopMusic, startAmb, stopAmb, voice, stopVoice, hasVoice, setEnabled, get enabled() { return enabled; }, tone, noise };
})();
 
