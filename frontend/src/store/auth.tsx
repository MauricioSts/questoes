// Contexto de autenticação: login/logout, sessão persistida via refresh token.
// O registro entra direto quando o servidor devolve tokens; sem eles, é só um pedido
// que espera a aprovação do administrador.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "../lib/api";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  metaDiaria: number;
  // Vem do servidor (não é comparação de e-mail no cliente): governa o que aparece
  // de administração. O bloqueio de verdade é o requireAdmin da API.
  admin: boolean;
  // Batalha Pokémon: perfil local criado antes desta data é descartado (reset pedido pelo dono).
  pokeResetAt?: string | null;
}

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** true = conta criada e já logada; false = pedido aguardando aprovação. */
  registrar: (nome: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthResposta {
  user: Usuario;
  accessToken: string;
  refreshToken: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Ao montar, se há refresh token, tenta recuperar a sessão via /auth/me.
  useEffect(() => {
    (async () => {
      if (!tokenStore.refresh) {
        setCarregando(false);
        return;
      }
      try {
        const { user } = await api<{ user: Usuario }>("/auth/me");
        setUsuario(user);
      } catch {
        tokenStore.clear();
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const data = await api<AuthResposta>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    tokenStore.set(data.accessToken, data.refreshToken);
    setUsuario(data.user);
  }

  async function registrar(nome: string, email: string, password: string) {
    const data = await api<Partial<AuthResposta>>("/auth/register", {
      method: "POST",
      body: { nome, email, password },
      auth: false,
    });
    if (!data.user || !data.accessToken || !data.refreshToken) return false;
    tokenStore.set(data.accessToken, data.refreshToken);
    setUsuario(data.user);
    return true;
  }

  async function logout() {
    try {
      if (tokenStore.refresh) {
        await api("/auth/logout", {
          method: "POST",
          body: { refreshToken: tokenStore.refresh },
          auth: false,
        });
      }
    } finally {
      tokenStore.clear();
      setUsuario(null);
    }
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
