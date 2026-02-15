import React from "react";
import { Stack } from "expo-router";

export default function AiLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true
      }}
    >
      <Stack.Screen name="index" options={{ title: "AI Assistant" }} />
    </Stack>
  );
}
