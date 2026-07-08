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
      )
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
      return Promise.resolve({});
    });
  });

  it("loads notifications, filters by source, and marks one read", async () => {
    const screen = render(<NotificationCenterRoute />);

    await waitFor(() =>
      expect(screen.getByText("Live starts in 15 minutes")).toBeTruthy()
    );
    expect(screen.getByText(/Join the soil mixing demo/)).toBeTruthy();
    expect(screen.getByText(/Source live/)).toBeTruthy();
    expect(screen.queryByText("Task overdue")).toBeNull();

    fireEvent.press(screen.getByLabelText("Notification filter tasks"));
    expect(screen.getByText("Task overdue")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Notification filter all"));
    expect(screen.getByLabelText("Notification link /home/commercial/lives")).toBeTruthy();
    expect(
      screen.getByLabelText("Notification link /home/facility/tasks/task-1")
    ).toBeTruthy();
    expect(screen.getByLabelText("Notification link /home/personal/courses")).toBeTruthy();
    expect(screen.getByLabelText("Notification link /home/facility/rooms")).toBeTruthy();

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
