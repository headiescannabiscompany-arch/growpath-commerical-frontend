import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking, StyleSheet } from "react-native";

import CourseDetailScreen, {
  courseDetailImageSource,
  createStyles
} from "@/screens/CourseDetailScreen";
import { getThemePalette } from "@/theme/appTheme";
import FacilityCoursesRoute from "@/app/home/facility/(tabs)/courses";
import CoursesScreen from "@/screens/CoursesScreen";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockArchiveCourse = jest.fn();
const mockSaveNote = jest.fn();
const mockCompleteLesson = jest.fn();
const mockApiRequest = jest.fn();
const mockGetCourse = jest.fn();
const mockGetEnrollmentStatus = jest.fn();
const mockGetCourseLearnerNotes = jest.fn();
const mockEnrollInCourse = jest.fn();
const mockGetReviews = jest.fn();
const mockTrackLessonView = jest.fn();
const mockSendWatchTime = jest.fn();
const mockTrackDropoff = jest.fn();
const mockGetCoursePaymentStatus = jest.fn();
const mockOpenCourseDispute = jest.fn();
const mockRequestCourseRefund = jest.fn();
const mockStartCourseCheckout = jest.fn();
const mockPublishCourse = jest.fn();
const mockSubmitReport = jest.fn();
const mockUnpublishCourse = jest.fn();
const mockUpdateCourse = jest.fn();
const mockRetryMe = jest.fn();
const mockLearningAccess = {
  canViewCourses: true,
  canSeePaidCourses: true,
  canCreateCourses: false,
  canSellPaidCourses: false,
  canPublishCourses: false,
  canViewCourseAnalytics: false,
  maxLessonsPerCourse: 12
};
const mockEntitlements = {
  mode: "personal",
  ready: true,
  bootstrapError: null as string | null,
  facilityId: "facility-1",
  facilityRole: "MANAGER"
};
let mockViewerId = "learner-1";
const mockAuthState = {
  isAuthed: true,
  isHydrating: false,
  token: "learner-1-token" as string | null,
  meStatus: "ready",
  retryMe: mockRetryMe
};
const mockFacility = { selectedId: "facility-1", selected: null };
const mockFacilityList = jest.fn();
const mockFacilityGet = jest.fn();
const mockFacilityLearnerState = jest.fn();
const mockFacilityUnpublish = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    ...mockAuthState,
    user: mockViewerId ? { id: mockViewerId } : null
  })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { COMMERCIAL_HOME: "COMMERCIAL_HOME" },
  useEntitlements: () => mockEntitlements
}));
jest.mock("@/state/useFacility", () => ({ useFacility: () => mockFacility }));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
jest.mock("@/screens/commercial/CreateCourseScreen", () => () => null);
jest.mock("@/screens/AddLessonScreen", () => () => null);
jest.mock("@/screens/EditLessonScreen", () => () => null);
jest.mock("@/api/facilityCourses", () => ({
  ...jest.requireActual("@/api/facilityCourses"),
  listFacilityCourses: (...args: any[]) => mockFacilityList(...args),
  getFacilityCourse: (...args: any[]) => mockFacilityGet(...args),
  getFacilityCourseLearnerState: (...args: any[]) => mockFacilityLearnerState(...args),
  unpublishFacilityCourse: (...args: any[]) => mockFacilityUnpublish(...args)
}));
jest.mock("@/features/learning/learningAccess", () => ({
  getLearningAccess: () => mockLearningAccess,
  countPaidCourses: (courses: any[]) =>
    courses.filter((course) => Number(course?.priceCents || course?.price || 0) > 0)
      .length
}));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
jest.mock("@/components/feed/PersonalFeedPlacement", () => () => null);
jest.mock("@/api/grows", () => ({ listPersonalGrows: jest.fn().mockResolvedValue([]) }));
jest.mock("@/api/tasks", () => ({ createPersonalTask: jest.fn() }));
jest.mock("@/api/apiRequest", () => ({
  API_URL: "https://api.growpath.test",
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/api/coursePayments", () => ({
  getCoursePaymentStatus: (...args: any[]) => mockGetCoursePaymentStatus(...args),
  openCourseDispute: (...args: any[]) => mockOpenCourseDispute(...args),
  requestCourseRefund: (...args: any[]) => mockRequestCourseRefund(...args),
  startCourseCheckout: (...args: any[]) => mockStartCourseCheckout(...args)
}));
jest.mock("@/api/reports", () => ({
  submitReport: (...args: any[]) => mockSubmitReport(...args),
  exportCourseSales: jest.fn()
}));
jest.mock("@/api/courses", () => ({
  archiveCourse: (...args: any[]) => mockArchiveCourse(...args),
  completeLesson: (...args: any[]) => mockCompleteLesson(...args),
  enrollInCourse: (...args: any[]) => mockEnrollInCourse(...args),
  getCourse: (...args: any[]) => mockGetCourse(...args),
  getCourseLearnerNotes: (...args: any[]) => mockGetCourseLearnerNotes(...args),
  getEnrollmentStatus: (...args: any[]) => mockGetEnrollmentStatus(...args),
  getReviews: (...args: any[]) => mockGetReviews(...args),
  publishCourse: (...args: any[]) => mockPublishCourse(...args),
  saveCourseLearnerNote: (...args: any[]) => mockSaveNote(...args),
  sendWatchTime: (...args: any[]) => mockSendWatchTime(...args),
  trackDropoff: (...args: any[]) => mockTrackDropoff(...args),
  trackCourseProductClick: () => Promise.resolve(),
  trackCourseView: () => Promise.resolve(),
  trackLessonView: (...args: any[]) => mockTrackLessonView(...args),
  unpublishCourse: (...args: any[]) => mockUnpublishCourse(...args),
  updateCourse: (...args: any[]) => mockUpdateCourse(...args)
}));

const freeCourse: any = {
  id: "course-1",
  title: "Living Soil Course",
  coverImageUrl: "https://example.com/living-soil-cover.jpg",
  price: 0,
  lessons: [{ id: "lesson-1", title: "Build the mix", content: "Mix it." }],
  documents: [{ title: "Worksheet", storageUrl: "https://example.com/work.pdf" }],
  mediaAssets: [],
  forumThreadId: "thread-1",
  linkedProductIds: ["product-1"],
  liveSessions: [
    {
      id: "live-1",
      title: "Living Soil Q&A",
      scheduledStart: "2026-07-30T19:00:00-04:00",
      timezone: "America/New_York",
      twitchChannel: "growpath",
      reminderPlan: { label: "1 hour before", channels: ["in_app"] },
      notificationPlan: [
        "new_live_scheduled",
        "24h_before",
        "1h_before",
        "15m_before",
        "live_now",
        "replay_available"
      ]
    }
  ]
};

describe("CourseDetailScreen learner player", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockLearningAccess, {
      canViewCourses: true,
      canSeePaidCourses: true,
      canCreateCourses: false,
      canSellPaidCourses: false,
      canPublishCourses: false,
      canViewCourseAnalytics: false,
      maxLessonsPerCourse: 12
    });
    mockEntitlements.mode = "personal";
    mockEntitlements.ready = true;
    mockEntitlements.bootstrapError = null;
    mockRetryMe.mockResolvedValue(undefined);
    mockEntitlements.facilityId = "facility-1";
    mockEntitlements.facilityRole = "MANAGER";
    mockFacility.selectedId = "facility-1";
    mockViewerId = "learner-1";
    Object.assign(mockAuthState, {
      isAuthed: true,
      isHydrating: false,
      meStatus: "ready",
      token: "learner-1-token"
    });
    mockApiRequest.mockResolvedValue({ sessionIds: [] });
    mockSaveNote.mockResolvedValue({ note: "Updated note" });
    mockPublishCourse.mockResolvedValue({ published: true });
    mockSubmitReport.mockResolvedValue({ accepted: true });
    mockUnpublishCourse.mockResolvedValue({ published: false });
    mockUpdateCourse.mockResolvedValue({});
    mockArchiveCourse.mockResolvedValue({ archived: true });
    mockGetCourse.mockResolvedValue(freeCourse);
    mockGetCourseLearnerNotes.mockResolvedValue({
      notes: [{ lessonId: "lesson-1", note: "Existing note" }]
    });
    mockEnrollInCourse.mockResolvedValue({ enrolled: true });
    mockGetReviews.mockResolvedValue([]);
    mockTrackLessonView.mockResolvedValue({});
    mockSendWatchTime.mockResolvedValue({});
    mockTrackDropoff.mockResolvedValue({});
    mockGetEnrollmentStatus.mockResolvedValue({
      enrolled: true,
      progress: { completedLessonIds: ["lesson-1"], completedLessons: 1, totalLessons: 1 }
    });
    mockGetCoursePaymentStatus.mockResolvedValue({
      paymentStatus: "not_started",
      refundStatus: "none",
      disputeStatus: "none"
    });
    mockOpenCourseDispute.mockResolvedValue({ accepted: true });
    mockRequestCourseRefund.mockResolvedValue({ accepted: true });
  });

  const publicCourseId = "6aa2f5c5d339157652995f10";
  const secondPublicCourseId = "6aa2f5c5d339157652995f11";

  function signOut() {
    mockViewerId = "";
    Object.assign(mockAuthState, { isAuthed: false, isHydrating: false, token: null });
  }

  function publishedCourse(overrides: Record<string, unknown> = {}) {
    return {
      ...freeCourse,
      id: publicCourseId,
      isPublished: true,
      summary: "Public course description",
      ...overrides
    };
  }

  function deferred<T = any>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  function expectNoPrivateReads() {
    expect(mockGetEnrollmentStatus).not.toHaveBeenCalled();
    expect(mockGetCoursePaymentStatus).not.toHaveBeenCalled();
    expect(mockGetCourseLearnerNotes).not.toHaveBeenCalled();
    expect(mockApiRequest.mock.calls.some(([path]) => /live-rsvps/.test(path))).toBe(
      false
    );
  }

  function expectNoLearnerMutations() {
    expect(mockEnrollInCourse).not.toHaveBeenCalled();
    expect(mockStartCourseCheckout).not.toHaveBeenCalled();
    expect(mockSaveNote).not.toHaveBeenCalled();
    expect(mockCompleteLesson).not.toHaveBeenCalled();
    expect(mockSubmitReport).not.toHaveBeenCalled();
    expect(mockOpenCourseDispute).not.toHaveBeenCalled();
    expect(mockRequestCourseRefund).not.toHaveBeenCalled();
  }

  it.each(["auth", "entitlements", "both"])(
    "waits for %s readiness without a false detail denial or learner request",
    async (pending) => {
      mockAuthState.isHydrating = pending !== "entitlements";
      mockEntitlements.ready = pending === "auth";
      mockLearningAccess.canViewCourses = false;
      const route = { params: { id: "course-1" } };
      const screen = render(<CourseDetailScreen route={route} />);
      expect(screen.getByText("Loading course...")).toBeTruthy();
      expect(screen.queryByText("Course unavailable")).toBeNull();
      expect(mockGetCourse).not.toHaveBeenCalled();
      expect(mockGetEnrollmentStatus).not.toHaveBeenCalled();
      expect(mockGetCoursePaymentStatus).not.toHaveBeenCalled();
      expect(mockGetCourseLearnerNotes).not.toHaveBeenCalled();
      mockAuthState.isHydrating = false;
      mockEntitlements.ready = true;
      mockLearningAccess.canViewCourses = true;
      await act(async () => screen.rerender(<CourseDetailScreen route={route} />));
      expect(await screen.findByText("Living Soil Course")).toBeTruthy();
      expect(mockGetCourse).toHaveBeenCalledTimes(1);
    }
  );

  it("retains a true settled denial and starts no detail requests", () => {
    mockLearningAccess.canViewCourses = false;
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);
    expect(
      screen.getByText("Course access is not available for this account.")
    ).toBeTruthy();
    expect(screen.queryByText("Loading course...")).toBeNull();
    expect(mockGetCourse).not.toHaveBeenCalled();
    expect(mockGetEnrollmentStatus).not.toHaveBeenCalled();
  });

  it("shows an initial access-check failure and retries only on explicit request", async () => {
    mockEntitlements.ready = false;
    mockEntitlements.bootstrapError = "Unavailable account service";
    const route = { params: { id: "course-1" } };
    const screen = render(<CourseDetailScreen route={route} />);
    expect(screen.getByText(/Unable to verify course access/)).toBeTruthy();
    expect(screen.queryByText("Loading course...")).toBeNull();
    expect(mockGetCourse).not.toHaveBeenCalled();
    expect(mockRetryMe).not.toHaveBeenCalled();
    await act(async () =>
      fireEvent.press(screen.getByRole("button", { name: "Retry course access" }))
    );
    expect(mockRetryMe).toHaveBeenCalledTimes(1);
    expect(mockGetCourse).not.toHaveBeenCalled();
    mockEntitlements.ready = true;
    mockEntitlements.bootstrapError = null;
    await act(async () => screen.rerender(<CourseDetailScreen route={route} />));
    expect(await screen.findByText("Living Soil Course")).toBeTruthy();
  });

  it.each(["loading", "error"])(
    "does not erase ready detail during background account %s",
    async (meStatus) => {
      const route = { params: { id: "course-1" } };
      const screen = render(<CourseDetailScreen route={route} />);
      await screen.findByText("Living Soil Course");
      const calls = mockGetCourse.mock.calls.length;
      mockAuthState.meStatus = meStatus;
      await act(async () => screen.rerender(<CourseDetailScreen route={route} />));
      expect(screen.getByText("Living Soil Course")).toBeTruthy();
      expect(screen.queryByText("Loading course...")).toBeNull();
      expect(mockGetCourse).toHaveBeenCalledTimes(calls);
    }
  );

  it("discards a late detail when entitlement readiness is lost", async () => {
    let resolveCourse!: (value: unknown) => void;
    mockGetCourse.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCourse = resolve;
        })
    );
    const route = { params: { id: "course-1" } };
    const screen = render(<CourseDetailScreen route={route} />);
    await waitFor(() => expect(mockGetCourse).toHaveBeenCalledTimes(1));
    mockEntitlements.ready = false;
    await act(async () => screen.rerender(<CourseDetailScreen route={route} />));
    await act(async () =>
      resolveCourse({ ...freeCourse, title: "Earlier private course" })
    );
    expect(screen.getByText("Loading course...")).toBeTruthy();
    expect(screen.queryByText("Earlier private course")).toBeNull();
    expect(mockGetCourse).toHaveBeenCalledTimes(1);
    mockEntitlements.ready = true;
    await act(async () => screen.rerender(<CourseDetailScreen route={route} />));
    expect(await screen.findByText("Living Soil Course")).toBeTruthy();
    expect(screen.queryByText("Earlier private course")).toBeNull();
  });

  it("keeps anonymous paid discovery public and returns sign-in to the saved course identity", async () => {
    signOut();
    const course = publishedCourse({
      priceCents: 2500,
      _viewerHasAccess: true,
      _viewerOwnsCourse: true,
      enrolled: true,
      creatorId: "former-viewer"
    });
    mockGetCourse.mockResolvedValue(course);
    mockGetReviews.mockResolvedValue([
      { id: "review-1", rating: 5, text: "Public review" }
    ]);
    const screen = render(
      <CourseDetailScreen route={{ params: { id: "requested-course-alias" } }} />
    );

    await screen.findByText("Public course description");
    expect(screen.getByText("$25.00 | published")).toBeTruthy();
    expect(screen.getByText("Public review")).toBeTruthy();
    expect(screen.getByText("Build the mix")).toBeTruthy();
    expect(screen.queryByText("Start Checkout")).toBeNull();
    expect(screen.queryByText("Enroll")).toBeNull();
    expect(screen.queryByText("Purchase Status")).toBeNull();
    expect(screen.queryByText("Your progress")).toBeNull();
    expect(screen.queryByText("Creator pricing")).toBeNull();
    expect(screen.queryByText("Ask AI About This Course")).toBeNull();
    expect(screen.queryByText("Report Course")).toBeNull();
    expect(screen.queryByText("Worksheet")).toBeNull();
    expect(screen.queryByText("Living Soil Q&A")).toBeNull();
    const locked = screen.getByLabelText(
      "Lesson Build the mix locked until payment is confirmed"
    );
    expect(locked).toBeDisabled();
    fireEvent.press(locked);
    expect(screen.queryByText("Mix it.")).toBeNull();
    expectNoPrivateReads();

    fireEvent.press(screen.getByLabelText("Sign in to continue with this course"));
    expect(mockPush).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent(`/courses?courseId=${publicCourseId}`)}`
    );
    expectNoLearnerMutations();
  });

  it("retains an intentionally public free preview without learner controls or private reads", async () => {
    signOut();
    mockGetCourse.mockResolvedValue(publishedCourse());
    const screen = render(
      <CourseDetailScreen route={{ params: { id: publicCourseId } }} />
    );
    await screen.findByText("Living Soil Course");
    expect(screen.getByText("Worksheet")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open lesson Build the mix"));
    expect(await screen.findByText("Mix it.")).toBeTruthy();
    expect(screen.queryByLabelText("Private lesson notes")).toBeNull();
    expect(screen.queryByText("Mark Complete")).toBeNull();
    expect(screen.queryByText("Ask AI About This Lesson")).toBeNull();
    expect(screen.queryByText("Save Note")).toBeNull();
    expect(screen.queryByText("Report Course")).toBeNull();
    expect(screen.queryByLabelText("RSVP to Living Soil Q&A")).toBeNull();
    expect(
      screen.queryByLabelText("Add Living Soil Q&A reminder to My Tasks")
    ).toBeNull();
    expect(screen.queryByText("Open Discussion")).toBeNull();
    expectNoPrivateReads();
    expectNoLearnerMutations();
  });

  it.each([
    undefined,
    "friendly-course",
    [publicCourseId],
    `${publicCourseId}&admin=true`
  ])("falls back to plain login for an invalid saved identity: %p", async (id) => {
    signOut();
    mockGetCourse.mockResolvedValue(publishedCourse({ id }));
    const screen = render(
      <CourseDetailScreen route={{ params: { id: publicCourseId } }} />
    );
    fireEvent.press(await screen.findByLabelText("Sign in to continue with this course"));
    expect(mockPush).toHaveBeenCalledWith("/login");
    expectNoPrivateReads();
    expectNoLearnerMutations();
  });

  it("waits for hydration and does not enroll or buy when authentication settles", async () => {
    mockAuthState.isHydrating = true;
    mockGetCourse.mockResolvedValue(publishedCourse({ priceCents: 2500 }));
    mockGetEnrollmentStatus.mockResolvedValue({ enrolled: false });
    const screen = render(
      <CourseDetailScreen route={{ params: { id: publicCourseId } }} />
    );
    expect(screen.getByText("Loading course...")).toBeTruthy();
    expect(screen.queryByLabelText("Sign in to continue with this course")).toBeNull();
    expect(mockGetCourse).not.toHaveBeenCalled();
    expectNoPrivateReads();

    mockAuthState.isHydrating = false;
    await act(async () => {
      screen.rerender(<CourseDetailScreen route={{ params: { id: publicCourseId } }} />);
    });
    expect(await screen.findByText("Start Checkout")).toBeTruthy();
    expect(mockGetEnrollmentStatus).toHaveBeenCalledWith(publicCourseId);
    expectNoLearnerMutations();
  });

  it.each([0, 2500])(
    "does not replay enrollment or checkout after sign-in for a %p-cent course",
    async (priceCents) => {
      signOut();
      mockGetCourse.mockResolvedValue(publishedCourse({ priceCents }));
      mockGetEnrollmentStatus.mockResolvedValue({ enrolled: false });
      const screen = render(
        <CourseDetailScreen route={{ params: { id: publicCourseId } }} />
      );
      fireEvent.press(
        await screen.findByLabelText("Sign in to continue with this course")
      );
      mockViewerId = "new-learner";
      Object.assign(mockAuthState, { isAuthed: true, token: "new-learner-token" });
      await act(async () => {
        screen.rerender(
          <CourseDetailScreen route={{ params: { id: publicCourseId } }} />
        );
      });
      expect(
        await screen.findByText(priceCents ? "Start Checkout" : "Enroll")
      ).toBeTruthy();
      expectNoLearnerMutations();
      expect(mockPush).toHaveBeenCalledTimes(1);
    }
  );

  it.each(["sign-out", "viewer", "token", "course"])(
    "discards an old authenticated load after a %s boundary change",
    async (boundary) => {
      const oldLoad = deferred();
      mockGetCourse.mockReturnValueOnce(oldLoad.promise);
      mockGetEnrollmentStatus
        .mockResolvedValueOnce({
          enrolled: true,
          progress: { completedLessonIds: ["lesson-1"] }
        })
        .mockResolvedValue({ enrolled: false });
      mockGetCourseLearnerNotes
        .mockResolvedValueOnce({
          notes: [{ lessonId: "lesson-1", note: "Old private note" }]
        })
        .mockResolvedValue({ notes: [] });
      const screen = render(
        <CourseDetailScreen route={{ params: { id: publicCourseId } }} />
      );
      await waitFor(() => expect(mockGetCourse).toHaveBeenCalledTimes(1));
      const nextId = boundary === "course" ? secondPublicCourseId : publicCourseId;
      if (boundary === "sign-out") signOut();
      if (boundary === "viewer") mockViewerId = "learner-2";
      if (boundary === "token") mockAuthState.token = "renewed-token";
      mockGetCourse.mockResolvedValue(
        publishedCourse({
          id: nextId,
          title: "Current public course",
          priceCents: 2500,
          lessons: [{ id: "current-lesson", title: "Current lesson" }]
        })
      );
      await act(async () => {
        screen.rerender(<CourseDetailScreen route={{ params: { id: nextId } }} />);
      });
      expect(await screen.findByText("Current public course")).toBeTruthy();
      await act(async () => {
        oldLoad.resolve(
          publishedCourse({
            title: "Old private course",
            _viewerHasAccess: true,
            _viewerOwnsCourse: true,
            priceCents: 2500
          })
        );
      });
      expect(screen.queryByText("Old private course")).toBeNull();
      expect(screen.queryByText("Creator pricing")).toBeNull();
      expect(screen.queryByDisplayValue("Old private note")).toBeNull();
      expect(screen.queryByText("1 of 1 lessons complete")).toBeNull();
      expect(
        screen.getByLabelText("Lesson Current lesson locked until payment is confirmed")
      ).toBeDisabled();
      expectNoLearnerMutations();
    }
  );

  it("clears an open private lesson on sign-out and ignores stale handlers and payment refresh", async () => {
    mockGetCourse.mockResolvedValue(publishedCourse({ priceCents: 2500 }));
    const screen = render(
      <CourseDetailScreen route={{ params: { id: publicCourseId } }} />
    );
    await screen.findByText("Living Soil Course");
    fireEvent.press(screen.getByLabelText("Open lesson Build the mix"));
    await screen.findByDisplayValue("Existing note");
    let noteButton: any = screen.getByText("Save Note");
    while (noteButton && typeof noteButton.props.onPress !== "function") {
      noteButton = noteButton.parent;
    }
    const noteHandler = noteButton?.props.onPress;
    expect(noteHandler).toEqual(expect.any(Function));
    const oldPayment = deferred();
    const oldStatus = deferred();
    mockGetCoursePaymentStatus.mockReturnValueOnce(oldPayment.promise);
    mockGetEnrollmentStatus.mockReturnValueOnce(oldStatus.promise);
    fireEvent.press(screen.getByText("Refresh Status"));
    signOut();
    await act(async () => {
      screen.rerender(<CourseDetailScreen route={{ params: { id: publicCourseId } }} />);
    });
    await screen.findByLabelText("Sign in to continue with this course");
    await act(async () => {
      await noteHandler();
      oldPayment.resolve({ paymentStatus: "paid" });
      oldStatus.resolve({
        enrolled: true,
        progress: { completedLessonIds: ["lesson-1"] }
      });
    });
    expect(screen.queryByDisplayValue("Existing note")).toBeNull();
    expect(screen.queryByText("Mix it.")).toBeNull();
    expect(screen.queryByText("Purchase Status")).toBeNull();
    expect(screen.queryByText("Your progress")).toBeNull();
    expect(
      screen.getByLabelText("Lesson Build the mix locked until payment is confirmed")
    ).toBeDisabled();
    expectNoLearnerMutations();
  });

  it("never trusts privileged embedded catalog hints when the fresh detail cannot load", async () => {
    mockGetCourse.mockRejectedValue(new Error("Fresh course denied"));
    const screen = render(
      <CourseDetailScreen
        route={{
          params: {
            id: publicCourseId,
            course: publishedCourse({ _viewerOwnsCourse: true, _viewerHasAccess: true })
          }
        }}
      />
    );
    expect(await screen.findByText("Course unavailable")).toBeTruthy();
    expect(screen.queryByText("Living Soil Course")).toBeNull();
    expect(screen.queryByText("Creator pricing")).toBeNull();
    expect(screen.queryByText("Mix it.")).toBeNull();
  });

  it("rejects an ID-less privileged initial course instead of displaying unverified content", async () => {
    const screen = render(
      <CourseDetailScreen
        route={{
          params: {
            course: {
              title: "Unverified private draft",
              isPublished: false,
              priceCents: 2500,
              _viewerOwnsCourse: true,
              _viewerHasAccess: true,
              lessons: [
                {
                  id: "private-lesson",
                  title: "Private lesson",
                  content: "Protected text"
                }
              ]
            }
          }
        }}
      />
    );
    expect(await screen.findByText("Course unavailable")).toBeTruthy();
    expect(screen.queryByText("Unverified private draft")).toBeNull();
    expect(screen.queryByText("Private lesson")).toBeNull();
    expect(screen.queryByText("Protected text")).toBeNull();
    expect(screen.queryByText("Creator pricing")).toBeNull();
    expect(screen.queryByLabelText("Sign in to continue with this course")).toBeNull();
    expect(mockGetCourse).not.toHaveBeenCalled();
    expect(mockGetReviews).not.toHaveBeenCalled();
    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expectNoPrivateReads();
    expectNoLearnerMutations();
  });

  it.each([0, 2500])(
    "enforces the real catalog-to-embedded-detail anonymous boundary for a %p-cent course",
    async (priceCents) => {
      signOut();
      const course = publishedCourse({ priceCents });
      mockApiRequest.mockImplementation((path: string) =>
        Promise.resolve(path === "/api/courses" ? [course] : [])
      );
      mockGetCourse.mockResolvedValue(course);
      const screen = render(<CoursesScreen />);
      expect(await screen.findByText("Published course catalog")).toBeTruthy();
      fireEvent.press(await screen.findByText("Open details"));
      expect(
        await screen.findByLabelText("Sign in to continue with this course")
      ).toBeTruthy();
      expect(screen.getByText("Back to courses")).toBeTruthy();
      expect(screen.queryByText("Start Checkout")).toBeNull();
      expect(screen.queryByText("Enroll")).toBeNull();
      expect(screen.queryByText("Purchase Status")).toBeNull();
      expect(screen.queryByText("Report Course")).toBeNull();
      expect(screen.queryByText("Your progress")).toBeNull();
      expect(mockGetCourse).toHaveBeenCalledWith(publicCourseId);
      expect(mockApiRequest.mock.calls.some(([path]) => /\/mine/.test(path))).toBe(false);
      expectNoPrivateReads();
      expectNoLearnerMutations();
      fireEvent.press(screen.getByLabelText("Sign in to continue with this course"));
      expect(mockPush).toHaveBeenCalledWith(
        `/login?next=${encodeURIComponent(`/courses?courseId=${publicCourseId}`)}`
      );
    }
  );

  it("renders a loaded course with Night palette surfaces and keeps Day styles palette-driven", async () => {
    const nightPalette = getThemePalette("night", "dark");
    const dayPalette = getThemePalette("day", "light");
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    const title = await screen.findByText("Living Soil Course");
    expect(
      screen.getByLabelText("Living Soil Course full course image").props.source
    ).toEqual({
      uri: "https://example.com/living-soil-cover.jpg"
    });
    const reportTitle = screen.getByText("Report Course");
    const reportInput = screen.getByLabelText("Course report reason");

    expect(StyleSheet.flatten(title.props.style).color).toBe(nightPalette.text);
    expect(
      StyleSheet.flatten(reportTitle.parent?.parent?.props.style).backgroundColor
    ).toBe(nightPalette.surface);
    expect(StyleSheet.flatten(reportInput.props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(reportInput.props.placeholderTextColor).toBe(nightPalette.textMuted);

    const dayStyles = createStyles(dayPalette);
    expect(dayStyles.container.backgroundColor).toBe(dayPalette.page);
    expect(dayStyles.card.backgroundColor).toBe(dayPalette.surface);
    expect(dayStyles.title.color).toBe(dayPalette.text);
    expect(dayStyles.input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
  });

  it("prefers a detail banner and leaves an image-free course intentionally text-only", () => {
    expect(
      courseDetailImageSource({
        bannerUrl: "https://example.com/detail-banner.jpg",
        coverImageUrl: "https://example.com/catalog-cover.jpg"
      })
    ).toEqual({ uri: "https://example.com/detail-banner.jpg" });
    expect(courseDetailImageSource({})).toBeNull();
  });

  it("shows progress, resources, discussion, products, AI, and persistent notes", async () => {
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    await waitFor(() => expect(screen.getByText("Living Soil Course")).toBeTruthy(), {
      timeout: 15000
    });
    expect(screen.getByText("1 of 1 lessons complete")).toBeTruthy();
    expect(screen.getByText("Worksheet")).toBeTruthy();
    expect(screen.getByText("Open Discussion")).toBeTruthy();
    expect(screen.getByText("View Product product-1")).toBeTruthy();
    expect(screen.getByText("Ask AI About This Course")).toBeTruthy();
    expect(screen.getByText("Living Soil Q&A")).toBeTruthy();
    expect(screen.getByText(/6 notification checkpoints/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open GrowPath Schedule for course lives"));
    expect(mockPush).toHaveBeenCalledWith("/home/schedule");
    fireEvent.press(screen.getByLabelText("Open Notification Center for course lives"));
    expect(mockPush).toHaveBeenCalledWith("/home/notifications");

    fireEvent.press(screen.getByText("Open Lesson"));
    await waitFor(() => expect(screen.getByDisplayValue("Existing note")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Private lesson notes"), "Updated note");
    fireEvent.press(screen.getByText("Save Note"));

    await waitFor(() =>
      expect(mockSaveNote).toHaveBeenCalledWith("course-1", "lesson-1", "Updated note")
    );
    fireEvent.press(screen.getByText("Ask AI About This Lesson"));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("courseId=course-1"));
  });

  it("lists lesson documents and opens every unique canonical document", async () => {
    const firstDocument = "https://example.com/lesson-one.pdf";
    const secondDocument = "https://example.com/lesson-two.pdf";
    mockGetCourse.mockResolvedValue({
      ...freeCourse,
      lessons: [
        {
          id: "lesson-1",
          title: "Build the mix",
          content: "Mix it.",
          pdfUrl: firstDocument,
          documentUrls: [firstDocument, ` ${firstDocument} `, secondDocument]
        }
      ]
    });
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    await screen.findByText("Living Soil Course");
    expect(screen.getByText("Text  Documents")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open lesson Build the mix"));

    fireEvent.press(await screen.findByLabelText("Open lesson document 1 of 2"));
    fireEvent.press(screen.getByLabelText("Open lesson document 2 of 2"));

    await waitFor(() => expect(openUrl).toHaveBeenCalledTimes(2));
    expect(openUrl).toHaveBeenNthCalledWith(1, firstDocument);
    expect(openUrl).toHaveBeenNthCalledWith(2, secondDocument);
    expect(screen.queryByText("Open PDF lesson")).toBeNull();
  });

  it("exchanges a protected Facility lesson document before opening a new tab", async () => {
    const protectedDocument = "/api/course-media/64f000000000000000000991/file";
    const signedDocument =
      "/api/course-media/64f000000000000000000991/file?access=signed";
    mockGetCourse.mockResolvedValue({
      ...freeCourse,
      lessons: [
        {
          id: "lesson-1",
          title: "Protected lesson",
          content: "Use the protected worksheet.",
          pdfUrl: protectedDocument
        }
      ]
    });
    mockApiRequest.mockImplementation((path: string) =>
      path === "/api/course-media/64f000000000000000000991/access"
        ? Promise.resolve({ url: signedDocument })
        : Promise.resolve({ sessionIds: [] })
    );
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    await screen.findByText("Living Soil Course");
    fireEvent.press(screen.getByLabelText("Open lesson Protected lesson"));
    fireEvent.press(await screen.findByText("Open PDF lesson"));

    await waitFor(() =>
      expect(openUrl).toHaveBeenCalledWith(`https://api.growpath.test${signedDocument}`)
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/course-media/64f000000000000000000991/access",
      { invalidateOn401: false }
    );
  });

  it("renders protected Facility lesson images through an authorized URL", async () => {
    const protectedImage = "/api/uploads/course-media/64f000000000000000000992/file";
    const signedImage = `${protectedImage}?access=signed`;
    mockGetCourse.mockResolvedValue({
      ...freeCourse,
      sourceType: "facility_course",
      authoringSource: "facility_workspace",
      facilityId: "facility-1",
      lessons: [
        {
          id: "lesson-1",
          title: "Protected image lesson",
          content: "Review the image.",
          imageUrls: [protectedImage]
        }
      ]
    });
    mockApiRequest.mockImplementation((path: string) =>
      path === "/api/uploads/course-media/64f000000000000000000992/access"
        ? Promise.resolve({ url: signedImage })
        : Promise.resolve({ sessionIds: [] })
    );
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    await screen.findByText("Living Soil Course");
    fireEvent.press(screen.getByLabelText("Open lesson Protected image lesson"));

    const image = await screen.findByLabelText("Protected image lesson image 1");
    expect(image.props.source).toEqual({
      uri: `https://api.growpath.test${signedImage}`
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/uploads/course-media/64f000000000000000000992/access",
      { invalidateOn401: false }
    );
  });

  it("keeps the legacy single-PDF lesson link", async () => {
    const legacyPdf = "https://example.com/legacy-lesson.pdf";
    mockGetCourse.mockResolvedValue({
      ...freeCourse,
      lessons: [
        {
          id: "lesson-1",
          title: "Build the mix",
          content: "Mix it.",
          pdfUrl: legacyPdf
        }
      ]
    });
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    await screen.findByText("Living Soil Course");
    expect(screen.getByText("Text  Documents")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open lesson Build the mix"));
    fireEvent.press(await screen.findByText("Open PDF lesson"));

    await waitFor(() => expect(openUrl).toHaveBeenCalledTimes(1));
    expect(openUrl).toHaveBeenCalledWith(legacyPdf);
  });

  it("opens the Expo lesson editor when legacy navigation is unavailable", async () => {
    Object.assign(mockLearningAccess, { canCreateCourses: true });
    mockGetCourse.mockResolvedValue({ ...freeCourse, creatorId: mockViewerId });
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    await waitFor(() => expect(screen.getByText("Living Soil Course")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit lesson Build the mix"));

    expect(mockPush).toHaveBeenCalledWith(
      "/courses/edit-lesson?lessonId=lesson-1&courseId=course-1&from=%2Fcourses%3FcourseId%3Dcourse-1"
    );
  });

  it.each([false, true])(
    "keeps native lesson authoring hidden from a capable buyer when enrolled=%p",
    async (enrolled) => {
      Object.assign(mockLearningAccess, { canCreateCourses: true });
      mockGetCourse.mockResolvedValue({
        ...freeCourse,
        creatorId: "another-author",
        _viewerOwnsCourse: false,
        isPublished: true,
        priceCents: 2500,
        lessons: [{ id: "lesson-1", title: "Build the mix" }]
      });
      mockGetEnrollmentStatus.mockResolvedValue({ enrolled });
      mockGetCoursePaymentStatus.mockResolvedValue({
        paymentStatus: enrolled ? "paid" : "not_started"
      });

      const screen = render(
        <CourseDetailScreen route={{ params: { id: "course-1" } }} />
      );

      await screen.findByText("Living Soil Course");
      expect(screen.queryByRole("button", { name: "Add course lesson" })).toBeNull();
      expect(screen.queryByLabelText("Edit lesson Build the mix")).toBeNull();
      expect(
        screen.getByLabelText(
          enrolled
            ? "Open lesson Build the mix"
            : "Lesson Build the mix locked until payment is confirmed"
        )
      ).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockStartCourseCheckout).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["matching creator", { creatorId: "learner-1" }, true],
    [
      "server-authorized owner/admin",
      { creatorId: "another-author", _viewerOwnsCourse: true },
      true
    ],
    ["owner without creation capability", { creatorId: "learner-1" }, false]
  ] as const)(
    "preserves native lesson authoring for %s",
    async (_label, ownerFields, canCreateCourses) => {
      Object.assign(mockLearningAccess, { canCreateCourses });
      mockGetCourse.mockResolvedValue({ ...freeCourse, ...ownerFields });

      const screen = render(
        <CourseDetailScreen route={{ params: { id: "course-1" } }} />
      );

      await screen.findByText("Living Soil Course");
      const add = screen.queryByRole("button", { name: "Add course lesson" });
      const edit = screen.queryByLabelText("Edit lesson Build the mix");
      if (canCreateCourses) {
        expect(add).toBeTruthy();
        expect(edit).toBeTruthy();
        fireEvent.press(add!);
        expect(mockPush).toHaveBeenCalledWith(
          "/courses/add-lesson?courseId=course-1&from=%2Fhome%2Fpersonal%2Fcourses"
        );
      } else {
        expect(add).toBeNull();
        expect(edit).toBeNull();
        expect(mockPush).not.toHaveBeenCalled();
      }
    }
  );

  it("exposes an operable course report path with exact content context", async () => {
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);
    await waitFor(() => expect(screen.getByText("Living Soil Course")).toBeTruthy());
    fireEvent.changeText(
      screen.getByLabelText("Course report reason"),
      "Production report-path verification."
    );
    fireEvent.press(screen.getByRole("button", { name: "Submit course report" }));
    await waitFor(() =>
      expect(mockSubmitReport).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: "course",
          contentId: "course-1",
          targetUrl: "/courses?courseId=course-1",
          reason: "Production report-path verification."
        })
      )
    );
    expect(await screen.findByText("Report submitted.")).toBeTruthy();
  });

  it("keeps unpaid lessons locked and hides refund or payment-issue forms", async () => {
    mockGetCourse.mockResolvedValue({
      id: "course-paid",
      title: "Protected Course",
      priceCents: 100,
      creator: { id: "creator-1" },
      _viewerHasAccess: false,
      lessons: [{ id: "lesson-paid", title: "Protected lesson" }]
    });
    mockGetEnrollmentStatus.mockResolvedValue({ enrolled: false });
    mockGetCoursePaymentStatus.mockResolvedValue({
      paymentStatus: "not_started",
      checkoutStatus: "not_started",
      refundStatus: "none",
      disputeStatus: "none"
    });

    const screen = render(
      <CourseDetailScreen route={{ params: { id: "course-paid" } }} />
    );

    await waitFor(() => expect(screen.getByText("Protected Course")).toBeTruthy());
    expect(screen.getByText("Start Checkout")).toBeTruthy();
    expect(screen.getByText("Locked — Payment Required")).toBeTruthy();
    expect(
      screen.getByText("No completed payment is recorded for this course.")
    ).toBeTruthy();
    expect(screen.queryByText("Refunds and payment support")).toBeNull();
    expect(screen.queryByText("Open Dispute")).toBeNull();
  });

  it("shows buyer support controls only after payment and labels issues truthfully", async () => {
    mockGetCourse.mockResolvedValue({
      id: "course-paid",
      title: "Purchased Course",
      priceCents: 100,
      creator: { id: "creator-1" },
      _viewerHasAccess: true,
      lessons: [
        {
          id: "lesson-paid",
          title: "Purchased lesson",
          content: "Paid lesson content"
        }
      ]
    });
    mockGetEnrollmentStatus.mockResolvedValue({ enrolled: true });
    mockGetCoursePaymentStatus.mockResolvedValue({
      enrolled: true,
      recordId: "507f191e810c19729de86001",
      refundedAmountCents: 0,
      paymentStatus: "paid",
      checkoutStatus: "recorded",
      refundStatus: "none",
      refundRequestStatus: "none",
      disputeStatus: "none",
      disputeReportStatus: "none"
    });

    const screen = render(
      <CourseDetailScreen route={{ params: { id: "course-paid" } }} />
    );

    await waitFor(() => expect(screen.getByText("Purchased Course")).toBeTruthy());
    expect(screen.getByText("Refunds and payment support")).toBeTruthy();
    expect(screen.getByText(/does not open a bank or card dispute/)).toBeTruthy();
    expect(screen.queryByText("Open Dispute")).toBeNull();
    expect(screen.getByText("Report Payment Issue")).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Course payment issue"),
      "I do not recognize this payment."
    );
    fireEvent.press(screen.getByText("Report Payment Issue"));

    await waitFor(() =>
      expect(mockOpenCourseDispute).toHaveBeenCalledWith("course-paid", {
        recordId: "507f191e810c19729de86001",
        expectedRefundedAmountCents: 0,
        reason: "I do not recognize this payment."
      })
    );
    expect(
      await screen.findByText(
        "Payment issue sent to GrowPath support. This does not open a bank or card dispute."
      )
    ).toBeTruthy();
  });

  it.each([
    ["resolved", "Payment Issue Resolved"],
    ["declined", "Payment Issue Report Declined"]
  ])(
    "shows final buyer support state %s without reopening intake",
    async (state, label) => {
      mockGetCourse.mockResolvedValue({
        id: "course-paid",
        title: "Reviewed Course Purchase",
        priceCents: 100,
        creator: { id: "creator-1" },
        _viewerHasAccess: true,
        lessons: [{ id: "lesson-paid", title: "Purchased lesson" }]
      });
      mockGetEnrollmentStatus.mockResolvedValue({ enrolled: true });
      mockGetCoursePaymentStatus.mockResolvedValue({
        enrolled: true,
        recordId: "507f191e810c19729de86001",
        refundedAmountCents: 0,
        paymentStatus: "paid",
        refundStatus: "none",
        refundRequestStatus: "none",
        disputeStatus: "none",
        disputeReportStatus: state
      });
      const screen = render(
        <CourseDetailScreen route={{ params: { id: "course-paid" } }} />
      );

      await screen.findByText("Reviewed Course Purchase");
      expect(screen.getByText(label)).toBeTruthy();
      const report = screen.getByLabelText("Submit course payment issue report");
      expect(report).toBeDisabled();
      fireEvent.press(report);
      expect(mockOpenCourseDispute).not.toHaveBeenCalled();
    }
  );

  it("lets an owner update the fee, publish, and return the course to a private draft", async () => {
    Object.assign(mockLearningAccess, {
      canCreateCourses: true,
      canSellPaidCourses: true,
      canPublishCourses: true
    });
    let ownerCourse: any = {
      id: "course-owner",
      title: "Owner Course",
      creator: "learner-1",
      _viewerOwnsCourse: true,
      priceCents: 100,
      isPublished: false,
      lessons: [{ id: "owner-lesson", title: "Owner lesson", content: "Ready" }]
    };
    mockGetCourse.mockImplementation(() => Promise.resolve({ ...ownerCourse }));
    mockUpdateCourse.mockImplementation((_id, payload) =>
      Promise.resolve({ ...ownerCourse, ...payload })
    );
    mockPublishCourse.mockImplementation(() => {
      ownerCourse = { ...ownerCourse, isPublished: true, visibility: "public" };
      return Promise.resolve({ published: true, course: ownerCourse });
    });
    mockUnpublishCourse.mockImplementation(() => {
      ownerCourse = { ...ownerCourse, isPublished: false, visibility: "private" };
      return Promise.resolve({ published: false, course: ownerCourse });
    });

    const screen = render(
      <CourseDetailScreen route={{ params: { id: "course-owner" } }} />
    );

    await waitFor(() => expect(screen.getByText("Owner Course")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Edit course price USD"), "2.00");
    fireEvent.press(screen.getByLabelText("Save course fee"));
    await waitFor(() =>
      expect(mockUpdateCourse).toHaveBeenCalledWith("course-owner", {
        priceCents: 200,
        price: 2,
        currency: "usd",
        access: "paid"
      })
    );

    fireEvent.press(await screen.findByText("Publish Course"));
    await waitFor(() => expect(mockPublishCourse).toHaveBeenCalledWith("course-owner"));
    expect(await screen.findByText("Unpublish Course")).toBeTruthy();

    fireEvent.press(screen.getByText("Unpublish Course"));
    await waitFor(() => expect(mockUnpublishCourse).toHaveBeenCalledWith("course-owner"));
    expect(await screen.findByText("Publish Course")).toBeTruthy();
    expect(screen.queryByText("Submit for Review")).toBeNull();
    expect(screen.queryByText("Approve Course")).toBeNull();
  });

  it("routes Commercial-projected course authoring back to the Commercial workspace", async () => {
    Object.assign(mockLearningAccess, {
      canCreateCourses: true,
      canSellPaidCourses: true,
      canPublishCourses: true
    });
    mockGetCourse.mockResolvedValue({
      id: "commercial-course",
      title: "Commercial Projection",
      creator: "learner-1",
      _viewerOwnsCourse: true,
      authoringSource: "commercial_record",
      priceCents: 2500,
      isPublished: true,
      lessons: [{ id: "commercial-lesson", title: "Projected lesson", content: "Ready" }]
    });

    const screen = render(
      <CourseDetailScreen route={{ params: { id: "commercial-course" } }} />
    );

    await screen.findByText("Commercial Projection");
    expect(screen.getByText("Commercial course management")).toBeTruthy();
    expect(screen.queryByText("Creator pricing")).toBeNull();
    expect(screen.queryByText("Add Lesson")).toBeNull();
    expect(screen.queryByLabelText("Edit lesson Projected lesson")).toBeNull();
    expect(screen.queryByText("Unpublish Course")).toBeNull();
    expect(screen.queryByText("Archive draft course")).toBeNull();

    fireEvent.press(
      screen.getByRole("button", { name: "Manage course in Commercial workspace" })
    );
    expect(mockPush).toHaveBeenCalledWith("/home/commercial/courses/commercial-course");
    expect(mockUpdateCourse).not.toHaveBeenCalled();
    expect(mockUnpublishCourse).not.toHaveBeenCalled();
  });

  it("uses Facility permissions and the Facility lesson cap even when personal course access is Free-locked", async () => {
    Object.assign(mockLearningAccess, {
      canViewCourses: false,
      canCreateCourses: false,
      canSellPaidCourses: false,
      canPublishCourses: false,
      maxLessonsPerCourse: 1
    });
    const lessons = Array.from({ length: 100 }, (_value, index) => ({
      id: `facility-lesson-${index + 1}`,
      title: `Facility lesson ${index + 1}`,
      content: "Ready"
    }));
    const facilityCourse = {
      id: "facility-course",
      facilityId: "facility-1",
      authoringSource: "facility_workspace",
      title: "Facility Training",
      visibility: "facilityOnly",
      isPublished: false,
      lessons,
      permissions: {
        canEditCourse: true,
        canEditLessons: true,
        canSetPrice: true,
        canPublish: true,
        canUnpublish: false,
        canArchive: true
      }
    };
    const facilityApi = {
      get: jest.fn().mockResolvedValue(facilityCourse),
      update: jest.fn().mockResolvedValue(facilityCourse),
      publish: jest.fn().mockResolvedValue(facilityCourse),
      unpublish: jest.fn(),
      archive: jest.fn()
    };

    const screen = render(
      <CourseDetailScreen
        route={{ params: { id: "facility-course", course: facilityCourse } }}
        facilityWorkspace={{
          facilityId: "facility-1",
          role: "OWNER",
          limits: { maxLessonsPerCourse: 100 },
          api: facilityApi
        }}
      />
    );

    expect(await screen.findByText("Facility Training")).toBeTruthy();
    expect(screen.queryByText("Course unavailable")).toBeNull();
    expect(screen.getByText("Facility workspace course")).toBeTruthy();
    expect(screen.getByText("100/100")).toBeTruthy();
    const addLesson = screen.getByRole("button", { name: "Add course lesson" });
    expect(addLesson).toBeDisabled();
    fireEvent.press(addLesson);
    expect(mockPush).not.toHaveBeenCalledWith(
      expect.stringContaining("action=add-lesson")
    );

    fireEvent.press(
      screen.getByRole("radio", { name: "Set course audience to Public Catalog" })
    );
    fireEvent.changeText(screen.getByLabelText("Edit course price USD"), "12.00");
    fireEvent.press(screen.getByLabelText("Save course fee"));
    await waitFor(() =>
      expect(facilityApi.update).toHaveBeenCalledWith("facility-course", {
        priceCents: 1200,
        price: 12,
        currency: "usd",
        access: "paid",
        visibility: "public"
      })
    );
    expect(await screen.findByText("Course fee saved: $12.00.")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("radio", { name: "Set course audience to Unlisted Link" })
    );
    fireEvent.press(
      screen.getByRole("button", { name: "Save Facility course audience" })
    );
    await waitFor(() =>
      expect(facilityApi.update).toHaveBeenCalledWith("facility-course", {
        visibility: "unlisted"
      })
    );
    expect(
      await screen.findByText("Facility course audience saved: Unlisted Link.")
    ).toBeTruthy();
    fireEvent.press(
      screen.getByRole("radio", { name: "Set course audience to Public Catalog" })
    );
    fireEvent.press(screen.getByText("Publish Course"));
    await waitFor(() =>
      expect(facilityApi.publish).toHaveBeenCalledWith("facility-course", {
        visibility: "public"
      })
    );
    await waitFor(() => expect(facilityApi.get).toHaveBeenCalledTimes(2));
    expect(mockPublishCourse).not.toHaveBeenCalled();
  });

  it("uses only scoped Facility learner progress, requester notes, and canonical Live RSVP IDs", async () => {
    const facilityCourse = {
      id: "facility-published",
      facilityId: "facility-1",
      authoringSource: "facility_workspace",
      title: "Published Facility Training",
      visibility: "facilityOnly",
      isPublished: true,
      priceCents: 2500,
      lessons: [{ id: "facility-lesson", title: "Safety lesson", content: "Ready" }],
      liveSessions: [
        {
          _id: "wrong-live-alias",
          sourceSessionId: "canonical-live-source",
          title: "Facility Q&A",
          scheduledStart: "2026-09-10T16:00:00.000Z"
        }
      ],
      permissions: {
        canEditCourse: false,
        canEditLessons: false,
        canSetPrice: false,
        canPublish: false,
        canUnpublish: false,
        canArchive: false
      }
    };
    const learnerState = {
      courseId: "facility-published",
      included: true,
      accessSource: "facility_workspace",
      label: "Included with Facility workspace",
      completedLessonIds: [],
      notes: [{ lessonId: "facility-lesson", note: "My Facility note" }],
      activeRsvpSourceSessionIds: []
    };
    const facilityApi = {
      get: jest.fn().mockResolvedValue(facilityCourse),
      getLearnerState: jest.fn().mockResolvedValue(learnerState),
      completeLesson: jest.fn().mockResolvedValue({
        ...learnerState,
        completedLessonIds: ["facility-lesson"]
      }),
      saveLearnerNote: jest.fn().mockResolvedValue(learnerState),
      rsvpLive: jest.fn().mockResolvedValue({
        ...learnerState,
        activeRsvpSourceSessionIds: ["canonical-live-source"]
      }),
      cancelLiveRsvp: jest.fn()
    };

    const screen = render(
      <CourseDetailScreen
        route={{ params: { id: "facility-published", course: facilityCourse } }}
        facilityWorkspace={{
          facilityId: "facility-1",
          role: "VIEWER",
          limits: { maxLessonsPerCourse: 100 },
          api: facilityApi
        }}
      />
    );

    expect(await screen.findByText("Included with Facility workspace")).toBeTruthy();
    expect(mockGetEnrollmentStatus).not.toHaveBeenCalled();
    expect(mockGetCoursePaymentStatus).not.toHaveBeenCalled();
    expect(screen.queryByText("Start Checkout")).toBeNull();
    expect(screen.queryByText("Enroll")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "RSVP to Facility Q&A" }));
    await waitFor(() =>
      expect(facilityApi.rsvpLive).toHaveBeenCalledWith(
        "facility-published",
        "canonical-live-source"
      )
    );

    fireEvent.press(screen.getByRole("button", { name: "Open lesson Safety lesson" }));
    expect(await screen.findByDisplayValue("My Facility note")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Private lesson notes"), "Updated note");
    fireEvent.press(screen.getByText("Save Note"));
    await waitFor(() =>
      expect(facilityApi.saveLearnerNote).toHaveBeenCalledWith(
        "facility-published",
        "facility-lesson",
        "Updated note"
      )
    );
    expect(await screen.findByText("Private lesson note saved.")).toBeTruthy();
    fireEvent.press(screen.getByText("Mark Complete"));
    await waitFor(() =>
      expect(facilityApi.completeLesson).toHaveBeenCalledWith(
        "facility-published",
        "facility-lesson"
      )
    );
    expect(mockCompleteLesson).not.toHaveBeenCalled();
    expect(mockSaveNote).not.toHaveBeenCalled();
  });

  function setupFacilityRoute(facilityId = "facility-1") {
    mockEntitlements.mode = "facility";
    const course = {
      id: `training-${facilityId}`,
      facilityId,
      authoringSource: "facility_workspace",
      title: `Training for ${facilityId}`,
      visibility: "facilityOnly",
      isPublished: true,
      lessons: [{ id: "safety-lesson", title: "Safety lesson", content: "Ready" }],
      permissions: { canUnpublish: true }
    };
    mockFacilityList.mockResolvedValue({ courses: [course], permissions: {} });
    mockFacilityGet.mockResolvedValue(course);
    mockFacilityLearnerState.mockResolvedValue({
      courseId: course.id,
      included: true,
      accessSource: "facility_workspace",
      label: "Included with Facility workspace",
      completedLessonIds: [],
      notes: [{ lessonId: "safety-lesson", note: "Current requester note" }],
      activeRsvpSourceSessionIds: []
    });
    return course;
  }

  async function openFacilityRouteLesson(
    screen: ReturnType<typeof render>,
    title: string
  ) {
    fireEvent.press(await screen.findByText(title));
    fireEvent.press(
      await screen.findByRole("button", { name: "Open lesson Safety lesson" })
    );
    expect(await screen.findByDisplayValue("Current requester note")).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText("Private lesson notes"),
      "Unsaved lesson note"
    );
  }

  it("keeps the open Facility lesson and unsaved note through unrelated context rerenders", async () => {
    const course = setupFacilityRoute();
    const screen = render(<FacilityCoursesRoute />);
    await openFacilityRouteLesson(screen, course.title);
    const listCalls = mockFacilityList.mock.calls.length;
    const detailCalls = mockFacilityGet.mock.calls.length;

    await act(async () => {
      screen.rerender(<FacilityCoursesRoute />);
    });

    expect(screen.getByText("Close Lesson")).toBeTruthy();
    expect(screen.getByDisplayValue("Unsaved lesson note")).toBeTruthy();
    expect(mockFacilityList).toHaveBeenCalledTimes(listCalls);
    expect(mockFacilityGet).toHaveBeenCalledTimes(detailCalls);
  });

  it.each(["account", "role", "facility"])(
    "clears Facility lesson state when the actual %s changes",
    async (change) => {
      const course = setupFacilityRoute();
      const screen = render(<FacilityCoursesRoute />);
      await openFacilityRouteLesson(screen, course.title);

      if (change === "account") mockViewerId = "learner-2";
      if (change === "role") mockEntitlements.facilityRole = "VIEWER";
      if (change === "facility") {
        mockFacility.selectedId = "facility-2";
        mockEntitlements.facilityId = "facility-2";
        setupFacilityRoute("facility-2");
      }
      mockFacilityLearnerState.mockResolvedValue({
        included: true,
        accessSource: "facility_workspace",
        label: "Included with Facility workspace",
        completedLessonIds: [],
        notes: [{ lessonId: "safety-lesson", note: "Rechecked requester note" }],
        activeRsvpSourceSessionIds: []
      });
      await act(async () => {
        screen.rerender(<FacilityCoursesRoute />);
      });

      expect(screen.queryByText("Close Lesson")).toBeNull();
      expect(screen.queryByDisplayValue("Unsaved lesson note")).toBeNull();
      if (change === "facility") {
        expect(screen.queryByText(course.title)).toBeNull();
        fireEvent.press(await screen.findByText("Training for facility-2"));
      } else {
        // A changed viewer or Facility role must deliberately reopen a fresh selection.
        fireEvent.press(await screen.findByText(course.title));
      }
      fireEvent.press(
        await screen.findByRole("button", { name: "Open lesson Safety lesson" })
      );
      expect(await screen.findByDisplayValue("Rechecked requester note")).toBeTruthy();
    }
  );

  it("refreshes the Facility detail and closes its lesson after explicit unpublish", async () => {
    const course = setupFacilityRoute();
    mockFacilityUnpublish.mockImplementation(async () => {
      const draft = { ...course, isPublished: false, permissions: { canPublish: true } };
      mockFacilityGet.mockResolvedValue(draft);
      return draft;
    });
    const screen = render(<FacilityCoursesRoute />);
    await openFacilityRouteLesson(screen, course.title);
    const detailCalls = mockFacilityGet.mock.calls.length;

    fireEvent.press(screen.getByText("Unpublish Course"));

    expect(await screen.findByText("Publish Course")).toBeTruthy();
    expect(mockFacilityUnpublish).toHaveBeenCalledWith("facility-1", course.id);
    expect(mockFacilityGet).toHaveBeenCalledTimes(detailCalls + 1);
    expect(screen.queryByText("Close Lesson")).toBeNull();
    expect(screen.queryByDisplayValue("Unsaved lesson note")).toBeNull();
  });

  it("clears a prior Facility course when a newly requested scoped course is denied", async () => {
    const firstCourse = {
      id: "facility-first",
      facilityId: "facility-1",
      authoringSource: "facility_workspace",
      title: "First Facility Course",
      visibility: "facilityOnly",
      isPublished: true,
      lessons: [],
      permissions: {}
    };
    const facilityApi = {
      get: jest
        .fn()
        .mockResolvedValueOnce(firstCourse)
        .mockRejectedValueOnce(new Error("Course unavailable.")),
      getLearnerState: jest.fn().mockResolvedValue({
        courseId: "facility-first",
        included: true,
        accessSource: "facility_workspace",
        label: "Included with Facility workspace",
        completedLessonIds: [],
        notes: [],
        activeRsvpSourceSessionIds: []
      })
    };
    const facilityWorkspace = {
      facilityId: "facility-1",
      role: "VIEWER",
      limits: { maxLessonsPerCourse: 100 },
      api: facilityApi
    };
    const screen = render(
      <CourseDetailScreen
        route={{ params: { id: "facility-first" } }}
        facilityWorkspace={facilityWorkspace}
      />
    );

    expect(await screen.findByText("First Facility Course")).toBeTruthy();
    screen.rerender(
      <CourseDetailScreen
        route={{ params: { id: "facility-denied" } }}
        facilityWorkspace={facilityWorkspace}
      />
    );

    expect(await screen.findByText("Course unavailable")).toBeTruthy();
    expect(screen.getByText("Course unavailable.")).toBeTruthy();
    expect(screen.queryByText("First Facility Course")).toBeNull();
  });

  it("hides draft learner actions and requires confirmation before deleting a Facility lesson", async () => {
    const facilityCourse = {
      id: "facility-draft-delete",
      facilityId: "facility-1",
      authoringSource: "facility_workspace",
      title: "Facility Draft Delete",
      visibility: "facilityOnly",
      isPublished: false,
      lessons: [{ id: "draft-lesson", title: "Draft lesson", content: "Preview" }],
      liveSessions: [
        {
          sourceSessionId: "draft-live",
          title: "Draft live",
          scheduledStart: "2026-09-10T16:00:00.000Z"
        }
      ],
      permissions: {
        canEditCourse: true,
        canEditLessons: true,
        canSetPrice: true,
        canPublish: true,
        canUnpublish: false,
        canArchive: true
      }
    };
    const deleteLesson = jest.fn().mockResolvedValue({
      ...facilityCourse,
      lessons: []
    });
    const facilityApi = {
      get: jest.fn().mockResolvedValue(facilityCourse),
      update: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
      archive: jest.fn(),
      deleteLesson
    };
    const screen = render(
      <CourseDetailScreen
        route={{ params: { id: "facility-draft-delete", course: facilityCourse } }}
        facilityWorkspace={{
          facilityId: "facility-1",
          role: "OWNER",
          limits: { maxLessonsPerCourse: 100 },
          api: facilityApi
        }}
      />
    );

    expect(await screen.findByText("Facility Draft Delete")).toBeTruthy();
    expect(screen.queryByText("Your progress")).toBeNull();
    expect(screen.queryByRole("button", { name: "RSVP to Draft live" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Open lesson Draft lesson" }));
    expect(await screen.findByText("Preview")).toBeTruthy();
    expect(screen.queryByLabelText("Private lesson notes")).toBeNull();
    expect(screen.queryByText("Mark Complete")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Delete lesson Draft lesson" }));
    expect(deleteLesson).not.toHaveBeenCalled();
    fireEvent.press(
      screen.getByRole("button", { name: "Confirm delete lesson Draft lesson" })
    );
    await waitFor(() =>
      expect(deleteLesson).toHaveBeenCalledWith("facility-draft-delete", "draft-lesson")
    );
  });

  it("keeps a Facility-mode generic course route learner-only without a scoped adapter", async () => {
    mockEntitlements.mode = "facility";
    Object.assign(mockLearningAccess, {
      canViewCourses: true,
      canCreateCourses: true,
      canSellPaidCourses: true,
      canPublishCourses: true,
      canViewCourseAnalytics: true
    });
    mockGetEnrollmentStatus.mockResolvedValue({ enrolled: false });
    mockGetCoursePaymentStatus.mockResolvedValue({
      paymentStatus: "not_started",
      refundStatus: "none",
      disputeStatus: "none"
    });
    mockGetCourse.mockResolvedValue({
      id: "generic-owner-course",
      title: "Generic Owner Projection",
      creator: "learner-1",
      _viewerOwnsCourse: true,
      sourceType: "facility_course",
      authoringSource: "facility_workspace",
      facilityId: "former-facility",
      priceCents: 500,
      visibility: "public",
      isPublished: true,
      lessons: [{ id: "generic-lesson", title: "Generic lesson", content: "Ready" }]
    });

    const screen = render(
      <CourseDetailScreen route={{ params: { id: "generic-owner-course" } }} />
    );

    expect(await screen.findByText("Generic Owner Projection")).toBeTruthy();
    expect(screen.queryByText("Creator pricing")).toBeNull();
    expect(screen.queryByText("Add Lesson")).toBeNull();
    expect(screen.queryByLabelText("Edit lesson Generic lesson")).toBeNull();
    expect(screen.queryByText("Publish Course")).toBeNull();
    expect(screen.queryByText("Archive draft course")).toBeNull();
    expect(screen.getByText("Start Checkout")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Lesson Generic lesson locked until payment is confirmed"
      })
    ).toBeDisabled();
    expect(mockUpdateCourse).not.toHaveBeenCalled();
    expect(mockPublishCourse).not.toHaveBeenCalled();
  });

  it("invokes the embedded archive callback only after a Facility archive succeeds", async () => {
    const facilityCourse = {
      id: "facility-archive-success",
      facilityId: "facility-1",
      authoringSource: "facility_workspace",
      title: "Facility Archive Success",
      visibility: "facilityOnly",
      isPublished: false,
      lessons: [{ id: "archive-lesson", title: "Archive lesson" }],
      permissions: {
        canEditCourse: true,
        canEditLessons: true,
        canSetPrice: true,
        canPublish: true,
        canUnpublish: false,
        canArchive: true
      }
    };
    let resolveArchive: (value: any) => void = () => {};
    const archive = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveArchive = resolve;
        })
    );
    const onArchived = jest.fn();
    const screen = render(
      <CourseDetailScreen
        route={{ params: { id: facilityCourse.id, course: facilityCourse } }}
        facilityWorkspace={{
          facilityId: "facility-1",
          role: "OWNER",
          limits: { maxLessonsPerCourse: 100 },
          api: {
            get: jest.fn().mockResolvedValue(facilityCourse),
            archive
          }
        }}
        onArchived={onArchived}
      />
    );

    expect(await screen.findByText("Facility Archive Success")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Archive draft course" }));
    fireEvent.press(screen.getByRole("button", { name: "Confirm archive course" }));

    await waitFor(() => expect(archive).toHaveBeenCalledWith(facilityCourse.id));
    expect(onArchived).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      resolveArchive({ archived: true });
    });

    await waitFor(() => expect(onArchived).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("retains the Facility course and does not navigate when archive fails", async () => {
    const facilityCourse = {
      id: "facility-archive-failure",
      facilityId: "facility-1",
      authoringSource: "facility_workspace",
      title: "Facility Archive Failure",
      visibility: "facilityOnly",
      isPublished: false,
      lessons: [{ id: "archive-lesson", title: "Archive lesson" }],
      permissions: {
        canEditCourse: true,
        canEditLessons: true,
        canSetPrice: true,
        canPublish: true,
        canUnpublish: false,
        canArchive: true
      }
    };
    const onArchived = jest.fn();
    const screen = render(
      <CourseDetailScreen
        route={{ params: { id: facilityCourse.id, course: facilityCourse } }}
        facilityWorkspace={{
          facilityId: "facility-1",
          role: "OWNER",
          limits: { maxLessonsPerCourse: 100 },
          api: {
            get: jest.fn().mockResolvedValue(facilityCourse),
            archive: jest.fn().mockRejectedValue(new Error("Archive blocked"))
          }
        }}
        onArchived={onArchived}
      />
    );

    expect(await screen.findByText("Facility Archive Failure")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Archive draft course" }));
    fireEvent.press(screen.getByRole("button", { name: "Confirm archive course" }));

    expect(await screen.findByText("Archive blocked")).toBeTruthy();
    expect(screen.getByText("Facility Archive Failure")).toBeTruthy();
    expect(screen.getByText("Archive this private draft course?")).toBeTruthy();
    expect(onArchived).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("uses the standalone catalog navigation fallback after a successful archive", async () => {
    Object.assign(mockLearningAccess, {
      canCreateCourses: true,
      canPublishCourses: true
    });
    mockGetCourse.mockResolvedValue({
      id: "course-owner",
      title: "Owner Draft",
      creator: "learner-1",
      _viewerOwnsCourse: true,
      isPublished: false,
      lessons: [{ id: "owner-lesson", title: "Owner lesson" }]
    });

    const screen = render(
      <CourseDetailScreen route={{ params: { id: "course-owner" } }} />
    );

    await waitFor(() => expect(screen.getByText("Owner Draft")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Archive draft course" }));
    expect(screen.getByText("Archive this private draft course?")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Confirm archive course" }));

    await waitFor(() => expect(mockArchiveCourse).toHaveBeenCalledWith("course-owner"));
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/courses");
  });
});
