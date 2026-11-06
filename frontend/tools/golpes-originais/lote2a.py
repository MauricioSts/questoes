"""Lote 2a: aumento/queda de atributo (50) e cura (11).

    python3 tools/golpes-originais/lote2a.py

Cada golpe ganha um ícone ou efeito próprio; a aura genérica de atributo (ou o brilho de
cura) continua por cima, na receita.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from kit import *  # noqa

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(RAIZ, "assets", "golpes-originais")
LOTE = Lote("2a", "aumento/queda de atributo e cura (61)", OUT)
salvar = LOTE.salvar
G = []


def golpe(f):
    G.append(f)
    return f


def quadros(n, w, h):
    return [Q(w, h) for _ in range(n)]


# ======================= aumento e queda de atributo =======================

@golpe
def growth():
    frs = quadros(4, 32, 32)
    for f, q in enumerate(frs):
        alt = [4, 8, 12, 13][f]
        linha(q, 0, 13, 0, 13 - alt, 1.2, GRAMA.M, GRAMA.O, GRAMA.L)
        if f >= 1:
            folha(q, -4, 13 - alt * 0.5, 0.5, 4, 2, GRAMA)
            folha(q, 4, 13 - alt * 0.6, -0.5 + math.pi, 4, 2, GRAMA)
        if f == 2:
            disco(q, 0, 13 - alt - 2, 2.6, ROSA)
        if f == 3:
            peca(q, lambda x, y: (AMARELO.L if hyp(x, y + 2) < 2 else ROSA.L if y + 2 < 0 else ROSA.M) if hyp(x, y + 2) < star_r(ang(x, y + 2), 5, 3, 7, -math.pi / 2) else None, ROSA.O)
            faisca(q, -10, -10, 3, AMARELO)
            faisca(q, 10, -6, 2, AMARELO)
        peca(q, lambda x, y: MADEIRA.M if ((x / 7) ** 2 + ((y - 14) / 1.6) ** 2) < 1 else None, MADEIRA.O)
    salvar("growth.png", frs, "icone", "1 brotinho; 2 cresce e abre duas folhas; 3 botão rosa; 4 flor aberta com brilhos")


@golpe
def withdraw():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        abre = [0.9, 0.45, 0.0][f]
        for lado in (-1, 1):
            a = lado * abre
            def fn(x, y, a=a, lado=lado):
                u, v = rot(x - lado * 2, y - 6, a)
                if v > 0 or hyp(u, v * 1.3) > 14:
                    return None
                if lado * u < 0:
                    return None
                d = hyp(u, v * 1.3)
                hexa = (int((u + 20) / 5) + int((v + 20) / 4)) % 2
                return AZUL.L if d < 6 else (AZUL.M if hexa else AZUL.D)
            peca(q, fn, AZUL.O)
        if f == 2:
            peca(q, lambda x, y: AZUL.W if abs(hyp(x, (y - 6) * 1.3) - 11) < 0.7 and -2.4 < ang(x, y - 6) < -1.6 else None, None)
    salvar("withdraw.png", frs, "icone", "1 duas metades de casco abertas; 2 fechando; 3 casco fechado com brilho")


@golpe
def iron_defense():
    frs = quadros(4, 40, 40)
    placas = [(-1, -1), (1, -1), (-1, 1), (1, 1)]
    for f, q in enumerate(frs):
        dist = [11, 7, 4.5, 4.5][f]
        for sx, sy in placas:
            cx, cy = sx * dist, sy * dist
            def fn(x, y, cx=cx, cy=cy):
                u, v = x - cx, y - cy
                if abs(u) + abs(v) * 0.6 > 6 or abs(u) > 4.6 or abs(v) > 6:
                    return None
                if u - v < -3:
                    return ACO.W if f == 3 else ACO.L
                return ACO.M if u < 2 else ACO.D
            peca(q, fn, ACO.O)
        if f == 3:
            faisca(q, -9, -12, 4, ACO)
            faisca(q, 11, 8, 3, ACO)
    salvar("iron-defense.png", frs, "icone", "1 quatro placas de aço afastadas; 2 aproximando; 3 juntas como armadura; 4 armadura brilha")


@golpe
def harden():
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        def fn(x, y):
            d, a = hyp(x, y), ang(x, y)
            if d > star_r(a, 6, 10, 12.5, 0.3):
                return None
            if f >= 1:
                fac = int((a + math.pi) / (TAU / 6))
                return [PEDRA.L, PEDRA.M, PEDRA.D, PEDRA.M, PEDRA.L, PEDRA.W][fac % 6] if d > 4 else PEDRA.W
            return PEDRA.M if d > 5 else PEDRA.L
        peca(q, fn, PEDRA.O)
        if f == 0:
            for a in (0.4, 2.3, 4.1):
                for r in range(2, 11):
                    q.set(16 + math.cos(a + r * 0.12) * r, 16 + math.sin(a + r * 0.12) * r, PEDRA.O)
        if f == 2:
            faisca(q, -8, -9, 4, PEDRA)
    salvar("harden.png", frs, "icone", "1 superfície cinza rachando; 2 vira cristal facetado; 3 cristal brilha")


@golpe
def quiver_dance():
    cores = [H("#f87890"), H("#f8d040"), H("#58d8a0"), H("#58a0f8"), H("#b070f0")]
    frs = quadros(4, 40, 40)
    for f, q in enumerate(frs):
        for i in range(15):
            a = i * 0.75 + f * TAU / 8
            r = 2 + i * 1.15
            cx, cy = math.cos(a) * r, math.sin(a) * r * 0.85
            c = cores[i % 5]
            peca(q, lambda x, y, cx=cx, cy=cy, c=c: (H("#ffffff") if hyp(x - cx + 0.5, y - cy + 0.5) < 0.6 else c) if hyp(x - cx, y - cy) < 1.5 else None, H("#402050"))
    salvar("quiver-dance.png", frs, "espiral", "1-4 loop: pó de asa iridescente (5 cores) em espiral girando 45°/quadro")


@golpe
def focus_energy():
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        for i in range(8):
            a = i * TAU / 8 + 0.2
            r0 = [22, 17, 12, 0][f]
            if f == 3:
                continue
            for k in range(5):
                rr = r0 - k * 1.3
                ox = math.sin(k * 1.3 + i) * 1.2
                q.set(24 + math.cos(a) * rr - math.sin(a) * ox, 24 + math.sin(a) * rr + math.cos(a) * ox, AMARELO.L if k < 3 else AMARELO.W)
        q.outline(AMARELO.O)
        rc = [2, 3, 5, 9][f]
        peca(q, lambda x, y: (AMARELO.W if hyp(x, y) < rc * 0.5 else AMARELO.L) if hyp(x, y) < rc else None, AMARELO.D)
        if f == 3:
            for i in range(8):
                a = i * TAU / 8
                faisca(q, math.cos(a) * 15, math.sin(a) * 15, 2, AMARELO)
    salvar("focus-energy.png", frs, "icone", "1 veias de energia amarela nas bordas; 2-3 convergindo para o centro; 4 centro brilha e estoura")


@golpe
def stockpile():
    frs = quadros(3, 40, 24)
    for f, q in enumerate(frs):
        for i in range(f + 1):
            disco(q, (i - 1) * 11, 2 - (i == 1) * 3, 4.5, GRAMA)
    salvar("stockpile.png", frs, "icone", "1 uma esfera verde; 2 duas; 3 três esferas acumuladas (uma por uso)")


@golpe
def coil():
    frs = quadros(4, 40, 40)
    for f, q in enumerate(frs):
        voltas = [1.0, 1.6, 2.2, 2.6][f]
        pts = []
        for i in range(120):
            t = i / 119 * voltas
            r = 15 - t * 4
            pts.append((math.cos(t * TAU) * r, math.sin(t * TAU) * r * 0.55 + (t - voltas / 2) * 5))
        def fn(x, y):
            for i, (px, py) in enumerate(pts):
                if hyp(x - px, y - py) < 2.6:
                    return ROXO.L if (i // 8) % 2 else ROXO.M
            return None
        peca(q, fn, ROXO.O)
        hx, hy = pts[-1]
        disco(q, hx, hy - 1, 3.4, ROXO)
        q.set(20 + hx + 1, 20 + hy - 2, AMARELO.L)
    salvar("coil.png", frs, "icone", "1 serpente roxa meia volta; 2-3 enrolando mais; 4 espiral fechada com a cabeça no topo")


@golpe
def double_team():
    frs = quadros(3, 64, 40)
    def silh(q, cx, a):
        def fn(x, y):
            u, v = x - cx, y
            corpo = (u / 9) ** 2 + ((v - 6) / 11) ** 2 <= 1
            cab = hyp(u, v + 8) < 7
            orel = (abs(u) > 3 and abs(u) < 7 and -18 < v < -11 and abs(abs(u) - 5) < (v + 18) * 0.35)
            if not (corpo or cab or orel):
                return None
            return A(CINZA.L if u < -2 else CINZA.M, a)
        peca(q, fn, A(CINZA.D, a))
    for f, q in enumerate(frs):
        if f >= 1:
            silh(q, -20, 120)
            silh(q, 20, 120)
        silh(q, 0, 200 if f < 2 else 140)
        if f == 0:
            silh(q, -7, 80)
            silh(q, 7, 80)
    salvar("double-team.png", frs, "silhuetas", "(recolorível) 1 silhueta tremendo; 2 três silhuetas translúcidas lado a lado; 3 as três iguais (não dá para saber qual é a verdadeira)")


@golpe
def defense_curl():
    frs = quadros(4, 32, 32)
    for f, q in enumerate(frs):
        if f < 3:
            arco(q, 0, 0, 12, 3.2, -math.pi / 2, -math.pi / 2 + TAU * [0.3, 0.6, 0.9][f] - 0.01, CINZA)
        else:
            disco(q, 0, 0, 10, CINZA)
            arco(q, 0, 0, 7, 1.2, 2.2, 4.0, CINZA, O=False)
    salvar("defense-curl.png", frs, "icone", "(recolorível) 1 anel abrindo; 2 meio anel; 3 quase fechado; 4 bola fechada")


@golpe
def minimize():
    frs = quadros(4, 40, 40)
    for f, q in enumerate(frs):
        d = [17, 14, 11, 11][f]
        if f < 3:
            for a in range(4):
                an = a * TAU / 4 + math.pi / 4
                seta(q, math.cos(an) * d, math.sin(an) * d, math.cos(an) * (d - 7), math.sin(an) * (d - 7), 1.2, CINZA, 3)
        r = [6, 4.5, 3, 1.6][f]
        disco(q, 0, 0, r, CINZA)
    salvar("minimize.png", frs, "icone", "(recolorível) 1 quatro setas apontando para dentro, ponto grande; 2-3 setas fecham e o ponto encolhe; 4 só um pontinho")


@golpe
def cosmic_power():
    estrelas = [(-15, -8), (-6, -14), (4, -9), (13, -13), (9, 2), (-3, 5), (-14, 8)]
    elos = [(0, 1), (1, 2), (2, 3), (2, 4), (4, 5), (5, 6), (5, 0)]
    frs = quadros(3, 48, 40)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: A(NOITE.D, 150) if (x / 23) ** 2 + (y / 19) ** 2 < 1 else None, None)
        if f >= 1:
            for a, b in elos[: [0, 4, 7][f]]:
                linha(q, *estrelas[a], *estrelas[b], 0.5, A(OURO.L, 220))
        for i, (x, y) in enumerate(estrelas):
            estrela5(q, x, y, 2.6 if i % 2 else 3.4, OURO)
        if f == 2:
            for x, y in [(-18, -14), (18, 10), (0, 14)]:
                faisca(q, x, y, 2, OURO)
    salvar("cosmic-power.png", frs, "constelacao", "1 estrelas douradas sobre fundo azul-escuro; 2 linhas da constelação ligando; 3 constelação completa brilhando (o motor faz descer até o usuário)")


@golpe
def after_you():
    frs = quadros(2, 40, 32)
    for f, q in enumerate(frs):
        mao_aberta(q, -8, 2, 8, POEIRA, angulo=-1.3)
        if f == 1:
            seta(q, 4, 0, 18, 0, 1.8, AMARELO, 4.5)
            seta(q, 4, 0, 18, 0, 1.8, AMARELO, 4.5)
    salvar("after-you.png", frs, "icone", "1 mão de palma para cima em gesto de 'por favor'; 2 com seta amarela apontando para o alvo")


@golpe
def nasty_plot():
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        for i, (cx, cy, r) in enumerate([(-14, 15, 1.6), (-10, 10, 2.4)]):
            peca(q, lambda x, y, cx=cx, cy=cy, r=r: BRANCO.L if hyp(x - cx, y - cy) < r else None, BRANCO.O)
        if f >= 1:
            nuvem(q, [(-4, -2, 8), (5, -4, 9), (12, 1, 6), (2, 4, 7)], BRANCO)
            # sorriso maligno
            def sorriso(x, y):
                if abs(hyp(x - 4, y + 8) - 9) < 1 and 0.3 < ang(x - 4, y + 8) < 2.8:
                    return FUMACA.O
                if any(hyp(x - ex, y + 3) < 1.2 for ex in (0, 8)) or any(abs(y + 4.5 - (x - ex) * s) < 0.6 and abs(x - ex) < 2 for ex, s in ((0, 0.6), (8, -0.6))):
                    return VERMELHO.M
                return None
            peca(q, sorriso, None)
        if f == 2:
            disco(q, 12, -14, 4, FUMACA)
            linha(q, 10.5, -10, 13.5, -10, 0.8, ACO.M, ACO.O)
            faisca(q, 18, -18, 2, ROXO)
    salvar("nasty-plot.png", frs, "balao", "1 bolinhas de pensamento; 2 balão com sorriso maligno; 3 lâmpada escura acende em cima")


@golpe
def belly_drum():
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        r = [12, 13, 12.5][f]
        peca(q, lambda x, y: (POEIRA.W if hyp(x + 4, y + 4) < 3 else POEIRA.L if hyp(x + 2, y + 2) < r * 0.7 else POEIRA.M) if hyp(x, y) < r else None, POEIRA.O)
        peca(q, lambda x, y: POEIRA.O if abs(hyp(x, y - 2) - 1.4) < 0.7 else None, None)
        if f >= 1:
            for lado in (-1, 1):
                for R in ([16] if f == 1 else [16, 19]):
                    arco(q, 0, 0, R, 1.8, (0 if lado > 0 else math.pi) - 0.6, (0 if lado > 0 else math.pi) + 0.6, VERMELHO)
    salvar("belly-drum.png", frs, "icone", "1 barriga redonda; 2 batida: barriga estufa e ondas vermelhas dos lados; 3 duas ondas por lado")


@golpe
def calm_mind():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: LILAS.O if abs(y - 2 - (x / 9) ** 2 * 3) < 0.8 and abs(x) < 9 else None, None)
        for i, k in enumerate((-6, 0, 6)):
            q.set(20 + k, 18 + 3 + (1 if k else 0), LILAS.O)
        for R in [[13], [13, 17], [13, 17, 21]][f]:
            arco(q, 0, 4, R, 1.4, math.pi + 0.5, TAU - 0.5, LILAS, sy=0.6)
    salvar("calm-mind.png", frs, "icone", "1 olho fechado com cílios e uma onda suave; 2 duas ondas; 3 três ondas lilás")


@golpe
def barrier():
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        R = [10, 16, 16][f]
        def fn(x, y, R=R):
            d, a = hyp(x, y), ang(x, y)
            r = R * math.cos(math.pi / 6) / math.cos(((a + math.pi / 6) % (math.pi / 3)) - math.pi / 6)
            if d > r:
                return None
            if d > r - 2:
                return CIANO.L
            if f == 2 and abs(x - y * 0.6 + 4) < 1.4:
                return A(CIANO.W, 200)
            return A(CIANO.M, 110)
        peca(q, fn, CIANO.O)
    salvar("barrier.png", frs, "icone", "1 placa hexagonal pequena surgindo; 2 placa ciano translúcida cheia; 3 reflexo branco atravessa")


@golpe
def rock_polish():
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: (PEDRA.W if hyp(x + 4, y + 4) < 2.5 and f > 0 else esfera(x, y * 1.15, 10, PEDRA)) if hyp(x, y * 1.15) <= 10 else None, PEDRA.O)
        for (cx, cy, s) in [[(-11, -10, 3)], [(-11, -10, 4), (10, -6, 2)], [(10, -9, 4), (-12, 6, 3), (2, -14, 2)]][f]:
            faisca(q, cx, cy, s, AMARELO)
    salvar("rock-polish.png", frs, "icone", "1 pedra com uma faísca; 2 pedra polida com brilho; 3 brilhos de polimento em volta")


@golpe
def magnet_rise():
    frs = quadros(2, 32, 40)
    for f, q in enumerate(frs):
        dy = [0, -2][f]
        for R in (9, 13):
            arco(q, 0, 4 + dy, R, 1, math.pi * 1.1, math.pi * 1.9, ACO, O=False)
        def ima(x, y):
            y -= dy
            d = hyp(x, y + 2)
            if (5 <= d <= 10 and y < -2) or (5 <= abs(x) <= 10 and -2 <= y <= 9):
                if y > 5:
                    return ACO.L
                return VERMELHO.M if x < 0 else AZUL.M
            return None
        peca(q, ima, ACO.O)
        for i in range(3):
            q.set(16 - 5 + i * 5, 34 + (i + f) % 2 * 2, A(CIANO.L, 200))
    salvar("magnet-rise.png", frs, "icone", "1-2 loop: ímã em U (vermelho e azul) flutuando com linhas de campo, sobe e desce")


@golpe
def acid_armor():
    frs = quadros(4, 40, 40)
    for f, q in enumerate(frs):
        nivel = [-14, -8, -2, 6][f]
        def fn(x, y):
            topo = -16 + math.sin(x * 0.5) * 1.5
            if abs(x) > 15 or y < topo:
                return None
            base = nivel + (5 if int(x + 16) % 7 < 3 else 0) + math.sin(x) * 1.2
            if y > base and not (y < 16 and abs(x) < 14 and f == 3):
                return None
            return ROXO.W if hyp(x + 8, y + 12) < 1.6 else ROXO.L if y < topo + 3 else ROXO.M
        peca(q, fn, ROXO.O)
        if f < 3:
            for gx in (-9, 3, 11):
                gota(q, gx, nivel + 9 + (gx % 3), 1.6, ROXO)
    salvar("acid-armor.png", frs, "icone", "1 gosma roxa no topo começando a escorrer; 2-3 escorre e pinga; 4 cobre tudo (o corpo vira líquido)")


@golpe
def shell_smash():
    frs = quadros(4, 40, 40)
    def casco(q, dx=0, dy=0, rachas=0):
        def fn(x, y):
            u, v = x - dx, y - dy
            if v > 4 or hyp(u, v * 1.3) > 13:
                return None
            hexa = (int((u + 20) / 5) + int((v + 20) / 4)) % 2
            return AZUL.L if hyp(u + 4, v + 6) < 4 else (AZUL.M if hexa else AZUL.D)
        peca(q, fn, AZUL.O)
        if rachas:
            for x0, s in ((-2, 1), (3, -1)):
                for k in range(9):
                    q.set(20 + x0 + s * ((k % 3) - 1), 20 - 9 + k, AZUL.O)
    for f, q in enumerate(frs):
        if f < 2:
            casco(q, rachas=f)
        else:
            rnd = random.Random(55 + f)
            n = 7
            for i in range(n):
                a = i * TAU / n + rnd.uniform(-0.3, 0.3)
                d = [0, 0, 7, 13][f]
                cx, cy = math.cos(a) * d, math.sin(a) * d - 2
                def fn(x, y, cx=cx, cy=cy, a=a):
                    u, v = rot(x - cx, y - cy, a)
                    return (AZUL.L if v < 0 else AZUL.D) if abs(u) + abs(v) * 1.4 < 4 else None
                peca(q, fn, AZUL.O)
            if f == 2:
                q.stamp(estrela_impacto(AMARELO, 24, 2)[1], 8, 8)
    salvar("shell-smash.png", frs, "icone", "1 casco inteiro; 2 casco racha; 3 estoura com estrela; 4 pedaços voando")


@golpe
def meditate():
    frs = quadros(3, 48, 32)
    for f, q in enumerate(frs):
        abre = [0.35, 0.7, 1.0][f]
        for i in range(-3, 4):
            a = -math.pi / 2 + i * 0.42 * abre
            comp = 18 - abs(i) * 2.2
            cx, cy = math.cos(a) * comp * 0.6, 12 + math.sin(a) * comp * 0.6
            def fn(x, y, a=a, cx=cx, cy=cy, comp=comp):
                u, v = rot(x - cx, y - cy, a)
                if abs(u) > comp * 0.6:
                    return None
                return (LARANJA.W if abs(v) < 0.8 and u > 0 else LARANJA.L if v < 0 else LARANJA.M) if abs(v) < 4.4 * (1 - (u / (comp * 0.6)) ** 2) else None
            peca(q, fn, LARANJA.O)
        if f == 2:
            peca(q, lambda x, y: A(LARANJA.L, 120) if (x / 23) ** 2 + ((y - 2) / 15) ** 2 < 1 and not (x / 18) ** 2 + ((y - 2) / 11) ** 2 < 1 else None, None)
    salvar("meditate.png", frs, "aura", "1 lótus laranja fechado; 2 pétalas abrindo; 3 lótus aberto com aura")


@golpe
def charge():
    frs = quadros(4, 40, 40)
    rnd = random.Random(23)
    raios = [(rnd.uniform(0, TAU), rnd.uniform(0.8, 1.0)) for _ in range(6)]
    for f, q in enumerate(frs):
        for a, s in raios:
            r0 = 18 * s * (1 - f * 0.22)
            pts = [(math.cos(a) * (r0 - k * 2.2) + (k % 2) * 1.5 * math.sin(a), math.sin(a) * (r0 - k * 2.2) - (k % 2) * 1.5 * math.cos(a)) for k in range(4)]
            for p1, p2 in zip(pts, pts[1:]):
                linha(q, *p1, *p2, 0.7, AMARELO.L)
        q.outline(AMARELO.O)
        disco(q, 0, 0, [2, 3.5, 5, 7][f], AMARELO)
    salvar("charge.png", frs, "icone", "1 faíscas elétricas afastadas; 2-3 se juntando; 4 bola de carga amarela no centro")


@golpe
def dragon_dance():
    frs = quadros(6, 40, 48)
    P1 = Pal("#281060", "#5028b0", "#8058f0", "#c0a8ff", "#ffffff")
    for f, q in enumerate(frs):
        for tras in (True, False):
            for k, P in ((0, P1), (1, AZUL)):
                def fn(x, y, k=k, P=P, tras=tras):
                    if not -21 < y < 20:
                        return None
                    t = (18 - y) / 38
                    a = f * TAU / 6 + k * math.pi + t * TAU * 0.9
                    if (math.sin(a) < 0) != tras:
                        return None
                    cx = math.cos(a) * 12 * (1 - t * 0.35)
                    larg = (3.4 - t * 1.4) + 1.6 * max(0, math.sin(y * 1.1 + f * 2.1 + k))
                    d = abs(x - cx)
                    if d > larg:
                        return None
                    if tras:
                        return P.D if d < larg * 0.5 else P.O
                    return P.W if d < larg * 0.25 and t > 0.3 else P.L if d < larg * 0.55 else P.M
                peca(q, fn, P.O)
        # pontas de chama soltas no topo
        for k, P in ((0, P1), (1, AZUL)):
            cx = math.cos(f * TAU / 6 + k * math.pi + TAU * 0.9) * 8
            peca(q, lambda x, y, cx=cx, P=P: chama(x - cx, y, -17, -24, 2.6, f, P), P.O)
    salvar("dragon-dance.png", frs, "aura", "1-6 loop: duas fitas de chama de dragão (roxa e azul) subindo em espiral, as costas mais escuras, com pontas de fogo no topo")


@golpe
def work_up():
    frs = quadros(2, 40, 32)
    for f, q in enumerate(frs):
        for lado in (-1, 1):
            punho(q, lado * 10 - 2, 2 - f, 6, LARANJA)
        for lado in (-1, 1):
            for i, a in enumerate((-0.5, 0, 0.5)):
                b = (0 if lado > 0 else math.pi) + a
                r0 = 15 + f
                linha(q, lado * 6 + math.cos(b) * r0, math.sin(b) * r0, lado * 6 + math.cos(b) * (r0 + 3), math.sin(b) * (r0 + 3), 0.6, LARANJA.L, LARANJA.O)
    salvar("work-up.png", frs, "icone", "1-2 loop: dois punhos laranja tremendo de esforço com linhas de força")


@golpe
def sharpen():
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        tri = [(-12, 10), (12, 10), (0, -13)]
        peca(q, lambda x, y: (CINZA.L if x < 0 else CINZA.M) if in_poly(x, y, tri) else None, CINZA.O)
        gy = [6, -2, -9][f]
        peca(q, lambda x, y: CINZA.W if in_poly(x, y, tri) and abs(y - gy + (x * 0.4)) < 1.3 else None, None)
        if f == 2:
            faisca(q, 0, -13, 4, CINZA)
    salvar("sharpen.png", frs, "icone", "(recolorível) 1 aresta triangular; 2 brilho afiado subindo; 3 brilho na ponta com faísca")


@golpe
def cotton_guard():
    frs = quadros(3, 48, 40)
    puffs = [(-14, 4, 6), (-8, -6, 7), (2, -10, 7), (12, -6, 7), (16, 4, 6), (8, 10, 7), (-4, 11, 7)]
    for f, q in enumerate(frs):
        n = [3, 5, 7][f]
        nuvem(q, puffs[:n], BRANCO)
    salvar("cotton-guard.png", frs, "nuvem", "1 três tufos de algodão; 2 cinco tufos envolvendo; 3 anel completo de algodão branco")


@golpe
def autotomize():
    frs = []
    for i, (w, h, a) in enumerate([(4, 3, 0.3), (3, 4, -0.6), (5, 2.5, 1.0)]):
        q = Q(12, 12)
        peca(q, lambda x, y, w=w, h=h, a=a: (lambda u, v: (ACO.L if v < 0 else ACO.M) if abs(u) < w and abs(v) < h else None)(*rot(x, y, a)), ACO.O)
        frs.append(q)
    salvar("autotomize--pedaco.png", frs, "particula", "3 variações de pedaço de metal (o motor faz cair)")
    q = Q(32, 24)
    for i, yy in enumerate((-8, -3, 2, 7)):
        linha(q, -14 + i * 3, yy, 10 + (i % 2) * 4, yy, 0.6, BRANCO.W, BRANCO.D)
    salvar("autotomize--velocidade.png", [q], "linhas", "1 linhas de velocidade brancas (o motor arrasta ao lado do usuário)")


@golpe
def power_trick():
    frs = quadros(4, 40, 32)
    for f, q in enumerate(frs):
        t = f / 3
        for P, y0, s in ((VERMELHO, -6, 1), (AZUL, 6, -1)):
            yy = y0 * math.cos(t * math.pi)
            xx = -s * 6 * math.sin(t * math.pi)
            seta(q, xx - s * 9, yy, xx + s * 9, yy, 1.8, P, 5)
    salvar("power-trick.png", frs, "setas", "1 seta vermelha (ataque) em cima e azul (defesa) embaixo; 2-3 giram trocando de lugar; 4 trocadas")


@golpe
def howl():
    LUA = Pal("#404868", "#8890b0", "#c0c8e0", "#e8ecf8", "#ffffff")
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: (None if hyp(x + 10, y + 13) < 6 else esfera(x + 13, y + 11, 7, LUA)) if hyp(x + 13, y + 11) < 7 else None, LUA.O)
        for R in [[8], [8, 13], [8, 13, 18]][f]:
            arco(q, -2, 6, R, 1.6, -0.9, 0.9, LUA)
    salvar("howl.png", frs, "icone", "1 lua crescente cinza-azulada e uma onda de uivo; 2 duas ondas; 3 três ondas")


@golpe
def bulk_up():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        r = [5, 7, 8][f]
        def braco(x, y):
            if abs(y - 8) < 3.2 and -16 < x < 2:
                return LARANJA.M
            if abs(x - 2) < 3.2 and -10 < y < 10:
                return LARANJA.M
            if hyp(x + 6, y - 4) < r and y < 8:
                return LARANJA.W if hyp(x + 8, y - 2) < r * 0.35 else LARANJA.L
            return None
        peca(q, braco, LARANJA.O)
        disco(q, 3, -11, 4, LARANJA)
        if f >= 1:
            for a in (-2.4, -1.9, -1.3):
                linha(q, -6 + math.cos(a) * (r + 3), 4 + math.sin(a) * (r + 3), -6 + math.cos(a) * (r + 6), 4 + math.sin(a) * (r + 6), 0.6, AMARELO.L, AMARELO.O)
    salvar("bulk-up.png", frs, "icone", "1 braço dobrado; 2 bíceps incha com linhas de força; 3 bíceps no máximo")


@golpe
def tail_glow():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        pts = [bezier((-16, 10), (0, 14), (12, -8), i / 30) for i in range(31)]
        def fn(x, y):
            for i, (px, py) in enumerate(pts):
                if hyp(x - px, y - py) < 2.6 - i / 30:
                    return (AMARELO.W if f == 2 and i > 20 else AMARELO.L) if i > 18 else POEIRA.M
            return None
        peca(q, fn, AMARELO.O if f else POEIRA.O)
        for k in range(f * 3):
            a = k * TAU / 6 + f
            faisca(q, 12 + math.cos(a) * 7, -8 + math.sin(a) * 7, 2, AMARELO)
        if f == 2:
            peca(q, lambda x, y: A(AMARELO.L, 120) if 4 < hyp(x - 12, y + 8) < 6 else None, None)
    salvar("tail-glow.png", frs, "icone", "1 cauda curva; 2 a ponta acende em amarelo com pontos de luz; 3 brilho máximo com halo")


def engrenagem(q, cx, cy, r, n, fase, P):
    def fn(x, y):
        d, a = hyp(x - cx, y - cy), ang(x - cx, y - cy)
        k = ((a - fase) * n / TAU) % 1
        R = r + (2.2 if 0.25 < k < 0.75 else 0)
        if d > R or d < r * 0.35:
            return None
        return P.L if (y - cy) < -(x - cx) * 0.5 else P.M if d > r * 0.6 else P.D
    return peca(q, fn, P.O)


@golpe
def shift_gear():
    frs = quadros(4, 40, 32)
    for f, q in enumerate(frs):
        engrenagem(q, -7, 2, 8, 8, f * TAU / 32, ACO)
        engrenagem(q, 9, -5, 5.5, 6, -f * TAU / 24 + 0.3, ACO)
    salvar("shift-gear.png", frs, "icone", "1-4 loop: duas engrenagens de metal girando em sentidos opostos")


@golpe
def sweet_scent():
    frs = quadros(4, 48, 32)
    for f, q in enumerate(frs):
        dx = math.sin(f * TAU / 4) * 1.5
        nuvem(q, [(-12 + dx, 2, 7), (-3 - dx, -4, 8), (8 + dx, -2, 8), (15 - dx, 4, 6), (2, 6, 7)], ROSA, alpha=230)
        for i, (fx, fy) in enumerate([(-10, -6), (6, -10), (14, 2), (-2, 6)]):
            fy += (f + i) % 2
            for dx2, dy2 in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                q.set(24 + fx + dx2, 16 + fy + dy2, H("#ffffff"))
            q.set(24 + fx, 16 + fy, AMARELO.M)
    salvar("sweet-scent.png", frs, "nuvem", "1-4 loop: nuvem rosa de perfume ondulando com florzinhas brancas")


@golpe
def smokescreen():
    frs = quadros(4, 48, 40)
    for f, q in enumerate(frs):
        k = [0.4, 0.7, 1.0, 1.0][f]
        puffs = [(-10, 4, 8), (0, -4, 10), (11, 2, 9), (-2, 9, 8), (14, 10, 6), (-15, 11, 6)]
        nuvem(q, [(x * k, y * k, r * k) for x, y, r in puffs], FUMACA)
        if f == 3:
            q.xadrez()
    salvar("smokescreen.png", frs, "nuvem", "1 baforada de fumaça preta pequena; 2 cresce; 3 nuvem cheia; 4 dissolvendo")


@golpe
def tail_whip():
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        a = [-0.6, 0, 0.6][f]
        pts = [(math.sin(a) * i * 0.9 + math.sin(i * 0.2) * a * 3, 14 - i) for i in range(24)]
        def fn(x, y):
            for i, (px, py) in enumerate(pts):
                if hyp(x - px, y - py) < 3.2 - i * 0.07:
                    return POEIRA.L if x < px else POEIRA.M
            return None
        peca(q, fn, POEIRA.O)
        for s in (-1, 1):
            if (f == 0 and s > 0) or (f == 2 and s < 0):
                arco(q, 0, 14, 20, 1, -math.pi / 2 + s * 0.35 - 0.2, -math.pi / 2 + s * 0.35 + 0.2, BRANCO, O=False)
    salvar("tail-whip.png", frs, "icone", "1 cauda à esquerda; 2 no meio; 3 à direita (balançando com linhas de movimento)")


@golpe
def string_shot():
    frs = quadros(4, 40, 40)
    for f, q in enumerate(frs):
        voltas = [0.6, 1.4, 2.2, 3.0][f]
        for i in range(int(voltas * 40)):
            t = i / 40
            a = t * TAU
            r = 14 - t * 1.5
            q.set(20 + math.cos(a) * r, 20 + math.sin(a) * r * 0.45 + (t - 1.5) * 7, BRANCO.W)
        q.outline(BRANCO.D)
    salvar("string-shot.png", frs, "fios", "1 fio de seda começa a enrolar; 2-3 mais voltas; 4 o alvo fica todo enrolado")


@golpe
def whirlwind():
    frs = quadros(4, 40, 48)
    for f, q in enumerate(frs):
        for i in range(6):
            y = 18 - i * 7
            R = 5 + i * 2.6
            arco(q, math.sin(i + f) * 1.5, y, R, 1.8, f * 1.2 + i, f * 1.2 + i + 4.2, BRANCO, sy=0.32)
    salvar("whirlwind.png", frs, "redemoinho", "1-4 loop: redemoinho de vento cinza-claro em anéis, girando")


@golpe
def captivate():
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        coracao(q, 0, 0, [6, 9, 8][f], ROSA)
        for (cx, cy) in [[], [(-11, -10), (12, -6)], [(-12, 8), (11, -11), (2, -14)]][f]:
            faisca(q, cx, cy, 3, ROSA)
    salvar("captivate.png", frs, "icone", "1 coração rosa; 2 coração grande com brilhos; 3 pulsa e os brilhos mudam")


@golpe
def sand_attack():
    frs = []
    for r in (1.6, 2.2, 1.2):
        q = Q(8, 8)
        disco(q, 0, 0, r, POEIRA)
        frs.append(q)
    salvar("sand-attack--grao.png", frs, "particula", "3 variações de grão de areia")
    frs = quadros(3, 32, 24)
    for f, q in enumerate(frs):
        k = [0.5, 1, 1.2][f]
        nuvem(q, [(-6 * k, 2, 5 * k), (2 * k, -2, 6 * k), (9 * k, 3, 4 * k)], Pal("#806040", "#b89060", "#e0c090", "#f8e8c0"), alpha=210 if f < 2 else 140)
    salvar("sand-attack--nuvem.png", frs, "nuvem", "1 punhado de areia; 2 nuvem de areia abrindo; 3 nuvem rala (chega no rosto do alvo)")


@golpe
def feather_dance():
    frs = []
    for a in (0.5, -0.4, 1.3):
        q = Q(14, 14)
        pena(q, 0, 0, a, 6, BRANCO)
        frs.append(q)
    salvar("feather-dance.png", frs, "particula", "3 variações de pena branca (o motor faz cair balançando)")


@golpe
def gastro_acid():
    frs = quadros(4, 32, 40)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: (TOXICO.W if hyp(x + 6, y + 15) < 1.5 else TOXICO.L if y < -14 else TOXICO.M) if (abs(x) < 12 and -17 < y < -11 + math.sin(x * 0.7) * 2) else None, TOXICO.O)
        for i, gx in enumerate((-7, 1, 8)):
            gy = -6 + ((f * 7 + i * 9) % 26)
            gota(q, gx, gy, 2 if i != 1 else 2.6, TOXICO)
    salvar("gastro-acid.png", frs, "icone", "1-4 loop: gosma verde ácida pingando gotas que caem em ritmos diferentes")


@golpe
def encore():
    frs = quadros(3, 48, 48)
    for f, q in enumerate(frs):
        tri = [(0, -24), (-16, 20), (16, 20)]
        peca(q, lambda x, y: A(AMARELO.L, 90 + f * 30) if in_poly(x, y, tri) else None, None)
        peca(q, lambda x, y: A(AMARELO.W, 170) if ((x / 16) ** 2 + ((y - 20) / 4) ** 2) < 1 else None, None)
        if f >= 1:
            bis = ["###..#..###.#", "#..#.#.#.....#", "###..#..##..#", "#..#.#....#..", "###..#.###..#"]
            bitmap_peca(q, bis, VERMELHO.M, VERMELHO.O, 17, 6)
        if f == 2:
            for cx, cy in [(-16, -14), (16, -16), (-18, 4), (18, 2)]:
                estrela5(q, cx, cy, 3, AMARELO)
    salvar("encore.png", frs, "icone", "1 holofote acende; 2 'BIS!' aparece; 3 estrelas em volta")


@golpe
def disable():
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        if f >= 1:
            for i in range(9):
                x = -18 + i * 4.5
                def elo(px, py, i=i, x=x):
                    rx, ry = (2.6, 1.6) if i % 2 else (1.6, 2.2)
                    e = ((px - x) / rx) ** 2 + ((py - 8) / ry) ** 2
                    ei = ((px - x) / (rx - 1)) ** 2 + ((py - 8) / max(ry - 1, 0.6)) ** 2
                    return ACO.L if e <= 1 and ei > 1 else None
                peca(q, elo, ACO.O)
        k = [0.5, 1, 1][f]
        for s in (1, -1):
            linha(q, -12 * k, -12 * k * s, 12 * k, 12 * k * s, 2.6 if f < 2 else 3, VERMELHO.M, VERMELHO.O, VERMELHO.L)
    salvar("disable.png", frs, "icone", "1 X vermelho pequeno; 2 X cheio sobre uma corrente; 3 X mais grosso (golpe travado)")


@golpe
def tickle():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        pena(q, -4, 2, [0.5, 0.2, 0.8][f], 11, BRANCO)
        if f >= 1:
            for i, (cx, cy) in enumerate([(12, -10), (15, -2), (12, 6)][: f + 1]):
                bitmap_peca(q, ["#.#", "###", "#.#"] if i % 2 else ["#.#", ".#.", "#.#"], AMARELO.L, AMARELO.O, 20 + cx - 1, 16 + cy - 1)
    salvar("tickle.png", frs, "icone", "1 pena fazendo cócegas; 2 pena balança e surgem marcas de riso; 3 três marcas de riso")


@golpe
def fake_tears():
    frs = []
    for r in (3.2, 4, 2.6):
        q = Q(14, 18)
        gota(q, 0, 2, r, AGUA)
        frs.append(q)
    salvar("fake-tears.png", frs, "particula", "3 variações de lágrima exagerada (gotas grandes; o motor solta em leque dos olhos)")


@golpe
def charm():
    frs = quadros(3, 32, 32)
    for f, q in enumerate(frs):
        if f == 1:
            peca(q, lambda x, y: A(ROSA.L, 140) if heart(x, y, 12.5) else None, None)
        coracao(q, 0, 0, [9, 10, 7][f], ROSA)
    salvar("charm.png", frs, "icone", "1 coração rosa; 2 pisca grande com halo; 3 encolhe (loop 1-2-3)")


@golpe
def quash():
    frs = quadros(3, 40, 40)
    for f, q in enumerate(frs):
        dy = [-6, 0, 2][f]
        mao_aberta(q, 0, -6 + dy, 8, SOMBRA, angulo=math.pi)
        for R in [[], [14], [14, 18]][f]:
            arco(q, 0, 12, R, 1.6, math.pi * 0.15, math.pi * 0.85, ROXO, sy=0.5)
    salvar("quash.png", frs, "icone", "1 mão escura no alto; 2 empurra para baixo com onda roxa; 3 duas ondas no chão")


@golpe
def flash():
    frs = quadros(3, 256, 192)
    for f, q in enumerate(frs):
        a = [255, 200, 120][f]
        for y in range(192):
            for x in range(256):
                if f == 2 and (x + y) % 2:
                    continue
                q.p[(x, y)] = (255, 255, 255, a)
    salvar("flash.png", frs, "overlay", "1 clarão branco total; 2 clarão diminuindo; 3 clarão em xadrez (sumindo)")


@golpe
def simple_beam():
    frs = quadros(2, 64, 16)
    for f, q in enumerate(frs):
        for i in range(8):
            x = -28 + i * 8 + f * 4
            P = ROSA if (i + f) % 2 else AMARELO
            disco(q, x, math.sin(i * 1.2) * 2, 2.4 if i % 2 else 3, P)
    salvar("simple-beam.png", frs, "raio", "1-2 loop: raio de pontinhos rosa e amarelo alternando (desliza 4 px por quadro)")


# ======================= cura =======================

@golpe
def synthesis():
    frs = quadros(3, 48, 48)
    for f, q in enumerate(frs):
        for i in range(5):
            x = -16 + i * 8
            comp = [10, 22, 30][f]
            linha(q, x, -24, x, -24 + comp, 1.2, A(AMARELO.L, 200), None, A(AMARELO.W, 220))
        for i, (cx, cy, a) in enumerate([(-10, 14, 0.6), (8, 16, -0.5 + math.pi), (0, 8, -1.2)]):
            P = Pal("#185010", "#48a030", "#88e050", "#d8ff98", "#ffffff") if f == 2 else GRAMA
            folha(q, cx, cy, a, 6, 2.8, P)
    salvar("synthesis.png", frs, "icone", "1 raios de sol começam a descer; 2 raios alcançam as folhas; 3 folhas brilham absorvendo a luz")


@golpe
def roost():
    q = Q(40, 16)
    def ninho(x, y):
        if ((x / 18) ** 2 + ((y - 1) / 6) ** 2) > 1 or y < -1:
            return None
        return MADEIRA.L if int(x * 0.7 + y * 2) % 3 == 0 else MADEIRA.M if int(x * 0.7 - y * 2) % 3 else MADEIRA.D
    peca(q, ninho, MADEIRA.O)
    salvar("roost--ninho.png", [q], "ninho", "1 ninho de gravetos (o motor põe no chão sob o usuário; as penas são as do feather-dance)")


@golpe
def moonlight():
    LUA = Pal("#304070", "#6078b8", "#a0b8f0", "#d8e4ff", "#ffffff")
    frs = quadros(3, 40, 48)
    for f, q in enumerate(frs):
        peca(q, lambda x, y: (None if hyp(x + 4, y + 18) < 6.5 else esfera(x + 1, y + 16, 7.5, LUA)) if hyp(x + 1, y + 16) < 7.5 else None, LUA.O)
        if f >= 1:
            comp = [0, 20, 34][f]
            for i, x in enumerate((-6, 0, 6)):
                linha(q, x * 1.5, -6, x * 2.2, -6 + comp, 1.6, A(LUA.L, 160), None, A(LUA.W, 200))
    salvar("moonlight.png", frs, "icone", "1 lua crescente azul; 2 luz azul começa a descer; 3 feixes de luz chegam ao chão")


@golpe
def slack_off():
    frs = quadros(3, 40, 32)
    for f, q in enumerate(frs):
        nuvem(q, [(-6, 4, 6), (2, 0, 7), (9, 5, 5)], BRANCO)
        for i, (cx, cy, s) in enumerate([(-10, -10, 0), (0, -13, 1), (10, -16, 1)][: f + 1]):
            z = ["####", "..#.", ".#..", "####"] if s else ["###", ".#.", "###"]
            bitmap_peca(q, z, AZUL.L, AZUL.O, 20 + cx, 16 + cy)
        if f == 2:
            peca(q, lambda x, y: A(GRAMA.L, 120) if 10 < hyp(x - 2, (y - 3) * 1.6) < 13 else None, None)
    salvar("slack-off.png", frs, "icone", "1 nuvenzinha de preguiça com um z; 2 dois z; 3 três z e brilho verde em volta")


@golpe
def heal_pulse():
    frs = quadros(4, 48, 48)
    for f, q in enumerate(frs):
        s = [5, 7, 7, 7][f]
        peca(q, lambda x, y: (GRAMA.W if abs(x) < 1 and abs(y) < s - 2 else GRAMA.L) if (abs(x) < 2.5 and abs(y) < s) or (abs(y) < 2.5 and abs(x) < s) else None, GRAMA.O)
        for R in [[], [12], [12, 17], [17, 22]][f]:
            arco(q, 0, 0, R, 1.8, 0, TAU - 0.001, GRAMA)
    salvar("heal-pulse.png", frs, "pulso", "1 cruz verde; 2 primeira onda de pulso; 3 duas ondas; 4 ondas se afastando")


@golpe
def aqua_ring():
    frs = quadros(4, 56, 24)
    for f, q in enumerate(frs):
        for i in range(10):
            a = i * TAU / 10 + f * TAU / 40
            cx, cy = math.cos(a) * 22, math.sin(a) * 7
            r = 2.2 if i % 2 else 3
            if math.sin(a) < 0:
                r *= 0.8
            def fn(x, y, cx=cx, cy=cy, r=r):
                d = hyp(x - cx, y - cy)
                if d > r:
                    return None
                return AGUA.W if hyp(x - cx + r * 0.4, y - cy + r * 0.4) < r * 0.35 else AGUA.M if d > r - 1 else A(AGUA.L, 160)
            peca(q, fn, AGUA.D)
    salvar("aqua-ring.png", frs, "anel", "1-4 loop: anel achatado de bolhas d'água girando em volta do usuário (9°/quadro)")


@golpe
def soft_boiled():
    frs = quadros(4, 32, 32)
    for f, q in enumerate(frs):
        if f < 2:
            peca(q, lambda x, y: (OVO.W if hyp(x + 3, y + 5) < 2.4 else OVO.L if x < 2 else OVO.M) if (x / 8) ** 2 + ((y + (1.5 if y < 0 else 0)) / 10.5) ** 2 < 1 else None, OVO.O)
            if f == 1:
                for k in range(-7, 8):
                    q.set(16 + k, 16 + (1 if k % 4 < 2 else -1), OVO.O)
        else:
            dy = [0, 0, 4, 7][f]
            for s in (-1, 1):
                peca(q, lambda x, y, s=s: (OVO.L if x < 0 else OVO.M) if (x / 8) ** 2 + (((y - s * dy) + (1.5 if y < 0 else 0)) / 10.5) ** 2 < 1 and s * (y - s * dy) > 0 else None, OVO.O)
            peca(q, lambda x, y: (AMARELO.W if hyp(x, y) < 3 else AMARELO.L) if hyp(x, y) < star_r(ang(x, y), 8, 3, 8 if f == 2 else 11) else None, AMARELO.D)
    salvar("soft-boiled.png", frs, "icone", "1 ovo branco; 2 ovo racha no meio; 3 abre e brilha; 4 brilho grande saindo")


@golpe
def ingrain():
    frs = quadros(4, 48, 32)
    for f, q in enumerate(frs):
        k = (f + 1) / 4
        for x0, cx, ex in ((-6, -14, -18), (0, 2, 4), (6, 14, 20)):
            pts = [bezier((x0, -14), (cx, 0), (ex, 14), i / 30 * k) for i in range(31)]
            def fn(x, y, pts=pts):
                for i, (px, py) in enumerate(pts):
                    if hyp(x - px, y - py) < 2.2 - i / 30:
                        return MADEIRA.L if x < px else MADEIRA.M
                return None
            peca(q, fn, MADEIRA.O)
        peca(q, lambda x, y: A(PEDRA.M, 170) if ((x / 22) ** 2 + ((y + 14) / 2.5) ** 2) < 1 else None, None)
    salvar("ingrain.png", frs, "raizes", "1 raízes começam sob os pés; 2-3 crescem para baixo; 4 três raízes cravadas no chão")


@golpe
def wish():
    q = Q(32, 16)
    for i in range(6):
        q2 = Q(32, 16)
        peca(q2, lambda x, y, i=i: A(AMARELO.L, 220 - i * 30) if hyp(x + 4 + i * 3, y - i * 0.0) < 3 - i * 0.35 else None, None)
        q.stamp(q2)
    estrela5(q, 9, 0, 6, AMARELO)
    salvar("wish--estrela.png", [q], "projetil", "1 estrela cadente com rastro (o motor faz cair do céu no usuário)")


@golpe
def morning_sun():
    frs = quadros(4, 48, 32)
    for f, q in enumerate(frs):
        cy = [14, 8, 3, 0][f]
        def sol(x, y):
            d, a = hyp(x, y - cy), ang(x, y - cy)
            if y > 12:
                return None
            if d < 8:
                return AMARELO.W if d < 3 else AMARELO.L if d < 6 else LARANJA.L
            if f >= 2 and d < 13 and ((a * 12 / TAU) % 1) < 0.35:
                return LARANJA.M
            return None
        peca(q, sol, LARANJA.O)
        peca(q, lambda x, y: (LARANJA.D if y < 14 else LARANJA.O) if 12 < y < 15 and abs(x) < 23 else None, None)
    salvar("morning-sun.png", frs, "icone", "1 sol aparecendo no horizonte; 2 nascendo; 3 metade com raios; 4 sol inteiro laranja e amarelo")


@golpe
def milk_drink():
    frs = quadros(3, 24, 32)
    for f, q in enumerate(frs):
        def garrafa(x, y):
            if abs(x) < 6 and -2 < y < 13 and not (abs(x) > 5 and y > 12):
                if f >= 1 and y < -2 + f * 3:
                    return H("#e0e8f0")
                return BRANCO.W if x < -2 else BRANCO.L
            if abs(x) < 3.2 and -10 < y <= -2:
                return BRANCO.L
            if abs(x) < 3.8 and -12 <= y <= -10:
                return AZUL.M
            if abs(x) < 6.1 and 3 < y < 8:
                return AZUL.L
            return None
        peca(q, garrafa, BRANCO.O)
        if f == 2:
            for cx, cy in [(-9, -10), (9, -4), (-8, 6)]:
                faisca(q, cx, cy, 3, BRANCO)
    salvar("milk-drink.png", frs, "icone", "1 garrafa de leite cheia; 2 o leite baixa; 3 brilho branco em volta")


if __name__ == "__main__":
    for g in G:
        g()
    LOTE.finalizar(LOTES)
