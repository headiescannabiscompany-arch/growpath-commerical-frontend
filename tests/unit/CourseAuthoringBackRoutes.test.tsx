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
const mockAuth: any = {
  isAuthed: true,
  isHydrating: false,
  token: "synthetic",
  user: { id: "owner" }
};
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
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
    Object.assign(mockAuth, {
      isAuthed: true,
      isHydrating: false,
      token: "synthetic",
      user: { id: "owner" }
    });
    Object.keys(mockSearchParams).forEach((key) => delete mockSearchParams[key]);
  });

  it("uses the shared back header on course creation", () => {
    const CreateCourseRoute = require("@/app/courses/create").default;

    render(<CreateCourseRoute />);

    expect(screen.getByText("Boundary Create Course")).toBeTruthy();
    expect(screen.getByText("Shared Back /home/personal/courses")).toBeTruthy();
    expect(screen.getByText("Create course form shared back only")).toBeTruthy();
  });

  it("uses the shared back header on lesson creation and returns to personal courses", async () => {
    mockSearchParams.courseId = "course-123";
    mockGetCourse.mockResolvedValue({
      id: "course-123",
      _viewerOwnsCourse: true,
      lessons: []
    });
    const AddLessonRoute = require("@/app/courses/add-lesson").default;

    render(<AddLessonRoute />);

    expect(screen.getByText("Boundary Add Lesson")).toBeTruthy();
    expect(screen.getByText("Shared Back /home/personal/courses")).toBeTruthy();
    await screen.findByText("Add lesson form course-123");

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
      _viewerOwnsCourse: true,
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

  it("does not read while authentication is unresolved and discards the editor on sign-out", async () => {
    Object.assign(mockSearchParams, { courseId: "course-123", lessonId: "lesson-456" });
    mockAuth.isHydrating = true;
    mockGetCourse.mockResolvedValue({
      id: "course-123",
      _viewerOwnsCourse: true,
      lessons: [{ id: "lesson-456" }]
    });
    const Route = require("@/app/courses/edit-lesson").default;
    const view = render(<Route />);
    expect(mockGetCourse).not.toHaveBeenCalled();
    mockAuth.isHydrating = false;
    view.rerender(<Route />);
    await screen.findByText("Edit lesson form lesson-456");
    Object.assign(mockAuth, { isAuthed: false, token: null, user: null });
    view.rerender(<Route />);
    expect(screen.queryByText(/Edit lesson form/)).toBeNull();
    expect(screen.getByText("Sign in before editing course lessons.")).toBeTruthy();
    expect(mockGetCourse).toHaveBeenCalledTimes(1);
  });

  it.each(["add-lesson", "edit-lesson"])(
    "locks published course %s without rendering a form",
    async (route) => {
      Object.assign(mockSearchParams, { courseId: "course-123", lessonId: "lesson-456" });
      mockGetCourse.mockResolvedValue({
        id: "course-123",
        _viewerOwnsCourse: true,
        isPublished: true,
        lessons: [{ id: "lesson-456" }]
      });
      const Route =
        route === "add-lesson"
          ? require("@/app/courses/add-lesson").default
          : require("@/app/courses/edit-lesson").default;
      render(<Route />);
      await screen.findByText(/Unpublish this course before/);
      expect(screen.queryByText(/lesson form/)).toBeNull();
      expect(screen.queryByLabelText("Retry lesson editor")).toBeNull();
    }
  );

  it.each([
    { id: "wrong-course", _viewerOwnsCourse: true },
    { id: "course-123", _viewerOwnsCourse: false },
    { id: "course-123", _viewerOwnsCourse: true, lessons: [] }
  ])("does not render an unverified saved lesson: %p", async (course) => {
    Object.assign(mockSearchParams, { courseId: "course-123", lessonId: "lesson-456" });
    mockGetCourse.mockResolvedValue(course);
    const Route = require("@/app/courses/edit-lesson").default;
    render(<Route />);
    await screen.findByText("Lesson editor unavailable");
    expect(screen.queryByText(/Edit lesson form/)).toBeNull();
  });

  it("clears a previous lesson immediately on a failed new selection and supports Retry", async () => {
    Object.assign(mockSearchParams, {
      courseId: "course-123",
      lessonId: "lesson-456",
      from: "https://example.com"
    });
    mockGetCourse
      .mockResolvedValueOnce({
        id: "course-123",
        _viewerOwnsCourse: true,
        lessons: [{ id: "lesson-456" }]
      })
      .mockRejectedValueOnce(new Error("Read unavailable"));
    const Route = require("@/app/courses/edit-lesson").default;
    const view = render(<Route />);
    await screen.findByText("Edit lesson form lesson-456");
    mockSearchParams.lessonId = "lesson-789";
    view.rerender(<Route />);
    expect(screen.queryByText(/Edit lesson form/)).toBeNull();
    await screen.findByText("Read unavailable");
    expect(screen.getByText("Shared Back /courses?courseId=course-123")).toBeTruthy();
    mockGetCourse.mockResolvedValueOnce({
      id: "course-123",
      _viewerOwnsCourse: true,
      lessons: [{ id: "lesson-789" }]
    });
    fireEvent.press(screen.getByLabelText("Retry lesson editor"));
    await screen.findByText("Edit lesson form lesson-789");
    delete mockSearchParams.lessonId;
    view.rerender(<Route />);
    expect(screen.queryByText(/Edit lesson form/)).toBeNull();
    await screen.findByText("Lesson editor unavailable");
    expect(mockGetCourse).toHaveBeenCalledTimes(3);
  });

  it("ignores a superseded course response", async () => {
    Object.assign(mockSearchParams, { courseId: "course-123", lessonId: "lesson-456" });
    let resolveOld: any;
    mockGetCourse
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          })
      )
      .mockResolvedValueOnce({
        id: "course-new",
        _viewerOwnsCourse: true,
        lessons: [{ id: "lesson-new" }]
      });
    const Route = require("@/app/courses/edit-lesson").default;
    const view = render(<Route />);
    await waitFor(() => expect(mockGetCourse).toHaveBeenCalledTimes(1));
    Object.assign(mockSearchParams, { courseId: "course-new", lessonId: "lesson-new" });
    view.rerender(<Route />);
    await screen.findByText("Edit lesson form lesson-new");
    resolveOld({
      id: "course-123",
      _viewerOwnsCourse: true,
      lessons: [{ id: "lesson-456" }]
    });
    await waitFor(() =>
      expect(screen.queryByText("Edit lesson form lesson-456")).toBeNull()
    );
    expect(screen.getByText("Edit lesson form lesson-new")).toBeTruthy();
  });

  it.each([
    ["/home/commercial/courses", "/home/commercial/courses", "fallback"],
    [
      ["/home/commercial/courses", "https://example.com"],
      "/home/commercial/courses",
      "fallback"
    ],
    ["https://example.com", "/courses", "history"],
    ["/home/commercial/courses?next=elsewhere", "/courses", "history"],
    [["bad", "/home/commercial/courses"], "/courses", "history"]
  ])("keeps analytics Back source strict: %p", (from, destination, mode) => {
    mockSearchParams.from = from;
    const Route = require("@/app/courses/analytics").default;
    render(<Route />);
    expect(screen.getAllByText(`Shared Back ${destination}`)).toHaveLength(1);
    expect(screen.getByText(`Shared Back Mode ${mode}`)).toBeTruthy();
  });
});
