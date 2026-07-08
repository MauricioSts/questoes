-- CreateTable
CREATE TABLE "Questao" (
    "id" INTEGER NOT NULL,
    "modulo" TEXT NOT NULL,
    "materia" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "dificuldade" TEXT NOT NULL,
    "textoBaseKey" TEXT,
    "enunciado" TEXT NOT NULL,
    "codigo" TEXT,
    "linguagem" TEXT,
    "alternativas" JSONB NOT NULL,
    "gabarito" TEXT NOT NULL,
    "explicacao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Questao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextoBase" (
    "chave" TEXT NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "TextoBase_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "Questao_modulo_materia_idx" ON "Questao"("modulo", "materia");
