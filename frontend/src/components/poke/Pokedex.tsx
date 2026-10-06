// POKÉDEX do lobby da Batalha: o aparelho vermelho dos jogos, com a tela de LCD. Mostra, por
// região, quem já foi visto (apareceu numa luta) e quem já foi capturado (está ou esteve na
// coleção: evoluir não apaga a forma anterior). Quem nunca apareceu fica como "???", como nos
// jogos. O detalhe traz tipos, atributos base, a linha evolutiva, onde encontrar no modo
// história e os seus exemplares. Paleta própria, igual em todos os temas (como a arena).
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { COR_TIPO, NOME_TIPO, NIVEL_TROCA_AMIZADE, spriteEstatico, spriteFrente, type Dex } from "../../lib/poke/dex";
import { REGIOES, capturadosDex, nivelDe, type PerfilPoke } from "../../lib/poke/motor";
import { lendaPorId } from "../../lib/poke/lendas";
import { ondeEncontrar } from "../../lib/poke/rotas";
import { nomeItem } from "../../lib/poke/itens";

type Filtro = "todos" | "capturados" | "vistos" | "faltam";
const FILTROS: [Filtro, string][] = [
  ["todos", "Todos"],
  ["capturados", "Capturados"],
  ["vistos", "Só vistos"],
  ["faltam", "Faltam"],
];
const ATRIBUTOS = ["HP", "Ataque", "Defesa", "At. Esp.", "Def. Esp.", "Veloc."];
const num = (id: number) => `#${String(id).padStart(3, "0")}`;

// Abas de região: as cinco da jornada e, se a Pokédex tiver, os iniciais das gerações seguintes.
function abasDeRegiao(dex: Dex) {
  const abas = REGIOES.map((r) => ({ nome: r.nome, ids: range(r.faixa[0], r.faixa[1]).filter((id) => dex.especies[id]) }));
  const outras = Object.keys(dex.especies)
    .map(Number)
    .filter((id) => id > REGIOES[REGIOES.length - 1].faixa[1])
    .sort((a, b) => a - b);
  if (outras.length) abas.push({ nome: "Além", ids: outras });
  return abas;
}
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// A linha toda (da forma base até as finais), com o que faz evoluir cada passo.
function linhaToda(dex: Dex, id: number): { id: number; como?: string; nivel: number }[] {
  let base = id;
  for (let g = 0; g < 4 && dex.especies[base]?.p && dex.especies[dex.especies[base].p!]; g++) base = dex.especies[base].p!;
  const out: { id: number; como?: string; nivel: number }[] = [];
  const andar = (x: number, nivel: number, como?: string) => {
    out.push({ id: x, nivel, como });
    for (const [para, tipo, valor] of dex.especies[x]?.e ?? []) {
      if (!dex.especies[para]) continue;
      andar(para, nivel + 1, tipo === "l" ? `Nv${valor}` : tipo === "i" ? nomeItem(String(valor)) : `Nv${NIVEL_TROCA_AMIZADE}`);
    }
  };
  andar(base, 0);
  return out;
}

export function Pokedex({ dex, perfil, regiaoInicial }: { dex: Dex; perfil: PerfilPoke; regiaoInicial: number }) {
  const abas = useMemo(() => abasDeRegiao(dex), [dex]);
  const vistos = useMemo(() => new Set(perfil.vistos), [perfil.vistos]);
  const capturados = useMemo(() => capturadosDex(perfil), [perfil]);
  const [aba, setAba] = useState(Math.min(regiaoInicial, abas.length - 1));
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<number | null>(null);

  const totalVistos = [...vistos].filter((id) => dex.especies[id]).length;
  const totalCapt = [...capturados].filter((id) => dex.especies[id]).length;
  const total = abas.reduce((a, x) => a + x.ids.length, 0);
  const daAba = abas[aba].ids;
  const vistosAba = daAba.filter((id) => vistos.has(id) || capturados.has(id)).length;
  const captAba = daAba.filter((id) => capturados.has(id)).length;

  const termo = busca.trim().toLowerCase().replace(/^#/, "");
  const lista = (termo ? abas.flatMap((a) => a.ids) : daAba).filter((id) => {
    const visto = vistos.has(id) || capturados.has(id);
    if (filtro === "capturados" && !capturados.has(id)) return false;
    if (filtro === "vistos" && (!visto || capturados.has(id))) return false;
    if (filtro === "faltam" && capturados.has(id)) return false;
    if (!termo) return true;
    // só acha pelo nome quem já foi visto (o nome dos outros ainda é segredo)
    return String(id).padStart(3, "0").includes(termo) || (visto && dex.especies[id].n.toLowerCase().includes(termo));
  });

  const detalhe = (id: number) => (
    <Detalhe key={id} dex={dex} perfil={perfil} id={id} visto={vistos.has(id) || capturados.has(id)} pego={capturados.has(id)} onIr={setSel} onFechar={() => setSel(null)} vistos={vistos} capturados={capturados} />
  );

  // Esc fecha a folha de detalhe (celular)
  useEffect(() => {
    if (sel === null) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [sel]);

  return (
    <div className="dx">
      <div className="dx__topo">
        <span className="dx__lente" aria-hidden>
          <i />
        </span>
        <span className="dx__leds" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <div className="dx__marca">
          Pokédex
          <small>Nacional · {total} espécies</small>
        </div>
        <div className="dx__placar" aria-label={`${totalVistos} vistos e ${totalCapt} capturados de ${total}`}>
          <span>
            <b>{String(totalVistos).padStart(3, "0")}</b> vistos
          </span>
          <span>
            <b>{String(totalCapt).padStart(3, "0")}</b> capturados
          </span>
        </div>
      </div>

      <div className="dx__corpo">
        <div className="dx__esq">
          <div className="dx__botoes" role="tablist" aria-label="Região da Pokédex">
            {abas.map((a, i) => (
              <button key={a.nome} role="tab" aria-selected={aba === i && !termo} className={`dx__botao ${aba === i && !termo ? "dx__botao--on" : ""}`} onClick={() => (setAba(i), setBusca(""))}>
                {a.nome}
              </button>
            ))}
          </div>

          <div className="dx__tela">
            <div className="dx__controles">
              <label className="dx__busca">
                <span aria-hidden>⌕</span>
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="nome ou número" aria-label="Buscar na Pokédex" />
                {busca && (
                  <button onClick={() => setBusca("")} aria-label="Limpar busca">
                    ×
                  </button>
                )}
              </label>
              <div className="dx__filtros" role="radiogroup" aria-label="Filtro">
                {FILTROS.map(([f, nome]) => (
                  <button key={f} role="radio" aria-checked={filtro === f} className={filtro === f ? "on" : ""} onClick={() => setFiltro(f)}>
                    {nome}
                  </button>
                ))}
              </div>
            </div>
            {!termo && (
              <div className="dx__progresso">
                <span>
                  {abas[aba].nome} · vistos {vistosAba}/{daAba.length} · capturados {captAba}/{daAba.length}
                </span>
                <span className="dx__barra" aria-hidden>
                  <i style={{ width: `${(vistosAba / Math.max(1, daAba.length)) * 100}%` }} />
                  <b style={{ width: `${(captAba / Math.max(1, daAba.length)) * 100}%` }} />
                </span>
              </div>
            )}
            {lista.length ? (
              <div className="dx__grade">
                {lista.map((id, k) => {
                  const pego = capturados.has(id);
                  const visto = pego || vistos.has(id);
                  const lenda = lendaPorId(id);
                  return (
                    <button
                      key={id}
                      onClick={() => setSel(id)}
                      className={`dx__ficha ${pego ? "dx__ficha--pego" : visto ? "dx__ficha--visto" : "dx__ficha--nada"} ${sel === id ? "dx__ficha--sel" : ""} ${lenda ? "dx__ficha--lenda" : ""}`}
                      style={{ "--k": Math.min(k, 40) } as CSSProperties}
                      aria-label={`${num(id)} ${visto ? dex.especies[id].n : "não visto"}${pego ? ", capturado" : ""}`}
                    >
                      <span className="dx__num">{num(id)}</span>
                      {visto ? <img src={spriteEstatico(id)} alt="" loading="lazy" draggable={false} /> : <span className="dx__q">?</span>}
                      <span className="dx__nome">{visto ? dex.especies[id].n : "???"}</span>
                      {pego && <i className="dx__bola" aria-hidden />}
                      {lenda && <i className="dx__estrela" aria-hidden>✦</i>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="dx__vazio">{filtro === "capturados" ? "Nenhum capturado aqui ainda." : filtro === "faltam" ? "Completou esta região!" : "Nada encontrado."}</p>
            )}
          </div>
        </div>

        {/* no computador, a segunda tela ao lado da lista */}
        <aside className="dx__dir" aria-label="Detalhe da Pokédex">
          <div className="dx__tela dx__tela--detalhe">{sel === null ? <Espera /> : detalhe(sel)}</div>
        </aside>
      </div>
      {/* no celular, uma folha por cima de tudo (portal: o lobby anima com transform, que prenderia o fixed) */}
      {sel !== null &&
        createPortal(
          <div className="dx dx--folha" role="dialog" aria-modal="true" aria-label="Detalhe da Pokédex">
            <div className="dx__fundo-folha" onClick={() => setSel(null)} aria-hidden />
            <div className="dx__tela dx__tela--detalhe">{detalhe(sel)}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Espera() {
  return (
    <div className="dx__espera">
      <span className="dx__radar" aria-hidden />
      <p>Toque num Pokémon para ver os dados.</p>
    </div>
  );
}

function Detalhe({
  dex,
  perfil,
  id,
  visto,
  pego,
  vistos,
  capturados,
  onIr,
  onFechar,
}: {
  dex: Dex;
  perfil: PerfilPoke;
  id: number;
  visto: boolean;
  pego: boolean;
  vistos: Set<number>;
  capturados: Set<number>;
  onIr: (id: number) => void;
  onFechar: () => void;
}) {
  const e = dex.especies[id];
  const [falhou, setFalhou] = useState(false);
  const lenda = lendaPorId(id);
  const meus = perfil.colecao.filter((m) => m.id === id);
  const linha = linhaToda(dex, id);
  const onde = ondeEncontrar(id);
  const soma = e.s.reduce((a, b) => a + b, 0);
  const cor = COR_TIPO[e.t[0]] ?? "#7AC74C";
  return (
    <div className="dx__det" style={{ "--cor": cor } as CSSProperties}>
      <button className="dx__fechar" onClick={onFechar} aria-label="Fechar">
        <X size={18} />
      </button>
      <div className="dx__cab">
        <span className="dx__num dx__num--grande">{num(id)}</span>
        <span className="dx__titulo">{visto ? e.n : "???"}</span>
        <span className={`dx__selo ${pego ? "dx__selo--pego" : visto ? "dx__selo--visto" : ""}`}>{pego ? "Capturado" : visto ? "Visto" : "Não visto"}</span>
      </div>

      <div className="dx__palco">
        <span className="dx__grade-bg" aria-hidden />
        {visto ? (
          <img src={falhou ? spriteEstatico(id) : spriteFrente(id)} onError={() => setFalhou(true)} alt={e.n} draggable={false} />
        ) : (
          <img src={spriteEstatico(id)} alt="" className="dx__silhueta" draggable={false} />
        )}
        {lenda && <span className="dx__lenda-tag">{lenda.mitico ? "Mítico" : "Lendário"}</span>}
      </div>

      {!visto ? (
        <p className="dx__texto">Ainda não registrado. Encontre este Pokémon numa luta para a Pokédex ler os dados.{lenda ? ` Rastro Lendário: ${lenda.lugar}.` : ""}</p>
      ) : (
        <>
          <div className="dx__tipos">
            {e.t.map((t) => (
              <span key={t} className="dx__tipo" style={{ background: COR_TIPO[t] }}>
                {NOME_TIPO[t]}
              </span>
            ))}
            <span className="dx__info">taxa de captura {e.c}</span>
          </div>

          {lenda && <p className="dx__texto dx__texto--lore">{lenda.lore}</p>}

          <div className="dx__bloco">
            <p className="dx__rotulo">Atributos base · total {soma}</p>
            {e.s.map((v, i) => (
              <div key={i} className="dx__attr">
                <span>{ATRIBUTOS[i]}</span>
                <b>{v}</b>
                <span className="dx__attr-barra">
                  <i style={{ width: `${Math.min(100, (v / 180) * 100)}%`, background: v >= 110 ? "#5ef0a8" : v >= 75 ? "#c8f26b" : v >= 50 ? "#f2d26b" : "#f28b6b" } as CSSProperties} />
                </span>
              </div>
            ))}
          </div>

          {linha.length > 1 && (
            <div className="dx__bloco">
              <p className="dx__rotulo">Linha evolutiva</p>
              <div className="dx__linha">
                {linha.map((x, i) => {
                  const v = vistos.has(x.id) || capturados.has(x.id);
                  return (
                    <span key={x.id} className="dx__elo">
                      {i > 0 && x.como && <span className="dx__como">{x.como} ›</span>}
                      <button onClick={() => onIr(x.id)} className={`dx__mini ${x.id === id ? "on" : ""}`} title={v ? dex.especies[x.id].n : "???"}>
                        <img src={spriteEstatico(x.id)} alt="" style={v ? undefined : { filter: "brightness(0)", opacity: 0.55 }} />
                        <span>{v ? dex.especies[x.id].n : "???"}</span>
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="dx__bloco">
            <p className="dx__rotulo">Onde encontrar</p>
            {lenda ? (
              <p className="dx__texto">
                Rastro Lendário de {REGIOES[lenda.regiao].nome}: <b>{lenda.lugar}</b>
                {lenda.mitico ? " (lenda mítica)" : ""}.
              </p>
            ) : onde.length ? (
              <ul className="dx__onde">
                {onde.map((o) => (
                  <li key={o.regiao}>
                    <b>{REGIOES[o.regiao]?.nome}</b> {o.rotas.slice(0, 5).join(" · ")}
                    {o.rotas.length > 5 ? ` · +${o.rotas.length - 5}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dx__texto">Não aparece no caminho: procure na Zona Safári, evolua um parente ou enfrente treinadores.</p>
            )}
          </div>

          {meus.length > 0 && (
            <div className="dx__bloco">
              <p className="dx__rotulo">Seus ({meus.length})</p>
              <div className="dx__meus">
                {meus.map((m) => (
                  <span key={m.uid}>
                    Nv{nivelDe(m)}
                    {perfil.time.includes(m.uid) ? " · no time" : " · no PC"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
