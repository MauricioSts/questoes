// Tipos do conteúdo estático de questões (frontend/src/data/questoes.json).
export type Modulo = "I" | "II";
export type Dificuldade = "facil" | "media" | "dificil";
export type Alternativa = "A" | "B" | "C" | "D" | "E";
export type Contexto = "ESTUDO" | "FLASH" | "SIMULADO" | "TOPICO" | "BATALHA";

// Procedência da questão:
// - "oficial":  caiu numa prova real, texto preservado (exige `prova`)
// - "adaptada": baseada numa prova real, com texto alterado (exige `prova`)
// - "gerada":   criada como reforço a partir das questões que eu errei
// - "autoral":  escrita sem prova de referência (é o padrão dos lotes antigos)
export type Origem = "oficial" | "adaptada" | "gerada" | "autoral";

// Prova de onde a questão veio. Fica no root do lote (como textos_base), porque dezenas
// de questões compartilham a mesma prova.
export interface Prova {
  banca: string; // "FGV", "Cesgranrio", ...
  orgao: string; // "TCE-TO", "DATAPREV", ...
  ano: number;
  cargo?: string;
  tipo?: string; // caderno, quando a banca embaralha versões (FGV: "1", "2", "3")
  url?: string; // PDF oficial
  // "resolucao_propria" = gabarito resolvido por quem montou o lote, não pela banca.
  gabarito_fonte?: "definitivo" | "resolucao_propria";
}

// MULTIPLA_ESCOLHA (A–E) ou CERTO_ERRADO (Cebraspe). No certo/errado o enunciado é a
// afirmação, as alternativas são { C: "Certo", E: "Errado" } e o gabarito é "C" ou "E".
export type Formato = "MULTIPLA_ESCOLHA" | "CERTO_ERRADO";

// Comando do certo/errado: o texto ("julgue os itens a seguir") comum a vários itens.
export interface Comando {
  id: string;
  grupo: string; // "P1" | "P2" | "P3" do perfil da prova
  texto: string;
  codigo?: string;
  linguagem?: string;
  imagens?: ImagemQuestao[];
}

export interface Questao {
  id: number;
  modulo: Modulo;
  materia: string;
  assunto: string;
  dificuldade: Dificuldade;
  texto_base?: string; // chave em textos_base (só em questões de inglês)
  enunciado: string;
  codigo?: string; // opcional: bloco de código (renderizado monospaço, preserva quebras)
  linguagem?: string; // opcional: rótulo da linguagem do código (ex.: "java", "sql")
  alternativas: Partial<Record<Alternativa, string>>;
  // Ausente no plano gratuito até a questão ser respondida: aí quem corrige é o servidor
  // (lib/answers.ts, responderQuestao), que devolve gabarito e explicação.
  gabarito?: Alternativa;
  explicacao: string;
  imagens?: ImagemQuestao[]; // 0, 1 ou 2 figuras; a maioria das questões não tem nenhuma
  origem?: Origem; // ausente = "autoral" (lotes anteriores à procedência)
  prova?: string; // chave em `provas` (só em origem oficial/adaptada)
  // Prova de que o LOTE foi montado: vale mesmo para as questões autorais escritas junto.
  // É o que permite estudar/medir "as questões da prova X" sem afirmar que o texto saiu dela.
  prova_base?: string;
  numero?: number; // número que a questão tinha na prova de origem
  geradaDe?: number[]; // IDs das questões erradas que motivaram este reforço
  formato?: Formato; // ausente = múltipla escolha
  comando?: Comando; // só no certo/errado
  gabarito_conferir?: boolean; // gabarito duvidoso: a correção avisa
}

export interface QuestoesRoot {
  meta: {
    fonte?: string;
    versao?: string;
    [k: string]: unknown;
  };
  textos_base: Record<string, string>;
  provas?: Record<string, Prova>;
  questoes: Questao[];
}

// Imagem de uma questão (diagrama, print de tela). Vem embutida no próprio lote como
// data URI: não há requisição de rede, pasta de imagens nem endpoint de estáticos.
export type PosicaoImagem = "enunciado" | "alternativas";

export interface ImagemQuestao {
  arquivo: string; // nome de referência p/ rastreio, ex.: "q379_modelo_crowsfoot.png"
  legenda: string; // texto curto: vira o alt e a legenda visível
  posicao: PosicaoImagem; // onde entra na tela da questão
  dados: string; // data URI completo ("data:image/png;base64,…"), usado direto no src
}
