import { apiRequest } from "./apiRequest";

export type FacilityCourseRole = "OWNER" | "MANAGER" | "STAFF" | "VIEWER";

export type FacilityCoursePermissions = {
  canEditCourse: boolean;
  canEditLessons: boolean;
  canSetPrice: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
  canArchive: boolean;
};

export type FacilityCourseListPermissions = {
  canCreateDraft: boolean;
  canSetPrice: boolean;
};

export type FacilityCourseLimits = {
  maxPaidCourses: number | null;
  maxLessonsPerCourse: number | null;
  currentPublishedPaidCourses: number;
};

export type FacilityCourse = Record<string, any> & {
  _id?: string;
  id?: string;
  facilityId: string;
  authoringSource: "facility_workspace";
  permissions: FacilityCoursePermissions;
};

export type FacilityCourseList = {
  courses: FacilityCourse[];
  permissions: FacilityCourseListPermissions;
  limits: FacilityCourseLimits;
};

export type FacilityCourseScope = {
  facilityId: string;
  role: FacilityCourseRole;
};

export type FacilityCourseVisibility = "facilityOnly" | "public" | "unlisted";

export type FacilityCourseLearnerNote = {
  lessonId: string;
  note: string;
  updatedAt: string | null;
};

export type FacilityCourseLearnerState = {
  courseId: string;
  included: boolean;
  accessSource: "facility_workspace" | "enrollment" | "public_free";
  label: string;
  completedLessonIds: string[];
  completedLessonCount: number;
  lessonCount: number;
  notes: FacilityCourseLearnerNote[];
  noteCount: number;
  activeRsvpSourceSessionIds: string[];
  activeRsvpCount: number;
};

const FALSE_COURSE_PERMISSIONS: FacilityCoursePermissions = {
  canEditCourse: false,
  canEditLessons: false,
  canSetPrice: false,
  canPublish: false,
  canUnpublish: false,
  canArchive: false
};

const FALSE_LIST_PERMISSIONS: FacilityCourseListPermissions = {
  canCreateDraft: false,
  canSetPrice: false
};

const EMPTY_LIMITS: FacilityCourseLimits = {
  maxPaidCourses: null,
  maxLessonsPerCourse: null,
  currentPublishedPaidCourses: 0
};

function cleanId(value: unknown, label: string) {
  const id = String(value || "").trim();
  if (!id || id.length > 128 || Array.from(id).some((char) => char.charCodeAt(0) < 32)) {
    throw new Error(`${label} is required.`);
  }
  return id;
}

function cleanBoundedStrings(value: unknown, maxLength: number, maxItems = 1000) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => String(item || "").trim())
        .filter((item) => item && item.length <= maxLength)
    )
  ].slice(0, maxItems);
}

export function resolveFacilityCourseScope(
  selectedFacilityId: unknown,
  entitlementFacilityId: unknown,
  role: unknown
): FacilityCourseScope | null {
  const selected = String(selectedFacilityId || "").trim();
  const entitled = String(entitlementFacilityId || "").trim();
  const normalizedRole = String(role || "")
    .trim()
    .toUpperCase();
  if (
    !selected ||
    !entitled ||
    selected !== entitled ||
    !["OWNER", "MANAGER", "STAFF", "VIEWER"].includes(normalizedRole)
  ) {
    return null;
  }
  return {
    facilityId: selected,
    role: normalizedRole as FacilityCourseRole
  };
}

function entityId(value: unknown): string {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record._id || record.id || record.facilityId || "").trim();
  }
  return String(value || "").trim();
}

function courseFromEnvelope(payload: any) {
  return payload?.course ?? payload?.data?.course ?? payload?.data ?? payload ?? null;
}

function courseListFromEnvelope(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.courses)) return payload.courses;
  if (Array.isArray(payload?.data?.courses)) return payload.data.courses;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function trueOnly(value: unknown) {
  return value === true;
}

function normalizeCoursePermissions(value: any): FacilityCoursePermissions {
  return {
    canEditCourse: trueOnly(value?.canEditCourse),
    canEditLessons: trueOnly(value?.canEditLessons),
    canSetPrice: trueOnly(value?.canSetPrice),
    canPublish: trueOnly(value?.canPublish),
    canUnpublish: trueOnly(value?.canUnpublish),
    canArchive: trueOnly(value?.canArchive)
  };
}

function normalizeListPermissions(value: any): FacilityCourseListPermissions {
  return {
    canCreateDraft: trueOnly(value?.canCreateDraft),
    canSetPrice: trueOnly(value?.canSetPrice)
  };
}

function finiteLimit(value: unknown): number | null {
  if (value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeLimits(value: any): FacilityCourseLimits {
  return {
    maxPaidCourses: finiteLimit(value?.maxPaidCourses),
    maxLessonsPerCourse: finiteLimit(value?.maxLessonsPerCourse),
    currentPublishedPaidCourses: finiteLimit(value?.currentPublishedPaidCourses) ?? 0
  };
}

export function normalizeFacilityCourse(
  payload: any,
  expectedFacilityId: string
): FacilityCourse {
  const facilityId = cleanId(expectedFacilityId, "Facility");
  const raw = courseFromEnvelope(payload);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("The Facility course response was invalid.");
  }
  const responseFacilityId = entityId(raw.facilityId);
  const source = String(raw.authoringSource || raw.sourceType || "").toLowerCase();
  if (responseFacilityId !== facilityId || source !== "facility_workspace") {
    throw new Error("The course does not belong to the selected Facility workspace.");
  }
  return {
    ...raw,
    facilityId,
    authoringSource: "facility_workspace",
    permissions: normalizeCoursePermissions(raw.permissions)
  } as FacilityCourse;
}

export function normalizeFacilityCourseList(
  payload: any,
  expectedFacilityId: string
): FacilityCourseList {
  const courses = courseListFromEnvelope(payload).map((course: any) =>
    normalizeFacilityCourse(course, expectedFacilityId)
  );
  const envelope = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  return {
    courses,
    permissions: {
      ...FALSE_LIST_PERMISSIONS,
      ...normalizeListPermissions(envelope?.permissions)
    },
    limits: {
      ...EMPTY_LIMITS,
      ...normalizeLimits(envelope?.limits)
    }
  };
}

export function normalizeFacilityCourseLearnerState(
  payload: any,
  expectedCourseId: string
): FacilityCourseLearnerState {
  const courseId = cleanId(expectedCourseId, "Course");
  const raw = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("The Facility course learner-state response was invalid.");
  }
  if (String(raw.courseId || "").trim() !== courseId) {
    throw new Error("The learner state does not belong to the selected course.");
  }
  const accessSource = String(raw.accessSource || "");
  if (!["facility_workspace", "enrollment", "public_free"].includes(accessSource)) {
    throw new Error("The Facility course learner access was invalid.");
  }
  const completedLessonIds = cleanBoundedStrings(raw.completedLessonIds, 24);
  const activeRsvpSourceSessionIds = cleanBoundedStrings(
    raw.activeRsvpSourceSessionIds,
    240
  );
  const notes = (Array.isArray(raw.notes) ? raw.notes : [])
    .slice(0, 100)
    .map((entry: any) => ({
      lessonId: String(entry?.lessonId || "").trim(),
      note: String(entry?.note || "").slice(0, 10000),
      updatedAt: entry?.updatedAt ? String(entry.updatedAt) : null
    }))
    .filter(
      (entry: FacilityCourseLearnerNote) =>
        completedLessonIds.includes(entry.lessonId) ||
        /^[0-9a-f]{24}$/i.test(entry.lessonId)
    );
  return {
    courseId,
    included: raw.included === true,
    accessSource: accessSource as FacilityCourseLearnerState["accessSource"],
    label:
      raw.included === true
        ? "Included with Facility workspace"
        : String(raw.label || "Course access").slice(0, 80),
    completedLessonIds,
    completedLessonCount: completedLessonIds.length,
    lessonCount: finiteLimit(raw.lessonCount) ?? 0,
    notes,
    noteCount: notes.length,
    activeRsvpSourceSessionIds,
    activeRsvpCount: activeRsvpSourceSessionIds.length
  };
}

function basePath(facilityId: string) {
  return `/api/facility/${encodeURIComponent(cleanId(facilityId, "Facility"))}/courses`;
}

function coursePath(facilityId: string, courseId: string) {
  return `${basePath(facilityId)}/${encodeURIComponent(cleanId(courseId, "Course"))}`;
}

export async function listFacilityCourses(facilityId: string) {
  const response = await apiRequest(basePath(facilityId));
  return normalizeFacilityCourseList(response, facilityId);
}

export async function getFacilityCourse(facilityId: string, courseId: string) {
  const response = await apiRequest(coursePath(facilityId, courseId));
  return normalizeFacilityCourse(response, facilityId);
}

export async function createFacilityCourse(
  facilityId: string,
  payload: Record<string, any>
) {
  const response = await apiRequest(basePath(facilityId), {
    method: "POST",
    body: payload
  });
  return normalizeFacilityCourse(response, facilityId);
}

export async function updateFacilityCourse(
  facilityId: string,
  courseId: string,
  payload: Record<string, any>
) {
  const response = await apiRequest(coursePath(facilityId, courseId), {
    method: "PUT",
    body: payload
  });
  return normalizeFacilityCourse(response, facilityId);
}

export async function addFacilityCourseLesson(
  facilityId: string,
  courseId: string,
  payload: Record<string, any>
) {
  const response = await apiRequest(`${coursePath(facilityId, courseId)}/lessons`, {
    method: "POST",
    body: payload
  });
  return normalizeFacilityCourse(response, facilityId);
}

export async function updateFacilityCourseLesson(
  facilityId: string,
  courseId: string,
  lessonId: string,
  payload: Record<string, any>
) {
  const response = await apiRequest(
    `${coursePath(facilityId, courseId)}/lessons/${encodeURIComponent(
      cleanId(lessonId, "Lesson")
    )}`,
    { method: "PUT", body: payload }
  );
  return normalizeFacilityCourse(response, facilityId);
}

export async function deleteFacilityCourseLesson(
  facilityId: string,
  courseId: string,
  lessonId: string
) {
  const response = await apiRequest(
    `${coursePath(facilityId, courseId)}/lessons/${encodeURIComponent(
      cleanId(lessonId, "Lesson")
    )}`,
    { method: "DELETE" }
  );
  return normalizeFacilityCourse(response, facilityId);
}

async function learnerStateAction(
  facilityId: string,
  courseId: string,
  suffix = "",
  options?: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: any }
) {
  const response = await apiRequest(
    `${coursePath(facilityId, courseId)}${suffix}`,
    options
  );
  return normalizeFacilityCourseLearnerState(response, courseId);
}

export const getFacilityCourseLearnerState = (facilityId: string, courseId: string) =>
  learnerStateAction(facilityId, courseId, "/learner-state");

export const completeFacilityCourseLesson = (
  facilityId: string,
  courseId: string,
  lessonId: string
) =>
  learnerStateAction(
    facilityId,
    courseId,
    `/lessons/${encodeURIComponent(cleanId(lessonId, "Lesson"))}/complete`,
    { method: "POST" }
  );

export const saveFacilityCourseLearnerNote = (
  facilityId: string,
  courseId: string,
  lessonId: string,
  note: string
) =>
  learnerStateAction(
    facilityId,
    courseId,
    `/lessons/${encodeURIComponent(cleanId(lessonId, "Lesson"))}/learner-note`,
    { method: "PUT", body: { note: String(note || "") } }
  );

function canonicalLiveId(sourceSessionId: string) {
  const id = String(sourceSessionId || "").trim();
  if (!id || id.length > 240 || Array.from(id).some((char) => char.charCodeAt(0) < 32)) {
    throw new Error("Live session is required.");
  }
  return encodeURIComponent(id);
}

export const rsvpFacilityCourseLive = (
  facilityId: string,
  courseId: string,
  sourceSessionId: string
) =>
  learnerStateAction(
    facilityId,
    courseId,
    `/lives/${canonicalLiveId(sourceSessionId)}/rsvp`,
    { method: "POST" }
  );

export const cancelFacilityCourseLiveRsvp = (
  facilityId: string,
  courseId: string,
  sourceSessionId: string
) =>
  learnerStateAction(
    facilityId,
    courseId,
    `/lives/${canonicalLiveId(sourceSessionId)}/rsvp`,
    { method: "DELETE" }
  );

async function courseAction(
  facilityId: string,
  courseId: string,
  action: "publish" | "unpublish" | "archive",
  payload?: Record<string, any>
) {
  const response = await apiRequest(`${coursePath(facilityId, courseId)}/${action}`, {
    method: action === "archive" ? "PATCH" : "PUT",
    ...(payload ? { body: payload } : {})
  });
  return normalizeFacilityCourse(response, facilityId);
}

export const publishFacilityCourse = (
  facilityId: string,
  courseId: string,
  payload: { visibility: FacilityCourseVisibility }
) => courseAction(facilityId, courseId, "publish", payload);

export const unpublishFacilityCourse = (facilityId: string, courseId: string) =>
  courseAction(facilityId, courseId, "unpublish");

export const archiveFacilityCourse = (facilityId: string, courseId: string) =>
  courseAction(facilityId, courseId, "archive");

export { FALSE_COURSE_PERMISSIONS, FALSE_LIST_PERMISSIONS, EMPTY_LIMITS };
