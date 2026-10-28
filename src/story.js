/* =========================================================
   Сюжет: пролог, глави 1–4, фінал. Лінійний скінченний автомат:
   S.scene — остання збережена точка, з якої продовжується гра.
   ========================================================= */
const ORDER = ["prologue", "ch1", "ch1_hub", "ch2", "ch3", "ch3_hub", "ch4", "club", "final", "done"];
const T = S2 => S.tasks[S2] === true;
const done = k => { S.tasks[k] = true; };
 
/* ---------- Титульний екран ---------- */
function gate() {
  return new Promise(res => {
    const g = document.createElement("div"); g.className = "gate";
    g.innerHTML = `<div class="in"><div class="k">KMA <span>Quest</span></div><p>Гра для першокурсників Могилянки · ~30 хвилин · найкраще в навушниках</p><div class="pulse">Натисніть, щоб увійти</div></div>`;
    $("#stage").appendChild(g);
    const go = () => { Sound.init(); g.remove(); removeEventListener("keydown", key); res(); };
    const key = e => { if (e.key === "Enter" || e.key === " ") go(); };
    g.addEventListener("click", go); addEventListener("keydown", key);
  });
}
async function titleScreen() {
  setBg("title"); hideNPC(); hideDialog(); hideTasks(); showHUD(false); MapView.hide();
  Sound.startMusic("theme_main"); Sound.stopAmb();
  const saved = loadSave(), nb = storeGet(NB_KEY);
  const ui = document.createElement("div"); ui.className = "title-ui";
  ui.innerHTML = `<div class="logo"><div class="k">KMA <span>Quest</span></div><div class="s">Вас прийнято до Могилянки</div></div>
    <div class="menu">${saved && saved.scene !== "prologue" ? `<button class="btn gold" id="tContinue">Продовжити</button>` : ""}
      <button class="btn ${saved && saved.scene !== "prologue" ? "ghost" : "gold"}" id="tNew">Почати гру</button>
      ${nb && nb.glossary && nb.glossary.length ? `<button class="btn ghost" id="tNb">Нотатник фреша</button>` : ""}
      <button class="btn ghost" id="tAbout">Про гру</button></div>
    <div class="foot">Візуальна новела + point-and-click · Поділ, Київ · без програшу: помилка — це підказка</div>`;
  $("#stage").appendChild(ui);
  return new Promise(res => {
    const c = $("#tContinue", ui);
    if (c) c.onclick = () => { Sound.sfx("click"); ui.remove(); S = loadSave(); res(S.scene); };
    $("#tNew", ui).onclick = () => {
      Sound.sfx("click");
      if (saved && saved.scene !== "prologue") {
        const v = openLayer(`<div class="panel quiz" style="width:520px"><h2>Почати заново?</h2><p class="sub">Збережений прогрес буде стерто. Нотатник фреша залишиться.</p>
          <div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" id="no">Скасувати</button><button class="btn gold" id="yes">Почати заново</button></div></div>`);
        $("#no", v).onclick = () => closeLayer(v);
        $("#yes", v).onclick = () => { closeLayer(v); storeDel(SAVE_KEY); S = freshState(); ui.remove(); res("prologue"); };
      } else { S = freshState(); ui.remove(); res("prologue"); }
    };
    const n = $("#tNb", ui); if (n) n.onclick = () => openNotebook(true);
    $("#tAbout", ui).onclick = () => {
      const v = openLayer(`<div class="panel about"><button class="close" aria-label="Закрити">✕</button><div class="eyebrow">Про гру</div><h2>KMA Quest</h2>
        <p>Перші дні першокурсника в Києво-Могилянській академії: пролог, чотири глави і фінал. Ти знайомишся з бадді, старостою, кампусом, історією Академії, деканатом і САЗом.</p>
        <ul><li>Програти неможливо: після помилки персонаж пояснить правильну відповідь.</li><li>Бали: +10 за відповідь з першої спроби, +5 з наступної. Максимум — 380.</li><li>Гра зберігається автоматично після кожної завершеної сцени.</li></ul>
        <p><b>Керування:</b> миша; <kbd>Пробіл</kbd>/<kbd>Enter</kbd> — далі; <kbd>1</kbd>–<kbd>3</kbd> — вибір відповіді; на карті <kbd>WASD</kbd>/стрілки та <kbd>E</kbd> — увійти.</p>
        <p class="sub">Історичні дати звірено з джерелами НаУКМА; розклад, курси та кредити умовні. Назви студентських організацій справжні, а ситуації у грі художньо змодельовані.</p></div>`);
      $(".close", v).onclick = () => closeLayer(v);
    };
  });
}
 
/* ---------- ПРОЛОГ ---------- */
function admissionVideo() {
  return playVideo({ id: "p1_admission", dur: 25, subs: [[0.5, 4, "Серпень. Кімната абітурієнта."], [4, 10, "Телефон вібрує: «Вас рекомендовано до зарахування — НаУКМА»"], [10, 16, "Та ну! ТАК!!!"], [16, 22, "На стіні з'являється нова позначка: «1 вересня»"]],
    draw(ctx, t) {
      if (t < 16) {
        BG.room(ctx, t);
        let px = 900, py = 395, rot = 0;
        if (t > 2 && t < 9) { px += Math.sin(t * 60) * 3; if (Math.floor(t * 4) % 3 === 0 && Math.floor(t * 20) % 2) Sound.sfx && 0; }
        if (t > 10) { const k = (t - 10) / 6; py = 395 - Math.sin(Math.min(1, k * 2) * Math.PI) * 220 - Math.sin(Math.max(0, k * 2 - 1) * Math.PI) * 140; rot = k * 12; px = 900 - k * 200; }
        ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.fillStyle = "#141b2e"; rr(ctx, -40, -70, 80, 140, 12); ctx.fill();
        ctx.fillStyle = t > 4 ? "#e9eef5" : "#2b3350"; rr(ctx, -34, -62, 68, 124, 8); ctx.fill(); ctx.restore();
        if (t > 4 && t < 10) {
          ctx.fillStyle = "#fff"; rr(ctx, 690, 200, 460, 110, 16); ctx.fill(); ctx.fillStyle = "#2f7d6d"; ctx.beginPath(); ctx.arc(730, 240, 18, 0, 7); ctx.fill();
          ctx.fillStyle = "#141b2e"; ctx.font = "800 18px Manrope, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Електронний кабінет вступника", 760, 236);
          ctx.font = "600 20px Manrope, sans-serif"; ctx.fillText("Вас рекомендовано до зарахування —", 712, 274); ctx.fillStyle = "#2f7d6d"; ctx.font = "800 22px Unbounded, sans-serif"; ctx.fillText("НаУКМА", 712, 300);
        }
        if (t > 10) { const k = (t - 10) / 6; ctx.fillStyle = "#e8c2a0"; [[-1, 0], [1, 0]].forEach(([s]) => { ctx.beginPath(); ctx.ellipse(780 + s * 90, 640 - Math.sin(Math.min(1, k * 3) * Math.PI) * 60, 40, 60, s * .3, 0, 7); ctx.fill(); }); }
      } else {
        ctx.fillStyle = "#e9d9c8"; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(640, 360); ctx.rotate(-0.04); ctx.fillStyle = "#fff9e0"; ctx.fillRect(-260, -160, 520, 320); ctx.fillStyle = "#c2452d"; ctx.beginPath(); ctx.arc(0, -150, 10, 0, 7); ctx.fill();
        ctx.fillStyle = "#141b2e"; ctx.font = "800 84px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.fillText("1 вересня", 0, 20); ctx.font = "600 26px Manrope, sans-serif"; ctx.fillStyle = "#4a5163"; ctx.fillText("Могилянка. Подол. Нове життя.", 0, 80); ctx.restore();
        if (t > 22) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, (t - 22) / 3)})`; ctx.fillRect(0, 0, W, H); }
      }
    } });
}
async function prologue() {
  S = Object.assign(freshState(), { player: S.player.name ? S.player : freshState().player });
  setChapter("Пролог"); showHUD(false);
  Sound.stopMusic();
  await admissionVideo();
  setBg("room"); bgDim = 0.55;
  Sound.startMusic("theme_main");
  const ph = phoneOpen({ title: "Мар'яна · бадді", sub: "у мережі", av: npcSVG("maryana", "happy", { head: true }) });
  await sleep(600);
  for (const m of ["Привіт! Я Мар'яна, твоя бадді 👋", "Бадді — це старшокурсниця, яка допомагає фрешам не загубитись. А фреш — це ти :)", "Розкажи про себе, щоб я знала, кого чекати біля 3-го корпусу."]) {
    await ph.typing("maryana", 1100); ph.add(m, { from: "Мар'яна" }); await sleep(700);
  }
  addWord("fresh", "фреш", "першокурсник; так називають новачків", "slang");
  await sleep(400);
  addWord("buddy", "бадді", "старшокурсник-наставник, який допомагає фрешам освоїтися", "slang");
  await ph.button("Заповнити студентський квиток ▸");
  ph.close();
  await profileForm();
  const ph2 = phoneOpen({ title: "Мар'яна · бадді", sub: "у мережі", av: npcSVG("maryana", "happy", { head: true }) });
  await ph2.typing("maryana", 1000);
  ph2.add("{name} з {faculty}? Клас! Завтра о 10:00 біля 3-го корпусу, не запізнюйся!", { from: "Мар'яна" });
  await ph2.button("Домовились! ▸");
  ph2.close();
  bgDim = 0;
  await nightToMorning();
  save("ch1");
  await titleCard("Глава 1", "Перші кроки в КМА");
}
function profileForm() {
  return new Promise(res => {
    const v = openLayer(`<div class="panel profile"><div class="fields"><div class="eyebrow">Пролог · студентський квиток</div><h2 style="margin-bottom:0">Розкажи про себе</h2>
      <div class="field"><label for="pName">Ім'я</label><input id="pName" maxlength="20" placeholder="Наприклад, Олена" autocomplete="off" value="${esc(S.player.name)}"><div class="err" id="eName"></div></div>
      <div class="field"><label for="pFac">Факультет</label><select id="pFac">${DATA.faculties.map((f, i) => `<option value="${i}">${esc(f.short)} — ${esc(f.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="pSpec">Спеціальність</label><select id="pSpec"></select></div>
      <div class="field"><label>Аватар</label><div class="avatars">${AVATARS.map((a, i) => `<button type="button" data-i="${i}" aria-pressed="${i === S.player.avatar}" aria-label="${a.label}">${charSVG(a, "happy", { head: true })}</button>`).join("")}</div></div>
      <div><button class="btn gold" id="pGo">Отримати студентський</button></div></div>
      <div class="preview"><canvas width="240" height="300"></canvas><div class="lbl">Так тебе бачитимуть на карті</div></div></div>`);
    const fac = $("#pFac", v), spec = $("#pSpec", v), nm = $("#pName", v);
    const fillSpec = () => { const f = DATA.faculties[fac.value]; spec.innerHTML = f.specs.map(s => `<option>${esc(s)}</option>`).join(""); };
    const fi = DATA.faculties.findIndex(f => f.short === S.player.facultyShort); fac.value = fi >= 0 ? fi : 2; fillSpec();
    if (S.player.specialty) spec.value = S.player.specialty;
    fac.onchange = fillSpec;
    let av = S.player.avatar || 0;
    $$(".avatars button", v).forEach(b => b.onclick = () => { av = +b.dataset.i; Sound.sfx("click"); $$(".avatars button", v).forEach(x => x.setAttribute("aria-pressed", x === b)); });
    const pc = $("canvas", v).getContext("2d"); let run = true;
    const dirs = ["down", "right", "up", "left"];
    (function f(now) { if (!run) return; pc.clearRect(0, 0, 240, 300); const t = now / 1000; drawChibi(pc, AVATARS[av], 120, 250 + Math.sin(t * 3) * 3, dirs[Math.floor(t / 0.8) % 4], t * 8, 4); requestAnimationFrame(f); })(performance.now());
    setTimeout(() => nm.focus(), 50);
    if (TEST && !nm.value) nm.value = "Олена";
    $("#pGo", v).onclick = async () => {
      const name = nm.value.trim();
      if (name.length < 2 || name.length > 20) { $("#eName", v).textContent = "Ім'я має містити від 2 до 20 символів."; Sound.sfx("err"); nm.focus(); return; }
      const f = DATA.faculties[fac.value];
      S.player = { name, faculty: f.name, facultyShort: f.short, specialty: spec.value, avatar: av };
      run = false; closeLayer(v);
      await printTicket(); res();
    };
  });
}
async function printTicket() {
  const p = S.player;
  const num = "КМА " + (1615 + p.name.length * 37 + p.avatar * 101) + "-" + String(2026).slice(2) + "-" + String(p.specialty.length * 13).padStart(3, "0");
  const v = openLayer(`<div class="ticket-wrap"><div class="printer"></div><div class="ticket-clip"><div class="ticket" id="tk">
    <div class="ph">${charSVG(AVATARS[p.avatar], "happy", { head: true })}</div>
    <div><h3>Студентський квиток · НаУКМА</h3><div class="nm">${esc(p.name)}</div>
    <dl><dt>Факультет</dt><dd>${esc(p.facultyShort)}</dd><dt>Спеціальність</dt><dd>${esc(p.specialty)}</dd><dt>Курс</dt><dd>1 · бакалаврат</dd><dt>Дійсний до</dt><dd>30.06.2030</dd></dl></div>
    <div class="num">${num}</div></div></div></div>`);
  Sound.sfx("print");
  await sleep(60); $("#tk", v).classList.add("print");
  await sleep(3200);
  closeLayer(v);
}
function nightToMorning() {
  return new Promise(res => {
    const c = document.createElement("canvas"); c.width = W; c.height = H; c.style.zIndex = 55; $("#stage").appendChild(c);
    const ctx = c.getContext("2d"), t0 = performance.now(), D = FAST ? 100 : 3200;
    const mix = (a, b, k) => { const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16)); return "rgb(" + pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(",") + ")"; };
    Sound.sfx("chime");
    (function f(now) {
      const k = Math.min(1, (now - t0) / D);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, mix("0a0f22", "8fc3e8", k)); g.addColorStop(1, mix("27325a", "ffd9a0", k)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffcf5a"; ctx.beginPath(); ctx.arc(640, 640 - k * 380, 70, 0, 7); ctx.fill();
      ctx.fillStyle = mix("0d1326", "c9bfae", k); ctx.fillRect(0, 560, W, 160);
      ctx.fillStyle = "#fff"; ctx.font = "800 40px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.globalAlpha = Math.min(1, k * 2); ctx.fillText(k < 0.5 ? "Ніч перед першим днем…" : "Ранок. 1 вересня", 640, 200); ctx.globalAlpha = 1;
      if (k < 1) requestAnimationFrame(f); else setTimeout(() => { c.remove(); res(); }, FAST ? 0 : 600);
    })(t0);
  });
}
 
/* ---------- ГЛАВА 1 ---------- */
const debateClub = DATA.clubs[0], mediaClub = DATA.clubs[1], histClub = DATA.clubs[2], volClub = DATA.clubs[3];
function ch1Tasks() {
  setTasks("Глава 1 · справи на сьогодні", [
    { id: "chat", label: "Додатися в чатик групи і розібрати сленг", sub: "міні-гра «Сленг-перекладач»", done: T("ch1_chat"), click: true },
    { id: "dana", label: "Знайти старосту Дану", sub: "особистий чат", done: T("ch1_dana"), click: true },
    { id: "stand", label: "Стенд СО на площі: Дебатний клуб НаУКМА", opt: true, done: S.stamps.includes("debate"), click: true }
  ], "Справи можна робити в будь-якому порядку.");
}
async function ch1Intro() {
  setBg("yardDay"); showHUD(true); setChapter("Глава 1 · Перші кроки в КМА");
  Sound.startMusic("theme_campus"); Sound.startAmb("yard");
  await say("maryana", "Ось ти де, {name}! Ласкаво просимо до Могилянки. За твоєю спиною — 3-й корпус Академії. Звідси зручно починати будь-який маршрут кампусом.", { emo: "happy", voice: "maryana_01" });
  await say("maryana", "У тебе сьогодні три справи: додатися в чатик групи, знайти старосту і вивчити нашу мову. Бо тут такий сленг, що без перекладача не розбереш.", { voice: "maryana_02" });
  const r = await choose(["Що таке СОшка?", "Готовий до всього!"], { who: "maryana", text: "Питання є?" });
  if (r.i === 0) await say("maryana", "СО — студентська організація, а сошка — ласкаво. Їх тут десятки, ще побачиш.", { emo: "happy", voice: "maryana_03a" });
  else await say("maryana", "От і побачимо, фреше :)", { emo: "happy", voice: "maryana_03b" });
  ch1Tasks(); await slideTasksIn();
  save("ch1_hub");
}
async function groupChat() {
  const ph = phoneOpen({ title: "{faculty} 1 курс 🔥", sub: "214 учасників", av: "🔥" });
  ph.add("Мар'яна додала {name} до групи", { sys: true });
  for (const m of DATA.slang.chat) { await sleep(1200); ph.add(m.text, { from: m.from }); }
  await sleep(800);
  ph.add("Нічого не зрозуміло?.. Зараз розберемося!", { from: "Мар'яна" });
  await ph.button("Відкрити перекладач ▸");
  ph.el.hidden = true;
  await slangGame();
  DATA.slang.words.forEach(w => { if (w.id !== "fresh") addWord(w.id, w.term, w.def, "slang"); });
  ph.el.hidden = false;
  ph.add("в КМЦ, звичайно!", { me: true }); Sound.sfx("notif");
  await sleep(700); ph.add("👍👍", { from: "Остап" });
  await ph.button("Закрити чат");
  ph.close();
  done("ch1_chat"); save();
}
async function danaChat() {
  const ph = phoneOpen({ title: "Дана · староста", sub: "у мережі", av: npcSVG("dana", "happy", { head: true }) });
  await ph.typing("dana", 900);
  ph.add("Привіт! Я Дана, староста нашої групи. Скидаю корисне:", { from: "Дана" }); await sleep(600);
  ph.add("1) посилання на розклад\n2) пошта деканату\n3) правило: про пропуски пишемо мені заздалегідь", { from: "Дана" }); await sleep(500);
  ph.add("📌", { sticker: true, silent: true }); await sleep(700);
  ph.add("Перевірка, щоб ти точно знав(-ла), до кого йти 😉", { from: "Дана" });
  for (let i = 0; i < DATA.whoToAsk.length; i++) {
    const it = DATA.whoToAsk[i]; let tries = 0;
    await sleep(500); ph.add(`Ситуація ${i + 1}: ${it.q}. До кого звернешся?`, { from: "Дана" });
    while (true) {
      const k = await ph.replies(DATA.whoOpts, it.a);
      ph.add(DATA.whoOpts[k], { me: true });
      if (k === it.a) { award("ch1_who_" + i, tries ? 5 : 10); Sound.sfx("ok"); await sleep(400); ph.add("Так! " + DATA.whoWhy[i], { from: "Дана" }); break; }
      tries++; Sound.sfx("err"); await sleep(400); ph.add("Не зовсім 🙂 " + DATA.whoWhy[i] + " Спробуєш ще?", { from: "Дана" });
    }
  }
  await sleep(500); ph.add("🎉", { sticker: true, silent: true });
  addWord("who", "Хто за що відповідає", "", "guide", { wide: true, html: "<b style='display:inline;font-family:inherit'>Староста</b> — пропуски, розклад, оголошення групи.<br><b style='display:inline;font-family:inherit'>Бадді</b> — СОшки, кампус, «як тут усе влаштовано».<br><b style='display:inline;font-family:inherit'>Деканат</b> — довідки, ІНП, документи. Пошта — у закріпі чату." });
  await ph.button("Дякую, Дано!");
  ph.close();
  done("ch1_dana"); save();
}
async function ch1Hub() {
  setBg("yardDay"); showHUD(true); setChapter("Глава 1 · Перші кроки в КМА");
  Sound.startMusic("theme_campus"); Sound.startAmb("yard");
  showNPC("maryana", "neutral"); hideDialog();
  while (!(T("ch1_chat") && T("ch1_dana"))) {
    ch1Tasks();
    const id = await waitTask();
    if (id === "chat") await groupChat();
    if (id === "dana") await danaChat();
    if (id === "stand") await standVisit(debateClub);
  }
  ch1Tasks();
  if (!S.stamps.includes("debate")) {
    const r = await choose(["Зазирну до стенду СО", "Йдемо далі"], { who: "maryana", text: "Усе зроблено! Біля входу ще стоїть стенд Дебатного клубу НаУКМА. Зазирнеш чи йдемо далі?" });
    if (r.i === 0) await standVisit(debateClub);
  }
  await say("maryana", "Тепер ти говориш могилянською! Далі — кампус. Тримай карту.", { emo: "happy", voice: "maryana_04" });
  hideDialog(); hideTasks(); hideNPC();
  await unfoldMap();
  save("ch2");
  await titleCard("Глава 2", "Орієнтація на кампусі");
}
function unfoldMap() {
  return new Promise(res => {
    const c = document.createElement("canvas"); c.width = W; c.height = H; c.style.zIndex = 55; $("#stage").appendChild(c);
    const ctx = c.getContext("2d"), t0 = performance.now(), D = FAST ? 80 : 2200;
    const src = MapView.prerender();
    Sound.sfx("paper");
    (function f(now) {
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      ctx.fillStyle = "#141b2e"; ctx.fillRect(0, 0, W, H);
      const w = 120 + (W - 160) * Math.min(1, e * 1.6), h = 60 + (H - 100) * Math.max(0, (e - .3) / .7);
      ctx.save(); ctx.translate(640, 360); ctx.rotate((1 - e) * -0.2);
      ctx.fillStyle = "#efe6cf"; ctx.fillRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16);
      if (src) ctx.drawImage(src, -w / 2, -h / 2, w, h);
      ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + w * i / 4, -h / 2); ctx.lineTo(-w / 2 + w * i / 4, h / 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
      ctx.restore();
      if (k < 1) requestAnimationFrame(f); else setTimeout(() => { c.remove(); res(); }, FAST ? 0 : 400);
    })(t0);
  });
}
 
/* ---------- ГЛАВА 2 ---------- */
function ch2State(id) {
  const h = S.hunt || 0, started = T("ch2_hunt_started");
  switch (id) {
    case "corp3": return T("ch2_sched") ? "done" : "active";
    case "kmc": return T("ch2_room") ? "done" : T("ch2_sched") ? "active" : "normal";
    case "girkyi": case "puzatka": case "kfs": { const idx = DATA.hunt.findIndex(x => x.id === id); return idx < h ? "icon" : (T("ch2_hunt") ? "icon" : "active"); }
    case "stand2": return S.stamps.includes("media") ? "done" : "active";
    case "stand4": return "hidden";
    case "lib1": case "lib2": case "dean": return "locked";
    default: return "normal";
  }
}
function ch2Tasks() {
  const h = S.hunt || 0;
  setTasks("Глава 2 · орієнтація", [
    { id: "s", label: "Як читати розклад", sub: "3-й корпус", done: T("ch2_sched") },
    { id: "r", label: "Перша лекція: знайти аудиторію", sub: T("ch2_sched") ? "КМЦ, ауд. " + DATA.targetRoom : "спершу розклад", done: T("ch2_room") },
    { id: "h", label: "Кава між парами", sub: T("ch2_hunt_started") ? `знайдено ${h} з 3 · фото ${Math.min(h + 1, 3)}` : "зайди в будь-яке кафе на карті", done: T("ch2_hunt"), click: T("ch2_hunt_started") && !T("ch2_hunt") },
    { id: "st", label: "Стенд СО: KMA Today", opt: true, done: S.stamps.includes("media") }
  ], T("ch2_hunt_started") && !T("ch2_hunt") ? "Натисни «Кава між парами», щоб знову побачити фото." : "Завдання — у будь-якому порядку. Точки з «!» активні.");
}
async function ch2() {
  setChapter("Глава 2 · Орієнтація на кампусі"); showHUD(true); hideNPC(); hideDialog();
  Sound.startMusic("theme_campus"); Sound.startAmb("podil");
  setBg("blank");
  let from = S._mapFrom || null;
  if (!T("ch2_intro")) {
    MapView.reset(); MapView.show(ch2State); ch2Tasks();
    await say("maryana", "Це карта кампусу. Ходи клавішами WASD або стрілками, або просто клікай, куди йти. Точки зі знаком «!» чекають на тебе.", { sprite: false, voice: "maryana_05" });
    hideDialog(); done("ch2_intro"); save();
  }
  while (!(T("ch2_sched") && T("ch2_room") && T("ch2_hunt"))) {
    MapView.show(ch2State, { from }); ch2Tasks(); setBg("blank");
    const id = await Promise.race([MapView.wait(), waitTask().then(t => "task:" + t)]);
    from = id;
    if (id === "task:h") { await showHuntPhoto(S.hunt || 0); continue; }
    if (id.startsWith("task:")) continue;
    await ch2Point(id);
    S._mapFrom = id; save();
  }
  ch2Tasks();
  if (!S.stamps.includes("media")) {
    MapView.show(ch2State, { from });
    const r = await choose(["Зайду до стенду", "Ні, далі"], { who: "maryana", text: "Головне зроблено! Стенд KMA Today ще стоїть на площі. Зазирнеш?", sprite: false });
    hideDialog();
    if (r.i === 0) await standVisit(mediaClub);
  }
  hideTasks();
  for (let k = 0; k <= 30; k++) { MapView.dusk = k / 30; await sleep(60); }
  MapView.hide(); MapView.dusk = 0;
  setBg("yardEvening"); Sound.startMusic("theme_baroque"); Sound.startAmb("evening");
  await say(null, "Смеркає. Двір Староакадемічного корпусу порожніє… Від старої стіни відокремлюється напівпрозора постать.");
  save("ch3");
  await titleCard("Глава 3", "Історія КМА");
}
async function ch2Point(id) {
  if (id === "corp3") {
    if (T("ch2_sched")) { toast("Розклад уже в Нотатнику"); return; }
    await scheduleTask(); done("ch2_sched"); return;
  }
  if (id === "kmc") {
    if (T("ch2_room")) { toast("Ти вже знайшов аудиторію " + DATA.targetRoom); return; }
    if (!T("ch2_sched")) { await say("maryana", "Спочатку зазирни в розклад, бо як ти знатимеш номер аудиторії? Розклад — у 3-му корпусі.", { sprite: false }); hideDialog(); return; }
    await guardScene(); done("ch2_room"); return;
  }
  if (["girkyi", "puzatka", "kfs"].includes(id)) {
    if (T("ch2_hunt")) { toast(MAP_POINTS.find(p => p.id === id).name + ": кава смачна, але завдання вже виконано ☕"); return; }
    if (!T("ch2_hunt_started")) {
      done("ch2_hunt_started"); S.hunt = 0;
      await say("maryana", "О, ти знайшов кафе! Тримай мій сторіс-квест: я сфоткала три місця, де ми п'ємо каву й обідаємо між парами. Знайди їх усі.", { sprite: false, voice: "maryana_06" });
      hideDialog(); ch2Tasks();
      await showHuntPhoto(0);
      if (id !== DATA.hunt[0].id) return;
    }
    const cur = DATA.hunt[S.hunt || 0];
    if (id !== cur.id) { await say("maryana", "Хм, на фото не це місце. Подивись уважніше на вивіску.", { sprite: false }); hideDialog(); return; }
    Sound.sfx("ok");
    await huntStory(S.hunt || 0);
    award("ch2_hunt_" + cur.id, 10);
    S.hunt = (S.hunt || 0) + 1; save();
    if (S.hunt >= DATA.hunt.length) { done("ch2_hunt"); addWord("cafes", "Де поїсти між парами", "Гіркий — кава; Пузатка — дешево пообідати; КФС/Сільпо — швидко перекусити.", "guide"); return; }
    ch2Tasks(); await showHuntPhoto(S.hunt);
    return;
  }
  if (id === "stand2") { await standVisit(mediaClub); return; }
  if (id === "stara" || id === "corp3") {
    if (T("ch2_sched") && !T("ch2_room")) { await say("maryana", "Хм, це не КМЦ. КМЦ — праворуч угорі, фіолетовий дах.", { sprite: false }); hideDialog(); return; }
    toast("Староакадемічний корпус. Сюди ми ще повернемося ввечері…"); return;
  }
}
async function guardScene() {
  MapView.hide(); hideTasks(); setBg("kmcEntrance"); Sound.startAmb("office");
  await say("guard", "Стоп-стоп. Куди це ми так поспішаємо?", { voice: "guard_01" });
  await askScored("guard", "Ну? Я слухаю.", ["Доброго ранку! Я першокурсник, йду на лекцію. Ось мій студентський", "Відстаньте, я спізнююсь", "[мовчки пройти]"], 0,
    { key: "ch2_guard", pts: [20, 10], wrong: [null, "Ввічливість ще нікого не сповільнювала.", "А студентський?"], wrongVoice: [null, "guard_wrong_01", "guard_wrong_02"], ok: "От це розмова. Аудиторія — другий поверх наліво.", okVoice: "guard_02", retryText: "Спробуймо ще раз. Куди йдемо?" });
  hideDialog(); hideNPC();
  await doorsGame();
  await lectureCutscene();
  Sound.startAmb("podil");
}
function lectureCutscene() {
  const a = AVATARS[S.player.avatar || 0];
  let bellRung = false;
  return playVideo({ id: "ch2_lecture", dur: 10, skippable: true, subs: [[0.5, 4, "Ауд. 201. Вільне місце біля вікна…"], [4, 7, "Дзвінок!"], [7, 10, "Встиг!"]],
    draw(ctx, t) {
      ctx.fillStyle = "#e9e3d6"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#2f4a3e"; ctx.fillRect(240, 70, 800, 260); ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 12; ctx.strokeRect(240, 70, 800, 260);
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "600 34px Manrope, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Вища математика · лекція 1", 290, 140); ctx.font = "500 26px Manrope, sans-serif"; ctx.fillText("lim (1 + 1/n)ⁿ = e", 290, 200);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { ctx.fillStyle = "#8a6a3a"; ctx.fillRect(120 + i * 180, 440 + r * 90, 150, 16); if ((r * 6 + i) % 4 !== 1 && !(r === 1 && i === 2)) person(ctx, 195 + i * 180, 450 + r * 90, 1.3, ["#3e5aa8", "#c2452d", "#2f7d6d", "#6b4fa0", "#d9a21b"][(r + i) % 5]); }
      const k = Math.min(1, t / 3.5); const hx = 1280 - (1280 - 555) * k, hy = 540;
      drawChibi(ctx, a, hx, hy - (k >= 1 ? 6 : 0), k < 1 ? "left" : "up", k < 1 ? t * 12 : null, 2);
      if (t > 4 && !bellRung) { bellRung = true; Sound.sfx("bell"); }
      if (t > 4 && t < 6.5) { ctx.fillStyle = "#d9a21b"; ctx.font = "900 60px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.fillText("ДЗИ-И-ИНЬ", 640, 400 + Math.sin(t * 40) * 3); }
      if (t > 5) { const lx = Math.max(1080, 1300 - (t - 5) * 160); person(ctx, lx, 400, 2.4, "#2b3350", "#e8c2a0"); }
      if (t > 7) { ctx.fillStyle = `rgba(20,27,46,${Math.min(.75, (t - 7) * .6)})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#d9a21b"; ctx.font = "800 110px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.fillText("Встиг!", 640, 390); }
    } });
}
 
/* ---------- ГЛАВА 3 ---------- */
function playHistoryVideo(replay) {
  const frames = [
    { a: 0, b: 15, y: 1615, bg: ["#3a2a1a", "#b88a4a"] },
    { a: 15, b: 30, y: 1632, bg: ["#2a2a3a", "#8a7a5a"] },
    { a: 30, b: 50, y: 1701, bg: ["#3a2a12", "#d9a21b"] },
    { a: 50, b: 65, y: 1817, bg: ["#151515", "#4a4a4a"] },
    { a: 65, b: 90, y: 1991, bg: ["#1c3a6a", "#ffd500"] }
  ];
  const subs = [
    [0.5, 7.5, "1615 рік. Поділ. Шляхетна киянка Галшка Гулевичівна дарує свою землю Київському братству."], [7.5, 15, "Так виникає братська школа — з неї все й почалося."],
    [15, 22.5, "1632 рік. Митрополит Петро Могила об'єднує братську та лаврську школи."], [22.5, 30, "Народжується Києво-Могилянська колегія."],
    [30, 40, "1701 рік. Колегія отримує статус академії. Це час її найбільшого розквіту."], [40, 50, "Коштом гетьмана Івана Мазепи зведено корпус, який нині звуть Староакадемічним."],
    [50, 57, "1817 рік. Академію закривають."], [57, 65, "Двері зачиняються на довгі десятиліття. Тиша."],
    [65, 75, "1991 рік. Незалежна Україна — і Академія відроджується."], [75, 83, "Двері знову відчинені. У дворі — нові студенти."], [83, 90, "Серед них тепер і ви, студіозусе {name}."]
  ];
  const sk = svgImage("skv", npcSVG("skovoroda", "neutral"));
  return playVideo({ id: "ch3_history", dur: 90, skippable: !!replay || S.seenHistory, subs, voice: "skovoroda_history",
    draw(ctx, t) {
      const f = frames.find(fr => t >= fr.a && t < fr.b) || frames[4], k = (t - f.a) / (f.b - f.a);
      const g = ctx.createRadialGradient(640, 360, 100, 640, 360, 800); g.addColorStop(0, f.bg[1]); g.addColorStop(1, f.bg[0]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // гравюрна штриховка
      ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 1; for (let i = -H; i < W; i += 9) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
      ctx.save(); ctx.translate(640, 360);
      const ink = "#1a120a", paper = "#efe2c4";
      if (f.y === 1615) { ctx.fillStyle = paper; ctx.fillRect(-260, -170 + (1 - Math.min(1, k * 3)) * 40, 520, 300 * Math.min(1, k * 2)); ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-280, -190, 560, 28); ctx.fillRect(-280, 120 * Math.min(1, k * 2) - 40, 560, 28); ctx.fillStyle = ink; ctx.font = "italic 600 26px Georgia, serif"; ctx.textAlign = "center"; if (k > .3) { ctx.fillText("Дарчий лист", 0, -100); ctx.font = "italic 20px Georgia, serif"; ctx.fillText("…на дім і землю для школи…", 0, -60); ctx.fillText("Гальшка Гулевичівна, 1615", 0, -20); } }
      if (f.y === 1632) { const m = Math.min(1, k * 1.5); ctx.fillStyle = paper; [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(s * 220 * (1 - m), 0, 110, 0, 7); ctx.fill(); }); ctx.fillStyle = ink; ctx.font = "700 24px Georgia, serif"; ctx.textAlign = "center"; if (m < .9) { ctx.fillText("Братська", -220 * (1 - m), 8); ctx.fillText("Лаврська", 220 * (1 - m), 8); } else { ctx.font = "700 28px Georgia, serif"; ctx.fillText("Колегія", 0, 0); ctx.font = "18px Georgia, serif"; ctx.fillText("Петра Могили", 0, 30); } }
      if (f.y === 1701) { ctx.fillStyle = paper; ctx.fillRect(-300, 40, 600, 140); const bh = Math.min(1, k * 1.4); ctx.fillStyle = "#e8dfc8"; ctx.fillRect(-260, 180 - 200 * bh, 520, 200 * bh); ctx.fillStyle = "#2f5a4e"; if (bh > .95) { ctx.beginPath(); ctx.moveTo(-280, -20); ctx.lineTo(-240, -70); ctx.lineTo(240, -70); ctx.lineTo(280, -20); ctx.fill(); } ctx.save(); ctx.rotate(-0.6 + Math.sin(t) * 0.05); ctx.fillStyle = "#d9a21b"; ctx.fillRect(-310, -230, 14, 180); ctx.beginPath(); ctx.arc(-303, -240, 26, 0, 7); ctx.fill(); ctx.restore(); }
      if (f.y === 1817) { const c = Math.min(1, k * 2); ctx.fillStyle = "#3a2a1a"; ctx.fillRect(-200, -220, 400, 440); ctx.fillStyle = "#5a4030"; ctx.fillRect(-190, -210, 190 * c, 420); ctx.fillRect(190 - 190 * c, -210, 190 * c, 420); ctx.fillStyle = "rgba(200,200,200,.15)"; for (let i = 0; i < 40; i++) { ctx.fillRect(((i * 97 + t * 10) % 800) - 400, ((i * 53 + t * 20) % 600) - 300, 2, 2); } }
      if (f.y === 1991) { const o = Math.min(1, k * 2.5); ctx.fillStyle = "#ffe9a0"; ctx.fillRect(-200, -220, 400, 440); ctx.fillStyle = "#5a4030"; ctx.fillRect(-190, -210, 190 * (1 - o), 420); ctx.fillRect(190 - 190 * (1 - o), -210, 190 * (1 - o), 420); if (o >= 1) for (let i = 0; i < 6; i++) person(ctx, -160 + i * 64 + Math.sin(t + i) * 6, 200, 1.8, ["#0057b8", "#ffd500", "#2f7d6d", "#c2452d", "#6b4fa0", "#d9a21b"][i]); }
      ctx.restore();
      ctx.fillStyle = "rgba(239,226,196,.92)"; ctx.font = "800 120px Unbounded, sans-serif"; ctx.textAlign = "left"; ctx.globalAlpha = Math.min(1, k * 4) * (1 - Math.max(0, k - .9) * 10); ctx.fillText(String(f.y), 60, 160); ctx.globalAlpha = 1;
      if (sk.complete) { ctx.globalAlpha = .45; ctx.drawImage(sk, 1010, 330, 240, 368); ctx.globalAlpha = 1; }
    } }).then(() => {
    if (!S.seenHistory) { S.seenHistory = true; DATA.history.forEach(h => addWord("y" + h.y, String(h.y), h.e, "facts")); save(); }
  });
}
function ch3Tasks() {
  setTasks("Глава 3 · історія КМА", [
    { id: "tl", label: "Стрічка часу", sub: "5 подій по порядку", done: T("ch3_tl"), click: true },
    { id: "q", label: "Квіз «Символи Могилянки»", sub: "4 питання від Сковороди", done: T("ch3_quiz"), click: true },
    { id: "v", label: "Переглянути «400 років за 90 секунд»", sub: "можна пропустити", opt: true, click: true },
    { id: "stand", label: "Стенд СО: Спудейське братство", opt: true, done: S.stamps.includes("history"), click: true }
  ]);
}
async function ch3() {
  setChapter("Глава 3 · Історія КМА"); showHUD(true); MapView.hide();
  setBg("yardEvening"); Sound.startMusic("theme_baroque"); Sound.startAmb("evening");
  Sound.sfx("sparkle");
  await sleep(400);
  await say("skovoroda", "Добрий вечір, студіозусе {name}. Я ходив цим двором ще тоді, коли Академія була молодою. Хочеш дізнатися, як усе починалось?", { voice: "skovoroda_01" });
  await choose(["Розкажіть!"], {});
  hideDialog();
  await playHistoryVideo(false);
  await say("skovoroda", "Ну як, запам'ятали? Зараз і перевіримо. Дати я поклав вам у Нотатник.", { emo: "happy", voice: "skovoroda_02" });
  save("ch3_hub");
}
async function symbolsQuiz() {
  for (let i = 0; i < DATA.symbolsQuiz.length; i++) {
    const it = DATA.symbolsQuiz[i];
    await askScored("skovoroda", `Питання ${i + 1} з 4. ${it.q}`, it.o, it.a, { key: "ch3_sym_" + i, wrong: it.why, ok: it.ok });
  }
  await say("skovoroda", "Чотири з чотирьох. Хоча хто рахує, окрім деканату.", { emo: "happy" });
  hideDialog(); done("ch3_quiz"); save();
}
async function ch3Hub() {
  setChapter("Глава 3 · Історія КМА"); showHUD(true); MapView.hide();
  setBg("yardEvening"); Sound.startMusic("theme_baroque"); Sound.startAmb("evening");
  showNPC("skovoroda", "neutral"); hideDialog();
  while (!(T("ch3_tl") && T("ch3_quiz"))) {
    ch3Tasks();
    const id = await waitTask();
    if (id === "tl") { await timelineGame(); done("ch3_tl"); save(); }
    if (id === "q") await symbolsQuiz();
    if (id === "v") await playHistoryVideo(true);
    if (id === "stand") await standVisit(histClub);
  }
  ch3Tasks();
  if (!S.stamps.includes("history")) {
    const r = await choose(["Подивлюсь стенд", "Ні, дякую"], { who: "skovoroda", text: "У кутку двору стоїть стенд Спудейського братства. Глянете, поки я не зник?" });
    if (r.i === 0) await standVisit(histClub);
  }
  hideTasks();
  await say("skovoroda", "Мене світ ловив, та не спіймав. А тебе хай ловлять хіба що дедлайни. Завтра тебе чекає деканат…", { emo: "happy", voice: "skovoroda_03" });
  hideDialog();
  $("#npc").classList.add("dissolve"); Sound.sfx("sparkle"); confettiDust();
  await sleep(1800); hideNPC(); $("#npc").classList.remove("dissolve");
  addWord("skovoroda", "«Світ ловив мене, та не спіймав»", "епітафія, яку Григорій Сковорода склав для себе сам", "facts");
  save("ch4");
  await titleCard("Глава 4", "ВДМС: Академічні виклики");
}
function confettiDust() {
  const c = document.createElement("canvas"); c.width = W; c.height = H; c.style.zIndex = 45; c.style.pointerEvents = "none"; $("#stage").appendChild(c);
  const ctx = c.getContext("2d"), r = mulberry32(1817), t0 = performance.now();
  const P = Array.from({ length: 140 }, () => ({ x: 520 + r() * 240, y: 120 + r() * 420, vx: (r() - .3) * 60, vy: -20 - r() * 70, s: 1 + r() * 3 }));
  (function f(now) { const el = (now - t0) / 1000; ctx.clearRect(0, 0, W, H); P.forEach(p => { ctx.fillStyle = `rgba(190,225,255,${Math.max(0, 1 - el / 2)})`; ctx.beginPath(); ctx.arc(p.x + p.vx * el, p.y + p.vy * el, p.s, 0, 7); ctx.fill(); }); if (el < 2) requestAnimationFrame(f); else c.remove(); })(t0);
}
 
/* ---------- ГЛАВА 4 ---------- */
function ch4State(id) {
  switch (id) {
    case "dean": return T("ch4_inp") ? "done" : "active";
    case "lib1": return T("ch4_lib") ? "done" : T("ch4_catalog") ? "normal" : "active";
    case "lib2": return T("ch4_lib") ? "done" : "active";
    case "stand4": return S.stamps.includes("volunteer") ? "done" : "active";
    case "stand2": return "hidden";
    case "girkyi": case "puzatka": case "kfs": return "icon";
    default: return "normal";
  }
}
function ch4Tasks() {
  setTasks("Глава 4 · академічні виклики", [
    { id: "inp", label: "Деканат: ЄКТС і ІНП", sub: "Деканат на карті", done: T("ch4_inp") },
    { id: "saz", label: "САЗ: запис на дисципліни", sub: T("ch4_inp") ? "натисни, щоб відкрити САЗ на ноутбуці" : "спершу склади ІНП", done: T("ch4_saz"), click: T("ch4_inp") && !T("ch4_saz") },
    { id: "lib", label: "Бібліотека: знайди книгу", sub: T("ch4_catalog") ? "шифр " + DATA.book.code + " · Бібліотека №2" : "будь-яка бібліотека на карті", done: T("ch4_lib") },
    { id: "st", label: "Стенд СО: Взаємодопомога", opt: true, done: S.stamps.includes("volunteer") }
  ], "САЗ відкривається після ІНП. Бібліотека — у будь-який момент.");
}
async function ch4() {
  setChapter("Глава 4 · ВДМС: Академічні виклики"); showHUD(true); hideNPC(); hideDialog();
  Sound.startMusic("theme_campus"); Sound.startAmb("podil"); setBg("blank");
  let from = S._mapFrom4 || null;
  if (!T("ch4_intro")) {
    MapView.show(ch4State, { from: "stara" }); ch4Tasks();
    await say("dana", "Всім привіт! Нагадую: до п'ятниці скласти ІНП і записатися в САЗ. Деканат і бібліотеки вже відчинені.", { sprite: false });
    hideDialog(); done("ch4_intro"); save();
  }
  while (!(T("ch4_inp") && T("ch4_saz") && T("ch4_lib"))) {
    MapView.show(ch4State, { from }); ch4Tasks(); setBg("blank");
    const id = await Promise.race([MapView.wait(), waitTask().then(t => "task:" + t)]);
    if (id === "task:saz") { await sazGame(); done("ch4_saz"); save(); continue; }
    if (id.startsWith("task:")) continue;
    from = id;
    await ch4Point(id);
    S._mapFrom4 = id; save();
  }
  ch4Tasks();
  if (!S.stamps.includes("volunteer")) {
    MapView.show(ch4State, { from });
    const r = await choose(["Зайду до стенду", "Ні, далі"], { who: "maryana", text: "Ти все встиг! Біля Волоської ще стоїть стенд «Взаємодопомоги від НаУКМА». Зазирнеш?", sprite: false });
    hideDialog();
    if (r.i === 0) await standVisit(volClub);
  }
  hideTasks(); MapView.hide();
  save("club");
}
async function ch4Point(id) {
  if (id === "dean") {
    if (T("ch4_inp")) { toast("ІНП уже затверджено. САЗ — у списку завдань."); return; }
    MapView.hide(); hideTasks(); setBg("dean"); Sound.startAmb("office");
    await say("olga", "Так, {name}, ви також прийшли спитати, що таке ІНП? Сідайте, пояснюю один раз.", { voice: "olga_01" });
    await say("olga", "ЄКТС — це кредити. Один кредит — це 30 годин вашої роботи, разом із самостійною. За рік набираєте 60. А ІНП — ваш індивідуальний навчальний план: обов'язкові дисципліни плюс ті, що обираєте самі.", { voice: "olga_02" });
    hideDialog();
    await ectsInfographic();
    addWord("ects", "ЄКТС", "кредити: 1 кредит = 30 годин роботи; семестр — 30, рік — 60", "slang");
    addWord("inp", "ІНП", "індивідуальний навчальний план: обов'язкові + вибіркові дисципліни", "slang");
    await inpGame();
    await say("olga", "Записатися на вибіркові треба через САЗ. Ноутбук у вас є? Список завдань підкаже. І заходьте в САЗ вчасно, бо місця закінчуються.", { emo: "happy", voice: "olga_03" });
    hideDialog(); hideNPC(); done("ch4_inp"); Sound.startAmb("podil"); return;
  }
  if (id === "lib1" || id === "lib2") {
    if (T("ch4_lib")) { toast("Книгу вже знайдено 📚"); return; }
    if (!T("ch4_catalog")) {
      MapView.hide(); hideTasks(); setBg("library"); Sound.startAmb("library");
      await say("librarian", "(пошепки) У нас два приміщення бібліотеки. Спочатку шукай у електронному каталозі, там буде шифр і місце.", { small: true, voice: "librarian_01" });
      hideDialog();
      await catalogSearch(); done("ch4_catalog");
      addWord("findbook", "Як шукати книгу", "1) електронний каталог → 2) шифр і приміщення → 3) полиця з тим самим шифром.", "guide");
      if (id !== DATA.book.place) { await say("librarian", "(пошепки) Книга в Бібліотеці №2. Це інше приміщення, біля Волоської.", { small: true }); hideDialog(); hideNPC(); Sound.startAmb("podil"); return; }
    } else if (id !== DATA.book.place) { toast("(пошепки) Книга — у Бібліотеці №2"); return; }
    MapView.hide(); hideTasks(); setBg("library"); Sound.startAmb("library"); showNPC("librarian");
    await shelvesGame(); hideNPC(); done("ch4_lib"); Sound.sfx("shh"); Sound.startAmb("podil"); return;
  }
  if (id === "stand4") { await standVisit(volClub); return; }
  toast(MAP_POINTS.find(p => p.id === id).name + ": тут зараз нічого не відбувається");
}
async function clubScene() {
  setChapter("Глава 4 · ВДМС: Академічні виклики"); showHUD(true); MapView.hide();
  setBg("yardDay"); Sound.startMusic("theme_campus"); Sound.startAmb("yard");
  await say("maryana", "Ну що, {name}, ІНП є, САЗ пережив, книгу знайшов. Останнє питання: куди хочеш долучитися?", { emo: "happy", voice: "maryana_07" });
  hideDialog();
  const id = await clubChoice();
  const c = DATA.clubs.find(k => k.id === id);
  await say("maryana", `${c.name}? Чудовий вибір! Я тебе з ними познайомлю.`, { emo: "happy" });
  hideDialog();
  save("final");
}
 
/* ---------- ФІНАЛ ---------- */
function finalCutscene() {
  const im = id => svgImage("f_" + id, npcSVG(id, "happy"));
  const ids = ["guard", "dana", "olga", "skovoroda", "maryana", "president"]; ids.forEach(im);
  const av = svgImage("f_av" + (S.player.avatar || 0), charSVG(AVATARS[S.player.avatar || 0], "happy"));
  let confettiDone = false;
  return playVideo({ id: "final", dur: 45, voice: "final", skippable: true,
    subs: [[1, 6, "Петрович киває: «Молодець, першокурснику»"], [7, 12, "Дана махає телефоном: «Ти в чатику — назавжди»"], [13, 18, "Пані Ольга усміхається: «ІНП без жодної помилки»"], [19, 24, "У вікні Староакадемічного майорить Сковорода"],
      [25, 31, "Мар'яна: «Ти більше не фреш-новачок. Тебе хочуть бачити…»"], [32, 40, "Президент Академії: «{name}, ви пройшли шлях, який проходить кожен могилянець. Вітаю в Академії — тепер це і ваш дім»."], [40.5, 45, "Вручення сертифіката"]],
    draw(ctx, t) {
      ctx.save(); const pan = Math.min(1, t / 24); ctx.translate(-pan * 180, 0); ctx.scale(1.15, 1.15); BG.yardFest(ctx, t); ctx.restore();
      const seg = [[0, 6, "guard", 300], [6, 12, "dana", 520], [12, 18, "olga", 760], [24, 32, "maryana", 640], [32, 45, "president", 760]];
      seg.forEach(([a, b, id, x]) => { if (t >= a && t < b) { const k = Math.min(1, (t - a) / .6), out = Math.max(0, (t - b + .6) / .6); ctx.globalAlpha = Math.max(0, k - out); const bob = id === "guard" ? Math.abs(Math.sin(t * 3)) * 10 : id === "dana" ? Math.sin(t * 8) * 4 : 0; ctx.drawImage(im(id), x - 150, 260 + bob, 300, 460); ctx.globalAlpha = 1; if (id === "dana") { ctx.save(); ctx.translate(x + 120, 420); ctx.rotate(Math.sin(t * 8) * .4); ctx.fillStyle = "#141b2e"; rr(ctx, -18, -34, 36, 64, 6); ctx.fill(); ctx.restore(); } } });
      if (t >= 18 && t < 24) { ctx.globalAlpha = .55 + Math.sin(t * 5) * .1; ctx.drawImage(im("skovoroda"), 860, 150, 160, 245); ctx.globalAlpha = 1; }
      if (t >= 32) { ctx.drawImage(av, 220, 300, 270, 414); }
      if (t >= 40) { const k = Math.min(1, (t - 40) / 1.5); ctx.save(); ctx.translate(500 + 100 * (1 - k), 470); ctx.rotate(-0.1); ctx.fillStyle = "#f7f4ee"; ctx.fillRect(-90, -60, 180, 120); ctx.strokeStyle = "#d9a21b"; ctx.lineWidth = 5; ctx.strokeRect(-82, -52, 164, 104); ctx.fillStyle = "#141b2e"; ctx.font = "800 16px Unbounded, sans-serif"; ctx.textAlign = "center"; ctx.fillText("СЕРТИФІКАТ", 0, 0); ctx.restore(); }
      if (t >= 41 && !confettiDone) { confettiDone = true; confetti(3800); }
    } });
}
async function final() {
  setChapter("Фінал"); showHUD(true); hideTasks(); MapView.hide(); hideNPC(); hideDialog();
  Sound.stopAmb(); Sound.startMusic("theme_triumph");
  await finalCutscene();
  if (!S.finishedAt) S.finishedAt = Date.now();
  save("done");
  await certificateScreen();
}
async function certificateScreen() {
  setBg("yardFest"); showHUD(true); setChapter("Фінал · сертифікат"); hideNPC(); hideDialog(); hideTasks(); MapView.hide();
  Sound.startMusic("theme_triumph");
  const url = await makeCertificate();
  const r = rank(score());
  const fname = "KMA-Quest-" + S.player.name.replace(/[^\wа-яіїєґ'-]/gi, "_") + ".png";
  const v = openLayer(`<div class="panel cert"><div><img src="${url}" alt="Сертифікат ${esc(S.player.name)}"></div>
    <div class="side"><div class="eyebrow">Твоє звання</div><div class="rank">${esc(r.title)}</div><div class="pts">${score()} балів з 380 · штампів СО: ${S.stamps.length} з 4</div>
    ${hintBox("maryana", r.line)}
    <a class="btn gold" href="${url}" download="${esc(fname)}" id="dl">⬇ Завантажити сертифікат</a>
    <p class="note">Якщо завантаження не почалося, клацни правою кнопкою на сертифікаті → «Зберегти зображення як…».</p>
    <button class="btn ghost" id="nb">Відкрити Нотатник фреша</button>
    <button class="btn ghost" id="cr">Титри</button>
    <button class="btn" id="again">Грати ще раз</button></div></div>`);
  $("#dl", v).onclick = async e => {
    Sound.sfx("ok");
    if (!window.claude || !window.claude.use) return; // звичайне завантаження за посиланням
    e.preventDefault();
    const fallback = "Клацни правою кнопкою на сертифікаті → «Зберегти зображення як…».";
    try {
      const d = await window.claude.use("downloads");
      if (!d) { toast(fallback); return; }
      const bin = atob(url.split(",")[1]), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      await d.save({ filename: fname, data: new Blob([arr], { type: "image/png" }) });
      toast("Сертифікат збережено");
    } catch (err) { if (!err || err.code !== "declined") toast("Не вдалося зберегти. " + fallback); }
  };
  $("#nb", v).onclick = () => openNotebook();
  $("#cr", v).onclick = () => credits();
  return new Promise(res => { $("#again", v).onclick = () => { closeLayer(v); storeDel(SAVE_KEY); S = freshState(); res("restart"); }; });
}
function credits() {
  return new Promise(res => {
    Sound.startMusic("theme_campus");
    const v = openLayer(`<canvas width="${W}" height="${H}"></canvas><div class="roll"><div class="big">KMA Quest</div><p>Квест для першокурсників Могилянки</p>
      ${DATA.credits.map(([a, b]) => `<h3>${esc(a)}</h3><p>${esc(b)}</p>`).join("")}<h3>Дякуємо, що зіграли</h3><p class="big" style="font-size:40px">${esc(S.player.name || "")}, ласкаво просимо додому</p></div>
      <div class="ctl"><button class="skip" id="cx" style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:18px;padding:7px 16px">Закрити</button></div>`, "credits");
    const ctx = $("canvas", v).getContext("2d"); let run = true; const t0 = performance.now();
    (function f(now) { if (!run) return; BG.yardDay(ctx, (now - t0) / 1000); requestAnimationFrame(f); })(t0);
    const close = () => { run = false; closeLayer(v); Sound.startMusic("theme_triumph"); res(); };
    $("#cx", v).onclick = close; setTimeout(() => { if (run) close(); }, FAST ? 100 : 36000);
  });
}
 
/* ---------- Запуск ---------- */
async function runFrom(scene) {
  const idx = ORDER.indexOf(scene);
  const at = k => idx <= ORDER.indexOf(k);
  if (at("prologue")) await prologue();
  if (at("ch1")) await ch1Intro();
  if (at("ch1_hub")) await ch1Hub();
  if (at("ch2")) await ch2();
  if (at("ch3")) await ch3();
  if (at("ch3_hub")) await ch3Hub();
  if (at("ch4")) await ch4();
  if (at("club")) await clubScene();
  if (at("final")) await final();
  else if (scene === "done") await certificateScreen();
}
async function boot() {
  fit(); requestAnimationFrame(bgLoop);
  $("#snd").onclick = () => { Sound.setEnabled(!Sound.enabled); updateHUD(); };
  $("#nbBtn").onclick = () => openNotebook();
  setBg("title");
  try { await document.fonts.ready; } catch (e) {}
  if (!TEST) await gate(); else Sound.init();
  while (true) {
    const scene = await titleScreen();
    await runFrom(scene);
    hideTasks(); hideDialog(); hideNPC(); MapView.hide(); $("#layer").innerHTML = "";
  }
}
window.__kma = { get S() { return S; }, score, rank, enter: id => MapView.enterForTest(id), solve: () => window.__solve && window.__solve(), task: id => { if (taskResolver) { const r = taskResolver; taskResolver = null; r(id); } } };
boot();
 
