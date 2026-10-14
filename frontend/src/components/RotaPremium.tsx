// Telas só de assinante. O servidor já recusa o que importa (requirePremium); isto mostra
// o convite para assinar no lugar de uma tela que só falharia ao carregar.
import { Link, Outlet } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAssinatura } from "../store/assinatura";
import { Carregando } from "./Spinner";

export function AvisoPremium({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="fadeup mx-auto max-w-md pt-10">
      <div className="card p-7 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Lock size={22} strokeWidth={2} />
        </span>
        <h2 className="mt-4 font-display text-xl font-extrabold text-brand-ink">{titulo}</h2>
        <p className="mt-2 text-sm text-muted">{texto}</p>
        <Link
          to="/assinatura"
          className="botao-primario mt-5 inline-block rounded-2xl bg-brand-500 px-6 py-3 font-display font-extrabold text-[color:var(--onAccent)]"
        >
          Ver planos
        </Link>
      </div>
    </div>
  );
}

export function RotaPremium({ recurso }: { recurso: string }) {
  const { premium, carregando } = useAssinatura();
  if (carregando) return <Carregando className="h-full min-h-[50vh]" />;
  if (!premium) {
    return (
      <AvisoPremium
        titulo={`${recurso} é para assinantes`}
        texto="No plano gratuito você estuda e revisa com um limite diário de questões. Assinando, libera tudo e tira o limite."
      />
    );
  }
  return <Outlet />;
}
