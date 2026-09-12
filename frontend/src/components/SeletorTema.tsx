// Troca de tema. Com três temas o botão de alternar deixou de dizer para onde vai, então
// a barra lateral mostra os três lado a lado (o ativo com nome) e o topo do celular,
// sem espaço, gira para o próximo e diz qual é no rótulo.
import { Bird, Cpu, Mountain, type LucideIcon } from "lucide-react";
import { TEMAS, nomeDoTema, proximoTema, useTheme, type Tema } from "../store/theme";

const ICONES: Record<Tema, LucideIcon> = { fantasy: Mountain, rose: Bird, cyberpunk: Cpu };

export function IconeTema({ tema, size = 16 }: { tema: Tema; size?: number }) {
  const Icone = ICONES[tema];
  return <Icone size={size} strokeWidth={1.8} />;
}

/** Barra lateral (desktop): três segmentos, o ativo aberto com o nome. */
export function SeletorTema() {
  const { tema, definir } = useTheme();
  return (
    <div
      role="group"
      aria-label="Tema"
      className="mb-2 flex gap-1 rounded-xl border p-1"
      style={{ borderColor: "var(--accentBd)", background: "var(--accentBg)" }}
    >
      {TEMAS.map((t) => {
        const ativo = t.id === tema;
        return (
          <button
            key={t.id}
            onClick={() => definir(t.id)}
            aria-pressed={ativo}
            aria-label={`Modo ${t.nome}`}
            title={`Modo ${t.nome}`}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
              ativo ? "flex-[2.4]" : "flex-1 text-muted hover:text-brand-ink"
            }`}
            style={ativo ? { background: "var(--accent)", color: "var(--onAccent)" } : undefined}
          >
            <IconeTema tema={t.id} size={15} />
            {ativo && <span className="truncate">{t.nome}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Topo (celular): um botão que gira entre os temas. */
export function BotaoProximoTema({ className = "" }: { className?: string }) {
  const { tema, alternar } = useTheme();
  const proximo = proximoTema(tema);
  return (
    <button
      onClick={alternar}
      className={className}
      aria-label={`Tema ${nomeDoTema(tema)}. Mudar para Modo ${nomeDoTema(proximo)}`}
      title={`Modo ${nomeDoTema(tema)} (tocar: ${nomeDoTema(proximo)})`}
    >
      <IconeTema tema={tema} size={18} />
    </button>
  );
}
