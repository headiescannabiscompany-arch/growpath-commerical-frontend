import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import CourseDetailScreen, { createStyles } from "@/screens/CourseDetailScreen";
import { getThemePalette } from "@/theme/appTheme";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockArchiveCourse = jest.fn();
const mockSaveNote = jest.fn();
const mockCompleteLesson = jest.fn();
const mockApiRequest = jest.fn();
const mockGetCourse = jest.fn();
const mockGetEnrollmentStatus = jest.fn();
const mockGetCoursePaymentStatus = jest.fn();
const mockOpenCourseDispute = jest.fn();
const mockRequestCourseRefund = jest.fn();
const mockStartCourseCheckout = jest.fn();
const mockPublishCourse = jest.fn();
const mockSubmitReport = jest.fn();
const mockUnpublishCourse = jest.fn();
const mockUpdateCourse = jest.fn();
const mockLearningAccess = {
  canViewCourses: true,
  canCreateCourses: false,
  canSellPaidCourses: false,
  canPublishCourses: false,
  canViewCourseAnalytics: false,
  maxLessonsPerCourse: 12
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "learner-1" } })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ mode: "personal" })
}));
jest.mock("@/features/learning/learningAccess", () => ({
  getLearningAccess: () => mockLearningAccess
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
  enrollInCourse: jest.fn(),
  getCourse: (...args: any[]) => mockGetCourse(...args),
  getCourseLearnerNotes: () =>
    Promise.resolve({
      notes: [{ lessonId: "lesson-1", note: "Existing note" }]
    }),
  getEnrollmentStatus: (...args: any[]) => mockGetEnrollmentStatus(...args),
  getReviews: () => Promise.resolve([]),
  publishCourse: (...args: any[]) => mockPublishCourse(...args),
  saveCourseLearnerNote: (...args: any[]) => mockSaveNote(...args),
  sendWatchTime: () => Promise.resolve(),
  trackDropoff: () => Promise.resolve(),
  trackCourseProductClick: () => Promise.resolve(),
  trackCourseView: () => Promise.resolve(),
  trackLessonView: () => Promise.resolve(),
  unpublishCourse: (...args: any[]) => mockUnpublishCourse(...args),
  updateCourse: (...args: any[]) => mockUpdateCourse(...args)
}));

const freeCourse: any = {
  id: "course-1",
  title: "Living Soil Course",
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
      canCreateCourses: false,
      canSellPaidCourses: false,
      canPublishCourses: false,
      canViewCourseAnalytics: false,
      maxLessonsPerCourse: 12
    });
    mockApiRequest.mockResolvedValue({ sessionIds: [] });
    mockSaveNote.mockResolvedValue({ note: "Updated note" });
    mockPublishCourse.mockResolvedValue({ published: true });
    mockSubmitReport.mockResolvedValue({ accepted: true });
    mockUnpublishCourse.mockResolvedValue({ published: false });
    mockUpdateCourse.mockResolvedValue({});
    mockArchiveCourse.mockResolvedValue({ archived: true });
    mockGetCourse.mockResolvedValue(freeCourse);
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

  it("renders a loaded course with Night palette surfaces and keeps Day styles palette-driven", async () => {
    const nightPalette = getThemePalette("night", "dark");
    const dayPalette = getThemePalette("day", "light");
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    const title = await screen.findByText("Living Soil Course");
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

  it("opens the Expo lesson editor when legacy navigation is unavailable", async () => {
    Object.assign(mockLearningAccess, { canCreateCourses: true });
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    await waitFor(() => expect(screen.getByText("Living Soil Course")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit lesson Build the mix"));

    expect(mockPush).toHaveBeenCalledWith(
      "/courses/edit-lesson?lessonId=lesson-1&courseId=course-1&from=%2Fcourses%3FcourseId%3Dcourse-1"
    );
  });

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
      paymentStatus: "paid",
      checkoutStatus: "recorded",
      refundStatus: "none",
      disputeStatus: "none"
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
      expect(mockOpenCourseDispute).toHaveBeenCalledWith(
        "course-paid",
        "I do not recognize this payment."
      )
    );
    expect(
      await screen.findByText(
        "Payment issue sent to GrowPath support. This does not open a bank or card dispute."
      )
    ).toBeTruthy();
  });

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

  it("lets an owner confirm a soft archive only while the course is a draft", async () => {
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
