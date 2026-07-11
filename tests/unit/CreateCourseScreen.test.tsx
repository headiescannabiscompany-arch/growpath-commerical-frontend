import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CreateCourseScreen from "@/screens/commercial/CreateCourseScreen";

const mockCreateCourse = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/api/courses", () => ({
  createCourse: (...args: any[]) => mockCreateCourse(...args)
}));

jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  const { ScrollView, View } = require("react-native");
  return ({ children, scroll }: any) =>
    scroll
      ? React.createElement(ScrollView, null, children)
      : React.createElement(View, null, children);
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COURSES_VIEW: "COURSES_VIEW",
    COURSES_CREATE: "COURSES_CREATE",
    COURSES_SELL_PAID: "COURSES_SELL_PAID",
    SEE_PAID_COURSES: "SEE_PAID_COURSES",
    PUBLISH_COURSES: "PUBLISH_COURSES",
    COURSES_ANALYTICS: "COURSES_ANALYTICS",
    COURSES_CERTIFICATES: "COURSES_CERTIFICATES"
  },
  useEntitlements: () => ({
    mode: "personal",
    limits: { maxPaidCourses: 1, maxLessonsPerCourse: 12 },
    can: (capability: string) => capability === "COURSES_VIEW"
  })
}));

describe("CreateCourseScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockCreateCourse.mockResolvedValue({ id: "course-new", title: "Living Soil 101" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the full course builder workflow", () => {
    const screen = render(<CreateCourseScreen />);

    expect(screen.getByText("Back to Courses")).toBeTruthy();
    expect(screen.getAllByText(/1\. Course basics/).length).toBeGreaterThan(0);
    expect(screen.getByText("2. Curriculum / lessons")).toBeTruthy();
    expect(screen.getByText("3. Documents / media")).toBeTruthy();
    expect(screen.getByText("4. Live sessions")).toBeTruthy();
    expect(screen.getByText("5. Links")).toBeTruthy();
    expect(screen.getByText("6. Pricing / access")).toBeTruthy();
    expect(screen.getByText("7. Preview / publish")).toBeTruthy();
    expect(screen.getByText("Lessons: 0 / plan limit")).toBeTruthy();
  });

  it("creates structured draft payloads for lessons, documents, lives, and links", async () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Living Soil 101");
    fireEvent.changeText(
      screen.getByLabelText("Course summary"),
      "Build a reusable soil."
    );
    fireEvent.changeText(
      screen.getByLabelText("Course description"),
      "A practical course."
    );
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Basics\nAmendments"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course documents"),
      "Worksheet PDF\nSoil checklist"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course media plan"),
      "Two 20 minute videos"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course live sessions"),
      "Live Q&A\nRecipe review"
    );
    fireEvent.changeText(
      screen.getByLabelText("Linked product ids"),
      "product-1\nproduct-2"
    );
    fireEvent.changeText(screen.getByLabelText("Linked grow ids"), "grow-1");
    fireEvent.changeText(screen.getByLabelText("Linked forum thread ids"), "thread-1");
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Living Soil 101",
        status: "draft",
        isPublished: false,
        access: "free",
        workspace: "personal",
        mediaPlan: "Two 20 minute videos",
        linkedProductIds: ["product-1", "product-2"],
        linkedGrowIds: ["grow-1"],
        linkedForumThreadIds: ["thread-1"],
        lessons: [
          expect.objectContaining({ title: "Basics", order: 1, status: "draft" }),
          expect.objectContaining({ title: "Amendments", order: 2, status: "draft" })
        ],
        documents: [
          expect.objectContaining({ title: "Worksheet PDF", status: "planned" }),
          expect.objectContaining({ title: "Soil checklist", status: "planned" })
        ],
        liveSessions: [
          expect.objectContaining({ title: "Live Q&A", status: "scheduled" }),
          expect.objectContaining({ title: "Recipe review", status: "scheduled" })
        ],
        authoringPlan: expect.objectContaining({
          step: "draft",
          requiredSteps: expect.arrayContaining([
            "basics",
            "curriculum",
            "documents_media",
            "live_sessions",
            "links",
            "pricing_access",
            "preview_publish"
          ])
        })
      })
    );
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/courses");
  });
});
