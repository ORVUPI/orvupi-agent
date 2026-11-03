import { defineConfig, devices } from "@playwright/test";

// ORVUPI Academy en Chromium, Firefox y WebKit (móvil 390, tableta 768 y escritorio 1440).
export default defineConfig({
  testDir: "test/ui",
  testMatch: "academy.spec.mjs",
  fullyParallel: true,
  retries: 0,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL: "http://127.0.0.1:4180", trace: "retain-on-failure" },
  webServer: {
    command: "python3 -m http.server 4180 --bind 127.0.0.1",
    cwd: "web/v2",
    port: 4180,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "chromium-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "firefox-768", use: { ...devices["Desktop Firefox"], viewport: { width: 768, height: 1024 } } },
    { name: "firefox-1440", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit-390", use: { ...devices["iPhone 14"], defaultBrowserType: "webkit" } },
    { name: "webkit-1440", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } },
  ],
});
