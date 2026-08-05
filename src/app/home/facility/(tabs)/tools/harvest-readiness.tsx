import React from "react";

import HarvestReadinessToolRoute from "@/app/home/personal/(tabs)/tools/harvest-readiness";
import { useFacility } from "@/state/useFacility";

export default function FacilityHarvestReadinessToolRoute() {
  const { selectedId: facilityId } = useFacility();
  return (
    <HarvestReadinessToolRoute
      backFallbackHref="/home/facility/ai-tools"
      workspaceType="facility"
      workspaceId={String(facilityId || "") || undefined}
    />
  );
}
