# Prompt — Backend do app de estudo por questões

> Cole este prompt inteiro em um agente de código. Ele descreve **todo** o backend: stack, modelo de dados, contratos HTTP e regras de negócio.

---

## Papel e objetivo

Você vai construir do zero o backend de um aplicativo de estudo por questões de concurso público. É uma API REST em Node.js/TypeScript, com autenticação JWT, banco PostgreSQL e ORM Prisma. O app é multi-concurso: o mesmo usuário se prepara para vários concursos e nenhum dado atravessa a fronteira de um concurso para outro.

Entregue um projeto completo, tipado, com validação de entrada em todas as rotas e testes unitários das regras de negócio puras.

## Stack obrigatória

- Node.js (ESM, `"type": "module"`) + TypeScript compilado com `tsc` para `dist/`.
- Express 4 com `cors` e `express.json({ limit: "1mb" })`.
- Prisma 5 + PostgreSQL.
- `zod` para validar corpo, query e variáveis de ambiente.
- `bcryptjs` para hash de senha, `jsonwebtoken` para access token.
- `vitest` para testes.
- Scripts: `dev` (tsx watch), `build`, `start`, `seed`, `migrate` (`prisma migrate deploy`), `test`.

Estrutura de pastas:

```
src/
  server.ts               # monta o Express e registra os routers
  prisma.ts               # instância única do PrismaClient
  config/env.ts           # leitura e validação das variáveis de ambiente
  lib/                    # asyncHandler, jwt, date, srs, stats, streak
  middleware/             # auth (requireAuth), error (errorHandler + HttpError)
  modules/<recurso>/<recurso>.routes.ts
  __tests__/              # testes das regras puras (srs, stats, streak)
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Variáveis de ambiente (validadas com zod, falha no boot se inválidas)

| Variável | Tipo | Default |
|---|---|---|
| `PORT` | number | `3333` |
| `DATABASE_URL` | string obrigatória | — |
| `CORS_ORIGIN` | string, aceita lista separada por vírgula | `http://localhost:5173` |
| `JWT_ACCESS_SECRET` | string (mín. 10) | — |
| `JWT_REFRESH_SECRET` | string (mín. 10) | — |
| `ACCESS_TOKEN_TTL` | string estilo `15m` | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | number | `30` |
| `USER_TIMEZONE` | IANA timezone | `America/Fortaleza` |
| `REGISTRO_ABERTO` | `"true"`/`"false"` transformado em boolean | `false` |

## Princípio central da arquitetura (não viole)

**O backend nunca usa enunciado, alternativas ou gabarito para corrigir uma resposta.** A correção acerto/erro acontece no cliente, que envia o resultado já pronto acompanhado de *snapshots* (módulo, matéria, assunto, dificuldade) copiados da questão no momento da resposta. Consequências:

1. Toda estatística, priorização de erros e revisão espaçada é calculada apenas sobre a tabela de respostas — nunca fazendo join com o conteúdo da questão.
2. Excluir uma questão do banco não corrompe o histórico já registrado.
3. O backend ainda **armazena e serve** o conteúdo das questões (para o cliente baixar), mas não o consulta para corrigir.

## Modelo de dados (Prisma)

```prisma
enum Contexto { ESTUDO FLASH SIMULADO TOPICO }

// Conteúdo das questões. Compartilhado entre usuários (não é escopado por userId),
// apenas *tagueado* por concurso.
model Questao {
  id           Int      @id            // ID definido no lote importado
  concursoId   String?                 // null = legado/órfã
  modulo       String                  // "I" (conhecimentos gerais) | "II" (específicos)
  materia      String
  assunto      String
  dificuldade  String                  // facil | media | dificil
  textoBaseKey String?                 // chave em TextoBase (questões de interpretação)
  enunciado    String
  codigo       String?                 // bloco de código opcional
  linguagem    String?
  alternativas Json                    // { "A": "...", "B": "..." }
  gabarito     String
  explicacao   String
  imagens      Json?                   // [{ arquivo, legenda, posicao, dados }] com data URI
  loteNome     String?
  createdAt    DateTime @default(now())// idêntico para todo o lote → é a chave do lote

  @@index([modulo, materia])
  @@index([createdAt])
  @@index([concursoId])
}

model TextoBase { chave String @id  texto String }

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  nome         String
  metaDiaria   Int       @default(70)
  dataProva    DateTime?
  feriasAtivo  Boolean   @default(false)
  feriasDesde  DateTime?
  feriasAte    DateTime?
  createdAt    DateTime  @default(now())
  // relações: answers, notas, marcadas, concursos, paginas, postits,
  //           feriasPeriodos, refreshTokens, sessaoAtiva (1-1)
}

model Concurso {
  id         String   @id @default(cuid())
  userId     String                       // onDelete: Cascade
  nome       String                       // "Banco do Brasil"
  iniciais   String                       // "BB" (máx. 6, gravado em maiúsculas)
  banca      String
  ano        Int
  cargo      String
  dataProva  DateTime
  metaDiaria Int      @default(30)
  arquivado  Boolean  @default(false)
  createdAt  DateTime @default(now())
  @@index([userId])
}

// Resposta a uma questão. Guarda o RESULTADO com snapshots, nunca o conteúdo.
model Answer {
  id                  String   @id @default(cuid())
  clientId            String?  @unique   // id gerado no cliente → deduplica reenvio offline
  userId              String
  concursoId          String?
  questaoId           Int
  moduloSnapshot      String
  materiaSnapshot     String
  assuntoSnapshot     String
  dificuldadeSnapshot String
  alternativaMarcada  String
  acertou             Boolean
  tempoSegundos       Int?
  contexto            Contexto
  createdAt           DateTime @default(now())

  @@index([userId, createdAt])
  @@index([userId, acertou, moduloSnapshot])
  @@index([userId, questaoId])
}

model Nota    { id String @id @default(cuid())  userId String  concursoId String?  questaoId Int  texto String  updatedAt DateTime @updatedAt  @@unique([userId, questaoId]) }
model Marcada { id String @id @default(cuid())  userId String  concursoId String?  questaoId Int  createdAt DateTime @default(now())          @@unique([userId, questaoId]) }

// Página de caderno estilo Notion, escopada por usuário + concurso + matéria.
model PaginaCaderno {
  id String @id @default(cuid())
  userId String  concursoId String
  materia String  titulo String @default("")
  conteudo String @default("")   // HTML já saneado no cliente quando formato = "html"
  formato String @default("html")// "html" | "texto" (páginas legadas)
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  @@index([userId, concursoId])
}

// Post-it arrastável do mural da home.
model PostIt {
  id String @id @default(cuid())
  userId String  concursoId String
  x Float @default(0)  y Float @default(0)
  texto String @default("")
  cor String @default("amber")   // amber | sage | rose | slate
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  @@index([userId, concursoId])
}

// Histórico de modo férias. Cada viagem é UMA linha; fim null = ligado agora.
model FeriasPeriodo { id String @id @default(cuid())  userId String  inicio DateTime  fim DateTime?  createdAt DateTime @default(now())  @@index([userId]) }

// Sessão de estudo em andamento (uma por usuário): só a ordem dos IDs e o cursor.
model SessaoAtiva {
  id String @id @default(cuid())
  userId String @unique
  contexto Contexto @default(ESTUDO)
  questaoIds Int[]
  cursor Int @default(0)
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
}

// Refresh tokens persistidos como HASH, para permitir revogação.
model RefreshToken { id String @id @default(cuid())  userId String  tokenHash String @unique  expiresAt DateTime  createdAt DateTime @default(now())  @@index([userId]) }
```

Todas as relações com `User` e `Concurso` usam `onDelete: Cascade`.

## Autenticação

- **Access token**: JWT assinado com `JWT_ACCESS_SECRET`, payload `{ sub: userId, email }`, TTL curto (15 min).
- **Refresh token**: valor opaco de 48 bytes aleatórios em hex. O banco guarda apenas o SHA-256 dele. TTL 30 dias. **Rotacionado a cada uso**: o `/auth/refresh` apaga a linha antiga e cria uma nova.
- `requireAuth`: lê `Authorization: Bearer <token>`, verifica, injeta `req.userId` e `req.userEmail`. Sem header → `401 { error: "Token ausente" }`. Token inválido/expirado → `401 { error: "Token inválido ou expirado" }`.
- Toda rota exceto `/health` e `/auth/*` (menos `/auth/me`) exige autenticação — aplique `router.use(requireAuth)` no topo de cada router de recurso.

## Tratamento de erro

Um `errorHandler` final: `ZodError` → `400 { error: "Dados inválidos", detalhes }`; `HttpError(status, message)` → `status { error: message }`; qualquer outro → log no servidor e `500 { error: "Erro interno" }`. Um helper `asyncHandler` embrulha os handlers async para que rejeições cheguem ao middleware.

## Regras de negócio puras (extraia para `lib/`, com testes)

### 1. Datas cientes de fuso (`lib/date.ts`)

A meta diária "zera à meia-noite local" do usuário, então nada pode usar UTC direto. Implemente com `Intl.DateTimeFormat`:

- `localDateKey(date, tz)` → `"YYYY-MM-DD"` no fuso (use locale `en-CA`).
- `startOfLocalDay(date, tz)` / `startOfToday(tz)` → instante UTC da meia-noite local.
- `startOfWeekWindow(tz)` → início do dia de 6 dias atrás (janela de 7 dias).
- `localWeekdayIndex(date, tz)` → `0 = segunda … 6 = domingo`.
- `weekDayKeys(tz)` → `{ keys: string[7] (seg→dom da semana atual), hojeIdx }`.

### 2. Ofensiva / streak (`lib/streak.ts`)

Conta dias consecutivos, no fuso do usuário, em que a meta diária foi batida. Regras, aplicadas de hoje para trás:

- Bateu a meta no dia → conta **sempre**, inclusive fim de semana e dia de férias (estudar sempre conta).
- Não bateu, mas o dia é sábado, domingo ou está coberto por algum `FeriasPeriodo` → **pula sem quebrar**.
- Não bateu e é dia útil normal → **quebra** a sequência.
- Se hoje ainda não bateu e hoje não é dia de descanso, comece a contagem em ontem (o dia de hoje ainda está em aberto).

Um dia está "em férias" se existe período com `localDateKey(inicio) <= dia` e (`fim` nulo ou `dia <= localDateKey(fim)`). Guardar **todos** os períodos (em vez de uma única janela no `User`) é o que impede a ofensiva de quebrar retroativamente quando o modo férias é ligado de novo — não substitua isso por um par de colunas.

`contarPorDia(userId)` monta o mapa `"YYYY-MM-DD" → quantidade` a partir das respostas dos últimos 120 dias (janela suficiente para streak e para a semana).

### 3. Revisão espaçada / SRS (`lib/srs.ts`)

Sem tabela dedicada: o estado de revisão é **derivado** do histórico de respostas.

- Intervalos em dias por número de acertos consecutivos no fim do histórico: `[1, 3, 7, 16, 35, 60]` (streak 0, isto é, último resultado foi erro → revê em 1 dia; 1 acerto → 3 dias; e assim por diante; acima de 5 usa 60).
- Para cada questão: agrupe as respostas em ordem cronológica, conte os acertos consecutivos do fim para o começo (o primeiro erro interrompe), pegue a última resposta e calcule `dueDate = ultima.createdAt + intervalo`.
- `revisoesPendentes(answers, agora)` → itens com `dueDate <= agora`, **mais atrasados primeiro**, cada um com `{ questaoId, modulo, materia, assunto, dificuldade, streak, tentativas, ultimaData, dueDate }`.

### 4. Estatísticas (`lib/stats.ts`)

Função pura `agregarStats(answers)` (mais um wrapper que busca no banco) que devolve:

```ts
{
  totalRespondidas, totalAcertos, taxaGlobal,        // taxa 0..1
  tempoMedioSegundos,                                 // média só das respostas com tempo > 0; null se nenhuma
  porDia:      [{ dia: "YYYY-MM-DD", total, acertos }],           // ordenado por dia
  porMateria:  TaxaItem[],                                        // ordenado por taxa crescente (pior primeiro)
  porAssunto:  TaxaItem[],                                        // chave "matéria›assunto"
  pontosFracos: TaxaItem[]  // assuntos com total >= 3, ordenados por taxa crescente, desempate por volume
}
// TaxaItem = { chave, materia, assunto?, total, acertos, taxa, tempoMedio }
```

## Escopo de concurso (multi-concurso)

Rotas de leitura aceitam `?concursoId=` **opcional**: quando presente, filtram por ele; quando ausente, comportam-se como legado (todos os dados do usuário). Escritas de resposta aceitam `concursoId` no corpo. Rotas de caderno e post-its **exigem** `concursoId` e sempre validam que o concurso pertence ao usuário (`404 "Concurso não encontrado."` caso contrário) — esse é o isolamento entre concursos.

---

## Contratos HTTP

`GET /health` → `{ ok: true }` (sem auth).

### `/auth`

| Rota | Corpo | Resposta |
|---|---|---|
| `POST /auth/register` | `{ email, password (mín. 6), nome }` | `201 { user, accessToken, refreshToken }` |
| `POST /auth/login` | `{ email, password }` | `200 { user, accessToken, refreshToken }` |
| `POST /auth/refresh` | `{ refreshToken }` | `200 { user, accessToken, refreshToken }` (novo par) |
| `POST /auth/logout` | `{ refreshToken }` | `204` (idempotente) |
| `GET /auth/me` | — (auth) | `{ user }` |

- `user` público = `{ id, email, nome, metaDiaria }`. Nunca devolva o hash.
- `register` responde `403 "Criação de conta desativada"` quando `REGISTRO_ABERTO` é falso (o app é de uso pessoal; a rota aberta era a única porta para contas de terceiros). E-mail repetido → `409`.
- `login` com e-mail inexistente ou senha errada → **sempre** `401 "Credenciais inválidas"` (mesma mensagem, para não revelar quais e-mails existem).
- `refresh` com token desconhecido ou expirado → `401`, e o registro expirado é apagado.

### `/concursos`

- `GET /concursos` → `{ concursos: [...] }`. Cada item traz os campos do modelo mais os derivados:
  - `noBanco`: quantas questões existem com aquele `concursoId`;
  - `respondidas`: quantas questões **distintas** o usuário já respondeu naquele concurso;
  - `diasProva`: `max(0, ceil((dataProva - agora) / 1 dia))`;
  - `estado`: `"VAZIO"` se `noBanco === 0`, senão `"PAUSADO"` se `arquivado`, senão `"EM_CURSO"`.
- `POST /concursos` → `201 { concurso }`. Corpo: `{ nome (≤120), iniciais (≤6, salvo em maiúsculas), banca (≤60), ano (2000..2100), cargo (≤120), dataProva ("YYYY-MM-DD" ou ISO), metaDiaria (1..500, default 30) }`.
- `PATCH /concursos/:id` → mesmos campos, todos opcionais, mais `arquivado: boolean`. `404` se o concurso não for do usuário.
- `POST /concursos/:id/reaproveitar` → corpo `{ fromConcursoId, materias?: string[] }`. Copia as questões das matérias indicadas (ou todas) do concurso de origem para este, **duplicando o conteúdo com IDs novos** (a partir de `max(id) + 1` global) e marcando `loteNome = "Reaproveitadas de <INICIAIS_ORIGEM>"`. Responde `{ ok: true, copiadas }`.

### `/questoes` (conteúdo; toda a rota exige auth)

- `GET /questoes?concursoId=` → `{ questoes, textosBase }`. Os itens saem no formato do arquivo de lote (`texto_base`, `imagens`, campos opcionais como `undefined`), ordenados por id. Sem o parâmetro, devolve tudo.
- `POST /questoes/import` → importa um lote:
  ```jsonc
  {
    "questoes": [{
      "id": 1, "modulo": "I"|"II", "materia": "...", "assunto": "...",
      "dificuldade": "facil"|"media"|"dificil",
      "texto_base": "chave?", "enunciado": "...", "codigo": "?", "linguagem": "?",
      "alternativas": { "A": "...", "B": "..." }, "gabarito": "A",
      "explicacao": "", "imagens": [{ "arquivo", "legenda", "posicao": "enunciado"|"alternativas", "dados": "data:image/..." }]
    }],
    "textosBase": { "chave": "texto" },
    "deslocarSeColidir": true,
    "nomeLote": "arquivo.json",
    "concursoId": "..."
  }
  ```
  Regras:
  1. Se `concursoId` vier, valide a posse; se não vier, **caia no concurso mais antigo do usuário** em vez de gravar `null` — questão com `concursoId` nulo fica invisível no app (o GET filtra por concurso) e vira lixo silencioso.
  2. Rejeite com `400` se algum `gabarito` não existir entre as `alternativas` daquela questão (defesa extra, além da validação do cliente).
  3. Colisão de IDs com o que já existe: com `deslocarSeColidir: false` → `409 { error: "IDs em conflito", colisoes: number[] }` e nada é gravado; com `true` → renumere **o lote inteiro** somando `maxIdExistente - menorIdDoLote + 1`, preservando a ordem relativa.
  4. Grave questões e `TextoBase` (upsert por chave) na **mesma transação**.
  5. Responda `201 { ok: true, adicionadas, deslocamento?, faixaFinal: [min, max], totalAgora }`.
- `GET /questoes/lotes` → `{ lotes, semConcurso }`. Um lote é o conjunto de questões que compartilham o mesmo `createdAt` (um import grava todas com o timestamp da transação); a chave do lote é esse `createdAt` em ISO. Cada item: `{ chave, nome, concursoId, quantidade, idMin, idMax, criadoEm }`. `semConcurso` conta as questões órfãs.
- `POST /questoes/adotar-orfas` → `{ concursoId, chave? }`. Vincula ao concurso todas as questões com `concursoId` nulo (ou só as do lote daquele `createdAt`). Responde `{ ok: true, adotadas, totalAgora }`. Serve de conserto para lotes importados antes de o cliente passar a enviar o concurso.
- `POST /questoes/excluir-lote-grupo` → `{ chave }` (createdAt ISO). Exclui o lote inteiro **e**, na mesma transação, as respostas, notas e marcações daquelas questões — senão sobram dados órfãos que inflam o contador de "respondidas" acima do total existente. `404` se o lote não existir.
- `POST /questoes/excluir-lote` → `{ ids: number[] (1..5000) }`. Mesma limpeza em cascata. Responde `{ ok: true, excluidas, naoEncontradas, totalAgora }`. Use POST e não DELETE-com-corpo (corpo em DELETE é mal suportado por proxies e clientes).
- `DELETE /questoes` → limpa questões e textos base. `204`.

### `/answers`

- `POST /answers` → registra uma resposta. Corpo: `{ clientId?, concursoId?, questaoId, moduloSnapshot, materiaSnapshot, assuntoSnapshot, dificuldadeSnapshot, alternativaMarcada, acertou, tempoSegundos?, contexto }`. **Idempotente por `clientId`**: se o insert violar a unicidade (Prisma `P2002`), responda `200 { id, duplicate: true }` com a resposta já existente em vez de erro — é um reenvio da fila offline. Sucesso → `201 { id }`.
- `POST /answers/batch` → array das mesmas respostas (usado no simulado, ~70 de uma vez, e no flush da fila offline). Use `createMany({ skipDuplicates: true })`. → `201 { count }`.
- `GET /answers/ids` → `{ respondidas: number[], erradas: number[] }` — conjuntos de IDs para os filtros "só não respondidas" e "só erradas".
- `GET /answers/export` → backup JSON completo do progresso: `{ exportadoEm, user, answers, notas, marcadas }`.
- `GET /answers/stats?period=7d|30d|all` → o objeto de `agregarStats` mais `streak`. Atenção: o filtro de período **não** afeta o streak, que sempre considera o histórico completo.
- `GET /answers/wrong?modulo=II&limit=10` → IDs de questões erradas priorizadas (modo Flash): agrupe as respostas erradas por questão e ordene por **número de erros desc**, desempatando pelo **erro mais recente**. `limit` no máximo 100. → `{ ids, detalhes: [{ questaoId, erros, ultimoErro }] }`.
- `GET /answers/erradas` → questões cujo **último** resultado foi erro (aba "Revisar"). Reduza o histórico ao estado atual de cada questão (a última resposta vence) e filtre por `!acertouUltima`; ordene por erros desc, depois por data desc. Cada item traz `{ questaoId, modulo, materia, assunto, dificuldade, erros, tentativas, acertouUltima, ultimaData, alternativaMarcada }` — a alternativa da última tentativa importa porque o cliente exporta qual **distrator** foi escolhido. Assim que o usuário acerta numa revisão, a questão some daqui.
- `GET /answers/revisao?limit=60` → SRS de hoje: `{ total, ids, questoes }` com `total` = todas as pendentes e `ids/questoes` limitados (teto 200).
- `GET /answers/simulados` → histórico de simulados. Não existe coluna de sessão: agrupe as respostas de `contexto: SIMULADO` por proximidade temporal — **intervalo maior que 30 minutos entre respostas inicia um novo simulado**. Cada sessão: `{ id (ISO da primeira resposta), data, total, acertos, tempoTotalSegundos, respostas[] }`, mais recentes primeiro.
- `GET /answers/week` → questões respondidas nos últimos 7 dias, agregadas por questão: `{ desde, questoes: [{ questaoId, modulo, materia, erros, total }] }`. O cliente usa para sortear o simulado mantendo a proporção da prova e enfatizando as erradas.

### `/goals`

- `GET /goals/today?concursoId=` → painel do dia. Meta e data da prova vêm **do concurso ativo** quando há `concursoId`, senão do usuário (fallback 70). Devolve:
  ```ts
  {
    meta, respondidasHoje, acertosHoje, cumpriuHoje,
    streak, feriasAtivo,
    semana: boolean[7],      // seg→dom da semana atual: cada dia bateu a meta?
    hojeIdx,                 // 0 = seg … 6 = dom
    dataProva,
    totalQuestoes,           // questões no escopo
    respondidasTotal,        // questões distintas já respondidas
    respondidasSempre,       // total de respostas, contando repetições
    progressoPlano,          // round(respondidasTotal / totalQuestoes * 100)
    progressoTempo,          // % do tempo de preparação decorrido; null sem data de prova
    legislacaoTotal, legislacaoFeitasHoje,
    portuguesTotal, portuguesFeitasHoje,
    revisaoPendente          // nº de questões prontas para revisão espaçada
  }
  ```
  - `legislacao*` e `portugues*` contam as questões da matéria (busca `contains` case-insensitive por `"legisl"` e `"portugu"`) e quantas **distintas** foram feitas hoje — alimentam os avisos de "dia de legislação/português concluído".
  - `progressoTempo`: o início da preparação é o **mais antigo** entre criação da conta, criação do concurso e primeira resposta do escopo. Usar só o `createdAt` do concurso zera a barra sempre que um concurso é criado.
- `PATCH /goals/prova` → `{ dataProva: "YYYY-MM-DD" | ISO | null, concursoId? }`. Grava no usuário **e**, se houver concurso no escopo com data não nula, também no concurso. As escritas precisam ir para o mesmo lugar de onde o `GET /goals/today` lê, senão a edição não tem efeito visível.
- `PATCH /goals/meta` → `{ metaDiaria: 1..500, concursoId? }`. Mesma regra de escrita dupla.
- `PATCH /goals/ferias` → `{ ativo: boolean }`. **Idempotente**: só age quando o estado muda. Ligar fecha qualquer período em aberto e cria um novo `FeriasPeriodo { inicio: agora, fim: null }`; desligar fecha o período em aberto com `fim: agora`. As flags no `User` são mantidas só para a UI — o cálculo do streak usa exclusivamente os períodos. Responde `{ feriasAtivo }`.

### `/sessao` (retomar estudo)

- `GET /sessao` → `{ sessao }` ou `{ sessao: null }`.
- `PUT /sessao` → `{ contexto, questaoIds: number[], cursor }`, upsert por usuário (uma sessão por vez). → `{ sessao }`.
- `PATCH /sessao/cursor` → `{ cursor }`. Use `updateMany` para não dar 404 se a sessão já tiver sido encerrada em outra aba. → `204`.
- `DELETE /sessao` → encerra, idempotente. → `204`.

### `/notes` e `/marcadas`

- `GET /notes` → todas as anotações do usuário (mais recentes primeiro). `GET /notes/:questaoId` → `{ nota }` ou `null`. `PUT /notes/:questaoId` com `{ texto }` faz upsert; **texto vazio apaga a nota** e responde `{ nota: null }`.
- `GET /marcadas` → `{ ids, marcadas }`. `PUT /marcadas/:questaoId` marca (idempotente, `204`); `DELETE /marcadas/:questaoId` desmarca (idempotente, `204`).

### `/caderno` (páginas estilo Notion)

- `GET /caderno?concursoId=` → páginas do concurso, `updatedAt` desc. `concursoId` é obrigatório (`400` sem ele).
- `POST /caderno` → `{ concursoId, materia (≤120), titulo (≤200, default ""), conteudo (≤400.000 chars), formato: "html"|"texto" }` → `201 { pagina }`.
- `PATCH /caderno/:id` → qualquer subconjunto de `{ titulo, conteudo, materia, formato }` (o cliente salva com debounce). `404` se a página não for do usuário.
- `DELETE /caderno/:id` → `204`.

O conteúdo é HTML produzido por um editor rico e **saneado no cliente antes de enviar**; o teto de 400 mil caracteres existe só para barrar payload absurdo.

### `/postits` (mural da home)

- `GET /postits?concursoId=` (obrigatório) → `{ postits }`, ordem de criação.
- `POST /postits` → `{ concursoId, x, y, texto, cor: amber|sage|rose|slate }` → `201 { postit }`.
- `PATCH /postits/:id` → subconjunto de `{ x, y, texto, cor }` (arrastar e editar salvam com debounce). `DELETE /postits/:id` → `204`.

### `/stats`

- `GET /stats/heatmap?concursoId=&from=&to=` → heatmap anual estilo GitHub: `{ dias: [{ dia: "YYYY-MM-DD", total }], periodos: [{ inicio, fim | null }] }`. Os dias são agrupados pela chave local do fuso do usuário; `periodos` são os intervalos de férias, para a UI marcar as semanas correspondentes.

## Seed

`prisma/seed.ts` cria o usuário inicial a partir de `SEED_PASSWORD` (senha com hash bcrypt) e, opcionalmente, um concurso padrão.

## Testes (vitest)

Cubra as regras puras, que é onde os bugs doem: `calcularStreak` (bateu meta / fim de semana / férias / quebra em dia útil / hoje ainda em aberto), `revisoesPendentes` e a progressão de intervalos do SRS, e `agregarStats` (taxas, `porDia`, tempo médio ignorando respostas sem cronômetro, corte de volume mínimo dos pontos fracos).

## Segurança e operação

- Senha com bcrypt (custo 10); refresh token só como hash no banco; nada de segredo em log.
- CORS restrito à lista de `CORS_ORIGIN`, com `credentials: true`.
- Todas as consultas escopadas por `req.userId` — nunca confie em um `userId` vindo do cliente.
- Rode atrás de um proxy reverso com HTTPS; a API escuta apenas em localhost na porta configurada.
