import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialTasksRoute from "@/app/home/commercial/tasks";

const mockApiRequest = jest.fn();

function addDaysKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children)
  };
});

describe("CommercialTasksRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/tasks" && options?.method === "GET") {
        return Promise.resolve({
          tasks: [
            {
              id: "task-1",
              title: "Connect Stripe price",
              description: "Product cannot publish until Stripe is ready.",
              dueAt: "2020-01-01T10:00:00Z",
              priority: "high",
              status: "open",
              sourceType: "product",
              sourceId: "product-1",
              reminderPlan: { label: "24 hours before" },
              recurrence: { rule: "weekly" }
            },
            {
              id: "task-2",
              title: "Publish storefront",
              status: "complete",
              completed: true,
              sourceType: "storefront"
            }
          ]
        });
      }
      if (path === "/api/tasks" && options?.method === "POST") {
        return Promise.resolve({ task: { id: "task-new", ...options.body } });
      }
      if (path === "/api/tasks/task-1" && options?.method === "PATCH") {
        return Promise.resolve({ task: { id: "task-1", ...options.body } });
      }
      return Promise.resolve({});
    });
  });

  it("loads, creates, and completes source-linked commercial tasks", async () => {
    const screen = render(<CommercialTasksRoute />);

    await waitFor(() => expect(screen.getByText("Commercial Task Center")).toBeTruthy());
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/tasks", {
        method: "GET",
        params: { workspaceType: "commercial" }
      })
    );
    expect(screen.getByText("Connect Stripe price")).toBeTruthy();
    expect(screen.getByText("Publish storefront")).toBeTruthy();
    expect(screen.getByText(/Source ID: product-1/)).toBeTruthy();
    expect(screen.getByText(/Reminder: 24 hours before/)).toBeTruthy();
    expect(screen.getByText("feed campaign")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Commercial task title"), "Launch live");
    fireEvent.changeText(
      screen.getByLabelText("Commercial task description"),
      "Schedule product demo and replay follow-up."
    );
    fireEvent.press(screen.getByLabelText("Commercial task quick date In 7 days"));
    fireEvent.press(screen.getByLabelText("Commercial task source live"));
    fireEvent.changeText(screen.getByLabelText("Commercial task source ID"), "live-1");
    fireEvent.changeText(screen.getByLabelText("Commercial task assignee"), "user-1");
    fireEvent.press(
      screen.getByLabelText("Commercial task reminder preset 24 hours before")
    );
    fireEvent.press(
      screen.getByLabelText("Commercial task recurrence preset does not repeat")
    );
    fireEvent.press(screen.getByLabelText("Create commercial task"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Launch live",
            description: "Schedule product demo and replay follow-up.",
            dueAt: addDaysKey(7),
            priority: "normal",
            sourceType: "live",
            sourceId: "live-1",
            assignedToUserId: "user-1",
            reminderPlan: { label: "24 hours before", channels: ["in_app"] }
          })
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Commercial task created.")).toBeTruthy()
    );

    fireEvent.press(screen.getAllByLabelText("Complete commercial task")[0]);
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks/task-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            status: "complete",
            completed: true,
            completedAt: expect.any(String)
          })
        })
      )
    );
  });
});
