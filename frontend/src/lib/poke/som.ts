// Sons da Batalha Pokémon: gritos (mp3 do Showdown) e jingles 8-bit feitos na hora com WebAudio.

const nomeDoGrito = (nome: string) =>
  nome.toLowerCase().replace("♀", "f").replace("♂", "m").normalize("NFD").replace(/[^a-z0-9]/g, "");

export function tocarGrito(nome: string) {
  try {
    const a = new Audio(`https://play.pokemonshowdown.com/audio/cries/${nomeDoGrito(nome)}.mp3`);
    a.volume = 0.5;
    void a.play().catch(() => {});
  } catch {
    /* sem áudio */
  }
}

// [frequência, início (s), duração (s)]
type Nota = [number, number, number];

function tocarNotas(notas: Nota[], volume = 0.06) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    let fim = 0;
    for (const [f, t, d] of notas) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + d);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + d + 0.05);
      fim = Math.max(fim, t + d);
    }
    setTimeout(() => void ctx.close().catch(() => {}), fim * 1000 + 600);
  } catch {
    /* sem áudio */
  }
}

// Jingle curto de parabéns (onda quadrada, como o som 8-bit dos jogos).
export function tocarParabens() {
  tocarNotas([
    [392, 0, 0.14], [523, 0.15, 0.14], [659, 0.3, 0.14], [784, 0.45, 0.3],
    [659, 0.8, 0.14], [784, 0.95, 0.14], [1047, 1.1, 0.6],
  ]);
}

// Fanfarra do Hall da Fama: chamada de trompete, subida e acorde final sustentado.
export function tocarFanfarra() {
  tocarNotas([
    [523, 0, 0.16], [523, 0.18, 0.08], [523, 0.27, 0.08], [523, 0.36, 0.16], [659, 0.54, 0.16], [784, 0.72, 0.34],
    [698, 1.1, 0.16], [784, 1.28, 0.16], [880, 1.46, 0.16], [988, 1.64, 0.16],
    [1047, 1.84, 0.9], [784, 1.84, 0.9], [659, 1.84, 0.9],
    [1319, 2.3, 0.5],
  ], 0.045);
}
