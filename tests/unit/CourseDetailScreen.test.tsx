import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CourseDetailScreen from "@/screens/CourseDetailScreen";

const mockPush = jest.fn();
const mockSaveNote = jest.fn();
const mockCompleteLesson = jest.fn();
const mockApiRequest = jest.fn();

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
  getCoursePaymentStatus: jest.fn(),
  openCourseDispute: jest.fn(),
  requestCourseRefund: jest.fn(),
  startCourseCheckout: jest.fn()
}));
jest.mock("@/api/reports", () => ({
  submitReport: jest.fn(),
  exportCourseSales: jest.fn()
}));
jest.mock("@/api/courses", () => ({
  approveCourse: jest.fn(),
  completeLesson: (...args: any[]) => mockCompleteLesson(...args),
  enrollInCourse: jest.fn(),
  getCourse: () =>
    Promise.resolve({
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
    }),
  getCourseLearnerNotes: () =>
    Promise.resolve({
      notes: [{ lessonId: "lesson-1", note: "Existing note" }]
    }),
  getEnrollmentStatus: () =>
    Promise.resolve({
      enrolled: true,
      progress: { completedLessonIds: ["lesson-1"], completedLessons: 1, totalLessons: 1 }
    }),
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

describe("CourseDetailScreen learner player", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiRequest.mockResolvedValue({ sessionIds: [] });
    mockSaveNote.mockResolvedValue({ note: "Updated note" });
  });

  it("shows progress, resources, discussion, products, AI, and persistent notes", async () => {
    const screen = render(<CourseDetailScreen route={{ params: { id: "course-1" } }} />);

    await waitFor(() => expect(screen.getByText("Living Soil Course")).toBeTruthy());
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
});
