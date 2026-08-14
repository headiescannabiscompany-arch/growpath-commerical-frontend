import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CoursesRoute from "@/app/courses";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams: Record<string, string> = { courseId: "course-2" };
const mockAuthState = {
  isAuthed: true,
  user: { id: "course-user", growInterests: {} }
};

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuthState
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: jest.fn(), replace: mockReplace })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COMMERCIAL_HOME: "COMMERCIAL_HOME",
    COURSES_CREATE: "COURSES_CREATE"
  },
  useEntitlements: () => ({
    can: () => true,
    limits: {},
    mode: "personal",
    ready: true
  })
}));

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack }: any) =>
      React.createElement(
        View,
        null,
        showBack ? React.createElement(Text, null, "Shared catalog Back") : null,
        children
      )
  };
});

jest.mock("@/screens/CourseDetailScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ route }: any) =>
    React.createElement(Text, null, `Course detail ${route?.params?.id || ""}`);
});

describe("CoursesScreen route params", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSearchParams = { courseId: "course-2" };
    mockReplace.mockImplementation(() => {
      mockSearchParams = {};
    });
    mockApiRequest.mockImplementation(async (path: string) => {
      if (path === "/api/courses/mine") {
        return {
          courses: [
            {
              id: "course-2",
              title: "IPM Follow-up",
              priceCents: 0,
              status: "draft"
            }
          ]
        };
      }
      return {
        courses: [
          {
            id: "course-1",
            title: "Living Soil Basics",
            priceCents: 0,
            status: "published"
          }
        ]
      };
    });
  });

  it("opens a linked personal course from the courseId query", async () => {
    const screen = render(<CoursesRoute />);

    await waitFor(() =>
      expect(screen.getByLabelText("Selected course course-2")).toBeTruthy()
    );
    expect(screen.getByText("Course detail course-2")).toBeTruthy();
    expect(screen.getByText("Back to courses")).toBeTruthy();
    expect(screen.queryByText("Shared catalog Back")).toBeNull();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/courses/mine", {
      timeoutMs: 8000
    });

    fireEvent.press(screen.getByText("Back to courses"));

    await waitFor(() => expect(screen.getByText("Courses")).toBeTruthy());
    expect(screen.queryByText("Course detail course-2")).toBeNull();
    expect(screen.getByText("Shared catalog Back")).toBeTruthy();
    expect(mockReplace).toHaveBeenCalledWith("/courses");
  });
});
