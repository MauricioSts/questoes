import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../store/auth";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(email, senha);
      navigate("/", { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Logo + Título */}
        <div className="text-center space-y-3 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center mx-auto">
            <Shield size={32} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-brand-ink">Entrar</h1>
          <p className="text-sm text-faint">Banco de Questões — Dataprev 2026</p>
        </div>

        {/* Formulário */}
        <Card className="p-8 space-y-5">
          <form onSubmit={onSubmit} className="space-y-5">
            {/* E-mail */}
            <div className="space-y-2">
              <label className="filter-label">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="filter-select"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label className="filter-label">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="filter-select"
              />
            </div>

            {/* Erro */}
            {erro && (
              <div className="rounded-lg bg-danger-soft border border-danger-from p-4 text-sm text-danger-from font-medium">
                {erro}
              </div>
            )}

            {/* Botão */}
            <Button type="submit" disabled={enviando} fullWidth size="lg">
              {enviando ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Card>

        {/* Link de registro */}
        <p className="text-center text-sm text-faint">
          Não tem conta?{" "}
          <Link to="/registro" className="font-semibold text-brand-500 hover:text-brand-600 transition">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
