import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CoursesScreen from "@/screens/CoursesScreen";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "learner", growInterests: {} } })
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockPush })
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

describe("CoursesScreen commercial discovery", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockImplementation(async (path: string) => {
      if (path === "/api/commercial/courses/public") {
        return {
          courses: [
            {
              id: "commercial-course-1",
              title: "Living Soil Product School",
              price: 0,
              status: "published",
              sourceType: "commercial_course",
              storefrontSlug: "soil-school"
            }
          ]
        };
      }
      return { courses: [] };
    });
  });

  it("loads published commercial courses and opens their storefront detail", async () => {
    const screen = render(<CoursesScreen />);

    await waitFor(() =>
      expect(screen.getByText("Living Soil Product School")).toBeTruthy()
    );
    expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/courses/public");

    fireEvent.press(screen.getByText("Living Soil Product School"));

    expect(mockPush).toHaveBeenCalledWith(
      "/store/soil-school/courses/commercial-course-1"
    );
  });
});
