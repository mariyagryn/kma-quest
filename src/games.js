/* =========================================================
   Міні-ігри і квізи. Усі — детерміновані, помилка не блокує.
   ========================================================= */
 
/* ---------- Телефон / чат ---------- */
function phoneOpen({ title, sub = "", av = "" }) {
  const v = openLayer(`<div class="phone"><div class="notch"></div><div class="scr">
    <div class="bar"><div class="av">${av}</div><div><b>${esc(tpl(title))}</b><small>${esc(tpl(sub))}</small></div></div>
    <div class="msgs"></div><div class="reply"></div></div></div>`);
  const msgs = $(".msgs", v), reply = $(".reply", v);
  const api = {
    el: v,
    add(text, o = {}) {
      const m = document.createElement("div");
      m.className = "msg" + (o.me ? " me" : "") + (o.sys ? " sys" : "") + (o.sticker ? " sticker" : "");
      m.innerHTML = (o.from && !o.me ? `<span class="n">${esc(o.from)}</span>` : "") + esc(tpl(text));
      msgs.appendChild(m); msgs.scrollTop = msgs.scrollHeight;
      if (!o.me && !o.sys && !o.silent) Sound.sfx("notif");
      return m;
    },
    async typing(from, ms = 900) { const m = api.add("друкує…", { sys: true }); m.classList.add("typing"); await sleep(ms); m.remove(); },
    replies(opts, correct) {
      return new Promise(res => {
        reply.innerHTML = "";
        opts.forEach((t, i) => { const b = document.createElement("button"); b.textContent = tpl(t); if (TEST && i === correct) b.dataset.ok = "1"; b.onclick = () => { Sound.sfx("click"); reply.innerHTML = ""; res(i); }; reply.appendChild(b); });
      });
    },
    button(label) { return new Promise(res => { reply.innerHTML = ""; const b = document.createElement("button"); b.textContent = label; b.style.textAlign = "center"; b.style.fontWeight = "700"; b.dataset.ok = "1"; b.onclick = () => { reply.innerHTML = ""; res(); }; reply.appendChild(b); }); },
    close() { closeLayer(v); }
  };
  return api;
}
 
/* ---------- 1.2 Сленг-перекладач ---------- */
function slangGame() {
  return new Promise(res => {
    const words = DATA.slang.words, byId = Object.fromEntries(words.map(w => [w.id, w]));
    const v = openLayer(`<div class="panel dd"><div class="eyebrow">Глава 1 · міні-гра</div><h2>Сленг-перекладач</h2>
      <p class="sub">Перетягни кожне слово на його значення. Правильна картка з першої спроби — +10, з наступної — +5.</p>
      <div class="dd-grid"><div class="cards">${words.map(w => `<div class="card" data-id="${w.id}" tabindex="0">${esc(w.term)}</div>`).join("")}</div>
      <div class="slots">${DATA.slang.defsOrder.map(id => `<div class="slot" data-id="${id}"><div class="drop">?</div><div>${esc(byId[id].def)}</div></div>`).join("")}</div></div>
      <div style="margin-top:14px">${hintBox("maryana", "Не бійся помилитись: неправильна картка просто повернеться назад.")}</div></div>`);
    const tries = {}; let left = words.length;
    $$(".card", v).forEach(card => draggable(card, {
      targets: () => $$(".slot:not(.ok)", v),
      onDrop(card, slot) {
        const id = card.dataset.id;
        if (slot.dataset.id === id) {
          slot.classList.add("ok"); $(".drop", slot).textContent = byId[id].term;
          card.classList.add("placed"); card.style.transform = ""; card.style.visibility = "hidden";
          award("ch1_slang_" + id, tries[id] ? 5 : 10); Sound.sfx("ok");
          setHint(v, "maryana", "Так! «" + byId[id].term + "» — " + byId[id].def + ".", "happy");
          if (--left === 0) setTimeout(() => { closeLayer(v); res(); }, FAST ? 10 : 900);
          return true;
        }
        tries[id] = (tries[id] || 0) + 1; Sound.sfx("err");
        setHint(v, "maryana", DATA.slang.hints[id], "surprised");
        return false;
      }
    }));
    if (TEST) v._solve = () => { words.forEach(w => { const slot = $(`.slot[data-id="${w.id}"]`, v); const card = $(`.card[data-id="${w.id}"]`, v); if (!slot.classList.contains("ok")) { slot.classList.add("ok"); card.classList.add("placed"); award("ch1_slang_" + w.id, 10); left--; } }); closeLayer(v); res(); };
    window.__solve = v._solve;
  });
}
 
/* ---------- Панельний квіз (всередині root) ---------- */
function panelQuiz(root, items, { who, keyPrefix, onDone, qSel = ".qz" }) {
  return new Promise(res => {
    const box = $(qSel, root);
    let qi = 0;
    const render = () => {
      const it = items[qi]; let tries = 0;
      box.innerHTML = `<div class="quiz" style="width:auto;padding:0"><div class="prog">${items.map((_, i) => `<i class="${i <= qi ? "on" : ""}"></i>`).join("")}</div>
        <div class="q">${esc(tpl(it.q))}</div><div class="opts">${it.o.map((o, i) => `<button data-i="${i}" ${TEST && i === it.a ? 'data-ok="1"' : ""}><kbd>${i + 1}</kbd>${esc(o)}</button>`).join("")}</div><div class="feedback"></div></div>`;
      const fb = $(".feedback", box);
      $$(".opts button", box).forEach(b => b.addEventListener("click", () => {
        const i = +b.dataset.i;
        if (i === it.a) {
          b.classList.add("right"); $$(".opts button", box).forEach(x => x.disabled = true);
          award(keyPrefix + qi, tries ? 5 : 10); Sound.sfx("ok");
          fb.className = "feedback ok"; fb.textContent = it.ok || "Правильно!";
          if (who) setHint(root, who, it.ok || "Так, усе правильно!", "happy");
          setTimeout(() => { qi++; if (qi < items.length) render(); else { onDone && onDone(); res(); } }, FAST ? 10 : 1100);
        } else {
          tries++; b.classList.add("wrong"); b.disabled = true; Sound.sfx("err");
          fb.className = "feedback bad"; fb.textContent = it.why || "Не зовсім. Спробуй ще раз.";
          if (who) setHint(root, who, it.why || "Спробуй ще раз.", "surprised");
        }
      }));
    };
    render();
  });
}
 
/* ---------- 2.1 Розклад ---------- */
async function scheduleTask() {
  const v = openLayer(`<div class="panel sched"><div style="min-width:0"><div class="eyebrow">Глава 2 · завдання 2.1</div><h2>Як читати розклад</h2>
    <p class="sub">Аудиторія записується як «корпус-номер». Стовпець «тижні» показує, коли заняття відбувається.</p>
    <table><thead><tr><th>День</th><th>Час</th><th>Дисципліна</th><th>Тип</th><th>Тижні</th><th>Аудиторія</th></tr></thead>
    <tbody>${DATA.schedule.map(r => `<tr><td class="d">${r.d}</td><td>${r.t}</td><td>${esc(r.c)}</td><td>${r.k}</td><td class="wk">${r.w}</td><td><b>${r.r}</b></td></tr>`).join("")}</tbody></table></div>
    <div class="side">${hintBox("maryana", "У КМА аудиторія записується як корпус-номер. Бачиш стовпець «тижні»? Деякі семінари йдуть не щотижня.")}<div class="qz"></div></div></div>`);
  Sound.voice("maryana_sched");
  await panelQuiz(v, DATA.scheduleQuiz, { who: "maryana", keyPrefix: "ch2_sched_" });
  addWord("schedule", "Мій розклад", "", "facts", { wide: true, html: `<table style="width:100%;font-size:13px;border-collapse:collapse">${DATA.schedule.map(r => `<tr><td><b>${r.d}</b></td><td>${r.t}</td><td>${esc(r.c)} (${r.k})</td><td>${r.w}</td><td><b>${r.r}</b></td></tr>`).join("")}</table>` });
  await sleep(500);
  closeLayer(v);
}
 
/* ---------- 2.2 Двері ---------- */
function doorsGame() {
  return new Promise(res => {
    const doors = [["205", "top", 140], ["203", "top", 300], ["201", "top", 460], ["202", "bot", 620], ["204", "bot", 780]];
    const v = openLayer(`<div class="panel floor"><div class="eyebrow">КМЦ · 2 поверх</div><h2>Знайди аудиторію ${DATA.targetRoom}</h2>
      <p class="sub">Номери на табличках видно, коли наводиш курсор. Петрович сказав: «другий поверх наліво».</p>
      <div class="corridor"><div class="runner"></div><div class="arrow">← ліве крило</div>
      ${doors.map(([n, side, x]) => `<button class="door ${side}" style="left:${x}px" data-n="${n}" ${TEST && n === DATA.targetRoom ? 'data-ok="1"' : ""} aria-label="Двері"><span class="plate blank">${n}</span></button>`).join("")}</div>
      <div class="feedback"></div></div>`);
    let tries = 0;
    $$(".door", v).forEach(d => d.addEventListener("click", () => {
      const fb = $(".feedback", v);
      if (d.dataset.n === DATA.targetRoom) { Sound.sfx("door"); award("ch2_door", tries ? 5 : 10); fb.className = "feedback ok"; fb.textContent = "Аудиторія 201. Встигаєш!"; setTimeout(() => { closeLayer(v); res(); }, FAST ? 10 : 700); }
      else { tries++; d.classList.add("bad", "seen"); setTimeout(() => d.classList.remove("bad"), 400); Sound.sfx("err"); fb.className = "feedback bad"; fb.textContent = `Тут ${d.dataset.n}. Тобі потрібна ${DATA.targetRoom}: непарні номери — ліворуч, вони зростають до кінця коридору.`; }
    }));
  });
}
 
/* ---------- 2.3 Фото й сторіс ---------- */
function drawPhoto(ctx, id) {
  const w = 660, h = 370;
  if (id === "girkyi") {
    ctx.fillStyle = "#8a4a32"; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 24) for (let x = (y / 24 % 2) * 30 - 30; x < w; x += 60) { ctx.strokeStyle = "#6e3826"; ctx.lineWidth = 3; ctx.strokeRect(x, y, 60, 24); }
    ctx.fillStyle = "#2a1c14"; rr(ctx, -40, 40, 460, 110, 10); ctx.fill();
    ctx.fillStyle = "#f3e2c0"; ctx.font = "800 84px Unbounded, sans-serif"; ctx.textAlign = "left"; ctx.fillText("…РКИЙ", 30, 126);
    ctx.fillStyle = "#ffe2a8"; ctx.fillRect(380, 190, 300, 200);
    ctx.fillStyle = "#f7f4ee"; ctx.fillRect(470, 260, 70, 80); ctx.fillStyle = "#6b4a2b"; ctx.fillRect(476, 266, 58, 14);
    ctx.strokeStyle = "#f7f4ee"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(546, 300, 18, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 3; [480, 500, 520].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 250); ctx.bezierCurveTo(x - 10, 230, x + 10, 215, x, 195); ctx.stroke(); });
  } else if (id === "puzatka") {
    ctx.fillStyle = "#e9dcc2"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#8a5a2b"; rr(ctx, 120, 50, 600, 150, 12); ctx.fill();
    for (let i = 0; i < 10; i++) { ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.fillRect(120, 58 + i * 15, 600, 3); }
    ctx.fillStyle = "#f7e7c4"; ctx.font = "800 78px Unbounded, sans-serif"; ctx.textAlign = "left"; ctx.fillText("ПУЗАТ…", 160, 156);
    for (let i = 0; i < 22; i++) { ctx.fillStyle = i % 2 ? "#c2452d" : "#2b2b2b"; const x = i * 32; ctx.beginPath(); ctx.moveTo(x, 260); ctx.lineTo(x + 16, 244); ctx.lineTo(x + 32, 260); ctx.lineTo(x + 16, 276); ctx.fill(); }
    ctx.fillStyle = "#f7f4ee"; ctx.fillRect(0, 290, w, 80);
  } else {
    for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? "#f7f4ee" : "#d8342a"; ctx.fillRect(i * 50, 0, 50, 140); }
    ctx.fillStyle = "#9ec3d6"; ctx.fillRect(0, 140, w, 230);
    ctx.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * 150, 370); ctx.lineTo(i * 150 + 60, 140); ctx.lineTo(i * 150 + 90, 140); ctx.lineTo(i * 150 + 30, 370); ctx.fill(); }
    ctx.fillStyle = "#f08a24"; rr(ctx, 380, 170, 300, 80, 10); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "800 54px Unbounded, sans-serif"; ctx.textAlign = "left"; ctx.fillText("СІЛ…", 400, 230);
  }
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, 0, w, h); // "фото" тон
}
function showHuntPhoto(i) {
  return new Promise(res => {
    const h = DATA.hunt[i];
    const v = openLayer(`<div class="panel photo"><div class="eyebrow">Кава між парами · ${h.title}</div><h2>Де зроблено це фото?</h2>
      <p class="sub">${esc(h.hint)} Знайди це місце на карті й зайди туди.</p><canvas width="660" height="370"></canvas>
      <div style="margin-top:14px;display:flex;justify-content:flex-end"><button class="btn gold" id="go">Шукати на карті</button></div></div>`);
    drawPhoto($("canvas", v).getContext("2d"), h.id);
    $("#go", v).addEventListener("click", () => { Sound.sfx("click"); closeLayer(v); res(); });
  });
}
function huntStory(i) {
  const h = DATA.hunt[i], pal = { girkyi: ["#5a3b22", "#c98d5a"], puzatka: ["#8a5a2b", "#e0a42b"], kfs: ["#c2452d", "#f08a24"] }[h.id];
  const icon = { girkyi: "☕", puzatka: "🍲", kfs: "🥪" }[h.id];
  return playVideo({ id: "story_" + h.id, dur: 9, vertical: true, subs: [[0, 3, h.story[0]], [3, 6, h.story[1]], [6, 9, h.story[2]]],
    draw(ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, 405, 720);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(14 + k * 128, 16, 120, 4); ctx.fillStyle = "#fff"; ctx.fillRect(14 + k * 128, 16, 120 * Math.max(0, Math.min(1, (t - k * 3) / 3)), 4); }
      ctx.save(); ctx.translate(202, 340); ctx.rotate(Math.sin(t * 2) * 0.08); ctx.font = `${150 + Math.sin(t * 3) * 10}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(icon, 0, 50); ctx.restore();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(36, 52, 16, 0, 7); ctx.fill();
      ctx.font = "700 15px Manrope, sans-serif"; ctx.textAlign = "left"; ctx.fillText("mariana.buddy", 60, 58);
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = "600 13px Manrope, sans-serif"; ctx.fillText(MAP_POINTS.find(p => p.id === h.id).name + " · Поділ", 60, 76);
    } });
}
 
/* ---------- 3.3 Стрічка часу ---------- */
function timelineGame() {
  return new Promise(res => {
    const ev = Object.fromEntries(DATA.history.map(h => [h.y, h.e]));
    const sorted = DATA.history.map(h => h.y);
    const v = openLayer(`<div class="panel tl"><div class="eyebrow">Глава 3 · міні-гра</div><h2>Стрічка часу</h2>
      <p class="sub">Розклади п'ять подій від найдавнішої до найновішої і натисни «Перевірити». Картка з першої перевірки — +10, з наступної — +5.</p>
      <div class="tl-pool">${DATA.timelineOrder.map(y => `<div class="card" data-y="${y}">${esc(ev[y])}</div>`).join("")}</div>
      <div class="tl-line">${sorted.map((y, i) => `<div class="tl-slot" data-i="${i}"><div class="yr"></div></div>`).join("")}</div>
      <div style="display:flex;gap:14px;align-items:center;margin-top:16px"><button class="btn gold" id="chk">Перевірити</button><div style="flex:1">${hintBox("skovoroda", "Пам'ятаєш відео? Почни з найдавнішого, студіозусе.")}</div></div></div>`);
    const pool = $(".tl-pool", v);
    const checks = {}; let round = 0;
    const slots = $$(".tl-slot", v);
    const place = (card, target) => {
      card.style.transform = ""; card.classList.remove("back");
      if (target.classList.contains("tl-slot")) { const ex = $(".card", target); if (ex && ex !== card) pool.appendChild(ex); target.appendChild(card); }
      else pool.appendChild(card);
    };
    $$(".card", v).forEach(card => draggable(card, {
      targets: () => [...slots.filter(s => !$(".card.locked", s)), pool],
      onDrop(card, t) { place(card, t); Sound.sfx("click"); return true; }
    }));
    $("#chk", v).addEventListener("click", () => {
      if (slots.some(s => !$(".card", s))) { Sound.sfx("err"); setHint(v, "skovoroda", "Спершу розклади всі п'ять карток на стрічку.", "surprised"); return; }
      let firstWrong = null;
      slots.forEach((s, i) => {
        const c = $(".card", s); if (c.classList.contains("locked")) return;
        const y = +c.dataset.y;
        if (y === sorted[i]) { c.classList.add("locked"); $(".yr", s).textContent = y; award("ch3_tl_" + y, round === 0 ? 10 : 5); }
        else { pool.appendChild(c); c.classList.add("back"); if (firstWrong === null) firstWrong = sorted[i]; }
      });
      round++;
      if (firstWrong === null) { Sound.sfx("ok"); setHint(v, "skovoroda", "Бачу, лекцію слухали уважно. Браво!", "happy"); setTimeout(() => { closeLayer(v); res(); }, FAST ? 10 : 1200); }
      else { Sound.sfx("err"); setHint(v, "skovoroda", DATA.timelineHints[firstWrong], "surprised"); }
    });
    if (TEST) window.__solve = () => { sorted.forEach((y, i) => { const c = $(`.card[data-y="${y}"]`, v); slots[i].appendChild(c); }); $("#chk", v).click(); };
  });
}
 
/* ---------- 4.1 ЄКТС-інфографіка + Збери ІНП ---------- */
function ectsInfographic() {
  return new Promise(res => {
    const v = openLayer(`<div class="panel quiz" style="width:820px"><div class="eyebrow">Деканат · інфографіка</div><h2>ЄКТС і 100-бальна шкала</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:end">
      <div><div class="ects"><div class="col" id="c1"></div><div class="col" id="c2"></div><div><div class="sum" id="cn">0</div><div class="sub" style="margin:0">кредитів за рік<br>1 кредит = 30 годин роботи</div></div></div>
      <div class="sub" style="margin:0">Семестр — 30 кредитів. Рік — 60.</div></div>
      <div class="scale">${[["91–100", "відмінно", "#2f7d6d", 100], ["81–90", "дуже добре", "#4f9a7e", 90], ["71–80", "добре", "#d9a21b", 80], ["65–70", "задовільно", "#e0b85a", 70], ["60–64", "достатньо", "#e8c98a", 64], ["0–59", "незадовільно", "#c2452d", 59]].map(([r, n, c, w]) => `<span><i style="width:${w * 1.4}px;background:${c}"></i><b>${r}</b> ${n}</span>`).join("")}</div></div>
      <div style="margin-top:18px;display:flex;justify-content:flex-end"><button class="btn gold" id="go">Зрозуміло, до ІНП</button></div></div>`);
    let n = 0;
    const iv = setInterval(() => { n++; const col = n <= 30 ? "#c1" : "#c2"; const i = document.createElement("i"); $(col, v).appendChild(i); $("#cn", v).textContent = n; if (n % 5 === 0) Sound.sfx("click"); if (n >= 60) clearInterval(iv); }, FAST ? 1 : 45);
    $("#go", v).addEventListener("click", () => { clearInterval(iv); closeLayer(v); res(); });
  });
}
function inpGame() {
  return new Promise(res => {
    const mand = DATA.mandatory, mSum = mand.reduce((a, b) => a + b.cr, 0);
    const v = openLayer(`<div class="panel inp"><div class="eyebrow">Глава 4 · міні-гра</div><h2>Збери ІНП на осінній семестр</h2>
      <p class="sub">У семестрі потрібно рівно 30 кредитів. Обов'язкові дисципліни (${mSum} кр.) вже в плані; додай вибіркові на ${30 - mSum} кр.</p>
      <div class="inp-grid"><div><div class="eyebrow" style="margin-bottom:8px">Обов'язкові</div>${mand.map(m => `<div class="course fixed">🔒 ${esc(m.c)}<span class="cr">${m.cr} кр.</span></div>`).join("")}</div>
      <div><div class="eyebrow" style="margin-bottom:8px">Вибіркові (умовні)</div>${DATA.electives.map(e => `<label class="course pick"><input type="checkbox" id="el_${e.id}" value="${e.id}">${esc(e.c)}<span class="cr">${e.cr} кр.</span></label>`).join("")}
      <div class="meter" id="meter"></div><div style="display:flex;align-items:center;gap:14px"><div class="sum" id="sum">${mSum} / 30</div><button class="btn gold" id="ok">Затвердити ІНП</button></div>
      <div class="feedback"></div></div></div>
      <div style="margin-top:12px">${hintBox("olga", "Будь-яка комбінація підійде, якщо разом рівно 30. Рахувати вмієте?")}</div></div>`);
    let tries = 0;
    const picked = () => DATA.electives.filter(e => $("#el_" + e.id, v).checked);
    const upd = () => {
      const s = mSum + picked().reduce((a, b) => a + b.cr, 0);
      $("#sum", v).textContent = s + " / 30"; $("#sum", v).className = "sum" + (s === 30 ? " ok" : "");
      $("#meter", v).innerHTML = mand.map(m => `<i class="m" style="width:${m.cr / 36 * 100}%"></i>`).join("") + picked().map(e => `<i class="e" style="width:${e.cr / 36 * 100}%"></i>`).join("");
      return s;
    };
    $$("input", v).forEach(i => i.addEventListener("change", () => { Sound.sfx("click"); upd(); }));
    upd();
    $("#ok", v).addEventListener("click", () => {
      const s = upd(), fb = $(".feedback", v);
      if (s === 30) {
        award("ch4_inp", tries ? 15 : 30); Sound.sfx("ok");
        S.inp = picked().map(e => e.id);
        fb.className = "feedback ok"; fb.textContent = "ІНП затверджено: рівно 30 кредитів.";
        setHint(v, "olga", "Ось бачите, нічого складного. Тепер — у САЗ.", "happy");
        setTimeout(() => { closeLayer(v); res(); }, FAST ? 10 : 1300);
      } else {
        tries++; Sound.sfx("err"); fb.className = "feedback bad"; fb.textContent = `У вас ${s} кредитів, а треба 30.`;
        setHint(v, "olga", s > 30 ? "Забагато. Приберіть щось із вибіркових." : "Замало. Додайте ще одну вибіркову.", "surprised");
      }
    });
    if (TEST) window.__solve = () => { $("#el_kino", v).checked = true; $("#el_eng", v).checked = true; $("#ok", v).click(); };
  });
}
 
/* ---------- 4.2 САЗ ---------- */
function sazGame() {
  return new Promise(res => {
    const all = [...DATA.electives, ...DATA.backups];
    const byId = Object.fromEntries(all.map(c => [c.id, c]));
    const plan = DATA.electives.filter(e => S.inp.includes(e.id)).map(e => e.id); // фіксований порядок
    const fullId = plan[0];
    const login = (S.player.name || "student").toLowerCase().replace(/[^a-zа-яіїєґ]/gi, "").slice(0, 10) || "student";
    const v = openLayer(`<div class="panel saz"><div class="top"><span class="lg">САЗ</span><span>Система автоматизованого запису</span><span class="who">${esc(S.player.name)} · ${esc(S.player.facultyShort)}</span></div><div class="main"></div></div>`);
    const main = $(".main", v);
    const steps = ["Вхід", "Семестр", "Дисципліни", "Підтвердження"];
    const bar = k => `<div class="steps">${steps.map((s, i) => `<span class="${i < k ? "done" : i === k ? "on" : ""}">${i + 1}. ${s}</span>`).join("")}</div>`;
    let enrolled = [], replaced = null, paniced = false;
    function stepLogin() {
      main.innerHTML = bar(0) + `<div class="login"><b>Вхід до САЗ</b><label class="field"><label for="sz_l">Логін</label><input id="sz_l" value="${esc(login)}@ukma.edu.ua" readonly></label>
        <label class="field"><label for="sz_p">Пароль</label><input id="sz_p" type="password" value="••••••••" readonly></label><button class="btn" id="sz_in">Увійти</button></div>`;
      $("#sz_in", main).onclick = () => { Sound.sfx("click"); stepSem(); };
    }
    function stepSem() {
      main.innerHTML = bar(1) + `<div class="login"><b>Оберіть семестр</b><select id="sz_s"><option>Осінній семестр 2026/2027</option></select><button class="btn" id="sz_n">Далі</button></div>`;
      $("#sz_n", main).onclick = () => { Sound.sfx("click"); stepCourses(); };
    }
    function credits() { return DATA.mandatory.reduce((a, b) => a + b.cr, 0) + enrolled.reduce((a, id) => a + byId[id].cr, 0); }
    let triedFull = false, chatPop = null;
    const fullCr = () => byId[fullId].cr;
    function okId() {
      if (!triedFull) return fullId;
      if (!paniced) return null;
      const p1 = plan.find(id => id !== fullId && !enrolled.includes(id));
      if (p1) return p1;
      if (!replaced) return all.find(c => c.cr === fullCr() && !plan.includes(c.id)).id;
      return null;
    }
    function stepCourses(msg = "") {
      const listIds = paniced ? all.map(c => c.id) : plan;
      const ok = TEST ? okId() : null;
      main.innerHTML = bar(2) + `<p style="margin:0 0 10px">${paniced ? "Додайте запасний курс із такою ж кількістю кредитів, як у курсу без місць." : "Додайте дисципліни зі свого ІНП."} Зараз у плані: <b>${credits()} / 30</b> кр.</p>
        <table><thead><tr><th>Дисципліна</th><th>Кредити</th><th>Місця</th><th></th></tr></thead><tbody>
        ${listIds.map(id => { const c = byId[id], isFull = id === fullId && triedFull, isIn = enrolled.includes(id);
          const seats = isFull ? '<span class="full">Місць немає (0/25)</span>' : (9 + (id.length * 5 + c.cr * 3) % 14) + "/25";
          const tag = plan.includes(id) ? ' <small style="color:#56607a">· з ІНП</small>' : "";
          const act = isIn ? '<span class="in">✓ записано</span>' : isFull ? "" : `<button class="sbtn" data-id="${id}" ${ok === id ? 'data-ok="1"' : ""}>Записатися</button>`;
          return `<tr><td>${esc(c.c)}${tag}</td><td>${c.cr}</td><td>${seats}</td><td>${act}</td></tr>`; }).join("")}
        </tbody></table><div class="feedback ${msg ? "bad" : ""}">${esc(msg)}</div>
        ${credits() === 30 && triedFull ? `<div style="margin-top:12px"><button class="btn gold" id="sz_c" data-ok="1">Підтвердити запис</button></div>` : ""}`;
      $$(".sbtn", main).forEach(b => b.onclick = () => enroll(b.dataset.id));
      const c = $("#sz_c", main); if (c) c.onclick = () => stepConfirm();
      if (chatPop) main.appendChild(chatPop);
    }
    async function enroll(id) {
      Sound.sfx("click");
      if (id === fullId) { if (!triedFull) { triedFull = true; Sound.sfx("err"); stepCourses(); await panic(); } return; }
      if (enrolled.includes(id)) return;
      if (!plan.includes(id)) {
        if (!paniced) return;
        if (replaced) { stepCourses("Заміну вже обрано. Перевірте суму і підтвердіть запис."); return; }
        if (byId[id].cr !== fullCr()) { stepCourses(`«${byId[id].c}» має ${byId[id].cr} кр., а «${byId[fullId].c}» мав ${fullCr()}. Сума буде ${credits() + byId[id].cr + (plan.filter(p => p !== fullId && !enrolled.includes(p)).reduce((a, p) => a + byId[p].cr, 0))}, а треба 30.`); Sound.sfx("err"); return; }
        replaced = id;
      }
      enrolled.push(id); Sound.sfx("ok"); stepCourses();
    }
    async function panic() {
      chatPop = document.createElement("div"); chatPop.className = "chatpop";
      chatPop.innerHTML = `<div class="h">${esc(tpl("{faculty} 1 курс 🔥"))}</div>`;
      main.appendChild(chatPop);
      const add = (from, t) => { const m = document.createElement("div"); m.className = "msg"; m.innerHTML = `<span class="n">${esc(from)}</span>${esc(t)}`; chatPop.appendChild(m); Sound.sfx("notif"); while (chatPop.children.length > 6) chatPop.children[1].remove(); };
      add("Остап", "ЛЮДИ САЗ ЛІГ"); await sleep(900);
      add("Ліза", "в мене «" + byId[fullId].c + "» 0 місць 😭😭"); await sleep(900);
      add("Тарас", "все, відрахування"); await sleep(1100);
      add("Дана (староста)", "Без паніки! Беріть запасний курс з такою ж кількістю кредитів. Сума має лишитися 30."); await sleep(600);
      paniced = true; stepCourses();
    }
    function stepConfirm() {
      Sound.sfx("click");
      main.innerHTML = bar(3) + `<div class="login" style="max-width:520px"><b>Перевірте запис</b>${[...DATA.mandatory.map(m => [m.c, m.cr, "обов'язкова"]), ...enrolled.map(id => [byId[id].c, byId[id].cr, "вибіркова"])].map(([c, cr, k]) => `<div class="course">${esc(c)} <small style="color:#56607a">${k}</small><span class="cr">${cr} кр.</span></div>`).join("")}
        <div class="sum ok">30 / 30</div><button class="btn gold" id="sz_f">Підтвердити</button></div>`;
      $("#sz_f", main).onclick = async () => {
        S.saz = { enrolled: enrolled.slice(), replaced, full: fullId };
        main.innerHTML = `<div style="display:grid;place-items:center;height:100%;text-align:center"><div><div style="font-size:64px">✅</div><h2>Запис успішний</h2><p class="sub">Урок: завжди мати запасний варіант і заходити в САЗ вчасно.</p></div></div>`;
        confetti(2500); Sound.sfx("ok"); award("ch4_saz", 20);
        await sleep(2300); closeLayer(v); res();
      };
    }
    stepLogin();
  });
}
 
/* ---------- 4.3 Бібліотека ---------- */
function catalogSearch() {
  return new Promise(res => {
    const b = DATA.book;
    const v = openLayer(`<div class="panel catalog"><div class="eyebrow">Електронний каталог бібліотеки</div><h2>Знайди книгу Сковороди</h2>
      <p class="sub">Введи прізвище автора і натисни «Шукати». У результаті буде шифр і приміщення.</p>
      <form class="search" id="sf"><input id="sq" placeholder="Наприклад: Сковорода" autocomplete="off"><button class="btn" type="submit">Шукати</button></form>
      <div id="res"></div><div style="margin-top:12px">${hintBox("librarian", "(пошепки) Спочатку шукай у каталозі, там буде шифр і місце.")}</div></div>`);
    const inp = $("#sq", v); setTimeout(() => inp.focus(), 50);
    if (TEST) inp.value = b.query;
    $("#sf", v).addEventListener("submit", e => {
      e.preventDefault();
      const q = inp.value.trim().toLowerCase();
      if (!q.includes("сковор")) { Sound.sfx("err"); $("#res", v).innerHTML = `<div class="feedback bad">За запитом «${esc(inp.value)}» нічого не знайдено. Спробуй прізвище автора: Сковорода.</div>`; return; }
      Sound.sfx("ok");
      $("#res", v).innerHTML = `<div class="result"><dt>Знайдено</dt><dd>1 результат</dd><dt>Назва</dt><dd>${esc(b.title)}</dd><dt>Шифр</dt><dd style="font-family:var(--f-display)">${esc(b.code)}</dd><dt>Де</dt><dd>${esc(b.placeName)}</dd></div>
        <div style="margin-top:12px;display:flex;justify-content:flex-end"><button class="btn gold" id="memo" data-ok="1">Запам'ятати шифр</button></div>`;
      $("#memo", v).onclick = () => { Sound.sfx("click"); closeLayer(v); res(); };
    });
  });
}
function shelvesGame() {
  return new Promise(res => {
    const cols = ["#8c2f3c", "#2f5d4e", "#3e5aa8", "#a8770a", "#5a4a7a", "#6b4a2b"];
    const v = openLayer(`<div class="panel catalog" style="width:960px"><div class="eyebrow">Бібліотека №2 · читальна зала</div><h2>Полиця з шифром ${esc(DATA.book.code)}</h2>
      <p class="sub">Знайди полицю з таким самим шифром, як у каталозі.</p>
      <div class="shelves">${DATA.shelvesCodes.map((c, i) => `<button class="shelf" data-c="${esc(c)}" ${TEST && c === DATA.book.code ? 'data-ok="1"' : ""}><span class="code">${esc(c)}</span>${[0, 1, 2].map(r => `<div class="row">${Array.from({ length: 9 }, (_, k) => `<i style="background:${cols[(k + r * 2 + i) % 6]};height:${60 + ((k * 7 + r * 5 + i * 3) % 30)}%"></i>`).join("")}</div>`).join("")}</button>`).join("")}</div>
      <div class="feedback"></div></div>`);
    let lastClick = 0;
    $$(".shelf", v).forEach(s => s.addEventListener("click", () => {
      const now = performance.now(); if (now - lastClick < 450) Sound.sfx("shh"); lastClick = now;
      const fb = $(".feedback", v);
      if (s.dataset.c === DATA.book.code) { s.classList.add("ok"); Sound.sfx("ok"); fb.className = "feedback ok"; fb.textContent = "Ось вона: «" + DATA.book.title + "»."; award("ch4_lib", 20); setTimeout(() => { closeLayer(v); res(); }, FAST ? 10 : 1300); }
      else { s.classList.add("bad"); setTimeout(() => s.classList.remove("bad"), 400); Sound.sfx("err"); fb.className = "feedback bad"; fb.textContent = `Шифр ${s.dataset.c} не збігається з ${DATA.book.code}. Порівнюй посимвольно.`; }
    }));
  });
}
 
/* ---------- Стенди СО ---------- */
function standVisit(club) {
  return new Promise(res => {
    const done = S.stamps.includes(club.id);
    const v = openLayer(`<div class="panel stand"><button class="close" aria-label="Закрити">✕</button><div class="eyebrow">Стенд СО · Глава ${club.ch}</div><h2>${esc(club.name)}</h2><p class="sub" style="margin:0">${esc(club.blurb)}</p>
      <div class="media" id="media"></div><div class="qz"></div></div>`);
    const media = $("#media", v);
    let stopMedia = () => {};
    if (club.media === "audio") {
      media.innerHTML = `<canvas width="760" height="260"></canvas><div class="cap"></div>`;
      const ctx = $("canvas", media).getContext("2d"), cap = $(".cap", media);
      const lines = [[0, "— Шановна колегіє, я стверджую, що пари о 8:30 — це злочин проти людства."], [5, "— Опонентко, а ви бачили, як порожніє черга в Гіркому о 8:15?"], [10, "— Час! Судді, ваш вердикт."]];
      const t0 = performance.now(); let run = true;
      (function f(now) { if (!run) return; const t = (now - t0) / 1000 % 15; ctx.fillStyle = "#141b2e"; ctx.fillRect(0, 0, 760, 260); ctx.fillStyle = "#d9a21b"; for (let i = 0; i < 76; i++) { const a = Math.abs(Math.sin(i * 0.7 + t * 6) * Math.sin(i * 0.13 + t)) * 90 + 4; ctx.fillRect(10 + i * 10, 110 - a / 2, 6, a); } ctx.fillStyle = "#f7f4ee"; ctx.font = "700 13px Manrope, sans-serif"; ctx.fillText("▶ аудіо · 0:" + String(Math.floor(t)).padStart(2, "0") + " / 0:15", 14, 24); const L = [...lines].reverse().find(l => t >= l[0]); cap.textContent = L[1]; if (Math.floor(t * 8) % 2 === 0) Sound.blip(t < 5 || t >= 10 ? 1.1 : 0.85); requestAnimationFrame(f); })(t0);
      stopMedia = () => run = false;
    } else if (club.media === "video") {
      media.innerHTML = `<canvas width="760" height="260"></canvas><div class="cap"></div>`;
      const ctx = $("canvas", media).getContext("2d"), cap = $(".cap", media);
      const lines = [[0, "Бекстейдж: знімаємо інтерв'ю з фрешами біля 3-го корпусу"], [7, "Монтаж — уночі, публікація — до першої пари"], [14, "Анонси всіх подій — у наших соцмережах"]];
      const t0 = performance.now(); let run = true;
      (function f(now) { if (!run) return; const t = (now - t0) / 1000 % 20; ctx.fillStyle = "#2a3150"; ctx.fillRect(0, 0, 760, 260); ctx.fillStyle = "#e6c27a"; ctx.fillRect(80 - t * 4, 60, 500, 200); ctx.fillStyle = "#2f7d6d"; ctx.fillRect(60 - t * 4, 30, 540, 40); ctx.fillStyle = "#141b2e"; rr(ctx, 520, 80, 160, 100, 12); ctx.fill(); ctx.fillStyle = "#555"; ctx.beginPath(); ctx.arc(600, 130, 34, 0, 7); ctx.fill(); ctx.fillStyle = "#9ec3d6"; ctx.beginPath(); ctx.arc(600, 130, 20, 0, 7); ctx.fill(); if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = "#c2452d"; ctx.beginPath(); ctx.arc(30, 26, 8, 0, 7); ctx.fill(); } ctx.fillStyle = "#fff"; ctx.font = "700 13px Manrope, sans-serif"; ctx.fillText("REC · відео 0:" + String(Math.floor(t)).padStart(2, "0") + " / 0:20", 46, 31); cap.textContent = [...lines].reverse().find(l => t >= l[0])[1]; requestAnimationFrame(f); })(t0);
      stopMedia = () => run = false;
    } else if (club.media === "gallery") {
      const pics = [["Екскурсія Подолом", (c) => { c.fillStyle = "#e6c27a"; c.fillRect(20, 60, 200, 90); c.fillStyle = "#2f7d6d"; c.fillRect(10, 40, 220, 26); for (let i = 0; i < 5; i++) person(c, 40 + i * 40, 190, 1, ["#3e5aa8", "#c2452d", "#2f7d6d", "#6b4fa0", "#d9a21b"][i]); }],
        ["В архіві Академії", (c) => { c.fillStyle = "#6b4a2b"; c.fillRect(10, 20, 220, 170); for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) { c.fillStyle = ["#8c2f3c", "#2f5d4e", "#a8770a"][(i + r) % 3]; c.fillRect(20 + i * 17, 30 + r * 42, 13, 34); } }],
        ["Реконструкція 1632", (c) => { c.fillStyle = "#3e3258"; c.fillRect(0, 0, 240, 200); c.drawImage(svgImage("sk", npcSVG("skovoroda", "happy")), 60, 10, 120, 184); }]];
      media.innerHTML = `<div class="gallery">${pics.map(p => `<figure><canvas width="240" height="200"></canvas><figcaption>${p[0]}</figcaption></figure>`).join("")}</div>`;
      $$("canvas", media).forEach((c, i) => { const x = c.getContext("2d"); x.fillStyle = "#3a4058"; x.fillRect(0, 0, 240, 200); const draw = () => pics[i][1](x); draw(); setTimeout(draw, 300); });
    } else {
      media.innerHTML = `<canvas width="760" height="260"></canvas>`;
      const ctx = $("canvas", media).getContext("2d"); const t0 = performance.now(); let run = true;
      (function f(now) { if (!run) return; const t = (now - t0) / 1000; ctx.fillStyle = "#ffd500"; ctx.fillRect(0, 0, 760, 260); ctx.fillStyle = "#0057b8"; ctx.fillRect(0, 160, 760, 100); ctx.save(); ctx.translate(380, 110); const s = 1 + Math.sin(t * 3) * 0.05; ctx.scale(s, s); ctx.fillStyle = "#c2452d"; ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(-60, -10, -40, -60, 0, -30); ctx.bezierCurveTo(40, -60, 60, -10, 0, 30); ctx.fill(); ctx.restore(); ctx.fillStyle = "#141b2e"; ctx.font = "800 30px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.fillText("ПОРУЧ", 380, 196); ctx.fillStyle = "#fff"; ctx.font = "700 16px Manrope, sans-serif"; ctx.fillText("Відкрита зустріч щочетверга · 18:00 · двір Староакадемічного", 380, 230); ctx.textAlign = "left"; requestAnimationFrame(f); })(t0);
      stopMedia = () => run = false;
    }
    const close = () => { stopMedia(); pop(); closeLayer(v); res(); };
    $(".close", v).addEventListener("click", close);
    const pop = pushKeys(e => { if (e.key === "Escape") close(); return false; });
    if (done) { $(".qz", v).innerHTML = `<div class="feedback ok">Штамп «${esc(club.short)}» уже у твоєму Нотатнику.</div>`; return; }
    panelQuiz(v, [{ q: club.q, o: club.o, a: club.a, ok: "Правильно! Тримай штамп.", why: "Не зовсім. Подумай ще." }], { keyPrefix: "stamp_" + club.id + "_" }).then(() => {
      // одна відповідь = один ключ stamp_<id>_0 (10 або 5)
      S.stamps.push(club.id); Sound.sfx("stamp");
      toast(`Штамп СО: <b>${esc(club.short)}</b>`, "word");
      $(".qz", v).innerHTML = `<div style="display:flex;gap:16px;align-items:center"><div class="stamp on" style="width:110px"><span><b>${esc(club.short)}</b>штамп</span></div><div class="feedback ok">Штамп додано на сторінку «Спільнота» в Нотатнику.</div></div>`;
      save();
    });
  });
}
 
/* ---------- Вибір гуртка ---------- */
function clubChoice() {
  return new Promise(res => {
    const v = openLayer(`<div class="panel quiz" style="width:1000px"><div class="eyebrow">Глава 4 · фінальний вибір</div><h2>Куди хочеш долучитися?</h2>
      <p class="sub">Можна обрати будь-яку СОшку, навіть якщо ти не був біля її стенду. Вибір з'явиться у фіналі й на сертифікаті.</p>
      <div class="clubs">${DATA.clubs.map(c => `<button data-id="${c.id}" data-ok="1"><b>${esc(c.name)}</b><span>${esc(c.blurb)}</span>${S.stamps.includes(c.id) ? '<span class="st">✓ є штамп</span>' : ""}</button>`).join("")}</div></div>`);
    $$(".clubs button", v).forEach(b => b.onclick = () => { Sound.sfx("ok"); S.club = b.dataset.id; closeLayer(v); res(b.dataset.id); });
  });
}
 
/* ---------- Сертифікат (PNG) ---------- */
async function makeCertificate() {
  try { await document.fonts.ready; } catch (e) {}
  const c = document.createElement("canvas"); c.width = 1600; c.height = 1130;
  const x = c.getContext("2d"), r = rank(score()), club = DATA.clubs.find(k => k.id === S.club);
  x.fillStyle = "#f7f4ee"; x.fillRect(0, 0, 1600, 1130);
  const g = x.createLinearGradient(0, 0, 1600, 1130); g.addColorStop(0, "rgba(217,162,27,.10)"); g.addColorStop(1, "rgba(47,125,109,.10)"); x.fillStyle = g; x.fillRect(0, 0, 1600, 1130);
  x.strokeStyle = "#141b2e"; x.lineWidth = 6; x.strokeRect(40, 40, 1520, 1050);
  x.strokeStyle = "#d9a21b"; x.lineWidth = 2; x.strokeRect(60, 60, 1480, 1010);
  for (let i = 0; i < 60; i++) { x.fillStyle = i % 2 ? "#d9a21b" : "#2f7d6d"; x.fillRect(80 + i * 24.3, 78, 14, 6); x.fillRect(80 + i * 24.3, 1046, 14, 6); }
  x.textAlign = "center"; x.fillStyle = "#a8770a"; x.font = "700 26px Manrope, sans-serif"; x.fillText("НАЦІОНАЛЬНИЙ УНІВЕРСИТЕТ «КИЄВО-МОГИЛЯНСЬКА АКАДЕМІЯ» · KMA QUEST", 800, 160);
  x.fillStyle = "#141b2e"; x.font = "800 92px Unbounded, sans-serif"; x.fillText("СЕРТИФІКАТ", 800, 280);
  x.font = "500 30px Manrope, sans-serif"; x.fillStyle = "#4a5163"; x.fillText("засвідчує, що", 800, 345);
  x.fillStyle = "#141b2e"; x.font = "800 76px Unbounded, sans-serif"; x.fillText(S.player.name, 800, 450);
  x.font = "600 30px Manrope, sans-serif"; x.fillStyle = "#4a5163";
  const fac = (DATA.faculties.find(f => f.short === S.player.facultyShort) || {}).name || S.player.faculty;
  x.fillText(`${fac} · ${S.player.specialty}`, 800, 510);
  x.fillText("пройшов(-ла) шлях першокурсника Могилянки та отримує звання", 800, 580);
  x.fillStyle = "#2f7d6d"; x.font = "800 68px Unbounded, sans-serif"; x.fillText("«" + r.title + "»", 800, 680);
  x.font = "700 30px Manrope, sans-serif"; x.fillStyle = "#141b2e";
  x.fillText(`Бали: ${score()} з 380   ·   Штампи СО: ${S.stamps.length} з 4   ·   СОшка: ${club ? club.name : "—"}`, 800, 760);
  const d = S.finishedAt ? new Date(S.finishedAt) : new Date();
  x.font = "500 26px Manrope, sans-serif"; x.fillStyle = "#4a5163";
  x.fillText("Дата проходження: " + d.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" }), 800, 830);
  x.fillText("Символічний сертифікат «Справжній могилянець» · демоверсія", 800, 1000);
  // печатка
  x.save(); x.translate(1330, 880); x.rotate(-0.18); x.strokeStyle = "#c2452d"; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 100, 0, 7); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 84, 0, 7); x.stroke();
  x.fillStyle = "#c2452d"; x.font = "800 30px Unbounded, sans-serif"; x.fillText("KMA", 0, -8); x.font = "700 20px Manrope, sans-serif"; x.fillText("QUEST · 1615", 0, 26); x.restore();
  // аватар
  const av = svgImage("avh" + S.player.avatar, charSVG(AVATARS[S.player.avatar], "happy", { head: true }));
  await new Promise(r2 => { if (av.complete && av.naturalWidth) r2(); else { av.onload = r2; av.onerror = r2; } });
  x.save(); x.beginPath(); x.arc(270, 880, 110, 0, 7); x.fillStyle = "#141b2e"; x.fill(); x.clip(); try { x.drawImage(av, 160, 770, 220, 220); } catch (e) {} x.restore();
  x.strokeStyle = "#d9a21b"; x.lineWidth = 6; x.beginPath(); x.arc(270, 880, 110, 0, 7); x.stroke();
  return c.toDataURL("image/png");
}
 
