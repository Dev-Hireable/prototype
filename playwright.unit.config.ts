import { defineConfig } from "@playwright/test";

/**
 * Unit specs for the pure work domain (src/lib/work): dates, validation, permissions, queries,
 * the calendar / timeline / workload maths and the repository over an in-memory store. No browser
 * and no server — Playwright's runner only, so the project has one test framework.
 */
export default defineConfig({
  testDir: "tests/unit",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  timeout: 15_000,
});
