// Concurso ativo (multi-concurso). Guardado em localStorage e lido pelo cliente HTTP
// para escopar automaticamente as chamadas. Sem dependências → não cria ciclos de import.
const KEY = "q_concurso";

export function getConcursoId(): string | null {
  return localStorage.getItem(KEY);
}

export function setConcursoId(id: string | null) {
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
}
