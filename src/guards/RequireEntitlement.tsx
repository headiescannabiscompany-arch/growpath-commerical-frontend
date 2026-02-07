import React, { useMemo } from "react";
import { useRouter } from "expo-router";
import { useEntitlements } from "../entitlements";
import { CapabilityKey, FacilityRole, Mode, Plan } from "../entitlements/types";
import { LockedScreen } from "../entitlements/LockedScreen";
type Props = {
  children: React.ReactNode;
  mode?: Mode | Mode[];
  plan?: Plan | Plan[];
  capability?: CapabilityKey | CapabilityKey[];
  facilityRole?: FacilityRole | FacilityRole[];
  requireFacility?: boolean;
  lockedTitle?: string;
  lockedMessage?: string;
};
function asArray<T>(v?: T | T[]): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
export function RequireEntitlement({
  children,
  mode,
  plan,
  capability,
  facilityRole,
  requireFacility = true,
  lockedTitle,
  lockedMessage
}: Props) {
  const router = useRouter();
  const ent = useEntitlements();
  const ok = useMemo(() => {
    if (!ent.ready) return false;
    const modes = asArray(mode);
    const plans = asArray(plan);
    const caps = asArray(capability);
    const roles = asArray(facilityRole);
    if (modes.length && !modes.includes(ent.mode)) return false;
    // Phase 2.3.2: Cast plan and facilityRole for type checking
    if (plans.length && !plans.includes(ent.plan as Plan)) return false;
    if (
      roles.length &&
      (!ent.facilityRole || !roles.includes(ent.facilityRole as FacilityRole))
    )
      return false;
    if (requireFacility && (ent.mode === "commercial" || ent.mode === "facility")) {
      if (!ent.facilityId) return false;
    }
    if (caps.length && !caps.every((c) => ent.can(c))) return false;
    return true;
  }, [
    ent.ready,
    ent.mode,
    ent.plan,
    ent.facilityRole,
    ent.facilityId,
    ent,
    mode,
    plan,
    capability,
    facilityRole,
    requireFacility
  ]);
  if (!ent.ready) return null;
  if (!ok) {
    return (
      <LockedScreen
        title={lockedTitle ?? "Locked"}
        message={
          lockedMessage ??
          "This area requires a different plan, mode, or role. If you believe this is a mistake, refresh your session or check your facility selection."
        }
        onAction={() => router.back()}
        actionLabel="Go back"
      />
    );
  }
  return <>{children}</>;
}
