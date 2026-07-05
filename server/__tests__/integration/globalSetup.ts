import { execSync } from "node:child_process";
import path from "node:path";
import { integrationLive } from "./live";

export default async function globalSetup() {
  if (!integrationLive()) {
    console.info(
      "Integration tests: dry-run mode (console only, no DB/Redis writes). Set INTEGRATION_LIVE=true to run against a database.",
    );
    return;
  }

  // CI runs `npm run migrate` in a separate step with service-container URLs.
  if (process.env.CI) {
    return;
  }

  execSync("npm run migrate", {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
    env: {
      ...process.env,
      // Avoid knexfile dotenv overriding test DB when a developer .env points at staging.
      DOTENV_CONFIG_OVERRIDE: "false",
    },
  });
}
