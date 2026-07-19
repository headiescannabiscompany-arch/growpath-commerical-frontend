import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import HomeScheduleRoute from "@/app/home/schedule";

const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) =>
      React.isValidElement(children)
        ? React.cloneElement(children, { testID: `link-${href}` })
        : React.createElement(React.Fragment, null, children)
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
            },
            {
              id: "task-2",
              title: "Review personal grow task",
              dueAt: "2099-07-16T10:00:00Z",
              status: "open",
              priority: "normal"
            },
            {
              id: "task-3",
              title: "Check saved recipe release curve",
              dueAt: "2099-07-16T11:00:00Z",
              status: "open",
              workspaceType: "personal",
              sourceType: "recipe",
              sourceId: "recipe-1"
            },
            {
              id: "task-4",
              title: "Review product trial evidence",
              dueAt: "2099-07-16T12:00:00Z",
              status: "open",
              workspaceType: "commercial",
              sourceType: "product_trial",
              sourceId: "trial-1"
            },
            {
              id: "task-5",
              title: "Fulfill storefront order",
              dueAt: "2099-07-16T13:00:00Z",
              status: "open",
              workspaceType: "commercial",
              sourceType: "order",
              sourceId: "order-1"
            },
            {
              id: "task-6",
              title: "Inspect sensor alert",
              dueAt: "2099-07-16T14:00:00Z",
              status: "open",
              workspaceType: "facility",
              sourceType: "sensor_alert",
              sourceId: "sensor-alert-1"
            },
            {
              id: "task-7",
              title: "Review linked product batch",
              dueAt: "2099-07-16T15:00:00Z",
              status: "open",
              workspaceType: "personal",
              sourceType: "product_batch",
              linkedProductBatchId: "batch-linked-1"
            },
            {
              id: "task-8",
              title: "Investigate linked sensor alert",
              dueAt: "2099-07-16T16:00:00Z",
              status: "open",
              workspaceType: "facility",
              linkedSensorAlertId: "sensor-alert-linked-1"
            },
            {
              id: "task-9",
              title: "Launch linked campaign follow-up",
              dueAt: "2099-07-16T17:00:00Z",
              status: "open",
              workspaceType: "commercial",
              linkedFeedCampaignId: "campaign-linked-1"
            },
            {
              id: "task-10",
              title: "Review linked trial evidence",
              dueAt: "2099-07-16T18:00:00Z",
              status: "open",
              workspaceType: "commercial",
              linkedTrialId: "trial-linked-1"
            },
            {
              id: "task-11",
              title: "Complete linked course assignment",
              dueAt: "2099-07-16T19:00:00Z",
              status: "open",
              workspaceType: "personal",
              linkedCourseId: "course-assignment-parent",
              linkedCourseAssignmentId: "assignment-linked-1"
            },
            {
              id: "task-12",
              title: "Review public storefront launch",
              dueAt: "2099-07-16T20:00:00Z",
              status: "open",
              workspaceType: "personal",
              linkedStorefrontSlug: "living-soil-labs"
            },
            {
              id: "task-13",
              title: "Flip to flower",
              dueAt: "2099-07-16T21:00:00Z",
              status: "open",
              priority: "high",
              workspaceType: "personal",
              growId: "grow-1",
              linkedGrowId: "grow-1",
              sourceType: "tool_run",
              sourceObjectId: "toolrun-calendar-1",
              linkedToolRunId: "toolrun-calendar-1",
              allDay: true,
              calendarType: "grow_milestone",
              sourceStage: "transition",
              reminderPlan: { label: "24 hours before", channels: ["in_app"] }
            },
            {
              id: "task-14",
              title: "Follow up on notification",
              dueAt: "2099-07-16T22:00:00Z",
              status: "open",
              workspaceType: "commercial",
              linkedNotificationId: "notification-1",
              calendarType: "live_notification_followup",
              sourceStage: "live_notification_followup"
            },
            {
              id: "task-15",
              title: "Living soil batch ready",
              dueAt: "2099-07-24T09:00:00Z",
              status: "open",
              workspaceType: "personal",
              sourceType: "recipe",
              linkedRecipeId: "recipe-ready-1",
              calendarType: "soil_recipe_timeline",
              sourceStage: "soil_ready"
            },
            {
              id: "task-16",
              title: "Complete sanitation SOP",
              dueAt: "2099-07-25T09:00:00Z",
              status: "open",
              workspaceType: "facility",
              sourceType: "sop",
              linkedSopId: "sop-1",
              linkedRoomId: "room-1",
              calendarType: "sop_facility_task"
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
            },
            {
              id: "live-public-1",
              title: "Public Harvest Q&A",
              scheduledStart: "2099-07-21T20:00:00Z",
              scheduledEnd: "2099-07-21T21:00:00Z",
              status: "scheduled",
              workspaceType: "personal"
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
            },
            {
              id: "course-personal-1",
              title: "Personal IPM Lesson",
              publishedAt: "2099-07-22T12:00:00Z",
              status: "published",
              workspaceType: "personal",
              storefrontSlug: "living-soil-labs"
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
            },
            {
              id: "facility-campaign-1",
              title: "Facility IPM Training",
              startsAt: "2099-07-20T12:00:00Z",
              endsAt: "2099-07-20T13:00:00Z",
              status: "scheduled",
              workspaceType: "facility"
            }
          ]
        });
      }
      if (path === "/api/commercial/campaigns") {
        return Promise.resolve({
          campaigns: [
            {
              id: "launch-1",
              name: "Bloom Mix Product Launch",
              launchDate: "2099-07-23",
              reminderPreference: "24 hours before",
              recurrenceRule: "weekly",
              linkedProductId: "product-bloom-1",
              status: "scheduled"
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
    expect(screen.getByText("Review personal grow task")).toBeTruthy();
    expect(screen.getByText("Check saved recipe release curve")).toBeTruthy();
    expect(screen.getByText("Review product trial evidence")).toBeTruthy();
    expect(screen.getByText("Fulfill storefront order")).toBeTruthy();
    expect(screen.getByText("Inspect sensor alert")).toBeTruthy();
    expect(screen.getByText("Review linked product batch")).toBeTruthy();
    expect(screen.getByText("Investigate linked sensor alert")).toBeTruthy();
    expect(screen.getByText("Launch linked campaign follow-up")).toBeTruthy();
    expect(screen.getByText("Review linked trial evidence")).toBeTruthy();
    expect(screen.getByText("Complete linked course assignment")).toBeTruthy();
    expect(screen.getByText("Review public storefront launch")).toBeTruthy();
    expect(screen.getByText("Flip to flower")).toBeTruthy();
    expect(screen.getByText("Follow up on notification")).toBeTruthy();
    expect(screen.getByText("Living soil batch ready")).toBeTruthy();
    expect(screen.getByText("Complete sanitation SOP")).toBeTruthy();
    expect(screen.getByText("Live Soil Demo")).toBeTruthy();
    expect(screen.getByText("Public Harvest Q&A")).toBeTruthy();
    expect(screen.getByText("Living Soil Basics")).toBeTruthy();
    expect(screen.getByText("Personal IPM Lesson")).toBeTruthy();
    expect(screen.getByText("Veg Mix Launch")).toBeTruthy();
    expect(screen.getByText("Facility IPM Training")).toBeTruthy();
    expect(screen.getByText("Bloom Mix Product Launch")).toBeTruthy();
    expect(screen.getByText("product launch")).toBeTruthy();
    expect(screen.getAllByText("feed campaign").length).toBeGreaterThan(0);
    expect(screen.getByText(/Ends 2099-07-17T21:00/)).toBeTruthy();
    expect(screen.getByText(/Ends 2099-07-26T12:00/)).toBeTruthy();
    expect(screen.getByText(/Reminder 1 hour before/)).toBeTruthy();
    expect(screen.getAllByText(/Reminder 24 hours before/).length).toBeGreaterThan(0);
    expect(screen.getByText(/All day/)).toBeTruthy();
    expect(screen.getByText(/Calendar grow milestone/)).toBeTruthy();
    expect(screen.getByText(/Stage transition/)).toBeTruthy();
    expect(screen.getByText(/Repeats monthly/)).toBeTruthy();
    expect(screen.getAllByText(/Repeats weekly/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open Source").length).toBeGreaterThan(0);
    expect(screen.getByTestId("link-/home/commercial/products/product-1")).toBeTruthy();
    expect(
      screen.getByTestId("link-/home/personal/tools/saved-runs?toolRunId=recipe-1")
    ).toBeTruthy();
    expect(
      screen.getByTestId("link-/home/commercial/evidence-runs/trial-1")
    ).toBeTruthy();
    expect(
      screen.getByTestId("link-/home/commercial/orders?orderId=order-1")
    ).toBeTruthy();
    expect(screen.getByTestId("link-/home/alerts?alertId=sensor-alert-1")).toBeTruthy();
    expect(screen.getByTestId("link-/store?q=batch-linked-1")).toBeTruthy();
    expect(
      screen.getByTestId("link-/home/alerts?alertId=sensor-alert-linked-1")
    ).toBeTruthy();
    expect(
      screen.getByTestId("link-/home/commercial/feed?campaignId=campaign-linked-1")
    ).toBeTruthy();
    expect(
      screen.getByTestId("link-/home/commercial/evidence-runs/trial-linked-1")
    ).toBeTruthy();
    expect(
      screen.getByTestId(
        "link-/home/personal/courses?courseId=course-assignment-parent&assignmentId=assignment-linked-1"
      )
    ).toBeTruthy();
    expect(screen.getByTestId("link-/store/living-soil-labs")).toBeTruthy();
    expect(
      screen.getByTestId(
        "link-/home/personal/tools/saved-runs?toolRunId=toolrun-calendar-1"
      )
    ).toBeTruthy();
    expect(screen.getByTestId("link-/home/commercial/lives?liveId=live-1")).toBeTruthy();
    expect(screen.getByTestId("link-/live-session?sessionId=live-public-1")).toBeTruthy();
    expect(screen.getByTestId("link-/home/commercial/courses/course-1")).toBeTruthy();
    expect(
      screen.getByTestId("link-/store/living-soil-labs/courses/course-personal-1")
    ).toBeTruthy();
    expect(screen.getByTestId("link-/home/personal/tasks")).toBeTruthy();
    expect(
      screen.getByTestId("link-/home/commercial/feed?campaignId=campaign-1")
    ).toBeTruthy();
    expect(
      screen.getByTestId("link-/home/facility/feed?campaignId=facility-campaign-1")
    ).toBeTruthy();
    expect(
      screen.getByTestId("link-/home/commercial/marketing?campaignId=launch-1")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Schedule workspace filter commercial"));
    expect(screen.getByText("Connect Stripe price")).toBeTruthy();
    expect(screen.getByText("Live Soil Demo")).toBeTruthy();
    expect(screen.getByText("Veg Mix Launch")).toBeTruthy();
    expect(screen.queryByText("Personal IPM Lesson")).toBeNull();
    expect(screen.queryByText("Facility IPM Training")).toBeNull();

    fireEvent.press(screen.getByLabelText("Schedule workspace filter all"));
    fireEvent.press(screen.getByLabelText("Schedule source filter feed_campaign"));
    expect(screen.getByText("Launch linked campaign follow-up")).toBeTruthy();
    expect(screen.getByText("Veg Mix Launch")).toBeTruthy();
    expect(screen.getByText("Facility IPM Training")).toBeTruthy();
    expect(screen.queryByText("Live Soil Demo")).toBeNull();
    expect(screen.queryByText("Connect Stripe price")).toBeNull();

    fireEvent.press(screen.getByLabelText("Schedule source filter storefront"));
    expect(screen.getByText("Review public storefront launch")).toBeTruthy();
    expect(screen.queryByText("Veg Mix Launch")).toBeNull();

    fireEvent.press(screen.getByLabelText("Schedule source filter notification"));
    expect(screen.getByText("Follow up on notification")).toBeTruthy();
    expect(screen.queryByText("Review public storefront launch")).toBeNull();

    fireEvent.press(screen.getByLabelText("Schedule source filter product"));
    expect(screen.getByText("Connect Stripe price")).toBeTruthy();
    expect(screen.getByText("Review linked product batch")).toBeTruthy();
    expect(screen.getByText("Review linked trial evidence")).toBeTruthy();
    expect(screen.queryByText("Follow up on notification")).toBeNull();

    fireEvent.press(screen.getByLabelText("Schedule source filter facility"));
    expect(screen.getByText("Facility IPM Training")).toBeTruthy();
    expect(screen.getByText("Investigate linked sensor alert")).toBeTruthy();
    expect(screen.queryByText("Review public storefront launch")).toBeNull();

    fireEvent.press(screen.getByLabelText("Schedule source filter all"));
    fireEvent.press(screen.getByLabelText("Schedule view day"));
    fireEvent.changeText(screen.getByLabelText("Schedule anchor date"), "2099-07-16");
    expect(screen.getByText("Flip to flower")).toBeTruthy();
    expect(screen.queryByText("Live Soil Demo")).toBeNull();

    fireEvent.press(screen.getByLabelText("Schedule view week"));
    expect(screen.getByText("Live Soil Demo")).toBeTruthy();
    expect(screen.getByText("Living Soil Basics")).toBeTruthy();
    expect(screen.queryByText("Bloom Mix Product Launch")).toBeNull();

    fireEvent.press(screen.getByLabelText("Schedule view month"));
    expect(screen.getByText("Bloom Mix Product Launch")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Schedule previous period"));
    expect(screen.queryByText("Bloom Mix Product Launch")).toBeNull();
    fireEvent.press(screen.getByLabelText("Schedule next period"));
    expect(screen.getByText("Bloom Mix Product Launch")).toBeTruthy();
  });
});
