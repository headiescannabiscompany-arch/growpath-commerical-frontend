import React from "react";
import { Stack, Redirect } from "expo-router";
import { useEntitlements } from "@/entitlements";

export default function PersonalLayout() {
  const ent = useEntitlements();

  // Don’t route until entitlements are ready
  if (!ent?.ready) return null;

  // Only personal users may be here
  if (ent.mode === "facility") return <Redirect href="/home/facility" />;
  if (ent.mode === "commercial") return <Redirect href="/home/commercial" />;

  return (
    <Stack screenOptions={{ headerShown: true }}>
      {/* Bottom tabs */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* “More” routes (wrappers around src/screens/*) */}
      <Stack.Screen name="more/analytics" options={{ title: "Analytics" }} />
      <Stack.Screen name="more/social-tools" options={{ title: "Social Tools" }} />
      <Stack.Screen name="more/forum" options={{ title: "Forum" }} />
      <Stack.Screen name="more/links" options={{ title: "Links" }} />
      <Stack.Screen name="more/qa" options={{ title: "QA" }} />
    </Stack>
  );
}
