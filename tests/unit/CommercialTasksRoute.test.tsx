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
  const { Text } = require("react-native");
  return {
    Link: ({ children, href }: any) =>
      React.createElement(
        React.Fragment,
        null,
        children,
        React.createElement(Text, { accessibilityLabel: `Commercial task link ${href}` })
      )
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
            },
            {
              id: "task-3",
              title: "Review launch alert",
              status: "open",
              sourceType: "alert",
              sourceId: "alert-1"
            },
            {
              id: "task-4",
              title: "Answer product Q&A",
              status: "open",
              sourceType: "forum",
              sourceId: "thread-product"
            },
            {
              id: "task-5",
              title: "Add lesson worksheet",
              status: "open",
              sourceType: "lesson",
              sourceId: "lesson-1",
              linkedCourseId: "course-1"
            },
            {
              id: "task-5b",
              title: "Review course assignment",
              status: "open",
              sourceType: "course_assignment",
              sourceId: "assignment-1",
              linkedCourseId: "course-1",
              linkedLessonId: "lesson-1",
              linkedCourseAssignmentId: "assignment-1"
            },
            {
              id: "task-6",
              title: "Prepare live demo",
              status: "open",
              sourceType: "live",
              linkedLiveId: "live-linked-1"
            },
            {
              id: "task-7",
              title: "Review linked batch",
              status: "open",
              sourceType: "product_batch",
              linkedProductId: "product-1",
              linkedProductBatchId: "batch-linked-1"
            },
            {
              id: "task-8",
              title: "Review feed campaign",
              status: "open",
              sourceType: "feed_campaign",
              linkedProductId: "product-1",
              linkedFeedPostId: "campaign-linked-1"
            },
            {
              id: "task-9",
              title: "Review linked trial evidence",
              status: "open",
              sourceType: "product_trial",
              linkedProductId: "product-1",
              linkedTrialId: "trial-linked-1"
            },
            {
              id: "task-10",
              title: "Review alert-linked product",
              status: "open",
              sourceType: "alert",
              sourceId: "alert-product-1",
              linkedProductId: "product-1"
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
    expect(screen.getByText("Review launch alert")).toBeTruthy();
    expect(screen.getByText("Answer product Q&A")).toBeTruthy();
    expect(screen.getByText("Add lesson worksheet")).toBeTruthy();
    expect(screen.getByText("Review course assignment")).toBeTruthy();
    expect(screen.getByText("Prepare live demo")).toBeTruthy();
    expect(screen.getByText("Review linked batch")).toBeTruthy();
    expect(screen.getByText("Review feed campaign")).toBeTruthy();
    expect(screen.getByText("Review linked trial evidence")).toBeTruthy();
    expect(screen.getByText("Review alert-linked product")).toBeTruthy();
    expect(screen.getByText(/Source ID: product-1/)).toBeTruthy();
    expect(screen.getByText(/Source ID: live-linked-1/)).toBeTruthy();
    expect(screen.getByText(/Source ID: batch-linked-1/)).toBeTruthy();
    expect(screen.getByText(/Source ID: campaign-linked-1/)).toBeTruthy();
    expect(screen.getByText(/Source ID: trial-linked-1/)).toBeTruthy();
    expect(
      screen.getByLabelText("Commercial task link /home/alerts?alertId=alert-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Commercial task link /forum/post/thread-product")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Commercial task link /home/commercial/courses/course-1?lessonId=lesson-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Commercial task link /home/commercial/courses/course-1?lessonId=lesson-1&assignmentId=assignment-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Commercial task link /home/commercial/lives?liveId=live-linked-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Commercial task link /home/commercial/products/product-1?batchId=batch-linked-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Commercial task link /home/commercial/feed?campaignId=campaign-linked-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Commercial task link /home/commercial/evidence-runs/trial-linked-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Commercial task link /home/alerts?alertId=alert-product-1")
    ).toBeTruthy();
    expect(
      screen.getAllByLabelText("Commercial task link /home/commercial/products/product-1")
        .length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByLabelText("View commercial task linked object").length
    ).toBeGreaterThan(0);
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
            linkedLiveId: "live-1",
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

  it("creates feed-campaign linked commercial tasks with campaign ids", async () => {
    const screen = render(<CommercialTasksRoute />);

    await waitFor(() => expect(screen.getByText("Commercial Task Center")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Commercial task title"),
      "Review campaign analytics"
    );
    fireEvent.press(screen.getByLabelText("Commercial task source feed_campaign"));
    fireEvent.changeText(
      screen.getByLabelText("Commercial task source ID"),
      "campaign-7"
    );
    fireEvent.press(screen.getByLabelText("Create commercial task"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Review campaign analytics",
            sourceType: "feed_campaign",
            sourceId: "campaign-7",
            linkedFeedCampaignId: "campaign-7",
            status: "open"
          })
        })
      )
    );
  });

  it("creates product-trial linked commercial tasks with both trial aliases", async () => {
    const screen = render(<CommercialTasksRoute />);

    await waitFor(() => expect(screen.getByText("Commercial Task Center")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Commercial task title"),
      "Review product trial"
    );
    fireEvent.press(screen.getByLabelText("Commercial task source product_trial"));
    fireEvent.changeText(screen.getByLabelText("Commercial task source ID"), "trial-7");
    fireEvent.press(screen.getByLabelText("Create commercial task"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Review product trial",
            sourceType: "product_trial",
            sourceId: "trial-7",
            linkedProductTrialId: "trial-7",
            linkedTrialId: "trial-7",
            status: "open"
          })
        })
      )
    );
  });

  it("creates course-assignment linked commercial tasks with assignment ids", async () => {
    const screen = render(<CommercialTasksRoute />);

    await waitFor(() => expect(screen.getByText("Commercial Task Center")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Commercial task title"),
      "Review course assignment"
    );
    fireEvent.press(screen.getByLabelText("Commercial task source course_assignment"));
    fireEvent.changeText(
      screen.getByLabelText("Commercial task source ID"),
      "assignment-7"
    );
    fireEvent.press(screen.getByLabelText("Create commercial task"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/tasks",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            workspaceType: "commercial",
            title: "Review course assignment",
            sourceType: "course_assignment",
            sourceId: "assignment-7",
            linkedCourseAssignmentId: "assignment-7",
            status: "open"
          })
        })
      )
    );
  });
});
