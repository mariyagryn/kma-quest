"""Обробка власних записів: шумозаглушення, EQ, компресія, нормалізація → MP3."""
import sys, os, wave, subprocess
import numpy as np
from scipy.signal import butter, sosfiltfilt, lfilter
import noisereduce as nr

SR = 48000

def read(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768

def write_mp3(a, path, work):
    wav = os.path.join(work, "_o.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(["lame", "--quiet", "-m", "m", "-b", "160", "--resample", "44.1", wav, path], check=True)

def peaking(a, f0, gain_db, q):
    A = 10 ** (gain_db / 40); w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w0), 1 - al * A]; c = [1 + al / A, -2 * np.cos(w0), 1 - al / A]
    return lfilter(np.array(b) / c[0], np.array(c) / c[0], a)

def envelope(a, att_ms, rel_ms):
    x = np.abs(a); env = np.zeros_like(x); at = np.exp(-1 / (SR * att_ms / 1000)); rl = np.exp(-1 / (SR * rel_ms / 1000)); e = 0.0
    for i, v in enumerate(x):
        c = at if v > e else rl; e = c * e + (1 - c) * v; env[i] = e
    return env

def frames_db(a, n=960):
    f = a[: len(a) // n * n].reshape(-1, n); return 20 * np.log10(np.sqrt((f ** 2).mean(1)) + 1e-9)

def process(a, vol=1.0, breath=False, ratio=2.5):
    if breath:
        from debreath import debreath
        r = []; a = debreath(a, report=r); print("  вдихи приглушено:", r)
    # 1. зрізаємо гул/низ < 75 Гц
    a = sosfiltfilt(butter(4, 75, "highpass", fs=SR, output="sos"), a)
    # 2. шумозаглушення за профілем найтихіших фрагментів
    db = frames_db(a); quiet = np.where(db < np.percentile(db, 12))[0]
    noise = np.concatenate([a[i * 960:(i + 1) * 960] for i in quiet]) if len(quiet) > 5 else a[: SR // 4]
    a = nr.reduce_noise(y=a, sr=SR, y_noise=noise, stationary=True, prop_decrease=0.85, n_std_thresh_stationary=1.5)
    # 3. EQ: менше «бубніння», більше розбірливості, м'якше «с/ш»
    a = peaking(a, 250, -2.0, 1.0); a = peaking(a, 3500, 2.0, 0.9); a = peaking(a, 7000, -1.5, 2.0)
    # 4. м'який гейт між словами (-14 дБ у паузах)
    env = envelope(a, 5, 120); edb = 20 * np.log10(env + 1e-9)
    thr = np.percentile(edb, 25) + 8
    g = np.clip((edb - (thr - 10)) / 10, 0, 1); a = a * (10 ** (-14 / 20) + (1 - 10 ** (-14 / 20)) * g)
    # 5. компресія 2.5:1
    env = envelope(a, 8, 150); edb = 20 * np.log10(env + 1e-9); t = np.percentile(edb[edb > thr], 60) if np.any(edb > thr) else -20
    gr = np.where(edb > t, (t - edb) * (1 - 1 / ratio), 0); a = a * 10 ** (gr / 20)
    # 6. обрізаємо тишу на краях
    db = frames_db(a); idx = np.where(db > np.max(db) - 40)[0]
    a = a[max(0, idx[0] * 960 - int(.08 * SR)): min(len(a), (idx[-1] + 1) * 960 + int(.12 * SR))]
    # 7. гучність як у решти файлів (RMS мовлення 0.09), ліміт піків
    s = np.abs(a) > 0.005; a = a * (0.09 / np.sqrt(np.mean(a[s] ** 2))) * vol
    pk = envelope(a, 0.5, 60); a = a * np.minimum(1, 0.9 / (pk + 1e-9)); a = np.clip(a, -0.97, 0.97)
    n = int(.015 * SR); a[:n] *= np.linspace(0, 1, n); a[-n:] *= np.linspace(1, 0, n)
    return a

if __name__ == "__main__":
    src, dst, work = sys.argv[1], sys.argv[2], sys.argv[3]
    vol = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    br = len(sys.argv) > 5 and sys.argv[5] == "breath"
    write_mp3(process(read(src), vol, breath=br, ratio=1.8 if br else 2.5), dst, work)
