# KMA Quest — MVP
 
Браузерна гра для першокурсників НаУКМА: пролог, 4 глави, фінал із сертифікатом (~25–30 хв). Працює на комп'ютері/ноутбуці в Chrome, Edge, Firefox, Safari.
 
## Запуск
 
- Локально: відкрийте `index.html` у браузері (подвійний клік). Для озвучки/відео з папки `assets` краще запустити простий сервер: `python3 -m http.server` у цій папці й відкрити `http://localhost:8000`.
- Хостинг: `index.html` у корені репозиторію готовий для GitHub Pages або Netlify. Для змін коду запускайте `python3 build.py`, щоб оновити `index.html` та `dist/index.html`.

### Публікація через GitHub Pages

1. Завантажте файли проєкту в репозиторій GitHub (важливо, щоб `index.html` був у корені).
2. У репозиторії відкрийте **Settings → Pages**.
3. У розділі **Build and deployment** оберіть **Deploy from a branch**, гілку `main` та папку `/ (root)`, збережіть.
4. Дочекайтеся публікації та відкрийте посилання, яке GitHub покаже у Pages.

Гра не потребує сервера застосунку чи ключів API. Прогрес зберігається у браузері гравця (`localStorage`).
 
## Структура
 
| Файл | Що всередині |
| --- | --- |
| `index.html` | зібрана HTML-гра; завантажує зображення й аудіо з `assets/` |
| `src/data.js` | **увесь змістовий матеріал**: факультети, сленг, розклад, квізи, дати, курси ІНП/САЗ, стенди СО, звання, титри — редагується без програмування |
| `src/story.js` | сценарій сцен (репліки, порядок глав) |
| `src/games.js` | міні-ігри |
| `src/map.js` | карта кампусу |
| `src/engine.js`, `src/audio.js`, `src/art.js`, `src/style.css` | рушій, звук, графіка, стилі |
| `build.py` | збирає `src/*` в `index.html`: `python3 build.py` → `dist/index.html` |
| `assets/img/` | 8 фонів у WebP/SVG та 78 окремих SVG-портретів у `characters/` |
| `assets/music/` | 4 музичні теми у MP3 та WAV |
| `assets/sfx/` | 17 звукових ефектів у MP3 та WAV |
| `assets/ambience/` | 5 фонових атмосферних звуків у MP3 та WAV |
| `assets/video/`, `assets/voice/` | папки для майбутніх відеофайлів та озвучення |
| `scripts/export_graphics.mjs`, `scripts/export_audio.mjs` | відтворення графіки в SVG та звуку у WAV із наявних алгоритмів |

**Важливо:** графіка та музика більше не «заховані» лише у JavaScript: у папках лежать реальні файли, які можна переглянути та замінити. У коді залишено резервне малювання і синтез звуку на випадок, якщо медіафайл відсутній. Анімації сцен, інтерактивні мініігри та переміщення персонажа на карті продовжують виконуватися кодом.
 
## Як замінити заглушки своїми файлами
 
Гра сама підхопить файл, якщо він лежить у потрібному місці з потрібною назвою. Якщо файлу немає — працює вбудований варіант.
 
**Фони** — `assets/img/bg_<назва>.webp`, 1280×720: `title`, `yardDay`, `yardEvening`, `yardFest`, `kmcEntrance`, `dean`, `library`, `room`. Поруч є SVG-версії для редагування. Портрети NPC та аватарів — `assets/img/characters/*.svg` (звичайні та крупні плани, по три емоції).
 
**Відео** — `assets/video/<id>.mp4` (H.264, 720p): `p1_admission` (25 с), `ch2_lecture` (10 с), `ch3_history` (90 с), `final` (45 с), сторіс `story_girkyi`, `story_puzatka`, `story_kfs`. Субтитри показує гра.
 
**Музика** — `assets/music/<id>.mp3`, цикл: `theme_main`, `theme_campus`, `theme_baroque`, `theme_triumph`.

**Атмосферні звуки** — `assets/ambience/<id>.mp3`: `yard`, `podil`, `office`, `library`, `evening`.
 
**Озвучка** — `assets/voice/<id>.mp3`: `maryana_01`, `maryana_02`, `maryana_03a`, `maryana_03b`, `maryana_04`, `maryana_05`, `maryana_06`, `maryana_07`, `maryana_sched`, `guard_01`, `guard_02`, `guard_wrong_01`, `guard_wrong_02`, `skovoroda_01`, `skovoroda_02`, `skovoroda_03`, `skovoroda_history`, `olga_01`, `olga_02`, `olga_03`, `librarian_01`, `final`. Текст реплік — у `src/story.js` поруч з id.
 
**Звукові ефекти** — `assets/sfx/<id>.mp3`: `click`, `ok`, `err`, `notif`, `word`, `print`, `bell`, `step`, `paper`, `shh`, `stamp`, `pop`, `whoosh`, `door`, `vibrate`, `sparkle`, `chime`.

Початкові WAV-файли залишені поряд із MP3, щоб їх було зручно обробляти в Audacity. Їхні MP3-версії відтворюються грою. Для заміни звуку достатньо підставити MP3 з тією самою назвою.
 
## Детермінованість
 
- Жодного `Math.random()`: шум, конфеті й зірки беруть числа з ГПВЧ із фіксованим зерном.
- Бали: +10 з першої спроби, +5 з наступної (охоронець 20/10, ІНП 30/15, САЗ 20, бібліотека 20). Кожне завдання зараховується один раз. Максимум 380 = 340 + 40 за штампи.
- Звання — чиста функція `rank(score)` у `src/data.js`.
- Автозбереження в `localStorage` після кожної завершеної сцени; «Продовжити» повертає до неї.

 
