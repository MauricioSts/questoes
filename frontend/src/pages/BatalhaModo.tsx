// /batalha: escolhe entre a Batalha Pokémon (padrão) e a clássica, com os bonecos
// articulados. A escolha fica no aparelho (q_batalha_visual); cada modo guarda a sua
// própria partida e o seu perfil.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  // No plano gratuito a Batalha vale só nos primeiros dias da conta (depois é Premium) e
  // gasta o limite diário. Barra a ENTRADA de quem já chegou sem saldo; quem gasta a
  // última questão no meio de uma luta vê o golpe até o fim, e o aviso só entra quando o
  // servidor recusa a próxima correção.
  const { dados, limiteAtingido, batalhaLiberada, diasBatalhaRestantes } = useAssinatura();
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
    <div className="mb-4 flex flex-wrap items-center gap-3">
    <div className="inline-flex rounded-2xl border border-hair bg-surface p-1 text-sm font-semibold" role="tablist" aria-label="Visual da batalha">
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
      {diasBatalhaRestantes !== null && (
        <Link to="/assinatura" className="meta-pill border border-hair text-muted hover:text-brand-500">
          Batalha grátis por mais {diasBatalhaRestantes} {diasBatalhaRestantes === 1 ? "dia" : "dias"}
        </Link>
      )}
    </div>
  );
  if (dados && !batalhaLiberada) {
    return (
      <AvisoPremium
        titulo="A Batalha agora é Premium"
        texto={`Seus ${dados.diasBatalhaFree} dias de Batalha grátis acabaram. Assine para continuar a aventura — seu progresso fica salvo. No plano Free você segue estudando ${dados.limiteGratisDia} questões por dia.`}
      />
    );
  }
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
