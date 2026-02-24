import React from "react";
import { useEntitlements } from "@/entitlements";
import type { CapabilityKey } from "../entitlements/capabilityKeys";
export function FeatureGate({
  capability,
  children,
  fallback = null
}: {
  capability: CapabilityKey | CapabilityKey[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const ent = useEntitlements();
  if (!ent.ready) return null;
  return ent.can(capability) ? <>{children}</> : <>{fallback}</>;
}
