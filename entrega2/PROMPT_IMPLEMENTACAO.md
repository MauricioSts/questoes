# Prompt de implementação — App de questões multi-concurso (v2)

> Cole isto no seu assistente de código (Claude Code, Cursor, etc.) rodando na raiz do repositório, com acesso a `frontend/` e `backend/`.
> As imagens de referência estão em `telas/` — consulte-as ao implementar cada tela.

---

## Contexto

Você vai **reconstruir a camada visual e adicionar 3 features** num app de estudo por questões (React + TypeScript + Tailwind + Vite, PWA, backend Express + Prisma + Postgres).

**Não altere** a lógica de correção (acerto/erro é decidido no frontend), autenticação (JWT access 15min + refresh 30d), fila offline de respostas, nem o contrato atual da API — apenas estenda onde indicado.

O app tem **dois temas alternáveis a qualquer momento**, e passa a ser **multi-concurso**.

---

## 1. Sistema de temas (obrigatório: CSS custom properties)

Os dois temas devem compartilhar **exatamente o mesmo layout** — só os tokens mudam. Implemente com CSS variables num wrapper raiz, não com classes duplicadas.

```tsx
<div data-theme={theme} className="app-root"> {/* theme: 'grimorio' | 'neon' */}
```

```css
.app-root { color: var(--text); background: var(--bg); }  /* OBRIGATÓRIO: sem isto o texto herda a cor do body e fica ilegível ao trocar de tema */

/* ---------- GRIMÓRIO (escuro, mística/biblioteca antiga) ---------- */
[data-theme='grimorio'] {
  --bg:#120E1E; --bgGlow:#2A1F45;
  --surface:#1A1430; --surface2:#221A3C;
  --line:#302449; --lineSoft:#241B38; --lineStrong:#3D2F5C; --lineHi:#5B4788;
  --text:#EFE6D2; --muted:#B0A2CB; --faint:#857799; --dim:#5C4F7C;
  --accent:#C9A227; --accentHi:#E4BC45; --accentText:#E7CE86;
  --accentBd:#5C4620; --accentBg:rgba(201,162,39,.12);
  --good:#4E8F6D; --goodText:#8FCFA9; --goodBd:#2C5541; --goodBg:rgba(78,143,109,.12);
  --onAccent:#1A1206;
  --track:#2A2040; --trackSoft:#241B38; --bar:#362A52;
  --display:'Cormorant Garamond',serif; --displayWeight:600;
  --brandFont:'Cinzel',serif; --brandWeight:600; --brandTrack:.06em;
  --r:6px; --rSm:4px; --rChip:3px;
  --grain:.045; --vignette:rgba(8,4,16,.78); --vigStop:52%;
  --cardGlow: inset 0 1px 0 rgba(231,206,134,.05), 0 24px 50px -34px rgba(0,0,0,.9);
  --heat0:#211A38; --heat0bd:#2A2144;
  --heat1:rgba(201,162,39,.28); --heat2:rgba(201,162,39,.5);
  --heat3:rgba(201,162,39,.74); --heat4:#E4BC45;
  --dot:#2A2144;
}

/* ---------- NEON (claro, cyberpunk divertido) ---------- */
[data-theme='neon'] {
  --bg:#F4F1FF; --bgGlow:#E4DBFF;
  --surface:#FFFFFF; --surface2:#F7F4FF;
  --line:#D8CEFF; --lineSoft:#EBE4FF; --lineStrong:#C9BCFF; --lineHi:#A78BFA;
  --text:#14103A; --muted:#5F55A8; --faint:#8B80C9; --dim:#B2A8E0;
  --accent:#E6007E; --accentHi:#FF3DA8; --accentText:#C2006B;
  --accentBd:#FFB3DC; --accentBg:rgba(230,0,126,.10);
  --good:#00B39A; --goodText:#00806F; --goodBd:#8DE8DA; --goodBg:rgba(0,179,154,.12);
  --onAccent:#FFFFFF;
  --track:#EBE4FF; --trackSoft:#F1ECFF; --bar:#DCD2FF;
  --display:'Chakra Petch',sans-serif; --displayWeight:700;
  --brandFont:'Chakra Petch',sans-serif; --brandWeight:700; --brandTrack:.02em;
  --r:14px; --rSm:10px; --rChip:999px;
  --grain:0; --vignette:rgba(120,90,220,.10); --vigStop:70%;
  --cardGlow: 0 6px 0 -2px rgba(216,206,255,.6), 0 14px 30px -18px rgba(90,60,190,.35);
  --heat0:#EFE9FF; --heat0bd:#DED4FF;
  --heat1:rgba(0,194,255,.45); --heat2:rgba(139,92,246,.55);
  --heat3:rgba(230,0,126,.65); --heat4:#E6007E;
  --dot:#DED4FF;
}
```

Fontes (Google Fonts): `Cinzel` 500/600, `Cormorant Garamond` 500/600/700, `Chakra Petch` 500/600/700, `Plus Jakarta Sans` 400/500/600/700 (corpo, em ambos os temas).

**Botão de troca de tema:** rodapé da sidebar no desktop (ícone + "Modo Grimório" / "Modo Neon" + bolinha pulsante), ícone no header no mobile. Persista a escolha em `localStorage`. Ícone: **vela** no Grimório, **sol** no Neon.

**Camadas de atmosfera** (fixas, `pointer-events:none`):
1. Grão: SVG `feTurbulence` como `background-image`, `opacity: var(--grain)`, `mix-blend-mode: overlay`.
2. Vinheta: `radial-gradient(120% 90% at 50% 40%, transparent var(--vigStop), var(--vignette) 100%)`.
3. Só no Grimório: dois halos de vela (`radial-gradient` circular âmbar e violeta) com animação `candle` (opacidade + escala, 5–7s).
4. Só no Neon: linha de varredura horizontal descendo a tela (`scanline`, 7s linear infinite).

**Identidade:** Grimório = "Grimório", logo de eclipse/lua com estrela dourada. Neon = "NEON//VGL", logo quadrado escuro com "A" magenta e traço ciano.

---

## 2. Multi-concurso (NOVO)

O app deixa de ser só Dataprev. Modelo:

```prisma
model Concurso {
  id         String   @id @default(cuid())
  userId     String
  nome       String   // "Banco do Brasil"
  iniciais   String   // "BB"
  banca      String   // "CESGRANRIO"
  ano        Int
  cargo      String
  dataProva  DateTime
  metaDiaria Int      @default(30)
  arquivado  Boolean  @default(false)
}
```

Toda tabela de conteúdo/progresso (`Questao`, `Resposta`, `Anotacao`, `Marcada`, `PaginaCaderno`, `PostIt`) recebe **`concursoId`** e todas as queries passam a filtrar por `userId + concursoId`. Nenhum dado atravessa concursos.

### Tela seletora de concursos (`telas/*-picker.png`)
Primeira tela ao abrir (e acessível pelo trocador na sidebar). Grid de cartões, um por concurso:
- Brasão circular com as iniciais (`--accentBg` + borda `--accentBd`), etiqueta de estado: **EM CURSO** (atual), **PAUSADO**, **VAZIO** (0 questões).
- Nome em `--display`, cargo abaixo, e três números: **respondidas · no banco · dias até a prova**.
- Cartão tracejado "Adicionar concurso" ao final: "Começa vazio. Importe um lote ou reaproveite questões de matérias iguais."

### Trocador na sidebar
Botão no topo (abaixo da marca) com brasão + nome + banca + setas ⇅ → abre a seletora.

### Concurso vazio (`telas/*-bb-vazio.png`)
Quando `total === 0`, o app **não** mostra estado quebrado:
- Home ganha um aviso em `--accentBg`: "Este concurso começa do zero" + botões **Importar lote** e **Reaproveitar questões** (copia questões de matérias com nome equivalente de outro concurso do usuário — Português, Inglês, RLM e Legislação são os casos típicos).
- KPIs em 0, anel da meta vazio, heatmap todo no nível 0, "Nenhuma questão importada ainda".
- Revisar e Estatísticas em estado vazio explícito.
- Matérias **já listadas conforme o edital** (com "— " no lugar do % e "0 questões").
- Simulado: "Ainda não disponível", mostrando `no banco / até a prova / matérias`.

Matérias por edital já mapeadas: Dataprev-TI (9 matérias), Banco do Brasil (Português, Inglês, Matemática, Atualidades do Mercado Financeiro, Conhecimentos Bancários, Vendas e Negociação, TI), INSS (Português, Raciocínio Lógico, Ética, Direito Constitucional, Direito Administrativo, Seguridade Social, Informática).

---

## 3. Caderno — anotações tipo Notion (NOVO)

Nova aba. Duas colunas no desktop (`272px 1fr`), empilhadas no mobile.

```prisma
model PaginaCaderno {
  id         String   @id @default(cuid())
  userId     String
  concursoId String
  materia    String
  titulo     String   @default("")
  conteudo   String   @default("")   // markdown ou JSON de blocos
  updatedAt  DateTime @updatedAt
}
```

**Coluna esquerda** — árvore: cabeçalho "MATÉRIAS", uma linha por matéria (chevron que gira 90° ao abrir, nome, contagem de páginas), páginas indentadas com ícone de documento; a página ativa fica em `--accentBg` com texto `--accentText`.

**Coluna direita** — editor: pílula da matéria + "editada há X" + botão "Excluir" à direita; **título** `contenteditable` em `--display` 34px; **corpo** `contenteditable` 14.5px `line-height:1.85`. Placeholders via `[contenteditable]:empty:before { content: attr(data-ph) }`.

Botão "Nova página" no cabeçalho da tela cria a página na primeira matéria, abre o grupo e foca o título. Estado vazio: "Caderno vazio" + "Criar página".

**Salvamento:** debounce de ~800ms num `PATCH /caderno/:id`, com fila offline igual à das respostas. Recomendo blocos de verdade depois (títulos, listas, destaque, código) — comece com texto rico simples.

---

## 4. Home (`telas/*-home-*.png`)

Ordem exata dos elementos:

1. **Cabeçalho** — data de hoje em maiúsculas/espaçada, saudação por horário ("Bom dia/tarde/noite, {nome}") em `--display` 42px, e "Faltam **N dias** para a prova da {banca}. Continue de onde parou."
2. **Faixa de 4 KPIs** — um único cartão dividido por `border-right`: REALIZADAS HOJE · ACERTOS (`--goodText`) · ERROS (`--accentText`) · TOTAL ACUMULADO. Números em `--display` 34px.
3. **Meta diária** (2 colunas) — anel SVG 116px (`stroke-dasharray:327`, animação `ringdraw` 1s; verde `--good` quando batida, senão `--accent`), número no centro; à direita "META DIÁRIA", headline, texto e botão primário.
4. **Contagem para a prova** — dias em `--display` 38px, data, lápis de editar, barra do tempo percorrido.
5. **Progresso no banco** — respondidas de total, %, barra, "Faltam N questões para ver todas".
6. **Heatmap anual estilo GitHub** — ver §5.
7. **Banner de revisão pendente** (só se houver) — "N questões prontas para revisar", borda esquerda em `--accent`, fundo `--accentBg`.
8. **Mural de anotações** — ver §6.
9. **Modos de estudo** — 4 cartões: Estudar, Revisar, Caderno, Simulado (este com `opacity:.6` quando indisponível).
10. Dois botões tracejados: "Questões com anotações" e "Marcadas para revisar".

**Removidos de vez:** aba Flash, aba Leis, card "pontos fracos" e card "tempo médio por matéria". Não reintroduza.

---

## 5. Heatmap de sequência (estilo GitHub)

Substitui o antigo calendário de 7 dias.

- **53 semanas × 7 dias** terminando hoje. Grid CSS: `grid-template-rows: repeat(7, 12px); grid-auto-flow: column; gap: 3px`. Células de 12px, raio 2px (Grimório) / 3px (Neon).
- 5 níveis por volume diário: `0` / `<8` / `<18` / `<32` / `≥32` → `--heat0..--heat4`. Nível 0 leva borda `--heat0bd`.
- Rótulos de mês acima (largura proporcional ao nº de semanas do mês; some se o mês ocupa menos de 2 colunas) e iniciais dos dias à esquerda (S/T/Q/S alternados).
- `title` por célula: "N questões em DD/MM".
- Cabeçalho: "**{total}** questões nos últimos 12 meses" + "Sequência atual: **N dias** · maior sequência: N dias".
- Toggle **Modo férias** à direita ("Ligue ao viajar para não perder a ofensiva") — pausa a quebra da sequência.
- Rolagem horizontal com `min-width: 700px`, legenda "menos → mais" abaixo.

Backend: endpoint `GET /stats/heatmap?concursoId=&from=&to=` devolvendo `[{ dia: 'YYYY-MM-DD', total: n }]` (agregação por dia no fuso **America/Fortaleza**).

---

## 6. Mural de post-its arrastáveis

- Área com fundo pontilhado (`radial-gradient(var(--dot) 1px, transparent 1.2px)`, `background-size: 20px 20px`), `overflow: hidden`, altura **330px** — botão **"Expandir mural"** alterna para **640px** (`transition: height .2s`).
- Nota: 206px de largura, alça superior (ícone de 6 pontos + X para excluir) e corpo `contenteditable`. Cores por tema (âmbar / sálvia / rosa / cinza-azul).
- **Drag** com Pointer Events: `pointerdown` na alça guarda o offset; `pointermove` no `window` atualiza a posição; `pointerup` encerra. `touch-action: none` na alça. Ao arrastar: `scale(1.03)` + sombra maior + `z-index` acima.
- **Clamp obrigatório** — as posições precisam ser limitadas a `[0, boardW - 214]` × `[0, boardH - 116]` **na montagem, no resize e ao voltar para a Home**, não só durante o arraste. Sem isso as notas ficam cortadas em telas estreitas.
- "Nova nota" calcula as colunas a partir da largura real do mural.
- Persistir `{x, y, texto, cor}` por concurso (`PostIt`), com debounce.

---

## 7. Demais telas

**Estudar** (`telas/*-estudar.png`) — filtros empilhados (Módulo, Matéria — opções vindas do concurso atual, Assunto), linha Dificuldade/Quantidade, e três toggles: "Só não respondidas", "Só erradas anteriormente", "Priorizar as que errei mais". Botão "Começar sessão".

**Revisar** (`telas/*-revisar.png`) — abas "Erradas pendentes · N" / "Revisão do dia · N", botão "Revisar N questões", e lista onde cada linha tem uma barra vertical de 2px cuja cor indica a gravidade (4×/3× = `--accent`, 2× = `--accentText`, 1× = `--dim`), título, caminho e "N× errou".

**Matérias** (`telas/*-materias.png`) — lista simples: nome, barra de acerto (verde ≥75%, `--muted` 55–74%, `--accent` <55%), "% de acerto", contagem e chevron.

**Simulado** (`telas/*-simulado.png`) — abas Novo/Anteriores; estado "Abre no sábado" com cadeado e três números (70 questões · 4h · 115 pontos). Regras mantidas: 70 questões na proporção real (Mód. I = 40: Port 12, Inglês 12, RLM 5, Atualidades+IA 6, Legislação 5; Mód. II = 30), Módulo I peso 1 e Módulo II peso 2,5, sem feedback durante a prova, anotações ocultas, cronômetro de 4h pausável.

**Estatísticas** (`telas/*-estatisticas.png`) — 4 KPIs (respondidas, taxa de acerto, tempo médio, sequência), "Questões por dia" (14 barras), "Evolução da taxa de acerto" (linha com 3 gridlines e ponto final destacado), "Acerto por matéria" (barras rotuladas). **Sem** pontos fracos e **sem** tempo médio por matéria.

**Questão** (`telas/*-questao.png`) — voltar + "QUESTÃO 4 DE 10" + cronômetro + barra fina; pílulas de módulo/matéria/dificuldade; enunciado 16.5px; alternativas com badge de letra. Ao responder: correta em `--goodBg`/`--goodBd` com check, escolhida errada em `--accentBg`/`--accentBd` com X **e a correta também destacada**, demais esmaecidas, botões travados (`cursor:default`), e `shakeX` de 400ms no cartão quando erra. Bloco de explicação com borda esquerda colorida + "Anotar" e "Marcar para revisar". Botão "Próxima questão".

---

## 8. Regras técnicas

- **Nunca** emojis — só ícones SVG de traço (stroke-width 1.8–2, linecap/linejoin round).
- Breakpoint desktop/mobile: **900px**. Sidebar de 218px no desktop; header + barra inferior de 6 itens no mobile (Início, Estudar, Revisar, Caderno, Matérias, Stats).
- Alvos de toque ≥ 44px; nada de texto abaixo de 10px (rótulos micro em 10px com `letter-spacing: .14em`).
- Toggles, selects e inputs custom, todos por token — nenhum controle nativo estilizado por cima.
- Anime só `opacity` e `transform`; entradas de tela com `fadeUp` 400ms.
- `prefers-reduced-motion`: desligue vela, varredura e `fadeUp`.
- PWA/offline preservado: cache das questões em IndexedDB e fila de respostas sincronizada ao voltar a conexão — agora **por concurso**.
- Acessibilidade: `aria-label` em botões só-ícone, foco visível, contraste AA em **ambos** os temas.

Entregue componentizado (`AppShell`, `ThemeProvider`, `ConcursoPicker`, `ConcursoSwitcher`, `KpiStrip`, `GoalRing`, `ExamCountdown`, `BankProgress`, `StreakHeatmap`, `StickyBoard`, `StickyNote`, `NotebookTree`, `NotebookEditor`, `ModeCards`, `QuestionCard`, `AnswerOption`, `Toggle`, `FilterSelect`) e me diga quais props cada um espera para eu ligar aos dados reais.
