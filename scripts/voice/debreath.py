import numpy as np
from analyze import feats, SR, H, N
from seg import label, runs
def debreath(a, min_frames=7, att_db=-24, ramp_ms=15, report=None):
    F = feats(a); lab, _, _ = label(F); lab = np.array(list(lab))
    gain = np.ones(len(lab)); rs = runs(lab)
    big = [(s0, e0) for k, s0, e0 in rs if k == 'S' and e0 - s0 >= 5]
    first, last = (big[0][0], big[-1][1]) if big else (0, len(lab))
    # краї: перед першим і після останнього справжнього слова (лишаємо 'f' перед першим словом — це «с/ш»)
    def walk(i, step):
        # іде від краю слова назовні, поки поруч (через ≤6 тихих кадрів) є шиплячі 'f'
        while True:
            j = i; k = 0
            while 0 <= j + step < len(lab) and lab[j + step] in 'b.' and k < 6: j += step; k += 1
            if 0 <= j + step < len(lab) and lab[j + step] in 'fS':
                j += step
                while 0 <= j + step < len(lab) and lab[j + step] in 'fS': j += step
                i = j
            else: return i
    pre = walk(first, -1); post = walk(last - 1, +1) + 1
    gain[:max(0, pre - 2)] = 10 ** (att_db / 20); gain[min(len(lab), post + 4):] = 10 ** (att_db / 20)
    keep = np.zeros(len(lab), bool); keep[max(0, pre - 2):post + 4] = True
    edges = [(0, round(pre * H / SR, 2)), (round((post + 4) * H / SR, 2), round(len(a) / SR, 2))]
    # об'єднуємо b і . в одну паузу
    pl = np.where((lab == 'b') | (lab == '.'), 'p', lab); segs = []
    for k, s, e in runs(pl):
        if k != 'p': continue
        nb = np.sum(lab[s:e] == 'b')
        edge = e <= pre or s >= post
        if nb and (edge or (e - s) >= min_frames):
            gain[s:e] = 10 ** (att_db / 20); segs.append((round(s * H / SR, 2), round((e * H + N) / SR, 2)))
    # покадрове посилення -> посемплове, плавно
    g = np.repeat(gain, H); g = np.concatenate([g, np.full(max(0, len(a) - len(g)), gain[-1])])[:len(a)]
    k = int(ramp_ms / 1000 * SR); g = np.convolve(g, np.ones(k) / k, mode='same')
    if report is not None: report.extend(edges + segs)
    return a * g
