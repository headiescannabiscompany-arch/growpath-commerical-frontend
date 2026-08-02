import React from "react";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import CreatorAnalyticsScreen from "@/screens/CreatorAnalyticsScreen";

export default function CourseAnalyticsRoute() {
  return (
    <ScreenBoundary
      name="CourseAnalytics"
      title="Course Analytics"
      showBack
      backFallbackHref="/courses"
    >
      <CreatorAnalyticsScreen />
    </ScreenBoundary>
  );
}
