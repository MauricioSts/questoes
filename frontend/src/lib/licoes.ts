// Pedaços do fim de partida usados pelas duas batalhas (clássica e Pokémon): o placar de
// calibragem da certeza e o salvamento das lições escritas no Caderno.
import { getQuestao } from "./questoesRepo";
import { criarPagina, salvarPagina } from "./multiApi";
import type { Resumo } from "./batalha";

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const pct = (x: { total: number; acertos: number }) => (x.total ? Math.round((x.acertos / x.total) * 100) : 0);

// `arriscar` é como cada batalha chama a aposta de certeza (golpe forte / "Tenho certeza").
export function textoCalibragem(r: Resumo, arriscar = "o golpe forte"): string {
  if (r.certeza.total >= 3 && pct(r.certeza) < 70)
    return `Sua certeza anda otimista: ${pct(r.certeza)}% de acerto quando tinha certeza. Nessas matérias, desconfie do "óbvio" e releia o enunciado.`;
  if (r.duvida.total >= 3 && pct(r.duvida) >= 80) return `Você sabe mais do que acha: ${pct(r.duvida)}% de acerto na dúvida. Pode arriscar ${arriscar}.`;
  if (r.certeza.total >= 3) return `Certeza bem calibrada: ${pct(r.certeza)}% de acerto quando tinha certeza.`;
  return `Responda mais algumas com ${arriscar} para medir a sua certeza.`;
}

// Uma página por matéria: "Lições da batalha · dd/mm".
export async function salvarLicoesNoCaderno(activeId: string, licoes: [string, string][]) {
  const porMateria = new Map<string, string[]>();
  for (const [id, texto] of licoes) {
    const q = getQuestao(Number(id));
    if (!q) continue;
    const curto = q.enunciado.replace(/\s+/g, " ").trim().slice(0, 220);
    const bloco = `<h3>Questão ${q.id} · gabarito ${q.gabarito}</h3><blockquote><p>${escapar(curto)}${q.enunciado.length > 220 ? "…" : ""}</p></blockquote><p>${escapar(texto)}</p>`;
    porMateria.set(q.materia, [...(porMateria.get(q.materia) ?? []), bloco]);
  }
  const dia = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  for (const [materia, blocos] of porMateria) {
    const titulo = `Lições da batalha · ${dia}`;
    const { pagina } = await criarPagina(activeId, materia, titulo);
    await salvarPagina(pagina.id, { titulo, materia, formato: "html", conteudo: blocos.join("") });
  }
}
