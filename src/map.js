/* =========================================================
   Карта кампусу: вид зверху, WASD/стрілки або клік.
   ========================================================= */
const MAP_POINTS = [
  { id: "corp3",   name: "3-й корпус (головний)",    x: 760,  y: 330, bw: 210, bh: 90, roof: "#2f7d6d", wall: "#e6c27a" },
  { id: "stara",   name: "Староакадемічний корпус",  x: 545,  y: 235, bw: 270, bh: 70, roof: "#2f5a4e", wall: "#e8dfc8" },
  { id: "kmc",     name: "КМЦ",                      x: 1020, y: 200, bw: 160, bh: 80, roof: "#6b4fa0", wall: "#d9cfe8" },
  { id: "lib1",    name: "Бібліотека №1",            x: 395,  y: 455, bw: 140, bh: 80, roof: "#8c2f3c", wall: "#efe2cf" },
  { id: "lib2",    name: "Бібліотека №2",            x: 1110, y: 560, bw: 140, bh: 70, roof: "#8c2f3c", wall: "#efe2cf" },
  { id: "dean",    name: "Деканат",                  x: 640,  y: 545, bw: 160, bh: 70, roof: "#3e5aa8", wall: "#e1e6f0" },
  { id: "girkyi",  name: "Гіркий",                   x: 390,  y: 205, cafe: "#5a3b22" },
  { id: "puzatka", name: "Пузатка",                  x: 900,  y: 600, cafe: "#a8770a" },
  { id: "kfs",     name: "КФС / Сільпо",             x: 1175, y: 390, cafe: "#c2452d" },
  { id: "stand2", name: "Стенд СО: KMA Today", x: 900, y: 445, stand: true },
  { id: "stand4", name: "Стенд СО: Взаємодопомога", x: 470, y: 630, stand: true }
];
MAP_POINTS.forEach(p => {
  if (p.bw) { p.rect = [p.x - p.bw / 2, p.y - p.bh / 2, p.bw, p.bh]; p.tx = p.x; p.ty = p.y + p.bh / 2 + 22; }
  else { p.rect = p.cafe ? [p.x - 34, p.y - 22, 68, 44] : [p.x - 16, p.y - 30, 32, 30]; p.tx = p.x; p.ty = p.y + (p.cafe ? 44 : 22); }
});
const MAP_TREES = [[300, 110], [470, 110], [690, 110], [880, 110], [1100, 110], [300, 330], [300, 560], [520, 360], [990, 330], [1230, 250], [1240, 480], [760, 640], [560, 660], [1000, 470], [330, 680]];
 
const MapView = (() => {
  const cv = () => $("#map");
  let active = false, stateFn = () => "normal", resolver = null;
  let hero = { x: 640, y: 430, dir: "down", phase: 0, moving: false }, target = null, autoEnter = null;
  const keys = {};
  let near = null, lastStep = 0, last = 0, dusk = 0, avatar = 0, insideLock = null;
  let promptEl = null, helpEl = null;
 
  function staticLayer() {
    return layer("map", c => {
      c.fillStyle = "#8fb07a"; c.fillRect(0, 0, W, H);
      const r = mulberry32(1701);
      for (let i = 0; i < 400; i++) { c.fillStyle = r() > .5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)"; c.fillRect(r() * W, r() * H, 3, 3); }
      c.fillStyle = "#cfc6b4";
      c.fillRect(0, 120, W, 46); c.fillRect(0, 668, W, 52); c.fillRect(230, 120, 46, 600);
      rr(c, 290, 160, 980, 510, 26); c.fill();
      c.fillStyle = "#d9d1c0"; rr(c, 320, 290, 640, 150, 60); c.fill();
      c.strokeStyle = "rgba(0,0,0,.06)"; c.lineWidth = 1;
      for (let x = 300; x < 1270; x += 22) { c.beginPath(); c.moveTo(x, 165); c.lineTo(x, 668); c.stroke(); }
      c.strokeStyle = "#8a8070"; c.lineWidth = 3; [690, 702].forEach(y => { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); });
      c.fillStyle = "#7a705f"; c.font = "700 13px Manrope, sans-serif"; c.textAlign = "left";
      c.fillText("ВУЛ. СКОВОРОДИ", 20, 148); c.fillText("ВУЛ. ВОЛОСЬКА · ТРАМВАЙ", 20, 686);
      c.save(); c.translate(258, 420); c.rotate(-Math.PI / 2); c.fillText("ВУЛ. ІЛЛІНСЬКА", 0, 0); c.restore();
      c.fillStyle = "rgba(122,112,95,.6)"; c.font = "800 22px Unbounded, sans-serif"; c.textAlign = "center"; c.fillText("КОНТРАКТОВА ПЛОЩА", 640, 425);
      c.fillStyle = "#bfb6a2"; c.beginPath(); c.arc(560, 380, 26, 0, 7); c.fill(); c.fillStyle = "#9aa7a0"; c.beginPath(); c.arc(560, 380, 16, 0, 7); c.fill();
      MAP_TREES.forEach(([x, y]) => { c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(x + 4, y + 6, 20, 12, 0, 0, 7); c.fill(); c.fillStyle = "#4f8a4a"; c.beginPath(); c.arc(x, y, 18, 0, 7); c.fill(); c.fillStyle = "#64a05b"; c.beginPath(); c.arc(x - 5, y - 5, 10, 0, 7); c.fill(); });
    });
  }
  function drawPoint(ctx, p, st, t) {
    const [x, y, w, h] = p.rect;
    const locked = st === "locked";
    if (p.bw) {
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(x + 6, y + 8, w, h);
      ctx.fillStyle = locked ? "#9b9b9b" : p.wall; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = locked ? "#7a7a7a" : p.roof; ctx.fillRect(x + 6, y + 6, w - 12, h - 20);
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(x + 6, y + 6, w - 12, 6);
      ctx.fillStyle = locked ? "#666" : "#4b3424"; ctx.fillRect(p.x - 12, y + h - 8, 24, 10);
    } else if (p.cafe) {
      ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(x + 4, y + 6, w, h);
      ctx.fillStyle = "#f7f4ee"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = p.cafe; for (let i = 0; i < 6; i++) if (i % 2 === 0) ctx.fillRect(x + i * w / 6, y, w / 6, 14);
      ctx.fillStyle = p.cafe; ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.fillText(p.id === "puzatka" ? "🍲" : p.id === "kfs" ? "🛒" : "☕", p.x, y + h - 8);
    } else if (p.stand) {
      ctx.fillStyle = "#2b3350"; ctx.fillRect(p.x - 2, y + 10, 4, 22);
      ctx.fillStyle = "#d9a21b"; rr(ctx, x - 6, y - 6, w + 12, 26, 4); ctx.fill();
      ctx.fillStyle = "#141b2e"; ctx.font = "800 11px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.fillText("СО", p.x, y + 12);
    }
    // label
    ctx.font = "700 12px Manrope, sans-serif"; ctx.textAlign = "center";
    const lw = ctx.measureText(p.name).width + 14, ly = y - 12;
    ctx.fillStyle = locked ? "rgba(80,80,80,.85)" : "rgba(20,27,46,.86)"; rr(ctx, p.x - lw / 2, ly - 14, lw, 20, 6); ctx.fill();
    ctx.fillStyle = "#f7f4ee"; ctx.fillText((locked ? "🔒 " : "") + p.name, p.x, ly);
    // marker
    const by = ly - 30 + (st === "active" ? Math.sin(t * 4) * 4 : 0);
    if (st === "active") { ctx.fillStyle = "#d9a21b"; ctx.beginPath(); ctx.arc(p.x, by, 13, 0, 7); ctx.fill(); ctx.fillStyle = "#141b2e"; ctx.font = "900 17px Unbounded, sans-serif"; ctx.fillText("!", p.x, by + 6); }
    if (st === "done") { ctx.fillStyle = "#2f7d6d"; ctx.beginPath(); ctx.arc(p.x, by, 12, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "900 14px Manrope, sans-serif"; ctx.fillText("✓", p.x, by + 5); }
    if (st === "icon") { ctx.fillStyle = "#2f7d6d"; ctx.beginPath(); ctx.arc(p.x, by, 11, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "13px sans-serif"; ctx.fillText("★", p.x, by + 5); }
  }
  function drawHero(ctx) {
    drawChibi(ctx, AVATARS[avatar] || AVATARS[0], hero.x, hero.y, hero.dir, hero.moving ? hero.phase : null, 1);
  }
  let tramX = -400;
  function frame(now) {
    if (!active) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    // movement
    let dx = 0, dy = 0;
    const uiBusy = $("#layer").childElementCount > 0 || !$("#dialog").hidden || !resolver;
    if (uiBusy) { Object.keys(keys).forEach(k => keys[k] = false); target = target && resolver ? target : null; }
    if (keys.ArrowLeft || keys.a || keys.ф) dx -= 1; if (keys.ArrowRight || keys.d || keys.в) dx += 1;
    if (keys.ArrowUp || keys.w || keys.ц) dy -= 1; if (keys.ArrowDown || keys.s || keys.і || keys.ы) dy += 1;
    if (dx || dy) { target = null; autoEnter = null; }
    else if (target) { const vx = target.x - hero.x, vy = target.y - hero.y, d = Math.hypot(vx, vy); if (d < 4) { target = null; if (autoEnter) { const id = autoEnter; autoEnter = null; enter(id); return; } } else { dx = vx / d; dy = vy / d; } }
    hero.moving = !!(dx || dy);
    if (hero.moving) {
      const len = Math.hypot(dx, dy), sp = 250 * dt;
      const nx = hero.x + dx / len * sp, ny = hero.y + dy / len * sp;
      if (!blocked(nx, hero.y)) hero.x = Math.max(16, Math.min(W - 16, nx));
      if (!blocked(hero.x, ny)) hero.y = Math.max(70, Math.min(H - 10, ny));
      hero.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
      hero.phase += dt * 14;
      if (now - lastStep > 300) { Sound.sfx("step"); lastStep = now; }
    }
    // near
    let n = null;
    for (const p of MAP_POINTS) { const st = stateFn(p.id); if (st === "hidden") continue; if (Math.hypot(hero.x - p.tx, hero.y - p.ty) < 42) { n = p; break; } }
    if (insideLock && (!n || n.id !== insideLock)) insideLock = null;
    if (n !== near) { near = n; renderPrompt(); }
    // draw
    const ctx = cv().getContext("2d");
    ctx.drawImage(staticLayer(), 0, 0);
    tramX += dt * 90; if (tramX > W + 900) tramX = -1600;
    ctx.fillStyle = "#c2452d"; rr(ctx, tramX, 682, 210, 28, 6); ctx.fill(); ctx.fillStyle = "#f7f4ee"; for (let i = 0; i < 6; i++) ctx.fillRect(tramX + 12 + i * 33, 688, 22, 10);
    const pts = MAP_POINTS.filter(p => stateFn(p.id) !== "hidden").sort((a, b) => a.y - b.y);
    let heroDrawn = false;
    for (const p of pts) { if (!heroDrawn && hero.y < p.y) { drawHero(ctx); heroDrawn = true; } drawPoint(ctx, p, stateFn(p.id), t); }
    if (!heroDrawn) drawHero(ctx);
    if (target) { ctx.strokeStyle = "rgba(217,162,27,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(target.x, target.y, 8 + Math.sin(t * 6) * 2, 0, 7); ctx.stroke(); }
    if (dusk > 0) { ctx.fillStyle = `rgba(40,30,90,${dusk * 0.55})`; ctx.fillRect(0, 0, W, H); }
    requestAnimationFrame(frame);
  }
  function blocked(x, y) {
    return MAP_POINTS.some(p => { if (!p.bw) return false; const [rx, ry, rw, rh] = p.rect; return x > rx - 8 && x < rx + rw + 8 && y > ry - 4 && y < ry + rh + 6; });
  }
  function renderPrompt() {
    if (!promptEl) return;
    if (!near || insideLock === near.id) { promptEl.hidden = true; return; }
    const st = stateFn(near.id);
    promptEl.hidden = false;
    promptEl.innerHTML = st === "locked" ? `🔒 ${esc(near.name)} — зачинено до Глави 4` : `<kbd>E</kbd> Увійти: ${esc(near.name)}`;
  }
  function enter(id) {
    const st = stateFn(id);
    if (st === "locked" || st === "hidden") { Sound.sfx("err"); toast("🔒 " + MAP_POINTS.find(p => p.id === id).name + " відкриється в Главі 4"); return; }
    if (!resolver) return;
    Sound.sfx("door");
    const r = resolver; resolver = null; insideLock = id; near = null; renderPrompt();
    r(id);
  }
  function onKey(e) {
    if (!active) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.type === "keydown") {
      if ($("#layer").childElementCount > 0) return;
      if ((k === "e" || k === "у" || k === "Enter" || k === " ") && near && resolver) { enter(near.id); e.preventDefault(); return; }
      keys[k] = true; if (k.startsWith("Arrow")) e.preventDefault();
    } else keys[k] = false;
  }
  addEventListener("keydown", onKey); addEventListener("keyup", onKey);
  addEventListener("blur", () => Object.keys(keys).forEach(k => keys[k] = false));
  function onClick(e) {
    if (!active || !resolver) return;
    const r = cv().getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const p = MAP_POINTS.find(p => { if (stateFn(p.id) === "hidden") return false; const [rx, ry, rw, rh] = p.rect; return (x >= rx - 10 && x <= rx + rw + 10 && y >= ry - 40 && y <= ry + rh + 10) || Math.hypot(x - p.tx, y - p.ty) < 40; });
    if (p) {
      if (Math.hypot(hero.x - p.tx, hero.y - p.ty) < 42) { enter(p.id); return; }
      target = { x: p.tx, y: p.ty }; autoEnter = p.id;
    } else { target = { x, y }; autoEnter = null; }
  }
  return {
    show(fn, opts = {}) {
      stateFn = fn; avatar = S.player.avatar || 0;
      const c = cv(); c.hidden = false;
      if (!c._bound) { c.addEventListener("click", onClick); c._bound = true; }
      if (!promptEl) { promptEl = document.createElement("div"); promptEl.className = "mapprompt"; promptEl.hidden = true; $("#stage").appendChild(promptEl); helpEl = document.createElement("div"); helpEl.className = "maphelp"; helpEl.textContent = "WASD / стрілки — ходити · клік — іти до точки · E — увійти"; $("#stage").appendChild(helpEl); }
      helpEl.hidden = false;
      if (opts.from) { const p = MAP_POINTS.find(p => p.id === opts.from); if (p) { hero.x = p.tx; hero.y = p.ty + 6; hero.dir = "down"; insideLock = p.id; } }
      if (!active) { active = true; last = performance.now(); requestAnimationFrame(frame); }
      renderPrompt();
    },
    wait() { return new Promise(r => { resolver = r; renderPrompt(); }); },
    hide() { active = false; const c = cv(); c.hidden = true; if (promptEl) promptEl.hidden = true; if (helpEl) helpEl.hidden = true; resolver = null; target = null; Object.keys(keys).forEach(k => keys[k] = false); },
    refresh() { renderPrompt(); },
    set dusk(v) { dusk = v; },
    get hero() { return hero; },
    get isActive() { return active; },
    enterForTest(id) { if (resolver) { const r = resolver; resolver = null; insideLock = id; r(id); } },
    prerender() { return staticLayer(); },
    reset() { hero = { x: 640, y: 430, dir: "down", phase: 0, moving: false }; }
  };
})();
 
