-- Imagens da questão embutidas no próprio lote (data URI em base64). Coluna JSON
-- opcional: as questões já existentes ficam com NULL e continuam renderizando igual.
ALTER TABLE "Questao" ADD COLUMN "imagens" JSONB;
