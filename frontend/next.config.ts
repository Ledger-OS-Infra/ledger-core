import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const apiProxyTarget = (
  process.env.API_PROXY_TARGET ?? process.env.NEXT_PUBLIC_API_BASE_URL
)?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    if (!apiProxyTarget) return [];

    // Proxy API traffic under /api/* so paths like /customers/[id] stay frontend pages.
    return [
      { source: "/api/:path*", destination: `${apiProxyTarget}/:path*` },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});
