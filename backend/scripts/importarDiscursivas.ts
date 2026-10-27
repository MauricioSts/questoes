// Importa um lote de temas de discursiva para uma trilha, um por terça: o primeiro na
// terça livre seguinte à última já agendada (ou na de hoje, se a fila estiver vazia e
// hoje for terça), os demais nas semanas seguintes. Limites e valor saem do perfil da
// trilha quando o tema não traz os seus.
//   npm run discursivas:importar -- lote.json [--seco] [--primeira=2026-11-03]
// lote.json: { "trilhaId": "tjpb-2026-dev",
//              "temas": [{ "titulo": "...", "enunciado": "...", "padraoResposta": "..."? }] }
import { readFileSync } from "node:fs";
import { z } from "zod";
import { prisma } from "../src/prisma.js";
import { conferirPerfil, regraDiscursiva } from "../src/lib/perfilTrilha.js";
import { primeiraTercaLivre, tercaAPartirDe, tercasSeguidas } from "../src/lib/agendaDiscursiva.js";
import { localDateKey } from "../src/lib/date.js";

const loteSchema = z.object({
  trilhaId: z.string().min(1),
  temas: z
    .array(
      z.object({
        titulo: z.string().trim().min(1).max(200),
        enunciado: z.string().trim().min(1).max(20_000),
        padraoResposta: z.string().trim().min(1).max(20_000).optional(),
        valor: z.number().positive().max(1000).optional(),
      })
    )
    .min(1),
});

const [caminho, ...flags] = process.argv.slice(2);
if (!caminho) throw new Error("uso: importarDiscursivas.ts <lote.json> [--seco] [--primeira=AAAA-MM-DD]");
const { trilhaId, temas } = loteSchema.parse(JSON.parse(readFileSync(caminho, "utf8")));
const seco = flags.includes("--seco");
const primeiraFlag = flags.find((f) => f.startsWith("--primeira="))?.slice("--primeira=".length);

const trilha = await prisma.trilha.findUnique({
  where: { id: trilhaId },
  select: { id: true, perfilProva: { select: { dados: true } } },
});
if (!trilha) throw new Error(`trilha ${trilhaId} não existe`);
const conferido = trilha.perfilProva ? conferirPerfil(trilha.perfilProva.dados) : null;
if (conferido && !conferido.ok) throw new Error(`perfil da trilha malformado: ${conferido.erro}`);
const regra = regraDiscursiva(conferido?.ok ? conferido.perfil : null);
if (!regra) throw new Error(`a trilha ${trilhaId} não tem discursiva no perfil`);

// Enunciado repetido (mesmo lote mandado duas vezes) não entra de novo.
const existentes = await prisma.discursiva.findMany({
  where: { trilhaId },
  select: { enunciado: true, liberaEm: true, ordem: true },
});
const jaTem = new Set(existentes.map((e) => e.enunciado.trim()));
const novos = temas.filter((t) => !jaTem.has(t.enunciado));
const repetidos = temas.length - novos.length;

const ultima = existentes.reduce<Date | null>((m, e) => (e.liberaEm && (!m || e.liberaEm > m) ? e.liberaEm : m), null);
const primeira = primeiraFlag ? tercaAPartirDe(new Date(`${primeiraFlag}T12:00:00Z`)) : primeiraTercaLivre(ultima);
const datas = tercasSeguidas(primeira, novos.length);
let ordem = existentes.reduce((m, e) => Math.max(m, e.ordem + 1), 0);

for (const [i, t] of novos.entries()) {
  console.log(`${localDateKey(datas[i])}  ${t.titulo}`);
}
if (repetidos) console.log(`(${repetidos} tema(s) já cadastrados, ignorados)`);
if (seco) {
  console.log("--seco: nada gravado.");
} else {
  for (const [i, t] of novos.entries()) {
    await prisma.discursiva.create({
      data: {
        trilhaId,
        titulo: t.titulo,
        enunciado: t.enunciado,
        padraoResposta: t.padraoResposta ?? null,
        maxLinhas: regra.maxLinhas,
        caracteresPorLinha: regra.caracteresPorLinha,
        valor: t.valor ?? regra.valor,
        ordem: ordem++,
        liberaEm: datas[i],
      },
    });
  }
  console.log(`${novos.length} tema(s) gravados.`);
}
await prisma.$disconnect();
