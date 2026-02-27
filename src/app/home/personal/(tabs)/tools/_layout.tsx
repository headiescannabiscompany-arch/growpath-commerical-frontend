import React from "react";
import { Stack } from "expo-router";

export default function ToolsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Tools" }} />
      <Stack.Screen name="vpd" options={{ title: "VPD Calculator" }} />
      <Stack.Screen name="npk" options={{ title: "NPK Label Ratio (Preview)" }} />
      <Stack.Screen name="watering" options={{ title: "Watering Planner" }} />
    </Stack>
  );
}
