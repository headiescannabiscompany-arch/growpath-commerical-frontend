export function hasCapabilities(
  capabilities: Record<string, unknown> | null | undefined,
  required: string[]
): boolean {
  return required.every((key) => capabilities?.[key] === true);
}

export function requireAny(condition: boolean, message = "Not authorized") {
  if (!condition) throw new Error(message);
}
