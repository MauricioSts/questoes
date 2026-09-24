// Entrada do tema Cyberpunk: tela reiniciando.
//
//   0 – 520 ms    faixas amarelas entram de lados alternados, começando pela altura do
//                 botão clicado, até fechar a tela (o tema troca por baixo);
//   520 – 900     "REBOOT // NIGHT CITY" com a sombra ciano/magenta tremendo;
//   900 – 1350    as faixas saem pelo lado oposto e revelam o app.
import { createPortal } from "react-dom";
import type { Origem } from "../../store/theme";
import { useFases } from "./useFases";

const COBRE = 520;
const FIM = 1350;
const FAIXAS = 12;

interface Props {
  origem: Origem;
  aoCobrir: () => void;
  aoTerminar: () => void;
}

export default function TransicaoCyberpunk({ origem, aoCobrir, aoTerminar }: Props) {
  const pular = useFases(COBRE, FIM, aoCobrir, aoTerminar);
  const perto = Math.min(FAIXAS - 1, Math.max(0, Math.floor((origem.y / window.innerHeight) * FAIXAS)));

  return createPortal(
    <div className="tc" role="status" aria-live="polite" aria-label="Entrando no tema Cyberpunk" onClick={pular}>
      {Array.from({ length: FAIXAS }, (_, i) => {
        const atraso = Math.abs(i - perto) * 28;
        return (
          <div
            key={i}
            className={`tc__faixa ${i % 2 ? "tc__faixa--dir" : ""}`}
            style={{ top: `${(100 / FAIXAS) * i}%`, height: `${100 / FAIXAS + 0.3}%`, ["--tc-atraso" as string]: `${atraso}ms` }}
          />
        );
      })}
      <p className="tc__letreiro" aria-hidden>
        <span data-texto="REBOOT // NIGHT CITY">REBOOT // NIGHT CITY</span>
      </p>
    </div>,
    document.body
  );
}
