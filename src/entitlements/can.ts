import { normalizeCapabilityKey } from "./normalize";

type CapInput = string | string[];

export function buildCan(
  capabilities: Iterable<string> | Record<string, boolean> | null | undefined
) {
  const set = new Set<string>();

  if (capabilities) {
    if (typeof (capabilities as Record<string, boolean>)[Symbol.iterator] === "function") {
      for (const entry of capabilities as Iterable<string>) {
        const normalized = normalizeCapabilityKey(entry);
        if (normalized) set.add(normalized);
      }
    } else {
      for (const [key, enabled] of Object.entries(capabilities as Record<string, boolean>)) {
        if (!enabled) continue;
        const normalized = normalizeCapabilityKey(key);
        if (normalized) set.add(normalized);
      }
    }
  }

  const can = (capability: CapInput) => {
    if (Array.isArray(capability)) {
      return capability.every((cap) => {
        const normalized = normalizeCapabilityKey(cap);
        return !!normalized && set.has(normalized);
      });
    }
    const normalized = normalizeCapabilityKey(capability);
    return !!normalized && set.has(normalized);
  };

  return can;
}

