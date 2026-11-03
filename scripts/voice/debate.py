import sys, os, asyncio, json, subprocess, wave
import numpy as np
from scipy.signal import resample_poly
import edge_tts
from process import process, read, write_mp3, SR
OUT = sys.argv[1]
A = '́'
lines = [
  ("me", None, "— Шановна колегіє, я стверджую, що пари о 8:30 — це злочин проти людства."),
  ("tts", dict(voice="uk-UA-OstapNeural", rate="+6%", pitch="-6Hz"), "Опоне" + A + "нтко, а ви бачили, як порожніє черга в Гіркому о восьмій п'ятнадцять?", "— Опонентко, а ви бачили, як порожніє черга в Гіркому о 8:15?"),
  ("tts", dict(voice="uk-UA-PolinaNeural", rate="-4%", pitch="-20Hz"), "Час! Судді, ваш вердикт.", "— Час! Судді, ваш вердикт."),
]
async def tts(text, c, path):
    await edge_tts.Communicate(text, c["voice"], rate=c["rate"], pitch=c["pitch"]).save(path)
def dec(mp3):
    subprocess.run(["lame", "--quiet", "--decode", mp3, "d.wav"], check=True)
    w = wave.open("d.wav"); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return resample_poly(a, SR, sr).astype(np.float32)
def trim(a, thr=0.01, pad=0.06):
    i = np.where(np.abs(a) > thr)[0]; p = int(pad * SR); return a[max(0, i[0] - p): i[-1] + p]
def level(a):
    s = np.abs(a) > 0.005; return a * (0.09 / np.sqrt(np.mean(a[s] ** 2)))
async def main():
    parts = []
    parts.append((process(read("raw_колегія.wav"), 1.0, breath=True, ratio=1.8), lines[0][2]))
    for i, l in enumerate(lines[1:], 1):
        await tts(l[2], l[1], f"deb{i}.mp3"); a = level(trim(dec(f"deb{i}.mp3")))
        n = int(.015 * SR); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
        a = np.clip(a, -0.97, 0.97); parts.append((a, l[3]))
    gap = np.zeros(int(0.7 * SR), np.float32); buf = [np.zeros(int(0.3 * SR), np.float32)]; t = 0.3; caps = []
    for a, cap in parts:
        caps.append([round(t, 2), cap]); buf += [a, gap]; t += len(a) / SR + 0.7
    full = np.concatenate(buf); write_mp3(full, os.path.join(OUT, "debate_club.mp3"), ".")
    print(json.dumps({"dur": round(len(full) / SR, 2), "lines": caps}, ensure_ascii=False))
asyncio.run(main())
