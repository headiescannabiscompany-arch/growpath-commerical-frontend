import React from "react";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import CoursesScreen from "@/screens/CoursesScreen";

export default function CoursesRoute() {
  return (
    <ScreenBoundary title="Courses" backFallbackHref="/home/personal">
      <CoursesScreen catalogHref="/home/personal/courses" />
    </ScreenBoundary>
  );
}
