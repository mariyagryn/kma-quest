/* =========================================================
   KMA Quest — інтерактивна карта кампусу (Глава 2 і 4).
   Геометрію взято з OpenStreetMap (src/mapdata.js, генерує scripts/osm_campus_map.py):
   реальні контури корпусів, вулиці, газони, трамвайне кільце на Контрактовій
   і справжні адреси закладів (Гіркий — Спаська, Пузата Хата — Контрактова пл.,
   KFC і Сільпо — Сагайдачного, 41). Карту повернуто на 45°, як на схемах НаУКМА:
   вул. Сковороди та Іллінська — вертикально, Волоська — горизонтально, Контрактова площа — внизу.
   Ті самі полігони задають і малюнок, і зіткнення.
   ========================================================= */
const MAP_TRAM = new Image();
MAP_TRAM.src = "assets/img/tram_sprite.png";

// Розпаковка геометрії: плоскі масиви [x0,y0,x1,y1,...] → точки + рамки для швидкої перевірки.
const pairs = a => { const r = []; for (let i = 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; };
const MAP_BUILDINGS = MAP_GEO.b.map(([k, ...xy]) => {
  const p = pairs(xy), xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  return { k, p, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
});

const MAP_POINTS = [
  // Корпуси НаУКМА (номери — як на схемах університету).
  { id: "corp4", name: "4-й корпус" },
  { id: "kmc", name: "КМЦ" },
  { id: "corp7", name: "7-й корпус" },
  { id: "corp6", name: "6-й корпус" },
  { id: "corp5", name: "5-й корпус" },
  { id: "corp10", name: "10-й корпус" },
  { id: "lib11", name: "11-й корпус", subtitle: "БІБЛІОТЕКА" },
  { id: "corp2", name: "2-й корпус" },
  { id: "corp1", name: "1-й корпус", subtitle: "KMA TODAY" },
  { id: "corp3", name: "3-й корпус" },
  // Заклади поруч — на своїх справжніх адресах.
  // На Подолі три «Гіркі»: будь-який із них зараховується в квесті.
  { id: "girkyi", name: "Гіркий", subtitle: "НА ПЛАЦУ", dx: 52, dy: 26 },
  { id: "girkyi2", name: "Гіркий", subtitle: "У ПАРКУ" },
  { id: "girkyi3", name: "Гіркий", subtitle: "БІЛЯ МЕТРО" },
  { id: "puzatka", name: "Пузата Хата" },
  { id: "kfs", name: "KFC", dx: -34 },
  { id: "silpo", name: "Сільпо", dx: 34, dy: -18 },
  // Невеликий стенд Взаємодопомоги на Контрактовій площі.
  { id: "stand4", name: "СО: Взаємодопомога", stand: true },
  // Точка появи в Главі 4 — двір Староакадемічного корпусу. Окремо не відображається.
  { id: "stara", name: "Староакадемічний корпус", spawnOnly: true }
].map(p => { const g = MAP_GEO.pts[p.id], q = Object.assign({}, g, p); q.x = g.x + (p.dx || 0); q.labelY = g.labelY + (p.dy || 0); return q; });

// Ходити можна всюди, крім будівель; зліва — бічна панель.
const MAP_WALK = { x0: 308, x1: W - 10, y0: 6, y1: H - 8 };
function inPoly(x, y, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function mapBlocked(x, y) {
  if (x < MAP_WALK.x0 || x > MAP_WALK.x1 || y < MAP_WALK.y0 || y > MAP_WALK.y1) return true;
  for (const b of MAP_BUILDINGS) {
    if (x < b.x0 - 3 || x > b.x1 + 3 || y < b.y0 - 3 || y > b.y1 + 3) continue;
    if (inPoly(x, y, b.p) || inPoly(x + 3, y, b.p) || inPoly(x - 3, y, b.p) || inPoly(x, y + 3, b.p) || inPoly(x, y - 3, b.p)) return true;
  }
  return false;
}

/* ---------- Малювання (стиль гри: пласка ілюстрація, вид згори з легким нахилом) ---------- */
const MAP_PAL = {
  ground: "#ece3cf", road: "#cdc7ba", roadEdge: "#bab3a5", lawn: "#a9cf7f", lawnEdge: "#8fbb66",
  kma: ["#3f8a6c", "#2a5f4b"], grey: ["#c4bdb0", "#9f988b"], church: ["#f3ede2", "#a59c8b"], cafe: ["#d9a777", "#9c6b40"],
  wall: "#f1e4c4", greyWall: "#e2dacb", ink: "#141b2e", gold: "#d9a21b"
};
const CAFE_STYLE = { girkyi: ["#7a4b32", "☕"], girkyi2: ["#7a4b32", "☕"], girkyi3: ["#7a4b32", "☕"], puzatka: ["#b5562f", "🍲"], kfs: ["#b8322a", "🍗"], silpo: ["#e07b22", "🛒"] };
function polyPath(ctx, p, dx = 0, dy = 0) { ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)); ctx.closePath(); }
function linePath(ctx, p) { ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); }
function mapTree(ctx, x, y, s = 1) {
  ctx.fillStyle = "rgba(40,60,30,.22)"; ctx.beginPath(); ctx.ellipse(x + 3, y + 4, 8 * s, 6 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#4f8a43"; ctx.beginPath(); ctx.arc(x, y, 8 * s, 0, 7); ctx.fill();
  ctx.fillStyle = "#6aa957"; ctx.beginPath(); ctx.arc(x - 2 * s, y - 2 * s, 5 * s, 0, 7); ctx.fill();
}
function drawCampusMap(ctx) {
  const P = MAP_PAL;
  ctx.fillStyle = P.ground; ctx.fillRect(0, 0, W, H);
  // газони й сквери (з деревами всередині)
  const trees = [];
  for (const g of MAP_GEO.green) {
    const p = pairs(g); polyPath(ctx, p); ctx.fillStyle = P.lawn; ctx.fill(); ctx.strokeStyle = P.lawnEdge; ctx.lineWidth = 1.5; ctx.stroke();
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
    for (let x = Math.min(...xs) + 9; x < Math.max(...xs); x += 26) for (let y = Math.min(...ys) + 9; y < Math.max(...ys); y += 26)
      if (inPoly(x, y, p) && ((x * 7 + y * 3) % 5) < 3) trees.push([x, y]);
  }
  // вулиці (спершу бордюр, потім полотно)
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const pass of [0, 1]) for (const [w, ...xy] of MAP_GEO.roads) {
    linePath(ctx, pairs(xy)); ctx.strokeStyle = pass ? P.road : P.roadEdge; ctx.lineWidth = pass ? w : w + 3; ctx.stroke();
  }
  // трамвайна колія (кільце на Контрактовій)
  for (const s of MAP_GEO.tram) {
    linePath(ctx, pairs(s)); ctx.strokeStyle = "#9b9282"; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = "#6f675a"; ctx.lineWidth = 1.2; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);
  }
  // фонтан «Самсон» на Контрактовій площі
  const [fx, fy] = MAP_GEO.fountain;
  ctx.fillStyle = "#d8ccb2"; ctx.beginPath(); ctx.arc(fx, fy, 11, 0, 7); ctx.fill();
  ctx.fillStyle = "#7fb7d6"; ctx.beginPath(); ctx.arc(fx, fy, 7, 0, 7); ctx.fill();
  ctx.fillStyle = P.gold; ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, 7); ctx.fill();
  // будівлі: тінь → південна стіна (зсув униз) → дах
  for (const b of MAP_BUILDINGS) { polyPath(ctx, b.p, 4, 5); ctx.fillStyle = "rgba(40,50,35,.18)"; ctx.fill(); }
  for (const b of MAP_BUILDINGS) {
    const [roof, line] = P[b.k] || P.grey;
    polyPath(ctx, b.p, 0, 4); ctx.fillStyle = b.k === "kma" || b.k === "cafe" ? P.wall : P.greyWall; ctx.fill();
    polyPath(ctx, b.p); ctx.fillStyle = roof; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.stroke();
    if (b.k === "church") {
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      ctx.fillStyle = "#3f8a6c"; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); ctx.fill();
      ctx.fillStyle = P.gold; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 7); ctx.fill();
    }
  }
  // заклади: кругла вивіска з іконкою точно на справжній адресі
  for (const id of Object.keys(CAFE_STYLE)) {
    const pt = MAP_GEO.pts[id]; if (!pt) continue;
    const [col, icon] = CAFE_STYLE[id], x = pt.hit[0] + pt.hit[2] / 2 + (id === "kfs" ? -9 : id === "silpo" ? 9 : 0), y = pt.hit[1] + pt.hit[3] / 2;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); ctx.strokeStyle = "#fffaf0"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "11px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(icon, x, y + 1);
  }
  trees.forEach(([x, y], i) => mapTree(ctx, x, y, 0.85 + (i % 3) * 0.12));
  // орієнтири: пам'ятник Сковороді та метро
  for (const [kind, x, y, text] of MAP_GEO.lm) {
    if (kind === "monument") {
      ctx.fillStyle = "#d8ccb2"; rr(ctx, x - 5, y - 1, 10, 7, 2); ctx.fill();
      ctx.fillStyle = "#8a6d3b"; rr(ctx, x - 3, y - 11, 6, 11, 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, y - 14, 3.2, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = "#d4342c"; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.strokeStyle = "#fffaf0"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "800 11px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("M", x, y + 1);
    }
    ctx.fillStyle = "rgba(20,27,46,.7)"; ctx.font = "italic 700 9px Manrope, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 17);
  }
  // назви вулиць
  ctx.fillStyle = "rgba(20,27,46,.6)"; ctx.font = "italic 700 10px Manrope, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const [name, x, y, a] of MAP_GEO.labels) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillText(name, 0, 0); ctx.restore(); }
  ctx.fillStyle = "rgba(20,27,46,.45)"; ctx.font = "600 9px Manrope, sans-serif"; ctx.textAlign = "right";
  ctx.fillText("© учасники OpenStreetMap", W - 8, H - 4);
}

// Трамвай їде реальною колією: позиція вздовж ламаної, спрайт повертається за напрямком руху.
const MAP_TRAM_PATH = pairs(MAP_GEO.tramPath);
const MAP_TRAM_LEN = MAP_TRAM_PATH.reduce((s, p, i) => i ? s + Math.hypot(p[0] - MAP_TRAM_PATH[i - 1][0], p[1] - MAP_TRAM_PATH[i - 1][1]) : 0, 0);
function tramAt(s) {
  for (let i = 1; i < MAP_TRAM_PATH.length; i++) {
    const [x0, y0] = MAP_TRAM_PATH[i - 1], [x1, y1] = MAP_TRAM_PATH[i], L = Math.hypot(x1 - x0, y1 - y0);
    if (s <= L) return { x: x0 + (x1 - x0) * s / L, y: y0 + (y1 - y0) * s / L, a: Math.atan2(y1 - y0, x1 - x0) };
    s -= L;
  }
  return null;
}

const MAP_ALIASES = {
  lib1: "lib11", lib2: "lib11", stand2: "corp1", dean: "corp4"
};
const MAP_LEGEND_HTML = `
  <div class="map-legend-title">КОРПУСИ НАУКМА</div>
  <ul>
    <li><b>4–7-й корпуси, КМЦ</b><span>квартал між Волоською і Почайнинською · КМЦ — з боку Іллінської</span></li>
    <li><b>11-й (Староакадемічний), 12-й</b><span>вздовж вул. Сковороди · бібліотека, Бібліотека Антоновичів</span></li>
    <li><b>1-й, 2-й, 10-й корпуси</b><span>аудиторії та кафедри · KMA Today у 1-му корпусі</span></li>
    <li><b>3-й корпус</b><span>лекційні зали · виходить на Контрактову площу</span></li>
    <li><b>Поруч</b><span>«Гіркий» — три: на плацу біля 3-го корпусу, у парку біля пам'ятника Сковороді та біля метро · Пузата Хата — Контрактова пл. · KFC і Сільпо — Сагайдачного, 41</span></li>
  </ul>`;

const MapView = (() => {
  const cv = () => $("#map");
  let active = false, stateFn = () => "normal", resolver = null;
  let hero = { x: MAP_GEO.spawn[0], y: MAP_GEO.spawn[1], dir: "up", phase: 0, moving: false };
  let target = null, path = [], autoEnter = null;
  const keys = {}, tapped = {};
  let near = null, lastStep = 0, last = 0, dusk = 0, avatar = 0, insideLock = null;
  let promptEl = null, helpEl = null, legendEl = null, sidebarEl = null;
  const GRID = 6; let walkGrid = null;
  let hover = null, mouse = null, introEl = null, introShown = false, introUntil = 0;

  // Нерухома частина карти малюється один раз у кеш-полотно (після завантаження шрифтів).
  let baseCache = null;
  function drawMapBase(ctx) {
    const q = resQ();
    if (baseCache && baseCache._q !== q) baseCache = null;
    if (!baseCache) { baseCache = document.createElement("canvas"); baseCache._q = q; drawCampusMap(hiRes(baseCache, W, H)); }
    ctx.drawImage(baseCache, 0, 0, W, H);
  }

  // Трамвай проходить кільцем на Контрактовій, потім пауза на «зупинці» — і знову.
  let tramS = 0, tramWait = 2;
  const TRAM_SPEED = 26, TRAM_W = 52, TRAM_H = 22;
  function drawMovingTram(ctx, dt) {
    if (!MAP_TRAM_LEN) return;
    if (tramWait > 0) { tramWait -= dt; if (tramWait <= 0) tramS = 0; return; }
    tramS += TRAM_SPEED * dt;
    if (tramS > MAP_TRAM_LEN) { tramWait = 9; return; }
    const p = tramAt(tramS);
    if (!p || !MAP_TRAM.complete || !MAP_TRAM.naturalWidth) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(300, 0, W - 300, H); ctx.clip();
    ctx.translate(p.x, p.y); ctx.rotate(p.a);
    if (Math.abs(p.a) > Math.PI / 2) ctx.scale(1, -1); // не перевертати вагон догори колесами
    ctx.drawImage(MAP_TRAM, -TRAM_W / 2, -TRAM_H + 6, TRAM_W, TRAM_H);
    ctx.restore();
  }

  // Світіння точки: пульсуюче кільце, що розширюється (яскраве при наведенні, ледь помітне для активних завдань).
  function drawHalo(ctx, p, st, t, isHover) {
    if (p.spawnOnly || p.stand) return;
    if (!isHover && st !== "active") return;
    const [rx, ry, rw, rh] = p.hit, cx = rx + rw / 2, cy = ry + rh / 2, ax = Math.max(16, rw / 2), ay = Math.max(14, rh / 2);
    ctx.save();
    if (isHover) {
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(ax, ay) + 16);
      g.addColorStop(0, "rgba(255,221,110,.5)"); g.addColorStop(1, "rgba(255,221,110,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, ax + 16, ay + 16, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#f2b600"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, ax + 5, ay + 5, 0, 0, 7); ctx.stroke();
    }
    for (let k = 0; k < (isHover ? 2 : 1); k++) {
      const ph = (t * (isHover ? 1.1 : 0.6) + k * 0.5) % 1, e = 6 + ph * (isHover ? 26 : 18);
      ctx.globalAlpha = (isHover ? 0.8 : 0.3) * (1 - ph); ctx.strokeStyle = "#f2b600"; ctx.lineWidth = isHover ? 3 : 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, ax + e, ay + e, 0, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }

  function drawLabel(ctx, p, st, t, isHover) {
    if (p.spawnOnly) return;
    const locked = st === "locked";
    const baseline = p.labelY ?? (p.y - 18);
    ctx.save();
    if (isHover) { ctx.translate(p.x, baseline); ctx.scale(1.14, 1.14); ctx.translate(-p.x, -baseline); }
    ctx.font = "800 11px Manrope, sans-serif";
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
    if (isHover) { ctx.strokeStyle = "#f2b600"; ctx.lineWidth = 2.5; rr(ctx, p.x - width / 2, boxY, width, 26, 8); ctx.stroke(); }
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

  // Підказка біля курсора на місці, куди можна піти.
  function drawTip(ctx, p, st) {
    const nearIt = Math.hypot(hero.x - p.tx, hero.y - p.ty) < 30;
    const txt = st === "locked" ? "🔒 Відкриється пізніше" : nearIt ? "Клік — зайти" : "Клік — піти сюди";
    ctx.save(); ctx.font = "700 12px Manrope, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const w = ctx.measureText(txt).width + 20, x = Math.min(W - w - 8, mouse.x + 16), y = Math.min(H - 24, mouse.y + 22);
    ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 8;
    ctx.fillStyle = "#f2b600"; rr(ctx, x, y - 12, w, 24, 12); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "#141b2e"; ctx.fillText(txt, x + 10, y + 1); ctx.restore();
  }

  // Єдиний хіт-тест для наведення й кліку: будівля/зона або підпис.
  function pointAt(x, y) {
    let best = null, bd = Infinity;
    for (const p of MAP_POINTS) {
      if (p.spawnOnly || stateFn(p.id) === "hidden") continue;
      const [rx, ry, rw, rh] = p.hit, half = Math.max(27, p.name.length * 3.4 + 9), ly = p.labelY ?? p.y;
      const onBox = x >= rx - 8 && x <= rx + rw + 8 && y >= ry - 8 && y <= ry + rh + 8;
      const onLabel = !p.stand && Math.abs(x - p.x) <= half && Math.abs(y - ly) <= 14;
      if (!onBox && !onLabel) continue;
      const d = onLabel ? Math.hypot(x - p.x, y - ly) : Math.hypot(x - (rx + rw / 2), y - (ry + rh / 2));
      if (d < bd) { bd = d; best = p; }
    }
    return best;
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
    drawChibi(ctx, AVATARS[avatar] || AVATARS[0], hero.x, hero.y, hero.dir, hero.moving ? hero.phase : null, 0.55);
  }

  const blocked = mapBlocked;

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
    if (!start || !goal) return [to];
    const key = (x, y) => y * cols + x;
    const point = id => ({ cx: id % cols, cy: Math.floor(id / cols) });
    const startId = key(start.cx, start.cy), goalId = key(goal.cx, goal.cy);
    // Прохідність клітинок рахуємо один раз (карта нерухома), відкритий список — бінарна купа.
    if (!walkGrid) { walkGrid = new Uint8Array(cols * rows); for (let i = 0; i < walkGrid.length; i++) { const c = cellCenter(i % cols, Math.floor(i / cols)); walkGrid[i] = blocked(c.x, c.y) ? 0 : 1; } }
    const free = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && walkGrid[y * cols + x] === 1;
    const came = new Map();
    const heuristic = (x, y) => { const dx = Math.abs(goal.cx - x), dy = Math.abs(goal.cy - y); return 14 * Math.min(dx, dy) + 10 * (Math.max(dx, dy) - Math.min(dx, dy)); };
    const gScore = new Map([[startId, 0]]);
    const heap = [[heuristic(start.cx, start.cy), startId]];
    const push = n => { heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const dirs = [[1,0,10],[-1,0,10],[0,1,10],[0,-1,10],[1,1,14],[1,-1,14],[-1,1,14],[-1,-1,14]];
    const closed = new Uint8Array(cols * rows);
    let found = false;
    while (heap.length) {
      const [, current] = pop();
      if (closed[current]) continue; closed[current] = 1;
      if (current === goalId) { found = true; break; }
      const c = point(current);
      for (const [dx, dy, cost] of dirs) {
        const nx = c.cx + dx, ny = c.cy + dy;
        if (!free(nx, ny)) continue;
        if (dx && dy && (!free(c.cx + dx, c.cy) || !free(c.cx, c.cy + dy))) continue;
        const nid = key(nx, ny), tentative = gScore.get(current) + cost;
        if (tentative < (gScore.get(nid) ?? Infinity)) {
          came.set(nid, current); gScore.set(nid, tentative);
          push([tentative + heuristic(nx, ny), nid]);
        }
      }
    }
    if (!found) return [to];
    const ids = [goalId];
    while (ids[0] !== startId) {
      const prev = came.get(ids[0]);
      if (prev == null) break;
      ids.unshift(prev);
    }
    const result = ids.slice(1).map(id => { const c = point(id); return cellCenter(c.cx, c.cy); });
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
    const r = resolver; resolver = null; insideLock = id; near = null; renderPrompt();
    r(id.startsWith("girkyi") ? "girkyi" : id); // три «Гіркі» — одне й те саме місце для сюжету
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
      if (d < 5) {
        hero.x = wp.x; hero.y = wp.y; path.shift();
        if (!path.length && autoEnter) { const id = autoEnter; autoEnter = null; target = null; enter(id); }
      } else { dx = vx / d; dy = vy / d; }
    }
    hero.moving = !!(dx || dy);
    if (hero.moving) {
      const len = Math.hypot(dx, dy), sp = (path.length ? 170 : 160) * dt;
      const nx = hero.x + dx / len * sp, ny = hero.y + dy / len * sp;
      if (!blocked(nx, hero.y)) hero.x = nx;
      if (!blocked(hero.x, ny)) hero.y = ny;
      hero.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
      hero.phase += dt * 14;
    }

    let n = null, best = 30;
    for (const p of MAP_POINTS) {
      if (p.spawnOnly || stateFn(p.id) === "hidden") continue;
      const d = Math.hypot(hero.x - p.tx, hero.y - p.ty);
      if (d < best) { best = d; n = p; }
    }
    if (insideLock && (!n || n.id !== insideLock)) insideLock = null;
    if (n !== near) { near = n; renderPrompt(); }

    hover = !uiBusy && mouse ? pointAt(mouse.x, mouse.y) : null;
    cv().style.cursor = hover ? "pointer" : "default";
    if (introEl && introUntil && now > introUntil) { introEl.hidden = true; introUntil = 0; }
    const mc = cv(), q = resQ();
    if (mc.width !== Math.round(W * q)) { mc.width = Math.round(W * q); mc.height = Math.round(H * q); }
    const ctx = mc.getContext("2d"); ctx.setTransform(q, 0, 0, q, 0, 0);
    drawMapBase(ctx);
    drawMovingTram(ctx, dt);
    // Однотонна смуга під інформаційною колонкою: карта не просвічує.
    ctx.fillStyle = "#13233a";
    ctx.fillRect(0, 0, 300, H);
    const pts = MAP_POINTS.filter(p => !p.spawnOnly && stateFn(p.id) !== "hidden").sort((a, b) => a.y - b.y);
    for (const p of pts) drawHalo(ctx, p, stateFn(p.id), t, p === hover);
    let heroDrawn = false;
    for (const p of pts) {
      if (!heroDrawn && hero.y < p.y) { drawHero(ctx); heroDrawn = true; }
      drawStand(ctx, p, stateFn(p.id));
      if (p !== hover) drawLabel(ctx, p, stateFn(p.id), t, false);
    }
    if (!heroDrawn) drawHero(ctx);
    if (hover) drawLabel(ctx, hover, stateFn(hover.id), t, true);
    if (hover && mouse) drawTip(ctx, hover, stateFn(hover.id));
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

  function onMove(e) {
    const r = cv().getBoundingClientRect();
    mouse = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function onClick(e) {
    if (!active || !resolver || $("#layer").childElementCount > 0) return;
    const r = cv().getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    if (introEl) { introEl.hidden = true; introUntil = 0; }
    const p = pointAt(x, y);
    if (p && Math.hypot(hero.x - p.tx, hero.y - p.ty) < 30) { enter(p.id); return; }
    const destination = p ? { x: p.tx, y: p.ty } : { x, y };
    path = findPath(hero, destination);
    target = destination;
    autoEnter = p ? p.id : null;
  }

  function ensurePanels() {
    if (!promptEl) {
      promptEl = document.createElement("div"); promptEl.className = "mapprompt"; promptEl.hidden = true; $("#stage").appendChild(promptEl);
      helpEl = document.createElement("div"); helpEl.className = "maphelp"; helpEl.textContent = "🖱 Наведи на місце й клікни — персонаж піде сам · також WASD / стрілки · E — увійти"; $("#stage").appendChild(helpEl);
      introEl = document.createElement("div"); introEl.className = "mapintro"; introEl.hidden = true;
      introEl.innerHTML = "<b>Як тут ходити</b>Наведи курсор на корпус чи заклад — він засвітиться. Клікни, і персонаж сам дійде й зайде всередину.";
      $("#stage").appendChild(introEl);
      sidebarEl = document.createElement("div"); sidebarEl.className = "map-sidebar";
      $("#stage").appendChild(sidebarEl);
      legendEl = document.createElement("aside"); legendEl.className = "map-legend"; legendEl.innerHTML = MAP_LEGEND_HTML; legendEl.hidden = true;
      sidebarEl.appendChild(legendEl);
    }
  }

  return {
    show(fn, opts = {}) {
      stateFn = id => fn(id.startsWith("girkyi") ? "girkyi" : id); avatar = S.player.avatar || 0;
      const c = cv(); c.hidden = false;
      if (!c._bound) { c.addEventListener("click", onClick); c.addEventListener("mousemove", onMove); c.addEventListener("mouseleave", () => { mouse = null; }); c._bound = true; }
      ensurePanels();
      $("#stage").classList.add("map-open");
      sidebarEl.appendChild($("#tasks"));
      sidebarEl.hidden = false;
      helpEl.hidden = false; legendEl.hidden = false;
      if (!introShown) { introShown = true; introEl.hidden = false; introUntil = performance.now() + 14000; }
      if (opts.from) {
        const id = normalizeId(opts.from), p = MAP_POINTS.find(p => p.id === id);
        if (p) {
          hero.x = p.tx; hero.y = p.ty; // точка входу завжди на доріжці
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
      if (introEl) introEl.hidden = true;
      mouse = null; hover = null;
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
    invalidate() { baseCache = null; },
    set dusk(v) { dusk = v; },
    get hero() { return hero; },
    get isActive() { return active; },
    get waiting() { return !!resolver; },
    stateOf(id) { return stateFn ? stateFn(normalizeId(id)) : null; },
    enterForTest(id) { if (resolver) { const r = resolver; resolver = null; insideLock = normalizeId(id); r(normalizeId(id)); } },
    prerender() { const c = document.createElement("canvas"); c.width = W; c.height = H; drawMapBase(c.getContext("2d")); return c; },
    reset() { hero = { x: MAP_GEO.spawn[0], y: MAP_GEO.spawn[1], dir: "up", phase: 0, moving: false }; target = null; path = []; autoEnter = null; near = null; insideLock = null; }
  };
})();
