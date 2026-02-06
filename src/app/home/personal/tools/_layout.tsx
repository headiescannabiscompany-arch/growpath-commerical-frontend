import React from "react";
import { Stack } from "expo-router";

export default function ToolsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Tools" }} />
      <Stack.Screen name="vpd" options={{ title: "VPD Calculator" }} />
    </Stack>
  );
}
