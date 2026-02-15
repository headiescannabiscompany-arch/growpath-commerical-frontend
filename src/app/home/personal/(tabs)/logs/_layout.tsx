import React from "react";
import { Stack } from "expo-router";

export default function LogsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Logs" }} />
      <Stack.Screen name="new" options={{ title: "New Log" }} />
      <Stack.Screen name="[logId]" options={{ title: "Log Details" }} />
    </Stack>
  );
}
