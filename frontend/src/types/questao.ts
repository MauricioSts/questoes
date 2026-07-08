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
