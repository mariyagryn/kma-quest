/** Export the existing procedural game art to editable standalone SVG assets.
 * Run: node scripts/export_graphics.mjs
 * No browser, third-party packages, or network connection are required.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'assets', 'img');
fs.mkdirSync(path.join(dest, 'characters'), { recursive: true });

const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const fmt = value => Number(value.toFixed(3));
let gradientId = 0;
const allDefs = [];

class Gradient {
  constructor(type, coords) { this.type = type; this.coords = coords; this.stops = []; this.id = `g${++gradientId}`; this.written = false; }
  addColorStop(offset, color) { this.stops.push([offset, color]); }
  url() {
    if (!this.written) {
      const [x0, y0, r0, x1, y1, r1] = this.coords;
      const attrs = this.type === 'linear'
        ? `x1="${x0}" y1="${y0}" x2="${r0}" y2="${x1}"`
        : `cx="${x1}" cy="${y1}" r="${r1}" fx="${x0}" fy="${y0}"`;
      const tag = this.type === 'linear' ? 'linearGradient' : 'radialGradient';
      allDefs.push(`<${tag} id="${this.id}" gradientUnits="userSpaceOnUse" ${attrs}>${this.stops.map(([offset, color]) => `<stop offset="${offset * 100}%" stop-color="${color}"/>`).join('')}</${tag}>`);
      this.written = true;
    }
    return `url(#${this.id})`;
  }
}

class SvgContext {
  constructor() {
    this.body = []; this.path = ''; this.current = null;
    this.fillStyle = '#000'; this.strokeStyle = '#000'; this.lineWidth = 1;
    this.font = '16px sans-serif'; this.textAlign = 'left'; this.globalAlpha = 1;
    this.transform = [1, 0, 0, 1, 0, 0]; this.stack = [];
  }
  style(value) { return value instanceof Gradient ? value.url() : escape(value); }
  common() { const [a,b,c,d,e,f] = this.transform; return ` opacity="${this.globalAlpha}" transform="matrix(${a} ${b} ${c} ${d} ${e} ${f})"`; }
  fillRect(x,y,w,h) { this.body.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${this.style(this.fillStyle)}"${this.common()}/>`); }
  strokeRect(x,y,w,h) { this.body.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${this.style(this.strokeStyle)}" stroke-width="${this.lineWidth}"${this.common()}/>`); }
  clearRect() {}
  beginPath() { this.path = ''; this.current = null; }
  moveTo(x,y) { this.path += `M${fmt(x)} ${fmt(y)} `; this.current = [x,y]; }
  lineTo(x,y) { this.path += `${this.current ? 'L' : 'M'}${fmt(x)} ${fmt(y)} `; this.current = [x,y]; }
  quadraticCurveTo(x1,y1,x2,y2) { this.path += `Q${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)} `; this.current = [x2,y2]; }
  arcTo(x1,y1,x2,y2,r) { // rounded corners used by the game's simple rounded rectangles
    if (!this.current || !r) { this.lineTo(x1,y1); return; }
    const [x0,y0] = this.current;
    const v1 = [x0-x1,y0-y1], v2 = [x2-x1,y2-y1];
    const len1=Math.hypot(...v1),len2=Math.hypot(...v2);
    if (!len1 || !len2) { this.lineTo(x1,y1); return; }
    const d=Math.min(r, len1/2, len2/2);
    const p=[x1+v1[0]/len1*d,y1+v1[1]/len1*d];
    const q=[x1+v2[0]/len2*d,y1+v2[1]/len2*d];
    this.lineTo(...p); this.quadraticCurveTo(x1,y1,...q);
  }
  curvePoints(cx,cy,rx,ry,rotation,start,end) {
    const raw = end-start;
    const sweep = Math.abs(raw) >= Math.PI*2 ? Math.PI*2 : ((raw%(Math.PI*2)) + Math.PI*2)%(Math.PI*2);
    const steps = Math.max(8,Math.ceil(sweep*12));
    for(let i=0;i<=steps;i++) {
      const a=start+sweep*i/steps;
      const x=cx+rx*Math.cos(a)*Math.cos(rotation)-ry*Math.sin(a)*Math.sin(rotation);
      const y=cy+rx*Math.cos(a)*Math.sin(rotation)+ry*Math.sin(a)*Math.cos(rotation);
      if(i===0 && !this.current) this.moveTo(x,y); else this.lineTo(x,y);
    }
  }
  arc(cx,cy,r,start,end) { this.curvePoints(cx,cy,r,r,0,start,end); }
  ellipse(cx,cy,rx,ry,rotation,start,end) { this.curvePoints(cx,cy,rx,ry,rotation,start,end); }
  closePath() { this.path += 'Z '; }
  fill() { this.body.push(`<path d="${this.path}" fill="${this.style(this.fillStyle)}"${this.common()}/>`); }
  stroke() { this.body.push(`<path d="${this.path}" fill="none" stroke="${this.style(this.strokeStyle)}" stroke-width="${this.lineWidth}"${this.common()}/>`); }
  createLinearGradient(x0,y0,x1,y1) { return new Gradient('linear',[x0,y0,x1,y1]); }
  createRadialGradient(x0,y0,r0,x1,y1,r1) { return new Gradient('radial',[x0,y0,r0,x1,y1,r1]); }
  fillText(value,x,y) {
    const anchor = this.textAlign === 'center' ? 'middle' : this.textAlign === 'right' ? 'end' : 'start';
    this.body.push(`<text x="${x}" y="${y}" text-anchor="${anchor}" style="font:${escape(this.font)}" fill="${this.style(this.fillStyle)}"${this.common()}>${escape(value)}</text>`);
  }
  drawImage(canvas,x,y) { this.body.push(`<g transform="translate(${x},${y})">${canvas.context.body.join('')}</g>`); }
  save() { this.stack.push({ fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,font:this.font,textAlign:this.textAlign,globalAlpha:this.globalAlpha,transform:[...this.transform] }); }
  restore() { Object.assign(this,this.stack.pop() || {}); }
  translate(x,y) { this.transform[4]+=x; this.transform[5]+=y; }
  scale(x,y) { this.transform[0]*=x; this.transform[3]*=y; }
}

class Canvas { constructor() { this.width=1280; this.height=720; this.context=new SvgContext(); } getContext() { return this.context; } }
const sandbox = vm.createContext({ document:{createElement:() => new Canvas()}, console });
vm.runInContext('function mulberry32(a) { return function() { a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }', sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'src','art.js'),'utf8'), sandbox);

const bgNames = ['title','yardDay','yardEvening','yardFest','kmcEntrance','dean','library','room'];
for (const name of bgNames) {
  allDefs.length = 0;
  const context = new SvgContext(); sandbox.exportContext = context;
  vm.runInContext(`BG[${JSON.stringify(name)}](exportContext, 0)`, sandbox);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs>${allDefs.join('')}</defs>${context.body.join('')}</svg>`;
  fs.writeFileSync(path.join(dest,`bg_${name}.svg`),svg);
  console.log(`bg_${name}.svg`);
}
for (const [type,names] of [['npc',vm.runInContext('Object.keys(CHAR)',sandbox)],['avatar',[0,1,2,3,4,5]]]) {
  for (const name of names) for (const emotion of ['neutral','happy','surprised']) for (const head of [false,true]) {
    const expression = type === 'npc' ? `CHAR[${JSON.stringify(name)}]` : `AVATARS[${name}]`;
    const original = vm.runInContext(`inlineCharSVG(${expression}, ${JSON.stringify(emotion)}, {head:${head}})`,sandbox);
    const width = head ? 160 : 300, height = head ? 160 : 460;
    const svg = original.replace('<svg ', `<svg width="${width}" height="${height}" `);
    const filename = `${type}_${name}_${emotion}${head?'_head':''}.svg`;
    fs.writeFileSync(path.join(dest,'characters',filename),svg);
  }
}
console.log('Exported backgrounds and 78 character portraits.');
