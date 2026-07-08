import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

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
    <div className="grid min-h-full place-items-center p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="text-sm text-slate-400">Banco de Questões — Dataprev</p>
        </div>
        <label className="block text-sm">
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
        </label>
        <label className="block text-sm">
          Senha
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
        </label>
        {erro && <p className="text-sm text-erro">{erro}</p>}
        <button type="submit" disabled={enviando} className="btn-primary w-full">
          {enviando ? "Entrando…" : "Entrar"}
        </button>
        <p className="text-center text-sm text-slate-400">
          Não tem conta?{" "}
          <Link to="/registro" className="text-brand">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  );
}
