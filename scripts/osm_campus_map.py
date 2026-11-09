"""Build src/mapdata.js (campus map geometry) from OpenStreetMap data.

Data: scripts/osm/campus_osm.json and scripts/osm/pois_osm.json — Overpass API extracts
(© OpenStreetMap contributors, ODbL). To refresh them, re-run the Overpass queries noted below.

The map is rotated 45° so that the NaUKMA campus stands upright like on the official schemes:
вул. Григорія Сковороди / Іллінська run vertically, Волоська / Почайнинська horizontally,
Контрактова площа is at the bottom. Run: python scripts/osm_campus_map.py
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
geo = json.load(open(os.path.join(ROOT, 'scripts/osm/campus_osm.json'), encoding='utf-8'))
pois = json.load(open(os.path.join(ROOT, 'scripts/osm/pois_osm.json'), encoding='utf-8'))

LAT0, LON0 = 50.4650, 30.5195
KX = math.cos(math.radians(LAT0))
ROT = math.radians(45)
FIT = 0.86                  # масштаб: трохи менший, щоб угорі лишався простір над 4-м корпусом
YOFF = 340 * FIT - 285      # вертикальний зсув: верх 4-го корпусу ≈ 75 px від краю (раніше ≈ 29)
SCALE = 1.3 * 1.035 * FIT  # px per metre


def proj(lat, lon):
    x = (lon - LON0) * 111320 * KX
    y = (lat - LAT0) * 111320
    xr = x * math.cos(ROT) - y * math.sin(ROT)
    yr = x * math.sin(ROT) + y * math.cos(ROT)
    sx, sy = 790 + (xr * 1.3 - 2) * 1.035, 360 + (-yr * 1.3 + 30) * 1.035
    # трохи зменшуємо, щоб і 4-й корпус угорі, і KFC/Сільпо внизу мали запас від країв екрана
    return (790 + (sx - 790) * FIT, 360 + (sy - 360) * FIT + YOFF)


VIEW = (220, -80, 1360, 800)  # з запасом навколо видимої області карти (x ≥ 300)


def visible(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return max(xs) > VIEW[0] and min(xs) < VIEW[2] and max(ys) > VIEW[1] and min(ys) < VIEW[3]


def flat(pts):
    return [round(v) for p in pts for v in p]


def inside(x, y, poly):
    c = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


# --- classification -------------------------------------------------------
KMA = {871929127, 45513953, 45513952, 45513951, 45513954, 45565560, 27818434, 45565569,
       45565568, 45565567, 884825261, 45565561}
CHURCH_TAGS = {'church', 'cathedral', 'chapel'}

buildings, roads, greens, tram = [], [], [], []
poly_by_id = {}
for e in geo['elements']:
    t = e.get('tags', {})
    g = e.get('geometry')
    if not g and e['type'] == 'relation':  # multipolygon buildings: use outer rings
        for m in e.get('members', []):
            if m.get('role') == 'outer' and m.get('geometry'):
                pts = [proj(p['lat'], p['lon']) for p in m['geometry']]
                if 'building' in t and visible(pts):
                    buildings.append({'id': e['id'], 'k': 'grey', 'p': pts})
        continue
    if not g:
        continue
    pts = [tuple(round(v) for v in proj(p['lat'], p['lon'])) for p in g]  # ті самі цілі координати, що й у грі
    if not visible(pts):
        continue
    if 'building' in t and len(pts) > 2:
        k = 'kma' if e['id'] in KMA else 'church' if t.get('building') in CHURCH_TAGS or t.get('amenity') == 'place_of_worship' else 'grey'
        if t.get('building') in ('ruins', 'roof', 'terrace'):
            continue  # not solid walls
        buildings.append({'id': e['id'], 'k': k, 'p': pts[:-1] if pts[0] == pts[-1] else pts})
        poly_by_id[e['id']] = buildings[-1]['p']
    elif t.get('railway') == 'tram':
        tram.append(pts)
    elif t.get('leisure') in ('park', 'garden') or t.get('landuse') == 'grass':
        greens.append(pts)
    elif 'highway' in t:
        hw = t['highway']
        w = {'primary': 20, 'secondary': 18, 'tertiary': 15, 'residential': 12, 'unclassified': 12,
             'living_street': 11, 'pedestrian': 0, 'service': 6}.get(hw)
        if w is None or t.get('area') == 'yes':
            continue
        roads.append({'w': w, 'p': pts, 'name': t.get('name', '')})

# --- cafés: buildings that contain the real POIs --------------------------
CAFES = {}
for e in pois['elements']:
    t = e.get('tags', {}); c = e.get('center', e)
    n = t.get('name', '')
    key = {'Пузата Хата': 'puzatka', 'KFC': 'kfs', 'Сільпо': 'silpo'}.get(n)
    if not key:
        continue
    if key == 'puzatka' and t.get('addr:street') != 'Контрактова площа':
        continue  # друга Пузата Хата — на Верхньому Валу
    x, y = proj(c['lat'], c['lon'])
    if not (VIEW[0] < x < VIEW[2] and 0 < y < 720):
        continue  # e.g. the other Пузата Хата on Верхній Вал is off-map
    CAFES[key] = (x, y)
# На Подолі три «Гіркі». У OpenStreetMap позначено лише один (біля метро, вузол 10694687439);
# два інші — за описом: на плацу біля 3-го корпусу та в парку біля пам'ятника Сковороді (вузол 26337168).
GIRKYI = {
    'girkyi3': (50.46543, 30.51669),   # біля метро «Контрактова площа»
    'girkyi':  (50.46418, 30.51905),   # на плацу, біля 3-го корпусу
    'girkyi2': (50.46478, 30.51770),   # у парку біля пам'ятника Григорію Сковороді
}
for key, (la, lo) in GIRKYI.items():
    CAFES[key] = proj(la, lo)
MONUMENT = proj(50.46461, 30.51792)    # пам'ятник Григорію Сковороді (OSM memorial)
METRO = proj(50.46515, 30.51668)       # вестибюлі метро «Контрактова площа» (середнє з OSM subway_entrance)
for b in buildings:
    for key, (x, y) in CAFES.items():
        if inside(x, y, b['p']):
            b['k'] = 'cafe'; b.setdefault('cafes', []).append(key)
# Кіоски без власної будівлі в OSM (на плацу й у парку) — маленький павільйон, що теж не пускає крізь себе.
for key, (x, y) in CAFES.items():
    if not any(key in b.get('cafes', []) for b in buildings):
        buildings.append({'id': -1, 'k': 'cafe', 'cafes': [key], 'p': [(round(x) - 9, round(y) - 6), (round(x) + 9, round(y) - 6), (round(x) + 9, round(y) + 6), (round(x) - 9, round(y) + 6)]})

# --- walkability (same rule as the game: outside every building polygon) --
solid = [b['p'] for b in buildings]
bboxes = [(min(p[0] for p in q), min(p[1] for p in q), max(p[0] for p in q), max(p[1] for p in q)) for q in solid]


def blocked(x, y):
    if x < 308 or x > 1270 or y < 6 or y > 712:
        return True
    for (x0, y0, x1, y1), q in zip(bboxes, solid):
        if x0 - 3 <= x <= x1 + 3 and y0 - 3 <= y <= y1 + 3:
            for dx, dy in ((0, 0), (3, 0), (-3, 0), (0, 3), (0, -3)):
                if inside(x + dx, y + dy, q):
                    return True
    return False


def door(ax, ay):
    """Nearest walkable point to a preferred door position, with clearance from walls."""
    def clear(x, y):
        return not blocked(x, y) and all(not blocked(x + 6 * math.cos(k * math.pi / 4), y + 6 * math.sin(k * math.pi / 4)) for k in range(8))
    for r in range(0, 60, 2):
        best = None
        for i in range(max(8, r * 4)):
            a = 2 * math.pi * i / max(8, r * 4)
            x, y = ax + r * math.cos(a), ay + r * math.sin(a)
            if clear(x, y):
                d = (x - ax) ** 2 + (y - ay) ** 2
                if best is None or d < best[0]:
                    best = (d, x, y)
        if best:
            return round(best[1]), round(best[2])
    return round(ax), round(ay)


def bbox(pid):
    q = poly_by_id[pid]
    xs = [p[0] for p in q]; ys = [p[1] for p in q]
    return [round(min(xs)), round(min(ys)), round(max(xs) - min(xs)), round(max(ys) - min(ys))]


def centroid(pid):
    q = poly_by_id[pid]
    return sum(p[0] for p in q) / len(q), sum(p[1] for p in q) / len(q)


# Points: label anchor (x, labelY), preferred door, click box. Door anchors face the street/yard used in reality.
PTS = {}


def F(x, y):
    """Hand-placed screen positions below were chosen at FIT = 1; map them to the fitted view."""
    return 790 + (x - 790) * FIT, 360 + (y - 360) * FIT + YOFF


def FH(h):
    x0, y0 = F(h[0], h[1]); x1, y1 = F(h[0] + h[2], h[1] + h[3])
    return [round(x0), round(y0), round(x1 - x0), round(y1 - y0)]


def point(pid_or_xy, label=None, door_at=None, hit=None, fitted=False):
    if not fitted:
        label = label and F(*label); door_at = door_at and F(*door_at); hit = hit and FH(hit)
        if not isinstance(pid_or_xy, int): pid_or_xy = F(*pid_or_xy)
    if isinstance(pid_or_xy, int):
        cx, cy = centroid(pid_or_xy); h = hit or bbox(pid_or_xy)
    else:
        cx, cy = pid_or_xy; h = hit or [round(cx - 22), round(cy - 18), 44, 36]
    lx, ly = label or (cx, cy)
    tx, ty = door(*(door_at or (cx, cy + 20)))
    return {'x': round(lx), 'y': round(h[1] + h[3]), 'labelY': round(ly), 'tx': tx, 'ty': ty, 'hit': h}


PTS['corp4'] = point(871929127, label=(860, 34), door_at=(860, 12), hit=[804, 20, 120, 30])
PTS['kmc'] = point(871929127, label=(945, 66), door_at=(975, 66), hit=[930, 30, 30, 60])
PTS['corp7'] = point(45513953, label=(805, 112), door_at=(770, 115))
PTS['corp6'] = point(45513952, label=(879, 128), door_at=(879, 152))
PTS['corp5'] = point(45513951, label=(934, 112), door_at=(934, 152))
PTS['corp10'] = point(45565561, door_at=(860, 270))
PTS['lib11'] = point(45565569, door_at=(790, 400))
PTS['corp2'] = point(45565560, door_at=(820, 345))
PTS['corp1'] = point(45513954, door_at=(890, 420))
PTS['corp3'] = point(27818434, door_at=(834, 500))
for key, (x, y) in CAFES.items():
    b = next(b for b in buildings if key in b.get('cafes', []))
    xs = [p[0] for p in b['p']]; ys = [p[1] for p in b['p']]
    PTS[key] = point((x, y), label=(x, y - 24), door_at=(x, y), hit=[round(x - 26), round(y - 22), 52, 44], fitted=True)
for key in ('girkyi', 'girkyi2', 'girkyi3'):                       # підписи підняті, щоб три «Гіркі» не злипалися
    PTS[key]['labelY'] -= 0
PTS['stand4'] = point((760, 600), label=(760, 560), door_at=(760, 606), hit=[734, 568, 52, 46])
PTS['stara'] = point((812, 300), door_at=(822, 300))  # двір Староакадемічного корпусу (поява в Главі 4)

# --- tram: chain segments into one path for the animated tram -------------
segs = [s for s in tram if visible(s)]


def chain(segs):
    if not segs:
        return []
    left = sorted(segs, key=lambda s: min(s[0][0], s[-1][0]))
    path = list(left[0] if left[0][0][0] <= left[0][-1][0] else left[0][::-1])
    used = {id(left[0])}
    while True:
        end = path[-1]; nxt = None
        for s in segs:
            if id(s) in used:
                continue
            if math.dist(s[0], end) < 2: nxt = s; break
            if math.dist(s[-1], end) < 2: nxt = s[::-1]; break
        if not nxt:
            return path
        used.add(id(next(s for s in segs if s is nxt or s[::-1] == nxt)))
        path += nxt[1:]


tram_path = chain(segs)

# --- street labels ---------------------------------------------------------
LABELS = {'вулиця Григорія Сковороди': 'вул. Григорія Сковороди', 'Волоська вулиця': 'вул. Волоська', 'Іллінська вулиця': 'вул. Іллінська',
          'Почайнинська вулиця': 'вул. Почайнинська', 'Спаська вулиця': 'вул. Спаська', 'Братська вулиця': 'вул. Братська',
          'Межигірська вулиця': 'вул. Межигірська', 'Костянтинівська вулиця': 'вул. Костянтинівська', 'вулиця Петра Сагайдачного': 'вул. Сагайдачного',
          'Хорива вулиця': 'вул. Хорива', 'Борисоглібська вулиця': 'вул. Борисоглібська'}
best = {}
for r in roads:
    if r['name'] not in LABELS:
        continue
    p = r['p']
    for (x1, y1), (x2, y2) in zip(p, p[1:]):
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        if not (330 < mx < 1250 and 14 < my < 706):
            continue
        L = math.dist((x1, y1), (x2, y2))
        if L > best.get(r['name'], (0,))[0]:
            a = math.atan2(y2 - y1, x2 - x1)
            if a > math.pi / 2: a -= math.pi
            if a < -math.pi / 2: a += math.pi
            best[r['name']] = (L, round(mx), round(my), round(a, 3))
labels = [[LABELS[n], v[1], v[2], v[3]] for n, v in best.items() if v[0] > 40]
labels.append(['Контрактова площа'] + [round(v) for v in F(900, 690)] + [0])

out = {
    'b': [[b['k']] + flat(b['p']) for b in buildings],
    'roads': [[r['w']] + flat(r['p']) for r in roads if r['w']],
    'green': [flat(g) for g in greens],
    'tram': [flat(s) for s in segs],
    'tramPath': flat(tram_path),
    'labels': labels,
    'fountain': [round(v) for v in F(914, 648)],
    'lm': [['monument', round(MONUMENT[0]), round(MONUMENT[1]), "Пам'ятник Г. Сковороді"], ['metro', round(METRO[0]), round(METRO[1]), 'м. Контрактова площа']],
    'spawn': list(door(PTS['corp3']['tx'], PTS['corp3']['ty'] + 60)),
    'pts': PTS,
}
js = ('/* Згенеровано scripts/osm_campus_map.py з даних OpenStreetMap (© OpenStreetMap contributors, ODbL).\n'
      '   Не редагуйте вручну — змінюйте скрипт і запускайте його знову. */\n'
      'const MAP_GEO = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(os.path.join(ROOT, 'src/mapdata.js'), 'w', encoding='utf-8').write(js)
print(f"buildings {len(buildings)}, roads {len(out['roads'])}, greens {len(greens)}, tram segs {len(segs)}, tram path pts {len(tram_path)}, cafes {sorted(CAFES)}, {len(js)//1024} KB")
for k, v in PTS.items():
    print(k, v)
