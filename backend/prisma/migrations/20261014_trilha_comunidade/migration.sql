-- Trilhas criadas por usuários: dono e visibilidade. As existentes ficam oficiais (sem dono).
ALTER TABLE "Trilha" ADD COLUMN "donoId" TEXT;
ALTER TABLE "Trilha" ADD COLUMN "visibilidade" TEXT NOT NULL DEFAULT 'publica';
ALTER TABLE "Trilha" ADD CONSTRAINT "Trilha_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Trilha_donoId_idx" ON "Trilha"("donoId");
