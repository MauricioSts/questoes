// Peles dos bonecos: o que se desenha em cada osso do esqueleto (esqueleto.ts), no espaço
// local do osso (origem na junta; membros para baixo, tronco e cabeça para cima), com o
// personagem virado para a direita. Contorno de nanquim em tudo: visual de gibi/jogo.
//
// Heróis (um por tema, 3 formas cada, evoluindo com o nível):
// - aranha:    Aranha Novato → Aranha → Aranha-Escarlate
// - venom:     Simbi → Simbionte → Venomorfo
// - cyberpunk: Dave → Dave Cromado → Dave Sandevistan (edgerunner de jaqueta amarela,
//              inspirado no protagonista de Cyberpunk: Edgerunners, sem copiar arte oficial)
// - fantasy:   Cartógrafa Aprendiz → Cartógrafa → Atlas, a Cartomante
// - rose:      Escudeiro do Vento → Cavaleiro do Vento → Lugião
// Vilões: golems de papel (a questão ganha corpo), cor e objeto pela matéria.
import type { ReactNode } from "react";
import type { Tema } from "../../../store/theme";
import type { Parte } from "./esqueleto";
import type { TipoQuestao } from "../tipos";

export const TRACO = "#141018";

export interface Skin {
  partes: Partial<Record<Parte, ReactNode>>;
  esc: number; // tamanho relativo
  onda?: number; // amplitude (graus) do balanço procedural da capa/asas/tentáculos
  rastro?: string; // cor do rastro de imagens (dash)
  ossos?: Partial<Record<string, { x: number; y: number }>>; // juntas reposicionadas
  defs?: ReactNode;
}

// ---------- formas básicas ----------

// Cápsula de (0,0) a (0,L), meia-largura a no topo e b na ponta.
function capsula(L: number, a: number, b: number) {
  return `M${-a},0 L${-b},${L} A${b},${b} 0 0 0 ${b},${L} L${a},0 A${a},${a} 0 0 0 ${-a},0Z`;
}
function Membro({ L, a, b, cor, contorno = TRACO, children }: { L: number; a: number; b: number; cor: string; contorno?: string; children?: ReactNode }) {
  return (
    <g>
      <path d={capsula(L, a, b)} fill={cor} stroke={contorno} strokeWidth="2" strokeLinejoin="round" />
      {children}
    </g>
  );
}
function troncoPath(ombro = 15, cintura = 11) {
  return `M${-cintura},4 C${-cintura - 2},-20 ${-ombro - 2},-38 ${-ombro},-48 Q0,-57 ${ombro},-48 C${ombro + 2},-38 ${cintura + 2},-20 ${cintura},4 Z`;
}
function Bota({ cor, sola = TRACO, contorno = TRACO }: { cor: string; sola?: string; contorno?: string }) {
  return (
    <g>
      <path d="M-6,-3 L5,-3 C12,-1 15,3 14,7 L-7,7Z" fill={cor} stroke={contorno} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-7,7 L14,7" stroke={sola} strokeWidth="2.5" />
    </g>
  );
}
function Mao({ cor, r = 5.5, contorno = TRACO }: { cor: string; r?: number; contorno?: string }) {
  return <circle cx="0" cy="3" r={r} fill={cor} stroke={contorno} strokeWidth="2" />;
}
function Brilho({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".45" />;
}
function Short({ cor, contorno = TRACO }: { cor: string; contorno?: string }) {
  return <path d="M-13,-6 L13,-6 L15,12 Q0,16 -15,12Z" fill={cor} stroke={contorno} strokeWidth="2" strokeLinejoin="round" />;
}
// Teia desenhada por cima de uma área (linhas finas)
function LinhasTeia({ d }: { d: string }) {
  return <path d={d} fill="none" stroke={TRACO} strokeWidth=".8" opacity=".55" />;
}

// ---------- ARANHA ----------

function aranha(e: number): Skin {
  const verm = e === 3 ? "#161218" : "#D4192C";
  const azul = e === 3 ? "#D4192C" : e === 1 ? "#2B4C9B" : "#1446A0";
  const teia = e >= 2;
  const olhos = (
    <g>
      <path d="M2,-22 C8,-27 15,-24 14,-15 C11,-11 5,-12 2,-16Z" fill="#fff" stroke={TRACO} strokeWidth="2.6" />
      <path d="M-8,-21 C-6,-25 -1,-25 0,-19 C-2,-15 -6,-15 -8,-18Z" fill="#fff" stroke={TRACO} strokeWidth="2.2" />
    </g>
  );
  return {
    esc: e === 1 ? 1.25 : e === 2 ? 1.35 : 1.42,
    rastro: "#D4192C",
    partes: {
      tronco: (
        <g>
          <path d={troncoPath(15, 11)} fill={verm} stroke={TRACO} strokeWidth="2" />
          {e === 1 ? (
            <>
              {/* moletom caseiro: capuz nas costas e bolso */}
              <path d="M-12,-48 Q-4,-40 6,-48" fill="none" stroke={TRACO} strokeWidth="1.5" />
              <path d="M-8,-14 H8 L6,-4 H-6Z" fill="#B3101F" stroke={TRACO} strokeWidth="1.2" />
            </>
          ) : (
            <>
              <path d="M-11,4 C-13,-16 -15,-30 -14,-40 L-8,-20 L-6,4Z M11,4 C13,-16 15,-30 14,-40 L8,-20 L6,4Z" fill={azul} />
              {teia && <LinhasTeia d="M0,-54 V4 M-14,-44 Q0,-38 14,-44 M-15,-32 Q0,-26 15,-32 M-13,-18 Q0,-12 13,-18 M-11,-6 Q0,0 11,-6" />}
              <g transform="translate(0,-32)">
                <ellipse cx="0" cy="0" rx="3" ry="4.5" fill={e === 3 ? "#D4192C" : TRACO} />
                <path d="M-3,-2 L-9,-8 M3,-2 L9,-8 M-3,1 L-10,0 M3,1 L10,0 M-3,3 L-8,9 M3,3 L8,9" stroke={e === 3 ? "#D4192C" : TRACO} strokeWidth={e === 3 ? 2 : 1.4} />
              </g>
            </>
          )}
          <Brilho d="M-8,-44 Q-2,-49 5,-47" />
        </g>
      ),
      quadril: <Short cor={azul} />,
      cabeca: (
        <g>
          <path d="M-4,2 L4,2 L4,-4 L-4,-4Z" fill={verm} stroke={TRACO} strokeWidth="1.5" />
          <ellipse cx="1" cy="-15" rx="13" ry="15" fill={verm} stroke={TRACO} strokeWidth="2" />
          {teia && <LinhasTeia d="M6,-15 L1,-30 M6,-15 L14,-26 M6,-15 L15,-8 M6,-15 L4,0 M6,-15 L-10,-4 M6,-15 L-12,-18 M-6,-26 Q2,-20 12,-22 M-11,-8 Q0,-4 10,-4" />}
          {e === 1 && <path d="M-12,-20 Q1,-34 13,-20" fill="none" stroke="#B3101F" strokeWidth="4" />}
          {olhos}
          <Brilho d="M-6,-26 Q-1,-30 5,-29" />
        </g>
      ),
      bracoF: (
        <Membro L={24} a={6} b={5} cor={azul}>
          {e === 3 && <path d="M-6,2 L-18,30 L-6,22Z" fill="rgba(20,16,24,.25)" stroke={TRACO} strokeWidth=".8" />}
        </Membro>
      ),
      bracoT: <Membro L={24} a={6} b={5} cor={azul} />,
      anteF: <Membro L={22} a={5} b={4.5} cor={verm}>{teia && <LinhasTeia d="M0,2 V20 M-5,8 H5 M-5,15 H5" />}</Membro>,
      anteT: <Membro L={22} a={5} b={4.5} cor={verm} />,
      maoF: <Mao cor={verm} />,
      maoT: <Mao cor={verm} />,
      coxaF: <Membro L={38} a={8} b={6.5} cor={azul} />,
      coxaT: <Membro L={38} a={8} b={6.5} cor={azul} />,
      canelaF: <Membro L={36} a={6.5} b={5} cor={e === 1 ? azul : verm}>{teia && <LinhasTeia d="M0,4 V32 M-6,12 H6 M-6,22 H6" />}</Membro>,
      canelaT: <Membro L={36} a={6.5} b={5} cor={e === 1 ? azul : verm} />,
      peF: <Bota cor={e === 1 ? "#E8E4DA" : verm} />,
      peT: <Bota cor={e === 1 ? "#E8E4DA" : verm} />,
    },
  };
}

// ---------- VENOM ----------

function venom(e: number): Skin {
  const preto = "#0D0F18";
  const brilho = "#5D6AA8"; // contorno azulado: preto no beco escuro sumia
  const larg = e === 1 ? 1 : e === 2 ? 1.15 : 1.3;
  const tentaculo = (d: string, i: number) => (
    <path key={i} d={d} fill={preto} stroke={brilho} strokeWidth="1.4" />
  );
  return {
    esc: e === 1 ? 1.2 : e === 2 ? 1.42 : 1.58,
    onda: e >= 2 ? 14 : 0,
    rastro: "#3A4270",
    partes: {
      capa:
        e >= 2 ? (
          <g>
            {tentaculo("M-4,0 C-30,-10 -40,-40 -30,-58 C-34,-40 -22,-18 2,-6Z", 0)}
            {tentaculo("M-6,6 C-40,10 -56,-6 -60,-24 C-50,-10 -30,0 -4,-2Z", 1)}
            {e >= 3 && tentaculo("M-6,14 C-36,30 -58,24 -70,10 C-54,18 -32,18 -4,8Z", 2)}
          </g>
        ) : null,
      tronco: (
        <g transform={`scale(${larg} 1)`}>
          <path d={troncoPath(17, 12)} fill={preto} stroke={brilho} strokeWidth="2" />
          <path d="M-8,-44 C-4,-36 4,-36 8,-44 M-6,-30 C-2,-24 2,-24 6,-30" fill="none" stroke={brilho} strokeWidth="1.2" opacity=".8" />
          {e >= 3 && (
            <g transform="translate(0,-30)" fill="#F4F4FF">
              <ellipse cx="0" cy="0" rx="4" ry="6" />
              <path d="M-3,-3 C-10,-10 -14,-18 -12,-22 C-10,-14 -6,-8 -2,-5Z M3,-3 C10,-10 14,-18 12,-22 C10,-14 6,-8 2,-5Z M-3,3 C-10,8 -14,16 -12,22 C-10,14 -6,9 -2,6Z M3,3 C10,8 14,16 12,22 C10,14 6,9 2,6Z" />
            </g>
          )}
          <Brilho d="M-9,-45 Q-2,-51 6,-48" />
        </g>
      ),
      quadril: <Short cor={preto} contorno={brilho} />,
      cabeca: (
        <g transform={`scale(${1 + (e - 1) * 0.1})`}>
          <ellipse cx="2" cy="-15" rx="15" ry="15.5" fill={preto} stroke={brilho} strokeWidth="2" />
          {e >= 3 && <path d="M-10,-26 L-12,-38 L-4,-29 M4,-30 L6,-42 L10,-29" fill={preto} stroke={brilho} strokeWidth="1.4" />}
          {/* olhos brancos angulosos */}
          <path d="M4,-17 C8,-28 17,-28 17,-18 C14,-14 8,-13 4,-17Z" fill="#fff" />
          <path d="M-9,-18 C-8,-27 -1,-27 1,-19 C-2,-15 -6,-15 -9,-18Z" fill="#fff" />
          {/* boca rasgada com dentes */}
          <path d="M-8,-9 C0,2 12,2 18,-9 C10,-4 0,-4 -8,-9Z" fill="#fff" />
          <path d="M-7,-8 L-5,-4 L-3,-7 L-1,-2 L1,-6 L3,-1 L5,-6 L7,-1 L9,-6 L11,-2 L13,-7 L15,-4 L17,-8" fill="none" stroke={preto} strokeWidth="1.3" />
          <path d={e >= 3 ? "M6,-3 C8,8 18,10 14,22" : "M6,-3 C8,4 12,6 10,12"} fill="none" stroke="#C3163B" strokeWidth={e >= 3 ? 4.5 : 3.5} strokeLinecap="round" />
          <Brilho d="M-6,-27 Q0,-31 7,-29" />
        </g>
      ),
      bracoF: <Membro L={24} a={7 * larg} b={6 * larg} cor={preto} contorno={brilho} />,
      bracoT: <Membro L={24} a={7 * larg} b={6 * larg} cor={preto} contorno={brilho} />,
      anteF: <Membro L={22} a={6 * larg} b={5.5 * larg} cor={preto} contorno={brilho} />,
      anteT: <Membro L={22} a={6 * larg} b={5.5 * larg} cor={preto} contorno={brilho} />,
      maoF: (
        <g>
          <Mao cor={preto} r={6.5 * larg} contorno={brilho} />
          {e >= 2 && <path d="M2,8 L4,14 M-1,9 L0,15 M-4,8 L-4,13" stroke="#E8E8F2" strokeWidth="1.6" strokeLinecap="round" />}
        </g>
      ),
      maoT: <Mao cor={preto} r={6.5 * larg} contorno={brilho} />,
      coxaF: <Membro L={38} a={8.5 * larg} b={7 * larg} cor={preto} contorno={brilho} />,
      coxaT: <Membro L={38} a={8.5 * larg} b={7 * larg} cor={preto} contorno={brilho} />,
      canelaF: <Membro L={36} a={7 * larg} b={5.5 * larg} cor={preto} contorno={brilho} />,
      canelaT: <Membro L={36} a={7 * larg} b={5.5 * larg} cor={preto} contorno={brilho} />,
      peF: <Bota cor={preto} sola={brilho} contorno={brilho} />,
      peT: <Bota cor={preto} sola={brilho} contorno={brilho} />,
    },
  };
}

// ---------- DAVE (cyberpunk) ----------

function dave(e: number): Skin {
  const amarelo = "#F2D22E";
  const pele = "#E6B089";
  const cromo = "#A6AEC2";
  const neon = e >= 3 ? "#3CFFB0" : "#00F0FF";
  const bracoCyber = e >= 2;
  return {
    esc: e === 1 ? 1.3 : e === 2 ? 1.36 : 1.4,
    rastro: e >= 3 ? "#3CFFB0" : "#00F0FF",
    partes: {
      tronco: (
        <g>
          {/* camiseta escura por baixo, jaqueta amarela aberta por cima */}
          <path d={troncoPath(15, 11)} fill="#20202C" stroke={TRACO} strokeWidth="2" />
          <path d="M-11,4 C-13,-20 -17,-38 -15,-48 Q-9,-53 -3,-52 L-5,-24 L-3,4Z" fill={amarelo} stroke={TRACO} strokeWidth="1.6" />
          <path d="M11,4 C13,-20 17,-38 15,-48 Q9,-53 5,-52 L4,-26 L6,4Z" fill={amarelo} stroke={TRACO} strokeWidth="1.6" />
          <path d="M-10,-6 H-4 M6,-6 H11" stroke={TRACO} strokeWidth="2.2" />
          <path d="M-14,-40 L-6,-40" stroke={TRACO} strokeWidth="1.2" />
          <path d="M-4,-52 L-2,-44 L2,-44 L4,-52" fill="#20202C" stroke={TRACO} strokeWidth="1.2" />
          {e >= 3 && (
            // Sandevistan: coluna cibernética brilhando nas costas
            <g className="jg-pulsa">
              <path d="M-13,-46 C-15,-30 -14,-14 -11,2" fill="none" stroke={neon} strokeWidth="3" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${neon})` }} />
              {[-42, -32, -22, -12, -2].map((y) => (
                <rect key={y} x="-16" y={y} width="5" height="3" rx="1" fill={neon} />
              ))}
            </g>
          )}
          <Brilho d="M9,-46 Q12,-40 12,-32" />
        </g>
      ),
      quadril: <Short cor="#23233A" />,
      cabeca: (
        <g>
          <rect x="-4" y="-5" width="8" height="7" fill={pele} stroke={TRACO} strokeWidth="1.5" />
          <path d="M-11,-16 C-12,-28 -4,-32 4,-31 C12,-30 15,-22 14,-13 C14,-6 10,-2 3,-1 C-5,-1 -10,-7 -11,-16Z" fill={pele} stroke={TRACO} strokeWidth="2" />
          <path d="M-4,-14 C-6,-17 -9,-17 -9,-12 C-9,-9 -6,-8 -4,-11" fill={pele} stroke={TRACO} strokeWidth="1.3" />
          {/* olho, sobrancelha, boca virados para a direita */}
          <path d="M5,-17 L11,-17.5 L10,-15 L5,-15Z" fill={e >= 2 ? neon : TRACO} style={e >= 2 ? { filter: `drop-shadow(0 0 2px ${neon})` } : undefined} />
          <path d="M4,-20.5 L12,-21.5" stroke={TRACO} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6,-7 L11,-8" stroke={TRACO} strokeWidth="1.4" strokeLinecap="round" />
          {/* cabelo escuro espetado, lateral raspada */}
          <path d="M-12,-15 C-15,-26 -10,-36 0,-37 L-3,-42 L4,-37 L6,-43 L9,-36 L15,-38 L13,-31 C16,-28 16,-23 14,-21 C10,-27 2,-28 -4,-24 C-7,-22 -9,-18 -12,-15Z" fill="#17161F" stroke={TRACO} strokeWidth="1.5" />
          <path d="M-2,-33 L6,-30" stroke="#3A3F63" strokeWidth="1.6" strokeLinecap="round" />
          {e >= 2 && <path d="M-10,-18 L-6,-18 M-10,-15 L-7,-15" stroke={neon} strokeWidth="1.2" />}
        </g>
      ),
      bracoF: <Membro L={24} a={6.3} b={5.3} cor={amarelo} />,
      bracoT: <Membro L={24} a={6.3} b={5.3} cor={amarelo} />,
      anteF: bracoCyber ? (
        <Membro L={22} a={5} b={4.6} cor={cromo}>
          <path d="M-3,3 V19 M3,3 V19" stroke={neon} strokeWidth="1.2" />
          <rect x="-5" y="0" width="10" height="4" fill={TRACO} />
        </Membro>
      ) : (
        <Membro L={22} a={5.4} b={4.6} cor={amarelo}>
          <rect x="-5" y="15" width="10" height="4" fill={TRACO} />
        </Membro>
      ),
      anteT: (
        <Membro L={22} a={5.4} b={4.6} cor={amarelo}>
          <rect x="-5" y="15" width="10" height="4" fill={TRACO} />
        </Membro>
      ),
      maoF: <Mao cor={bracoCyber ? cromo : pele} />,
      maoT: <Mao cor={pele} />,
      coxaF: <Membro L={38} a={7.6} b={6.2} cor="#23233A" />,
      coxaT: <Membro L={38} a={7.6} b={6.2} cor="#23233A" />,
      canelaF: <Membro L={36} a={6.2} b={5} cor="#23233A" />,
      canelaT: <Membro L={36} a={6.2} b={5} cor="#23233A" />,
      peF: <Bota cor="#F0F0F0" sola="#E8474C" />,
      peT: <Bota cor="#F0F0F0" sola="#E8474C" />,
    },
  };
}

// ---------- CARTÓGRAFA (Topography) ----------

function cartografa(e: number): Skin {
  const manto = "#2800C9";
  const mantoEsc = "#1A0890";
  const lav = "#C9C2FF";
  const pele = "#F1C9A5";
  const ouro = "#FFC857";
  return {
    esc: e === 1 ? 1.28 : e === 2 ? 1.35 : 1.42,
    onda: 8,
    rastro: lav,
    partes: {
      capa: (
        <g>
          <path d="M-14,0 C-24,30 -30,70 -26,100 L-4,94 C-6,60 -4,30 6,2Z" fill={mantoEsc} stroke={TRACO} strokeWidth="2" />
          <path d="M-16,30 C-20,50 -22,70 -20,90 M-10,40 C-12,60 -14,76 -12,92" fill="none" stroke={lav} strokeWidth="1" opacity=".6" />
          {e >= 3 && (
            <g fill="#fff" className="jg-pisca-estrela">
              <circle cx="-18" cy="40" r="1.4" />
              <circle cx="-12" cy="62" r="1.2" />
              <circle cx="-22" cy="78" r="1.5" />
              <path d="M-18,40 L-12,62 L-22,78" stroke={lav} strokeWidth=".6" fill="none" />
            </g>
          )}
        </g>
      ),
      tronco: (
        <g>
          <path d={troncoPath(14, 12)} fill={manto} stroke={TRACO} strokeWidth="2" />
          <path d="M-8,-40 C-2,-34 6,-34 10,-40 M-9,-26 C-2,-20 6,-20 11,-26 M-9,-12 C-2,-6 6,-6 10,-12" fill="none" stroke={lav} strokeWidth="1.1" opacity=".75" />
          {e >= 2 && <path d="M-12,-6 H12" stroke={ouro} strokeWidth="3" />}
          {e >= 2 && <circle cx="0" cy="-6" r="3" fill={ouro} stroke={TRACO} strokeWidth="1" />}
          <Brilho d="M-7,-45 Q0,-50 7,-47" />
        </g>
      ),
      quadril: <path d="M-13,-6 L13,-6 L19,22 Q0,28 -19,22Z" fill={manto} stroke={TRACO} strokeWidth="2" />,
      cabeca: (
        <g>
          {/* capuz com o rosto aparecendo de lado */}
          <path d="M-14,-10 C-18,-30 -6,-40 4,-38 C14,-36 18,-26 16,-14 C14,-4 8,2 -2,2 C-10,2 -13,-4 -14,-10Z" fill={manto} stroke={TRACO} strokeWidth="2" />
          <path d="M0,-14 C0,-26 12,-28 14,-18 C15,-10 10,-4 4,-4 C1,-6 0,-9 0,-14Z" fill={pele} stroke={TRACO} strokeWidth="1.5" />
          <circle cx="9" cy="-17" r="1.8" fill={e >= 3 ? ouro : "#6B5CFF"} className={e >= 3 ? "jg-pulsa" : undefined} />
          <path d="M7,-10 L11,-10.5" stroke={TRACO} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M2,-30 C6,-24 8,-22 12,-24" fill="none" stroke="#6B3E1E" strokeWidth="3" />
          {e >= 3 && (
            <g className="jg-gira" style={{ transformOrigin: "2px -40px" }}>
              <ellipse cx="2" cy="-40" rx="16" ry="4" fill="none" stroke={ouro} strokeWidth="1.4" />
            </g>
          )}
          <Brilho d="M-10,-26 Q-4,-34 4,-35" />
        </g>
      ),
      bracoF: <Membro L={24} a={6.5} b={5.5} cor={manto} />,
      bracoT: <Membro L={24} a={6.5} b={5.5} cor={manto} />,
      anteF: <Membro L={22} a={5.8} b={5} cor={manto}><path d="M-6,16 H6" stroke={e >= 2 ? ouro : lav} strokeWidth="2" /></Membro>,
      anteT: <Membro L={22} a={5.8} b={5} cor={manto} />,
      maoF: (
        <g>
          {/* cajado com bússola na ponta */}
          <path d="M0,-44 V52" stroke="#6B3E1E" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="0" cy="-50" r={e >= 2 ? 9 : 7} fill="#0B0730" stroke={ouro} strokeWidth="2" />
          <circle cx="0" cy="-50" r={e >= 2 ? 5 : 4} fill={lav} className="jg-pulsa" style={{ filter: `drop-shadow(0 0 4px ${lav})` }} />
          <Mao cor={pele} />
        </g>
      ),
      maoT: <Mao cor={pele} />,
      coxaF: <Membro L={38} a={7.5} b={6} cor="#3A2A1C" />,
      coxaT: <Membro L={38} a={7.5} b={6} cor="#3A2A1C" />,
      canelaF: <Membro L={36} a={6.2} b={5} cor="#5A3E26" />,
      canelaT: <Membro L={36} a={6.2} b={5} cor="#5A3E26" />,
      peF: <Bota cor="#6B4423" />,
      peT: <Bota cor="#6B4423" />,
    },
  };
}

// ---------- GUARDIÃO DO VENTO (Lugia) ----------

function guardiao(e: number): Skin {
  const branco = "#F5F8FF";
  const azul = "#2B4C9B";
  const prata = "#C9D7F4";
  const asa = e === 1 ? 0.7 : e === 2 ? 1 : 1.3;
  return {
    esc: e === 1 ? 1.28 : e === 2 ? 1.36 : 1.44,
    onda: 12,
    rastro: "#9DB4E0",
    partes: {
      capa: (
        <g transform={`scale(${asa})`}>
          {/* asas-capa que batem */}
          <path d="M0,0 C-20,-30 -50,-40 -70,-34 C-58,-26 -54,-20 -52,-12 C-44,-20 -36,-18 -30,-10 C-24,-18 -14,-16 -8,-6Z" fill={branco} stroke="#7F9BD0" strokeWidth="2" strokeLinejoin="round" />
          <path d="M-2,4 C-26,-6 -54,-4 -72,6 C-58,8 -52,14 -50,22 C-42,14 -32,16 -26,24 C-20,14 -10,14 -4,18Z" fill={prata} stroke="#7F9BD0" strokeWidth="2" strokeLinejoin="round" />
          {e >= 3 && <path d="M-60,-30 L-66,-44 M-64,4 L-74,-4" stroke="#7FB2FF" strokeWidth="2" strokeLinecap="round" />}
        </g>
      ),
      tronco: (
        <g>
          <path d={troncoPath(15, 11)} fill={branco} stroke={TRACO} strokeWidth="2" />
          <path d="M-12,-46 L12,-46 L8,-28 L-8,-28Z" fill={prata} stroke={TRACO} strokeWidth="1.4" />
          <path d="M-6,-44 L0,-50 L6,-44" fill="none" stroke={azul} strokeWidth="2" />
          <path d="M0,-26 L5,-18 L0,-10 L-5,-18Z" fill={e >= 3 ? "#7FB2FF" : azul} stroke={TRACO} strokeWidth="1" className={e >= 3 ? "jg-pulsa" : undefined} />
          <Brilho d="M-8,-44 Q-2,-49 5,-47" />
        </g>
      ),
      quadril: <Short cor={azul} />,
      cabeca: (
        <g>
          <path d="M-4,2 L4,2 L4,-4 L-4,-4Z" fill={prata} stroke={TRACO} strokeWidth="1.5" />
          <ellipse cx="1" cy="-15" rx="13" ry="14.5" fill={branco} stroke={TRACO} strokeWidth="2" />
          {/* crista de placas azuis */}
          <path d={e >= 2 ? "M-12,-22 L-18,-38 L-8,-28 L-8,-44 L0,-30 L4,-44 L6,-29" : "M-10,-24 L-14,-34 L-6,-28 L-4,-38 L1,-29"} fill={azul} stroke={TRACO} strokeWidth="1.4" strokeLinejoin="round" />
          {/* máscara dos olhos */}
          <path d="M1,-19 C5,-24 14,-23 15,-15 C11,-12 5,-12 1,-15Z" fill={azul} />
          <path d="M5,-17 L12,-17" stroke={e >= 3 ? "#DDF0FF" : "#fff"} strokeWidth="2.4" strokeLinecap="round" style={e >= 3 ? { filter: "drop-shadow(0 0 3px #7FB2FF)" } : undefined} />
          <Brilho d="M-7,-26 Q-1,-30 5,-29" />
        </g>
      ),
      bracoF: <Membro L={24} a={6.3} b={5.3} cor={prata} />,
      bracoT: <Membro L={24} a={6.3} b={5.3} cor={prata} />,
      anteF: <Membro L={22} a={5.5} b={5} cor={branco}><path d="M-5,6 H5 M-5,12 H5" stroke={azul} strokeWidth="1.5" /></Membro>,
      anteT: <Membro L={22} a={5.5} b={5} cor={branco} />,
      maoF: <Mao cor={azul} />,
      maoT: <Mao cor={azul} />,
      coxaF: <Membro L={38} a={7.8} b={6.3} cor={branco} />,
      coxaT: <Membro L={38} a={7.8} b={6.3} cor={branco} />,
      canelaF: <Membro L={36} a={6.4} b={5} cor={prata} />,
      canelaT: <Membro L={36} a={6.4} b={5} cor={prata} />,
      peF: <Bota cor={azul} />,
      peT: <Bota cor={azul} />,
    },
  };
}

export function skinHeroi(tema: Tema, estagio: number): Skin {
  const e = Math.min(3, Math.max(1, estagio));
  switch (tema) {
    case "aranha":
      return aranha(e);
    case "venom":
      return venom(e);
    case "cyberpunk":
      return dave(e);
    case "fantasy":
      return cartografa(e);
    case "rose":
      return guardiao(e);
  }
}

// ---------- VILÃO: golem de papel ----------

function objetoDoTipo(tipo: TipoQuestao): ReactNode {
  switch (tipo.nome) {
    case "Letra":
      return (
        <g transform="rotate(-20)">
          <path d="M-2,-2 L2,-2 L3,-40 C3,-44 -3,-44 -3,-40Z" fill="#fff" stroke={TRACO} strokeWidth="1.5" />
          <path d="M-2,-2 L0,6 L2,-2Z" fill={TRACO} />
        </g>
      );
    case "Lei":
      return (
        <g>
          <rect x="-2" y="-30" width="4" height="32" rx="1" fill="#6B4423" stroke={TRACO} strokeWidth="1" />
          <rect x="-11" y="-42" width="22" height="13" rx="2" fill="#8B5A2B" stroke={TRACO} strokeWidth="1.5" />
        </g>
      );
    case "Dados":
      return (
        <g transform="translate(0,-10)">
          <ellipse cx="0" cy="-8" rx="9" ry="3.5" fill="#fff" stroke={TRACO} strokeWidth="1.2" />
          <path d="M-9,-8 V6 C-9,10 9,10 9,6 V-8" fill="#fff" stroke={TRACO} strokeWidth="1.2" />
          <path d="M-9,-1 C-9,3 9,3 9,-1" fill="none" stroke={TRACO} strokeWidth="1" />
        </g>
      );
    case "Idioma":
      return (
        <g transform="translate(-6,-34) scale(-1 1)">
          <path d="M-12,-10 H12 C14,-10 15,-9 15,-7 V4 C15,6 14,7 12,7 H2 L-4,13 L-3,7 H-12 C-14,7 -15,6 -15,4 V-7 C-15,-9 -14,-10 -12,-10Z" fill="#fff" stroke={TRACO} strokeWidth="1.4" />
          <text x="0" y="2" textAnchor="middle" fontSize="9" fontWeight="800" fill={TRACO}>
            Hi!
          </text>
        </g>
      );
    default:
      return null;
  }
}

export function skinVilao(tipo: TipoQuestao, opts: { chefe: boolean; nivel: number }): Skin {
  const { chefe, nivel } = opts;
  const cor = tipo.cor;
  const brava = nivel >= 2 || chefe;
  const tinta = (L: number) => <path d={capsula(L, 3.2, 3)} fill={TRACO} />;
  return {
    esc: chefe ? 1.6 : 1.2 + Math.min(nivel, 5) * 0.03,
    onda: chefe ? 6 : 0,
    rastro: cor,
    // quadril mais alto e ombros/pernas nas bordas da folha
    ossos: {
      quadril: { x: 0, y: -98 },
      bracoF: { x: 30, y: -44 },
      bracoT: { x: -28, y: -44 },
      coxaF: { x: 12, y: 20 },
      coxaT: { x: -12, y: 20 },
    },
    defs: (
      <linearGradient id="jg-papel" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity=".7" />
        <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".35" />
      </linearGradient>
    ),
    partes: {
      capa: chefe ? (
        <path d="M-30,-34 C-46,10 -48,60 -40,96 L36,96 C42,60 40,10 30,-34Z" fill="#5B0E1F" stroke={TRACO} strokeWidth="2" />
      ) : null,
      tronco: (
        <g>
          {/* a própria folha de prova, com canto dobrado: é o corpo inteiro do golem */}
          <path d="M-30,24 L-30,-80 L14,-80 L32,-62 L32,24 Q0,30 -30,24Z" fill={cor} stroke={TRACO} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M-30,24 L-30,-80 L14,-80 L32,-62 L32,24 Q0,30 -30,24Z" fill="url(#jg-papel)" opacity=".5" />
          <path d="M14,-80 V-62 H32Z" fill="rgba(0,0,0,.3)" stroke={TRACO} strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="-22" y="-72" width="26" height="3" rx="1.5" fill="rgba(255,255,255,.55)" />
          <rect x="-22" y="-65" width="18" height="3" rx="1.5" fill="rgba(255,255,255,.4)" />
          {/* rosto (desenhado olhando para a direita; o vilão é espelhado para encarar o herói) */}
          <path d={brava ? "M-10,-56 L3,-48 M26,-56 L13,-48" : "M-10,-53 L3,-50 M26,-53 L13,-50"} stroke={TRACO} strokeWidth="3.4" strokeLinecap="round" />
          <g className="jg-pisca-olho">
            <circle cx="-3" cy="-40" r="6.5" fill={chefe ? "#FFE0E0" : "#fff"} stroke={TRACO} strokeWidth="1.4" />
            <circle cx="17" cy="-40" r="6.5" fill={chefe ? "#FFE0E0" : "#fff"} stroke={TRACO} strokeWidth="1.4" />
            <circle cx="0" cy="-39" r="3" fill={chefe ? "#B3101F" : TRACO} />
            <circle cx="20" cy="-39" r="3" fill={chefe ? "#B3101F" : TRACO} />
          </g>
          <path d={brava ? "M-2,-24 L3,-29 L8,-24 L13,-29 L18,-24" : "M0,-26 C5,-30 12,-30 17,-26"} fill="none" stroke={TRACO} strokeWidth="2.4" strokeLinejoin="round" />
          <g transform="scale(-1 1)">
            <text x="-1" y="10" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff" stroke={TRACO} strokeWidth="1" fontFamily="ui-monospace, monospace">
              {tipo.glifo}
            </text>
          </g>
          {nivel >= 4 && <path d="M-24,-80 L-19,-94 L-12,-80 M4,-80 L10,-94 L14,-80" fill={cor} stroke={TRACO} strokeWidth="1.5" />}
          {chefe && (
            <g transform="translate(-4,-82)">
              <path d="M-16,0 L-12,-16 L-5,-6 L0,-20 L5,-6 L12,-16 L16,0Z" fill="#FFC857" stroke={TRACO} strokeWidth="2" strokeLinejoin="round" />
              <circle cx="0" cy="-6" r="2.4" fill="#E8474C" />
            </g>
          )}
        </g>
      ),
      quadril: null,
      cabeca: null,
      bracoF: tinta(24),
      bracoT: tinta(24),
      anteF: tinta(22),
      anteT: tinta(22),
      maoF: (
        <g>
          {objetoDoTipo(tipo)}
          <circle cx="0" cy="3" r="6.5" fill="#fff" stroke={TRACO} strokeWidth="2" />
        </g>
      ),
      maoT: <circle cx="0" cy="3" r="6.5" fill="#fff" stroke={TRACO} strokeWidth="2" />,
      coxaF: tinta(38),
      coxaT: tinta(38),
      canelaF: tinta(36),
      canelaT: tinta(36),
      peF: <ellipse cx="4" cy="3" rx="9" ry="5" fill={TRACO} />,
      peT: <ellipse cx="4" cy="3" rx="9" ry="5" fill={TRACO} />,
    },
  };
}

// Nomes das formas dos heróis (evoluem nos níveis de lib/batalha: NIVEIS_EVOLUCAO)
export const HEROIS: Record<Tema, { formas: [string, string, string]; especies: [string, string, string]; golpeCerteza: string; golpeDuvida: string }> = {
  aranha: {
    formas: ["Aranha Novato", "Aranha", "Aranha-Escarlate"],
    especies: ["herói de moletom", "amigão da vizinhança", "lenda dos gibis"],
    golpeCerteza: "Voadora de Teia",
    golpeDuvida: "Disparo de Teia",
  },
  venom: {
    formas: ["Simbi", "Simbionte", "Venomorfo"],
    especies: ["simbionte filhote", "gosma faminta", "predador simbionte"],
    golpeCerteza: "Bote Simbionte",
    golpeDuvida: "Garra Viscosa",
  },
  cyberpunk: {
    formas: ["Dave", "Dave Cromado", "Dave Sandevistan"],
    especies: ["edgerunner novato", "braço de cromo", "rápido demais para Night City"],
    golpeCerteza: "Sandevistan",
    golpeDuvida: "Soco de Cromo",
  },
  fantasy: {
    formas: ["Cartógrafa Aprendiz", "Cartógrafa", "Atlas, a Cartomante"],
    especies: ["aprendiz de mapas", "guardiã das bússolas", "senhora das constelações"],
    golpeCerteza: "Chuva de Constelações",
    golpeDuvida: "Traço de Relevo",
  },
  rose: {
    formas: ["Escudeiro do Vento", "Cavaleiro do Vento", "Lugião"],
    especies: ["aprendiz das correntes", "cavaleiro das tempestades", "tempestade prateada"],
    golpeCerteza: "Mergulho do Furacão",
    golpeDuvida: "Rajada Prateada",
  },
};
