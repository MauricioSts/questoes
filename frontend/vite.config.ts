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
        name: "Banco de Questões — Dataprev",
        short_name: "Questões",
        description: "Estudo por questões para concurso",
        theme_color: "#4f46e5",
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
  build: {
    rollupOptions: {
      output: {
        // separa libs pesadas (Recharts/React) em chunks próprios → melhor cache
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
        },
      },
    },
  },
});
