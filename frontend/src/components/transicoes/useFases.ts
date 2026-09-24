// Relógio comum das entradas de tema feitas em CSS: chama `aoCobrir` quando a animação
// fecha a tela (o tema troca por baixo) e `aoTerminar` no fim. Clique ou Esc pulam.
import { useEffect, useRef } from "react";

export function useFases(cobre: number, fim: number, aoCobrir: () => void, aoTerminar: () => void) {
  const cb = useRef({ aoCobrir, aoTerminar });
  cb.current = { aoCobrir, aoTerminar };
  const pular = useRef<() => void>(() => {});

  useEffect(() => {
    let cobriu = false;
    let terminou = false;
    const cobrir = () => {
      if (cobriu) return;
      cobriu = true;
      cb.current.aoCobrir();
    };
    const terminar = () => {
      if (terminou) return;
      terminou = true;
      cobrir();
      cb.current.aoTerminar();
    };
    pular.current = terminar;
    const t1 = setTimeout(cobrir, cobre);
    const t2 = setTimeout(terminar, fim);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") terminar();
    };
    window.addEventListener("keydown", tecla);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("keydown", tecla);
    };
    // Uma animação por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return () => pular.current();
}

/** Distância do ponto até o canto mais longe da tela: o raio que cobre tudo. */
export function alcance(x: number, y: number) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  return Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
}
