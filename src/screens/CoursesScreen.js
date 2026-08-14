import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useAuth } from "@/auth/AuthContext";
import { apiRequest } from "@/api/apiRequest";
import { unpublishCourse } from "@/api/courses";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { countPaidCourses, getLearningAccess } from "@/features/learning/learningAccess";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "../theme/theme";
import { resolveImageUri } from "../utils/photoUploads";
import {
  canonicalGrowInterestTag,
  flattenGrowInterests,
  groupTagsByTier,
  normalizeInterestList
} from "../utils/growInterests";
import CourseDetailScreen from "./CourseDetailScreen";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.courses)) return payload.courses;
  return [];
}

function mergeCourses(...lists) {
  const merged = new Map();
  lists.flat().forEach((course) => {
    const id = String(course?._id || course?.id || "");
    if (!id) return;
    merged.set(id, { ...(merged.get(id) || {}), ...course });
  });
  return Array.from(merged.values());
}

export function courseInterestTags(course) {
  const structured =
    course?.growInterests && !Array.isArray(course.growInterests)
      ? flattenGrowInterests(course.growInterests)
      : normalizeInterestList(course?.growInterests);
  return Array.from(
    new Set([
      ...structured,
      ...normalizeInterestList(course?.tags),
      ...normalizeInterestList(course?.interestTags),
      canonicalGrowInterestTag(course?.cropType)
    ])
  ).filter(Boolean);
}

export function matchesCourseInterests(course, userInterests) {
  const tags = courseInterestTags(course).map(canonicalGrowInterestTag).filter(Boolean);
  if (!tags.length || !userInterests.length) return true;
  const normalizedUserInterests = userInterests
    .map(canonicalGrowInterestTag)
    .filter(Boolean);
  const courseCrops = groupTagsByTier(tags).crops || [];
  const userCrops = groupTagsByTier(normalizedUserInterests).crops || [];
  if (
    courseCrops.length &&
    userCrops.length &&
    !courseCrops.some((crop) => userCrops.includes(crop))
  ) {
    return false;
  }
  const selected = new Set(normalizedUserInterests.map((item) => item.toLowerCase()));
  return tags.some((tag) => selected.has(tag.toLowerCase()));
}

function coursePriceLabel(course) {
  const cents = Number(course?.priceCents || 0);
  if (Number.isFinite(cents) && cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const dollars = Number(course?.price || 0);
  return Number.isFinite(dollars) && dollars > 0 ? `$${dollars.toFixed(2)}` : "Free";
}

const COURSE_IMAGE_FALLBACK = require("../../assets/banner.png");
export const COURSE_CATALOG_REQUEST_TIMEOUT_MS = 8000;

export function courseImageSource(course) {
  const savedImage = resolveImageUri(
    course?.coverImageUrl ||
      course?.coverImage ||
      course?.thumbnailUrl ||
      course?.thumbnail ||
      course?.imageUrl ||
      course?.bannerImageUrl ||
      ""
  );
  return savedImage ? { uri: savedImage } : COURSE_IMAGE_FALLBACK;
}

function isPublishedCourse(course) {
  return Boolean(
    course?.isPublished ||
    ["published", "active", "public"].includes(String(course?.status || "").toLowerCase())
  );
}

function entityId(value) {
  if (value && typeof value === "object") {
    return String(value._id || value.id || value.userId || "");
  }
  return String(value || "");
}

export function viewerOwnsCourse(course, user) {
  const viewerId = entityId(user);
  const creatorId = entityId(
    course?.creator || course?.createdBy || course?.owner || course?.userId
  );
  return Boolean(viewerId && creatorId && viewerId === creatorId);
}

export function isExplicitQaCourse(course) {
  const title = String(course?.title || course?.name || "");
  return /\bqa[\s-]+only\b/i.test(title) || /\btest[\s-]+only\b/i.test(title);
}

/**
 * @param {{
 *   navigation?: any;
 *   onDetailVisibilityChange?: (visible: boolean) => void;
 *   catalogHref?: string;
 * }} [props]
 */
export default function CoursesScreen({
  navigation,
  onDetailVisibilityChange,
  catalogHref = "/courses"
} = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestedCourseId = Array.isArray(params?.courseId)
    ? params.courseId[0]
    : params?.courseId;
  const checkoutResult = Array.isArray(params?.checkout)
    ? params.checkout[0]
    : params?.checkout;
  const ent = useEntitlements();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCoursesScreenStyles(palette), [palette]);
  const access = getLearningAccess(ent);
  const isSignedIn = Boolean(auth.isAuthed || auth.user?.id);
  const canCreateCourses = isSignedIn && access.canCreateCourses;
  const canInvite = isSignedIn && !!ent.can?.(CAPABILITY_KEYS.COMMERCIAL_HOME);

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [dismissedRequestedCourseId, setDismissedRequestedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [courseActionId, setCourseActionId] = useState("");
  const [courseActionFeedback, setCourseActionFeedback] = useState("");
  const [courseActionError, setCourseActionError] = useState("");
  const [catalogWarning, setCatalogWarning] = useState("");
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);

  useEffect(() => {
    onDetailVisibilityChange?.(Boolean(selectedCourse));
  }, [onDetailVisibilityChange, selectedCourse]);

  useEffect(() => {
    if (!requestedCourseId) setDismissedRequestedCourseId("");
  }, [requestedCourseId]);

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
      setCatalogWarning("");

      try {
        const [publicResult, ownedResult, commercialResult] = await Promise.allSettled([
          apiRequest("/api/courses", { timeoutMs: COURSE_CATALOG_REQUEST_TIMEOUT_MS }),
          canCreateCourses
            ? apiRequest("/api/courses/mine", {
                timeoutMs: COURSE_CATALOG_REQUEST_TIMEOUT_MS
              })
            : Promise.resolve([]),
          apiRequest("/api/commercial/courses/public", {
            timeoutMs: COURSE_CATALOG_REQUEST_TIMEOUT_MS
          })
        ]);
        if (
          publicResult.status === "rejected" &&
          ownedResult.status === "rejected" &&
          commercialResult.status === "rejected"
        ) {
          throw publicResult.reason;
        }
        if (
          publicResult.status === "rejected" ||
          ownedResult.status === "rejected" ||
          commercialResult.status === "rejected"
        ) {
          setCatalogWarning(
            "Some course sources could not load. Showing the available courses."
          );
        }
        const list = mergeCourses(
          publicResult.status === "fulfilled" ? normalizeList(publicResult.value) : [],
          ownedResult.status === "fulfilled"
            ? normalizeList(ownedResult.value).map((course) => ({
                ...course,
                _viewerOwnsCourse: true
              }))
            : [],
          commercialResult.status === "fulfilled"
            ? normalizeList(commercialResult.value)
            : []
        );
        const ownershipScoped = list.map((course) => ({
          ...course,
          _viewerOwnsCourse:
            Boolean(course?._viewerOwnsCourse) || viewerOwnsCourse(course, auth.user)
        }));
        const publicCleanScoped = ownershipScoped.filter(
          (course) => course?._viewerOwnsCourse || !isExplicitQaCourse(course)
        );
        const publicationScoped = isSignedIn
          ? publicCleanScoped
          : publicCleanScoped.filter(isPublishedCourse);
        const filtered = access.canSeePaidCourses
          ? publicationScoped
          : publicationScoped.filter(
              (c) => Number(c?.priceCents || 0) === 0 && Number(c?.price || 0) === 0
            );
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
  }, [
    access.canSeePaidCourses,
    access.canViewCourses,
    auth.user,
    canCreateCourses,
    isSignedIn,
    catalogReloadKey
  ]);

  useEffect(() => {
    if (
      !requestedCourseId ||
      String(requestedCourseId) === dismissedRequestedCourseId ||
      selectedCourse ||
      courses.length === 0
    )
      return;
    const match = courses.find(
      (course) => String(course?._id || course?.id || "") === String(requestedCourseId)
    );
    if (match) setSelectedCourse(match);
  }, [courses, dismissedRequestedCourseId, requestedCourseId, selectedCourse]);

  function closeSelectedCourse() {
    if (requestedCourseId) {
      setDismissedRequestedCourseId(String(requestedCourseId));
      router.replace?.(catalogHref);
    }
    setSelectedCourse(null);
  }

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

  const handleUnpublish = async (event, course) => {
    event?.stopPropagation?.();
    const id = String(course?._id || course?.id || "");
    if (!id || courseActionId) return;

    setCourseActionId(id);
    setCourseActionFeedback("");
    setCourseActionError("");
    try {
      await unpublishCourse(id);
      setCourses((current) =>
        current.map((item) =>
          String(item?._id || item?.id || "") === id
            ? { ...item, isPublished: false, status: "draft" }
            : item
        )
      );
      setCourseActionFeedback("Course unpublished and removed from public discovery.");
    } catch (error) {
      setCourseActionError(error?.message || "Unable to unpublish course.");
    } finally {
      setCourseActionId("");
    }
  };

  const hasAnalytics = useMemo(
    () => access.canViewCourseAnalytics,
    [access.canViewCourseAnalytics]
  );
  const paidCourseCount = useMemo(() => countPaidCourses(courses), [courses]);
  const paidLimitReached =
    access.maxPaidCourses !== null && paidCourseCount >= access.maxPaidCourses;
  const userInterests = useMemo(
    () => flattenGrowInterests(auth.user?.growInterests || {}),
    [auth.user?.growInterests]
  );

  function openCourse(course) {
    if (course?.sourceType === "commercial_course" && course?.storefrontSlug) {
      const id = String(course?._id || course?.id || "");
      router.push(
        `/store/${encodeURIComponent(course.storefrontSlug)}/courses/${encodeURIComponent(id)}`
      );
      return;
    }
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
    router.push("/courses/create?from=/home/personal/courses");
  }

  if (selectedCourse) {
    const selectedId = String(selectedCourse?._id || selectedCourse?.id || "");
    return (
      <View
        accessibilityLabel={selectedId ? `Selected course ${selectedId}` : undefined}
        style={styles.container}
      >
        <Pressable onPress={closeSelectedCourse} style={styles.backBtn}>
          <Text style={styles.backText}>Back to courses</Text>
        </Pressable>
        <CourseDetailScreen
          route={{
            params: { course: selectedCourse, id: selectedId, checkout: checkoutResult }
          }}
          navigation={navigation}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        Courses
      </Text>
      <PersonalFeedPlacement placement="top" routeKey="personal_courses" longContent />

      {!isSignedIn ? (
        <View style={styles.publicCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Published course catalog
          </Text>
          <Text style={styles.meta}>
            Browse courses that their creators have published. Sign in or create a free
            account before authoring, enrolling, purchasing, or saving learner progress.
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Sign in for courses"
              onPress={() => router.push("/login")}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Sign in</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Create a free account for courses"
              onPress={() => router.push("/register")}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Create free account</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!access.canViewCourses ? (
        <View style={styles.lockedCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Courses unavailable
          </Text>
          <Text style={styles.meta}>This account does not have `COURSES_VIEW`.</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.meta}>Loading courses...</Text>
        </View>
      ) : null}

      {err ? <Text style={styles.error}>{err}</Text> : null}
      {catalogWarning ? (
        <View style={styles.lockedCard}>
          <Text style={styles.meta}>{catalogWarning}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry course catalog"
            onPress={() => setCatalogReloadKey((current) => current + 1)}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Retry course catalog</Text>
          </Pressable>
        </View>
      ) : null}
      {courseActionFeedback ? (
        <Text style={styles.successText}>{courseActionFeedback}</Text>
      ) : null}
      {courseActionError ? <Text style={styles.error}>{courseActionError}</Text> : null}

      {!loading && !err && courses.length === 0 ? (
        <Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>
          {isSignedIn ? "No courses found" : "No published courses yet"}
        </Text>
      ) : null}

      {courses.map((item, idx) => (
        <Pressable
          key={String(item?._id || item?.id || idx)}
          style={styles.card}
          disabled={!matchesCourseInterests(item, userInterests)}
          onPress={() => openCourse(item)}
        >
          <Image
            accessibilityLabel={`${String(item?.title || item?.name || "Untitled")} cover`}
            resizeMode="cover"
            source={courseImageSource(item)}
            style={styles.courseImage}
          />
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            {String(item?.title || item?.name || "Untitled")}
          </Text>
          <Text style={isPublishedCourse(item) ? styles.statusText : styles.draftText}>
            {isPublishedCourse(item) ? "Published" : "Draft"}
          </Text>
          <Text style={styles.priceText}>{coursePriceLabel(item)}</Text>
          {courseInterestTags(item).length ? (
            <Text style={styles.meta}>
              Grow interests: {courseInterestTags(item).join(" | ")}
            </Text>
          ) : (
            <Text style={styles.meta}>Grow interests: General</Text>
          )}
          {!matchesCourseInterests(item, userInterests) ? (
            <Text style={styles.lockedText}>
              Hidden from your learning path until you add a matching grow interest.
            </Text>
          ) : null}
          {hasAnalytics ? (
            <Text style={styles.meta}>Views: {item?.analytics?.views ?? 0}</Text>
          ) : null}
          {isSignedIn &&
          access.canPublishCourses &&
          item?._viewerOwnsCourse &&
          isPublishedCourse(item) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Unpublish ${String(item?.title || item?.name || "course")}`}
              disabled={courseActionId === String(item?._id || item?.id || "")}
              onPress={(event) => void handleUnpublish(event, item)}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>
                {courseActionId === String(item?._id || item?.id || "")
                  ? "Unpublishing..."
                  : "Unpublish"}
              </Text>
            </Pressable>
          ) : null}
          <Text style={styles.link}>
            {matchesCourseInterests(item, userInterests)
              ? "Open details"
              : "Outside your grow interests"}
          </Text>
        </Pressable>
      ))}

      {canCreateCourses ? (
        <>
          <View style={styles.builderCard}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Course Builder Workflow
            </Text>
            <Text style={styles.meta}>
              Start with the basics, build lessons, add media or a live session, choose
              who can access it, preview the learner experience, and publish when ready.
            </Text>
            <Text style={styles.meta}>
              GrowPath keeps course media, live sessions, pricing, and linked grow or
              forum resources together in this workflow.
            </Text>
          </View>
          <Text style={styles.meta}>
            Paid course limit:{" "}
            {access.maxPaidCourses === null
              ? "unlimited"
              : `${paidCourseCount}/${access.maxPaidCourses}`}
          </Text>
          <Text style={styles.meta}>Course media: ready for uploads</Text>
          <Text style={styles.meta}>Live sessions this month: 0 scheduled</Text>
        </>
      ) : null}

      {canCreateCourses ? (
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

      <PersonalFeedPlacement placement="middle" routeKey="personal_courses" longContent />

      {canInvite ? (
        <View style={styles.inviteCard}>
          <TextInput
            accessibilityLabel="Invite user name input"
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text
              }
            ]}
            value={inviteName}
            onChangeText={setInviteName}
            placeholder="Invite user name"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.inviteBtn}
            onPress={handleInvite}
          >
            <Text style={styles.inviteText}>Invite</Text>
          </Pressable>
          {inviteMessage ? (
            <Text
              style={inviteMessage === "Invite sent!" ? styles.successText : styles.error}
            >
              {inviteMessage}
            </Text>
          ) : null}
        </View>
      ) : null}
      <PersonalFeedPlacement placement="bottom" routeKey="personal_courses" longContent />
    </ScrollView>
  );
}

export const createCoursesScreenStyles = (palette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 14, backgroundColor: palette.page },
    content: { paddingBottom: 48, minHeight: "100%" },
    title: { color: palette.heroText, fontSize: 20, fontWeight: "800", marginBottom: 10 },
    row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    meta: { color: palette.textMuted, marginTop: 6, fontSize: 13 },
    emptyTitle: {
      color: palette.textMuted,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 8
    },
    error: { color: palette.danger, marginTop: 6, marginBottom: 10 },
    successText: { color: palette.success, marginTop: 6, fontSize: 13 },
    lockedText: { color: palette.warning, fontWeight: "800", marginTop: 6 },
    statusText: { color: palette.success, fontWeight: "800", marginTop: 4 },
    draftText: { color: palette.warning, fontWeight: "800", marginTop: 4 },
    priceText: { color: palette.text, fontWeight: "900", marginTop: 4 },
    card: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.borderSoft
    },
    courseImage: {
      width: "100%",
      maxWidth: 680,
      aspectRatio: 16 / 9,
      alignSelf: "center",
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted,
      marginBottom: 10
    },
    cardTitle: { color: palette.text, fontWeight: "800" },
    btn: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    builderCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      backgroundColor: palette.surfaceMuted,
      marginTop: 10
    },
    publicCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      backgroundColor: palette.surface,
      marginBottom: 10
    },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    btnDisabled: { opacity: 0.5 },
    btnText: {
      color: palette.accentText,
      fontWeight: "900",
      overflow: "hidden"
    },
    secondaryBtn: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 9
    },
    secondaryBtnText: {
      color: palette.link,
      fontWeight: "900",
      overflow: "hidden"
    },
    link: { color: palette.link, fontWeight: "800", marginTop: 8 },
    backBtn: { paddingVertical: 8 },
    backText: { color: palette.link, fontWeight: "800" },
    lockedCard: {
      padding: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      marginBottom: 10
    },
    smallBtn: { marginTop: 8, paddingVertical: 8 },
    smallBtnText: { color: palette.link, fontWeight: "900" },
    inviteCard: { marginTop: 12 },
    inviteBtn: { marginTop: 8, paddingVertical: 10 },
    inviteText: { color: palette.link, fontWeight: "900" },
    input: {
      backgroundColor: palette.surface,
      color: palette.text,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radius.card
    }
  });
