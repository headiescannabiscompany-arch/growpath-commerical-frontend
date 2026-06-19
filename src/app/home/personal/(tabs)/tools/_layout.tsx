import React from "react";
import { Stack } from "expo-router";

export default function ToolsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Tools / AI" }} />
      <Stack.Screen name="vpd" options={{ title: "VPD Calculator" }} />
      <Stack.Screen name="dew-point-guard" options={{ title: "Dew Point Guard" }} />
      <Stack.Screen name="integrations" options={{ title: "Data Integrations" }} />
      <Stack.Screen name="ppfd" options={{ title: "PPFD / DLI Planner" }} />
      <Stack.Screen name="bud-rot-risk" options={{ title: "Bud Rot Risk" }} />
      <Stack.Screen name="crop-steering" options={{ title: "Crop Steering" }} />
      <Stack.Screen name="nutrient-chemistry" options={{ title: "Nutrient Chemistry" }} />
      <Stack.Screen name="npk" options={{ title: "NPK Recipe Calculator" }} />
      <Stack.Screen name="watering" options={{ title: "Watering Planner" }} />
    </Stack>
  );
}
