// Cobrinha do heatmap, na linha da "snake" que come o gráfico de contribuições do GitHub.
// Anda célula a célula pela grade (só em linha reta, como no jogo), vai até o dia com
// atividade mais próximo, come e segue para o próximo. O dia comido pisca na cor da
// mordida, apaga e cresce de volta em alguns segundos — é enfeite, o dado não some.
// Quando não sobra nada para comer ela sai pela direita e entra de novo pela esquerda.
// Sem nenhum dia com atividade (conta nova), passeia por pontos aleatórios.
//
// Aparência inteira no CSS (.cobra*, index.css), pelas variáveis --cobra* de cada tema:
// pérolas de luar no Fantasy, bala de goma no Rose, pixel neon com sinal ruim no
// Cyberpunk. Some com prefers-reduced-motion; para fora da tela e com a aba escondida.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type Ponto = { c: number; r: number };
type Mordida = { id: number; c: number; r: number; t: number };

const GOMOS = 6;
const PASSO_MS = 130;
const RECRESCE_MS = 7000; // igual à duração da animação .cobra__mordida
const COLUNAS = 53;
const LINHAS = 7;

const chave = (p: Ponto) => `${p.c},${p.r}`;
const igual = (a: Ponto, b: Ponto) => a.c === b.c && a.r === b.r;

function usaMovimentoReduzido() {
  const [reduzido, setReduzido] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const f = () => setReduzido(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return reduzido;
}

// Vizinho mais próximo a partir de `de`: rota curta o bastante, e barata (poucas centenas
// de dias no máximo).
function ordenar(alvos: Ponto[], de: Ponto): Ponto[] {
  const resto = alvos.slice();
  const rota: Ponto[] = [];
  let atual = de;
  while (resto.length) {
    let melhor = 0;
    let dist = Infinity;
    for (let i = 0; i < resto.length; i++) {
      const d = Math.abs(resto[i].c - atual.c) + Math.abs(resto[i].r - atual.r);
      if (d < dist) {
        dist = d;
        melhor = i;
      }
    }
    atual = resto.splice(melhor, 1)[0];
    rota.push(atual);
  }
  return rota;
}

function corpoNaEntrada(): Ponto[] {
  const r = Math.floor(Math.random() * LINHAS);
  return Array.from({ length: GOMOS }, (_, i) => ({ c: -1 - i, r }));
}

export function Cobra({
  celulas,
  celula,
  espaco,
}: {
  /** [semana][dia]: nível de atividade (0 = nada) e se o dia ainda não chegou. */
  celulas: { nivel: number; futuro: boolean }[][];
  celula: number;
  espaco: number;
}) {
  const reduzido = usaMovimentoReduzido();
  const passo = celula + espaco;
  const raizRef = useRef<HTMLDivElement>(null);

  const { comida, livres } = useMemo(() => {
    const comida: Ponto[] = [];
    const livres: Ponto[] = [];
    celulas.forEach((col, c) =>
      col.forEach((cel, r) => {
        if (cel.futuro) return;
        livres.push({ c, r });
        if (cel.nivel > 0) comida.push({ c, r });
      }),
    );
    return { comida, livres };
  }, [celulas]);

  const sim = useRef({
    corpo: corpoNaEntrada(),
    rota: [] as Ponto[],
    pendentes: new Set<string>(),
    comendo: false, // a rota atual é de comida (e não passeio)
    volta: 0,
    mordidas: [] as Mordida[],
    seq: 0,
  });
  const [quadro, setQuadro] = useState(() => ({ corpo: sim.current.corpo, volta: 0, mordidas: [] as Mordida[] }));

  // Monta a rota da volta a partir de onde a cabeça está.
  const planejar = useRef<() => void>(() => {});
  planejar.current = () => {
    const s = sim.current;
    const cabeca = s.corpo[0];
    if (comida.length) {
      s.rota = ordenar(comida, { c: Math.max(0, cabeca.c), r: cabeca.r });
      s.pendentes = new Set(comida.map(chave));
      s.comendo = true;
    } else {
      const passeio = Array.from({ length: 10 }, () => livres[Math.floor(Math.random() * livres.length)]).filter(Boolean);
      s.rota = passeio;
      s.pendentes = new Set();
      s.comendo = false;
    }
  };

  // Dados novos (o heatmap chega depois da primeira pintura): replaneja sem teleportar.
  useEffect(() => {
    planejar.current();
  }, [comida, livres]);

  useEffect(() => {
    if (reduzido) return;
    const raiz = raizRef.current;
    let timer = 0;
    let visivel = true;

    const tick = () => {
      const s = sim.current;
      const agora = performance.now();
      const cabeca = s.corpo[0];
      const pescoco = s.corpo[1];

      // Próximo destino: primeiro alvo ainda não comido; sem nenhum, a saída à direita.
      while (s.rota.length && s.comendo && !s.pendentes.has(chave(s.rota[0]))) s.rota.shift();
      const alvo: Ponto = s.rota[0] ?? { c: COLUNAS + GOMOS, r: cabeca.r };

      // Um passo em linha reta: pelo eixo com mais caminho pela frente, nunca de ré.
      const dc = Math.sign(alvo.c - cabeca.c);
      const dr = Math.sign(alvo.r - cabeca.r);
      const opcoes: Ponto[] = [];
      const horizontalPrimeiro = Math.abs(alvo.c - cabeca.c) >= Math.abs(alvo.r - cabeca.r);
      if (horizontalPrimeiro) {
        if (dc) opcoes.push({ c: cabeca.c + dc, r: cabeca.r });
        if (dr) opcoes.push({ c: cabeca.c, r: cabeca.r + dr });
      } else {
        if (dr) opcoes.push({ c: cabeca.c, r: cabeca.r + dr });
        if (dc) opcoes.push({ c: cabeca.c + dc, r: cabeca.r });
      }
      // Alvo bem atrás da cabeça: contorna por uma linha vizinha (ou segue em frente).
      opcoes.push(
        { c: cabeca.c, r: cabeca.r + 1 },
        { c: cabeca.c, r: cabeca.r - 1 },
        { c: cabeca.c + 1, r: cabeca.r },
        { c: cabeca.c - 1, r: cabeca.r },
      );
      const nova = opcoes.find((p) => p.r >= 0 && p.r < LINHAS && !igual(p, pescoco))!;

      s.corpo = [nova, ...s.corpo.slice(0, -1)];

      if (s.pendentes.delete(chave(nova))) {
        s.mordidas = [...s.mordidas, { id: ++s.seq, c: nova.c, r: nova.r, t: agora }];
      }
      if (s.rota[0] && igual(nova, s.rota[0])) s.rota.shift();
      if (s.mordidas.length && agora - s.mordidas[0].t > RECRESCE_MS) {
        s.mordidas = s.mordidas.filter((m) => agora - m.t <= RECRESCE_MS);
      }

      // Saiu inteira pela direita: nova volta pela esquerda.
      if (!s.rota.length && s.corpo[GOMOS - 1].c >= COLUNAS) {
        s.corpo = corpoNaEntrada();
        s.volta++;
        planejar.current();
      }

      setQuadro({ corpo: s.corpo, volta: s.volta, mordidas: s.mordidas });
    };

    const ligar = () => {
      if (!timer && visivel && !document.hidden) timer = window.setInterval(tick, PASSO_MS);
    };
    const desligar = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };
    const io = raiz
      ? new IntersectionObserver(([e]) => {
          visivel = e.isIntersecting;
          if (visivel) ligar();
          else desligar();
        })
      : null;
    if (raiz && io) io.observe(raiz);
    const onVis = () => (document.hidden ? desligar() : ligar());
    document.addEventListener("visibilitychange", onVis);
    ligar();
    return () => {
      desligar();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduzido]);

  if (reduzido) return null;

  const { corpo, volta, mordidas } = quadro;
  const cabeca = corpo[0];
  const pescoco = corpo[1];
  const dir = { c: cabeca.c - pescoco.c, r: cabeca.r - pescoco.r };

  return (
    <div
      ref={raizRef}
      className="cobra"
      aria-hidden
      style={{ width: COLUNAS * passo - espaco, height: LINHAS * passo - espaco, "--cobraPasso": `${PASSO_MS}ms` } as CSSProperties}
    >
      {mordidas.map((m) => (
        <span
          key={m.id}
          className="cobra__mordida"
          style={{ width: celula, height: celula, transform: `translate(${m.c * passo}px, ${m.r * passo}px)` }}
        />
      ))}
      <div key={volta}>
        {corpo.map((p, i) => {
          const lado = Math.round(celula - 1 - i * 0.9);
          const off = (celula - lado) / 2;
          const fora = p.c < 0 || p.c >= COLUNAS;
          return (
            <span
              key={i}
              className={`cobra__gomo${i === 0 ? " cobra__gomo--cabeca" : ""}`}
              style={{
                width: lado,
                height: lado,
                zIndex: GOMOS - i,
                opacity: fora ? 0 : 1 - i * 0.04,
                transform: `translate(${p.c * passo + off}px, ${p.r * passo + off}px)`,
                background: `color-mix(in oklab, var(--cobraCauda) ${Math.round((i / (GOMOS - 1)) * 100)}%, var(--cobraCabeca))`,
              }}
            >
              {i === 0 && <Olhos lado={lado} dir={dir} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Dois olhos na frente da cabeça, virados para onde ela anda.
function Olhos({ lado, dir }: { lado: number; dir: Ponto }) {
  const e = 3;
  const perto = 2;
  const longe = lado - e - perto;
  const a = 3;
  const b = lado - e - 3;
  let olhos: [number, number][];
  if (dir.c > 0) olhos = [[longe, a], [longe, b]];
  else if (dir.c < 0) olhos = [[perto, a], [perto, b]];
  else if (dir.r > 0) olhos = [[a, longe], [b, longe]];
  else olhos = [[a, perto], [b, perto]];
  return (
    <>
      {olhos.map(([x, y], i) => (
        <span key={i} className="cobra__olho" style={{ left: x, top: y }} />
      ))}
    </>
  );
}
