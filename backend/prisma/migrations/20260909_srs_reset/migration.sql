-- Marco de reinício da revisão espaçada (SRS).
-- Zerar a fila de revisão não pode apagar respostas: estatística, ofensiva, histórico de
-- erros e progresso no banco saem todos de Answer. Em vez disso guardamos a data do
-- reinício e o cálculo do SRS passa a considerar só as respostas posteriores a ela.
ALTER TABLE "Concurso" ADD COLUMN "srsResetAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "srsResetAt" TIMESTAMP(3);
