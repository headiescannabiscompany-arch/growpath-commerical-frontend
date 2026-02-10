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
    <Stack screenOptions={{ headerShown: false }}>
      {/* Personal tabs live under /home/personal/(tabs), but (tabs) is NOT part of the URL */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
