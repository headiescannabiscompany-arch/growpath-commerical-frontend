import React from "react";

import SpeciesCropIdToolRoute from "@/app/home/personal/(tabs)/tools/species-crop-id";

export default function CommercialSpeciesCropIdToolRoute() {
  return (
    <SpeciesCropIdToolRoute
      backFallbackHref="/home/commercial/tools"
      workspaceTypeOverride="commercial"
    />
  );
}
