-- Meta fixa por matéria do dia: as 10 questões sorteadas para aquele dia.
CREATE TABLE "MetaMateriaDia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "concursoId" TEXT,
    "dia" TIMESTAMP(3) NOT NULL,
    "materia" TEXT NOT NULL,
    "questaoIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaMateriaDia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaMateriaDia_userId_concursoId_dia_key" ON "MetaMateriaDia"("userId", "concursoId", "dia");
CREATE INDEX "MetaMateriaDia_userId_dia_idx" ON "MetaMateriaDia"("userId", "dia");

ALTER TABLE "MetaMateriaDia" ADD CONSTRAINT "MetaMateriaDia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
