// Peças do sandbox que não dependem de banco nem de Express: lista de linguagens e o hash
// que casa uma execução de verificação com a questão. Ficam aqui (e não só na rota) para
// o validador de lote e os scripts usarem sem puxar o servidor junto.
import { createHash } from "node:crypto";

// Linguagens que o usuário pode mandar. "cpp-ubsan" só existe na verificação de questões.
export const LINGUAGENS = ["python", "javascript", "typescript", "java", "cpp", "sql", "shell"] as const;
export const LINGUAGENS_VERIFICACAO = [...LINGUAGENS, "cpp-ubsan"] as const;

export function hashCodigo(linguagem: string, codigo: string): string {
  return createHash("sha256").update(`${linguagem}\n${codigo}`).digest("hex");
}

function linhas(texto: string): string[] {
  const ls = texto.replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd());
  while (ls.length && ls[ls.length - 1] === "") ls.pop();
  return ls;
}

// Mesma comparação "exata" do worker (sandbox/worker/src/saida.ts): igual linha a linha,
// sem contar espaço no fim da linha nem linhas vazias no fim.
export function saidaConfereExata(obtida: string, esperada: string): boolean {
  const a = linhas(obtida);
  const b = linhas(esperada);
  return a.length === b.length && a.every((l, i) => l === b[i]);
}
