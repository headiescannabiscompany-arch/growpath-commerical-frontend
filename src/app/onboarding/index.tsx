import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useOnboarding } from "../../onboarding/useOnboarding";

export default function OnboardingRouter() {
  const router = useRouter();
  const state = useOnboarding();

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
