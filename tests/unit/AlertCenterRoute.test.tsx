import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AlertCenterRoute from "@/app/home/alerts";

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

describe("AlertCenterRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/alerts" && options?.method === "GET") {
        return Promise.resolve({
          alerts: [
            {
              id: "alert-1",
              title: "Paid product missing Stripe price",
              message: "Publish is blocked until checkout is ready.",
              severity: "critical",
              status: "active",
              workspaceType: "commercial",
              sourceType: "product",
              sourceId: "product-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-2",
              title: "Replay available",
              severity: "info",
              status: "resolved",
              sourceType: "live",
              sourceId: "live-1"
            }
          ]
        });
      }
      if (path === "/api/tasks" && options?.method === "POST") {
        return Promise.resolve({ task: { id: "task-1", ...options.body } });
      }
      if (path === "/api/alerts/alert-1" && options?.method === "PATCH") {
        return Promise.resolve({ alert: { id: "alert-1", ...options.body } });
      }
      return Promise.resolve({});
    });
  });

  it("loads alerts, creates tasks, resolves, and snoozes", async () => {
    const screen = render(<AlertCenterRoute />);

    await waitFor(() => expect(screen.getByText("Alert Center")).toBeTruthy());
    expect(screen.getByText("Paid product missing Stripe price")).toBeTruthy();
    expect(screen.getByText(/Publish is blocked/)).toBeTruthy();
    expect(screen.getByText(/Source product/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Alert center quick date In 7 days"));
    fireEvent.press(
      screen.getByLabelText("Alert center reminder preset 24 hours before")
    );
    fireEvent.press(screen.getByLabelText("Create task from alert"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Follow up: Paid product missing Stripe price",
            dueAt: addDaysKey(7),
            priority: "critical",
            sourceType: "alert",
            sourceId: "alert-1",
            reminderPlan: { label: "24 hours before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(screen.getByText("Task created from alert.")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Resolve alert"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/alerts/alert-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({ status: "resolved" })
        })
      )
    );

    fireEvent.press(screen.getByLabelText("Snooze alert"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/alerts/alert-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            status: "snoozed",
            snoozedUntil: addDaysKey(7)
          })
        })
      )
    );
  });
});
