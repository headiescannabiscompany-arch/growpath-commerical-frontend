import CAPABILITIES from "./keys";

const CANONICAL_SET = new Set(Object.values(CAPABILITIES).map((v) => String(v)));

// Manual aliases for true outliers (fill only when needed).
// IMPORTANT: map legacy -> canonical VALUE (one of Object.values(CAPABILITIES))
const MANUAL_ALIASES = {
  // Example:
  // "tools.vpdCalc": "tools.vpd",
};

function firstCanonical(candidates) {
  for (const c of candidates) {
    if (CANONICAL_SET.has(c)) return c;
  }
  return null;
}

function camelToDot(str) {
  return String(str || "")
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1.$2")
    .replace(/[_\s-]+/g, ".")
    .toLowerCase();
}

export function resolveCapabilityKey(rawKey) {
  if (rawKey === null || rawKey === undefined) return null;

  const key = String(rawKey).trim();
  if (!key) return null;

  // Allow passing CAPABILITIES constant NAME (e.g. "TOOLS_VPD") instead of VALUE.
  if (Object.prototype.hasOwnProperty.call(CAPABILITIES, key)) {
    return CAPABILITIES[key];
  }

  // Already canonical VALUE
  if (CANONICAL_SET.has(key)) return key;

  // Manual outliers
  if (Object.prototype.hasOwnProperty.call(MANUAL_ALIASES, key)) {
    return MANUAL_ALIASES[key];
  }

  // Heuristic: canUseX (camelCase) -> dot.case candidates, but ONLY if canonical exists.
  if (key.startsWith("canUse") && key.length > 6) {
    const base = camelToDot(key.slice(6));
    const hit = firstCanonical([
      base,
      `ai.${base}`,
      `tools.${base}`,
      `community.${base}`,
      `seller.${base}`,
      `facility.${base}`,
      `personal.${base}`,
    ]);
    if (hit) return hit;
  }

  // Heuristic: separator/case drift -> canonical (ONLY if canonical exists).
  const normalized = key.replace(/[_\s-]+/g, ".").toLowerCase();
  if (CANONICAL_SET.has(normalized)) return normalized;

  // Unknown passes through (safe), but we'll log it upstream.
  return key;
}

export function normalizeCapabilities(raw) {
  const normalizedCaps = {};
  const unknownSet = new Set();

  const add = (k, v = true) => {
    const resolved = resolveCapabilityKey(k);
    if (!resolved) return;

    const boolVal = Boolean(v);
    normalizedCaps[resolved] = Boolean(normalizedCaps[resolved]) || boolVal;

    if (!CANONICAL_SET.has(resolved)) {
      unknownSet.add(`${String(k)} => ${resolved}`);
    }
  };

  if (Array.isArray(raw)) {
    for (const k of raw) add(k, true);
    return { normalized: normalizedCaps, unknownKeys: Array.from(unknownSet) };
  }

  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) add(k, v);
    return { normalized: normalizedCaps, unknownKeys: Array.from(unknownSet) };
  }

  return { normalized: normalizedCaps, unknownKeys: [] };
}
