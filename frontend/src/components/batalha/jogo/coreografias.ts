// Coreografias da luta: sequências de clipes, deslocamentos e efeitos no tempo do palco.
// Cada golpe chama `aoImpacto` no instante do contato: é quando a tela desconta HP,
// mostra o número e troca a mensagem. Todas as esperas usam o relógio do palco
// (congelar/câmera lenta valem para elas).
import type { Tema } from "../../../store/theme";
import type { TipoQuestao } from "../tipos";
import { CASA_HEROI, CASA_VILAO, type PalcoApi } from "./Palco";

type P = { x: number; y: number };
const DIST = CASA_VILAO.x - CASA_HEROI.x; // 400

interface Opts {
  forte: boolean;
  acerta: boolean;
  aoImpacto: () => void;
}

// Ponto de contato no vilão (peito) e ponto por onde um golpe errado passa raspando.
function alvo(p: PalcoApi, acerta: boolean): P {
  const v = p.vilao();
  const peito = v ? v.ponto("tronco", 0, -30) : { x: CASA_VILAO.x, y: CASA_VILAO.y - 120 };
  return acerta ? peito : { x: peito.x + 60, y: peito.y - 110 };
}

// O vilão pula de lado quando o golpe erra.
async function esquiva(p: PalcoApi) {
  const v = p.vilao();
  if (!v) return;
  void v.tocar("agacha", { mistura: 60 });
  await v.mover(70, -40, 160, "sai");
  await v.mover(90, 0, 160, "entra");
  await p.esperar(250);
  void v.tocar("solto");
  await v.mover(0, 0, 350);
}

// O vilão sente o golpe: recua, pisca, tremor e número.
function vilaoApanha(p: PalcoApi, forte: boolean) {
  const v = p.vilao();
  const fx = p.fx();
  const onde = v ? v.ponto("tronco", 0, -30) : { x: CASA_VILAO.x, y: 320 };
  p.congelar(forte ? 120 : 60);
  fx?.impacto(onde, forte ? "#FFC857" : "#fff", forte);
  p.tremer(forte ? 1.4 : 0.7);
  if (forte) {
    p.flash("rgba(255,233,168,.45)");
    p.zoom(onde, 1.18, 700);
  }
  if (v) {
    void v.tocar("dano", { mistura: 40 });
  }
}

export async function ataqueHeroi(p: PalcoApi, tema: Tema, o: Opts) {
  const h = p.heroi();
  const fx = p.fx();
  if (!h || !fx) return o.aoImpacto();

  const acertou = async (forte = o.forte) => {
    if (o.acerta) vilaoApanha(p, forte);
    else void esquiva(p);
    o.aoImpacto();
  };

  // ---------------- ARANHA ----------------
  if (tema === "aranha") {
    if (!o.forte) {
      // Disparo de teia
      void h.tocar("tiro");
      await p.esperar(260);
      const mao = h.ponto("maoF", 0, 4);
      await fx.linha(mao, alvo(p, o.acerta), { cor: "#FFFBF3", contorno: "#141018", larg: 3, dur: 150, fica: 350 });
      if (o.acerta) fx.teia(alvo(p, true), 70);
      await acertou(false);
      await p.esperar(500);
      void h.tocar("guarda");
      return;
    }
    // Voadora de teia: fio no alto, balanço e chute voador
    void h.tocar("tiro", { vel: 1.4 });
    await p.esperar(180);
    const ancora = { x: CASA_VILAO.x - 120, y: 20 };
    void fx.linha(h.ponto("maoF", 0, 4), ancora, { cor: "#FFFBF3", contorno: "#141018", larg: 2.5, dur: 120, fica: 500 });
    void h.tocar("agacha");
    await p.esperar(160);
    h.rastro(true);
    void h.tocar("noAr");
    await h.mover(DIST * 0.55, -120, 330, "sai");
    void h.tocar("voadora");
    await h.mover(DIST - 110, o.acerta ? -40 : -120, 170, "entra");
    await acertou(true);
    await p.esperar(260);
    void h.tocar("cambalhota");
    await h.mover(DIST * 0.4, -100, 260, "sai");
    await h.mover(0, 0, 320, "entra");
    h.rastro(false);
    fx.poeira({ x: CASA_HEROI.x, y: CASA_HEROI.y });
    await h.tocar("agacha");
    void h.tocar("guarda");
    return;
  }

  // ---------------- VENOM ----------------
  if (tema === "venom") {
    if (!o.forte) {
      // Garra viscosa: corre, tentáculo e soco
      void h.tocar("corre");
      await h.mover(DIST - 150, 0, 360, "entraSai");
      void h.tocar("soco");
      await p.esperar(150);
      fx.tentaculo(h.ponto("maoF"), alvo(p, o.acerta));
      await p.esperar(90);
      await acertou(false);
      await p.esperar(380);
      void h.tocar("corre", { vel: 1.2 });
      await h.mover(0, 0, 360);
      void h.tocar("guarda");
      return;
    }
    // Bote simbionte: salto, mordida gigante e gancho
    void h.tocar("agacha");
    await p.esperar(220);
    void h.tocar("noAr");
    fx.veu("#1A1D2E", 1400, 0.35);
    await h.mover(DIST * 0.5, -110, 320, "sai");
    await h.mover(DIST - 130, 0, 220, "entra");
    fx.poeira({ x: CASA_VILAO.x - 130, y: CASA_VILAO.y }, true);
    if (o.acerta) fx.mordida(alvo(p, true));
    void h.tocar("gancho");
    await p.esperar(260);
    await acertou(true);
    await p.esperar(420);
    void h.tocar("cambalhota");
    await h.mover(DIST * 0.4, -90, 240, "sai");
    await h.mover(0, 0, 300, "entra");
    await h.tocar("agacha");
    void h.tocar("guarda");
    return;
  }

  // ---------------- DAVE (Sandevistan) ----------------
  if (tema === "cyberpunk") {
    if (!o.forte) {
      // Soco de cromo: dash com rastro
      h.rastro(true);
      fx.velocidade("#00F0FF", 300);
      void h.tocar("corre", { vel: 2 });
      await h.mover(DIST - 140, 0, 150, "sai");
      void h.tocar("soco", { vel: 1.3 });
      await p.esperar(170);
      await acertou(false);
      await p.esperar(300);
      await h.mover(0, 0, 160, "sai");
      h.rastro(false);
      void h.tocar("guarda");
      return;
    }
    // Sandevistan: o mundo para, ele bate três vezes, o tempo volta e os golpes chegam juntos
    p.banner("Sandevistan", undefined, "#0B6E4F");
    fx.veu("#3CFFB0", 2300, 0.22);
    fx.velocidade("#3CFFB0", 1600);
    h.rastro(true);
    await p.esperar(250);
    const pontos = [
      { x: DIST - 150, y: 0, clipe: "soco" as const },
      { x: DIST + 130, y: 0, clipe: "gancho" as const },
      { x: DIST - 140, y: -30, clipe: "chute" as const },
    ];
    for (const alvoP of pontos) {
      void h.tocar("corre", { vel: 2.5 });
      await h.mover(alvoP.x, alvoP.y, 110, "sai");
      if (alvoP.x > DIST) h.virar(true);
      await h.tocar(alvoP.clipe, { vel: 1.8 });
      h.virar(false);
      if (o.acerta) fx.impacto(alvo(p, true), "#3CFFB0");
    }
    void h.tocar("corre", { vel: 2.5 });
    await h.mover(0, 0, 140, "sai");
    void h.tocar("guarda");
    await p.esperar(180);
    h.rastro(false);
    await acertou(true);
    if (o.acerta) {
      await p.esperar(140);
      fx.impacto(alvo(p, true), "#3CFFB0", true);
      p.tremer(1);
    }
    return;
  }

  // ---------------- CARTÓGRAFA ----------------
  if (tema === "fantasy") {
    if (!o.forte) {
      void h.tocar("tiro");
      await p.esperar(260);
      const ponta = h.ponto("maoF", 0, -50);
      const al = alvo(p, o.acerta);
      [0, 90, 180].forEach((d) => fx.anel(ponta, al, "#C9C2FF", d, 380));
      await p.esperar(400);
      await acertou(false);
      await p.esperar(400);
      void h.tocar("guarda");
      return;
    }
    // Chuva de constelações
    void h.tocar("duplo", { vel: 0.8 });
    fx.veu("#0B0730", 1800, 0.35);
    await p.esperar(300);
    fx.constelacao({ x: CASA_VILAO.x, y: 140 });
    await p.esperar(300);
    await fx.chuva(o.acerta ? alvo(p, true) : { x: CASA_VILAO.x + 120, y: CASA_VILAO.y - 30 }, 6);
    await acertou(true);
    await p.esperar(600);
    void h.tocar("guarda");
    return;
  }

  // ---------------- GUARDIÃO DO VENTO ----------------
  if (!o.forte) {
    void h.tocar("duplo");
    await p.esperar(300);
    fx.vento(h.ponto("maoF"), alvo(p, o.acerta));
    await p.esperar(380);
    await acertou(false);
    await p.esperar(400);
    void h.tocar("guarda");
    return;
  }
  // Mergulho do furacão: sobe, paira e mergulha
  void h.tocar("agacha");
  await p.esperar(200);
  h.rastro(true);
  void h.tocar("noAr");
  await h.mover(60, -130, 420, "sai");
  fx.vento({ x: CASA_HEROI.x, y: 430 }, { x: CASA_HEROI.x + 60, y: 260 });
  await p.esperar(220);
  void h.tocar("voadora");
  await h.mover(DIST - 110, o.acerta ? -40 : -130, 200, "entra");
  await acertou(true);
  await p.esperar(240);
  void h.tocar("cambalhota");
  await h.mover(DIST * 0.4, -100, 260, "sai");
  await h.mover(0, 0, 320, "entra");
  h.rastro(false);
  await h.tocar("agacha");
  void h.tocar("guarda");
}

// Contra-ataque da questão quando o herói erra.
export async function contraAtaque(p: PalcoApi, tipo: TipoQuestao, o: { forte: boolean; bloqueado: boolean; chefe: boolean; aoImpacto: () => void }) {
  const v = p.vilao();
  const h = p.heroi();
  const fx = p.fx();
  if (!v || !h || !fx) return o.aoImpacto();

  const apanha = () => {
    const onde = h.ponto("tronco", 0, -30);
    if (o.bloqueado) {
      fx.escudo(onde);
    } else {
      p.congelar(o.forte ? 110 : 60);
      fx.impacto(onde, tipo.cor, o.forte);
      p.tremer(o.forte ? 1.5 : 0.9);
      p.flash("rgba(232,71,76,.3)");
      void h.tocar("dano", { mistura: 40 });
    }
    o.aoImpacto();
  };

  const distancia = ["Lógica", "Código", "Idioma"].includes(tipo.nome);
  if (distancia && !o.chefe) {
    // arremessa o próprio símbolo
    void v.tocar("tiro");
    await p.esperar(280);
    const peito = h.ponto("tronco", 0, -30);
    await fx.projetil(v.ponto("maoF"), peito, { glifo: tipo.glifo, cor: tipo.cor }, 340, o.forte ? 1.5 : 1);
    if (o.forte) {
      await fx.projetil(v.ponto("maoF"), peito, { glifo: tipo.glifo, cor: tipo.cor }, 260, 1.2);
    }
    apanha();
    await p.esperar(500);
    void v.tocar("solto");
    await h.tocar("guarda");
    return;
  }

  // corpo a corpo: corre até o herói e bate (o chefe dá a pancada com os dois braços)
  void v.tocar("corre");
  await v.mover(-(DIST - 150), 0, 380, "entraSai");
  if (o.forte || o.chefe) {
    void v.tocar("pancada");
    await p.esperar(480);
    fx.poeira({ x: CASA_HEROI.x + 60, y: CASA_HEROI.y }, true);
  } else {
    void v.tocar("soco");
    await p.esperar(240);
  }
  apanha();
  await p.esperar(420);
  v.virar(false);
  void v.tocar("corre");
  await v.mover(0, 0, 380);
  v.virar(true);
  void v.tocar("solto");
  void h.tocar("guarda");
}

export async function entradaVilao(p: PalcoApi, chefe: boolean) {
  const v = p.vilao();
  const fx = p.fx();
  if (!v || !fx) return;
  v.aparecer();
  void v.tocar("noAr");
  await v.mover(0, 0, chefe ? 650 : 480, "entra");
  fx.poeira({ x: CASA_VILAO.x, y: CASA_VILAO.y }, chefe);
  p.tremer(chefe ? 1.8 : 0.6);
  await v.tocar("agacha");
  if (chefe) {
    fx.veu("#B3101F", 1200, 0.2);
    await v.tocar("pancada");
  }
  void v.tocar("solto");
}

// Questão derrotada: cai ou é capturada.
export async function derrotaVilao(p: PalcoApi, captura: { cor: string } | null) {
  const v = p.vilao();
  const h = p.heroi();
  const fx = p.fx();
  if (!v || !fx) return;
  if (captura) {
    const onde = v.ponto("tronco", 0, -30);
    void fx.orbe({ x: onde.x, y: CASA_VILAO.y - 30 }, captura.cor);
    await p.esperar(380);
    await v.tocar("encolhe");
    await v.sumir(60);
    void h?.tocar("vitoria");
    await p.esperar(1900);
  } else {
    await v.tocar("desmaio");
    await v.sumir(350);
    void h?.tocar("vitoria");
    await p.esperar(700);
  }
  void h?.tocar("guarda");
}

// Questão errada foge (volta depois)
export async function fugaVilao(p: PalcoApi) {
  const v = p.vilao();
  if (!v) return;
  v.virar(false);
  void v.tocar("foge");
  await v.mover(420, 0, 520, "entra");
  await v.sumir(80);
}

export async function derrotaHeroi(p: PalcoApi) {
  const h = p.heroi();
  if (!h) return;
  await h.tocar("desmaio");
}

export async function entradaHeroi(p: PalcoApi) {
  const h = p.heroi();
  if (!h) return;
  void h.tocar("corre");
  await h.mover(0, 0, 520, "sai");
  await h.tocar("agacha");
  void h.tocar("guarda");
}
