import React from "react";
import { useLocalSearchParams } from "expo-router";

import DewPointGuardTool from "@/app/home/personal/(tabs)/tools/dew-point-guard";
import { ScreenBoundary } from "@/components/ScreenBoundary";

export default function CommercialHistoryImportRoute() {
  const params = useLocalSearchParams<{ growName?: string }>();
  return (
    <ScreenBoundary
      title={params.growName ? `Import: ${params.growName}` : "Import grow history"}
      showBack
      backFallbackHref="/home/commercial/grows"
    >
      <DewPointGuardTool historyImportMode />
    </ScreenBoundary>
  );
}
