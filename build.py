import os
os.makedirs('dist', exist_ok=True)
css = open('src/style.css').read()
order = ['data','audio','art','engine','map','games','story']
js = '\n'.join(open(f'src/{n}.js').read() for n in order)
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@500;700;800&display=swap">'
body = '''<div id="app"><div id="stage">
<canvas id="bg" width="1280" height="720"></canvas>
<div id="npc" class="off" aria-hidden="true"></div>
<canvas id="map" width="1280" height="720" hidden aria-label="Карта кампусу"></canvas>
<div id="hud" hidden><div class="score"><small>Бали</small><b>0</b></div><div class="chapter"></div><button class="hbtn" id="nbBtn"><span class="dot"></span>Нотатник фреша</button><button class="hbtn" id="snd">🔊 Звук</button></div>
<div id="tasks" hidden></div>
<div id="dialog" hidden><div class="who"></div><div class="text" aria-live="polite"></div><div class="choices"></div><button class="next">Далі ▸</button></div>
<div id="layer"></div><div id="toast" aria-live="polite"></div><div id="card"></div><div id="fade"></div>
</div></div>
<div id="small"><div><b>KMA Quest</b>Гра розрахована на комп'ютер або ноутбук. Відкрийте її у вікні, ширшому за 700 пікселів.</div></div>'''
art = f'<title>KMA Quest</title>\n{fonts}\n<style>\n{css}\n</style>\n{body}\n<script>\n{js}\n</script>\n'
open('dist/kmaquest.html','w').write(art)
full = f'<!doctype html>\n<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n{art.split(chr(10),1)[0]}\n{fonts}\n<style>\n{css}\n</style></head><body>\n{body}\n<script>\n{js}\n</script>\n</body></html>\n'
open('dist/index.html', 'w', encoding='utf-8').write(full)
open('index.html', 'w', encoding='utf-8').write(full)
print(len(art)//1024, 'KB')
 
