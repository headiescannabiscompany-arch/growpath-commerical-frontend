import React from "react";

import { getFacilities } from "@/api/facilities";
import { useEntitlements } from "@/entitlements";
import { useAccountMode } from "@/state/useAccountMode";
import { useFacility as useFacilityState } from "@/state/useFacility";

export { useFacility } from "@/state/useFacility";

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  const entitlements = useEntitlements();
  const { setMode } = useAccountMode();
  const facility = useFacilityState() as any;
  const hydratedFacilityId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!entitlements.ready) return;
    setMode(entitlements.mode);
  }, [entitlements.mode, entitlements.ready, setMode]);

  React.useEffect(() => {
    if (!entitlements.ready || !entitlements.facilityId) {
      hydratedFacilityId.current = null;
      return;
    }
    if (hydratedFacilityId.current === entitlements.facilityId) return;
    hydratedFacilityId.current = entitlements.facilityId;

    const facilityId = entitlements.facilityId;
    const row = {
      id: facilityId,
      name: "Facility"
    };
    facility.setFacilities?.([row]);
    if (!facility.selectedId) {
      facility.selectFacility?.(row);
    }

    getFacilities()
      .then((rows) => {
        if (hydratedFacilityId.current !== facilityId) return;
        const accountFacility =
          rows.find((item) => item.id === facilityId) || rows[0] || row;
        facility.setFacilities?.([accountFacility]);
        facility.selectFacility?.(accountFacility);
      })
      .catch(() => undefined);
  }, [entitlements.facilityId, entitlements.ready, facility]);

  return <>{children}</>;
}
