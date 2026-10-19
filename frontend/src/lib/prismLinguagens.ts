// Linguagens do realce de código das questões. O prism-react-renderer já traz um
// conjunto (js/ts, python, sql, c/cpp, go, rust, kotlin, json, yaml, markup...); aqui
// entram as que faltam para os concursos (java é a principal) e o mapa de apelidos do
// campo `linguagem` dos lotes ("Java", "PL/SQL", "C#").
import "./prismGlobal"; // tem que vir antes dos componentes abaixo
import "prismjs/components/prism-java";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-bash";
import { Prism } from "prism-react-renderer";

const APELIDOS: Record<string, string> = {
  js: "javascript",
  node: "javascript",
  ts: "typescript",
  py: "python",
  python3: "python",
  "c#": "csharp",
  cs: "csharp",
  "c++": "cpp",
  sh: "bash",
  shell: "bash",
  html: "markup",
  xml: "markup",
  "pl/sql": "sql",
  plsql: "sql",
  "t-sql": "sql",
  tsql: "sql",
  mysql: "sql",
  postgresql: "sql",
  postgres: "sql",
  oracle: "sql",
  golang: "go",
  kt: "kotlin",
  yml: "yaml",
};

// Nome da gramática do Prism para o rótulo da questão, ou null quando não há gramática
// (aí o código sai sem realce, como texto puro).
export function linguagemPrism(rotulo?: string): string | null {
  if (!rotulo) return null;
  const chave = rotulo.trim().toLowerCase();
  const nome = APELIDOS[chave] ?? chave;
  return Prism.languages[nome] ? nome : null;
}
