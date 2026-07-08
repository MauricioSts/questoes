// Cliente HTTP: injeta o access token, faz refresh automático em 401 e reenvia a requisição.
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

const ACCESS_KEY = "q_access";
const REFRESH_KEY = "q_refresh";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
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

  const doFetch = () => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && tokenStore.access) headers["Authorization"] = `Bearer ${tokenStore.access}`;
    return fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
