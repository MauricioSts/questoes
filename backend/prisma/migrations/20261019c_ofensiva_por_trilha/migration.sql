-- Ofensiva e modo férias por concurso (trilha). Períodos antigos ficam com concursoId null e
-- continuam valendo para todos os concursos do usuário.
-- AlterTable
ALTER TABLE "Concurso" ADD COLUMN     "feriasAtivo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FeriasPeriodo" ADD COLUMN     "concursoId" TEXT;

-- CreateIndex
CREATE INDEX "FeriasPeriodo_userId_concursoId_idx" ON "FeriasPeriodo"("userId", "concursoId");

