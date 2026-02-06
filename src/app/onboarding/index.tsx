import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useOnboarding } from "../../onboarding/useOnboarding";

export default function OnboardingRouter() {
  const router = useRouter();
  const auth = useAuth();
  const state = useOnboarding();

  // Wait for auth to hydrate
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
      </View>
    );
  }

  // 🔒 Not logged in → never run onboarding hooks that call facility APIs
  if (!auth.token) {
    return <Redirect href="/login" />;
  }

  React.useEffect(() => {
    if (state === "loading") return;
    if (state === "join-facility") router.replace("/onboarding/join-facility");
    else if (state === "create-facility") router.replace("/onboarding/create-facility");
    else if (state === "pick-facility") router.replace("/onboarding/pick-facility");
    else if (state === "first-setup") router.replace("/onboarding/first-setup");
    else if (state === "start-grow") router.replace("/onboarding/start-grow");
    else if (state === "dashboard") router.replace("/dashboard");
  }, [state]);

  // Show splash while loading or routing
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
    </View>
  );
}
