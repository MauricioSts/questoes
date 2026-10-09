// MOVE LAB (/batalha/lab): bancada para ver e acertar o visual dos 559 golpes. Usa a mesma
// Arena e o mesmo motor da batalha, com os controles que a batalha não tem: tier, resultado,
// velocidade, seed, reduced-motion, campo persistente, status no alvo, sequência por geração
// e um teste de estresse do tier épico (partículas vivas e tempo de quadro).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Arena, type LadoVis } from "../components/poke/Arena";
import { CATALOGO, TIPOS_EN } from "../components/poke/golpes/catalogo";
import { desenharForma } from "../components/poke/golpes/formas";
import { MotorGolpes } from "../components/poke/golpes/motor";
import { RECEITA_POR_SLUG, spritesFx } from "../components/poke/golpes/sprites/fx";
import type { ModoVisual } from "../components/poke/golpes/sprites/tipos";
import { specPorSlug, tierDe } from "../components/poke/golpes/spec";
import { ARQUETIPOS, type Arquetipo, type MoveVisualSpec, type Resultado } from "../components/poke/golpes/tipos";
import { COR_TIPO, NOME_TIPO } from "../lib/poke/dex";
import type { Status } from "../lib/poke/motor";
import "../movelab.css";

const PODER_TIER = [30, 60, 100, 150];
const NOME_TIER = ["Leve", "Médio", "Forte", "Épico"];
const RESULTADOS: [Resultado, string][] = [
  ["hit", "Acerto"],
  ["crit", "Crítico"],
  ["superEffective", "Super efetivo"],
  ["notVeryEffective", "Pouco efetivo"],
  ["noEffect", "Sem efeito"],
  ["miss", "Errou"],
];
const FASES = ["anticipation", "travel", "impact", "aftermath"] as const;
const NOME_FASE = { anticipation: "Antecipação", travel: "Trajeto", impact: "Impacto", aftermath: "Resíduo" };
const PARES: [number, number, string][] = [
  [6, 9, "Charizard × Blastoise"],
  [25, 95, "Pikachu × Onix"],
  [149, 150, "Dragonite × Mewtwo"],
  [445, 448, "Garchomp × Lucario"],
  [637, 609, "Volcarona × Chandelure"],
];
const SELO: Record<ModoVisual, [string, string]> = {
  asset: ["asset original", "#3DDC84"],
  approx: ["aproximado", "#FFC542"],
  recolor: ["aproximado · reaproveitado", "#FFC542"],
  pixel: ["pixel art própria", "#5AB4FF"],
  fallback: ["fallback procedural", "#9AA3B5"],
};
const ESTRESSE = ["explosion", "blizzard", "draco-meteor", "hyper-beam", "earthquake", "blast-burn", "hurricane", "fire-blast"];

function lado(id: number, nome: string, status: Status, chave: number): LadoVis {
  return { id, nome, nivel: 50, hp: 100, hpMax: 100, status, anim: "", chave, xp: 0.4 };
}

export function MoveLab() {
  const motor = useMemo(() => new MotorGolpes(), []);
  useEffect(() => () => motor.destruir(), [motor]);
  const [fxPronto, setFxPronto] = useState(false);
  useEffect(() => {
    let vivo = true;
    void spritesFx.iniciar().then(() => spritesFx.preCarregar(CATALOGO.map((l) => l.slug))).then(() => vivo && setFxPronto(!!spritesFx.atlas));
    return () => {
      vivo = false;
      spritesFx.ativo = true;
    };
  }, []);
  const [usarSprites, setUsarSprites] = useState(true);
  useEffect(() => {
    spritesFx.ativo = usarSprites;
  }, [usarSprites]);
  const [pausado, setPausado] = useState(false);
  useEffect(() => {
    motor.pausado = pausado;
  }, [motor, pausado]);
  const [verJson, setVerJson] = useState(false);
  const [modoFiltro, setModoFiltro] = useState<ModoVisual | "">("");

  const [busca, setBusca] = useState("");
  const [geracao, setGeracao] = useState<number>(0);
  const [arq, setArq] = useState<Arquetipo | "">("");
  const [slug, setSlug] = useState("thunderbolt");
  const [tierForcado, setTierForcado] = useState<number | null>(null);
  const [resultado, setResultado] = useState<Resultado>("hit");
  const [vel, setVel] = useState(1);
  const [seed, setSeed] = useState(7);
  const [rm, setRm] = useState(false);
  const [manterCampo, setManterCampo] = useState(false);
  const [inverte, setInverte] = useState(false);
  const [par, setPar] = useState(0);
  const [statusAlvo, setStatusAlvo] = useState<Status>("");
  const [fase, setFase] = useState<string>("");
  const [tocando, setTocando] = useState(false);
  const [seq, setSeq] = useState<number | null>(null);
  const [leitura, setLeitura] = useState({ vivas: 0, pico: 0, quadro: 0, piorQuadro: 0 });
  const [grade, setGrade] = useState(false);
  const pararSeq = useRef(false);

  const spec = specPorSlug(slug)!;
  const linha = CATALOGO.find((l) => l.slug === slug)!;
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return CATALOGO.filter(
      (l) =>
        (!geracao || l.geracao === geracao) &&
        (!arq || l.arquetipo === arq) &&
        (!modoFiltro || (spritesFx.entrada(l.slug)?.modo ?? "fallback") === modoFiltro) &&
        (!q || l.nome.toLowerCase().includes(q) || l.slug.includes(q) || l.notas.toLowerCase().includes(q) || NOME_TIPO[l.tipo].toLowerCase().includes(q))
    );
  }, [busca, geracao, arq, modoFiltro]);
  const entrada = spritesFx.entrada(slug);
  const modo: ModoVisual = entrada?.modo ?? "fallback";
  const receita = entrada?.receita ? RECEITA_POR_SLUG.get(entrada.receita) : undefined;

  // leitura de desempenho
  useEffect(() => {
    const t = setInterval(() => {
      setLeitura((l) => ({ vivas: motor.vivas, pico: motor.picoVivas, quadro: motor.tempoQuadro, piorQuadro: Math.max(l.piorQuadro, motor.tempoQuadro) }));
    }, 120);
    return () => clearInterval(t);
  }, [motor]);

  useEffect(() => {
    motor.reducedMotion = rm;
  }, [motor, rm]);

  const [pA, pB] = PARES[par];
  const meus = [lado(pA, `#${pA}`, "", 1), null];
  const inimigos = [lado(pB, `#${pB}`, statusAlvo, 2), null];

  async function tocar(s: MoveVisualSpec = spec) {
    const de = inverte ? "inimigo-0" : "meu-0";
    const para = inverte ? "meu-0" : "inimigo-0";
    const A = motor.atores.ancora(de);
    const T = motor.atores.ancora(para);
    if (!A || !T) return;
    setTocando(true);
    setFase("");
    const power = tierForcado === null ? (linhaPoder(s) ?? 60) : PODER_TIER[tierForcado];
    const t = motor.tocar(s, { attacker: A, targets: [T], power, outcome: resultado, speed: vel, seed, reducedMotion: rm, manterCampo, onPhase: (f) => setFase(f) });
    await t.fim;
    setTocando(false);
  }

  async function sequencia(g: number) {
    pararSeq.current = false;
    const xs = CATALOGO.filter((l) => l.geracao === g);
    for (let i = 0; i < xs.length && !pararSeq.current; i++) {
      setSeq(i);
      setSlug(xs[i].slug);
      await tocar(specPorSlug(xs[i].slug)!);
      motor.definirCampo("tudo", null);
      motor.definirCampo("meu", null);
      motor.definirCampo("inimigo", null);
      await new Promise((r) => setTimeout(r, 180 / vel));
    }
    setSeq(null);
  }

  async function estresse() {
    setLeitura((l) => ({ ...l, piorQuadro: 0 }));
    motor.picoVivas = 0;
    const de = motor.atores.ancora("meu-0");
    const para = motor.atores.ancora("inimigo-0");
    if (!de || !para) return;
    setTocando(true);
    const ts = ESTRESSE.map((s, i) => motor.tocar(specPorSlug(s)!, { attacker: de, targets: [para], power: 150, outcome: "superEffective", seed: i + 1, speed: vel }));
    await Promise.all(ts.map((t) => t.fim));
    setTocando(false);
  }

  const cor = COR_TIPO[spec.type];
  const tierAtual = tierForcado ?? tierDe(spec, linhaPoder(spec) ?? 60);

  return (
    <div className="ml" style={{ "--ml-cor": cor } as CSSProperties}>
      <header className="ml__topo">
        <Link to="/batalha" className="ml__voltar">
          ← Batalha
        </Link>
        <div>
          <p className="ml__rotulo">Bancada de efeitos · {CATALOGO.length} golpes · gerações 1–5</p>
          <h1 className="ml__titulo">Move Lab</h1>
        </div>
        <div className="ml__medidores" aria-live="off">
          <Medidor rotulo="partículas" valor={leitura.vivas} max={400} />
          <Medidor rotulo="pico" valor={leitura.pico} max={400} />
          <Medidor rotulo="ms/quadro" valor={Number(leitura.quadro.toFixed(1))} max={16.7} />
          <Medidor rotulo="pior ms" valor={Number(leitura.piorQuadro.toFixed(1))} max={16.7} />
        </div>
      </header>

      <div className="ml__corpo">
        {/* catálogo */}
        <aside className="ml__lista">
          <input className="ml__busca" placeholder="Buscar golpe, tipo ou descrição…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className="ml__filtros">
            {[0, 1, 2, 3, 4, 5].map((g) => (
              <button key={g} className={`ml__chip ${geracao === g ? "is-on" : ""}`} onClick={() => setGeracao(g)}>
                {g ? `G${g}` : "Todas"}
              </button>
            ))}
          </div>
          <select className="ml__select" value={arq} onChange={(e) => setArq(e.target.value as Arquetipo | "")}>
            <option value="">Todos os arquétipos</option>
            {ARQUETIPOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select className="ml__select" value={modoFiltro} onChange={(e) => setModoFiltro(e.target.value as ModoVisual | "")}>
            <option value="">Todos os visuais</option>
            <option value="asset">Asset original</option>
            <option value="approx">Aproximado (combinado)</option>
            <option value="recolor">Reaproveitado / recolor</option>
            <option value="pixel">Pixel art própria</option>
            <option value="fallback">Fallback procedural</option>
          </select>
          <p className="ml__conta">{lista.length} golpes</p>
          <ul className="ml__itens">
            {lista.map((l) => (
              <li key={l.slug}>
                <button className={`ml__item ${l.slug === slug ? "is-on" : ""}`} onClick={() => setSlug(l.slug)} onDoubleClick={() => void tocar(specPorSlug(l.slug)!)}>
                  <i style={{ background: COR_TIPO[l.tipo] }} />
                  <span>{l.nome}</span>
                  <em>{l.arquetipo}</em>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* palco */}
        <section className="ml__palco">
          <div className="ml__arena">
            <Arena inimigos={inimigos} meus={meus} treinador={null} mensagem={tocando ? `${inverte ? `#${pB}` : `#${pA}`} usou ${spec.nome}!` : linha.notas} motor={motor} textos={[]} bola={null} cor={cor} />
          </div>
          <ol className="ml__fases">
            {FASES.map((f) => (
              <li key={f} className={fase === f ? "is-on" : FASES.indexOf(f) < FASES.indexOf(fase as (typeof FASES)[number]) ? "is-feito" : ""}>
                {NOME_FASE[f]}
              </li>
            ))}
          </ol>
          <div className="ml__acoes">
            <button className="ml__tocar" onClick={() => void tocar()} disabled={seq !== null}>
              ▶ Tocar {spec.nome}
            </button>
            <button className={`ml__btn ${pausado ? "is-on" : ""}`} onClick={() => setPausado((p) => !p)}>
              {pausado ? "▶ Continuar" : "❚❚ Pausar"}
            </button>
            <button className="ml__btn" onClick={() => motor.passo()} disabled={!pausado}>
              +1 quadro
            </button>
            <button className="ml__btn" onClick={() => motor.pular()}>
              Pular
            </button>
            <button className="ml__btn" onClick={() => motor.limparTudo()}>
              Limpar cena
            </button>
            <button className="ml__btn" onClick={() => void estresse()} disabled={tocando}>
              Estresse épico ×{ESTRESSE.length}
            </button>
          </div>
          <div className="ml__seq">
            <span>Tocar em sequência:</span>
            {[1, 2, 3, 4, 5].map((g) => (
              <button key={g} className="ml__chip" disabled={seq !== null} onClick={() => void sequencia(g)}>
                Geração {g}
              </button>
            ))}
            {seq !== null && (
              <button className="ml__chip is-on" onClick={() => (pararSeq.current = true)}>
                Parar ({seq + 1})
              </button>
            )}
          </div>
        </section>

        {/* controles + inspetor */}
        <aside className="ml__painel">
          <h2 className="ml__nome">{spec.nome}</h2>
          <p className="ml__slug">
            {spec.slug} · G{spec.geracao} · <span style={{ color: cor }}>{TIPOS_EN[spec.type]}</span> · {spec.archetype}
          </p>
          <p className="ml__nota">{spec.notes}</p>
          <p className="ml__selo" style={{ "--selo": SELO[modo][1] } as CSSProperties}>
            {SELO[modo][0]}
            {entrada?.receita && entrada.receita !== slug && <span> · receita {entrada.receita}{entrada.tipo !== undefined ? ` em ${TIPOS_EN[entrada.tipo]}` : ""}</span>}
            {!fxPronto && modo !== "fallback" && <span> · assets ausentes: toca o procedural</span>}
          </p>
          {receita?.note && <p className="ml__nota">{receita.note}</p>}

          <Campo rotulo="Tier">
            <div className="ml__seg">
              <button className={tierForcado === null ? "is-on" : ""} onClick={() => setTierForcado(null)}>
                Auto
              </button>
              {NOME_TIER.map((n, i) => (
                <button key={n} className={tierForcado === i ? "is-on" : ""} onClick={() => setTierForcado(i)}>
                  {n}
                </button>
              ))}
            </div>
            <small>Agora: {NOME_TIER[tierAtual]}</small>
          </Campo>
          <Campo rotulo="Resultado">
            <div className="ml__seg ml__seg--quebra">
              {RESULTADOS.map(([r, n]) => (
                <button key={r} className={resultado === r ? "is-on" : ""} onClick={() => setResultado(r)}>
                  {n}
                </button>
              ))}
            </div>
          </Campo>
          <Campo rotulo="Velocidade">
            <div className="ml__seg">
              {[0.25, 0.5, 1, 2].map((v) => (
                <button key={v} className={vel === v ? "is-on" : ""} onClick={() => setVel(v)}>
                  {v}×
                </button>
              ))}
            </div>
          </Campo>
          <Campo rotulo="Seed">
            <div className="ml__linha">
              <input type="number" className="ml__num" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
              <button className="ml__btn" onClick={() => setSeed(Math.floor(Math.random() * 99999))}>
                Sortear
              </button>
            </div>
          </Campo>
          <Campo rotulo="Cena">
            <select className="ml__select" value={par} onChange={(e) => setPar(Number(e.target.value))}>
              {PARES.map(([, , n], i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
            <label className="ml__check">
              <input type="checkbox" checked={inverte} onChange={(e) => setInverte(e.target.checked)} /> Inimigo ataca
            </label>
            <label className="ml__check">
              <input type="checkbox" checked={rm} onChange={(e) => setRm(e.target.checked)} /> Reduced motion
            </label>
            <label className="ml__check">
              <input type="checkbox" checked={usarSprites} onChange={(e) => setUsarSprites(e.target.checked)} /> Sprites (desligado = só procedural)
            </label>
            <label className="ml__check">
              <input type="checkbox" checked={manterCampo} onChange={(e) => setManterCampo(e.target.checked)} /> Manter campo/clima
            </label>
            <select className="ml__select" value={statusAlvo} onChange={(e) => setStatusAlvo(e.target.value as Status)}>
              <option value="">Alvo sem status</option>
              <option value="burn">Queimado</option>
              <option value="poison">Envenenado</option>
              <option value="paralysis">Paralisado</option>
              <option value="sleep">Dormindo</option>
              <option value="freeze">Congelado</option>
            </select>
          </Campo>

          <dl className="ml__spec">
            <Linha k="forma" v={spec.shape} />
            <Linha k="movimento" v={spec.motion} />
            {spec.sabor && <Linha k="contato" v={spec.sabor} />}
            {spec.hits && <Linha k="hits" v={spec.hits.min === spec.hits.max ? `${spec.hits.min}` : `${spec.hits.min}–${spec.hits.max}`} />}
            {spec.stats && <Linha k="setas" v={spec.stats.map((s) => `${s.n > 0 ? "↑".repeat(s.n) : "↓".repeat(-s.n)}${s.stat}`).join(" ")} />}
            {spec.statusInflige && <Linha k="status" v={spec.statusInflige} />}
            {spec.campo && <Linha k="campo" v={spec.campo} />}
            {spec.twoTurn && <Linha k="dois turnos" v={spec.twoTurn.persistentState} />}
            {spec.recoil && <Linha k="recoil" v="sim" />}
            {spec.recarga && <Linha k="recarga" v="sim" />}
            {spec.dinamico && <Linha k="tipo" v="dinâmico" />}
            <Linha
              k="paleta"
              v={
                <span className="ml__paleta">
                  {[spec.palette.primary, spec.palette.secondary, spec.palette.accent].map((c) => (
                    <i key={c} style={{ background: c }} title={c} />
                  ))}
                  {spec.palette.arcoiris && "arco-íris"}
                </span>
              }
            />
          </dl>
          {receita && (
            <>
              <button className="ml__btn ml__btn--largo" onClick={() => setVerJson((v) => !v)}>
                {verJson ? "Fechar JSON" : `JSON da receita (${receita.slug})`}
              </button>
              {verJson && <pre className="ml__json">{JSON.stringify(receita, null, 1)}</pre>}
            </>
          )}
          <button className="ml__btn ml__btn--largo" onClick={() => setGrade((g) => !g)}>
            {grade ? "Fechar grade" : "Grade de pré-visualização"}
          </button>
        </aside>
      </div>

      {grade && (
        <section className="ml__grade">
          {lista.map((l) => (
            <button key={l.slug} className={`ml__carta ${l.slug === slug ? "is-on" : ""}`} onClick={() => setSlug(l.slug)} onDoubleClick={() => void tocar(specPorSlug(l.slug)!)} style={{ "--c": COR_TIPO[l.tipo] } as CSSProperties}>
              <Icone spec={specPorSlug(l.slug)!} />
              <span>{l.nome}</span>
              <em>{l.arquetipo}</em>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

// Poder do golpe na pokédex do jogo não está aqui (o Lab não carrega o JSON): sem poder, o
// tier sai do texto (épico se dramático) ou é médio. O seletor de tier força qualquer um.
function linhaPoder(s: MoveVisualSpec): number | null {
  if (s.dramatico) return 150;
  if (/enorme|colossal|gigante|massiv|imens|devastador/.test(s.notes)) return 110;
  if (/pequen|fraco|leve|simples|rápida/.test(s.notes)) return 35;
  return null;
}

function Icone({ spec }: { spec: MoveVisualSpec }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = 40 * dpr;
    g.setTransform(dpr, 0, 0, dpr, 20, 20);
    g.rotate(-0.4);
    desenharForma(g, spec.shape, 13, spec.palette.primary, spec.palette.secondary, 0);
  }, [spec]);
  return <canvas ref={ref} className="ml__icone" aria-hidden />;
}

function Medidor({ rotulo, valor, max }: { rotulo: string; valor: number; max: number }) {
  const f = Math.min(1, valor / max);
  return (
    <div className="ml__medidor">
      <b>{valor}</b>
      <span>{rotulo}</span>
      <i style={{ width: `${f * 100}%`, background: f > 0.9 ? "#FF5A5A" : "var(--ml-cor)" }} />
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="ml__campo">
      <p>{rotulo}</p>
      {children}
    </div>
  );
}

function Linha({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
