// Palco da Batalha no estilo dos jogos de monstrinho: a questão selvagem no alto à
// direita, o parceiro embaixo à esquerda, cada um com a caixa de nome e barra de HP, e a
// caixa de texto no pé. Quem manda nas animações é a tela (pages/Batalha): aqui só se
// traduz o estado em classes.
import type { Tema } from "../../store/theme";
import { SpriteInimigo, SpriteParceiro, type TipoQuestao } from "./sprites";

export type AnimParceiro = "parado" | "ataca" | "dano";
export type AnimInimigo = "entra" | "parado" | "ataca" | "dano" | "desmaia" | "foge" | "sumido";

interface Props {
  tema: Tema;
  parceiro: { nome: string; nivel: number; hp: number; hpMax: number; xp: number; xpProx: number };
  inimigo: { nome: string; nivel: number | null; tipo: TipoQuestao; chefe: boolean; hp: number; retorno: boolean } | null;
  animParceiro: AnimParceiro;
  animInimigo: AnimInimigo;
  mensagem: string;
  aguardando?: boolean; // mostra a setinha piscando: há algo para o jogador fazer
}

function BarraHp({ valor, max }: { valor: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  const cor = pct > 50 ? "#3BC46B" : pct > 20 ? "#F2B92E" : "#E8474C";
  return (
    <div className="bt-hp">
      <span className="bt-hp__rotulo">HP</span>
      <div className="bt-hp__trilho">
        <div className="bt-hp__barra" style={{ width: `${pct}%`, background: cor }} />
      </div>
    </div>
  );
}

export function Arena({ tema, parceiro, inimigo, animParceiro, animInimigo, mensagem, aguardando }: Props) {
  return (
    <div className="bt-arena" data-arena={tema}>
      <div className="bt-arena__ceu" />

      {/* Questão selvagem */}
      {inimigo && (
        <>
          <div className="bt-info bt-info--inimigo">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-bold">{inimigo.nome}</span>
              <span className="shrink-0 text-[11px] font-bold">{inimigo.nivel === null ? "NOVA" : `Nv.${inimigo.nivel}`}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="bt-tipo" style={{ background: inimigo.tipo.cor }}>{inimigo.tipo.nome}</span>
              {inimigo.chefe && <span className="bt-tipo" style={{ background: "#141018" }}>CHEFE</span>}
              {inimigo.retorno && <span className="bt-tipo" style={{ background: "#6B7280" }}>VOLTOU</span>}
            </div>
            <BarraHp valor={inimigo.hp} max={100} />
          </div>
          <div className="bt-plataforma bt-plataforma--inimigo" />
          <div className={`bt-sprite bt-sprite--inimigo bt-inimigo--${animInimigo} ${inimigo.chefe ? "bt-sprite--chefe" : ""}`}>
            <SpriteInimigo tipo={inimigo.tipo} chefe={inimigo.chefe} />
          </div>
        </>
      )}

      {/* Parceiro */}
      <div className="bt-plataforma bt-plataforma--parceiro" />
      <div className={`bt-sprite bt-sprite--parceiro bt-parceiro--${animParceiro}`}>
        <SpriteParceiro tema={tema} />
      </div>
      <div className="bt-info bt-info--parceiro">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-bold">{parceiro.nome}</span>
          <span className="shrink-0 text-[11px] font-bold">Nv.{parceiro.nivel}</span>
        </div>
        <BarraHp valor={parceiro.hp} max={parceiro.hpMax} />
        <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
          <div className="bt-xp">
            <div style={{ width: `${Math.min(100, (parceiro.xp / parceiro.xpProx) * 100)}%` }} />
          </div>
          <span>
            {parceiro.hp}/{parceiro.hpMax}
          </span>
        </div>
      </div>

      {/* Caixa de texto */}
      <div className="bt-texto" aria-live="polite">
        <span key={mensagem} className="bt-texto__msg">
          {mensagem}
        </span>
        {aguardando && <span className="bt-texto__seta">▼</span>}
      </div>
    </div>
  );
}
