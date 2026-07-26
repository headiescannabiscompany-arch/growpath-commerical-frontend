import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CourseDetailScreen from "@/screens/CourseDetailScreen";

const mockPush = jest.fn();
const mockSaveNote = jest.fn();
const mockCompleteLesson = jest.fn();
const mockApiRequest = jest.fn();
const mockGetCourse = jest.fn();
const mockGetEnrollmentStatus = jest.fn();
const mockGetCoursePaymentStatus = jest.fn();
const mockOpenCourseDispute = jest.fn();
const mockRequestCourseRefund = jest.fn();
const mockStartCourseCheckout = jest.fn();

jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "learner-1" } })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ mode: "personal" })
}));
jest.mock("@/features/learning/learningAccess", () => ({
  getLearningAccess: () => ({
    canViewCourses: true,
    canCreateCourses: false,
    canSellPaidCourses: false,
    canPublishCourses: false,
    canViewCourseAnalytics: false,
    maxLessonsPerCourse: 12
  })
}));
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
  submitReport: jest.fn(),
  exportCourseSales: jest.fn()
}));
jest.mock("@/api/courses", () => ({
  approveCourse: jest.fn(),
  completeLesson: (...args: any[]) => mockCompleteLesson(...args),
  enrollInCourse: jest.fn(),
  getCourse: (...args: any[]) => mockGetCourse(...args),
  getCourseLearnerNotes: () =>
    Promise.resolve({
      notes: [{ lessonId: "lesson-1", note: "Existing note" }]
    }),
  getEnrollmentStatus: (...args: any[]) => mockGetEnrollmentStatus(...args),
  getReviews: () => Promise.resolve([]),
  rejectCourse: jest.fn(),
  saveCourseLearnerNote: (...args: any[]) => mockSaveNote(...args),
  sendWatchTime: () => Promise.resolve(),
  submitForReview: jest.fn(),
  trackDropoff: () => Promise.resolve(),
  trackCourseProductClick: () => Promise.resolve(),
  trackCourseView: () => Promise.resolve(),
  trackLessonView: () => Promise.resolve(),
  updateCourse: jest.fn()
}));

const freeCourse = {
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
    mockApiRequest.mockResolvedValue({ sessionIds: [] });
    mockSaveNote.mockResolvedValue({ note: "Updated note" });
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
});
