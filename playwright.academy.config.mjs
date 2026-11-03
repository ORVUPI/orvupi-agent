import { defineConfig, devices } from "@playwright/test";

// ORVUPI Academy en Chromium y Firefox: ordenador 1280 y 1440, tableta 768, móvil 360 y 412.
const sizes = [
  ["1280", { width: 1280, height: 800 }],
  ["1440", { width: 1440, height: 900 }],
  ["768", { width: 768, height: 1024 }],
  ["412", { width: 412, height: 915 }],
  ["360", { width: 360, height: 800 }],
];
const browsers = [["chromium", devices["Desktop Chrome"]], ["firefox", devices["Desktop Firefox"]]];
export default defineConfig({
  testDir: "test/ui",
  testMatch: "academy.spec.mjs",
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL: "http://127.0.0.1:4180", trace: "retain-on-failure" },
  webServer: {
    command: "python3 -m http.server 4180 --bind 127.0.0.1",
    cwd: "web/v2",
    port: 4180,
    reuseExistingServer: !process.env.CI,
  },
  projects: browsers.flatMap(([b, dev]) => sizes.map(([n, viewport]) => ({
    name: `${b}-${n}`,
    use: { ...dev, viewport, ...(b === "chromium" && viewport.width < 768 ? { isMobile: true, hasTouch: true } : {}) },
  }))),
});
