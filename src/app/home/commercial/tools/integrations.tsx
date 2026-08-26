import React from "react";

import DataIntegrationsScreen from "@/app/home/personal/(tabs)/tools/integrations";
import { ScreenBoundary } from "@/components/ScreenBoundary";

export default function CommercialDataIntegrationsRoute() {
  return (
    <ScreenBoundary
      title="Data Integrations"
      showBack
      preferBackFallback
      backFallbackHref="/home/commercial/grows"
    >
      <DataIntegrationsScreen workspaceType="commercial" showHeading />
    </ScreenBoundary>
  );
}
