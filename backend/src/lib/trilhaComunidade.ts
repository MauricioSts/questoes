// Regras das trilhas criadas por usuários (trilhas da comunidade).
//
// - Free cria 1 trilha, e ela é pública. Premium cria quantas quiser, públicas ou privadas.
// - Pública entra na escolha de trilhas assim que tiver MIN_QUESTOES_VITRINE questões
//   (trilha vazia só polui a lista). O dono sempre vê as próprias.
// - Só o dono escreve nas questões da trilha. O texto é guardado como texto puro: o app
//   renderiza enunciado e alternativas como texto React (nada vai por innerHTML), e o
//   Prisma parametriza tudo, então não há caminho para SQL ou script. Mesmo assim o
//   schema corta tamanho, caractere de controle e byte nulo (o Postgres recusa \0).
import { z } from "zod";
import { prisma } from "../prisma.js";
import { acessoDoUsuario } from "./assinatura.js";

export const LIMITE_TRILHAS_FREE = 1;
export const MIN_QUESTOES_VITRINE = 10;
export const MAX_QUESTOES_TRILHA = 3000;
export const MAX_QUESTOES_POR_ENVIO = 200;

export type Visibilidade = "publica" | "privada";

// Remove byte nulo e caracteres de controle (menos \n e \t), normaliza quebras de linha
// e apara. É o que sobra de "sanitizar" quando o destino é texto puro.
export function limparTexto(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const texto = (max: number) => z.string().transform(limparTexto).pipe(z.string().min(1).max(max));
const textoOpcional = (max: number) => z.string().transform(limparTexto).pipe(z.string().max(max));

export const LETRAS = ["A", "B", "C", "D", "E"] as const;

export const TIPOS_TRILHA = ["concurso", "escola", "vestibular", "outro"] as const;

// Só o nome é obrigatório: estudante de escola não tem cargo, banca nem órgão.
export const trilhaSchema = z.object({
  tipo: z.enum(TIPOS_TRILHA).default("concurso"),
  nome: texto(60),
  cargo: textoOpcional(80).default(""),
  banca: textoOpcional(40).default(""),
  orgao: textoOpcional(80).default(""),
  ano: z.number().int().min(2000).max(2100),
  descricao: textoOpcional(600).default(""),
  dataProva: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  visibilidade: z.enum(["publica", "privada"]).default("publica"),
});

// Questão como o usuário escreve (no formulário, no JSON colado ou, depois, vinda da IA).
// Alternativas de 2 a 5, só letras A–E, e o gabarito tem que ser uma delas.
export const questaoComunidadeSchema = z
  .object({
    materia: texto(80),
    assunto: textoOpcional(120).default(""),
    dificuldade: z.enum(["facil", "media", "dificil"]).default("media"),
    enunciado: texto(6000),
    alternativas: z
      .record(z.enum(LETRAS), texto(1500))
      .refine((a) => Object.keys(a).length >= 2, "Informe pelo menos 2 alternativas"),
    gabarito: z.enum(LETRAS),
    explicacao: textoOpcional(6000).default(""),
  })
  .refine((q) => q.alternativas[q.gabarito] !== undefined, {
    message: "O gabarito precisa ser uma das alternativas",
    path: ["gabarito"],
  });

export type QuestaoComunidade = z.infer<typeof questaoComunidadeSchema>;

// Campos gravados em Questao a partir do que o usuário mandou. O resto do modelo é do
// acervo oficial (procedência, lote, módulo) e recebe valores neutros.
export function dadosQuestao(q: QuestaoComunidade) {
  // Grava as alternativas em ordem de letra, sem buracos de ordenação do JSON de entrada.
  const alternativas = Object.fromEntries(LETRAS.filter((l) => q.alternativas[l]).map((l) => [l, q.alternativas[l]!]));
  return {
    modulo: "I",
    materia: q.materia,
    assunto: q.assunto || "Geral",
    dificuldade: q.dificuldade,
    enunciado: q.enunciado,
    alternativas,
    gabarito: q.gabarito,
    explicacao: q.explicacao,
    origem: "autoral",
  };
}

// Nome de exibição: "Banco do Brasil: Escriturário", ou só o nome quando não há cargo.
export function nomeCompleto(t: { nome: string; cargo: string }): string {
  return t.cargo ? `${t.nome}: ${t.cargo}` : t.nome;
}

// Pode criar mais uma trilha? Free: até LIMITE_TRILHAS_FREE. Premium (ou cobrança
// desligada): sem limite.
export async function regrasCriacao(userId: string, email: string | undefined) {
  const [premium, minhas] = await Promise.all([
    acessoDoUsuario(userId, email).then((m) => m !== null),
    prisma.trilha.count({ where: { donoId: userId } }),
  ]);
  return {
    premium,
    minhas,
    podeCriar: premium || minhas < LIMITE_TRILHAS_FREE,
    podePrivada: premium,
    limiteFree: LIMITE_TRILHAS_FREE,
  };
}

// id (slug) da trilha: nome legível + sufixo aleatório, para dois "Banco do Brasil"
// não colidirem e o id não revelar quantas trilhas existem.
export function slugTrilha(nome: string, cargo: string): string {
  const base = `${nome} ${cargo}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "trilha"}-${Math.random().toString(36).slice(2, 8)}`;
}

export function iniciaisTrilha(nome: string): string {
  const palavras = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter((p) => /[a-z0-9]/i.test(p));
  const ini =
    palavras.length >= 2
      ? palavras.slice(0, 4).map((p) => p[0])
      : (palavras[0] ?? "TR").slice(0, 4).split("");
  return ini.join("").toUpperCase();
}
