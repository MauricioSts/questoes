// Fundo do tema Venom: o simbionte vivo nas bordas da tela.
// - Um campo por fbm com distorção de domínio (o ruído deforma o próprio ruído) dá a
//   massa; a borda sobe em perfil de gota grossa e a normal sai de diferenças finitas do
//   próprio campo. O brilho é verniz: um céu falso refletido + dois especulares duros, no
//   azul-frio dos gibis do Venom.
// - A massa ocupa as bordas e estende tentáculos para dentro; o miolo, onde fica o
//   texto, é preto quase liso.
// - Batimento: duas batidas (tum-tum) a cada 1,7 s incham a massa um fio.
// - Veias carmim, muito baixas, correm por dentro da massa.
// Resolução reduzida (0,55x): o campo é avaliado três vezes por pixel; como é tudo
// orgânico, a nitidez não faz falta e o custo cai a um terço.
import ShaderTela from "./ShaderTela";
import { RUIDO } from "./glsl";

const fragment = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uDpr;
out vec4 fragColor;
${RUIDO}

float batida(float t) {
  float f = fract(t / 1.7);
  return exp(-pow(f * 16.0, 2.0)) + 0.65 * exp(-pow((f - 0.17) * 16.0, 2.0));
}

float T;
float PULSO;

// Campo do simbionte: distância ao centro deformada por ruído com distorção de domínio,
// mais tentáculos por ruído angular. Acima de ~0.42 é massa.
float campoEm(vec2 uv) {
  vec2 b = uv * 1.5;
  vec2 q = vec2(fbm3(b + vec2(0.0, T)), fbm3(b + vec2(5.2, 1.3) - T));
  vec2 r = vec2(fbm3(b + 3.0 * q + vec2(1.7, 9.2) + T * 1.4), fbm3(b + 3.0 * q + vec2(8.3, 2.8) - T * 0.8));
  float h = fbm3(b + 2.6 * r);
  float ang = atan(uv.y, uv.x);
  float tent = fbm3(vec2(ang * 2.2, uTime * 0.05)) - 0.5;
  float dist = length(uv * vec2(0.82, 1.08));
  return dist + (h - 0.5) * 0.6 + tent * 0.45 + PULSO;
}

// Perfil de gota grossa: a borda sobe arredondada (sqrt) e o miolo da massa é quase plano.
float alturaEm(vec2 uv) {
  float s = clamp((campoEm(uv) - 0.41) / 0.2, 0.0, 1.0);
  return sqrt(s) * 0.12;
}

void main() {
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
  T = uTime * 0.06;
  PULSO = batida(uTime) * 0.03;

  float e = 2.5 / res.y;
  float c0 = campoEm(uv);
  float h0 = sqrt(clamp((c0 - 0.41) / 0.2, 0.0, 1.0)) * 0.12;
  float hx = alturaEm(uv + vec2(e, 0.0));
  float hy = alturaEm(uv + vec2(0.0, e));
  vec3 n = normalize(vec3(-(hx - h0) / e, -(hy - h0) / e, 1.0));
  float massa = smoothstep(0.40, 0.44, c0);

  // Brilho de verniz: um céu falso refletido (o reflexo que sobe vira faixa clara) mais
  // dois pontos especulares duros. É o que faz o preto parecer molhado.
  vec3 olho = vec3(0.0, 0.0, 1.0);
  vec3 refl = reflect(-olho, n);
  float ceu = smoothstep(0.25, 0.85, refl.y) * smoothstep(-0.2, 0.5, refl.x + 0.3);
  vec3 luz1 = normalize(vec3(-0.5, 0.7, 0.55));
  vec3 luz2 = normalize(vec3(0.7, -0.35, 0.6));
  float esp1 = pow(max(dot(reflect(-luz1, n), olho), 0.0), 70.0);
  float esp2 = pow(max(dot(reflect(-luz2, n), olho), 0.0), 40.0);
  float fresnel = pow(1.0 - n.z, 3.0);

  vec3 col = vec3(0.010, 0.010, 0.016);
  vec3 corpo = vec3(0.016, 0.018, 0.028);
  col = mix(col, corpo, massa);
  col += vec3(0.42, 0.52, 0.85) * ceu * 0.4 * massa;
  col += vec3(0.85, 0.9, 1.0) * esp1 * 0.9 * massa;
  col += vec3(0.45, 0.58, 1.0) * esp2 * 0.35 * massa;
  col += vec3(0.2, 0.28, 0.6) * fresnel * 0.4 * massa;

  // veias carmim, largas e baixas, batendo junto com o coração
  float veia = 1.0 - smoothstep(0.0, 0.035, abs(fbm3(uv * 3.2 + vec2(T, -T)) - 0.5));
  col += vec3(0.5, 0.02, 0.09) * veia * smoothstep(0.5, 0.7, c0) * 0.16 * (0.5 + batida(uTime));

  // miolo: um sopro azulado que deixa o preto com profundidade
  float miolo = 1.0 - smoothstep(0.0, 0.55, length(uv));
  col += vec3(0.012, 0.016, 0.034) * miolo;

  fragColor = vec4(col, 1.0);
}
`;

export default function Simbionte({ paused = false }: { paused?: boolean }) {
  return <ShaderTela fragment={fragment} paused={paused} tempoParado={14} escala={0.55} />;
}
