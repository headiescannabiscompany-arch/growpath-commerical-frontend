import {
  listFacilityCourseLiveEvents,
  isUpcomingFacilityCourseLiveEvent
} from "@/api/facilityCourseLiveEvents";

describe("isUpcomingFacilityCourseLiveEvent", () => {
  const now = new Date("2026-09-10T12:00:00Z");
  const session = {
    scheduledStart: "2026-09-10T09:00",
    timezone: "America/New_York",
    status: "scheduled"
  };
  it("uses the saved timezone for local dates and excludes past sessions", () => {
    expect(isUpcomingFacilityCourseLiveEvent(session, now)).toBe(true);
    expect(
      isUpcomingFacilityCourseLiveEvent(
        { ...session, scheduledStart: "2026-09-10T07:00" },
        now
      )
    ).toBe(false);
    expect(
      isUpcomingFacilityCourseLiveEvent(
        { ...session, scheduledStart: "2026-09-10T08:00" },
        now
      )
    ).toBe(false);
    expect(
      isUpcomingFacilityCourseLiveEvent(
        { ...session, scheduledStart: "2026-09-09T09:00" },
        now
      )
    ).toBe(false);
  });
  it("honors absolute timestamps and fails closed for invalid or ended sessions", () => {
    expect(isUpcomingFacilityCourseLiveEvent({ ...session, timezone: "" }, now)).toBe(
      false
    );
    expect(isUpcomingFacilityCourseLiveEvent({ ...session, timezone: "  " }, now)).toBe(
      false
    );
    expect(
      isUpcomingFacilityCourseLiveEvent(
        { ...session, scheduledStart: "2026-09-10T13:00:00Z" },
        now
      )
    ).toBe(true);
    expect(
      isUpcomingFacilityCourseLiveEvent(
        { ...session, scheduledStart: "2026-09-10T09:00:00+02:00" },
        now
      )
    ).toBe(false);
    expect(isUpcomingFacilityCourseLiveEvent({ ...session, status: "ENDED" }, now)).toBe(
      false
    );
    expect(
      isUpcomingFacilityCourseLiveEvent({ ...session, timezone: "invalid/zone" }, now)
    ).toBe(false);
    expect(
      isUpcomingFacilityCourseLiveEvent({ ...session, scheduledStart: "nonsense" }, now)
    ).toBe(false);
  });
});

const mockListFacilityCourses = jest.fn();
const mockGetFacilityCourseLearnerState = jest.fn();

jest.mock("@/api/facilityCourses", () => ({
  listFacilityCourses: (...args: any[]) => mockListFacilityCourses(...args),
  getFacilityCourseLearnerState: (...args: any[]) =>
    mockGetFacilityCourseLearnerState(...args)
}));

const facilityId = "facility-public-id";

function liveCourse(
  id: string,
  overrides: Record<string, any> = {}
): Record<string, any> {
  return {
    id,
    facilityId,
    authoringSource: "facility_workspace",
    title: `Course ${id}`,
    isPublished: true,
    visibility: "facilityOnly",
    status: "published",
    liveSessions: [
      {
        sourceSessionId: `session-${id}`,
        title: `Live ${id}`,
        scheduledStart: "2026-09-10T18:00:00.000Z",
        scheduledEnd: "2026-09-10T19:00:00.000Z",
        timezone: "America/New_York",
        status: "scheduled",
        reminderPlan: { label: "1 day before" }
      }
    ],
    ...overrides
  };
}

function learnerState(courseId: string, overrides: Record<string, any> = {}) {
  return {
    courseId,
    included: true,
    accessSource: "facility_workspace",
    label: "Included with Facility workspace",
    completedLessonIds: [],
    completedLessonCount: 0,
    lessonCount: 0,
    notes: [],
    noteCount: 0,
    activeRsvpSourceSessionIds: [],
    activeRsvpCount: 0,
    ...overrides
  };
}

describe("listFacilityCourseLiveEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListFacilityCourses.mockResolvedValue({ courses: [] });
    mockGetFacilityCourseLearnerState.mockImplementation(
      async (_requestedFacilityId: string, courseId: string) => learnerState(courseId)
    );
  });

  it("projects only minimal event fields, keeps two sessions, and deduplicates one canonical source within a course", async () => {
    mockListFacilityCourses.mockResolvedValue({
      courses: [
        liveCourse("course-1", {
          title: "Facility IPM Live",
          privateAuthoringNotes: "must not leave the course response",
          creator: "private-author-id",
          liveSessions: [
            {
              sourceSessionId: " session-1 ",
              title: "Scouting review",
              scheduledStart: "2026-09-10T18:00:00.000Z",
              scheduledEnd: "2026-09-10T19:00:00.000Z",
              timezone: "America/New_York",
              status: "scheduled",
              reminderPlan: {
                label: "1 day before",
                privateRecipientIds: ["other-user"]
              },
              privateHostToken: "must-not-project"
            },
            {
              sourceSessionId: "session-2",
              title: "Live questions",
              scheduledStart: "2026-09-11T18:00:00.000Z",
              scheduledEnd: "",
              timezone: "UTC",
              status: "scheduled",
              reminderPlan: { label: "15 minutes before" }
            },
            {
              sourceSessionId: "session-1",
              title: "Duplicate must not project",
              scheduledStart: "2026-09-12T18:00:00.000Z"
            }
          ]
        })
      ]
    });
    mockGetFacilityCourseLearnerState.mockResolvedValue(
      learnerState("course-1", {
        notes: [{ lessonId: "lesson-private", note: "private learner note" }],
        activeRsvpSourceSessionIds: ["session-2"],
        otherLearnerIds: ["other-user"]
      })
    );

    await expect(listFacilityCourseLiveEvents(facilityId)).resolves.toEqual([
      {
        facilityId,
        workspaceType: "facility",
        courseId: "course-1",
        courseTitle: "Facility IPM Live",
        sessionId: "session-1",
        title: "Scouting review",
        scheduledStart: "2026-09-10T18:00:00.000Z",
        scheduledEnd: "2026-09-10T19:00:00.000Z",
        timezone: "America/New_York",
        status: "scheduled",
        reminderPlan: { label: "1 day before" },
        rsvped: false
      },
      {
        facilityId,
        workspaceType: "facility",
        courseId: "course-1",
        courseTitle: "Facility IPM Live",
        sessionId: "session-2",
        title: "Live questions",
        scheduledStart: "2026-09-11T18:00:00.000Z",
        scheduledEnd: "",
        timezone: "UTC",
        status: "scheduled",
        reminderPlan: { label: "15 minutes before" },
        rsvped: true
      }
    ]);
    expect(mockListFacilityCourses).toHaveBeenCalledWith(facilityId);
    expect(mockGetFacilityCourseLearnerState).toHaveBeenCalledTimes(1);
    expect(mockGetFacilityCourseLearnerState).toHaveBeenCalledWith(
      facilityId,
      "course-1"
    );
  });

  it("filters unavailable courses and malformed live sessions before learner-state reads", async () => {
    const invalidCourses = [
      liveCourse("unpublished", { isPublished: false }),
      liveCourse("hidden-flag", { isHidden: true }),
      liveCourse("deleted-flag", { isDeleted: true }),
      liveCourse("archived-at", { archivedAt: "2026-09-08T00:00:00.000Z" }),
      liveCourse("quarantined-at", { quarantinedAt: "2026-09-08T00:00:00.000Z" }),
      liveCourse("private", { visibility: "private" }),
      liveCourse("hidden-status", { status: "HIDDEN" }),
      liveCourse("deleted-status", { status: "deleted" }),
      liveCourse("archived-status", { status: "archived" }),
      liveCourse("quarantined-status", { status: "quarantined" }),
      liveCourse("removed-status", { status: "removed" }),
      liveCourse("creator-quarantined", { creatorDisposition: "account_quarantined" }),
      liveCourse("creator-deleted", { creatorDisposition: "account_deleted" }),
      liveCourse("no-lives", { liveSessions: [] }),
      liveCourse("malformed-lives", {
        liveSessions: [
          {
            id: "non-canonical-session-id",
            scheduledStart: "2026-09-10T18:00:00.000Z"
          },
          { sourceSessionId: "invalid-date", scheduledStart: "not-a-date" },
          {
            sourceSessionId: "canceled-session",
            scheduledStart: "2026-09-10T18:00:00.000Z",
            status: "canceled"
          }
        ]
      })
    ];
    mockListFacilityCourses.mockResolvedValue({
      courses: [...invalidCourses, liveCourse("allowed")]
    });

    const events = await listFacilityCourseLiveEvents(facilityId);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      courseId: "allowed",
      sessionId: "session-allowed"
    });
    expect(mockGetFacilityCourseLearnerState).toHaveBeenCalledTimes(1);
    expect(mockGetFacilityCourseLearnerState).toHaveBeenCalledWith(facilityId, "allowed");
  });

  it("revalidates access even without an RSVP and propagates an access denial", async () => {
    mockListFacilityCourses.mockResolvedValue({ courses: [liveCourse("course-2")] });
    mockGetFacilityCourseLearnerState.mockRejectedValue(
      new Error("Facility course not found")
    );

    await expect(listFacilityCourseLiveEvents(facilityId)).rejects.toThrow(
      "Facility course not found"
    );
    expect(mockGetFacilityCourseLearnerState).toHaveBeenCalledWith(
      facilityId,
      "course-2"
    );
  });

  it("rejects a course or learner-state response outside the requested scope", async () => {
    mockListFacilityCourses.mockResolvedValueOnce({
      courses: [liveCourse("course-cross", { facilityId: "other-facility" })]
    });

    await expect(listFacilityCourseLiveEvents(facilityId)).rejects.toThrow(
      "Facility course event scope could not be verified"
    );
    expect(mockGetFacilityCourseLearnerState).not.toHaveBeenCalled();

    mockListFacilityCourses.mockResolvedValueOnce({
      courses: [liveCourse("course-state-cross")]
    });
    mockGetFacilityCourseLearnerState.mockResolvedValueOnce(
      learnerState("different-course")
    );

    await expect(listFacilityCourseLiveEvents(facilityId)).rejects.toThrow(
      "Facility course attendance scope could not be verified"
    );
  });

  it("bounds learner-state revalidation to four concurrent course reads", async () => {
    const courses = Array.from({ length: 9 }, (_value, index) =>
      liveCourse(`course-${index + 1}`)
    );
    let active = 0;
    let maxActive = 0;
    mockListFacilityCourses.mockResolvedValue({ courses });
    mockGetFacilityCourseLearnerState.mockImplementation(
      async (_requestedFacilityId: string, courseId: string) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
        return learnerState(courseId);
      }
    );

    const events = await listFacilityCourseLiveEvents(facilityId);

    expect(events).toHaveLength(9);
    expect(mockGetFacilityCourseLearnerState).toHaveBeenCalledTimes(9);
    expect(maxActive).toBe(4);
  });
});
