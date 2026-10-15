// Declarações mínimas do Node para o tsc do sandbox. Os tipos completos (@types/node)
// estouravam a memória do container e levavam ~8 s para checar um arquivo de uma linha.
declare const console: {
  log(...dados: unknown[]): void;
  error(...dados: unknown[]): void;
  warn(...dados: unknown[]): void;
  info(...dados: unknown[]): void;
  table(dados: unknown): void;
};
declare const process: {
  argv: string[];
  exitCode: number | undefined;
  exit(codigo?: number): never;
  stdout: { write(texto: string): boolean };
  stderr: { write(texto: string): boolean };
  nextTick(fn: (...args: unknown[]) => void, ...args: unknown[]): void;
};
declare function require(modulo: "fs"): { readFileSync(fd: 0 | string, codificacao: "utf8"): string };
declare function setTimeout(fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): number;
declare function clearTimeout(id: number | undefined): void;
declare function setInterval(fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): number;
declare function clearInterval(id: number | undefined): void;
declare function queueMicrotask(fn: () => void): void;
declare function structuredClone<T>(valor: T): T;
