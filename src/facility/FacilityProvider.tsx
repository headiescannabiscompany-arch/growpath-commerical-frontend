import React from "react";

import { useEntitlements } from "@/entitlements";
import { useAccountMode } from "@/state/useAccountMode";
import { useFacility as useFacilityState } from "@/state/useFacility";

export { useFacility } from "@/state/useFacility";

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  const entitlements = useEntitlements();
  const { setMode } = useAccountMode();
  const facility = useFacilityState() as any;

  React.useEffect(() => {
    if (!entitlements.ready) return;
    setMode(entitlements.mode);
  }, [entitlements.mode, entitlements.ready, setMode]);

  React.useEffect(() => {
    if (!entitlements.ready || !entitlements.facilityId) return;
    const row = {
      id: entitlements.facilityId,
      name: "GrowPath Test Facility"
    };
    facility.setFacilities?.([row]);
    if (!facility.selectedId) {
      facility.selectFacility?.(row);
    }
  }, [entitlements.facilityId, entitlements.ready, facility]);

  return <>{children}</>;
}
