import React from "react";

import SoilBuilderToolScreen from "@/app/home/personal/(tabs)/tools/soil-builder";

export default function CommercialSoilBuilderToolRoute() {
  return <SoilBuilderToolScreen backFallbackHref="/home/commercial/tools" />;
}
