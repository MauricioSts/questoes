# Prompt — Frontend correlacionado ao backend do app de questões

> Cole este prompt em um agente de código, junto (ou depois) do prompt do backend. Ele descreve **como o cliente consome a API**: divisão de responsabilidades, telas, fluxos e o mapeamento tela → endpoint. O design visual é livre.

---

## Papel e objetivo

Você vai construir o frontend de um app de estudo por questões de concurso que consome a API REST descrita a seguir. Escolha a stack de UI que preferir (a referência usa React + Vite + TypeScript + React Router, mas o contrato é o que importa). O design é livre — o que **não** é livre é a divisão de responsabilidades entre cliente e servidor, descrita abaixo.

## Contrato de responsabilidades (o ponto mais importante)

O backend guarda o conteúdo das questões e o **resultado** das respostas, mas **não corrige nada e não monta sessões de estudo**. Ele expõe agregados e conjuntos de IDs; o cliente decide o que virar sessão.

**O cliente é responsável por:**

1. **Baixar o conteúdo uma vez e trabalhar offline.** `GET /questoes?concursoId=` devolve todas as questões e textos base do concurso; guarde tudo em IndexedDB e mantenha um repositório em memória indexado por id. Essa é a única fonte de enunciado, alternativas e gabarito no app.
2. **Corrigir a resposta.** `acertou = questao.gabarito === alternativaMarcada`. O servidor nunca faz essa comparação.
3. **Montar o payload com snapshots.** Ao responder, envie `{ clientId, questaoId, moduloSnapshot, materiaSnapshot, assuntoSnapshot, dificuldadeSnapshot, alternativaMarcada, acertou, tempoSegundos?, contexto }`, copiando módulo/matéria/assunto/dificuldade da questão. `clientId` é um UUID gerado no cliente — é ele que torna o reenvio idempotente.
4. **Montar as sessões.** O backend entrega listas de IDs priorizados (`/answers/wrong`, `/answers/erradas`, `/answers/revisao`, `/answers/week`); a composição final de cada modo (quantidade, proporção, embaralhamento, preenchimento quando faltam questões) é regra do cliente.
5. **Sanear o HTML do caderno** antes de enviar e antes de renderizar (o conteúdo volta por `innerHTML`); use uma lista de permissão de tags e atributos.

**O backend é responsável por:** autenticação, persistência, agregados estatísticos, streak, SRS, escopo de concurso e deduplicação de respostas.

## Cliente HTTP

Um wrapper único sobre `fetch` com:

- Base URL vinda de variável de ambiente (`VITE_API_URL`), default `http://localhost:3333`.
- `Authorization: Bearer <accessToken>` automático; tokens em `localStorage`.
- **Refresh transparente:** em `401`, chama `POST /auth/refresh` uma vez e repete a requisição original. Use uma única promise compartilhada para o refresh, senão várias chamadas em paralelo disparam refreshes concorrentes e invalidam o token uma da outra (o backend rotaciona o refresh a cada uso). Se o refresh falhar, limpe os tokens e mande para o login.
- **Injeção automática do concurso ativo:** o id do concurso selecionado vive em `localStorage`. O wrapper adiciona `?concursoId=` aos GETs de `/answers`, `/goals/today`, `/questoes`, `/caderno`, `/postits`, `/stats` (e subcaminhos), e injeta `concursoId` no corpo dos POSTs para `/answers` e `/answers/batch` (no objeto, ou em cada item do array). Assim nenhuma página precisa lembrar do escopo.
- `204` vira `undefined`; erro vira uma exceção com `status` e a mensagem do campo `error` da resposta.

## Fila offline de respostas

O app é usável sem rede (PWA):

- `enviarResposta(r)`: grava na fila em `localStorage` e tenta o flush.
- `flushQueue()`: manda a fila inteira em `POST /answers/batch` e limpa em caso de sucesso; falhou (offline), mantém para a próxima tentativa.
- `enviarLote(rs)` (simulado): tenta o batch direto e, se falhar, enfileira.
- Ouça o evento `online` do navegador para disparar o flush.
- A deduplicação é garantida pelo `clientId`: `POST /answers` responde `200 { duplicate: true }` para reenvio e o batch usa `skipDuplicates`. Nunca reutilize um `clientId` para respostas diferentes.

## Estado global

- **Auth**: usuário, `login`, `logout`, restauração de sessão via `GET /auth/me` no boot. Rotas privadas atrás de um guard que redireciona para `/login`.
- **Concurso**: lista de `GET /concursos` e o concurso ativo. Trocar de concurso muda o escopo de tudo — recarregue o conteúdo de questões e limpe caches derivados.
- **Questões**: carrega do IndexedDB, sincroniza com `GET /questoes` e popula o repositório em memória.
- **Tema**: opcional; a referência usa `data-theme` na raiz com tokens CSS.

## Telas e mapeamento com a API

### Login
`POST /auth/login` → guarda `accessToken`/`refreshToken` e o usuário. O cadastro é fechado por padrão (`POST /auth/register` responde `403` a menos que o servidor tenha `REGISTRO_ABERTO=true`), então não exponha link de registro sem necessidade. Logout: `POST /auth/logout` com o refresh token e limpeza local.

### Seletor de concursos (`/concursos`)
Grade de cartões vinda de `GET /concursos`, cada um com selo de estado (`EM_CURSO` / `PAUSADO` / `VAZIO`), contagem `respondidas / noBanco` e `diasProva`. Cartão "adicionar" abre o formulário (`POST /concursos`). Editar/arquivar via `PATCH /concursos/:id`. Opção de importar matérias equivalentes de outro concurso: `POST /concursos/:id/reaproveitar`.

### Home / dashboard (`/`)
Fonte principal: `GET /goals/today`. Elementos:
- anel ou barra de progresso do dia: `respondidasHoje / meta`, com `acertosHoje` para o aproveitamento;
- ofensiva: `streak` + calendário da semana (`semana[7]`, `hojeIdx`), com indicação de modo férias (`feriasAtivo`);
- contagem regressiva da prova (`dataProva`) e barras de `progressoPlano` e `progressoTempo`;
- cartão "revisar hoje" quando `revisaoPendente > 0`, levando a `/revisar`;
- avisos de dia de legislação/português a partir de `legislacaoTotal/legislacaoFeitasHoje` e `portuguesTotal/portuguesFeitasHoje`;
- edição inline de meta (`PATCH /goals/meta`), data da prova (`PATCH /goals/prova`) e interruptor de férias (`PATCH /goals/ferias`) — depois de cada um, recarregue `/goals/today`;
- mural de post-its arrastáveis: `GET/POST/PATCH/DELETE /postits`, salvando posição e texto com debounce (a arrastada gera muitos eventos; não faça um PATCH por pixel);
- atalhos para os modos de estudo.

### Componente de sessão (usado por todos os modos)
Recebe uma lista de questões já montada e cuida de: renderizar enunciado, texto base, bloco de código, imagens (data URI) e alternativas; cronometrar cada questão; corrigir na hora da marcação; mostrar gabarito e explicação; botão de marcar para revisar depois; e chamar `enviarResposta` a cada questão respondida.

Ao começar uma sessão, `PUT /sessao` com `{ contexto, questaoIds, cursor }`; a cada avanço, `PATCH /sessao/cursor`; ao terminar ou abandonar, `DELETE /sessao`. Isso alimenta o botão "continuar estudando" (`GET /sessao` no boot: se houver sessão, reidrate as questões pelos IDs no repositório local e retome no cursor).

Ao final, tela de resumo: acertos, tempo total, lista de erradas com explicação.

### Estudar (`/estudar`)
Filtros locais sobre o repositório em memória: módulo, matéria, assunto, dificuldade, quantidade, mais os alternadores "só não respondidas" e "só erradas", que usam os conjuntos de `GET /answers/ids`. Embaralha e inicia a sessão com `contexto: "ESTUDO"`.

### Flash (`/flash`)
Rodada curta (10 questões) do módulo específico. `GET /answers/wrong?modulo=II&limit=10` dá os IDs erradas por prioridade (mais erros, desempate pelo erro mais recente). O cliente resolve os IDs no repositório e, se faltarem, completa primeiro com questões do módulo II ainda não respondidas e depois com quaisquer outras — a sessão nunca deve ficar incompleta por falta de erradas. Contexto `"FLASH"`.

### Tópico (`/topico`) e Matérias (`/materias`)
Estudo dirigido por matéria/assunto, montado só com dados locais; aceita deep link (`/topico?materia=..&assunto=..&prioriza=1`) vindo dos pontos fracos das estatísticas. Contexto `"TOPICO"`.

### Revisar (`/revisar`)
Dois modos, escolhidos pelo usuário:
- **SRS**: `GET /answers/revisao` — questões cuja data de revisão venceu, mais atrasadas primeiro;
- **Erradas**: `GET /answers/erradas` — questões cujo último resultado foi erro.
No boot da tela, mostre os dois contadores (`total` do SRS e o tamanho da lista de erradas) para o usuário escolher. Resolva os IDs localmente e rode a sessão. Ao acertar numa revisão, a questão sai da lista de erradas na próxima leitura — não é preciso nenhuma chamada extra.

### Simulado (`/simulado`)
Prova completa cronometrada, sem correção durante a execução (só no fim). Passos:
1. `GET /answers/week` traz as questões dos últimos 7 dias com contagem de erros;
2. o cliente monta as N questões respeitando a proporção da prova real (cotas por matéria do módulo I mais um total do módulo II) e sorteia com peso maior para as erradas na semana;
3. cronômetro global de duração configurável;
4. no fim, `enviarLote` com todas as respostas em `contexto: "SIMULADO"`, e tela de resultado com nota ponderada (pesos diferentes por módulo) contra uma nota de corte configurável.
Histórico: `GET /answers/simulados` — cada sessão já vem agrupada pelo servidor (respostas separadas por mais de 30 minutos contam como simulados diferentes).

### Estatísticas (`/stats`)
`GET /answers/stats?period=7d|30d|all`: taxa global, evolução diária (`porDia`), barras por matéria e por assunto (já ordenadas do pior para o melhor), tempo médio por questão e lista de pontos fracos, cada um com atalho "treinar agora" para `/topico`. Lembre o usuário de que o `streak` devolvido aí ignora o filtro de período. Heatmap anual: `GET /stats/heatmap?from=&to=`, marcando também as semanas cobertas por `periodos` de férias.

### Erros (`/erros`)
Diagnóstico por matéria: cruza `GET /answers/erradas` (metadados dos erros, incluindo o distrator marcado) com `GET /answers/stats?period=all` (taxas por matéria e por assunto) e com o conteúdo local. Agrupa por matéria → assunto e permite exportar um Markdown com enunciado, alternativa marcada, gabarito e contagem de erros, pedindo de volta um JSON no mesmo schema aceito pela tela de importação — fechando o ciclo errar → gerar questões novas do ponto fraco → importar.

### Marcadas (`/marcadas`) e Anotações (`/anotacoes`)
`GET /marcadas` lista os IDs marcados (resolvidos localmente); `PUT`/`DELETE /marcadas/:questaoId` alternam a marca, de forma otimista na UI. `GET /notes` lista as anotações por questão; `PUT /notes/:questaoId` salva e **texto vazio apaga**. Exportar backup: `GET /answers/export`, oferecido como download de JSON.

### Caderno (`/caderno`)
Páginas de anotação estilo Notion, agrupadas por matéria: `GET /caderno?concursoId=`, `POST /caderno`, `PATCH /caderno/:id`, `DELETE /caderno/:id`. Editor rico com salvamento por debounce (~800 ms) e **flush obrigatório** ao trocar de página, ao esconder a aba (`visibilitychange`) e ao sair — sem isso o último trecho digitado se perde. Páginas com `formato: "texto"` são legado: converta para parágrafos ao abrir e regrave como `html`. Sanear sempre o HTML antes de enviar e antes de injetar.

Um painel do caderno também deve poder ser aberto **durante** uma sessão de estudo, filtrado pela matéria da questão atual, para anotar sem sair da questão (desligado no simulado).

### Importar (`/importar`, administrativo)
Upload de JSON de lote. Valide no cliente antes de enviar (ids únicos, gabarito presente entre as alternativas, campos obrigatórios) e mostre prévia com contagem por matéria. Envie em `POST /questoes/import` com `nomeLote` e o `concursoId` ativo. Trate `409` de colisão de IDs oferecendo as duas saídas: cancelar, ou reenviar com `deslocarSeColidir: true` (o servidor renumera o lote inteiro e informa o `deslocamento` e a `faixaFinal`). Depois do import, atualize o IndexedDB. Gestão de lotes: `GET /questoes/lotes` (mostre `semConcurso` em destaque), `POST /questoes/adotar-orfas`, `POST /questoes/excluir-lote-grupo`, `POST /questoes/excluir-lote`, `DELETE /questoes` — as exclusões apagam também respostas e anotações das questões, então confirme antes.

## Armadilhas conhecidas (evite refazer estes bugs)

- **Refresh concorrente:** sem uma promise compartilhada, duas requisições em `401` simultâneo derrubam a sessão, porque o segundo refresh chega com um token já rotacionado.
- **`clientId` reaproveitado:** gera resposta perdida (o servidor a trata como duplicata).
- **Questão sem concurso:** ao importar, sempre mande o `concursoId` ativo; sem ele o servidor cai no concurso mais antigo, e em versões antigas a questão simplesmente sumia do app.
- **Perda de quebras de linha no editor:** ler `textContent` de um `contenteditable` descarta a formatação; trabalhe com HTML.
- **Salvamento só por debounce:** sem o flush no `visibilitychange` e ao desmontar, a última edição se perde.
- **Layout do painel lateral na questão:** um painel `fixed` cobre o enunciado em telas estreitas; prefira uma coluna em fluxo (sticky) em telas largas e uma folha ancorada, com altura medida, no mobile. Verifique com testes reais de largura, não só lendo o código.
