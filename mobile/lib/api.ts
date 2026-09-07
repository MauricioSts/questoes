// Cliente HTTP: injeta o access token, faz refresh automático em 401 e reenvia a requisição.
//
// Porte de frontend/src/lib/api.ts. Duas diferenças, ambas obrigatórias e listadas em
// §9.1 do SDD: a origem da URL base e o armazenamento dos tokens (Keychain/Keystore em
// vez de localStorage). O resto — escopo de concurso, refresh sem corrida, ApiError — é
// idêntico ao web.
import { getConcursoId } from "./concurso";
import { CHAVE_ACCESS, CHAVE_REFRESH, segredos } from "./segredos";

// DIVERGE DO WEB: Metro não entende `import.meta`.
//
// O padrão é a API de produção, e não localhost, porque `.env` é ignorado pelo git —
// um clone novo não teria URL nenhuma e falharia sem dizer por quê. Para apontar num
// backend local, crie `mobile/.env` com EXPO_PUBLIC_API_URL=http://10.0.2.2:3333
// (no emulador Android, 10.0.2.2 é o host; localhost seria o próprio emulador).
const BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://questoesapi.mauriciosts.com";

// Multi-concurso: leituras dependentes de concurso ganham ?concursoId= automaticamente,
// e escritas de resposta recebem concursoId no corpo, sem tocar cada página.
const SCOPED_GET = ["/answers", "/goals/today", "/questoes", "/caderno", "/postits", "/stats"];
const SCOPED_ANSWER_POST = ["/answers", "/answers/batch"];

function scopePath(path: string, method: string): string {
  const cid = getConcursoId();
  if (!cid) return path;
  const [pathname] = path.split("#");
  const base = pathname.split("?")[0];
  if (method === "GET" && SCOPED_GET.some((p) => base === p || base.startsWith(p + "/"))) {
    if (/[?&]concursoId=/.test(path)) return path;
    return path + (path.includes("?") ? "&" : "?") + "concursoId=" + encodeURIComponent(cid);
  }
  return path;
}

function scopeBody(path: string, method: string, body: unknown): unknown {
  const cid = getConcursoId();
  if (!cid || method !== "POST") return body;
  const base = path.split("?")[0];
  if (!SCOPED_ANSWER_POST.includes(base)) return body;
  // /answers recebe um objeto; /answers/batch recebe um array de objetos.
  if (Array.isArray(body)) {
    return body.map((b) => (b && typeof b === "object" && !("concursoId" in b) ? { ...b, concursoId: cid } : b));
  }
  if (body && typeof body === "object" && !("concursoId" in body)) {
    return { ...(body as object), concursoId: cid };
  }
  return body;
}

// Leituras síncronas vindas do espelho em memória (SDD §6.1); a gravação no
// Keychain/Keystore acontece em segundo plano dentro do adapter.
export const tokenStore = {
  get access() {
    return segredos.get(CHAVE_ACCESS);
  },
  get refresh() {
    return segredos.get(CHAVE_REFRESH);
  },
  set(access: string, refresh: string) {
    segredos.set(CHAVE_ACCESS, access);
    segredos.set(CHAVE_REFRESH, refresh);
  },
  clear() {
    segredos.remove(CHAVE_ACCESS);
    segredos.remove(CHAVE_REFRESH);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

// Tenta renovar o access token usando o refresh (evita corridas com um promise único).
async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    })
      .then(async (res) => {
        if (!res.ok) {
          tokenStore.clear();
          return false;
        }
        const data = await res.json();
        tokenStore.set(data.accessToken, data.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // default true
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;

  const scopedPath = scopePath(path, method);
  const scopedBody = scopeBody(path, method, body);

  const doFetch = () => {
    const headers: Record<string, string> = {};
    if (scopedBody !== undefined) headers["Content-Type"] = "application/json";
    if (auth && tokenStore.access) headers["Authorization"] = `Bearer ${tokenStore.access}`;
    return fetch(`${BASE}${scopedPath}`, {
      method,
      headers,
      body: scopedBody !== undefined ? JSON.stringify(scopedBody) : undefined,
    });
  };

  let res = await doFetch();

  // 401 com auth: tenta refresh 1x e repete.
  if (res.status === 401 && auth) {
    const ok = await tryRefresh();
    if (ok) res = await doFetch();
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string })?.error ?? "Erro na requisição", data);
  }
  return data as T;
}
