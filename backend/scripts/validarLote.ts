// Valida um lote de trilha dev-* com as regras de qualidade (src/lib/qualidadeLote.ts) e
// imprime o relatório. Sai com código 1 se houver erro. Não toca no banco.
//   npm run lote:validar -- prisma/lotes-dev/dev-python.json [--trilha dev-python] [--json]
// A trilha vem de --trilha, ou de "trilhaId" na raiz do lote; a ementa, de "ementa".
import { readFileSync } from "node:fs";
import { formatarRelatorio, validarQualidadeLote } from "../src/lib/qualidadeLote.js";

const args = process.argv.slice(2);
const caminho = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--trilha");
const iTrilha = args.indexOf("--trilha");
if (!caminho) {
  console.error("uso: validarLote.ts <lote.json> [--trilha dev-xxx] [--json]");
  process.exit(2);
}

const lote = JSON.parse(readFileSync(caminho, "utf8")) as {
  trilhaId?: string;
  ementa?: string[];
  questoes?: unknown[];
};
const trilhaId = (iTrilha >= 0 ? args[iTrilha + 1] : undefined) ?? lote.trilhaId;
if (!trilhaId) {
  console.error('informe a trilha: --trilha dev-xxx ou "trilhaId" na raiz do lote');
  process.exit(2);
}
if (!Array.isArray(lote.questoes)) {
  console.error('o lote não tem o array "questoes"');
  process.exit(2);
}

const relatorio = validarQualidadeLote({ trilhaId, ementa: lote.ementa, questoes: lote.questoes });
console.log(args.includes("--json") ? JSON.stringify(relatorio, null, 2) : formatarRelatorio(relatorio));
process.exit(relatorio.ok ? 0 : 1);
