"""Автоозвучка KMA Quest: усі показані тексти -> assets/voice/auto/<fnv1a>.mp3
Використання: python3 gen_auto.py collected.json <папка assets/voice> [--only-missing]
"""
import sys, os, json, re, asyncio, subprocess, wave
import numpy as np
import edge_tts

SRC, VOICE_DIR = sys.argv[1], sys.argv[2]
ONLY_MISSING = "--only-missing" in sys.argv
OUT = os.path.join(VOICE_DIR, "auto"); os.makedirs(OUT, exist_ok=True)
WORK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "work"); os.makedirs(WORK, exist_ok=True)
SR = 24000
A = "́"

CAST = {
    "maryana":   ("uk-UA-PolinaNeural", "+10%", "+30Hz", 1.0),
    "dana":      ("uk-UA-PolinaNeural", "+14%", "+55Hz", 1.0),
    "olga":      ("uk-UA-PolinaNeural", "-6%",  "-30Hz", 1.0),
    "librarian": ("uk-UA-PolinaNeural", "-12%", "-12Hz", 0.55),
    "guard":     ("uk-UA-OstapNeural",  "-4%",  "-28Hz", 1.0),
    "skovoroda": ("uk-UA-OstapNeural",  "-16%", "-12Hz", 1.0),
    "president": ("uk-UA-OstapNeural",  "-8%",  "-4Hz",  1.0),
    None:        ("uk-UA-OstapNeural",  "+0%",  "+6Hz",  1.0),   # оповідач
    "chat:Остап": ("uk-UA-OstapNeural", "+10%", "+14Hz", 1.0),
    "chat:Тарас": ("uk-UA-OstapNeural", "+8%",  "+26Hz", 1.0),
    "chat:Ліза":  ("uk-UA-PolinaNeural", "+12%", "+42Hz", 1.0),
}

def fnv(who, raw):
    s = (who or "narr") + "|" + raw
    h = 0x811c9dc5
    b = s.encode("utf-16-le")
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8); h = (h * 0x01000193) & 0xFFFFFFFF
    return "auto/%08x" % h

# --- як читати вголос ---
REPL = [
    (r"\{name\} з \{faculty\}\? Клас!", "Клас!"),
    (r"студіозусе \{name\}", "студіозусе"), (r",?\s*\{name\}\s*,?", " "), (r"\{faculty\}", "твого факультету"),
    (r"\(пошепки\)\s*", ""), (r"знав\(-ла\)", "знав чи знала"),
    (r"1\) (.+?)\n2\) (.+?)\n3\) ", r"Перше — \1. Друге — \2. Третє — "),
    (r"\bКМЦ-201\b", "Ка-Ем-Це, двісті один"), (r"\b4-105\b", "чотири сто п'ять"), (r"«корпус-номер»", "корпус — номер"),
    (r"\bКМЦ\b", "Ка-Ем-Це"), (r"\bКМА\b", "Ка-Ем-А"), (r"\bЄКТС\b", "Є-Ка-Те-Ес"), (r"\bІНП\b", "І-Ен-Пе"),
    (r"\bСОшк", "сошк"), (r"\bСО\b", "Ес-О"), (r"«ВТ»", "«вівторок»"), (r"\bKMA Today\b", "Ка-Ем-А Тудей"),
    (r"\b10:00\b", "десятій"), (r"\b8:30\b", "восьмій тридцять"), (r"\b8:15\b", "восьмій п'ятнадцять"),
    (r"\b3-го\b", "третього"), (r"\b2-й\b", "другий"), (r"\b8-му\b", "восьмому"), (r"\+10\b", "плюс десять"), (r"\+5\b", "плюс п'ять"),
    (r"\b21 кр\.", "двадцять один кредит"), (r"\b9 кр\.", "дев'ять кредитів"), (r"\bкр\.", "кредитів"),
    (r"\bАуд\. 201\b", "Аудиторія двісті один"), (r" \+ ", " плюс "), (r"\b3-ї\b", "третьої"), (r"«1 вересня»", "«Перше вересня»"), (r"\b5 хвилин\b", "П'ять хвилин"),
    (r"\b1997\b", "тисяча дев'ятсот дев'яносто сьомого"), (r"№\s?2", "номер два"), (r"\bГ\. ", "Григорій, "),
    (r"\b(\d+) з (\d+)\b", lambda m: {"1": "перше", "2": "друге", "3": "третє", "4": "четверте"}.get(m.group(1), m.group(1)) + " з " + {"4": "чотирьох", "3": "трьох"}.get(m.group(2), m.group(2))),
    (r"\bфреші\b", "фре" + A + "ші"), (r"\bфреше\b", "фре" + A + "ше"), (r"\bсошк", "со" + A + "шк"),
    (r"САЗом", "САЗом"), (r"\bСпудейськ", "Спуде" + A + "йськ"),
    (r"[\U0001F300-\U0001FAFF☀-➿️]+", ""), (r":\)", ""), (r"\s+", " "),
]
def spoken(t):
    for a, b in REPL: t = re.sub(a, b, t)
    t = t.strip(" —-")
    return t

def dec(mp3):
    subprocess.run(["lame", "--quiet", "--decode", mp3, os.path.join(WORK, "d.wav")], check=True)
    w = wave.open(os.path.join(WORK, "d.wav")); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    assert w.getframerate() == SR; return a
def trim(a, thr=0.01, pad=0.06):
    i = np.where(np.abs(a) > thr)[0]
    if not len(i): return a
    p = int(pad * SR); return a[max(0, i[0] - p): i[-1] + p]
def level(a, vol):
    s = np.abs(a) > 0.005; a = a * (0.09 / np.sqrt(np.mean(a[s] ** 2))) * vol
    pk = np.max(np.abs(a)); return a * (0.95 / pk) if pk > 0.95 else a
def fade(a, ms=15):
    n = int(SR * ms / 1000); a = a.copy(); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n); return a
def write_mp3(a, path):
    wav = os.path.join(WORK, "o.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(["lame", "--quiet", "-m", "m", "-b", "128", "--resample", "44.1", wav, path], check=True)

async def tts(text, who, extra=0):
    v, r, p, vol = CAST.get(who, CAST[None]); r = int(r.replace("%", "")) + extra
    tmp = os.path.join(WORK, "t.mp3")
    for attempt in range(3):
        try: await edge_tts.Communicate(text, v, rate=f"{r:+d}%", pitch=p).save(tmp); break
        except Exception as e:
            if attempt == 2: raise
            await asyncio.sleep(2)
    return fade(level(trim(dec(tmp)), vol))

async def main():
    d = json.load(open(SRC))
    items = {x["id"]: (x["who"], x["text"]) for x in d["log"]}
    bad = [i for i, (w, t) in items.items() if fnv(w, t) != i]
    print("хеш збігається:", len(items) - len(bad), "/", len(items), "розбіжності:", bad[:3])
    # --- тексти, які автопрохідник не бачив ---
    extra = []
    for w in d.get("slangWords", []): extra.append(("maryana", "Так! «" + w["term"] + "» — " + w["def"] + "."))
    for t in (d.get("slangHints") or {}).values(): extra.append(("maryana", t))
    for t in (d.get("timelineHints") or {}).values(): extra.append(("skovoroda", t))
    extra += [("skovoroda", "Спершу розклади всі п'ять карток на стрічку."),
              ("olga", "Забагато. Приберіть щось із вибіркових."), ("olga", "Замало. Додайте ще одну вибіркову."),
              ("olga", "Ось бачите, нічого складного. Тепер — у САЗ."),
              (None, "Заміну вже обрано. Перевірте суму і підтвердіть запис."),
              (None, "Вхід до САЗ. Натисни «Увійти»."), (None, "Оберіть семестр і натисніть «Далі»."),
              (None, "Додайте дисципліни зі свого ІНП."), (None, "Додайте запасний курс із такою ж кількістю кредитів, як у курсу без місць."),
              (None, "Запис успішний. Урок: завжди мати запасний варіант і заходити в САЗ вчасно."),
              ("chat:Остап", "ЛЮДИ САЗ ЛІГ"), ("chat:Тарас", "все, відрахування"),
              ("dana", "Без паніки! Беріть запасний курс з такою ж кількістю кредитів. Сума має лишитися 30.")]
    for f in d.get("sazFull", []): extra.append(("chat:Ліза", "в мене «" + f + "» 0 місць 😭😭"))
    for c in d.get("clubs", []): extra.append(("maryana", c + "? Чудовий вибір! Я тебе з ними познайомлю."))
    for r in d.get("ranks") or []: extra.append(("maryana", r["line"]))
    for w, t in extra: items.setdefault(fnv(w, t), (w, t))
    report = []
    for i, (who, text) in items.items():
        path = os.path.join(VOICE_DIR, i + ".mp3"); sp = spoken(text)
        report.append(dict(id=i, who=who, text=text, spoken=sp))
        if not sp or (ONLY_MISSING and os.path.exists(path)): continue
        write_mp3(await tts(sp, who), path); print("✓", (who or "narr")[:10].ljust(10), sp[:70])
    # --- відео без окремої озвучки: трек за таймінгами субтитрів ---
    VSPK = {"story_girkyi": "maryana", "story_puzatka": "maryana", "story_kfs": "maryana"}
    for vid, v in d.get("videos", {}).items():
        path = os.path.join(OUT, "vid_" + vid + ".mp3")
        if ONLY_MISSING and os.path.exists(path): continue
        buf = np.zeros(int(v["dur"] * SR), np.float32); prev = 0; lines = []
        for s0, e0, t in v["subs"]:
            sp = spoken(t)
            if not sp: continue
            who = VSPK.get(vid); a = await tts(sp, who)
            if len(a) / SR > (e0 - s0) - 0.2: a = await tts(sp, who, extra=15)
            s = max(s0, prev + 0.2); st = int(s * SR); a = a[: max(0, len(buf) - st)]; buf[st: st + len(a)] += a; prev = s + len(a) / SR
            lines.append(f"[{s:.1f}] {sp}")
        write_mp3(buf, path); report.append(dict(id="auto/vid_" + vid, who=VSPK.get(vid), text="\n".join(lines), spoken="\n".join(lines)))
        print("🎬", vid, len(lines), "фраз")
    json.dump(report, open(os.path.join(OUT, "_report.json"), "w"), ensure_ascii=False, indent=1)
    print("усього файлів:", len(report))

asyncio.run(main())
