import type { NextConfig } from "next";

// cacheComponents/PPR is deliberately left off: this app's data (live
// quotes, mood score) is inherently dynamic on every request, and
// cacheComponents requires wrapping every uncached fetch in <Suspense> or
// it fails the build -- unnecessary complexity for a backend that's
// already explicitly cache: "no-store" everywhere (lib/api.ts).
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    // Local-dev convenience only: lets the browser (talking to the Next
    // dev server on :3000) reach the separately-running Flask dev server
    // via same-origin relative paths, matching how nginx unifies the
    // origin in production. In production nginx routes these paths to
    // Flask directly, so this rewrite is unreachable there.
    const flaskBase = process.env.FLASK_API_BASE ?? "http://127.0.0.1:5000";
    return [
      { source: "/api/:path*", destination: `${flaskBase}/api/:path*` },
      { source: "/stocks", destination: `${flaskBase}/stocks` },
      { source: "/og/:path*", destination: `${flaskBase}/og/:path*` },
    ];
  },
};

export default nextConfig;
