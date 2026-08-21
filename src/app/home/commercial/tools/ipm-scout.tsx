import React from "react";

import IpmScoutToolRoute from "@/app/home/personal/(tabs)/tools/ipm-scout";

export default function CommercialIpmScoutToolRoute() {
  return (
    <IpmScoutToolRoute
      backFallbackHref="/home/commercial/tools"
      workspaceType="commercial"
    />
  );
}
