import React from "react";

import AutoGrowCalendarToolRoute from "@/app/home/personal/(tabs)/tools/auto-grow-calendar";

export default function FacilityAutoGrowCalendarToolRoute() {
  return (
    <AutoGrowCalendarToolRoute
      backFallbackHref="/home/facility/ai-tools"
      workspaceType="facility"
    />
  );
}
