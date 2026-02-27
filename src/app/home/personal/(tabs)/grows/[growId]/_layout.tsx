import React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { coerceParam } from "./utils";

export default function GrowWorkspaceLayout() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(rawGrowId);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: `Grow ${growId || ""}`.trim() }} />
      <Stack.Screen name="journal" options={{ title: "Journal" }} />
      <Stack.Screen name="tasks" options={{ title: "Tasks" }} />
      <Stack.Screen name="tools" options={{ title: "Tools" }} />
      <Stack.Screen name="compare" options={{ title: "Compare" }} />
    </Stack>
  );
}
