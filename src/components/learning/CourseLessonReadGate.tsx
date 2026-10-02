import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { getCourse } from "@/api/courses";
import { useAppTheme } from "@/theme/appTheme";
import { useAuth } from "@/auth/AuthContext";

export function lessonEditorReturn(courseId: string, from: string, fallback?: string) {
  const detail = courseId
    ? `/courses?courseId=${encodeURIComponent(courseId)}`
    : "/courses";
  return ["/home/personal/courses", "/home/commercial/courses", detail].includes(from)
    ? from
    : fallback || detail;
}

type GateProps = {
  courseId: string;
  lessonId?: string;
  onBack: () => void;
  children: (lesson: any) => React.ReactNode;
};

export default function CourseLessonReadGate(props: GateProps) {
  const auth = useAuth();
  const [session, setSession] = useState({ token: auth.token, generation: 0 });
  if (session.token !== auth.token) {
    setSession({ token: auth.token, generation: session.generation + 1 });
    return null;
  }
  if (auth.isHydrating)
    return <ActivityIndicator accessibilityLabel="Checking lesson editor access" />;
  if (!auth.isAuthed) return <Text>Sign in before editing course lessons.</Text>;
  return (
    <CourseLessonSession
      key={JSON.stringify([auth.user?._id || auth.user?.id, session.generation])}
      {...props}
    />
  );
}

function CourseLessonSession({ courseId, lessonId, onBack, children }: GateProps) {
  const { palette } = useAppTheme();
  const scope = JSON.stringify([courseId, lessonId]);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<any>(null);
  useEffect(() => {
    let active = true;
    setResult(null);
    if (!courseId || lessonId === "") {
      setResult({
        scope,
        error: "Open a saved lesson from one of your courses before editing it."
      });
      return () => {
        active = false;
      };
    }
    Promise.resolve()
      .then(() => getCourse(courseId))
      .then((response: any) => {
        if (!active) return;
        const course =
          response?.course || response?.data?.course || response?.data || response;
        if (String(course?._id || course?.id || "") !== courseId) {
          throw new Error(
            "The selected course could not be verified. Return to your courses and reopen it."
          );
        }
        if (course?._viewerOwnsCourse !== true) {
          setResult({ scope, error: "Only the course owner can edit these lessons." });
          return;
        }
        if (course?.isPublished === true || course?.status === "published") {
          setResult({
            scope,
            error:
              "Unpublish this course before adding or editing lessons. Your published course has not been changed."
          });
          return;
        }
        const lesson =
          lessonId === undefined
            ? null
            : (course.lessons || []).find(
                (row: any) => String(row?._id || row?.id || "") === lessonId
              );
        if (lessonId !== undefined && !lesson)
          throw new Error("This lesson could not be found in the selected course.");
        setResult({ scope, ready: true, lesson });
      })
      .catch((error: any) => {
        if (active)
          setResult({
            scope,
            error: error?.message || "Unable to load this course.",
            retry: true
          });
      });
    return () => {
      active = false;
    };
  }, [courseId, lessonId, scope, attempt]);

  const current = result?.scope === scope ? result : null;
  if (current?.ready)
    return <React.Fragment key={scope}>{children(current.lesson)}</React.Fragment>;
  return (
    <View style={{ margin: 16, padding: 16, gap: 12, backgroundColor: palette.surface }}>
      {!current ? (
        <>
          <ActivityIndicator
            accessibilityLabel="Loading lesson editor"
            color={palette.accent}
          />
          <Text style={{ color: palette.text }}>Loading course…</Text>
        </>
      ) : (
        <>
          <Text
            accessibilityRole="header"
            style={{ color: palette.text, fontSize: 20, fontWeight: "800" }}
          >
            Lesson editor unavailable
          </Text>
          <Text style={{ color: palette.textMuted }}>{current.error}</Text>
          {current.retry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry lesson editor"
              onPress={() => {
                setResult(null);
                setAttempt((value) => value + 1);
              }}
            >
              <Text style={{ color: palette.accent }}>Retry</Text>
            </Pressable>
          ) : null}
        </>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to courses"
        onPress={onBack}
      >
        <Text style={{ color: palette.accent }}>Return to Courses</Text>
      </Pressable>
    </View>
  );
}
