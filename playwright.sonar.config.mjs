import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test/ui",
  testMatch: "sonar-qa.spec.mjs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 600_000,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    cwd: "web/v2",
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [
    { name: "chromium-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "chromium-390", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "firefox-1440", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } } },
    { name: "firefox-390", use: { ...devices["Desktop Firefox"], viewport: { width: 390, height: 844 } } },
  ],
});
