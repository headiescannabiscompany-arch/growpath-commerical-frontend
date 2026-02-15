// Capability derivation for GrowPath (TypeScript)
// Usage: deriveCapabilities({ plan, mode, entitlements, limits })

import { CAPABILITIES } from "../capabilities/keys.js";
import { PLANS } from "../capabilities/plans.js";

export type Capabilities = {
  grows: number;
  plants: number;
  maxGrows: number;
  maxPlants: number;
  [key: string]: boolean | number | undefined;
};

// Build canonical PLAN_CAPS using PLANS and CAPABILITIES
const PLAN_CAPS: Record<string, Record<string, boolean>> = {};
const planMap = PLANS as Record<string, string[]>;
Object.keys(planMap).forEach((plan) => {
  PLAN_CAPS[plan] = {};
  Object.values(CAPABILITIES).forEach((capKey) => {
    PLAN_CAPS[plan][capKey] = planMap[plan].includes(capKey);
  });
});

export function deriveCapabilities({
  plan,
  mode,
  entitlements = {},
  limits = {}
}: {
  plan: string;
  mode: string;
  entitlements?: Record<string, any>;
  limits?: Record<string, any>;
}): Record<string, boolean | number> {
  const baseCaps = PLAN_CAPS[plan] || PLAN_CAPS["personal"];
  // Merge entitlements (overrides) and add limits
  const caps: Record<string, boolean | number> = { ...baseCaps, ...entitlements };
  // Add numeric limits if provided
  if (typeof limits.maxGrows === "number") caps.maxGrows = limits.maxGrows;
  if (typeof limits.maxPlants === "number") caps.maxPlants = limits.maxPlants;
  return caps;
}

export const CAPABILITY_KEYS = Object.values(CAPABILITIES);
