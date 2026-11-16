# Інструменти озвучки

- `gen_auto.py` — автоозвучка всіх показаних текстів (edge-tts) у `assets/voice/auto/<хеш>.mp3`.
  `python3 gen_auto.py collected.json ../../assets/voice [--only-missing]`
  Хеш — FNV-1a від `"<персонаж>|<текст>"`, такий самий, як `voKey()` у `src/engine.js`.
- `collected.json` — тексти, зібрані проходженням гри з `?test&collect` (масив `VO.log`).
- `process.py` — обробка власних записів: шумозаглушення, EQ, компресія, вирівнювання гучності.
  `python3 process.py вхід.wav вихід.mp3 . [гучність] [breath]` (`breath` — приглушити вдихи, `debreath.py`).
- `debate.py` — збирає трек стенду Дебатного клубу (`debate_club.mp3`).
- `build_script.py` — формує сценарій для власної озвучки: `voice_recording/СЦЕНАРІЙ_ОЗВУЧКИ.html` + `manifest.json` (код → файл гри).
- `apply_recordings.py` — бере записи з `voice_recording/записи/<КОД>.wav|m4a|mp3`, обробляє (`process.py`) і підставляє в `assets/voice/`; відео (`final`, `skovoroda_history`) збирає за таймінгами субтитрів, стенд дебатів — з оновленням таймінгів у `src/data.js`. `--check` — що записано / чого бракує. Синтез один раз зберігається у `voice_recording/_backup_tts/`.
