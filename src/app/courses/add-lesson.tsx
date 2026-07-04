import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import AddLessonScreen from "@/screens/AddLessonScreen";

export default function AddLessonRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawCourseId = params.courseId;
  const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;

  return (
    <AddLessonScreen
      route={{ params: { courseId } }}
      navigation={{ goBack: () => router.replace("/courses") }}
    />
  );
}
