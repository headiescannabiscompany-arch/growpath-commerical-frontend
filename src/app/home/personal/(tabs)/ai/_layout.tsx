import React from "react";
import { Stack } from "expo-router";
import { useAppTheme } from "@/theme/appTheme";

export default function AiLayout() {
  const { palette } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { color: palette.text },
        contentStyle: { backgroundColor: palette.page }
      }}
    >
      <Stack.Screen name="index" options={{ title: "AI Assistant" }} />
    </Stack>
  );
}
