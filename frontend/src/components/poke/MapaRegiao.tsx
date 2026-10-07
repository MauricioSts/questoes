// Mapa da região com o boneco do jogador, no estilo dos guias antigos (estradas brancas,
// cidades em quadrado vermelho, locais em círculo verde). Fica em miniatura e abre grande ao
// clicar; no grande dá para tocar num lugar e ver o que ele é na jornada.
//
// A cada avanço (rota nova, cidade nova) o boneco anda pelas estradas desde o último lugar que
// este aparelho viu; entre Kanto e as Ilhas Sevii vai de barco (some e reaparece). As cores vêm
// de variáveis --pkm-* em poke.css, uma paleta por tema.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as TeclaEvento } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { caminhoNoMapa, mapaDaRegiao, numeroDaRota, pontosDaLigacao, type Lugar, type MapaRegiao as Mapa, type Ponto, type PosicaoNoMapa } from "../../lib/poke/mapas";
import { spriteTreinador } from "../../lib/poke/dex";

const VELOCIDADE = 160; // unidades do mapa por segundo
const TEMPO_MAX = 3200; // ms: caminhos longos andam mais rápido
const NOME_REGIAO: Record<number, string> = { 0: "Kanto" };

const chaveVisto = (regiao: number) => `q_poke_mapa_visto_${regiao}`;
const CHAVE_OPCOES = "q_poke_mapa_opcoes";
const ler = (chave: string) => {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
};
const gravar = (chave: string, valor: string) => {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento: só não lembra da próxima vez */
  }
};

interface Boneco {
  x: number;
  y: number;
  andando: boolean;
  sumido: boolean;
  esquerda: boolean;
}

function useBoneco(mapa: Mapa, posicao: PosicaoNoMapa) {
  const porId = useMemo(() => new Map(mapa.lugares.map((x) => [x.id, x])), [mapa]);
  const aqui = porId.get(posicao.aqui)!;
  const [boneco, setBoneco] = useState<Boneco>(() => {
    const visto = porId.get(ler(chaveVisto(posicao.regiao)) ?? "") ?? aqui;
    return { x: visto.x, y: visto.y, andando: false, sumido: false, esquerda: false };
  });
  const atual = useRef(boneco);
  atual.current = boneco;

  useEffect(() => {
    const de = [...porId.values()].find((x) => x.x === atual.current.x && x.y === atual.current.y)?.id ?? posicao.aqui;
    const reduzido = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (de === posicao.aqui || reduzido) {
      setBoneco({ x: aqui.x, y: aqui.y, andando: false, sumido: false, esquerda: false });
      gravar(chaveVisto(posicao.regiao), posicao.aqui);
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
          gravar(chaveVisto(posicao.regiao), posicao.aqui);
        }, 520)
      );
    } else {
      // segue as estradas, cotovelo por cotovelo
      const pts: Ponto[] = [];
      cam.slice(1).forEach((id, i) => {
        const trecho = pontosDaLigacao(mapa, cam[i], id)!;
        pts.push(...(i ? trecho.slice(1) : trecho));
      });
      const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
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
        setBoneco((v) => ({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, andando: t < 1, sumido: false, esquerda: b[0] < a[0] ? true : b[0] > a[0] ? false : v.esquerda }));
        if (t < 1) raf = requestAnimationFrame(passo);
        else gravar(chaveVisto(posicao.regiao), posicao.aqui);
      };
      raf = requestAnimationFrame(passo);
    }
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [posicao.regiao, posicao.aqui, aqui, mapa, porId]);

  return boneco;
}

const pontosSvg = (pts: Ponto[]) => pts.map((p) => p.join(",")).join(" ");

interface Opcoes {
  numeros: boolean;
  legenda: boolean;
}

function DesenhoMapa({
  mapa,
  posicao,
  jogador,
  detalhado,
  opcoes,
  selecionado,
  onSelecionar,
}: {
  mapa: Mapa;
  posicao: PosicaoNoMapa;
  jogador: string;
  detalhado: boolean;
  opcoes: Opcoes;
  selecionado?: string | null;
  onSelecionar?: (id: string) => void;
}) {
  const boneco = useBoneco(mapa, posicao);
  const porId = useMemo(() => new Map(mapa.lugares.map((x) => [x.id, x])), [mapa]);
  const visitado = new Set(posicao.visitados);
  const insignia = new Set(posicao.insignias);
  const feitas = new Set(posicao.trilha.map(([a, b]) => `${a}|${b}`));
  const destino = posicao.destino ? porId.get(posicao.destino) : undefined;
  const sel = selecionado ? porId.get(selecionado) : undefined;
  const estradas = mapa.ligacoes.filter(([, , o]) => o?.tipo !== "sub").map(([a, b, o]) => ({ a, b, mar: o?.tipo === "mar", pts: pontosDaLigacao(mapa, a, b)!, feita: feitas.has(`${a}|${b}`) || feitas.has(`${b}|${a}`) }));
  const clicavel = (id: string, classe = "") =>
    detalhado && onSelecionar
      ? {
          role: "button",
          tabIndex: 0,
          className: `${classe} pk-mapa__alvo-clique`,
          onClick: () => onSelecionar(id),
          onKeyDown: (e: TeclaEvento) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelecionar(id);
            }
          },
        }
      : { className: classe };
  const nome = (x: Lugar) => {
    const [dx, dy, ancora] = x.rot ?? [0, x.tipo === "cidade" ? 30 : 24];
    return (
      <text x={x.x + dx} y={x.y + dy} textAnchor={ancora ?? "middle"} className={`pk-mapa__nome ${x.tipo === "cidade" ? "pk-mapa__nome--cidade" : ""}`}>
        {x.rotulo ?? x.id}
      </text>
    );
  };
  const [lx, ly] = mapa.legenda;

  return (
    <svg viewBox={`0 0 ${mapa.largura} ${mapa.altura}`} role="img" aria-label={`Mapa de ${NOME_REGIAO[posicao.regiao] ?? "região"}`} className="pk-mapa__svg">
      <rect width={mapa.largura} height={mapa.altura} className="pk-mapa__mar" />
      <path d={mapa.terra} className="pk-mapa__terra" />
      {mapa.montanhas.map((d, i) => (
        <path key={i} d={d} className="pk-mapa__montanha" />
      ))}
      {mapa.ilhotas.map((d, i) => (
        <path key={i} d={d} className="pk-mapa__terra" />
      ))}
      {mapa.ilhas && (
        <g>
          <rect x={mapa.ilhas.x} y={mapa.ilhas.y} width={mapa.ilhas.w} height={mapa.ilhas.h} rx={10} className="pk-mapa__quadro" />
          {mapa.ilhas.terra.map((d, i) => (
            <path key={i} d={d} className="pk-mapa__terra" />
          ))}
          {detalhado && (
            <text x={mapa.ilhas.x + 8} y={mapa.ilhas.y + 15} className="pk-mapa__quadro-titulo">
              {mapa.ilhas.titulo}
            </text>
          )}
        </g>
      )}

      {/* passagem subterrânea: linha fina entre as entradas */}
      {mapa.ligacoes
        .filter(([, , o]) => o?.tipo === "sub")
        .map(([a, b]) => (
          <polyline key={`${a}|${b}`} points={pontosSvg(pontosDaLigacao(mapa, a, b)!.slice(0, -1))} className="pk-mapa__sub" />
        ))}
      {/* estradas: borda por baixo de todas, miolo por cima, para os cruzamentos se fundirem */}
      {estradas.map((e) => (
        <polyline key={`b${e.a}|${e.b}`} points={pontosSvg(e.pts)} className={`pk-mapa__borda ${e.mar ? "pk-mapa__borda--mar" : ""}`} />
      ))}
      {estradas.map((e) => (
        <polyline key={`m${e.a}|${e.b}`} points={pontosSvg(e.pts)} className={`pk-mapa__miolo ${e.mar ? "pk-mapa__miolo--mar" : ""} ${e.feita ? "pk-mapa__miolo--feita" : ""}`} />
      ))}

      {detalhado &&
        opcoes.numeros &&
        mapa.lugares
          .filter((x) => x.tipo === "rota")
          .map((x) => (
            <g key={x.id} {...clicavel(x.id)}>
              <title>{x.id}</title>
              <text x={x.x} y={x.y + 4.5} textAnchor="middle" className="pk-mapa__numero">
                {numeroDaRota(x.id)}
              </text>
            </g>
          ))}

      {destino && destino.id !== posicao.aqui && <circle cx={destino.x} cy={destino.y} r={18} className="pk-mapa__destino" />}

      {mapa.entradas?.map((e) => (
        <g key={`${e.lugar}-entrada`} {...clicavel(e.lugar, `pk-mapa__ponto pk-mapa__ponto--lugar ${visitado.has(e.lugar) ? "pk-mapa__ponto--visto" : ""}`)}>
          <title>{e.lugar}</title>
          <circle cx={e.x} cy={e.y} r={8} />
          {detalhado && nome({ id: e.lugar, x: e.x, y: e.y, tipo: "lugar", rotulo: e.rotulo, rot: e.rot })}
        </g>
      ))}
      {mapa.lugares
        .filter((x) => x.tipo !== "rota")
        .map((x) => (
          <g key={x.id} {...clicavel(x.id, `pk-mapa__ponto pk-mapa__ponto--${x.tipo} ${visitado.has(x.id) ? "pk-mapa__ponto--visto" : ""}`)}>
            <title>{x.id}</title>
            {x.tipo === "cidade" ? <rect x={x.x - 13} y={x.y - 13} width={26} height={26} /> : <circle cx={x.x} cy={x.y} r={mapa.ilhas && x.x < mapa.ilhas.x + mapa.ilhas.w && x.y > mapa.ilhas.y ? 6 : 9} />}
            {insignia.has(x.id) && <circle cx={x.x + 12} cy={x.y - 12} r={5} className="pk-mapa__insignia" />}
            {detalhado && nome(x)}
          </g>
        ))}

      {sel && <circle cx={sel.x} cy={sel.y} r={sel.tipo === "cidade" ? 24 : 18} className="pk-mapa__selecao" />}

      <g
        className={`pk-mapa__boneco ${boneco.andando ? "pk-mapa__boneco--andando" : ""} ${boneco.sumido ? "pk-mapa__boneco--sumido" : ""}`}
        style={{ transform: `translate(${boneco.x}px, ${boneco.y}px)` } as CSSProperties}
      >
        <ellipse cx={0} cy={2} rx={16} ry={5} className="pk-mapa__sombra" />
        <g className="pk-mapa__corpo">
          <image href={spriteTreinador(jogador)} x={-32} y={-60} width={64} height={64} style={{ transform: boneco.esquerda ? "scaleX(-1)" : undefined }} />
        </g>
      </g>

      {detalhado && opcoes.legenda && (
        <g className="pk-mapa__caixa" transform={`translate(${lx} ${ly})`}>
          <rect width={124} height={74} rx={8} />
          <rect x={10} y={8} width={12} height={12} className="pk-mapa__leg-cidade" />
          <text x={30} y={18}>Cidade</text>
          <circle cx={16} cy={30} r={6} className="pk-mapa__leg-lugar" />
          <text x={30} y={34}>Local</text>
          <line x1={8} y1={46} x2={24} y2={46} className="pk-mapa__borda" />
          <line x1={8} y1={46} x2={24} y2={46} className="pk-mapa__miolo" />
          <text x={30} y={50}>Rota</text>
          <line x1={8} y1={62} x2={24} y2={62} className="pk-mapa__borda pk-mapa__borda--mar" />
          <line x1={8} y1={62} x2={24} y2={62} className="pk-mapa__miolo pk-mapa__miolo--mar" />
          <text x={30} y={66}>Rota marítima</text>
        </g>
      )}
    </svg>
  );
}

function Onde({ posicao }: { posicao: PosicaoNoMapa }) {
  return (
    <>
      Você está em <b>{posicao.aqui}</b>
      {posicao.destino && posicao.destino !== posicao.aqui ? (
        <>
          {" "}
          · rumo a <b>{posicao.destino}</b>
        </>
      ) : null}
    </>
  );
}

// O que o lugar tocado é na jornada.
function sobreLugar(id: string, posicao: PosicaoNoMapa) {
  if (id === posicao.aqui) return "você está aqui";
  if (posicao.insignias.includes(id)) return "insígnia conquistada";
  if (id === posicao.destino) return "próximo destino";
  return posicao.visitados.includes(id) ? "já passou por aqui" : "ainda não chegou aqui";
}

function lerOpcoes(): Opcoes {
  try {
    return { numeros: true, legenda: true, ...JSON.parse(ler(CHAVE_OPCOES) ?? "{}") };
  } catch {
    return { numeros: true, legenda: true };
  }
}

function MapaAmpliado({ mapa, posicao, jogador, onFechar }: { mapa: Mapa; posicao: PosicaoNoMapa; jogador: string; onFechar: () => void }) {
  const [opcoes, setOpcoes] = useState(lerOpcoes);
  const [selecionado, setSelecionado] = useState<string>(posicao.aqui);
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fechar.current?.focus();
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [onFechar]);

  const alternar = (k: keyof Opcoes) =>
    setOpcoes((o) => {
      const n = { ...o, [k]: !o[k] };
      gravar(CHAVE_OPCOES, JSON.stringify(n));
      return n;
    });

  return createPortal(
    <div className="pk-mapa-modal" role="dialog" aria-modal="true" aria-label={`Mapa de ${NOME_REGIAO[posicao.regiao] ?? "região"}`} onClick={onFechar}>
      <div className="pk-mapa-modal__painel pk-mapa" onClick={(e) => e.stopPropagation()}>
        <div className="pk-mapa-modal__topo">
          <h2 className="pk-mapa-modal__titulo">Mapa de {NOME_REGIAO[posicao.regiao] ?? "região"}</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => alternar("numeros")} aria-pressed={opcoes.numeros} className="pk-mapa-modal__opcao">
              Números
            </button>
            <button onClick={() => alternar("legenda")} aria-pressed={opcoes.legenda} className="pk-mapa-modal__opcao">
              Legenda
            </button>
            <button ref={fechar} onClick={onFechar} aria-label="Fechar mapa" className="pk-mapa-modal__fechar">
              <X size={18} />
            </button>
          </div>
        </div>
        <DesenhoMapa mapa={mapa} posicao={posicao} jogador={jogador} detalhado opcoes={opcoes} selecionado={selecionado} onSelecionar={setSelecionado} />
        <p className="pk-mapa__legenda">
          <Onde posicao={posicao} />
          {selecionado !== posicao.aqui && (
            <>
              <br />
              <b>{selecionado}</b>: {sobreLugar(selecionado, posicao)}
            </>
          )}
        </p>
      </div>
    </div>,
    document.body
  );
}

// Miniatura: o mapa pequeno com o boneco; clicar abre o mapa grande.
export function MapaRegiao({ posicao, jogador }: { posicao: PosicaoNoMapa; jogador: string }) {
  const mapa = mapaDaRegiao(posicao.regiao)!;
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="pk-mapa pk-mapa--mini" aria-label={`Abrir o mapa: você está em ${posicao.aqui}`}>
        <span className="pk-mapa__mini-quadro">
          <DesenhoMapa mapa={mapa} posicao={posicao} jogador={jogador} detalhado={false} opcoes={{ numeros: false, legenda: false }} />
        </span>
        <span className="pk-mapa__mini-texto">
          <span className="pk-mapa__legenda">
            <Onde posicao={posicao} />
          </span>
          <span className="pk-mapa__abrir">
            <Maximize2 size={13} /> Ver mapa
          </span>
        </span>
      </button>
      {aberto && <MapaAmpliado mapa={mapa} posicao={posicao} jogador={jogador} onFechar={fechar} />}
    </>
  );
}
