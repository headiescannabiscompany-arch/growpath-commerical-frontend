import React from "react";
import { Stack } from "expo-router";

export default function LogsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Journal" }} />
      <Stack.Screen name="new" options={{ title: "New Journal Entry" }} />
      <Stack.Screen name="[logId]" options={{ title: "Journal Entry" }} />
    </Stack>
  );
}
