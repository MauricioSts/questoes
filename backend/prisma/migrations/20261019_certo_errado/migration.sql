-- Questões certo/errado (estilo Cebraspe): comando que agrupa os itens, formato da questão,
-- gabarito a conferir, fonte do gabarito da prova e perfis de pontuação (nota por grupo).
-- Só acrescenta: as questões de múltipla escolha continuam iguais (default MULTIPLA_ESCOLHA).

-- AlterTable
ALTER TABLE "Questao" ADD COLUMN     "comandoId" TEXT,
ADD COLUMN     "formato" TEXT NOT NULL DEFAULT 'MULTIPLA_ESCOLHA',
ADD COLUMN     "gabaritoConferir" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Trilha" ADD COLUMN     "perfilProvaId" TEXT;

-- AlterTable
ALTER TABLE "Prova" ADD COLUMN     "gabaritoFonte" TEXT;

-- CreateTable
CREATE TABLE "Comando" (
    "id" TEXT NOT NULL,
    "trilhaId" TEXT,
    "loteNome" TEXT,
    "numero" INTEGER NOT NULL,
    "grupo" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "codigo" TEXT,
    "linguagem" TEXT,
    "imagens" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comando_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilProva" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerfilProva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comando_trilhaId_idx" ON "Comando"("trilhaId");

-- CreateIndex
CREATE INDEX "Questao_comandoId_idx" ON "Questao"("comandoId");

-- AddForeignKey
ALTER TABLE "Questao" ADD CONSTRAINT "Questao_comandoId_fkey" FOREIGN KEY ("comandoId") REFERENCES "Comando"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comando" ADD CONSTRAINT "Comando_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trilha" ADD CONSTRAINT "Trilha_perfilProvaId_fkey" FOREIGN KEY ("perfilProvaId") REFERENCES "PerfilProva"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Perfis de prova (docs/perfis/*.json)
INSERT INTO "PerfilProva" ("id","nome","dados") VALUES ('cgu-2026-dev','CGU 2026 – AFFC TI Desenvolvimento de Sistemas','{"perfil": "cgu-2026-dev", "orgao": "CGU", "banca": "Cebraspe", "cargo": "Cargo 4: Auditor Federal de Finanças e Controle (AFFC) – Especialidade: Tecnologia da Informação – Desenvolvimento de Sistemas", "data_prova": "2026-12-13", "duracao_minutos": 300, "pontuacao": {"acerto": 1, "erro": -1, "branco": 0}, "nota_minima_geral": 78, "grupos": [{"grupo": "P1", "nome": "Conhecimentos básicos", "itens": 40, "nota_minima": 8, "peso": 1, "disciplinas": [{"nome": "Estado, Democracia, Direitos e Ciência Política", "itens": null}, {"nome": "Sociedade Brasileira, Desigualdades, Diversidade e Desenvolvimento", "itens": null}, {"nome": "Ética Pública e Responsabilidade Profissional", "itens": null}, {"nome": "Administração Pública e Fundamentos de Políticas Públicas", "itens": null}]}, {"grupo": "P2", "nome": "Conhecimentos complementares", "itens": 40, "nota_minima": 12, "peso": 1, "disciplinas": [{"nome": "Fundamentos de Governança, Riscos e Integridade Pública e Privada", "itens": null}, {"nome": "Fundamentos de Transparência, Ouvidoria e Participação Social", "itens": null}, {"nome": "Fundamentos de Direito Público Aplicado, Controle e Responsabilização", "itens": null}, {"nome": "Fundamentos de Evidências, Dados e Inteligência Artificial", "itens": null}, {"nome": "Fundamentos de Auditoria Governamental e Atuação Integrada da CGU", "itens": null}]}, {"grupo": "P3", "nome": "Conhecimentos específicos", "itens": 90, "nota_minima": 54, "peso": 2, "disciplinas": [{"nome": "Engenharia de Software e Programação", "itens": null}, {"nome": "Arquitetura e Integração de Sistemas", "itens": null}, {"nome": "Persistência, Integração e Proteção de Dados", "itens": null}, {"nome": "Desenvolvimento Seguro, Qualidade e Gestão da Entrega", "itens": null}]}], "eliminacao": "Eliminado se NP1 < 8, NP2 < 12, NP3 < 54 ou NP1 + NP2 + NP3 < 78 (subitem 8.11.4).", "fonte": "Edital CGU 2026, subitens 7.1, 8.1, 8.11.2, 8.11.4. Notas mínimas em pontos já ponderados (P3 vale 2 por item; máximo 260). Itens por disciplina não constam no edital. Discursiva fora do perfil."}'::jsonb);
INSERT INTO "PerfilProva" ("id","nome","dados") VALUES ('bacen-2024-ti','Bacen 2024 – Analista TI','{"perfil": "bacen-2024-ti", "orgao": "BACEN", "banca": "Cebraspe", "cargo": "Cargo 2: Analista – Área: Tecnologia da Informação", "data_prova": "2024-05-19", "duracao_minutos": 210, "pontuacao": {"acerto": 1, "erro": -0.5, "branco": 0}, "nota_minima_geral": 36, "grupos": [{"grupo": "P1", "nome": "Conhecimentos básicos", "nota_minima": 10, "peso": 1, "disciplinas": [{"nome": "Língua Portuguesa", "itens": 25}, {"nome": "Noções de lógica e estatística", "itens": 10}, {"nome": "Direito administrativo", "itens": 5}, {"nome": "Fundamentos de microeconomia e macroeconomia", "itens": 10}]}, {"grupo": "P2", "nome": "Conhecimentos Específicos", "nota_minima": 21, "peso": 1, "disciplinas": [{"nome": "Ciência de dados", "itens": 14}, {"nome": "Segurança da Informação", "itens": 7}, {"nome": "Engenharia de Software", "itens": 24}, {"nome": "Infraestrutura em TI", "itens": 17}, {"nome": "Bancos de Dados", "itens": 4}, {"nome": "Gestão em TI", "itens": 4}]}], "eliminacao": "Eliminado se tiver nota < 10 no P1, < 21 no P2 ou < 36 no conjunto das provas objetivas (subitem 8.11.4).", "fonte": "Edital de abertura Bacen 2024 (subitens 7.1, 8.11.2, 8.11.4); discursiva, Procap e títulos fora do perfil."}'::jsonb);

-- Trilha oficial da CGU, oculta até as questões estarem conferidas.
INSERT INTO "Trilha" ("id","nome","cargo","iniciais","banca","orgao","ano","descricao","dataProva","publicada","ordem","tipo","perfilProvaId") VALUES
('cgu-2026-dev','CGU','Auditor Federal de Finanças e Controle – TI (Desenvolvimento de Sistemas)','CGU','Cebraspe','CGU',2026,'Itens certo/errado no estilo Cebraspe, com nota por grupo (P1, P2 e P3 com peso 2), mínimos do edital e um erro anulando um acerto.','2026-12-13 12:00:00',false,5,'concurso','cgu-2026-dev');
