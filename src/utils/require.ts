/**
 * Utility for explicit null/undefined checks
 * Phase 2.3.2 - Eliminates TS2345 (string | null → string)
 */

export function requireString(value: string | null | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `${name} is required but was ${value === null ? "null" : "undefined"}`
    );
  }
  return value;
}
