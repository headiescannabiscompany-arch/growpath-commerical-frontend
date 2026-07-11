import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children, showBack, backFallbackHref, title }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return (
      <>
        <Text>Boundary {title}</Text>
        {showBack ? <Text>Shared Back {backFallbackHref}</Text> : null}
        {children}
      </>
    );
  }
}));

jest.mock("@/screens/commercial/CreateCourseScreen", () => () => {
  const React = require("react");
  const { Text } = require("react-native");
  return <Text>Create course form</Text>;
});

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

const mockReplace = jest.fn();
const mockSearchParams: Record<string, any> = {};

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockSearchParams
}));

describe("legacy course authoring route back behavior", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    Object.keys(mockSearchParams).forEach((key) => delete mockSearchParams[key]);
  });

  it("uses the shared back header on course creation", () => {
    const CreateCourseRoute = require("@/app/courses/create").default;

    render(<CreateCourseRoute />);

    expect(screen.getByText("Boundary Create Course")).toBeTruthy();
    expect(screen.getByText("Shared Back /home/personal/courses")).toBeTruthy();
    expect(screen.getByText("Create course form")).toBeTruthy();
  });

  it("uses the shared back header on lesson creation and keeps the legacy fallback", () => {
    mockSearchParams.courseId = "course-123";
    const AddLessonRoute = require("@/app/courses/add-lesson").default;

    render(<AddLessonRoute />);

    expect(screen.getByText("Boundary Add Lesson")).toBeTruthy();
    expect(screen.getByText("Shared Back /courses")).toBeTruthy();
    expect(screen.getByText("Add lesson form course-123")).toBeTruthy();

    screen.getByText("Submit lesson").props.onPress();
    expect(mockReplace).toHaveBeenCalledWith("/courses");
  });
});
