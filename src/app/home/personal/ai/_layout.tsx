import React from "react";
import { Stack } from "expo-router";

export default function AiLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Assistant" }} />
    </Stack>
  );
}
