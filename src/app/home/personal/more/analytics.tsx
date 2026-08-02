import React from "react";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import AnalyticsScreen from "@/screens/AnalyticsScreen";

export default function PersonalAnalyticsRoute() {
  return (
    <ScreenBoundary title="Grow Analytics" showBack backFallbackHref="/home/personal">
      <AnalyticsScreen />
    </ScreenBoundary>
  );
}
