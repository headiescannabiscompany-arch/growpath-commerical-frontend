import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CreateCourseScreen from "@/screens/commercial/CreateCourseScreen";

const mockCreateCourse = jest.fn();
const mockReplace = jest.fn();
const mockPersistImageUri = jest.fn();
const mockPersistImageUris = jest.fn();
const mockUploadCourseMedia = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockGetDocumentAsync = jest.fn();
const mockGetTwitchConnection = jest.fn();
const mockBeginTwitchConnection = jest.fn();
const mockValidateTwitchConnection = jest.fn();
const CONNECTED_TWITCH = {
  configured: true,
  connection: {
    status: "connected",
    broadcasterId: "broadcaster-1",
    broadcasterLogin: "growpath",
    broadcasterName: "GrowPath",
    eventSubStatus: "connected"
  }
};

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/api/courses", () => ({
  createCourse: (...args: any[]) => mockCreateCourse(...args)
}));

jest.mock("@/api/uploads", () => ({
  uploadCourseMedia: (...args: any[]) => mockUploadCourseMedia(...args)
}));

jest.mock("@/api/twitch", () => ({
  getTwitchConnection: (...args: any[]) => mockGetTwitchConnection(...args),
  beginTwitchConnection: (...args: any[]) => mockBeginTwitchConnection(...args),
  validateTwitchConnection: (...args: any[]) => mockValidateTwitchConnection(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args),
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args),
  resolveImageUri: (uri: string) => uri
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibraryAsync(...args)
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockGetDocumentAsync(...args)
}));

jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  const { ScrollView, View } = require("react-native");
  return ({ children, scroll }: any) =>
    scroll
      ? React.createElement(ScrollView, null, children)
      : React.createElement(View, null, children);
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COURSES_VIEW: "COURSES_VIEW",
    COURSES_CREATE: "COURSES_CREATE",
    COURSES_SELL_PAID: "COURSES_SELL_PAID",
    SEE_PAID_COURSES: "SEE_PAID_COURSES",
    PUBLISH_COURSES: "PUBLISH_COURSES",
    COURSES_ANALYTICS: "COURSES_ANALYTICS",
    COURSES_CERTIFICATES: "COURSES_CERTIFICATES"
  },
  useEntitlements: () => ({
    mode: "personal",
    limits: { maxPaidCourses: 1, maxLessonsPerCourse: 12 },
    can: (capability: string) =>
      capability === "COURSES_VIEW" ||
      capability === "COURSES_CREATE" ||
      capability === "COURSES_SELL_PAID"
  })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { growInterests: {} } })
}));

describe("CreateCourseScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockCreateCourse.mockResolvedValue({ id: "course-new", title: "Living Soil 101" });
    mockGetTwitchConnection.mockReturnValue(new Promise(() => {}));
    mockBeginTwitchConnection.mockResolvedValue({
      configured: true,
      authorizationUrl: "https://id.twitch.tv/oauth2/authorize"
    });
    mockValidateTwitchConnection.mockResolvedValue({ ok: true });
    mockPersistImageUri.mockImplementation(async (uri) =>
      uri ? "uploaded-cover.jpg" : null
    );
    mockPersistImageUris.mockResolvedValue(["/uploads/course-gallery.jpg"]);
    mockUploadCourseMedia
      .mockResolvedValueOnce({ url: "/uploads/course-workbook.pdf" })
      .mockResolvedValueOnce({ url: "/uploads/course-video.mp4" });
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "local-cover.jpg" }]
    });
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/course-workbook.pdf",
          name: "course-workbook.pdf",
          mimeType: "application/pdf",
          size: 1024
        }
      ]
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the full course builder workflow", () => {
    const screen = render(<CreateCourseScreen />);

    expect(screen.getByText("Back to Courses")).toBeTruthy();
    expect(screen.getAllByText(/1\. Course basics/).length).toBeGreaterThan(0);
    expect(screen.getByText("2. Curriculum / lessons")).toBeTruthy();
    expect(screen.getByText("3. Documents / media")).toBeTruthy();
    expect(screen.getByText("4. Live sessions")).toBeTruthy();
    expect(screen.getByText("5. Links")).toBeTruthy();
    expect(screen.getByText("6. Pricing / access")).toBeTruthy();
    expect(screen.getByText("7. Preview / publish")).toBeTruthy();
    expect(screen.getByText("Lessons: 0 / plan limit")).toBeTruthy();
    expect(screen.getByText("Upload Cover Image")).toBeTruthy();
    expect(screen.getByText("Upload Documents")).toBeTruthy();
    expect(screen.getByText("Upload Video / Audio")).toBeTruthy();
    expect(screen.getByText("Upload Images")).toBeTruthy();
    expect(screen.getByText("Twitch, calendar, and reminders")).toBeTruthy();
    expect(screen.getByText("Open Schedule")).toBeTruthy();
    expect(screen.getByText("Notifications")).toBeTruthy();
  });

  it("creates structured draft payloads for lessons, documents, lives, and links", async () => {
    mockGetTwitchConnection.mockResolvedValue(CONNECTED_TWITCH);
    const screen = render(<CreateCourseScreen />);

    await waitFor(() =>
      expect(screen.getByText("Connected as GrowPath. EventSub connected.")).toBeTruthy()
    );
    fireEvent.changeText(screen.getByLabelText("Course title"), "Living Soil 101");
    fireEvent.changeText(
      screen.getByLabelText("Course summary"),
      "Build a reusable soil."
    );
    fireEvent.changeText(
      screen.getByLabelText("Course description"),
      "A practical course."
    );
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Basics\nAmendments"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course quiz outline"),
      "What controls nutrient availability? | pH | Pot color"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course documents"),
      "Worksheet PDF\nSoil checklist"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course media plan"),
      "Two 20 minute videos"
    );
    fireEvent.changeText(screen.getByLabelText("Live session title"), "Live Q&A");
    fireEvent.changeText(
      screen.getByLabelText("Live session start"),
      "2026-07-20T19:00:00-04:00"
    );
    fireEvent.changeText(
      screen.getByLabelText("Live session end"),
      "2026-07-20T20:00:00-04:00"
    );
    fireEvent.changeText(
      screen.getByLabelText("Live session Twitch channel"),
      "https://www.twitch.tv/growpath"
    );
    fireEvent.press(screen.getByLabelText("Add scheduled Twitch session"));
    fireEvent.changeText(
      screen.getByLabelText("Linked product ids"),
      "product-1\nproduct-2"
    );
    fireEvent.changeText(screen.getByLabelText("Linked grow ids"), "grow-1");
    fireEvent.changeText(screen.getByLabelText("Linked forum thread ids"), "thread-1");
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Living Soil 101",
        status: "draft",
        isPublished: false,
        access: "free",
        workspace: "personal",
        mediaPlan: "Two 20 minute videos",
        linkedProductIds: ["product-1", "product-2"],
        linkedGrowIds: ["grow-1"],
        linkedForumThreadIds: ["thread-1"],
        lessons: [
          expect.objectContaining({ title: "Basics", order: 1, status: "draft" }),
          expect.objectContaining({ title: "Amendments", order: 2, status: "draft" })
        ],
        quizzes: [
          expect.objectContaining({
            question: "What controls nutrient availability?",
            options: ["pH", "Pot color"],
            sortOrder: 1,
            status: "draft"
          })
        ],
        documents: [
          expect.objectContaining({ title: "Worksheet PDF", status: "planned" }),
          expect.objectContaining({ title: "Soil checklist", status: "planned" })
        ],
        liveSessions: [
          expect.objectContaining({
            title: "Live Q&A",
            scheduledStart: "2026-07-20T19:00:00-04:00",
            scheduledEnd: "2026-07-20T20:00:00-04:00",
            platform: "twitch",
            twitchChannel: "growpath",
            twitchChannelId: "broadcaster-1",
            twitchConnectionStatus: "connected",
            eventSubStatus: "connected",
            meetingUrl: "https://www.twitch.tv/growpath",
            createLearnerTask: true,
            calendarType: "course_live_session",
            notificationPlan: expect.arrayContaining([
              "new_live_scheduled",
              "1h_before",
              "live_now",
              "replay_available"
            ]),
            status: "scheduled"
          })
        ],
        authoringPlan: expect.objectContaining({
          step: "draft",
          requiredSteps: expect.arrayContaining([
            "basics",
            "curriculum",
            "documents_media",
            "live_sessions",
            "links",
            "pricing_access",
            "preview_publish"
          ])
        })
      })
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/home/personal/courses",
      params: { courseId: "course-new" }
    });
  });

  it("uses the shared provider-aware video workflow in the initial course builder", async () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Provider Course");
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Provider-aware lesson"
    );
    fireEvent.press(screen.getByLabelText("Edit video source for Provider-aware lesson"));
    fireEvent.changeText(
      screen.getByLabelText("Lesson video page URL"),
      "https://www.youtube.com/watch?v=CUIifOqeS1Q"
    );
    fireEvent.press(screen.getByLabelText("Current availability: Available"));
    fireEvent.press(
      screen.getByLabelText("Confirm rights or permission for lesson video")
    );
    fireEvent.press(screen.getByLabelText("Captions: Provided"));
    fireEvent.changeText(
      screen.getByLabelText("Learner-visible lesson video summary"),
      "Learners can follow the provider-aware lesson without loading the video."
    );
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        lessons: [
          expect.objectContaining({
            title: "Provider-aware lesson",
            videoUrl: "https://www.youtube.com/watch?v=CUIifOqeS1Q",
            externalVideoUrl: "https://www.youtube.com/watch?v=CUIifOqeS1Q",
            mediaSource: expect.objectContaining({
              sourceType: "youtube",
              providerLabel: "YouTube",
              creatorRightsConfirmed: true,
              availabilityStatus: "available",
              captionsStatus: "provided",
              externalLinkFallback: "https://www.youtube.com/watch?v=CUIifOqeS1Q"
            })
          })
        ]
      })
    );
  });

  it("rejects unsafe lesson video markup before creating the course", () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Safe Media Course");
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Unsafe lesson"
    );
    fireEvent.press(screen.getByLabelText("Edit video source for Unsafe lesson"));
    fireEvent.changeText(
      screen.getByLabelText("Lesson video page URL"),
      '<iframe src="https://example.com/video"></iframe>'
    );
    fireEvent.press(screen.getByText("Create Draft"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Video source needs attention: Unsafe lesson",
      expect.stringContaining("not iframe, embed, script, or HTML code")
    );
    expect(mockCreateCourse).not.toHaveBeenCalled();
  });

  it("uploads a GrowPath lesson video from the initial course builder", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/lesson-video.mp4",
          name: "lesson-video.mp4",
          mimeType: "video/mp4",
          size: 8096
        }
      ]
    });
    mockUploadCourseMedia.mockReset();
    mockUploadCourseMedia.mockResolvedValue({ url: "/uploads/lesson-video.mp4" });
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Upload Lesson Course");
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Uploaded lesson"
    );
    fireEvent.press(screen.getByLabelText("Edit video source for Uploaded lesson"));
    fireEvent.press(screen.getByLabelText("Video provider: GrowPath upload"));
    fireEvent.press(screen.getByLabelText("Choose GrowPath lesson video upload"));
    await waitFor(() =>
      expect(screen.getByText("Selected: lesson-video.mp4")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() =>
      expect(mockUploadCourseMedia).toHaveBeenCalledWith(
        expect.objectContaining({ uri: "file:///tmp/lesson-video.mp4" })
      )
    );
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        lessons: [
          expect.objectContaining({
            videoUrl: "/uploads/lesson-video.mp4",
            mediaSource: expect.objectContaining({
              sourceType: "growpath_upload",
              providerLabel: "GrowPath upload",
              canonicalUrl: "/uploads/lesson-video.mp4"
            })
          })
        ],
        authoringPlan: expect.objectContaining({
          limits: expect.objectContaining({
            selectedMedia: 1,
            videoStorage: "selected_for_upload"
          })
        })
      })
    );
  });

  it("creates a paid draft with a visible USD fee", async () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Paid Soil Course");
    fireEvent.press(screen.getByLabelText("Set a paid course fee"));
    fireEvent.changeText(screen.getByLabelText("Course price USD"), "19.00");

    expect(screen.getByText("Learners will see: $19.00")).toBeTruthy();
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Paid Soil Course",
        access: "paid",
        priceCents: 1900,
        price: 19,
        currency: "usd"
      })
    );
  });

  it("uploads a selected course cover image before creating the draft", async () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Media Course");
    fireEvent.press(screen.getByLabelText("Upload course cover image"));

    await waitFor(() =>
      expect(screen.getByLabelText("Course cover image preview")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() =>
      expect(mockPersistImageUri).toHaveBeenCalledWith("local-cover.jpg")
    );
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Media Course",
        coverImageUrl: "uploaded-cover.jpg"
      })
    );
  });

  it("uploads selected course documents, video/audio media, and image sets before creating the draft", async () => {
    mockGetDocumentAsync
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: "file:///tmp/course-workbook.pdf",
            name: "course-workbook.pdf",
            mimeType: "application/pdf",
            size: 1024
          }
        ]
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: "file:///tmp/course-video.mp4",
            name: "course-video.mp4",
            mimeType: "video/mp4",
            size: 4096
          }
        ]
      });
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///tmp/course-gallery.jpg", fileName: "gallery.jpg" }]
    });

    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Upload Workflow");
    fireEvent.press(screen.getByLabelText("Upload course documents"));
    await waitFor(() => expect(screen.getByText("1 Document Selected")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Upload course media files"));
    await waitFor(() => expect(screen.getByText("1 Media File")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Upload course image set"));
    await waitFor(() =>
      expect(screen.getByLabelText("Course media image 1")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockUploadCourseMedia).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ uri: "file:///tmp/course-workbook.pdf" })
    );
    expect(mockUploadCourseMedia).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ uri: "file:///tmp/course-video.mp4" })
    );
    expect(mockPersistImageUris).toHaveBeenCalledWith(["file:///tmp/course-gallery.jpg"]);
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        documents: expect.arrayContaining([
          expect.objectContaining({
            fileName: "course-workbook.pdf",
            storageUrl: "/uploads/course-workbook.pdf",
            status: "uploaded"
          })
        ]),
        mediaAssets: expect.arrayContaining([
          expect.objectContaining({
            fileName: "course-video.mp4",
            type: "video",
            storageUrl: "/uploads/course-video.mp4"
          }),
          expect.objectContaining({
            fileName: "gallery.jpg",
            type: "image",
            storageUrl: "/uploads/course-gallery.jpg"
          })
        ]),
        uploadedImageUrls: ["/uploads/course-gallery.jpg"],
        authoringPlan: expect.objectContaining({
          limits: expect.objectContaining({
            selectedDocuments: 1,
            selectedMedia: 2,
            videoStorage: "selected_for_upload"
          })
        })
      })
    );
  });
});
