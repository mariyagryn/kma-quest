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
    Object.keys(SFX).forEach(n => probe("assets/sfx/" + n + ".mp3", ok => { fileOk["sfx_" + n] = ok; }));
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
    // далекі київські дзвони (власний мотив); резерв, якщо немає assets/sfx/bells.mp3
    bells(t) {
      [["C5", 0.1], ["A4", 0.6], ["F4", 1.1], ["C5", 1.6], ["D5", 2.1], ["C5", 2.6], ["A4", 3.1], ["F4", 3.7]].forEach(([n, d]) => { tone(f(n), t + d, 3, { type: "sine", gain: 0.08, attack: 0.005, release: 2.5 }); tone(f(n) * 2.52, t + d, 1, { type: "sine", gain: 0.015, attack: 0.005, release: 0.8 }); }); },
    chime(t) { [784, 988, 1175].forEach((n, i) => tone(n, t + i * 0.18, 1.2, { type: "sine", gain: 0.1 })); },
    /* ---- сюжетні звуки (резерв; основні — assets/sfx/*.mp3) ---- */
    // м'яка фортепіанна фраза «вийшло!» — лист про вступ, успішний запис у САЗ
    success(t) { ["F4", "A4", "C5", "F5"].forEach((n, i) => tone(f(n), t + i * 0.12, 1.6, { type: "sine", gain: 0.1, attack: 0.005, release: 1.3 })); },
    // друк на клавіатурі (вхід у САЗ)
    typing(t) { for (let i = 0; i < 9; i++) noise(t + i * 0.09 + (i % 3) * 0.03, 0.025, { gain: 0.08, type: "bandpass", freq: 2600 + (i % 4) * 300, q: 3 }); },
    // гусяче перо по папері (1615, дарчий лист)
    quill(t) { [0, 0.35, 0.6, 1.0].forEach((d, i) => noise(t + d, 0.25, { gain: 0.05, type: "highpass", freq: 4500 + i * 300, attack: 0.04 })); },
    // важкі дубові двері зачиняються (1817)
    door_heavy(t) { tone(55, t, 1.6, { type: "sine", gain: 0.5, slide: 0.7, attack: 0.005, release: 1.2 }); noise(t, 0.3, { gain: 0.25, type: "lowpass", freq: 400 }); },
    // оплески на врученні сертифіката
    applause(t) { for (let i = 0; i < 70; i++) { const d = (i * 0.071) % 4.2, k = 1 - Math.abs(d - 1.6) / 2.6; noise(t + d, 0.03, { gain: 0.05 * Math.max(0.2, k), type: "bandpass", freq: 1200 + (i * 373) % 1400, q: 1.2 }); } }
  };
  // Гучність файлових SFX: інтерфейсні — тихі, сюжетні — на рівні сцени.
  const SFX_VOL = { click: 0.3, ok: 0.4, err: 0.35, sparkle: 0.3, step: 0.3, notif: 0.35, word: 0.3, pop: 0.3, whoosh: 0.35, chime: 0.35, bells: 0.6, applause: 0.55, typing: 0.5, quill: 0.6, door_heavy: 0.7, success: 0.55 };
  function sfx(name) {
    if (!enabled) return;
    init(); if (!ctx) return;
    if (fileOk["sfx_" + name]) { playFile("assets/sfx/" + name + ".mp3", SFX_VOL[name] ?? 0.65); return; }
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
  /* Спокійні теми власного авторства (без ліцензійних обмежень), у дусі саундтреків візуальних новел:
     м'яке «фетрове» фортепіано, теплі струнні, жодних барабанів. Музика — фон, не головний акцент:
     вона звучить лише в ключових сценах (див. карту звуку в story.js), решту часу — атмосфера локації.
     8 тактів по 4 долі; chords — акорд на такт, bass — бас, mel — рідкісна мелодія, arp — малюнок арпеджіо (індекси нот акорду),
     lead — інструмент мелодії (piano | nylon), pad — підкладка (strings | piano).
     Ті самі дані рендерить scripts/export_audio.mjs у assets/music/*.mp3. */
  const THEMES = {
    // Титул: «Ласкаво просимо» — світле фортепіано, F-dur, лише прості мажорні тризвуки в середньому регістрі
    // (F – C – Dm – B♭ – F – B♭ – C – F), без низького басу та напружених септакордів.
    theme_main: { bpm: 66, lead: "piano", pad: "piano", arp: null,
      chords: ["A3 C4 F4", "G3 C4 E4", "A3 D4 F4", "Bb3 D4 F4", "A3 C4 F4", "Bb3 D4 F4", "G3 C4 E4", "A3 C4 F4"],
      bass: ["F2", "C3", "D3", "Bb2", "F2", "Bb2", "C3", "F2"],
      mel: "C5 2|A4 1|C5 1|E5 2|D5 1|C5 1|D5 3|F5 1|F5 2|D5 2|C5 2|A4 1|F4 1|Bb4 2|D5 2|E5 2|D5 1|E5 1|F5 4" },
    // «Перший день»: світле арпеджіо, G-dur — одноразово на прибутті та виборі СО, а також у титрах
    theme_campus: { bpm: 72, lead: "piano", pad: "strings", arp: [0, 1, 2, 3, 2, 1, 2, 3],
      chords: ["B3 D4 F#4 A4", "B3 D4 F#4 G4", "B3 D4 E4 G4", "A3 C4 E4 F#4", "A3 D4 E4 F#4", "G3 B3 D4 F#4", "G3 B3 C4 E4", "A3 C4 D4 G4"],
      bass: ["G2", "E2", "C2", "D2", "B1", "E2", "A1", "D2"],
      mel: "D5 2|B4 2|R 1|A4 1|B4 1|D5 1|E5 2|D5 2|A4 4|F#5 2|D5 2|B4 2|G4 2|C5 1|B4 1|A4 1|G4 1|A4 4" },
    // Вечір, Сковорода, історія: нейлонова гітара + струнні, d-moll, «старовинний» колорит
    theme_baroque: { bpm: 60, lead: "nylon", pad: "strings", arp: [0, 1, 2, 1, 2, 1, 0, 1],
      chords: ["D3 F3 A3", "D3 F3 Bb3", "D3 G3 Bb3", "C#3 E3 A3", "D3 F3 A3", "C3 F3 A3", "C3 E3 G3", "C#3 G3 A3"],
      bass: ["D2", "Bb1", "G1", "A1", "D2", "F2", "C2", "A1"],
      mel: "A4 2|F4 1|D4 1|F4 2|D4 2|G4 1|Bb4 1|A4 1|G4 1|E4 4|F4 1|A4 1|D5 2|C5 2|A4 2|G4 1|E4 1|C4 1|E4 1|C#4 2|E4 1|A4 1" },
    // Фінал / сертифікат: тепло й піднесено, фортепіано + струнні, C-dur
    theme_triumph: { bpm: 70, lead: "piano", pad: "strings", arp: [0, 1, 2, 3, 2, 1, 2, 3],
      chords: ["E3 G3 B3 D4", "D3 F#3 G3 B3", "E3 G3 B3 C4", "E3 G3 A3 C4", "E3 G3 B3 D4", "D3 F#3 G3 B3", "E3 G3 A3 C4", "D3 F3 G3 C4"],
      bass: ["C2", "B1", "A1", "F2", "C2", "E2", "F2", "G2"],
      mel: "E5 2|G5 2|D5 2|B4 2|C5 1|E5 1|G5 1|E5 1|F5 3|E5 1|E5 2|C5 2|B4 1|D5 1|G5 2|A5 2|G5 1|F5 1|G5 4" },
    // Карта кампусу (глави 2 і 4): ненав'язлива лоу-фай музика — тепле електропіаніно, мʼякий свінг і ледь чутні барабани.
    // Тільки мажорні акорди maj7/6/9 у середньому регістрі (без напруги), дуже тиха й під голос.
    theme_lofi: { bpm: 68, lead: "ep", pad: "ep", arp: null, drums: 0, wow: true,
      chords: ["D3 F3 A3 C4 E4", "G3 B3 E4 F4", "C3 E3 G3 B3 D4", "A2 E3 G3 C4 E4", "F3 A3 C4 E4", "E3 G3 B3 D4", "D3 F3 A3 C4 E4", "G3 B3 C4 F4"],
      bass: ["D2", "G2", "C2", "A1", "F2", "E2", "D2", "G1"],
      mel: "R 1|E5 1|D5 1|C5 1|A4 2|G4 1|A4 1|C5 3|D5 1|E5 2|D5 1|C5 1|R 1|G5 1|E5 1|D5 1|C5 2|D5 2|E5 2|D5 1|C5 1|A4 2|G4 2" }
  };
  function compile(th) {
    const ev = []; let beat = 0;
    th.mel.split("|").forEach(tok => {
      const [n, d] = tok.trim().split(" "); const dur = parseFloat(d);
      if (n !== "R") ev.push({ b: beat, n: f(n), d: dur, v: "mel" });
      beat += dur;
    });
    const bars = th.chords.length, perBar = 4, len = bars * perBar;
    for (let i = 0; i < bars; i++) {
      const b0 = i * perBar, notes = th.chords[i].split(" ");
      ev.push({ b: b0, n: f(th.bass[i]), d: perBar, v: "bass" });
      notes.forEach(n => ev.push({ b: b0, n: f(n), d: perBar, v: "pad" }));
      if (th.arp) th.arp.forEach((k, j) => ev.push({ b: b0 + j / 2, n: f(notes[k % notes.length]) * 2, d: 1, v: "arp" }));
    }
    ev.sort((a, b) => a.b - b.b);
    return { ev, len };
  }
  // Резервний синтез (якщо mp3 недоступні): лише м'які синусоїди/трикутники, без різких хвиль і барабанів.
  function playEvent(th, e, t, spb) {
    const d = e.d * spb;
    if (e.v === "mel") tone(e.n, t, d * 1.1, { type: "sine", gain: 0.09, dest: musicBus, attack: 0.04, release: d * 0.6 });
    else if (e.v === "bass") tone(e.n, t, d, { type: "sine", gain: 0.1, dest: musicBus, attack: 0.08, release: d * 0.5 });
    else if (e.v === "pad") tone(e.n, t, d, { type: "sine", gain: 0.025, dest: musicBus, attack: 0.6, release: 0.8 });
    else if (e.v === "arp") tone(e.n, t, d * 1.5, { type: "triangle", gain: 0.03, dest: musicBus, attack: 0.01, release: d * 1.2 });
  }
 
  /** startMusic(name) — фонова тема по колу; startMusic(name, {once:true}) — одноразова «музична фраза»:
      грає один прохід і плавно стихає, далі сцена звучить лише атмосферою. */
  function startMusic(name, opts) {
    const once = !!(opts && opts.once);
    if (music && music.name === name) return;
    stopMusic();
    music = { name, once };
    if (!enabled) return;
    init(); if (!ctx) return;
    const m = music;
    // Спершу перевіряємо файл; синтез — лише якщо файлу немає (раніше грали обидва одночасно).
    probe("assets/music/" + name + ".mp3", ok => {
      if (music !== m) return;
      if (ok) {
        m.el = once ? playFile("assets/music/" + name + ".mp3", 0) : loopFile("assets/music/" + name + ".mp3", 0);
        fadeTo(m.el, musicVol(), 2500);
        if (once && m.el) m.el.addEventListener("timeupdate", function tu() {
          const el = m.el; if (!el || !el.duration) return;
          if (el.duration - el.currentTime < 6) { el.removeEventListener("timeupdate", tu); if (music === m) stopMusic(5000); }
        });
      }
      else if (!once) startSynth(m, name);
    });
  }
  /** Зупиняє музику, якщо зараз не грає саме ця тема (щоб не обривати одноразову фразу при переході між сценами). */
  function stopMusicExcept(name) { if (music && music.name !== name) stopMusic(); }
  const MUSIC_VOL = 0.22, MUSIC_VOLS = { theme_lofi: 0.14 }; // лоу-фай на карті — ще тихіше, щоб не заважати
  const DUCK_K = 0.36; // у скільки разів тихішає музика під час озвучки
  let ducked = false;
  function musicVol() { const base = (music && MUSIC_VOLS[music.name]) ?? MUSIC_VOL; return ducked ? base * DUCK_K : base; }
  function fadeTo(el, vol, ms) {
    if (!el) return;
    clearInterval(el._fade);
    const from = el.volume, t0 = performance.now();
    el._fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (vol - from) * k));
      if (k >= 1) clearInterval(el._fade);
    }, 50);
  }
  /** Приглушення музики, поки звучить озвучка (саму озвучку не змінює). */
  function duck(on) {
    if (ducked === on) return; ducked = on;
    if (music && music.el) fadeTo(music.el, musicVol(), on ? 300 : 900);
    if (ctx && musicBus) musicBus.gain.setTargetAtTime(on ? 0.1 : 0.25, ctx.currentTime, on ? 0.1 : 0.3);
  }
  function startSynth(m, name) {
    const th = THEMES[name]; if (!th || !ctx) return;
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
  function stopMusic(ms = 1200) {
    if (!music) return;
    stopSynth(music);
    if (music.el) { const el = music.el; music.el = null; fadeTo(el, 0, ms); setTimeout(() => el.pause(), ms + 50); }
    music = null;
  }
 
  /* ---------- Ambience ---------- */
  /* Атмосфера — лише окремі події (птахи, кроки, клавіатура, сторінки, цвіркуни) з тишею між ними.
     Жодних безперервних шумових підкладок: у грі вони звучали як постійне шипіння.
     Якщо файл недоступний — просто тиша (синтетичний шум як резерв прибрано з тієї ж причини). */
  const AMB_VOL = { yard: 0.3, podil: 0.25, office: 0.2, library: 0.15, evening: 0.25 };
  function startAmb(name) {
    if (amb && amb.name === name) return;
    stopAmb();
    amb = { name };
    if (!enabled || !name) return;
    init(); if (!ctx) return;
    const current = amb, url = "assets/ambience/" + name + ".mp3";
    probe(url, ok => {
      if (amb !== current || !ok) return;
      current.el = loopFile(url, 0); fadeTo(current.el, AMB_VOL[name] ?? 0.2, 2500);
    });
  }
  function stopAmb() {
    if (!amb) return;
    if (amb.el) { const el = amb.el; amb.el = null; fadeTo(el, 0, 1500); setTimeout(() => el.pause(), 1550); }
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
    setTimeout(() => fin(false), 8000); // довше чекаємо на повільному інтернеті, перш ніж вмикати резервний синтез
    try { a.src = url; a.load(); } catch (e) { fin(false); }
  }
  function playFile(url, vol = 1) { try { const a = new Audio(url); a.volume = vol; a.play().catch(() => {}); return a; } catch (e) { return null; } }
  function loopFile(url, vol) { const a = playFile(url, vol); if (a) a.loop = true; return a; }
  let voiceEl = null, vq = [], pendingId = null, vtok = 0;
  /** voice(id) — одразу (зупиняє попереднє); voice(id, {queue:true}) — після поточного. */
  function voice(id, opts) {
    if (!enabled || !id) return;
    const busy = pendingId || vq.length || (voiceEl && !voiceEl.paused && !voiceEl.ended);
    if (opts && opts.queue && busy) { vq.push(id); return; }
    stopVoice(); playNow(id);
  }
  function playNow(id) {
    const url = "assets/voice/" + id + ".mp3", tok = ++vtok;
    if (fileOk[url] === false) { nextVoice(); return; }
    pendingId = id;
    probe(url, ok => {
      if (tok !== vtok) return; pendingId = null;
      if (!ok || !enabled) { nextVoice(); return; }
      try {
        const a = new Audio(url); a.volume = 1; a._id = id; voiceEl = a;
        a.onplaying = () => { if (tok === vtok) duck(true); };
        a.onended = () => { if (tok === vtok) nextVoice(); };
        a.play().catch(() => { if (tok === vtok) nextVoice(); });
      } catch (e) { nextVoice(); }
    });
  }
  function nextVoice() { if (vq.length) playNow(vq.shift()); else duck(false); }
  function stopVoice() { vq = []; pendingId = null; vtok++; if (voiceEl) { voiceEl.pause(); voiceEl = null; } duck(false); }
  function voiceQueued(id) { return pendingId === id || vq.includes(id); }
  function hasVoice(id) { return fileOk["assets/voice/" + id + ".mp3"] === true; }
  function voiceState(id) { return fileOk["assets/voice/" + id + ".mp3"]; }
  function voiceAudio() { return voiceEl; }
 
  function setEnabled(v) {
    enabled = v;
    // одноразову фразу після вимкнення звуку не відновлюємо — її момент уже минув
    if (!v) { const m = music && !music.once && music.name, a = amb && amb.name; stopMusic(); stopAmb(); stopVoice(); music = m ? { name: m, off: true } : null; amb = a ? { name: a, off: true } : null; }
    else { init(); const m = music && music.name, a = amb && amb.name; music = null; amb = null; if (m) startMusic(m); if (a) startAmb(a); }
  }
  return { init, sfx, blip, startMusic, stopMusic, stopMusicExcept, startAmb, stopAmb, voice, stopVoice, hasVoice, voiceState, voiceAudio, voiceQueued, setEnabled, get enabled() { return enabled; }, tone, noise };
})();
 
