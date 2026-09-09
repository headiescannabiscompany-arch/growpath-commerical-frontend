import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  addFacilityCourseLesson,
  archiveFacilityCourse,
  cancelFacilityCourseLiveRsvp,
  completeFacilityCourseLesson,
  createFacilityCourse,
  deleteFacilityCourseLesson,
  getFacilityCourse,
  getFacilityCourseLearnerState,
  listFacilityCourses,
  publishFacilityCourse,
  resolveFacilityCourseScope,
  rsvpFacilityCourseLive,
  saveFacilityCourseLearnerNote,
  unpublishFacilityCourse,
  updateFacilityCourse,
  updateFacilityCourseLesson,
  type FacilityCourse,
  type FacilityCourseList
} from "@/api/facilityCourses";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useEntitlements } from "@/entitlements";
import CoursesScreen from "@/screens/CoursesScreen";
import AddLessonScreen from "@/screens/AddLessonScreen";
import EditLessonScreen from "@/screens/EditLessonScreen";
import CreateCourseScreen from "@/screens/commercial/CreateCourseScreen";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const FacilityCreateCourseBuilder = CreateCourseScreen as React.ComponentType<any>;

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function rowId(value: any) {
  return String(value?._id || value?.id || "");
}

function StateCard({
  title,
  message,
  loading = false,
  onReturn
}: {
  title: string;
  message: string;
  loading?: boolean;
  onReturn?: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.stateCard}>
      {loading ? <ActivityIndicator color={palette.accent} /> : null}
      <Text accessibilityRole="header" aria-level={1} style={styles.stateTitle}>
        {title}
      </Text>
      <Text style={styles.stateText}>{message}</Text>
      {onReturn ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to Facility courses"
          onPress={onReturn}
          style={styles.returnButton}
        >
          <Text style={styles.returnText}>Return to Facility Courses</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function FacilityCoursesRoute() {
  const params = useLocalSearchParams<{
    action?: string | string[];
    courseId?: string | string[];
    course?: string | string[];
    lessonId?: string | string[];
  }>();
  const router = useRouter();
  const entitlements = useEntitlements();
  const facility = useFacility();
  const action = valueOf(params.action).toLowerCase();
  const courseId = valueOf(params.courseId) || valueOf(params.course);
  const lessonId = valueOf(params.lessonId);
  const scope = resolveFacilityCourseScope(
    facility.selectedId,
    entitlements.facilityId,
    entitlements.facilityRole,
    facility.selected
  );
  const scopedFacilityId = scope?.facilityId || "";
  const scopedRole = scope?.role || "";

  const api = useMemo(() => {
    if (!scopedFacilityId || !scopedRole) return null;
    const facilityId = scopedFacilityId;
    return {
      list: () => listFacilityCourses(facilityId),
      get: (id: string) => getFacilityCourse(facilityId, id),
      create: (payload: Record<string, any>) => createFacilityCourse(facilityId, payload),
      update: (id: string, payload: Record<string, any>) =>
        updateFacilityCourse(facilityId, id, payload),
      addLesson: (id: string, payload: Record<string, any>) =>
        addFacilityCourseLesson(facilityId, id, payload),
      updateLesson: (courseId: string, lessonId: string, payload: Record<string, any>) =>
        updateFacilityCourseLesson(facilityId, courseId, lessonId, payload),
      deleteLesson: (courseId: string, lessonId: string) =>
        deleteFacilityCourseLesson(facilityId, courseId, lessonId),
      getLearnerState: (courseId: string) =>
        getFacilityCourseLearnerState(facilityId, courseId),
      completeLesson: (courseId: string, lessonId: string) =>
        completeFacilityCourseLesson(facilityId, courseId, lessonId),
      saveLearnerNote: (courseId: string, lessonId: string, note: string) =>
        saveFacilityCourseLearnerNote(facilityId, courseId, lessonId, note),
      rsvpLive: (courseId: string, sourceSessionId: string) =>
        rsvpFacilityCourseLive(facilityId, courseId, sourceSessionId),
      cancelLiveRsvp: (courseId: string, sourceSessionId: string) =>
        cancelFacilityCourseLiveRsvp(facilityId, courseId, sourceSessionId),
      publish: (
        id: string,
        payload: { visibility: "facilityOnly" | "public" | "unlisted" }
      ) => publishFacilityCourse(facilityId, id, payload),
      unpublish: (id: string) => unpublishFacilityCourse(facilityId, id),
      archive: (id: string) => archiveFacilityCourse(facilityId, id)
    };
  }, [scopedFacilityId, scopedRole]);
  const workspace = useMemo(
    () => ({ facilityId: scopedFacilityId, role: scopedRole, api }),
    [scopedFacilityId, scopedRole, api]
  );

  const returnToCourses = () => router.replace("/home/facility/courses" as any);
  const returnToCourse = (id: string) =>
    router.replace({
      pathname: "/home/facility/courses",
      params: id ? { courseId: id } : undefined
    } as any);

  if (!entitlements.ready) {
    return (
      <StateCard
        title="Loading Facility courses"
        message="Verifying the selected Facility workspace and role."
        loading
      />
    );
  }

  if (entitlements.mode !== "facility" || !scope || !api) {
    return (
      <StateCard
        title="Facility course access unavailable"
        message="Select the same authorized Facility shown in your current workspace before opening its courses."
      />
    );
  }

  if (action === "create") {
    return (
      <FacilityCreateCourse
        workspace={workspace}
        onReturn={returnToCourses}
        onOpenCourse={returnToCourse}
      />
    );
  }

  if (action === "add-lesson" || action === "edit-lesson") {
    return (
      <FacilityLessonEditor
        action={action}
        courseId={courseId}
        lessonId={lessonId}
        workspace={workspace}
        onReturn={returnToCourses}
        onOpenCourse={returnToCourse}
      />
    );
  }

  return (
    <ScreenBoundary title="Facility Courses" backFallbackHref="/home/facility/more">
      <CoursesScreen catalogHref="/home/facility/courses" facilityWorkspace={workspace} />
    </ScreenBoundary>
  );
}

function FacilityCreateCourse({
  workspace,
  onReturn,
  onOpenCourse
}: {
  workspace: any;
  onReturn: () => void;
  onOpenCourse: (courseId: string) => void;
}) {
  const [result, setResult] = useState<FacilityCourseList | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    workspace.api
      .list()
      .then((response: FacilityCourseList) => {
        if (active) setResult(response);
      })
      .catch((reason: any) => {
        if (active) setError(reason?.message || "Unable to verify course access.");
      });
    return () => {
      active = false;
    };
  }, [workspace.api]);

  if (!result && !error) {
    return (
      <StateCard
        title="Loading Course Builder"
        message="Verifying Facility course permissions."
        loading
      />
    );
  }
  if (error || result?.permissions?.canCreateDraft !== true) {
    return (
      <StateCard
        title="Course Builder unavailable"
        message={
          error ||
          "Your current Facility role does not have server-approved draft creation access."
        }
        onReturn={onReturn}
      />
    );
  }
  const scopedWorkspace = {
    ...workspace,
    permissions: result.permissions,
    limits: result.limits
  };
  return (
    <ScreenBoundary
      title="Create Facility Course"
      showBack
      backFallbackHref="/home/facility/courses"
      preferBackFallback
    >
      <FacilityCreateCourseBuilder
        showBackToCourses={false}
        facilityWorkspace={scopedWorkspace}
        navigation={{
          replace: (_screen: string, params: any) =>
            onOpenCourse(String(params?.id || rowId(params?.course) || "")),
          goBack: onReturn
        }}
      />
    </ScreenBoundary>
  );
}

function FacilityLessonEditor({
  action,
  courseId,
  lessonId,
  workspace,
  onReturn,
  onOpenCourse
}: {
  action: string;
  courseId: string;
  lessonId: string;
  workspace: any;
  onReturn: () => void;
  onOpenCourse: (courseId: string) => void;
}) {
  const [course, setCourse] = useState<FacilityCourse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!courseId) {
      setError("Select a Facility course before editing its lessons.");
      return () => {
        active = false;
      };
    }
    workspace.api
      .get(courseId)
      .then((response: FacilityCourse) => {
        if (!active) return;
        if (response?.permissions?.canEditLessons !== true) {
          throw new Error(
            "Your current Facility role cannot edit lessons in this course."
          );
        }
        setCourse(response);
      })
      .catch((reason: any) => {
        if (active) setError(reason?.message || "Unable to load the Facility course.");
      });
    return () => {
      active = false;
    };
  }, [courseId, workspace.api]);

  if (!course && !error) {
    return (
      <StateCard
        title="Loading Lesson Editor"
        message="Verifying Facility course and lesson permissions."
        loading
      />
    );
  }
  if (!course || error) {
    return (
      <StateCard
        title="Lesson editor unavailable"
        message={error || "This Facility course could not be loaded."}
        onReturn={onReturn}
      />
    );
  }

  const scopedWorkspace = {
    ...workspace,
    permissions: course.permissions,
    api: {
      ...workspace.api,
      addLesson: (id: string, payload: Record<string, any>) =>
        workspace.api.addLesson(id, payload),
      updateLesson: (scopedCourseId: string, id: string, payload: Record<string, any>) =>
        workspace.api.updateLesson(scopedCourseId, id, payload)
    }
  };
  const navigation = { goBack: () => onOpenCourse(courseId) };

  if (action === "add-lesson") {
    return (
      <ScreenBoundary
        title="Add Facility Course Lesson"
        showBack
        backFallbackHref={`/home/facility/courses?courseId=${encodeURIComponent(courseId)}`}
        preferBackFallback
      >
        <AddLessonScreen
          route={{ params: { courseId } }}
          navigation={navigation}
          facilityWorkspace={scopedWorkspace}
        />
      </ScreenBoundary>
    );
  }

  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  const lesson = lessons.find((item: any) => rowId(item) === lessonId) || null;
  if (!lesson) {
    return (
      <StateCard
        title="Lesson editor unavailable"
        message="This lesson does not belong to the selected Facility course."
        onReturn={() => onOpenCourse(courseId)}
      />
    );
  }
  return (
    <ScreenBoundary
      title="Edit Facility Course Lesson"
      showBack
      backFallbackHref={`/home/facility/courses?courseId=${encodeURIComponent(courseId)}`}
      preferBackFallback
    >
      <EditLessonScreen
        route={{ params: { courseId, lessonId, lesson } }}
        navigation={navigation}
        facilityWorkspace={scopedWorkspace}
      />
    </ScreenBoundary>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    stateCard: {
      alignItems: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      margin: 16,
      padding: 16
    },
    stateTitle: { color: palette.text, fontSize: 20, fontWeight: "800" },
    stateText: { color: palette.textMuted, lineHeight: 21 },
    returnButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    returnText: { color: palette.accentText, fontWeight: "800" }
  });
}
