-- Tipo da trilha: muda os rótulos do formulário e o selo do cartão. Existentes = concurso.
ALTER TABLE "Trilha" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'concurso';
