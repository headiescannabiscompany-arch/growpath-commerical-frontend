import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CreatorAnalyticsScreen, {
  createCreatorAnalyticsStyles
} from "@/screens/CreatorAnalyticsScreen";
import { getThemePalette } from "@/theme/appTheme";

jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockScreenContainer({ children }: any) {
    return React.createElement(View, null, children);
  };
});

jest.mock("@/api/creator", () => ({
  getCreatorCourses: () =>
    Promise.resolve([{ _id: "course-1", title: "Living Soil Analytics" }]),
  getCourseAnalytics: () =>
    Promise.resolve({
      summary: {
        views: 14,
        uniqueViewers: 8,
        enrollments: 6,
        completions: 2,
        avgProgress: 58,
        sales: 3,
        grossSales: 60,
        creatorEarnings: 48,
        assignmentTasks: 4,
        assignmentTasksCompleted: 3,
        liveRsvps: 5,
        productClicks: 9,
        questions: 4,
        unansweredQuestions: 1
      },
      lessons: [
        {
          id: "lesson-1",
          title: "Build a Mix",
          views: 10,
          completionRate: 67,
          dropoffs: 2
        }
      ]
    })
}));

describe("CreatorAnalyticsScreen", () => {
  it("uses the active Night palette for the course list and analytics detail", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createCreatorAnalyticsStyles(palette);

    expect(styles.header.color).toBe(palette.text);
    expect(styles.courseItem.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.courseItem.borderColor).toBe(palette.border);
    expect(styles.courseItemText.color).toBe(palette.text);
    expect(styles.analyticsCard.backgroundColor).toBe(palette.card);
    expect(styles.analyticsLabel.color).toBe(palette.textSoft);
  });

  it("renders real course funnel and engagement metrics", async () => {
    const screen = render(<CreatorAnalyticsScreen />);
    await waitFor(() => expect(screen.getByText("Living Soil Analytics")).toBeTruthy());
    expect(screen.getByRole("header", { name: "Course Analytics" })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "View analytics for Living Soil Analytics"
      })
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Living Soil Analytics"));

    await waitFor(() => expect(screen.getByText("Views: 14 (8 unique)")).toBeTruthy());
    expect(screen.getByText("Enrollments: 6")).toBeTruthy();
    expect(screen.getByText("Completions: 2")).toBeTruthy();
    expect(screen.getByText("Average Progress: 58%")).toBeTruthy();
    expect(
      screen.getByText(/Sales: 3.*Gross: \$60\.00.*Earnings: \$48\.00/)
    ).toBeTruthy();
    expect(screen.getByText("Assignment Tasks: 3/4 complete")).toBeTruthy();
    expect(screen.getByText("Live RSVPs: 5 | Product Clicks: 9")).toBeTruthy();
    expect(screen.getByText("Questions: 4 | Unanswered: 1")).toBeTruthy();
    expect(screen.getByText("Build a Mix")).toBeTruthy();
    expect(screen.getByText("10 views | 67% complete | 2 drop-offs")).toBeTruthy();
  });
});
