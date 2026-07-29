import React from "react";

import AiScreen from "@/app/home/personal/(tabs)/ai";
import { useFacility } from "@/state/useFacility";

export default function FacilityAskAIRoute() {
  const { selectedId: facilityId } = useFacility();
  return <AiScreen workspaceType="facility" facilityId={String(facilityId || "")} />;
}
