// Cerimônia do Hall da Fama, como no fim dos jogos: o salão escurece, cada Pokémon do time
// campeão é apresentado sob o holofote (silhueta, nome, nível e grito) e vai para a fileira;
// por último entra o treinador, a tela estoura em branco e cai o confete.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Crown } from "lucide-react";
import { spriteFrente, spriteTreinador } from "../../lib/poke/dex";
import { tocarFanfarra, tocarGrito } from "../../lib/poke/som";

export type MembroHall = { id: number; nivel: number };

const INTRO_MS = 1900;
const POR_POKEMON_MS = 1900;
const TREINADOR_MS = 2300;
const CORES_CONFETE = ["#FFD84A", "#FF5C7A", "#5CC8FF", "#7CF29A", "#FFFFFF", "#C79BFF"];

export function HallDaFama({
  time,
  jogador,
  regiao,
  vezes,
  data,
  nome,
  acoes,
  onFim,
}: {
  time: MembroHall[];
  jogador: string;
  regiao: string;
  vezes: number;
  data?: string;
  nome: (id: number) => string;
  acoes?: ReactNode;
  onFim: () => void;
}) {
  // -1 = abertura; 0..n-1 = Pokémon da vez; n = treinador entrando; n+1 = foto final
  const n = time.length;
  const [passo, setPasso] = useState(-1);
  const fim = passo > n;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const em = (ms: number, f: () => void) => timers.push(setTimeout(f, ms));
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      em(400, () => {
        setPasso(n + 1);
        tocarFanfarra();
      });
    } else {
      let t = INTRO_MS;
      time.forEach((m, k) => {
        em(t, () => setPasso(k));
        em(t + 620, () => tocarGrito(nome(m.id)));
        t += POR_POKEMON_MS;
      });
      em(t, () => {
        setPasso(n);
        tocarFanfarra();
      });
      em(t + TREINADOR_MS, () => setPasso(n + 1));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFim();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFim]);

  const confete = useMemo(
    () =>
      Array.from({ length: 54 }, (_, k) => ({
        x: (k * 37) % 100,
        atraso: ((k * 53) % 30) / 10,
        dur: 2.6 + ((k * 17) % 20) / 10,
        cor: CORES_CONFETE[k % CORES_CONFETE.length],
        giro: (k % 2 ? 1 : -1) * (300 + ((k * 71) % 500)),
        larg: 6 + (k % 3) * 2,
      })),
    [],
  );

  const daVez = passo >= 0 && passo < n ? time[passo] : null;
  const quando = data && !Number.isNaN(Date.parse(data)) ? new Date(data).toLocaleDateString("pt-BR") : null;

  return createPortal(
    <div className={`pk-hall ${fim ? "pk-hall--fim" : ""} ${passo >= n ? "pk-hall--campeao" : ""}`} role="dialog" aria-modal="true" aria-label={`Hall da Fama de ${regiao}`}>
      <div className="pk-hall__fundo" aria-hidden>
        <div className="pk-hall__raios" />
        <div className="pk-hall__holofote pk-hall__holofote--e" />
        <div className="pk-hall__holofote pk-hall__holofote--d" />
        {passo >= n && (
          <div className="pk-hall__confete">
            {confete.map((c, k) => (
              <i key={k} style={{ left: `${c.x}%`, width: c.larg, background: c.cor, animationDelay: `${c.atraso}s`, animationDuration: `${c.dur}s`, "--giro": `${c.giro}deg` } as CSSProperties} />
            ))}
          </div>
        )}
      </div>

      <div className="pk-hall__rolagem">
      <div className="pk-hall__conteudo">
        <header className="pk-hall__topo">
          <p className="pk-hall__selo">
            <Crown size={14} /> Hall da Fama
          </p>
          <p className="pk-hall__liga">Liga Pokémon de {regiao}</p>
        </header>

        <div className="pk-hall__palco">
          <div className="pk-hall__chao" aria-hidden />
          {daVez && (
            <div key={passo} className="pk-hall__destaque">
              <img src={spriteFrente(daVez.id)} alt="" draggable={false} />
              <p className="pk-hall__placa">
                <b>{nome(daVez.id)}</b>
                <span>Nv {daVez.nivel}</span>
              </p>
            </div>
          )}
          {passo >= n && (
            <div className="pk-hall__treinador">
              <span className="pk-hall__aura" aria-hidden />
              <img src={spriteTreinador(jogador)} alt="" draggable={false} />
            </div>
          )}
        </div>

        <ul className="pk-hall__time">
          {time.map((m, k) => (
            <li key={k} className={passo > k ? "pk-hall__membro pk-hall__membro--entrou" : "pk-hall__membro"} style={{ "--k": k } as CSSProperties}>
              <span className="pk-hall__sprite">
                <img src={spriteFrente(m.id)} alt="" draggable={false} />
              </span>
              <b>{nome(m.id)}</b>
              <small>Nv {m.nivel}</small>
            </li>
          ))}
        </ul>

        <div className="pk-hall__final">
          <p className="pk-hall__titulo font-display">Campeão de {regiao}!</p>
          <p className="pk-hall__sub">
            Você e seu time estão no Hall da Fama{quando ? ` desde ${quando}` : ""}.{vezes > 1 ? ` Liga vencida ${vezes} vezes.` : ""}
          </p>
          <div className="pk-hall__acoes">{acoes}</div>
        </div>
      </div>
      </div>

      {!fim && (
        <button onClick={() => setPasso(n + 1)} className="pk-hall__pular">
          Pular
        </button>
      )}
      {passo === n && <div className="pk-hall__flash" aria-hidden />}
    </div>,
    document.body,
  );
}
