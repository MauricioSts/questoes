import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export function Register() {
  const { registrar } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await registrar(nome, email, senha);
      navigate("/", { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao criar conta");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-full place-items-center p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Criar conta</h1>
        </div>
        <label className="block text-sm">
          Nome
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
        </label>
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
          Senha (mín. 6)
          <input
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
        </label>
        {erro && <p className="text-sm text-erro">{erro}</p>}
        <button type="submit" disabled={enviando} className="btn-primary w-full">
          {enviando ? "Criando…" : "Criar conta"}
        </button>
        <p className="text-center text-sm text-slate-400">
          Já tem conta?{" "}
          <Link to="/login" className="text-brand">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
