import React from "react";
import { useLocalSearchParams } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import CreateCourseScreen from "@/screens/commercial/CreateCourseScreen";

const COURSE_BUILDER_SOURCES = new Set([
  "/home/commercial/courses",
  "/home/commercial/storefront",
  "/home/personal/courses"
]);

export default function CreateCourseRoute() {
  const params = useLocalSearchParams();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const source =
    typeof from === "string" && COURSE_BUILDER_SOURCES.has(from) ? from : null;
  return (
    <ScreenBoundary
      title="Create Course"
      showBack
      backFallbackHref={source || "/home/personal/courses"}
      preferBackFallback={Boolean(source)}
    >
      <CreateCourseScreen showBackToCourses={false} />
    </ScreenBoundary>
  );
}
