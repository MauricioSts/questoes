// /batalha: escolhe entre a Batalha Pokémon (padrão) e a clássica, com os bonecos
// articulados. A escolha fica no aparelho (q_batalha_visual); cada modo guarda a sua
// própria partida e o seu perfil.
import { useState } from "react";
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
  return visual === "pokemon" ? <BatalhaPokemon key="p" alternar={alternar} /> : <Batalha key="c" alternar={alternar} />;
}
