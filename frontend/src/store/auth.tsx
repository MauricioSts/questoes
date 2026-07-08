// Contexto de autenticação: login/registro/logout, sessão persistida via refresh token.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "../lib/api";

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  metaDiaria: number;
}

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  login: (email: string, password: string) => Promise<void>;
  registrar: (nome: string, email: string, password: string) => Promise<void>;
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
    const data = await api<AuthResposta>("/auth/register", {
      method: "POST",
      body: { nome, email, password },
      auth: false,
    });
    tokenStore.set(data.accessToken, data.refreshToken);
    setUsuario(data.user);
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
