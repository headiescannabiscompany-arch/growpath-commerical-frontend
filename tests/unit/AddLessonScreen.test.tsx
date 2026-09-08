import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockAddLesson = jest.fn();
const mockPersistImageUris = jest.fn();
const mockUploadCourseMedia = jest.fn();
const mockDeleteCourseMediaAsset = jest.fn();
const mockAttachPhotos = jest.fn();
const mockLaunchLibrary = jest.fn();
const mockGetDocumentAsync = jest.fn();

jest.mock("@/api/courses", () => ({
  addLesson: (...args: any[]) => mockAddLesson(...args)
}));

jest.mock("@/api/uploads", () => ({
  deleteCourseMediaAsset: (...args: any[]) => mockDeleteCourseMediaAsset(...args),
  uploadCourseMedia: (...args: any[]) => mockUploadCourseMedia(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ can: () => true })
}));

jest.mock("@/features/learning/learningAccess", () => ({
  getLearningAccess: () => ({ canCreateCourses: true, maxLessonsPerCourse: null })
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args),
  resolveImageUri: (uri: string) => uri
}));

jest.mock("@/utils/growPhotoAttachment", () => ({
  maybePromptAttachPhotosToGrow: (...args: any[]) => mockAttachPhotos(...args)
}));

jest.mock("@/components/ScreenContainer", () => {
  const { ScrollView } = require("react-native");
  return ({ children }: any) => <ScrollView>{children}</ScrollView>;
});

jest.mock("@/components/GrowInterestPicker", () => {
  const { View } = require("react-native");
  return () => <View />;
});

jest.mock("@/components/learning/LessonMediaSourceEditor", () => {
  const { View } = require("react-native");
  return () => <View testID="lesson-media-source-editor" />;
});

jest.mock("@/components/videos/VideoLibraryPicker", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onSelect }: any) => (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        onSelect({
          id: "64f000000000000000000701",
          title: "Protected library video",
          mediaSource: {
            sourceType: "growpath_upload",
            provider: "growpath",
            providerLabel: "GrowPath upload",
            canonicalUrl: "/api/videos/uploads/64f000000000000000000702/object",
            originalUrl: "/api/videos/uploads/64f000000000000000000702/object",
            availabilityStatus: "available",
            embedCapability: "native"
          }
        })
      }
    >
      <Text>Select protected library video</Text>
    </Pressable>
  );
});

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images", Videos: "Videos" },
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLibrary(...args)
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockGetDocumentAsync(...args)
}));

describe("AddLessonScreen image uploads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/lesson.jpg",
          fileName: "lesson.jpg",
          mimeType: "image/jpeg"
        }
      ]
    });
    mockPersistImageUris.mockResolvedValue(["/uploads/lesson.jpg"]);
    mockUploadCourseMedia.mockImplementation(async (asset: any) => {
      const name = String(asset?.name || asset?.fileName || asset?.uri || "");
      if (/\.jpg$/i.test(name)) {
        return { url: "/api/course-media/64f000000000000000000711/file" };
      }
      if (/\.pdf$/i.test(name)) {
        return { url: "/api/course-media/64f000000000000000000712/file" };
      }
      return { url: "/api/course-media/64f000000000000000000713/file" };
    });
    mockGetDocumentAsync
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: "file:///tmp/lesson.pdf",
            name: "lesson.pdf",
            mimeType: "application/pdf"
          }
        ]
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: "file:///tmp/lesson.mp3",
            name: "lesson.mp3",
            mimeType: "audio/mpeg"
          }
        ]
      });
    mockAttachPhotos.mockResolvedValue({ prompted: true, attached: false });
    mockAddLesson.mockResolvedValue({ _id: "lesson-1" });
    mockDeleteCourseMediaAsset.mockResolvedValue({ cleanupStatus: "released" });
  });

  it("uses the active palette, hierarchy, and named lesson fields", () => {
    const { getThemePalette } = require("@/theme/appTheme");
    const {
      default: AddLessonScreen,
      createStyles
    } = require("@/screens/AddLessonScreen");
    const palette = getThemePalette("night", "dark");
    const styles = createStyles(palette);
    const screen = render(
      <AddLessonScreen
        route={{ params: { courseId: "course-1" } }}
        navigation={{ goBack: jest.fn() }}
      />
    );

    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.borderColor).toBe(palette.border);
    expect(styles.input.color).toBe(palette.text);
    expect(screen.getByRole("header", { name: "Add Lesson" }).props["aria-level"]).toBe(
      1
    );
    expect(screen.getByLabelText("Lesson title")).toBeTruthy();
    expect(screen.getByLabelText("Lesson order")).toBeTruthy();
    expect(screen.getByLabelText("Lesson text content")).toBeTruthy();
    expect(screen.getByLabelText("Lesson PDF URL")).toBeTruthy();
    expect(screen.getByLabelText("Save lesson")).toBeTruthy();
  });

  it("persists selected lesson images before saving", async () => {
    const AddLessonScreen = require("@/screens/AddLessonScreen").default;
    const navigation = { goBack: jest.fn() };
    const screen = render(
      <AddLessonScreen
        route={{ params: { courseId: "course-1" } }}
        navigation={navigation}
      />
    );

    fireEvent.press(screen.getByText("Add Images"));
    await waitFor(() => expect(mockLaunchLibrary).toHaveBeenCalled());
    fireEvent.changeText(screen.getByPlaceholderText("Title"), "Lesson 1");
    fireEvent.press(screen.getByText("Save Lesson"));

    await waitFor(() => expect(mockAddLesson).toHaveBeenCalled());
    expect(mockPersistImageUris).toHaveBeenCalledWith(["file:///tmp/lesson.jpg"]);
    expect(mockAddLesson).toHaveBeenCalledWith(
      "course-1",
      expect.objectContaining({ imageUrls: ["/uploads/lesson.jpg"] })
    );
    expect(mockAttachPhotos).not.toHaveBeenCalled();
  });

  it("uses Video Library and exact Facility scope for protected lesson media", async () => {
    const AddLessonScreen = require("@/screens/AddLessonScreen").default;
    const navigation = { goBack: jest.fn() };
    const facilityWorkspace = {
      facilityId: "facility-1",
      permissions: { canEditLessons: true },
      api: { addLesson: mockAddLesson }
    };
    const screen = render(
      <AddLessonScreen
        route={{ params: { courseId: "course-1" } }}
        navigation={navigation}
        facilityWorkspace={facilityWorkspace}
      />
    );

    expect(screen.queryByText("Choose video to upload")).toBeNull();
    expect(screen.queryByLabelText("Upload lesson PDF")).toBeNull();
    expect(screen.queryByLabelText("Lesson PDF URL")).toBeNull();
    expect(
      screen.getByText(/Facility document uploads are temporarily unavailable/)
    ).toBeTruthy();
    mockGetDocumentAsync.mockReset();
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/lesson.mp3",
          name: "lesson.mp3",
          mimeType: "audio/mpeg"
        }
      ]
    });
    fireEvent.press(screen.getByText("Select protected library video"));
    fireEvent.press(screen.getByText("Add Images"));
    await waitFor(() => expect(mockLaunchLibrary).toHaveBeenCalled());
    fireEvent.press(screen.getByText("Upload Audio"));
    await waitFor(() => expect(mockGetDocumentAsync).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getByPlaceholderText("Title"), "Media Lesson");
    fireEvent.press(screen.getByText("Save Lesson"));

    await waitFor(() => expect(mockAddLesson).toHaveBeenCalled());
    expect(mockPersistImageUris).not.toHaveBeenCalled();
    expect(mockUploadCourseMedia).toHaveBeenCalledTimes(2);
    for (const call of mockUploadCourseMedia.mock.calls) {
      expect(call[1]).toEqual({
        workspaceType: "facility",
        workspaceId: "facility-1"
      });
    }
    expect(mockAddLesson).toHaveBeenCalledWith(
      "course-1",
      expect.objectContaining({
        videoAssetId: "64f000000000000000000701",
        videoUrl: "/api/videos/uploads/64f000000000000000000702/object",
        mediaSource: expect.objectContaining({
          sourceType: "growpath_upload",
          canonicalUrl: "/api/videos/uploads/64f000000000000000000702/object",
          availabilityStatus: "available"
        }),
        imageUrls: ["/api/course-media/64f000000000000000000711/file"],
        pdfUrl: "",
        audioUrl: "/api/course-media/64f000000000000000000713/file"
      })
    );
  });

  it("releases newly uploaded Facility media when lesson creation fails", async () => {
    const AddLessonScreen = require("@/screens/AddLessonScreen").default;
    const facilityWorkspace = {
      facilityId: "facility-1",
      permissions: { canEditLessons: true },
      api: { addLesson: mockAddLesson }
    };
    mockUploadCourseMedia.mockResolvedValue({
      assetId: "64f000000000000000000799",
      url: "/api/course-media/64f000000000000000000799/file"
    });
    mockAddLesson.mockRejectedValue(new Error("draft save failed"));
    const screen = render(
      <AddLessonScreen
        route={{ params: { courseId: "course-1" } }}
        navigation={{ goBack: jest.fn() }}
        facilityWorkspace={facilityWorkspace}
      />
    );

    fireEvent.press(screen.getByText("Add Images"));
    await waitFor(() => expect(mockLaunchLibrary).toHaveBeenCalled());
    fireEvent.changeText(screen.getByPlaceholderText("Title"), "Failed media lesson");
    fireEvent.press(screen.getByText("Save Lesson"));

    await waitFor(() =>
      expect(mockDeleteCourseMediaAsset).toHaveBeenCalledWith("64f000000000000000000799")
    );
  });

  it("waits for every Facility upload before cleaning a successful peer after failure", async () => {
    const AddLessonScreen = require("@/screens/AddLessonScreen").default;
    const facilityWorkspace = {
      facilityId: "facility-1",
      permissions: { canEditLessons: true },
      api: { addLesson: mockAddLesson }
    };
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/rejected.jpg",
          fileName: "rejected.jpg",
          mimeType: "image/jpeg"
        },
        {
          uri: "file:///tmp/slow-success.jpg",
          fileName: "slow-success.jpg",
          mimeType: "image/jpeg"
        }
      ]
    });
    let resolveSlowUpload: (value: any) => void = () => {};
    mockUploadCourseMedia.mockImplementation((asset: any) => {
      if (String(asset?.fileName || "").includes("rejected")) {
        return Promise.reject(new Error("one upload failed"));
      }
      return new Promise((resolve) => {
        resolveSlowUpload = resolve;
      });
    });
    const screen = render(
      <AddLessonScreen
        route={{ params: { courseId: "course-1" } }}
        navigation={{ goBack: jest.fn() }}
        facilityWorkspace={facilityWorkspace}
      />
    );

    fireEvent.press(screen.getByText("Add Images"));
    await waitFor(() => expect(mockLaunchLibrary).toHaveBeenCalled());
    fireEvent.changeText(screen.getByPlaceholderText("Title"), "Partial upload");
    fireEvent.press(screen.getByText("Save Lesson"));
    await waitFor(() => expect(mockUploadCourseMedia).toHaveBeenCalledTimes(2));
    expect(mockDeleteCourseMediaAsset).not.toHaveBeenCalled();

    await act(async () => {
      resolveSlowUpload({
        assetId: "64f000000000000000000798",
        url: "/api/course-media/64f000000000000000000798/file"
      });
    });

    await waitFor(() =>
      expect(mockDeleteCourseMediaAsset).toHaveBeenCalledWith("64f000000000000000000798")
    );
    expect(mockAddLesson).not.toHaveBeenCalled();
  });
});
