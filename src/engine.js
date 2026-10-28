/* =========================================================
   Рушій: стан, збереження, сцена, діалоги, HUD, панелі, відео.
   ========================================================= */
const Q = new URLSearchParams(location.search);
const TEST = Q.has("test");
const FAST = Q.has("fast") || TEST;
const SAVE_KEY = "kmaquest_save_v1", NB_KEY = "kmaquest_notebook_v1";
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const sleep = ms => new Promise(r => setTimeout(r, FAST ? Math.min(ms, 30) : ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
 
function freshState() {
  return { v: 1, scene: "prologue", player: { name: "", faculty: "", facultyShort: "", specialty: "", avatar: 0 },
    scoreLog: {}, tasks: {}, glossary: [], stamps: [], club: null, inp: [], saz: null, seenHistory: false, finishedAt: null };
}
let S = freshState();
const score = () => Object.values(S.scoreLog).reduce((a, b) => a + b, 0);
const tpl = s => String(s).replace(/\{name\}/g, S.player.name || "фреше").replace(/\{faculty\}/g, S.player.facultyShort || "ФІ").replace(/\{specialty\}/g, S.player.specialty || "");
 
function storeGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function storeSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function storeDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
function save(scene) {
  if (scene) S.scene = scene;
  storeSet(SAVE_KEY, S);
  storeSet(NB_KEY, { glossary: S.glossary, stamps: S.stamps, seenHistory: S.seenHistory });
}
function loadSave() { const s = storeGet(SAVE_KEY); return s && s.v === 1 ? s : null; }
 
/* ---------- Stage scaling ---------- */
let SCALE = 1;
function fit() {
  const st = $("#stage");
  SCALE = Math.min(innerWidth / W, innerHeight / H);
  st.style.transform = `translate(-50%,-50%) scale(${SCALE})`;
  st.style.transformOrigin = "50% 50%";
}
addEventListener("resize", fit);
 
/* ---------- Background loop ---------- */
let bgFn = BG.blank, bgT0 = 0, bgImg = null, bgName = "";
const bgFiles = {};
function setBg(name) {
  bgName = name; bgFn = BG[name] || BG.blank; bgT0 = performance.now(); bgImg = null;
  const url = "assets/img/bg_" + name + ".webp";
  if (bgFiles[url] === false) return;
  if (bgFiles[url]) { bgImg = bgFiles[url]; return; }
  const im = new Image();
  im.onload = () => { bgFiles[url] = im; if (bgName === name) bgImg = im; };
  im.onerror = () => { bgFiles[url] = false; };
  im.src = url;
}
let bgDim = 0;
function bgLoop(now) {
  const c = $("#bg"), ctx = c.getContext("2d");
  const t = (now - bgT0) / 1000;
  if (bgImg) ctx.drawImage(bgImg, 0, 0, W, H); else bgFn(ctx, t);
  if (bgDim > 0) { ctx.fillStyle = `rgba(10,14,30,${bgDim})`; ctx.fillRect(0, 0, W, H); }
  requestAnimationFrame(bgLoop);
}
 
/* ---------- NPC ---------- */
let npcCur = null;
function showNPC(id, emo = "neutral") {
  const el = $("#npc");
  if (!id || !CHAR[id]) { hideNPC(); return; }
  const key = id + ":" + emo;
  if (npcCur !== key) el.innerHTML = npcSVG(id, emo);
  npcCur = key;
  el.className = "idle" + (id === "skovoroda" ? " ghost" : "");
}
function hideNPC() { const el = $("#npc"); el.classList.add("off"); npcCur = null; }
 
/* ---------- Keys ---------- */
const keyStack = [];
addEventListener("keydown", e => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
  const h = keyStack[keyStack.length - 1];
  if (h && h(e) === true) e.preventDefault();
});
function pushKeys(fn) { keyStack.push(fn); return () => { const i = keyStack.lastIndexOf(fn); if (i >= 0) keyStack.splice(i, 1); }; }
 
/* ---------- Dialog ---------- */
function speakerName(who) { if (!who) return ""; if (who === "me") return S.player.name || "Я"; const n = DATA.npc[who]; return n ? n.name : who; }
function typeInto(el, text, who) {
  return new Promise(res => {
    const npc = DATA.npc[who] || {};
    if (FAST) { el.textContent = text; res(() => {}); return; }
    let i = 0; el.textContent = "";
    const iv = setInterval(() => {
      i++; el.textContent = text.slice(0, i);
      if (who && text[i - 1] && text[i - 1] !== " ") Sound.blip(npc.pitch || 1, npc.whisper);
      if (i >= text.length) { clearInterval(iv); res(); }
    }, 22);
    el._finish = () => { clearInterval(iv); el.textContent = text; res(); };
  });
}
/** Репліка. who: id NPC / "me" / null (оповідач). */
async function say(who, text, o = {}) {
  text = tpl(text);
  const d = $("#dialog"), tx = $(".text", d), ch = $(".choices", d), nx = $(".next", d);
  if (o.sprite !== false && CHAR[who]) showNPC(who, o.emo || "neutral");
  d.hidden = false; ch.innerHTML = ""; nx.hidden = true;
  $(".who", d).textContent = speakerName(who);
  tx.className = "text" + (o.small ? " small" : "") + (!who ? " narr" : "");
  if (o.voice) Sound.voice(o.voice);
  let typing = true;
  const p = typeInto(tx, text, who);
  if (o.voice) { const tag = document.createElement("span"); tag.className = "voice-tag"; tag.textContent = "🔊 озвучено"; p.then(() => setTimeout(() => { if (Sound.hasVoice(o.voice) && tx.isConnected) tx.appendChild(tag); }, 300)); }
  return new Promise(res => {
    const advance = () => {
      if (typing) { tx._finish && tx._finish(); return; }
      cleanup(); Sound.sfx("click"); res();
    };
    const onClick = () => advance();
    const pop = pushKeys(e => { if (e.key === " " || e.key === "Enter") { advance(); return true; } });
    const cleanup = () => { d.removeEventListener("click", onClick); pop(); };
    d.addEventListener("click", onClick);
    p.then(() => { typing = false; nx.hidden = false; if (o.auto) setTimeout(() => { if (!d.hidden) advance(); }, o.auto); });
  });
}
/** Вибір варіанта. Повертає індекс. */
async function choose(options, o = {}) {
  const d = $("#dialog"), tx = $(".text", d), ch = $(".choices", d), nx = $(".next", d);
  d.hidden = false; nx.hidden = true; ch.innerHTML = "";
  if (o.text !== undefined) {
    $(".who", d).textContent = speakerName(o.who);
    if (o.who && CHAR[o.who] && o.sprite !== false) showNPC(o.who, o.emo || "neutral");
    tx.className = "text" + (!o.who ? " narr" : "");
    await typeInto(tx, tpl(o.text), o.who);
  }
  return new Promise(res => {
    options.forEach((t, i) => {
      const b = document.createElement("button");
      b.innerHTML = `<kbd>${i + 1}</kbd><span>${esc(tpl(t))}</span>`;
      if (TEST && o.correct !== undefined && i === o.correct) b.dataset.ok = "1";
      b.addEventListener("click", ev => { ev.stopPropagation(); pick(i); });
      ch.appendChild(b);
    });
    const pop = pushKeys(e => { const n = parseInt(e.key); if (n >= 1 && n <= options.length) { pick(n - 1); return true; } });
    function pick(i) { pop(); Sound.sfx("click"); const btns = $$("button", ch); res({ i, btn: btns[i], btns }); }
  }).then(r => r);
}
/** Вибір із правильною відповіддю: повтор до успіху, бали 1-ша спроба / далі. */
async function askScored(who, text, options, correct, o = {}) {
  let tries = 0;
  while (true) {
    const r = await choose(options, { who, text: tries ? (o.retryText || text) : text, correct, emo: o.emo });
    if (r.i === correct) {
      r.btn.classList.add("right"); Sound.sfx("ok");
      if (o.key) award(o.key, tries === 0 ? (o.pts ? o.pts[0] : 10) : (o.pts ? o.pts[1] : 5));
      await sleep(500);
      if (o.ok) await say(who, o.ok, { emo: "happy", voice: o.okVoice });
      return tries;
    }
    tries++;
    r.btn.classList.add("wrong"); Sound.sfx("err");
    await sleep(450);
    const w = Array.isArray(o.wrong) ? (o.wrong[r.i] || o.wrong[0]) : o.wrong;
    if (w) await say(o.wrongWho || who, w, { emo: "surprised", voice: o.wrongVoice && o.wrongVoice[r.i] });
  }
}
function hideDialog() { $("#dialog").hidden = true; }
 
/* ---------- Scoring / HUD ---------- */
function award(key, pts) {
  if (S.scoreLog[key] !== undefined) return 0;
  S.scoreLog[key] = pts;
  updateHUD();
  const p = document.createElement("div"); p.className = "plus"; p.textContent = "+" + pts;
  $("#hud").appendChild(p); setTimeout(() => p.remove(), 1500);
  return pts;
}
let chapterTitle = "";
function setChapter(t) { chapterTitle = t; updateHUD(); }
function updateHUD() {
  $("#hud .score b").textContent = score();
  $("#hud .chapter").textContent = chapterTitle;
  $("#snd").innerHTML = Sound.enabled ? "🔊 Звук" : "🔇 Без звуку";
  $("#nbBtn .dot").style.visibility = S.glossary.length ? "visible" : "hidden";
}
function showHUD(v = true) { $("#hud").hidden = !v; if (v) updateHUD(); }
 
/* ---------- Toasts / glossary ---------- */
function toast(html, cls = "") {
  const t = document.createElement("div"); t.className = "toast " + cls; t.innerHTML = html;
  const box = $("#toast"); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => t.remove(), 3700);
}
function addWord(id, term, def, cat = "slang", extra = {}) {
  if (S.glossary.some(g => g.id === id)) return;
  S.glossary.push(Object.assign({ id, term, def, cat }, extra));
  Sound.sfx("word");
  toast(`+1 ${cat === "slang" ? "слово" : "запис"} у Нотатник: <b>${esc(term)}</b>`, "word");
  updateHUD();
}
 
/* ---------- Tasks panel ---------- */
let taskResolver = null;
function setTasks(title, items, hint = "") {
  const el = $("#tasks");
  el.hidden = false;
  el.innerHTML = `<h4>${esc(title)}</h4><ul>${items.map(it => `
    <li class="${it.done ? "done" : ""} ${it.opt ? "opt" : ""}">
      <button data-id="${it.id}" ${it.done || it.disabled || !it.click ? "disabled" : ""}>
        <span class="box">${it.done ? "✓" : ""}</span>
        <span class="t">${esc(tpl(it.label))}${it.sub ? `<small>${esc(tpl(it.sub))}</small>` : ""}</span>
      </button></li>`).join("")}</ul>${hint ? `<div class="hint">${esc(tpl(hint))}</div>` : ""}`;
  $$("button", el).forEach(b => b.addEventListener("click", () => { if (taskResolver) { Sound.sfx("click"); const r = taskResolver; taskResolver = null; r(b.dataset.id); } }));
}
function waitTask() { return new Promise(r => { taskResolver = r; }); }
function hideTasks() { $("#tasks").hidden = true; taskResolver = null; }
async function slideTasksIn() { const el = $("#tasks"); el.classList.add("out"); el.hidden = false; await sleep(40); el.classList.remove("out"); Sound.sfx("whoosh"); }
 
/* ---------- Layers ---------- */
function openLayer(html, cls = "veil") {
  const v = document.createElement("div"); v.className = cls; v.innerHTML = html;
  $("#layer").appendChild(v); return v;
}
function closeLayer(v) { if (v && v.parentNode) v.remove(); }
 
/* ---------- Title card / fade ---------- */
async function titleCard(eyebrow, title, ms = 2600) {
  const c = $("#card");
  c.innerHTML = `<div class="in"><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(tpl(title))}</h1></div>`;
  c.classList.add("on"); Sound.sfx("chime");
  await sleep(ms);
  c.classList.remove("on"); await sleep(700);
}
async function fadeOut() { $("#fade").classList.add("on"); await sleep(650); }
async function fadeIn() { $("#fade").classList.remove("on"); await sleep(650); }
 
/* ---------- Confetti (seeded) ---------- */
function confetti(ms = 3500) {
  const c = document.createElement("canvas"); c.width = W; c.height = H; c.style.zIndex = 75; c.style.pointerEvents = "none";
  $("#stage").appendChild(c);
  const ctx = c.getContext("2d"), r = mulberry32(1991);
  const cols = ["#d9a21b", "#2f7d6d", "#c2452d", "#3e5aa8", "#ffd500", "#0057b8", "#f7f4ee"];
  const P = Array.from({ length: 160 }, () => ({ x: r() * W, y: -r() * 400, vx: (r() - .5) * 120, vy: 120 + r() * 220, s: 6 + r() * 8, a: r() * 6, va: (r() - .5) * 8, c: cols[(r() * cols.length) | 0] }));
  const t0 = performance.now(); Sound.sfx("pop");
  (function f(now) {
    const dt = 1 / 60, el = now - t0;
    ctx.clearRect(0, 0, W, H);
    P.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - Math.max(0, el - ms + 800) / 800); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
    if (el < ms) requestAnimationFrame(f); else c.remove();
  })(t0);
}
 
/* ---------- Video (canvas-кліп або MP4 зі слоту) ---------- */
/** subs: [[від, до, текст], ...] у секундах. draw(ctx, t, dur). */
function playVideo({ id, dur, draw, subs = [], skippable = true, vertical = false, voice }) {
  return new Promise(res => {
    const v = openLayer(`<canvas width="${vertical ? 405 : W}" height="720"></canvas><div class="subs"><span></span></div>
      <div class="ctl"><span class="tag">${vertical ? "сторіс" : "відео"} · субтитри</span>${skippable ? `<button class="skip" id="vskip">Пропустити ▸▸</button>` : ""}</div><div class="prog"></div>`, "video" + (vertical ? " vertical" : ""));
    const cv = $("canvas", v), ctx = cv.getContext("2d"), sub = $(".subs span", v), prog = $(".prog", v);
    const speed = FAST ? 40 : 1;
    let t0 = performance.now(), done = false, videoEl = null, lastSub = -1;
    if (voice) Sound.voice(voice);
    const finish = () => { if (done) return; done = true; pop(); Sound.stopVoice(); if (videoEl) videoEl.pause(); closeLayer(v); res(); };
    const pop = pushKeys(e => { if (skippable && (e.key === "Escape" || e.key === "Enter")) { finish(); return true; } });
    if (skippable) $("#vskip", v).addEventListener("click", finish);
    // MP4 слот
    if (id && !FAST) {
      const vid = document.createElement("video"); vid.playsInline = true; vid.src = "assets/video/" + id + ".mp4";
      vid.addEventListener("loadeddata", () => { if (done) return; videoEl = vid; cv.replaceWith(vid); vid.play().catch(() => {}); vid.onended = finish; }, { once: true });
      vid.addEventListener("error", () => {}, { once: true });
    }
    (function loop(now) {
      if (done) return;
      const t = videoEl ? videoEl.currentTime : (now - t0) / 1000 * speed;
      if (!videoEl) draw(ctx, t, dur);
      prog.style.width = Math.min(100, t / dur * 100) + "%";
      const k = subs.findIndex(s => t >= s[0] && t < s[1]);
      if (k !== lastSub) { lastSub = k; sub.textContent = k >= 0 ? tpl(subs[k][2]) : ""; sub.style.display = k >= 0 ? "" : "none"; }
      if (t >= dur && !videoEl) { finish(); return; }
      requestAnimationFrame(loop);
    })(t0);
  });
}
 
/* ---------- Notebook ---------- */
function openNotebook(fromTitle = false) {
  const nb = fromTitle ? (storeGet(NB_KEY) || { glossary: [], stamps: [] }) : S;
  const tabs = [["slang", "Словник"], ["facts", "Факти"], ["guide", "Поради"], ["community", "Спільнота"]];
  const v = openLayer(`<div class="panel nb" role="dialog" aria-label="Нотатник фреша">
    <button class="close" aria-label="Закрити">✕</button>
    <div class="eyebrow">Нотатник фреша</div><h2>Усе, що варто пам'ятати</h2>
    <div class="tabs" role="tablist">${tabs.map(([id, n], i) => `<button role="tab" data-t="${id}" aria-selected="${i === 0}">${n}</button>`).join("")}</div>
    <div class="body"></div></div>`);
  const body = $(".body", v);
  const render = cat => {
    if (cat === "community") {
      body.innerHTML = `<p class="sub">Штампи СОшок: по одному стенду в кожній главі. Відвідування необов'язкове, але кожен штамп — це +10 балів.</p>
        <div class="stamps">${DATA.clubs.filter(c => c.ch !== null).map(c => nb.stamps.includes(c.id) ? `<div class="stamp on"><span><b>${esc(c.short)}</b>${esc(c.name.split("«")[1] ? "«" + c.name.split("«")[1] : "")}</span></div>` : `<div class="stamp"><span>Глава ${c.ch}<br>стенд СО</span></div>`).join("")}</div>`;
      return;
    }
    const items = nb.glossary.filter(g => g.cat === cat);
    let html = items.length ? `<div class="terms">${items.map(g => `<div class="term ${g.wide ? "wide" : ""}"><b>${esc(g.term)}</b>${g.html || esc(g.def)}</div>`).join("")}</div>` : `<div class="empty">Тут поки порожньо. Записи з'являтимуться по ходу гри.</div>`;
    if (cat === "facts" && nb.seenHistory) html += `<p><button class="btn" id="rewatch">▶ Переглянути «400 років за 90 секунд»</button></p>`;
    body.innerHTML = html;
    const rw = $("#rewatch", body); if (rw) rw.addEventListener("click", () => { closeLayer(v); pop(); playHistoryVideo(true); });
  };
  $$(".tabs button", v).forEach(b => b.addEventListener("click", () => { $$(".tabs button", v).forEach(x => x.setAttribute("aria-selected", x === b)); render(b.dataset.t); }));
  render("slang");
  const close = () => { pop(); closeLayer(v); };
  $(".close", v).addEventListener("click", close);
  const pop = pushKeys(e => { if (e.key === "Escape") { close(); } return true; });
}
 
/* ---------- Speaker hint inside panels ---------- */
function hintBox(who, text) {
  return `<div class="speaker-hint"><div class="av">${npcSVG(who, "neutral", { head: true })}</div><div><b>${esc(speakerName(who))}</b><span class="ht">${esc(tpl(text))}</span></div></div>`;
}
function setHint(root, who, text, emo = "neutral") {
  const h = $(".speaker-hint", root); if (!h) return;
  $(".av", h).innerHTML = npcSVG(who, emo, { head: true });
  $("b", h).textContent = speakerName(who);
  $(".ht", h).textContent = tpl(text);
}
 
/* ---------- Drag & drop helper (pointer events, працює зі scale) ---------- */
function draggable(card, { targets, onDrop }) {
  card.addEventListener("pointerdown", e => {
    if (card.classList.contains("placed") || card.classList.contains("locked")) return;
    e.preventDefault(); card.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY;
    card.classList.add("drag"); card.classList.remove("back");
    let over = null;
    const move = ev => {
      card.style.transform = `translate(${(ev.clientX - sx) / SCALE}px,${(ev.clientY - sy) / SCALE}px) rotate(-2deg)`;
      const hit = targets().find(t => { const r = t.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; });
      if (over !== hit) { over && over.classList.remove("hover"); over = hit; over && over.classList.add("hover"); }
    };
    const up = () => {
      card.removeEventListener("pointermove", move); card.removeEventListener("pointerup", up); card.removeEventListener("pointercancel", up);
      card.classList.remove("drag"); over && over.classList.remove("hover");
      const accepted = over ? onDrop(card, over) : false;
      if (!accepted) { card.classList.add("back"); card.style.transform = ""; }
    };
    card.addEventListener("pointermove", move); card.addEventListener("pointerup", up); card.addEventListener("pointercancel", up);
  });
}
 
