import { defineConfig, devices } from "@playwright/test";

// Pruebas de idiomas. Por defecto sirve web/v2 en local; con I18N_BASE apunta a una vista previa.
const base = process.env.I18N_BASE || "http://127.0.0.1:4180";
const sizes = {
  desktop: { viewport: { width: 1366, height: 860 } },
  tablet: { viewport: { width: 820, height: 1180 }, hasTouch: true },
  mobile: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
};
const browsers = { chromium: devices["Desktop Chrome"], firefox: devices["Desktop Firefox"], webkit: devices["Desktop Safari"] };
const projects = [];
for (const [b, dev] of Object.entries(browsers)) {
  for (const [s, extra] of Object.entries(sizes)) {
    const use = { ...dev, ...extra };
    if (b === "firefox") delete use.isMobile; // Firefox no admite isMobile
    projects.push({ name: `${b}-${s}`, use });
  }
}
export default defineConfig({
  testDir: "test/i18n",
  fullyParallel: true,
  workers: process.env.I18N_WORKERS ? Number(process.env.I18N_WORKERS) : 4,
  retries: 0,
  reporter: [["line"], ["json", { outputFile: "test-results/i18n-report.json" }]],
  use: { baseURL: base, trace: "retain-on-failure" },
  webServer: process.env.I18N_BASE ? undefined : {
    command: "node test/i18n/serve.mjs 4180",
    port: 4180,
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "pipe",
  },
  projects,
});
