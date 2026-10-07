// Mapa da região com o boneco do jogador. A cada avanço (rota nova, cidade nova) ele anda pelo
// caminho desde o último lugar que este aparelho viu; entre Kanto e as Ilhas Sevii vai de barco
// (some e reaparece). Cores pelos tokens do tema.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { caminhoNoMapa, mapaDaRegiao, type Lugar, type PosicaoNoMapa } from "../../lib/poke/mapas";
import { spriteTreinador } from "../../lib/poke/dex";

const VELOCIDADE = 160; // unidades do mapa por segundo
const TEMPO_MAX = 3200; // ms: caminhos longos andam mais rápido

const chaveVisto = (regiao: number) => `q_poke_mapa_visto_${regiao}`;
const lerVisto = (regiao: number) => {
  try {
    return localStorage.getItem(chaveVisto(regiao));
  } catch {
    return null;
  }
};
const gravarVisto = (regiao: number, id: string) => {
  try {
    localStorage.setItem(chaveVisto(regiao), id);
  } catch {
    /* sem armazenamento: só não anima da próxima vez */
  }
};

interface Boneco {
  x: number;
  y: number;
  andando: boolean;
  sumido: boolean;
  esquerda: boolean;
}

export function MapaRegiao({ posicao, jogador, compacto = false }: { posicao: PosicaoNoMapa; jogador: string; compacto?: boolean }) {
  const mapa = mapaDaRegiao(posicao.regiao)!;
  const porId = useMemo(() => new Map(mapa.lugares.map((x) => [x.id, x])), [mapa]);
  const aqui = porId.get(posicao.aqui)!;
  const [boneco, setBoneco] = useState<Boneco>(() => {
    const visto = porId.get(lerVisto(posicao.regiao) ?? "") ?? aqui;
    return { x: visto.x, y: visto.y, andando: false, sumido: false, esquerda: false };
  });
  const atual = useRef(boneco);
  atual.current = boneco;

  useEffect(() => {
    const de = [...porId.values()].find((x) => x.x === atual.current.x && x.y === atual.current.y)?.id ?? posicao.aqui;
    const reduzido = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (de === posicao.aqui || reduzido) {
      setBoneco({ x: aqui.x, y: aqui.y, andando: false, sumido: false, esquerda: false });
      gravarVisto(posicao.regiao, posicao.aqui);
      return;
    }
    const cam = caminhoNoMapa(mapa, de, posicao.aqui);
    const timers: number[] = [];
    let raf = 0;
    if (!cam) {
      // de barco: some aqui, reaparece lá
      setBoneco((b) => ({ ...b, sumido: true }));
      timers.push(
        window.setTimeout(() => setBoneco({ x: aqui.x, y: aqui.y, andando: false, sumido: true, esquerda: false }), 450),
        window.setTimeout(() => {
          setBoneco((b) => ({ ...b, sumido: false }));
          gravarVisto(posicao.regiao, posicao.aqui);
        }, 520)
      );
    } else {
      const pts = cam.map((id) => porId.get(id)!);
      const seg = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
      const total = seg.reduce((a, b) => a + b, 0) || 1;
      const dur = Math.min(TEMPO_MAX, (total / VELOCIDADE) * 1000);
      const t0 = performance.now() + 450; // um respiro para o olho achar o boneco
      const passo = (agora: number) => {
        const t = Math.max(0, Math.min(1, (agora - t0) / dur));
        let d = t * total;
        let i = 0;
        while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
        const a = pts[i];
        const b = pts[i + 1];
        const f = seg[i] ? Math.min(1, d / seg[i]) : 1;
        setBoneco({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, andando: t < 1, sumido: false, esquerda: b.x < a.x });
        if (t < 1) raf = requestAnimationFrame(passo);
        else gravarVisto(posicao.regiao, posicao.aqui);
      };
      raf = requestAnimationFrame(passo);
    }
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [posicao.regiao, posicao.aqui, aqui, mapa, porId]);

  const visitado = new Set(posicao.visitados);
  const insignia = new Set(posicao.insignias);
  const feitas = new Set(posicao.trilha.map(([a, b]) => `${a}|${b}`));
  const destino = posicao.destino ? porId.get(posicao.destino) : undefined;
  const mostraRotulo = (x: Lugar) => x.tipo === "cidade" || x.id === posicao.aqui || (!compacto && x.tipo === "lugar");
  const rotulo = (x: Lugar) => x.rotulo ?? x.id;
  const ilhas = mapa.ilhas;

  return (
    <figure className="pk-mapa" aria-label={`Mapa: você está em ${posicao.aqui}${posicao.destino ? `, rumo a ${posicao.destino}` : ""}`}>
      <svg viewBox={`0 0 ${mapa.largura} ${mapa.altura}`} role="img" className="pk-mapa__svg">
        <path d={mapa.mar} className="pk-mapa__mar" />
        {ilhas && (
          <g>
            <rect x={ilhas.x} y={ilhas.y} width={ilhas.w} height={ilhas.h} rx={14} className="pk-mapa__ilhas" />
            <text x={ilhas.x + 10} y={ilhas.y + 18} className="pk-mapa__titulo">
              {ilhas.titulo} · de barco
            </text>
          </g>
        )}
        {mapa.ligacoes.map(([a, b, sub]) => {
          const p = porId.get(a)!;
          const q = porId.get(b)!;
          const feito = feitas.has(`${a}|${b}`) || feitas.has(`${b}|${a}`);
          return <line key={`${a}|${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className={`pk-mapa__via ${feito ? "pk-mapa__via--feita" : ""} ${sub ? "pk-mapa__via--sub" : ""}`} />;
        })}
        {destino && destino.id !== posicao.aqui && <circle cx={destino.x} cy={destino.y} r={16} className="pk-mapa__alvo" />}
        {mapa.lugares.map((x) => {
          const cls = `pk-mapa__no pk-mapa__no--${x.tipo} ${visitado.has(x.id) ? "pk-mapa__no--visto" : ""} ${insignia.has(x.id) ? "pk-mapa__no--insignia" : ""}`;
          return (
            <g key={x.id} className={cls}>
              <title>{x.id}</title>
              {x.tipo === "cidade" ? (
                <rect x={x.x - 9} y={x.y - 9} width={18} height={18} rx={4} />
              ) : x.tipo === "lugar" ? (
                <rect x={x.x - 6} y={x.y - 6} width={12} height={12} rx={2} transform={`rotate(45 ${x.x} ${x.y})`} />
              ) : (
                <circle cx={x.x} cy={x.y} r={5} />
              )}
              {mostraRotulo(x) && (
                <text x={x.x} y={x.y + (x.tipo === "cidade" ? 27 : 21)} textAnchor="middle" className={`pk-mapa__rotulo ${x.tipo === "cidade" ? "pk-mapa__rotulo--cidade" : ""}`}>
                  {x.tipo === "cidade" || x.id !== posicao.aqui ? rotulo(x) : x.id}
                </text>
              )}
            </g>
          );
        })}
        <g
          className={`pk-mapa__boneco ${boneco.andando ? "pk-mapa__boneco--andando" : ""} ${boneco.sumido ? "pk-mapa__boneco--sumido" : ""}`}
          style={{ transform: `translate(${boneco.x}px, ${boneco.y}px)` } as CSSProperties}
        >
          <ellipse cx={0} cy={2} rx={16} ry={5} className="pk-mapa__sombra" />
          <g className="pk-mapa__corpo">
            <image href={spriteTreinador(jogador)} x={-32} y={-60} width={64} height={64} style={{ transform: boneco.esquerda ? "scaleX(-1)" : undefined }} />
          </g>
        </g>
      </svg>
      <figcaption className="pk-mapa__legenda">
        Você está em <b>{posicao.aqui}</b>
        {posicao.destino && posicao.destino !== posicao.aqui ? (
          <>
            {" "}
            · rumo a <b>{posicao.destino}</b>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
