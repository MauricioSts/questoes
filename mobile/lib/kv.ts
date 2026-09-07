// Adapter de KeyValueStore. expo-sqlite/kv-store expõe uma API síncrona real
// (getItemSync/setItemSync), então aqui não é preciso cache nenhum: o mapeamento
// para o port é direto.
import Storage from "expo-sqlite/kv-store";
import type { KeyValueStore } from "./ports";

export const kv: KeyValueStore = {
  get: (k) => Storage.getItemSync(k),
  set: (k, v) => Storage.setItemSync(k, v),
  remove: (k) => {
    Storage.removeItemSync(k);
  },
};
