// Perfil da conta: quem é, em que plano está, a meta e a data da prova do concurso ativo
// e a troca de senha. Meta e data são as mesmas que a Home edita (/goals/meta e
// /goals/prova), só que reunidas num lugar que a pessoa acha sem caçar o lápis.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crown, LogOut } from "lucide-react";
import { api, tokenStore } from "../lib/api";
import { getConcursoId } from "../lib/concurso";
import { useAuth } from "../store/auth";
import { useAssinatura } from "../store/assinatura";
import { useConcurso } from "../store/concurso";
import { useMeta } from "../store/meta";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { TagPlano } from "../components/TagPlano";

const campo = "mt-1.5 block w-full rounded-xl border border-hair bg-surface px-3.5 py-2.5 text-brand-ink";

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[.16em] text-faint">{titulo}</h2>
      {children}
    </section>
  );
}

function Aviso({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`mt-3 text-sm font-semibold ${ok ? "text-brand-700" : "text-[color:rgb(var(--danger-from))]"}`}
    >
      {texto}
    </p>
  );
}

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

const erroDe = (err: unknown, padrao: string) => (err instanceof Error ? err.message : padrao);

export function Perfil() {
  const navigate = useNavigate();
  const { usuario, atualizarUsuario, logout } = useAuth();
  const { dados } = useAssinatura();
  const { ativo, refresh: recarregarConcursos } = useConcurso();
  const { goal, atualizar: atualizarMeta } = useMeta();

  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [msgNome, setMsgNome] = useState<{ ok: boolean; texto: string } | null>(null);

  const metaAtual = goal?.meta ?? ativo?.metaDiaria ?? 30;
  const dataAtual = (goal?.dataProva ?? ativo?.dataProva ?? "").slice(0, 10);
  const [meta, setMeta] = useState(String(metaAtual));
  const [data, setData] = useState(dataAtual);
  const [msgEstudo, setMsgEstudo] = useState<{ ok: boolean; texto: string } | null>(null);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [msgSenha, setMsgSenha] = useState<{ ok: boolean; texto: string } | null>(null);

  const [ocupado, setOcupado] = useState<"nome" | "estudo" | "senha" | null>(null);

  // Meta e data chegam depois do primeiro desenho (goal e concurso carregam à parte).
  useEffect(() => setMeta(String(metaAtual)), [metaAtual]);
  useEffect(() => setData(dataAtual), [dataAtual]);

  if (!usuario) return null;

  const free = !!dados?.pagamentosAtivos && !dados.premium;
  const limite = dados?.limiteGratisDia ?? 0;
  const usadas = Math.min(dados?.usadasHoje ?? 0, limite);
  const metaNum = Number(meta);
  // No grátis a meta acima do limite nunca fecha: avisa em vez de proibir, porque quem
  // assinar depois não deveria ter de voltar aqui para subir a meta.
  const metaAcimaDoLimite = free && metaNum > limite;

  async function salvarNome(e: FormEvent) {
    e.preventDefault();
    setMsgNome(null);
    setOcupado("nome");
    try {
      const { user } = await api<{ user: typeof usuario }>("/auth/me", { method: "PATCH", body: { nome: nome.trim() } });
      if (user) atualizarUsuario(user);
      setMsgNome({ ok: true, texto: "Nome salvo." });
    } catch (err) {
      setMsgNome({ ok: false, texto: erroDe(err, "Não foi possível salvar o nome") });
    } finally {
      setOcupado(null);
    }
  }

  async function salvarEstudo(e: FormEvent) {
    e.preventDefault();
    setMsgEstudo(null);
    if (!Number.isInteger(metaNum) || metaNum < 1 || metaNum > 500) {
      setMsgEstudo({ ok: false, texto: "A meta precisa ser um número entre 1 e 500." });
      return;
    }
    setOcupado("estudo");
    try {
      const concursoId = getConcursoId() ?? undefined;
      if (metaNum !== metaAtual) {
        await api("/goals/meta", { method: "PATCH", body: { metaDiaria: metaNum, concursoId } });
      }
      if (data && data !== dataAtual) {
        await api("/goals/prova", { method: "PATCH", body: { dataProva: data, concursoId } });
      }
      await Promise.all([atualizarMeta(), recarregarConcursos()]);
      setMsgEstudo({ ok: true, texto: "Meta e data da prova salvas." });
    } catch (err) {
      setMsgEstudo({ ok: false, texto: erroDe(err, "Não foi possível salvar") });
    } finally {
      setOcupado(null);
    }
  }

  async function trocarSenha(e: FormEvent) {
    e.preventDefault();
    setMsgSenha(null);
    if (novaSenha.length < 6) {
      setMsgSenha({ ok: false, texto: "A nova senha precisa de pelo menos 6 caracteres." });
      return;
    }
    setOcupado("senha");
    try {
      await api("/auth/senha", {
        method: "POST",
        body: { senhaAtual, novaSenha, refreshToken: tokenStore.refresh ?? undefined },
      });
      setSenhaAtual("");
      setNovaSenha("");
      setMsgSenha({ ok: true, texto: "Senha trocada. Os outros aparelhos vão precisar entrar de novo." });
    } catch (err) {
      setMsgSenha({ ok: false, texto: erroDe(err, "Não foi possível trocar a senha") });
    } finally {
      setOcupado(null);
    }
  }

  async function sair() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="fadeup mx-auto max-w-2xl space-y-5 pt-4 pb-14">
      <PageHeader rotulo="Perfil" titulo="Sua conta" />

      <section className="card flex items-center gap-4 p-5 sm:p-6">
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-500 font-display text-xl font-extrabold text-[color:var(--onAccent)]">
          {iniciais(usuario.nome) || "?"}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-display text-lg font-extrabold text-brand-ink">{usuario.nome}</p>
            <TagPlano />
          </div>
          <p className="truncate text-sm text-muted">{usuario.email}</p>
          {usuario.criadoEm && (
            <p className="mt-0.5 text-xs text-faint">
              Estudando desde {new Date(usuario.criadoEm).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </section>

      {dados?.pagamentosAtivos && (
        <Bloco titulo="Plano">
          {dados.premium ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {dados.motivo === "assinatura"
                  ? "Você é Premium: questões sem limite e todos os recursos liberados."
                  : "Sua conta tem acesso Premium liberado, sem cobrança."}
              </p>
              {dados.motivo === "assinatura" && (
                <Link to="/assinatura" className="text-sm font-bold text-brand-500 hover:underline">
                  Gerenciar assinatura
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted">Questões hoje</span>
                <span className="font-bold tabular-nums text-brand-ink">
                  {usadas} / {limite}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--track)]">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${limite ? (usadas / limite) * 100 : 0}%` }} />
              </div>
              <p className="mt-3 text-sm text-muted">
                No plano Free você faz até {limite} questões por dia. O Premium tira o limite e libera Batalha, Caderno, Simulado e Estatísticas.
              </p>
              <Link
                to="/assinatura"
                className="botao-primario mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-2.5 font-display text-sm font-extrabold text-[color:var(--onAccent)]"
              >
                <Crown size={16} strokeWidth={2.2} /> Conhecer o Premium
              </Link>
            </>
          )}
        </Bloco>
      )}

      <Bloco titulo={ativo ? `Estudo · ${ativo.nome}` : "Estudo"}>
        <form onSubmit={salvarEstudo} className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-muted">
            Meta diária de questões
            <input type="number" min={1} max={500} value={meta} onChange={(e) => setMeta(e.target.value)} className={campo} />
          </label>
          <label className="block text-sm text-muted">
            Data da prova
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} />
          </label>
          {metaAcimaDoLimite && (
            <p className="text-xs text-faint sm:col-span-2">
              No Free o limite é {limite} questões por dia, então uma meta de {metaNum} só fecha no Premium.
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={ocupado !== null}>
              {ocupado === "estudo" ? "Salvando…" : "Salvar"}
            </Button>
            {msgEstudo && <Aviso {...msgEstudo} />}
          </div>
        </form>
      </Bloco>

      <Bloco titulo="Dados">
        <form onSubmit={salvarNome}>
          <label className="block text-sm text-muted">
            Nome
            <input value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} className={campo} />
          </label>
          <label className="mt-4 block text-sm text-muted">
            E-mail
            <input value={usuario.email} disabled className={`${campo} opacity-60`} />
          </label>
          <Button type="submit" size="sm" className="mt-4" disabled={ocupado !== null || !nome.trim() || nome.trim() === usuario.nome}>
            {ocupado === "nome" ? "Salvando…" : "Salvar nome"}
          </Button>
          {msgNome && <Aviso {...msgNome} />}
        </form>
      </Bloco>

      <Bloco titulo="Senha">
        <form onSubmit={trocarSenha} className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-muted">
            Senha atual
            <input type="password" autoComplete="current-password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} className={campo} />
          </label>
          <label className="block text-sm text-muted">
            Nova senha
            <input type="password" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className={campo} />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={ocupado !== null || !senhaAtual || !novaSenha}>
              {ocupado === "senha" ? "Trocando…" : "Trocar senha"}
            </Button>
            {msgSenha && <Aviso {...msgSenha} />}
          </div>
        </form>
      </Bloco>

      <button
        type="button"
        onClick={sair}
        className="flex items-center gap-2 px-1 text-sm font-semibold text-muted transition hover:text-brand-ink"
      >
        <LogOut size={16} strokeWidth={1.8} /> Sair da conta
      </button>
    </div>
  );
}
