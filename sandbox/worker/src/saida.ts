// Tratamento da saída do programa do usuário: ela é dado NÃO confiável e vai parar na
// tela de outra pessoa (o próprio usuário, mas também o admin olhando execuções).

// Limite do que guardamos de stdout/stderr por teste. O resto é descartado na leitura.
export const MAX_SAIDA_BYTES = 64 * 1024;

// Sequências ANSI (cores, mover cursor, títulos de janela OSC) e caracteres de controle,
// exceto \n e \t. \r sai também: "\r" no meio da linha serve para sobrescrever texto na
// tela e enganar quem lê o resultado.
const ANSI = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b[@-Z\\-_]/g;
const CONTROLE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g;

export function limparSaida(texto: string): string {
  return texto.replace(/\r\n/g, "\n").replace(ANSI, "").replace(CONTROLE, "");
}

// Junta pedaços lidos de um stream guardando só até `max` bytes, mas contando o total
// (para avisar "saída cortada").
export class Coletor {
  private partes: Buffer[] = [];
  private guardado = 0;
  total = 0;
  constructor(private max = MAX_SAIDA_BYTES) {}

  add(pedaco: Buffer) {
    this.total += pedaco.length;
    if (this.guardado >= this.max) return;
    const resto = this.max - this.guardado;
    const parte = pedaco.length > resto ? pedaco.subarray(0, resto) : pedaco;
    this.partes.push(parte);
    this.guardado += parte.length;
  }

  get cortado() {
    return this.total > this.max;
  }

  texto() {
    // toString de utf8 cortado no meio de um caractere vira U+FFFD, sem lançar.
    return limparSaida(Buffer.concat(this.partes).toString("utf8"));
  }
}

export type Comparacao = "exata" | "linhas" | "conjunto";

function linhas(texto: string, aparar: boolean): string[] {
  const ls = texto.replace(/\r\n/g, "\n").split("\n").map((l) => (aparar ? l.trim() : l.trimEnd()));
  while (ls.length && ls[ls.length - 1] === "") ls.pop();
  return ls;
}

// exata: igual linha a linha (espaço no fim da linha e linhas vazias no fim não contam);
// linhas: também ignora espaço no começo; conjunto: mesma coleção de linhas em qualquer
// ordem (SQL sem ORDER BY).
export function saidaConfere(obtida: string, esperada: string, modo: Comparacao): boolean {
  if (modo === "conjunto") {
    const a = linhas(obtida, true).sort();
    const b = linhas(esperada, true).sort();
    return a.length === b.length && a.every((l, i) => l === b[i]);
  }
  const a = linhas(obtida, modo === "linhas");
  const b = linhas(esperada, modo === "linhas");
  return a.length === b.length && a.every((l, i) => l === b[i]);
}
