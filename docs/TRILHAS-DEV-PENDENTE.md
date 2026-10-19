# Trilhas de desenvolvimento + sandbox: o que falta

Status em 2026-10-15. Etapas 1–4 feitas, no GitHub e **no ar** (API redeployada em
2026-10-15 com helmet, `/exercicios`, `/execucoes` e escopo por vínculo). Etapas 5 e 6
pendentes; as 9 trilhas `dev-*` seguem ocultas e vazias de questões autorais.

## Feito

| Etapa | Commit | Estado em produção |
|---|---|---|
| 2. Schema | `549e50a` | migração `20261015c_trilhas_dev_sandbox` **aplicada** (backup `~/questoes_backup_pretrilhasdev_20261015_190501.sql`). 9 trilhas `dev-*` com `publicada=false` |
| 3. Sandbox | `be97f89` | gVisor instalado, imagens buildadas, worker **rodando** (`systemctl status questoes-sandbox`). Rotas `/exercicios` e `/execucoes` + helmet no ar |
| 4. Vínculos Dataprev | `f5b498c` | 242 vínculos **aplicados** (backup `~/questoes_backup_previnculos_20261015_192618.sql`). Escopo/matéria por vínculo no ar |
| 5.1 Validador + 5.2 verificação | este commit | só no GitHub (não deployado). Sem migração nova: `Questao.tipo`/`execucaoId` já vieram na `20261015c` |

Decisões aprovadas: herdadas da Dataprev **não** contam para o mínimo de 50; SQL em
SQLite; gVisor; trilha Testes = aluno escreve testes que pegam mutantes; Git/DevOps =
modo `shell`. A trilha Dataprev continua ativa e intacta.

Leitura obrigatória antes de continuar: `sandbox/README.md` (modos, limites, operação).

## Etapa 5 — validador + geração das questões

### 5.1 Validador de qualidade — FEITO (este commit)

Implementado em `backend/src/lib/qualidadeLote.ts` + `npm run lote:validar -- <lote.json>
[--trilha dev-x] [--json]` (sai com 1 se reprovar). O lote declara na raiz `trilhaId` e
`ementa` (lista de tópicos; cada `materia` precisa ser um deles). O importador manda 400
com `{ error, relatorio }` quando a trilha de destino é `dev-*`. Decisões tomadas na
implementação: a letra citada na explicação só conta em maiúscula ("a opção e a outra" é
português); o enchimento é procurado nas alternativas; trilhas de linguagem =
`dev-python`, `dev-javascript-typescript`, `dev-java`, `dev-cpp`; gabarito por letra
aceita de ⌊8n/50⌋ a ⌈12n/50⌉.

Arquivo novo `backend/src/lib/qualidadeLote.ts` (zod), usado pelo importador
(`POST /questoes/import`) quando o lote vai para trilha `dev-*`, e por um script
`backend/scripts/validarLote.ts` que imprime o relatório. Regras:

Por questão:
- exatamente 5 alternativas, chaves `A`–`E`;
- correta **não** é a mais longa: `len(correta) < max(len(distratores))` e
  `len(correta) <= 1.25 × média(distratores)`;
- lista negra de enchimento (casefold, sem acento): "conforme o cenario apresentado",
  "nesse caso especifico", "no contexto descrito", "de acordo com o enunciado",
  "em determinadas situacoes", "dependendo do caso"…;
- explicação não cita letra: `/\b(alternativa|letra|op[cç][aã]o|item)\s+[A-E]\b/i`
  e `/(^|\s)[A-E]\)/`;
- `tipo` ∈ `conceitual|saida|erro`; `saida` exige `codigo`, `linguagem`,
  `saidaEsperada`; `erro` exige `erroEsperado: { fase: "compilacao"|"execucao", contem }`;
- `origem: "autoral"` (ou `"adaptada"` + `prova`, só com PDF fornecido pelo usuário).

Por trilha (lote inteiro da trilha):
- ≥ 50 questões; ≥ 20 `facil`, ≥ 15 `media`, ≥ 15 `dificil`;
- gabarito por letra entre 8 e 12 a cada 50 (proporcional);
- trilhas de linguagem (python, js/ts, java, cpp): ≥ 40% `tipo` `saida`/`erro`;
- cobertura: todo tópico da ementa com ≥ 1 questão e nenhum com > 15%.

### 5.2 Verificação no sandbox (obrigatória para `saida`/`erro`) — FEITO (este commit)

Implementado: `API_URL=… ADMIN_TOKEN=<access token do admin> npm run lote:verificar --
<lote.json> [--seco]`. Questão de C++ com UB marca `"linguagemVerificacao": "cpp-ubsan"`
(o hash usa essa linguagem). O importador aceita `trilhaId` (dono da trilha ou admin em
trilha oficial; a rota segue com `requireAdmin`), confere a `Execucao` (finalidade, status,
hash) **e** reconfere o resultado gravado contra `saidaEsperada`/alternativa/`erroEsperado`,
e grava `tipo` e `execucaoId`.

Script `backend/scripts/verificarLote.ts`:
1. para cada questão `saida`/`erro`, `POST /execucoes/verificar` (admin) com
   `linguagem` (C++ de comportamento indefinido usa `cpp-ubsan`) e `codigo`;
2. espera o resultado (`GET /execucoes/:id`) e confere: `saida` → `livre.stdout`
   confere com `saidaEsperada` (comparação `exata` do worker) **e** com o texto da
   alternativa correta; `erro` → fase certa e `stderr/stdout` contém `erroEsperado.contem`;
3. grava no JSON do lote `execucaoId` de cada uma e falha se alguma não bater.

O importador recusa `saida`/`erro` sem `execucaoId` cuja `Execucao` seja
`finalidade="verificacao"`, `status="concluida"` e `hash = hashCodigo(linguagem, codigo)`
(função em `backend/src/modules/codigo/codigo.routes.ts`), e grava `Questao.tipo` e
`Questao.execucaoId`. Também precisa aceitar `trilhaId` explícito no corpo (hoje o lote
vai para a trilha do concurso de quem importa).

Alternativa sem API no ar: rodar o worker direto com `executar()` de
`sandbox/worker/src/executar.ts` (precisa de docker) e inserir a `Execucao` pelo Prisma.

### 5.3 Geração (uma trilha por vez)

Lotes em `backend/prisma/lotes-dev/<trilha>.json` no formato de `docs/FORMATO_LOTE.md`
+ campos novos (`tipo`, `saidaEsperada`, `erroEsperado`). `materia` = tópico da ementa,
`modulo: "I"`. Ordem sugerida: Python, JS/TS, Java, C++, BD, Arquitetura, Testes,
Git/DevOps, Segurança. Para cada trilha: escrever 50+ → validar → verificar no sandbox →
importar → relatório (dificuldade, letra, código verificado).

Ementas (tópicos) aprovadas na etapa 1:
- **Python**: tipos e mutabilidade, fatiamento, coleções, compreensões, funções (default
  mutável, closures, LEGB), POO (dunder, MRO, dataclass, property), exceções, geradores,
  decorators e context managers, `is` × `==`, typing, stdlib e GIL.
- **JS/TS**: coerção e `==`, hoisting/TDZ, closures, `this`, protótipos/classes,
  desestruturação/spread, event loop (micro × macro), Promises/async, ESM × CJS; TS:
  narrowing, generics, utility types, interface × type, strict null, erros do tsc.
- **Java**: primitivos/wrappers (cache do Integer), String pool/`equals`, sobrecarga ×
  sobrescrita, dispatch, exceções checked/`finally`, `equals`/`hashCode`, generics/erasure,
  streams/lambdas, Optional, records, inicialização de classe, concorrência básica.
- **C++**: conversões/overflow (UB signed), ponteiros/referências, `const`, RAII, regra de
  3/5/0, move, smart pointers, invalidação de iteradores, templates, `virtual`/slicing,
  ordem de avaliação, UB (out of bounds, dangling, não inicializado), lambdas/captura.
- **BD**: ER/relacional, chaves/integridade, DDL/DML, JOINs, agregação/HAVING,
  subconsulta/CTE/janelas, NULL, 1FN–FNBC, índices, ACID, isolamento/anomalias,
  locks/deadlock, NoSQL (4 famílias, CAP/BASE). Herdadas já concentram NoSQL: puxar para
  JOIN, janelas, índices, isolamento.
- **Arquitetura**: SOLID, acoplamento/coesão, GoF, camadas/MVC, hexagonal/clean,
  monólito × microsserviços, mensageria, DDD, REST, resiliência.
- **Testes**: níveis, pirâmide, TDD, dublês, cobertura (linha/branch/mutação), AAA,
  contrato, flaky, property-based, BDD.
- **Git/DevOps**: modelo de objetos, merge × rebase, reset/revert/restore, conflitos,
  stash/cherry-pick, trunk × GitFlow, CI/CD, Dockerfile (camadas/cache/multi-stage),
  Compose, Kubernetes básico, 12-factor, observabilidade.
- **Segurança**: OWASP Top 10 2021, SQL/command injection, XSS, CSRF/SameSite, CORS, JWT
  (`alg none`, expiração, armazenamento), bcrypt/argon2/salt, IDOR, SSRF,
  desserialização, CSP/headers, segredos.

### 5.4 Exercícios práticos (≥ 10 por trilha)

Arquivo `backend/prisma/exercicios/<trilha>.json` → script `scripts/importarExercicios.ts`
(upsert em `Exercicio` + `TesteExercicio`, `oculto` nos de borda). Antes de importar,
rodar a **solução de referência** de cada exercício no sandbox e exigir 100% dos testes
(e, no modo `testes`, que a suíte de referência passe na certa e falhe em todo mutante).
Modos: `io` (linguagens, Arquitetura, Segurança em Python), `sql` (BD: `seedSql` +
`entrada` com dados extras dos ocultos, `comparacao: "conjunto"` sem ORDER BY),
`testes` (trilha Testes), `shell` (Git/DevOps: `seedSql` monta o repo, `entrada` é o
script de conferência).

Ao fim da etapa 5: `UPDATE "Trilha" SET publicada = true WHERE id LIKE 'dev-%'` só das
trilhas que passaram no validador.

## Etapa 6 — frontend

- Tela de trilhas: as `dev-*` (tipo `outro`, banca "devconcursado") com filtro por
  dificuldade nas sessões (`Questao.dificuldade` já existe; `tipo` já vem em `/questoes`).
- Código das questões com highlight por **prism-react-renderer** (tokens React) em
  `components/QuestaoView.tsx:161` — hoje é `<pre><code>` puro.
- Tela de exercício (`/exercicios/:id`): enunciado, editor **CodeMirror 6**
  (`@uiw/react-codemirror`, carregado sob demanda), botão Executar → `POST /execucoes`,
  polling de `GET /execucoes/:id` (mostrar posição na fila), resultado por teste
  (visível: entrada/esperado/stdout/stderr; oculto: só passou/falhou), tempo, 429/503
  com mensagem. Tudo renderizado como **texto** (nada de `dangerouslySetInnerHTML`).
- CSP no `frontend/vercel.json` (`headers`): `default-src 'self'; script-src 'self';
  connect-src 'self' https://questoesapi.mauriciosts.com; img-src 'self' data: blob:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self'
  https://fonts.gstatic.com; worker-src 'self' blob:; frame-ancestors 'none';
  base-uri 'none'; object-src 'none'` — conferir no navegador (Mercado Pago, fontes,
  WebGL, PWA) antes de subir.
- Trocar `frontend/src/lib/sanitizeHtml.ts` (Caderno) por DOMPurify.
- Testes vitest + jsdom com payloads (`<script>`, `<img onerror>`, `javascript:`,
  `<svg onload>`) em enunciado, explicação, código, stdout/stderr: nenhum elemento
  executável no DOM e nenhum `alert` chamado.

## Deploy (só com confirmação do usuário)

1. Backend: `git pull && cd backend && npm ci && npx prisma generate && npm run build &&
   npx prisma migrate deploy && pm2 restart questoes-api` (helmet entra junto: conferir a
   página de aprovação de conta e o webhook do Mercado Pago depois).
2. Sandbox: `sandbox/deploy.sh` (já rodou uma vez; repetir se mudar worker/imagens).
3. Frontend: push na `main` (Vercel).

Cuidado: `npm run build` no backend sobrescreve o `dist` que o pm2 usa. Para testar
build novo sem publicar: `npx tsc -p tsconfig.json --outDir <scratch>` e subir em
`PORT=3399` (ver o script de E2E descrito em `sandbox/README.md`).
