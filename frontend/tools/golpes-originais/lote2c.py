"""Lote 2c: pares e golpes isolados (54), que hoje usam a animação de outro.

    python3 tools/golpes-originais/lote2c.py
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from kit import *  # noqa

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(RAIZ, "assets", "golpes-originais")
LOTE = Lote("2c", "pares e golpes isolados (54)", OUT)
salvar = LOTE.salvar
G = []


def golpe(f):
    G.append(f)
    return f


def quadros(n, w, h):
    return [Q(w, h) for _ in range(n)]


GELO = Pal("#285878", "#58a0c8", "#98d8f0", "#d8f4ff", "#ffffff")
LAMA = Pal("#301808", "#604020", "#906030", "#c09058", "#e8c890")
PSI = Pal("#701848", "#c03078", "#f070b0", "#ffb8e0", "#ffffff")
TINTA = Pal("#000000", "#101018", "#202030", "#404058", "#8080a0")
MAGMA = Pal("#400800", "#a01800", "#f04800", "#ffa020", "#fff080")
DRAGAO = Pal("#200850", "#4820b0", "#7848f0", "#b8a0ff", "#ffffff")
TEMPO = Pal("#081848", "#1840a0", "#3878e0", "#90c8ff", "#ffffff")
TIJOLO = Pal("#501808", "#a03820", "#d06038", "#f0a070", "#ffe0c8")

RUNAS = [
    ["..#..", ".#.#.", "#.#.#", ".#.#.", "..#.."],
    ["#...#", ".#.#.", "..#..", ".###.", "..#.."],
    ["###..", "#....", "####.", "...#.", "..##."],
    ["#.#.#", "#.#.#", "#####", "..#..", ".###."],
]
DIGITOS = {
    "4": ["#..#", "#..#", "####", "...#", "...#"],
    "5": ["####", "#...", "###.", "...#", "###."],
    "6": [".###", "#...", "###.", "#..#", ".##."],
    "7": ["####", "...#", "..#.", ".#..", ".#.."],
    "8": [".##.", "#..#", ".##.", "#..#", ".##."],
    "9": [".##.", "#..#", ".###", "...#", "###."],
    "1": [".#.", "##.", ".#.", ".#.", "###"],
    "0": [".##.", "#..#", "#..#", "#..#", ".##."],
    "M": ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
}


def bolha(q, cx, cy, r, P):
    def fn(x, y):
        d = hyp(x - cx, y - cy)
        if d > r:
            return None
        if d > r - 1.1:
            return P.M
        if hyp(x - cx + r * 0.45, y - cy + r * 0.45) < max(0.8, r * 0.25):
            return P.W
        return A(P.L, 120)
    peca(q, fn, P.D)


def cristal(q, cx, cy, h, w, a, P):
    def fn(x, y):
        u, v = rot(x - cx, y - cy, a)
        if abs(v) > w * (1 - abs(u) / h) or abs(u) > h:
            return None
        return P.W if v < -w * 0.2 and u < 0 else P.L if v < 0 else P.M
    return peca(q, fn, P.O)


def garra(q, cx, cy, s, P, n=3, curva=0.35, larg=1.6, ang_=0.0):
    """n garras curvas apontando para baixo-direita."""
    for i in range(n):
        off = (i - (n - 1) / 2) * s * 0.55
        pts = [bezier((cx - s * 0.6 + off, cy - s), (cx + s * curva + off, cy - s * 0.1), (cx + s * 0.2 + off * 0.6, cy + s), t / 24) for t in range(25)]
        def fn(x, y, pts=pts):
            for j, (px, py) in enumerate(pts):
                if hyp(x - px, y - py) < larg * (1 - j / 26) + 0.4:
                    return P.W if j > 18 else P.L if x < px else P.M
            return None
        peca(q, fn, P.O)


def jato(P, n, S, larg, ondula=1.2):
    frs = quadros(n, *S)
    for f, q in enumerate(frs):
        def fn(x, y):
            if abs(x) > S[0] / 2 - 2:
                return None
            w = larg * (0.5 + 0.5 * (x + S[0] / 2) / S[0])
            if x > S[0] / 2 - 6:
                w *= (S[0] / 2 - 2 - x) / 4
            off = math.sin(x * 0.35 - f * math.pi) * ondula * 0.5
            if abs(y - off) > w:
                return None
            r = abs(y - off) / max(w, 0.1)
            return P.W if r < 0.35 else P.L if r < 0.7 else P.M
        peca(q, fn, P.O)
    return frs


def tela_cheia(n, fn_px):
    frs = quadros(n, 256, 192)
    for f, q in enumerate(frs):
        for y in range(192):
            for x in range(256):
                c = fn_px(x, y, f)
                if c:
                    q.p[(x, y)] = c
    return frs


@golpe
def bubble():
    frs = []
    for r in (3, 4, 2.4):
        q = Q(10, 10)
        bolha(q, 0, 0, r, AGUA)
        frs.append(q)
    salvar("bubble.png", frs, "particula", "3 variações de bolhinha pequena")


@golpe
def water_gun():
    salvar("water-gun.png", jato(AGUA, 2, (64, 12), 3.2), "raio", "1-2 loop: jato d'água fino ondulando para a direita")


@golpe
def toxic_spikes():
    frs = quadros(3, 48, 16)
    for f, q in enumerate(frs):
        alt = [3, 7, 9][f]
        for i, x0 in enumerate((-18, -9, 0, 9, 18)):
            h = alt - (i % 2) * 2
            tri = [(x0 - 3, 7), (x0 + 3, 7), (x0 + (i % 3 - 1), 7 - h)]
            peca(q, lambda x, y, tri=tri: (ROXO.L if x < tri[2][0] else ROXO.M) if in_poly(x, y, tri) else None, ROXO.O)
        if f == 2:
            for x0 in (-13, 5):
                disco(q, x0, -4, 1.3, ROXO)
    salvar("toxic-spikes.png", frs, "espinhos", "1 espinhos roxos brotando no chão do lado do alvo; 2 crescem; 3 completos com gotinhas de veneno")


@golpe
def stealth_rock():
    frs = []
    for i in range(3):
        q = Q(14, 16)
        rnd = random.Random(40 + i)
        pts = [(math.cos(a) * r, math.sin(a) * r * 1.1) for a, r in [(-1.57 + rnd.uniform(-0.2, 0.2), 7.5), (-0.4, 4), (0.8, 5), (2.2, 5), (2.9, 4)]]
        peca(q, lambda x, y, pts=pts: (PEDRA.W if in_poly(x + 1, y + 3, pts) and y < -3 else PEDRA.L if x < 0 else PEDRA.M) if in_poly(x, y, pts) else None, PEDRA.O)
        frs.append(q)
    salvar("stealth-rock.png", frs, "particula", "3 variações de pedra pontuda (o motor faz orbitar o alvo)")


@golpe
def fury_swipes():
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        L = [0.5, 1, 1][f]
        for k in (-4, 4):
            def fn(x, y, k=k):
                u, v = (x + y) / math.sqrt(2), (x - y) / math.sqrt(2) - k
                if u < -12 or u > -12 + 24 * L:
                    return None
                larg = 1.4 * (1 - abs((u + 12) / 24 - 0.5) * 1.3) * (0.5 if f == 2 else 1)
                return BRANCO.W if abs(v) < larg * 0.5 else BRANCO.L if abs(v) < larg else None
            peca(q, fn, VERMELHO.O)
    salvar("fury-swipes.png", frs, "corte", "1-3 arranhão duplo rápido (o motor repete 3-5 vezes em ângulos diferentes)")


@golpe
def metal_claw():
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        if f < 3:
            garra(q, [-6, 0, 3][f], [-6, 0, 3][f], 14, ACO, larg=2.2)
        else:
            garra(q, 3, 3, 14, ACO, larg=1.2)
        if f == 2:
            faisca(q, 16, 14, 4, ACO)
    salvar("metal-claw.png", frs, "garra", "1 três garras de metal no alto; 2 descendo; 3 golpe com brilho; 4 afinando")


@golpe
def crush_claw():
    frs = quadros(3, 56, 56)
    for f, q in enumerate(frs):
        abre = [1, 0.5, 0][f]
        for s in (-1, 1):
            a = s * (0.25 + abre * 0.5)
            for i in range(3):
                off = (i - 1) * 7
                def fn(x, y, a=a, off=off, s=s):
                    u, v = rot(x - off, y, a)
                    t = (v + 22) / 40
                    if not 0 <= t <= 1:
                        return None
                    cx = math.sin(t * math.pi * 0.8) * 6 * s
                    w = 3.5 * (1 - t) + 0.6
                    if abs(u - cx) > w:
                        return None
                    return POEIRA.W if t > 0.8 else POEIRA.L if u < cx else POEIRA.M
                peca(q, fn, POEIRA.O)
        if f == 2:
            q.stamp(estrela_impacto(AMARELO, 32, 2)[1], 12, 16)
    salvar("crush-claw.png", frs, "garra", "1 garra enorme aberta; 2 fechando; 3 esmaga com impacto")


@golpe
def shadow_punch():
    q = Q(48, 24)
    for i in range(6):
        peca(q, lambda x, y, i=i: A(FANTASMA.D if i % 2 else FANTASMA.M, 220 - i * 32) if hyp(x + 4 + i * 4, y + math.sin(i) * 2) < 7 - i * 0.7 else None, None)
    punho(q, 11, 0, 8, FANTASMA)
    salvar("shadow-punch.png", [q], "projetil", "1 punho de sombra roxo com rastro de fumaça (vem de longe e nunca erra)")


@golpe
def flatter():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        def balao(x, y):
            if (x / 14) ** 2 + ((y + 2) / 9) ** 2 < 1:
                return BRANCO.W if y < -5 else BRANCO.L
            if -10 < x < -4 and 5 < y < 13 and abs(x + 7 + (y - 5) * 0.4) < (13 - y) * 0.4:
                return BRANCO.L
            return None
        peca(q, balao, BRANCO.D)
        estrela5(q, -4, -2, 4, AMARELO)
        coracao(q, 6, -2, 3.2, ROSA)
        for cx, cy in [[], [(16, -12)], [(16, -12), (-16, -12), (17, 6)]][f]:
            estrela5(q, cx, cy, 2.6, AMARELO)
    salvar("flatter.png", frs, "balao", "1 balão de elogio com estrela e coração; 2-3 estrelinhas aparecem em volta")


@golpe
def taunt():
    frs = quadros(3, 48, 32)
    for f, q in enumerate(frs):
        dobra = [0, 1, 0][f]
        def mao(x, y):
            u, v = x + 10, y - 2
            if (u / 6) ** 2 + (v / 7) ** 2 <= 1:
                return POEIRA.L if u < 0 else POEIRA.M
            # dedo indicador chamando
            if dobra:
                if abs(u - 2) < 1.6 and -12 < v <= -6 or abs(v + 12) < 1.6 and -2 < u <= 3:
                    return POEIRA.L
            elif abs(u - 2) < 1.6 and -14 < v <= -6:
                return POEIRA.L
            return None
        peca(q, mao, POEIRA.O)
        if f >= 1:
            vem = ["#.#.###.#...#.#", "#.#.#...##.##.#", "#.#.##..#.#.#.#", "#.#.#...#...#..", ".#..###.#...#.#"]
            bitmap_peca(q, vem, VERMELHO.M, VERMELHO.O, 22, 10)
    salvar("taunt.png", frs, "icone", "1 mão com o dedo esticado; 2 dedo dobrando, chamando, com 'VEM!'; 3 de novo (provocação)")


@golpe
def magnitude():
    frs = []
    for n in ["4", "5", "6", "7", "8", "9", "10"]:
        q = Q(32, 16)
        x = 2
        for ch in "M" + n:
            rows = DIGITOS[ch if ch in DIGITOS else "0"]
            bitmap_peca(q, rows, AMARELO.L, AMARELO.O, x, 5)
            x += len(rows[0]) + 2
        frs.append(q)
    salvar("magnitude.png", frs, "numero", "7 quadros: 'M4' a 'M10' (o quadro mostra a magnitude sorteada; o tremor cresce com ela)")


@golpe
def bulldoze():
    frs = quadros(4, 96, 24)
    for f, q in enumerate(frs):
        def fn(x, y):
            if abs(x) > 46:
                return None
            h = 4 + 7 * max(0, math.sin((x + 48) / 96 * TAU * 2 - f * math.pi / 2))
            if y > 10 or y < 10 - h:
                return None
            return LAMA.L if y < 12 - h else LAMA.M if (int(x) // 5 + int(y) // 3) % 2 else LAMA.D
        peca(q, fn, LAMA.O)
    salvar("bulldoze.png", frs, "onda", "1-4 loop: o chão se ergue em ondas de terra que correm para a direita")


@golpe
def wonder_room():
    def px(x, y, f):
        cx, cy = 128, 96
        d = math.hypot(x - cx, y - cy)
        tw = math.sin(d * 0.04 - f * math.pi / 2) * 6
        u, v = x + tw, y - tw
        if (int(u // 16) + int(v // 16)) % 2:
            return None
        return (120, 90, 200, 70) if (int(u // 32) + int(v // 32)) % 2 else (90, 160, 220, 70)
    salvar("wonder-room.png", tela_cheia(4, px), "overlay", "1-4 loop: sala com piso xadrez lilás/azul distorcido em ondas (troca Defesa e Def. Esp.)")


@golpe
def magic_room():
    rnd = random.Random(52)
    est = [(rnd.randrange(8, 248), rnd.randrange(8, 184), rnd.randrange(4)) for _ in range(28)]
    frs = quadros(4, 256, 192)
    for f, q in enumerate(frs):
        for y in range(192):
            for x in range(256):
                if (x // 2 + y // 2) % 2 == 0 and (y < 12 or y > 180 or x < 12 or x > 244):
                    q.p[(x, y)] = (150, 90, 210, 140)
        for x0, y0, fase in est:
            k = (f + fase) % 4
            if k < 3:
                estrela5(q, x0 - 128, y0 - 96, [2.5, 4, 3][k], Pal("#502080", "#9050d0", "#c890f8", "#f0d8ff"))
    salvar("magic-room.png", frs, "overlay", "1-4 loop: moldura de sala mágica roxa e estrelas que piscam em fases (anula itens)")


@golpe
def odor_sleuth():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: (H("#302020") if any(hyp(x - nx, y - 2) < 1.6 for nx in (-11, -6)) else POEIRA.L if y < 0 else POEIRA.M) if (x + 8) ** 2 / 64 + (y - 1) ** 2 / 25 < 1 else None, POEIRA.O)
        for i in range(f + 1):
            pts = [(-2 + k * 2.2, -6 + i * 6 + math.sin(k * 1.4 + f) * 2) for k in range(9)]
            for p1, p2 in zip(pts, pts[1:]):
                linha(q, *p1, *p2, 0.5, A(GRAMA.L, 220))
        q.outline(A(GRAMA.D, 220))
    salvar("odor-sleuth.png", frs, "icone", "1 nariz farejando com uma linha de cheiro; 2-3 mais linhas onduladas")


@golpe
def miracle_eye():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        def olho(x, y):
            if (x / 15) ** 2 + (y / 8) ** 2 > 1:
                return None
            d = hyp(x, y)
            if d < 2.5:
                return H("#200818")
            if d < 6:
                return PSI.W if hyp(x + 2, y + 2) < 1.5 else PSI.L
            return H("#ffffff")
        peca(q, olho, PSI.O)
        for i, (cx, cy) in enumerate([(-16, -10), (16, -9), (0, -14), (-14, 10), (15, 10)][: 2 + f]):
            faisca(q, cx, cy, 3 if i % 2 else 4, PSI)
    salvar("miracle-eye.png", frs, "icone", "1-3 olho com brilhos mágicos que vão aparecendo em volta")


@golpe
def hex():
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        for i in range(4):
            a = f * TAU / 16 + i * TAU / 4
            bitmap_peca(q, RUNAS[i], FANTASMA.L, FANTASMA.O, int(24 + math.cos(a) * 16 - 2), int(24 + math.sin(a) * 12 - 2))
        peca(q, lambda x, y: A(FANTASMA.M, 90) if 13 < hyp(x, y * 1.3) < 15 else None, None)
    salvar("hex.png", frs, "runas", "1-4 loop: quatro símbolos de maldição roxos girando em volta do alvo")


@golpe
def dream_eater():
    frs = quadros(3, 32, 24)
    for f, q in enumerate(frs):
        k = [1, 0.75, 0.5][f]
        nuvem(q, [(-6 * k, 1, 6 * k), (2 * k, -2, 7 * k), (9 * k, 2, 5 * k)], Pal("#604890", "#a090d0", "#d8d0f8", "#f8f4ff"), alpha=230)
        estrela5(q, 0, -1, 3 * k + 1, AMARELO)
        peca(q, lambda x, y: AMARELO.L if hyp(x - 6 * k, y + 4) < 1.2 else None, None)
    salvar("dream-eater.png", frs, "bolha", "1 bolha de sonho com estrela; 2-3 encolhe enquanto é sugada (o motor leva do alvo ao usuário)")


@golpe
def bounce():
    frs = quadros(3, 24, 32)
    for f, q in enumerate(frs):
        alt = [8, 14, 22][f]
        for i in range(5):
            y = 12 - i * alt / 5
            arco(q, 0, y, 7, 1.4, 0, TAU - 0.001, ACO, sy=0.3)
    salvar("bounce.png", frs, "mola", "1 mola comprimida; 2 esticando; 3 esticada (o usuário salta)")


@golpe
def sky_drop():
    frs = quadros(3, 48, 48)
    for f, q in enumerate(frs):
        for i in range(5):
            x = -16 + i * 8
            y0 = 18 - ((i * 7 + f * 9) % 30)
            linha(q, x, y0, x, y0 - 10, 0.7, BRANCO.W, BRANCO.D)
        peca(q, lambda x, y: A(FUMACA.M, 140 - f * 30) if (x / (14 - f * 3)) ** 2 + ((y - 20) / 3) ** 2 < 1 else None, None)
    salvar("sky-drop.png", frs, "corrente", "1-3 corrente de vento subindo e sombra do alvo encolhendo no chão (o alvo é levado ao céu)")


@golpe
def icicle_spear():
    q = Q(24, 10)
    def fn(x, y):
        if x < -10 or x > 10:
            return None
        w = 3.5 * (1 - (x + 10) / 20) + 0.3
        if abs(y) > w:
            return None
        return GELO.W if y < -w * 0.3 else GELO.L if y < w * 0.3 else GELO.M
    peca(q, fn, GELO.O)
    salvar("icicle-spear.png", [q], "projetil", "1 estalactite de gelo apontando para a direita (o motor dispara em rajada)")


@golpe
def ice_ball():
    frs = quadros(4, 24, 24)
    for f, q in enumerate(frs):
        def fn(x, y):
            if hyp(x, y) > 9:
                return None
            u, v = rot(x, y, f * math.pi / 4)
            if abs(u) < 0.7 or abs(v) < 0.7:
                return GELO.W
            return esfera(x, y, 9, GELO)
        peca(q, fn, GELO.O)
    salvar("ice-ball.png", frs, "projetil", "1-4 loop: bola de gelo rolando (as rachaduras giram 45°/quadro)")


@golpe
def dark_pulse():
    frs = quadros(4, 64, 64)
    for f, q in enumerate(frs):
        for i in range(3):
            R = 8 + f * 6 + i * 7
            if R > 30:
                continue
            P = ROXO if i % 2 else Pal("#080408", "#201020", "#402040", "#604060", "#a080a0")
            def fn(x, y, R=R, P=P):
                d, a = hyp(x, y), ang(x, y)
                r = R + 1.5 * math.sin(a * 8 + f)
                return (P.L if d > r - 1.5 else P.M) if r - 3 <= d <= r else None
            peca(q, fn, P.O)
    salvar("dark-pulse.png", frs, "pulso", "1-4 anéis ondulados escuros e roxos se abrindo em pulso")


@golpe
def ominous_wind():
    frs = quadros(4, 64, 32)
    for f, q in enumerate(frs):
        for i in range(3):
            yy = -9 + i * 9
            def fn(x, y, yy=yy, i=i):
                off = math.sin(x * 0.15 + f * TAU / 4 + i * 2) * 3
                if abs(y - yy - off) < 1.6 and -28 < x < 28:
                    return A(FANTASMA.L, 220) if (int(x + f * 6) % 14) < 9 else A(FANTASMA.M, 200)
                return None
            peca(q, fn, A(FANTASMA.O, 220))
        cx = -18 + f * 12
        peca(q, lambda x, y: A(FANTASMA.W, 200) if hyp(x - cx, y) < 4 else None, FANTASMA.O)
        q.set(32 + cx - 1, 16 - 1, FANTASMA.O)
        q.set(32 + cx + 1, 16 - 1, FANTASMA.O)
        q.set(32 + cx, 16 + 1, FANTASMA.O)
    salvar("ominous-wind.png", frs, "vento", "1-4 loop: vento roxo fantasmagórico em faixas com um rostinho de fantasma passando")


@golpe
def ice_punch():
    q = Q(36, 28)
    punho(q, 0, 0, 9, GELO)
    for a, h in [(-0.6, 7), (0.2, 8), (0.9, 6), (-1.5, 6), (2.5, 6)]:
        cristal(q, 6 + math.cos(a) * 8, math.sin(a) * 8, h * 0.5, 2, a, GELO)
    salvar("ice-punch.png", [q], "punho", "1 punho coberto de gelo com cristais pontudos")


@golpe
def thunder_punch():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        punho(q, -2, 0, 9, AMARELO)
        rnd = random.Random(60 + f)
        for i in range(3):
            a = -1.2 + i * 1.2 + rnd.uniform(-0.3, 0.3)
            pts = [(6 + math.cos(a) * 8, math.sin(a) * 8)]
            for kk in range(3):
                pts.append((pts[-1][0] + math.cos(a) * 3.5 + rnd.uniform(-1.5, 1.5), pts[-1][1] + math.sin(a) * 3.5 + rnd.uniform(-1.5, 1.5)))
            for p1, p2 in zip(pts, pts[1:]):
                linha(q, *p1, *p2, 0.8, AMARELO.W, AMARELO.O)
    salvar("thunder-punch.png", frs, "punho", "1-3 loop: punho amarelo com raios saindo (cada quadro um desenho)")


@golpe
def seed_bomb():
    q = Q(14, 16)
    peca(q, lambda x, y: (MADEIRA.W if hyp(x + 1.5, y + 2.5) < 1.2 else MADEIRA.L if x < 0 else MADEIRA.M) if (x / 4.5) ** 2 + ((y + (1 if y < 0 else 0)) / 6) ** 2 < 1 else None, MADEIRA.O)
    salvar("seed-bomb--semente.png", [q], "projetil", "1 semente grande (o motor arremessa em arco e gira)")
    salvar("seed-bomb--explosao.png", explosao(GRAMA, 40, 5, seed=63), "explosao", "1 clarão; 2 estrela verde; 3 explosão; 4 anel; 5 dissolve")


@golpe
def petal_dance():
    PR = Pal("#a02860", "#e05890", "#f890c0", "#ffd0e8", "#ffffff")
    frs = []
    for a in (0.4, -0.6, 1.4):
        q = Q(12, 12)
        folha(q, 0, 0, a, 4.5, 2.8, PR)
        frs.append(q)
    salvar("petal-dance.png", frs, "particula", "3 variações de pétala rosa (o motor faz um redemoinho em volta do usuário e depois no alvo)")


@golpe
def inferno():
    frs = quadros(6, 64, 32)
    for f, q in enumerate(frs):
        itens = []
        for i in range(9):
            a = i * TAU / 9 + f * TAU / 54
            itens.append((math.sin(a), math.cos(a) * 26, math.sin(a) * 7 + 8, i))
        for prof, cx, cy, i in sorted(itens):
            P = FOGO if prof > -0.3 else BRASA
            peca(q, lambda x, y, cx=cx, cy=cy, i=i, P=P: chama(x - cx, y, cy + 3, cy - 13 - (i % 3) * 2, 4.6, f + i * 1.3, P), P.O)
    salvar("inferno.png", frs, "anel", "1-6 loop: anel de chamas girando em volta do alvo (as de trás mais escuras)")


@golpe
def leer():
    frs = quadros(3, 48, 20)
    for f, q in enumerate(frs):
        for s in (-1, 1):
            def olho(x, y, s=s):
                u = x - s * 10
                if (u / 8) ** 2 + (y / 4) ** 2 > 1 or y < -2.5 + s * u * 0.25 * 0:
                    return None
                if y < -1.5 - (u * s) * 0.2:
                    return None
                if hyp(u, y) < 2.2:
                    return VERMELHO.M
                return H("#ffffff")
            peca(q, olho, H("#201010"))
        if f >= 1:
            faisca(q, -10, -2, [0, 4, 6][f], BRANCO)
            faisca(q, 10, -2, [0, 4, 6][f], BRANCO)
    salvar("leer.png", frs, "olhos", "1 olhar estreito; 2 brilho nos olhos; 3 brilho máximo (olhar penetrante)")


@golpe
def glare():
    frs = quadros(2, 48, 20)
    for f, q in enumerate(frs):
        for s in (-1, 1):
            def olho(x, y, s=s):
                u = x - s * 10
                if (u / 8) ** 2 + (y / 5) ** 2 > 1:
                    return None
                if abs(u) < [1.0, 0.6][f] + 0.2 and abs(y) < 4:
                    return H("#100808")
                return AMARELO.L if y < 0 else AMARELO.M
            peca(q, olho, TOXICO.O)
    salvar("glare--olhos.png", frs, "olhos", "1-2 olhos de serpente amarelos, pupila em fenda que estreita")
    salvar("glare--raio.png", jato(AMARELO, 2, (64, 16), 4, 2), "raio", "1-2 loop: raio paralisante amarelo saindo dos olhos")


@golpe
def body_slam():
    frs = quadros(4, 64, 20)
    for f, q in enumerate(frs):
        R = [10, 18, 26, 30][f]
        arco(q, 0, 0, R, 2.6 if f < 3 else 1.4, 0, TAU - 0.001, POEIRA, sy=0.32)
        if f < 3:
            for s in (-1, 1):
                nuvem(q, [(s * (R - 2), 3, 3 + f)], POEIRA)
    salvar("body-slam.png", frs, "onda", "1-4 onda de choque achatada no chão se abrindo com poeira (o corpo cai em cima do alvo)")


@golpe
def earth_power():
    frs = quadros(5, 32, 56)
    for f, q in enumerate(frs):
        for i, x0 in enumerate((-8, 0, 8)):
            for k in range(4):
                q.set(16 + x0 + (k % 2), 50 - k, H("#201008"))
        if f >= 1:
            alt = [0, 14, 34, 46, 46][f]
            for i, x0 in enumerate((-8, 0, 8)):
                h = alt - (i % 2) * 6
                def fn(x, y, x0=x0, h=h):
                    if y > 24 or y < 24 - h:
                        return None
                    w = 2.6 + (24 - y) / 46 * 1.5
                    if abs(x - x0) > w:
                        return None
                    return LARANJA.W if abs(x - x0) < w * 0.35 else LARANJA.L
                peca(q, fn, LARANJA.O)
        if f == 4:
            q.xadrez()
    salvar("earth-power.png", frs, "jatos", "1 rachaduras no chão; 2-4 três jatos de energia laranja sobem; 5 somem")


@golpe
def follow_me():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        dobra = f == 1
        def mao(x, y):
            u, v = x + 8, y + 4
            if (u / 6) ** 2 + ((v - 6) / 7) ** 2 <= 1:
                return POEIRA.L if u < 0 else POEIRA.M
            if not dobra and abs(u - 1) < 1.6 and -8 < v <= 0:
                return POEIRA.L
            if dobra and (abs(u - 1) < 1.6 and -4 < v <= 0 or abs(v + 4) < 1.6 and -3 < u <= 1):
                return POEIRA.L
            return None
        peca(q, mao, POEIRA.O)
        if f >= 1:
            seta(q, 18, 2, 4, 2, 1.6, AMARELO, 4)
    salvar("follow-me.png", frs, "icone", "1 dedo levantado; 2 dedo dobrando com seta 'para cá'; 3 de novo (todos miram o usuário)")


@golpe
def mind_reader():
    frs = quadros(3, 48, 48)
    for f, q in enumerate(frs):
        R = [20, 15, 11][f]
        for a in range(4):
            an = a * TAU / 4 + f * 0.3
            linha(q, math.cos(an) * (R + 6), math.sin(an) * (R + 6), math.cos(an) * R, math.sin(an) * R, 0.8, VERMELHO.L, VERMELHO.O)
        def olho(x, y):
            if (x / 9) ** 2 + (y / 5) ** 2 > 1:
                return None
            if hyp(x, y) < 2.5:
                return H("#101010")
            return H("#ffffff")
        peca(q, olho, H("#303030"))
    salvar("mind-reader.png", frs, "mira", "1 olho e linhas de mira afastadas; 2-3 as linhas fecham no alvo (o próximo golpe não erra)")


@golpe
def telekinesis():
    frs = quadros(4, 56, 56)
    for f, q in enumerate(frs):
        for i in range(3):
            y = 18 - ((i * 14 + f * 5) % 40)
            arco(q, 0, y, 18 - i, 1.6, 0, TAU - 0.001, PSI, sy=0.3)
        for x in (-20, 20):
            seta(q, x, 10 - f % 2 * 2, x, -6 - f % 2 * 2, 1.2, PSI, 3)
    salvar("telekinesis.png", frs, "aura", "1-4 loop: anéis psíquicos rosa subindo e setas para cima (o alvo flutua)")


@golpe
def leaf_tornado():
    frs = quadros(4, 48, 64)
    for f, q in enumerate(frs):
        for i in range(5):
            y = 26 - i * 12
            arco(q, 0, y, 6 + i * 3.4, 1.4, f * 1.3 + i, f * 1.3 + i + 4.4, GRAMA, sy=0.3)
        for i in range(8):
            a = f * TAU / 8 + i * 1.9
            y = 24 - i * 6.5
            r = 6 + (24 - y) / 52 * 14
            folha(q, math.cos(a) * r, y + math.sin(a) * r * 0.3, a, 3.4, 1.6, GRAMA)
    salvar("leaf-tornado.png", frs, "redemoinho", "1-4 loop: tornado de vento verde com folhas girando")


@golpe
def brine():
    salvar("brine--jato.png", jato(Pal("#104878", "#3080c0", "#70b8e8", "#c0e8ff", "#ffffff"), 2, (64, 16), 4.5), "raio", "1-2 loop: jato de água salgada")
    frs = []
    for s in (2.2, 1.6, 2.6):
        q = Q(8, 8)
        peca(q, lambda x, y, s=s: (BRANCO.W if x + y < 0 else BRANCO.L) if abs(x) < s and abs(y) < s else None, BRANCO.D)
        frs.append(q)
    salvar("brine--sal.png", frs, "particula", "3 variações de cristal de sal (cubinhos brancos)")


@golpe
def dive():
    frs = quadros(5, 48, 48)
    for f, q in enumerate(frs):
        alt = [6, 18, 30, 30, 18][f]
        def coluna(x, y):
            if y > 18 or y < 18 - alt:
                return None
            w = 6 + (18 - y) / max(alt, 1) * 6 * (1 if f > 1 else 0.5)
            w += 2 * math.sin(y * 0.6 + f)
            if abs(x) > w:
                return None
            return AGUA.W if abs(x) < w * 0.3 else AGUA.L if abs(x) < w * 0.7 else AGUA.M
        if f < 5:
            peca(q, coluna, AGUA.O)
        arco(q, 0, 18, 14 + f * 2, 1.6, 0, TAU - 0.001, AGUA, sy=0.25)
        if f >= 3:
            for i in range(6):
                a = math.pi + i * math.pi / 5
                disco(q, math.cos(a) * (10 + f * 2), -8 + math.sin(a) * 8 + f * 2, 1.6, AGUA)
        if f == 4:
            q.xadrez()
    salvar("dive.png", frs, "respingo", "1 a água abre; 2-3 coluna de respingo sobe (mergulho ou emersão); 4 gotas caem; 5 some")


@golpe
def spite():
    frs = quadros(3, 48, 48)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: A(FANTASMA.D, 150 + f * 30) if hyp(x, y * 0.9) < 14 + f + math.sin(ang(x, y) * 6 + f) * 2 else None, FANTASMA.O)
        if f >= 1:
            for s in (-1, 1):
                linha(q, s * 7, -6, s * 2, -3, 0.8, VERMELHO.L, None)
                disco(q, s * 5, -2, 1.6, VERMELHO)
            arco(q, 0, 9, 5, 1.2, math.pi + 0.4, TAU - 0.4, FANTASMA, O=False)
    salvar("spite.png", frs, "aura", "1 aura escura; 2 surge um rosto rancoroso de olhos vermelhos; 3 aura máxima")


@golpe
def brick_break():
    frs = quadros(4, 32, 24)
    for f, q in enumerate(frs):
        if f < 2:
            peca(q, lambda x, y: (TIJOLO.L if y < -4 else TIJOLO.M if (abs(y) > 0.6 and abs(x - (6 if y > 0 else 0)) % 12 > 0.8) else TIJOLO.D) if abs(x) < 13 and abs(y) < 7 else None, TIJOLO.O)
            if f == 1:
                for k in range(-6, 7):
                    q.set(16 + k % 2 - 1 + (k > 0), 12 + k, TIJOLO.O)
        else:
            d = [0, 0, 4, 8][f]
            for s in (-1, 1):
                peca(q, lambda x, y, s=s: (TIJOLO.L if y < -4 else TIJOLO.M) if abs(x - s * (7 + d)) < 6 and abs(y + d * 0.4) < 7 and s * x > 0 else None, TIJOLO.O)
            for i in range(3):
                disco(q, (i - 1) * 6, 6 + f * 1.5, 1.4, TIJOLO)
    salvar("brick-break.png", frs, "tijolo", "1 tijolo inteiro; 2 racha; 3 parte em dois; 4 metades afastando com lascas (quebra Reflect/Light Screen)")


@golpe
def focus_punch():
    frs = quadros(4, 56, 56)
    for f, q in enumerate(frs):
        for i in range(10):
            a = i * TAU / 10 + f * 0.4
            r0 = 26 - ((i * 5 + f * 7) % 14)
            linha(q, math.cos(a) * r0, math.sin(a) * r0, math.cos(a) * (r0 - 5), math.sin(a) * (r0 - 5), 0.7, LARANJA.L, LARANJA.O)
        peca(q, lambda x, y: A(LARANJA.L, 100) if hyp(x, y) < 12 + f % 2 * 2 else None, None)
    salvar("focus-punch--aura.png", frs, "aura", "1-4 loop: aura laranja de concentração com linhas convergindo para o usuário")
    frs = quadros(4, 64, 64)
    for f, q in enumerate(frs):
        if f < 3:
            def fn(x, y):
                d, a = hyp(x, y), ang(x, y)
                r = star_r(a, 12, [8, 16, 18][f], [18, 31, 28][f])
                return (LARANJA.W if d < r * 0.4 else LARANJA.L if d < r * 0.7 else LARANJA.M) if d < r else None
            peca(q, fn, LARANJA.O)
        for R in [[], [], [27], [24, 30]][f]:
            arco(q, 0, 0, R, 2.2, 0, TAU - 0.001, LARANJA)
    salvar("focus-punch--impacto.png", frs, "impacto", "1-3 impacto enorme de 12 pontas; 4 anéis de choque")


@golpe
def dragon_pulse():
    frs = quadros(3, 64, 40)
    for f, q in enumerate(frs):
        boca = [6, 9, 7][f]
        def cabeca(x, y):
            # focinho para a direita, mandíbula aberta
            if -24 < x < 22:
                topo = -10 + (x + 24) / 46 * 6
                base = 10 - (x + 24) / 46 * 5
                if x > 6 and abs(y) < boca * (x - 6) / 16:
                    return None
                if topo < y < base:
                    return DRAGAO.W if abs(y) < 2 and x < 0 else DRAGAO.L if y < 0 else DRAGAO.M
            if -20 < x < -8 and -18 < y < -9 and abs(x + 14 - (y + 9) * 0.6) < 2:
                return DRAGAO.L  # chifre
            return None
        peca(q, cabeca, DRAGAO.O)
        disco(q, -6, -4, 1.6, AMARELO)
        for i in range(3):
            linha(q, -30, -6 + i * 6, -22 + (i + f) % 3 * 2, -6 + i * 6, 0.8, DRAGAO.L, DRAGAO.O)
    salvar("dragon-pulse.png", frs, "projetil", "1-3 loop: pulso de energia em forma de cabeça de dragão roxa, boca abrindo e fechando")


@golpe
def muddy_water():
    polys = [
        [(0, 63), (0, 52), (25, 44), (55, 40), (85, 44), (110, 52), (127, 56), (127, 63)],
        [(0, 63), (0, 44), (25, 30), (55, 22), (80, 24), (102, 34), (127, 46), (127, 63)],
        [(0, 63), (0, 40), (20, 22), (45, 10), (70, 8), (92, 16), (106, 28), (98, 30), (92, 24), (90, 34), (110, 48), (127, 54), (127, 63)],
        [(0, 63), (0, 42), (24, 28), (52, 22), (80, 26), (104, 40), (120, 56), (127, 63)],
    ]
    frs = []
    for f, pts in enumerate(polys):
        q = Q(128, 64)
        corpo = {(x, y) for y in range(64) for x in range(128) if in_poly(x + 0.5, y + 0.5, pts)}
        for (x, y) in corpo:
            if (x, y - 1) not in corpo:
                c = LAMA.W if (x + y) % 5 else LAMA.L
            elif (x, y - 3) not in corpo:
                c = LAMA.L
            else:
                c = [LAMA.M, LAMA.D][((y + int(4 * math.sin(x * 0.1 + f))) // 7) % 2]
            q.p[(x, y)] = c
        q.outline(LAMA.O)
        frs.append(q)
    salvar("muddy-water.png", frs, "onda", "1 lama sobe; 2 onda marrom cresce; 3 crista curva; 4 desaba sobre o alvo")


@golpe
def shadow_sneak():
    frs = quadros(4, 96, 16)
    for f, q in enumerate(frs):
        L = [20, 44, 70, 90][f]
        def fn(x, y):
            if x < -46 or x > -46 + L:
                return None
            w = 4 + math.sin((x + 46) * 0.3 - f) * 1.2
            if abs(y) > w:
                return None
            return A(SOMBRA.M if abs(y) < w * 0.5 else SOMBRA.D, 220)
        peca(q, fn, A(SOMBRA.O, 230))
        for s in (-1, 1):
            q.set(48 - 46 + L - 3, 8 + s * 2, VERMELHO.L)
    salvar("shadow-sneak.png", frs, "sombra", "1-4 sombra rastejando pelo chão até o alvo, com olhinhos vermelhos na ponta")


@golpe
def sweet_kiss():
    frs = quadros(3, 32, 24)
    for f, q in enumerate(frs):
        def labios(x, y):
            u, v = x + 4, y
            if (u / 8) ** 2 + (v / 4.5) ** 2 > 1:
                return None
            if abs(v - math.sin(u * 0.8) * 0.8) < 0.6:
                return ROSA.O
            return ROSA.L if v < 0 else ROSA.M
        peca(q, labios, ROSA.O)
        if f >= 1:
            coracao(q, 9, -6 - f, 2.6 + f, ROSA)
    salvar("sweet-kiss.png", frs, "icone", "1 lábios mandando beijo; 2 sai um coraçãozinho; 3 coração maior subindo")


@golpe
def hone_claws():
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        garra(q, -4 + f * 2, -2, 12, Pal("#202028", "#505060", "#9090a8", "#d0d0e0", "#ffffff"), larg=1.8)
        for i in range(f + 1):
            faisca(q, 10 + i * 4, -10 + i * 8, 3, AMARELO)
    salvar("hone-claws.png", frs, "garra", "1-3 garras afiando com faíscas amarelas aparecendo")


@golpe
def octazooka():
    salvar("octazooka--jato.png", jato(TINTA, 2, (64, 20), 6), "raio", "1-2 loop: jato grosso de tinta preta")
    frs = quadros(4, 32, 32)
    for f, q in enumerate(frs):
        k = [0.45, 0.8, 1, 1][f]
        def fn(x, y):
            d, a = hyp(x, y), ang(x, y)
            r = 13 * k * (0.6 + 0.35 * max(0, math.sin(a * 6 + 1)))
            return (TINTA.L if hyp(x + 3, y + 3) < 2 else TINTA.M if d < r * 0.6 else TINTA.D) if d < r else None
        peca(q, fn, TINTA.O)
        if f == 3:
            q.xadrez()
    salvar("octazooka--mancha.png", frs, "impacto", "1 tinta bate; 2 espalha; 3 mancha preta cheia; 4 some (baixa a precisão)")


@golpe
def triple_kick():
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        q.stamp(estrela_impacto(LARANJA, 28, 3)[1], 2, 2)
        rows = DIGITOS[str(f + 1)] if str(f + 1) in DIGITOS else None
        if rows is None:
            rows = {"2": ["###", "..#", "###", "#..", "###"], "3": ["###", "..#", ".##", "..#", "###"]}[str(f + 1)]
        bitmap_peca(q, rows, BRANCO.W, BRANCO.O, 24, 1)
    salvar("triple-kick.png", frs, "impacto", "3 quadros: estrela laranja com o número do chute (1, 2, 3)")


@golpe
def arm_thrust():
    q = Q(24, 24)
    def palma(x, y):
        if (x / 6) ** 2 + ((y - 2) / 6) ** 2 <= 1:
            return POEIRA.L if x < 0 else POEIRA.M
        for i, fx in enumerate((-4.2, -1.4, 1.4, 4.2)):
            if abs(x - fx) < 1.2 and -9 + abs(fx) * 0.4 <= y <= -2:
                return POEIRA.L if i < 2 else POEIRA.M
        if -9 < x < -5 and 0 < y < 5:
            return POEIRA.M
        return None
    peca(q, palma, POEIRA.O)
    salvar("arm-thrust--palma.png", [q], "palma", "1 palma aberta de frente (o motor repete 2-5 tapas rápidos)")
    salvar("arm-thrust--impacto.png", estrela_impacto(BRANCO, 28, 3), "impacto", "1-3 estrela branca do tapa")


@golpe
def water_spout():
    frs = quadros(4, 32, 96)
    for f, q in enumerate(frs):
        alt = [20, 50, 80, 86][f]
        def fn(x, y):
            if y > 44 or y < 44 - alt:
                return None
            topo = 44 - alt
            w = 5 + 2 * math.sin(y * 0.3 + f * 2)
            if y < topo + 10:
                w += (topo + 10 - y) * 0.6
            if abs(x) > w:
                return None
            return AGUA.W if abs(x) < w * 0.3 else AGUA.L if abs(x) < w * 0.65 else AGUA.M
        peca(q, fn, AGUA.O)
        if f >= 2:
            for i in range(5):
                a = -math.pi * 0.9 + i * math.pi * 0.2
                disco(q, math.cos(a) * 12, 44 - alt + 6 + math.sin(a) * 8 + f * 2, 1.5, AGUA)
    salvar("water-spout.png", frs, "geiser", "1 jato d'água sai do chão; 2-3 gêiser sobe; 4 topo se abre em gotas")


@golpe
def roar_of_time():
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: (TEMPO.L if hyp(x, y) > 16 else A(TEMPO.D, 200)) if hyp(x, y) < 19 else None, TEMPO.O)
        for i in range(12):
            a = i * TAU / 12
            q.set(24 + math.cos(a) * 14, 24 + math.sin(a) * 14, TEMPO.W)
        a1 = -math.pi / 2 + f * TAU / 4
        a2 = -math.pi / 2 - f * TAU / 16
        linha(q, 0, 0, math.cos(a1) * 12, math.sin(a1) * 12, 0.8, TEMPO.W, None)
        linha(q, 0, 0, math.cos(a2) * 8, math.sin(a2) * 8, 1.1, TEMPO.W, None)
        disco(q, 0, 0, 1.8, AMARELO)
    salvar("roar-of-time--relogio.png", frs, "relogio", "1-4 loop: relógio azul com os ponteiros girando ao contrário")
    def px(x, y, f):
        d = math.hypot(x - 128, y - 96)
        onda = math.sin(d * 0.12 - f * math.pi / 1.5)
        if onda > 0.85:
            return (144, 200, 255, 120)
        if onda > 0.6:
            return (56, 120, 224, 70)
        return None
    salvar("roar-of-time--distorcao.png", tela_cheia(3, px), "overlay", "1-3 loop: distorção temporal em anéis azuis saindo do centro da tela")


@golpe
def magma_storm():
    frs = quadros(6, 64, 56)
    for f, q in enumerate(frs):
        for i in range(5):
            y = 22 - i * 10
            R = 10 + i * 4
            arco(q, 0, y, R, 3.2, f * TAU / 6 + i * 0.8, f * TAU / 6 + i * 0.8 + 4.4, MAGMA, sy=0.38)
        for i in range(4):
            a = f * TAU / 6 + i * TAU / 4
            disco(q, math.cos(a) * 22, 4 + math.sin(a) * 7, 2, BRASA)
    salvar("magma-storm.png", frs, "redemoinho", "1-6 loop: redemoinho de magma laranja e vermelho prendendo o alvo, com bolhas de lava")


@golpe
def incinerate():
    frs = quadros(4, 32, 40)
    for f, q in enumerate(frs):
        for i, cx in enumerate((-6, 0, 6)):
            peca(q, lambda x, y, cx=cx, i=i: chama(x - cx, y, 16, -12 - (i == 1) * 6, 6, f * 1.4 + i, FOGO), FOGO.O)
    salvar("incinerate--chama.png", frs, "chama", "1-4 loop: labareda larga queimando (sobre o alvo e o item dele)")
    frs = []
    for s in (1.6, 1.2, 2):
        q = Q(6, 6)
        peca(q, lambda x, y, s=s: (FUMACA.L if x < 0 else FUMACA.M) if abs(x) + abs(y) < s * 1.3 else None, FUMACA.O)
        frs.append(q)
    salvar("incinerate--cinza.png", frs, "particula", "3 variações de cinza (sobem e caem depois da chama)")


if __name__ == "__main__":
    for g in G:
        g()
    LOTE.finalizar(LOTES)
