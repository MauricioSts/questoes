// Contexto de autenticação: login/logout, sessão recuperada pelo refresh token.
//
// Porte de frontend/src/store/auth.tsx. A lógica é a mesma; o que muda é onde os
// tokens moram (Keychain/Keystore via lib/segredos.ts) e o registro, que passa a
// existir porque o app vai para as lojas (SDD §1.2).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokenStore } from "@/lib/api";

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

  // Ao montar, se há refresh token guardado, tenta recuperar a sessão.
  // O espelho de segredos já foi hidratado antes desta árvore renderizar (§6.1),
  // então tokenStore.refresh pode ser lido de forma síncrona aqui.
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

export function useAuth(): AuthContextValue {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}
