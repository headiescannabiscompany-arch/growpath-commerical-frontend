import {
  getFacilityCourseLearnerState,
  listFacilityCourses,
  type FacilityCourse
} from "./facilityCourses";

export type FacilityCourseLiveEvent = {
  facilityId: string;
  workspaceType: "facility";
  courseId: string;
  courseTitle: string;
  sessionId: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  status: string;
  reminderPlan: { label: string };
  rsvped: boolean;
};

export function isUpcomingFacilityCourseLiveEvent(
  session: Pick<FacilityCourseLiveEvent, "scheduledStart" | "timezone" | "status">,
  now = new Date()
) {
  if (
    ["ended", "completed", "canceled", "cancelled", "deleted"].includes(
      String(session.status || "")
        .trim()
        .toLowerCase()
    )
  )
    return false;
  const start = String(session.scheduledStart || "").trim();
  if (!Number.isFinite(new Date(start).getTime())) return false;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(start))
    return new Date(start).getTime() > now.getTime();
  const timezone = String(session.timezone || "").trim();
  if (!timezone) return false;
  const local = start.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2})(?:\.\d+)?)?$/);
  if (!local) return false;
  // Compare wall-clock values in the saved zone, not the viewing device's zone.
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      })
        .formatToParts(now)
        .map(({ type, value }) => [type, value])
    );
    return (
      `${local[1]}T${local[2]}:${local[3] || "00"}` >
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
    );
  } catch {
    return false;
  }
}

function publishedCourse(course: FacilityCourse) {
  return (
    course.isPublished === true &&
    ["facilityOnly", "public", "unlisted"].includes(course.visibility) &&
    !course.isHidden &&
    !course.isDeleted &&
    !course.archivedAt &&
    !course.quarantinedAt &&
    !["hidden", "deleted", "archived", "quarantined", "removed"].includes(
      String(course.status || "").toLowerCase()
    ) &&
    !["account_quarantined", "account_deleted"].includes(course.creatorDisposition)
  );
}

function scheduledSessions(course: FacilityCourse) {
  const seen = new Set<string>();
  return (Array.isArray(course.liveSessions) ? course.liveSessions : []).filter(
    (session: any) => {
      const id = String(session?.sourceSessionId || "").trim();
      const start = String(session?.scheduledStart || "").trim();
      if (
        !id ||
        id.length > 240 ||
        Array.from(id).some((char) => char.charCodeAt(0) < 32) ||
        seen.has(id) ||
        !start ||
        !Number.isFinite(new Date(start).getTime()) ||
        ["canceled", "cancelled", "deleted"].includes(
          String(session?.status || "").toLowerCase()
        )
      )
        return false;
      seen.add(id);
      return true;
    }
  );
}

// Reuse the existing member-scoped catalog and requester-only learner boundary.
// Do not turn private notes, authoring records, or another learner's IDs into events.
export async function listFacilityCourseLiveEvents(
  facilityId: string
): Promise<FacilityCourseLiveEvent[]> {
  const { courses } = await listFacilityCourses(facilityId);
  const candidates = courses
    .filter(publishedCourse)
    .map((course) => ({
      course,
      sessions: scheduledSessions(course)
    }))
    .filter(({ sessions }) => sessions.length);
  const result: FacilityCourseLiveEvent[][] = new Array(candidates.length);
  let next = 0;
  async function readNext() {
    while (next < candidates.length) {
      const index = next++;
      const { course, sessions } = candidates[index];
      const courseId = String(course._id || course.id || "");
      if (!courseId || course.facilityId !== facilityId) {
        throw new Error("Facility course event scope could not be verified.");
      }
      // Rechecks current publication, access and membership after the catalog read.
      const state = await getFacilityCourseLearnerState(facilityId, courseId);
      if (state.courseId !== courseId) {
        throw new Error("Facility course attendance scope could not be verified.");
      }
      const active = new Set(state.activeRsvpSourceSessionIds);
      result[index] = sessions.map((session: any) => {
        const sessionId = String(session.sourceSessionId).trim();
        return {
          facilityId,
          workspaceType: "facility",
          courseId,
          courseTitle: String(course.title || "Facility course"),
          sessionId,
          title: String(session.title || "Course live"),
          scheduledStart: String(session.scheduledStart),
          scheduledEnd: String(session.scheduledEnd || ""),
          timezone: String(session.timezone || ""),
          status: String(session.status || "scheduled"),
          reminderPlan: { label: String(session.reminderPlan?.label || "1 hour before") },
          rsvped: active.has(sessionId)
        };
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, candidates.length) }, readNext));
  return result.flat();
}
