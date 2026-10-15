// Resultado do sandbox antes de sair para o cliente. O worker já limpa a saída, mas a API
// limpa de novo: o que vai para a tela é dado não confiável, e esta é a última barreira.
// Testes ocultos saem só com nome, passou/falhou, motivo e tempo — nunca entrada, saída
// esperada nem o stdout do programa (que poderia ecoar a entrada oculta).

const ANSI = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b[@-Z\\-_]/g;
const CONTROLE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g;
const MAX = 64 * 1024;

export function limparSaida(valor: unknown): string {
  if (typeof valor !== "string") return "";
  return valor.replace(/\r\n/g, "\n").replace(ANSI, "").replace(CONTROLE, "").slice(0, MAX);
}

const MOTIVOS = new Set(["passou", "saida_diferente", "tempo_esgotado", "erro_execucao", "limite_recursos"]);

type Bruto = Record<string, unknown>;

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// Monta o resultado público a partir do JSON gravado pelo worker, campo a campo (lista
// de permissão): campo novo no worker não vaza para o cliente sem passar por aqui.
export function resultadoPublico(resultado: unknown) {
  if (!resultado || typeof resultado !== "object") return null;
  const r = resultado as Bruto;
  const comp = r.compilacao as Bruto | null | undefined;
  const testes = Array.isArray(r.testes) ? (r.testes as Bruto[]) : [];
  const livre = r.livre as Bruto | undefined;
  return {
    compilacao: comp
      ? { ok: comp.ok === true, stderr: limparSaida(comp.stderr), tempoMs: num(comp.tempoMs) }
      : null,
    testes: testes.map((t, i) => {
      const base = {
        nome: limparSaida(t.nome).slice(0, 120) || `Teste ${i + 1}`,
        oculto: t.oculto !== false,
        passou: t.passou === true,
        motivo: MOTIVOS.has(String(t.motivo)) ? String(t.motivo) : "erro_execucao",
        tempoMs: num(t.tempoMs),
      };
      if (base.oculto) return base;
      return {
        ...base,
        entrada: limparSaida(t.entrada),
        esperado: limparSaida(t.esperado),
        stdout: limparSaida(t.stdout),
        stderr: limparSaida(t.stderr),
        cortado: t.cortado === true,
      };
    }),
    passou: num(r.passou),
    total: num(r.total),
    tempoMs: num(r.tempoMs),
    livre: livre
      ? {
          fase: livre.fase === "compilacao" ? "compilacao" : "execucao",
          codigo: typeof livre.codigo === "number" ? livre.codigo : null,
          stdout: limparSaida(livre.stdout),
          stderr: limparSaida(livre.stderr),
          motivo: MOTIVOS.has(String(livre.motivo)) ? String(livre.motivo) : "erro_execucao",
          tempoMs: num(livre.tempoMs),
        }
      : undefined,
    erroInterno: typeof r.erroInterno === "string" ? limparSaida(r.erroInterno) : undefined,
  };
}
