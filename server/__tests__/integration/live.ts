/** True when integration tests should hit Postgres/Redis (CI or explicit opt-in). */
export function integrationLive(): boolean {
  return process.env.CI === "true" || process.env.INTEGRATION_LIVE === "true";
}
