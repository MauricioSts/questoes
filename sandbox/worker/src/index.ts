// Worker do sandbox. Serviço separado da API: a API só insere linhas em "Execucao" e lê o
// resultado; aqui cada vaga (CONCORRENCIA, padrão 2 — a VM é pequena) pega a próxima da
// fila com FOR UPDATE SKIP LOCKED, roda e grava. O banco é acessado com uma role que só
// enxerga Execucao, Exercicio e TesteExercicio.
import pg from "pg";
import { executar, type Teste, type Trabalho } from "./executar.js";
import { limparOrfaos } from "./docker.js";
import type { Linguagem } from "./linguagens.js";
import type { Comparacao } from "./saida.js";

const CONCORRENCIA = Math.max(1, Number(process.env.SANDBOX_CONCORRENCIA ?? 2));
const ESPERA_MS = 400;
const MAX_TESTES = 30;

const pool = new pg.Pool({ connectionString: process.env.SANDBOX_DATABASE_URL, max: CONCORRENCIA + 1 });

interface LinhaExecucao {
  id: string;
  exercicioId: string | null;
  finalidade: string;
  linguagem: string;
  codigo: string;
}

async function pegarProxima(): Promise<LinhaExecucao | null> {
  const r = await pool.query<LinhaExecucao>(
    `UPDATE "Execucao" SET status = 'rodando', "iniciadoEm" = now()
      WHERE id = (SELECT id FROM "Execucao" WHERE status = 'fila'
                   ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING id, "exercicioId", finalidade, linguagem, codigo`
  );
  return r.rows[0] ?? null;
}

async function montarTrabalho(e: LinhaExecucao): Promise<Trabalho> {
  if (e.finalidade === "verificacao" || !e.exercicioId) {
    return { linguagem: e.linguagem as Linguagem, codigo: e.codigo, modo: "livre", testes: [] };
  }
  const ex = await pool.query<{ modo: string; seedSql: string | null }>(
    `SELECT modo, "seedSql" FROM "Exercicio" WHERE id = $1`,
    [e.exercicioId]
  );
  if (!ex.rows[0]) throw new Error("exercício não existe mais");
  const ts = await pool.query<{ nome: string; oculto: boolean; entrada: string; saidaEsperada: string; comparacao: string }>(
    `SELECT nome, oculto, entrada, "saidaEsperada", comparacao FROM "TesteExercicio"
      WHERE "exercicioId" = $1 ORDER BY oculto, ordem LIMIT ${MAX_TESTES}`,
    [e.exercicioId]
  );
  const testes: Teste[] = ts.rows.map((t, i) => ({
    nome: t.nome || `Teste ${i + 1}`,
    oculto: t.oculto,
    entrada: t.entrada,
    saidaEsperada: t.saidaEsperada,
    comparacao: t.comparacao as Comparacao,
  }));
  return {
    linguagem: e.linguagem as Linguagem,
    codigo: e.codigo,
    modo: ex.rows[0].modo as Trabalho["modo"],
    preparo: ex.rows[0].seedSql,
    testes,
  };
}

async function concluir(id: string, status: "concluida" | "falhou", resultado: unknown) {
  await pool.query(
    `UPDATE "Execucao" SET status = $2, resultado = $3::jsonb, "concluidoEm" = now() WHERE id = $1`,
    [id, status, JSON.stringify(resultado)]
  );
}

let parando = false;

async function vaga(n: number) {
  while (!parando) {
    let e: LinhaExecucao | null = null;
    try {
      e = await pegarProxima();
      if (!e) {
        await new Promise((r) => setTimeout(r, ESPERA_MS));
        continue;
      }
      const resultado = await executar(await montarTrabalho(e));
      await concluir(e.id, "concluida", resultado);
      console.log(`[vaga ${n}] ${e.id} ${e.linguagem} ${resultado.passou}/${resultado.total} ${resultado.tempoMs}ms`);
    } catch (err) {
      console.error(`[vaga ${n}] erro`, err);
      if (e) await concluir(e.id, "falhou", { erroInterno: "Falha interna do sandbox." }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  const orfaos = await limparOrfaos();
  // O que estava "rodando" quando o worker anterior morreu não termina mais.
  const presas = await pool.query(
    `UPDATE "Execucao" SET status = 'falhou', resultado = '{"erroInterno":"Sandbox reiniciado durante a execução."}'::jsonb,
            "concluidoEm" = now() WHERE status = 'rodando'`
  );
  console.log(`sandbox: ${CONCORRENCIA} vaga(s); ${orfaos} container(s) órfão(s) e ${presas.rowCount} execução(ões) presa(s) limpos`);
  await Promise.all(Array.from({ length: CONCORRENCIA }, (_, i) => vaga(i + 1)));
  await pool.end();
}

for (const sinal of ["SIGTERM", "SIGINT"] as const) {
  process.on(sinal, () => {
    parando = true; // as vagas terminam a execução corrente e saem
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
