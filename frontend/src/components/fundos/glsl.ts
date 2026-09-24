// Ruído compartilhado pelos shaders dos temas Aranha e Venom: value noise 2D com
// interpolação quíntica (sem as quinas da cúbica, que viram "losangos" no brilho do
// simbionte) e fbm de 5 oitavas com rotação entre elas (quebra o alinhamento na grade).
export const RUIDO = `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
const mat2 GIRO = mat2(0.8, 0.6, -0.6, 0.8);
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * ruido(p);
    p = GIRO * p * 2.02 + 17.0;
    a *= 0.5;
  }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * ruido(p);
    p = GIRO * p * 2.03 + 17.0;
    a *= 0.5;
  }
  return v;
}
`;
