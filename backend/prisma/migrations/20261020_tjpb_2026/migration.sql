-- TJPB 2026 (FGV, múltipla escolha): perfil da prova, trilha oficial (oculta até o
-- acervo estar conferido) e a discursiva (tema + tentativas do usuário). Só acrescenta e
-- pode rodar de novo sem efeito (IF NOT EXISTS / ON CONFLICT DO NOTHING). Nenhuma
-- discursiva é criada aqui: os temas entram depois, pelo POST /discursivas.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Discursiva" (
    "id" TEXT NOT NULL,
    "trilhaId" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "padraoResposta" TEXT NOT NULL,
    "maxLinhas" INTEGER NOT NULL,
    "caracteresPorLinha" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discursiva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TentativaDiscursiva" (
    "id" TEXT NOT NULL,
    "discursivaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "nota" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaDiscursiva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Discursiva_trilhaId_ordem_idx" ON "Discursiva"("trilhaId", "ordem");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TentativaDiscursiva_userId_discursivaId_createdAt_idx" ON "TentativaDiscursiva"("userId", "discursivaId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TentativaDiscursiva_discursivaId_idx" ON "TentativaDiscursiva"("discursivaId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Discursiva_trilhaId_fkey') THEN
        ALTER TABLE "Discursiva" ADD CONSTRAINT "Discursiva_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TentativaDiscursiva_discursivaId_fkey') THEN
        ALTER TABLE "TentativaDiscursiva" ADD CONSTRAINT "TentativaDiscursiva_discursivaId_fkey" FOREIGN KEY ("discursivaId") REFERENCES "Discursiva"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TentativaDiscursiva_userId_fkey') THEN
        ALTER TABLE "TentativaDiscursiva" ADD CONSTRAINT "TentativaDiscursiva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


-- Perfil da prova (docs/perfis/tjpb-2026-dev.json). Já existindo, fica como está: o
-- conteúdo oficial de TI é gravado depois por scripts/atualizarConteudoTjpb.ts.
INSERT INTO "PerfilProva" ("id","nome","dados") VALUES ('tjpb-2026-dev','TJPB 2026 – Analista Judiciário TI Desenvolvimento de Sistemas','{"perfil": "tjpb-2026-dev", "formato": "MULTIPLA_ESCOLHA", "orgao": "Tribunal de Justiça do Estado da Paraíba (TJPB)", "banca": "FGV (Fundação Getulio Vargas)", "cargo": "Analista Judiciário – Área de TI – Desenvolvimento de Sistemas", "edital": "Edital nº 01/2026 – TJPB, DJE de 20/10/2026", "site": "https://conhecimento.fgv.br/concursos/tjpb26", "vagas": {"total": 10, "ac": 6, "pcd": 1, "pn": 3, "pi": 0, "pq": 0, "cadastro_reserva": true}, "remuneracao": {"vencimento": 7526.14, "auxilio_alimentacao": 2200.0, "auxilio_saude": 1800.0}, "carga_horaria_semanal": 40, "lotacao": "Qualquer comarca do estado da Paraíba", "validade": "2 anos, prorrogável por mais 2", "inscricoes": {"inicio": "2026-10-20T16:00:00-03:00", "fim": "2026-11-18T16:00:00-03:00", "boleto_ate": "2026-11-19"}, "taxa": 120.0, "data_prova": "2027-01-24", "horario_prova": {"inicio": "13:00", "fim": "18:00", "fuso": "America/Sao_Paulo", "portoes_fecham": "12:30"}, "local_prova": "João Pessoa/PB", "duracao_minutos": 300, "alternativas": ["A", "B", "C", "D", "E"], "pontuacao": {"acerto": 1, "erro": 0, "branco": 0}, "nota_minima_objetiva_pct": 60, "reducao_minima_cotas_pct": 20, "aviso_conteudo_provisorio": "Conteúdo de TI provisório: aguardando o Anexo I oficial.", "discursiva": {"questoes": 1, "max_linhas": 30, "caracteres_por_linha": 70, "valor": 40, "corrigidas_top": 100}, "grupos": [{"grupo": "CG", "nome": "Conhecimentos Gerais", "itens": 20, "nota_minima": null, "peso": 1, "disciplinas": [{"nome": "Língua Portuguesa", "itens": 10, "conteudo_oficial": true, "fonte": "Anexo I do edital (texto igual para os cargos publicados)", "topicos": [{"numero": "1", "texto": "Compreensão e interpretação de textos de gêneros variados.", "conteudo_oficial": true}, {"numero": "2", "texto": "Reconhecimento de tipos e gêneros textuais.", "conteudo_oficial": true}, {"numero": "3", "texto": "Ortografia oficial.", "conteudo_oficial": true}, {"numero": "4", "texto": "Mecanismos de coesão textual.", "conteudo_oficial": true}, {"numero": "4.1", "texto": "Referenciação, substituição, repetição, conectores e sequenciação.", "conteudo_oficial": true}, {"numero": "4.2", "texto": "Tempos e modos verbais.", "conteudo_oficial": true}, {"numero": "5", "texto": "Estrutura morfossintática do período.", "conteudo_oficial": true}, {"numero": "5.1", "texto": "Classes de palavras.", "conteudo_oficial": true}, {"numero": "5.2", "texto": "Coordenação.", "conteudo_oficial": true}, {"numero": "5.3", "texto": "Subordinação.", "conteudo_oficial": true}, {"numero": "5.4", "texto": "Pontuação.", "conteudo_oficial": true}, {"numero": "5.5", "texto": "Concordância verbal e nominal.", "conteudo_oficial": true}, {"numero": "5.6", "texto": "Regência verbal e nominal.", "conteudo_oficial": true}, {"numero": "5.7", "texto": "Crase.", "conteudo_oficial": true}, {"numero": "5.8", "texto": "Colocação pronominal.", "conteudo_oficial": true}, {"numero": "6", "texto": "Reescrita de frases e parágrafos.", "conteudo_oficial": true}, {"numero": "6.1", "texto": "Significação das palavras.", "conteudo_oficial": true}, {"numero": "6.2", "texto": "Substituição de palavras ou trechos.", "conteudo_oficial": true}, {"numero": "6.3", "texto": "Reorganização de orações e períodos.", "conteudo_oficial": true}, {"numero": "6.4", "texto": "Reescrita em diferentes níveis de formalidade.", "conteudo_oficial": true}, {"numero": "6.5", "texto": "Redação oficial.", "conteudo_oficial": true}]}, {"nome": "Raciocínio Lógico-Matemático", "itens": 10, "conteudo_oficial": true, "fonte": "Anexo I do edital (cargo de Contabilidade, mesma disciplina)", "topicos": [{"numero": "1", "texto": "Estruturas lógicas.", "conteudo_oficial": true}, {"numero": "2", "texto": "Lógica de argumentação: analogias, inferências, deduções e conclusões.", "conteudo_oficial": true}, {"numero": "3", "texto": "Lógica sentencial (proposicional).", "conteudo_oficial": true}, {"numero": "3.1", "texto": "Proposições simples e compostas.", "conteudo_oficial": true}, {"numero": "3.2", "texto": "Tabelas-verdade.", "conteudo_oficial": true}, {"numero": "3.3", "texto": "Equivalências.", "conteudo_oficial": true}, {"numero": "3.4", "texto": "Diagramas lógicos.", "conteudo_oficial": true}, {"numero": "4", "texto": "Lógica de primeira ordem.", "conteudo_oficial": true}, {"numero": "5", "texto": "Raciocínio lógico envolvendo problemas aritméticos, geométricos e matriciais.", "conteudo_oficial": true}]}]}, {"grupo": "CE", "nome": "Conhecimentos Específicos", "itens": 40, "nota_minima": null, "peso": 1, "disciplinas": [{"nome": "Engenharia de Software", "itens": null, "conteudo_oficial": false, "topicos": [{"numero": "1", "texto": "Engenharia de Software: processos e ciclo de vida; requisitos (funcionais e não funcionais, elicitação, histórias de usuário); UML; análise e projeto orientado a objetos; padrões de projeto (GoF); princípios SOLID e clean code; métricas e estimativas (pontos de função); qualidade de software.", "conteudo_oficial": false}]}, {"nome": "Metodologias ágeis e DevOps", "itens": null, "conteudo_oficial": false, "topicos": [{"numero": "2", "texto": "Metodologias ágeis e DevOps: Scrum, Kanban, XP; integração e entrega contínuas (CI/CD); Git e versionamento; contêineres (Docker) e orquestração (Kubernetes) em nível conceitual.", "conteudo_oficial": false}]}, {"nome": "Programação", "itens": null, "conteudo_oficial": false, "topicos": [{"numero": "3", "texto": "Programação: lógica de programação, estruturas de dados e algoritmos (ordenação, busca, complexidade); orientação a objetos; Java (incluindo Spring/Spring Boot); JavaScript e TypeScript; Python; testes (unitários, integração, TDD, BDD).", "conteudo_oficial": false}]}, {"nome": "Desenvolvimento web e mobile", "itens": null, "conteudo_oficial": false, "topicos": [{"numero": "4", "texto": "Desenvolvimento web e mobile: HTML, CSS, JavaScript; frameworks front-end (React, Angular, Vue); HTTP/HTTPS; acessibilidade (WCAG, eMAG) e usabilidade; desenvolvimento mobile.", "conteudo_oficial": false}]}, {"nome": "Arquitetura e integração de sistemas", "itens": null, "conteudo_oficial": false, "topicos": [{"numero": "5", "texto": "Arquitetura e integração de sistemas: arquitetura em camadas, MVC, microsserviços, orientada a eventos; APIs REST, SOAP, JSON, XML; mensageria; autenticação e autorização (OAuth 2.0, OpenID Connect, JWT).", "conteudo_oficial": false}]}, {"nome": "Banco de dados", "itens": null, "conteudo_oficial": false, "topicos": [{"numero": "6", "texto": "Banco de dados: modelagem (conceitual, lógica, física), modelo relacional e normalização; SQL (DDL, DML, consultas, junções, subconsultas, índices, transações e ACID); ORM (JPA/Hibernate); bancos NoSQL; noções de data warehouse e ETL.", "conteudo_oficial": false}]}, {"nome": "Segurança no desenvolvimento", "itens": null, "conteudo_oficial": false, "topicos": [{"numero": "7", "texto": "Segurança no desenvolvimento: OWASP Top 10; injeção (SQL, XSS); criptografia (simétrica, assimétrica, hash, certificado digital); desenvolvimento seguro; LGPD aplicada a sistemas.", "conteudo_oficial": false}]}, {"nome": "Governança e gestão de TI no setor público", "itens": null, "conteudo_oficial": false, "topicos": [{"numero": "8", "texto": "Governança e gestão de TI no setor público (noções): ITIL, COBIT; gerenciamento de projetos; contratação de soluções de TI (Lei nº 14.133/2021 e normas correlatas); Resolução CNJ nº 370/2021 (ENTIC-JUD).", "conteudo_oficial": false}]}]}]}'::jsonb)
ON CONFLICT ("id") DO NOTHING;

-- Trilha oficial do TJPB, logo depois da CGU (ordem 5), oculta até o acervo estar pronto.
-- Prova em 24/01/2027 às 13h de Brasília (16h UTC).
INSERT INTO "Trilha" ("id","nome","cargo","iniciais","banca","orgao","ano","descricao","dataProva","publicada","ordem","tipo","perfilProvaId") VALUES
('tjpb-2026-dev','TJPB 2026','Analista Judiciário – TI – Desenvolvimento de Sistemas','TJPB','FGV','TJPB',2026,'Múltipla escolha no padrão FGV para o TJPB: 10 vagas, vencimento de R$ 7.526,14 e prova objetiva e discursiva em 24/01/2027, em João Pessoa.','2027-01-24 16:00:00',false,6,'concurso','tjpb-2026-dev')
ON CONFLICT ("id") DO NOTHING;
