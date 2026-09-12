// META FIXA POR MATÉRIA (segunda a sexta).
//
// Além da meta livre do anel (que o usuário define), cada dia útil tem um rodízio fixo de
// 10 questões de UMA matéria:
//   segunda → Língua Portuguesa
//   terça   → Legislação
//   quarta  → Raciocínio Lógico-Matemático
//   quinta  → Língua Inglesa
//   sexta   → Banco de Dados
// Fim de semana não tem matéria fixa.
//
// As 10 questões são sorteadas UMA vez por dia e gravadas (MetaMateriaDia): a meta do dia
// não pode trocar de questão no meio do dia, senão "faltam 3" viraria outra prova.

export const META_MATERIA_QTD = 10;

// Peso de sorteio por procedência: a meta fixa é treino de prova, então questão que caiu
// (ou foi adaptada) de prova real sai mais. Peso 1 = continua elegível, só sai menos.
export const PESO_ORIGEM: Record<string, number> = {
  oficial: 6,
  adaptada: 4,
  autoral: 1,
  gerada: 1,
};

// Quanto cada erro anterior na questão multiplica o peso, até o teto. Errar uma vez já
// dobra a chance; errar muito não pode monopolizar o sorteio (por isso o teto).
const PESO_POR_ERRO = 2;
const TETO_PESO_ERRO = 6;

// Rodízio: índice do dia (0=segunda … 6=domingo) → pedaços do nome da matéria, já sem
// acento e em minúsculas. É busca por pedaço porque o nome vem do lote e varia entre
// concursos ("Legislação (SI e Proteção de Dados)", "Legislação Específica", …).
const RODIZIO: { rotulo: string; termos: string[] }[] = [
  { rotulo: "Língua Portuguesa", termos: ["portugu"] },
  { rotulo: "Legislação", termos: ["legisl"] },
  { rotulo: "Raciocínio Lógico-Matemático", termos: ["logic", "raciocinio", "matematic"] },
  { rotulo: "Língua Inglesa", termos: ["ingl"] },
  { rotulo: "Banco de Dados", termos: ["banco de dados", "bd", "big data"] },
];

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export interface MateriaDoDia {
  diaIndex: number; // 0=segunda … 6=domingo
  rotulo: string; // nome curto do rodízio ("Legislação")
  termos: string[];
}

// A matéria do rodízio para o dia informado, ou null no fim de semana.
export function materiaDoDia(diaIndex: number): MateriaDoDia | null {
  const item = RODIZIO[diaIndex];
  if (!item) return null;
  return { diaIndex, rotulo: item.rotulo, termos: item.termos };
}

// Casa o rodízio com os nomes de matéria que existem no banco do concurso. Devolve TODOS
// os nomes que batem (um concurso pode ter "Banco de Dados" e "Banco de Dados / BI / Big
// Data" como matérias separadas).
export function casarMaterias(materiasDoBanco: string[], termos: string[]): string[] {
  return materiasDoBanco.filter((m) => {
    const n = normalizar(m);
    return termos.some((t) => n.includes(t));
  });
}

export interface CandidataMeta {
  id: number;
  origem: string;
  erros: number; // erros ANTERIORES a hoje nesta questão
}

// Peso de sorteio de uma candidata: procedência × reincidência de erro.
export function pesoMeta(c: CandidataMeta): number {
  const origem = PESO_ORIGEM[c.origem] ?? 1;
  const erro = Math.min(1 + c.erros * PESO_POR_ERRO, TETO_PESO_ERRO);
  return origem * erro;
}

// Sorteio ponderado SEM reposição. `rng` injetável para teste determinístico.
export function sortearMeta(
  candidatas: CandidataMeta[],
  quantidade = META_MATERIA_QTD,
  rng: () => number = Math.random
): number[] {
  const pool = candidatas.map((c) => ({ id: c.id, peso: pesoMeta(c) }));
  const saida: number[] = [];
  while (saida.length < quantidade && pool.length > 0) {
    const total = pool.reduce((s, x) => s + x.peso, 0);
    let r = rng() * total;
    let i = 0;
    for (; i < pool.length; i++) {
      r -= pool[i].peso;
      if (r <= 0) break;
    }
    if (i >= pool.length) i = pool.length - 1;
    saida.push(pool[i].id);
    pool.splice(i, 1);
  }
  return saida;
}
