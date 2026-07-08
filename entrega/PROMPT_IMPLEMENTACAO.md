# Prompt de implementação — Redesign do app de questões (Dataprev 2026)

> Cole isto no seu assistente de código (Claude Code, Cursor, etc.), rodando na raiz do repositório com acesso à pasta `frontend/`.

---

## Contexto

Você vai **reestilizar o frontend** (React + TypeScript + Tailwind + Vite) de um app de estudo por questões, mobile-first e PWA. **Não altere a lógica de negócio, chamadas de API, correção de acerto/erro, autenticação nem o schema.** Mexa apenas na camada de UI: componentes visuais, layout, cores, tipografia, estados e microinterações. Toda a lógica de correção continua no frontend e o backend segue recebendo apenas o resultado.

O redesenho é **gamificado equilibrado**: streak/ofensiva em destaque, XP e níveis, barra de progresso rumo à prova e contagem regressiva. **Proibido usar emojis** — todos os ícones devem ser SVG geométricos (use `lucide-react`, que provavelmente já está no projeto; se não, instale).

---

## 1. Design tokens (Tailwind)

Adicione ao `tailwind.config.{js,ts}` em `theme.extend`:

```js
colors: {
  brand: {
    50:'#F1F0FA', 100:'#E9E7F8', 200:'#D6D0F5', 300:'#B9AEF0',
    400:'#8B7CF6', 500:'#5B4FE0', 600:'#4A3DB0', 700:'#332A6E',
    800:'#2C2260', 900:'#1C1840', ink:'#1B1738'
  },
  flame:   { from:'#FF8A3D', to:'#FF4D6D', text:'#E14A20' }, // streak / ofensiva
  success: { from:'#12995B', to:'#17B26A', soft:'#E8F7EF' }, // acerto / simulado
  danger:  { from:'#E14A5F', soft:'#FDECEF' },               // erro / revisar
  cyan:    { from:'#7CF5C4', to:'#41D0FF' },                 // progresso no hero escuro
  muted:   '#7A76A0',   // texto secundário
  faint:   '#9C98B8',   // texto terciário
  hair:    '#EAE7F7',   // bordas
},
fontFamily: {
  display: ['"Bricolage Grotesque"','sans-serif'], // títulos / números grandes
  sans:    ['"Plus Jakarta Sans"','system-ui','sans-serif'], // corpo (default)
},
borderRadius: { xl:'16px','2xl':'20px','3xl':'26px' },
```

Importe as fontes no `index.html` (ou no CSS global):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Fundo global do app: `bg-brand-50` com um brilho radial no topo:
```css
background: radial-gradient(1200px 600px at 80% -10%, rgba(124,111,246,0.14), transparent 60%), #F1F0FA;
```

Keyframes globais (adicione ao CSS global):
```css
@keyframes floaty { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-14px) rotate(6deg)} }
@keyframes pop { 0%{transform:scale(.9);opacity:0} 60%{transform:scale(1.03)} 100%{transform:scale(1);opacity:1} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes ringdraw { from{stroke-dashoffset:327} }
@keyframes flamewave { 0%,100%{transform:scaleY(1) translateY(0)} 50%{transform:scaleY(1.08) translateY(-2px)} }
```

---

## 2. Princípios visuais (aplique em tudo)

- **Cartões**: fundo branco, `border border-hair`, cantos `rounded-2xl`/`rounded-3xl`, sombra suave difusa (`shadow: 0 12px 30px -18px rgba(27,23,56,.2)`). Nada de sombras duras.
- **Títulos e números grandes** em `font-display font-extrabold` com `tracking-tight` (`letter-spacing:-0.02em`). Corpo em `font-sans`.
- **Escala mobile**: alvos de toque ≥ 44px. Nada de texto abaixo de 12px.
- **Cor por contexto**: roxo = navegação/estudo; laranja = ofensiva/flash; verde = acerto/simulado; vermelho = erro/revisar.
- **Microinterações**: cartões clicáveis sobem `-3px` no hover; botões primários sobem `-2px`. Cada tela entra com `animation: pop .35s ease both`.
- **Botão primário**: gradiente `from-brand-500 to-[#7C6FF5]`, texto branco, `rounded-2xl`, `font-extrabold`, sombra colorida `0 16px 30px -14px rgba(91,79,224,.8)`.
- **Toggles/switches** custom (não use checkbox nativo): pílula 42×24, bolinha branca 18px; ligado = `bg-brand-500`.
- **Selects/inputs**: `bg-[#F7F6FD] border-hair rounded-xl`, `appearance-none`, label acima em 12px `font-bold text-muted`.

---

## 3. Shell responsivo (layout raiz)

- **Breakpoint**: desktop ≥ 860px, mobile < 860px.
- **Desktop**: sidebar fixa de 96px à esquerda (fundo branco, `border-r`), com logo no topo (quadrado `rounded-xl`, gradiente `brand-500→brand-400`, ícone de escudo/livro em SVG) e os 6 itens em coluna, cada um ícone + rótulo pequeno. Item ativo: texto `brand-500` e fundo `bg-brand-500/10`.
- **Mobile**: barra inferior fixa (`bottom-0`), fundo `bg-white/92` com `backdrop-blur`, 6 itens ícone+rótulo, ativo em `brand-500`.
- **Header** (ambos, sticky no topo, `bg-brand-50/82` + `backdrop-blur`, borda inferior fina):
  - Esquerda: no mobile, logo pequeno; título "Questões" em `font-display font-extrabold`; badge "DATAPREV · FGV" (`bg-brand-100 text-muted`, pílula 11px).
  - Direita: chip de streak (pílula com gradiente laranja claro + ícone de chama + número), no desktop também o chip de nível (quadradinho com número + mini barra de XP + label), e botão "Sair" (ícone de logout + texto).
- Itens de navegação: **Home · Estudar · Flash · Revisar · Simulado · Stats**.
- `main`: `max-w-[1000px] mx-auto`, padding `22px`, com `padding-bottom:120px` no mobile (para não ficar sob a barra).

**Ícones (lucide-react):** Home→`Home`, Estudar→`BookOpen`, Flash→`Zap` (preenchido), Revisar→`RefreshCw`, Simulado→`FileText`, Stats→`BarChart3`, streak→`Flame`, prova→`CalendarDays`, sair→`LogOut`. Nunca emoji.

---

## 4. Tela HOME

Saudação: `Olá, {nome}` (`font-display`, 30px) + subtítulo "Bora manter a ofensiva de hoje." em `text-muted`.

Grid de 2 colunas no desktop, 1 no mobile:

**a) Cartão de meta diária (hero escuro)** — `rounded-3xl`, gradiente `from-[#2C2260] via-[#4A3DB0] to-[#6B5CE8]`, texto branco, com 1–2 círculos decorativos translúcidos animados (`floaty`).
- Anel de progresso SVG (148px, `viewBox 0 0 120 120`, rotacionado -90°): trilha `rgba(255,255,255,.16)` + arco com gradiente `cyan.from→cyan.to`, `stroke-width:13`, `stroke-linecap:round`, `stroke-dasharray:327`, `stroke-dashoffset` calculado por `327*(1-feito/total)`, animação `ringdraw 1.1s`. No centro: número grande de respondidas + "de {meta} hoje". **Quando bater a meta, o arco fica verde** (`success`).
- À direita: "META DIÁRIA" (overline), "Faltam N questões" e botão branco "Continuar estudando" (→ Estudar).

**b) Cartão de ofensiva** — branco. Ícone de chama em quadrado com gradiente `flame` (animação `flamewave`), "{streak} dias" grande + "de ofensiva. Não quebre!". Abaixo, **calendário da semana**: 7 colunas (S T Q Q S S D); dia concluído = quadradinho com gradiente laranja + check branco; hoje não-concluído = quadrado branco com borda tracejada laranja; futuro = quadrado `bg-brand-100`.

Segundo grid de 2 colunas:

**c) Cartão de XP/Nível** — branco. Quadrado com número do nível (gradiente brand) + "Nível N" + rank ("Analista em treino") + "{cur}/{need} XP". Barra de progresso com gradiente animado `shimmer`. Rodapé: "Faltam X XP para o nível N+1".

**d) Cartão de contagem para a prova (escuro)** — gradiente `from-[#1C1840] to-[#332A6E]`. "CONTAGEM PARA A PROVA" (overline), número grande de dias restantes + "dias restantes", data da prova, ícone de calendário. Barra fina com gradiente `cyan` = % do plano concluído.
> Calcule os dias como `Math.floor((dataProva - hoje)/86400000)`. Fuso de referência do app: `America/Fortaleza`.

**e) "Modos de estudo"** — grid de 4 cartões (2 col no mobile), cada um: ícone em quadrado colorido suave, título, subtítulo. Cores: Estudar (roxo `#EEF0FF`/`#4A57E0`), Flash (laranja `#FFF0E8`/`#F5722B`), Simulado (verde `#E8F7EF`/`#12995B`), Revisar (vermelho `#FDECEF`/`#E14A5F`). Cada um navega para sua aba.

**f)** Botão tracejado full-width "Minhas marcadas para revisar depois".

---

## 5. Tela ESTUDAR

Centralizada, `max-w-[560px]`. Cabeçalho com ícone `BookOpen` em quadrado roxo suave + "Modo Estudo" + subtítulo. Cartão branco com os filtros empilhados: **Módulo, Matéria, Assunto** (selects), linha de 2 colunas **Dificuldade / Quantidade**, e dois toggles: "Só não respondidas" e "Só erradas anteriormente" (este último realçado com `bg-[#F6F5FE] border-brand-200` quando ativo). Botão primário full-width "Começar sessão" com seta.

---

## 6. Tela FLASH

Centralizada, `max-w-[520px]`. Hero grande `rounded-3xl` com gradiente `flame`, círculos decorativos animados, ícone `Zap` preenchido em quadrado translúcido, título "Flash", descrição ("10 questões do **Módulo II** que você já errou — revisão espaçada em 5 minutos") e 3 pílulas: "10 questões", "Módulo II", "Prioriza erradas". Abaixo, botão escuro (`bg-brand-ink`) "Começar Flash".

---

## 7. Tela REVISAR

`max-w-[560px]`. Cabeçalho com ícone `RefreshCw` em quadrado vermelho suave + "Revisar" + subtítulo ("assim que acertar, elas somem daqui"). Botão primário "Revisar N questões". Lista de itens: cada linha é um cartão branco com uma barrinha colorida vertical à esquerda, título da questão + caminho (módulo · matéria) em `text-faint`, e à direita um badge "N× errou" em `bg-danger-soft text-[#E14A5F]`.

---

## 8. Tela SIMULADO

`max-w-[620px]`. Cabeçalho com ícone `FileText` em quadrado verde suave + "Simulado" + subtítulo ("70 questões na proporção real da prova — sem feedback até o fim"). Grid 2 colunas:
- **Composição** (cartão branco): lista com barra de proporção por matéria — Mód. I: Português 12, Inglês 12, RLM 5, Atualidades+IA 6, Legislação 5; Módulo II (peso 2,5) 30. Barras roxas para Mód. I, verdes para Mód. II.
- Coluna direita: cartão escuro "Pontuação máxima 115 pts" com nota da regra de peso (Módulo I peso 1 · Módulo II peso 2,5), e um toggle "Cronômetro de 4h · Pausável — zera e finaliza sozinho".

Botão primário **verde** (gradiente `success`) "Iniciar simulado".

---

## 9. Tela STATS ("Onde estou errando")

Cabeçalho com ícone `BarChart3` + título + select de período (Tudo / 7 dias / 30 dias) à direita.
- **3 KPIs**: "Respondidas" (número), "Taxa de acerto" (% em verde + delta ▲), "Ofensiva" (cartão com gradiente `flame`, "{streak} dias").
- Grid 2 col: **Questões por dia** (barras — última em gradiente brand, demais em `#DED9F7`) e **Evolução da taxa de acerto** (área+linha SVG, linha `brand-500`, gradiente de preenchimento roxo suave, ponto final destacado). Se o projeto já usa **Recharts**, mantenha Recharts, apenas reestilize (cores brand, `strokeWidth` 3, cantos arredondados nas barras, grid discreto).
- **Acerto por matéria** (cartão branco): barras horizontais rotuladas; verde ≥75%, roxo 60–74%, laranja <60%, com % à direita.
- **Pontos de melhoria** (cartão com fundo `from-[#FDECEF] to-[#FFF4F0]`, borda `#F7D6DC`): ícone `AlertTriangle`, título "Pontos de melhoria", lista dos assuntos com menor acerto (mín. 3 respostas), cada item com o % num quadrado vermelho suave + nome + subtítulo + botão "Treinar agora" (leva ao modo dirigido já configurado com aquele assunto).

---

## 10. Tela de QUESTÃO (responder)

`max-w-[620px]`.
- Topo: botão voltar (quadrado 38px com chevron), progresso "Questão X de N" + cronômetro à direita, barra de progresso roxa.
- Cartão branco: linha de pílulas de metadados (Módulo em roxo, Matéria em verde, Dificuldade em vermelho/laranja/verde conforme nível), enunciado em 16px `font-semibold`, e as alternativas como **botões full-width** com um badge de letra (A–E) à esquerda.
- **Correção no frontend (modo estudo/flash/revisar/tópico):** ao clicar, revela imediatamente:
  - Correta → borda verde, `bg-[#F0FBF5]`, badge verde com check.
  - Escolhida errada → borda vermelha, `bg-[#FDF1F3]`, badge vermelho com X, **e a correta também é destacada em verde**.
  - Demais → apagam levemente.
  - Depois de revelar, os botões ficam `cursor-default` (trava a resposta).
- Bloco de **explicação** (verde se acertou / vermelho se errou), com título "Você acertou!" / "Resposta incorreta" + texto da explicação, e ações "Anotar" (ícone lápis) e "Marcar" (ícone bookmark).
- Botão primário "Próxima questão".
- **No modo Simulado é diferente:** sem feedback nem explicação durante a prova, anotações ocultas; a correção só aparece na tela de resultado ao final.

---

## 11. Regras de implementação

- **Componentize** de forma reutilizável: `AppShell`, `BottomNav`/`SideNav`, `TopBar`, `Card`, `PrimaryButton`, `StatCard`, `ProgressRing`, `StreakCalendar`, `XpBar`, `ExamCountdown`, `QuestionCard`, `AnswerOption`, `FilterSelect`, `Toggle`, `MetaPill`.
- **Não invente dados**: conecte cada componente aos dados/estado que já existem (streak, XP, meta diária, agregações de stats, filas de revisão). Onde faltar um valor, exponha uma prop e deixe TODO comentado — não hardcode conteúdo fictício em produção.
- **Acessibilidade**: `aria-label` nos botões só-ícone, foco visível, contraste mínimo AA.
- **PWA/responsivo**: preserve o comportamento offline e a instalação; garanta que tudo funcione de 360px até desktop.
- **Sem emojis em lugar nenhum** — sempre ícones SVG.
- Mantenha os nomes de rota/abas existentes; apenas troque a camada visual.

Entregue os componentes reestilizados e me diga quais props cada um espera para eu ligar aos dados reais.
