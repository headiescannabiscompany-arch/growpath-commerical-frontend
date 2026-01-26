import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../../auth/AuthContext";
import { useEntitlementsContext } from "../../entitlements/EntitlementsProvider";
import SplashScreen from "../../screens/SplashScreen";

export default function Gate() {
  const auth = useAuth();
  const ent = useEntitlementsContext();

  // 1) Auth hydration first
  if (auth.isHydrating) return <SplashScreen />;
  if (!auth.token) return <Redirect href="/(auth)/login" />;

  // 2) Entitlements resolution next
  if (!ent.ready || ent.loading) return <SplashScreen />;

  // 3) Route by resolved mode
  if (ent.mode === "facility") return <Redirect href="/(app)/(facility)/dashboard" />;
  if (ent.mode === "commercial") return <Redirect href="/(app)/(commercial)/dashboard" />;

  return <Redirect href="/(app)/(personal)/dashboard" />;
}
