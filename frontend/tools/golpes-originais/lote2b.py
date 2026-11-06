"""Lote 2b: os grupos de golpes parecidos (102), que hoje usam a animação de outro.

    python3 tools/golpes-originais/lote2b.py

Peças base cinza (recolorível, o jogo pinta pelo tipo) dividem um desenho entre golpes do
mesmo grupo: mordida-base, soco-base, chute-base e pedra-base. Cada golpe tem pelo menos uma
peça própria que o distingue.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from kit import *  # noqa

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(RAIZ, "assets", "golpes-originais")
LOTE = Lote("2b", "grupos de golpes parecidos (102)", OUT)
salvar = LOTE.salvar
G = []


def golpe(f):
    G.append(f)
    return f


def quadros(n, w, h):
    return [Q(w, h) for _ in range(n)]


PSI = Pal("#701848", "#c03078", "#f070b0", "#ffb8e0", "#ffffff")
VIOLETA = Pal("#300858", "#6020a0", "#9850e0", "#d0a8ff", "#ffffff")
LAMA = Pal("#301808", "#604020", "#906030", "#c09058", "#e8c890")
GELO = Pal("#285878", "#58a0c8", "#98d8f0", "#d8f4ff", "#ffffff")
VERDE_INSETO = Pal("#304008", "#688010", "#a0c020", "#d8f060", "#ffffff")
ELETRICO = AMARELO


# ---------- ajudantes deste lote ----------
def ondas_som(P, estilo, n=3, S=48, alcance=0.8, esp=2.0):
    frs = quadros(n, S, S)
    for f, q in enumerate(frs):
        raios = [8 + i * (S / 2 - 10) / max(1, n - 1) for i in range(f + 1)] if estilo != "eco" else [6 + f * 5 + i * 5 for i in range(f + 1)]
        for i, R in enumerate(raios):
            cx = -S / 2 + 4
            e = esp * (2.2 if estilo == "grossa" else 1)
            def fn(x, y, R=R, e=e, i=i):
                d, a = hyp(x - cx, y), ang(x - cx, y)
                if abs(a) > alcance * (1.25 if estilo == "grossa" else 1):
                    return None
                r = R
                if estilo == "zigue":
                    r += 1.6 * (1 if int(a * 18) % 2 else -1)
                elif estilo == "serra":
                    r += 2.5 * ((a * 9) % 1)
                elif estilo == "dentes":
                    k = (a * 6) % 1
                    if R - e - 4 * (1 - abs(k - 0.5) * 2) < d < R - e and abs(k - 0.5) < 0.3:
                        return P.W
                if r - e <= d <= r:
                    return P.L if d > r - e / 2 else P.M
                return None
            peca(q, fn, P.O)
    return frs


def boca(P, presas="normal", n=4, S=48):
    """Mordida de frente: mandíbula de cima desce e a de baixo sobe; último quadro é o impacto."""
    frs = quadros(n, S, S)
    for f, q in enumerate(frs):
        d = [15, 8, 2, 2][min(f, 3)]
        for lado in (-1, 1):  # -1 = cima
            y0 = lado * (d + 4)
            def fn(x, y, y0=y0, lado=lado):
                u, v = x, (y - y0) * lado  # v > 0 aponta para fora
                if abs(u) > 19:
                    return None
                curva = (u / 19) ** 2 * 5
                if 0 <= v - curva <= 4:
                    return P.M if v - curva > 2 else P.L
                # dentes apontando para dentro (v < 0)
                if v - curva < 0:
                    if presas == "incisivos":
                        if abs(u) < 7 and -(v - curva) < 9 and abs(u) > 0.6:
                            return P.W if abs(u) < 3.5 else P.L
                        return None
                    k = (u + 19) / 38 * 6
                    t = abs(k - round(k))
                    alt = 5 if presas == "normal" else (11 if abs(u) > 9 and abs(u) < 15 else 4)
                    if presas == "presas" and abs(abs(u) - 12) < 3:
                        return (P.W if abs(abs(u) - 12) < 1.2 else P.L) if -(v - curva) < (alt * (1 - abs(abs(u) - 12) / 3)) else None
                    if -(v - curva) < alt * (1 - t * 2.2):
                        return P.W if t < 0.18 else P.L
                return None
            peca(q, fn, P.O)
        if f == 3:
            for a in (0, math.pi):
                for dd in (-0.4, 0, 0.4):
                    aa = a + dd
                    linha(q, math.cos(aa) * 20, math.sin(aa) * 20, math.cos(aa) * 23, math.sin(aa) * 23, 0.6, P.W, P.O)
    return frs


def elos_raio(q, pts, P, w=1.4):
    for a, b in zip(pts, pts[1:]):
        linha(q, *a, *b, w, P.L, None, P.W)
    q.outline(P.O)


def raio_zigue(x0, y0, x1, y1, n, amp, rnd):
    pts = [(x0, y0)]
    for i in range(1, n):
        t = i / n
        pts.append((x0 + (x1 - x0) * t + rnd.uniform(-amp, amp), y0 + (y1 - y0) * t + rnd.uniform(-amp, amp)))
    pts.append((x1, y1))
    return pts


def cristal(q, cx, cy, h, w, a, P):
    def fn(x, y):
        u, v = rot(x - cx, y - cy, a)
        if abs(v) > w * (1 - abs(u) / h) or abs(u) > h:
            return None
        return P.W if v < -w * 0.2 and u < 0 else P.L if v < 0 else P.M
    return peca(q, fn, P.O)


def lamina_lua(q, R, esp, P, cx=0, cy=0, sy=1.0, rot_=0.0, abre=1.0):
    """Meia-lua convexa para a direita."""
    def fn(x, y):
        u, v = rot(x - cx, y - cy, rot_)
        v /= sy
        a = hyp(u + R * 0.25, v)
        b = hyp(u + R * 0.25 + esp, v)
        if a > R or b < R:
            return None
        if abs(v) > R * abre:
            return None
        e = R - a
        return P.W if e < 1.2 else P.L if e < esp * 0.45 else P.M
    return peca(q, fn, P.O)


def x_corte(P, S=48, n=4, larg=3.2):
    frs = quadros(n, S, S)
    R = S / 2 - 4
    for f, q in enumerate(frs):
        k = [0.5, 1, 1, 1][f]
        lg = [larg * 0.8, larg, larg, larg * 0.45][f]
        for i, sx in enumerate((1, -1)):
            if f == 0 and i == 1:
                continue
            def fn(x, y, sx=sx):
                d, t = seg_dist(x, y, -R * sx, -R, -R * sx + 2 * R * sx * k, -R + 2 * R * k)
                w = lg * (1 - abs(t - 0.5) * 1.2)
                if d < w:
                    return P.W if d < w * 0.35 and f == 2 else P.L if d < w * 0.65 else P.M
                return None
            peca(q, fn, P.O)
    return frs


def pe(q, cx, cy, s, P, a=0.0):
    """Pé de chute de lado: canela vindo de cima à esquerda, sola para a direita."""
    def fn(x, y):
        u, v = rot(x - cx, y - cy, a)
        u, v = u / s, v / s
        pe_ = abs((u - 0.15) / 0.95) ** 3 + abs((v - 0.25) / 0.42) ** 3 <= 1
        canela = -0.85 <= u <= -0.15 and -1.3 <= v <= 0.2
        dedos = hyp(u - 1.0, v - 0.25) < 0.3
        if not (pe_ or canela or dedos):
            return None
        if v > 0.5 and u > -0.6:
            return P.D  # sola
        if canela and v < -1.0:
            return P.D
        return P.W if hyp(u + 0.6, v + 0.8) < 0.15 else P.L if v < 0.1 and u < 0.2 else P.M
    return peca(q, fn, P.O)


def pedra(q, cx, cy, r, P, seed=0, n=7):
    rnd = random.Random(seed)
    ks = [rnd.uniform(0.75, 1.0) for _ in range(n)]
    def fn(x, y):
        d, a = hyp(x - cx, y - cy), ang(x - cx, y - cy)
        i = (a + math.pi) / TAU * n
        i0 = int(i) % n
        t = i - int(i)
        rr = r * (ks[i0] * (1 - t) + ks[(i0 + 1) % n] * t)
        if d > rr:
            return None
        fac = int((a + math.pi) / TAU * n + 0.5) % n
        if d < rr * 0.5:
            return P.L if (x - cx) + (y - cy) < 0 else P.M
        return [P.L, P.M, P.D, P.M, P.L, P.D, P.M][fac % 7]
    return peca(q, fn, P.O)


def silhueta(q, cx, cy, s, cor, O):
    def fn(x, y):
        u, v = (x - cx) / s, (y - cy) / s
        corpo = (u / 0.8) ** 2 + ((v - 0.35) / 0.75) ** 2 <= 1
        cab = hyp(u - 0.1, v + 0.55) < 0.5
        orel = abs(u) < 0.55 and -1.25 < v < -0.75 and abs(abs(u) - 0.35) < (v + 1.25) * 0.4
        return cor if corpo or cab or orel else None
    return peca(q, fn, O)


def nota(q, rows, P, x0, y0):
    bitmap_peca(q, rows, P.L, P.O, x0, y0)


NOTA = ["...##", "...#.", "...#.", ".###.", "####.", ".##.."]
NOTA2 = [".####", ".#..#", ".#..#", "##.##", "##.##"]


# ======================= som =======================
@golpe
def som():
    salvar("supersonic.png", ondas_som(Pal("#503080", "#9070c8", "#d0c0f0", "#ffffff"), "zigue", esp=1.4), "onda", "1-3 ondas sonoras finas em zigue-zague, branco-roxas, saindo para a direita")
    salvar("screech.png", ondas_som(Pal("#801818", "#d06060", "#f8d0d0", "#ffffff"), "serra", esp=1.8), "onda", "1-3 ondas estridentes serrilhadas (branco com borda vermelha)")
    frs = ondas_som(BRANCO, "grossa", S=56, esp=2.4)
    for f, q in enumerate(frs):
        for i in range(3 + f):
            yy = -12 + i * 8 - f * 2
            linha(q, -10 + f * 6, yy, 2 + f * 8, yy, 0.6, BRANCO.L, BRANCO.D)
    salvar("roar.png", frs, "onda", "1-3 ondas grossas com linhas de vento empurrando para a direita")
    salvar("hyper-voice.png", ondas_som(BRANCO, "grossa", S=64, esp=3.2, alcance=1.0), "onda", "1-3 ondas sonoras enormes e brancas")
    frs = ondas_som(ACO, "liso", esp=2.4)
    for f, q in enumerate(frs):
        for i in range(f + 1):
            faisca(q, -6 + i * 9, (-1) ** i * (8 + f * 2), 2 + (i == f), ACO)
    salvar("metal-sound.png", frs, "onda", "1-3 ondas metálicas cinza com faíscas")
    cores = [VERMELHO, AMARELO, AZUL, GRAMA]
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        for i in range(3):
            P = cores[(i + f) % 4]
            R = 9 + i * 6
            arco(q, -20, 0, R + (f + i) % 2, 1.6, -0.9 + 0.3 * math.sin(f + i), 0.7 + 0.3 * math.cos(f * 2 + i), P)
        for i in range(2):
            P = cores[(i + f + 2) % 4]
            nota(q, NOTA if (i + f) % 2 else NOTA2, P, 26 + i * 10 - f, 6 + i * 22 + (f % 2) * 3)
    salvar("uproar.png", frs, "onda", "1-4 loop: ondas e notas em várias cores, desencontradas (caos)")
    salvar("echoed-voice.png", ondas_som(Pal("#5050a0", "#9898d0", "#d8d8f8", "#ffffff"), "eco", n=4, esp=1.6), "onda", "1-4 ondas que se repetem, cada quadro com uma a mais e maior (o golpe cresce a cada uso)")
    salvar("snarl.png", ondas_som(Pal("#100810", "#381838", "#603060", "#9060a0", "#ffffff"), "dentes", esp=2.6), "onda", "1-3 ondas escuras com dentes brancos nas bordas")


# ======================= mordidas =======================
@golpe
def mordidas():
    salvar("mordida-base.png", boca(CINZA), "boca", "(recolorível) base das mordidas: 1 boca aberta; 2 fechando; 3 fechada; 4 impacto com riscos (bite, fire/thunder/ice/poison-fang)")
    salvar("hyper-fang.png", boca(CINZA, "incisivos"), "boca", "(recolorível) 1-4 mordida com dois incisivos enormes")
    salvar("super-fang--boca.png", boca(CINZA, "presas"), "boca", "(recolorível) 1-4 mordida com presas longas")
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        rnd = random.Random(7)
        for i in range(5):
            a = i * TAU / 5 + 0.3
            comp = [6, 13, 17][f]
            pts = [(0, 0)]
            for k in range(1, 4):
                pts.append((math.cos(a) * comp * k / 3 + rnd.uniform(-1.5, 1.5), math.sin(a) * comp * k / 3 + rnd.uniform(-1.5, 1.5)))
            for p1, p2 in zip(pts, pts[1:]):
                linha(q, *p1, *p2, 0.7 if f < 2 else 1, PEDRA.O)
    salvar("super-fang--rachadura.png", frs, "rachadura", "1 rachadura começa no ponto da mordida; 2 abre; 3 rachadura grande (o HP pela metade)")
    frs = []
    for i in range(3):
        q = Q(14, 18)
        peca(q, lambda x, y, i=i: chama(x, y, 7, -8 + i * 2, 4.2 - i * 0.5, i * 1.7, FOGO), FOGO.O)
        frs.append(q)
    salvar("fire-fang--chama.png", frs, "particula", "3 variações de chama (sobem da mordida)")
    frs = quadros(3, 24, 32)
    for f, q in enumerate(frs):
        elos_raio(q, raio_zigue(-6 + f * 2, -14, 4 - f, 14, 5, 3.5, random.Random(30 + f)), ELETRICO, 1.3)
    salvar("thunder-fang--raio.png", frs, "raio", "1-3 raios curtos piscando (cada quadro um desenho)")
    frs = []
    for i, (h, w, a) in enumerate([(6, 2.5, 0.3), (5, 2, -0.8), (4, 3, 1.4)]):
        q = Q(14, 14)
        cristal(q, 0, 0, h, w, a, GELO)
        frs.append(q)
    salvar("ice-fang--cristal.png", frs, "particula", "3 variações de cristal de gelo")
    frs = []
    for r in (2.2, 2.8, 1.8):
        q = Q(10, 12)
        gota(q, 0, 1, r, ROXO)
        frs.append(q)
    salvar("poison-fang--gota.png", frs, "particula", "3 variações de gota roxa de veneno")


# ======================= psíquicos =======================
@golpe
def psiquicos():
    frs = quadros(4, 56, 24)
    for f, q in enumerate(frs):
        for i in range(3):
            R = 10 + i * 7
            a0 = f * TAU / 8 + i * 1.3
            arco(q, 0, 0, R, 1.8, a0, a0 + 4.2, PSI, sy=0.38)
    salvar("confusion.png", frs, "aneis", "1-4 loop: três anéis psíquicos rosa girando em volta do alvo")
    cores = [H("#f84848"), H("#f8a030"), H("#f8e840"), H("#58d858"), H("#48a0f8"), H("#a060f0")]
    frs = quadros(4, 128, 24)
    for f, q in enumerate(frs):
        def fn(x, y):
            if abs(x) > 62:
                return None
            fase = x * 0.35 - f * TAU / 4
            for k in range(2):
                yy = math.sin(fase + k * math.pi) * 7
                if abs(y - yy) < 2.2:
                    return cores[int((x + 64) / 6 + k * 3 + f) % 6]
            return A(PSI.L, 120) if abs(y) < 2 else None
        peca(q, fn, PSI.O)
    salvar("psybeam.png", frs, "raio", "1-4 loop: raio em espiral dupla de arco-íris sobre um fio rosa (gira 90°/quadro)")
    q = Q(14, 14)
    disco(q, 0, 0, 5, PSI)
    salvar("stored-power--esfera.png", [q], "particula", "1 esfera de energia rosa (uma por bônus de atributo; o motor junta no usuário e dispara)")
    frs = quadros(3, 48, 32)
    for f, q in enumerate(frs):
        ab = [0.3, 1, 1][f]
        def olho(x, y):
            if (x / 20) ** 2 + (y / (11 * ab)) ** 2 > 1:
                return None
            d = hyp(x, y)
            if d < 3:
                return H("#200818")
            if d < 8:
                return PSI.W if hyp(x + 3, y + 3) < 2 else PSI.M if d > 6 else PSI.L
            return H("#ffffff")
        peca(q, olho, PSI.O)
        if f == 2:
            for a in range(8):
                an = a * TAU / 8
                linha(q, math.cos(an) * 20 * 1.05, math.sin(an) * 13, math.cos(an) * 23, math.sin(an) * 15.5, 0.6, PSI.L, PSI.O)
    salvar("extrasensory.png", frs, "olho", "1 olho psíquico se abrindo sobre o alvo; 2 aberto; 3 brilha com raios")
    frs = []
    for i, (h, w, a) in enumerate([(7, 2.6, math.pi / 2), (5.5, 2.2, math.pi / 2 + 0.3), (6, 3, math.pi / 2 - 0.25)]):
        q = Q(12, 16)
        cristal(q, 0, 0, h, w, a, PSI)
        frs.append(q)
    salvar("psyshock.png", frs, "particula", "3 variações de cristal psíquico em ponta (caem como estilhaços sobre o alvo)")
    salvar("psystrike.png", explosao(VIOLETA, 64, 5, seed=61), "explosao", "1 clarão violeta; 2 estrela; 3 explosão psíquica grande; 4 anel; 5 dissolve")


# ======================= socos =======================
@golpe
def socos():
    q = Q(28, 24)
    punho(q, 2, 0, 9, CINZA)
    salvar("soco-base--punho.png", [q], "punho", "(recolorível) base dos socos: 1 punho fechado de lado, nós dos dedos para a direita")
    salvar("soco-base--impacto.png", estrela_impacto(CINZA, 40, 3), "impacto", "(recolorível) 1 estrela pequena; 2 estrela cheia; 3 afinando")
    q = Q(48, 24)
    for i in range(5):
        peca(q, lambda x, y, i=i: A(OURO.L, 230 - i * 40) if hyp(x + 6 + i * 4, y) < 6 - i * 0.9 else None, None)
    punho(q, 12, 0, 7, OURO)
    salvar("comet-punch.png", [q], "punho", "1 punho dourado com cauda de cometa (o motor repete em sequência rápida)")
    q = Q(48, 24)
    for i, yy in enumerate((-8, -4, 0, 4, 8)):
        linha(q, -22 + (i % 2) * 4, yy, -4 - (i % 3) * 3, yy, 0.6, BRANCO.W, BRANCO.D)
    salvar("mach-punch.png", [q], "linhas", "1 linhas de velocidade brancas (vão atrás do punho base)")
    q = Q(36, 20)
    def bala(x, y):
        if -14 <= x <= 4 and abs(y) <= 6:
            return ACO.W if y < -3 else ACO.L if y < 1 else ACO.M
        if 4 < x <= 15 and abs(y) <= 6 * (1 - ((x - 4) / 11) ** 2) ** 0.5:
            return ACO.W if y < -2 else ACO.L if y < 1 else ACO.M
        if -17 <= x < -14 and abs(y) <= 5:
            return ACO.D
        return None
    peca(q, bala, ACO.O)
    for k in (-1, 0, 1):
        q.set(18 - 6 + k, 10 - 3 - abs(k), ACO.O)
    salvar("bullet-punch.png", [q], "projetil", "1 punho de aço em forma de bala")
    frs = quadros(3, 32, 48)
    for f, q in enumerate(frs):
        k = [0.4, 0.8, 1][f]
        pts = [bezier((-8, 20), (14, 10), (6, -20), i / 30 * k) for i in range(31)]
        def fn(x, y):
            for i, (px, py) in enumerate(pts):
                if hyp(x - px, y - py) < 1 + i / 30 * 2.8:
                    return BRANCO.W if i > 22 else BRANCO.L
            return None
        peca(q, fn, BRANCO.D)
    salvar("sky-uppercut.png", frs, "rastro", "1-3 rastro de gancho em arco de baixo para cima (cresce)")
    frs = quadros(4, 64, 64)
    for f, q in enumerate(frs):
        if f < 3:
            def fn(x, y):
                d, a = hyp(x, y), ang(x, y)
                r = star_r(a, 10, [8, 16, 20][f], [16, 30, 28][f])
                return (CINZA.W if d < r * 0.4 else CINZA.L if d < r * 0.7 else CINZA.M) if d < r else None
            peca(q, fn, CINZA.O)
        for R in [[], [], [26], [24, 30]][f]:
            arco(q, 0, 0, R, 2, 0, TAU - 0.001, CINZA)
    salvar("mega-punch.png", frs, "impacto", "(recolorível) 1 impacto forte; 2 estrela enorme de 10 pontas; 3 estrela com anel de choque; 4 anéis se abrindo")
    frs = quadros(4, 40, 20)
    for f, q in enumerate(frs):
        for i in range(3):
            a = f * TAU / 12 + i * TAU / 3
            estrela5(q, math.cos(a) * 14, math.sin(a) * 5, 3 if math.sin(a) > 0 else 2.4, AMARELO)
    salvar("dizzy-punch.png", frs, "estrelas", "1-4 loop: três estrelinhas girando em volta da cabeça do alvo")


# ======================= pós =======================
def po(P, var=3, S=10, raio=(1.6, 2.2, 1.2), extra=None):
    frs = []
    for i in range(var):
        q = Q(S, S)
        r = raio[i % len(raio)]
        disco(q, 0, 0, r, P)
        if extra:
            extra(q, i)
        frs.append(q)
    return frs


@golpe
def pos():
    salvar("poison-powder.png", po(ROXO), "particula", "3 variações de pó roxo")
    salvar("stun-spore.png", po(AMARELO, extra=lambda q, i: q.set(8, 1, AMARELO.W) if i % 2 == 0 else None), "particula", "3 variações de pó amarelo (com pontinho de faísca)")
    salvar("rage-powder.png", po(Pal("#701000", "#c03010", "#f06020", "#ffa860")), "particula", "3 variações de pó vermelho-alaranjado")
    frs = []
    for i in range(3):
        q = Q(14, 14)
        def esporo(x, y, i=i):
            r = [4.5, 5.5, 3.8][i]
            if hyp(x, y) > r:
                return None
            if any(hyp(x - px, y - py) < 1 for px, py in ((-1.5, -1.5), (2, 0), (-0.5, 2.2))):
                return H("#f0f0c8")
            return esfera(x, y, r, Pal("#405010", "#709028", "#a0c048", "#d0e888"))
        peca(q, esporo, H("#304008"))
        frs.append(q)
    salvar("spore.png", frs, "particula", "3 variações de esporo de cogumelo, maiores, com pintinhas")
    frs = []
    for i in range(3):
        q = Q(14, 14)
        nuvem(q, [(-2, 0, 3), (2, -1, 3.2), (0, 2, 2.8)][: 2 + i % 2], BRANCO)
        frs.append(q)
    salvar("cotton-spore.png", frs, "particula", "3 variações de tufo de algodão")


# ======================= cabeçadas =======================
@golpe
def cabecadas():
    frs = quadros(4, 48, 32)
    for f, q in enumerate(frs):
        for i in range(6):
            peca(q, lambda x, y, i=i: A(FOGO.L if i < 2 else FOGO.M, 230 - i * 30) if hyp(x + 4 + i * 4, y + math.sin(i + f) * 1.5) < 7 - i * 0.9 else None, None)
        punho(q, 10, 0, 8, ACO)
        for i in range(2):
            a = f * TAU / 8 + i * math.pi
            estrela5(q, 10 + math.cos(a) * 12, math.sin(a) * 11, 2.6, AMARELO)
    salvar("meteor-mash.png", frs, "projetil", "1-4 loop: punho-meteoro de aço com cauda de fogo e duas estrelas girando")
    frs = quadros(4, 48, 48)
    AZ = Pal("#103878", "#3078d0", "#70b0f8", "#c0e0ff", "#ffffff")
    for f, q in enumerate(frs):
        for i in range(3):
            R = 12 + i * 5 + f % 2
            arco(q, 0, 0, R, 1.8, -math.pi * 0.95 + i * 0.2 + f * 0.3, -math.pi * 0.05 - i * 0.2 + f * 0.3, AZ)
        for i in range(2):
            faisca(q, 6 + i * 6, -14 + i * 26 - f % 2 * 2, 2, AZ)
    salvar("zen-headbutt.png", frs, "aura", "1-4 loop: aura psíquica azul em arcos na frente da cabeça (vai junto com a investida)")
    frs = quadros(4, 64, 24)
    for f, q in enumerate(frs):
        rnd = random.Random(80)
        comp = [6, 14, 24, 30][f]
        for i in range(6):
            a = math.pi * (i / 5) + rnd.uniform(-0.2, 0.2)
            pts = [(0, -4)]
            for k in range(1, 4):
                r = comp * k / 3
                pts.append((math.cos(a) * r + rnd.uniform(-1.5, 1.5) - (1 if a > math.pi / 2 else 0), -4 + math.sin(a) * r * 0.35 + rnd.uniform(-0.8, 0.8)))
            for p1, p2 in zip(pts, pts[1:]):
                linha(q, *p1, *p2, 1.3, H("#181008"), None)
        if f >= 2:
            for i in range(5):
                pedra(q, -24 + i * 12, -8 - (f - 2) * 3 + (i % 2) * 3, 2, PEDRA, seed=i)
    salvar("heavy-slam.png", frs, "rachadura", "1 o corpo pesado bate: rachadura curta; 2-3 rachaduras se espalham no chão; 4 lascas pulando")
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        for R in [[8], [8, 13], [14, 18]][f]:
            arco(q, 0, 0, R, 2, 0, TAU - 0.001, BRANCO)
        if f < 2:
            q.stamp(estrela_impacto(AMARELO, 24, 2)[f], 8, 8)
    salvar("headbutt.png", frs, "impacto", "1 estrela pequena e anel; 2 estrela e dois anéis (bonk); 3 anéis se abrindo")
    q = Q(32, 32)
    peca(q, lambda x, y: (PEDRA.W if hyp(x + 4, y + 6) < 2 else esfera(x, y, 12, PEDRA)) if hyp(x, y) <= 12 and y < 9 else None, PEDRA.O)
    for x0 in (-6, 3):
        for k in range(6):
            q.set(16 + x0 + (k % 2), 16 - 10 + k, PEDRA.O)
    salvar("head-smash--cabeca.png", [q], "cabeca", "1 cabeça de pedra com rachaduras (vai na frente do usuário na investida)")
    salvar("head-smash--explosao.png", explosao(Pal("#402818", "#806040", "#c09060", "#f0d0a0", "#ffffff"), 56, 5, seed=82), "explosao", "1 clarão; 2 estrela; 3 explosão de pedra; 4 anel; 5 dissolve")


# ======================= chutes =======================
@golpe
def chutes():
    q = Q(32, 24)
    pe(q, 2, 0, 10, CINZA)
    salvar("chute-base--pe.png", [q], "pe", "(recolorível) base dos chutes: 1 pé com a sola para a direita")
    salvar("chute-base--impacto.png", estrela_impacto(CINZA, 40, 3), "impacto", "(recolorível) 1 estrela pequena; 2 cheia; 3 afinando")
    frs = quadros(3, 64, 24)
    for f, q in enumerate(frs):
        arco(q, 0, -16, 28, 5, math.pi * (0.75 - f * 0.25), math.pi * 0.98, BRANCO, sy=0.85)
        for i in range(f + 1):
            pedra(q, -18 + i * 10, 8, 1.6, POEIRA, seed=i)
    salvar("low-kick.png", frs, "rastro", "1-3 rastro de rasteira baixo, varrendo da esquerda para a direita, com poeira")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        a0 = f * TAU / 4
        arco(q, 0, 0, 20, 3, a0, a0 + 3.6, BRANCO)
        arco(q, 0, 0, 14, 1.4, a0 + 0.6, a0 + 3.0, BRANCO, O=False)
    salvar("rolling-kick.png", frs, "rastro", "1-4 loop: arco de chute giratório (o pé base gira junto)")
    q = Q(24, 48)
    def rastro(x, y):
        if y > 18 or y < -22:
            return None
        w = 1 + (y + 22) / 40 * 5
        if abs(x + (y - 18) * 0.2) > w:
            return None
        return BRANCO.W if abs(x + (y - 18) * 0.2) < w * 0.4 else A(BRANCO.L, 200)
    peca(q, rastro, BRANCO.D)
    salvar("jump-kick.png", [q], "rastro", "1 rastro do chute voador caindo de cima (o pé base vai na ponta)")
    frs = quadros(4, 56, 56)
    for f, q in enumerate(frs):
        if f < 3:
            def fn(x, y):
                d, a = hyp(x, y), ang(x, y)
                r = star_r(a, 8, [6, 12, 16][f], [12, 26, 24][f], 0.2)
                return (VERMELHO.W if d < r * 0.4 else VERMELHO.L if d < r * 0.7 else VERMELHO.M) if d < r else None
            peca(q, fn, VERMELHO.O)
        for R in [[], [], [24], [22, 27]][f]:
            arco(q, 0, 0, R, 2, 0, TAU - 0.001, VERMELHO)
    salvar("high-jump-kick.png", frs, "impacto", "1-3 impacto vermelho forte de 8 pontas; 4 anéis de choque (o chute voador alto, mais forte)")
    frs = quadros(4, 40, 32)
    for f, q in enumerate(frs):
        for i, cx in enumerate((-12, -6, 0, 6)):
            peca(q, lambda x, y, cx=cx, i=i: chama(x - cx, y, 10, -8 - (i % 2) * 4, 4.4, f * 1.6 + i, FOGO), FOGO.O)
        pe(q, 6, 4, 8, FOGO)
    salvar("blaze-kick.png", frs, "pe", "1-4 loop: pé em chamas, labaredas tremulando atrás")


# ======================= raios =======================
def feixe(P, n, larg, S=(128, 32), estilo="liso"):
    frs = quadros(n, *S)
    for f, q in enumerate(frs):
        def fn(x, y):
            if abs(x) > S[0] / 2 - 2:
                return None
            w = larg + math.sin(x * 0.5 - f * 2) * (1 if estilo == "liso" else 0)
            if x > S[0] / 2 - 8:
                w *= (S[0] / 2 - 2 - x) / 6
            if abs(y) > w:
                return None
            r = abs(y) / max(w, 0.1)
            return P.W if r < 0.35 else P.L if r < 0.7 else P.M
        peca(q, fn, P.O)
    return frs


@golpe
def raios():
    SOL = Pal("#806000", "#e0a000", "#ffe040", "#fff8a0", "#ffffff")
    frs = quadros(4, 32, 32)
    for f, q in enumerate(frs):
        r = [3, 5, 7, 9][f]
        peca(q, lambda x, y: (SOL.W if hyp(x, y) < r * 0.6 else SOL.L) if hyp(x, y) < r else (SOL.M if hyp(x, y) < r + 4 and ((ang(x, y) * 8 / TAU + f * 0.25) % 1) < 0.3 and f >= 1 else None), SOL.D)
    salvar("solar-beam--carga.png", frs, "carga", "1 ponto de luz; 2-3 o sol cresce juntando luz; 4 sol cheio com raios (carregado)")
    salvar("solar-beam--raio.png", feixe(SOL, 3, 9), "raio", "1-3 loop: raio grosso amarelo-branco ondulando (o motor estica entre usuário e alvo)")
    cores = [VERMELHO, AMARELO, GRAMA, AZUL, ROXO]
    frs = quadros(4, 128, 16)
    for f, q in enumerate(frs):
        for i in range(14):
            P = cores[(i + f) % 5]
            r = 3.2 if (i + f) % 2 else 2.2
            disco(q, -58 + i * 9, 0, r, P)
    salvar("signal-beam.png", frs, "raio", "1-4 loop: fila de luzes coloridas piscando e trocando de cor")
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: (ACO.W if abs(x + y * 0.6 - (f - 1) * 6) < 1.6 else ACO.L if x < y else ACO.M) if (x / 10) ** 2 + (y / 13) ** 2 < 1 else None, ACO.O)
        if f == 2:
            faisca(q, 10, -10, 5, ACO)
    salvar("mirror-shot--espelho.png", frs, "espelho", "1 espelho oval; 2 reflexo atravessa; 3 clarão na borda (de onde sai o tiro)")
    salvar("mirror-shot--clarao.png", feixe(ACO, 2, 4, S=(64, 16)), "raio", "1-2 loop: tiro de luz refletida, prateado")
    frs = quadros(4, 128, 24)
    for f, q in enumerate(frs):
        elos_raio(q, raio_zigue(-62, 0, 62, 0, 14, 6, random.Random(90 + f)), ELETRICO, 1.6)
    salvar("charge-beam.png", frs, "raio", "1-4 loop: raio elétrico amarelo em zigue-zague (cada quadro um traçado)")


# ======================= cortes de ar e lâmina =======================
@golpe
def cortes_ar():
    q = Q(32, 32)
    lamina_lua(q, 13, 6, BRANCO)
    salvar("air-slash.png", [q], "projetil", "1 lâmina de ar branca em meia-lua (o motor gira e lança)")
    frs = []
    for i, (R, a) in enumerate([(6, 0.2), (5, -0.4), (6.5, 0.6)]):
        q = Q(16, 16)
        lamina_lua(q, R, 3, BRANCO, rot_=a)
        frs.append(q)
    salvar("air-cutter.png", frs, "particula", "3 variações de lâmina de ar pequena (saem em leque)")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        abre = [0.4, 0.8, 1, 1][f]
        def fn(x, y):
            u, v = rot(x, y, -math.pi / 4)
            L = 20 * abre
            if abs(u) > 20 or u > -20 + 40 * abre:
                return None
            lim = 5.5 * (1 - (u / 20) ** 2)
            if abs(v) > lim:
                return None
            if abs(v) < 0.6:
                return GRAMA.D
            return GRAMA.W if f == 2 and v < -lim * 0.5 else GRAMA.L if v < 0 else GRAMA.M
        peca(q, fn, GRAMA.O)
        if f == 3:
            q.xadrez()
    salvar("leaf-blade.png", frs, "corte", "1 lâmina-folha verde começa o corte; 2 meio; 3 corte inteiro com brilho; 4 some em xadrez")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        for i in range(5):
            a = f * TAU / 10 + i * TAU / 5
            r = 8 + i * 3
            lamina_lua(q, 5, 2.4, BRANCO, cx=math.cos(a) * r, cy=math.sin(a) * r * 0.8, rot_=-a - math.pi / 2)
    salvar("razor-wind.png", frs, "redemoinho", "1-4 loop: redemoinho de lâminas de vento girando (carga no 1º turno)")


# ======================= sombrio rápido =======================
@golpe
def sombrio():
    frs = quadros(3, 48, 32)
    for f, q in enumerate(frs):
        for i in range(3):
            if i > f:
                continue
            silhueta(q, 10 - i * 9, 2, 12, A(SOMBRA.M if i == 0 else SOMBRA.D, 255 - i * 80), A(SOMBRA.O, 255 - i * 70))
        q.set(24 + 12, 16 - 5, VERMELHO.L)
        q.set(24 + 14, 16 - 5, VERMELHO.L)
    salvar("pursuit.png", frs, "silhueta", "1 silhueta escura de olhos vermelhos; 2-3 com rastros atrás (perseguindo)")
    q = Q(16, 24)
    peca(q, lambda x, y: VERMELHO.M if (abs(x) < 2.4 * (1 - (y + 10) / 30) + 0.8 and -10 < y < 4) or hyp(x, y - 8) < 2 else None, VERMELHO.O)
    salvar("assurance--exclamacao.png", [q], "icone", "1 '!' vermelho (aparece sobre o alvo se ele já levou dano no turno)")
    q = Q(28, 24)
    punho(q, 2, 0, 9, SOMBRA)
    salvar("assurance--punho.png", [q], "punho", "1 punho escuro")
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        k = [0.4, 0.8, 1][f]
        def fn(x, y):
            d = hyp(x, (y - 2) * 1.4)
            a = ang(x, (y - 2) * 1.4)
            if 11 <= d <= 14 and -math.pi < a < -math.pi + math.pi * 1.2 * k:
                return VERMELHO.L if d > 12.5 else VERMELHO.M
            return None
        peca(q, fn, VERMELHO.O)
        if f == 2:
            seta(q, 6, -9, -12, 2, 0.1, VERMELHO, 4)
    salvar("payback.png", frs, "seta", "1-3 seta vermelha curva voltando para o alvo (revide)")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        dx = [-18, -8, 0, 0][f]
        silhueta(q, dx, 4, 13, A(SOMBRA.D, 150), A(SOMBRA.O, 150))
        if f >= 2:
            q.stamp(x_corte(SOMBRA, 40, 4, 2.6)[f - 1], 4, 4)
    salvar("feint-attack.png", frs, "golpe", "1 sombra surge pela lateral; 2 aproxima; 3 golpe em X escuro; 4 X afinando")


# ======================= ataques rápidos =======================
@golpe
def rapidos():
    frs = quadros(3, 40, 48)
    for f, q in enumerate(frs):
        silhueta(q, -6 + f * 2, 4, 14, A(CINZA.L, [200, 140, 80][f]), A(CINZA.D, [220, 160, 100][f]))
        if f >= 1:
            q.xadrez(f)
    salvar("feint.png", frs, "silhueta", "(recolorível) 1 silhueta falsa do usuário; 2 começa a sumir; 3 some em xadrez (o golpe vem de outro lado)")
    frs = quadros(4, 64, 24)
    for f, q in enumerate(frs):
        def fn(x, y):
            if x > 28 or x < -30:
                return None
            w = 3 + (x + 30) / 58 * 6
            off = math.sin(x * 0.3 + f * TAU / 4) * 1.5
            if abs(y - off) > w:
                return None
            r = abs(y - off) / w
            return AGUA.W if r < 0.3 else AGUA.L if r < 0.65 else AGUA.M
        peca(q, fn, AGUA.O)
        for i in range(3):
            disco(q, -26 + ((i * 9 + f * 5) % 20), (-1) ** i * 9, 1.4, AGUA)
    salvar("aqua-jet.png", frs, "rastro", "1-4 loop: jato d'água que se alarga para a frente (o usuário vai na ponta), com gotas")
    frs = quadros(3, 96, 32)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: (BRANCO.W if abs(y) < 4 else BRANCO.L) if abs(y) < 8 * (x + 46) / 92 + 1 and -46 < x < 44 else None, BRANCO.D)
        for i in range(5):
            yy = -14 + i * 7
            x0 = -44 + ((i * 17 + f * 23) % 40)
            linha(q, x0, yy, x0 + 20, yy, 0.5, BRANCO.W)
    salvar("extreme-speed.png", frs, "rastro", "1-3 loop: rastro branco intenso com linhas de velocidade passando")
    frs = quadros(4, 64, 48)
    for f, q in enumerate(frs):
        k = (f + 1) / 4
        pts = []
        for i in range(60):
            t = i / 59 * k
            if t < 0.4:
                pts.append((-26 + t / 0.4 * 40, 14))
            elif t < 0.6:
                a = (t - 0.4) / 0.2 * math.pi
                pts.append((14 + math.sin(a) * 12, 14 - (1 - math.cos(a)) * 12))
            else:
                pts.append((14 - (t - 0.6) / 0.4 * 40, -10))
        def fn(x, y):
            for i, (px, py) in enumerate(pts):
                if hyp(x - px, y - py) < 2 + i / 60 * 2:
                    return VERDE_INSETO.W if i > len(pts) - 6 else VERDE_INSETO.L
            return None
        peca(q, fn, VERDE_INSETO.O)
    salvar("u-turn.png", frs, "rastro", "1-4 rastro verde-inseto em U: vai até o alvo, faz a curva e volta (o usuário troca)")


# ======================= bloqueios =======================
@golpe
def bloqueios():
    frs = quadros(3, 48, 48)
    for f, q in enumerate(frs):
        n = [3, 5, 5][f]
        for i in range(n):
            x = -16 + i * 8
            linha(q, x, -20, x, 20, 1.4, ROXO.M, ROXO.O, ROXO.L)
        if f >= 1:
            for yy in (-20, 20):
                linha(q, -20, yy, 20, yy, 1.8, ROXO.D, ROXO.O, ROXO.M)
        if f == 2:
            faisca(q, 14, -14, 4, ROXO)
    salvar("imprison.png", frs, "cela", "1 grades roxas descendo; 2 cela completa; 3 cela trancada com brilho")
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        for s in (-1, 1):
            tri = [(s * 8, -2), (s * 14, -2), (s * 13 + s * 2, -14 - f)]
            peca(q, lambda x, y, tri=tri: VERMELHO.L if in_poly(x, y, tri) else None, VERMELHO.O)
        if f >= 1:
            for i, (cx, cy) in enumerate([(-12, 8), (12, 6)][:f]):
                for a in range(4):
                    an = a * TAU / 4 + math.pi / 4
                    linha(q, cx + math.cos(an) * 1.5, cy + math.sin(an) * 1.5, cx + math.cos(an) * 4, cy + math.sin(an) * 4, 0.8, VERMELHO.M, VERMELHO.O)
    salvar("torment.png", frs, "icone", "1 chifrinhos de diabo; 2 com uma marca de raiva; 3 duas marcas de raiva")
    frs = quadros(3, 24, 32)
    for f, q in enumerate(frs):
        aberto = 3 if f == 0 else 0
        arco(q, 0, -4 - aberto, 6.5, 2.4, math.pi, TAU, ACO)
        peca(q, lambda x, y: (FUMACA.L if x < -2 else FUMACA.M) if abs(x) < 9 and -4 <= y <= 11 else None, FUMACA.O)
        peca(q, lambda x, y: AMARELO.M if hyp(x, y - 3) < 1.8 or (abs(x) < 0.7 and 3 < y < 7) else None, None)
        if f == 2:
            faisca(q, 7, -10, 3, ACO)
    salvar("embargo.png", frs, "icone", "1 cadeado preto aberto; 2 fecha; 3 trancado com brilho")
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: GRAMA.L if (abs(x) < 3 and abs(y) < 10) or (abs(y) < 3 and abs(x) < 10) else None, GRAMA.O)
        if f >= 1:
            k = [0, 0.6, 1][f]
            for s in (1, -1):
                linha(q, -12 * k, -12 * k * s, 12 * k, 12 * k * s, 2.4, VERMELHO.M, VERMELHO.O, VERMELHO.L)
    salvar("heal-block.png", frs, "icone", "1 cruz verde de cura; 2 um X vermelho começa por cima; 3 X completo (cura bloqueada)")


# ======================= dreno =======================
@golpe
def dreno():
    frs = []
    for r in (4, 5.2):
        q = Q(14, 14)
        disco(q, 0, 0, r, GRAMA)
        frs.append(q)
    salvar("mega-drain.png", frs, "particula", "2 variações de esfera verde maior (o motor traz do alvo ao usuário)")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        k = (f + 1) / 4
        for i in range(4):
            a = -math.pi / 2 + (i - 1.5) * 0.6
            pts = [bezier((0, 20), (math.cos(a) * 14, 20 + math.sin(a) * 14), (math.cos(a) * 20, math.sin(a) * 26 + 18), t / 20 * k) for t in range(21)]
            def fn(x, y, pts=pts):
                for (px, py) in pts:
                    if hyp(x - px, y - py) < 1.3:
                        return A(GRAMA.L, 220)
                return None
            peca(q, fn, A(GRAMA.D, 200))
        for i in range(f + 2):
            a = i * 1.7 + f * 0.4
            disco(q, math.cos(a) * 16, math.sin(a) * 12 - 4, 2.6, GRAMA)
    salvar("giga-drain.png", frs, "raizes", "1 raízes de luz começam a sair do alvo; 2-3 crescem com mais esferas; 4 muitas esferas presas às raízes")
    q = Q(12, 12)
    disco(q, 0, 0, 4, LARANJA)
    salvar("drain-punch--energia.png", [q], "particula", "1 esfera de energia laranja (sugada pelo punho base)")
    q = Q(32, 24)
    def chifre(x, y):
        u = x + 12
        if u < 0 or u > 26:
            return None
        cy = -(u / 26) ** 2 * 10 + 4
        w = 5 * (1 - u / 26) + 0.5
        if abs(y - cy) > w:
            return None
        return MADEIRA.L if y < cy else MADEIRA.M if int(u) % 6 > 1 else MADEIRA.D
    peca(q, chifre, MADEIRA.O)
    salvar("horn-leech.png", [q], "chifre", "1 chifre de madeira (as esferas verdes são as do mega-drain)")


# ======================= lama e lodo =======================
def mancha(P, S=32, n=4, seed=1):
    frs = quadros(n, S, S)
    rnd = random.Random(seed)
    gotas = [(rnd.uniform(0, TAU), rnd.uniform(0.6, 1.0)) for _ in range(7)]
    for f, q in enumerate(frs):
        R = S / 2 - 3
        k = [0.45, 0.8, 1, 1][f]
        def fn(x, y):
            d, a = hyp(x, y), ang(x, y)
            r = R * k * (0.6 + 0.3 * max(0, math.sin(a * 5 + seed)))
            if d > r:
                return None
            return P.W if hyp(x + r * 0.3, y + r * 0.3) < r * 0.2 else P.L if d < r * 0.5 else P.M
        peca(q, fn, P.O)
        if f >= 2:
            for a, dd in gotas:
                disco(q, math.cos(a) * R * dd * (0.9 + 0.2 * (f - 2)), math.sin(a) * R * dd * (0.9 + 0.2 * (f - 2)), 1.6, P)
        if f == 3:
            q.xadrez()
    return frs


@golpe
def lama():
    salvar("mud-slap.png", mancha(LAMA, 32, 4, seed=3), "impacto", "1 tapa de lama marrom; 2 espalha; 3 mancha cheia com respingos; 4 some")
    frs = quadros(2, 20, 20)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: esfera(x, y, 6 + f * 0.6, ROXO) if hyp(x / (1 + f * 0.15), y) < 6 + f * 0.6 else None, ROXO.O)
    salvar("sludge--projetil.png", frs, "projetil", "1-2 loop: bola de gosma roxa pulsando")
    salvar("sludge--respingo.png", mancha(ROXO, 32, 4, seed=5), "impacto", "1 gosma bate; 2 espalha; 3 respingos roxos; 4 some")
    q = Q(24, 24)
    peca(q, lambda x, y: esfera(x, y + 1, 8, ROXO), ROXO.O)
    linha(q, 0, -8, 3, -11, 0.8, MADEIRA.M, MADEIRA.O)
    faisca(q, 4, -11, 2, AMARELO)
    salvar("sludge-bomb--bomba.png", [q], "projetil", "1 bomba de lodo roxa com pavio aceso")
    salvar("sludge-bomb--explosao.png", explosao(ROXO, 48, 5, seed=95), "explosao", "1 clarão; 2 estrela roxa; 3 explosão de lodo; 4 anel; 5 dissolve")
    q = Q(16, 20)
    peca(q, lambda x, y: (OVO.W if hyp(x + 2, y + 3) < 1.8 else OVO.L if x < 1 else OVO.M) if (x / 5.5) ** 2 + ((y + (1.2 if y < 0 else 0)) / 7.5) ** 2 < 1 else None, OVO.O)
    salvar("egg-bomb--ovo.png", [q], "projetil", "1 ovo branco (o motor arremessa em arco e gira)")
    salvar("egg-bomb--explosao.png", explosao(Pal("#804000", "#e08010", "#f8d040", "#fff8c0", "#ffffff"), 48, 5, seed=96), "explosao", "1 clarão; 2 estrela; 3 explosão amarela; 4 anel; 5 dissolve")


# ======================= arremessos =======================
@golpe
def arremessos():
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        a0 = f * TAU / 4
        arco(q, 0, 0, 18, 3, a0, a0 + 2.4, BRANCO)
        arco(q, 0, 0, 18, 3, a0 + math.pi, a0 + math.pi + 2.4, BRANCO)
        estrela5(q, math.cos(a0 + 1) * 8, math.sin(a0 + 1) * 8, 3, AMARELO)
        nuvem(q, [(math.cos(a0 + 4) * 6, math.sin(a0 + 4) * 6, 4)], POEIRA)
    salvar("submission.png", frs, "rolagem", "1-4 loop: os dois rolando juntos: arcos de movimento girando, estrela e poeira")
    frs = quadros(4, 64, 64)
    for f, q in enumerate(frs):
        k = (f + 1) / 4
        arco(q, 0, 0, 28, 3.4, math.pi * 0.5, math.pi * 0.5 + TAU * 0.85 * k, BRANCO)
        if f == 3:
            seta(q, 24, 12, 26, 20, 0.1, BRANCO, 5)
    salvar("circle-throw.png", frs, "rastro", "1-4 rastro do arremesso em arco circular, crescendo até quase uma volta")
    frs = quadros(3, 48, 48)
    for f, q in enumerate(frs):
        for i in range(8):
            a = i * TAU / 8 + 0.2
            r0, r1 = [(6, 12), (8, 20), (14, 23)][f]
            linha(q, math.cos(a) * r0, math.sin(a) * r0, math.cos(a) * r1, math.sin(a) * r1, 1.2 if f < 2 else 0.8, BRANCO.W, BRANCO.D)
    salvar("vital-throw.png", frs, "impacto", "1-3 linhas de impacto radiais se abrindo (o alvo bate no chão)")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        for i in range(4):
            y = 14 - i * 9
            R = 7 + i * 4
            arco(q, 0, y, R, 2, f * 1.3 + i, f * 1.3 + i + 4.4, Pal("#405060", "#90a0b0", "#c8d8e0", "#f0f8ff"), sy=0.35)
    salvar("storm-throw.png", frs, "redemoinho", "1-4 loop: redemoinho de vento cinza-azulado (o arremesso sai dele)")


# ======================= pedras =======================
@golpe
def pedras():
    frs = []
    for i, r in enumerate((7, 9, 11)):
        q = Q(24, 24)
        pedra(q, 0, 0, r, CINZA, seed=10 + i)
        frs.append(q)
    salvar("pedra-base.png", frs, "pedra", "(recolorível) base das pedras: 3 variações (pequena, média, grande)")
    q = Q(48, 48)
    pedra(q, 0, 0, 22, CINZA, seed=30, n=9)
    for x0, s in ((-6, 1), (5, -1)):
        for k in range(12):
            q.set(24 + x0 + s * (k % 3 - 1), 24 - 12 + k * 2, CINZA.O)
    salvar("rock-wrecker.png", [q], "projetil", "(recolorível) 1 rocha enorme rachada (o motor lança e gira)")


# ======================= investidas =======================
@golpe
def investidas():
    frs = quadros(4, 48, 24)
    for f, q in enumerate(frs):
        k = [0.5, 0.8, 1, 1.1][f]
        nuvem(q, [(-14 * k, 4, 5 * k), (-4 * k, 2, 6 * k), (8 * k, 5, 4.5 * k)], POEIRA, alpha=255 if f < 3 else 170)
    salvar("take-down.png", frs, "poeira", "1-4 nuvem de poeira crescendo atrás da investida (a última mais rala)")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        def fn(x, y):
            d, a = hyp(x, y), ang(x, y)
            r = 18 + 2.5 * math.sin(a * 6 + f * TAU / 4)
            if d > r or d < r - 4:
                return None
            return A(BRANCO.W, 220) if d > r - 2 else A(LARANJA.L, 200)
        peca(q, fn, LARANJA.O)
    salvar("double-edge--aura.png", frs, "aura", "1-4 loop: aura ondulante branca e laranja em volta do usuário que investe")
    salvar("double-edge--recuo.png", estrela_impacto(LARANJA, 32, 3), "impacto", "1-3 estrela laranja de recuo (sobre o próprio usuário)")
    q = Q(40, 24)
    for s in (-1, 1):
        def ch(x, y, s=s):
            u = x + 14
            cy = s * (5 - (u / 28) ** 1.5 * 0) - s * (u / 28) ** 2 * 3
            if u < 0 or u > 28:
                return None
            w = 3.2 * (1 - u / 28) + 0.4
            if abs(y - cy - s * 2) > w:
                return None
            return OVO.L if y < cy + s * 2 else OVO.M
        peca(q, ch, OVO.O)
    salvar("head-charge.png", [q], "chifres", "1 par de chifres apontando para a frente (vai na frente da investida)")


# ======================= cortes =======================
@golpe
def cortes():
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        L = [0.35, 0.7, 1, 1][f]
        def fn(x, y):
            for k in (-8, 0, 8):
                u = (x + y) / math.sqrt(2)
                v = (x - y) / math.sqrt(2) - k
                lim = 18 * L
                if u < -18 or u > -18 + 2 * lim:
                    continue
                larg = 2 * (1 - abs((u + 18) / 36 - 0.5) * 1.2) * (0.5 if f == 3 else 1)
                if abs(v) < larg * 0.5:
                    return BRANCO.W
                if abs(v) < larg:
                    return BRANCO.L
            return None
        peca(q, fn, VERMELHO.O)
    salvar("slash.png", frs, "corte", "1-3 três riscos de garra em diagonal crescendo; 4 afinando")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        lamina_lua(q, [8, 12, 16, 20][f], [3, 4, 5, 6][f], VERDE_INSETO, rot_=-0.5)
    salvar("fury-cutter.png", frs, "corte", "1-4 lâmina de inseto verde em meia-lua, cada quadro maior (usar o quadro pelo nº de usos seguidos)")
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        a = [-1.0, -0.3, 0.3][f]
        mao_faca(q, 2, -4 + f * 5, 8, POEIRA, angulo=a)
        if f >= 1:
            for i in range(3):
                linha(q, -14 + i * 5, -16 + i * 2, -10 + i * 5, -8 + i * 2, 0.5, BRANCO.W, BRANCO.D)
    salvar("karate-chop.png", frs, "mao", "1 mão de caratê erguida; 2 descendo com linhas de movimento; 3 golpe embaixo")


# ======================= espinhos =======================
def agulha(q, cx, cy, comp, w, P, a=0.0):
    def fn(x, y):
        u, v = rot(x - cx, y - cy, a)
        if abs(u) > comp:
            return None
        lim = w * (1 - max(0, u) / comp) if u > 0 else w * (0.5 + 0.5 * (1 + u / comp))
        if abs(v) > lim:
            return None
        return P.W if v < -lim * 0.4 and u > -comp * 0.3 else P.L if v < 0 else P.M
    return peca(q, fn, P.O)


@golpe
def espinhos():
    q = Q(20, 10)
    agulha(q, 0, 0, 8, 2.6, ROXO)
    salvar("poison-sting.png", [q], "projetil", "1 ferrão roxo apontando para a direita")
    q = Q(28, 14)
    agulha(q, 0, -3, 11, 1.6, VERDE_INSETO)
    agulha(q, -2, 3, 11, 1.6, VERDE_INSETO)
    salvar("twineedle.png", [q], "projetil", "1 duas agulhas verdes paralelas")
    q = Q(20, 10)
    agulha(q, 0, 0, 8, 2.2, PEDRA)
    salvar("spike-cannon.png", [q], "projetil", "1 espinho de pedra (o motor dispara em rajada)")


# ======================= canto =======================
@golpe
def canto():
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        for i in range(5):
            a = f * TAU / 20 + i * TAU / 5
            P = [AMARELO, ROSA, AZUL, GRAMA, LARANJA][i]
            nota(q, NOTA if i % 2 else NOTA2, P, int(24 + math.cos(a) * 16 - 2), int(24 + math.sin(a) * 16 - 3))
    salvar("round.png", frs, "notas", "1-4 loop: cinco notas coloridas girando em roda")
    CAV = Pal("#100818", "#382848", "#584870", "#8070a0")
    frs = []
    for rows in (NOTA, NOTA2):
        q = Q(12, 12)
        nota(q, rows, CAV, 3, 3)
        frs.append(q)
    salvar("perish-song--nota.png", frs, "particula", "2 variações de nota sombria")
    q = Q(18, 18)
    def caveira(x, y):
        if hyp(x, y + 1) < 6.5 or (abs(x) < 3.5 and 4 < y < 8):
            if any(hyp(x - ex, y + 1) < 1.8 for ex in (-2.6, 2.6)):
                return H("#100818")
            if abs(x) < 0.7 and 2 < y < 3.5:
                return H("#100818")
            if 5.5 < y < 8 and int(x + 4) % 2 == 0:
                return OVO.M
            return OVO.L if x < 1 else OVO.M
        return None
    peca(q, caveira, CAV.O)
    salvar("perish-song--caveira.png", [q], "icone", "1 caveira (fica sobre os dois Pokémon durante a contagem)")
    q = Q(24, 16)
    folha(q, 0, 0, 0.1, 10, 4, GRAMA)
    disco(q, -9, 0, 1.4, MADEIRA)
    salvar("grass-whistle--folha.png", [q], "folha", "1 folha-apito")
    frs = []
    for rows in (NOTA, NOTA2):
        q = Q(12, 12)
        nota(q, rows, GRAMA, 3, 3)
        frs.append(q)
    salvar("grass-whistle--nota.png", frs, "particula", "2 variações de nota verde")


# ======================= cortes cruzados =======================
@golpe
def cruzados():
    salvar("cross-poison.png", x_corte(ROXO, 48, 4, 3.4), "corte", "1 primeiro risco roxo; 2 X de veneno completo; 3 brilho; 4 afinando")
    NOITE_C = Pal("#100810", "#281828", "#483048", "#806080", "#d0b0d0")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        lamina_lua(q, 20, [3, 6, 7, 3][f], NOITE_C, rot_=-0.8, abre=[0.4, 0.8, 1, 1][f])
    salvar("night-slash.png", frs, "corte", "1 corte escuro em meia-lua começa; 2 abre; 3 cheio; 4 afina")
    frs = quadros(3, 48, 48)
    for f, q in enumerate(frs):
        d = [12, 6, 0][f]
        for s in (1, -1):
            mao_faca(q, -s * (d * 0.6 + 4), -d * 0.4, 7, POEIRA, angulo=-s * 0.78)
        if f == 2:
            q.stamp(estrela_impacto(AMARELO, 24, 2)[1], 12, 12)
    salvar("cross-chop.png", frs, "maos", "1 duas mãos de caratê afastadas; 2 cruzando; 3 X fechado com impacto")


# ======================= investida elemental =======================
@golpe
def elemental():
    frs = []
    for i in range(3):
        q = Q(12, 16)
        peca(q, lambda x, y, i=i: chama(x, y, 6, -7 + i, 3.8 - i * 0.4, i * 2, FOGO), FOGO.O)
        frs.append(q)
    salvar("flame-charge.png", frs, "particula", "3 variações de chaminha (o motor espalha em volta do usuário correndo)")
    AZ = Pal("#082868", "#2058c0", "#58a0f8", "#b0d8ff", "#ffffff")
    frs = quadros(4, 48, 32)
    for f, q in enumerate(frs):
        asa = [-1, 0, 1, 0][f]
        def ave(x, y):
            if (x / 12) ** 2 + (y / 4.5) ** 2 < 1:
                return AZ.L if y < 0 else AZ.M
            if x > 10 and abs(y) < (16 - x) * 0.6:
                return AZ.W
            if -14 < x < -8 and abs(y) < (x + 16) * 0.5 and abs(y) > 1:
                return AZ.M
            if -6 < x < 6 and asa * y > 0 and abs(y) < 14 - abs(x) * 1.2 and abs(y) > 2:
                return AZ.L
            if -6 < x < 6 and asa == 0 and abs(y) < 9 - abs(x) and abs(y) > 2:
                return AZ.L
            return None
        peca(q, ave, AZ.O)
        for i in range(3):
            linha(q, -22, -6 + i * 6, -16 + (i % 2) * 3, -6 + i * 6, 0.6, A(AZ.L, 200))
    salvar("brave-bird.png", frs, "projetil", "1-4 loop: pássaro de energia azul batendo as asas, com rastro (o usuário investe dentro dele)")
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        rnd = random.Random(70 + f)
        for i in range(5):
            a = rnd.uniform(0, TAU)
            elos_raio(q, raio_zigue(math.cos(a) * 8, math.sin(a) * 8, math.cos(a + 0.5) * 21, math.sin(a + 0.5) * 21, 4, 2.5, rnd), ELETRICO, 1.1)
        peca(q, lambda x, y: A(ELETRICO.W, 80) if hyp(x, y) < 15 else None, None)
    salvar("wild-charge.png", frs, "aura", "1-4 loop: corpo envolto em aura elétrica com raios saindo (cada quadro outro desenho)")


# ======================= sono =======================
@golpe
def sono():
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        ab = [3, 7, 5][f]
        peca(q, lambda x, y: (VERMELHO.D if hyp(x, y - ab * 0.4) < ab * 0.6 else ROSA.M) if (x / 8) ** 2 + (y / ab) ** 2 < 1 else None, ROSA.O, oy=4)
        if f >= 1:
            r = [0, 3, 5][f]
            peca(q, lambda x, y: (BRANCO.W if hyp(x - 6, y + 9) < r * 0.4 else A(BRANCO.L, 170)) if hyp(x - 9, y + 10) < r else None, BRANCO.D)
    salvar("yawn.png", frs, "icone", "1 boca começa a bocejar; 2 bocejo aberto e uma bolha; 3 bolha cresce (o alvo vai dormir)")
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        for i in range(f + 1):
            bitmap_peca(q, ["####", "..#.", ".#..", "####"], AZUL.L, AZUL.O, 6 + i * 7, 18 - i * 6)
        arco(q, -10, 4, 10 + f * 4, 2, -0.8, 0.8, BRANCO)
    salvar("snore.png", frs, "onda", "1-3 'z' subindo (1 a 3) e uma onda de ronco que cresce")
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        def balao(x, y):
            if (x / 15) ** 2 + ((y + 2) / 10) ** 2 < 1:
                return BRANCO.W if y < -4 else BRANCO.L
            if -12 < x < -6 and 6 < y < 14 and abs(x + 9 + (y - 6) * 0.4) < (14 - y) * 0.4:
                return BRANCO.L
            return None
        peca(q, balao, BRANCO.D)
        for i in range(3):
            if i <= f:
                disco(q, -6 + i * 6, -2, 1.3, AZUL)
        bitmap_peca(q, ["###", ".#.", "###"], AZUL.L, AZUL.O, 32, 2 + (f % 2))
    salvar("sleep-talk.png", frs, "balao", "1-3 balão de fala com reticências enchendo e um 'z' (falando dormindo)")


# ======================= gelo =======================
@golpe
def gelo():
    frs = quadros(4, 64, 32)
    for f, q in enumerate(frs):
        for i in range(4):
            yy = -10 + i * 7
            def fn(x, y, yy=yy, i=i):
                off = math.sin(x * 0.18 + f * TAU / 4 + i) * 3
                if abs(y - yy - off) < 1.4 and -28 + i * 3 < x < 28:
                    return GELO.W if (int(x + f * 4) % 12) < 7 else GELO.L
                return None
            peca(q, fn, GELO.D)
        for i in range(3):
            faisca(q, -20 + ((i * 19 + f * 9) % 40), (-1) ** i * 12, 2, GELO)
    salvar("icy-wind.png", frs, "vento", "1-4 loop: vento gelado azul-claro em faixas onduladas com cristaizinhos")
    frs = quadros(4, 48, 56)
    for f, q in enumerate(frs):
        alt = [10, 26, 44, 44][f]
        def bloco(x, y):
            if abs(x) > 20 or y > 26 or y < 26 - alt:
                return None
            if abs(x) > 18 and y < 26 - alt + 4:
                return None
            if x - y * 0.5 < -14:
                return A(GELO.W, 220)
            return A(GELO.L if (int(x + y) // 6) % 2 else GELO.M, 190)
        peca(q, bloco, GELO.O)
        if f == 3:
            for cx, cy in [(-14, -16), (16, -4), (-4, 10)]:
                faisca(q, cx, cy, 4, GELO)
    salvar("sheer-cold.png", frs, "bloco", "1 gelo começa no chão; 2 sobe; 3 bloco de gelo cobre o alvo; 4 brilho (congelamento total)")
    frs = []
    for i in range(3):
        q = Q(10, 10)
        s = [3.5, 2.5, 4][i]
        def floco(x, y, s=s):
            for k in range(3):
                a = k * math.pi / 3
                u, v = rot(x, y, a)
                if abs(v) < 0.6 and abs(u) <= s:
                    return GELO.W
            return None
        peca(q, floco, GELO.D)
        frs.append(q)
    salvar("powder-snow.png", frs, "particula", "3 variações de floco de neve leve")


if __name__ == "__main__":
    for g in G:
        g()
    LOTE.finalizar(LOTES)
