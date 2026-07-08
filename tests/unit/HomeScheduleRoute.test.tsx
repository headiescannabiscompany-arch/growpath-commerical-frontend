import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import HomeScheduleRoute from "@/app/home/schedule";

const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children)
  };
});

describe("HomeScheduleRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/tasks") {
        return Promise.resolve({
          tasks: [
            {
              id: "task-1",
              title: "Connect Stripe price",
              dueAt: "2020-01-01T10:00:00Z",
              status: "open",
              priority: "high",
              workspaceType: "commercial",
              sourceType: "product",
              sourceId: "product-1",
              reminderPlan: { label: "24 hours before" },
              recurrence: { rule: "weekly" }
            }
          ]
        });
      }
      if (path === "/api/commercial/lives") {
        return Promise.resolve({
          lives: [
            {
              id: "live-1",
              title: "Live Soil Demo",
              scheduledStart: "2099-07-17T20:00:00Z",
              scheduledEnd: "2099-07-17T21:00:00Z",
              reminderPreference: "1 hour before",
              recurrenceRule: "monthly",
              status: "scheduled"
            }
          ]
        });
      }
      if (path === "/api/commercial/courses") {
        return Promise.resolve({
          courses: [
            {
              id: "course-1",
              title: "Living Soil Basics",
              publishedAt: "2099-07-18T12:00:00Z",
              status: "published"
            }
          ]
        });
      }
      if (path === "/api/commercial/feed") {
        return Promise.resolve({
          items: [
            {
              id: "campaign-1",
              title: "Veg Mix Launch",
              startsAt: "2099-07-19T12:00:00Z",
              endsAt: "2099-07-26T12:00:00Z",
              reminderPreference: "24 hours before",
              recurrenceRule: "weekly",
              status: "scheduled",
              workspaceType: "commercial"
            }
          ]
        });
      }
      return Promise.resolve({});
    });
  });

  it("aggregates tasks, lives, course releases, and feed campaigns", async () => {
    const screen = render(<HomeScheduleRoute />);

    await waitFor(() => expect(screen.getByText("Schedule / Agenda")).toBeTruthy());
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/tasks", {
        method: "GET"
      })
    );
    expect(screen.getByText("Connect Stripe price")).toBeTruthy();
    expect(screen.getByText("Live Soil Demo")).toBeTruthy();
    expect(screen.getByText("Living Soil Basics")).toBeTruthy();
    expect(screen.getByText("Veg Mix Launch")).toBeTruthy();
    expect(screen.getByText("feed campaign")).toBeTruthy();
    expect(screen.getByText(/Ends 2099-07-17T21:00/)).toBeTruthy();
    expect(screen.getByText(/Ends 2099-07-26T12:00/)).toBeTruthy();
    expect(screen.getByText(/Reminder 1 hour before/)).toBeTruthy();
    expect(screen.getAllByText(/Reminder 24 hours before/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Repeats monthly/)).toBeTruthy();
    expect(screen.getAllByText(/Repeats weekly/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open Source").length).toBeGreaterThan(0);
  });
});
