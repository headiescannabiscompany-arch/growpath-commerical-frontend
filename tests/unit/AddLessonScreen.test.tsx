import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockAddLesson = jest.fn();
const mockPersistImageUris = jest.fn();
const mockAttachPhotos = jest.fn();
const mockLaunchLibrary = jest.fn();

jest.mock("@/api/courses", () => ({
  addLesson: (...args: any[]) => mockAddLesson(...args)
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
  getDocumentAsync: jest.fn()
}));

describe("AddLessonScreen image uploads", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/lesson.jpg" }]
    });
    mockPersistImageUris.mockResolvedValue(["/uploads/lesson.jpg"]);
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
    expect(mockAttachPhotos).toHaveBeenCalledWith(["/uploads/lesson.jpg"]);
  });
});
