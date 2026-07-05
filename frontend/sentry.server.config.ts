import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.GITHUB_SHA ?? process.env.npm_package_version,
    enabled: process.env.NODE_ENV !== "test",
  });
}
