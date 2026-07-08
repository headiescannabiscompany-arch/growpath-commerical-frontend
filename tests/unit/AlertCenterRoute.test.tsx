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
  const { Text } = require("react-native");
  return {
    Link: ({ children, href }: any) =>
      React.createElement(
        React.Fragment,
        null,
        children,
        React.createElement(Text, { accessibilityLabel: `Alert link ${href}` })
      )
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
              title: "Facility task overdue",
              severity: "urgent",
              status: "active",
              workspaceType: "facility",
              sourceType: "task",
              sourceId: "task-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-3",
              title: "Replay available",
              severity: "info",
              status: "resolved",
              sourceType: "live",
              sourceId: "live-1"
            },
            {
              id: "alert-4",
              title: "Facility SOP question needs response",
              severity: "warning",
              status: "active",
              workspaceType: "facility",
              sourceType: "forum",
              sourceId: "thread-sop",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-5",
              title: "Facility run needs review",
              severity: "warning",
              status: "active",
              workspaceType: "facility",
              sourceType: "facility_run",
              sourceId: "run-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-6",
              title: "SOP retraining due",
              severity: "warning",
              status: "active",
              workspaceType: "facility",
              sourceType: "sop",
              sourceId: "sop-1",
              createdAt: new Date().toISOString()
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
    expect(
      screen.getByLabelText("Alert link /home/commercial/products/product-1")
    ).toBeTruthy();
    expect(screen.getByLabelText("Alert link /home/facility/tasks/task-1")).toBeTruthy();
    expect(screen.getByLabelText("Alert link /forum/post/thread-sop")).toBeTruthy();
    expect(screen.getByLabelText("Alert link /home/facility/grows/run-1")).toBeTruthy();
    expect(screen.getByLabelText("Alert link /home/facility/sop-runs")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Alert center quick date In 7 days"));
    fireEvent.press(
      screen.getByLabelText("Alert center reminder preset 24 hours before")
    );
    fireEvent.press(screen.getAllByLabelText("Create task from alert")[0]);

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
            linkedAlertId: "alert-1",
            alertSourceType: "product",
            alertSourceId: "product-1",
            linkedProductId: "product-1",
            reminderPlan: { label: "24 hours before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(screen.getByText("Task created from alert.")).toBeTruthy();

    fireEvent.press(screen.getAllByLabelText("Resolve alert")[0]);
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/alerts/alert-1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({ status: "resolved" })
        })
      )
    );

    fireEvent.press(screen.getAllByLabelText("Snooze alert")[0]);
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
