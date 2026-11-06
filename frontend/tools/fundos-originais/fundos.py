"""Fundos de batalha originais em pixel art de DS (nenhum pixel vem dos jogos).

    python3 tools/fundos-originais/fundos.py

Cada bioma tem 3 layouts (sorteio com seed fixa) e, ao ar livre, 3 horários: dia, tarde e
noite. O céu é desenhado por horário; o resto da cena é desenhado de dia e tingido (tarde
quente, noite azulada), e as luzes (janelas, postes, lava, cristais) ficam numa camada à
parte que não escurece. Tamanho 256×184 (a proporção da arena, 1,4), horizonte na altura da
plataforma do inimigo.

Grava public/fundos/<bioma>-<layout>-<hora>.png, src/data/fundos.json (biomas e tipo → biomas)
e uma prancha de revisão em assets/fundos-originais/prancha.png.
"""
import json
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(RAIZ, "public", "fundos")
W, H = 256, 184
HOR = 60  # linha do horizonte
VARIANTES = 3
HORAS = ("dia", "tarde", "noite")


def C(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3)) + (255,)


# ---------- céu ----------
CEUS = {
    "dia": ["#68a8e8", "#80b8f0", "#98c8f8", "#b0d8f8", "#c8e8ff"],
    "tarde": ["#504890", "#8058a0", "#c06888", "#f08868", "#f8b880"],
    "noite": ["#060a20", "#0a1430", "#101c40", "#182850", "#223460"],
}


def ceu(img, hora, rnd, cores=None, ate=None):
    cores = [C(c) for c in (cores or CEUS[hora])]
    px = img.load()
    ate = ate or HOR + 30
    n = len(cores)
    for y in range(ate):
        t = y / ate * (n - 1)
        i = min(int(t), n - 2)
        f = t - i
        # transição em xadrez nas 3 linhas antes da troca de faixa
        for x in range(W):
            usa = cores[i + 1] if (f > 0.82 and (x + y) % 2 == 0) or f > 0.94 else cores[i]
            px[x, y] = usa
    if hora == "noite":
        for _ in range(70):
            x, y = rnd.randrange(W), rnd.randrange(ate - 10)
            px[x, y] = C("#ffffff") if rnd.random() < 0.3 else C("#a8b8e8")
            if rnd.random() < 0.08 and 1 <= x < W - 1 and y >= 1:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    px[x + dx, y + dy] = C("#8090c0")


def astro(d, hora, rnd, x=None, y=None):
    x = x if x is not None else rnd.randrange(30, 226)
    y = y if y is not None else rnd.randrange(10, 30)
    if hora == "dia":
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=C("#fff8c0"))
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=C("#ffffff"))
    elif hora == "tarde":
        y = HOR - 14
        d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=C("#f8c070"))
        d.ellipse([x - 10, y - 10, x + 10, y + 10], fill=C("#fff0b0"))
    else:
        d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=C("#f0f0d8"))
        d.ellipse([x - 4, y - 9, x + 10, y + 5], fill=C("#0a1430"))


def nuvens(d, rnd, n=4, hora="dia", ymax=None):
    base = {"dia": ("#ffffff", "#d8e8f8"), "tarde": ("#f8d0b0", "#c08890"), "noite": ("#384870", "#28385c")}[hora]
    for _ in range(n):
        x = rnd.randrange(-20, W)
        y = rnd.randrange(8, ymax or HOR - 16)
        larg = rnd.randrange(24, 52)
        for k in range(4):
            cx = x + k * larg / 4
            r = rnd.randrange(5, 10)
            d.ellipse([cx - r, y - r, cx + r, y + r * 0.6], fill=C(base[0]))
        d.rectangle([x - 4, y, x + larg + 6, y + 3], fill=C(base[1]))


# ---------- formas da paisagem ----------
def serra(d, rnd, ybase, amp, cor, borda=None, freq=(0.02, 0.05, 0.11), pico=False):
    fases = [rnd.uniform(0, 6.28) for _ in freq]
    pesos = [1.0, 0.5, 0.22]
    pts = [(0, H)]
    topo = []
    for x in range(0, W + 1, 2):
        v = sum(p * math.sin(x * f + ph) for f, ph, p in zip(freq, fases, pesos))
        if pico:
            v = abs(v) * 1.4 - 0.4
        y = ybase - amp * (0.5 + 0.5 * v / 1.72)
        pts.append((x, y))
        topo.append((x, y))
    pts.append((W, H))
    d.polygon(pts, fill=C(cor))
    if borda:
        d.line(topo, fill=C(borda), width=1)
    return topo


def neve_nos_picos(d, topo, cor="#f0f8ff", prof=6):
    ymin = min(y for _, y in topo)
    for (x1, y1), (x2, y2) in zip(topo, topo[1:]):
        if y1 < ymin + prof * 1.6:
            d.polygon([(x1, y1), (x2, y2), (x2, y2 + prof * 0.6), (x1, y1 + prof)], fill=C(cor))


def pinheiro(d, x, ybase, h, cor, sombra, tronco="#583818"):
    d.rectangle([x - 1, ybase - 3, x + 1, ybase], fill=C(tronco))
    for i in range(3):
        topo = ybase - h + i * h * 0.22
        larg = h * (0.22 + i * 0.12)
        d.polygon([(x, topo), (x - larg, topo + h * 0.42), (x + larg, topo + h * 0.42)], fill=C(cor))
        d.polygon([(x, topo), (x + larg, topo + h * 0.42), (x + larg * 0.35, topo + h * 0.42)], fill=C(sombra))


def arvore_redonda(d, x, ybase, r, cor, sombra, luz, tronco="#684020"):
    d.rectangle([x - 2, ybase - r, x + 2, ybase], fill=C(tronco))
    d.ellipse([x - r, ybase - r * 2.6, x + r, ybase - r * 0.7], fill=C(cor))
    d.ellipse([x - r * 0.2, ybase - r * 2.2, x + r, ybase - r * 0.7], fill=C(sombra))
    d.ellipse([x - r * 0.75, ybase - r * 2.45, x - r * 0.1, ybase - r * 1.8], fill=C(luz))


def linha_arvores(d, rnd, ybase, cores, tipo="pinheiro", dens=9, hmin=16, hmax=30):
    x = rnd.randrange(-6, 4)
    while x < W + 10:
        h = rnd.randrange(hmin, hmax)
        if tipo == "pinheiro":
            pinheiro(d, x, ybase + rnd.randrange(0, 4), h, cores[0], cores[1])
        else:
            arvore_redonda(d, x, ybase + rnd.randrange(0, 4), h // 3, cores[0], cores[1], cores[2])
        x += rnd.randrange(dens, dens + 8)


def chao_faixas(d, y0, cores, faixas=7, ondas=0.0, rnd=None):
    """Chão em perspectiva: faixas cada vez mais grossas para baixo."""
    y = y0
    i = 0
    alt = 3
    while y < H:
        cor = C(cores[i % len(cores)])
        if ondas and rnd:
            fase = rnd.uniform(0, 6.28)
            pts = [(0, H)] + [(x, y + math.sin(x * 0.06 + fase) * ondas) for x in range(0, W + 1, 4)] + [(W, H)]
            d.polygon(pts, fill=cor)
        else:
            d.rectangle([0, y, W, H], fill=cor)
        y += alt
        alt = int(alt * 1.45) + 1
        i += 1


def tufos(d, rnd, y0, n, cor, cor2):
    for _ in range(n):
        x = rnd.randrange(W)
        y = rnd.randrange(y0 + 4, H)
        s = 1 + (y - y0) / (H - y0) * 2.5
        for k, dx in enumerate((-1, 0, 1)):
            d.line([(x + dx * s, y), (x + dx * s * 1.6, y - 3 * s)], fill=C(cor if k != 1 else cor2), width=1)


def flores(d, rnd, y0, n, cores):
    for _ in range(n):
        x = rnd.randrange(W)
        y = rnd.randrange(y0 + 6, H)
        c = C(rnd.choice(cores))
        d.point([(x, y - 1), (x - 1, y), (x + 1, y), (x, y + 1)], fill=c)
        d.point([(x, y)], fill=C("#f8d020"))


def pedra(d, x, y, r, cor, sombra, luz):
    d.polygon([(x - r, y), (x - r * 0.7, y - r * 0.8), (x + r * 0.2, y - r), (x + r, y - r * 0.5), (x + r * 1.1, y)], fill=C(cor), outline=C(sombra))
    d.polygon([(x + r * 0.2, y - r), (x + r, y - r * 0.5), (x + r * 1.1, y), (x + r * 0.3, y)], fill=C(sombra))
    d.line([(x - r * 0.6, y - r * 0.7), (x + r * 0.1, y - r * 0.9)], fill=C(luz))


def pontos(d, rnd, y0, y1, n, cores):
    for _ in range(n):
        d.point([(rnd.randrange(W), rnd.randrange(y0, y1))], fill=C(rnd.choice(cores)))


def predios(d, luz, rnd, ybase, cores, janela="#f8e080", acesas=0.4, hmin=20, hmax=56, larg=(14, 28)):
    x = rnd.randrange(-8, 0)
    while x < W:
        w = rnd.randrange(*larg)
        h = rnd.randrange(hmin, hmax)
        cor = rnd.choice(cores)
        d.rectangle([x, ybase - h, x + w, ybase], fill=C(cor))
        d.line([(x + w, ybase - h), (x + w, ybase)], fill=C("#202030"))
        for wy in range(ybase - h + 4, ybase - 4, 6):
            for wx in range(x + 3, x + w - 3, 5):
                if rnd.random() < acesas:
                    luz.rectangle([wx, wy, wx + 2, wy + 2], fill=C(janela))
                else:
                    d.rectangle([wx, wy, wx + 2, wy + 2], fill=C("#283048"))
        x += w + rnd.randrange(0, 4)


def estalactites(d, rnd, cor, sombra, n=14, hmax=28):
    for _ in range(n):
        x = rnd.randrange(W)
        h = rnd.randrange(8, hmax)
        w = rnd.randrange(4, 9)
        d.polygon([(x - w, 0), (x + w, 0), (x + rnd.randrange(-2, 3), h)], fill=C(cor))
        d.polygon([(x, 0), (x + w, 0), (x + 1, h)], fill=C(sombra))


def parede_caverna(d, rnd, cores, ybase=HOR + 8):
    d.rectangle([0, 0, W, H], fill=C(cores[0]))
    for i in range(40):
        x, y = rnd.randrange(W), rnd.randrange(ybase)
        r = rnd.randrange(6, 18)
        d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=C(cores[1 + i % 2]))


# ---------- biomas ----------
# Cada bioma: fn(rnd, hora, cena, luz) desenha a cena (ImageDraw da camada tingida) e as
# luzes (camada que não escurece). Ao ar livre usa o céu do horário.
BIOMAS = {}


def bioma(nome, horas=HORAS, ceu_proprio=False):
    def reg(fn):
        BIOMAS[nome] = {"fn": fn, "horas": list(horas), "ceu": not ceu_proprio}
        return fn
    return reg


@bioma("pradaria")
def pradaria(rnd, hora, d, luz):
    serra(d, rnd, HOR, 22, "#88b8d8", "#a8d0e8")
    serra(d, rnd, HOR + 2, 12, "#58a048", "#78c060")
    if rnd.random() < 0.6:
        linha_arvores(d, rnd, HOR + 4, ("#387830", "#285820", "#58a040"), "redonda", dens=10, hmin=12, hmax=20)
    chao_faixas(d, HOR + 4, ["#78c050", "#70b848", "#80c858", "#68b040"])
    tufos(d, rnd, HOR + 4, 70, "#508830", "#90d060")
    flores(d, rnd, HOR + 4, 22, ["#ffffff", "#f8f040", "#f8a0c0"])


@bioma("estrada")
def estrada(rnd, hora, d, luz):
    serra(d, rnd, HOR, 18, "#90b8d0", "#b0d0e0")
    linha_arvores(d, rnd, HOR + 3, ("#3c7c34", "#2a5a22", "#5aa444"), "redonda", dens=8, hmin=12, hmax=21)
    chao_faixas(d, HOR + 3, ["#80c050", "#78b848", "#88c858"])
    cx = rnd.randrange(90, 170)
    d.polygon([(cx - 6, HOR + 3), (cx + 6, HOR + 3), (cx + 70, H), (cx - 70, H)], fill=C("#d8c090"))
    d.polygon([(cx - 3, HOR + 3), (cx + 3, HOR + 3), (cx + 30, H), (cx - 30, H)], fill=C("#e0cca0"))
    pontos(d, rnd, HOR + 8, H, 40, ["#b8a070"])
    for i in range(6):
        y = HOR + 10 + i * i * 4
        if y < H:
            d.rectangle([12, y, 14 + i, y + 3 + i], fill=C("#a07848"))
            d.rectangle([W - 16 - i, y, W - 14, y + 3 + i], fill=C("#a07848"))
    tufos(d, rnd, HOR + 4, 40, "#508830", "#90d060")


@bioma("cidade")
def cidade(rnd, hora, d, luz):
    predios(d, luz, rnd, HOR + 4, ["#a0a8c0", "#b8b0a8", "#9098b0", "#c0b8b0"], acesas=0.05 if hora == "dia" else 0.45)
    d.rectangle([0, HOR + 4, W, H], fill=C("#a8a8a8"))
    chao_faixas(d, HOR + 8, ["#b0b0b0", "#a0a0a0"])
    d.rectangle([0, HOR + 4, W, HOR + 9], fill=C("#c8c0b8"))
    d.line([(0, HOR + 9), (W, HOR + 9)], fill=C("#807870"))
    for k in range(0, W, 8):
        d.line([(k, HOR + 4), (k, HOR + 9)], fill=C("#b0a8a0"))
    yf = HOR + 40 + rnd.randrange(0, 30)
    for x in range(rnd.randrange(0, 20), W, 22):
        d.rectangle([x, yf, x + 12, yf + 3], fill=C("#e8e8e0"))
    cx = rnd.randrange(40, W - 40)
    for k in range(6):
        d.rectangle([cx - 30 + k * 11, HOR + 14, cx - 24 + k * 11, HOR + 26], fill=C("#e8e8e0"))
    for i in range(4):
        x = 20 + i * 70 + rnd.randrange(-6, 6)
        d.rectangle([x, HOR - 14, x + 1, HOR + 8], fill=C("#404858"))
        d.rectangle([x - 2, HOR - 16, x + 3, HOR - 14], fill=C("#404858"))
        if hora != "dia":
            luz.rectangle([x - 1, HOR - 14, x + 2, HOR - 13], fill=C("#fff0a0"))


@bioma("vulcao")
def vulcao(rnd, hora, d, luz):
    topo = serra(d, rnd, HOR + 2, 46, "#584038", "#706050", freq=(0.018, 0.04, 0.09), pico=True)
    xm, ym = min(topo, key=lambda p: p[1])
    luz.polygon([(xm - 6, ym + 1), (xm + 6, ym + 1), (xm + 2, ym + 30), (xm - 3, ym + 18)], fill=C("#f86818"))
    luz.line([(xm, ym + 2), (xm + 1, ym + 26)], fill=C("#ffd040"))
    for _ in range(5):
        r = rnd.randrange(4, 9)
        x = xm + rnd.randrange(-14, 14)
        y = ym - rnd.randrange(6, 22)
        d.ellipse([x - r, y - r, x + r, y + r], fill=C("#605858"))
    chao_faixas(d, HOR + 4, ["#504038", "#584840", "#483830"])
    for _ in range(5):
        x, y = rnd.randrange(W), rnd.randrange(HOR + 12, H)
        pts = [(x, y)]
        for k in range(5):
            pts.append((pts[-1][0] + rnd.randrange(4, 12), pts[-1][1] + rnd.randrange(-3, 4)))
        luz.line(pts, fill=C("#f86020"), width=2)
        luz.line(pts, fill=C("#ffc040"), width=1)
    for _ in range(8):
        pedra(d, rnd.randrange(W), rnd.randrange(HOR + 10, H), rnd.randrange(3, 8), "#605048", "#403028", "#807060")


@bioma("deserto")
def deserto(rnd, hora, d, luz):
    serra(d, rnd, HOR, 20, "#d8a868", "#e8c088", freq=(0.015, 0.03, 0.07))
    serra(d, rnd, HOR + 6, 12, "#e0b070", "#f0c890", freq=(0.02, 0.045, 0.09))
    chao_faixas(d, HOR + 6, ["#e8c080", "#e0b878", "#f0c888"], ondas=1.5, rnd=rnd)
    pontos(d, rnd, HOR + 8, H, 60, ["#c89858", "#f8d8a0"])
    for _ in range(rnd.randrange(1, 4)):
        x, y = rnd.randrange(10, W - 10), rnd.randrange(HOR + 10, H - 30)
        h = 14 + (y - HOR) // 4
        d.rectangle([x - 2, y - h, x + 2, y], fill=C("#589040"))
        d.rectangle([x - 7, y - h * 0.7, x - 5, y - h * 0.35], fill=C("#589040"))
        d.rectangle([x - 7, y - h * 0.4, x - 2, y - h * 0.35], fill=C("#589040"))
        d.rectangle([x + 5, y - h * 0.8, x + 7, y - h * 0.5], fill=C("#589040"))
        d.rectangle([x + 2, y - h * 0.55, x + 7, y - h * 0.5], fill=C("#589040"))
        d.line([(x + 1, y - h), (x + 1, y)], fill=C("#407030"))


@bioma("canion")
def canion(rnd, hora, d, luz):
    for i in range(3):
        x0 = rnd.randrange(-20, W - 60)
        w = rnd.randrange(50, 110)
        h = rnd.randrange(24, 46)
        cor = ["#c07050", "#b06040", "#d08060"][i]
        d.polygon([(x0, HOR + 4), (x0 + 6, HOR + 4 - h), (x0 + w - 6, HOR + 4 - h), (x0 + w, HOR + 4)], fill=C(cor))
        for k in range(3):
            yy = HOR + 4 - h + 6 + k * 9
            d.line([(x0 + 4, yy), (x0 + w - 4, yy)], fill=C("#904830"))
        d.rectangle([x0 + 6, HOR + 4 - h, x0 + w - 6, HOR + 4 - h + 1], fill=C("#e0a078"))
    chao_faixas(d, HOR + 4, ["#c88058", "#d08860", "#c07850"])
    for _ in range(10):
        pedra(d, rnd.randrange(W), rnd.randrange(HOR + 10, H), rnd.randrange(3, 9), "#b06848", "#804028", "#d89070")


@bioma("praia")
def praia(rnd, hora, d, luz):
    d.rectangle([0, HOR - 2, W, HOR + 26], fill=C("#3888d0"))
    for y in range(HOR, HOR + 26, 4):
        for x in range(rnd.randrange(0, 12), W, rnd.randrange(14, 24)):
            d.line([(x, y), (x + 5, y)], fill=C("#78b8f0"))
    pts = [(0, H)] + [(x, HOR + 24 + math.sin(x * 0.05) * 3 + x * 0.05) for x in range(0, W + 1, 4)] + [(W, H)]
    d.polygon(pts, fill=C("#f0d8a0"))
    d.line(pts[1:-1], fill=C("#ffffff"), width=2)
    pontos(d, rnd, HOR + 30, H, 50, ["#d8b878", "#f8e8c0"])
    for _ in range(rnd.randrange(1, 3)):
        x = rnd.choice([rnd.randrange(8, 50), rnd.randrange(W - 50, W - 8)])
        y = rnd.randrange(HOR + 40, H - 30)
        for k in range(14):
            d.rectangle([x + k * 0.4, y - k * 3, x + 3 + k * 0.4, y - k * 3 + 3], fill=C("#a07040" if k % 2 else "#886030"))
        tx, ty = x + 6, y - 42
        for a in (-2.6, -2.0, -1.2, -0.5, 0.2):
            d.line([(tx, ty), (tx + math.cos(a) * 16, ty + math.sin(a) * 9 + 6)], fill=C("#409040"), width=3)


@bioma("mar")
def mar(rnd, hora, d, luz):
    for i, y in enumerate(range(HOR - 2, H, 6)):
        d.rectangle([0, y, W, H], fill=C(["#2878c8", "#3080d0", "#2870c0", "#3888d8"][i % 4]))
        for x in range(rnd.randrange(0, 20), W, rnd.randrange(18, 34)):
            d.line([(x, y + 2), (x + 4 + i, y + 2)], fill=C("#88c8f8"))
    for _ in range(rnd.randrange(1, 3)):
        x, y = rnd.randrange(20, W - 20), rnd.randrange(HOR + 20, H - 20)
        r = 8 + (y - HOR) // 6
        pedra(d, x, y, r, "#706860", "#484040", "#989088")
        d.line([(x - r - 2, y), (x + r + 3, y)], fill=C("#ffffff"), width=2)


@bioma("lago")
def lago(rnd, hora, d, luz):
    serra(d, rnd, HOR - 4, 26, "#7098b8", "#90b8d0")
    linha_arvores(d, rnd, HOR, ("#306838", "#204828", "#508850"), "pinheiro", dens=6, hmin=14, hmax=24)
    chao_faixas(d, HOR, ["#68a850", "#60a048"])
    tufos(d, rnd, HOR + 2, 30, "#407830", "#80c060")
    d.ellipse([20, HOR + 8, W - 20, H + 40], fill=C("#4890d0"))
    d.ellipse([30, HOR + 12, W - 30, H + 30], fill=C("#58a0e0"))
    for _ in range(14):
        x, y = rnd.randrange(40, W - 40), rnd.randrange(HOR + 14, H - 4)
        d.line([(x, y), (x + 6, y)], fill=C("#a8d8f8"))


@bioma("usina")
def usina(rnd, hora, d, luz):
    for i in range(rnd.randrange(2, 4)):
        x = rnd.randrange(20, W - 40)
        h = rnd.randrange(30, 50)
        d.polygon([(x, HOR + 4), (x + 4, HOR + 4 - h), (x + 14, HOR + 4 - h), (x + 18, HOR + 4)], fill=C("#a0a0a8"))
        d.rectangle([x + 4, HOR + 4 - h, x + 14, HOR + 6 - h], fill=C("#d0d0d8"))
    d.rectangle([0, HOR - 8, W, HOR + 4], fill=C("#808890"))
    for x in range(0, W, 12):
        d.rectangle([x + 2, HOR - 6, x + 8, HOR - 2], fill=C("#606870"))
        if rnd.random() < 0.5:
            luz.rectangle([x + 3, HOR - 5, x + 7, HOR - 3], fill=C("#f8f070"))
    for i in range(3):
        x = 30 + i * 90 + rnd.randrange(-10, 10)
        d.line([(x, HOR - 34), (x - 8, HOR + 4)], fill=C("#505058"))
        d.line([(x, HOR - 34), (x + 8, HOR + 4)], fill=C("#505058"))
        d.line([(x - 10, HOR - 26), (x + 10, HOR - 26)], fill=C("#505058"))
        if i < 2:
            d.line([(x + 10, HOR - 26), (x + 80, HOR - 24)], fill=C("#303038"))
    chao_faixas(d, HOR + 4, ["#787880", "#707078", "#808088"])
    for y in range(HOR + 12, H, 16):
        d.line([(0, y), (W, y)], fill=C("#f8d020"))
    for _ in range(6):
        x, y = rnd.randrange(W), rnd.randrange(HOR + 10, H)
        luz.line([(x, y), (x + 3, y - 3), (x + 1, y - 4), (x + 4, y - 8)], fill=C("#fff8a0"))


@bioma("floresta")
def floresta(rnd, hora, d, luz):
    linha_arvores(d, rnd, HOR - 4, ("#2c6030", "#1c4020", "#3c7840"), "pinheiro", dens=5, hmin=26, hmax=40)
    linha_arvores(d, rnd, HOR + 4, ("#387838", "#285828", "#58a050"), "pinheiro", dens=7, hmin=22, hmax=34)
    chao_faixas(d, HOR + 4, ["#589840", "#509038", "#60a048"])
    tufos(d, rnd, HOR + 4, 60, "#3c7828", "#78b850")
    for _ in range(8):
        x, y = rnd.randrange(W), rnd.randrange(HOR + 10, H)
        d.ellipse([x - 3, y - 2, x + 3, y + 1], fill=C("#407830"))
    if hora == "noite":
        for _ in range(12):
            luz.point([(rnd.randrange(W), rnd.randrange(HOR - 20, H))], fill=C("#d0ff80"))


@bioma("jardim")
def jardim(rnd, hora, d, luz):
    serra(d, rnd, HOR, 14, "#90c0d8", "#b0d8e8")
    linha_arvores(d, rnd, HOR + 2, ("#48903c", "#30682c", "#68b050"), "redonda", dens=12, hmin=12, hmax=20)
    chao_faixas(d, HOR + 2, ["#80c858", "#78c050"])
    for _ in range(rnd.randrange(10, 16)):
        cx, cy = rnd.randrange(W), rnd.randrange(HOR + 10, H)
        s_ = 1 + (cy - HOR) / 50
        cor = rnd.choice(["#f85878", "#f8d030", "#f8f8f8", "#c070f0", "#f89030", "#58a0f8"])
        d.ellipse([cx - 9 * s_, cy - 3 * s_, cx + 9 * s_, cy + 3 * s_], fill=C("#58a040"))
        for _k in range(int(6 * s_)):
            x = cx + rnd.uniform(-7, 7) * s_
            y = cy + rnd.uniform(-2.5, 2) * s_
            r = max(1, s_)
            d.ellipse([x - r, y - r, x + r, y + r], fill=C(cor))
            d.point([(x, y)], fill=C("#f8f070"))
    tufos(d, rnd, HOR + 4, 30, "#509040", "#90d060")


@bioma("caverna-gelo", horas=("dia",), ceu_proprio=True)
def caverna_gelo(rnd, hora, d, luz):
    parede_caverna(d, rnd, ["#5888b0", "#6898c0", "#4878a0"])
    estalactites(d, rnd, "#a8d8f0", "#78b0d8", n=16)
    for _ in range(6):
        x = rnd.randrange(W)
        h = rnd.randrange(14, 34)
        luz.polygon([(x - 5, HOR + 10), (x + 5, HOR + 10), (x + 1, HOR + 10 - h)], fill=C("#d8f8ff"))
        luz.polygon([(x, HOR + 10), (x + 5, HOR + 10), (x + 1, HOR + 10 - h)], fill=C("#90d0f0"))
    chao_faixas(d, HOR + 8, ["#c8e8f8", "#b8d8f0", "#d8f0ff"])
    for _ in range(14):
        x, y = rnd.randrange(W), rnd.randrange(HOR + 14, H)
        d.line([(x, y), (x + rnd.randrange(6, 16), y)], fill=C("#ffffff"))


@bioma("montanha-neve")
def montanha_neve(rnd, hora, d, luz):
    topo = serra(d, rnd, HOR, 44, "#7888a8", "#98a8c8", pico=True)
    neve_nos_picos(d, topo)
    linha_arvores(d, rnd, HOR + 4, ("#305848", "#203c30", "#507868"), "pinheiro", dens=7, hmin=14, hmax=22)
    chao_faixas(d, HOR + 4, ["#f0f8ff", "#e0ecf8", "#f8fcff"])
    for _ in range(30):
        x, y = rnd.randrange(W), rnd.randrange(HOR + 8, H)
        d.point([(x, y)], fill=C("#c0d0e8"))
    for _ in range(40 if hora != "dia" else 25):
        x, y = rnd.randrange(W), rnd.randrange(H)
        d.point([(x, y), (x + 1, y)], fill=C("#ffffff"))


@bioma("dojo", horas=("dia",), ceu_proprio=True)
def dojo(rnd, hora, d, luz):
    parede, piso = rnd.choice([("#d8c0a0", ("#c8a870", "#d0b078")), ("#b8c8a0", ("#b0b878", "#b8c080")), ("#e0c8c0", ("#c89870", "#d0a078"))])
    d.rectangle([0, 0, W, HOR + 6], fill=C(parede))
    for x in range(rnd.randrange(-20, 0), W, 40):
        d.rectangle([x, 0, x + 3, HOR + 6], fill=C("#704828"))
        d.rectangle([x + 8, 10, x + 32, HOR - 8], fill=C("#f0e8d8"))
        d.line([(x + 20, 10), (x + 20, HOR - 8)], fill=C("#a08060"))
        d.line([(x + 8, 28), (x + 32, 28)], fill=C("#a08060"))
    d.rectangle([0, 0, W, 6], fill=C("#603818"))
    cx = W // 2 + rnd.randrange(-40, 40)
    d.rectangle([cx - 18, 14, cx + 18, 40], fill=C("#f8f0e0"), outline=C("#603818"))
    for k in range(3):
        d.line([(cx - 8 + k * 7, 18), (cx - 10 + k * 8, 36)], fill=C("#202020"), width=2)
    for i, y in enumerate(range(HOR + 6, H, 12)):
        d.rectangle([0, y, W, y + 11], fill=C(piso[i % 2]))
        d.line([(0, y), (W, y)], fill=C("#987848"))
    d.rectangle([0, HOR + 6, W, HOR + 8], fill=C("#603818"))


@bioma("pantano")
def pantano(rnd, hora, d, luz):
    linha_arvores(d, rnd, HOR, ("#384838", "#283428", "#506050"), "redonda", dens=9, hmin=16, hmax=26)
    chao_faixas(d, HOR + 2, ["#504868", "#585070", "#484060"])
    for _ in range(6):
        x, y = rnd.randrange(W), rnd.randrange(HOR + 10, H - 6)
        r = 8 + (y - HOR) // 5
        d.ellipse([x - r * 2, y - r * 0.4, x + r * 2, y + r * 0.4], fill=C("#7050a0"))
        d.ellipse([x - r * 1.6, y - r * 0.25, x + r * 1.2, y + r * 0.2], fill=C("#8868b8"))
    for _ in range(12):
        x, y = rnd.randrange(W), rnd.randrange(HOR + 10, H)
        luz.ellipse([x - 1, y - 1, x + 1, y + 1], fill=C("#c890f0"))
    tufos(d, rnd, HOR + 4, 40, "#405030", "#708050")
    for y in range(HOR - 10, HOR + 30, 3):
        for x in range(0, W, 2):
            if (x + y) % 4 == 0 and rnd.random() < 0.3:
                d.point([(x, y)], fill=C("#a090c0", 255))


@bioma("picos")
def picos(rnd, hora, d, luz):
    nuvens(d, rnd, 3, hora, ymax=HOR - 20)
    for i in range(3):
        x = rnd.randrange(10, W - 30)
        w = rnd.randrange(14, 26)
        d.rectangle([x, HOR - 40 + i * 6, x + w, H], fill=C(["#9098a8", "#a0a8b8", "#8890a0"][i]))
        d.rectangle([x, HOR - 40 + i * 6, x + 2, H], fill=C("#c0c8d8"))
    base = {"dia": "#f8f8ff", "tarde": "#f8d8c8", "noite": "#405078"}[hora]
    for k in range(5):
        y = HOR + k * 12
        for x in range(-10, W + 10, 22):
            r = rnd.randrange(10, 18)
            d.ellipse([x - r, y - r * 0.5, x + r, y + r * 0.5], fill=C(base))
    chao_faixas(d, HOR + 20, ["#b8b8c8", "#a8a8b8"])
    for y in range(HOR + 24, H, 12):
        for x in range(-((y // 12) % 2) * 10, W, 20):
            d.rectangle([x, y, x + 18, y + 10], outline=C("#9090a0"))


@bioma("templo", horas=("dia",), ceu_proprio=True)
def templo(rnd, hora, d, luz):
    parede, coluna, piso = rnd.choice([("#503868", "#d0b8e0", ("#c8b0d8", "#b8a0c8")), ("#283860", "#b8c8e8", ("#a8b8d8", "#98a8c8")), ("#604030", "#e8d0a8", ("#d8c0a0", "#c8b090"))])
    d.rectangle([0, 0, W, HOR + 6], fill=C(parede))
    passo = rnd.choice([40, 48, 56])
    for x in range(rnd.randrange(0, 20), W, passo):
        d.rectangle([x, 8, x + 12, HOR + 6], fill=C(coluna))
        d.rectangle([x - 2, 6, x + 14, 10], fill=C("#e8d8f0"))
        d.rectangle([x + 8, 10, x + 12, HOR + 6], fill=C("#a890c0"))
    cx = W // 2 + rnd.randrange(-30, 30)
    luz.ellipse([cx - 14, 14, cx + 14, 42], fill=C("#f8a0e8"))
    luz.ellipse([cx - 8, 20, cx + 8, 36], fill=C("#fff0ff"))
    for i, y in enumerate(range(HOR + 6, H, 10)):
        for x in range(-(i % 2) * 12, W, 24):
            d.rectangle([x, y, x + 23, y + 9], fill=C(piso[(x // 24 + i) % 2]))
    for _ in range(10):
        luz.point([(rnd.randrange(W), rnd.randrange(HOR))], fill=C("#f8d0f8"))


@bioma("cosmo", horas=("noite",))
def cosmo(rnd, hora, d, luz):
    for _ in range(3):
        x, y, r = rnd.randrange(W), rnd.randrange(HOR - 10), rnd.randrange(8, 20)
        d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=C("#6040a0"))
    for _ in range(rnd.randrange(1, 3)):
        x, y, r = rnd.randrange(20, W - 20), rnd.randrange(8, HOR - 20), rnd.randrange(5, 11)
        luz.ellipse([x - r, y - r, x + r, y + r], fill=C(rnd.choice(["#f8a0c8", "#a0d8f8", "#f8e0a0"])))
        luz.ellipse([x - r - 4, y - 1, x + r + 4, y + 1], fill=C("#f0d0ff"))
    for k in range(6):
        y = HOR + 8 + k * k * 4
        if y > H:
            break
        d.ellipse([W // 2 - 40 - k * 30, y - 2 - k, W // 2 + 40 + k * 30, y + 2 + k], outline=C("#c070e0"))
    chao_faixas(d, HOR + 6, ["#302060", "#382868", "#281858"])
    for _ in range(30):
        luz.point([(rnd.randrange(W), rnd.randrange(HOR + 6, H))], fill=C("#e0b0ff"))


@bioma("bosque-cogumelos")
def bosque_cogumelos(rnd, hora, d, luz):
    linha_arvores(d, rnd, HOR - 2, ("#3a6a30", "#284c22", "#50883c"), "redonda", dens=7, hmin=24, hmax=34)
    chao_faixas(d, HOR + 2, ["#608838", "#588030", "#689040"])
    for _ in range(rnd.randrange(6, 10)):
        x, y = rnd.randrange(W), rnd.randrange(HOR + 8, H - 4)
        s = 2 + (y - HOR) / 30
        cor = rnd.choice(["#e04040", "#f0a030", "#b060e0"])
        d.rectangle([x - s, y - s * 3, x + s, y], fill=C("#f0e8d0"))
        d.ellipse([x - s * 3, y - s * 5, x + s * 3, y - s * 2.2], fill=C(cor))
        d.ellipse([x - s * 1.5, y - s * 4.4, x - s * 0.5, y - s * 3.6], fill=C("#ffffff"))
        if hora == "noite":
            luz.ellipse([x - s * 3, y - s * 5, x + s * 3, y - s * 2.2], fill=C(cor))
    tufos(d, rnd, HOR + 4, 50, "#406828", "#80a850")


@bioma("caverna", horas=("dia",), ceu_proprio=True)
def caverna(rnd, hora, d, luz):
    parede_caverna(d, rnd, ["#584838", "#685848", "#483828"])
    estalactites(d, rnd, "#706050", "#504030")
    for _ in range(5):
        x = rnd.randrange(W)
        h = rnd.randrange(10, 24)
        d.polygon([(x - 6, HOR + 10), (x + 6, HOR + 10), (x, HOR + 10 - h)], fill=C("#605040"))
    chao_faixas(d, HOR + 8, ["#786858", "#706050", "#806e5c"])
    for _ in range(12):
        pedra(d, rnd.randrange(W), rnd.randrange(HOR + 14, H), rnd.randrange(3, 8), "#685848", "#483828", "#887868")


@bioma("pedreira")
def pedreira(rnd, hora, d, luz):
    serra(d, rnd, HOR + 2, 34, "#908070", "#a89888", freq=(0.03, 0.08, 0.16))
    serra(d, rnd, HOR + 6, 16, "#a09080", "#b8a898", freq=(0.04, 0.1, 0.2))
    chao_faixas(d, HOR + 6, ["#a89880", "#a09078", "#b0a088"])
    for _ in range(16):
        y = rnd.randrange(HOR + 10, H)
        pedra(d, rnd.randrange(W), y, 3 + (y - HOR) // 14, "#988878", "#706050", "#c0b0a0")


@bioma("cemiterio", horas=("tarde", "noite"))
def cemiterio(rnd, hora, d, luz):
    linha_arvores(d, rnd, HOR, ("#303040", "#202030", "#404050"), "pinheiro", dens=12, hmin=16, hmax=26)
    x = rnd.randrange(40, W - 60)
    d.rectangle([x, HOR - 44, x + 22, HOR + 2], fill=C("#504860"))
    d.polygon([(x - 3, HOR - 44), (x + 25, HOR - 44), (x + 11, HOR - 60)], fill=C("#403850"))
    for k in range(3):
        luz.rectangle([x + 8, HOR - 38 + k * 12, x + 13, HOR - 33 + k * 12], fill=C("#a0f0c0") if k == 1 else C("#605870"))
    chao_faixas(d, HOR + 2, ["#486048", "#405840", "#506850"])
    for row in range(4):
        y = HOR + 14 + row * row * 6 + row * 8
        s = 1 + row * 0.6
        for xx in range(rnd.randrange(0, 20), W, int(34 + row * 8)):
            d.rectangle([xx - 4 * s, y - 9 * s, xx + 4 * s, y], fill=C("#909098"))
            d.ellipse([xx - 4 * s, y - 12 * s, xx + 4 * s, y - 6 * s], fill=C("#909098"))
            d.line([(xx - 4 * s, y - 9 * s), (xx - 4 * s, y)], fill=C("#b0b0b8"))
    for _ in range(6):
        xx, yy = rnd.randrange(W), rnd.randrange(HOR, H)
        luz.ellipse([xx - 2, yy - 2, xx + 2, yy + 2], fill=C("#80f0b0"))


@bioma("ruinas")
def ruinas(rnd, hora, d, luz):
    serra(d, rnd, HOR, 30, "#706880", "#887ea0", pico=True)
    for _ in range(rnd.randrange(3, 6)):
        x = rnd.randrange(W)
        h = rnd.randrange(14, 40)
        d.rectangle([x, HOR + 4 - h, x + 9, HOR + 4], fill=C("#b0a088"))
        d.rectangle([x + 6, HOR + 4 - h, x + 9, HOR + 4], fill=C("#907c68"))
        d.rectangle([x - 2, HOR + 4 - h - 3, x + 11, HOR + 4 - h], fill=C("#c8b8a0"))
    chao_faixas(d, HOR + 4, ["#a09070", "#988868", "#a89878"])
    for y in range(HOR + 10, H, 14):
        for x in range(-((y // 14) % 2) * 12, W, 24):
            d.rectangle([x, y, x + 22, y + 12], outline=C("#887858"))
    tufos(d, rnd, HOR + 6, 30, "#607040", "#90a060")


@bioma("caverna-cristal", horas=("dia",), ceu_proprio=True)
def caverna_cristal(rnd, hora, d, luz):
    parede_caverna(d, rnd, ["#302048", "#382858", "#281840"])
    estalactites(d, rnd, "#403060", "#281848")
    for _ in range(9):
        x = rnd.randrange(W)
        y = rnd.choice([rnd.randrange(HOR - 20, HOR + 10), rnd.randrange(HOR + 20, H)])
        h = rnd.randrange(10, 28)
        a = rnd.uniform(-0.4, 0.4)
        cor = rnd.choice([("#a070f8", "#d8b8ff"), ("#58c8f0", "#c0f0ff"), ("#f070c0", "#ffc0e8")])
        pts = [(x - 4, y), (x + 4, y), (x + 2 + math.sin(a) * h, y - h), (x - 2 + math.sin(a) * h, y - h + 3)]
        luz.polygon(pts, fill=C(cor[0]))
        luz.line([pts[1], pts[2]], fill=C(cor[1]))
    chao_faixas(d, HOR + 8, ["#403058", "#382850", "#483860"])


@bioma("cidade-noturna", horas=("noite",))
def cidade_noturna(rnd, hora, d, luz):
    predios(d, luz, rnd, HOR + 4, ["#283048", "#303850", "#202838"], janela="#f8c850", acesas=0.5, hmin=30, hmax=60)
    d.rectangle([0, HOR + 4, W, H], fill=C("#303038"))
    chao_faixas(d, HOR + 6, ["#383840", "#303038"])
    for i in range(5):
        x = 10 + i * 56
        d.rectangle([x, HOR - 6, x + 1, HOR + 10], fill=C("#202028"))
        luz.ellipse([x - 3, HOR - 9, x + 4, HOR - 4], fill=C("#f8e8a0"))
        for k in range(6):
            luz.point([(x - 4 + k * 2, HOR + 12 + k)], fill=C("#605840"))
    for _ in range(4):
        x = rnd.randrange(W)
        luz.rectangle([x, HOR - 30, x + 14, HOR - 24], fill=C(rnd.choice(["#f840a0", "#40d8f8", "#a0f840"])))


@bioma("fabrica", horas=("dia",), ceu_proprio=True)
def fabrica(rnd, hora, d, luz):
    d.rectangle([0, 0, W, HOR + 6], fill=C("#606878"))
    for x in range(0, W, 32):
        d.rectangle([x, 0, x + 2, HOR + 6], fill=C("#404858"))
    for i in range(3):
        cx, cy = rnd.randrange(20, W - 20), rnd.randrange(14, HOR - 14)
        r = rnd.randrange(8, 16)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C("#8890a0"), outline=C("#404858"))
        for k in range(8):
            a = k * math.tau / 8
            d.rectangle([cx + math.cos(a) * r - 2, cy + math.sin(a) * r - 2, cx + math.cos(a) * r + 2, cy + math.sin(a) * r + 2], fill=C("#8890a0"))
        d.ellipse([cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4], fill=C("#404858"))
    d.rectangle([0, 18, W, 21], fill=C("#a0a8b8"))
    for x in range(rnd.randrange(0, 30), W, 50):
        luz.rectangle([x, 26, x + 8, 30], fill=C("#f8f0a0"))
    for i, y in enumerate(range(HOR + 6, H, 10)):
        d.rectangle([0, y, W, y + 9], fill=C("#8890a0" if i % 2 else "#808898"))
        for x in range(i % 2 * 6, W, 12):
            d.point([(x, y + 4)], fill=C("#a8b0c0"))
    d.rectangle([0, HOR + 6, W, HOR + 8], fill=C("#f8c020"))


@bioma("jardim-encantado")
def jardim_encantado(rnd, hora, d, luz):
    linha_arvores(d, rnd, HOR, ("#58a070", "#408058", "#80c890"), "redonda", dens=10, hmin=16, hmax=26)
    chao_faixas(d, HOR + 2, ["#90d098", "#88c890", "#98d8a0"])
    for _ in range(rnd.randrange(2, 4)):
        x, y = rnd.randrange(20, W - 20), rnd.randrange(HOR + 6, HOR + 40)
        for k in range(8):
            a = k * math.tau / 8
            d.ellipse([x + math.cos(a) * 6 - 3, y + math.sin(a) * 3 - 2, x + math.cos(a) * 6 + 3, y + math.sin(a) * 3 + 2], fill=C("#f8a8d0"))
        d.ellipse([x - 2, y - 1, x + 2, y + 1], fill=C("#f8f080"))
    flores(d, rnd, HOR + 4, 40, ["#f8a8d8", "#ffffff", "#d0a8f8"])
    for _ in range(26):
        x, y = rnd.randrange(W), rnd.randrange(H)
        luz.point([(x, y)], fill=C("#fff0ff"))
        if rnd.random() < 0.3:
            luz.point([(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=C("#f8c8f0"))


@bioma("salao-liga", horas=("dia",), ceu_proprio=True)
def salao_liga(rnd, hora, d, luz):
    parede, estandarte, piso = rnd.choice([("#302040", "#c02030", ("#d8c890", "#c8b880")), ("#182838", "#2050c0", ("#c0c8d8", "#b0b8c8")), ("#301818", "#d0a020", ("#a07850", "#906840"))])
    d.rectangle([0, 0, W, HOR + 6], fill=C(parede))
    for x in range(0, W, 36):
        d.rectangle([x + 4, 0, x + 14, HOR + 6], fill=C("#504060"))
        d.rectangle([x + 4, 0, x + 6, HOR + 6], fill=C("#706080"))
    cx = W // 2
    d.polygon([(cx - 24, 6), (cx + 24, 6), (cx + 14, 40), (cx - 14, 40)], fill=C(estandarte))
    luz.ellipse([cx - 8, 14, cx + 8, 30], fill=C("#f8d040"))
    luz.ellipse([cx - 4, 18, cx + 4, 26], fill=C("#fff8c0"))
    for x in range(10, W, 60):
        luz.polygon([(x, 0), (x + 6, 0), (x + 26, HOR + 6), (x - 20, HOR + 6)], fill=C("#3a2a50"))
    for i, y in enumerate(range(HOR + 6, H, 12)):
        for x in range(-(i % 2) * 16, W, 32):
            d.rectangle([x, y, x + 31, y + 11], fill=C(piso[(x // 32 + i) % 2]))
    d.ellipse([cx - 80, HOR + 30, cx + 80, H + 40], outline=C("#a08848"), width=2)


# ---------- tipo → biomas ----------
TIPOS = {
    "0": ["pradaria", "estrada", "cidade"],
    "1": ["vulcao", "deserto", "canion"],
    "2": ["praia", "mar", "lago"],
    "3": ["usina", "cidade", "cidade-noturna"],
    "4": ["floresta", "pradaria", "jardim"],
    "5": ["caverna-gelo", "montanha-neve"],
    "6": ["dojo", "pedreira", "estrada"],
    "7": ["pantano", "bosque-cogumelos"],
    "8": ["deserto", "canion", "pedreira"],
    "9": ["picos", "pradaria", "montanha-neve"],
    "10": ["templo", "cosmo"],
    "11": ["bosque-cogumelos", "floresta"],
    "12": ["caverna", "pedreira", "canion"],
    "13": ["cemiterio", "ruinas"],
    "14": ["ruinas", "caverna-cristal", "picos"],
    "15": ["cidade-noturna", "floresta", "cemiterio"],
    "16": ["fabrica", "usina"],
    "17": ["jardim-encantado", "jardim"],
    "campeao": ["salao-liga"],
}

TINTA = {"dia": ((1, 1, 1), (0, 0, 0)), "tarde": ((0.97, 0.86, 0.84), (12, 0, 8)), "noite": ((0.42, 0.48, 0.72), (4, 6, 18))}


def tingir(img, hora):
    if hora == "dia":
        return img
    a = np.array(img).astype(np.float32)
    m, s = TINTA[hora]
    a[..., :3] = np.clip(a[..., :3] * np.array(m) + np.array(s), 0, 255)
    return Image.fromarray(a.round().astype(np.uint8), "RGBA")


def gerar(nome, v, hora):
    info = BIOMAS[nome]
    rnd = random.Random(f"{nome}:{v}")
    base = Image.new("RGBA", (W, H), C("#000000"))
    if info["ceu"]:
        ceu(base, hora, random.Random(f"{nome}:{v}:ceu"))
        dc = ImageDraw.Draw(base)
        if nome != "cosmo":
            astro(dc, hora, random.Random(f"{nome}:{v}:astro"))
            if nome not in ("picos",):
                nuvens(dc, random.Random(f"{nome}:{v}:nuvem"), 3, hora)
    cena = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    luz = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    info["fn"](rnd, hora, ImageDraw.Draw(cena), ImageDraw.Draw(luz))
    base.alpha_composite(tingir(cena, hora if info["ceu"] else "dia"))
    base.alpha_composite(luz)
    return base.convert("RGB")


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".png"):
            os.remove(os.path.join(OUT, f))
    feitos = []
    for nome, info in BIOMAS.items():
        for v in range(VARIANTES):
            for hora in info["horas"]:
                im = gerar(nome, v, hora)
                arq = f"{nome}-{v}-{hora}.png"
                im.save(os.path.join(OUT, arq), optimize=True)
                feitos.append((nome, v, hora, im))
    manifesto = {"variantes": VARIANTES, "biomas": {n: {"horas": i["horas"]} for n, i in BIOMAS.items()}, "tipos": TIPOS}
    with open(os.path.join(RAIZ, "src", "data", "fundos.json"), "w") as fh:
        json.dump(manifesto, fh, indent=1, ensure_ascii=False)
    # prancha: uma linha por bioma
    pasta = os.path.join(RAIZ, "assets", "fundos-originais")
    os.makedirs(pasta, exist_ok=True)
    cols = max(VARIANTES * len(i["horas"]) for i in BIOMAS.values())
    esc = 1
    try:
        fonte = ImageFont.load_default(size=13)
    except TypeError:
        fonte = ImageFont.load_default()
    larg, alt = W * esc + 6, H * esc + 20
    pr = Image.new("RGB", (cols * larg + 6, len(BIOMAS) * alt + 6), (24, 24, 28))
    dp = ImageDraw.Draw(pr)
    for r, nome in enumerate(BIOMAS):
        ims = [x for x in feitos if x[0] == nome]
        for c, (_, v, hora, im) in enumerate(ims):
            pr.paste(im.resize((W * esc, H * esc), Image.NEAREST), (6 + c * larg, 6 + r * alt))
            dp.text((6 + c * larg, 6 + r * alt + H * esc + 2), f"{nome}-{v}-{hora}", fill=(230, 230, 230), font=fonte)
    pr.save(os.path.join(pasta, "prancha.png"), optimize=True)
    tam = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f"{len(feitos)} fundos, {len(BIOMAS)} biomas, {tam / 1024:.0f} KB")


if __name__ == "__main__":
    main()
