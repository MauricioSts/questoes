// Banco local do app: cache do acervo e fila de respostas offline.
//
// Substitui o IndexedDB do web (lib/idb.ts). Duas escolhas que valem registro:
//
// 1. `openDatabaseSync` com métodos síncronos. A fila é lida durante a renderização
//    (`pendentes()`), e o SDD §6.1 previa um espelho em memória para isso. Com a API
//    síncrona do expo-sqlite o espelho é desnecessário.
// 2. O cache é ESCOPADO POR CONCURSO, diferente do web. No web, carregar outro concurso
//    substitui o cache inteiro, então só o último fica disponível offline. Num app de
//    celular isso é uma regressão real de uso, e o custo de guardar por concurso é uma
//    coluna a mais.
import * as SQLite from "expo-sqlite";

const bd = SQLite.openDatabaseSync("devconcursado.db");

bd.execSync(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS questoes (
    concursoId TEXT NOT NULL,
    id         INTEGER NOT NULL,
    dados      TEXT NOT NULL,
    PRIMARY KEY (concursoId, id)
  );

  CREATE TABLE IF NOT EXISTS kv (
    concursoId TEXT NOT NULL,
    k          TEXT NOT NULL,
    v          TEXT NOT NULL,
    PRIMARY KEY (concursoId, k)
  );

  -- clientId é a chave: é o mesmo campo que o backend usa para deduplicar reenvios
  -- (Answer.clientId @unique), então a fila não consegue guardar duplicata nem local.
  CREATE TABLE IF NOT EXISTS fila_respostas (
    clientId TEXT PRIMARY KEY,
    dados    TEXT NOT NULL,
    criadoEm INTEGER NOT NULL
  );
`);

// Concurso nulo (conta sem concurso) vira uma chave própria em vez de quebrar o NOT NULL.
const chave = (concursoId: string | null) => concursoId ?? "__sem_concurso__";

/* ------------------------------------------------------------------ acervo */

export function lerQuestoesCache<T>(concursoId: string | null): T[] {
  const linhas = bd.getAllSync<{ dados: string }>(
    "SELECT dados FROM questoes WHERE concursoId = ?",
    chave(concursoId)
  );
  return linhas.map((l) => JSON.parse(l.dados) as T);
}

export function lerKV<T>(concursoId: string | null, k: string): T | undefined {
  const linha = bd.getFirstSync<{ v: string }>(
    "SELECT v FROM kv WHERE concursoId = ? AND k = ?",
    chave(concursoId),
    k
  );
  return linha ? (JSON.parse(linha.v) as T) : undefined;
}

/** Substitui o acervo daquele concurso inteiro, numa transação só. */
export function gravarAcervo(
  concursoId: string | null,
  questoes: { id: number }[],
  kvs: Record<string, unknown>
): void {
  const c = chave(concursoId);
  bd.withTransactionSync(() => {
    bd.runSync("DELETE FROM questoes WHERE concursoId = ?", c);
    bd.runSync("DELETE FROM kv WHERE concursoId = ?", c);
    for (const q of questoes) {
      bd.runSync("INSERT INTO questoes (concursoId, id, dados) VALUES (?, ?, ?)", c, q.id, JSON.stringify(q));
    }
    for (const [k, v] of Object.entries(kvs)) {
      bd.runSync("INSERT INTO kv (concursoId, k, v) VALUES (?, ?, ?)", c, k, JSON.stringify(v));
    }
  });
}

export function limparAcervo(concursoId: string | null): void {
  const c = chave(concursoId);
  bd.withTransactionSync(() => {
    bd.runSync("DELETE FROM questoes WHERE concursoId = ?", c);
    bd.runSync("DELETE FROM kv WHERE concursoId = ?", c);
  });
}

/* ------------------------------------------------- fila offline de respostas */

export function filaLer<T>(): T[] {
  const linhas = bd.getAllSync<{ dados: string }>(
    "SELECT dados FROM fila_respostas ORDER BY criadoEm ASC"
  );
  return linhas.map((l) => JSON.parse(l.dados) as T);
}

export function filaContar(): number {
  const r = bd.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM fila_respostas");
  return r?.n ?? 0;
}

export function filaEnfileirar(respostas: { clientId: string }[]): void {
  const agora = Date.now();
  bd.withTransactionSync(() => {
    for (const r of respostas) {
      bd.runSync(
        "INSERT OR REPLACE INTO fila_respostas (clientId, dados, criadoEm) VALUES (?, ?, ?)",
        r.clientId,
        JSON.stringify(r),
        agora
      );
    }
  });
}

/**
 * Remove só o que foi confirmado, por clientId.
 *
 * Apagar a fila inteira depois do envio perderia respostas gravadas enquanto a
 * requisição estava em voo — cenário comum, já que o usuário continua respondendo.
 */
export function filaRemover(clientIds: string[]): void {
  if (clientIds.length === 0) return;
  bd.withTransactionSync(() => {
    for (const id of clientIds) {
      bd.runSync("DELETE FROM fila_respostas WHERE clientId = ?", id);
    }
  });
}
