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
      ),
    useLocalSearchParams: () => ({ alertId: "alert-1" })
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
            },
            {
              id: "alert-7",
              title: "Product reply from followed brand",
              severity: "info",
              status: "active",
              workspaceType: "personal",
              sourceType: "product",
              sourceId: "veg-mix-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-8",
              title: "Course lesson unlocked",
              severity: "info",
              status: "active",
              workspaceType: "personal",
              sourceType: "course",
              sourceId: "course-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-9",
              title: "Facility input stock alert",
              severity: "warning",
              status: "active",
              workspaceType: "facility",
              sourceType: "product",
              sourceId: "input-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-10",
              title: "Recipe timeline needs review",
              severity: "warning",
              status: "active",
              workspaceType: "personal",
              sourceType: "recipe",
              sourceId: "recipe-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-11",
              title: "Feed campaign destination is broken",
              severity: "critical",
              status: "active",
              workspaceType: "commercial",
              sourceType: "feed_campaign",
              sourceId: "campaign-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-12",
              title: "Product trial follow-up overdue",
              severity: "warning",
              status: "active",
              workspaceType: "commercial",
              sourceType: "product_trial",
              sourceId: "trial-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-13",
              title: "Order needs fulfillment",
              severity: "urgent",
              status: "active",
              workspaceType: "commercial",
              sourceType: "order",
              sourceId: "order-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-14",
              title: "Sensor alert follow-up",
              severity: "urgent",
              status: "active",
              workspaceType: "facility",
              sourceType: "sensor_alert",
              sourceId: "sensor-alert-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-15",
              title: "Linked batch alert",
              message: "A product batch needs follow-up.",
              severity: "warning",
              status: "active",
              workspaceType: "personal",
              sourceType: "product_batch",
              linkedProductBatchId: "batch-linked-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-16",
              title: "Linked campaign alert",
              message: "A feed campaign needs follow-up.",
              severity: "warning",
              status: "active",
              workspaceType: "commercial",
              sourceType: "feed_campaign",
              linkedFeedCampaignId: "campaign-linked-1",
              createdAt: new Date().toISOString()
            },
            {
              id: "alert-17",
              title: "Linked trial alert",
              message: "A product trial evidence run needs follow-up.",
              severity: "warning",
              status: "active",
              workspaceType: "commercial",
              sourceType: "product_trial",
              linkedTrialId: "trial-linked-1",
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
    expect(screen.getByLabelText("Focused alert alert-1")).toBeTruthy();
    expect(screen.getAllByText(/Source product/).length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Alert link /home/commercial/products/product-1")
    ).toBeTruthy();
    expect(screen.getByLabelText("Alert link /home/facility/tasks/task-1")).toBeTruthy();
    expect(screen.getByLabelText("Alert link /forum/post/thread-sop")).toBeTruthy();
    expect(screen.getByLabelText("Alert link /home/facility/grows/run-1")).toBeTruthy();
    expect(
      screen.getByLabelText("Alert link /home/facility/sop-runs/sop-1")
    ).toBeTruthy();
    expect(screen.getByLabelText("Alert link /store?q=veg-mix-1")).toBeTruthy();
    expect(
      screen.getByLabelText("Alert link /home/personal/courses?courseId=course-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Alert link /home/facility/inventory/input-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Alert link /home/personal/tools/saved-runs?toolRunId=recipe-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Alert link /home/commercial/feed?campaignId=campaign-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Alert link /home/commercial/feed?campaignId=campaign-linked-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Alert link /home/commercial/trials/trial-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Alert link /home/commercial/trials/trial-linked-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Alert link /home/commercial/orders?orderId=order-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Alert link /home/alerts?alertId=sensor-alert-1")
    ).toBeTruthy();
    expect(screen.getByLabelText("Alert link /store?q=batch-linked-1")).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Alert link /home/commercial?ai=alerts&alertId=alert-1&sourceType=product"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Alert link /home/facility/ai-ask?preset=alerts&alertId=alert-2&sourceType=task"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Alert link /home/personal/ai?alertId=alert-7&sourceType=product"
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Alert center quick date In 7 days"));
    fireEvent.press(
      screen.getByLabelText("Alert center reminder preset 24 hours before")
    );
    fireEvent.changeText(screen.getByLabelText("Alert task assignee"), "owner-1");
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
            assignedToUserId: "owner-1",
            reminderPlan: { label: "24 hours before", channels: ["in_app"] }
          })
        })
      )
    );
    expect(screen.getByText("Task created from alert.")).toBeTruthy();

    const createButtons = screen.getAllByLabelText("Create task from alert");
    expect(createButtons).toHaveLength(16);
    fireEvent.press(createButtons[13]);
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenLastCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "personal",
            title: "Follow up: Linked batch alert",
            sourceType: "alert",
            sourceId: "alert-15",
            linkedAlertId: "alert-15",
            alertSourceType: "product_batch",
            alertSourceId: "batch-linked-1",
            linkedProductBatchId: "batch-linked-1",
            priority: "normal",
            status: "open"
          })
        })
      )
    );
    fireEvent.press(createButtons[14]);
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenLastCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Follow up: Linked campaign alert",
            sourceType: "alert",
            sourceId: "alert-16",
            linkedAlertId: "alert-16",
            alertSourceType: "feed_campaign",
            alertSourceId: "campaign-linked-1",
            linkedFeedCampaignId: "campaign-linked-1",
            priority: "normal",
            status: "open"
          })
        })
      )
    );
    fireEvent.press(createButtons[15]);
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenLastCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Follow up: Linked trial alert",
            sourceType: "alert",
            sourceId: "alert-17",
            linkedAlertId: "alert-17",
            alertSourceType: "product_trial",
            alertSourceId: "trial-linked-1",
            linkedProductTrialId: "trial-linked-1",
            linkedTrialId: "trial-linked-1",
            priority: "normal",
            status: "open"
          })
        })
      )
    );

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
