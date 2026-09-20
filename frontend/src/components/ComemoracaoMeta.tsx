// Comemoração da meta do dia: o único momento em que o app toma a tela inteira.
//
// A ofensiva é o que faz voltar amanhã, então bater a meta não podia continuar sendo um
// selo discreto no canto do cartão. Aqui o número da ofensiva vira o centro da tela por
// três segundos e meio: um selo que nasce girando, três anéis que saem dele como uma
// onda e faíscas que voam para fora — tudo em cima dos tokens do tema, sem cor nova.
//
// Sai sozinha, e sai no clique, no toque ou no Esc: comemoração que prende o usuário
// vira obstáculo na segunda vez.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "motion/react";
import { Flame } from "lucide-react";
import { Contador } from "./Contador";
import type { Festa } from "../store/meta";

const DURACAO = 3600; // tempo em tela antes de sair sozinha
const SAIDA = 340; // duração da animação de saída

// Faíscas: ângulo, distância e atraso pré-sorteados por índice. Valores fixos (e não
// Math.random) para a animação ser a mesma toda vez — uma comemoração que muda de forma
// a cada dia parece defeito, não festa.
const FAISCAS = Array.from({ length: 18 }, (_, i) => ({
  ang: (360 / 18) * i + (i % 2 ? 6 : -6),
  dist: 190 + (i % 4) * 46,
  atraso: 60 + (i % 6) * 38,
  tam: i % 3 === 0 ? 9 : i % 3 === 1 ? 6 : 4,
}));

export function ComemoracaoMeta({ festa, aoFechar }: { festa: Festa; aoFechar: () => void }) {
  const reduzir = useReducedMotion();
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const fechar = () => setSaindo(true);
    const t = setTimeout(fechar, DURACAO);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", tecla);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", tecla);
    };
  }, []);

  useEffect(() => {
    if (!saindo) return;
    const t = setTimeout(aoFechar, SAIDA);
    return () => clearTimeout(t);
  }, [saindo, aoFechar]);

  const plural = festa.streak === 1 ? "dia seguido" : "dias seguidos";

  return createPortal(
    <div
      className={`festa-meta ${saindo ? "festa-meta--saindo" : ""}`}
      role="status"
      aria-live="polite"
      onClick={() => setSaindo(true)}
    >
      <div className="festa-meta__fundo" aria-hidden />

      <div className="festa-meta__palco">
        {/* Onda: três anéis saindo do selo, um atrás do outro. */}
        {!reduzir &&
          [0, 1, 2].map((i) => (
            <span key={i} className="festa-meta__anel" style={{ animationDelay: `${i * 220}ms` }} aria-hidden />
          ))}

        {/* Faíscas: giram em torno do centro e são arremessadas para fora. */}
        {!reduzir && (
          <div className="festa-meta__faiscas" aria-hidden>
            {FAISCAS.map((f, i) => (
              <span
                key={i}
                className="festa-meta__faisca"
                style={
                  {
                    "--ang": `${f.ang}deg`,
                    "--dist": `${f.dist}px`,
                    width: f.tam,
                    height: f.tam,
                    animationDelay: `${f.atraso}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}

        <div className="festa-meta__selo">
          <Flame size={46} strokeWidth={1.8} fill="currentColor" />
        </div>

        <p className="festa-meta__rotulo">Meta do dia batida</p>

        <div className="festa-meta__numero">
          {/* fundo transparente: o degradê de recorte do contador é feito para viver dentro
              de um cartão; aqui ele apareceria como duas faixas por cima do véu. */}
          <Contador valor={festa.streak} fontSize={88} cor="var(--accentText)" fontWeight={800} fundo="transparent" />
        </div>

        <p className="festa-meta__ofensiva">{plural} de ofensiva</p>

        <p className="festa-meta__detalhe">
          {festa.respondidas} de {festa.meta} questões hoje. Tudo daqui pra frente é vantagem.
        </p>

        <p className="festa-meta__dispensar">toque para continuar</p>
      </div>
    </div>,
    document.body
  );
}
