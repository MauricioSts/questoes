// Wrapper mínimo de IndexedDB (sem dependências) para guardar as questões importadas.
// Stores: "questoes" (keyPath id) e "kv" (textos_base e metadados de lotes).
const DB_NAME = "questoes-db";
const DB_VERSION = 1;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("questoes")) db.createObjectStore("questoes", { keyPath: "id" });
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "k" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export function idbGetAllQuestoes<T>(): Promise<T[]> {
  return tx<T[]>("questoes", "readonly", (s) => s.getAll());
}

// Insere várias questões numa transação só.
export function idbPutQuestoes(questoes: unknown[]): Promise<void> {
  return abrir().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction("questoes", "readwrite");
        const store = t.objectStore("questoes");
        for (const q of questoes) store.put(q);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      })
  );
}

export function idbGetKV<T>(k: string): Promise<T | undefined> {
  return tx<{ k: string; v: T } | undefined>("kv", "readonly", (s) => s.get(k)).then((r) => r?.v);
}

export function idbSetKV<T>(k: string, v: T): Promise<void> {
  return tx("kv", "readwrite", (s) => s.put({ k, v })).then(() => undefined);
}

// Limpa tudo (questões + kv).
export function idbLimparTudo(): Promise<void> {
  return abrir().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const t = db.transaction(["questoes", "kv"], "readwrite");
        t.objectStore("questoes").clear();
        t.objectStore("kv").clear();
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      })
  );
}
