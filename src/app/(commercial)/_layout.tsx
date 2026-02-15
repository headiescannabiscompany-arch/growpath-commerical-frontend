import React from "react";
import RequireAuthGate from "@/auth/RequireAuthGate";
import { Stack, Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEntitlements } from "@/entitlements";

function CommercialGate() {
  const ent = useEntitlements();

  if (!ent?.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (ent.mode !== "commercial") {
    return <Redirect href="/home" />;
  }

  return <Stack screenOptions={{ headerShown: true }} />;
}

export default function CommercialLayout() {
  return (
    <RequireAuthGate>
      <CommercialGate />
    </RequireAuthGate>
  );
}
