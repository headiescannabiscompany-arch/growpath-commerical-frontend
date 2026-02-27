import React from "react";
import { Stack } from "expo-router";

export default function GrowsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Grows" }} />
      <Stack.Screen name="new" options={{ title: "New Grow" }} />
      <Stack.Screen name="[growId]" options={{ headerShown: false }} />
    </Stack>
  );
}
