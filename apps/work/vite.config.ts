import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { CONTENT_SECURITY_POLICY } from "./src/security/csp";

export default defineConfig({
  plugins: [
    react(),
    {
      // El motor WASM de ORVUPI AI pesa más de lo que admite el alojamiento (25 MiB por archivo):
      // no se publica; el worker lo descarga de jsDelivr (versión fijada) y lo guarda en caché.
      name: "orvupi-drop-big-wasm",
      generateBundle(_options, bundle) {
        for (const [name, item] of Object.entries(bundle)) {
          if (name.endsWith(".wasm") && item.type === "asset" && (item.source as Uint8Array).length > 24 * 1024 * 1024) delete bundle[name];
        }
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["avatar.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "favicons/docs.svg", "favicons/sheets.svg", "favicons/slides.svg", "favicons/forms.svg", "favicons/drawings.svg", "favicons/notes.svg"],
      manifest: {
        name: "ORVUPI Work",
        short_name: "ORVUPI Work",
        description: "Suite de productividad gratuita. Los archivos se quedan en este dispositivo.",
        lang: "es",
        start_url: "./",
        scope: "./",
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
            urlPattern: ({ request, url }: { request: Request; url: URL }) => ["script", "style", "worker", "font", "image"].includes(request.destination) && !url.pathname.endsWith("/favicon-32.png"),
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
    // Las fuentes nunca van en línea: la CSP solo permite font-src 'self'.
    assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/i.test(file) ? false : undefined),
  },
});
