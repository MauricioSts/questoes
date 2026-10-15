// Container efêmero do sandbox. Um container por execução: sobe parado num `sleep`, recebe
// o código e cada comando por `docker exec`, e é destruído no fim (ou pelo próprio sleep,
// se o worker morrer no meio — o --rm limpa).
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { Coletor } from "./saida.js";

const DOCKER = process.env.DOCKER_BIN ?? "docker";
const RUNTIME = process.env.SANDBOX_RUNTIME ?? "runsc";
export const ROTULO = "questoes-sandbox";
// Vida máxima do container: nenhuma execução passa disso, nem se o worker travar.
const VIDA_MAXIMA_S = 120;

export interface ResultadoExec {
  codigo: number | null; // exit code (null = morto pelo relógio do worker)
  stdout: string;
  stderr: string;
  cortado: boolean;
  tempoMs: number;
  estourouTempo: boolean;
  // O gVisor encerra o sandbox inteiro quando o container passa do limite de memória (e
  // fork bomb chega lá antes do limite de PIDs). O docker exec volta com 128 e uma
  // mensagem interna do runtime, que não é para o usuário ver.
  sandboxMorreu: boolean;
}

const MORTE_DO_SANDBOX = /urpc method|waiting on PID|containerManager|OCI runtime|is not running/;
export const AVISO_LIMITE = "O programa passou do limite de memória ou de processos e o sandbox foi encerrado.";

function docker(args: string[], opts: { entrada?: string; limiteMs?: number } = {}): Promise<ResultadoExec> {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const p = spawn(DOCKER, args, { stdio: ["pipe", "pipe", "pipe"] });
    const out = new Coletor();
    const err = new Coletor();
    let estourou = false;
    const relogio = opts.limiteMs
      ? setTimeout(() => {
          estourou = true;
          p.kill("SIGKILL");
        }, opts.limiteMs)
      : null;
    p.stdout.on("data", (b: Buffer) => out.add(b));
    p.stderr.on("data", (b: Buffer) => err.add(b));
    p.stdin.on("error", () => {}); // processo que não lê stdin fecha o pipe: não é erro nosso
    p.stdin.end(opts.entrada ?? "");
    p.on("close", (codigo) => {
      if (relogio) clearTimeout(relogio);
      const stderr = err.texto();
      const morreu = !estourou && codigo !== 0 && (codigo === 128 || codigo === 126) && MORTE_DO_SANDBOX.test(stderr);
      resolve({
        codigo: estourou ? null : codigo,
        stdout: out.texto(),
        stderr: morreu ? AVISO_LIMITE : stderr,
        sandboxMorreu: morreu,
        cortado: out.cortado || err.cortado,
        tempoMs: Date.now() - inicio,
        estourouTempo: estourou,
      });
    });
  });
}

export class Container {
  private constructor(readonly id: string) {}

  static async criar(imagem: string, memoria: string): Promise<Container> {
    const nome = `${ROTULO}-${randomBytes(6).toString("hex")}`;
    const r = await docker(
      [
        "run", "-d", "--rm",
        "--name", nome,
        "--label", `${ROTULO}=1`,
        "--runtime", RUNTIME,
        "--network", "none",
        "--user", "65534:65534",
        "--read-only",
        "--tmpfs", "/tmp:rw,exec,nosuid,nodev,size=16m,mode=1777",
        "--memory", memoria,
        "--memory-swap", memoria,
        "--cpus", process.env.SANDBOX_CPUS ?? "0.5",
        "--pids-limit", "64",
        "--ulimit", "nofile=64:64",
        "--ulimit", "fsize=16777216:16777216",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--hostname", "sandbox",
        "--log-driver", "none",
        "--workdir", "/tmp",
        imagem,
        "sleep", String(VIDA_MAXIMA_S),
      ],
      { limiteMs: 30_000 }
    );
    if (r.codigo !== 0) throw new Error(`docker run falhou: ${r.stderr.slice(0, 500)}`);
    return new Container(nome);
  }

  // Grava um arquivo em /tmp. O conteúdo vai pelo stdin, nunca na linha de comando.
  async gravar(caminho: string, conteudo: string): Promise<void> {
    const r = await docker(["exec", "-i", this.id, "sh", "-c", `cat > '${caminho}'`], {
      entrada: conteudo,
      limiteMs: 10_000,
    });
    if (r.codigo !== 0) throw new Error(`não gravou ${caminho}: ${r.stderr.slice(0, 200)}`);
  }

  // Roda um comando com limite de tempo: `timeout` do busybox dentro do container e o
  // relógio do worker por fora (com folga para o overhead do docker exec).
  executar(comando: string, segundos: number, entrada = ""): Promise<ResultadoExec> {
    return docker(
      ["exec", "-i", this.id, "sh", "-c", `cd /tmp && exec timeout -s KILL ${segundos} sh -c '${comando.replace(/'/g, `'\\''`)}'`],
      { entrada, limiteMs: segundos * 1000 + 3000 }
    );
  }

  async destruir(): Promise<void> {
    await docker(["rm", "-f", this.id], { limiteMs: 30_000 });
  }
}

// Containers que sobraram de um worker que morreu no meio.
export async function limparOrfaos(): Promise<number> {
  const r = await docker(["ps", "-aq", "--filter", `label=${ROTULO}=1`], { limiteMs: 30_000 });
  const ids = r.stdout.split("\n").filter(Boolean);
  if (ids.length) await docker(["rm", "-f", ...ids], { limiteMs: 60_000 });
  return ids.length;
}
