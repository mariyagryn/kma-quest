"""Формує сценарій для власної озвучки: voice_recording/СЦЕНАРІЙ_ОЗВУЧКИ.html + manifest.json"""
import os, re, json, sys, types
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.modules["edge_tts"] = types.ModuleType("edge_tts")
src = open(os.path.join(HERE, "gen_auto.py")).read()
pre = src.split("def dec(")[0].replace("SRC, VOICE_DIR = sys.argv[1], sys.argv[2]", "SRC, VOICE_DIR = '', ''").replace('OUT = os.path.join(VOICE_DIR, "auto"); os.makedirs(OUT, exist_ok=True)', "").replace('WORK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "work"); os.makedirs(WORK, exist_ok=True)', "")
g = {"__file__": os.path.join(HERE, "gen_auto.py")}; exec(pre, g); fnv, spoken = g["fnv"], g["spoken"]
VOICE = os.path.join(ROOT, "assets", "voice")
NPC = {"maryana": "Мар'яна (бадді)", "dana": "Дана (староста)", "guard": "Петрович (охоронець)", "skovoroda": "Григорій Сковорода",
       "olga": "пані Ольга (деканат)", "librarian": "Бібліотекарка (пошепки)", "president": "Президент Академії"}
story = open(os.path.join(ROOT, "src", "story.js")).read()
items = []  # dict(code, who, target, text, spoken, kind, note)
# 1) іменні репліки в story.js (say / choose з voice: "id")
seen = set()
for m in re.finditer(r'(?:say|choose)\((?:\[[^\]]*\],\s*\{\s*who:\s*)?"(\w+)",?\s*(?:text:\s*)?"((?:[^"\\]|\\.)*)"[^\n]*?voice:\s*"(\w+)"', story):
    who, text, vid = m.groups()
    if vid in seen: continue
    seen.add(vid); items.append(dict(who=who, target=vid, text=text, pos=m.start(), kind="line"))
# choose: {who:"maryana", text:"Питання є?", voice:"maryana_03q"}
for m in re.finditer(r'\{\s*who:\s*"(\w+)",\s*text:\s*"((?:[^"\\]|\\.)*)",\s*voice:\s*"(\w+)"', story):
    who, text, vid = m.groups()
    if vid not in seen: seen.add(vid); items.append(dict(who=who, target=vid, text=text, pos=m.start(), kind="line"))
# охоронець: ok / wrong
m = re.search(r'wrong:\s*\[null,\s*"([^"]+)",\s*"([^"]+)"\],\s*wrongVoice:\s*\[null,\s*"(\w+)",\s*"(\w+)"\],\s*ok:\s*"([^"]+)",\s*okVoice:\s*"(\w+)"', story)
w1, w2, v1, v2, ok, vok = m.groups(); p = m.start()
for t, v in ((ok, vok), (w1, v1), (w2, v2)):
    if v not in seen: seen.add(v); items.append(dict(who="guard", target=v, text=t, pos=p, kind="line"))
# розклад (VO_FIXED)
items.append(dict(who="maryana", target="maryana_sched", text="У КМА аудиторія записується як корпус-номер. Бачиш стовпець «тижні»? Деякі семінари йдуть не щотижня.", pos=10**9, kind="line"))
# 2) автоозвучка (лише NPC і лише файли, що існують)
d = json.load(open(os.path.join(HERE, "collected.json")))
auto = {}
for x in d["log"]: auto.setdefault(x["id"], (x["who"], x["text"]))
extra = []
for w in d.get("slangWords", []): extra.append(("maryana", "Так! «" + w["term"] + "» — " + w["def"] + "."))
for t in (d.get("slangHints") or {}).values(): extra.append(("maryana", t))
for t in (d.get("timelineHints") or {}).values(): extra.append(("skovoroda", t))
extra += [("skovoroda", "Спершу розклади всі п'ять карток на стрічку."), ("olga", "Забагато. Приберіть щось із вибіркових."), ("olga", "Замало. Додайте ще одну вибіркову."),
          ("olga", "Ось бачите, нічого складного. Тепер — у САЗ."), ("dana", "Без паніки! Беріть запасний курс з такою ж кількістю кредитів. Сума має лишитися 30.")]
for c in d.get("clubs", []): extra.append(("maryana", c + "? Чудовий вибір! Я тебе з ними познайомлю."))
for r in d.get("ranks") or []: extra.append(("maryana", r["line"]))
order = list(auto.keys())
for w, t in extra:
    k = fnv(w, t)
    if k not in auto: auto[k] = (w, t); order.append(k)
for i, k in enumerate(order):
    who, text = auto[k]
    if who not in NPC: continue
    if not os.path.exists(os.path.join(VOICE, k + ".mp3")): continue
    items.append(dict(who=who, target=k, text=text, pos=10**6 + i, kind="line"))
# 3) відео з таймінгами
def subs_of(name):
    m = re.search(r'const subs = \[(.*?)\];', story, re.S) if name == "ch3_history" else re.search(r'id: "final".*?subs: \[(.*?)\],\s*draw', story, re.S)
    return [(float(a), float(b), t) for a, b, t in re.findall(r'\[([\d.]+),\s*([\d.]+),\s*"((?:[^"\\]|\\.)*)"\]', m.group(1))]
videos = {"skovoroda_history": ("skovoroda", "ch3_history", 90), "final": (None, "final", 45)}
for vid, (who, name, dur) in videos.items():
    for j, (a, b, t) in enumerate(subs_of(name), 1):
        items.append(dict(who=who or "narr_final", target=vid, part=j, start=a, end=b, text=t, pos=2 * 10**6 + len(items), kind="video", dur=dur))
# 4) стенди клубів
items += [dict(who="club_debate", target="debate_club", part=1, text="— Шановна колегіє, я стверджую, що пари о 8:30 — це злочин проти людства.", kind="club", pos=3*10**6),
          dict(who="club_debate", target="debate_club", part=2, text="— Опонентко, а ви бачили, як порожніє черга в Гіркому о 8:15?", kind="club", pos=3*10**6+1),
          dict(who="club_debate", target="debate_club", part=3, text="— Час! Судді, ваш вердикт.", kind="club", pos=3*10**6+2),]
GROUPS = [("maryana", "Мар'яна (бадді)"), ("dana", "Дана (староста)"), ("guard", "Петрович (охоронець)"), ("skovoroda", "Григорій Сковорода"),
          ("olga", "пані Ольга (деканат)"), ("librarian", "Бібліотекарка (читати пошепки)"), ("president", "Президент Академії"),
          ("narr_final", "Фінальне відео (оповідь)"), ("club_debate", "Стенд Дебатного клубу"), ("club_media", "Стенд KMA Today")]
PFX = {"maryana": "MAR", "dana": "DAN", "guard": "GRD", "skovoroda": "SKV", "olga": "OLG", "librarian": "LIB", "president": "PRS", "narr_final": "FIN", "club_debate": "DEB", "club_media": "MED"}
out = []; html = []
for key, title in GROUPS:
    grp = sorted([x for x in items if x["who"] == key], key=lambda x: x["pos"])
    if key == "skovoroda":  # спершу репліки, потім відео історії
        grp = [x for x in grp if x["kind"] != "video"] + [x for x in grp if x["kind"] == "video"]
    if not grp: continue
    html.append(f'<h2>{title} <span>{len(grp)}</span></h2><table><tr><th>Назва файлу</th><th>Що читати</th></tr>')
    for n, x in enumerate(grp, 1):
        code = f"{PFX[key]}_{n:03d}"; x["code"] = code
        sp = re.sub(r"\s+([!?.,:;])", r"\1", spoken(x["text"])).strip(" ,"); sp = re.sub(r"«\s+(\w)", lambda m: "«" + m.group(1).upper(), sp)
        x["spoken"] = sp
        note = ""
        if x["kind"] == "video": note = f'<div class="n">частина відео «{ "Історія Академії" if x["target"]=="skovoroda_history" else "Фінал"}», вкластися ≈ {x["end"]-x["start"]:.0f} с</div>'
        if x["target"] in ("debate_club",): note = '<div class="n">' + ["дебатерка", "опонент", "суддя"][x["part"] - 1] + "</div>"
        html.append(f'<tr><td class="c">{code}</td><td>{sp}{note}</td></tr>')
        out.append({k: x[k] for k in ("code", "who", "kind", "target", "text", "spoken") if k in x} | ({"part": x["part"]} if "part" in x else {}) | ({"start": x["start"], "end": x["end"], "dur": x["dur"]} if x["kind"] == "video" else {}))
    html.append("</table>")
OUTD = os.path.join(ROOT, "voice_recording")
json.dump(out, open(os.path.join(OUTD, "manifest.json"), "w"), ensure_ascii=False, indent=1)
css = """body{font:15px/1.5 -apple-system,Segoe UI,sans-serif;max-width:900px;margin:32px auto;padding:0 16px;color:#141b2e}
h1{font-size:26px}h2{margin-top:36px;border-bottom:3px solid #d9a21b;padding-bottom:4px}h2 span{font-size:14px;color:#888;font-weight:400}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e5e5e5;padding:8px 10px;vertical-align:top;text-align:left}
td.c{font:600 14px ui-monospace,Menlo,monospace;white-space:nowrap;color:#1c3a6a;width:90px}.n{color:#a06a00;font-size:13px;margin-top:2px}
.box{background:#f6f3ea;border-left:4px solid #d9a21b;padding:12px 16px;margin:16px 0}@media print{h2{break-after:avoid}tr{break-inside:avoid}}"""
intro = f"""<h1>KMA Quest · сценарій озвучки</h1><div class="box"><b>Як записувати</b><br>
1. Кожна репліка — окремий файл. Назва файлу = код зліва, наприклад <b>MAR_001.wav</b> (можна .m4a або .mp3).<br>
2. Усі файли кладіть у папку <b>kma-quest/voice_recording/записи/</b>.<br>
3. Читайте текст як є: скорочення й числа вже розписані словами, наголос позначено знаком ́ над голосною.<br>
4. На початку й в кінці файлу — пів секунди тиші, без зайвих слів. Тиха кімната, той самий мікрофон для всіх записів.<br>
5. Якщо якусь репліку не записали — у грі залишиться поточна озвучка.<br>
Усього реплік: <b>{len(out)}</b></div>"""
open(os.path.join(OUTD, "СЦЕНАРІЙ_ОЗВУЧКИ.html"), "w").write(f"<!doctype html><meta charset=utf-8><title>KMA Quest · сценарій озвучки</title><style>{css}</style>{intro}{''.join(html)}")
from collections import Counter
print(len(out), Counter(x["who"] for x in out))
