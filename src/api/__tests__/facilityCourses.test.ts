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
  normalizeFacilityCourse,
  normalizeFacilityCourseLearnerState,
  publishFacilityCourse,
  resolveFacilityCourseScope,
  rsvpFacilityCourseLive,
  saveFacilityCourseLearnerNote,
  unpublishFacilityCourse,
  updateFacilityCourse,
  updateFacilityCourseLesson
} from "@/api/facilityCourses";

const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const facilityId = "facility one";
const courseId = "course/one";
const boundCourse = {
  id: courseId,
  facilityId,
  authoringSource: "facility_workspace",
  title: "Facility Safety",
  permissions: {
    canEditCourse: true,
    canEditLessons: true,
    canSetPrice: true,
    canPublish: true,
    canUnpublish: false,
    canArchive: true
  }
};

describe("facilityCourses API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue({ course: boundCourse });
  });

  it("requires one matching selected and entitled Facility with a known role", () => {
    expect(resolveFacilityCourseScope("facility-1", "facility-1", "manager")).toEqual({
      facilityId: "facility-1",
      role: "MANAGER"
    });
    expect(resolveFacilityCourseScope("facility-1", "facility-2", "OWNER")).toBeNull();
    expect(resolveFacilityCourseScope("facility-1", "facility-1", "QA")).toBeNull();
    expect(resolveFacilityCourseScope("", "facility-1", "OWNER")).toBeNull();
  });

  it("fails closed for missing permissions and rejects a cross-Facility response", () => {
    expect(
      normalizeFacilityCourse(
        {
          id: "course-1",
          facilityId: "facility-1",
          authoringSource: "facility_workspace"
        },
        "facility-1"
      ).permissions
    ).toEqual({
      canEditCourse: false,
      canEditLessons: false,
      canSetPrice: false,
      canPublish: false,
      canUnpublish: false,
      canArchive: false
    });
    expect(() =>
      normalizeFacilityCourse(
        {
          ...boundCourse,
          facilityId: "facility-2"
        },
        facilityId
      )
    ).toThrow("does not belong to the selected Facility workspace");
  });

  it("normalizes list permissions and limits only from affirmative server values", async () => {
    mockApiRequest.mockResolvedValueOnce({
      courses: [boundCourse],
      permissions: { canCreateDraft: true, canSetPrice: "true" },
      limits: {
        maxPaidCourses: 8,
        maxLessonsPerCourse: 30,
        currentPublishedPaidCourses: 2
      }
    });

    await expect(listFacilityCourses(facilityId)).resolves.toMatchObject({
      courses: [expect.objectContaining({ id: courseId })],
      permissions: { canCreateDraft: true, canSetPrice: false },
      limits: {
        maxPaidCourses: 8,
        maxLessonsPerCourse: 30,
        currentPublishedPaidCourses: 2
      }
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/facility/facility%20one/courses");
  });

  it("keeps every authoring and lifecycle request on the path-bound Facility API", async () => {
    await getFacilityCourse(facilityId, courseId);
    await createFacilityCourse(facilityId, { title: "Draft" });
    await updateFacilityCourse(facilityId, courseId, { title: "Updated" });
    await addFacilityCourseLesson(facilityId, courseId, { title: "Lesson" });
    await updateFacilityCourseLesson(facilityId, courseId, "lesson one", {
      title: "Edited"
    });
    await deleteFacilityCourseLesson(facilityId, courseId, "lesson one");
    await publishFacilityCourse(facilityId, courseId, { visibility: "public" });
    await unpublishFacilityCourse(facilityId, courseId);
    await archiveFacilityCourse(facilityId, courseId);

    expect(mockApiRequest.mock.calls).toEqual([
      ["/api/facility/facility%20one/courses/course%2Fone"],
      [
        "/api/facility/facility%20one/courses",
        { method: "POST", body: { title: "Draft" } }
      ],
      [
        "/api/facility/facility%20one/courses/course%2Fone",
        { method: "PUT", body: { title: "Updated" } }
      ],
      [
        "/api/facility/facility%20one/courses/course%2Fone/lessons",
        { method: "POST", body: { title: "Lesson" } }
      ],
      [
        "/api/facility/facility%20one/courses/course%2Fone/lessons/lesson%20one",
        { method: "PUT", body: { title: "Edited" } }
      ],
      [
        "/api/facility/facility%20one/courses/course%2Fone/lessons/lesson%20one",
        { method: "DELETE" }
      ],
      [
        "/api/facility/facility%20one/courses/course%2Fone/publish",
        { method: "PUT", body: { visibility: "public" } }
      ],
      ["/api/facility/facility%20one/courses/course%2Fone/unpublish", { method: "PUT" }],
      ["/api/facility/facility%20one/courses/course%2Fone/archive", { method: "PATCH" }]
    ]);
  });

  it("uses only canonical scoped learner-state and sourceSessionId contracts", async () => {
    const learnerCourseId = "507f191e810c19729de86110";
    const lessonId = "507f191e810c19729de86111";
    mockApiRequest.mockResolvedValue({
      courseId: learnerCourseId,
      included: true,
      accessSource: "facility_workspace",
      label: "server-controlled",
      completedLessonIds: [lessonId, lessonId],
      lessonCount: 1,
      notes: [{ lessonId, note: "Private note" }],
      activeRsvpSourceSessionIds: ["canonical/live", "canonical/live"]
    });

    expect(
      normalizeFacilityCourseLearnerState(
        {
          courseId: learnerCourseId,
          included: true,
          accessSource: "facility_workspace",
          label: "spoofed",
          completedLessonIds: [lessonId],
          notes: [{ lessonId, note: "Private note", _id: "must-not-pass" }],
          activeRsvpSourceSessionIds: ["canonical/live"],
          _id: "must-not-pass",
          userId: "must-not-pass"
        },
        learnerCourseId
      )
    ).toEqual(
      expect.objectContaining({
        courseId: learnerCourseId,
        included: true,
        label: "Included with Facility workspace",
        completedLessonIds: [lessonId],
        notes: [{ lessonId, note: "Private note", updatedAt: null }],
        activeRsvpSourceSessionIds: ["canonical/live"]
      })
    );
    expect(() =>
      normalizeFacilityCourseLearnerState(
        {
          _id: learnerCourseId,
          included: true,
          accessSource: "facility_workspace"
        },
        learnerCourseId
      )
    ).toThrow("does not belong to the selected course");

    await getFacilityCourseLearnerState(facilityId, learnerCourseId);
    await completeFacilityCourseLesson(facilityId, learnerCourseId, lessonId);
    await saveFacilityCourseLearnerNote(
      facilityId,
      learnerCourseId,
      lessonId,
      "Private note"
    );
    await rsvpFacilityCourseLive(facilityId, learnerCourseId, "canonical/live");
    await cancelFacilityCourseLiveRsvp(facilityId, learnerCourseId, "canonical/live");

    const base = `/api/facility/facility%20one/courses/${learnerCourseId}`;
    expect(mockApiRequest.mock.calls.slice(-5)).toEqual([
      [`${base}/learner-state`, undefined],
      [`${base}/lessons/${lessonId}/complete`, { method: "POST" }],
      [
        `${base}/lessons/${lessonId}/learner-note`,
        { method: "PUT", body: { note: "Private note" } }
      ],
      [`${base}/lives/canonical%2Flive/rsvp`, { method: "POST" }],
      [`${base}/lives/canonical%2Flive/rsvp`, { method: "DELETE" }]
    ]);
  });
});
