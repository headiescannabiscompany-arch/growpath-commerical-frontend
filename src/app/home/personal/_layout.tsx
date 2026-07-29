import React from "react";
import { Redirect, Stack } from "expo-router";

import { useEntitlements } from "@/entitlements";

export default function PersonalLayout() {
  const ent = useEntitlements();

  // Do not route until entitlements are ready.
  if (!ent?.ready) return null;

  // Only personal users may be here.
  if (ent.mode === "facility") return <Redirect href="/home/facility" />;
  if (ent.mode === "commercial") return <Redirect href="/home/commercial" />;

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="more/analytics"
        options={{ title: "Grow Analytics", headerShown: false }}
      />
      <Stack.Screen name="more/social-tools" options={{ title: "Forum / Q&A" }} />
      <Stack.Screen name="more/forum" options={{ title: "Forum / Q&A" }} />
      <Stack.Screen name="more/links" options={{ title: "Links" }} />
      <Stack.Screen name="more/qa" options={{ title: "QA" }} />
    </Stack>
  );
}
