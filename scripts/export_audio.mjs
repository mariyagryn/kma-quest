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

// Usage: node scripts/export_audio.mjs [music] [sfx] [bells] [ambience] [story]   (no args = all)
// Then convert to MP3, e.g.: for f in assets/{music,ambience,sfx}/*.wav; do ffmpeg -y -loglevel error -i "$f" -b:a 128k "${f%.wav}.mp3"; done
const only=new Set(process.argv.slice(2)); const want=k=>!only.size||only.has(k);

/* ---- Calm visual-novel music renderer (44.1 kHz, seamless loop: the reverb tail is wrapped onto the start) ----
   Felt piano, nylon guitar and warm strings only. No drums, no tape wobble: music must sit quietly under dialogue. */
const MSR=44100;
function rnd(seed){ let s=seed|0; return ()=>((s=(Math.imul(s,1664525)+1013904223)|0)/2147483648); }
// Felt piano: slightly stretched partials, upper partials die quickly (soft hammer), damper release at note end.
function piano(out,start,dur,f,vel) {
  const ring=Math.min(dur+1.6,7),at=Math.max(0,Math.floor(start*MSR)),end=Math.min(out.length,Math.ceil((start+ring)*MSR));
  const parts=[];
  for(let n=1;n<=7;n++){ const fn=f*n*Math.sqrt(1+0.00035*n*n); if(fn>6000) break;
    parts.push({w:TWO_PI*fn,a:(n===1?1:0.55)/n**1.7,k:Math.exp(-(0.45+0.6*n)*(f/262)**0.35/MSR),e:1}); }
  for(let i=at;i<end;i++){ const t=i/MSR-start; let v=0;
    for(const p of parts){ v+=Math.sin(p.w*t)*p.a*p.e; p.e*=p.k; }
    const rel=t<dur?1:Math.max(0,1-(t-dur)/1.1);
    out[i]+=v*vel*Math.min(1,t/0.006)*rel; }
}
// Nylon guitar: warm pluck, bright attack fades fast.
function nylon(out,start,dur,f,vel) {
  const ring=Math.min(dur*1.6+0.8,5),at=Math.max(0,Math.floor(start*MSR)),end=Math.min(out.length,Math.ceil((start+ring)*MSR));
  for(let i=at;i<end;i++){ const t=i/MSR-start,ph=TWO_PI*f*t;
    const v=Math.sin(ph)+0.35*Math.sin(2*ph)*Math.exp(-4*t)+0.15*Math.sin(3*ph)*Math.exp(-7*t);
    out[i]+=v*vel*Math.min(1,t/0.004)*Math.exp(-2*t)*Math.max(0,Math.min(1,(ring-t)/0.5)); }
}
// Strings pad: three detuned voices, gentle vibrato, slow bow-in and long release.
function strings(out,start,dur,f,vel) {
  const rel=1.6,at=Math.max(0,Math.floor(start*MSR)),end=Math.min(out.length,Math.ceil((start+dur+rel)*MSR));
  const det=[1,1.0023,0.9978],ph=[0,0,0];
  for(let i=at;i<end;i++){ const t=i/MSR-start,vib=1+0.0018*Math.sin(TWO_PI*5.2*t+start); let v=0;
    for(let d=0;d<3;d++){ ph[d]+=TWO_PI*f*det[d]*vib/MSR; const p=ph[d];
      v+=Math.sin(p)+0.45*Math.sin(2*p)+0.22*Math.sin(3*p)+0.1*Math.sin(4*p); }
    const env=Math.min(1,t/1.1)*(t<dur?1:Math.max(0,1-(t-dur)/rel));
    out[i]+=v/3*vel*env*env; }
}
// Rhodes-style electric piano (lo-fi): soft FM bell on the attack, gentle tremolo, round decay.
function ep(out,start,dur,f,vel) {
  const ring=Math.min(dur+1.4,6),at=Math.max(0,Math.floor(start*MSR)),end=Math.min(out.length,Math.ceil((start+ring)*MSR));
  for(let i=at;i<end;i++){ const t=i/MSR-start,ph=TWO_PI*f*t;
    const v=(Math.sin(ph+1.1*Math.exp(-7*t)*Math.sin(ph))+0.22*Math.sin(2*ph)*Math.exp(-4*t))*(1+0.05*Math.sin(TWO_PI*4.2*t));
    const rel=t<dur?1:Math.max(0,1-(t-dur)/0.9);
    out[i]+=v*vel*Math.min(1,t/0.004)*Math.exp(-1.5*t)*rel; }
}
// Very soft lo-fi drum kit: muffled kick, brushed snare, tiny hats. Only for themes with `drums`.
function kick(out,t0,g) { const a=Math.floor(t0*MSR); let ph=0;
  for(let i=0;i<0.4*MSR&&a+i<out.length;i++){ const t=i/MSR,f=44+80*Math.exp(-30*t); ph+=TWO_PI*f/MSR; out[a+i]+=Math.sin(ph)*g*Math.exp(-8*t)*Math.min(1,t/0.004); } }
function snare(out,t0,g,seed) { const a=Math.floor(t0*MSR),r=rnd(seed+7); let lp=0;
  for(let i=0;i<0.28*MSR&&a+i<out.length;i++){ const t=i/MSR; lp+=0.3*(r()-lp); out[a+i]+=lp*g*Math.exp(-14*t)*Math.min(1,t/0.006); } }
function hat(out,t0,g,seed) { const a=Math.floor(t0*MSR),r=rnd(seed+3); let p=0;
  for(let i=0;i<0.05*MSR&&a+i<out.length;i++){ const n=r(),h=n-p; p=n; out[a+i]+=h*g*Math.exp(-90*i/MSR); } }
const LEAD={piano,nylon,ep};
function lowpass(buf,cut,sr=MSR) { const a=1-Math.exp(-TWO_PI*cut/sr); let y=0; for(let i=0;i<buf.length;i++){ y+=a*(buf[i]-y); buf[i]=y; } }
function reverb(buf,mix) {
  // simple Schroeder-style comb bank — gives a soft room
  const wet=new Float32Array(buf.length);
  for(const [ms,g] of [[29.7,.78],[37.1,.76],[41.1,.74],[43.7,.72],[61,.6],[83,.5]]) {
    const d=Math.floor(ms/1000*MSR),line=new Float32Array(d); let k=0,lp=0;
    for(let i=0;i<buf.length;i++){ const o=line[k]; lp=lp*0.6+o*0.4; line[k]=buf[i]+lp*g; k=(k+1)%d; wet[i]+=o/6; }
  }
  for(let i=0;i<buf.length;i++) buf[i]=buf[i]*(1-mix)+wet[i]*mix*1.6;
}
function exportWav44(out,file) {
  let peak=0; for(const s of out) peak=Math.max(peak,Math.abs(s));
  const scale=0.7/(peak||1); // consistent, soft master level
  const wav=Buffer.alloc(44+out.length*2);
  wav.write('RIFF',0); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVE',8);
  wav.write('fmt ',12); wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20);
  wav.writeUInt16LE(1,22); wav.writeUInt32LE(MSR,24); wav.writeUInt32LE(MSR*2,28);
  wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34);
  wav.write('data',36); wav.writeUInt32LE(out.length*2,40);
  for(let i=0;i<out.length;i++) wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,out[i]*scale))*32767),44+i*2);
  fs.writeFileSync(file,wav);
  console.log(`${path.relative(root,file)} (${(out.length/MSR).toFixed(1)}s)`);
}
if(want('music')) for(const [name,th] of Object.entries(themes)) {
  // Two passes: 1st — melody in its register; 2nd — melody an octave lower and softer, so the loop breathes.
  const spb=60/th.bpm,bars=th.chords.length,loopLen=bars*4*spb,reps=2;
  const tail=7,out=new Float32Array(Math.ceil((loopLen*reps+tail)*MSR));
  const lead=LEAD[th.lead]||piano, hum=rnd(name.length*131); // tiny timing humanisation
  const h=()=>hum()*0.012;
  for(let r=0;r<reps;r++) {
    const o=r*loopLen;
    let beat=0;
    for(const tok of th.mel.split('|')) {
      const [n,d]=tok.trim().split(/\s+/),dur=Number(d);
      if(n!=='R') lead(out,o+beat*spb+0.015+h(),dur*spb,freq(n)/(r?2:1),r?0.075:0.1);
      beat+=dur;
    }
    th.chords.forEach((ch,b)=>{
      const pos=o+b*4*spb,notes=ch.split(' ');
      const padv=th.pad==='ep'?ep:piano,sw=th.drums?spb*0.12:0;                                 // lo-fi swing on off-beats
      piano(out,pos+h(),4*spb*0.98,freq(th.bass[b]),0.11);                                    // soft low piano bass
      if(th.pad==='strings') notes.forEach(n=>strings(out,pos,4*spb,freq(n),0.022));
      else { notes.forEach((n,k)=>padv(out,pos+0.07*k+h(),4*spb,freq(n),0.04));              // rolled chord
             notes.forEach((n,k)=>padv(out,pos+2*spb+sw+0.05*k+h(),2*spb,freq(n),0.022)); }  // soft repeat on beat 3
      if(th.arp) th.arp.forEach((k,j)=>lead(out,pos+j*spb/2+(j%2?sw:0)+h(),spb*0.9,freq(notes[k%notes.length])*2,j%2?0.022:0.032));
      if(th.drums) for(let j=0;j<8;j++){ const t=pos+j*spb/2+(j%2?sw:0)+h();                    // kick 1 & «and of 2», snare 2 & 4, hats on 8ths
        if(j===0||j===3) kick(out,t,0.13); if(j===2||j===6) snare(out,t,0.028,b*8+j+r*60); hat(out,t,j%2?0.0025:0.005,b*8+j+r*99); }
    });
  }
  lowpass(out,th.wow?1800:th.drums?2600:4200); lowpass(out,th.wow?2600:th.drums?3600:6000); // warm, never harsh (lo-fi: duller top end)
  reverb(out,th.wow?0.4:th.drums?0.26:0.34);
  if(th.wow) { // tape wow/flutter: slow pitch wobble via a modulated delay (integer cycles -> loop-safe), no hiss or clicks
    const src=Float32Array.from(out),N=out.length,D=0.0022*MSR;
    for(let i=0;i<N;i++){ const x=i-D*(1+0.7*Math.sin(TWO_PI*i/N*5)+0.3*Math.sin(TWO_PI*i/N*23)),k=Math.floor(x),fr=x-k;
      out[i]=src[Math.max(0,k)]*(1-fr)+src[Math.max(0,k+1)]*fr; }
  }
  const n=Math.floor(loopLen*reps*MSR),loop=out.slice(0,n);
  for(let i=n;i<out.length;i++) loop[i-n]+=out[i]; // wrap tail -> seamless loop
  exportWav44(loop,path.join(root,'assets','music',`${name}.wav`));
}

const sounds={
  click:[[660,0,.1,.13]], ok:[[523,0,.3,.11],[659,.09,.3,.1],[784,.18,.4,.1]],
  err:[[262,0,.32,.12],[220,.12,.4,.1]], notif:[[880,0,.2,.12],[1175,.12,.4,.1]],
  word:[[784,0,.2,.1],[1047,.1,.4,.09]],
  bell:[[1900,0,.12,.15],[2500,.18,.13,.13],[1900,.36,.12,.12],[2500,.54,.13,.1]],
  stamp:[[100,0,.26,.55]], pop:[[880,0,.14,.09],[1047,.07,.18,.08],[1319,.14,.22,.07]],
  door:[[170,0,.28,.3]], vibrate:[[70,0,.14,.22],[70,.18,.14,.22],[70,.36,.14,.22]],
  sparkle:[[1175,0,.5,.07],[1568,.12,.5,.07],[1976,.24,.6,.06]],
  chime:[[659,0,1.0,.1],[784,.2,1.0,.09],[988,.4,1.2,.08]],
  print:[[110,0,2.3,.10]], step:[], paper:[], shh:[], whoosh:[]
};
if(want('sfx')) for(const [name,events] of Object.entries(sounds)) {
  const end=Math.max(0.12,...events.map(e=>e[1]+e[2]));
  const duration=name==='print'?2.6:name==='shh'?1.3:name==='paper'?0.9:name==='whoosh'?0.8:Math.max(0.2,end+0.1);
  const out=synth(duration);
  const SOFT=['click','ok','err','notif','word','pop','chime','sparkle'].includes(name); // gentle UI sounds: pure sine + soft overtone + warm lowpass
  for(const [f,t,d,v] of events) { addTone(out,t,d,f,v,SOFT||f<200?'sine':'triangle',name==='err'?4:0); if(SOFT) addTone(out,t,d,f*2,v*0.18,'sine',3); }
  if(SOFT) lowpass(out,3200,SR);
  if(['print','step','paper','shh','whoosh','err','stamp'].includes(name)) {
    const d=Math.min(duration-0.05,name==='step'?0.09:name==='print'?2.45:name==='shh'?1.15:0.65);
    addNoise(out,0,d,name==='shh'?0.15:0.09);
  }
  exportWav(out,path.join(root,'assets','sfx',`${name}.wav`));
}

// Distant Kyiv church bells — original motif (D minor / F major friendly), inharmonic bell partials + big room.
if(want('bells')) {
  const out=new Float32Array(Math.ceil(11*MSR));
  const bell=(t0,f,g,len)=>{
    const parts=[[0.5,0.5,0.6],[1,1,1],[1.19,0.45,1.3],[1.5,0.35,1.6],[2,0.3,2.2],[2.52,0.18,3],[3.01,0.1,4]]; // [ratio, amp, decay speed]
    const a=Math.floor(t0*MSR);
    for(let i=0;i<len*MSR&&a+i<out.length;i++){ const t=i/MSR; let v=0;
      for(const [r,amp,d] of parts) v+=Math.sin(TWO_PI*f*r*t)*amp*Math.exp(-d*t/len*3);
      out[a+i]+=v*g*Math.min(1,t/0.002)*(0.85+0.15*Math.cos(TWO_PI*1.3*t)); }
  };
  // Light, bright F-major peal (no low bourdon — it sounded ominous): a morning greeting, not an alarm.
  [['C5',0.1],['A4',0.6],['F4',1.1],['C5',1.6],['D5',2.1],['C5',2.6],['A4',3.1],['F4',3.7]]
    .forEach(([n,t],i)=>bell(t,freq(n),i===7?0.1:0.07,i===7?4.5:3));
  lowpass(out,3500); reverb(out,0.4);
  for(let i=0;i<out.length;i++) out[i]*=Math.min(1,(out.length-i)/(1.5*MSR)); // fade tail
  exportWav44(out,path.join(root,'assets','sfx','bells.wav'));
}

/* ---- Location ambience: 30 s seamless loops (events wrap around the loop end) ----
   Real-world layers instead of plain noise: birds and student chatter in the yard, Podil traffic,
   ticking clock and keyboards in the dean's office, pages in the library, crickets in the evening, a quiet night room. */
const ASR=22050, AL=30;
function bpf(f,q,sr=ASR){ const w=TWO_PI*f/sr,al=Math.sin(w)/(2*q),a0=1+al; return {b0:al/a0,a1:-2*Math.cos(w)/a0,a2:(1-al)/a0,x1:0,x2:0,y1:0,y2:0}; }
function bq(s,x){ const y=s.b0*x-s.b0*s.x2-s.a1*s.y1-s.a2*s.y2; s.x2=s.x1; s.x1=x; s.y2=s.y1; s.y1=y; return y; }
function wrapAdd(out,i,v){ const n=out.length; out[((i%n)+n)%n]+=v; }
// Generic event: fn(t, white) -> sample, written with wrap-around so the loop has no seam.
function ev(out,start,dur,fn,seed,sr=ASR){ const r=rnd(seed),a=Math.floor(start*sr); for(let i=0;i<dur*sr;i++) wrapAdd(out,a+i,fn(i/sr,r())); }
function bed(out,seed,gain,cut,swell=0.15,cycles=2){ const r=rnd(seed),a=1-Math.exp(-TWO_PI*cut/ASR); let y1=0,y2=0;
  for(let i=0;i<out.length;i++){ y1+=a*(r()-y1); y2+=a*(y1-y2); out[i]+=y2*gain*(1+swell*Math.sin(TWO_PI*i/out.length*cycles)); } }
function birds(out,seed,series){ const r=rnd(seed);
  for(let s=0;s<series;s++){ const t0=(s/series)*AL+r()*1.5,base=2600+((r()+1)/2)*1600,up=r()>0,g=0.05+((r()+1)/2)*0.06,k=3+Math.floor(((r()+1)/2)*4);
    for(let c=0;c<k;c++){ const d=0.05+((r()+1)/2)*0.08,f0=base*(1+0.08*r());
      ev(out,t0+c*(0.13+0.05*((r()+1)/2)),d,t=>{ const x=t/d,f=f0*(up?1+0.35*x:1.3-0.35*x); return Math.sin(TWO_PI*f*t+3*Math.sin(TWO_PI*28*t))*Math.sin(Math.PI*x)**2*g; },s*31+c); } } }
function murmur(out,seed,voices,gain,lp=1){ const r=rnd(seed);
  for(let v=0;v<voices;v++){ const f=bpf(320+((r()+1)/2)*600,2.2),f2=bpf(1100+((r()+1)/2)*900,3);
    let env=0,target=0,next=0,talk=((r()+1)/2)*3; const rr=rnd(seed+v*17);
    for(let i=0;i<out.length;i++){ const t=i/ASR;
      if(t>=next){ next=t+0.12+((rr()+1)/2)*0.18; talk-=next-t; if(talk<-2) talk=1.5+((rr()+1)/2)*4;
        target=talk>0?0.3+((rr()+1)/2)*0.7:0; }
      env+=(target-env)*0.0025; const x=rr(); out[i]+=(bq(f,x)+0.35*bq(f2,x))*env*gain*lp; } } }
function footsteps(out,seed,series,gain){ const r=rnd(seed);
  for(let s=0;s<series;s++){ const t0=((r()+1)/2)*AL,k=5+Math.floor(((r()+1)/2)*6),gap=0.48+0.08*r();
    for(let c=0;c<k;c++){ const g=gain*Math.sin(Math.PI*(c+0.5)/k); let lp=0;
      ev(out,t0+c*gap,0.07,(t,w)=>{ lp+=0.25*(w-lp); return lp*g*Math.exp(-60*t); },s*13+c); } } }
function clockTicks(out,gain){ for(let s=0;s<AL;s++) ev(out,s,0.03,(t,w)=>(Math.sin(TWO_PI*(s%2?2100:2700)*t)*0.6+w*0.4)*gain*Math.exp(-220*t),s+5); }
function typingBursts(out,seed,bursts,gain){ const r=rnd(seed);
  for(let b=0;b<bursts;b++){ let t=((r()+1)/2)*AL; const end=t+1+((r()+1)/2)*2.5;
    while(t<end){ const f=bpf(2400+((r()+1)/2)*1800,2.5),g=gain*(0.6+0.4*((r()+1)/2));
      ev(out,t,0.03,(x,w)=>bq(f,w)*g*Math.exp(-180*x)+Math.sin(TWO_PI*180*x)*g*0.3*Math.exp(-120*x),Math.floor(t*1000)); t+=0.07+((r()+1)/2)*0.13; } } }
function pageTurns(out,seed,count,gain){ const r=rnd(seed);
  for(let c=0;c<count;c++){ const t0=((r()+1)/2)*AL; let p=0;
    ev(out,t0,0.55,(t,w)=>{ const h=w-p; p=w; const e=Math.sin(Math.PI*Math.min(1,t/0.55))**1.5*(0.6+0.4*Math.sin(TWO_PI*9*t)); return h*e*gain; },c+77); } }
function crickets(out,f0,period,gain,seed){ const r=rnd(seed);
  for(let t0=((r()+1)/2)*period;t0<AL;t0+=period*(0.95+0.1*((r()+1)/2))){ const g=gain*(0.6+0.4*Math.sin(TWO_PI*t0/AL*3));
    for(let p=0;p<3;p++) ev(out,t0+p*0.032,0.02,t=>Math.sin(TWO_PI*f0*t)*Math.sin(Math.PI*t/0.02)*g,p); } }
function carPass(out,seed,count,gain){ const r=rnd(seed);
  for(let c=0;c<count;c++){ const t0=((r()+1)/2)*AL,d=4+((r()+1)/2)*3; let y=0;
    ev(out,t0,d,(t,w)=>{ const x=t/d,cut=250+500*Math.sin(Math.PI*x); y+=(1-Math.exp(-TWO_PI*cut/ASR))*(w-y); return y*Math.sin(Math.PI*x)**2*gain; },c+300); } }
// Peak-normalise only (never boost quiet passages): between events the loop is true silence.
function exportAmb(out,file){
  let peak=0; for(const v of out) peak=Math.max(peak,Math.abs(v));
  const k=0.5/(peak||1); for(let i=0;i<out.length;i++) out[i]*=k;
  exportWav(out,file);
}
// Crickets only in a few short windows, not a constant drone.
function cricketWindows(out,windows,seed){ const r=rnd(seed);
  windows.forEach(([a,b],w)=>{
    for(let t0=0.2;t0<b-a-0.3;t0+=0.62*(0.95+0.1*((r()+1)/2))){ const g=0.03*Math.sin(Math.PI*t0/(b-a));
      for(let p=0;p<3;p++) ev(out,a+t0+p*0.032,0.02,t=>Math.sin(TWO_PI*(4300+w*250)*t)*Math.sin(Math.PI*t/0.02)*g,p); } }); }
/* Event-only ambience: NO continuous noise beds (they read as constant hiss in the game).
   Each loop is mostly silence with a few recognisable sounds of the place. */
const AMBIENCE={
  yard(o){ birds(o,13,6); },
  podil(o){ birds(o,25,3); },
  office(o){ typingBursts(o,32,2,0.12); pageTurns(o,33,1,0.12); },
  library(o){ pageTurns(o,42,2,0.1); },
  evening(o){ cricketWindows(o,[[2,7],[14,18],[23,27]],52); }
};
if(want('ambience')) Object.entries(AMBIENCE).forEach(([name,build])=>{
  const out=synth(AL); build(out); exportAmb(out,path.join(root,'assets','ambience',`${name}.wav`));
});

/* ---- Story SFX (44.1 kHz) ---- */
function sfxOut(sec){ return new Float32Array(Math.ceil(sec*MSR)); }
function evM(out,start,dur,fn,seed){ const r=rnd(seed),a=Math.floor(start*MSR); for(let i=0;i<dur*MSR&&a+i<out.length;i++) if(a+i>=0) out[a+i]+=fn(i/MSR,r()); }
function bellStrike(out,t0,f,g,len){ evM(out,t0,len,t=>{ let v=0; for(const [rt,a,d] of [[1,1,1],[2,0.5,1.6],[2.76,0.35,2.2],[5.4,0.15,4]]) v+=Math.sin(TWO_PI*f*rt*t)*a*Math.exp(-d*t*3/len); return v*g*Math.min(1,t/0.002); },1); }
const STORY_SFX={
  // soft piano phrase "it worked!" (admission letter, successful SAZ enrolment)
  success(){ const o=sfxOut(3.5); ['F4','A4','C5','F5'].forEach((n,i)=>piano(o,0.02+i*0.13,1.4,freq(n),0.22-i*0.02)); piano(o,0.6,1.2,freq('C6'),0.05); reverb(o,0.35); return o; },
  // keyboard typing (SAZ login)
  typing(){ const o=sfxOut(1.4),r=rnd(9); let t=0.02;
    while(t<1.2){ const f=bpf(2600+((r()+1)/2)*1500,2.5,MSR),g=0.35+0.2*r(); evM(o,t,0.035,(x,w)=>bq(f,w)*g*Math.exp(-160*x)+Math.sin(TWO_PI*170*x)*0.15*Math.exp(-90*x),Math.floor(t*999)); t+=0.075+((r()+1)/2)*0.09; }
    return o; },
  // quill scratching on parchment (1615 deed of gift)
  quill(){ const o=sfxOut(2.2);
    [[0.05,0.35],[0.5,0.25],[0.85,0.45],[1.45,0.3]].forEach(([t0,d],k)=>{ let p=0; const f=bpf(5200+k*400,1.5,MSR);
      evM(o,t0,d,(t,w)=>{ const h=bq(f,w); const grain=0.5+0.5*Math.sin(TWO_PI*(38+k*7)*t); return h*grain*Math.sin(Math.PI*t/d)*0.5; },k+40); });
    return o; },
  // heavy oak doors slam shut (1817 — the Academy is closed)
  door_heavy(){ const o=sfxOut(3.6);
    evM(o,0,0.7,(t,w)=>{ const f=170+30*Math.sin(TWO_PI*3*t); return (Math.sin(TWO_PI*f*t)*0.5+Math.sin(TWO_PI*f*2.01*t)*0.25)*(0.4+0.6*Math.abs(Math.sin(TWO_PI*11*t)))*0.12*Math.sin(Math.PI*t/0.7)+w*0.01; },5); // creak
    evM(o,0.72,1.6,(t,w)=>(Math.sin(TWO_PI*(52+40*Math.exp(-20*t))*t)*0.9+Math.sin(TWO_PI*104*t)*0.25)*Math.exp(-4*t)*0.9+w*0.25*Math.exp(-30*t),6); // thud
    evM(o,0.8,0.05,(t,w)=>w*0.2*Math.exp(-80*t),7); // latch
    lowpass(o,2500); reverb(o,0.5); return o; },
  // applause of a small hall (certificate ceremony)
  applause(){ const o=sfxOut(6),r=rnd(21);
    for(let c=0;c<22;c++){ const rate=3.2+((r()+1)/2)*1.8,f=bpf(900+((r()+1)/2)*1500,1.4,MSR),g=0.18+0.12*((r()+1)/2); let t=0.05+((r()+1)/2)*0.6;
      while(t<5.6){ const dens=Math.min(1,t/0.8)*Math.min(1,(5.6-t)/2.2); if(((r()+1)/2)<dens) evM(o,t,0.04,(x,w)=>bq(f,w)*g*Math.exp(-90*x),Math.floor(t*997)+c); t+=1/rate*(0.85+0.3*((r()+1)/2)); } }
    reverb(o,0.3); return o; }
};
if(want('story')) for(const [name,make] of Object.entries(STORY_SFX)) exportWav44(make(),path.join(root,'assets','sfx',`${name}.wav`));
