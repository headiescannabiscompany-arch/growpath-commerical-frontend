export type BusinessDeskRetryIdentity = {
  signature: string;
  key: string;
};

function canonicalJsonValue(
  value: unknown,
  seen: Set<object>
):
  | string
  | number
  | boolean
  | null
  | Array<unknown>
  | Record<string, unknown>
  | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (
    typeof value === "undefined" ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return undefined;
  }
  if (typeof value === "bigint") {
    throw new Error("Business Desk mutation signatures do not accept bigint values.");
  }
  if (typeof value !== "object") return undefined;
  if (seen.has(value)) {
    throw new Error("Business Desk mutation signatures do not accept cyclic values.");
  }

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) => canonicalJsonValue(entry, seen) ?? null);
    }
    const canonical: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const entry = canonicalJsonValue((value as Record<string, unknown>)[key], seen);
      if (entry !== undefined) canonical[key] = entry;
    }
    return canonical;
  } finally {
    seen.delete(value);
  }
}

export function businessDeskMutationSignature(value: unknown) {
  return JSON.stringify(canonicalJsonValue(value, new Set()) ?? null);
}

export function resolveBusinessDeskRetryIdentity(
  current: BusinessDeskRetryIdentity | null | undefined,
  operation: unknown,
  createKey: () => string
): BusinessDeskRetryIdentity {
  const signature = businessDeskMutationSignature(operation);
  if (current?.signature === signature) return current;
  return { signature, key: createKey() };
}
