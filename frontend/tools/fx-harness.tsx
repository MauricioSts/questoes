import { createRoot } from "react-dom/client";
import { useMemo } from "react";
import { Arena, type LadoVis } from "../src/components/poke/Arena";
import { MotorGolpes } from "../src/components/poke/golpes/motor";
import { specPorSlug } from "../src/components/poke/golpes/spec";
import { spritesFx } from "../src/components/poke/golpes/sprites/fx";
import "../src/index.css";
import "../src/poke.css";

const lado = (id: number): LadoVis => ({ id, nome: `#${id}`, nivel: 50, hp: 100, hpMax: 100, status: "", anim: "", chave: id, xp: 0.4 });
let motor!: MotorGolpes;

function App() {
  motor = useMemo(() => {
    const m = new MotorGolpes();
    m.autoLoop = false; // o relógio é o __fx.ate
    return m;
  }, []);
  return <Arena inimigos={[lado(9), null]} meus={[lado(6), null]} treinador={null} mensagem="" motor={motor} textos={[]} bola={null} cor="#6890F0" />;
}
createRoot(document.getElementById("r")!).render(<App />);

let t = 0;
(window as unknown as { __fx: unknown }).__fx = {
  get motor() {
    return motor;
  },
  async tocar(slug: string, inverte = false, outcome = "hit") {
    await spritesFx.preCarregar([slug]);
    motor.limparTudo();
    t = 0;
    const A = motor.atores.ancora(inverte ? "inimigo-0" : "meu-0")!;
    const T = motor.atores.ancora(inverte ? "meu-0" : "inimigo-0")!;
    motor.tocar(specPorSlug(slug)!, { attacker: A, targets: [T], power: 80, outcome: outcome as "hit", seed: 7 });
    return !!spritesFx.receitaPronta(slug);
  },
  async ate(q: number) {
    for (; t < q; t++) {
      motor.tick(1000 / 60);
      await Promise.resolve();
      await Promise.resolve();
    }
    motor.render();
  },
};
