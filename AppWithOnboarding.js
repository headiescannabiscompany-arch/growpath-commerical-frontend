import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OnboardingCarousel from "./src/screens/OnboardingCarousel";
import App from "./App";

export default function AppWithOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("seenOnboarding").then((val) => {
      setShowOnboarding(val !== "true");
    });
  }, []);

  if (showOnboarding === null) return null;

  if (showOnboarding) {
    return (
      <OnboardingCarousel
        onDone={async () => {
          await AsyncStorage.setItem("seenOnboarding", "true");
          setShowOnboarding(false);
        }}
      />
    );
  }

  return <App />;
}
