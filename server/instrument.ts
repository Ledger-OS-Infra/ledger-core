import dotenv from "dotenv";
import * as Sentry from "@sentry/node";

dotenv.config();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.GITHUB_SHA ?? process.env.npm_package_version,
    enabled: process.env.NODE_ENV !== "test",
  });
}
