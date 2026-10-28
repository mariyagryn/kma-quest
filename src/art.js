/* =========================================================
   Основна графіка лежить у assets/img/ (WebP/SVG).
   Код малювання залишено як резерв, якщо зовнішній файл відсутній.
   ========================================================= */
const W = 1280, H = 720;
 
/* ---------- Персонажі (SVG) ---------- */
const CHAR = {
  maryana:   { skin: "#f1c7a5", hair: "#6b2f1a", style: "long",     cloth: "#e0a42b", cloth2: "#c98d12", extra: ["hood", "tote"] },
  dana:      { skin: "#f6d3b8", hair: "#d8b26a", style: "ponytail", cloth: "#4a6fa5", cloth2: "#f7f4ee", extra: ["glasses", "cardigan"] },
  guard:     { skin: "#e3b48e", hair: "#9a9a9a", style: "short",    cloth: "#26324f", cloth2: "#1b2338", extra: ["mustache", "cap", "badge"] },
  skovoroda: { skin: "#e9c7a8", hair: "#8a7a6a", style: "cossack",  cloth: "#5a4a7a", cloth2: "#3e3258", extra: ["longmustache", "kontush"] },
  olga:      { skin: "#efc3a0", hair: "#3b2a20", style: "bob",      cloth: "#7a2e3b", cloth2: "#f0e6d8", extra: ["glasses", "scarf"] },
  librarian: { skin: "#ecc4a4", hair: "#b9b4ad", style: "bun",      cloth: "#3f6b4f", cloth2: "#e9e1cf", extra: ["glasses", "cardigan"] },
  president: { skin: "#e8bc98", hair: "#a8a8a8", style: "short",    cloth: "#1f2433", cloth2: "#ffffff", extra: ["beard", "tie"] }
};
const AVATARS = [
  { skin: "#f3cfb3", hair: "#2b1d16", style: "short",    cloth: "#2f7d6d", cloth2: "#22594e", label: "Тимко" },
  { skin: "#f1c7a5", hair: "#a2502a", style: "long",     cloth: "#3e5aa8", cloth2: "#2e4583", label: "Ярина" },
  { skin: "#c98e66", hair: "#1a1210", style: "curly",    cloth: "#d9a21b", cloth2: "#a8770a", label: "Марко" },
  { skin: "#f6d9c2", hair: "#e3c27a", style: "bob",      cloth: "#c2452d", cloth2: "#8f2f1d", label: "Оля" },
  { skin: "#8d5a3c", hair: "#140d0a", style: "buzz",     cloth: "#6b4fa0", cloth2: "#4e3878", label: "Давид" },
  { skin: "#eac09c", hair: "#4a2b1b", style: "ponytail", cloth: "#2b3350", cloth2: "#1b2135", label: "Соля" }
];
 
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * k))); g = Math.max(0, Math.min(255, Math.round(g * k))); b = Math.max(0, Math.min(255, Math.round(b * k)));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
 
function inlineCharSVG(spec, emo = "neutral", opts = {}) {
  const s = spec, ex = s.extra || [], hd = shade(s.hair, 0.8), sk2 = shade(s.skin, 0.9);
  const crop = opts.head ? 'viewBox="70 110 160 160"' : 'viewBox="0 0 300 460"';
  let back = "", front = "", acc = "", body = "";
  // hair back layer
  if (s.style === "long") back = `<path d="M86 190 C82 122 120 110 150 110 C180 110 218 122 214 190 L218 310 C196 326 104 326 82 310 Z" fill="${s.hair}"/>`;
  if (s.style === "ponytail") back = `<path d="M205 165 C250 175 252 260 232 300 C228 250 214 220 200 205 Z" fill="${s.hair}"/>`;
  if (s.style === "bun") back = `<circle cx="150" cy="118" r="30" fill="${s.hair}"/>`;
  if (s.style === "cossack") back = `<path d="M90 200 C86 170 96 150 110 140 L190 140 C204 150 214 170 210 200 L214 285 C190 300 110 300 86 285 Z" fill="${s.hair}"/>`;
  if (s.style === "curly") back = [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = Math.PI + i * Math.PI / 7; return `<circle cx="${150 + Math.cos(a) * 64}" cy="${190 + Math.sin(a) * 70}" r="24" fill="${s.hair}"/>`; }).join("");
  // body
  body = `<path d="M44 470 C44 372 86 326 150 326 C214 326 256 372 256 470 Z" fill="${s.cloth}"/>`;
  if (ex.includes("hood")) body += `<path d="M96 338 C110 312 190 312 204 338 C190 356 110 356 96 338 Z" fill="${s.cloth2}"/><path d="M134 350 L130 400 M166 350 L170 400" stroke="#f7f4ee" stroke-width="4" stroke-linecap="round"/>`;
  if (ex.includes("tote")) body += `<path d="M212 340 L120 470" stroke="#2f7d6d" stroke-width="12" stroke-linecap="round"/>`;
  if (ex.includes("cardigan")) body += `<path d="M120 330 L150 410 L180 330 Z" fill="${s.cloth2}"/><circle cx="150" cy="425" r="4" fill="${shade(s.cloth, .7)}"/><circle cx="150" cy="448" r="4" fill="${shade(s.cloth, .7)}"/>`;
  if (ex.includes("kontush")) body += `<path d="M118 330 L150 380 L182 330" fill="none" stroke="#d9a21b" stroke-width="6"/>${[395, 420, 445].map(y => `<circle cx="150" cy="${y}" r="5" fill="#d9a21b"/>`).join("")}<path d="M60 470 C70 400 90 360 110 340" stroke="${s.cloth2}" stroke-width="10" fill="none"/>`;
  if (ex.includes("tie")) body += `<path d="M122 330 L150 392 L178 330 Z" fill="${s.cloth2}"/><path d="M144 340 L156 340 L160 400 L150 414 L140 400 Z" fill="#2f5d9a"/><path d="M122 330 L104 400 L150 392 Z M178 330 L196 400 L150 392 Z" fill="${shade(s.cloth, 1.3)}"/>`;
  if (ex.includes("badge")) body += `<path d="M186 372 l8 -6 l8 6 l-2 12 l-6 4 l-6 -4 z" fill="#d9a21b"/><path d="M60 410 L240 410" stroke="${s.cloth2}" stroke-width="3" opacity=".5"/>`;
  if (ex.includes("scarf")) body += `<path d="M110 326 C130 350 170 350 190 326 L196 340 C170 370 130 370 104 340 Z" fill="#c9a35a"/><path d="M160 350 L176 420 L160 424 Z" fill="#c9a35a"/>`;
  const neck = `<rect x="132" y="262" width="36" height="70" rx="14" fill="${sk2}"/>`;
  const head = `<ellipse cx="150" cy="198" rx="60" ry="70" fill="${s.skin}"/><ellipse cx="90" cy="205" rx="10" ry="15" fill="${sk2}"/><ellipse cx="210" cy="205" rx="10" ry="15" fill="${sk2}"/>`;
  // front hair
  const H_ = s.hair;
  if (s.style === "long") front = `<path d="M90 190 C86 132 122 118 150 118 C186 118 214 134 210 190 C196 160 176 146 150 150 C130 152 112 164 90 190 Z" fill="${H_}"/>`;
  if (s.style === "ponytail") front = `<path d="M90 186 C88 132 124 120 152 120 C184 120 214 138 210 186 C186 150 140 140 90 186 Z" fill="${H_}"/>`;
  if (s.style === "bob") front = `<path d="M84 230 C76 140 118 116 150 116 C186 116 226 140 216 230 C210 200 206 170 190 158 C160 168 120 160 104 168 C94 186 92 210 84 230 Z" fill="${H_}"/>`;
  if (s.style === "bun") front = `<path d="M90 180 C92 138 122 124 150 124 C180 124 210 140 210 180 C190 154 112 154 90 180 Z" fill="${H_}"/>`;
  if (s.style === "short") front = `<path d="M90 182 C88 132 124 118 150 118 C182 118 214 132 210 182 C200 160 186 148 168 146 C150 150 120 146 106 160 C98 168 94 176 90 182 Z" fill="${H_}"/>`;
  if (s.style === "buzz") front = `<path d="M92 176 C92 132 124 122 150 122 C178 122 208 132 208 176 C180 150 120 150 92 176 Z" fill="${H_}" opacity=".95"/>`;
  if (s.style === "curly") front = [0, 1, 2, 3, 4].map(i => `<circle cx="${102 + i * 24}" cy="${140 + (i % 2) * 8}" r="22" fill="${H_}"/>`).join("");
  if (s.style === "cossack") front = `<path d="M92 196 C92 176 98 164 106 158 C104 176 104 186 100 200 Z M208 196 C208 176 202 164 194 158 C196 176 196 186 200 200 Z" fill="${H_}"/>`;
  // face
  let eyes, brows, mouth, cheeks = "";
  const ey = 200;
  if (emo === "happy") {
    eyes = `<path d="M114 ${ey + 2} q12 -12 24 0 M162 ${ey + 2} q12 -12 24 0" stroke="#2a1c16" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    brows = `<path d="M110 ${ey - 22} q16 -8 30 -2 M160 ${ey - 24} q14 -6 30 2" stroke="${hd}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    mouth = `<path d="M128 236 Q150 262 172 236 Q150 244 128 236 Z" fill="#7a2a22"/><path d="M134 238 Q150 246 166 238" stroke="#fff" stroke-width="3" fill="none"/>`;
    cheeks = `<ellipse cx="114" cy="226" rx="12" ry="7" fill="#e88a7a" opacity=".45"/><ellipse cx="186" cy="226" rx="12" ry="7" fill="#e88a7a" opacity=".45"/>`;
  } else if (emo === "surprised") {
    eyes = `<circle cx="126" cy="${ey}" r="9" fill="#fff"/><circle cx="126" cy="${ey}" r="6" fill="#2a1c16"/><circle cx="174" cy="${ey}" r="9" fill="#fff"/><circle cx="174" cy="${ey}" r="6" fill="#2a1c16"/>`;
    brows = `<path d="M110 ${ey - 30} q16 -10 30 -2 M160 ${ey - 32} q14 -8 30 2" stroke="${hd}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    mouth = `<ellipse cx="150" cy="242" rx="10" ry="13" fill="#7a2a22"/>`;
  } else {
    eyes = `<ellipse cx="126" cy="${ey}" rx="6" ry="7" fill="#2a1c16"/><ellipse cx="174" cy="${ey}" rx="6" ry="7" fill="#2a1c16"/><circle cx="128" cy="${ey - 2}" r="2" fill="#fff"/><circle cx="176" cy="${ey - 2}" r="2" fill="#fff"/>`;
    brows = `<path d="M112 ${ey - 20} q14 -6 28 -1 M160 ${ey - 21} q14 -5 28 1" stroke="${hd}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    mouth = `<path d="M134 238 Q150 248 166 238" stroke="#7a2a22" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  }
  const nose = `<path d="M150 208 q-6 14 0 18" stroke="${shade(s.skin, .78)}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (ex.includes("glasses")) acc += `<g fill="none" stroke="#2a2a35" stroke-width="4"><circle cx="126" cy="200" r="17"/><circle cx="174" cy="200" r="17"/><path d="M143 200 h14 M109 196 l-16 -4 M191 196 l16 -4"/></g>`;
  if (ex.includes("mustache")) acc += `<path d="M122 228 C134 218 146 222 150 226 C154 222 166 218 178 228 C166 232 156 232 150 230 C144 232 134 232 122 228 Z" fill="#8e8e8e"/>`;
  if (ex.includes("longmustache")) acc += `<path d="M112 248 C120 226 142 222 150 228 C158 222 180 226 188 248 C178 236 162 234 150 234 C138 234 122 236 112 248 Z" fill="${s.hair}"/>`;
  if (ex.includes("beard")) acc += `<path d="M96 214 C100 270 124 286 150 286 C176 286 200 270 204 214 C196 248 176 256 150 256 C124 256 104 248 96 214 Z" fill="${s.hair}"/>`;
  if (ex.includes("cap")) acc += `<path d="M84 160 C90 110 210 110 216 160 Z" fill="#1f2a44"/><path d="M78 158 L222 158 L230 172 L70 172 Z" fill="#141c30"/><circle cx="150" cy="138" r="9" fill="#d9a21b"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${crop}>${back}${body}${neck}${head}${front}${brows}${eyes}${nose}${mouth}${cheeks}${acc}</svg>`;
}
function charSVG(spec, emo = "neutral", opts = {}) {
  const npc = Object.keys(CHAR).find(id => CHAR[id] === spec);
  const avatar = AVATARS.indexOf(spec);
  const name = npc ? `npc_${npc}` : avatar >= 0 ? `avatar_${avatar}` : null;
  if (!name) return inlineCharSVG(spec, emo, opts);
  const file = `assets/img/characters/${name}_${emo}${opts.head ? '_head' : ''}.svg`;
  return `<img src="${file}" alt="" draggable="false" loading="eager">`;
}
function npcSVG(id, emo, opts) { return charSVG(CHAR[id], emo, opts); }
 
/* SVG → Image для канви (кат-сцени, сертифікат) */
const imgCache = {};
function svgImage(key, svg) {
  if (imgCache[key]) return imgCache[key];
  const im = new Image();
  const file = /<img\s[^>]*src="([^"]+)"/.exec(svg);
  im.src = file ? file[1] : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  imgCache[key] = im;
  return im;
}
 
/* ---------- Канва: допоміжні ---------- */
function sky(ctx, top, bot, h = H) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, W, h); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function cobbles(ctx, y0, col, col2) {
  ctx.fillStyle = col; ctx.fillRect(0, y0, W, H - y0);
  ctx.strokeStyle = col2; ctx.lineWidth = 1;
  for (let row = 0, y = y0; y < H; row++) {
    const h = 6 + row * 2.2; const w = h * 2.2;
    for (let x = (row % 2) * w / 2 - w; x < W + w; x += w) { ctx.strokeRect(x, y, w, h); }
    y += h;
  }
}
function tree(ctx, x, y, s, c1, c2) {
  ctx.fillStyle = "#5b4030"; ctx.fillRect(x - 5 * s, y - 40 * s, 10 * s, 40 * s);
  ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y - 70 * s, 42 * s, 0, 7); ctx.fill();
  ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(x - 22 * s, y - 56 * s, 28 * s, 0, 7); ctx.arc(x + 24 * s, y - 60 * s, 30 * s, 0, 7); ctx.fill();
}
/* класичний фасад: вікна, пілястри, фронтон */
function facade(ctx, o) {
  const { x, y, w, h, wall, trim, roof, rows = 2, cols = 9, lit } = o;
  ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 30, y - (o.roofH || 50)); ctx.lineTo(x + w - 30, y - (o.roofH || 50)); ctx.lineTo(x + w + 12, y); ctx.fill();
  ctx.fillStyle = wall; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = trim; ctx.fillRect(x - 6, y - 4, w + 12, 12); ctx.fillRect(x - 6, y + h - 14, w + 12, 14);
  const cw = w / cols;
  for (let c = 0; c <= cols; c++) ctx.fillRect(x + c * cw - 4, y + 8, 8, h - 22);
  let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
    const wx = x + c * cw + cw * 0.25, wy = y + 30 + r * (h - 40) / rows, ww = cw * 0.5, wh = (h - 40) / rows * 0.62;
    if (o.door && r === rows - 1 && c === Math.floor(cols / 2)) {
      ctx.fillStyle = o.doorCol || "#4b3424"; ctx.beginPath(); ctx.moveTo(wx - 6, y + h - 14); ctx.lineTo(wx - 6, wy + 10); ctx.arc(wx + ww / 2, wy + 10, ww / 2 + 6, Math.PI, 0); ctx.lineTo(wx + ww + 6, y + h - 14); ctx.fill();
      continue;
    }
    const L = lit ? lit(i) : 0;
    ctx.fillStyle = L > 0 ? `rgba(255,${200 + 30 * L | 0},120,${0.35 + 0.65 * L})` : (o.glass || "#5d7591");
    ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + 8); ctx.arc(wx + ww / 2, wy + 8, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.fill();
    ctx.strokeStyle = trim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh * 0.5); ctx.lineTo(wx + ww, wy + wh * 0.5); ctx.stroke();
    if (L > 0.3) { ctx.fillStyle = `rgba(255,210,120,${0.12 * L})`; ctx.beginPath(); ctx.arc(wx + ww / 2, wy + wh / 2, ww, 0, 7); ctx.fill(); }
  }
  if (o.pediment) {
    const px = x + w / 2, pw = o.pediment;
    ctx.fillStyle = wall; ctx.beginPath(); ctx.moveTo(px - pw / 2, y + 2); ctx.lineTo(px, y - 70); ctx.lineTo(px + pw / 2, y + 2); ctx.fill();
    ctx.strokeStyle = trim; ctx.lineWidth = 8; ctx.stroke();
  }
  if (o.cupola) {
    const px = x + w / 2;
    ctx.fillStyle = wall; ctx.fillRect(px - 26, y - 120, 52, 60);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.ellipse(px, y - 120, 34, 40, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#d9a21b"; ctx.fillRect(px - 2, y - 190, 4, 34); ctx.fillRect(px - 10, y - 180, 20, 4);
  }
}
function person(ctx, x, y, s, col, head = "#e8c2a0", walk = 0) {
  ctx.fillStyle = col; rr(ctx, x - 9 * s, y - 34 * s, 18 * s, 26 * s, 7 * s); ctx.fill();
  ctx.fillStyle = shade(col, .6);
  ctx.fillRect(x - 7 * s + Math.sin(walk) * 2 * s, y - 10 * s, 5 * s, 12 * s); ctx.fillRect(x + 2 * s - Math.sin(walk) * 2 * s, y - 10 * s, 5 * s, 12 * s);
  ctx.fillStyle = head; ctx.beginPath(); ctx.arc(x, y - 42 * s, 8 * s, 0, 7); ctx.fill();
}
function pigeon(ctx, x, y, t, k) {
  const peck = Math.sin(t * 3 + k * 1.7) > 0.6 ? 4 : 0;
  ctx.fillStyle = "#7d8494"; ctx.beginPath(); ctx.ellipse(x, y, 11, 7, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#5d6474"; ctx.beginPath(); ctx.arc(x + 9, y - 6 + peck, 5, 0, 7); ctx.fill();
  ctx.fillStyle = "#e0a42b"; ctx.fillRect(x + 13, y - 6 + peck, 3, 2);
}
 
/* ---------- Фони ---------- */
const BG = {};
const staticCache = {};
function layer(name, fn) {
  if (staticCache[name]) return staticCache[name];
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  fn(c.getContext("2d")); staticCache[name] = c; return c;
}
const STARS = (() => { const r = mulberry32(1632); return Array.from({ length: 90 }, () => [r() * W, r() * 330, r() * 1.6 + 0.4, r() * 6]); })();
 
BG.title = (ctx, t) => {
  sky(ctx, "#0a0f22", "#27325a");
  STARS.forEach(([x, y, s, p]) => { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t * 1.5 + p)})`; ctx.fillRect(x, y, s, s); });
  ctx.fillStyle = "#f3e9c6"; ctx.beginPath(); ctx.arc(1080, 110, 38, 0, 7); ctx.fill();
  ctx.fillStyle = "#0a0f22"; ctx.beginPath(); ctx.arc(1066, 100, 34, 0, 7); ctx.fill();
  facade(ctx, { x: 190, y: 330, w: 900, h: 220, wall: "#5a4a32", trim: "#7a6a52", roof: "#1e3b36", rows: 2, cols: 11, pediment: 300, door: true, glass: "#1b2340", doorCol: "#2a1d14",
    lit: i => { const k = (i * 7) % 22; const on = t - 0.6 - k * 0.32; return on > 0 ? Math.min(1, on * 2) : 0; } });
  ctx.fillStyle = "#0d1326"; ctx.fillRect(0, 550, W, 170);
  for (let i = 0; i < 6; i++) { const x = 40 + i * 240; ctx.fillStyle = "#1a2138"; ctx.fillRect(x, 470, 6, 90); const gl = ctx.createRadialGradient(x + 3, 465, 2, x + 3, 465, 60); gl.addColorStop(0, "rgba(255,210,130,.55)"); gl.addColorStop(1, "rgba(255,210,130,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x + 3, 465, 60, 0, 7); ctx.fill(); ctx.fillStyle = "#ffd98a"; ctx.beginPath(); ctx.arc(x + 3, 465, 7, 0, 7); ctx.fill(); }
};
 
function yardStatic(ctx, mode) {
  const day = mode === "day" || mode === "fest";
  if (day) sky(ctx, "#8fc3e8", "#e6f1f5", 420); else sky(ctx, "#2a2550", "#e08a5a", 420);
  if (day) { ctx.fillStyle = "rgba(255,255,255,.85)"; [[180, 90], [520, 60], [980, 110]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 28, 0, 7); ctx.arc(x + 30, y - 10, 34, 0, 7); ctx.arc(x + 64, y, 26, 0, 7); ctx.fill(); }); }
  else { ctx.fillStyle = "#ffcf8a"; ctx.beginPath(); ctx.arc(1050, 330, 50, 0, 7); ctx.fill(); }
  if (mode === "eve") {
    facade(ctx, { x: 120, y: 230, w: 1040, h: 230, wall: "#d9cfb8", trim: "#f2ead6", roof: "#2f5a4e", rows: 2, cols: 12, cupola: true, door: true, glass: "#3e4a6a", roofH: 60 });
    ctx.fillStyle = "rgba(40,30,80,.35)"; ctx.fillRect(0, 0, W, 460);
  } else {
    facade(ctx, { x: 160, y: 200, w: 960, h: 260, wall: "#e6c27a", trim: "#fbf3df", roof: "#2f7d6d", rows: 2, cols: 11, pediment: 320, door: true, glass: "#6f8fae", roofH: 56 });
    ctx.fillStyle = "#3a4a5a"; ctx.font = "700 22px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#7a5a20"; ctx.fillText("НаУКМА", 640, 182);
  }
  cobbles(ctx, 460, day ? "#c9bfae" : "#6e6070", day ? "#b3a893" : "#5c4f60");
  tree(ctx, 70, 470, 1.4, day ? "#4f8a4a" : "#2f4a3e", day ? "#5f9e58" : "#3a5a48");
  tree(ctx, 1210, 470, 1.5, day ? "#4f8a4a" : "#2f4a3e", day ? "#5f9e58" : "#3a5a48");
  if (mode === "fest") {
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = "#555"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 150 + k * 60); ctx.quadraticCurveTo(640, 250 + k * 60, W, 150 + k * 60); ctx.stroke();
      for (let i = 0; i < 26; i++) { const x = i * 50 + 20, tt = x / W, y = (1 - tt) * (1 - tt) * (150 + k * 60) + 2 * (1 - tt) * tt * (250 + k * 60) + tt * tt * (150 + k * 60); ctx.fillStyle = i % 2 ? "#ffd500" : "#0057b8"; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 26); ctx.fill(); }
    }
  }
  if (mode === "eve") {
    for (let i = 0; i < 4; i++) { const x = 230 + i * 270; ctx.fillStyle = "#2a2438"; ctx.fillRect(x, 420, 6, 110); }
  }
}
BG.yardDay = (ctx, t) => {
  ctx.drawImage(layer("yardDay", c => yardStatic(c, "day")), 0, 0);
  const cols = ["#3e5aa8", "#c2452d", "#2f7d6d", "#6b4fa0", "#d9a21b", "#2b3350"];
  for (let i = 0; i < 9; i++) { const sp = 30 + (i % 4) * 12, dir = i % 2 ? 1 : -1; const x = ((i * 157 + t * sp * dir) % 1500 + 1500) % 1500 - 110; const y = 520 + (i % 3) * 40; person(ctx, x, y, 1 + (i % 3) * 0.15, cols[i % 6], "#e8c2a0", t * 8 + i); }
  for (let k = 0; k < 5; k++) pigeon(ctx, 300 + k * 55 + Math.sin(t * .5 + k) * 6, 650 + (k % 2) * 16, t, k);
};
BG.yardEvening = (ctx, t) => {
  ctx.drawImage(layer("yardEve", c => yardStatic(c, "eve")), 0, 0);
  for (let i = 0; i < 4; i++) { const x = 233 + i * 270; const g = ctx.createRadialGradient(x, 415, 2, x, 415, 70); g.addColorStop(0, `rgba(255,200,120,${.6 + .1 * Math.sin(t * 2 + i)})`); g.addColorStop(1, "rgba(255,200,120,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, 415, 70, 0, 7); ctx.fill(); ctx.fillStyle = "#ffe0a0"; ctx.beginPath(); ctx.arc(x, 415, 8, 0, 7); ctx.fill(); }
  ctx.fillStyle = "rgba(180,220,255,.12)";
  for (let i = 0; i < 18; i++) { const x = (i * 83 + t * 12) % W, y = 300 + ((i * 47 + t * 8) % 300); ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, 7); ctx.fill(); }
};
BG.yardFest = (ctx, t) => {
  ctx.drawImage(layer("yardFest", c => yardStatic(c, "fest")), 0, 0);
  const cols = ["#3e5aa8", "#c2452d", "#2f7d6d", "#6b4fa0", "#d9a21b"];
  for (let i = 0; i < 7; i++) { const x = 140 + i * 160, y = 330 - ((t * 30 + i * 60) % 120); ctx.fillStyle = cols[i % 5]; ctx.beginPath(); ctx.ellipse(x, y, 18, 23, 0, 0, 7); ctx.fill(); ctx.strokeStyle = "#444"; ctx.beginPath(); ctx.moveTo(x, y + 23); ctx.lineTo(x + 4, y + 90); ctx.stroke(); }
};
BG.kmcEntrance = (ctx) => {
  ctx.drawImage(layer("kmcE", c => {
    sky(c, "#d9d2c3", "#c8bfae");
    c.fillStyle = "#b9ad97"; c.fillRect(0, 470, W, 250);
    for (let i = 0; i < 14; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? "#a99c84" : "#c4b89f"; c.fillRect(i * 96, 470 + j * 64, 96, 64); }
    c.fillStyle = "#6b4a2b"; c.fillRect(470, 130, 340, 340); c.fillStyle = "#86603a"; c.fillRect(490, 150, 140, 320); c.fillRect(650, 150, 140, 320);
    c.fillStyle = "#d9a21b"; c.fillRect(620, 300, 10, 30); c.fillRect(650, 300, 10, 30);
    c.fillStyle = "#2b3350"; c.font = "700 30px Unbounded, sans-serif"; c.textAlign = "center"; c.fillText("КМЦ", 640, 110);
    c.fillStyle = "#3c4252"; rr(c, 120, 330, 260, 150, 8); c.fill(); c.fillStyle = "#8fb3cf"; c.fillRect(140, 345, 220, 70);
    c.fillStyle = "#2b3350"; c.font = "600 18px Manrope, sans-serif"; c.fillText("Охорона", 250, 450);
    c.fillStyle = "#9aa3b5"; for (let i = 0; i < 3; i++) { c.fillRect(880 + i * 110, 390, 12, 90); c.fillRect(880 + i * 110, 410, 80, 8); }
    c.fillStyle = "#e9e3d6"; rr(c, 920, 170, 250, 150, 6); c.fill(); c.fillStyle = "#2b3350"; c.font = "700 16px Manrope, sans-serif"; c.textAlign = "left";
    ["Аудиторії", "1 поверх: 101–109", "2 поверх: 201–205", "Зала подій — 3 поверх"].forEach((s, i) => c.fillText(s, 940, 205 + i * 30));
  }), 0, 0);
};
BG.dean = (ctx, t) => {
  ctx.drawImage(layer("dean", c => {
    sky(c, "#efe6d4", "#e2d6bf");
    c.fillStyle = "#a07850"; c.fillRect(0, 500, W, 220);
    c.fillStyle = "#cfe4f2"; c.fillRect(900, 90, 280, 260); c.strokeStyle = "#f7f4ee"; c.lineWidth = 12; c.strokeRect(900, 90, 280, 260); c.beginPath(); c.moveTo(1040, 90); c.lineTo(1040, 350); c.stroke();
    c.fillStyle = "#7a5432"; c.fillRect(70, 110, 330, 380);
    const fc = ["#c2452d", "#2f7d6d", "#3e5aa8", "#d9a21b", "#6b4fa0"];
    for (let r = 0; r < 4; r++) { c.fillStyle = "#5e3f22"; c.fillRect(70, 190 + r * 90, 330, 8); for (let i = 0; i < 11; i++) { c.fillStyle = fc[(i + r) % 5]; c.fillRect(84 + i * 28, 120 + r * 90, 22, 70); } }
    c.fillStyle = "#6b4a2b"; c.fillRect(300, 450, 680, 40); c.fillRect(320, 490, 30, 120); c.fillRect(930, 490, 30, 120);
    c.fillStyle = "#2b3350"; c.fillRect(700, 330, 190, 120); c.fillStyle = "#8fb3cf"; c.fillRect(710, 340, 170, 90);
    c.fillStyle = "#f7f4ee"; for (let i = 0; i < 6; i++) c.fillRect(380 + i * 4, 420 - i * 9, 160, 9);
    c.fillStyle = "#2b3350"; c.font = "700 20px Unbounded, sans-serif"; c.textAlign = "center"; c.fillText("ДЕКАНАТ", 640, 70);
  }), 0, 0);
  ctx.fillStyle = "#1f2433"; rr(ctx, 590, 420, 70, 30, 6); ctx.fill();
  if (Math.floor(t * 2) % 14 === 0) { ctx.fillStyle = "#c2452d"; ctx.beginPath(); ctx.arc(625, 412, 6, 0, 7); ctx.fill(); }
};
BG.library = (ctx, t) => {
  ctx.drawImage(layer("lib", c => {
    sky(c, "#2d3a33", "#46554a");
    for (let i = 0; i < 3; i++) { const x = 330 + i * 230; c.fillStyle = "#c8d8d0"; c.beginPath(); c.moveTo(x, 330); c.lineTo(x, 130); c.arc(x + 70, 130, 70, Math.PI, 0); c.lineTo(x + 140, 330); c.fill(); }
    const bc = ["#8c2f3c", "#2f5d4e", "#3e5aa8", "#a8770a", "#5a4a7a", "#6b4a2b"];
    [[20, 260], [1020, 260]].forEach(([x, w]) => { c.fillStyle = "#4a3220"; c.fillRect(x, 60, w, 500); for (let r = 0; r < 6; r++) { c.fillStyle = "#33220f"; c.fillRect(x, 140 + r * 76, w, 8); for (let i = 0; i < 18; i++) { c.fillStyle = bc[(i * 3 + r) % 6]; const h = 52 + (i * 7 + r * 3) % 18; c.fillRect(x + 8 + i * 14, 140 + r * 76 - h, 12, h); } } });
    c.fillStyle = "#5a3b22"; c.fillRect(250, 480, 780, 26); c.fillRect(270, 506, 20, 120); c.fillRect(990, 506, 20, 120);
    c.fillStyle = "#3b2a1a"; c.fillRect(0, 600, W, 120);
    [380, 640, 900].forEach(x => { c.fillStyle = "#c9a35a"; c.fillRect(x - 3, 430, 6, 50); c.fillStyle = "#2f7d4e"; c.beginPath(); c.ellipse(x, 430, 40, 16, 0, Math.PI, 0); c.fill(); });
  }), 0, 0);
  [380, 640, 900].forEach(x => { const g = ctx.createRadialGradient(x, 450, 4, x, 450, 120); g.addColorStop(0, "rgba(255,220,140,.35)"); g.addColorStop(1, "rgba(255,220,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, 450, 120, 0, 7); ctx.fill(); });
};
BG.room = (ctx) => {
  ctx.drawImage(layer("room", c => {
    sky(c, "#e9d9c8", "#d6c3ae");
    c.fillStyle = "#9c7b5c"; c.fillRect(0, 520, W, 200);
    c.fillStyle = "#cfe8f5"; c.fillRect(840, 90, 300, 250); c.strokeStyle = "#f7f4ee"; c.lineWidth = 12; c.strokeRect(840, 90, 300, 250);
    c.fillStyle = "#ffd88a"; c.beginPath(); c.arc(1060, 150, 30, 0, 7); c.fill();
    c.fillStyle = "#6b8fbf"; c.fillRect(60, 420, 520, 120); c.fillStyle = "#f7f4ee"; c.fillRect(70, 400, 140, 40);
    c.fillStyle = "#7a5432"; c.fillRect(700, 420, 420, 22); c.fillRect(720, 442, 20, 120); c.fillRect(1080, 442, 20, 120);
    c.fillStyle = "#f7f4ee"; c.fillRect(380, 120, 200, 160); c.fillStyle = "#c2452d"; c.fillRect(380, 120, 200, 36);
    c.fillStyle = "#fff"; c.font = "700 20px Manrope, sans-serif"; c.textAlign = "center"; c.fillText("СЕРПЕНЬ", 480, 146);
    c.fillStyle = "#2b3350"; c.font = "600 14px Manrope, sans-serif";
    for (let i = 0; i < 28; i++) c.fillText(String(i + 1), 400 + (i % 7) * 27, 180 + Math.floor(i / 7) * 24);
  }), 0, 0);
};
BG.blank = (ctx) => { ctx.fillStyle = "#141b2e"; ctx.fillRect(0, 0, W, H); };
 
/* Маленький персонаж зверху (карта, прев'ю аватара) */
function drawChibi(ctx, a, x, y, dir = "down", phase = null, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const sw = phase !== null ? Math.sin(phase) * 4 : 0;
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, 4, 14, 6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = shade(a.cloth, .55); ctx.fillRect(-7, -10 + sw * .5, 5, 12); ctx.fillRect(2, -10 - sw * .5, 5, 12);
  ctx.fillStyle = a.cloth; rr(ctx, -11, -30, 22, 24, 8); ctx.fill();
  if (dir === "left" || dir === "right") { ctx.fillStyle = shade(a.cloth, .8); ctx.fillRect(dir === "left" ? -3 : -2, -26, 5, 16); }
  ctx.fillStyle = a.skin; ctx.beginPath(); ctx.arc(0, -40, 12, 0, 7); ctx.fill();
  ctx.fillStyle = a.hair;
  if (dir === "up") { ctx.beginPath(); ctx.arc(0, -41, 12.5, 0, 7); ctx.fill(); if (a.style === "ponytail") ctx.fillRect(-3, -36, 6, 12); }
  else {
    ctx.beginPath(); ctx.arc(0, -44, 12, Math.PI, 0); ctx.fill();
    if (a.style === "long" || a.style === "bob") { ctx.fillRect(-12, -44, 5, a.style === "long" ? 16 : 10); ctx.fillRect(7, -44, 5, a.style === "long" ? 16 : 10); }
    if (a.style === "curly") { ctx.beginPath(); ctx.arc(-9, -47, 6, 0, 7); ctx.arc(0, -51, 6, 0, 7); ctx.arc(9, -47, 6, 0, 7); ctx.fill(); }
    if (a.style === "ponytail" && dir !== "down") { ctx.fillRect(dir === "left" ? 8 : -14, -44, 6, 14); }
    ctx.fillStyle = "#2a1c16";
    if (dir === "down") { ctx.fillRect(-5, -40, 3, 4); ctx.fillRect(2, -40, 3, 4); }
    else ctx.fillRect(dir === "left" ? -7 : 4, -40, 3, 4);
  }
  ctx.restore();
}
 
