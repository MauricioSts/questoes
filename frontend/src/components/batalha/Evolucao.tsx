// Sequência de evolução, como nos jogos: silhuetas da forma antiga e da nova se alternando
// cada vez mais rápido, clarão, e a forma nova revelada com o nome.
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Tema } from "../../store/theme";
import { PARCEIROS, SpriteParceiro } from "./sprites";

export function Evolucao({ tema, de, para, onFim }: { tema: Tema; de: number; para: number; onFim: () => void }) {
  const [pronto, setPronto] = useState(false);
  const antes = PARCEIROS[tema].formas[de - 1];
  const depois = PARCEIROS[tema].formas[para - 1];

  useEffect(() => {
    const rapido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPronto(true), rapido ? 50 : 3600);
    return () => clearTimeout(t);
  }, []);

  // Portal: dentro do layout, a camada de conteúdo (z-10) prende o overlay abaixo da
  // barra inferior do celular.
  return createPortal(
    <div className="bt-evo" role="dialog" aria-label="Evolução">
      <div className="bt-evo__raios" />
      <div className="bt-evo__palco">
        {!pronto ? (
          <>
            <div className="bt-evo__forma bt-evo__forma--antes">
              <SpriteParceiro tema={tema} estagio={de} silhueta />
            </div>
            <div className="bt-evo__forma bt-evo__forma--depois">
              <SpriteParceiro tema={tema} estagio={para} silhueta />
            </div>
          </>
        ) : (
          <div className="bt-evo__forma bt-evo__revelada bt-parceiro--parado">
            <SpriteParceiro tema={tema} estagio={para} />
          </div>
        )}
        {pronto && <div className="bt-evo__clarao" />}
        {pronto &&
          Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="bt-evo__brilho" style={{ "--a": `${i * 30}deg`, animationDelay: `${(i % 4) * 0.08}s` } as CSSProperties}>
              ✦
            </span>
          ))}
      </div>
      <div className="bt-evo__texto">
        {pronto ? (
          <>
            <p>
              Parabéns! <b>{antes.nome}</b> evoluiu para <b>{depois.nome}</b>!
            </p>
            <p className="bt-evo__especie">{depois.especie}</p>
            <button onClick={onFim} className="bt-golpe bt-golpe--forte mx-auto mt-3">
              <span className="text-sm font-extrabold">Continuar</span>
            </button>
          </>
        ) : (
          <p>
            O quê? <b>{antes.nome}</b> está evoluindo!
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
