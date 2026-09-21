import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// PWA: cacheia o app shell e o questoes.json (permite responder offline; as respostas
// são sincronizadas quando a conexão volta — ver src/lib/syncQueue.ts).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "devconcursado — banco de questões",
        short_name: "devconcursado",
        description: "Estudo por questões para concurso",
        theme_color: "#6C4DFF",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        // Ícone SVG funciona para instalação. Para melhor suporte (maskable no Android),
        // adicione icon-192.png e icon-512.png em /public e liste-os aqui.
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        // Deploy novo com a aba aberta: sem isso o cache antigo sobrevive e o app fica
        // pedindo pedaços de código que já não existem no servidor (tela branca).
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // O index.html nunca deve responder no lugar de um asset que sumiu.
        navigateFallbackDenylist: [/^\/assets\//],
        runtimeCaching: [
          {
            // API: network-first para dados frescos, cai no cache offline.
            urlPattern: ({ url }) => url.pathname.startsWith("/answers") || url.pathname.startsWith("/goals"),
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://questoesapi.mauriciosts.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        headers: {
          Origin: "https://questoes.mauriciosts.com",
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // separa libs pesadas (Recharts/React) em chunks próprios → melhor cache
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          // motion.dev NÃO tem chunk próprio de propósito: medido nas duas formas, deixar
          // o componente mínimo junto do app custa ~20 kB gzip bloqueantes, contra ~27 kB
          // num chunk separado que também bloqueia (é importado no boot). Os recursos de
          // animação ficam num chunk dinâmico (src/lib/motionFeatures.ts), fora do caminho
          // crítico — é de lá que vem a maior parte do peso da biblioteca.
        },
      },
    },
  },
});
