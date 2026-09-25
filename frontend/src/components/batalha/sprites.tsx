// Sprites da Batalha, em SVG: o parceiro muda com o tema do app e o inimigo é uma
// "questão selvagem" cuja cor e símbolo vêm da matéria.
import type { Tema } from "../../store/theme";

// ---------- parceiros ----------

export interface Parceiro {
  nome: string;
  especie: string;
  golpeCerteza: string;
  golpeDuvida: string;
}

export const PARCEIROS: Record<Tema, Parceiro> = {
  fantasy: { nome: "Relevoruja", especie: "coruja cartógrafa", golpeCerteza: "Traço de Relevo", golpeDuvida: "Bússola Cautelosa" },
  rose: { nome: "Lugito", especie: "guardião dos ventos", golpeCerteza: "Rajada Prateada", golpeDuvida: "Pena Suave" },
  cyberpunk: { nome: "Voltrix", especie: "raposa de neon", golpeCerteza: "Overclock", golpeDuvida: "Ping Seguro" },
  aranha: { nome: "Aracnino", especie: "herói da vizinhança", golpeCerteza: "Teia Certeira", golpeDuvida: "Sentido Aranha" },
  venom: { nome: "Simbi", especie: "simbionte filhote", golpeCerteza: "Mordida Simbionte", golpeDuvida: "Tentáculo Tateante" },
};

export function SpriteParceiro({ tema }: { tema: Tema }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <ellipse cx="60" cy="112" rx="34" ry="6" fill="rgba(0,0,0,.22)" />
      {tema === "fantasy" && <Relevoruja />}
      {tema === "rose" && <Lugito />}
      {tema === "cyberpunk" && <Voltrix />}
      {tema === "aranha" && <Aracnino />}
      {tema === "venom" && <Simbi />}
    </svg>
  );
}

function Relevoruja() {
  return (
    <g>
      <path d="M30 34 L40 14 L48 32 Z M90 34 L80 14 L72 32 Z" fill="#2800C9" />
      <ellipse cx="60" cy="68" rx="36" ry="42" fill="#2800C9" />
      <ellipse cx="60" cy="80" rx="24" ry="26" fill="#1A1060" />
      {/* curvas de nível na barriga */}
      <g fill="none" stroke="#C9C2FF" strokeWidth="1.4" opacity=".85">
        <path d="M44 84 C50 74 70 74 76 84 C70 94 50 94 44 84Z" />
        <path d="M50 84 C54 79 66 79 70 84 C66 89 54 89 50 84Z" />
        <path d="M40 98 C50 90 70 90 80 98" />
      </g>
      <circle cx="46" cy="52" r="13" fill="#fff" />
      <circle cx="74" cy="52" r="13" fill="#fff" />
      <circle cx="48" cy="53" r="6.5" fill="#6B5CFF" />
      <circle cx="72" cy="53" r="6.5" fill="#6B5CFF" />
      <circle cx="50" cy="51" r="2.2" fill="#fff" />
      <circle cx="74" cy="51" r="2.2" fill="#fff" />
      <path d="M56 62 L60 70 L64 62 Z" fill="#FFC857" />
      <path d="M24 70 C16 82 20 96 30 100 C30 88 30 78 26 70Z M96 70 C104 82 100 96 90 100 C90 88 90 78 94 70Z" fill="#1F0AA0" />
    </g>
  );
}

function Lugito() {
  return (
    <g>
      <path d="M22 70 C6 56 8 40 18 36 C22 50 30 58 40 62Z M98 70 C114 56 112 40 102 36 C98 50 90 58 80 62Z" fill="#DCE6FA" stroke="#7F9BD0" strokeWidth="2" />
      <path d="M86 92 C100 96 108 104 112 96 C104 94 98 88 92 84Z" fill="#DCE6FA" stroke="#7F9BD0" strokeWidth="2" />
      <ellipse cx="60" cy="72" rx="32" ry="36" fill="#F5F8FF" stroke="#7F9BD0" strokeWidth="2" />
      {/* placas das costas */}
      <path d="M44 38 L50 26 L56 38 Z M56 36 L62 22 L68 36 Z M66 38 L74 28 L76 40 Z" fill="#2B4C9B" />
      <ellipse cx="60" cy="86" rx="18" ry="16" fill="#E4ECFF" />
      {/* olhos com a máscara azul */}
      <path d="M34 52 C40 44 52 46 54 56 C46 60 38 58 34 52Z M86 52 C80 44 68 46 66 56 C74 60 82 58 86 52Z" fill="#2B4C9B" />
      <circle cx="46" cy="53" r="4.4" fill="#fff" />
      <circle cx="74" cy="53" r="4.4" fill="#fff" />
      <circle cx="47" cy="53" r="2.2" fill="#0B1F4F" />
      <circle cx="73" cy="53" r="2.2" fill="#0B1F4F" />
      <path d="M54 66 C58 69 62 69 66 66" fill="none" stroke="#2B4C9B" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Voltrix() {
  return (
    <g>
      <path d="M88 96 C108 92 114 72 104 60 C104 74 96 84 84 86Z" fill="#16151F" stroke="#FF2A6D" strokeWidth="2" />
      <path d="M104 60 L110 52 L106 66Z" fill="#FF2A6D" />
      <path d="M32 40 L38 10 L54 32 Z M88 40 L82 10 L66 32 Z" fill="#16151F" stroke="#FCEE0A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M26 58 C26 34 94 34 94 58 L88 100 C80 108 40 108 32 100 Z" fill="#1E1C2B" stroke="#FCEE0A" strokeWidth="2" strokeLinejoin="round" />
      <rect x="32" y="48" width="56" height="12" rx="3" fill="#00F0FF" />
      <rect x="36" y="51" width="14" height="6" rx="1" fill="#E6FFFF" />
      <rect x="70" y="51" width="14" height="6" rx="1" fill="#E6FFFF" />
      <path d="M46 74 H74 M50 80 H70" stroke="#FCEE0A" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 90 L48 90 L52 84 L60 96 L64 88 L80 88" fill="none" stroke="#FF2A6D" strokeWidth="2" strokeLinejoin="round" />
    </g>
  );
}

function Aracnino() {
  return (
    <g>
      <path d="M26 80 L10 70 M26 90 L8 92 M94 80 L110 70 M94 90 L112 92" stroke="#141018" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="60" cy="90" rx="30" ry="20" fill="#1446A0" stroke="#141018" strokeWidth="2.5" />
      <circle cx="60" cy="56" r="36" fill="#D4192C" stroke="#141018" strokeWidth="2.5" />
      {/* teia da máscara */}
      <g fill="none" stroke="#141018" strokeWidth="1" opacity=".7">
        <path d="M60 20 V92 M24 56 H96 M34 30 L86 82 M86 30 L34 82" />
        <circle cx="60" cy="56" r="12" />
        <circle cx="60" cy="56" r="24" />
      </g>
      <path d="M30 52 C34 38 52 38 54 54 C48 62 34 62 30 52Z M90 52 C86 38 68 38 66 54 C72 62 86 62 90 52Z" fill="#fff" stroke="#141018" strokeWidth="3" />
      <path d="M56 90 L60 84 L64 90 L60 96Z M52 86 L68 94 M68 86 L52 94" stroke="#141018" strokeWidth="1.6" fill="#141018" />
    </g>
  );
}

function Simbi() {
  return (
    <g>
      <path
        d="M22 100 C14 70 24 30 60 28 C96 30 106 70 98 100 C92 108 88 96 84 104 C78 112 74 100 68 106 C62 112 56 102 50 108 C42 112 40 100 34 106 C28 110 24 106 22 100Z"
        fill="#0B0C12"
        stroke="#3A4270"
        strokeWidth="1.5"
      />
      <path d="M40 36 C48 30 58 30 64 34" stroke="#5D6AA8" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".7" />
      <path d="M30 56 C34 40 50 42 54 58 C46 60 36 62 30 56Z M90 56 C86 40 70 42 66 58 C74 60 84 62 90 56Z" fill="#fff" />
      <path d="M38 74 C50 88 70 88 82 74 C72 80 48 80 38 74Z" fill="#fff" />
      <path d="M42 76 L45 82 L48 78 L51 84 L54 79 L57 85 L60 79 L63 85 L66 79 L69 84 L72 78 L75 82 L78 76" fill="none" stroke="#0B0C12" strokeWidth="1.4" />
      <path d="M58 84 C60 94 66 98 64 104" stroke="#C3163B" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
  );
}

// ---------- inimigos (questões selvagens) ----------

export interface TipoQuestao {
  nome: string;
  cor: string;
  glifo: string;
}

const TIPOS: [RegExp, TipoQuestao][] = [
  [/portug|redac|gramat|interpreta/, { nome: "Letra", cor: "#E07A5F", glifo: "Aa" }],
  [/ingl|english|idioma|espanh/, { nome: "Idioma", cor: "#3D7BD9", glifo: "En" }],
  // Lei antes de Dados: "Legislação (SI e Proteção de Dados)" é Lei.
  [/legisla|direito|\blei\b|etica|constitu|administra|regiment|estatuto/, { nome: "Lei", cor: "#C9A227", glifo: "§" }],
  [/logic|raciocin|matemat|estatist|quantitat/, { nome: "Lógica", cor: "#9B5DE5", glifo: "∴" }],
  [/banco|dados|sql|data/, { nome: "Dados", cor: "#1F9E89", glifo: "DB" }],
  [/inform|program|rede|sistema|engenharia|seguran|desenvolv|software|comput|\bti\b|nuvem|devops/, { nome: "Código", cor: "#12B886", glifo: "</>" }],
];
const GERAL: TipoQuestao = { nome: "Geral", cor: "#8D99AE", glifo: "?" };

export function tipoDaMateria(materia: string): TipoQuestao {
  const m = materia.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return TIPOS.find(([re]) => re.test(m))?.[1] ?? GERAL;
}

export function SpriteInimigo({ tipo, chefe }: { tipo: TipoQuestao; chefe: boolean }) {
  const escuro = "rgba(0,0,0,.35)";
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <ellipse cx="60" cy="112" rx="30" ry="5" fill="rgba(0,0,0,.22)" />
      {chefe && (
        <g fill={tipo.cor} opacity=".35">
          <circle cx="60" cy="60" r="52" />
        </g>
      )}
      {/* bracinhos */}
      <path d="M22 66 C12 62 10 52 14 48 M98 66 C108 62 110 52 106 48" stroke={tipo.cor} strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* corpo: uma folha de prova com canto dobrado */}
      <path d="M26 22 H82 L96 36 V96 C96 102 92 106 86 106 H34 C28 106 24 102 24 96 V26 C24 24 25 22 26 22Z" fill={tipo.cor} />
      <path d="M82 22 V36 H96Z" fill={escuro} />
      <rect x="32" y="30" width="44" height="3" rx="1.5" fill="rgba(255,255,255,.45)" />
      <rect x="32" y="37" width="30" height="3" rx="1.5" fill="rgba(255,255,255,.35)" />
      {/* olhos zangados */}
      <path d="M36 50 L52 56 M84 50 L68 56" stroke="#141018" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="45" cy="62" r="6" fill="#fff" />
      <circle cx="75" cy="62" r="6" fill="#fff" />
      <circle cx="46" cy="63" r="3" fill="#141018" />
      <circle cx="74" cy="63" r="3" fill="#141018" />
      <text x="60" y="94" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff" fontFamily="ui-monospace, monospace">
        {tipo.glifo}
      </text>
      {chefe && (
        <path d="M34 22 L40 6 L50 18 L60 2 L70 18 L80 6 L86 22Z" fill="#FFC857" stroke="#141018" strokeWidth="2" strokeLinejoin="round" />
      )}
    </svg>
  );
}
