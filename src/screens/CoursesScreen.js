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
import { useAuth } from "@/auth/AuthContext";
import { apiRequest } from "@/api/apiRequest";
import { getCourse, unpublishCourse } from "@/api/courses";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import AuthorizedCourseImage from "@/components/learning/AuthorizedCourseImage";
import { countPaidCourses, getLearningAccess } from "@/features/learning/learningAccess";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "../theme/theme";
import { resolveImageUri } from "../utils/photoUploads";
import { readPendingBuyerCheckout } from "../utils/buyerCheckoutRecovery";
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

function firstRouteParam(value) {
  return String(Array.isArray(value) ? value[0] || "" : value || "").trim();
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

export const COURSE_CATALOG_REQUEST_TIMEOUT_MS = 8000;

export function courseCatalogRequest(path) {
  let deadlineId;
  const deadline = new Promise((_, reject) => {
    deadlineId = setTimeout(
      () => reject(new Error("Course source timed out")),
      COURSE_CATALOG_REQUEST_TIMEOUT_MS
    );
  });
  return Promise.race([
    apiRequest(path, {
      timeoutMs: COURSE_CATALOG_REQUEST_TIMEOUT_MS,
      retries: 0
    }),
    deadline
  ]).finally(() => clearTimeout(deadlineId));
}

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
  return savedImage ? { uri: savedImage } : null;
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

function isCommercialManagedCourse(course) {
  return (
    String(course?.sourceType || "").toLowerCase() === "commercial_course" ||
    String(course?.authoringSource || "").toLowerCase() === "commercial_record"
  );
}

function isFacilityManagedCourse(course) {
  return (
    String(course?.sourceType || "").toLowerCase() === "facility_course" ||
    String(course?.authoringSource || "").toLowerCase() === "facility_workspace"
  );
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
 *   facilityWorkspace?: any;
 * }} [props]
 */
export default function CoursesScreen({
  navigation,
  onDetailVisibilityChange,
  catalogHref = "/courses",
  facilityWorkspace = null
} = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const directRequestedCourseId =
    firstRouteParam(params?.courseId) || firstRouteParam(params?.course);
  const moderationCaseId = Array.isArray(params?.moderationCaseId)
    ? params.moderationCaseId[0]
    : params?.moderationCaseId;
  const checkoutResult = firstRouteParam(params?.checkout).toLowerCase();
  const ent = useEntitlements();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCoursesScreenStyles(palette), [palette]);
  const access = getLearningAccess(ent);
  const facilityMode = Boolean(facilityWorkspace);
  const facilityScopeId = facilityMode ? entityId(facilityWorkspace?.facilityId) : "";
  const genericFacilityLearnerMode = ent.mode === "facility" && !facilityMode;
  const isSignedIn = Boolean(auth.isAuthed || auth.user?.id);
  const viewerId = entityId(auth.user);
  const [facilityPermissions, setFacilityPermissions] = useState({
    canCreateDraft: false,
    canSetPrice: false
  });
  const [facilityLimits, setFacilityLimits] = useState({
    maxPaidCourses: null,
    maxLessonsPerCourse: null,
    currentPublishedPaidCourses: 0
  });
  const facilityDetailWorkspace = useMemo(
    () =>
      facilityMode
        ? {
            ...facilityWorkspace,
            permissions: facilityPermissions,
            limits: facilityLimits
          }
        : null,
    [facilityMode, facilityWorkspace, facilityPermissions, facilityLimits]
  );
  const canCreateCourses = facilityMode
    ? isSignedIn && facilityPermissions.canCreateDraft === true
    : isSignedIn && !genericFacilityLearnerMode && access.canCreateCourses;
  const canInvite =
    !facilityMode &&
    !genericFacilityLearnerMode &&
    isSignedIn &&
    !!ent.can?.(CAPABILITY_KEYS.COMMERCIAL_HOME);

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [recoveredCheckoutCourseId, setRecoveredCheckoutCourseId] = useState("");
  const [dismissedRequestedCourseId, setDismissedRequestedCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [courseActionId, setCourseActionId] = useState("");
  const [courseActionFeedback, setCourseActionFeedback] = useState("");
  const [courseActionError, setCourseActionError] = useState("");
  const [catalogWarning, setCatalogWarning] = useState("");
  const [requestedCourseError, setRequestedCourseError] = useState("");
  const [catalogReloadKey, setCatalogReloadKey] = useState(0);
  const requestedCourseId = directRequestedCourseId || recoveredCheckoutCourseId;
  const selectedCourseMatchesScope = Boolean(
    selectedCourse &&
    (!facilityMode || entityId(selectedCourse?.facilityId) === facilityScopeId)
  );

  useEffect(() => {
    let active = true;
    if (directRequestedCourseId) {
      setRecoveredCheckoutCourseId("");
      return () => {
        active = false;
      };
    }
    if (!checkoutResult) return undefined;
    void readPendingBuyerCheckout("course")
      .then((record) => {
        if (active && record?.itemId) setRecoveredCheckoutCourseId(record.itemId);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [checkoutResult, directRequestedCourseId]);

  useEffect(() => {
    onDetailVisibilityChange?.(selectedCourseMatchesScope);
  }, [onDetailVisibilityChange, selectedCourseMatchesScope]);

  useEffect(() => {
    if (!facilityMode) return;
    setSelectedCourse((current) => {
      if (!current || entityId(current?.facilityId) === facilityScopeId) return current;
      return null;
    });
  }, [facilityMode, facilityScopeId]);

  useEffect(() => {
    if (!requestedCourseId) setDismissedRequestedCourseId("");
  }, [requestedCourseId]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (facilityMode) {
        if (
          !facilityWorkspace?.facilityId ||
          !facilityWorkspace?.role ||
          typeof facilityWorkspace?.api?.list !== "function" ||
          typeof facilityWorkspace?.api?.get !== "function"
        ) {
          setCourses([]);
          setFacilityPermissions({ canCreateDraft: false, canSetPrice: false });
          setLoading(false);
          setErr("Facility course access is unavailable for the selected workspace.");
          return;
        }
        setLoading(true);
        setErr("");
        setCatalogWarning("");
        setRequestedCourseError("");
        try {
          const result = await facilityWorkspace.api.list();
          if (!alive) return;
          setFacilityPermissions(
            result?.permissions || { canCreateDraft: false, canSetPrice: false }
          );
          setFacilityLimits(
            result?.limits || {
              maxPaidCourses: null,
              maxLessonsPerCourse: null,
              currentPublishedPaidCourses: 0
            }
          );
          let scopedCourses = normalizeList(result?.courses).map((course) => ({
            ...course,
            _viewerOwnsCourse: true
          }));
          if (
            requestedCourseId &&
            String(requestedCourseId) !== dismissedRequestedCourseId &&
            !scopedCourses.some(
              (course) =>
                String(course?._id || course?.id || "") === String(requestedCourseId)
            )
          ) {
            try {
              const requestedCourse = await facilityWorkspace.api.get(
                String(requestedCourseId)
              );
              if (requestedCourse) {
                scopedCourses = mergeCourses(scopedCourses, [
                  { ...requestedCourse, _viewerOwnsCourse: true }
                ]);
              }
            } catch (_requestedError) {
              if (alive) {
                setRequestedCourseError(
                  "The requested Facility course is unavailable or you no longer have access."
                );
              }
            }
          }
          if (alive) setCourses(scopedCourses);
        } catch (error) {
          if (alive) {
            setCourses([]);
            setFacilityPermissions({ canCreateDraft: false, canSetPrice: false });
            setErr(String(error?.message || error || "Failed to load Facility courses"));
          }
        } finally {
          if (alive) setLoading(false);
        }
        return;
      }

      if (!access.canViewCourses) {
        setCourses([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr("");
      setCatalogWarning("");
      setRequestedCourseError("");

      try {
        const [publicResult, ownedResult, commercialResult] = await Promise.allSettled([
          courseCatalogRequest("/api/courses"),
          canCreateCourses
            ? courseCatalogRequest("/api/courses/mine")
            : Promise.resolve([]),
          courseCatalogRequest("/api/commercial/courses/public")
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
            Boolean(course?._viewerOwnsCourse) || viewerOwnsCourse(course, viewerId)
        }));
        const publicCleanScoped = ownershipScoped.filter(
          (course) => course?._viewerOwnsCourse || !isExplicitQaCourse(course)
        );
        const publicationScoped = isSignedIn
          ? publicCleanScoped
          : publicCleanScoped.filter(isPublishedCourse);
        let filtered = access.canSeePaidCourses
          ? publicationScoped
          : publicationScoped.filter(
              (c) => Number(c?.priceCents || 0) === 0 && Number(c?.price || 0) === 0
            );
        if (
          requestedCourseId &&
          String(requestedCourseId) !== dismissedRequestedCourseId &&
          !filtered.some(
            (course) =>
              String(course?._id || course?.id || "") === String(requestedCourseId)
          )
        ) {
          try {
            const requestedCourse = await getCourse(String(requestedCourseId));
            if (requestedCourse) filtered = mergeCourses(filtered, [requestedCourse]);
          } catch (_requestedError) {
            if (alive) {
              setRequestedCourseError(
                moderationCaseId
                  ? "The reported course is no longer available. Return to the moderation queue to resolve or retain the case for audit."
                  : "The requested course is unavailable or you no longer have access."
              );
            }
          }
        }
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
    facilityMode,
    facilityWorkspace,
    viewerId,
    canCreateCourses,
    isSignedIn,
    catalogReloadKey,
    requestedCourseId,
    dismissedRequestedCourseId,
    moderationCaseId
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

  function handleCourseArchived() {
    closeSelectedCourse();
    setCatalogReloadKey((key) => key + 1);
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
      if (facilityMode) {
        if (
          course?.permissions?.canUnpublish !== true ||
          typeof facilityWorkspace?.api?.unpublish !== "function"
        ) {
          throw new Error(
            "You do not have permission to unpublish this Facility course."
          );
        }
        await facilityWorkspace.api.unpublish(id);
      } else {
        await unpublishCourse(id);
      }
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
    () => !facilityMode && access.canViewCourseAnalytics,
    [access.canViewCourseAnalytics, facilityMode]
  );
  const paidCourseCount = useMemo(
    () =>
      facilityMode
        ? Number(facilityLimits.currentPublishedPaidCourses || 0)
        : countPaidCourses(courses),
    [courses, facilityLimits.currentPublishedPaidCourses, facilityMode]
  );
  const maxPaidCourses = facilityMode
    ? facilityLimits.maxPaidCourses
    : access.maxPaidCourses;
  const paidLimitReached = maxPaidCourses !== null && paidCourseCount >= maxPaidCourses;
  const userInterests = useMemo(
    () => flattenGrowInterests(auth.user?.growInterests || {}),
    [auth.user?.growInterests]
  );

  function openCourse(course) {
    if (
      !facilityMode &&
      course?.sourceType === "commercial_course" &&
      course?.storefrontSlug
    ) {
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
    router.push(
      facilityMode
        ? "/home/facility/courses?action=create"
        : "/courses/create?from=/home/personal/courses"
    );
  }

  if (selectedCourse && selectedCourseMatchesScope) {
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
          key={
            facilityMode
              ? JSON.stringify([facilityScopeId, facilityWorkspace.role, viewerId])
              : undefined
          }
          onArchived={handleCourseArchived}
          route={{
            params: { course: selectedCourse, id: selectedId, checkout: checkoutResult }
          }}
          navigation={navigation}
          facilityWorkspace={facilityDetailWorkspace}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        {facilityMode ? "Facility Courses" : "Courses"}
      </Text>
      {!facilityMode ? (
        <PersonalFeedPlacement placement="top" routeKey="personal_courses" longContent />
      ) : null}

      {!facilityMode && !isSignedIn ? (
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

      {!facilityMode && !access.canViewCourses ? (
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

      {!loading && !err && requestedCourseError ? (
        <View style={styles.lockedCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>
            {moderationCaseId
              ? "Reported course is unavailable"
              : "Requested course is unavailable"}
          </Text>
          <Text style={styles.meta}>{requestedCourseError}</Text>
          {moderationCaseId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to moderation queue"
              onPress={() =>
                router.replace?.(`/admin?moderationCaseId=${moderationCaseId}`)
              }
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Return to moderation queue</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && !err && !requestedCourseError && courses.length === 0 ? (
        <Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>
          {isSignedIn ? "No courses found" : "No published courses yet"}
        </Text>
      ) : null}

      {courses.map((item, idx) => (
        <Pressable
          key={String(item?._id || item?.id || idx)}
          style={styles.card}
          disabled={!facilityMode && !matchesCourseInterests(item, userInterests)}
          onPress={() => openCourse(item)}
        >
          {courseImageSource(item) ? (
            <AuthorizedCourseImage
              accessibilityLabel={`${String(item?.title || item?.name || "Untitled")} cover`}
              resizeMode="cover"
              uri={courseImageSource(item).uri}
              style={styles.courseImage}
            />
          ) : null}
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            {String(item?.title || item?.name || "Untitled")}
          </Text>
          <Text style={isPublishedCourse(item) ? styles.statusText : styles.draftText}>
            {isPublishedCourse(item) ? "Published" : "Draft"}
          </Text>
          <Text style={styles.priceText}>{coursePriceLabel(item)}</Text>
          {facilityMode && isFacilityManagedCourse(item) ? (
            <Text style={styles.meta}>Facility workspace course</Text>
          ) : null}
          {courseInterestTags(item).length ? (
            <Text style={styles.meta}>
              Grow interests: {courseInterestTags(item).join(" | ")}
            </Text>
          ) : (
            <Text style={styles.meta}>Grow interests: General</Text>
          )}
          {!facilityMode && !matchesCourseInterests(item, userInterests) ? (
            <Text style={styles.lockedText}>
              Hidden from your learning path until you add a matching grow interest.
            </Text>
          ) : null}
          {hasAnalytics ? (
            <Text style={styles.meta}>Views: {item?.analytics?.views ?? 0}</Text>
          ) : null}
          {isSignedIn && item?._viewerOwnsCourse && isCommercialManagedCourse(item) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Manage ${String(item?.title || item?.name || "course")} in Commercial workspace`}
              onPress={(event) => {
                event?.stopPropagation?.();
                const id = String(item?._id || item?.id || "");
                if (id) {
                  router.push(`/home/commercial/courses/${encodeURIComponent(id)}`);
                }
              }}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>Manage in Commercial Workspace</Text>
            </Pressable>
          ) : null}
          {isSignedIn &&
          (facilityMode
            ? item?.permissions?.canUnpublish === true
            : !genericFacilityLearnerMode && access.canPublishCourses) &&
          item?._viewerOwnsCourse &&
          !isCommercialManagedCourse(item) &&
          (facilityMode || !isFacilityManagedCourse(item)) &&
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
            {facilityMode || matchesCourseInterests(item, userInterests)
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
            {maxPaidCourses === null
              ? "unlimited"
              : `${paidCourseCount}/${maxPaidCourses}`}
          </Text>
          <Text style={styles.meta}>Course media: ready for uploads</Text>
          <Text style={styles.meta}>Live sessions this month: 0 scheduled</Text>
        </>
      ) : null}

      {canCreateCourses ? (
        <Pressable
          accessibilityRole="button"
          disabled={!facilityMode && paidLimitReached && access.canSellPaidCourses}
          onPress={createCourse}
          style={[
            styles.btn,
            !facilityMode &&
              paidLimitReached &&
              access.canSellPaidCourses &&
              styles.btnDisabled
          ]}
        >
          <Text style={styles.btnText}>Create Course</Text>
        </Pressable>
      ) : null}

      {!facilityMode ? (
        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_courses"
          longContent
        />
      ) : null}

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
      {!facilityMode ? (
        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_courses"
          longContent
        />
      ) : null}
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
