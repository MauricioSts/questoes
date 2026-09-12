// ORDEM DE EXIBIÇÃO DAS ALTERNATIVAS.
//
// A cada vez que a mesma questão volta, as alternativas aparecem em outra ordem — é o que
// impede o cérebro de decorar que "a certa é a segunda de cima para baixo" em vez de
// resolver a questão de novo.
//
// REGRA QUE NÃO PODE SER QUEBRADA: a LETRA continua colada na alternativa. O que muda é a
// POSIÇÃO na tela, nunca o rótulo. Trocar o rótulo (a 3ª virar "A") desalinharia:
//   - o gabarito do lote, que é uma letra;
//   - as explicações, que citam a letra ("a alternativa C afirma…") — 88 das 640 questões
//     do banco fazem isso hoje;
//   - o histórico em Answer.alternativaMarcada, gravado como letra.
// Ou seja: embaralhar rótulo induziria ao erro. Embaralhar posição, não.
import type { Questao, Alternativa } from "../types/questao";

const LETRAS: Alternativa[] = ["A", "B", "C", "D", "E"];

// PRNG determinístico (mulberry32): mesma semente → mesma ordem. Determinismo importa
// porque a ordem não pode mudar entre um render e outro da MESMA tentativa (senão as
// alternativas dançariam ao marcar, ao revelar ou ao redimensionar a tela).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Letras que a questão realmente tem (lote pode ter 4 alternativas em vez de 5).
export function letrasDe(questao: Questao): Alternativa[] {
  return LETRAS.filter((l) => questao.alternativas[l] != null);
}

/**
 * Ordem em que as alternativas desta questão devem ser desenhadas.
 * @param tentativa quantas vezes a questão JÁ foi respondida antes desta vez. É a semente:
 *        muda a cada repetição, então a ordem muda a cada repetição — e a 1ª vez (0) sai
 *        sempre igual, o que mantém a prova estável entre resolver e conferir o resultado.
 */
export function ordemAlternativas(questao: Questao, tentativa = 0): Alternativa[] {
  const letras = letrasDe(questao);
  // Questão de uma alternativa só (ou nenhuma) não tem o que embaralhar.
  if (letras.length < 2) return letras;

  const atual = sortear(letras, questao.id, tentativa, 0);
  if (tentativa === 0) return atual;

  // Duas repetições seguidas na MESMA ordem seriam o pior caso do sorteio: é justamente
  // a repetição que o embaralhamento existe para quebrar. Quando o sorteio cai na ordem
  // da vez anterior, tenta outro tempero — continua determinístico.
  const anterior = sortear(letras, questao.id, tentativa - 1, 0).join("");
  let saida = atual;
  for (let tempero = 1; tempero <= 6 && saida.join("") === anterior; tempero++) {
    saida = sortear(letras, questao.id, tentativa, tempero);
  }
  return saida;
}

function sortear(letras: Alternativa[], id: number, tentativa: number, tempero: number): Alternativa[] {
  const rng = mulberry32(id * 2654435761 + tentativa * 40503 + tempero * 7919 + 1);
  const a = [...letras];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
