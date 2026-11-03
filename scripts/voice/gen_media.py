"""Трек стенду KMA Today (media_club.mp3) + озвучка галереї та постера стендів."""
import sys, os, json, asyncio
sys.argv = [sys.argv[0], sys.argv[1], sys.argv[2]]
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen_auto.py")).read().rsplit("asyncio.run(main())", 1)[0]
exec(src)
CAST["reporter"] = ("uk-UA-PolinaNeural", "+6%", "+18Hz", 1.0)
LINES = [(0.3, "Бекстейдж: знімаємо інтерв'ю з фрешами біля 3-го корпусу"),
         (7.0, "Монтаж — уночі, публікація — до першої пари"),
         (14.0, "Анонси всіх подій — у наших соцмережах")]
EXTRA = [(None, "Екскурсія Подолом. В архіві Академії. Реконструкція 1632 року."),
         (None, "ПОРУЧ. Відкрита зустріч щочетверга о 18:00 у дворі Староакадемічного корпусу.")]
async def run():
    buf = []; t = 0; caps = []
    for s0, txt in LINES:
        a = await tts(spoken(txt), "reporter")
        s = max(s0, t + 0.4)
        if s > t: buf.append(np.zeros(int((s - t) * SR), np.float32))
        buf.append(a); caps.append([round(s, 2), "— " + txt if False else txt]); t = s + len(a) / SR
    buf.append(np.zeros(int(1.0 * SR), np.float32)); full = np.concatenate(buf)
    write_mp3(full, os.path.join(VOICE_DIR, "media_club.mp3"))
    out = {"dur": round(len(full) / SR, 1), "lines": caps}
    for who, txt in EXTRA:
        i = fnv(who, txt); write_mp3(await tts(spoken(txt.replace("о 18:00", "о шостій вечора")), who), os.path.join(VOICE_DIR, i + ".mp3")); out[txt] = i
    print(json.dumps(out, ensure_ascii=False))
asyncio.run(run())
