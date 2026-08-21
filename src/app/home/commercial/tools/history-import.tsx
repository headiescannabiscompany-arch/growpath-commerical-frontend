import React from "react";
import { useLocalSearchParams } from "expo-router";

import DewPointGuardTool from "@/app/home/personal/(tabs)/tools/dew-point-guard";
import { ScreenBoundary } from "@/components/ScreenBoundary";

export default function CommercialHistoryImportRoute() {
  const params = useLocalSearchParams<{
    growName?: string;
    roomId?: string;
    roomName?: string;
  }>();
  return (
    <ScreenBoundary
      title={params.growName ? `Import: ${params.growName}` : "Import grow history"}
      showBack
      backFallbackHref="/home/commercial/grows"
    >
      <DewPointGuardTool
        historyImportMode
        workspaceType="commercial"
        growLabel={String(params.growName || "Selected Commercial grow")}
        initialRoomId={String(params.roomId || "")}
        initialRoomName={String(params.roomName || "")}
      />
    </ScreenBoundary>
  );
}
