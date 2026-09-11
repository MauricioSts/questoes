// Pausa do fundo animado do Fantasy. Enquanto alguma tela pedir (uma sessão de questões
// aberta), o relevo congela no quadro em que está; ao sair, volta a andar de onde parou.
// Contador em vez de booleano: se duas telas pedirem ao mesmo tempo, a primeira a sair
// não solta a pausa da outra.
import { useEffect, useSyncExternalStore } from "react";

let pedidos = 0;
const ouvintes = new Set<() => void>();

function avisar() {
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Congela o fundo enquanto o componente que chama estiver montado. */
export function usePausarFundo(ativo = true) {
  useEffect(() => {
    if (!ativo) return;
    pedidos++;
    avisar();
    return () => {
      pedidos--;
      avisar();
    };
  }, [ativo]);
}

export function useFundoPausado() {
  return useSyncExternalStore(assinar, () => pedidos > 0);
}
