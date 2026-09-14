// Login: painel de editor à esquerda com o código sendo digitado, formulário à direita.
// O nome do produto é devconcursado — o prompt do terminal é a metade que "dev" e
// "concursado" têm em comum, então a tela de entrada assume isso em vez de ser um
// cartão genérico. O fundo WebGL continua rodando atrás dos dois painéis.
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { Atmosfera } from "../components/Atmosfera";
import "./Login.css";

// O código do painel é tokenizado à mão: assim dá para colorir a sintaxe E revelar
// caractere a caractere, o que um bloco de texto puro não permitiria.
type Trecho = { t: string; c: string };
const K = (t: string): Trecho => ({ t, c: "tk-chave" });
const F = (t: string): Trecho => ({ t, c: "tk-fn" });
const S = (t: string): Trecho => ({ t, c: "tk-str" });
const N = (t: string): Trecho => ({ t, c: "tk-num" });
const C = (t: string): Trecho => ({ t, c: "tk-com" });
const P = (t: string): Trecho => ({ t, c: "tk-pont" });
const T = (t: string): Trecho => ({ t, c: "tk-txt" });

const LINHAS: Trecho[][] = [
  [C("// a aprovação não é sorte, é volume com método")],
  [],
  [K("const "), T("aprovado "), P("= "), K("await "), F("estudar"), P("({")],
  [T("  banca"), P(": "), S('"FGV"'), P(",")],
  [T("  metaDiaria"), P(": "), N("70"), P(",")],
  [T("  ofensiva"), P(": "), N("38"), P(", "), C("// dias seguidos")],
  [T("  revisao"), P(": "), S('"espaçada"'), P(",")],
  [P("});")],
  [],
  [K("while "), P("(!"), T("aprovado"), P(") {")],
  [T("  "), K("await "), F("responder"), P("("), F("proximaQuestao"), P("());")],
  [P("}")],
];

const SAIDA = ["banco sincronizado", "revisões do dia prontas", "sessão pronta para começar"];

function useDigitacao(linhas: Trecho[][], msPorChar: number) {
  const total = useMemo(
    () => linhas.reduce((soma, linha) => soma + linha.reduce((s, tr) => s + tr.t.length, 0) + 1, 0),
    [linhas]
  );
  const reduzido =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const [revelados, setRevelados] = useState(reduzido ? total : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduzido) {
      setRevelados(total);
      return;
    }
    const inicio = performance.now();
    const passo = (agora: number) => {
      const n = Math.min(total, Math.floor((agora - inicio) / msPorChar));
      setRevelados(n);
      if (n < total) rafRef.current = requestAnimationFrame(passo);
    };
    rafRef.current = requestAnimationFrame(passo);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [total, msPorChar, reduzido]);

  return { revelados, total, pronto: revelados >= total };
}

function PainelEditor() {
  const { revelados, pronto } = useDigitacao(LINHAS, 16);

  // Distribui o orçamento de caracteres pelas linhas, na ordem.
  let restante = revelados;

  return (
    <div className="login-editor" aria-hidden>
      <div className="login-editor__barra">
        <span className="login-editor__bolinha" style={{ background: "var(--accent)" }} />
        <span className="login-editor__bolinha" style={{ background: "var(--good)" }} />
        <span className="login-editor__bolinha" style={{ background: "rgb(var(--muted))" }} />
        <span className="login-editor__caminho">~/devconcursado/aprovacao.ts</span>
      </div>

      <pre className="login-editor__codigo">
        {LINHAS.map((linha, i) => {
          const usados = linha.reduce((s, tr) => s + tr.t.length, 0);
          const orcamento = restante;
          const linhaVisivel = orcamento > 0;
          const cursorAqui = orcamento > 0 && orcamento <= usados + 1 && !pronto;
          let gasto = 0;

          const conteudo = linha.map((tr, j) => {
            const disponivel = Math.max(0, Math.min(tr.t.length, orcamento - gasto));
            gasto += tr.t.length;
            if (disponivel === 0) return null;
            return (
              <span key={j} className={tr.c}>
                {tr.t.slice(0, disponivel)}
              </span>
            );
          });

          restante -= usados + 1;

          return (
            <span key={i} className="login-editor__linha">
              <span className="login-editor__num">{linhaVisivel ? i + 1 : ""}</span>
              <span>
                {conteudo}
                {cursorAqui && <span className="login-cursor" />}
                {"\n"}
              </span>
            </span>
          );
        })}
      </pre>

      {pronto && (
        <div className="login-editor__saida">
          {SAIDA.map((linha, i) => (
            <div key={linha} className="login-editor__ok" style={{ animationDelay: `${i * 180}ms` }}>
              <span>✓</span>
              <span>{linha}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// /login e /registro são a mesma cena: o registro só acrescenta o campo de nome e,
// em vez de entrar, termina num aviso de pedido enviado para aprovação.
export function Login({ modo = "entrar" }: { modo?: "entrar" | "registro" }) {
  const { login, registrar } = useAuth();
  const navigate = useNavigate();
  const registro = modo === "registro";
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  // As duas rotas reaproveitam o mesmo componente: trocar de uma para a outra mantém
  // o que foi digitado, mas não o erro nem o aviso da outra tela.
  useEffect(() => {
    setErro(null);
    setPedidoEnviado(false);
  }, [modo]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      if (registro) {
        await registrar(nome.trim(), email, senha);
        setSenha("");
        setPedidoEnviado(true);
      } else {
        await login(email, senha);
        navigate("/", { replace: true });
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : registro ? "Falha ao criar conta" : "Falha ao entrar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center px-4 py-8">
      <Atmosfera />

      <div className="login-cena">
        <PainelEditor />

        <div className="login-form">
          <div>
            <Logo tamanho={34} fonte={19} />
            <h1 className="mt-5 font-display text-[26px] font-extrabold leading-tight text-brand-ink">
              {registro ? "Criar conta" : "Bem-vindo de volta"}
            </h1>
            <p className="mt-1 text-sm text-faint">
              {registro
                ? "A conta é liberada depois que o administrador autorizar o pedido."
                : "Entre para continuar de onde a sua ofensiva parou."}
            </p>
          </div>

          {pedidoEnviado ? (
            <div className="space-y-4">
              <p className="login-ok" role="status">
                <span className="login-erro__marca">✓</span>
                <span>
                  Pedido enviado para {email}. Assim que o administrador autorizar, é só entrar com
                  esse e-mail e a senha que você escolheu.
                </span>
              </p>
              <Link to="/login" className="login-troca">
                Voltar para o login
              </Link>
            </div>
          ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {registro && (
              <label className="login-campo">
                <span className="login-campo__rotulo">nome</span>
                <input
                  type="text"
                  required
                  maxLength={80}
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="login-campo__entrada"
                />
              </label>
            )}

            <label className="login-campo">
              <span className="login-campo__rotulo">email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="login-campo__entrada"
              />
            </label>

            <label className="login-campo">
              <span className="login-campo__rotulo">senha</span>
              <input
                type="password"
                required
                minLength={registro ? 6 : undefined}
                autoComplete={registro ? "new-password" : "current-password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={registro ? "mínimo 6 caracteres" : "••••••••"}
                className="login-campo__entrada"
              />
            </label>

            {erro && (
              <p className="login-erro" role="alert">
                <span className="login-erro__marca">✕</span>
                <span>{erro}</span>
              </p>
            )}

            <Button type="submit" disabled={enviando} fullWidth size="lg">
              {registro
                ? enviando ? "Enviando pedido…" : "Pedir conta"
                : enviando ? "Autenticando…" : "Entrar"}
            </Button>

            <p className="text-center text-sm text-faint">
              {registro ? "Já tem conta? " : "Não tem conta? "}
              <Link to={registro ? "/login" : "/registro"} className="login-troca">
                {registro ? "Entrar" : "Criar conta"}
              </Link>
            </p>
          </form>
          )}

          <p className="text-center text-[11px] uppercase tracking-[.14em] text-faint">
            Banco de questões · estudo por repetição espaçada
          </p>
        </div>
      </div>
    </div>
  );
}
