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

    return [
      { source: "/health", destination: `${apiProxyTarget}/health` },
      { source: "/auth/:path*", destination: `${apiProxyTarget}/auth/:path*` },
      { source: "/webhooks/:path*", destination: `${apiProxyTarget}/webhooks/:path*` },
      { source: "/businesses", destination: `${apiProxyTarget}/businesses` },
      { source: "/businesses/:path*", destination: `${apiProxyTarget}/businesses/:path*` },
      { source: "/customers/:path*", destination: `${apiProxyTarget}/customers/:path*` },
      { source: "/reporting/:path*", destination: `${apiProxyTarget}/reporting/:path*` },
      { source: "/business/:path*", destination: `${apiProxyTarget}/business/:path*` },
      { source: "/obligations/:path*", destination: `${apiProxyTarget}/obligations/:path*` },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
});
