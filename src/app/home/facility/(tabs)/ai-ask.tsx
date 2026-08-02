import React from "react";

import AiScreen from "@/app/home/personal/(tabs)/ai";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function FacilityAskAIRoute() {
  const { selectedId: facilityId } = useFacility();
  return (
    <ScreenBoundary
      title="Ask GrowPath AI"
      showBack
      backFallbackHref="/home/facility/ai-tools"
    >
      <AiScreen workspaceType="facility" facilityId={String(facilityId || "")} />
    </ScreenBoundary>
  );
}
