// Palco da Batalha no estilo dos jogos de monstrinho: a questão selvagem no alto à
// direita, o parceiro embaixo à esquerda, cada um com a caixa de nome e barra de HP, e a
// caixa de texto no pé. Quem manda nas animações é a tela (pages/Batalha): aqui só se
// traduz o estado em classes e se desenha a camada de efeitos por cima.
import { useEffect, useRef, useState } from "react";
import type { Tema } from "../../store/theme";
import { SpriteInimigo, SpriteParceiro, type TipoQuestao } from "./sprites";
import { Efeitos, type Efeito } from "./Efeitos";

export type AnimParceiro = "parado" | "ataca" | "dano" | "desmaia" | "comemora";
export type AnimInimigo = "entra" | "entra-chefe" | "parado" | "ataca" | "dano" | "desmaia" | "foge" | "capturado" | "sumido";

interface Props {
  tema: Tema;
  parceiro: { nome: string; nivel: number; estagio: number; hp: number; hpMax: number; xp: number; xpProx: number };
  inimigo: { nome: string; nivel: number | null; tipo: TipoQuestao; chefe: boolean; hp: number; retorno: boolean } | null;
  animParceiro: AnimParceiro;
  animInimigo: AnimInimigo;
  mensagem: string;
  aguardando?: boolean; // mostra a setinha piscando: há algo para o jogador fazer
  efeitos: Efeito[];
  tremor: number; // muda o valor = a arena treme uma vez
  flash: { n: number; cor: string } | null;
}

// Número que corre até o valor novo (HP caindo ou subindo), como nos jogos.
function useContador(valor: number) {
  const [mostrado, setMostrado] = useState(valor);
  const atual = useRef(valor);
  useEffect(() => {
    const de = atual.current;
    if (de === valor) return;
    const ini = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - ini) / 650);
      const v = Math.round(de + (valor - de) * k);
      atual.current = v;
      setMostrado(v);
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return mostrado;
}

function BarraHp({ valor, max }: { valor: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  const cor = pct > 50 ? "#3BC46B" : pct > 20 ? "#F2B92E" : "#E8474C";
  return (
    <div className="bt-hp">
      <span className="bt-hp__rotulo">HP</span>
      <div className="bt-hp__trilho">
        {/* rastro: a parte perdida fica clara um instante antes de sumir */}
        <div className="bt-hp__rastro" style={{ width: `${pct}%` }} />
        <div className={`bt-hp__barra ${pct <= 20 ? "bt-hp__barra--critico" : ""}`} style={{ width: `${pct}%`, background: cor }} />
      </div>
    </div>
  );
}

export function Arena({ tema, parceiro, inimigo, animParceiro, animInimigo, mensagem, aguardando, efeitos, tremor, flash }: Props) {
  const hp = useContador(parceiro.hp);
  // Tremor pela Web Animations API: remontar a arena por `key` reiniciaria os sprites.
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tremor || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    raiz.current?.animate(
      [
        { transform: "translate(0,0)" },
        { transform: "translate(-7px,3px)" },
        { transform: "translate(6px,-4px)" },
        { transform: "translate(-4px,2px)" },
        { transform: "translate(2px,-1px)" },
        { transform: "translate(0,0)" },
      ],
      { duration: 380, easing: "ease-out" }
    );
  }, [tremor]);
  return (
    <div ref={raiz} className="bt-arena" data-arena={tema}>
      <div className="bt-arena__ceu" />
      <div className="bt-arena__particulas" />

      {/* Questão selvagem */}
      {inimigo && (
        <>
          <div className="bt-info bt-info--inimigo" key={`i-${inimigo.nome}-${inimigo.retorno}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-bold">{inimigo.nome}</span>
              <span className="shrink-0 text-[11px] font-bold">{inimigo.nivel === null ? "NOVA" : `Nv.${inimigo.nivel}`}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="bt-tipo" style={{ background: inimigo.tipo.cor }}>{inimigo.tipo.nome}</span>
              {inimigo.chefe && <span className="bt-tipo bt-tipo--chefe">CHEFE</span>}
              {inimigo.retorno && <span className="bt-tipo" style={{ background: "#6B7280" }}>VOLTOU</span>}
            </div>
            <BarraHp valor={inimigo.hp} max={100} />
          </div>
          <div className="bt-plataforma bt-plataforma--inimigo" />
          <div className={`bt-sprite bt-sprite--inimigo bt-inimigo--${animInimigo} ${inimigo.chefe ? "bt-sprite--chefe" : ""}`}>
            <SpriteInimigo tipo={inimigo.tipo} chefe={inimigo.chefe} nivel={inimigo.nivel} />
          </div>
        </>
      )}

      {/* Parceiro */}
      <div className="bt-plataforma bt-plataforma--parceiro" />
      <div className={`bt-sprite bt-sprite--parceiro bt-parceiro--${animParceiro}`}>
        <SpriteParceiro tema={tema} estagio={parceiro.estagio} />
      </div>
      <div className="bt-info bt-info--parceiro">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-bold">{parceiro.nome}</span>
          <span key={parceiro.nivel} className="bt-nivel shrink-0 text-[11px] font-bold">Nv.{parceiro.nivel}</span>
        </div>
        <BarraHp valor={parceiro.hp} max={parceiro.hpMax} />
        <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
          <div className="bt-xp">
            <div style={{ width: `${Math.min(100, (parceiro.xp / parceiro.xpProx) * 100)}%` }} />
          </div>
          <span>
            {hp}/{parceiro.hpMax}
          </span>
        </div>
      </div>

      <Efeitos efeitos={efeitos} />
      {flash && <div key={flash.n} className="bt-flash" style={{ background: flash.cor }} />}

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
