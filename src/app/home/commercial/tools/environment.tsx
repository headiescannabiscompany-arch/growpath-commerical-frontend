import React from "react";

import EnvironmentAnalysisToolScreen from "@/app/home/personal/(tabs)/tools/environment-analysis";

export default function CommercialEnvironmentToolRoute() {
  return <EnvironmentAnalysisToolScreen backFallbackHref="/home/commercial/tools" />;
}
