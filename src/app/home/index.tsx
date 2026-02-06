import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useEntitlements } from "@/entitlements";
import { useAuth } from "@/auth/AuthContext";
import CommercialHome from "./commercial";
import FacilityHome from "./facility";

/**
 * Home Index - Mode-Aware Shell Switcher
 *
 * /home is a stable entrypoint after login.
 * It renders the correct mode home screen without redirect loops.
 */
export default function HomeIndex() {
  const router = useRouter();
  const auth = useAuth();
  const ent = useEntitlements();
  const normalizedRef = useRef(false);

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

  // Not logged in → login screen (effect-based to avoid render-time Redirect)
  useEffect(() => {
    if (!auth.token) {
      router.replace("/login" as any);
    }
  }, [auth.token, router]);

  // Normalize /home → mode-specific home exactly once
  useEffect(() => {
    if (normalizedRef.current) return;
    if (auth.isHydrating || !ent.ready || !auth.token) return;

    if (ent.mode === "personal") {
      normalizedRef.current = true;
      router.replace("/home/personal" as any);
      return;
    }

    if (ent.mode === "facility") {
      normalizedRef.current = true;
      router.replace("/home/facility" as any);
      return;
    }

    if (ent.mode === "commercial") {
      normalizedRef.current = true;
      router.replace("/home/commercial" as any);
    }
  }, [auth.isHydrating, ent.ready, auth.token, ent.mode, router]);

  if (!auth.token) {
    return null;
  }

  // Render the mode-specific home screen
  if (ent.mode === "commercial") {
    return <CommercialHome />;
  }

  if (ent.mode === "facility") {
    return <FacilityHome />;
  }

  // Personal mode will normalize to /home/personal
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
