import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import CourseLessonReadGate, {
  lessonEditorReturn
} from "@/components/learning/CourseLessonReadGate";
import EditLessonScreen from "@/screens/EditLessonScreen";

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default function EditLessonRoute() {
  const params = useLocalSearchParams<{
    courseId?: string | string[];
    lessonId?: string | string[];
    from?: string | string[];
  }>();
  const router = useRouter();
  const courseId = valueOf(params.courseId);
  const lessonId = valueOf(params.lessonId);
  const backTarget = lessonEditorReturn(courseId, valueOf(params.from));
  const goBack = () => router.replace(backTarget as any);
  return (
    <ScreenBoundary
      title="Edit Lesson"
      showBack
      backFallbackHref={backTarget}
      preferBackFallback
    >
      <CourseLessonReadGate courseId={courseId} lessonId={lessonId} onBack={goBack}>
        {(lesson) => (
          <EditLessonScreen
            route={{ params: { courseId, lessonId, lesson } }}
            navigation={{ goBack }}
          />
        )}
      </CourseLessonReadGate>
    </ScreenBoundary>
  );
}
