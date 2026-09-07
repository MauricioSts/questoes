// Polyfill de `crypto.randomUUID` para o Hermes.
//
// Por que existe: `lib/correcao.ts` é cópia LITERAL do web (SDD §9.1) e gera o
// clientId assim:
//
//   if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
//   return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
//
// O Hermes não expõe `crypto`, então o mobile caía no fallback. Esse id é a chave de
// deduplicação da fila offline (`Answer.clientId @unique` no backend): com
// `Date.now()` + 8 caracteres de `Math.random()`, dois aparelhos que respondem no
// mesmo milissegundo podem colidir, e o backend descartaria a segunda resposta como
// duplicata. Raro, mas é perda silenciosa de dado do usuário.
//
// Preencher o global em vez de editar `correcao.ts` mantém a cópia literal — o
// arquivo continua idêntico ao do web e o script de sincronia segue passando.
import * as Crypto from "expo-crypto";

type UUID = `${string}-${string}-${string}-${string}-${string}`;

const g = globalThis as unknown as { crypto?: { randomUUID?: () => UUID } };

if (!g.crypto) g.crypto = {};

if (typeof g.crypto.randomUUID !== "function") {
  g.crypto.randomUUID = () => Crypto.randomUUID() as UUID;
}
