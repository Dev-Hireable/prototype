import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // "1" only in the build Playwright makes (playwright.config.ts). Always inlined, so a normal
    // build compiles the test seam out rather than leaving `process.env` to be read at runtime.
    NEXT_PUBLIC_E2E: process.env.NEXT_PUBLIC_E2E === "1" ? "1" : "0",
  },
  // Images in public/ go out as `max-age=0` unless told otherwise, so the browser asked the server
  // for each one again whenever a page or step showed it, and switching screens loaded them again.
  // A day's cache instead, then shown at once while the browser checks for a newer copy. A changed
  // image goes in under a new name, as they always have, or a browser may show the old one for that
  // day. /_next/image keeps the longer of this and its own 4 hours; `next dev` never caches it.
  //
  // The grace period is a year because Vercel serves its resized copies (/_next/image) with the age
  // of its own cached copy, weeks for a photo that hasn't changed. Past the day and the grace
  // period, a copy counts as expired the moment it arrives: with a week's grace, every page switch
  // waited on Vercel again and the photos went grey until it answered.
  headers: async () => [
    {
      source: "/:path*.:ext(svg|png|jpe?g|webp|avif|gif)",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=31536000" }],
    },
  ],
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
