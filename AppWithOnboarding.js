import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OnboardingCarousel from "./src/screens/OnboardingCarousel";
import App from "./App";

const CAROUSEL_SEEN_KEY = "seenOnboardingCarousel";
const LEGACY_CAROUSEL_KEY = "seenOnboarding";

export default function AppWithOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    let mounted = true;

    const resolveOnboardingState = async () => {
      try {
        const [currentValue, legacyValue] = await Promise.all([
          AsyncStorage.getItem(CAROUSEL_SEEN_KEY),
          AsyncStorage.getItem(LEGACY_CAROUSEL_KEY)
        ]);

        if (!mounted) return;

        const seenCarousel = currentValue === "true" || legacyValue === "true";
        setShowOnboarding(!seenCarousel);
      } catch {
        if (mounted) setShowOnboarding(true);
      }
    };

    resolveOnboardingState();

    return () => {
      mounted = false;
    };
  }, []);

  if (showOnboarding === null) return null;

  if (showOnboarding) {
    return (
      <OnboardingCarousel
        onDone={async () => {
          try {
            await AsyncStorage.setItem(CAROUSEL_SEEN_KEY, "true");
            await AsyncStorage.removeItem(LEGACY_CAROUSEL_KEY);
          } catch {
            // Fallback: best effort, no blocking UI
          }
          setShowOnboarding(false);
        }}
      />
    );
  }

  return <App />;
}
