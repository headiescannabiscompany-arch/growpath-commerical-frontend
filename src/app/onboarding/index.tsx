import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { useFacility } from "@/facility/FacilityProvider";
import { useOnboarding } from "../../onboarding/useOnboarding";

function Splash() {
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

export default function OnboardingRouter() {
  const router = useRouter();
  const auth = useAuth();

  const isHydrating = auth.isHydrating;
  const isLoggedOut = !isHydrating && !auth.token;

  React.useEffect(() => {
    if (!isLoggedOut) return;
    router.replace("/login" as any);
  }, [isLoggedOut, router]);

  if (isHydrating) return <Splash />;
  if (!auth.token) return null;

  return <OnboardingRouterAuthed />;
}

function OnboardingRouterAuthed() {
  const onboardingRouter = useRouter();
  const facility = useFacility();
  const state = useOnboarding();

  React.useEffect(() => {
    if (state === "loading") return;

    if (state === "join-facility")
      onboardingRouter.replace("/onboarding/join-facility" as any);
    else if (state === "create-facility")
      onboardingRouter.replace("/onboarding/create-facility" as any);
    else if (state === "pick-facility")
      onboardingRouter.replace("/onboarding/pick-facility" as any);
    else if (state === "first-setup")
      onboardingRouter.replace("/onboarding/first-setup" as any);
    else if (state === "start-grow")
      onboardingRouter.replace("/onboarding/start-grow" as any);
    else if (state === "dashboard") {
      if (facility?.selectedId) {
        onboardingRouter.replace(`/facilities/${facility.selectedId}/dashboard` as any);
      } else {
        onboardingRouter.replace("/facilities" as any);
      }
    }
  }, [state, facility?.selectedId, onboardingRouter]);

  return <Splash />;
}
