// Como cada linguagem é compilada e executada dentro do container. Os comandos rodam com
// `sh -c` dentro de /tmp (único lugar gravável) e sempre atrás do `timeout` do busybox;
// o worker ainda tem o próprio relógio por cima, para o caso de o timeout interno falhar.

export type Linguagem = "python" | "javascript" | "typescript" | "java" | "cpp" | "cpp-ubsan" | "sql" | "shell";

export const LINGUAGENS_USUARIO = ["python", "javascript", "typescript", "java", "cpp", "sql", "shell"] as const;

export interface Spec {
  imagem: string;
  arquivo: string; // nome do arquivo com o código do usuário, em /tmp
  memoria: string; // limite do container (a JVM não sobe com 128m)
  compilar?: string;
  rodar: string;
}

const TAG = "1";
const img = (nome: string) => `questoes-sandbox-${nome}:${TAG}`;

export const SPECS: Record<Linguagem, Spec> = {
  python: { imagem: img("python"), arquivo: "main.py", memoria: "128m", rodar: "python3 main.py" },
  javascript: {
    imagem: img("node"),
    arquivo: "main.js",
    memoria: "128m",
    rodar: "node --max-old-space-size=64 --stack-size=2000 main.js",
  },
  typescript: {
    imagem: img("node"),
    arquivo: "main.ts",
    memoria: "128m",
    // Checagem de tipos de verdade (erro de tipo é questão da trilha), com declarações
    // mínimas do Node em vez de @types/node, que estourava memória e tempo.
    compilar:
      "NODE_OPTIONS=--max-old-space-size=96 tsc --noEmit --strict --skipLibCheck --target es2022 --lib es2022 --types --module preserve --moduleDetection force main.ts /opt/sandbox/ambiente.d.ts",
    rodar: "node --max-old-space-size=64 --no-warnings --experimental-transform-types main.ts",
  },
  java: {
    imagem: img("java"),
    arquivo: "Main.java",
    memoria: "256m",
    compilar: "javac -J-Xmx128m -J-XX:+UseSerialGC -J-XX:TieredStopAtLevel=1 -encoding UTF-8 -d /tmp Main.java",
    rodar: "java -Xmx64m -Xss1m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -cp /tmp Main",
  },
  cpp: {
    imagem: img("cpp"),
    arquivo: "main.cpp",
    memoria: "128m",
    compilar: "g++ -std=c++20 -O0 -pipe -o /tmp/a.out main.cpp",
    rodar: "./a.out",
  },
  // Só para verificar questões de comportamento indefinido: o UBSan em modo trap (o musl
  // não tem a biblioteca de runtime) transforma o UB num SIGILL/SIGTRAP observável.
  "cpp-ubsan": {
    imagem: img("cpp"),
    arquivo: "main.cpp",
    memoria: "128m",
    compilar: "g++ -std=c++20 -O0 -pipe -fsanitize=undefined -fsanitize=bounds-strict -fsanitize-trap=all -o /tmp/a.out main.cpp",
    rodar: "./a.out",
  },
  // --safe desliga .shell/.system/.output/.load: o usuário só manda SQL.
  sql: { imagem: img("sql"), arquivo: "main.sql", memoria: "128m", rodar: "sqlite3 --safe -bail db.sqlite < main.sql" },
  shell: { imagem: img("shell"), arquivo: "aluno.sh", memoria: "128m", rodar: "mkdir -p /tmp/repo && cd /tmp/repo && bash /tmp/aluno.sh" },
};

export const TEMPO_COMPILACAO_S = 10;
export const TEMPO_EXECUCAO_S = 5;
