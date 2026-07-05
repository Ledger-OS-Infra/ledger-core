import { execSync } from "node:child_process";
import path from "node:path";

export default async function globalSetup() {
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
