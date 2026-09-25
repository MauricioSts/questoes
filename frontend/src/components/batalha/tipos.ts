// Tipo da questão selvagem (vilão) pela matéria: nome, cor e símbolo.
export interface TipoQuestao {
  nome: string;
  cor: string;
  glifo: string;
}

const TIPOS: [RegExp, TipoQuestao][] = [
  [/portug|redac|gramat|interpreta/, { nome: "Letra", cor: "#E07A5F", glifo: "Aa" }],
  [/ingl|english|idioma|espanh/, { nome: "Idioma", cor: "#3D7BD9", glifo: "En" }],
  // Lei antes de Dados: "Legislação (SI e Proteção de Dados)" é Lei.
  [/legisla|direito|\blei\b|etica|constitu|administra|regiment|estatuto/, { nome: "Lei", cor: "#C9A227", glifo: "§" }],
  [/logic|raciocin|matemat|estatist|quantitat/, { nome: "Lógica", cor: "#9B5DE5", glifo: "∴" }],
  [/banco|dados|sql|data/, { nome: "Dados", cor: "#1F9E89", glifo: "DB" }],
  [/inform|program|rede|sistema|engenharia|seguran|desenvolv|software|comput|\bti\b|nuvem|devops/, { nome: "Código", cor: "#12B886", glifo: "</>" }],
];
const GERAL: TipoQuestao = { nome: "Geral", cor: "#8D99AE", glifo: "?" };

export function tipoDaMateria(materia: string): TipoQuestao {
  const m = materia.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return TIPOS.find(([re]) => re.test(m))?.[1] ?? GERAL;
}
