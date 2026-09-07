// Adapter de SecretStore sobre o Keychain (iOS) / Keystore (Android).
//
// expo-secure-store só tem API assíncrona, e o port exige leitura síncrona.
// Solução do SDD §6.1: espelho em memória hidratado uma única vez no arranque,
// antes de a árvore renderizar; a escrita atualiza o espelho na hora e persiste
// em segundo plano.
import * as SecureStore from "expo-secure-store";
import type { SecretStore } from "./ports";

export const CHAVE_ACCESS = "q_access";
export const CHAVE_REFRESH = "q_refresh";

const CHAVES = [CHAVE_ACCESS, CHAVE_REFRESH];

const espelho = new Map<string, string>();

/** Chamado uma vez no bootstrap, com a splash segurada até resolver. */
export async function hidratarSegredos(): Promise<void> {
  const lidos = await Promise.all(
    CHAVES.map(async (k) => [k, await SecureStore.getItemAsync(k)] as const)
  );
  for (const [k, v] of lidos) if (v != null) espelho.set(k, v);
}

export const segredos: SecretStore = {
  get: (k) => espelho.get(k) ?? null,
  set: (k, v) => {
    espelho.set(k, v);
    void SecureStore.setItemAsync(k, v);
  },
  remove: (k) => {
    espelho.delete(k);
    void SecureStore.deleteItemAsync(k);
  },
};
