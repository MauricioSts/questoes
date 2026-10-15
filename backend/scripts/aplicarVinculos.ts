// Aplica um arquivo de vínculos questão↔trilha (prisma/vinculos/*.json) no banco.
// Idempotente: cria o que falta, atualiza o tópico do que já existe e, com --podar, apaga
// vínculos daquelas trilhas que saíram do arquivo. Nunca mexe em Questao: a questão
// continua dona da trilha de origem (a Dataprev segue intacta).
//   npx tsx scripts/aplicarVinculos.ts prisma/vinculos/dataprev-dev.json [--podar] [--seco]
import { readFileSync } from "node:fs";
import { z } from "zod";
import { prisma } from "../src/prisma.js";

const arquivoSchema = z.object({
  origem: z.string().min(1),
  vinculos: z.array(z.object({ questaoId: z.number().int(), trilhaId: z.string().min(1), topico: z.string().min(1) })),
});

const [caminho, ...flags] = process.argv.slice(2);
if (!caminho) throw new Error("uso: aplicarVinculos.ts <arquivo.json> [--podar] [--seco]");
const { origem, vinculos } = arquivoSchema.parse(JSON.parse(readFileSync(caminho, "utf8")));
const seco = flags.includes("--seco");

const ids = [...new Set(vinculos.map((v) => v.questaoId))];
const questoes = await prisma.questao.findMany({ where: { id: { in: ids } }, select: { id: true, trilhaId: true } });
const donaDe = new Map(questoes.map((q) => [q.id, q.trilhaId]));
const faltando = ids.filter((id) => !donaDe.has(id));
const deOutraOrigem = ids.filter((id) => donaDe.has(id) && donaDe.get(id) !== origem);
if (faltando.length || deOutraOrigem.length) {
  throw new Error(`questões inexistentes: ${faltando.join(",") || "-"}; fora da origem ${origem}: ${deOutraOrigem.join(",") || "-"}`);
}
const trilhas = [...new Set(vinculos.map((v) => v.trilhaId))];
const existentes = await prisma.trilha.findMany({ where: { id: { in: trilhas } }, select: { id: true } });
const semTrilha = trilhas.filter((t) => !existentes.some((e) => e.id === t));
if (semTrilha.length) throw new Error(`trilhas inexistentes: ${semTrilha.join(", ")}`);
if (trilhas.includes(origem)) throw new Error("vínculo para a própria trilha de origem duplicaria a contagem");

const chave = (q: number, t: string) => `${q}|${t}`;
const noArquivo = new Set(vinculos.map((v) => chave(v.questaoId, v.trilhaId)));
const atuais = await prisma.questaoTrilha.findMany({
  where: { trilhaId: { in: trilhas }, questao: { trilhaId: origem } },
  select: { questaoId: true, trilhaId: true },
});
const sobrando = atuais.filter((a) => !noArquivo.has(chave(a.questaoId, a.trilhaId)));

if (!seco) {
  await prisma.$transaction([
    ...vinculos.map((v) =>
      prisma.questaoTrilha.upsert({
        where: { questaoId_trilhaId: { questaoId: v.questaoId, trilhaId: v.trilhaId } },
        update: { topico: v.topico, materia: v.topico },
        create: { questaoId: v.questaoId, trilhaId: v.trilhaId, topico: v.topico, materia: v.topico },
      })
    ),
    ...(flags.includes("--podar")
      ? [prisma.questaoTrilha.deleteMany({ where: { OR: sobrando.map((s) => ({ questaoId: s.questaoId, trilhaId: s.trilhaId })) } })]
      : []),
  ]);
}

const relatorio = await prisma.questaoTrilha.groupBy({
  by: ["trilhaId", "topico"],
  where: { trilhaId: { in: trilhas } },
  _count: { _all: true },
  orderBy: [{ trilhaId: "asc" }, { topico: "asc" }],
});
console.log(`${seco ? "[seco] " : ""}${vinculos.length} vínculos no arquivo, ${ids.length} questões; fora do arquivo: ${sobrando.length}${flags.includes("--podar") && !seco ? " (apagados)" : ""}`);
let atual = "";
for (const r of relatorio) {
  if (r.trilhaId !== atual) {
    atual = r.trilhaId;
    const total = relatorio.filter((x) => x.trilhaId === atual).reduce((s, x) => s + x._count._all, 0);
    console.log(`\n${atual}: ${total}`);
  }
  console.log(`  ${String(r._count._all).padStart(3)}  ${r.topico}`);
}
await prisma.$disconnect();
