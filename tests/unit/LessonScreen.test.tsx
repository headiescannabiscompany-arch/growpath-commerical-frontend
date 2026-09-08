import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import LessonScreen from "@/screens/LessonScreen";

jest.mock("@/api/courses", () => ({ completeLesson: jest.fn() }));
jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  return function MockScreenContainer({ children }: any) {
    return React.createElement(React.Fragment, null, children);
  };
});
jest.mock("@/components/learning/LessonMediaCard", () => () => null);
jest.mock("@/components/learning/AuthorizedCourseImage", () => {
  const React = require("react");
  const { Image } = require("react-native");
  return ({ uri, ...props }: any) =>
    React.createElement(Image, { ...props, source: { uri: `authorized:${uri}` } });
});
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ mode: "personal" })
}));
jest.mock("@/features/learning/learningAccess", () => ({
  getLearningAccess: () => ({ canViewCourses: true })
}));

describe("LessonScreen documents", () => {
  it("opens every unique document while preserving the canonical order", async () => {
    const firstDocument = "https://example.com/lesson-one.pdf";
    const secondDocument = "https://example.com/lesson-two.pdf";
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const screen = render(
      <LessonScreen
        route={{
          params: {
            lesson: {
              _id: "lesson-1",
              title: "Build the mix",
              pdfUrl: firstDocument,
              documentUrls: [firstDocument, ` ${firstDocument} `, secondDocument]
            }
          }
        }}
        navigation={{ goBack: jest.fn() }}
      />
    );

    fireEvent.press(screen.getByLabelText("Open Lesson Document 1 of 2"));
    fireEvent.press(screen.getByLabelText("Open Lesson Document 2 of 2"));

    await waitFor(() => expect(openUrl).toHaveBeenCalledTimes(2));
    expect(openUrl).toHaveBeenNthCalledWith(1, firstDocument);
    expect(openUrl).toHaveBeenNthCalledWith(2, secondDocument);
    expect(screen.queryByText("Open PDF Lesson")).toBeNull();
  });

  it("renders Facility lesson images through the authorized image component", () => {
    const protectedImage = "/api/course-media/64f000000000000000000993/file";
    const screen = render(
      <LessonScreen
        route={{
          params: {
            facilityManagedCourse: true,
            lesson: {
              _id: "lesson-1",
              title: "Protected image lesson",
              imageUrls: [protectedImage]
            }
          }
        }}
        navigation={{ goBack: jest.fn() }}
      />
    );

    expect(screen.getByLabelText("Protected image lesson image 1").props.source).toEqual({
      uri: `authorized:${protectedImage}`
    });
  });
});
