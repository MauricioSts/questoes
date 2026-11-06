"""Kit de pixel art para os sprites originais de golpes (nenhum pixel vem dos jogos).

Estilo: contorno de 1 px na cor escura do próprio elemento, 3-4 tons chapados, ponto de
brilho branco, sem antisserrilhado. Coordenadas das funções de pintura: centro do pixel
relativo ao meio do quadro (x para a direita, y para baixo).
"""
import math
import random
from PIL import Image, ImageDraw, ImageFont

TAU = math.tau
GAP = 2


def H(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def A(c, a):
    return (c[0], c[1], c[2], a)


class Pal:
    def __init__(s, O, D, M, L, W="#ffffff"):
        s.O, s.D, s.M, s.L, s.W = H(O), H(D), H(M), H(L), H(W)


# paletas (contorno, escuro, médio, claro, brilho)
GRAMA = Pal("#185010", "#308828", "#58b840", "#a0e068", "#f0ffd8")
FOGO = Pal("#801800", "#d83800", "#f88000", "#ffd038", "#fff8c8")
MISTICO = Pal("#581068", "#a028a0", "#e058c8", "#ffa8ec", "#fff0ff")
AGUA = Pal("#103090", "#2868d8", "#50a0f8", "#a8dcff", "#ffffff")
FANTASMA = Pal("#200830", "#401860", "#7038a0", "#b080e0", "#f0dcff")
FADA = Pal("#a02858", "#e05890", "#f890b8", "#ffc8dc", "#ffffff")
OURO = Pal("#784800", "#c08000", "#f0c028", "#fff078", "#ffffff")
PEDRA = Pal("#302820", "#605850", "#908880", "#c8c0b0", "#f0ece0")
MADEIRA = Pal("#381808", "#683818", "#a06030", "#d09858", "#f0d098")
BRANCO = Pal("#6868a0", "#a8a8c8", "#d8d8e8", "#f4f4fc", "#ffffff")
AMARELO = Pal("#806000", "#d0a000", "#f8d020", "#fff070", "#ffffff")
AZUL = Pal("#102878", "#2050c0", "#4080f0", "#90c0ff", "#ffffff")
SOMBRA = Pal("#080408", "#201018", "#402028", "#683840", "#a06060")
BRASA = Pal("#600808", "#b01010", "#f03018", "#ff8030", "#ffd080")
POEIRA = Pal("#806850", "#b8a080", "#e0d0b0", "#f8f0e0", "#ffffff")
# cinza para recolor por tipo (mesmas luminâncias do tools/pixel-kit.mjs)
CINZA = Pal("#282828", "#6e6e6e", "#a0a0a0", "#d7d7d7", "#ffffff")


class Q:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.p = {}

    def set(s, x, y, c):
        x, y = int(x), int(y)
        if c is None:
            s.p.pop((x, y), None)
        elif 0 <= x < s.w and 0 <= y < s.h:
            s.p[(x, y)] = c

    def get(s, x, y):
        return s.p.get((int(x), int(y)))

    def paint(s, f, ox=0.0, oy=0.0):
        cx, cy = s.w / 2 + ox, s.h / 2 + oy
        for y in range(s.h):
            for x in range(s.w):
                c = f(x + 0.5 - cx, y + 0.5 - cy)
                if c:
                    s.p[(x, y)] = c
        return s

    def outline(s, c, diag=False):
        viz = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (-1, -1), (1, -1), (-1, 1)] if diag else [])
        novos = set()
        for (x, y) in s.p:
            for dx, dy in viz:
                n = (x + dx, y + dy)
                if n not in s.p and 0 <= n[0] < s.w and 0 <= n[1] < s.h:
                    novos.add(n)
        for n in novos:
            s.p[n] = c
        return s

    def stamp(s, o, dx=0, dy=0):
        for (x, y), c in o.p.items():
            s.set(x + dx, y + dy, c)
        return s

    def bitmap(s, rows, cores, x0, y0):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in cores:
                    s.set(x0 + i, y0 + j, cores[ch])
        return s

    def xadrez(s, fase=0):
        for (x, y) in list(s.p):
            if (x + y + fase) % 2:
                del s.p[(x, y)]
        return s

    def clear_mask(s, f):
        cx, cy = s.w / 2, s.h / 2
        for (x, y) in list(s.p):
            if f(x + 0.5 - cx, y + 0.5 - cy):
                del s.p[(x, y)]
        return s

    def image(s):
        im = Image.new("RGBA", (s.w, s.h), (0, 0, 0, 0))
        px = im.load()
        for (x, y), c in s.p.items():
            px[x, y] = c
        return im


def peca(q, f, O, ox=0.0, oy=0.0, diag=False):
    """Pinta f numa camada própria, contorna com O e carimba em q."""
    t = Q(q.w, q.h)
    t.paint(f, ox, oy)
    if O:
        t.outline(O, diag)
    q.stamp(t)
    return q


def folha_png(frames, caminho):
    w, h = frames[0].w, frames[0].h
    assert all(f.w == w and f.h == h for f in frames)
    n = len(frames)
    im = Image.new("RGBA", (n * w + (n - 1) * GAP, h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        im.paste(f.image(), (i * (w + GAP), 0))
    im.save(caminho, optimize=True)
    return im


# ---------- geometria ----------
hyp = math.hypot


def ang(x, y):
    return math.atan2(y, x)


def rot(x, y, a):
    c, s_ = math.cos(a), math.sin(a)
    return x * c + y * s_, -x * s_ + y * c


def star_r(a, n, rin, rout, fase=0.0):
    k = ((a - fase) * n / TAU) % 1.0
    return rin + (rout - rin) * (1 - 2 * min(k, 1 - k))


def heart(x, y, s):
    X, Y = x / s, -y / s + 0.15
    return (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy or 1e-9
    t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / L2))
    return hyp(px - ax - t * vx, py - ay - t * vy), t


def in_poly(x, y, pts):
    dentro = False
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            dentro = not dentro
    return dentro


def bezier(p0, p1, p2, t):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])


def esfera(x, y, r, P, luz=0.38):
    d = hyp(x, y)
    if d > r:
        return None
    dl = hyp(x + r * luz, y + r * luz) / r
    if r >= 3 and dl < 0.25:
        return P.W
    if dl < 0.68:
        return P.L
    if dl < 1.05:
        return P.M
    return P.D


def chama(x, y, base, topo, larg, fase, P, nucleo=True):
    """Língua de fogo apontando para cima entre y=base e y=topo (topo < base)."""
    alt = base - topo
    if alt <= 0:
        return None
    t = (base - y) / alt
    if t < -0.12 or t > 1:
        return None
    tt = max(t, 0)
    hw = larg * (math.sin(math.pi * min(1.0, 0.25 + tt * 0.9)) ** 0.9) * (1 - tt) ** 0.45
    if t < 0:
        hw = larg * math.sqrt(max(0, 1 - (t / 0.12) ** 2)) * 0.95
    off = math.sin(tt * 5.0 + fase) * tt * larg * 0.45
    dx = abs(x - off)
    if dx > hw:
        return None
    rel = dx / max(hw, 0.01)
    if nucleo and rel < 0.35 and tt < 0.45:
        return P.W
    if rel < 0.6 and tt < 0.75:
        return P.L
    if rel < 0.88:
        return P.M
    return P.D


def onda_lumpy(a, R, f=0.0, k=(5, 9), amp=(0.1, 0.05)):
    return R * (1 - amp[0] - amp[1] + amp[0] * math.sin(k[0] * a + f) + amp[1] * math.sin(k[1] * a + 2 * f))


# ---------- peças genéricas ----------
def explosao(P, S, n=5, seed=1):
    rnd = random.Random(seed)
    frs = []
    R = S / 2 - 2
    for f in range(n):
        q = Q(S, S)
        if f == 0:
            peca(q, lambda x, y: (P.W if hyp(x, y) < R * 0.18 else P.L) if hyp(x, y) < R * 0.32 else None, P.D)
        elif f == 1:
            def fn(x, y):
                d, a = hyp(x, y), ang(x, y)
                if d > star_r(a, 8, R * 0.38, R * 0.78):
                    return None
                return P.W if d < R * 0.3 else P.L if d < R * 0.5 else P.M
            peca(q, fn, P.O)
        elif f == 2:
            def fn(x, y):
                d, a = hyp(x, y), ang(x, y)
                rr = onda_lumpy(a, R * 0.98, 0.4)
                if d > rr:
                    return None
                return P.W if d < rr * 0.32 else P.L if d < rr * 0.58 else P.M if d < rr * 0.85 else P.D
            peca(q, fn, P.O)
        elif f == 3:
            def fn(x, y):
                d, a = hyp(x, y), ang(x, y)
                rr = onda_lumpy(a, R, 1.3)
                if d > rr or d < rr * 0.5:
                    return None
                return P.L if d < rr * 0.62 else P.M if d < rr * 0.85 else P.D
            peca(q, fn, P.O)
            q.clear_mask(lambda x, y: math.sin(ang(x, y) * 7 + 1) > 0.75)
        else:
            def fn(x, y):
                d, a = hyp(x, y), ang(x, y)
                rr = onda_lumpy(a, R, 2.0)
                if d > rr or d < rr * 0.72:
                    return None
                return P.M if d < rr * 0.86 else P.D
            peca(q, fn, P.O)
            q.clear_mask(lambda x, y: math.sin(ang(x, y) * 7 + 2) > 0.3)
            q.xadrez()
        frs.append(q)
    return frs


def estrela_impacto(P, S, n=3):
    """Estrela de impacto: pequena, grande, afinando."""
    frs = []
    R = S / 2 - 1.5
    for f in range(n):
        q = Q(S, S)
        rin, rout = [(0.18, 0.55), (0.3, 1.0), (0.12, 0.8)][min(f, 2)]
        def fn(x, y, rin=rin, rout=rout):
            d, a = hyp(x, y), ang(x, y)
            r = star_r(a, 8, R * rin, R * rout, fase=TAU / 16 if f == 2 else 0)
            r = r if int(((a * 8 / TAU) + 0.5)) % 2 == 0 else r * 0.7
            if d > r:
                return None
            return P.W if d < r * 0.45 else P.L if d < r * 0.75 else P.M
        peca(q, fn, P.O)
        frs.append(q)
    return frs


def respingo(P, S, n=4, seed=3):
    rnd = random.Random(seed)
    gotas = [(rnd.uniform(0, TAU), rnd.uniform(0.7, 1.0), rnd.uniform(1.2, 2.2)) for _ in range(9)]
    frs = []
    R = S / 2 - 2
    for f in range(n):
        q = Q(S, S)
        k = (f + 1) / n
        if f < 2:
            rr = R * (0.35 + 0.25 * f)
            def fn(x, y, rr=rr):
                d, a = hyp(x, y * 1.2), ang(x, y)
                lim = rr * (0.8 + 0.25 * max(0, math.sin(a * 7)))
                if d > lim or (f == 1 and d < lim * 0.5):
                    return None
                return P.W if d < lim * 0.35 else P.L if d < lim * 0.7 else P.M
            peca(q, fn, P.O)
        for (a, dist, r) in gotas:
            if f == 0:
                continue
            cx, cy = math.cos(a) * R * dist * (0.45 + 0.55 * k), math.sin(a) * R * dist * (0.45 + 0.55 * k) + (f - 1) * 1.2
            rr = r * (1.0 if f < 3 else 0.7)
            peca(q, lambda x, y, cx=cx, cy=cy, rr=rr: esfera(x - cx, y - cy, rr, P) if hyp(x - cx, y - cy) <= rr else None, P.O)
        frs.append(q)
    return frs


# ---------- prancha de revisão ----------
def prancha(entradas, pasta, caminho, titulo, largura=1600):
    """entradas: [(arquivo, frame_w, frame_h, n)] — monta sobre grama escura com o nome embaixo."""
    try:
        fonte = ImageFont.load_default(size=13)
        fonte_t = ImageFont.load_default(size=20)
    except TypeError:
        fonte = fonte_t = ImageFont.load_default()
    blocos = []
    for arq, fw, fh, n in entradas:
        im = Image.open(f"{pasta}/{arq}")
        esc = 4 if max(fw, fh) <= 16 else 3 if max(fw, fh) <= 32 else 2 if max(fw, fh) <= 64 else 1
        im = im.resize((im.width * esc, im.height * esc), Image.NEAREST)
        blocos.append((arq, im, esc, n))
    pad = 14
    x = y = pad
    y += 34
    linha_h = 0
    pos = []
    for arq, im, esc, n in blocos:
        w = max(im.width, 150)
        if x + w > largura - pad:
            x = pad
            y += linha_h + pad
            linha_h = 0
        pos.append((x, y))
        x += w + pad * 2
        linha_h = max(linha_h, im.height + 22)
    alt = y + linha_h + pad
    base = Image.new("RGBA", (largura, alt), H("#1f4a1c"))
    d = ImageDraw.Draw(base)
    for yy in range(0, alt, 8):
        for xx in range(0, largura, 8):
            if (xx // 8 + yy // 8) % 2:
                d.rectangle([xx, yy, xx + 7, yy + 7], fill=H("#22511f"))
    d.text((pad, 10), titulo, fill=H("#f0ffe0"), font=fonte_t)
    for (arq, im, esc, n), (px, py) in zip(blocos, pos):
        base.alpha_composite(im, (px, py))
        d.text((px, py + im.height + 4), f"{arq.replace('.png', '')}  ({n}q, {esc}x)", fill=H("#ffffff"), font=fonte)
    base.convert("RGB").save(caminho, optimize=True)


# ---------- paletas extras ----------
ACO = Pal("#383850", "#686890", "#a0a0c0", "#d8d8f0", "#ffffff")
ROXO = Pal("#381038", "#702878", "#a048a8", "#d890d8", "#f8e0f8")
LARANJA = Pal("#782800", "#d06010", "#f89030", "#ffc870", "#fff0d0")
NOITE = Pal("#080828", "#182060", "#283c90", "#5070c0", "#a0b8f0")
CIANO = Pal("#085868", "#18a0b0", "#50d8e0", "#b0f8f8", "#ffffff")
VERMELHO = Pal("#600808", "#c02020", "#f04040", "#ff9080", "#ffe0d8")
ROSA = Pal("#901848", "#d03870", "#f070a0", "#ffb8d0", "#ffffff")
LILAS = Pal("#503070", "#8060b0", "#b098e0", "#e0d0f8", "#ffffff")
TOXICO = Pal("#184808", "#409018", "#78c828", "#c0f060", "#f0ffc0")
OVO = Pal("#706048", "#c0b090", "#e8e0c8", "#fffaf0", "#ffffff")
FUMACA = Pal("#080808", "#202024", "#383840", "#585860", "#808088")


# ---------- primitivas com contorno ----------
def disco(q, cx, cy, r, P, O=None):
    return peca(q, lambda x, y: esfera(x - cx, y - cy, r, P), O or P.O)


def linha(q, ax, ay, bx, by, w, cor, O=None, cor_luz=None):
    def fn(x, y):
        d, t = seg_dist(x, y, ax, ay, bx, by)
        if d > w:
            return None
        return cor_luz if (cor_luz and d < w * 0.45) else cor
    return peca(q, fn, O)


def arco(q, cx, cy, R, esp, a0, a1, P, O=None, sy=1.0):
    def fn(x, y):
        d = hyp(x - cx, (y - cy) / sy)
        a = ang(x - cx, (y - cy) / sy)
        a = (a - a0) % TAU
        if a > (a1 - a0) % TAU or not (R - esp <= d <= R):
            return None
        return P.L if d > R - esp / 2 else P.M
    return peca(q, fn, O if O is not None else P.O)


def seta(q, ax, ay, bx, by, w, P, cabeca=None):
    cabeca = cabeca or w * 3
    dx, dy = bx - ax, by - ay
    n = hyp(dx, dy) or 1
    ux, uy = dx / n, dy / n
    nx, ny = -uy, ux
    hx, hy = bx - ux * cabeca, by - uy * cabeca
    tri = [(bx, by), (hx + nx * cabeca * 0.8, hy + ny * cabeca * 0.8), (hx - nx * cabeca * 0.8, hy - ny * cabeca * 0.8)]
    def fn(x, y):
        if in_poly(x, y, tri):
            return P.L
        d, t = seg_dist(x, y, ax, ay, hx, hy)
        return (P.L if d < w * 0.4 else P.M) if d <= w else None
    return peca(q, fn, P.O)


def estrela5(q, cx, cy, r, P, fase=-math.pi / 2):
    def fn(x, y):
        d, a = hyp(x - cx, y - cy), ang(x - cx, y - cy)
        if d > star_r(a, 5, r * 0.45, r, fase):
            return None
        return P.W if d < r * 0.25 else P.L if (y - cy) < r * 0.15 else P.M
    return peca(q, fn, P.O)


def nuvem(q, puffs, P, alpha=255):
    def fn(x, y):
        best = None
        for px, py, r in puffs:
            d = hyp(x - px, y - py)
            if d <= r:
                c = P.W if hyp(x - px + r * 0.4, y - py + r * 0.4) < r * 0.4 else P.L if y - py < r * 0.25 else P.M
                if best is None or c == P.W or (c == P.L and best == P.M):
                    best = c
        return A(best, alpha) if best else None
    return peca(q, fn, A(P.O, max(alpha, 160)) if alpha < 255 else P.O)


def punho(q, cx, cy, s, P, dedos=True):
    """Punho fechado de lado, nós dos dedos para a direita (s = meia altura)."""
    def fn(x, y):
        u, v = (x - cx) / s, (y - cy) / s
        # dedos dobrados: 4 gomos arredondados na frente
        for k, vy in enumerate((-0.66, -0.22, 0.22, 0.66)):
            if hyp((u - 0.55) / 0.5, (v - vy) / 0.27) <= 1:
                return P.L if k == 0 else P.M if dedos and abs(v - vy) < 0.17 else P.D
        if -0.6 <= u <= 0.6 and -0.92 <= v <= 0.92:
            if -0.35 < u < 0.45 and 0.2 < v < 0.55:
                return P.L  # polegar por cima
            return P.L if v < -0.4 else P.M
        if -1.2 <= u < -0.6 and abs(v) < 0.6:
            return P.D  # pulso
        return None
    return peca(q, fn, P.O)


def mao_aberta(q, cx, cy, s, P, angulo=0.0):
    def fn(x, y):
        u, v = rot(x - cx, y - cy, angulo)
        u, v = u / s, v / s
        if (u / 0.75) ** 2 + ((v - 0.35) / 0.65) ** 2 <= 1:
            return P.L if u < 0.1 else P.M
        for i, fx in enumerate((-0.48, -0.16, 0.16, 0.48)):
            top = -0.95 + abs(fx) * 0.35
            if abs(u - fx) < 0.15 and top <= v <= 0.2:
                return P.L if i < 2 else P.M
        if -1.15 < u < -0.6 and 0.0 < v < 0.5 and abs(v - 0.25 - (u + 0.9) * 0.6) < 0.18:
            return P.M  # polegar
        return None
    return peca(q, fn, P.O)


def gota(q, cx, cy, r, P):
    def fn(x, y):
        u, v = x - cx, y - cy
        if hyp(u, v - r * 0.3) < r or (v < r * 0.3 and abs(u) < (v + r * 1.9) * 0.55 and v > -r * 1.8):
            return P.W if hyp(u + r * 0.35, v) < r * 0.3 else P.L if u < 0 else P.M
        return None
    return peca(q, fn, P.O)


def faisca(q, cx, cy, s, P):
    def fn(x, y):
        ax_, ay_ = abs(x - cx), abs(y - cy)
        if ax_ < 1 and ay_ < 1:
            return P.W
        if (ax_ < 1 and ay_ <= s) or (ay_ < 1 and ax_ <= s):
            return P.L
        return None
    return peca(q, fn, P.O if s >= 3 else None)


def coracao(q, cx, cy, s, P):
    return peca(q, lambda x, y: (P.W if hyp(x - cx + s * 0.4, y - cy + s * 0.3) < s * 0.3 else P.M if y - cy > s * 0.1 else P.L) if heart(x - cx, y - cy, s) else None, P.O)


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
    return peca(q, fn, P.O)


def bitmap_peca(q, rows, cor, O, x0, y0):
    t = Q(q.w, q.h)
    t.bitmap(rows, {"#": cor}, x0, y0)
    t.outline(O)
    q.stamp(t)


def pena(q, cx, cy, ang_, comp, P):
    def fn(x, y):
        u, v = rot(x - cx, y - cy, ang_)
        if abs(u) > comp:
            return None
        lim = comp * 0.32 * (1 - ((u + comp * 0.2) / (comp * 1.2)) ** 2)
        if abs(v) < 0.6 and u > -comp:
            return P.D
        if 0 <= v <= lim or (-lim * 0.85 <= v < 0):
            if int((u + comp) * 0.9) % 3 == 0 and abs(v) > 1:
                return None
            return P.L if v < 0 else P.W
        return None
    return peca(q, fn, P.O)


# ---------- lote: registro, manifesto, golpes.md e prancha ----------
import json
import os as _os


class Lote:
    def __init__(s, numero, titulo, pasta):
        s.numero, s.titulo, s.pasta = numero, titulo, pasta
        s.reg = []
        _os.makedirs(pasta, exist_ok=True)

    def salvar(s, arq, frames, pecas, desc, golpe=None):
        folha_png(frames, _os.path.join(s.pasta, arq))
        s.reg.append((arq, frames[0].w, frames[0].h, len(frames), pecas, desc, golpe or arq.split("--")[0].replace(".png", "")))

    def finalizar(s, titulos_lotes):
        man_p = _os.path.join(s.pasta, "manifesto.json")
        man = json.load(open(man_p)) if _os.path.exists(man_p) else {}
        man = {k: v for k, v in man.items() if v.get("lote") != s.numero}
        for a, w, h, n, p, d, g in s.reg:
            man[a] = {"w": w, "h": h, "n": n, "peca": p, "lote": s.numero, "golpe": g, "desc": d}
        man = dict(sorted(man.items()))
        with open(man_p, "w") as fh:
            json.dump(man, fh, indent=1, ensure_ascii=False)
        cab = ("# Sprites originais de golpes\n\nFolhas de sprite em pixel art de DS, desenhadas por código "
               "(`tools/golpes-originais/`), sem pixel dos jogos. Cada PNG: fundo transparente, quadros do mesmo tamanho "
               "lado a lado numa linha, 2 px de espaço entre eles. Tamanhos em px reais de DS (tela 256×192). "
               "Projéteis apontam para a direita (atacante embaixo à esquerda); o jogo espelha quando o inimigo ataca. "
               "Peças marcadas *(recolorível)* estão em cinza para o recolor por tipo.\n")
        partes = [cab]
        for num, tit in titulos_lotes:
            linhas = [(a, v) for a, v in man.items() if str(v["lote"]) == str(num)]
            if not linhas:
                continue
            partes.append(f"\n## Lote {num}: {tit}\n\n| arquivo | quadro | nº de quadros | peças | o que acontece em cada quadro |\n|---|---|---|---|---|\n")
            ordem = {}
            for a, v in linhas:
                ordem.setdefault(v.get("golpe", a), []).append((a, v))
            for g in sorted(ordem):
                for a, v in sorted(ordem[g]):
                    partes.append(f"| {a} | {v['w']}×{v['h']} | {v['n']} | {v['peca']} | {v.get('desc', '')} |\n")
        with open(_os.path.join(s.pasta, "golpes.md"), "w") as fh:
            fh.write("".join(partes))
        _os.makedirs(_os.path.join(s.pasta, "pranchas"), exist_ok=True)
        prancha([(a, w, h, n) for a, w, h, n, *_ in s.reg], s.pasta, _os.path.join(s.pasta, "pranchas", f"lote-{s.numero}.png"), f"Lote {s.numero} - {s.titulo}")
        print(len(s.reg), "arquivos no lote", s.numero)


LOTES = [("1", "golpes sem sprite (28)"), ("2a", "aumento/queda de atributo e cura (61)"), ("2b", "grupos de golpes parecidos (108)"), ("2c", "pares e golpes isolados (48)")]
