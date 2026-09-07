# SDD — Portabilidade do Banco de Questões para Android/iOS (React Native)

**Status:** proposta
**Data:** 2026-09-07
**Autor:** Maurício (com Claude)
**Escopo:** transformar o PWA `frontend/` em um app nativo Android/iOS publicado nas lojas
públicas, mantendo o backend atual e o web app vivos em paralelo.

---

## 1. Objetivo

Entregar um aplicativo nativo para Android e iOS, publicado na Play Store e na App Store,
com paridade funcional com o PWA atual, reaproveitando o backend Express/Prisma. O app mobile é um
projeto **isolado**, e o web app permanece exatamente como está.

O app deixa de ser de uso pessoal e passa a ter usuários desconhecidos. Isso muda duas coisas
de forma estrutural, e nenhuma delas é sobre React Native: o modelo de permissão do acervo
(§2 D7, §7) e a separação entre o catálogo compartilhado e o concurso de cada usuário
(§2 D8, §7.1).

### 1.1 Objetivos não funcionais

- Funcionamento offline igual ou melhor ao do PWA (responder questões sem rede, sincronizar depois).
- Nenhuma alteração no web app. Ele não é tocado em nenhuma fase deste plano.
- As regras de sessão (Flash, Simulado, Tópico) e de correção produzem o mesmo resultado nas
  duas plataformas — mantido por testes iguais dos dois lados, não por código compartilhado
  (D2).
- Nenhum usuário consegue alterar dado de outro usuário, nem alterar o acervo compartilhado.

### 1.2 Escopo trazido pelo lançamento público

- Registro aberto (`REGISTRO_ABERTO=true`), com limite de tentativas em `/auth/register` e
  `/auth/login`.
- **Curadoria fechada:** somente a conta `contatomauriciosts@gmail.com` importa, edita ou
  apaga questões. Todo o resto do mundo é leitor do acervo. Regra detalhada em §7.
- Exclusão de conta dentro do app — exigência das duas lojas para qualquer app com login.
- Política de privacidade publicada em URL própria, formulário de segurança de dados da Play
  Store e nutrition label da App Store.
- Ícone adaptativo, splash, screenshots e ficha de loja.

### 1.3 Fora de escopo

- Notificações push, widgets de tela inicial, Apple Watch, sincronização em tempo real.
- Conteúdo enviado por usuário (não existe: o acervo é curado por uma única conta).
- Pagamento, assinatura ou compra dentro do app.
- Reescrita do backend. Ele continua sendo uma API REST pura; as mudanças de §7 são
  aditivas.

---

## 2. Decisões arquiteturais

| # | Decisão | Escolha | Justificativa |
|---|---------|---------|---------------|
| D1 | Runtime | **Expo (managed workflow)** | O app não usa nenhuma API nativa exótica. Tudo que ele precisa (SQLite, armazenamento seguro, sistema de arquivos, compartilhamento, seletor de documentos) existe como módulo Expo de primeira parte. EAS Build compila iOS sem exigir um Mac. |
| D2 | Estrutura de repositório | **Projeto isolado em `mobile/`**, irmão de `frontend/` e `backend/`. A lógica pura é **copiada**, não compartilhada | Decisão do autor: o web app não deve ser tocado. Um pacote comum exigiria mover `frontend/` e redirecionar seus imports, ou seja, mexer justamente no que precisa ficar parado. O custo aceito é a divergência (§9), contido pelos testes duplicados. |
| D3 | Distribuição | **Lojas públicas** (Play Store + App Store), via EAS Build e EAS Submit | Traz para o escopo ícone adaptativo, política de privacidade, exclusão de conta no app e os formulários de revisão das duas lojas (§1.2, Fase 7). |
| D4 | Navegação | **Expo Router** | Roteamento baseado em arquivos, análogo às rotas declarativas do React Router hoje. Mapeamento 1:1 com as 16 rotas existentes. |
| D5 | Estilo | **NativeWind v4** | Mantém a sintaxe Tailwind já usada em ~46 componentes e o `tailwind.config.ts` existente, reduzindo drasticamente o custo de reescrita visual. |
| D6 | Persistência local | **expo-sqlite** (dados) + **expo-secure-store** (tokens) | Substitui IndexedDB e localStorage com garantias melhores: os tokens saem do armazenamento em claro e passam para o Keychain/Keystore. |
| D7 | Permissão de curadoria | **Papel `admin` no `User`**, semeado para `contatomauriciosts@gmail.com`; middleware `requireAdmin` em toda rota que muta o acervo | O acervo é global e compartilhado. Esconder o botão no cliente não protege nada: a regra tem de estar no servidor. Papel em coluna (e não e-mail comparado no código) permite transferir ou revogar curadoria sem deploy. |
| D8 | Catálogo × concurso | **Novo modelo `Catalogo`**: as questões passam a pendurar no catálogo, e o `Concurso` do usuário aponta para o catálogo que ele estuda | Hoje `Questao.concursoId` aponta para um `Concurso`, que pertence a **um** usuário. Com curadoria fechada, o acervo nasceria dentro do concurso do curador e todo usuário público veria zero questões. |

---

## 3. Estado atual — análise

### 3.1 Backend (`backend/`)

Express 4 + Prisma 5 + Postgres. 49 endpoints em 11 módulos, todos sob `requireAuth` exceto
`/health` e as rotas de autenticação. JWT de acesso curto (15m) + refresh rotativo (30 dias).

**Ponto decisivo para a portabilidade:** o backend nunca armazena nem devolve enunciado,
alternativas ou gabarito no fluxo de resposta — ele conhece a questão apenas pelo `id` inteiro,
e a correção acontece no cliente. Isso significa que o contrato da API é totalmente agnóstico
de plataforma.

**Para a portabilidade em si, nenhuma alteração estrutural é necessária.** O que exige
mudança no backend é o lançamento público, não o React Native: papéis de curadoria e catálogo
compartilhado (§7). Um app pessoal instalado por link poderia ser construído contra o backend
de hoje sem tocar em uma linha dele.

**Estado atual do controle de acesso ao acervo — o item mais urgente deste documento.**
As rotas abaixo estão sob `requireAuth` e nada mais, e o acervo é global (não é por usuário):

| Rota | Efeito hoje para qualquer conta autenticada |
|------|---------------------------------------------|
| `POST /questoes/import` | importa lote no acervo de todos |
| `POST /questoes/excluir-lote` | apaga até 5000 questões por id, e as respostas/notas/marcações delas |
| `POST /questoes/excluir-lote-grupo` | apaga um lote inteiro pela chave `createdAt` |
| `POST /questoes/adotar-orfas` | reassocia questões órfãs a um concurso |
| `DELETE /questoes` | **apaga o acervo inteiro e todos os textos base** (`questoes.routes.ts:359` — o comentário já diz "(admin)", mas não há checagem) |

Enquanto `REGISTRO_ABERTO=false`, o alcance disso é a própria conta do autor. **No instante em
que o registro abrir, qualquer pessoa que criar uma conta pode destruir o acervo de todos.**
Fechar isso (§7, B0) é pré-requisito de abrir o registro, e não depende de nada do mobile.

### 3.2 Frontend (`frontend/`)

~9.200 linhas de TypeScript/TSX: 17 páginas, 30 componentes, 17 módulos de biblioteca.

Levantamento de portabilidade, arquivo a arquivo:

| Categoria | Arquivos | Linhas aprox. | Esforço |
|-----------|----------|---------------|---------|
| **Portável sem alteração** — TS puro, sem DOM | `lib/sessionBuilder.ts`, `lib/correcao.ts`, `lib/agenda.ts`, `lib/legislacao.ts`, `lib/portugues.ts`, `lib/questoesRepo.ts`, `lib/validarLote.ts`, `config/prova.ts`, `types/questao.ts`, todos os `__tests__` | ~1.200 | Copiar para `mobile/`, sem alterar o original |
| **Adaptação mecânica** — só troca de primitivas de UI e classes | 40 dos 46 componentes/páginas: `QuestaoView`, `SessionRunner`, `Home`, `Estudar`, `Flash`, `Simulado`, `Topico`, `Revisar`, `Materias`, `Marcadas`, `Anotacoes`, `Legislacao`, `Login`, `ConcursoPicker`, `BottomTab`, `TopBar`, `Card`, `Button`, `MetaPill`, `Cronometro`, `XpBar`, `ExamCountdown`, `ResumoSessao`, `ResultadoSimulado`, `SimuladosAnteriores`, `StreakCalendar`, `StreakHeatmap`, `ProgressRing`, … | ~5.500 | `div`→`View`, `p`/`span`→`Text`, `button`→`Pressable`, `className` mantido via NativeWind |
| **Reescrita dirigida** — depende de API de navegador sem equivalente | `EditorRico.tsx` (763), `StickyBoard.tsx` (204), `EditorPagina.tsx` (206), `CadernoDrawer.tsx` (194), `ImagemQuestao.tsx` (116), `Stats.tsx` (205), `Importar.tsx` (387), `lib/sanitizeHtml.ts` (132), `lib/export.ts` (14), `lib/exportarErros.ts` (315, só a parte de download/clipboard) | ~2.500 | Ver §6 |
| **Substituição de infraestrutura** | `lib/idb.ts`, `lib/api.ts` (armazenamento de token), `lib/answers.ts` (fila), `lib/concurso.ts`, `store/theme.tsx`, `App.tsx` (roteador), `main.tsx` | ~400 | Ver §5 e §6.1 |

Apenas **6 arquivos** tocam APIs de navegador realmente insubstituíveis. O resto é
superficial.

### 3.3 Inventário de APIs de navegador em uso

| API | Ocorrências | Onde |
|-----|-------------|------|
| `localStorage` | 20 | tokens, concurso ativo, tema, fila offline, filtros de `Erros` |
| `document.execCommand` | 14 | `EditorRico` |
| `window.getSelection` / `Range` | 21 | `EditorRico` |
| `innerHTML` | 7 | `EditorRico`, `EditorPagina`, `CadernoDrawer` |
| `DOMParser` | 3 | `sanitizeHtml` |
| `createPortal` | 2 | `ImagemQuestao` (lightbox) |
| `Blob` + `URL.createObjectURL` | 2 | `export.ts`, `exportarErros.ts` |
| `FileReader` / `<input type=file>` | 1 | `Importar` |
| `indexedDB` | 1 | `idb.ts` |
| `navigator.clipboard` | 1 | `exportarErros.ts` |
| Pointer Events | 1 | `StickyBoard` (arrastar post-its) |

---

## 4. Arquitetura alvo

Três projetos irmãos, cada um com seu próprio `package.json` e seu próprio `node_modules`.
Nenhum deles importa arquivo de outro.

```
questoes/
├── backend/                     # inalterado
├── frontend/                    # o PWA, INALTERADO — nenhuma fase deste plano o toca
└── mobile/                      # devconcursado (Expo, projeto isolado)
    ├── app/                     # rotas do Expo Router
    ├── components/              # UI (Card, Botao, Texto, Cabecalho, ProgressRing…)
    ├── theme/                   # tokens dos dois temas + ThemeProvider
    ├── types/                   # questao.ts            \
    ├── config/                  # prova.ts               |  CÓPIA da lógica pura
    ├── lib/                     # domínio + ports        |  vinda de frontend/src
    │   ├── ports.ts             # interfaces de armazenamento (§4.1)
    │   ├── kv.ts                # adapter expo-sqlite/kv-store
    │   ├── segredos.ts          # adapter expo-secure-store (§6.1)
    │   ├── correcao.ts          #                        |
    │   ├── sessionBuilder.ts    #                        |
    │   ├── agenda.ts            #                        |
    │   ├── legislacao.ts        #                        |
    │   ├── portugues.ts         #                        |
    │   ├── questoesRepo.ts      #                        |
    │   └── validarLote.ts       #                       /
    ├── __tests__/               # cópia dos testes do web — a rede contra divergência
    └── app.json
```

**A cópia é literal.** Os arquivos abaixo foram copiados de `frontend/src` sem uma linha de
diferença, mantendo os mesmos caminhos relativos entre si (por isso `mobile/` espelha a
estrutura de `frontend/src/`, e não a de um projeto Expo comum):

`types/questao.ts`, `config/prova.ts`, `lib/correcao.ts`, `lib/sessionBuilder.ts`,
`lib/agenda.ts`, `lib/legislacao.ts`, `lib/portugues.ts`, `lib/questoesRepo.ts`,
`lib/validarLote.ts`, e os testes `__tests__/sessionBuilder.test.ts` e
`__tests__/validarLote.test.ts`.

Manter a cópia literal (em vez de "adaptada") é o que torna a divergência detectável: um
`diff` entre as duas árvores mostra na hora o que saiu de sincronia. Ver §9.1.

### 4.1 Ports & adapters

Mesmo sem pacote compartilhado, a lógica copiada não pode conhecer `localStorage` nem
`expo-secure-store` — senão ela deixaria de ser copiável literalmente. Ela declara interfaces,
e o mobile injeta a implementação no bootstrap.

```ts
// mobile/lib/ports.ts
export interface KeyValueStore {
  get(key: string): string | null;      // SÍNCRONO — ver §6.1
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface SecretStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface QuestoesCache {
  lerTudo(): Promise<{ questoes: Questao[]; textosBase: Record<string, string>; provas: Record<string, Prova> }>;
  gravarTudo(dados: DadosCarregados): Promise<void>;
  limpar(): Promise<void>;
}
```

| Port | Como o web resolve hoje (para referência) | Adapter mobile |
|------|-------------------------------------------|----------------|
| `KeyValueStore` | `localStorage` | `expo-sqlite/kv-store` — **tem `getItemSync`/`setItemSync` de verdade**, então o adapter é mapeamento direto, sem cache |
| `SecretStore` | `localStorage` | `expo-secure-store` + espelho em memória hidratado no arranque (§6.1) |
| `QuestoesCache` | `lib/idb.ts` (IndexedDB) | `expo-sqlite` |

A coluna do web é informativa. O web não é alterado e não passa a usar port nenhum.

---

## 5. Mapa de substituições

| Web hoje | Mobile | Observação |
|----------|--------|------------|
| `react-router-dom` | `expo-router` | 16 rotas; `useNavigate` → `useRouter().push` |
| Tailwind + `index.css` (423 linhas) | NativeWind v4 + `global.css` | Reaproveita `tailwind.config.ts` |
| `[data-theme]` na raiz `<html>` | `vars()` do NativeWind no `<View>` raiz | Mesmos dois temas (fantasy/cyberpunk) |
| `lucide-react` | `lucide-react-native` | Mesma API de props (`size`, `strokeWidth`) |
| `recharts` | `victory-native` (XL) ou `react-native-gifted-charts` | Apenas `Stats.tsx` |
| SVG inline (`<circle>`, `<path>`) | `react-native-svg` | `ProgressRing`, `BottomTab`, `ConcursoSwitcher` |
| `createPortal` para lightbox | `<Modal>` do RN | `ImagemQuestao` |
| `<input type=file>` + `FileReader` | `expo-document-picker` + `expo-file-system` | `Importar` |
| `Blob` + `<a download>` | `expo-file-system` + `expo-sharing` | `export.ts`, `exportarErros.ts` |
| `navigator.clipboard` | `expo-clipboard` | `exportarErros.ts` |
| `window.confirm` | `Alert.alert` | `Importar`, `Caderno` |
| Pointer Events | `react-native-gesture-handler` (`Pan`) | `StickyBoard` |
| `IndexedDB` | `expo-sqlite` | `idb.ts` |
| `localStorage` (tokens) | `expo-secure-store` | Ganho real de segurança |
| Service Worker (fila offline) | `@react-native-community/netinfo` + fila em SQLite | `answers.ts` |
| `whitespace-pre-wrap` | comportamento padrão de `<Text>` | Nenhuma ação |
| `position: sticky` | `stickyHeaderIndices` da `FlatList` | `TopBar` |
| `filter: blur(60px)` (halos) | `expo-blur` ou gradiente radial via SVG | `Atmosfera` — degrada bem |
| `@keyframes` CSS | `react-native-reanimated` | 8 animações; `shakeX` e `fadeUp` são as visíveis |

---

## 6. Design dos subsistemas críticos

### 6.1 Armazenamento síncrono — a armadilha principal

Este é o risco de arquitetura mais fácil de subestimar.

Hoje, `lib/api.ts` monta a URL de cada requisição chamando `getConcursoId()` e lê o token com
`tokenStore.access` — **ambos síncronos**, porque `localStorage` é síncrono:

```ts
if (auth && tokenStore.access) headers["Authorization"] = `Bearer ${tokenStore.access}`;
```

`AsyncStorage` e `expo-secure-store` são assíncronos. Tornar essas leituras `async` propagaria
`await` por `api()`, `answers.ts` (`pendentes()` é chamado direto no render), `concurso.ts` e
todos os chamadores — dezenas de assinaturas, com risco alto de introduzir corridas.

**O que se confirmou na implementação:** a armadilha existe, mas só para os tokens.
`expo-sqlite` expõe API síncrona de verdade (`getItemSync`/`setItemSync` no `kv-store`,
e `openDatabaseSync` com `getAllSync`/`runSync`/`withTransactionSync` no banco), então o
`KeyValueStore`, o cache do acervo e a fila de respostas **não precisam de espelho em
memória** — o mapeamento é direto. Só `expo-secure-store` é exclusivamente assíncrono, e
é o único lugar onde o espelho abaixo foi necessário.

**Solução:** cache em memória hidratado no bootstrap, escrita assíncrona por trás.

```ts
// apps/mobile/adapters/secretStore.ts
import * as SecureStore from "expo-secure-store";

const cache = new Map<string, string>();

// Chamado UMA vez, antes de renderizar a árvore (splash screen segurada até resolver).
export async function hidratar(chaves: string[]) {
  for (const k of chaves) {
    const v = await SecureStore.getItemAsync(k);
    if (v != null) cache.set(k, v);
  }
}

export const secretStore: SecretStore = {
  get: (k) => cache.get(k) ?? null,
  set: (k, v) => {
    cache.set(k, v);                        // visível imediatamente
    void SecureStore.setItemAsync(k, v);    // durabilidade em segundo plano
  },
  remove: (k) => {
    cache.delete(k);
    void SecureStore.deleteItemAsync(k);
  },
};
```

Consequência: **`packages/core/src/api/` não muda de assinatura**, e o `SessionRunner`,
`useProgresso` e a fila offline continuam funcionando como estão. O custo é segurar a splash
screen por alguns milissegundos no arranque, o que já é o comportamento natural do Expo.

A alternativa (`react-native-mmkv`, que é síncrono nativamente) foi descartada por exigir dev
build e não funcionar no Expo Go, encarecendo o ciclo de desenvolvimento sem ganho relevante.

### 6.2 Editor rico do Caderno — o maior item isolado

`EditorRico.tsx` são 763 linhas construídas sobre `contentEditable` + `document.execCommand`,
com 14 chamadas de comando, manipulação de `Range`/`Selection` e inserção de tabelas por
`innerHTML`. **Nada disso existe em React Native.** O undo/redo nativo que o `execCommand`
dava de graça também se perde.

Três caminhos, em ordem de preferência:

**Opção A — WebView com o editor atual (recomendada para a fase 1).**
`react-native-webview` carregando um bundle HTML local que hospeda o `EditorRico` praticamente
como está. Comunicação por `postMessage`: o RN envia o HTML inicial, a WebView devolve o HTML
saneado no `onChange`.
*Prós:* reaproveita 763 linhas testadas; paridade visual e funcional imediata; o `sanitizeHtml`
continua rodando com `DOMParser` real dentro da WebView.
*Contras:* teclado do iOS dentro de WebView tem quirks conhecidos; o editor fica fora do
sistema de temas nativo (resolvível injetando as CSS vars).
*Esforço:* 3–5 dias.

**Opção B — editor nativo baseado em `@10play/tentap-editor`.**
Editor RN construído sobre TipTap/ProseMirror, com toolbar nativa.
*Prós:* teclado e seleção nativos; modelo de documento estruturado, melhor que HTML solto.
*Contras:* exige migrar o formato do conteúdo (`PaginaCaderno.conteudo` é HTML saneado, campo
`formato` já existe no schema e comporta um valor novo); reconstruir a toolbar (12 fontes,
13 tamanhos, 7 blocos, 12 cores de texto, 8 marca-textos, tabelas, lista de tarefas).
*Esforço:* 2–3 semanas.

**Opção C — editor mínimo nativo.**
Apenas negrito/itálico/listas sobre `TextInput`. Descartado: perde funcionalidade que já existe.

**Decisão:** Opção A na fase 1 (destrava o resto do app), com a Opção B como evolução isolada,
já que a fronteira do componente é estreita — `htmlInicial` entra, `onChange(html)` sai.

### 6.3 Renderização do HTML do Caderno

`EditorPagina.tsx` e `CadernoDrawer.tsx` exibem o conteúdo com `innerHTML` após saneamento.
Em RN: `react-native-render-html`, cuja lista de tags suportadas cobre integralmente a
`TAGS_OK` do `sanitizeHtml` (parágrafos, títulos, listas, tabelas, links, `mark`, `sub`/`sup`).

`sanitizeHtml.ts` usa `DOMParser`, que não existe em RN. Substituir por
[`parse5`](https://www.npmjs.com/package/parse5) ou `htmlparser2` mantendo **exatamente a mesma
lógica de lista de permissão** (`TAGS_OK`, `TAGS_FORA`, `ATTRS_OK`, `CSS_OK`, `hrefSeguro`).
O arquivo já tem teste (`__tests__/sanitizeHtml.test.ts`), que deve passar sem alteração após a
troca do parser — esse é o critério de aceite do item.

> **Segurança:** o saneamento continua sendo a fronteira de confiança do conteúdo colado.
> Ao trocar o parser, os testes existentes precisam passar antes de qualquer merge; um parser
> mais permissivo que o `DOMParser` reabriria o vetor de injeção que o arquivo fecha hoje.

### 6.4 Fila offline de respostas

Hoje: `localStorage` + `window.addEventListener("online")`. A fila é lida de forma síncrona
(`pendentes()` é usado no render).

Em mobile: mesma tabela em `expo-sqlite`, com espelho em memória (§6.1), e o gatilho de
sincronização passa a ser `NetInfo.addEventListener` mais o retorno do app ao primeiro plano
(`AppState`). O `clientId` já existente no schema (`Answer.clientId @unique`) continua sendo o
mecanismo de deduplicação — nenhuma mudança no backend.

Ganho colateral: uma fila em SQLite sobrevive a coisas que o `localStorage` do PWA não garante
(limpeza de dados do site, limite de quota).

**Duas correções que a implementação exigiu, e que o web não precisa:**

1. **Remover por `clientId`, não esvaziar a fila.** O web envia e limpa tudo, porque a
   janela entre as duas coisas é curta. No celular a requisição pode ficar minutos em voo
   numa rede ruim, e o usuário segue respondendo: esvaziar tudo apagaria as respostas
   gravadas nesse intervalo.
2. **Trava de reentrância no `flushQueue`.** O gatilho de rede e o de volta ao primeiro
   plano disparam quase juntos quando o aparelho sai do modo avião com o app aberto. Sem a
   trava, o mesmo lote vai duas vezes; o backend deduplica por `clientId`, mas é tráfego à toa.

### 6.5 Carga de questões

`GET /questoes` devolve **todo** o acervo do concurso num único payload, com as imagens
embutidas como data URI (`ImagemQuestao.dados`). No PWA isso é aceitável, já que roda em Wi-Fi
e no desktop. No celular, com dados móveis, é o principal risco de desempenho e de consumo de
franquia.

Mitigação em duas etapas:
1. **Fase 1:** manter o payload único, mas gravá-lo em SQLite e só rebuscar quando um
   `ETag`/`updatedAt` mudar. Requer um endpoint de verificação barato (§7).
2. **Fase 2 (se necessário):** mover as imagens para um endpoint próprio
   (`GET /questoes/:id/imagem/:n`) com cache em disco por `expo-image`. Isso encolhe o payload
   principal em uma ordem de grandeza e é a mudança de backend mais provável do projeto.

### 6.6 Temas

`store/theme.tsx` aplica `data-theme` em `<html>` e alterna a classe `.dark`. Em NativeWind v4,
o equivalente é `vars()` aplicado à `View` raiz:

```tsx
const TEMAS = {
  fantasy:   vars({ "--brand-500": "201 162 39", "--ink": "239 230 210", /* … */ }),
  cyberpunk: vars({ /* … */ }),
};
<View style={TEMAS[tema]} className="flex-1 bg-surface">
```

Os tokens já estão em canais RGB (`r g b`) no `index.css`, exatamente o formato que `vars()`
espera. É transcrição, não redesenho.

### 6.7 Post-its arrastáveis

`StickyBoard.tsx` usa Pointer Events, `contentEditable` para o texto da nota e `window.resize`
para o clamp. Em RN: `Gesture.Pan()` do `react-native-gesture-handler` com `useSharedValue` do
Reanimated (arrasto a 60fps na thread de UI, melhor que o atual), `TextInput multiline` no lugar
do `contentEditable`, e `onLayout` no lugar do `resize`. O debounce de persistência e o clamp
são lógica pura e migram intactos.

---

## 7. Alterações no backend

As duas primeiras são **bloqueantes para abrir o registro** e independem do mobile — podem e
devem ser feitas antes de qualquer linha de React Native. As demais seguem a ordem original.

| # | Alteração | Bloqueia o quê | Motivo |
|---|-----------|----------------|--------|
| B0 | **Papel de curadoria** (§7.2) | registro aberto | Sem isso, abrir o registro entrega `DELETE /questoes` ao público (§3.1) |
| B1 | **Catálogo compartilhado** (§7.1) | registro aberto | Sem isso, usuário público vê acervo vazio (§2 D8) |
| B2 | Exclusão de conta — `DELETE /auth/me`, apagando em cascata os dados do usuário | publicação nas lojas | Play Store e App Store exigem exclusão de conta iniciada dentro do app |
| B3 | Limite de tentativas em `/auth/register` e `/auth/login` | registro aberto | Registro aberto sem limite é convite a abuso e a enumeração de conta |
| B4 | `GET /questoes/versao` devolvendo `{ hash, atualizadoEm, total }` | nada | Evita baixar o acervo inteiro a cada arranque (§6.5) |
| B5 | Elevar `express.json({ limit: "1mb" })` para ~10mb, ou fatiar o import | nada | Lotes com imagens em data URI já se aproximam do limite atual |
| B6 | `GET /questoes/:id/imagem/:n` + cache em disco | nada, mas vira necessário na escala pública | Com muitos usuários em rede móvel, o payload único com data URI deixa de ser aceitável (§6.5) |
| B7 | `CORS_ORIGIN` sem efeito para o app nativo | nada | Apenas registrar que o mobile não depende disso |
| B8 | `GET /answers/stats` passar a respeitar `concursoId` | nada hoje | A rota aceita o parâmetro e ignora; some com um concurso só, mistura com dois (§9.2) |

O fluxo de refresh rotativo funciona sem mudança. `REGISTRO_ABERTO` passa a `true` **somente
depois** de B0, B1 e B3.

### 7.1 Catálogo compartilhado (B1)

Hoje: `Questao.concursoId → Concurso.id`, e `Concurso.userId → User.id`. O acervo, que é
conceitualmente global, está pendurado na estrutura que é por usuário. `GET /questoes` filtra
por `?concursoId=`, então cada usuário só enxerga questões cujo `concursoId` seja de um
concurso **dele** — o que, com curadoria fechada, é sempre vazio.

Modelo alvo:

```prisma
model Catalogo {
  id        String   @id @default(cuid())
  nome      String   // "Banco do Brasil — Escriturário 2026"
  banca     String
  ano       Int
  cargo     String
  publicado Boolean  @default(false) // catálogo em curadoria não aparece para o público
  createdAt DateTime @default(now())

  questoes  Questao[]
  concursos Concurso[]
}
```

- `Questao.catalogoId` substitui `Questao.concursoId`.
- `Concurso` ganha `catalogoId` — qual catálogo aquele concurso do usuário estuda. O resto do
  `Concurso` (meta diária, data da prova, arquivado) continua sendo dado pessoal e não se
  mistura com o acervo.
- `GET /questoes?concursoId=X` resolve `X → catalogoId` e devolve as questões do catálogo,
  **conferindo antes que o concurso `X` pertence ao usuário da requisição**. Essa checagem de
  dono não existe hoje e precisa entrar junto.
- `GET /catalogos` lista os catálogos com `publicado = true`, para a tela de escolha de
  concurso do usuário novo.

**Migração dos dados atuais:** cada `concursoId` distinto hoje presente em `Questao` vira um
`Catalogo` com os dados do `Concurso` de origem; os concursos existentes passam a apontar para
o catálogo correspondente. As questões órfãs (`concursoId = null`, contadas hoje por
`GET /questoes/lotes`) vão para um catálogo não publicado, para triagem manual.

### 7.2 Papel de curadoria (B0)

```prisma
model User {
  // …
  role String @default("user") // "user" | "admin"
}
```

Migração semeia `role = "admin"` para `contatomauriciosts@gmail.com`. A comparação por e-mail
acontece **uma vez, na migração** — nunca no código de rota, para que a curadoria possa ser
transferida ou revogada por `UPDATE` e não por deploy.

Middleware novo, aplicado depois de `requireAuth`:

```ts
// backend/src/middleware/admin.ts
export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const u = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { role: true },
  });
  if (u?.role !== "admin") throw new HttpError(403, "Apenas a curadoria pode alterar o acervo.");
  next();
});
```

A leitura é no banco, e não uma claim no JWT, para que a revogação valha na hora em vez de
esperar os 15 minutos do access token. O custo é uma consulta por requisição, em rotas que são
raras por natureza.

Rotas que passam a exigir `requireAdmin`:

| Rota | Observação |
|------|------------|
| `POST /questoes/import` | a regra pedida: só a curadoria importa |
| `POST /questoes/excluir-lote` | |
| `POST /questoes/excluir-lote-grupo` | |
| `POST /questoes/adotar-orfas` | some quando B1 entrar (não haverá mais órfãs) |
| `DELETE /questoes` | avaliar remover a rota de vez: destrutiva demais para existir por HTTP |
| `POST /catalogos`, `PATCH /catalogos/:id` | rotas novas de B1 |

Rotas de leitura (`GET /questoes`, `GET /questoes/lotes`, `GET /catalogos`) continuam abertas
a qualquer usuário autenticado.

**No cliente:** o `/auth/me` passa a devolver `role`, e web e mobile escondem a tela de
Importar para quem não é `admin`. Isso é conveniência de interface, **não** é o controle de
acesso — o controle é o middleware. Um cliente adulterado bate no 403 igual.

### 7.3 Direitos sobre o conteúdo

Questões com `origem = "oficial"` reproduzem texto de provas de terceiros, e as `explicacao`
são autorais. Distribuir isso publicamente é uma decisão sua, não técnica, mas precisa estar
decidida antes de submeter à revisão das lojas: as duas perguntam sobre direitos de conteúdo
no formulário. O campo `origem` já existente permite, se for o caminho escolhido, publicar só
os catálogos sem questões `oficial`.

---

## 8. Plano de execução

A Fase B é independente das demais: é backend puro, não depende de nada do React Native, e
pode rodar em paralelo com a Fase 0 ou antes dela. É a única fase cuja ausência **impede o
lançamento**, e não apenas o atrasa.

### Fase B — Backend multiusuário (3–5 dias, paralelizável)

1. B0: coluna `role`, migração semeando `contatomauriciosts@gmail.com` como `admin`,
   middleware `requireAdmin` nas rotas de §7.2, `role` no `/auth/me`.
2. B1: modelo `Catalogo`, migração dos dados atuais, `GET /catalogos`, checagem de dono em
   `GET /questoes?concursoId=`.
3. B3: limite de tentativas em `/auth/register` e `/auth/login`.
4. B2: `DELETE /auth/me` com cascata.
5. Web app: esconder Importar para quem não é `admin`; tela de escolha de catálogo no
   onboarding.

**Critério de saída:** uma segunda conta de teste, recém-criada, enxerga o catálogo publicado,
responde questões normalmente e recebe 403 em todas as seis rotas de mutação do acervo. Só
depois disso `REGISTRO_ABERTO` vira `true`.

### Fase 0 — Projeto mobile isolado + cópia da lógica ✅ FEITO

1. `create-expo-app` em `mobile/`, projeto próprio, sem workspaces. `frontend/` não é tocado.
2. Expo Router com as 6 abas da `BottomTab` do web; telas restantes como marcadores.
3. NativeWind v4 com o `tailwind.config` portado, e os dois temas via `vars()` (§6.6).
4. Ports de §4.1 e os dois adapters de armazenamento (§6.1).
5. Cópia literal da lógica pura e dos dois testes que a cobrem (§4).

**Critério de saída (atingido):** `npx vitest run` passa nos 13 testes copiados,
`npx tsc --noEmit` limpo, e o app roda no emulador com navegação e troca de tema.

### Fase 1 — Login e cliente HTTP ✅ FEITO

1. Porte de `lib/api.ts` (refresh em 401 sem corrida, escopo de concurso) e `lib/concurso.ts`,
   apoiados nas ports. `EXPO_PUBLIC_API_URL` no lugar de `import.meta.env.VITE_API_URL` —
   Metro não entende `import.meta`, e este é o único ponto em que a cópia **precisa** divergir
   do web (§9.1).
2. `store/auth.tsx` com login, registro e recuperação de sessão por `/auth/me`; guarda de rota
   no `app/_layout.tsx`.
3. `store/concurso.tsx` (lista e concurso ativo) e `lib/hooks/useProgresso.ts` (`/goals/today`).

**Critério de saída (atingido):** login real contra `https://questoesapi.mauriciosts.com`,
tokens no Keystore, sessão sobrevivendo ao reinício do app, e a tela de Início exibindo meta do
dia, ofensiva, revisões pendentes e o concurso ativo vindos da API.

**Achado durante a fase:** o NativeWind embrulha o `Pressable` e, nesse caminho, um `style` na
forma de função — a maneira padrão de reagir a `pressed` — deixa de ser aplicado, e o botão
renderiza sem fundo. A correção é pôr o visual numa `View` interna. Vale para qualquer
componente pressionável daqui em diante.

### Fase 2 — Estudo (1–2 semanas) — motor pronto, telas pendentes

**Feito.** A camada de lógica está completa e verificada no emulador:

- `lib/db.ts` — SQLite com o cache do acervo e a fila de respostas.
- `lib/questoesStore.ts` — carga cache-primeiro, com marcação `veioDoCache`.
- `lib/answers.ts` — fila offline com os gatilhos de NetInfo e `AppState`.
- `store/questoes.tsx` — popula o `questoesRepo` e guarda respondidas/erradas.
- `lib/hooks/useSessao.ts` — motor de sessão **headless**: cursor, marcação, correção,
  cronômetro e enfileiramento, sem nenhuma decisão visual.
- `lib/hooks/useMontarSessao.ts` — Flash, Simulado, Tópico e Revisar sobre o
  `sessionBuilder` copiado, com degradação offline explícita.

**Pendente:** `ResumoSessao`, `ResultadoSimulado`, `Materias`, `Marcadas`, `Anotacoes` —
todas telas, nenhuma regra nova.

**Critério de saída (atingido):** respostas dadas em modo avião ficaram na fila e
gravaram no servidor no mesmo instante em que a rede voltou, sem duplicata.

#### Decisão de arquitetura desta fase: lógica headless

O design do app vai ser refeito. Por isso a regra de sessão mora em hooks que não
renderizam nada, e as telas são cascas finas que só leem `estado` e chamam `marcar`,
`confirmar` e `avancar`. Trocar a interface inteira não deve exigir tocar em regra de
sessão, correção ou sincronização.

### Fase 3 — Casa e estatísticas — camada de dados pronta

**Feito.** Todos os hooks, mais as telas mínimas que provam cada um:

| Hook | Fonte | Observação |
|------|-------|------------|
| `useStats` | `/answers/stats` + `/stats/heatmap` | as duas chamadas são independentes: o heatmap falhar não esconde os números |
| `useMaterias` | memória (`questoesRepo`) | sem rede — funciona offline, ao contrário de Stats |
| `useErros` | `/answers/erradas` | dois eixos: período e `pendentes`/`todas` |
| `useMarcadas` | `/marcadas` | otimista com desfazer em erro; PUT/DELETE são idempotentes |
| `useNotas` / `useNotaDaQuestao` | `/notes` | guarda contra resposta atrasada sobrescrever a questão atual |
| `usePostits` | `/postits` | um timer de debounce POR post-it (§6.7) |

Telas: `Materias`, `Stats`, `Erros`, `Marcadas`, mais os atalhos na Home e o botão de
marcar dentro da sessão.

**Nenhuma agregação foi reimplementada no cliente.** Taxa por matéria, pontos fracos e
tempo médio saem de `backend/src/lib/stats.ts`. Recalcular no app criaria uma segunda
verdade, e o mobile passaria a mostrar número diferente do web para o mesmo usuário.

**Pendente:** `StreakCalendar`, `StreakHeatmap`, `XpBar`, `ExamCountdown` e o
`StickyBoard` arrastável — todos visuais, e todos com os dados já disponíveis nos hooks
acima. Ficam para depois do design novo.

### Fase 4 — Caderno e conteúdo (1 semana)

`Caderno`, `EditorPagina`, `CadernoDrawer`, editor rico via WebView (§6.2), renderização HTML
(§6.3), `Anotacoes`, `Legislacao`.

### Fase 5 — Import/export e acabamento (3–5 dias)

`Importar` com `expo-document-picker`, exports via `expo-sharing`, `ConcursoPicker`,
`ConcursoSwitcher`, `Atmosfera`, animações com Reanimated, ícone e splash.

### Fase 6 — Build interno (2–3 dias)

Perfis do EAS Build, APK interno para Android, TestFlight interno para iOS, `EXPO_PUBLIC_API_URL`
apontando para a API de produção. Rodada de uso real antes de qualquer submissão.

### Fase 7 — Publicação nas lojas (1–2 semanas, boa parte em espera)

1. Conta de desenvolvedor: Google Play (US$ 25, uma vez) e Apple Developer (US$ 99/ano).
2. Ícone adaptativo, splash, screenshots por tamanho de tela, texto da ficha, classificação
   indicativa.
3. Política de privacidade em URL pública; formulário de segurança de dados (Play) e nutrition
   label (App Store) — declarar e-mail, nome e dados de estudo.
4. Exclusão de conta dentro do app (B2), mais a URL de exclusão que a Play Store exige à parte.
5. `eas submit`, teste interno na Play e TestFlight, depois produção.
6. Sentry ou equivalente antes do tráfego público — sem isso, erro de usuário desconhecido é
   invisível.

O tempo de revisão é externo: a Apple costuma responder em 24–48h, e uma rejeição na primeira
submissão é o caso comum, não a exceção.

**Estimativa total: 8 a 11 semanas** de trabalho focado (as 6–8 originais, mais a Fase B e a
Fase 7), com o app utilizável para estudo real ao final da Fase 2 e publicável ao final da
Fase 7.

---

## 9. Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Registro aberto antes da Fase B | **Crítico** | Baixa | Ordem explícita: `REGISTRO_ABERTO=true` é o último passo da Fase B, depois do teste de 403 (§8) |
| Payload do acervo por usuário desconhecido em rede móvel estoura custo de banda | Alto | Alta | B4 e B6 deixam de ser opcionais na escala pública (§7) |
| **Divergência entre a lógica do web e a cópia do mobile** | Alto | **Alta** | Consequência direta e aceita de D2. Contenção em §9.1 |
| Rejeição na revisão da App Store | Médio | **Alta** | Esperada; exclusão de conta (B2) e política de privacidade cobrem os dois motivos mais comuns (Fase 7) |
| Direitos sobre questões `origem = "oficial"` | Médio | Média | Decidir antes de submeter; o campo `origem` permite publicar só catálogos sem elas (§7.3) |
| Editor rico consome mais tempo que o previsto | Alto | Média | Opção A (WebView) na fase 1 fixa o custo em dias, não semanas (§6.2) |
| Payload de `/questoes` grande demais em rede móvel | Alto | Alta | B1 na fase 2; B4 se o acervo com imagens crescer (§6.5) |
| Refatoração quebrar o web app | Baixo | **Muito baixa** | O plano não altera nenhum arquivo de `frontend/` (D2). O risco caiu de Médio/Média para cá justamente por isso |
| Divergência visual entre os dois temas em RN | Baixo | Média | Tokens já são canais RGB; a transcrição para `vars()` é direta (§6.6) |
| Troca de parser em `sanitizeHtml` afrouxar o saneamento | Alto | Baixa | Os testes existentes são o portão de merge (§6.3) |
| iOS exigir build/assinatura fora do EAS | Médio | Baixa | Distribuição pessoal via TestFlight interno já foi decidida (D3) |

---

### 9.1 Contenção da divergência

Com duas cópias, um ajuste em `sessionBuilder.ts` ou `correcao.ts` no web não chega ao mobile
sozinho. Três medidas, em ordem de custo:

1. **Cópia literal, nunca adaptada.** Enquanto os arquivos forem byte a byte iguais, um
   `diff -r` entre `frontend/src` e `mobile/` responde "o que saiu de sincronia?" em um
   comando:

   ```sh
   for f in types/questao.ts config/prova.ts lib/correcao.ts lib/sessionBuilder.ts \
            lib/agenda.ts lib/legislacao.ts lib/portugues.ts lib/questoesRepo.ts \
            lib/validarLote.ts; do
     diff -q "frontend/src/$f" "mobile/$f"
   done
   ```

   Vale colocar isso num script (`scripts/checar-copia.sh`) e rodar antes de cada release do
   mobile.

2. **Testes duplicados.** `mobile/__tests__/` tem os mesmos testes de `frontend/src/__tests__/`.
   Uma regra de negócio alterada só no web faz o teste **do web** mudar; comparar os dois
   arquivos de teste é o segundo sinal de divergência.

3. **A exceção documentada.** Um único ponto precisa divergir de propósito: a leitura da URL
   base da API (`import.meta.env.VITE_API_URL` no web, `process.env.EXPO_PUBLIC_API_URL` no
   mobile). Toda outra diferença é bug, não decisão.

4. **Quando a plataforma falta, preencher o global — não editar a cópia.** `correcao.ts` gera
   o `clientId` com `crypto.randomUUID()` e cai num fallback `Date.now()` + `Math.random()`
   quando `crypto` não existe. O Hermes não expõe `crypto`, então o mobile caía no fallback,
   e esse id é a chave de deduplicação da fila (`Answer.clientId @unique`): dois aparelhos
   respondendo no mesmo milissegundo poderiam colidir e o backend descartaria a segunda
   resposta como duplicata — perda silenciosa. A correção foi `lib/polyfills.ts`, que
   instala `crypto.randomUUID` via `expo-crypto` como primeiro import do app. `correcao.ts`
   segue idêntico ao do web, e o script de sincronia segue passando. Este é o padrão para
   qualquer API de plataforma que falte no RN.

O que estas medidas **não** dão: nenhuma delas impede a divergência, só a tornam visível. A
garantia de fato continua sendo o critério de aceite #2 (§10), verificado à mão.

---

## 10. Critérios de aceite

1. Os testes copiados em `mobile/__tests__/` passam sem alteração de conteúdo em relação aos
   de `frontend/src/__tests__/`, e o script de §9.1 não acusa diferença fora da exceção
   documentada.
2. Uma sessão de Simulado montada no mobile produz a mesma seleção de questões que o web app,
   dada a mesma semente e o mesmo acervo.
3. Responder 20 questões em modo avião e sincronizar ao reconectar não gera duplicatas
   (garantido por `Answer.clientId`).
4. O conteúdo do Caderno criado no web abre e edita no mobile, e vice-versa, sem perda de
   formatação.
5. A ofensiva (streak), a meta diária e o heatmap exibem os mesmos números nas duas plataformas
   para o mesmo usuário.
6. O app arranca offline, sem rede, exibindo o acervo em cache.
7. Uma conta que não seja `contatomauriciosts@gmail.com` recebe 403 em `POST /questoes/import`,
   `POST /questoes/excluir-lote`, `POST /questoes/excluir-lote-grupo`,
   `POST /questoes/adotar-orfas` e `DELETE /questoes` — verificado por teste automatizado no
   backend, e não por inspeção da interface.
8. Uma conta recém-criada, que nunca importou nada, escolhe um catálogo publicado e estuda o
   acervo completo.
9. Uma conta não consegue ler nem alterar o concurso, o caderno, os post-its, as notas nem as
   respostas de outra.
10. A exclusão de conta dentro do app remove os dados pessoais do usuário e não toca no acervo
    compartilhado.

---

### 9.2 Achado no backend: `/answers/stats` ignora o concurso

`lib/api.ts` (nas duas plataformas) anexa `?concursoId=` a tudo que começa com
`/answers`, mas `GET /answers/stats` chama `calcularStats(userId, desde)`, que filtra
só por `userId`. Verificado contra a API de produção: a rota devolve o mesmo
`totalRespondidas` com e sem o parâmetro.

Hoje isso não aparece, porque a conta tem um único concurso. Com dois, a tela de
Estatísticas passa a somar os dois — no mobile **e no web**, já que o defeito é do
backend e não do porte.

Não foi corrigido aqui: é backend, é compartilhado com o web e está fora do escopo
desta fase. Entra como B8 em §7 quando o multi-concurso passar a ter uso real.

---

## 11. Apêndice — o que definitivamente não precisa mudar

- **Todo o `frontend/`.** Nenhuma fase deste plano abre um arquivo do web app (D2).
- Todo o `backend/src/lib/` (`srs.ts`, `stats.ts`, `streak.ts`, `date.ts`, `jwt.ts`).
- As 12 migrações existentes do Prisma (as de §7 são aditivas, e a de `Catalogo` é a única
  que move dados).
- O contrato dos 49 endpoints **para o cliente que só lê e responde**. As mudanças de §7 são
  novas rotas e novos 403 em rotas de mutação; nenhuma resposta de leitura muda de formato,
  exceto `/auth/me`, que ganha `role`.
- A decisão de arquitetura que torna tudo isso barato: **o backend nunca vê o conteúdo da
  questão.** Ela é a razão de o app mobile não precisar de nenhuma renegociação de contrato.

O que **deixou** de valer em relação às versões anteriores deste documento:

1. A afirmação de que o backend não mudaria. Era verdadeira para distribuição pessoal
   (D3 original) e deixou de ser no instante em que o app passou a ter usuários desconhecidos.
   A mudança não vem do React Native — vem do público.
2. O monorepo com núcleo compartilhado (D2 original) e a Fase 0 de extração. O web app fica
   parado, e o preço disso é a cópia, com a divergência que ela traz (§9.1).
