import { defineConfig, devices } from "@playwright/test";

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
      testIgnore: /fase-080|docx-081|docx-082/,
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
