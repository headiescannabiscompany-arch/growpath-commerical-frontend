import React from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/facility/FacilityProvider";

export default function Index() {
  const auth = useAuth();
  const ent = useEntitlements();
  const facility = useFacility();

  console.log("[INDEX] auth.isHydrating:", auth.isHydrating);
  console.log("[INDEX] auth.token:", !!auth.token);
  console.log("[INDEX] ent.ready:", ent.ready);

  // Wait for auth hydration
  if (auth.isHydrating) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff"
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading auth...</Text>
      </View>
    );
  }

  // Not logged in → send to login
  if (!auth.token) {
    console.log("[INDEX] No token, redirecting to /login");
    return <Redirect href="/login" />;
  }

  // Logged in but entitlements still hydrating → show loader
  if (!ent.ready) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff"
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading entitlements...</Text>
      </View>
    );
  }

  // Route based on mode
  console.log("[INDEX] ent.mode:", ent.mode);
  console.log("[INDEX] ent.plan:", ent.plan);
  console.log("[INDEX] facility.isReady:", facility?.isReady);
  console.log("[INDEX] facility.selectedId:", facility?.selectedId);

  // Facility/commercial modes often depend on facility list + selection
  if (ent.mode === "facility" || ent.mode === "commercial") {
    if (!facility?.isReady) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#fff"
          }}
        >
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 16 }}>Loading facilities...</Text>
        </View>
      );
    }

    if (!facility?.selectedId) {
      // Require selection
      console.log("[INDEX] No facility selected, routing to /facilities");
      return <Redirect href="/facilities" />;
    }

    // Canonical facility-scoped landing
    if (ent.mode === "facility") {
      console.log("[INDEX] Facility mode with selection, routing to facility dashboard");
      return <Redirect href={`/facilities/${facility.selectedId}/dashboard`} />;
    }

    // Commercial landing stays mode-specific
    if (ent.mode === "commercial") {
      console.log("[INDEX] Commercial mode with selection, routing to /feed");
      return <Redirect href="/feed" />;
    }
  }

  // Personal default landing
  console.log("[INDEX] Routing to /home (personal default)");
  return <Redirect href="/home" />;
}
