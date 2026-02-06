import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useEntitlements } from "@/entitlements";
import { useAuth } from "@/auth/AuthContext";

/**
 * Home Index - Mode-Aware Shell Switcher
 *
 * This is the landing page after login. It fans out to different
 * "home" screens based on the user's mode.
 *
 * All other features (courses, forum, tools, profile) remain as
 * separate routes accessible via navigation/tabs.
 */
export default function HomeIndex() {
  const auth = useAuth();
  const ent = useEntitlements();

  // Wait for auth + entitlements to hydrate
  if (auth.isHydrating || !ent.ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff"
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Not logged in → login screen
  if (!auth.token) {
    return <Redirect href="/login" />;
  }

  // Mode-based fan-out: each mode gets its own home screen
  if (ent.mode === "commercial") return <Redirect href="/home/commercial" />;
  if (ent.mode === "facility") return <Redirect href="/home/facility" />;

  // Default: personal mode
  return <Redirect href="/home/personal" />;
}
