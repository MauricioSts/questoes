// Uma execução de ponta a ponta: sobe o container, compila, roda cada teste e compara a
// saída AQUI FORA. A saída esperada nunca entra no container — senão o código do usuário
// poderia ler o arquivo do gabarito e imprimi-lo. Dos testes ocultos o resultado guarda
// só passou/falhou: stdout deles revelaria a entrada oculta.
import { Container, type ResultadoExec } from "./docker.js";
import { SPECS, TEMPO_COMPILACAO_S, TEMPO_EXECUCAO_S, type Linguagem } from "./linguagens.js";
import { saidaConfere, type Comparacao } from "./saida.js";

export interface Teste {
  nome: string;
  oculto: boolean;
  entrada: string;
  saidaEsperada: string;
  comparacao: Comparacao;
}

export interface Trabalho {
  linguagem: Linguagem;
  codigo: string;
  modo: "io" | "sql" | "testes" | "shell" | "livre";
  preparo?: string | null; // seed SQL (sql) ou script que monta o repositório (shell)
  testes: Teste[];
}

export type Motivo = "passou" | "saida_diferente" | "tempo_esgotado" | "erro_execucao" | "limite_recursos";

export interface ResultadoTeste {
  nome: string;
  oculto: boolean;
  passou: boolean;
  motivo: Motivo;
  tempoMs: number;
  // Só nos testes visíveis:
  entrada?: string;
  esperado?: string;
  stdout?: string;
  stderr?: string;
  cortado?: boolean;
}

export interface Resultado {
  compilacao: { ok: boolean; stderr: string; tempoMs: number } | null;
  testes: ResultadoTeste[];
  passou: number;
  total: number;
  tempoMs: number;
  // Execução livre (verificação de questão): saída crua, sem testes.
  livre?: { fase: "compilacao" | "execucao"; codigo: number | null; stdout: string; stderr: string; motivo: Motivo; tempoMs: number };
  erroInterno?: string;
}

// Limite de memória (ou de threads) da própria linguagem: o heap da JVM (-Xmx) e o do V8
// estouram antes do limite do container, e o programa sai com a mensagem do runtime em
// vez de ser morto. Idem para o fork recusado pelo limite de PIDs no Java (EAGAIN/ENOMEM
// viram IOException). Para o aluno é o mesmo caso que o estouro do container.
const SEM_MEMORIA =
  /java\.lang\.OutOfMemoryError|Cannot run program .*error=1[12],|JavaScript heap out of memory|std::bad_alloc|^MemoryError\b/m;

// Código de saída 137 = SIGKILL. Perto do limite de tempo foi o timeout; longe dele, quem
// matou foi o limite de memória do container.
export function motivoDaFalha(r: ResultadoExec, segundos: number): Motivo {
  if (r.sandboxMorreu) return "limite_recursos";
  if (r.estourouTempo || ((r.codigo === 137 || r.codigo === 124) && r.tempoMs >= segundos * 1000 - 250)) return "tempo_esgotado";
  if (r.codigo === 137 || SEM_MEMORIA.test(r.stderr)) return "limite_recursos";
  return "erro_execucao";
}

// O que cada teste roda antes do programa (banco ou repositório limpos a cada teste, para
// um teste não herdar o estado deixado pelo outro).
function comandoDoTeste(t: Trabalho, rodar: string): string {
  switch (t.modo) {
    case "sql":
      // entrada = SQL extra aplicado depois do seed (os dados dos testes ocultos).
      return `rm -f db.sqlite && sqlite3 -bail db.sqlite < seed.sql && sqlite3 -bail db.sqlite < entrada.sql && ${rodar}`;
    case "shell":
      // entrada = script de conferência, rodado depois do script do aluno; é a saída dele
      // que se compara. Chamado por caminho absoluto: o aluno não troca o git do PATH.
      // Conferência que sai com erro (ex.: `git show feature:b.txt` sem a branch) é
      // repositório no estado errado, não erro do script do aluno: vira saida_diferente.
      return `rm -rf /tmp/repo && mkdir /tmp/repo && cd /tmp/repo && /bin/bash /tmp/preparo.sh >/dev/null 2>&1 && (${rodar}) >/dev/null && cd /tmp/repo && { /bin/bash /tmp/entrada.sh || true; }`;
    case "testes":
      // entrada = implementação-alvo (a certa ou um mutante), lida pelo stdin.
      return "python3 /opt/sandbox/rodar-testes.py";
    default:
      return rodar;
  }
}

export async function executar(t: Trabalho): Promise<Resultado> {
  const inicio = Date.now();
  const linguagem: Linguagem = t.modo === "testes" ? "python" : t.linguagem;
  const spec = SPECS[linguagem];
  const arquivo = t.modo === "testes" ? "teste_aluno.py" : spec.arquivo;
  const c = await Container.criar(spec.imagem, spec.memoria);
  try {
    await c.gravar(`/tmp/${arquivo}`, t.codigo);
    if (t.modo === "sql") await c.gravar("/tmp/seed.sql", t.preparo ?? "");
    if (t.modo === "shell") await c.gravar("/tmp/preparo.sh", t.preparo ?? "");

    let compilacao: Resultado["compilacao"] = null;
    if (spec.compilar && t.modo !== "testes") {
      const r = await c.executar(spec.compilar, TEMPO_COMPILACAO_S);
      compilacao = {
        ok: r.codigo === 0,
        stderr: (r.stderr + r.stdout).slice(0, 8000),
        tempoMs: r.tempoMs,
      };
      if (!compilacao.ok) {
        if (r.estourouTempo || r.codigo === 137) compilacao.stderr = `Compilação passou de ${TEMPO_COMPILACAO_S} s.\n` + compilacao.stderr;
        const base = { compilacao, passou: 0, total: t.testes.length, tempoMs: Date.now() - inicio };
        if (t.modo === "livre") {
          return {
            ...base,
            testes: [],
            livre: { fase: "compilacao", codigo: r.codigo, stdout: r.stdout, stderr: r.stderr, motivo: "erro_execucao", tempoMs: r.tempoMs },
          };
        }
        return {
          ...base,
          testes: t.testes.map((x) => ({ nome: x.nome, oculto: x.oculto, passou: false, motivo: "erro_execucao" as Motivo, tempoMs: 0 })),
        };
      }
    }

    if (t.modo === "livre") {
      const r = await c.executar(spec.rodar, TEMPO_EXECUCAO_S);
      return {
        compilacao,
        testes: [],
        passou: 0,
        total: 0,
        tempoMs: Date.now() - inicio,
        livre: {
          fase: "execucao",
          codigo: r.codigo,
          stdout: r.stdout,
          stderr: r.stderr,
          motivo: r.codigo === 0 ? "passou" : motivoDaFalha(r, TEMPO_EXECUCAO_S),
          tempoMs: r.tempoMs,
        },
      };
    }

    const testes: ResultadoTeste[] = [];
    let morto = false;
    for (const teste of t.testes) {
      // Sandbox encerrado por estouro de memória: os testes seguintes nem rodam.
      if (morto) {
        testes.push({ nome: teste.nome, oculto: teste.oculto, passou: false, motivo: "limite_recursos", tempoMs: 0 });
        continue;
      }
      let stdin = teste.entrada;
      if (t.modo === "sql") {
        await c.gravar("/tmp/entrada.sql", teste.entrada);
        stdin = "";
      } else if (t.modo === "shell") {
        await c.gravar("/tmp/entrada.sh", teste.entrada);
        stdin = "";
      }
      const r = await c.executar(comandoDoTeste(t, spec.rodar), TEMPO_EXECUCAO_S, stdin);
      morto = r.sandboxMorreu;
      // Modo testes: o script do aluno pode sair com código != 0 sem que isso seja erro do
      // runner; quem decide é a linha PASSOU/FALHOU que o runner imprime.
      const terminou = r.codigo === 0;
      const confere = terminou && saidaConfere(r.stdout, teste.saidaEsperada, teste.comparacao);
      const motivo: Motivo = confere ? "passou" : terminou ? "saida_diferente" : motivoDaFalha(r, TEMPO_EXECUCAO_S);
      testes.push(
        teste.oculto
          ? { nome: teste.nome, oculto: true, passou: confere, motivo, tempoMs: r.tempoMs }
          : {
              nome: teste.nome,
              oculto: false,
              passou: confere,
              motivo,
              tempoMs: r.tempoMs,
              entrada: teste.entrada.slice(0, 4000),
              esperado: teste.saidaEsperada.slice(0, 4000),
              // No modo testes o stdout é só "PASSOU/FALHOU"; o que ajuda é o stderr do unittest.
              stdout: r.stdout,
              stderr: r.stderr,
              cortado: r.cortado,
            }
      );
    }
    return {
      compilacao,
      testes,
      passou: testes.filter((x) => x.passou).length,
      total: testes.length,
      tempoMs: Date.now() - inicio,
    };
  } finally {
    await c.destruir();
  }
}
