// Verifica no sandbox as questões de saída/erro de um lote dev-* e grava no próprio JSON o
// execucaoId de cada uma que bateu (é o que o importador exige). Sai com código 1 se
// alguma não bater; nesse caso o execucaoId antigo dela é removido do arquivo.
//   API_URL=https://questoesapi.mauriciosts.com ADMIN_TOKEN=<access token do admin> \
//     npm run lote:verificar -- prisma/lotes-dev/dev-python.json [--seco]
// --seco: verifica e imprime, mas não reescreve o arquivo.
// Fluxo por questão: POST /execucoes/verificar { linguagem, codigo } → GET /execucoes/:id
// até sair de fila/rodando → conferirResultado (mesma regra do importador).
import { readFileSync, writeFileSync } from "node:fs";
import {
  conferirResultado,
  linguagemDeVerificacao,
  questaoDevSchema,
  type QuestaoDev,
  type ResultadoLivre,
} from "../src/lib/qualidadeLote.js";

const API_URL = (process.env.API_URL ?? "http://localhost:3333").replace(/\/+$/, "");
const TOKEN = process.env.ADMIN_TOKEN;
const PARALELO = 2; // o worker tem 2 vagas
const ESPERA_MAX_MS = 180_000;

const args = process.argv.slice(2);
const caminho = args.find((a) => !a.startsWith("--"));
const seco = args.includes("--seco");
if (!caminho) {
  console.error("uso: verificarLote.ts <lote.json> [--seco]   (env: API_URL, ADMIN_TOKEN)");
  process.exit(2);
}
if (!TOKEN) {
  console.error("defina ADMIN_TOKEN (access token de uma sessão do admin)");
  process.exit(2);
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(metodo: "GET" | "POST", rota: string, corpo?: unknown): Promise<{ status: number; json: any }> {
  const r = await fetch(`${API_URL}${rota}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(corpo ? { "Content-Type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  let json: unknown = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = { error: texto.slice(0, 200) };
  }
  return { status: r.status, json };
}

// Enfileira (com nova tentativa se o sandbox estiver ocupado) e espera o resultado.
async function verificar(q: QuestaoDev): Promise<{ id: string; erros: string[] }> {
  const corpo = { linguagem: linguagemDeVerificacao(q), codigo: q.codigo };
  let envio = await api("POST", "/execucoes/verificar", corpo);
  for (let tentativa = 0; envio.status === 503 && tentativa < 10; tentativa++) {
    await espera(3000);
    envio = await api("POST", "/execucoes/verificar", corpo);
  }
  if (envio.status !== 202) {
    throw new Error(`POST /execucoes/verificar → ${envio.status}: ${JSON.stringify(envio.json)}`);
  }
  const id = String(envio.json.id);
  const inicio = Date.now();
  for (;;) {
    const r = await api("GET", `/execucoes/${encodeURIComponent(id)}`);
    if (r.status !== 200) throw new Error(`GET /execucoes/${id} → ${r.status}: ${JSON.stringify(r.json)}`);
    if (r.json.status === "concluida") {
      return { id, erros: conferirResultado(q, r.json.resultado?.livre as ResultadoLivre) };
    }
    if (r.json.status === "falhou") {
      return { id, erros: [`o sandbox não conseguiu rodar: ${r.json.resultado?.erroInterno ?? "sem detalhe"}`] };
    }
    if (Date.now() - inicio > ESPERA_MAX_MS) return { id, erros: [`sem resultado em ${ESPERA_MAX_MS / 1000} s`] };
    await espera(1000);
  }
}

const lote = JSON.parse(readFileSync(caminho, "utf8")) as { questoes?: Record<string, unknown>[] };
if (!Array.isArray(lote.questoes)) {
  console.error('o lote não tem o array "questoes"');
  process.exit(2);
}

// Só as de saída/erro com os campos que a verificação precisa; o resto é do validador.
const alvos: { bruta: Record<string, unknown>; q: QuestaoDev }[] = [];
for (const bruta of lote.questoes) {
  if (bruta.tipo !== "saida" && bruta.tipo !== "erro") continue;
  const r = questaoDevSchema.safeParse(bruta);
  if (!r.success || !r.data.codigo || !r.data.linguagem) {
    console.error(`questão ${String(bruta.id)}: formato inválido para verificar (rode antes npm run lote:validar)`);
    process.exit(1);
  }
  alvos.push({ bruta, q: r.data });
}
console.log(`${alvos.length} questões de saída/erro para verificar em ${API_URL}`);

let falhas = 0;
let proxima = 0;
async function trabalhador() {
  while (proxima < alvos.length) {
    const alvo = alvos[proxima++]!;
    try {
      const { id, erros } = await verificar(alvo.q);
      if (erros.length === 0) {
        alvo.bruta.execucaoId = id;
        console.log(`  ok    ${alvo.q.id} (${alvo.q.tipo}) → ${id}`);
      } else {
        falhas++;
        delete alvo.bruta.execucaoId;
        console.log(`  FALHA ${alvo.q.id} (${alvo.q.tipo}) → ${id}`);
        for (const e of erros) console.log(`        ${e}`);
      }
    } catch (err) {
      falhas++;
      delete alvo.bruta.execucaoId;
      console.log(`  FALHA ${alvo.q.id}: ${(err as Error).message}`);
    }
  }
}
await Promise.all(Array.from({ length: PARALELO }, trabalhador));

if (!seco) {
  writeFileSync(caminho, JSON.stringify(lote, null, 2) + "\n");
  console.log(`execucaoId gravado em ${caminho}`);
}
console.log(falhas === 0 ? "Todas conferem." : `${falhas} de ${alvos.length} não conferem.`);
process.exit(falhas === 0 ? 0 : 1);
