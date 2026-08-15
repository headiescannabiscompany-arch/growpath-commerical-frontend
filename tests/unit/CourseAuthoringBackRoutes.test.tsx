import React from "react";
import { Text } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({
    children,
    showBack,
    backFallbackHref,
    preferBackFallback,
    title
  }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return (
      <>
        <Text>Boundary {title}</Text>
        {showBack ? <Text>Shared Back {backFallbackHref}</Text> : null}
        {showBack ? (
          <Text>Shared Back Mode {preferBackFallback ? "fallback" : "history"}</Text>
        ) : null}
        {children}
      </>
    );
  }
}));

jest.mock(
  "@/screens/commercial/CreateCourseScreen",
  () =>
    ({ showBackToCourses }: any) => {
      const React = require("react");
      const { Text } = require("react-native");
      return (
        <Text>
          Create course form{" "}
          {showBackToCourses === false ? "shared back only" : "own back"}
        </Text>
      );
    }
);

jest.mock("@/screens/AddLessonScreen", () => ({ route, navigation }: any) => {
  const React = require("react");
  const { Text } = require("react-native");
  return (
    <>
      <Text>Add lesson form {route?.params?.courseId || "none"}</Text>
      <Text onPress={() => navigation?.goBack?.()}>Submit lesson</Text>
    </>
  );
});

jest.mock("@/screens/EditLessonScreen", () => ({ route, navigation }: any) => {
  const React = require("react");
  const { Text } = require("react-native");
  return (
    <>
      <Text>Edit lesson form {route?.params?.lessonId || "none"}</Text>
      <Text onPress={() => navigation?.goBack?.()}>Save edited lesson</Text>
    </>
  );
});

jest.mock("@/screens/CreatorAnalyticsScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text>Course analytics content</Text>;
});

const mockReplace = jest.fn();
const mockGetCourse = jest.fn();
const mockSearchParams: Record<string, any> = {};

jest.mock("@/api/courses", () => ({
  getCourse: (...args: any[]) => mockGetCourse(...args)
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockSearchParams
}));

describe("legacy course authoring route back behavior", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockGetCourse.mockReset();
    Object.keys(mockSearchParams).forEach((key) => delete mockSearchParams[key]);
  });

  it("uses the shared back header on course creation", () => {
    const CreateCourseRoute = require("@/app/courses/create").default;

    render(<CreateCourseRoute />);

    expect(screen.getByText("Boundary Create Course")).toBeTruthy();
    expect(screen.getByText("Shared Back /home/personal/courses")).toBeTruthy();
    expect(screen.getByText("Create course form shared back only")).toBeTruthy();
  });

  it("uses the shared back header on lesson creation and returns to personal courses", () => {
    mockSearchParams.courseId = "course-123";
    const AddLessonRoute = require("@/app/courses/add-lesson").default;

    render(<AddLessonRoute />);

    expect(screen.getByText("Boundary Add Lesson")).toBeTruthy();
    expect(screen.getByText("Shared Back /home/personal/courses")).toBeTruthy();
    expect(screen.getByText("Add lesson form course-123")).toBeTruthy();

    screen.getByText("Submit lesson").props.onPress();
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/courses");
  });

  it("requires a course selection before rendering lesson fields", () => {
    const AddLessonRoute = require("@/app/courses/add-lesson").default;

    render(<AddLessonRoute />);

    expect(
      screen.getByRole("header", { name: "Select a course before adding a lesson" })
        .props["aria-level"]
    ).toBe(1);
    expect(screen.queryByText("Add lesson form none")).toBeNull();
    fireEvent.press(screen.getByLabelText("Browse courses"));
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/courses");
  });

  it("loads a saved lesson and returns through the shared course route after editing", async () => {
    mockSearchParams.courseId = "course-123";
    mockSearchParams.lessonId = "lesson-456";
    mockGetCourse.mockResolvedValue({
      id: "course-123",
      lessons: [{ id: "lesson-456", title: "Build the mix" }]
    });
    const EditLessonRoute = require("@/app/courses/edit-lesson").default;

    render(<EditLessonRoute />);

    await waitFor(() =>
      expect(screen.getByText("Edit lesson form lesson-456")).toBeTruthy()
    );
    expect(screen.getByText("Shared Back /courses?courseId=course-123")).toBeTruthy();
    expect(screen.getByText("Shared Back Mode fallback")).toBeTruthy();

    screen.getByText("Save edited lesson").props.onPress();
    expect(mockReplace).toHaveBeenCalledWith("/courses?courseId=course-123");
  });

  it("gives course analytics exactly one shared back path", () => {
    const CourseAnalyticsRoute = require("@/app/courses/analytics").default;

    render(<CourseAnalyticsRoute />);

    expect(screen.getAllByText("Shared Back /courses")).toHaveLength(1);
    expect(screen.getByText("Course analytics content")).toBeTruthy();
  });
});
