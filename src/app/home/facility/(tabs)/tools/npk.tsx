import React from "react";

import NpkToolScreen from "@/app/home/personal/(tabs)/tools/npk";
import { useFacility } from "@/state/useFacility";

export default function FacilityNpkToolRoute() {
  const { selectedId: facilityId } = useFacility();
  return (
    <NpkToolScreen backFallbackHref="/home/facility/ai-tools" facilityId={facilityId} />
  );
}
