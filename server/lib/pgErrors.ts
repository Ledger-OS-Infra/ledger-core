import type { DatabaseError } from "pg";

export function isPgUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as DatabaseError).code === "23505"
  );
}
