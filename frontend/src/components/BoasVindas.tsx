// Recado da entrada, em até duas partes:
// 1. Validar o e-mail: aparece a cada sessão do navegador até a pessoa validar (ou
//    nunca, se o código não tem como chegar nesse e-mail: `emailValidavel`).
// 2. Como criar questões: aparece uma vez por conta neste aparelho. Depois disso a
//    explicação continua em /como-funciona.
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FileText, ListPlus, Braces, MailCheck, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth, type Usuario } from "../store/auth";
import { Button } from "./Button";

type Parte = "email" | "questoes";

const chaveEmail = (id: string) => `q_validar_email_${id}`; // sessionStorage: "depois" nesta sessão
const chaveQuestoes = (id: string) => `q_tutorial_questoes_${id}`; // localStorage: já viu

function ler(storage: () => Storage, chave: string) {
  try {
    return storage().getItem(chave);
  } catch {
    return null;
  }
}
function gravar(storage: () => Storage, chave: string) {
  try {
    storage().setItem(chave, "1");
  } catch {
    /* sem storage (aba anônima): o recado só volta na próxima entrada */
  }
}

function partesPendentes(u: Usuario): Parte[] {
  const partes: Parte[] = [];
  if (u.emailValidavel && !u.emailVerificado && !ler(() => sessionStorage, chaveEmail(u.id))) partes.push("email");
  if (!ler(() => localStorage, chaveQuestoes(u.id))) partes.push("questoes");
  return partes;
}

export function BoasVindas() {
  const { usuario } = useAuth();
  const [partes, setPartes] = useState<Parte[] | null>(null);

  // Calcula uma vez por conta: validar o e-mail no meio do recado não deve reabri-lo.
  const id = usuario?.id;
  useEffect(() => {
    setPartes(usuario ? partesPendentes(usuario) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!usuario || !partes || partes.length === 0) return null;
  const atual = partes[0]!;
  const avancar = () => setPartes(partes.slice(1));

  function fecharEmail() {
    gravar(() => sessionStorage, chaveEmail(usuario!.id));
    avancar();
  }
  function fecharQuestoes() {
    gravar(() => localStorage, chaveQuestoes(usuario!.id));
    avancar();
  }
  const fechar = atual === "email" ? fecharEmail : fecharQuestoes;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4"
      onKeyDown={(e) => e.key === "Escape" && fechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="boas-vindas-titulo"
        className="card fadeup relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 sm:p-7"
        // Opaco: a classe card é translúcida e o texto da tela de trás vazava pelo recado.
        style={{ background: "rgb(var(--surface))", backdropFilter: "none" }}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-faint transition hover:text-brand-ink"
        >
          <X size={18} />
        </button>
        {partes.length > 1 && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-faint">
            1 de {partes.length}
          </p>
        )}
        {atual === "email" ? (
          <ValidarEmail usuario={usuario} aoTerminar={avancar} aoAdiar={fecharEmail} />
        ) : (
          <ComoCriarQuestoes aoFechar={fecharQuestoes} />
        )}
      </div>
    </div>,
    document.body
  );
}

function ValidarEmail({
  usuario,
  aoTerminar,
  aoAdiar,
}: {
  usuario: Usuario;
  aoTerminar: () => void;
  aoAdiar: () => void;
}) {
  const { atualizarUsuario } = useAuth();
  const [desafio, setDesafio] = useState<{ desafio: string; email: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [duasEtapas, setDuasEtapas] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  async function pedir() {
    setErro(null);
    setOcupado(true);
    try {
      setDesafio(await api<{ desafio: string; email: string }>("/auth/email/codigo", { method: "POST" }));
      setCodigo("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível mandar o código");
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    if (!desafio) return;
    setErro(null);
    setOcupado(true);
    try {
      const { user } = await api<{ user: Usuario }>("/auth/email/confirmar", {
        method: "POST",
        body: { desafio: desafio.desafio, codigo, doisFatores: duasEtapas },
      });
      atualizarUsuario(user);
      setPronto(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível confirmar");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div>
      <span
        className="grid h-12 w-12 place-items-center rounded-2xl"
        style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
      >
        <MailCheck size={22} strokeWidth={1.9} />
      </span>
      <h2 id="boas-vindas-titulo" className="mt-4 font-display text-xl font-extrabold text-brand-ink">
        {pronto ? "E-mail validado" : "Valide o seu e-mail"}
      </h2>

      {pronto ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Pronto: {usuario.email} está confirmado.
            {duasEtapas && " A partir de agora, ao entrar com a senha, pedimos também um código mandado para ele."}{" "}
            Você muda isso quando quiser em Perfil.
          </p>
          <Button className="mt-5" onClick={aoTerminar}>
            Continuar
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Confirmar que <strong className="text-brand-ink">{usuario.email}</strong> é seu leva 30 segundos: mandamos
            um código de 6 dígitos e você digita aqui. Com o e-mail validado dá para ligar a verificação em duas
            etapas, e quem descobrir a sua senha não entra sem acesso ao seu e-mail.
          </p>

          {desafio ? (
            <form onSubmit={confirmar} className="mt-5">
              <label className="block text-sm text-muted">
                Código que chegou em {desafio.email}
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="mt-1.5 block w-full max-w-[12rem] rounded-xl border border-hair bg-surface px-3.5 py-2.5 tracking-[.4em] text-brand-ink"
                />
              </label>
              <label className="mt-4 flex items-start gap-2.5 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={duasEtapas}
                  onChange={(e) => setDuasEtapas(e.target.checked)}
                  className="mt-0.5 accent-[color:var(--accent)]"
                />
                Pedir um código também quando eu entrar (verificação em duas etapas, recomendado)
              </label>
              <p className="mt-2 text-xs text-faint">Não chegou? Olhe o spam ou peça outro código em um minuto.</p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Button type="submit" disabled={ocupado || codigo.length !== 6}>
                  {ocupado ? "Conferindo…" : "Validar"}
                </Button>
                <button type="button" onClick={pedir} disabled={ocupado} className="text-sm font-semibold text-muted hover:text-brand-ink">
                  Mandar outro código
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button onClick={pedir} disabled={ocupado}>
                {ocupado ? "Mandando…" : "Mandar código"}
              </Button>
              <button type="button" onClick={aoAdiar} className="text-sm font-semibold text-muted hover:text-brand-ink">
                Agora não
              </button>
            </div>
          )}
          {erro && (
            <p role="alert" className="mt-3 text-sm font-semibold text-[color:rgb(var(--danger-from))]">
              {erro}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const JEITOS = [
  {
    icone: FileText,
    nome: "PDF com IA",
    texto:
      "Envie o PDF de uma prova e a IA separa as questões. Você revisa, marca o gabarito das que vierem sem e adiciona. Precisa ser PDF de texto (não foto). O Free lê algumas páginas por mês; o Premium, bem mais.",
  },
  {
    icone: ListPlus,
    nome: "Uma a uma",
    texto: "Formulário com matéria, enunciado, alternativas de A a E e o gabarito. Bom para questões que você mesmo escreve.",
  },
  {
    icone: Braces,
    nome: "JSON",
    texto: "Cole uma lista pronta, até 200 questões por vez. A tela mostra o formato de exemplo.",
  },
];

function ComoCriarQuestoes({ aoFechar }: { aoFechar: () => void }) {
  const navigate = useNavigate();
  return (
    <div>
      <h2 id="boas-vindas-titulo" className="font-display text-xl font-extrabold text-brand-ink">
        Monte as suas próprias questões
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Além das trilhas prontas, você pode criar a sua: um banco de questões do seu concurso, da escola ou do que
        estiver estudando. Funciona assim:
      </p>
      <ol className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
        <li>
          <strong className="text-brand-ink">1.</strong> Vá em <strong className="text-brand-ink">Trilhas</strong> e
          toque em <strong className="text-brand-ink">Criar minha trilha</strong>.
        </li>
        <li>
          <strong className="text-brand-ink">2.</strong> Dê um nome e escolha o tipo. No Free a trilha é pública; no
          Premium você cria quantas quiser, públicas ou privadas.
        </li>
        <li>
          <strong className="text-brand-ink">3.</strong> Em <strong className="text-brand-ink">Questões</strong>,
          adicione de um destes jeitos:
        </li>
      </ol>
      <div className="mt-3 space-y-2.5">
        {JEITOS.map(({ icone: Icone, nome, texto }) => (
          <div key={nome} className="flex gap-3 rounded-xl border border-hair p-3">
            <span
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg"
              style={{ background: "var(--accentBg)", color: "var(--accentText)" }}
            >
              <Icone size={17} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-brand-ink">{nome}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{texto}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-faint">
        Trilha pública aparece para outras pessoas quando chega a 10 questões. Cada envio vira um lote, e excluir o
        lote apaga as questões dele. Esta explicação fica em Como funciona.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button
          onClick={() => {
            aoFechar();
            navigate("/trilhas");
          }}
        >
          Criar minha trilha
        </Button>
        <button type="button" onClick={aoFechar} className="text-sm font-semibold text-muted hover:text-brand-ink">
          Agora não
        </button>
      </div>
    </div>
  );
}
