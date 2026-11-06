"""Lote 1: os 28 golpes sem nenhum sprite.

    python3 tools/golpes-originais/lote1.py

Grava assets/golpes-originais/<slug>[--peca].png, acrescenta as linhas no golpes.md e
monta a prancha de revisão em assets/golpes-originais/pranchas/lote-1.png.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from kit import *  # noqa

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(RAIZ, "assets", "golpes-originais")
os.makedirs(OUT, exist_ok=True)

REG = []  # (arquivo, w, h, n, peças, descrição)


def salvar(arq, frames, pecas, desc):
    folha_png(frames, os.path.join(OUT, arq))
    REG.append((arq, frames[0].w, frames[0].h, len(frames), pecas, desc))


# glifos 5x5 de runa
RUNAS = [
    ["..#..", ".#.#.", "#.#.#", ".#.#.", "..#.."],
    ["#...#", ".#.#.", "..#..", ".###.", "..#.."],
    ["###..", "#....", "####.", "...#.", "..##."],
]

NOTA_COLCHEIA = [
    "....##...",
    "....###..",
    "....#.##.",
    "....#..#.",
    "....#....",
    "....#....",
    ".####....",
    "#####....",
    "#####....",
    ".###.....",
]
NOTA_DUPLA = [
    "..#######",
    "..#######",
    "..#....#.",
    "..#....#.",
    "..#....#.",
    ".##...##.",
    "###..###.",
    "###..###.",
    ".#....#..",
]
NOTA_SEMINIMA = [
    "....#",
    "....#",
    "....#",
    "....#",
    "....#",
    ".####",
    "#####",
    "#####",
    ".###.",
]


def bitmap_peca(q, rows, cor, O, x0, y0):
    t = Q(q.w, q.h)
    t.bitmap(rows, {"#": cor}, x0, y0)
    t.outline(O)
    q.stamp(t)


def coracao(q, cx, cy, s, P):
    peca(q, lambda x, y: (P.W if hyp(x + s * 0.4, y + s * 0.3) < s * 0.3 else P.M if y > s * 0.1 else P.L) if heart(x - cx, y - cy, s) else None, P.O)


def faisca(q, cx, cy, s, P):
    def fn(x, y):
        ax, ay = abs(x - cx), abs(y - cy)
        if ax < 1 and ay < 1:
            return P.W
        if (ax < 1 and ay <= s) or (ay < 1 and ax <= s):
            return P.L
        return None
    peca(q, fn, P.O if s >= 3 else None)


# 1 ---------- spiky-shield
def spiky_shield():
    frs = []
    for f in range(4):
        q = Q(64, 64)
        R = [17, 23, 23, 23][f]
        Lz = [0, 3, 6, 6][f]
        def fn(x, y, R=R, Lz=Lz):
            d, a = hyp(x, y), ang(x, y)
            if d <= R:
                if d > R - 2:
                    return GRAMA.L if (a < -0.6 and a > -2.6) else GRAMA.M
                return A(GRAMA.L, 90) if hyp(x + 8, y + 8) < 7 else A(GRAMA.M, 80)
            if Lz and d <= R + Lz:
                k = (a * 14 / TAU + 0.5) % 1.0
                off = abs(k - 0.5)
                w = 0.32 * (1 - (d - R) / Lz)
                if off < w:
                    return GRAMA.L if k < 0.5 else GRAMA.D
            return None
        peca(q, fn, GRAMA.O)
        if f == 2:
            peca(q, lambda x, y: GRAMA.W if (R - 6 <= hyp(x, y) <= R - 4.5 and -2.5 < ang(x, y) < -1.7) else None, None)
            for cx, cy in [(-20, -20), (22, -14), (-6, 26), (18, 20)]:
                faisca(q, cx, cy, 3, GRAMA)
        frs.append(q)
    salvar("spiky-shield.png", frs, "domo", "1 domo pequeno se forma; 2 domo cheio com espinhos brotando; 3 espinhos longos e brilho branco com faíscas; 4 estável (repetir 4 enquanto o escudo fica)")


# 2 ---------- mystical-fire
def mystical_fire():
    frs = []
    for f in range(6):
        q = Q(32, 32)
        ph = f * TAU / 6
        def fn(x, y, ph=ph):
            d, a = hyp(x, y), ang(x, y)
            borda = 7 + 3.5 * max(0, math.sin(3 * a - d * 0.45 + ph))
            if d > borda:
                return None
            return MISTICO.W if d < 3 else MISTICO.L if d < 5.5 else MISTICO.M if d < borda - 1.5 else MISTICO.D
        peca(q, fn, MISTICO.O)
        for i in range(3):
            aa = ph / 3 + i * TAU / 3
            rx, ry = 16 + math.cos(aa) * 11.5 - 2, 16 + math.sin(aa) * 11.5 - 2
            bitmap_peca(q, RUNAS[i], MISTICO.L, MISTICO.O, round(rx), round(ry))
        frs.append(q)
    salvar("mystical-fire--projetil.png", frs, "projetil", "1-6 loop: orbe de chama violeta com 3 línguas em espiral girando e 3 runas orbitando (60°/quadro)")
    frs = explosao(MISTICO, 40, 5, seed=4)
    for f, q in enumerate(frs[1:4], 1):
        for i in range(3):
            aa = i * TAU / 3 + f * 0.7
            rr = 8 + f * 4
            bitmap_peca(q, RUNAS[i], MISTICO.W, MISTICO.O, round(20 + math.cos(aa) * rr - 2), round(20 + math.sin(aa) * rr - 2))
    salvar("mystical-fire--impacto.png", frs, "impacto", "1 clarão; 2 estrela de chama; 3 explosão cheia com runas; 4 anel se abrindo, runas afastam; 5 anel dissolvendo")


# 3 ---------- water-shuriken
def water_shuriken():
    q = Q(28, 28)
    def fn(x, y):
        d, a = hyp(x, y), ang(x, y)
        tw = a - d * 0.09
        r = star_r(tw, 4, 4.5, 12.5)
        if d > r:
            return None
        if d < 2.2:
            return None
        if d < 3.4:
            return AGUA.W
        k = ((tw * 4 / TAU) % 1.0)
        lado = k < 0.5
        return AGUA.W if (d > r - 2 and lado and d > 7) else AGUA.L if lado else AGUA.M
    peca(q, fn, AGUA.O)
    salvar("water-shuriken--projetil.png", [q], "projetil", "1 shuriken d'água de 4 pontas curvas (o motor gira e move)")
    salvar("water-shuriken--impacto.png", respingo(AGUA, 32, 4, seed=5), "impacto", "1 coroa d'água pequena; 2 coroa aberta e gotas saindo; 3 gotas longe; 4 gotas menores caindo")


# 4 ---------- leafage
def folha(q, cx, cy, ang_, comp, larg, P):
    def fn(x, y):
        u, v = rot(x - cx, y - cy, ang_)
        if abs(u) > comp:
            return None
        lim = larg * (1 - (u / comp) ** 2)
        if abs(v) > lim:
            return None
        if abs(v) < 0.55 and u < comp * 0.8:
            return P.D
        return P.L if v < 0 else P.M
    peca(q, fn, P.O)


def leafage():
    frs = []
    for i, (a, c, l) in enumerate([(0.5, 5.5, 2.6), (-0.4, 5, 2.4), (1.4, 4.5, 2.2), (2.4, 5.5, 2.8)]):
        q = Q(14, 14)
        folha(q, 0, 0, a, c, l, GRAMA)
        frs.append(q)
    salvar("leafage.png", frs, "particula", "4 variações de folhinha (ângulos e tamanhos); 1 quadro cada, o motor espalha")


# 5 ---------- phantom-force
def phantom_force():
    frs = []
    for f in range(4):
        q = Q(32, 48)
        L = [1.5, 5, 9, 10][f]
        def fn(x, y, L=L):
            if abs(y) > 21:
                return None
            lim = L * (1 - (y / 21) ** 2) + (math.sin(y * 0.6 + f) * 0.8 if f else 0)
            if abs(x) > lim:
                return None
            e = lim - abs(x)
            if e < 1.5:
                return FANTASMA.L
            if e < 3:
                return FANTASMA.M
            return H("#100018") if math.sin(y * 0.5 + x * 0.8 + f * 2) < 0.6 else FANTASMA.D
        peca(q, fn, FANTASMA.O)
        if f >= 2:
            for wx, wy in [(-12, -12), (11, 6), (-10, 15)]:
                peca(q, lambda x, y, wx=wx, wy=wy: FANTASMA.L if hyp(x - wx, (y - wy) * 0.7) < 2 else None, FANTASMA.O)
        frs.append(q)
    salvar("phantom-force--portal.png", frs, "portal", "1 fenda vertical se abre (risco); 2 fenda abrindo; 3 portal aberto com fumaças; 4 portal no máximo (de onde o usuário sai atrás do alvo)")
    frs = []
    for f in range(4):
        q = Q(40, 40)
        k = [0.5, 1, 1, 1][f]
        lg = [2.4, 3.2, 3.2, 1.4][f]
        def fn(x, y, k=k, lg=lg):
            best = None
            for sx in (1, -1):
                d, t = seg_dist(x, y, -16 * sx, -16, -16 * sx + 32 * sx * k, -16 + 32 * k)
                w = lg * (1 - abs(t - 0.5) * 1.1)
                if d < w:
                    c = FANTASMA.W if d < w * 0.35 and f == 2 else FANTASMA.L if d < w * 0.6 else FANTASMA.M
                    best = c
            return best
        peca(q, fn, FANTASMA.O)
        frs.append(q)
    salvar("phantom-force--impacto.png", frs, "impacto", "1 primeiro risco do X na metade; 2 X completo; 3 X com brilho; 4 X afinando")


# 6 ---------- spirit-shackle
def spirit_shackle():
    q = Q(32, 12)
    def fn(x, y):
        if -9 <= x <= 9 and abs(y) < 1:
            return FANTASMA.M
        if x > 9 and abs(y) <= (15 - x) * 0.8:
            return FANTASMA.L if y < 0 else FANTASMA.M
        if x < -9 and x > -15 and abs(abs(y) - (-9 - x) * 0.6) < 1.1:
            return FANTASMA.L
        return None
    peca(q, fn, FANTASMA.O)
    q.set(1, 5, A(FANTASMA.L, 150)); q.set(0, 6, A(FANTASMA.L, 110))
    salvar("spirit-shackle--flecha.png", [q], "flecha", "1 flecha-sombra roxa apontando para a direita (o motor faz cair e cravar)")
    frs = []
    for f in range(4):
        q = Q(64, 32)
        alc = [6, 14, 26, 26][f]
        cor = FANTASMA.W if f == 3 else FANTASMA.L
        elos = []
        for dirx, diry in [(-1, -0.25), (1, -0.25), (-1, 0.3), (1, 0.3)]:
            for i in range(1, 8):
                dist = i * 4
                if dist > alc:
                    break
                elos.append((dirx * dist, diry * dist + 6, i % 2))
        for ex, ey, alt in elos:
            def fn(x, y, ex=ex, ey=ey, alt=alt):
                rx, ry = (2.6, 1.6) if alt else (1.6, 2.2)
                e = ((x - ex) / rx) ** 2 + ((y - ey) / ry) ** 2
                ei = ((x - ex) / (rx - 1)) ** 2 + ((y - ey) / max(ry - 1, 0.6)) ** 2
                return cor if e <= 1 and ei > 1 else None
            peca(q, fn, FANTASMA.O)
        # estaca cravada
        peca(q, lambda x, y: (FANTASMA.L if x < 0 else FANTASMA.M) if (abs(x) < 1.5 and -6 < y < 7) or (abs(x) <= (y + 12) * 0.5 and -12 < y <= -6) else None, FANTASMA.O, oy=0)
        peca(q, lambda x, y: A(FANTASMA.D, 150) if ((x / 9) ** 2 + ((y - 7) / 2.5) ** 2) < 1 and abs(x) > 2 else None, None)
        frs.append(q)
    salvar("spirit-shackle--correntes.png", frs, "correntes", "1 flecha cravada no chão sob o alvo, elos começando; 2 correntes saem em 4 direções; 3 correntes completas prendendo; 4 correntes brilham (fim)")


# 7 ---------- darkest-lariat
def darkest_lariat():
    frs = []
    for f in range(6):
        q = Q(48, 48)
        base = f * math.pi / 6
        def fogo(x, y, base=base):
            d, a = hyp(x, y), ang(x, y)
            if d < 6 or d > 22:
                return None
            for k in (0, math.pi):
                atras = (base + k - a) % TAU
                if atras < 1.4:
                    borda = 22 - atras * 6 + 2 * math.sin(d * 0.9 + f * 2)
                    if d > borda and atras > 0.15:
                        continue
                    if atras < 0.35:
                        return BRASA.L
                    return BRASA.M if (d > 15 or atras < 0.7) else SOMBRA.M if atras < 1.0 else SOMBRA.D
            return None
        peca(q, fogo, SOMBRA.O)
        def bracos(x, y, base=base):
            for k in (0, math.pi):
                ax, ay = math.cos(base + k) * 17, math.sin(base + k) * 17
                if hyp(x - ax, y - ay) < 4:
                    return SOMBRA.L if hyp(x - ax + 1.5, y - ay + 1.5) < 2 else SOMBRA.M
                dd, t = seg_dist(x, y, 0, 0, ax, ay)
                if dd < 2.2:
                    return SOMBRA.M
            if hyp(x, y) < 5:
                return SOMBRA.D
            return None
        peca(q, bracos, SOMBRA.O)
        peca(q, lambda x, y: BRASA.L if hyp(x, y) < 1.5 else None, None)
        frs.append(q)
    salvar("darkest-lariat.png", frs, "redemoinho", "1-6 loop: dois braços escuros com punhos girando 30°/quadro, rastro de chamas preto e vermelho atrás de cada braço")


# 8 ---------- disarming-voice
def disarming_voice():
    frs = []
    for f in range(3):
        q = Q(40, 40)
        tamanhos = [[6], [6, 11], [8, 13, 17.5]][f]
        for i, s in enumerate(tamanhos):
            P = FADA
            def fn(x, y, s=s):
                if heart(x, y, s) and not heart(x, y, s - 2.2):
                    return P.L if y < 0 else P.M
                return None
            peca(q, fn, P.O)
        frs.append(q)
    salvar("disarming-voice.png", frs, "onda", "1 um coração-onda pequeno; 2 dois arcos concêntricos; 3 três arcos maiores (o motor afasta e faz fade)")


# 9 ---------- baby-doll-eyes / tearful-look (olhos)
def olho(q, cx, cy, abertura, iris, brilho, lagrima=False, piscar=False):
    rx, ry = 9, 10
    if piscar:
        def fn(x, y):
            u, v = x - cx, y - cy
            if abs(u) < rx and abs(v - (u / rx) ** 2 * 2.5) < 1.1:
                return H("#402030")
            return None
        peca(q, fn, None)
    else:
        topo = -ry + (2 * ry) * (1 - abertura)
        def fn(x, y):
            u, v = x - cx, y - cy
            if (u / rx) ** 2 + (v / ry) ** 2 > 1 or v < topo:
                return None
            d = hyp(u - 1, v - 1)
            if d < 3.0:
                return H("#180818")
            if d < 6.2:
                bx, by = u + 2.5, v + 3
                if hyp(bx, by) < brilho:
                    return H("#ffffff")
                return iris[1] if v < 1 else iris[0]
            if lagrima and v > 5:
                return H("#a8dcff")
            return H("#ffffff")
        peca(q, fn, H("#402030"))
        # brilho secundário
        q.set(int(q.w / 2 + cx + 2), int(q.h / 2 + cy + 3), H("#ffffff"))
    # cílios
    for i, (lx, ly) in enumerate([(-9, -6), (-7, -9), (-4, -11)]):
        sx = -1 if cx < 0 else 1
        x0 = q.w / 2 + cx + lx * sx * (-1)
        y0 = q.h / 2 + cy + (ly if not piscar else ly * 0.25 + 1)
        for k in range(3):
            q.set(int(x0 + (-k if cx < 0 else k) * 0.8 * (1 if i else 1)), int(y0 - k), H("#402030"))


def baby_doll_eyes():
    iris = (H("#c02880"), H("#f060b0"))
    frs = []
    for f in range(3):
        q = Q(48, 26)
        for cx in (-11, 11):
            olho(q, cx, 2, [0.55, 1, 1][f], iris, [1.6, 2.6, 0][f], piscar=(f == 2))
        if f >= 1:
            for hx, hy in ([(-22, -8), (21, -7)] if f == 1 else [(-21, -10), (22, -9), (0, -10)]):
                coracao(q, hx, hy, 2.6, FADA)
        frs.append(q)
    salvar("baby-doll-eyes.png", frs, "olhos", "1 olhos se abrindo (pálpebra na metade); 2 abertos, brilho grande e 2 coraçõezinhos; 3 piscada com 3 coraçõezinhos")


def tearful_look():
    iris = (H("#3858b0"), H("#6890e0"))
    frs = []
    for f in range(2):
        q = Q(48, 26)
        for cx in (-11, 11):
            olho(q, cx, 2, 0.85, iris, [2.2, 1.6][f], lagrima=True)
        frs.append(q)
    salvar("tearful-look--olhos.png", frs, "olhos", "1-2 loop: olhos marejados com água na pálpebra de baixo; o brilho treme entre os quadros")
    q = Q(8, 12)
    peca(q, lambda x, y: (AGUA.W if hyp(x + 1, y - 1) < 1 else AGUA.L if x < 0.5 else AGUA.M) if (hyp(x, y - 1.5) < 3 or (y < 1.5 and abs(x) < (y + 4.5) * 0.55)) else None, AGUA.O)
    salvar("tearful-look--lagrima.png", [q], "particula", "1 gota de lágrima (o motor faz cair dos olhos)")


# 10 ---------- misty-terrain / grassy-terrain (tela cheia)
def misty_terrain():
    frs = []
    rnd = random.Random(10)
    brilhos = [(rnd.randrange(8, 248), rnd.randrange(112, 188), rnd.randrange(4)) for _ in range(22)]
    for f in range(4):
        q = Q(256, 192)
        s = f * 64
        for y in range(84, 192):
            for x in range(256):
                n = (math.sin((x + s) * TAU / 128 + y * 0.09) + math.sin((x - s) * TAU / 64 * 1 + y * 0.21 + 1.3) * 0.6
                     + math.sin((x + 2 * s) * TAU / 256 * 3 - y * 0.05) * 0.5)
                lim = 1.9 - (y - 84) / 108 * 3.0
                if n > lim + 1.0:
                    q.p[(x, y)] = A(H("#ffd0e4"), 190)
                elif n > lim:
                    q.p[(x, y)] = A(H("#f8a0c8"), 150)
        for bx, by, fase in brilhos:
            k = (f + fase) % 4
            if k in (0, 1):
                faisca(q, bx - 128, by - 96, 3 if k == 0 else 2, FADA)
        frs.append(q)
    salvar("misty-terrain.png", frs, "overlay", "1-4 loop: névoa rosa clara em faixas no chão (metade de baixo da tela), deslizando 64 px/quadro; faíscas acendem e apagam em fases")


def grassy_terrain():
    frs = []
    rnd = random.Random(11)
    tufos = sorted([(rnd.randrange(0, 256), rnd.randrange(132, 192), rnd.random()) for _ in range(60)], key=lambda t: t[1])
    flores = [(rnd.randrange(6, 250), rnd.randrange(140, 188), rnd.choice(["#ffffff", "#ffe040", "#ff88b8"])) for _ in range(20)]
    for f in range(4):
        q = Q(256, 192)
        bal = [0, 1, 0, -1][f]
        for tx, ty, r in tufos:
            alt = 5 + int(r * 5)
            t = Q(256, 192)
            for i, dx in enumerate((-2, 0, 2)):
                h = alt - (1 if i != 1 else 0)
                for k in range(h):
                    sway = bal * (k / h) * (1.5 if i == 1 else 1) + dx * (k / h) * 0.6
                    t.set(tx + dx + round(sway), ty - k, GRAMA.L if k > h * 0.5 and i == 1 else GRAMA.M if i != 2 else GRAMA.D)
            t.outline(GRAMA.O)
            q.stamp(t)
        for fx, fy, cor in flores:
            t = Q(256, 192)
            x0, y0 = fx + bal, fy
            for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                t.set(x0 + dx, y0 + dy, H(cor))
            t.set(x0, y0, H("#f8a800"))
            t.outline(H("#305020"))
            q.stamp(t)
        frs.append(q)
    salvar("grassy-terrain.png", frs, "overlay", "1-4 loop: tufos de grama e florzinhas pelo chão (metade de baixo), balançando centro→direita→centro→esquerda")


# 11 ---------- moonblast
def moonblast():
    LUA = Pal("#a02858", "#e070a0", "#f8a0c8", "#ffd0e8", "#ffffff")
    frs = []
    for f in range(4):
        q = Q(40, 40)
        r = [8, 11, 13, 14][f]
        corte = [5, 7, 10, 99][f]
        if f == 3:
            peca(q, lambda x, y: A(H("#f888b8"), 150) if hyp(x, y) < 18.5 else None, None)
        def fn(x, y, r=r, corte=corte):
            if hyp(x, y) > r:
                return None
            if hyp(x + corte * 0.9, y - corte * 0.4) < r and corte < 99:
                return None
            for kx, ky, kr in [(3, -3, 2.2), (-3, 4, 1.6), (5, 4, 1.4)]:
                if hyp(x - kx, y - ky) < kr:
                    return LUA.D if r > 9 else LUA.M
            return esfera(x, y, r, LUA)
        peca(q, fn, LUA.O)
        if f >= 2:
            for cx, cy in [(-15, -14), (15, -12), (-14, 14)][: f - 1 + 1]:
                faisca(q, cx, cy, 3, LUA)
        frs.append(q)
    salvar("moonblast--lua.png", frs, "lua", "1 lua crescente pequena surgindo no alto; 2 crescente maior; 3 quase cheia com faíscas; 4 lua cheia com halo rosa")
    q = Q(24, 24)
    peca(q, lambda x, y: A(H("#f888b8"), 160) if hyp(x, y) < 11 else None, None)
    peca(q, lambda x, y: esfera(x, y, 7.5, LUA), LUA.O)
    salvar("moonblast--orbe.png", [q], "projetil", "1 orbe rosa com halo (o motor leva da lua ao alvo)")
    salvar("moonblast--explosao.png", explosao(LUA, 48, 5, seed=12), "explosao", "1 clarão; 2 estrela rosa; 3 explosão cheia; 4 anel abrindo; 5 dissolve")


# 12 ---------- sparkling-aria
def bolha(q, cx, cy, r, P):
    def fn(x, y):
        d = hyp(x - cx, y - cy)
        if d > r:
            return None
        if d > r - 1.2:
            return P.M
        if hyp(x - cx + r * 0.45, y - cy + r * 0.45) < r * 0.25:
            return P.W
        return A(P.L, 110)
    peca(q, fn, P.D)


def sparkling_aria():
    frs = []
    for r in (4, 5.5, 7):
        q = Q(16, 16)
        bolha(q, 0, 0, r, AGUA)
        faisca(q, r * 0.6, r * 0.55, 1.5 if r < 6 else 2, AGUA)
        frs.append(q)
    salvar("sparkling-aria--bolha.png", frs, "particula", "3 variações de bolha cintilante (pequena, média, grande)")
    frs = []
    for rows in (NOTA_COLCHEIA, NOTA_DUPLA):
        q = Q(12, 12)
        bitmap_peca(q, rows, AGUA.L, AGUA.O, (12 - len(rows[0])) // 2, (12 - len(rows)) // 2)
        frs.append(q)
    salvar("sparkling-aria--nota.png", frs, "particula", "2 variações de nota musical azul-clara (colcheia e dupla)")


# 13 ---------- branch-poke
def branch_poke():
    frs = []
    for f in range(2):
        q = Q(40, 16)
        dx = [-8, 0][f]
        def galho(x, y, dx=dx):
            x -= dx
            if -20 <= x <= 17 and abs(y - x * 0.03) < (1.4 if x < 8 else 0.8):
                return MADEIRA.M if y < 0 else MADEIRA.D
            for gx, s in [(-6, -1), (3, 1)]:
                d, t = seg_dist(x, y, gx, 0, gx + 5, s * 4)
                if d < 0.7:
                    return MADEIRA.M
            return None
        peca(q, galho, MADEIRA.O)
        for (lx, ly, a) in [(-6 + 6, -5, -0.6), (3 + 6, 5, 0.6), (-14, -3, -0.3)]:
            folha(q, lx + dx, ly, a, 3.6, 1.7, GRAMA)
        if f == 1:
            for yy in (-5, 0, 5):
                for xx in range(-19, -13):
                    q.set(xx + 20 - 8, 8 + yy, A(GRAMA.W, 170))
        frs.append(q)
    salvar("branch-poke--galho.png", frs, "galho", "1 galho recolhido; 2 galho espetando à frente com linhas de movimento")
    salvar("branch-poke--impacto.png", estrela_impacto(AMARELO, 24, 3), "impacto", "1 estrela pequena; 2 estrela cheia; 3 estrela afinando")


# 14 ---------- noble-roar
def noble_roar():
    frs = []
    for f in range(3):
        q = Q(48, 48)
        for R in [[10], [10, 16], [12, 18, 24]][f]:
            def fn(x, y, R=R):
                d, a = hyp(x + 20, y), ang(x + 20, y)
                if abs(a) < 0.75 and R - 2.4 <= d <= R:
                    return OURO.L if d > R - 1.2 else OURO.M
                return None
            peca(q, fn, OURO.O)
        frs.append(q)
    salvar("noble-roar--onda.png", frs, "onda", "1 primeira onda dourada; 2 duas ondas; 3 três ondas largas (saem da boca para a direita)")
    q = Q(48, 48)
    def juba(x, y):
        d, a = hyp(x, y), ang(x, y)
        ro = star_r(a, 14, 17, 23)
        if d > ro or d < 13:
            return None
        return OURO.L if d < 16 else OURO.M if ((a * 14 / TAU) % 1) < 0.5 else OURO.D
    peca(q, juba, OURO.O)
    salvar("noble-roar--juba.png", [q], "juba", "1 juba estilizada em volta do usuário (o motor escala e faz fade)")


# 16 ---------- drum-beating
def drum_beating():
    frs = []
    for f in range(3):
        q = Q(40, 40)
        def tambor(x, y):
            if abs(x) <= 11 and -4 <= y <= 12:
                return MADEIRA.L if x < -6 else MADEIRA.D if x > 6 or (abs(x) < 1 and y > 0) else MADEIRA.M
            if ((x / 11) ** 2 + ((y - 12) / 3) ** 2) <= 1:
                return MADEIRA.D
            return None
        peca(q, tambor, MADEIRA.O, oy=4)
        peca(q, lambda x, y: (MADEIRA.W if ((x / 10) ** 2 + ((y + 4) / 2.6) ** 2) < 0.45 else MADEIRA.L) if ((x / 11) ** 2 + ((y + 4) / 3) ** 2) <= 1 else None, MADEIRA.O, oy=4)
        for sx in (-1, 1):
            a = [-1.0, 0.25, -0.4][f] * sx
            ax, ay = sx * 5, [-6, 0, -3][f]
            bx, by = ax + sx * math.cos(a) * 13, ay - math.sin(abs(a)) * 13 * (1 if f != 1 else -0.2) - (0 if f != 1 else 6)
            def baq(x, y, ax=ax, ay=ay, bx=bx, by=by):
                d, t = seg_dist(x, y, ax, ay, bx, by)
                if hyp(x - ax, y - ay) < 2:
                    return MADEIRA.W
                return MADEIRA.L if d < 1 else None
            peca(q, baq, MADEIRA.O)
        if f == 1:
            for a in (-2.4, -1.6, -0.8):
                for k in range(3):
                    q.set(20 + math.cos(a) * (13 + k), 20 + math.sin(a) * (13 + k) - 2, OURO.L)
        frs.append(q)
    salvar("drum-beating--tambor.png", frs, "tambor", "1 baquetas erguidas; 2 batida no couro com linhas de impacto; 3 baquetas voltando")
    frs = []
    for f in range(4):
        q = Q(32, 48)
        k = [0.25, 0.6, 1, 1][f]
        p0, p1, p2 = (-6, 22), (-8, -4), (10, -20)
        pts = [bezier(p0, p1, p2, i / 40 * k) for i in range(41)]
        def raiz(x, y):
            for i, (px, py) in enumerate(pts):
                w = 3.4 * (1 - i / 41 * 0.85)
                if hyp(x - px, y - py) < w:
                    return MADEIRA.L if x < px - w * 0.3 else MADEIRA.M if x < px + w * 0.4 else MADEIRA.D
            return None
        peca(q, raiz, MADEIRA.O)
        peca(q, lambda x, y: PEDRA.M if ((x + 6) / 9) ** 2 + ((y - 22) / 2.2) ** 2 < 1 and abs(x + 6) > 3 else None, PEDRA.O)
        if f == 3:
            for cx, cy in [(12, -22), (6, -16), (14, -14)]:
                peca(q, lambda x, y, cx=cx, cy=cy: PEDRA.L if hyp(x - cx, y - cy) < 1.5 else None, PEDRA.O)
        frs.append(q)
    salvar("drum-beating--raiz.png", frs, "raiz", "1 chão racha e a ponta da raiz aparece; 2 raiz subindo; 3 raiz inteira curvada para o alvo; 4 golpe com lascas (colocar no field-target)")


# 17 ---------- boomburst
def boomburst():
    frs = []
    for f in range(5):
        q = Q(128, 128)
        aneis = [[8, 14], [10, 18, 26], [16, 28, 40], [26, 40, 54, 62], [44, 58, 63]][f]
        for i, R in enumerate(aneis):
            esp = 4 if f < 3 else 3
            def fn(x, y, R=R, esp=esp):
                d = hyp(x, y)
                if R - esp <= d <= R:
                    return BRANCO.W if d > R - esp / 2 else BRANCO.L
                return None
            peca(q, fn, BRANCO.O)
        if f == 3:
            for k in range(8):
                a = k * TAU / 8
                faisca(q, math.cos(a) * 48, math.sin(a) * 48, 4, BRANCO)
        if f == 4:
            q.clear_mask(lambda x, y: math.sin(ang(x, y) * 12) > 0.2)
        frs.append(q)
    salvar("boomburst.png", frs, "onda", "1 dois anéis brancos pequenos; 2 três anéis; 3 anéis grandes; 4 anéis enormes estourando com faíscas; 5 anéis quebrados em arcos (some)")


# 18 ---------- pyro-ball
def pyro_ball():
    frs = []
    for f in range(4):
        q = Q(24, 24)
        ph = f * TAU / 4
        def fogo(x, y, ph=ph):
            # chamas atrás (à esquerda) e em cima, porque a bola vai para a direita
            u, v = rot(x - 1, y, -0.5)
            return chama(-v, u * 0 + x, 0, 0, 0, 0, FOGO) if False else None
        def fn(x, y, ph=ph):
            d, a = hyp(x, y + 1), ang(x, y + 1)
            if d < 7:
                return None
            borda = 7 + 4 * max(0, math.cos(a - math.pi * 0.85)) + 1.5 * math.sin(a * 5 + ph)
            if d > borda:
                return None
            return FOGO.L if d < 8.5 else FOGO.M if d < borda - 1.2 else FOGO.D
        peca(q, fn, FOGO.O)
        def bola(x, y, ph=ph):
            if hyp(x, y + 1) > 6.5:
                return None
            u, v = rot(x, y + 1, ph * 0.5)
            for px, py in [(0, 0), (4.5, 2), (-3.5, 3.5), (-1, -4.8)]:
                if abs(u - px) + abs(v - py) < 2.0:
                    return PEDRA.O
            return esfera(x, y + 1, 6.5, PEDRA)
        peca(q, bola, PEDRA.O)
        frs.append(q)
    salvar("pyro-ball--bola.png", frs, "projetil", "1-4 loop: bola de pedra com gomos girando e chamas tremulando atrás e em cima")
    salvar("pyro-ball--explosao.png", explosao(FOGO, 48, 5, seed=18), "explosao", "1 clarão; 2 estrela de fogo; 3 explosão cheia; 4 anel de fogo abrindo; 5 dissolve")


# 19 ---------- court-change
def court_change():
    frs = []
    for f in range(4):
        q = Q(128, 64)
        prog = (f + 1) / 4
        for P, cima in ((AMARELO, True), (AZUL, False)):
            rx, ry, esp = 52, 22, 0.16
            if cima:
                a0, a1 = math.pi, math.pi + math.pi * prog  # esquerda → por cima → direita
            else:
                a0, a1 = 0.0, math.pi * prog  # direita → por baixo → esquerda
            def fn(x, y, a0=a0, a1=a1, P=P):
                r = hyp(x / rx, y / ry)
                a = ang(x, y) % TAU
                lo, hi = a0 % TAU, a1 % TAU
                dentro = (lo <= a <= hi) if lo <= hi else (a >= lo or a <= hi)
                if dentro and 1 - esp <= r <= 1:
                    return P.L if r > 1 - esp / 2 else P.M
                return None
            peca(q, fn, P.O)
            tx, ty = math.cos(a1) * rx * (1 - esp / 2), math.sin(a1) * ry * (1 - esp / 2)
            dx, dy = -math.sin(a1) * rx, math.cos(a1) * ry
            n = hyp(dx, dy)
            dx, dy = dx / n, dy / n
            nx, ny = -dy, dx
            tri = [(tx + dx * 8, ty + dy * 8), (tx + nx * 6, ty + ny * 6), (tx - nx * 6, ty - ny * 6)]
            peca(q, lambda x, y, tri=tri, P=P: (P.W if False else P.L) if in_poly(x, y, tri) else None, P.O)
        frs.append(q)
    salvar("court-change.png", frs, "setas", "1-4: seta amarela vai da esquerda para a direita por cima e a azul da direita para a esquerda por baixo, cada quadro avança 1/4 do caminho")


# 21 ---------- liquidation
def liquidation():
    frs = []
    for f in range(4):
        q = Q(48, 48)
        if f == 0:
            def jato(x, y):
                d, t = seg_dist(x, y, -20, 14, 2, -2)
                w = 1.2 + t * 2.5
                return (AGUA.W if d < w * 0.4 else AGUA.L if d < w * 0.75 else AGUA.M) if d < w else None
            peca(q, jato, AGUA.O)
        else:
            abre = [0, 0.6, 1, 1][f]
            def lam(x, y, abre=abre):
                R = 20
                d1 = hyp(x + 6, y + 6)
                d2 = hyp(x + 11 - (3 if f == 3 else 0), y + 11 - (3 if f == 3 else 0))
                if d1 > R or d2 < R:
                    return None
                t = (ang(x + 6, y + 6) + math.pi * 0.25) / math.pi
                if t < 0 or t > abre:
                    return None
                return AGUA.W if R - d1 < 1.4 else AGUA.L if R - d1 < 3 else AGUA.M
            peca(q, lam, AGUA.O)
        if f >= 2:
            rnd = random.Random(21 + f)
            for _ in range(5 if f == 2 else 4):
                cx, cy = rnd.uniform(-4, 18) + (f - 2) * 3, rnd.uniform(-4, 18) + (f - 2) * 3
                peca(q, lambda x, y, cx=cx, cy=cy: esfera(x - cx, y - cy, 1.8, AGUA), AGUA.O)
        frs.append(q)
    salvar("liquidation--corte.png", frs, "corte", "1 jato d'água subindo; 2 o jato vira lâmina em meia-lua (metade); 3 lâmina inteira com estilhaços; 4 lâmina afinando, gotas espalhando")
    frs = []
    for r, (ox, oy) in [(2.2, (0, 0)), (1.6, (0, 0)), (2.6, (0, 0))]:
        q = Q(8, 8)
        peca(q, lambda x, y, r=r: esfera(x, y, r, AGUA), AGUA.O)
        frs.append(q)
    salvar("liquidation--gota.png", frs, "particula", "3 variações de gota d'água (média, pequena, grande)")


# 22 ---------- snipe-shot
def snipe_shot():
    MIRA = Pal("#103070", "#5088c8", "#a8d0f0", "#e8f4ff", "#ffffff")
    frs = []
    for f in range(3):
        q = Q(40, 40)
        R = [18, 14, 11][f]
        def fn(x, y, R=R):
            d = hyp(x, y)
            if R - 1.6 <= d <= R:
                if f == 0 and math.sin(ang(x, y) * 8) > 0.3:
                    return None
                return MIRA.L
            if (abs(x) < 1 and 3 < abs(y) < R + 4) or (abs(y) < 1 and 3 < abs(x) < R + 4):
                return MIRA.L
            return None
        peca(q, fn, MIRA.O)
        if f == 2:
            peca(q, lambda x, y: (H("#ffc0c0") if hyp(x + 0.5, y + 0.5) < 0.8 else H("#f02828")) if hyp(x, y) < 1.8 else None, H("#600808"))
            for sx in (-1, 1):
                for sy in (-1, 1):
                    for k in range(3):
                        q.set(20 + sx * 16 - (sx > 0), 20 + sy * (16 - k) - (sy > 0), H("#f02828"))
                        q.set(20 + sx * (16 - k) - (sx > 0), 20 + sy * 16 - (sy > 0), H("#f02828"))
        frs.append(q)
    salvar("snipe-shot--mira.png", frs, "mira", "1 mira grande tracejada procurando; 2 mira fechando; 3 mira travada com ponto vermelho e cantos")
    q = Q(64, 8)
    def tiro(x, y):
        if x < -30 or x > 30:
            return None
        w = 0.6 + (x + 30) / 60 * 1.6
        if x > 26:
            w *= (30 - x) / 4
        if abs(y) > w:
            return None
        return AGUA.W if abs(y) < w * 0.45 else AGUA.L
    peca(q, tiro, AGUA.O)
    salvar("snipe-shot--tiro.png", [q], "projetil", "1 tiro d'água fino e reto apontando para a direita (cauda fina à esquerda)")


# 23 ---------- play-rough
def play_rough():
    frs = []
    puffs = [(-10, 2, 9), (0, -4, 10), (10, 2, 9), (-3, 8, 8), (8, 9, 7), (-14, 9, 6), (15, 8, 6)]
    for f in range(6):
        q = Q(56, 48)
        ph = f * TAU / 6
        def nuvem(x, y):
            best = None
            for i, (px, py, r) in enumerate(puffs):
                rr = r + 1.2 * math.sin(ph + i * 1.7)
                d = hyp(x - px, y - py)
                if d <= rr:
                    c = POEIRA.W if hyp(x - px + rr * 0.4, y - py + rr * 0.4) < rr * 0.45 else POEIRA.L if y - py < rr * 0.3 else POEIRA.M
                    best = c if best is None or c == POEIRA.W else best
            return best
        peca(q, nuvem, POEIRA.O)
        for i in range(3):
            a = ph + i * TAU / 3
            ex, ey = math.cos(a) * 21, math.sin(a) * 15
            if i == 1:
                coracao(q, ex, ey, 3.2, FADA)
            else:
                peca(q, lambda x, y, ex=ex, ey=ey: (AMARELO.L if hyp(x - ex, y - ey) < 2 else AMARELO.M) if hyp(x - ex, y - ey) < star_r(ang(x - ex, y - ey), 5, 1.8, 4.5, -math.pi / 2) else None, AMARELO.O)
        for i in range(4):
            a = -ph * 1.3 + i * TAU / 4 + 0.6
            q.set(28 + math.cos(a) * 26, 24 + math.sin(a) * 21, POEIRA.D)
            q.set(29 + math.cos(a) * 26, 24 + math.sin(a) * 21, POEIRA.D)
        frs.append(q)
    salvar("play-rough.png", frs, "nuvem", "1-6 loop: nuvem de briga pulsando, 2 estrelas amarelas e 1 coração rosa girando em volta, poeira voando")


# 24 ---------- flower-trick
def flor(q, cx, cy, r, P, aberta):
    if aberta:
        def fn(x, y):
            d, a = hyp(x - cx, y - cy), ang(x - cx, y - cy)
            if d > star_r(a, 5, r * 0.55, r, -math.pi / 2) + 0.5:
                return None
            if d < r * 0.35:
                return AMARELO.L
            return P.L if y - cy < 0 else P.M
    else:
        def fn(x, y):
            return (P.L if x - cx < 0 else P.M) if hyp((x - cx) * 1.3, y - cy) < r * 0.7 else None
    peca(q, fn, P.O)


def flower_trick():
    ROSA = Pal("#901848", "#d03870", "#f070a0", "#ffb8d0")
    VERM = Pal("#801010", "#c82020", "#f04848", "#ff9890")
    AMAR = Pal("#806000", "#d0a000", "#f8d838", "#fff8a0")
    frs = []
    for f in range(3):
        q = Q(32, 32)
        sh = [0, 1, 0][f]
        def caules(x, y):
            for gx in (-3, 0, 3):
                d, t = seg_dist(x, y, gx * 0.4, 12, gx + sh, -2)
                if d < 0.8:
                    return GRAMA.M
            return None
        if f < 2:
            peca(q, caules, GRAMA.O)
            peca(q, lambda x, y: (POEIRA.L if x < 0 else POEIRA.M) if 4 < y < 12 and abs(x) < (y - 2) * 0.55 else None, POEIRA.O)
            for (fx, fy, P) in [(-6 + sh, -4, ROSA), (6 + sh, -4, AMAR), (sh, -8, VERM)]:
                flor(q, fx, fy, [3.5, 5.5][f], P, f == 1)
        else:
            rnd = random.Random(24)
            for i in range(10):
                a = i * TAU / 10 + rnd.uniform(-0.2, 0.2)
                dist = rnd.uniform(8, 13)
                P = [ROSA, VERM, AMAR][i % 3]
                folha(q, math.cos(a) * dist, math.sin(a) * dist, -a, 3, 1.5, P)
            estr = estrela_impacto(AMARELO, 16, 2)[1]
            q.stamp(estr, 8, 8)
        frs.append(q)
    salvar("flower-trick--buque.png", frs, "buque", "1 buquê com botões fechados; 2 flores abrem e o buquê balança; 3 buquê estoura em pétalas com estrela no centro")
    frs = []
    for i, P in enumerate([ROSA, VERM, AMAR]):
        q = Q(10, 10)
        folha(q, 0, 0, [0.4, -0.7, 1.6][i], 4, 1.9, P)
        frs.append(q)
    salvar("flower-trick--petala.png", frs, "particula", "3 variações de pétala afiada (rosa, vermelha, amarela)")


# 25 ---------- torch-song
def torch_song():
    frs = []
    for i, rows in enumerate([NOTA_COLCHEIA, NOTA_DUPLA, NOTA_SEMINIMA]):
        q = Q(16, 16)
        x0, y0 = (16 - len(rows[0])) // 2, 16 - len(rows) - 2
        cor = {}
        t = Q(16, 16)
        for j, row in enumerate(rows):
            for k, ch in enumerate(row):
                if ch == "#":
                    t.set(x0 + k, y0 + j, FOGO.L if j > len(rows) * 0.55 else FOGO.M)
        # línguas de fogo saindo do topo das hastes
        for (sx, sy) in [(x, y) for (x, y) in list(t.p) if t.get(x, y - 1) is None and y < y0 + 3]:
            for k in range(1, 3 + (sx + i) % 2):
                t.set(sx + (1 if k == 3 else 0), sy - k, FOGO.D if k > 1 else FOGO.M)
        for (x, y), c in list(t.p.items()):
            if c == FOGO.L and t.get(x - 1, y) and t.get(x, y - 1) and t.get(x + 1, y) and t.get(x, y + 1):
                t.p[(x, y)] = FOGO.W
        t.outline(FOGO.O)
        q.stamp(t)
        frs.append(q)
    salvar("torch-song.png", frs, "particula", "3 variações de nota de fogo (colcheia, dupla, semínima) com chaminhas no topo; o motor solta em leque")


# 26 ---------- aqua-cutter
def aqua_cutter():
    q = Q(40, 20)
    def fn(x, y):
        a = hyp(x + 4, y * 1.05)
        b = hyp(x + 11, y * 1.05)
        if a > 13 or b < 13 or x < -8:
            return None
        e = 13 - a
        return AGUA.W if e < 1.3 else AGUA.L if e < 3 else AGUA.M
    peca(q, fn, AGUA.O)
    salvar("aqua-cutter--lamina.png", [q], "projetil", "1 lâmina d'água em meia-lua horizontal, convexa para a direita")
    frs = []
    for f in range(3):
        q = Q(40, 40)
        L, w = [(10, 1.6), (18, 2.4), (18, 1.0)][f]
        def fn(x, y, L=L, w=w):
            if abs(x) > L:
                return None
            ww = w * (1 - (x / L) ** 2)
            if abs(y) > ww:
                return None
            return AGUA.W if abs(y) < ww * 0.5 else AGUA.L
        peca(q, fn, AGUA.O)
        if f >= 1:
            for k, (cx, cy) in enumerate([(-6, -5), (4, 5), (10, -4), (-12, 4)]):
                cy += (3 if f == 2 else 0) * (1 if cy > 0 else -1)
                peca(q, lambda x, y, cx=cx, cy=cy: esfera(x - cx, y - cy, 1.7, AGUA), AGUA.O)
        frs.append(q)
    salvar("aqua-cutter--impacto.png", frs, "impacto", "1 risco de corte horizontal curto; 2 corte inteiro com gotas; 3 corte afinando, gotas afastam")


# 27 ---------- aqua-step
def aqua_step():
    q = Q(12, 10)
    peca(q, lambda x, y: (AGUA.L if x < 0 else AGUA.M) if ((x / 2.5) ** 2 + ((y - 1.5) / 3.2) ** 2 <= 1) else None, AGUA.O)
    for cx, cy in [(-2.5, -3.5), (0, -4.2), (2.5, -3.5)]:
        peca(q, lambda x, y, cx=cx, cy=cy: AGUA.L if hyp(x - cx, y - cy) < 0.9 else None, AGUA.O)
    salvar("aqua-step--pegada.png", [q], "particula", "1 pegada de água (o motor deixa uma trilha e faz fade)")
    frs = []
    for f in range(4):
        q = Q(48, 24)
        ph = f * TAU / 4
        def fn(x, y, ph=ph):
            X, Y = x, y / 0.42
            d, a = hyp(X, Y), ang(X, Y)
            if d > 22 or d < 4:
                return None
            for k in range(3):
                s = (a + ph / 3 + k * TAU / 3 - d * 0.22) % TAU
                if s < 0.9:
                    return AGUA.W if s < 0.25 else AGUA.L if s < 0.55 else AGUA.M
            return None
        peca(q, fn, AGUA.O)
        for k in range(3):
            a = ph + k * TAU / 3
            peca(q, lambda x, y, a=a: esfera(x - math.cos(a) * 21, y - math.sin(a) * 8 + 2, 1.5, AGUA), AGUA.O)
        frs.append(q)
    salvar("aqua-step--redemoinho.png", frs, "redemoinho", "1-4 loop: redemoinho d'água achatado aos pés, 3 braços girando (30°/quadro) com gotas em volta (colocar no field-user)")


# 28 ---------- wave-crash
def wave_crash():
    polys = [
        [(0, 95), (0, 80), (20, 72), (45, 66), (70, 68), (95, 76), (127, 84), (127, 95)],
        [(0, 95), (0, 74), (20, 60), (45, 46), (65, 40), (82, 46), (100, 62), (127, 80), (127, 95)],
        [(0, 95), (0, 70), (18, 52), (38, 32), (58, 20), (78, 16), (94, 22), (102, 32), (96, 36), (88, 32), (84, 40), (92, 58), (110, 76), (127, 86), (127, 95)],
        [(0, 95), (0, 66), (16, 44), (34, 24), (54, 10), (76, 6), (96, 10), (112, 22), (118, 38), (110, 46), (104, 40), (98, 34), (90, 36), (84, 48), (88, 66), (100, 82), (127, 92), (127, 95)],
        [(0, 95), (0, 64), (16, 46), (36, 32), (58, 26), (80, 28), (100, 40), (114, 56), (122, 74), (127, 95)],
    ]
    frs = []
    for f, pts in enumerate(polys):
        q = Q(128, 96)
        corpo = set()
        for y in range(96):
            for x in range(128):
                if in_poly(x + 0.5, y + 0.5, pts):
                    corpo.add((x, y))
        for (x, y) in corpo:
            acima = sum(1 for k in range(1, 4) if (x, y - k) not in corpo)
            dist_esq = sum(1 for k in range(1, 3) if (x + k, y) not in corpo)
            if acima >= 3 and (x, y - 1) not in corpo:
                c = AGUA.W
            elif acima >= 1:
                c = AGUA.L if (x + y) % 7 else AGUA.W
            else:
                faixa = (y + int(6 * math.sin(x * 0.08 + f))) // 9
                c = [AGUA.M, AGUA.D, AGUA.M, AGUA.L][faixa % 4] if dist_esq == 0 else AGUA.D
            q.p[(x, y)] = c
        q.outline(AGUA.O)
        if f >= 3:
            rnd = random.Random(28 + f)
            for _ in range(10 if f == 4 else 5):
                cx, cy = rnd.uniform(28, 62) if f == 4 else rnd.uniform(18, 50), rnd.uniform(-44, -10) if f == 4 else rnd.uniform(-46, -36)
                r = rnd.uniform(1.5, 3)
                peca(q, lambda x, y, cx=cx, cy=cy, r=r: (AGUA.W if hyp(x - cx, y - cy) < r * 0.6 else AGUA.L) if hyp(x - cx, y - cy) < r else None, AGUA.D)
        frs.append(q)
    salvar("wave-crash--onda.png", frs, "onda", "1 swell baixo; 2 onda subindo; 3 a crista começa a curvar para a direita; 4 tubo completo com espuma; 5 a onda desaba sobre o alvo com respingos")
    frs = []
    for i, blobs in enumerate([[(0, 0, 3.5), (2.5, 1.5, 2.2)], [(0, 0, 2.6)], [(-1.5, 0.5, 2.4), (1.8, -0.8, 2.6), (0.5, 2, 1.8)]]):
        q = Q(10, 10)
        peca(q, lambda x, y, blobs=blobs: (AGUA.W if y < 0.8 else AGUA.L) if any(hyp(x - bx, y - by) < r for bx, by, r in blobs) else None, AGUA.M)
        frs.append(q)
    salvar("wave-crash--espuma.png", frs, "particula", "3 variações de espuma branca")


GOLPES = [spiky_shield, mystical_fire, water_shuriken, leafage, phantom_force, spirit_shackle, darkest_lariat,
          disarming_voice, baby_doll_eyes, misty_terrain, moonblast, sparkling_aria, branch_poke, noble_roar,
          grassy_terrain, drum_beating, boomburst, pyro_ball, court_change, tearful_look, liquidation, snipe_shot,
          play_rough, flower_trick, torch_song, aqua_cutter, aqua_step, wave_crash]

if __name__ == "__main__":
    for g in GOLPES:
        g()
    md = os.path.join(OUT, "golpes.md")
    linhas = [f"| {a} | {w}×{h} | {n} | {p} | {d} |" for a, w, h, n, p, d in REG]
    bloco = "\n## Lote 1: golpes sem sprite (28)\n\n| arquivo | quadro | nº de quadros | peças | o que acontece em cada quadro |\n|---|---|---|---|---|\n" + "\n".join(linhas) + "\n"
    cab = ("# Sprites originais de golpes\n\nFolhas de sprite em pixel art de DS, desenhadas por código "
           "(`tools/golpes-originais/`), sem pixel dos jogos. Cada PNG: fundo transparente, quadros do mesmo tamanho "
           "lado a lado numa linha, 2 px de espaço entre eles. Tamanhos em px reais de DS (tela 256×192). "
           "Projéteis apontam para a direita (atacante embaixo à esquerda); o jogo espelha quando o inimigo ataca.\n")
    with open(md, "w") as fh:
        fh.write(cab + bloco)
    prancha([(a, w, h, n) for a, w, h, n, _, _ in REG], OUT, os.path.join(OUT, "pranchas", "lote-1.png"), "Lote 1 - golpes sem sprite (28)")
    import json
    man_p = os.path.join(OUT, "manifesto.json")
    man = json.load(open(man_p)) if os.path.exists(man_p) else {}
    for a, w, h, n, p, _ in REG:
        man[a] = {"w": w, "h": h, "n": n, "peca": p, "lote": 1}
    with open(man_p, "w") as fh:
        json.dump(dict(sorted(man.items())), fh, indent=1, ensure_ascii=False)
    print(len(REG), "arquivos")
