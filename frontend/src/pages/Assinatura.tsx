// Planos e estado da assinatura. O pagamento acontece no Mercado Pago: aqui só se escolhe
// o plano, e na volta a tela pede ao servidor que releia a assinatura.
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";
import { useAssinatura, type PlanoId } from "../store/assinatura";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { Carregando } from "../components/Spinner";

const VANTAGENS = [
  "Questões sem limite diário",
  "Caderno, inclusive dentro da questão",
  "Simulado cronometrado",
  "Estatísticas por matéria e assunto",
];

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

export function Assinatura() {
  const { usuario } = useAuth();
  const { dados, carregando, recarregar } = useAssinatura();
  const [emailPagador, setEmailPagador] = useState(usuario?.email ?? "");
  const [ocupado, setOcupado] = useState<PlanoId | "cancelar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // O Mercado Pago devolve a pessoa para cá com ?preapproval_id=. O webhook pode ainda
  // não ter chegado, então o servidor relê a assinatura antes de mostrarmos o estado.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("preapproval_id")) return;
    void api("/assinatura/sincronizar", { method: "POST" })
      .catch(() => undefined)
      .then(recarregar);
  }, [recarregar]);

  async function assinar(plano: PlanoId) {
    setErro(null);
    setOcupado(plano);
    try {
      const { url } = await api<{ url: string }>("/assinatura/checkout", {
        method: "POST",
        body: { plano, emailPagador: emailPagador.trim() || undefined },
      });
      window.location.href = url;
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível iniciar o pagamento");
      setOcupado(null);
    }
  }

  async function cancelar() {
    if (!window.confirm("Cancelar a assinatura? As cobranças param e o acesso segue até o fim do período já pago.")) return;
    setErro(null);
    setOcupado("cancelar");
    try {
      await api("/assinatura/cancelar", { method: "POST" });
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível cancelar");
    } finally {
      setOcupado(null);
    }
  }

  if (carregando || !dados) return <Carregando className="h-full min-h-[50vh]" />;

  const a = dados.assinatura;
  const ativa = a?.status === "authorized";
  const mensal = dados.planos.find((p) => p.id === "mensal");

  return (
    <div className="fadeup mx-auto max-w-3xl pt-4 pb-14">
      <PageHeader
        rotulo="Assinatura"
        titulo={dados.premium ? "Acesso completo" : "Plano gratuito"}
        subtitulo={
          dados.premium
            ? undefined
            : `Hoje você usou ${Math.min(dados.usadasHoje, dados.limiteGratisDia)} de ${dados.limiteGratisDia} questões do plano gratuito.`
        }
      />

      {dados.motivo === "admin" || dados.motivo === "cortesia" || dados.motivo === "desligado" ? (
        <div className="card p-6 text-sm text-muted">
          {dados.motivo === "desligado"
            ? "A assinatura ainda não está aberta: por enquanto tudo está liberado para todo mundo."
            : "Sua conta tem acesso completo liberado, sem cobrança."}
        </div>
      ) : (
        <>
          {a && (ativa || dados.premium || a.status === "pending") && (
            <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-sm text-muted">
                {ativa && (
                  <>
                    Plano <strong className="text-brand-ink">{a.plano}</strong> ativo
                    {a.proximaCobranca ? `. Próxima cobrança em ${dia(a.proximaCobranca)}.` : "."}
                  </>
                )}
                {!ativa && dados.premium && a.validoAte && (
                  <>Assinatura cancelada. Seu acesso completo vai até {dia(a.validoAte)}.</>
                )}
                {!ativa && !dados.premium && a.status === "pending" && (
                  <>Há um pagamento iniciado e não concluído. Escolha um plano abaixo para tentar de novo.</>
                )}
              </p>
              {ativa && (
                <Button variant="outline" size="sm" onClick={cancelar} disabled={ocupado !== null}>
                  {ocupado === "cancelar" ? "Cancelando…" : "Cancelar assinatura"}
                </Button>
              )}
            </div>
          )}

          {!ativa && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {dados.planos.map((p) => {
                  const economia =
                    mensal && p.meses > 1 ? Math.round((1 - p.valor / (mensal.valor * p.meses)) * 100) : 0;
                  return (
                    <div key={p.id} className="card flex flex-col p-6">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-display text-lg font-extrabold text-brand-ink">{p.nome}</h2>
                        {economia > 0 && (
                          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                            {economia}% de desconto
                          </span>
                        )}
                      </div>
                      <p className="mt-3 font-display text-3xl font-extrabold text-brand-ink">
                        {reais(p.valor)}
                        <span className="text-sm font-semibold text-faint"> / {p.meses === 1 ? "mês" : "ano"}</span>
                      </p>
                      <p className="mt-1 text-xs text-faint">
                        {p.meses > 1
                          ? `Equivale a ${reais(p.valor / p.meses)} por mês. Renova todo ano.`
                          : "Renova todo mês. Cancele quando quiser."}
                      </p>
                      <ul className="my-5 flex-1 space-y-2 text-sm text-muted">
                        {VANTAGENS.map((v) => (
                          <li key={v} className="flex items-start gap-2">
                            <Check size={16} strokeWidth={2.4} className="mt-0.5 flex-shrink-0 text-brand-500" />
                            <span>{v}</span>
                          </li>
                        ))}
                      </ul>
                      <Button fullWidth onClick={() => assinar(p.id)} disabled={ocupado !== null}>
                        {ocupado === p.id ? "Abrindo o Mercado Pago…" : `Assinar ${p.nome.toLowerCase()}`}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <label className="mt-5 block text-sm text-muted">
                E-mail da sua conta Mercado Pago
                <input
                  type="email"
                  value={emailPagador}
                  onChange={(e) => setEmailPagador(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-hair bg-surface px-3.5 py-2.5 text-brand-ink"
                />
                <span className="mt-1.5 block text-xs text-faint">
                  O pagamento é com cartão, feito no Mercado Pago. Se a conta de lá usa outro e-mail, troque aqui.
                </span>
              </label>
            </>
          )}
        </>
      )}

      {erro && (
        <p className="mt-4 text-sm font-semibold text-[color:rgb(var(--danger-from))]" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
