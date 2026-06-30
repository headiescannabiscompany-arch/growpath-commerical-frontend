import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockAddLesson = jest.fn();
const mockPersistImageUris = jest.fn();
const mockUploadCourseMedia = jest.fn();
const mockAttachPhotos = jest.fn();
const mockLaunchLibrary = jest.fn();
const mockGetDocumentAsync = jest.fn();

jest.mock("@/api/courses", () => ({
  addLesson: (...args: any[]) => mockAddLesson(...args)
}));

jest.mock("@/api/uploads", () => ({
  uploadCourseMedia: (...args: any[]) => mockUploadCourseMedia(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ can: () => true })
}));

jest.mock("@/features/learning/learningAccess", () => ({
  getLearningAccess: () => ({ canCreateCourses: true, maxLessonsPerCourse: null })
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args)
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

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images", Videos: "Videos" },
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLibrary(...args)
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockGetDocumentAsync(...args)
}));

describe("AddLessonScreen image uploads", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/lesson.jpg" }]
    });
    mockPersistImageUris.mockResolvedValue(["/uploads/lesson.jpg"]);
    mockUploadCourseMedia
      .mockResolvedValueOnce({ url: "/uploads/lesson.mp4" })
      .mockResolvedValueOnce({ url: "/uploads/lesson.pdf" })
      .mockResolvedValueOnce({ url: "/uploads/lesson.mp3" });
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

  it("uploads selected video, PDF, and audio files before saving", async () => {
    mockLaunchLibrary.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/lesson.mp4",
          fileName: "lesson.mp4",
          mimeType: "video/mp4"
        }
      ]
    });
    mockPersistImageUris.mockResolvedValue([]);

    const AddLessonScreen = require("@/screens/AddLessonScreen").default;
    const navigation = { goBack: jest.fn() };
    const screen = render(
      <AddLessonScreen
        route={{ params: { courseId: "course-1" } }}
        navigation={navigation}
      />
    );

    fireEvent.press(screen.getByText("Upload Video File"));
    await waitFor(() => expect(mockLaunchLibrary).toHaveBeenCalled());
    fireEvent.press(screen.getByText("Upload PDF"));
    await waitFor(() => expect(mockGetDocumentAsync).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByText("Upload Audio"));
    await waitFor(() => expect(mockGetDocumentAsync).toHaveBeenCalledTimes(2));

    fireEvent.changeText(screen.getByPlaceholderText("Title"), "Media Lesson");
    fireEvent.press(screen.getByText("Save Lesson"));

    await waitFor(() => expect(mockAddLesson).toHaveBeenCalled());
    expect(mockUploadCourseMedia).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ uri: "file:///tmp/lesson.mp4" })
    );
    expect(mockUploadCourseMedia).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ uri: "file:///tmp/lesson.pdf" })
    );
    expect(mockUploadCourseMedia).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ uri: "file:///tmp/lesson.mp3" })
    );
    expect(mockAddLesson).toHaveBeenCalledWith(
      "course-1",
      expect.objectContaining({
        videoUrl: "/uploads/lesson.mp4",
        pdfUrl: "/uploads/lesson.pdf",
        audioUrl: "/uploads/lesson.mp3"
      })
    );
  });
});
