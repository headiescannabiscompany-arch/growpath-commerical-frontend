import React from "react";

import EnvironmentAnalysisToolScreen from "@/app/home/personal/(tabs)/tools/environment-analysis";

export default function FacilityEnvironmentToolRoute() {
  return (
    <EnvironmentAnalysisToolScreen
      backFallbackHref="/home/facility/ai-tools"
      workspaceType="facility"
    />
  );
}
