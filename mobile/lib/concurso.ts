// Concurso ativo (multi-concurso). Lido pelo cliente HTTP para escopar as chamadas.
// Sem dependências de domínio → não cria ciclos de import.
//
// Diverge de frontend/src/lib/concurso.ts só na troca de localStorage pelo port
// KeyValueStore (SDD §4.1). A leitura continua síncrona, que é o que api.ts exige.
import { kv } from "./kv";

const KEY = "q_concurso";

export function getConcursoId(): string | null {
  return kv.get(KEY);
}

export function setConcursoId(id: string | null) {
  if (id) kv.set(KEY, id);
  else kv.remove(KEY);
}
