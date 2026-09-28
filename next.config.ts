import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // "1" only in the build Playwright makes (playwright.config.ts). Always inlined, so a normal
    // build compiles the test seam out rather than leaving `process.env` to be read at runtime.
    NEXT_PUBLIC_E2E: process.env.NEXT_PUBLIC_E2E === "1" ? "1" : "0",
  },
  // Notifications sent before disputes had pages of their own linked the list with ?open=<id>, and
  // they're still in people's browsers: send them on to the case, before anything renders.
  redirects: async () =>
    ["/team/payments/disputes", "/independent/wallet/disputes"].map((list) => ({
      source: list,
      has: [{ type: "query" as const, key: "open", value: "(?<id>[^/]+)" }],
      destination: `${list}/:id`,
      permanent: false,
    })),
};

export default nextConfig;
