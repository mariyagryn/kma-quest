/** Render the game's original note sequences as standalone WAV files.
 * Run: node scripts/export_audio.mjs
 * Uses only Node.js. No external recordings or audio dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = fs.readFileSync(path.join(root,'src/audio.js'),'utf8');
const injected = script.replace('  function compile(th) {', '  globalThis.__exportThemes = THEMES; function compile(th) {');
if(injected === script) throw Error('Cannot locate theme data in src/audio.js');
const context = vm.createContext({});
vm.runInContext(injected, context);
const themes = context.__exportThemes;
const SR = 22050;
const TWO_PI = 2*Math.PI;

const noteIds = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11};
function freq(note) {
  const m=/^([A-G][#b]?)(\d)$/.exec(note);
  if(!m) return 0;
  return 440*2**((noteIds[m[1]]+(Number(m[2])+1)*12-69)/12);
}
function synth(seconds) { return new Float32Array(Math.ceil(seconds*SR)); }
function addTone(out,start,duration,f,gain,wave='sine',decay=0) {
  if(!f || duration<=0) return;
  const at=Math.max(0,Math.floor(start*SR)),end=Math.min(out.length,Math.ceil((start+duration)*SR));
  const attack=Math.min(0.025,duration/5),release=Math.min(0.12,duration/4);
  for(let i=at;i<end;i++) {
    const t=i/SR-start, phase=TWO_PI*f*t;
    let v=Math.sin(phase);
    if(wave==='triangle') v=2/Math.PI*Math.asin(v);
    else if(wave==='square') v=(Math.sin(phase)+Math.sin(3*phase)/3+Math.sin(5*phase)/5)*0.85;
    else if(wave==='pluck') v=(Math.sin(phase)+0.24*Math.sin(2*phase)+0.10*Math.sin(3*phase))*0.8;
    const env=Math.min(1,t/attack,(duration-t)/release)*Math.exp(-decay*t/Math.max(duration,0.1));
    out[i] += v*gain*Math.max(0,env);
  }
}
function addNoise(out,start,duration,gain,seed=1615) {
  const at=Math.max(0,Math.floor(start*SR)),end=Math.min(out.length,Math.ceil((start+duration)*SR));
  let state=seed,filtered=0;
  for(let i=at;i<end;i++) {
    state=(Math.imul(state,1664525)+1013904223)|0;
    const sample=(state/2147483648),t=i/SR-start;
    filtered=filtered*0.65+sample*0.35;
    const env=Math.min(1,t/0.04,(duration-t)/0.09);
    out[i]+=filtered*gain*Math.max(0,env);
  }
}
function exportWav(out,file) {
  // Normalise gently to avoid clipping, but preserve track-to-track differences.
  let peak=0; for(const s of out) peak=Math.max(peak,Math.abs(s));
  const scale=peak>0.92?0.92/peak:1;
  const wav=Buffer.alloc(44+out.length*2);
  wav.write('RIFF',0); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVE',8);
  wav.write('fmt ',12); wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20);
  wav.writeUInt16LE(1,22); wav.writeUInt32LE(SR,24); wav.writeUInt32LE(SR*2,28);
  wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34);
  wav.write('data',36); wav.writeUInt32LE(out.length*2,40);
  for(let i=0;i<out.length;i++) wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,out[i]*scale))*32767),44+i*2);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,wav);
  console.log(`${path.relative(root,file)} (${(out.length/SR).toFixed(1)}s)`);
}

for(const [name,th] of Object.entries(themes)) {
  const mel=[]; let beat=0;
  for(const tok of th.mel.split('|')) {
    const [n,d]=tok.trim().split(/\s+/); const dur=Number(d);
    if(n!=='R') mel.push({b:beat,n,dur}); beat+=dur;
  }
  const beats=Math.max(beat,32),spb=60/th.bpm,perBar=beats/8;
  const out=synth(beats*spb+0.05);
  for(const e of mel) addTone(out,e.b*spb,e.dur*spb*0.94,freq(e.n),0.18,th.harpsi||th.pluck?'pluck':th.wave,th.harpsi||th.pluck?4:0);
  for(let b=0;b<8;b++) {
    const pos=b*perBar*spb;
    if(th.bass) {
      addTone(out,pos,perBar*spb*0.88,freq(th.bass[b]),0.18,'triangle');
      addTone(out,pos+perBar*spb/2,perBar*spb*0.38,freq(th.bass[b])*1.5,0.08,'triangle');
    }
    if(th.chords) for(const n of th.chords[b].split(' ')) addTone(out,pos,perBar*spb*0.91,freq(n),0.035,'sine');
    if(th.arps) th.arps[b].split(' ').forEach((n,i)=>addTone(out,pos+i*perBar*spb/8,perBar*spb/8*1.6,freq(n),0.12,'pluck',4));
    if(th.drums) for(let k=0;k<4;k++) {
      const t=pos+k*perBar*spb/4;
      if(k%2) addNoise(out,t,0.1,0.12,k+100); else addTone(out,t,0.16,110,0.24,'sine',6);
    }
  }
  exportWav(out,path.join(root,'assets','music',`${name}.wav`));
}

const sounds={
  click:[[880,0,.06,.25]], ok:[[523,0,.22,.22],[659,.08,.22,.2],[784,.16,.24,.2],[1047,.24,.3,.18]],
  err:[[160,0,.35,.35]], notif:[[1175,0,.13,.28],[1568,.12,.2,.25]],
  word:[[1319,0,.12,.2],[1760,.09,.25,.18]],
  bell:[[1900,0,.12,.15],[2500,.18,.13,.13],[1900,.36,.12,.12],[2500,.54,.13,.1]],
  stamp:[[100,0,.26,.55]], pop:[[1200,0,.09,.19],[1500,.07,.09,.17],[1800,.14,.09,.15]],
  door:[[170,0,.28,.3]], vibrate:[[70,0,.14,.22],[70,.18,.14,.22],[70,.36,.14,.22]],
  sparkle:[[1568,0,.35,.14],[2093,.1,.35,.14],[2637,.2,.4,.13],[3136,.3,.42,.11]],
  chime:[[784,0,.9,.18],[988,.18,.9,.15],[1175,.36,1.0,.12]],
  print:[[110,0,2.3,.10]], step:[], paper:[], shh:[], whoosh:[]
};
for(const [name,events] of Object.entries(sounds)) {
  const end=Math.max(0.12,...events.map(e=>e[1]+e[2]));
  const duration=name==='print'?2.6:name==='shh'?1.3:name==='paper'?0.9:name==='whoosh'?0.8:Math.max(0.2,end+0.1);
  const out=synth(duration);
  for(const [f,t,d,v] of events) addTone(out,t,d,f,v,f<200?'sine':'triangle',name==='err'?4:0);
  if(['print','step','paper','shh','whoosh','err','stamp'].includes(name)) {
    const d=Math.min(duration-0.05,name==='step'?0.09:name==='print'?2.45:name==='shh'?1.15:0.65);
    addNoise(out,0,d,name==='shh'?0.15:0.09);
  }
  exportWav(out,path.join(root,'assets','sfx',`${name}.wav`));
}

// Separate loops for the five ambient locations; subdued beds with small accents.
const ambience={yard:380,podil:523,office:880,library:0,evening:659};
for(const [name,n] of Object.entries(ambience)) {
  const out=synth(12);
  addNoise(out,0,11.95,name==='podil'?0.028:0.015,1600+n);
  if(n) for(let t=1;t<11;t+=3.3) addTone(out,t,0.42,n,0.037,'sine');
  exportWav(out,path.join(root,'assets','ambience',`${name}.wav`));
}
