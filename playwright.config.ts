import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the contract workspace (e2e/). They run against a production build made with
 * NEXT_PUBLIC_E2E=1, which is the only build that ships the test seam (window.__hireable) — a normal
 * `next build` inlines "0" and the seam is compiled out. Port 3100, so a `next dev` on 3000 keeps
 * running alongside. Chrome is the installed one (channel "chrome"): nothing is downloaded.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 7_500 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "Asia/Manila",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // `npm run test:e2e` runs the first three; the 600-item performance run is its own: `npm run test:perf`.
  projects: [
    { name: "desktop", testIgnore: /(responsive|performance)\.spec\.ts/ },
    // Date-only values must not drift a day west of UTC.
    { name: "los-angeles", testMatch: /(scheduling|effort-workload|consistency-journey)\.spec\.ts/, use: { timezoneId: "America/Los_Angeles" } },
    { name: "mobile", testMatch: /responsive\.spec\.ts/, use: { ...devices["Pixel 7"], channel: "chrome" } },
    { name: "perf", testMatch: /performance\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { NEXT_PUBLIC_E2E: "1" },
    reuseExistingServer: !process.env.CI,
    timeout: 360_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
