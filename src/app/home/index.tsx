import React from "react";
import RequireAuthGate from "@/auth/RequireAuthGate";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import { getHomeForUser } from "@/navigation/routeAccess";
import { useAuth } from "@/auth/AuthContext";

function HomeGate() {
  const ent = useEntitlements();
  const auth = useAuth();
  const { selectedId } = useFacility();

  if (!ent?.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (String(auth.user?.role || "").toLowerCase() === "admin") {
    return <Redirect href="/admin" />;
  }

  const target = getHomeForUser({
    ready: ent.ready,
    mode: ent.mode,
    selectedFacilityId: selectedId || ent.facilityId || null
  });

  return <Redirect href={target} />;
}

export default function HomeIndex() {
  return (
    <RequireAuthGate>
      <HomeGate />
    </RequireAuthGate>
  );
}
