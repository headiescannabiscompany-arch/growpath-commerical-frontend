import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CreatorAnalyticsScreen from "@/screens/CreatorAnalyticsScreen";

jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
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
  it("renders real course funnel and engagement metrics", async () => {
    const screen = render(<CreatorAnalyticsScreen />);
    await waitFor(() => expect(screen.getByText("Living Soil Analytics")).toBeTruthy());
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
