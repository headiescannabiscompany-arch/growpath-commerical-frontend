import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking, StyleSheet } from "react-native";

import CourseDetailScreen, {
  courseDetailImageSource,
  createStyles
} from "@/screens/CourseDetailScreen";
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
const mockEntitlements = { mode: "personal" };

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "learner-1" } })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
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
      canCreateCourses: false,
      canSellPaidCourses: false,
      canPublishCourses: false,
      canViewCourseAnalytics: false,
      maxLessonsPerCourse: 12
    });
    mockEntitlements.mode = "personal";
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
