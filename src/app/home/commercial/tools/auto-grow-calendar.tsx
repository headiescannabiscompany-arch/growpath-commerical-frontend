import React from "react";

import AutoGrowCalendarToolRoute from "@/app/home/personal/(tabs)/tools/auto-grow-calendar";

export default function CommercialAutoGrowCalendarToolRoute() {
  return (
    <AutoGrowCalendarToolRoute
      backFallbackHref="/home/commercial/tools"
      workspaceType="commercial"
    />
  );
}
