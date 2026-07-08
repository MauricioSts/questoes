# Frontend — Banco de Questões (PWA)

Vite + React + TypeScript + TailwindCSS + React Router + Recharts. PWA instalável.

## Conteúdo estático
As questões ficam em [src/data/questoes.json](src/data/questoes.json) e são empacotadas no
build (vão para o bundle, cacheadas pelo service worker → funciona offline). Substitua o
arquivo de exemplo pelo completo mantendo o formato `{ meta, textos_base, questoes }`.

## Regras de negócio (frontend)
- [src/lib/correcao.ts](src/lib/correcao.ts) — correção de acerto/erro (compara com o gabarito).
- [src/lib/sessionBuilder.ts](src/lib/sessionBuilder.ts) — montagem de Flash, Simulado
  (proporção da prova + ênfase nas erradas) e Tópico. Config central em
  [src/config/prova.ts](src/config/prova.ts).

## Rodar em dev
```bash
cp .env.example .env      # VITE_API_URL=http://localhost:3333
npm install
npm run dev
```

## Testes
```bash
npm test   # correção, montagem do simulado proporcional, seleção de erradas (flash), nota
```

## Deploy na Vercel
1. Importe o repositório na Vercel e selecione a pasta **`frontend`** como *Root Directory*.
2. Framework preset: **Vite**. Build: `npm run build`. Output: `dist`.
3. Variável de ambiente: `VITE_API_URL=https://SEU-BACKEND` (ex.: `https://api.mauriciosts.com`).
4. O [vercel.json](vercel.json) já cuida do fallback de SPA (todas as rotas → `index.html`).
5. Domínio: aponte `mauriciosts.com` para o projeto nas configurações de Domains.

> **CORS:** garanta que o backend tenha `CORS_ORIGIN=https://mauriciosts.com`.

## Ícones PWA (opcional, recomendado)
O manifest usa `favicon.svg` (instalável). Para melhor suporte no Android (ícone maskable),
adicione `public/icon-192.png` e `public/icon-512.png` e liste-os em `vite.config.ts`.
