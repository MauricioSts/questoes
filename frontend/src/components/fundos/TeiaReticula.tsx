// Fundo do tema Aranha: página de gibi impressa. Tudo num shader só:
// - papel jornal com fibra (ruído fixo por pixel, não anda: grão que cintila cansa a vista);
// - duas retículas de impressão, vermelha a 15° e azul a 45°, com o tom de cada ponto
//   vindo de um ruído que deriva devagar — os pontos crescem e encolhem como se a página
//   respirasse. O tom é zero no miolo da tela (onde vive o texto) e sobe para as bordas;
// - a teia: raios + fios em corda entre eles (o fio real é reto de raio a raio e cede um
//   pouco no meio), presa fora da tela no canto de cima à direita, balançando de leve;
//   uma teia menor no canto oposto;
// - o sentido-aranha: a cada 7 s uma onda sai do centro da teia e incha a retícula por
//   onde passa.
import ShaderTela from "./ShaderTela";
import { RUIDO } from "./glsl";

const fragment = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uDpr;
out vec4 fragColor;
${RUIDO}

const float PI = 3.14159265;
const vec3 PAPEL = vec3(0.960, 0.929, 0.870);
const vec3 TINTA = vec3(0.078, 0.063, 0.094);
const vec3 VERMELHO = vec3(0.86, 0.12, 0.19);
const vec3 AZUL = vec3(0.10, 0.30, 0.66);

vec2 TELA;       // tamanho em px de CSS
vec2 CENTRO_TEIA;

// Onda do sentido-aranha: anel que sai do centro da teia a cada 7 s.
float sentido(vec2 p) {
  float ciclo = mod(uTime, 7.0);
  float raio = ciclo * 520.0;
  float d = length(p - CENTRO_TEIA);
  float anel = exp(-pow((d - raio) / 90.0, 2.0));
  return anel * smoothstep(7.0, 3.5, ciclo);
}

float tom(vec2 p, int canal) {
  vec2 uv = p / TELA;
  float t = uTime;
  if (canal == 0) {
    float borda = smoothstep(0.34, 1.02, length((uv - vec2(0.46, 0.55)) * vec2(1.3, 1.0)) * 1.3);
    float n = fbm(p * 0.0042 + vec2(t * 0.045, -t * 0.03));
    return borda * (0.25 + 1.05 * n) + sentido(p) * 0.45 * (0.3 + borda);
  }
  float borda = smoothstep(0.42, 1.08, length((uv - vec2(0.6, 0.6)) * vec2(1.25, 1.0)) * 1.35);
  float n = fbm(p * 0.0036 + vec2(-t * 0.035, t * 0.04) + 9.1);
  return borda * (0.1 + 0.95 * n) * 0.85;
}

// Ponto da retícula que cobre p: grade girada; o raio sai do tom no centro da célula
// (sqrt: a área do ponto é que é proporcional ao tom, como na gráfica).
float reticula(vec2 p, float ang, float passo, int canal) {
  float c = cos(ang), s = sin(ang);
  mat2 m = mat2(c, -s, s, c);
  vec2 q = m * p;
  vec2 centro = (floor(q / passo) + 0.5) * passo;
  float valor = clamp(tom(transpose(m) * centro, canal), 0.0, 1.0);
  float r = passo * 0.56 * sqrt(valor);
  float d = length(q - centro);
  float aa = 0.75 / uDpr + 0.35;
  return 1.0 - smoothstep(r - aa, r + aa, d);
}

// Teia com centro em c. Devolve a cobertura do traço (0..1).
float teia(vec2 p, vec2 c, float alcance, float raios, float fase) {
  vec2 v = p - c;
  float r = length(v);
  // balanço: os raios giram um fio, mais longe do centro mais solto
  float a = atan(v.y, v.x) + 0.014 * sin(uTime * 0.7 + fase) * (r / alcance);
  r *= 1.0 + 0.006 * sin(uTime * 0.9 + fase + r * 0.004);
  float seg = 2.0 * PI / raios;
  float f = a / seg;
  float phi = fract(f);
  float idx = floor(f);

  float w = 0.62; // meia largura do fio, px
  float aa = 0.6 / uDpr + 0.25;
  float dRaio = min(phi, 1.0 - phi) * seg * r;
  float linhaRaio = 1.0 - smoothstep(w - aa, w + aa, dRaio);

  // Fio em corda de um raio ao outro, cedendo no meio.
  float req = r * cos((phi - 0.5) * seg) / cos(seg * 0.5);
  req *= 1.0 + 0.045 * sin(PI * phi);
  float k = log(1.17);
  float q = log(max(req, 1.0) / 26.0) / k;
  q += 0.18 * (hash21(vec2(idx, floor(q))) - 0.5);
  float dq = abs(q - floor(q + 0.5));
  float dFio = dq * req * k;
  float linhaFio = (1.0 - smoothstep(w - aa, w + aa, dFio)) * step(0.0, q);

  float somem = 1.0 - smoothstep(alcance * 0.72, alcance, r);
  return max(linhaRaio, linhaFio) * somem * smoothstep(8.0, 30.0, r);
}

void main() {
  TELA = uResolution / uDpr;
  vec2 p = gl_FragCoord.xy / uDpr;
  CENTRO_TEIA = vec2(TELA.x + 26.0, TELA.y + 34.0);

  vec3 col = PAPEL;
  // fibra do papel: manchas grandes + grão fino, ambos fixos
  col *= 0.975 + 0.035 * fbm(p * 0.012);
  col *= 0.985 + 0.03 * hash21(floor(p));

  float azul = reticula(p + vec2(1.3, -0.9), radians(45.0), 11.0, 1);
  float verm = reticula(p, radians(15.0), 9.0, 0);
  // sobreimpressão: a tinta multiplica o papel (azul sobre vermelho = roxo escuro)
  col *= mix(vec3(1.0), AZUL * 1.55, azul * 0.78);
  col *= mix(vec3(1.0), VERMELHO * 1.12, verm * 0.86);

  float alcance = TELA.y * 0.82 + TELA.x * 0.22;
  float tinta = teia(p, CENTRO_TEIA, alcance, 30.0, 0.0) * 0.62;
  tinta = max(tinta, teia(p, vec2(-54.0, -40.0), TELA.y * 0.5, 26.0, 2.1) * 0.38);
  col = mix(col, TINTA, tinta);

  fragColor = vec4(col, 1.0);
}
`;

export default function TeiaReticula({ paused = false }: { paused?: boolean }) {
  return <ShaderTela fragment={fragment} paused={paused} tempoParado={3.2} />;
}
