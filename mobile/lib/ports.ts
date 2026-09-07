// Ports de armazenamento (SDD §4.1). O núcleo compartilhado entre web e mobile
// nunca conhece localStorage nem SQLite: ele recebe estas interfaces prontas.
//
// As leituras são SÍNCRONAS de propósito. api.ts monta a URL de cada requisição
// lendo o concurso ativo e o token no meio do fluxo; tornar isso assíncrono
// espalharia await por dezenas de assinaturas (SDD §6.1).
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface SecretStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}
