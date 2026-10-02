import React from "react";
import { useLocalSearchParams } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import CreatorAnalyticsScreen from "@/screens/CreatorAnalyticsScreen";

export default function CourseAnalyticsRoute() {
  const params = useLocalSearchParams();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const commercialSource = from === "/home/commercial/courses";
  return (
    <ScreenBoundary
      name="CourseAnalytics"
      title="Course Analytics"
      showBack
      backFallbackHref={commercialSource ? "/home/commercial/courses" : "/courses"}
      preferBackFallback={commercialSource}
    >
      <CreatorAnalyticsScreen />
    </ScreenBoundary>
  );
}
