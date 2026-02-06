import React from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";

export default function Index() {
  const auth = useAuth();
  const ent = useEntitlements();

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

  // Route based on mode - even on entitlements hydration failure, default to personal
  console.log("[INDEX] ent.mode:", ent.mode);
  console.log("[INDEX] ent.plan:", ent.plan);

  if (ent.mode === "facility") return <Redirect href="/dashboard" />;
  if (ent.mode === "commercial") return <Redirect href="/feed" />;

  // Default to personal home for free/personal users
  // This is a safe default that doesn't require facility/commercial setup
  console.log("[INDEX] Routing to /home (personal default)");
  return <Redirect href="/home" />;
}
