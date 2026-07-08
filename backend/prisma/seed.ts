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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
