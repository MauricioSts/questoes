import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL ?? "contatomauriciosts@gmail.com";
  const senha = process.env.SEED_PASSWORD ?? "troque-esta-senha";
  const nome = process.env.SEED_NOME ?? "Mauricio";

  const passwordHash = await bcrypt.hash(senha, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, nome },
  });

  console.log(`Usuário inicial pronto: ${user.email} (id: ${user.id})`);

  // Concurso padrão (Dataprev) para o usuário — o app é multi-concurso e sempre
  // precisa de ao menos um concurso ativo. Id determinístico ("seed_<userId>")
  // para casar com o backfill da migração multi_concurso.
  const concursoId = `seed_${user.id}`;
  await prisma.concurso.upsert({
    where: { id: concursoId },
    update: {},
    create: {
      id: concursoId,
      userId: user.id,
      nome: "Dataprev — Analista de TI",
      iniciais: "TI",
      banca: "FGV",
      ano: 2026,
      cargo: "Analista de TI",
      dataProva: user.dataProva ?? new Date(Date.now() + 120 * 864e5),
      metaDiaria: user.metaDiaria ?? 70,
    },
  });
  console.log(`Concurso padrão pronto: ${concursoId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
