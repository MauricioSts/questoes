// Tipos do conteúdo estático de questões (frontend/src/data/questoes.json).
export type Modulo = "I" | "II";
export type Dificuldade = "facil" | "media" | "dificil";
export type Alternativa = "A" | "B" | "C" | "D" | "E";
export type Contexto = "ESTUDO" | "FLASH" | "SIMULADO" | "TOPICO";

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
  gabarito: Alternativa;
  explicacao: string;
  imagens?: ImagemQuestao[]; // 0, 1 ou 2 figuras; a maioria das questões não tem nenhuma
}

export interface QuestoesRoot {
  meta: {
    fonte?: string;
    versao?: string;
    [k: string]: unknown;
  };
  textos_base: Record<string, string>;
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
