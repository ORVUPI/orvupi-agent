import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { CONTENT_SECURITY_POLICY } from "./src/security/csp";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["favicon-32.png", "avatar.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "favicons/docs.svg", "favicons/sheets.svg", "favicons/slides.svg", "favicons/forms.svg", "favicons/drawings.svg", "favicons/notes.svg"],
      manifest: {
        name: "ORVUPI Work",
        short_name: "ORVUPI Work",
        description: "Suite de productividad gratuita. Los archivos se quedan en este dispositivo.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#fff8ec",
        theme_color: "#ff3070",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cacheId: "orvupi-work-063",
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: [],
        navigateFallback: null,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "orvupi-work-pages-063",
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ request }: { request: Request }) => ["script", "style", "worker", "font", "image"].includes(request.destination),
            handler: "NetworkFirst",
            options: {
              cacheName: "orvupi-work-assets-063",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 80, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
    {
      name: "orvupi-csp",
      apply: "build",
      transformIndexHtml(html) {
        const meta = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`;
        return html.replace("</head>", `${meta}\n</head>`);
      },
    },
  ],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
