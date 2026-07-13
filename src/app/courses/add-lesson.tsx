import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import AddLessonScreen from "@/screens/AddLessonScreen";

export default function AddLessonRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawCourseId = params.courseId;
  const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;
  const rawFrom = params.from;
  const from = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom;
  const backTarget = from || "/home/personal/courses";

  return (
    <ScreenBoundary title="Add Lesson" showBack backFallbackHref={backTarget}>
      <AddLessonScreen
        route={{ params: { courseId } }}
        navigation={{ goBack: () => router.replace(backTarget) }}
      />
    </ScreenBoundary>
  );
}
