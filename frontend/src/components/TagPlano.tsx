// Selo do plano da conta: "Premium" (coroa) ou "Free". Some enquanto a assinatura não
// carregou e quando a cobrança está desligada no servidor (aí não existe plano).
import { Crown } from "lucide-react";
import { useAssinatura } from "../store/assinatura";

export function TagPlano({ className = "" }: { className?: string }) {
  const { dados } = useAssinatura();
  if (!dados?.pagamentosAtivos) return null;
  return dados.premium ? (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[color:var(--onAccent)] ${className}`}
    >
      <Crown size={11} strokeWidth={2.4} /> Premium
    </span>
  ) : (
    <span
      className={`inline-flex items-center rounded-full border border-hair px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted ${className}`}
    >
      Free
    </span>
  );
}
