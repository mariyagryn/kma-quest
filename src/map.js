/* =========================================================
   KMA Quest — інтерактивна карта кампусу.
   Ілюстрація є окремим фоном; точки, маркери, зіткнення
   та рух персонажа залишаються незалежними шарами.
   ========================================================= */
const MAP_BG = new Image();
MAP_BG.src = "assets/img/bg_campusMap.webp";
const MAP_BG_X = 200;
const MAP_BG_W = 1080;
const MAP_BG_H = 720;
// Трамвай — окремий спрайт, а не частина нерухомої карти.
const MAP_TRAM = new Image();
MAP_TRAM.src = "assets/img/tram_sprite.png";

const MAP_POINTS = [
  // Корпуси НаУКМА. Координати прив'язані до окремого фону карти.
  { id: "corp8", name: "8-й корпус", x: 450, y: 82, labelY: 143, tx: 450, ty: 158, hit: [410, 24, 92, 120] },
  { id: "corp9", name: "9-й корпус", x: 585, y: 66, labelY: 132, tx: 585, ty: 151, hit: [495, 0, 180, 130] },
  { id: "corp10", name: "10-й корпус", x: 740, y: 76, labelY: 137, tx: 740, ty: 155, hit: [675, 0, 135, 130] },
  { id: "corp4", name: "4-й корпус", x: 605, y: 226, labelY: 224, tx: 605, ty: 174, hit: [495, 185, 205, 105] },
  { id: "kmc", name: "КМЦ", x: 770, y: 255, labelY: 275, tx: 850, ty: 360, hit: [690, 190, 145, 135] },
  { id: "corp7", name: "7-й корпус", x: 480, y: 330, labelY: 350, tx: 470, ty: 395, hit: [410, 295, 150, 90] },
  { id: "corp6", name: "6-й корпус", x: 620, y: 330, labelY: 350, tx: 620, ty: 395, hit: [560, 295, 140, 90] },
  { id: "corp5", name: "5-й корпус", x: 760, y: 330, labelY: 350, tx: 800, ty: 395, hit: [700, 295, 135, 90] },
  { id: "lib11", name: "11-й корпус", subtitle: "БІБЛІОТЕКА", x: 455, y: 505, labelY: 560, tx: 450, ty: 632, hit: [375, 390, 160, 235] },
  { id: "corp2", name: "2-й корпус", x: 625, y: 455, labelY: 470, tx: 620, ty: 532, hit: [590, 400, 80, 125] },
  { id: "corp1", name: "1-й корпус", subtitle: "KMA TODAY", x: 770, y: 505, labelY: 560, tx: 760, ty: 632, hit: [705, 390, 145, 235] },
  { id: "corp3", name: "3-й корпус · Циркульний", x: 625, y: 620, labelY: 644, tx: 620, ty: 686, hit: [510, 555, 230, 125] },

  // Місця поруч із кампусом.
  { id: "girkyi", name: "Гіркий", x: 350, y: 292, labelY: 264, tx: 350, ty: 370, hit: [300, 242, 95, 115] },
  { id: "puzatka", name: "Пузата Хата", x: 1170, y: 360, labelY: 337, tx: 1170, ty: 430, hit: [1110, 295, 125, 130] },
  { id: "kfs", name: "KFC", x: 980, y: 552, labelY: 527, tx: 980, ty: 620, hit: [925, 500, 110, 120] },
  { id: "silpo", name: "Сільпо", x: 1110, y: 552, labelY: 527, tx: 1110, ty: 620, hit: [1050, 500, 120, 120] },

  // Не окрема будівля: невеликий стенд Взаємодопомоги біля нижньої доріжки.
  { id: "stand4", name: "СО: Взаємодопомога", x: 320, y: 645, labelY: 615, tx: 320, ty: 660, hit: [290, 610, 65, 60], stand: true },

  // Точка появи в Главі 4. Вона не відображається як окрема будівля.
  { id: "stara", name: "Староакадемічний корпус", x: 850, y: 460, tx: 850, ty: 460, hit: [0, 0, 0, 0], spawnOnly: true }
];

// Прямокутні зони будівель і великих об'єктів на намальованому фоні.
// Гравець може ходити доріжками, але не проходить крізь споруди.
const MAP_OBSTACLES = [
  [420, 40, 80, 90],    // 8-й корпус
  [500, 0, 165, 120],   // 9-й корпус
  [680, 15, 100, 100],  // 10-й корпус
  [500, 195, 305, 85],  // 4-й корпус
  [710, 200, 100, 110], // КМЦ
  [420, 302, 410, 78],  // 5–7-й корпуси
  [380, 400, 150, 210], // 11-й корпус / бібліотека
  [590, 410, 75, 105],  // 2-й корпус
  [715, 410, 130, 200], // 1-й корпус
  [515, 555, 215, 110], // 3-й корпус, Циркульний
  [310, 250, 80, 100],  // кав'ярня Гіркий
  [1135, 320, 90, 95],  // Пузата Хата
  [930, 260, 160, 175], // колесо огляду
  [935, 505, 90, 95],   // KFC
  [1055, 505, 95, 95]   // Сільпо
];

const MAP_ALIASES = {
  lib1: "lib11", lib2: "lib11", stand2: "corp1", dean: "corp4"
};
const MAP_LEGEND_HTML = `
  <div class="map-legend-title">КОРПУСИ НАУКМА</div>
  <ul>
    <li><b>1-й корпус</b><span>навчальні аудиторії, деякі кафедри · KMA Today всередині</span></li>
    <li><b>2-й корпус</b><span>аудиторії та кафедри</span></li>
    <li><b>3-й (Циркульний)</b><span>лекційні зали й освітні події</span></li>
    <li><b>4–7-й корпуси</b><span>навчальні та адміністративні підрозділи</span></li>
    <li><b>8–10-й корпуси</b><span>навчальні аудиторії та лабораторії</span></li>
    <li><b>11-й корпус</b><span>бібліотека, читальні зали й коворкінг</span></li>
  </ul>`;

const MapView = (() => {
  const cv = () => $("#map");
  let active = false, stateFn = () => "normal", resolver = null;
  let hero = { x: 820, y: 660, dir: "up", phase: 0, moving: false };
  let target = null, path = [], autoEnter = null;
  const keys = {}, tapped = {};
  let near = null, lastStep = 0, last = 0, dusk = 0, avatar = 0, insideLock = null;
  let promptEl = null, helpEl = null, legendEl = null, sidebarEl = null;
  const GRID = 12;

  function drawMapBase(ctx) {
    ctx.fillStyle = "#a8c879";
    ctx.fillRect(0, 0, W, H);
    if (MAP_BG.complete && MAP_BG.naturalWidth) {
      ctx.drawImage(MAP_BG, MAP_BG_X, 0, MAP_BG_W, MAP_BG_H);
    } else {
      // Простий резервний фон, якщо файл карти ще завантажується або відсутній.
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#9fc274"); g.addColorStop(1, "#d5c7a7");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#d7c9ae"; ctx.fillRect(285, 0, 995, H);
      ctx.fillStyle = "#a6c878"; ctx.fillRect(200, 0, 1080, H);
      ctx.fillStyle = "#7b8b79"; ctx.fillRect(900, 0, 380, H);
      ctx.fillStyle = "#d7c9ae"; ctx.fillRect(920, 0, 360, H);
      ctx.fillStyle = "#6d9b58"; ctx.font = "700 18px Manrope, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Завантаження карти кампусу…", 740, 350);
    }
  }

  let tramX = 265;
  const TRAM_SPEED = 54; // px/с, плавний рух уздовж рейок
  function drawMovingTram(ctx, dt) {
    tramX += TRAM_SPEED * dt;
    if (tramX > W + 200) tramX = 270 - 195;
    if (MAP_TRAM.complete && MAP_TRAM.naturalWidth) {
      ctx.save();
      ctx.beginPath(); ctx.rect(300, 0, W - 300, H); ctx.clip();
      ctx.drawImage(MAP_TRAM, tramX, 638, MAP_TRAM.naturalWidth, MAP_TRAM.naturalHeight);
      ctx.restore();
    }
  }

  function drawLabel(ctx, p, st, t) {
    if (p.spawnOnly) return;
    const locked = st === "locked";
    const baseline = p.labelY ?? (p.y - 18);
    ctx.save();
    ctx.font = "800 12px Manrope, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = p.name;
    const width = Math.max(54, ctx.measureText(label).width + 18);
    const boxY = baseline - 13;
    ctx.shadowColor = "rgba(0,0,0,.25)";
    ctx.shadowBlur = 7;
    ctx.fillStyle = locked ? "rgba(70,76,85,.92)" : "rgba(20,27,46,.91)";
    rr(ctx, p.x - width / 2, boxY, width, 26, 8); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = locked ? "#e1e1e1" : "#fffaf0";
    ctx.fillText((locked ? "🔒 " : "") + label, p.x, baseline);

    if (p.subtitle) {
      ctx.font = "800 9px Manrope, sans-serif";
      const subW = ctx.measureText(p.subtitle).width + 14;
      const subY = baseline + 17;
      ctx.fillStyle = st === "done" ? "#2f7d6d" : "#d9a21b";
      rr(ctx, p.x - subW / 2, subY - 9, subW, 18, 6); ctx.fill();
      ctx.fillStyle = "#141b2e";
      ctx.fillText(p.subtitle, p.x, subY);
    }

    const markerY = boxY - 19 + (st === "active" ? Math.sin(t * 4) * 3 : 0);
    if (st === "active") {
      ctx.fillStyle = "#f2b600"; ctx.beginPath(); ctx.arc(p.x, markerY, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#141b2e"; ctx.font = "900 16px Unbounded, sans-serif"; ctx.fillText("!", p.x, markerY + 1);
    } else if (st === "done") {
      ctx.fillStyle = "#2f7d6d"; ctx.beginPath(); ctx.arc(p.x, markerY, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "900 13px Manrope, sans-serif"; ctx.fillText("✓", p.x, markerY + 1);
    } else if (st === "icon") {
      ctx.fillStyle = "#2f7d6d"; ctx.beginPath(); ctx.arc(p.x, markerY, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "900 12px Manrope, sans-serif"; ctx.fillText("★", p.x, markerY + 1);
    }
    ctx.restore();
  }

  function drawStand(ctx, p, st) {
    if (!p.stand || st === "hidden") return;
    const x = p.x, y = p.y;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(x - 3, y - 2, 6, 30);
    ctx.fillStyle = "#d9a21b"; rr(ctx, x - 28, y - 28, 56, 25, 5); ctx.fill();
    ctx.fillStyle = "#172039"; ctx.font = "800 10px Manrope, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("СО", x, y - 15);
    ctx.restore();
  }

  function drawHero(ctx) {
    drawChibi(ctx, AVATARS[avatar] || AVATARS[0], hero.x, hero.y, hero.dir, hero.moving ? hero.phase : null, 1);
  }

  function blocked(x, y) {
    if (x < 286 || x > W - 12 || y < 58 || y > H - 18) return true;
    return MAP_OBSTACLES.some(([rx, ry, rw, rh]) =>
        x > rx - 2 && x < rx + rw + 2 && y > ry - 2 && y < ry + rh + 2
    );
  }

  function cellCenter(cx, cy) { return { x: cx * GRID + GRID / 2, y: cy * GRID + GRID / 2 }; }
  function nearestWalkableCell(x, y) {
    const cols = Math.ceil(W / GRID), rows = Math.ceil(H / GRID);
    const sx = Math.max(0, Math.min(cols - 1, Math.floor(x / GRID)));
    const sy = Math.max(0, Math.min(rows - 1, Math.floor(y / GRID)));
    for (let radius = 0; radius <= 8; radius++) {
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const cx = sx + dx, cy = sy + dy;
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
        const p = cellCenter(cx, cy);
        if (!blocked(p.x, p.y)) return { cx, cy };
      }
    }
    return null;
  }

  // A* для кліку по карті: персонаж обходить корпуси, а не впирається в них.
  function findPath(from, to) {
    const cols = Math.ceil(W / GRID), rows = Math.ceil(H / GRID);
    const start = nearestWalkableCell(from.x, from.y);
    const goal = nearestWalkableCell(to.x, to.y);
    if (!start || !goal) return [];
    const key = (x, y) => y * cols + x;
    const point = id => ({ cx: id % cols, cy: Math.floor(id / cols) });
    const startId = key(start.cx, start.cy), goalId = key(goal.cx, goal.cy);
    const open = [startId], openSet = new Set(open), came = new Map();
    const heuristic = (x, y) => { const dx = Math.abs(goal.cx - x), dy = Math.abs(goal.cy - y); return 14 * Math.min(dx, dy) + 10 * (Math.max(dx, dy) - Math.min(dx, dy)); };
    const gScore = new Map([[startId, 0]]), fScore = new Map([[startId, heuristic(start.cx, start.cy)]]);
    const dirs = [[1,0,10],[-1,0,10],[0,1,10],[0,-1,10],[1,1,14],[1,-1,14],[-1,1,14],[-1,-1,14]];
    let found = false, guard = 0;
    while (open.length && guard++ < cols * rows * 3) {
      open.sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity));
      const current = open.shift(); openSet.delete(current);
      if (current === goalId) { found = true; break; }
      const c = point(current);
      for (const [dx, dy, cost] of dirs) {
        const nx = c.cx + dx, ny = c.cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const np = cellCenter(nx, ny);
        if (blocked(np.x, np.y)) continue;
        if (dx && dy) {
          const a = cellCenter(c.cx + dx, c.cy), b = cellCenter(c.cx, c.cy + dy);
          if (blocked(a.x, a.y) || blocked(b.x, b.y)) continue;
        }
        const nid = key(nx, ny), tentative = (gScore.get(current) ?? Infinity) + cost;
        if (tentative < (gScore.get(nid) ?? Infinity)) {
          came.set(nid, current); gScore.set(nid, tentative);
          fScore.set(nid, tentative + heuristic(nx, ny));
          if (!openSet.has(nid)) { open.push(nid); openSet.add(nid); }
        }
      }
    }
    if (!found) return [];
    const ids = [goalId];
    while (ids[0] !== startId) {
      const prev = came.get(ids[0]);
      if (prev == null) break;
      ids.unshift(prev);
    }
    const result = ids.map(id => { const c = point(id); return cellCenter(c.cx, c.cy); });
    const finalPoint = blocked(to.x, to.y) ? cellCenter(goal.cx, goal.cy) : to;
    if (!result.length || Math.hypot(result[result.length - 1].x - finalPoint.x, result[result.length - 1].y - finalPoint.y) > 5) result.push(finalPoint);
    return result;
  }

  function renderPrompt() {
    if (!promptEl) return;
    if (!near || insideLock === near.id) { promptEl.hidden = true; return; }
    const st = stateFn(near.id);
    promptEl.hidden = false;
    promptEl.innerHTML = st === "locked"
        ? `🔒 ${esc(near.name)} — відкриється у Главі 4`
        : `<kbd>E</kbd> Увійти: ${esc(near.name)}`;
  }

  function enter(id) {
    const st = stateFn(id);
    const p = MAP_POINTS.find(x => x.id === id);
    if (st === "locked" || st === "hidden") {
      Sound.sfx("err"); toast("🔒 " + (p?.name || "Ця локація") + " відкриється у Главі 4");
      return;
    }
    if (!resolver) return;
    Sound.sfx("door");
    const r = resolver; resolver = null; insideLock = id; near = null; renderPrompt();
    r(id);
  }

  function frame(now) {
    if (!active) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    let dx = 0, dy = 0;
    const uiBusy = $("#layer").childElementCount > 0 || !$("#dialog").hidden || !resolver;
    if (uiBusy) {
      Object.keys(keys).forEach(k => keys[k] = false);
      for (const k in tapped) delete tapped[k];
      path = []; target = null; autoEnter = null;
    }
    const K = k => keys[k] || tapped[k];
    if (!uiBusy) {
      if (K("ArrowLeft") || K("a") || K("ф")) dx -= 1;
      if (K("ArrowRight") || K("d") || K("в")) dx += 1;
      if (K("ArrowUp") || K("w") || K("ц")) dy -= 1;
      if (K("ArrowDown") || K("s") || K("і") || K("ы")) dy += 1;
    }
    for (const k in tapped) delete tapped[k];
    if (dx || dy) { path = []; target = null; autoEnter = null; }
    else if (!uiBusy && path.length) {
      const wp = path[0], vx = wp.x - hero.x, vy = wp.y - hero.y, d = Math.hypot(vx, vy);
      if (d <= Math.max(5, 220 * dt)) {
        hero.x = wp.x; hero.y = wp.y; path.shift();
        if (!path.length && autoEnter) { const id = autoEnter; autoEnter = null; target = null; enter(id); }
      } else { dx = vx / d; dy = vy / d; }
    }
    hero.moving = !!(dx || dy);
    if (hero.moving) {
      const len = Math.hypot(dx, dy), sp = (path.length ? 220 : 250) * dt;
      const nx = hero.x + dx / len * sp, ny = hero.y + dy / len * sp;
      if (!blocked(nx, hero.y)) hero.x = nx;
      if (!blocked(hero.x, ny)) hero.y = ny;
      hero.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
      hero.phase += dt * 14;
      if (now - lastStep > 300) { Sound.sfx("step"); lastStep = now; }
    }

    let n = null, best = 48;
    for (const p of MAP_POINTS) {
      if (p.spawnOnly || stateFn(p.id) === "hidden") continue;
      const d = Math.hypot(hero.x - p.tx, hero.y - p.ty);
      if (d < best) { best = d; n = p; }
    }
    if (insideLock && (!n || n.id !== insideLock)) insideLock = null;
    if (n !== near) { near = n; renderPrompt(); }

    const ctx = cv().getContext("2d");
    drawMapBase(ctx);
    drawMovingTram(ctx, dt);
    // Однотонна смуга під інформаційною колонкою: карта не просвічує.
    ctx.fillStyle = "#13233a";
    ctx.fillRect(0, 0, 300, H);
    const pts = MAP_POINTS.filter(p => !p.spawnOnly && stateFn(p.id) !== "hidden").sort((a, b) => a.y - b.y);
    let heroDrawn = false;
    for (const p of pts) {
      if (!heroDrawn && hero.y < p.y) { drawHero(ctx); heroDrawn = true; }
      drawStand(ctx, p, stateFn(p.id));
      drawLabel(ctx, p, stateFn(p.id), t);
    }
    if (!heroDrawn) drawHero(ctx);
    if (target) {
      ctx.strokeStyle = "rgba(217,162,27,.95)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(target.x, target.y, 9 + Math.sin(t * 6) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    if (dusk > 0) { ctx.fillStyle = `rgba(40,30,90,${dusk * 0.55})`; ctx.fillRect(0, 0, W, H); }
    requestAnimationFrame(frame);
  }

  function normalizeId(id) { return MAP_ALIASES[id] || id; }
  function onKey(e) {
    if (!active) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.type === "keydown") {
      if ($("#layer").childElementCount > 0) return;
      if ((k === "e" || k === "у" || k === "Enter" || k === " ") && near && resolver) { enter(near.id); e.preventDefault(); return; }
      keys[k] = true; tapped[k] = true;
      if (k.startsWith("Arrow")) e.preventDefault();
    } else keys[k] = false;
  }
  addEventListener("keydown", onKey); addEventListener("keyup", onKey);
  addEventListener("blur", () => Object.keys(keys).forEach(k => keys[k] = false));

  function onClick(e) {
    if (!active || !resolver || $("#layer").childElementCount > 0) return;
    const r = cv().getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const points = MAP_POINTS.filter(p => !p.spawnOnly && stateFn(p.id) !== "hidden");
    const label = points.find(p => {
      const labelY = p.labelY ?? p.y - 18;
      return Math.abs(x - p.x) <= 28 && y >= labelY - 45 && y <= labelY + 13;
    });
    const p = label || points.find(p => {
      const [rx, ry, rw, rh] = p.hit;
      return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
    });
    if (p && Math.hypot(hero.x - p.tx, hero.y - p.ty) < 48) { enter(p.id); return; }
    const destination = p ? { x: p.tx, y: p.ty } : { x, y };
    path = findPath(hero, destination);
    target = path.length ? path[path.length - 1] : null;
    autoEnter = path.length && p ? p.id : null;
  }

  function ensurePanels() {
    if (!promptEl) {
      promptEl = document.createElement("div"); promptEl.className = "mapprompt"; promptEl.hidden = true; $("#stage").appendChild(promptEl);
      helpEl = document.createElement("div"); helpEl.className = "maphelp"; helpEl.textContent = "WASD / стрілки — ходити · клік — іти до точки · E — увійти"; $("#stage").appendChild(helpEl);
      sidebarEl = document.createElement("div"); sidebarEl.className = "map-sidebar";
      $("#stage").appendChild(sidebarEl);
      legendEl = document.createElement("aside"); legendEl.className = "map-legend"; legendEl.innerHTML = MAP_LEGEND_HTML; legendEl.hidden = true;
      sidebarEl.appendChild(legendEl);
    }
  }

  return {
    show(fn, opts = {}) {
      stateFn = fn; avatar = S.player.avatar || 0;
      const c = cv(); c.hidden = false;
      if (!c._bound) { c.addEventListener("click", onClick); c._bound = true; }
      ensurePanels();
      $("#stage").classList.add("map-open");
      sidebarEl.appendChild($("#tasks"));
      sidebarEl.hidden = false;
      helpEl.hidden = false; legendEl.hidden = false;
      if (opts.from) {
        const id = normalizeId(opts.from), p = MAP_POINTS.find(p => p.id === id);
        if (p) {
          hero.x = p.tx; hero.y = Math.min(H - 28, p.ty + 18);
          if (blocked(hero.x, hero.y)) { hero.x = p.tx; hero.y = p.ty - 18; }
          hero.dir = "down"; insideLock = id;
        }
      }
      if (!active) { active = true; last = performance.now(); requestAnimationFrame(frame); }
      renderPrompt();
    },
    wait() { return new Promise(r => { resolver = r; renderPrompt(); }); },
    cancelWait() { resolver = null; path = []; target = null; autoEnter = null; renderPrompt(); },
    hide() {
      active = false; const c = cv(); c.hidden = true;
      if (promptEl) promptEl.hidden = true;
      if (helpEl) helpEl.hidden = true;
      if (legendEl) legendEl.hidden = true;
      if (sidebarEl) sidebarEl.hidden = true;
      $("#stage").classList.remove("map-open");
      // За межами карти звичайна панель завдань має бути на старому місці.
      const tasks = $("#tasks");
      if (tasks && tasks.parentElement !== $("#stage")) $("#stage").appendChild(tasks);
      resolver = null; target = null; path = []; autoEnter = null; near = null;
      Object.keys(keys).forEach(k => keys[k] = false);
    },
    refresh() { renderPrompt(); },
    set dusk(v) { dusk = v; },
    get hero() { return hero; },
    get isActive() { return active; },
    get waiting() { return !!resolver; },
    stateOf(id) { return stateFn ? stateFn(normalizeId(id)) : null; },
    enterForTest(id) { if (resolver) { const r = resolver; resolver = null; insideLock = normalizeId(id); r(normalizeId(id)); } },
    prerender() { const c = document.createElement("canvas"); c.width = W; c.height = H; drawMapBase(c.getContext("2d")); return c; },
    reset() { hero = { x: 820, y: 660, dir: "up", phase: 0, moving: false }; target = null; path = []; autoEnter = null; near = null; insideLock = null; }
  };
})();