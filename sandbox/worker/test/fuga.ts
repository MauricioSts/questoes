// Testes de fuga e de funcionamento do sandbox, rodando containers de verdade.
// Uso (precisa de acesso ao docker): npm run test:fuga
// Cada caso descreve o ataque e a condição que prova que ele foi contido.
import { executar, type Resultado, type Trabalho } from "../src/executar.js";
import type { Linguagem } from "../src/linguagens.js";

interface Caso {
  nome: string;
  trabalho: Trabalho;
  contido: (r: Resultado) => boolean;
  resumo: (r: Resultado) => string;
}

const livre = (linguagem: Linguagem, codigo: string): Trabalho => ({ linguagem, codigo, modo: "livre", testes: [] });
const saida = (r: Resultado) => `${r.livre?.motivo} exit=${r.livre?.codigo} ${r.livre?.tempoMs}ms out=${JSON.stringify((r.livre?.stdout ?? "").slice(0, 120))} err=${JSON.stringify((r.livre?.stderr ?? "").slice(-160))}`;

const casos: Caso[] = [
  // ---------- fuga ----------
  {
    nome: "fork bomb (shell)",
    trabalho: livre("shell", "cd /tmp; b(){ b|b& }; b; sleep 3; echo vivo"),
    contido: (r) => (r.livre?.tempoMs ?? 0) < 9000,
    resumo: saida,
  },
  {
    nome: "fork bomb (python os.fork)",
    trabalho: livre("python", "import os\nn=0\nwhile True:\n    try:\n        os.fork(); n+=1\n    except OSError as e:\n        print('fork recusado', e.errno, flush=True); break\n"),
    contido: (r) => (r.livre?.tempoMs ?? 0) < 9000,
    resumo: saida,
  },
  {
    nome: "fork bomb (C++)",
    trabalho: livre("cpp", "#include <unistd.h>\n#include <cstdio>\nint main(){ int n=0; while(fork()>=0) n++; printf(\"parou em %d\\n\", n); }"),
    contido: (r) => (r.livre?.tempoMs ?? 0) < 9000,
    resumo: saida,
  },
  {
    nome: "loop infinito (python)",
    trabalho: livre("python", "while True:\n    pass\n"),
    contido: (r) => r.livre?.motivo === "tempo_esgotado" && (r.livre?.tempoMs ?? 0) < 9000,
    resumo: saida,
  },
  {
    nome: "loop infinito (java)",
    trabalho: livre("java", "public class Main { public static void main(String[] a){ long x=0; while(true){ x++; } } }"),
    contido: (r) => r.livre?.motivo === "tempo_esgotado",
    resumo: saida,
  },
  {
    nome: "rede: DNS e conexão externa",
    trabalho: livre(
      "python",
      "import socket\nfor alvo in [('1.1.1.1',53),('172.17.0.1',3333),('10.0.0.1',22)]:\n    s=socket.socket(); s.settimeout(1)\n    try:\n        s.connect(alvo); print('CONECTOU', alvo)\n    except Exception as e:\n        print('bloqueado', alvo, type(e).__name__)\ntry:\n    socket.gethostbyname('google.com'); print('DNS RESOLVEU')\nexcept Exception as e:\n    print('dns bloqueado', type(e).__name__)\n"
    ),
    contido: (r) => !/CONECTOU|DNS RESOLVEU/.test(r.livre?.stdout ?? ""),
    resumo: saida,
  },
  {
    nome: "rede: interfaces visíveis",
    trabalho: livre("shell", "cat /proc/net/dev | tail -n +3 | cut -d: -f1 | tr -d ' ' | tr '\\n' ' '"),
    contido: (r) => !/eth|ens|docker/.test(r.livre?.stdout ?? ""),
    resumo: saida,
  },
  {
    nome: "ler /etc/shadow e arquivos do host",
    trabalho: livre(
      "python",
      "import os\nfor p in ['/etc/shadow','/home/ubuntu/questoes/backend/.env','/var/run/docker.sock','/root']:\n    try:\n        open(p).read(50); print('LEU', p)\n    except Exception as e:\n        print('negado', p, type(e).__name__)\nprint('uid', os.getuid(), 'gid', os.getgid())\n"
    ),
    contido: (r) => !/LEU/.test(r.livre?.stdout ?? "") && /uid 65534/.test(r.livre?.stdout ?? ""),
    resumo: saida,
  },
  {
    nome: "gravar fora de /tmp (rootfs read-only)",
    trabalho: livre("shell", "for f in /etc/x /usr/bin/x /x /opt/sandbox/x; do (echo a > $f) 2>/dev/null && echo GRAVOU $f || echo negado $f; done"),
    contido: (r) => !/GRAVOU/.test(r.livre?.stdout ?? ""),
    resumo: saida,
  },
  {
    nome: "encher o disco (/tmp tem 16 MB)",
    trabalho: livre("shell", "dd if=/dev/zero of=/tmp/lixo bs=1M count=200 2>&1 | tail -1; du -m /tmp/lixo"),
    contido: (r) => Number((r.livre?.stdout ?? "").trim().split(/\s+/).at(-2) ?? 999) <= 16,
    resumo: saida,
  },
  {
    nome: "alocar 2 GB de uma vez (python)",
    trabalho: livre("python", "b = bytearray(2 * 1024**3)\nprint('ALOCOU', len(b))\n"),
    contido: (r) => !/ALOCOU/.test(r.livre?.stdout ?? ""),
    resumo: saida,
  },
  {
    nome: "alocar memória aos poucos (C++, toca as páginas)",
    trabalho: livre(
      "cpp",
      "#include <cstdlib>\n#include <cstring>\n#include <cstdio>\nint main(){ size_t tot=0; for(int i=0;i<64;i++){ char* p=(char*)malloc(32<<20); if(!p){ printf(\"malloc falhou em %zu MB\\n\", tot>>20); return 1;} memset(p,1,32<<20); tot+=32<<20; } printf(\"ALOCOU %zu MB\\n\", tot>>20); }"
    ),
    contido: (r) => !/ALOCOU/.test(r.livre?.stdout ?? ""),
    resumo: saida,
  },
  {
    nome: "heap gigante (java)",
    trabalho: livre("java", "public class Main { public static void main(String[] a){ long[] x = new long[1<<28]; System.out.println(\"ALOCOU \" + x.length); } }"),
    contido: (r) => !/ALOCOU/.test(r.livre?.stdout ?? ""),
    resumo: saida,
  },
  {
    nome: "saída gigante (100 MB) é cortada em 64 KB",
    trabalho: livre("python", "import sys\nfor _ in range(100):\n    sys.stdout.write('A' * 1024 * 1024)\n"),
    contido: (r) => (r.livre?.stdout.length ?? 0) <= 64 * 1024,
    resumo: (r) => `stdout=${r.livre?.stdout.length} bytes, motivo=${r.livre?.motivo}, ${r.livre?.tempoMs}ms`,
  },
  {
    nome: "sequências ANSI e controle removidas",
    trabalho: livre("python", "print('\\x1b[31mvermelho\\x1b[0m \\x1b]0;titulo\\x07ok\\rX\\x00\\x08')\n"),
    contido: (r) => !/[\u001b\u0000\u0008\r]/.test(r.livre?.stdout ?? "") && /vermelho/.test(r.livre?.stdout ?? ""),
    resumo: saida,
  },
  {
    nome: "capabilities e kernel (gVisor)",
    trabalho: livre("shell", "grep -E 'CapEff|NoNewPrivs' /proc/self/status | tr -s '\\t ' ' ' | tr '\\n' ' '; uname -r"),
    contido: (r) => /CapEff: 0000000000000000/.test(r.livre?.stdout ?? "") && /NoNewPrivs: 1/.test(r.livre?.stdout ?? "") && /gvisor/.test(r.livre?.stdout ?? ""),
    resumo: saida,
  },
  {
    nome: "SQL: .shell bloqueado pelo --safe",
    trabalho: { linguagem: "sql", codigo: ".shell cat /etc/passwd\nselect 1;", modo: "sql", preparo: "create table t(x);", testes: [{ nome: "t", oculto: false, entrada: "", saidaEsperada: "1", comparacao: "exata" }] },
    contido: (r) => !r.testes[0].passou && !/root:/.test(r.testes[0].stdout ?? ""),
    resumo: (r) => `${r.testes[0].motivo} err=${JSON.stringify(r.testes[0].stderr?.slice(0, 120))}`,
  },
  {
    nome: "teste oculto não vaza entrada nem stdout",
    trabalho: {
      linguagem: "python",
      codigo: "import sys\nprint('ENTRADA:', sys.stdin.read())\n",
      modo: "io",
      testes: [{ nome: "oculto", oculto: true, entrada: "SEGREDO-123", saidaEsperada: "x", comparacao: "exata" }],
    },
    contido: (r) => !JSON.stringify(r).includes("SEGREDO-123"),
    resumo: (r) => JSON.stringify(r.testes[0]),
  },
  {
    nome: "saída esperada não existe no container",
    trabalho: {
      linguagem: "shell",
      codigo: "grep -r GABARITO-999 / 2>/dev/null | head -3; echo fim",
      modo: "shell",
      preparo: "git init -q",
      testes: [{ nome: "t", oculto: false, entrada: "echo ok", saidaEsperada: "GABARITO-999", comparacao: "exata" }],
    },
    contido: (r) => !r.testes[0].passou,
    resumo: (r) => `${r.testes[0].motivo} stdout=${JSON.stringify(r.testes[0].stdout)}`,
  },
];

// ---------- funcionamento (cada linguagem resolve "soma de dois números") ----------
const soma: Record<string, string> = {
  python: "a, b = map(int, input().split())\nprint(a + b)\n",
  javascript: "const [a, b] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
  typescript: "const [a, b]: number[] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
  java: "import java.util.*;\npublic class Main { public static void main(String[] x){ Scanner s = new Scanner(System.in); System.out.println(s.nextLong() + s.nextLong()); } }\n",
  cpp: "#include <iostream>\nint main(){ long long a, b; std::cin >> a >> b; std::cout << a + b << \"\\n\"; }\n",
};
for (const [ling, codigo] of Object.entries(soma)) {
  casos.push({
    nome: `funciona: soma em ${ling} (1 visível + 1 oculto)`,
    trabalho: {
      linguagem: ling as Linguagem,
      codigo,
      modo: "io",
      testes: [
        { nome: "visível", oculto: false, entrada: "2 3\n", saidaEsperada: "5\n", comparacao: "exata" },
        { nome: "oculto", oculto: true, entrada: "-7 1000000000000\n", saidaEsperada: "999999999993", comparacao: "exata" },
      ],
    },
    contido: (r) => r.passou === 2,
    resumo: (r) => `${r.passou}/${r.total} compilação=${r.compilacao ? r.compilacao.tempoMs + "ms" : "-"} total=${r.tempoMs}ms`,
  });
}
casos.push(
  {
    nome: "funciona: SQL com dados ocultos",
    trabalho: {
      linguagem: "sql",
      codigo: "SELECT nome FROM aluno WHERE nota >= 7;",
      modo: "sql",
      preparo: "CREATE TABLE aluno(nome TEXT, nota INT); INSERT INTO aluno VALUES ('Ana', 9), ('Bia', 5);",
      testes: [
        { nome: "seed", oculto: false, entrada: "", saidaEsperada: "Ana", comparacao: "conjunto" },
        { nome: "oculto", oculto: true, entrada: "INSERT INTO aluno VALUES ('Caio', 7), ('Duda', 6);", saidaEsperada: "Caio\nAna", comparacao: "conjunto" },
      ],
    },
    contido: (r) => r.passou === 2,
    resumo: (r) => `${r.passou}/${r.total} ${r.tempoMs}ms`,
  },
  {
    nome: "funciona: modo testes pega mutante",
    trabalho: {
      linguagem: "python",
      codigo: "from alvo import maior\n\ndef test_maior():\n    assert maior([3, 9, 2]) == 9\n    assert maior([-5, -2]) == -2\n",
      modo: "testes",
      testes: [
        { nome: "implementação certa", oculto: false, entrada: "def maior(xs):\n    return max(xs)\n", saidaEsperada: "PASSOU", comparacao: "exata" },
        { nome: "mutante: começa em 0", oculto: true, entrada: "def maior(xs):\n    m = 0\n    for x in xs:\n        m = x if x > m else m\n    return m\n", saidaEsperada: "FALHOU", comparacao: "exata" },
      ],
    },
    contido: (r) => r.passou === 2,
    resumo: (r) => `${r.passou}/${r.total} ${r.tempoMs}ms`,
  },
  {
    nome: "funciona: shell + git",
    trabalho: {
      linguagem: "shell",
      codigo: "git checkout -q -b feature\necho b > b.txt\ngit add b.txt\ngit commit -qm 'adiciona b'\n",
      modo: "shell",
      preparo: "git init -q -b main && echo a > a.txt && git add a.txt && git commit -qm inicial",
      testes: [{ nome: "branch e commits", oculto: false, entrada: "git branch --show-current; git log --format=%s | wc -l", saidaEsperada: "feature\n2", comparacao: "linhas" }],
    },
    contido: (r) => r.passou === 1,
    resumo: (r) => `${r.passou}/${r.total} ${JSON.stringify(r.testes[0].stdout)} ${r.tempoMs}ms`,
  },
  {
    nome: "funciona: erro de tipo do TypeScript na compilação",
    trabalho: livre("typescript", "const x: number = 'texto';\nconsole.log(x);\n"),
    contido: (r) => r.livre?.fase === "compilacao" && /TS2322/.test(r.livre.stdout + r.livre.stderr),
    resumo: saida,
  },
  {
    nome: "funciona: UB de C++ detectado (cpp-ubsan)",
    trabalho: livre("cpp-ubsan", "#include <climits>\n#include <iostream>\nint main(int c, char**){ int x = INT_MAX; x += c; std::cout << x << '\\n'; }\n"),
    contido: (r) => r.livre?.fase === "execucao" && r.livre.codigo !== 0,
    resumo: saida,
  }
);

const filtro = process.argv[2];
let falhas = 0;
for (const c of casos) {
  if (filtro && !c.nome.includes(filtro)) continue;
  let r: Resultado;
  try {
    r = await executar(c.trabalho);
  } catch (e) {
    falhas++;
    console.log(`✗ ${c.nome}\n    EXCEÇÃO ${(e as Error).message}`);
    continue;
  }
  const ok = c.contido(r);
  if (!ok) falhas++;
  console.log(`${ok ? "✓" : "✗"} ${c.nome}\n    ${c.resumo(r)}`);
}
console.log(falhas ? `\n${falhas} caso(s) FALHARAM` : "\nTodos os casos contidos/ok.");
process.exit(falhas ? 1 : 0);
