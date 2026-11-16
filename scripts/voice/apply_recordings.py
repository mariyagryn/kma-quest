"""Підставляє власні записи з voice_recording/записи/ у гру.

Використання (з кореня проєкту):
    python3 scripts/voice/apply_recordings.py            # обробити й підставити все, що записано
    python3 scripts/voice/apply_recordings.py --check    # лише показати, що є, а чого бракує

Назви файлів = коди зі сценарію (MAR_001.wav, SKV_036.m4a ...). Формати: wav, m4a, mp3, ogg/opus (голосові Telegram), aif(f), caf.
Оригінальна синтезована озвучка один раз копіюється у voice_recording/_backup_tts/.
"""
import os, re, sys, json, shutil, subprocess, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
from process import process, read, write_mp3, SR  # noqa: E402

REC = os.path.join(ROOT, "voice_recording", "записи")
VOICE = os.path.join(ROOT, "assets", "voice")
BACKUP = os.path.join(ROOT, "voice_recording", "_backup_tts")
EXTS = (".wav", ".m4a", ".mp3", ".ogg", ".oga", ".opus", ".aif", ".aiff", ".caf")
VOL = {"librarian": 0.55}  # бібліотекарка тихіше, як і раніше

manifest = json.load(open(os.path.join(ROOT, "voice_recording", "manifest.json")))
files = {}
for f in os.listdir(REC) if os.path.isdir(REC) else []:
    base, ext = os.path.splitext(f)
    if ext.lower() in EXTS: files[base.upper()] = os.path.join(REC, f)

have = [x for x in manifest if x["code"] in files]
missing = [x for x in manifest if x["code"] not in files]
unknown = sorted(set(files) - {x["code"] for x in manifest})
print(f"записано: {len(have)} з {len(manifest)}")
if unknown: print("невідомі назви файлів (перевірте код):", ", ".join(unknown))
if "--check" in sys.argv:
    if missing: print("бракує:", ", ".join(x["code"] for x in missing))
    sys.exit()
if not have: sys.exit("у папці записів немає жодного файлу з кодом зі сценарію")

if not os.path.isdir(BACKUP):
    shutil.copytree(VOICE, BACKUP); print("резервна копія синтезованої озвучки →", os.path.relpath(BACKUP, ROOT))

work = tempfile.mkdtemp()
def load(code):
    wav = os.path.join(work, code + ".wav")
    subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", files[code], wav], check=True)
    return read(wav)
def clean(x):
    return process(load(x["code"]), VOL.get(x["who"], 1.0), breath=True, ratio=1.8)

# 1) звичайні репліки
for x in have:
    if x["kind"] != "line": continue
    dst = os.path.join(VOICE, x["target"] + ".mp3"); os.makedirs(os.path.dirname(dst), exist_ok=True)
    write_mp3(clean(x), dst, work); print("✓", x["code"], "→", x["target"])

# 2) відео з таймінгами субтитрів: фраза стартує у свій час (або одразу після попередньої)
for target in sorted({x["target"] for x in manifest if x["kind"] == "video"}):
    parts = [x for x in manifest if x["target"] == target]
    if not all(p["code"] in files for p in parts):
        print("…", target, "— записано не всі частини, лишаю старий трек"); continue
    dur = parts[0]["dur"]; buf = np.zeros(int((dur + 5) * SR), np.float32); prev = 0.0; end = 0.0
    for p in parts:
        a = clean(p); s = max(p["start"], prev + 0.2); st = int(s * SR)
        if st + len(a) > len(buf): buf = np.concatenate([buf, np.zeros(st + len(a) - len(buf), np.float32)])
        buf[st:st + len(a)] += a; prev = s + len(a) / SR; end = max(end, prev)
        if prev > p["end"] + 0.5: print(f"   ! {p['code']} довша за свій субтитр на {prev - p['end']:.1f} с")
    write_mp3(buf[: int(max(dur, end + 0.3) * SR)], os.path.join(VOICE, target + ".mp3"), work); print("🎬", target)

# 3) стенд Дебатного клубу: репліки підряд + оновлення таймінгів у src/data.js
deb = [x for x in manifest if x["target"] == "debate_club"]
if all(p["code"] in files for p in deb):
    gap = np.zeros(int(0.7 * SR), np.float32); buf = [np.zeros(int(0.3 * SR), np.float32)]; t = 0.3; caps = []
    for p in deb:
        a = clean(p); caps.append([round(t, 2), p["text"]]); buf += [a, gap]; t += len(a) / SR + 0.7
    full = np.concatenate(buf); write_mp3(full, os.path.join(VOICE, "debate_club.mp3"), work)
    dp = os.path.join(ROOT, "src", "data.js"); src = open(dp).read()
    src = re.sub(r'voice: "debate_club", voiceDur: [\d.]+,', f'voice: "debate_club", voiceDur: {len(full) / SR:.1f},', src)
    src = re.sub(r'(voice: "debate_club".*?\n\s*voiceLines: )\[.*?\]\],', lambda m: m.group(1) + json.dumps(caps, ensure_ascii=False) + ",", src, count=1, flags=re.S)
    open(dp, "w").write(src); print("🎙 debate_club (таймінги в src/data.js оновлено)")
    subprocess.run([sys.executable, os.path.join(ROOT, "build.py")], cwd=ROOT, check=True)
elif any(p["code"] in files for p in deb):
    print("… debate_club — записано не всі 3 репліки, лишаю старий трек")

if missing: print(f"не записано ({len(missing)}), у грі лишається синтез:", ", ".join(x["code"] for x in missing))
print("готово")
