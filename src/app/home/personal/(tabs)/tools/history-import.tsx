import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import DewPointGuardTool from "@/app/home/personal/(tabs)/tools/dew-point-guard";
import { ScreenBoundary } from "@/components/ScreenBoundary";

export default function PersonalHistoryImportRoute() {
  const params = useLocalSearchParams<{
    growId?: string;
    growName?: string;
    roomId?: string;
    roomName?: string;
  }>();
  const growId = String(params.growId || "").trim();

  if (!growId) {
    return (
      <ScreenBoundary
        title="Choose a grow first"
        showBack
        backFallbackHref="/home/personal/tools/integrations"
      >
        <View accessibilityRole="alert" style={{ gap: 8, padding: 16 }}>
          <Text>
            Controller history must attach to one of your grows. Return to Data
            Integrations and choose the destination grow before selecting a file.
          </Text>
        </View>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title={params.growName ? `Import: ${params.growName}` : "Import grow history"}
      showBack
      backFallbackHref="/home/personal/tools/integrations"
    >
      <DewPointGuardTool
        historyImportMode
        workspaceType="personal"
        growLabel={String(params.growName || "Selected grow")}
        initialRoomId={String(params.roomId || "")}
        initialRoomName={String(params.roomName || "")}
      />
    </ScreenBoundary>
  );
}
