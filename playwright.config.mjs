import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test/ui",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    cwd: "web/v2",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: devices["Pixel 7"].userAgent,
      },
    },
    {
      name: "mobile-webkit",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: "webkit",
        userAgent: devices["iPhone 14"].userAgent,
      },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    // Firefox solo para Academy (H2): el resto de la web aún no se prueba en Gecko.
    {
      name: "academy-firefox",
      testMatch: /academy\.spec\.mjs$/,
      use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "academy-firefox-mobile",
      testMatch: /academy\.spec\.mjs$/,
      use: { ...devices["Desktop Firefox"], viewport: { width: 412, height: 915 } },
    },
  ],
});
