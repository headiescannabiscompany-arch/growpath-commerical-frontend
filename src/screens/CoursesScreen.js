import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { apiRequest } from "@/api/apiRequest";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { countPaidCourses, getLearningAccess } from "@/features/learning/learningAccess";
import CourseDetailScreen from "./CourseDetailScreen";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.courses)) return payload.courses;
  return [];
}

export default function CoursesScreen({ navigation } = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestedCourseId = Array.isArray(params?.courseId)
    ? params.courseId[0]
    : params?.courseId;
  const ent = useEntitlements();
  const access = getLearningAccess(ent);
  const canInvite = !!ent.can?.(CAPABILITY_KEYS.COMMERCIAL_HOME);

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!access.canViewCourses) {
        setCourses([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr("");

      try {
        const data = await apiRequest("/api/courses");
        const list = normalizeList(data);
        const filtered = access.canSeePaidCourses
          ? list
          : list.filter((c) => (c?.priceCents || 0) === 0);
        if (alive) setCourses(filtered);
      } catch (e) {
        const msg = String(e?.message || e || "Failed to load courses");
        if (alive) setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [access.canSeePaidCourses, access.canViewCourses]);

  useEffect(() => {
    if (!requestedCourseId || selectedCourse || courses.length === 0) return;
    const match = courses.find(
      (course) => String(course?._id || course?.id || "") === String(requestedCourseId)
    );
    if (match) setSelectedCourse(match);
  }, [courses, requestedCourseId, selectedCourse]);

  const handleInvite = async () => {
    const name = inviteName.trim();
    setInviteMessage("");
    if (!name) {
      setInviteMessage("Failed to invite user");
      return;
    }
    try {
      await apiRequest("/api/invite", {
        method: "POST",
        body: { name }
      });
      setInviteMessage("Invite sent!");
    } catch (_e) {
      setInviteMessage("Failed to invite user");
    }
  };

  const hasAnalytics = useMemo(
    () => access.canViewCourseAnalytics,
    [access.canViewCourseAnalytics]
  );
  const paidCourseCount = useMemo(() => countPaidCourses(courses), [courses]);
  const paidLimitReached =
    access.maxPaidCourses !== null && paidCourseCount >= access.maxPaidCourses;

  function openCourse(course) {
    if (navigation?.navigate) {
      navigation.navigate("CourseDetail", { course, id: course?._id || course?.id });
      return;
    }
    setSelectedCourse(course);
  }

  function createCourse() {
    if (navigation?.navigate) {
      navigation.navigate("CreateCourse");
      return;
    }
    router.push("/courses/create");
  }

  if (selectedCourse) {
    const selectedId = String(selectedCourse?._id || selectedCourse?.id || "");
    return (
      <View
        accessibilityLabel={selectedId ? `Selected course ${selectedId}` : undefined}
        style={styles.container}
      >
        <Pressable onPress={() => setSelectedCourse(null)} style={styles.backBtn}>
          <Text style={styles.backText}>Back to courses</Text>
        </Pressable>
        <CourseDetailScreen
          route={{ params: { course: selectedCourse, id: selectedId } }}
          navigation={navigation}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Courses</Text>
      <PersonalFeedPlacement placement="top" routeKey="personal_courses" longContent />

      {!access.canViewCourses ? (
        <View style={styles.lockedCard}>
          <Text style={styles.cardTitle}>Courses unavailable</Text>
          <Text style={styles.meta}>This account does not have `COURSES_VIEW`.</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading courses...</Text>
        </View>
      ) : null}

      {err ? <Text style={styles.error}>{err}</Text> : null}

      {!loading && !err && courses.length === 0 ? (
        <Text style={styles.meta}>No courses found</Text>
      ) : null}

      {courses.map((item, idx) => (
        <Pressable
          key={String(item?._id || item?.id || idx)}
          style={styles.card}
          onPress={() => openCourse(item)}
        >
          <Text style={styles.cardTitle}>{String(item?.title || item?.name || "Untitled")}</Text>
          {hasAnalytics ? <Text style={styles.meta}>Views: {item?.analytics?.views ?? 0}</Text> : null}
          {access.canPublishCourses && item?.isPublished ? (
            <Pressable accessibilityRole="button" style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>Unpublish</Text>
            </Pressable>
          ) : null}
          <Text style={styles.link}>Open details</Text>
        </Pressable>
      ))}

      {access.canCreateCourses ? (
        <>
          <Text style={styles.meta}>
            Paid course limit:{" "}
            {access.maxPaidCourses === null
              ? "unlimited"
              : `${paidCourseCount}/${access.maxPaidCourses}`}
          </Text>
          <Text style={styles.meta}>
            Lesson limit per course:{" "}
            {access.maxLessonsPerCourse === null
              ? "unlimited"
              : access.maxLessonsPerCourse}
          </Text>
        </>
      ) : null}

      {access.canCreateCourses ? (
        <Pressable
          accessibilityRole="button"
          disabled={paidLimitReached && access.canSellPaidCourses}
          onPress={createCourse}
          style={[
            styles.btn,
            paidLimitReached && access.canSellPaidCourses && styles.btnDisabled
          ]}
        >
          <Text style={styles.btnText}>Create Course</Text>
        </Pressable>
      ) : null}

      {access.canCreateCourses && !access.canSellPaidCourses ? (
        <Text style={styles.meta}>Paid course sales require `COURSES_SELL_PAID`.</Text>
      ) : null}

      <PersonalFeedPlacement placement="middle" routeKey="personal_courses" longContent />

      {canInvite ? (
        <View style={styles.inviteCard}>
          <TextInput
            accessibilityLabel="Invite user name input"
            style={styles.input}
            value={inviteName}
            onChangeText={setInviteName}
            placeholder="Invite user name"
          />
          <Pressable accessibilityRole="button" style={styles.inviteBtn} onPress={handleInvite}>
            <Text style={styles.inviteText}>Invite</Text>
          </Pressable>
          {inviteMessage ? <Text style={styles.meta}>{inviteMessage}</Text> : null}
        </View>
      ) : null}
      <PersonalFeedPlacement placement="bottom" routeKey="personal_courses" longContent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  content: { paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  meta: { marginTop: 6, fontSize: 13, opacity: 0.8 },
  error: { color: "crimson", marginBottom: 10 },
  card: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  cardTitle: { fontWeight: "800" },
  btn: { marginTop: 10, paddingVertical: 10 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: "900" },
  link: { color: "#166534", fontWeight: "800", marginTop: 8 },
  backBtn: { paddingVertical: 8 },
  backText: { color: "#166534", fontWeight: "800" },
  lockedCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10
  },
  smallBtn: { marginTop: 8, paddingVertical: 8 },
  smallBtnText: { fontWeight: "900" },
  inviteCard: { marginTop: 12 },
  inviteBtn: { marginTop: 8, paddingVertical: 10 },
  inviteText: { fontWeight: "900" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6
  }
});
