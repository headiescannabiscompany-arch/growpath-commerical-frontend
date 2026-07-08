import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import CoursesScreen from "@/screens/CoursesScreen";

const mockApiRequest = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ courseId: "course-2" }),
  useRouter: () => ({ push: jest.fn() })
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

jest.mock("@/screens/CourseDetailScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ route }: any) =>
    React.createElement(Text, null, `Course detail ${route?.params?.id || ""}`);
});

describe("CoursesScreen route params", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockResolvedValue({
      courses: [
        { id: "course-1", title: "Living Soil Basics", priceCents: 0 },
        { id: "course-2", title: "IPM Follow-up", priceCents: 0 }
      ]
    });
  });

  it("opens a linked personal course from the courseId query", async () => {
    const screen = render(<CoursesScreen />);

    await waitFor(() => expect(screen.getByLabelText("Selected course course-2")).toBeTruthy());
    expect(screen.getByText("Course detail course-2")).toBeTruthy();
  });
});
