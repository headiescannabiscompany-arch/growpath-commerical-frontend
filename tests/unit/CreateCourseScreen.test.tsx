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

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/api/courses", () => ({
  createCourse: (...args: any[]) => mockCreateCourse(...args)
}));

jest.mock("@/api/uploads", () => ({
  uploadCourseMedia: (...args: any[]) => mockUploadCourseMedia(...args)
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
    can: (capability: string) => capability === "COURSES_VIEW"
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
  });

  it("creates structured draft payloads for lessons, documents, lives, and links", async () => {
    const screen = render(<CreateCourseScreen />);

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
      screen.getByLabelText("Course documents"),
      "Worksheet PDF\nSoil checklist"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course media plan"),
      "Two 20 minute videos"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course live sessions"),
      "Live Q&A\nRecipe review"
    );
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
        documents: [
          expect.objectContaining({ title: "Worksheet PDF", status: "planned" }),
          expect.objectContaining({ title: "Soil checklist", status: "planned" })
        ],
        liveSessions: [
          expect.objectContaining({ title: "Live Q&A", status: "scheduled" }),
          expect.objectContaining({ title: "Recipe review", status: "scheduled" })
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
