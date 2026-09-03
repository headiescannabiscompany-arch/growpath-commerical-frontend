import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CoursesRoute from "@/app/courses";
import { rememberPendingBuyerCheckout } from "@/utils/buyerCheckoutRecovery";

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
  return function MockPersonalFeedPlacement() {
    return React.createElement(View, { testID: "personal-feed-placement" });
  };
});

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: function MockScreenBoundary({ children, showBack }: any) {
      return React.createElement(
        View,
        null,
        showBack ? React.createElement(Text, null, "Shared catalog Back") : null,
        children
      );
    }
  };
});

jest.mock("@/screens/CourseDetailScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockCourseDetailScreen({ route }: any) {
    return React.createElement(Text, null, `Course detail ${route?.params?.id || ""}`);
  };
});

describe("CoursesScreen route params", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const storage = new Map<string, string>();
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      return storage.get(key) ?? null;
    });
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      storage.set(key, value);
    });
    jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => {
      storage.delete(key);
    });
    jest.mocked(AsyncStorage.clear).mockImplementation(async () => {
      storage.clear();
    });
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
      timeoutMs: 8000,
      retries: 0
    });

    fireEvent.press(screen.getByText("Back to courses"));

    await waitFor(() => expect(screen.getByText("Courses")).toBeTruthy());
    expect(screen.queryByText("Course detail course-2")).toBeNull();
    expect(screen.getByText("Shared catalog Back")).toBeTruthy();
    expect(mockReplace).toHaveBeenCalledWith("/courses");
  });

  it("accepts the legacy course return key and restores a stored selection when omitted", async () => {
    mockSearchParams = { checkout: "success", course: "course-1" };
    const legacy = render(<CoursesRoute />);

    await waitFor(() =>
      expect(legacy.getByLabelText("Selected course course-1")).toBeTruthy()
    );
    legacy.unmount();

    mockSearchParams = { checkout: "success" };
    await rememberPendingBuyerCheckout("course", "course-1", "/courses");
    const recovered = render(<CoursesRoute />);

    await waitFor(() =>
      expect(recovered.getByLabelText("Selected course course-1")).toBeTruthy()
    );
  });

  it("loads an authorized reported course directly when catalogs omit it", async () => {
    mockSearchParams = { courseId: "reported-course", moderationCaseId: "case-1" };
    mockApiRequest.mockImplementation(async (path: string) => {
      if (path === "/api/courses/reported-course") {
        return {
          id: "reported-course",
          title: "Reported draft course",
          priceCents: 0,
          status: "draft"
        };
      }
      return { courses: [] };
    });

    const screen = render(<CoursesRoute />);

    await waitFor(() =>
      expect(screen.getByLabelText("Selected course reported-course")).toBeTruthy()
    );
    expect(mockApiRequest).toHaveBeenCalledWith("/api/courses/reported-course");
    expect(screen.getByText("Course detail reported-course")).toBeTruthy();
  });

  it("explains stale reported content and returns to the focused moderation case", async () => {
    mockSearchParams = { courseId: "removed-course", moderationCaseId: "case-2" };
    mockApiRequest.mockImplementation(async (path: string) => {
      if (path === "/api/courses/removed-course") {
        throw new Error("Course not found");
      }
      return { courses: [] };
    });

    const screen = render(<CoursesRoute />);

    await waitFor(() =>
      expect(screen.getByText("Reported course is unavailable")).toBeTruthy()
    );
    expect(screen.queryByText("No courses found")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Return to moderation queue" }));
    expect(mockReplace).toHaveBeenCalledWith("/admin?moderationCaseId=case-2");
  });
});
