import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // "1" only in the build Playwright makes (playwright.config.ts). Always inlined, so a normal
    // build compiles the test seam out rather than leaving `process.env` to be read at runtime.
    NEXT_PUBLIC_E2E: process.env.NEXT_PUBLIC_E2E === "1" ? "1" : "0",
  },
};

export default nextConfig;
