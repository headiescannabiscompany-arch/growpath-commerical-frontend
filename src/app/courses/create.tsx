import React from "react";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import CreateCourseScreen from "@/screens/commercial/CreateCourseScreen";

export default function CreateCourseRoute() {
  return (
    <ScreenBoundary title="Create Course" showBack backFallbackHref="/courses">
      <CreateCourseScreen />
    </ScreenBoundary>
  );
}
