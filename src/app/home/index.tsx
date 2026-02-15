import React from "react";
import RequireAuthGate from "@/auth/RequireAuthGate";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";

function HomeGate() {
  const ent = useEntitlements();
  const { selectedId } = useFacility();

  if (!ent?.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const target =
    ent.mode === "commercial"
      ? "/home/commercial"
      : ent.mode === "facility"
        ? selectedId
          ? "/home/facility"
          : "/home/facility/select"
        : "/home/personal";

  return <Redirect href={target} />;
}

export default function HomeIndex() {
  return (
    <RequireAuthGate>
      <HomeGate />
    </RequireAuthGate>
  );
}
