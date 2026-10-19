// Validador de qualidade dos lotes das trilhas de desenvolvimento (dev-*). Vai além do
// formato do /questoes/import: barra os "tells" que ensinam o aluno a acertar pela forma
// (correta mais longa, enchimento colado nos distratores, explicação que cita a letra),
// exige o tipo da questão com os campos de código, e confere a trilha como um todo
// (mínimo, dificuldade, gabarito por letra, proporção de código, cobertura da ementa).
// Puro (sem banco): o importador e scripts/validarLote.ts chamam o mesmo código.
// Regras: docs/TRILHAS-DEV-PENDENTE.md, seção 5.1. A conferência do resultado do sandbox
// (seção 5.2) também mora aqui, para o script e o importador compararem igual.
import { z } from "zod";
import { LINGUAGENS_VERIFICACAO, hashCodigo, saidaConfereExata } from "./sandboxCodigo.js";
import { resultadoPublico } from "./saidaSandbox.js";

export const LETRAS = ["A", "B", "C", "D", "E"] as const;
export const TIPOS_QUESTAO = ["conceitual", "saida", "erro"] as const;
export type TipoQuestao = (typeof TIPOS_QUESTAO)[number];

// Trilhas de linguagem: pelo menos 40% das questões são de saída ou de erro de código.
export const TRILHAS_DE_LINGUAGEM = ["dev-python", "dev-javascript-typescript", "dev-java", "dev-cpp"];
export const PROPORCAO_CODIGO_MIN = 0.4;
export const MIN_QUESTOES_TRILHA = 50;
export const MIN_POR_DIFICULDADE = { facil: 20, media: 15, dificil: 15 } as const;
export const MAX_FRACAO_TOPICO = 0.15;

export function ehTrilhaDev(trilhaId: string | null | undefined): boolean {
  return !!trilhaId && trilhaId.startsWith("dev-");
}

// Caudas de enchimento que o gerador de IA colava nos distratores (e que vazavam o
// gabarito nos lotes v8/v9 da Dataprev). Comparação sem acento e sem caixa.
export const LISTA_NEGRA_ENCHIMENTO = [
  "conforme o cenario apresentado",
  "no cenario apresentado",
  "nesse caso especifico",
  "neste caso especifico",
  "no contexto descrito",
  "no contexto apresentado",
  "de acordo com o enunciado",
  "conforme o enunciado",
  "em determinadas situacoes",
  "dependendo do caso",
  "dependendo do contexto",
  "na situacao descrita",
];

// Explicação que cita a letra quebra quando a ordem das alternativas é embaralhada (e
// entrega a resposta de outra questão). A letra precisa estar em maiúscula: "a opção e a
// outra" é português, não citação.
const CITA_LETRA = /\b(alternativa|letra|op[cç][aã]o|item)\s+([A-E])\b/gi;
const LETRA_COM_PARENTESE = /(^|\s)[A-E]\)/;

export function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tamanho(s: string): number {
  return [...s.trim()].length;
}

const erroEsperadoSchema = z.object({
  fase: z.enum(["compilacao", "execucao"]),
  contem: z.string().min(1, "erroEsperado.contem vazio"),
});

// Campos que este validador confere. O resto do formato (assunto, módulo, imagens…) é
// do importSchema do /questoes/import, por isso o passthrough.
export const questaoDevSchema = z
  .object({
    id: z.number().int(),
    materia: z.string().min(1),
    dificuldade: z.enum(["facil", "media", "dificil"]),
    enunciado: z.string().min(1),
    alternativas: z.record(z.string()),
    gabarito: z.string().min(1),
    explicacao: z.string().trim().min(1, "explicação vazia"),
    tipo: z.enum(TIPOS_QUESTAO),
    codigo: z.string().optional(),
    linguagem: z.string().optional(),
    // C++ de comportamento indefinido roda com UBSan na verificação, mas aparece como cpp.
    linguagemVerificacao: z.literal("cpp-ubsan").optional(),
    saidaEsperada: z.string().optional(),
    erroEsperado: erroEsperadoSchema.optional(),
    origem: z.enum(["autoral", "adaptada"], {
      errorMap: () => ({ message: 'origem precisa ser "autoral" (ou "adaptada" com prova)' }),
    }),
    prova: z.string().optional(),
    execucaoId: z.string().min(1).optional(),
  })
  .passthrough();

export type QuestaoDev = z.infer<typeof questaoDevSchema>;

export interface ErroRegra {
  regra: string;
  mensagem: string;
}

export interface RelatorioLote {
  ok: boolean;
  trilhaId: string;
  total: number;
  // Erros por questão (só as que têm erro). id = o do lote, ou "#n" se nem id veio.
  porQuestao: { id: number | string; erros: ErroRegra[] }[];
  // Erros do lote como trilha (contagens, distribuição, cobertura).
  trilha: ErroRegra[];
  resumo: {
    dificuldade: Record<string, number>;
    gabarito: Record<string, number>;
    tipo: Record<string, number>;
    topicos: Record<string, number>;
  };
}

// Linguagem com que a questão é rodada no sandbox (e que entra no hash).
export function linguagemDeVerificacao(q: Pick<QuestaoDev, "linguagem" | "linguagemVerificacao">): string {
  return q.linguagemVerificacao ?? q.linguagem ?? "";
}

// stdout bate com o texto da alternativa correta: comparação exata do worker ou, para
// alternativa escrita numa linha só, o mesmo texto com quebras virando espaço.
export function saidaConfereAlternativa(stdout: string, alternativa: string): boolean {
  if (saidaConfereExata(stdout, alternativa)) return true;
  const plano = (s: string) => s.replace(/\s+/g, " ").trim();
  return plano(stdout) === plano(alternativa);
}

// Regras de uma questão já com o formato aceito pelo schema.
export function errosDaQuestao(q: QuestaoDev): ErroRegra[] {
  const erros: ErroRegra[] = [];
  const add = (regra: string, mensagem: string) => erros.push({ regra, mensagem });

  const chaves = Object.keys(q.alternativas).sort();
  if (chaves.length !== 5 || chaves.join("") !== "ABCDE") {
    add("alternativas", `precisa de exatamente 5 alternativas A–E (veio: ${chaves.join(", ") || "nenhuma"})`);
  }
  const correta = q.alternativas[q.gabarito];
  if (correta === undefined || !(LETRAS as readonly string[]).includes(q.gabarito)) {
    add("gabarito", `gabarito "${q.gabarito}" não está nas alternativas`);
  }

  // Correta não pode ser a mais longa nem destoar da média dos distratores.
  if (correta !== undefined) {
    const distratores = Object.entries(q.alternativas)
      .filter(([l]) => l !== q.gabarito)
      .map(([, t]) => tamanho(t));
    if (distratores.length > 0) {
      const maior = Math.max(...distratores);
      const media = distratores.reduce((s, n) => s + n, 0) / distratores.length;
      const len = tamanho(correta);
      if (len >= maior) {
        add("correta_mais_longa", `a correta (${len} caracteres) é a mais longa (maior distrator: ${maior})`);
      } else if (len > 1.25 * media) {
        add("correta_mais_longa", `a correta (${len}) passa de 1,25 × a média dos distratores (${media.toFixed(1)})`);
      }
    }
  }

  for (const [letra, texto] of Object.entries(q.alternativas)) {
    const norm = normalizarTexto(texto);
    const achada = LISTA_NEGRA_ENCHIMENTO.find((f) => norm.includes(f));
    if (achada) add("enchimento", `alternativa ${letra} tem enchimento "${achada}"`);
  }

  const citacoes = [...q.explicacao.matchAll(CITA_LETRA)].filter((m) => /^[A-E]$/.test(m[2]!));
  if (citacoes.length > 0 || LETRA_COM_PARENTESE.test(q.explicacao)) {
    const trecho = citacoes[0]?.[0] ?? q.explicacao.match(LETRA_COM_PARENTESE)?.[0]?.trim();
    add("explicacao_cita_letra", `a explicação cita a letra ("${trecho}"); explique pelo conteúdo`);
  }

  if (q.tipo === "saida" || q.tipo === "erro") {
    const faltam = [
      !q.codigo?.trim() && "codigo",
      !q.linguagem && "linguagem",
      q.tipo === "saida" && q.saidaEsperada === undefined && "saidaEsperada",
      q.tipo === "erro" && !q.erroEsperado && "erroEsperado { fase, contem }",
    ].filter(Boolean);
    if (faltam.length > 0) add("tipo_campos", `tipo "${q.tipo}" exige ${faltam.join(", ")}`);
    if (q.linguagem) {
      const ling = linguagemDeVerificacao(q);
      if (!(LINGUAGENS_VERIFICACAO as readonly string[]).includes(ling)) {
        add("linguagem", `linguagem "${ling}" não roda no sandbox (${LINGUAGENS_VERIFICACAO.join(", ")})`);
      } else if (q.linguagemVerificacao && q.linguagem !== "cpp") {
        add("linguagem", `linguagemVerificacao "cpp-ubsan" só vale com linguagem "cpp"`);
      }
    }
    if (q.tipo === "saida" && q.saidaEsperada !== undefined && correta !== undefined) {
      if (!saidaConfereAlternativa(q.saidaEsperada, correta)) {
        add("saida_alternativa", "saidaEsperada não bate com o texto da alternativa correta");
      }
    }
  }

  if (q.origem === "adaptada" && !q.prova) {
    add("origem", 'origem "adaptada" exige "prova" (só com PDF fornecido pelo usuário)');
  }
  return erros;
}

function contar<T extends string>(chaves: readonly T[], valores: string[]): Record<T, number> {
  const c = Object.fromEntries(chaves.map((k) => [k, 0])) as Record<T, number>;
  for (const v of valores) if (v in c) c[v as T]++;
  return c;
}

// Valida o lote INTEIRO de uma trilha. `ementa` = tópicos aprovados (o `materia` de cada
// questão é um deles); sem ela a cobertura não tem contra o que conferir e o lote reprova.
export function validarQualidadeLote(entrada: { trilhaId: string; ementa?: string[]; questoes: unknown[] }): RelatorioLote {
  const { trilhaId, questoes } = entrada;
  const ementa = [...new Set((entrada.ementa ?? []).map((t) => t.trim()).filter(Boolean))];
  const porQuestao: RelatorioLote["porQuestao"] = [];
  const trilha: ErroRegra[] = [];
  const validas: QuestaoDev[] = [];
  const vistos = new Set<number>();

  questoes.forEach((bruta, i) => {
    const idBruto = (bruta as { id?: unknown })?.id;
    const id: number | string = typeof idBruto === "number" ? idBruto : `#${i + 1}`;
    const r = questaoDevSchema.safeParse(bruta);
    let erros: ErroRegra[];
    if (!r.success) {
      erros = r.error.issues.map((iss) => ({
        regra: "formato",
        mensagem: `${iss.path.join(".") || "questão"}: ${iss.message}`,
      }));
    } else {
      validas.push(r.data);
      erros = errosDaQuestao(r.data);
      if (vistos.has(r.data.id)) erros.unshift({ regra: "id_duplicado", mensagem: `id ${r.data.id} repetido no lote` });
      vistos.add(r.data.id);
      if (ementa.length > 0 && !ementa.includes(r.data.materia.trim())) {
        erros.push({ regra: "materia_fora_ementa", mensagem: `matéria "${r.data.materia}" não é tópico da ementa` });
      }
    }
    if (erros.length > 0) porQuestao.push({ id, erros });
  });

  // ---- regras da trilha (contam todas as questões do lote, mesmo as com erro de regra)
  const n = questoes.length;
  const dificuldade = contar(["facil", "media", "dificil"] as const, validas.map((q) => q.dificuldade));
  const gabarito = contar(LETRAS, validas.map((q) => q.gabarito));
  const tipo = contar(TIPOS_QUESTAO, validas.map((q) => q.tipo));
  const topicos: Record<string, number> = Object.fromEntries(ementa.map((t) => [t, 0]));
  for (const q of validas) topicos[q.materia.trim()] = (topicos[q.materia.trim()] ?? 0) + 1;

  if (n < MIN_QUESTOES_TRILHA) {
    trilha.push({ regra: "minimo_questoes", mensagem: `${n} questões; a trilha precisa de pelo menos ${MIN_QUESTOES_TRILHA}` });
  }
  for (const [d, min] of Object.entries(MIN_POR_DIFICULDADE)) {
    const tem = dificuldade[d as keyof typeof dificuldade];
    if (tem < min) trilha.push({ regra: "minimo_dificuldade", mensagem: `${tem} questões "${d}"; mínimo ${min}` });
  }

  // Gabarito por letra entre 8 e 12 a cada 50, proporcional ao tamanho do lote.
  const minLetra = Math.floor((8 * n) / 50);
  const maxLetra = Math.ceil((12 * n) / 50);
  for (const l of LETRAS) {
    if (gabarito[l] < minLetra || gabarito[l] > maxLetra) {
      trilha.push({
        regra: "gabarito_distribuicao",
        mensagem: `letra ${l} é gabarito de ${gabarito[l]} questões; com ${n} questões o aceito é de ${minLetra} a ${maxLetra}`,
      });
    }
  }

  if (TRILHAS_DE_LINGUAGEM.includes(trilhaId) && n > 0) {
    const codigo = tipo.saida + tipo.erro;
    if (codigo / n < PROPORCAO_CODIGO_MIN) {
      trilha.push({
        regra: "proporcao_codigo",
        mensagem: `${codigo} de ${n} questões (${Math.round((100 * codigo) / n)}%) são de saída/erro; trilha de linguagem exige ${PROPORCAO_CODIGO_MIN * 100}%`,
      });
    }
  }

  if (ementa.length === 0) {
    trilha.push({ regra: "ementa_ausente", mensagem: 'informe "ementa" (lista de tópicos) para conferir a cobertura' });
  } else {
    for (const t of ementa) {
      if (topicos[t] === 0) trilha.push({ regra: "topico_sem_questao", mensagem: `tópico "${t}" sem nenhuma questão` });
    }
    for (const [t, qtd] of Object.entries(topicos)) {
      if (n > 0 && qtd / n > MAX_FRACAO_TOPICO) {
        trilha.push({
          regra: "topico_concentrado",
          mensagem: `tópico "${t}" tem ${qtd} de ${n} questões (${Math.round((100 * qtd) / n)}%); máximo ${MAX_FRACAO_TOPICO * 100}%`,
        });
      }
    }
  }

  return {
    ok: porQuestao.length === 0 && trilha.length === 0,
    trilhaId,
    total: n,
    porQuestao,
    trilha,
    resumo: { dificuldade, gabarito, tipo, topicos },
  };
}

// Texto do relatório para terminal (scripts/validarLote.ts).
export function formatarRelatorio(r: RelatorioLote): string {
  const linhas: string[] = [];
  linhas.push(`Trilha ${r.trilhaId}: ${r.total} questões — ${r.ok ? "APROVADO" : "REPROVADO"}`);
  const fmt = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(" · ");
  linhas.push(`  dificuldade: ${fmt(r.resumo.dificuldade)}`);
  linhas.push(`  gabarito:    ${fmt(r.resumo.gabarito)}`);
  linhas.push(`  tipo:        ${fmt(r.resumo.tipo)}`);
  linhas.push(`  tópicos:     ${fmt(r.resumo.topicos)}`);
  if (r.trilha.length > 0) {
    linhas.push("", "Erros da trilha:");
    for (const e of r.trilha) linhas.push(`  [${e.regra}] ${e.mensagem}`);
  }
  if (r.porQuestao.length > 0) {
    linhas.push("", `Erros por questão (${r.porQuestao.length}):`);
    for (const q of r.porQuestao) {
      for (const e of q.erros) linhas.push(`  ${q.id}: [${e.regra}] ${e.mensagem}`);
    }
  }
  return linhas.join("\n");
}

// ---------------------------------------------------------------- verificação (5.2)

// O que precisa do resultado público do sandbox (lib/saidaSandbox.ts → livre).
export type ResultadoLivre = { fase: string; codigo: number | null; stdout: string; stderr: string; motivo: string } | undefined;

// Confere a saída de uma execução contra o que a questão afirma.
// saida → terminou com código 0 e stdout == saidaEsperada (exata) == alternativa correta;
// erro  → falhou na fase esperada e stderr/stdout contém erroEsperado.contem.
export function conferirResultado(q: QuestaoDev, livre: ResultadoLivre): string[] {
  if (!livre) return ["a execução não tem resultado livre (não é de verificação?)"];
  const erros: string[] = [];
  if (q.tipo === "saida") {
    if (livre.fase !== "execucao" || livre.codigo !== 0) {
      erros.push(`o código não terminou bem (fase ${livre.fase}, código ${livre.codigo}, ${livre.motivo}): ${livre.stderr.slice(0, 300)}`);
    }
    if (!saidaConfereExata(livre.stdout, q.saidaEsperada ?? "")) {
      erros.push(`stdout ${JSON.stringify(livre.stdout.slice(0, 300))} ≠ saidaEsperada ${JSON.stringify(q.saidaEsperada)}`);
    }
    const correta = q.alternativas[q.gabarito];
    if (correta === undefined || !saidaConfereAlternativa(livre.stdout, correta)) {
      erros.push(`stdout ${JSON.stringify(livre.stdout.slice(0, 300))} ≠ alternativa correta ${JSON.stringify(correta)}`);
    }
  } else if (q.tipo === "erro") {
    const esp = q.erroEsperado;
    if (!esp) return ["sem erroEsperado"];
    if (livre.fase !== esp.fase) erros.push(`falhou na fase "${livre.fase}", esperado "${esp.fase}"`);
    else if (esp.fase === "execucao" && livre.codigo === 0) erros.push("o programa terminou sem erro (código 0)");
    if (!`${livre.stderr}\n${livre.stdout}`.includes(esp.contem)) {
      erros.push(`stderr/stdout não contém ${JSON.stringify(esp.contem)}: ${JSON.stringify(livre.stderr.slice(0, 300))}`);
    }
  }
  return erros;
}

export interface ExecucaoGravada {
  id: string;
  finalidade: string;
  status: string;
  hash: string;
  resultado: unknown;
}

// O importador só aceita saida/erro com uma execução de verificação concluída do MESMO
// código (hash), e cujo resultado ainda confirma o gabarito.
export function conferirVerificacao(q: QuestaoDev, e: ExecucaoGravada | null | undefined): string[] {
  if (q.tipo !== "saida" && q.tipo !== "erro") return [];
  if (!q.execucaoId) return [`tipo "${q.tipo}" exige execucaoId (rode npm run lote:verificar)`];
  if (!e) return [`execução ${q.execucaoId} não encontrada`];
  const erros: string[] = [];
  if (e.finalidade !== "verificacao") erros.push(`execução ${e.id} não é de verificação (${e.finalidade})`);
  if (e.status !== "concluida") erros.push(`execução ${e.id} não está concluída (${e.status})`);
  if (e.hash !== hashCodigo(linguagemDeVerificacao(q), q.codigo ?? "")) {
    erros.push(`execução ${e.id} rodou outro código ou linguagem (hash diferente)`);
  }
  if (erros.length > 0) return erros;
  return conferirResultado(q, resultadoPublico(e.resultado)?.livre);
}
