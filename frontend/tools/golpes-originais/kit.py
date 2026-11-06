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
