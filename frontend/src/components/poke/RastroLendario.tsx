// RASTRO LENDÁRIO no lobby: um céu noturno com as lendas da região como medalhões. Antes de
// aparecer numa luta a lenda é só silhueta; capturada, ganha o selo dourado. Escolher uma abre
// o santuário (lugar, lenda dos jogos, quem da equipe vilã está atrás dela) e o botão de seguir
// o rastro. As regras de quando abre estão no motor (lendaLiberada).
import { useState, type CSSProperties } from "react";
import { Lock, Sparkles } from "lucide-react";
import { COR_TIPO, NOME_TIPO, spriteEstatico, spriteFrente, spriteTreinador, type Dex } from "../../lib/poke/dex";
import { REGIOES, insigniasDe, lendaCapturada, lendaLiberada, nivelDaLenda, regiaoAtual, type PerfilPoke } from "../../lib/poke/motor";
import { EQUIPES, INSIGNIAS_RASTRO, LENDAS, type Lenda } from "../../lib/poke/lendas";

// Estrelas fixas (posições pseudoaleatórias estáveis): o céu não muda a cada render.
const ESTRELAS = Array.from({ length: 46 }, (_, i) => ({ x: (i * 73.3) % 100, y: (i * 41.7) % 100, s: 0.6 + ((i * 7) % 5) / 4, d: ((i * 0.37) % 4).toFixed(2) }));

export function RastroLendario({ dex, perfil, nivelTime, disabled, onSeguir }: { dex: Dex; perfil: PerfilPoke; nivelTime: number; disabled: boolean; onSeguir: (lenda: number) => void }) {
  const r = regiaoAtual(perfil);
  // as lendas da região atual e as das regiões que ficaram para trás
  const lendas = LENDAS.filter((l) => l.regiao <= r).sort((a, b) => b.regiao - a.regiao || Number(!!a.mitico) - Number(!!b.mitico) || a.id - b.id);
  const pegas = lendas.filter((l) => lendaCapturada(perfil, l.id)).length;
  const aberto = lendas.some((l) => lendaLiberada(perfil, l));
  const primeira = lendas.find((l) => lendaLiberada(perfil, l) && !lendaCapturada(perfil, l.id)) ?? lendas[0];
  const [sel, setSel] = useState<number>(primeira?.id ?? 0);
  const l = lendas.find((x) => x.id === sel) ?? primeira;
  if (!l) return null;
  const ins = insigniasDe(perfil, r);

  return (
    <section className={`rl ${aberto ? "" : "rl--fechado"}`} aria-label="Rastro Lendário">
      <div className="rl__ceu" aria-hidden>
        {ESTRELAS.map((e, i) => (
          <i key={i} style={{ left: `${e.x}%`, top: `${e.y}%`, "--s": e.s, "--d": `${e.d}s` } as CSSProperties} />
        ))}
      </div>
      <header className="rl__cab">
        <div>
          <p className="rl__sobre">
            <Sparkles size={13} /> Modo lendário
          </p>
          <h3 className="rl__titulo">Rastro Lendário</h3>
          <p className="rl__sub">
            {aberto
              ? "Siga o rastro até o santuário, vença a equipe vilã que também caça a lenda e capture-a. Ela não desmaia: deixe-a por um fio e lance a bola."
              : `As lendas de ${REGIOES[r].nome} acordam antes do último ginásio: ${ins}/${INSIGNIAS_RASTRO} insígnias.`}
          </p>
        </div>
        <div className="rl__placar">
          <b>{pegas}</b>
          <span>/{lendas.length}</span>
          <small>capturadas</small>
        </div>
      </header>

      <div className="rl__medalhoes" role="listbox" aria-label="Lendas">
        {lendas.map((x, i) => {
          const vista = perfil.vistos.includes(x.id);
          const pega = lendaCapturada(perfil, x.id);
          const livre = lendaLiberada(perfil, x);
          const cor = COR_TIPO[dex.especies[x.id]?.t[0] ?? 0];
          const novaRegiao = i > 0 && lendas[i - 1].regiao !== x.regiao;
          return (
            <button
              key={x.id}
              role="option"
              aria-selected={x.id === l.id}
              onClick={() => setSel(x.id)}
              className={`rl__med ${x.id === l.id ? "rl__med--sel" : ""} ${pega ? "rl__med--pega" : ""} ${!livre ? "rl__med--trancada" : ""} ${novaRegiao ? "rl__med--quebra" : ""}`}
              style={{ "--cor": cor, "--i": i } as CSSProperties}
              title={`${dex.especies[x.id]?.n} · ${x.lugar}`}
            >
              <span className="rl__disco">
                <img src={spriteEstatico(x.id)} alt="" draggable={false} style={vista || pega ? undefined : { filter: "brightness(0)" }} />
                {pega && <i className="rl__check" aria-hidden>✓</i>}
                {!livre && <Lock size={12} className="rl__cadeado" />}
              </span>
              <span className="rl__nome">{dex.especies[x.id]?.n}</span>
              {x.regiao !== r && <span className="rl__reg">{REGIOES[x.regiao].nome}</span>}
              {x.mitico && x.regiao === r && <span className="rl__reg rl__reg--mit">mítico</span>}
            </button>
          );
        })}
      </div>

      <Santuario dex={dex} perfil={perfil} l={l} nivelTime={nivelTime} disabled={disabled} onSeguir={onSeguir} />
    </section>
  );
}

function Santuario({ dex, perfil, l, nivelTime, disabled, onSeguir }: { dex: Dex; perfil: PerfilPoke; l: Lenda; nivelTime: number; disabled: boolean; onSeguir: (lenda: number) => void }) {
  const e = dex.especies[l.id];
  const vista = perfil.vistos.includes(l.id);
  const pega = lendaCapturada(perfil, l.id);
  const livre = lendaLiberada(perfil, l);
  const eq = EQUIPES[l.equipe];
  const cor = COR_TIPO[e.t[0]];
  const motivo = pega
    ? "Ela já é sua. Cada lenda é uma só, como nos jogos."
    : livre
      ? null
      : `Abre com ${INSIGNIAS_RASTRO} insígnias de ${REGIOES[l.regiao].nome}.`;
  return (
    <div key={l.id} className="rl__santuario" style={{ "--cor": cor } as CSSProperties}>
      <div className="rl__retrato">
        <span className="rl__halo" aria-hidden />
        <img src={vista || pega ? spriteFrente(l.id) : spriteEstatico(l.id)} alt={vista ? e.n : ""} draggable={false} style={vista || pega ? undefined : { filter: "brightness(0) drop-shadow(0 0 10px var(--cor))" }} />
      </div>
      <div className="rl__ficha">
        <p className="rl__lugar">{l.lugar}</p>
        <p className="rl__lenda">
          {e.n}
          {e.t.map((t) => (
            <span key={t} className="rl__tipo" style={{ background: COR_TIPO[t] }}>
              {NOME_TIPO[t]}
            </span>
          ))}
        </p>
        <p className="rl__lore">“{l.lore}”</p>
        <div className="rl__trilha" aria-label="O que tem no rastro">
          <span title={eq.nome}>
            <img src={spriteTreinador(eq.recrutas[0])} alt="" /> 2 recrutas
          </span>
          <span className="rl__seta">›</span>
          <span>3 selvagens</span>
          <span className="rl__seta">›</span>
          <span title={l.chefe.titulo}>
            <img src={spriteTreinador(l.chefe.sprite)} alt="" /> {l.chefe.nome}
          </span>
          <span className="rl__seta">›</span>
          <span className="rl__alvo">{e.n} Nv{nivelDaLenda(nivelTime, l)}</span>
        </div>
        {motivo ? (
          <p className="rl__motivo">
            {pega ? "✓ " : <Lock size={13} className="mr-1 inline" />}
            {motivo}
          </p>
        ) : (
          <button className="rl__botao" disabled={disabled} onClick={() => onSeguir(l.id)}>
            <Sparkles size={16} /> Seguir o rastro
          </button>
        )}
        {disabled && !motivo && <p className="rl__motivo">Termine a partida pausada antes.</p>}
      </div>
    </div>
  );
}
