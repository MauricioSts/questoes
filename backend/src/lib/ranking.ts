// Ranking da trilha: quem mais acerta dentro do acervo compartilhado.
// A regra de ordenação vive aqui (fora da rota) porque é a parte que precisa de teste:
// empate, volume mínimo da taxa e posição de disputa são fáceis de errar.

// Volume mínimo para entrar no ranking por TAXA de acerto. Sem isso, quem respondeu
// 3 questões e acertou as 3 apareceria na frente de quem acertou 400 de 500.
export const VOLUME_MINIMO_TAXA = 30;

export interface LinhaBruta {
  userId: string;
  nome: string;
  acertos: number;
  respondidas: number;
  ultimaResposta: Date | null;
}

export interface LinhaRanking {
  userId: string;
  nome: string; // nome de exibição (ver nomeExibicao)
  iniciais: string;
  acertos: number;
  respondidas: number;
  taxa: number; // 0..1
  ultimaResposta: string | null; // ISO
  posicao: number; // posição por acertos, com empate compartilhado
  elegivelTaxa: boolean; // respondidas >= VOLUME_MINIMO_TAXA
}

// Ranking é uma lista pública: mostra "Maurício S." em vez do nome completo, e nunca
// o e-mail. Nome de uma palavra só fica como está.
export function nomeExibicao(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Anônimo";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`;
}

export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// Ordem: mais acertos primeiro. Empatado em acertos, ganha quem gastou menos questões
// para chegar lá (taxa maior) — daí respondidas entrar como critério, crescente.
function comparar(a: LinhaBruta, b: LinhaBruta): number {
  if (b.acertos !== a.acertos) return b.acertos - a.acertos;
  if (a.respondidas !== b.respondidas) return a.respondidas - b.respondidas;
  return a.nome.localeCompare(b.nome, "pt-BR");
}

// Quem não respondeu nada não entra: ranking de estudo, não lista de inscritos.
export function montarRanking(linhas: LinhaBruta[]): LinhaRanking[] {
  const ordenadas = linhas.filter((l) => l.respondidas > 0).sort(comparar);

  let posicao = 0;
  let anterior: LinhaBruta | null = null;

  return ordenadas.map((l, i) => {
    // Posição de disputa (1, 2, 2, 4): só compartilha quem empatou nos dois números
    // que definem a ordem; o desempate por nome não cria posições diferentes.
    const empatou =
      anterior !== null && anterior.acertos === l.acertos && anterior.respondidas === l.respondidas;
    posicao = empatou ? posicao : i + 1;
    anterior = l;

    return {
      userId: l.userId,
      nome: nomeExibicao(l.nome),
      iniciais: iniciaisDe(l.nome),
      acertos: l.acertos,
      respondidas: l.respondidas,
      taxa: l.respondidas ? l.acertos / l.respondidas : 0,
      ultimaResposta: l.ultimaResposta ? l.ultimaResposta.toISOString() : null,
      posicao,
      elegivelTaxa: l.respondidas >= VOLUME_MINIMO_TAXA,
    };
  });
}
