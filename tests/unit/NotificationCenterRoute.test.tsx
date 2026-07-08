import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import NotificationCenterRoute from "@/app/home/notifications";

const mockApiRequest = jest.fn();

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
        React.createElement(Text, { accessibilityLabel: `Notification link ${href}` })
      ),
    useLocalSearchParams: () => ({ notificationId: "notification-1" })
  };
});

describe("NotificationCenterRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/notifications" && options?.method === "GET") {
        return Promise.resolve({
          notifications: [
            {
              id: "notification-1",
              title: "Live starts in 15 minutes",
              message: "Join the soil mixing demo.",
              sourceType: "live",
              sourceId: "live-1",
              workspaceType: "commercial",
              channel: "in_app",
              read: false
            },
            {
              id: "notification-2",
              title: "Task overdue",
              message: "Check Flower Room 1.",
              sourceType: "task",
              sourceId: "task-1",
              workspaceType: "facility",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-3",
              title: "Course update",
              message: "A new lesson is ready.",
              sourceType: "course",
              sourceId: "course-1",
              workspaceType: "personal",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-4",
              title: "Room alert resolved",
              message: "Flower Room 1 is back in range.",
              sourceType: "room",
              workspaceType: "facility",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-5",
              title: "Forum reply",
              message: "Someone answered your product question.",
              sourceType: "forum",
              sourceId: "thread-product",
              workspaceType: "personal",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-6",
              title: "Facility run review",
              message: "Batch review is ready.",
              sourceType: "facility_run",
              sourceId: "run-1",
              workspaceType: "facility",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-7",
              title: "SOP task",
              message: "Review retraining.",
              sourceType: "sop",
              sourceId: "sop-1",
              workspaceType: "facility",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-8",
              title: "Public product update",
              message: "A followed product has an update.",
              sourceType: "product",
              sourceId: "veg-mix-1",
              workspaceType: "personal",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-9",
              title: "Facility inventory alert",
              message: "Input stock needs review.",
              sourceType: "product",
              sourceId: "input-1",
              workspaceType: "facility",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-10",
              title: "Personal live reminder",
              message: "A followed live starts soon.",
              sourceType: "live",
              sourceId: "live-public-1",
              workspaceType: "personal",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-11",
              title: "Recipe task created",
              message: "Review the saved soil recipe.",
              sourceType: "recipe",
              sourceId: "recipe-1",
              workspaceType: "personal",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-12",
              title: "Campaign scheduled",
              message: "The feed campaign is ready.",
              sourceType: "feed_campaign",
              sourceId: "campaign-1",
              workspaceType: "commercial",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-13",
              title: "Trial evidence ready",
              message: "Review the product trial.",
              sourceType: "product_trial",
              sourceId: "trial-1",
              workspaceType: "commercial",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-14",
              title: "Order paid",
              message: "Fulfillment can start.",
              sourceType: "order",
              sourceId: "order-1",
              workspaceType: "commercial",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-15",
              title: "Facility tool run summary",
              message: "AI tool output is ready.",
              sourceType: "toolrun",
              sourceId: "toolrun-1",
              workspaceType: "facility",
              readAt: "2026-07-07T12:00:00.000Z"
            },
            {
              id: "notification-16",
              title: "Linked batch notification",
              message: "A product batch needs review.",
              sourceType: "product_batch",
              linkedProductBatchId: "batch-linked-1",
              workspaceType: "personal",
              readAt: "2026-07-07T12:00:00.000Z"
            }
          ]
        });
      }
      if (
        path === "/api/notifications/read/notification-1" &&
        options?.method === "POST"
      ) {
        return Promise.resolve({ ok: true });
      }
      if (path === "/api/notifications/read-all" && options?.method === "POST") {
        return Promise.resolve({ ok: true });
      }
      if (path === "/api/tasks" && options?.method === "POST") {
        return Promise.resolve({ task: { id: "task-notification", ...options.body } });
      }
      return Promise.resolve({});
    });
  });

  it("loads notifications, filters by source, and marks one read", async () => {
    const screen = render(<NotificationCenterRoute />);

    await waitFor(() =>
      expect(screen.getByText("Live starts in 15 minutes")).toBeTruthy()
    );
    expect(screen.getByText(/Join the soil mixing demo/)).toBeTruthy();
    expect(screen.getByLabelText("Focused notification notification-1")).toBeTruthy();
    expect(screen.getByText(/Source live/)).toBeTruthy();
    expect(screen.queryByText("Task overdue")).toBeNull();

    fireEvent.press(screen.getByLabelText("Notification filter tasks"));
    expect(screen.getByText("Task overdue")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Notification filter all"));
    expect(
      screen.getByLabelText("Notification link /home/commercial/lives?liveId=live-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Notification link /home/facility/tasks/task-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Notification link /home/personal/courses?courseId=course-1")
    ).toBeTruthy();
    expect(screen.getByLabelText("Notification link /home/facility/rooms")).toBeTruthy();
    expect(
      screen.getByLabelText("Notification link /forum/post/thread-product")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Notification link /home/facility/grows/run-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Notification link /home/facility/sop-runs/sop-1")
    ).toBeTruthy();
    expect(screen.getByLabelText("Notification link /store?q=veg-mix-1")).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Notification link /home/facility/InventoryItemDetailScreen?id=input-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Notification link /feed?liveId=live-public-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Notification link /home/personal/tools/saved-runs?toolRunId=recipe-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Notification link /home/commercial/feed?campaignId=campaign-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Notification link /home/commercial/trials/trial-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Notification link /home/commercial/orders?orderId=order-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Notification link /home/facility/ai-tools?toolRunId=toolrun-1"
      )
    ).toBeTruthy();
    expect(screen.getByLabelText("Notification link /store?q=batch-linked-1")).toBeTruthy();

    fireEvent.press(screen.getAllByLabelText("Create task from notification")[0]);
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Follow up: Live starts in 15 minutes",
            sourceType: "notification",
            sourceId: "notification-1",
            linkedNotificationId: "notification-1",
            notificationSourceType: "live",
            notificationSourceId: "live-1",
            linkedLiveId: "live-1",
            priority: "normal",
            status: "open"
          })
        })
      )
    );
    expect(screen.getByText("Task created from notification.")).toBeTruthy();

    const createButtons = screen.getAllByLabelText("Create task from notification");
    expect(createButtons).toHaveLength(16);
    await waitFor(() => expect(createButtons[15].props.disabled).toBeFalsy());
    fireEvent.press(createButtons[15]);
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenLastCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "personal",
            title: "Follow up: Linked batch notification",
            sourceType: "notification",
            sourceId: "notification-16",
            linkedNotificationId: "notification-16",
            notificationSourceType: "product_batch",
            notificationSourceId: "batch-linked-1",
            linkedProductBatchId: "batch-linked-1",
            priority: "normal",
            status: "open"
          })
        })
      )
    );

    fireEvent.press(screen.getByLabelText("Notification filter unread"));
    fireEvent.press(screen.getByLabelText("Mark notification read"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/notifications/read/notification-1",
        { method: "POST" }
      )
    );
    expect(screen.getByText("Notification marked read.")).toBeTruthy();
  });

  it("marks all unread notifications read", async () => {
    const screen = render(<NotificationCenterRoute />);

    await waitFor(() =>
      expect(screen.getByText("Live starts in 15 minutes")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Mark all notifications read"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/notifications/read-all", {
        method: "POST"
      })
    );
    expect(screen.getByText("All notifications marked read.")).toBeTruthy();
  });
});
