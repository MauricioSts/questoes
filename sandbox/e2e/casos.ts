// Casos do teste de ponta a ponta do sandbox: manda cada código pela API local
// (POST /execucoes), espera o worker de verdade terminar e confere o veredito.
// Chamado pelo rodar.sh, que sobe o banco descartável, a API e o worker.
// Só usa fetch e node:crypto (sem dependências).
import { createHmac } from "node:crypto";

const API = process.env.E2E_API ?? "http://127.0.0.1:3397";
const SEGREDO = process.env.JWT_ACCESS_SECRET ?? "";
const FILTRO = process.env.E2E_FILTRO ?? ""; // ex.: "python" ou "cpp:fork"

type Motivo = "passou" | "saida_diferente" | "tempo_esgotado" | "erro_execucao" | "limite_recursos";
type Espera = "passa" | "falha" | Motivo;

interface Caso {
  nome: string;
  codigo: string;
  espera: Espera;
}

interface TestePublico {
  nome: string;
  oculto: boolean;
  passou: boolean;
  motivo: Motivo;
  tempoMs: number;
  stdout?: string;
  stderr?: string;
  [k: string]: unknown;
}

interface Resultado {
  compilacao: { ok: boolean; stderr: string } | null;
  testes: TestePublico[];
  passou: number;
  total: number;
  tempoMs: number;
  erroInterno?: string;
}

// ------------------------------------------------------------------ códigos

const SOMA_IO: Record<string, { certa: string; errada: string; loop: string; fork: string; memoria: string; rede: string }> = {
  python: {
    certa: "print(sum(map(int, input().split())))\n",
    errada: "print(sum(abs(int(x)) for x in input().split()))\n",
    loop: "while True:\n    pass\n",
    fork: "import os\nwhile True:\n    try:\n        os.fork()\n    except OSError:\n        pass\n",
    memoria: "a = []\nwhile True:\n    a.append(bytearray(1 << 20))\n",
    rede: "import socket\nsocket.create_connection(('1.1.1.1', 53), timeout=2)\nprint(sum(map(int, input().split())))\n",
  },
  javascript: {
    certa: "const n = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(n.reduce((a, b) => a + b, 0));\n",
    errada: "const n = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(n.reduce((a, b) => a + Math.abs(b), 0));\n",
    loop: "while (true) {}\n",
    fork: "require('child_process').execSync('b(){ b|b& }; b; sleep 10', { shell: '/bin/sh', stdio: 'ignore' });\n",
    memoria: "const a = [];\nfor (;;) a.push(Buffer.alloc(1 << 20, 1));\n",
    rede: "const s = require('net').connect(53, '1.1.1.1');\ns.on('connect', () => { console.log('CONECTOU'); process.exit(0); });\ns.on('error', (e) => { console.error(e.message); process.exit(1); });\n",
  },
  typescript: {
    certa: "const n: number[] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(n.reduce((a, b) => a + b, 0));\n",
    errada: "const n: number[] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(n.reduce((a, b) => a + Math.abs(b), 0));\n",
    loop: "while (true) {}\n",
    fork: "const req = require as unknown as (m: string) => any;\nreq('child_process').execSync('b(){ b|b& }; b; sleep 10', { shell: '/bin/sh', stdio: 'ignore' });\n",
    memoria: "declare const Buffer: any;\nconst a: unknown[] = [];\nfor (;;) a.push(Buffer.alloc(1 << 20, 1));\n",
    rede: "const req = require as unknown as (m: string) => any;\nconst s = req('net').connect(53, '1.1.1.1');\ns.on('connect', () => { console.log('CONECTOU'); process.exit(0); });\ns.on('error', (e: Error) => { console.error(e.message); process.exit(1); });\n",
  },
  java: {
    certa: "import java.util.*;\npublic class Main { public static void main(String[] a) { Scanner s = new Scanner(System.in); long t = 0; while (s.hasNextLong()) t += s.nextLong(); System.out.println(t); } }\n",
    errada: "import java.util.*;\npublic class Main { public static void main(String[] a) { Scanner s = new Scanner(System.in); long t = 0; while (s.hasNextLong()) t += Math.abs(s.nextLong()); System.out.println(t); } }\n",
    loop: "public class Main { public static void main(String[] a) { long x = 0; while (true) { x++; } } }\n",
    fork: "public class Main { public static void main(String[] a) throws Exception { while (true) new ProcessBuilder(\"sleep\", \"30\").start(); } }\n",
    memoria: "import java.util.*;\npublic class Main { public static void main(String[] a) { List<long[]> l = new ArrayList<>(); while (true) l.add(new long[1 << 20]); } }\n",
    rede: "public class Main { public static void main(String[] a) throws Exception { new java.net.Socket(\"1.1.1.1\", 53); System.out.println(\"CONECTOU\"); } }\n",
  },
  cpp: {
    certa: "#include <iostream>\nint main() { long long x, t = 0; while (std::cin >> x) t += x; std::cout << t << \"\\n\"; }\n",
    errada: "#include <iostream>\n#include <cstdlib>\nint main() { long long x, t = 0; while (std::cin >> x) t += std::llabs(x); std::cout << t << \"\\n\"; }\n",
    loop: "int main() { volatile long x = 0; for (;;) x++; }\n",
    fork: "#include <unistd.h>\nint main() { for (;;) fork(); }\n",
    memoria: "#include <cstdlib>\n#include <cstring>\nint main() { for (;;) { char* p = (char*)malloc(1 << 20); if (p) memset(p, 1, 1 << 20); } }\n",
    rede: "#include <sys/socket.h>\n#include <netinet/in.h>\n#include <arpa/inet.h>\n#include <cstdio>\nint main() { int s = socket(AF_INET, SOCK_STREAM, 0); if (s < 0) { perror(\"socket\"); return 1; } sockaddr_in a{}; a.sin_family = AF_INET; a.sin_port = htons(53); inet_pton(AF_INET, \"1.1.1.1\", &a.sin_addr); if (connect(s, (sockaddr*)&a, sizeof a) < 0) { perror(\"connect\"); return 1; } puts(\"CONECTOU\"); }\n",
  },
};

function casosIo(l: keyof typeof SOMA_IO): Caso[] {
  const c = SOMA_IO[l];
  return [
    { nome: "certa", codigo: c.certa, espera: "passa" },
    { nome: "errada", codigo: c.errada, espera: "falha" },
    { nome: "loop", codigo: c.loop, espera: "tempo_esgotado" },
    { nome: "fork", codigo: c.fork, espera: "limite_recursos" },
    { nome: "memoria", codigo: c.memoria, espera: "limite_recursos" },
    { nome: "rede", codigo: c.rede, espera: "erro_execucao" },
  ];
}

const SUITES: { linguagem: string; exercicio: string; casos: Caso[] }[] = [
  ...(["python", "javascript", "typescript", "java", "cpp"] as const).map((l) => ({ linguagem: l, exercicio: `e2e-${l}`, casos: casosIo(l) })),
  {
    linguagem: "sql",
    exercicio: "e2e-sql",
    casos: [
      { nome: "certa", codigo: "SELECT nome FROM aluno WHERE nota >= 7;\n", espera: "passa" },
      { nome: "errada", codigo: "SELECT nome FROM aluno WHERE nota > 7;\n", espera: "falha" },
      { nome: "loop", codigo: "WITH RECURSIVE r(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM r) SELECT count(*) FROM r;\n", espera: "tempo_esgotado" },
      // SQLite não tem fork; o equivalente é o .shell, que o --safe recusa.
      { nome: "fork", codigo: ".shell sh -c 'b(){ b|b& }; b'\nSELECT nome FROM aluno WHERE nota >= 7;\n", espera: "erro_execucao" },
      {
        nome: "memoria",
        codigo: "WITH RECURSIVE r(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM r LIMIT 50000000) SELECT length(group_concat(printf('%050d', x))) FROM r;\n",
        espera: "limite_recursos",
      },
      { nome: "rede", codigo: ".shell wget -q -T 2 -O - http://1.1.1.1\nSELECT nome FROM aluno WHERE nota >= 7;\n", espera: "erro_execucao" },
    ],
  },
  {
    linguagem: "shell",
    exercicio: "e2e-shell",
    casos: [
      { nome: "certa", codigo: "git checkout -q -b feature\necho b > b.txt\ngit add b.txt\ngit commit -qm b\n", espera: "passa" },
      { nome: "errada", codigo: "git branch feature\necho b > b.txt\ngit add b.txt\ngit commit -qm b\n", espera: "falha" },
      { nome: "loop", codigo: "while :; do :; done\n", espera: "tempo_esgotado" },
      { nome: "fork", codigo: "b(){ b|b& }; b\nsleep 10\n", espera: "limite_recursos" },
      { nome: "memoria", codigo: "awk 'BEGIN { s = \"a\"; while (1) s = s s }'\n", espera: "limite_recursos" },
      { nome: "rede", codigo: "set -e\nwget -q -T 2 -O - http://1.1.1.1\ngit checkout -q -b feature\necho b > b.txt\ngit add b.txt\ngit commit -qm b\n", espera: "erro_execucao" },
    ],
  },
  {
    linguagem: "testes",
    exercicio: "e2e-testes",
    casos: [
      { nome: "certa", codigo: "from alvo import dobro\n\ndef test_dobro():\n    assert dobro(3) == 6\n    assert dobro(0) == 0\n", espera: "passa" },
      { nome: "errada", codigo: "from alvo import dobro\n\ndef test_dobro():\n    assert dobro(2) == 4\n", espera: "falha" },
      { nome: "loop", codigo: "while True:\n    pass\n", espera: "tempo_esgotado" },
      { nome: "memoria", codigo: "a = []\nwhile True:\n    a.append(bytearray(1 << 20))\n", espera: "limite_recursos" },
    ],
  },
];

// ------------------------------------------------------------------ API

function b64url(x: string | Buffer) {
  return Buffer.from(x).toString("base64url");
}

function token(userId: string): string {
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const corpo = b64url(JSON.stringify({ sub: userId, email: `${userId}@sandbox.local`, iat: agora, exp: agora + 3600 }));
  const ass = createHmac("sha256", SEGREDO).update(`${cab}.${corpo}`).digest("base64url");
  return `${cab}.${corpo}.${ass}`;
}

async function api(metodo: string, caminho: string, userId: string, corpo?: unknown) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: { authorization: `Bearer ${token(userId)}`, "content-type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await r.json().catch(() => null);
  return { status: r.status, json };
}

async function esperar(id: string, userId: string): Promise<{ status: string; resultado: Resultado | null }> {
  const fim = Date.now() + 240_000;
  while (Date.now() < fim) {
    const r = await api("GET", `/execucoes/${id}`, userId);
    if (r.status !== 200) throw new Error(`GET /execucoes/${id} → ${r.status} ${JSON.stringify(r.json)}`);
    if (r.json.status !== "fila" && r.json.status !== "rodando") return r.json;
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`execução ${id} não terminou em 240 s`);
}

// ------------------------------------------------------------------ conferência

const CAMPOS_OCULTO = new Set(["nome", "oculto", "passou", "motivo", "tempoMs"]);

function conferir(caso: Caso, status: string, r: Resultado | null): string | null {
  if (status !== "concluida" || !r) return `status ${status} ${JSON.stringify(r)}`;
  if (r.erroInterno) return `erro interno: ${r.erroInterno}`;
  for (const t of r.testes) {
    if (t.oculto) {
      const extra = Object.keys(t).filter((k) => !CAMPOS_OCULTO.has(k));
      if (extra.length) return `teste oculto vazou campos: ${extra.join(",")}`;
    }
  }
  if (r.total !== r.testes.length || r.total === 0) return `total ${r.total} com ${r.testes.length} testes`;
  const motivos = r.testes.map((t) => t.motivo);
  switch (caso.espera) {
    case "passa":
      return r.passou === r.total ? null : `esperava passar tudo, veio ${motivos.join(",")}`;
    case "falha":
      return r.passou < r.total && motivos.includes("saida_diferente") ? null : `esperava saida_diferente, veio ${motivos.join(",")}`;
    default: {
      // Depois que o sandbox morre, os testes seguintes saem como limite_recursos sem rodar.
      const ok = motivos[0] === caso.espera && motivos.every((m) => m === caso.espera || m === "limite_recursos");
      return ok && r.passou === 0 ? null : `esperava ${caso.espera}, veio ${motivos.join(",")}`;
    }
  }
}

interface Linha {
  linguagem: string;
  caso: string;
  espera: Espera;
  veio: string;
  ok: boolean;
  detalhe: string;
}

async function rodarSuite(s: (typeof SUITES)[number]): Promise<Linha[]> {
  const userId = `e2e-${s.linguagem}`;
  const casos = s.casos.filter((c) => !FILTRO || FILTRO === s.linguagem || FILTRO === `${s.linguagem}:${c.nome}`);
  if (!casos.length) return [];

  // O enunciado não pode levar os testes ocultos.
  const ex = await api("GET", `/exercicios/${s.exercicio}`, userId);
  if (ex.status !== 200) throw new Error(`GET /exercicios/${s.exercicio} → ${ex.status}`);
  const textoEx = JSON.stringify(ex.json);
  if (ex.json.testesVisiveis.length !== 1 || ex.json.testesOcultos !== 2 || /oculto/.test(textoEx)) {
    throw new Error(`GET /exercicios/${s.exercicio} expôs teste oculto: ${textoEx.slice(0, 400)}`);
  }

  const enviados = [];
  for (const caso of casos) {
    const r = await api("POST", "/execucoes", userId, { exercicioId: s.exercicio, codigo: caso.codigo });
    if (r.status !== 202) throw new Error(`POST /execucoes (${s.linguagem}/${caso.nome}) → ${r.status} ${JSON.stringify(r.json)}`);
    enviados.push({ caso, id: r.json.id as string });
  }
  const linhas: Linha[] = [];
  for (const { caso, id } of enviados) {
    const { status, resultado } = await esperar(id, userId);
    const erro = conferir(caso, status, resultado);
    const veio = resultado?.testes.map((t) => t.motivo).join(",") ?? status;
    const vis = resultado?.testes.find((t) => !t.oculto);
    const detalhe = [
      resultado?.compilacao && !resultado.compilacao.ok ? `compilação: ${resultado.compilacao.stderr.slice(0, 200)}` : "",
      vis?.stdout ? `stdout=${JSON.stringify(vis.stdout.slice(0, 80))}` : "",
      vis?.stderr ? `stderr=${JSON.stringify(vis.stderr.slice(-160))}` : "",
      `${resultado?.tempoMs ?? "?"}ms`,
    ]
      .filter(Boolean)
      .join(" ");
    linhas.push({ linguagem: s.linguagem, caso: caso.nome, espera: caso.espera, veio, ok: !erro, detalhe: erro ? `${erro} | ${detalhe}` : detalhe });
    console.log(`${erro ? "FALHOU" : "ok    "} ${s.linguagem.padEnd(10)} ${caso.nome.padEnd(8)} espera=${caso.espera.padEnd(15)} veio=${veio.padEnd(48)} ${erro ? `${erro} | ` : ""}${detalhe}`);
  }
  return linhas;
}

async function main() {
  if (SEGREDO.length < 10) throw new Error("JWT_ACCESS_SECRET não definido");
  const todas: Linha[] = [];
  // Uma linguagem por vez: a fila da API recusa acima de 40 e o worker tem poucas vagas.
  for (const s of SUITES) todas.push(...(await rodarSuite(s)));
  const falhas = todas.filter((l) => !l.ok);
  console.log(`\n${todas.length - falhas.length}/${todas.length} casos ok`);
  process.exit(falhas.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
