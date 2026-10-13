// /batalha: escolhe entre a Batalha Pokémon (padrão) e a clássica, com os bonecos
// articulados. A escolha fica no aparelho (q_batalha_visual); cada modo guarda a sua
// própria partida e o seu perfil.
import { useEffect, useState } from "react";
import { EVENTO_LIMITE_DIARIO } from "../lib/answers";
import { useAssinatura } from "../store/assinatura";
import { AvisoPremium } from "../components/RotaPremium";
import { Batalha } from "./Batalha";
import { BatalhaPokemon } from "./BatalhaPokemon";

type Visual = "pokemon" | "classico";
const CHAVE = "q_batalha_visual";

function lerVisual(): Visual {
  try {
    return localStorage.getItem(CHAVE) === "classico" ? "classico" : "pokemon";
  } catch {
    return "pokemon";
  }
}

export function BatalhaModo() {
  const [visual, setVisual] = useState<Visual>(lerVisual);
  // A batalha é grátis, mas gasta o limite diário do plano gratuito. Barra a ENTRADA de
  // quem já chegou sem saldo; quem gasta a última questão no meio de uma luta vê o golpe
  // até o fim, e o aviso só entra quando o servidor recusa a próxima correção.
  const { dados, limiteAtingido } = useAssinatura();
  const [barrado, setBarrado] = useState<boolean | null>(null);
  if (barrado === null && dados) setBarrado(limiteAtingido);
  useEffect(() => {
    const barrar = () => setBarrado(true);
    window.addEventListener(EVENTO_LIMITE_DIARIO, barrar);
    return () => window.removeEventListener(EVENTO_LIMITE_DIARIO, barrar);
  }, []);
  const trocar = (v: Visual) => {
    setVisual(v);
    try {
      localStorage.setItem(CHAVE, v);
    } catch {
      /* só vale nesta aba */
    }
  };
  const alternar = (
    <div className="mb-4 inline-flex rounded-2xl border border-hair bg-surface p-1 text-sm font-semibold" role="tablist" aria-label="Visual da batalha">
      {(
        [
          ["pokemon", "Pokémon"],
          ["classico", "Clássico"],
        ] as const
      ).map(([v, rotulo]) => (
        <button
          key={v}
          role="tab"
          aria-selected={visual === v}
          onClick={() => trocar(v)}
          className={`rounded-xl px-4 py-1.5 transition ${visual === v ? "bg-brand-500 text-[color:var(--onAccent)]" : "text-muted hover:text-brand-500"}`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
  if (barrado) {
    return (
      <AvisoPremium
        titulo="Limite de hoje atingido"
        texto="Você respondeu todas as questões do plano gratuito por hoje. Amanhã tem mais batalha, ou assine para jogar sem limite."
      />
    );
  }
  return visual === "pokemon" ? <BatalhaPokemon key="p" alternar={alternar} /> : <Batalha key="c" alternar={alternar} />;
}
