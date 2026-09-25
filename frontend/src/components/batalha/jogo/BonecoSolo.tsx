// Herói sozinho, fora do palco (lobby, evolução, tela final), com o próprio laço de
// animação tocando um clipe em repetição.
import { useEffect, useRef } from "react";
import type { Tema } from "../../../store/theme";
import { Boneco, type BonecoApi } from "./Boneco";
import type { NomeClipe } from "./esqueleto";
import { skinHeroi } from "./skins";

export function BonecoSolo({ tema, estagio, clipe = "guarda", className = "" }: { tema: Tema; estagio: number; clipe?: NomeClipe; className?: string }) {
  const ref = useRef<BonecoApi>(null);
  useEffect(() => {
    let raf = 0;
    const ini = performance.now();
    void ref.current?.tocar(clipe, { mistura: 0 });
    const passo = (t: number) => {
      ref.current?.atualizar(Math.max(0, t - ini));
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [clipe, tema, estagio]);
  return (
    <svg viewBox="-30 -40 300 290" className={`h-full w-full overflow-visible ${className}`} aria-hidden>
      <ellipse cx="120" cy="244" rx="70" ry="10" fill="rgba(0,0,0,.18)" />
      <Boneco key={`${tema}-${estagio}`} ref={ref} skin={skinHeroi(tema, estagio)} x={120} y={240} fantasmas={0} clipeInicial={clipe} />
    </svg>
  );
}
