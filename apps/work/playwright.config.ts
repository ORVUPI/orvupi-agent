import { defineConfig, devices } from "@playwright/test";

// En CI la matriz 0.8.3 completa no cabe en el tiempo del trabajo: una combinación por navegador. En local, todas.
const D83_CI = new Set(["chromium-desk", "firefox-phone", "webkit-tablet"]);
// Auditoría 0.9.3 de Presentaciones: en CI escritorio, tableta y móvil con Chromium y WebKit; en local, los tres navegadores.
// En la CI solo escritorio Chromium (la matriz completa, 3 navegadores × 3 tamaños, se pasa en local antes de cada versión): con más se pasa de los 40 min del trabajo
const A93_CI = new Set(["chromium-desk"]);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    // Las pruebas existentes están escritas con la interfaz en español; sin preferencia, Work sigue el idioma del navegador.
    locale: "es-ES",
    trace: "retain-on-failure",
    viewport: { width: 1360, height: 900 },
  },
  webServer: {
    command: "npm run build && npm run preview",
    port: 4174,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } },
      testIgnore: /fase-080|docx-081|docx-082|docx-083|docx-094|imgmenu-084|imgpaste-086|fuente-087|slides-auditoria-093/,
    },
    {
      name: "pixel-7",
      use: { ...devices["Pixel 7"] },
      testMatch: /mobile-060/,
    },
    {
      name: "iphone-14",
      use: { ...devices["iPhone 14"] },
      testMatch: /mobile-060/,
    },
    ...faseProjects(),
    ...(["chromium", "firefox", "webkit"] as const).flatMap((browser) => [
      { name: `docx-${browser}-desk`, testMatch: /docx-081/, use: { browserName: browser, viewport: { width: 1366, height: 900 } } },
      { name: `docx-${browser}-phone`, testMatch: /docx-081/, use: { browserName: browser, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser !== "firefox" } },
      { name: `d82-${browser}-desk`, testMatch: /docx-082/, use: { browserName: browser, viewport: { width: 1366, height: 900 } } },
      { name: `d82-${browser}-tablet`, testMatch: /docx-082/, use: { browserName: browser, viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: browser !== "firefox" } },
      ...(process.env.CI && !D83_CI.has(`${browser}-desk`) ? [] : [{ name: `d83-${browser}-desk`, testMatch: /docx-083/, use: { browserName: browser, viewport: { width: 1366, height: 900 } } }]),
      ...(process.env.CI && !D83_CI.has(`${browser}-tablet`) ? [] : [{ name: `d83-${browser}-tablet`, testMatch: /docx-083/, use: { browserName: browser, viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: browser !== "firefox" } }]),
      ...(process.env.CI && !D83_CI.has(`${browser}-phone`) ? [] : [{ name: `d83-${browser}-phone`, testMatch: /docx-083/, use: { browserName: browser, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser !== "firefox" } }]),
      { name: `s90-${browser}-desk`, testMatch: /slides-090/, use: { browserName: browser, viewport: { width: 1366, height: 900 } } },
      { name: `s90-${browser}-tablet`, testMatch: /slides-090/, use: { browserName: browser, viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: browser !== "firefox" } },
      { name: `s90-${browser}-phone`, testMatch: /slides-090/, use: { browserName: browser, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser !== "firefox" } },
      ...(["desk", "tablet", "phone"] as const).flatMap((size) => (process.env.CI && !A93_CI.has(`${browser}-${size}`) ? [] : [{
        name: `a93-${browser}-${size}`,
        testMatch: /slides-auditoria-093/,
        use: size === "desk" ? { browserName: browser, actionTimeout: 8000, viewport: { width: 1366, height: 900 } } : size === "tablet" ? { browserName: browser, actionTimeout: 8000, viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: browser !== "firefox" } : { browserName: browser, actionTimeout: 8000, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser !== "firefox" },
      }])),
      { name: `img84-${browser}-desk`, testMatch: /imgmenu-084/, use: { browserName: browser, viewport: { width: 1366, height: 900 } } },
      { name: `img84-${browser}-phone`, testMatch: /imgmenu-084/, use: { browserName: browser, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser !== "firefox" } },
      { name: `img86-${browser}-desk`, testMatch: /imgpaste-086|imgsoltar-0810/, use: { browserName: browser, viewport: { width: 1912, height: 904 } } },
      { name: `img86-${browser}-phone`, testMatch: /imgpaste-086|imgsoltar-0810/, use: { browserName: browser, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser !== "firefox" } },
      { name: `fuente87-${browser}-desk`, testMatch: /fuente-087/, use: { browserName: browser, viewport: { width: 1366, height: 900 } } },
      { name: `fuente87-${browser}-phone`, testMatch: /fuente-087/, use: { browserName: browser, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser !== "firefox" } },
      { name: `imp94-${browser}-desk`, testMatch: /docx-094/, use: { browserName: browser, viewport: { width: 1366, height: 900 } } },
      { name: `imp94-${browser}-phone`, testMatch: /docx-094/, use: { browserName: browser, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser !== "firefox" } },
      { name: `d82-${browser}-phone`, testMatch: /docx-082/, use: { browserName: browser, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browser !== "firefox" } },
    ]),
  ],
});

function faseProjects() {
  const views = [
    { id: "desk", width: 1920, height: 1080, touch: false, mobile: false },
    { id: "laptop", width: 1366, height: 768, touch: false, mobile: false },
    { id: "tablet-p", width: 820, height: 1180, touch: true, mobile: true },
    { id: "tablet-l", width: 1180, height: 820, touch: true, mobile: false },
    { id: "phone", width: 390, height: 844, touch: true, mobile: true },
    { id: "phone-s", width: 360, height: 740, touch: true, mobile: true },
  ];
  const browsers = ["chromium", "firefox", "webkit"] as const;
  return browsers.flatMap((browser) =>
    views.map((view) => ({
      name: `fase-${browser}-${view.id}`,
      testMatch: /fase-080/,
      use: {
        browserName: browser,
        viewport: { width: view.width, height: view.height },
        hasTouch: view.touch,
        isMobile: view.mobile,
        ...(browser === "chromium" ? { permissions: ["clipboard-read", "clipboard-write"] } : {}),
      },
    })),
  );
}
