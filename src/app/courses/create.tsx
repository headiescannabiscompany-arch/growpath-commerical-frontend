import React from "react";
import { useLocalSearchParams } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import CreateCourseScreen from "@/screens/commercial/CreateCourseScreen";

export default function CreateCourseRoute() {
  const params = useLocalSearchParams();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  return (
    <ScreenBoundary
      title="Create Course"
      showBack
      backFallbackHref={from || "/home/personal/courses"}
    >
      <CreateCourseScreen />
    </ScreenBoundary>
  );
}
