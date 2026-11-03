# Інструменти озвучки

- `gen_auto.py` — автоозвучка всіх показаних текстів (edge-tts) у `assets/voice/auto/<хеш>.mp3`.
  `python3 gen_auto.py collected.json ../../assets/voice [--only-missing]`
  Хеш — FNV-1a від `"<персонаж>|<текст>"`, такий самий, як `voKey()` у `src/engine.js`.
- `collected.json` — тексти, зібрані проходженням гри з `?test&collect` (масив `VO.log`).
- `process.py` — обробка власних записів: шумозаглушення, EQ, компресія, вирівнювання гучності.
  `python3 process.py вхід.wav вихід.mp3 . [гучність] [breath]` (`breath` — приглушити вдихи, `debreath.py`).
- `debate.py` — збирає трек стенду Дебатного клубу (`debate_club.mp3`).
