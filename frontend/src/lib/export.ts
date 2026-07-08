// Exporta o progresso do usuário como arquivo JSON (backup).
import { api } from "./api";

export async function exportarProgresso(): Promise<void> {
  const dados = await api<unknown>("/answers/export");
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `progresso-questoes-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
