// Troca o conteúdo de TI provisório do perfil do TJPB pelo oficial (Anexo I do edital).
// No PerfilProva do banco: as disciplinas com conteudo_oficial=false saem, as do arquivo
// entram marcadas como oficiais e o aviso_conteudo_provisorio some. Depois reclassifica os
// vínculos da trilha: o que continua válido (mesma disciplina + tópico) fica, o que está
// no --mapa muda para o destino, e o resto é LISTADO como órfão, sem apagar nada.
// Idempotente: rodar de novo com o mesmo arquivo não muda nada.
//   npx tsx scripts/atualizarConteudoTjpb.ts conteudo.json [--mapa mapa.json] [--seco]
//     [--perfil-arquivo[=../docs/perfis/tjpb-2026-dev.json]] [--trilha tjpb-2026-dev]
// conteudo.json: { "disciplinas": [{ "nome", "itens": n|null, "topicos": [{ "numero", "texto" }] }] }
//   ou a lista plana [{ "disciplina", "numero", "texto" }].
// mapa.json: { "<disciplina>|<tópico antigo>": { "materia": "...", "topico": "..." } }
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/prisma.js";
import { atualizarConteudo, lerConteudoOficial, lerPerfil, type MapaReclassificacao } from "../src/lib/perfilTrilha.js";

const PERFIL_ARQUIVO_PADRAO = fileURLToPath(new URL("../../docs/perfis/tjpb-2026-dev.json", import.meta.url));

const args = process.argv.slice(2);
const valor = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const caminho = args.find((a, i) => !a.startsWith("--") && !["--mapa", "--trilha"].includes(args[i - 1]));
if (!caminho) {
  throw new Error("uso: atualizarConteudoTjpb.ts <conteudo.json> [--mapa mapa.json] [--seco] [--perfil-arquivo[=caminho]] [--trilha id]");
}
const seco = args.includes("--seco");
const trilhaId = valor("--trilha") ?? "tjpb-2026-dev";
const flagArquivo = args.find((a) => a === "--perfil-arquivo" || a.startsWith("--perfil-arquivo="));
const perfilArquivo = flagArquivo ? (flagArquivo.split("=")[1] || PERFIL_ARQUIVO_PADRAO) : null;

const novas = lerConteudoOficial(JSON.parse(readFileSync(caminho, "utf8")));
const caminhoMapa = valor("--mapa");
const mapa: MapaReclassificacao = caminhoMapa
  ? z.record(z.object({ materia: z.string().min(1), topico: z.string().min(1) })).parse(JSON.parse(readFileSync(caminhoMapa, "utf8")))
  : {};

const trilha = await prisma.trilha.findUnique({ where: { id: trilhaId }, select: { id: true, perfilProva: true } });
if (!trilha?.perfilProva) throw new Error(`trilha ${trilhaId} não existe ou não tem perfil de prova`);
const perfilProva = trilha.perfilProva;

const vinculos = await prisma.questaoTrilha.findMany({
  where: { trilhaId },
  select: { questaoId: true, materia: true, topico: true },
  orderBy: { questaoId: "asc" },
});
const r = atualizarConteudo(lerPerfil(perfilProva.dados), novas, vinculos, mapa);

if (!seco) {
  await prisma.$transaction([
    prisma.perfilProva.update({ where: { id: perfilProva.id }, data: { dados: r.perfil as Prisma.InputJsonValue } }),
    ...r.remapeados.map((m) =>
      prisma.questaoTrilha.update({
        where: { questaoId_trilhaId: { questaoId: m.questaoId, trilhaId } },
        data: { materia: m.para.materia, topico: m.para.topico },
      })
    ),
  ]);
  // O arquivo passa pela mesma troca a partir do PRÓPRIO conteúdo (não do banco): o jsonb
  // reordena as chaves, e o docs/perfis tem de continuar legível no diff.
  if (perfilArquivo) {
    const doArquivo = atualizarConteudo(lerPerfil(JSON.parse(readFileSync(perfilArquivo, "utf8"))), novas, [], mapa);
    writeFileSync(perfilArquivo, JSON.stringify(doArquivo.perfil, null, 2) + "\n");
  }
}

const prefixo = seco ? "[seco] " : "";
console.log(`${prefixo}perfil ${perfilProva.id}, grupo ${r.grupo}`);
console.log(`  saíram: ${r.removidas.join("; ") || "-"}`);
console.log(`  entraram: ${r.adicionadas.join("; ")}`);
console.log(`${prefixo}vínculos: ${vinculos.length} na trilha, ${r.mantidos} mantidos, ${r.remapeados.length} remapeados, ${r.orfaos.length} órfãos`);
for (const m of r.remapeados) console.log(`  remapeado ${m.questaoId}: ${m.de} → ${m.para.materia}|${m.para.topico}`);
if (r.orfaos.length) {
  console.log("\nÓrfãos (continuam na trilha; reclassifique com --mapa ou PUT /trilhas/:trilhaId/vinculos/:questaoId):");
  for (const o of r.orfaos) console.log(`  ${o.questaoId}  ${o.materia ?? "-"}|${o.topico}  (${o.erro})`);
}
if (perfilArquivo) console.log(`${seco ? "[seco] não regravado" : "regravado"}: ${perfilArquivo}`);
await prisma.$disconnect();
