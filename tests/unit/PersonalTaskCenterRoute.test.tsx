import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PersonalTaskCenterRoute from "@/app/home/personal/(tabs)/tasks";

const mockListPersonalTasks = jest.fn();
const mockCreatePersonalTask = jest.fn();
const mockUpdatePersonalTask = jest.fn();

function addDaysKey(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

jest.mock("@/api/tasks", () => ({
  listPersonalTasks: (...args: any[]) => mockListPersonalTasks(...args),
  createPersonalTask: (...args: any[]) => mockCreatePersonalTask(...args),
  updatePersonalTask: (...args: any[]) => mockUpdatePersonalTask(...args)
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { TASK_REMINDERS: "task_reminders" },
  useEntitlements: () => ({
    mode: "personal",
    plan: "pro",
    can: () => true
  })
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
        React.createElement(Text, { accessibilityLabel: `Personal task link ${href}` })
      )
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

describe("PersonalTaskCenterRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListPersonalTasks.mockResolvedValue([
      {
        id: "task-overdue",
        growId: "grow-1",
        title: "Inspect IPM issue",
        description: "Check leaf undersides.",
        dueDate: "2020-01-01",
        completed: false,
        priority: "high",
        sourceType: "sensor_alert",
        sourceObjectId: "alert-1",
        createdAt: "2026-07-07T00:00:00Z"
      },
      {
        id: "task-complete",
        growId: "grow-1",
        title: "Mixed soil",
        description: "Recipe was mixed.",
        dueDate: "2020-01-02",
        completed: true,
        priority: "medium",
        sourceType: "recipe",
        sourceToolRunId: "run-1",
        createdAt: "2026-07-07T00:00:00Z"
      },
      {
        id: "task-admin-source",
        growId: "grow-1",
        title: "Old storefront setup task",
        description: "Legacy source should not route personal users into admin pages.",
        dueDate: "2026-07-09",
        completed: false,
        priority: "medium",
        sourceType: "storefront",
        sourceObjectId: "store-1",
        createdAt: "2026-07-07T00:00:00Z"
      },
      {
        id: "task-diagnosis",
        growId: "grow-1",
        title: "Review AI diagnosis",
        description: "Check saved diagnosis follow-up.",
        dueDate: "2026-07-09",
        completed: false,
        priority: "high",
        sourceType: "ai_diagnosis",
        sourceObjectId: "diag-1",
        createdAt: "2026-07-07T00:00:00Z"
      },
      {
        id: "task-course",
        growId: "grow-1",
        title: "Watch course lesson",
        description: "Continue the living soil course.",
        dueDate: "2026-07-10",
        completed: false,
        priority: "medium",
        sourceType: "course",
        sourceObjectId: "course-1",
        createdAt: "2026-07-07T00:00:00Z"
      },
      {
        id: "task-course-assignment",
        growId: "grow-1",
        title: "Upload course worksheet",
        description: "Finish the dry amendment worksheet.",
        dueDate: "2026-07-10",
        completed: false,
        priority: "medium",
        sourceType: "course_assignment",
        sourceObjectId: "assignment-1",
        linkedCourseId: "course-1",
        linkedLessonId: "lesson-1",
        linkedCourseAssignmentId: "assignment-1",
        createdAt: "2026-07-07T00:00:00Z"
      },
      {
        id: "task-live",
        growId: "grow-1",
        title: "Watch live replay",
        description: "Review the grow workshop replay.",
        dueDate: "2026-07-11",
        completed: false,
        priority: "medium",
        sourceType: "live_replay",
        sourceObjectId: "live-1",
        createdAt: "2026-07-07T00:00:00Z"
      },
      {
        id: "task-linked-batch",
        growId: "grow-1",
        title: "Review linked batch",
        description: "Linked-only product batch should still show context.",
        dueDate: "2026-07-12",
        completed: false,
        priority: "medium",
        sourceType: "product_batch",
        linkedProductBatchId: "batch-linked-1",
        linkedToolRunId: "run-linked-1",
        createdAt: "2026-07-07T00:00:00Z"
      },
      {
        id: "task-linked-sensor-alert",
        growId: "grow-1",
        title: "Inspect linked sensor alert",
        description: "Linked-only sensor alert should still route.",
        dueDate: "2026-07-13",
        completed: false,
        priority: "high",
        sourceType: "sensor_alert",
        linkedSensorAlertId: "sensor-alert-linked-1",
        createdAt: "2026-07-07T00:00:00Z"
      },
      {
        id: "task-alert-linked-product",
        growId: "grow-1",
        title: "Review alert-linked product",
        description: "Alert-generated task should still open the exact product.",
        dueDate: "2026-07-14",
        completed: false,
        priority: "medium",
        sourceType: "alert",
        sourceObjectId: "alert-product-1",
        linkedProductId: "veg-mix-1",
        publicSlug: "living-soil-labs",
        createdAt: "2026-07-07T00:00:00Z"
      }
    ]);
    mockCreatePersonalTask.mockResolvedValue({
      id: "task-new",
      growId: "grow-2",
      title: "Topdress follow-up",
      completed: false
    });
    mockUpdatePersonalTask.mockResolvedValue({ id: "task-overdue", completed: true });
  });

  it("groups existing tasks and creates source-linked schedule tasks", async () => {
    const screen = render(<PersonalTaskCenterRoute />);

    await waitFor(() => expect(screen.getByText("Task Center / Schedule")).toBeTruthy());
    expect(screen.getByText("Inspect IPM issue")).toBeTruthy();
    expect(screen.getByText(/Mixed soil/)).toBeTruthy();
    expect(screen.getAllByText("sensor alert").length).toBeGreaterThan(0);
    expect(screen.getAllByText("recipe").length).toBeGreaterThan(0);
    expect(screen.getByText(/Sensor Alert: alert-1/)).toBeTruthy();
    expect(screen.getByText(/AI Diagnosis: diag-1/)).toBeTruthy();
    expect(screen.getByText("Review linked batch")).toBeTruthy();
    expect(screen.getByText(/Product Batch: batch-linked-1/)).toBeTruthy();
    expect(screen.getByText("Inspect linked sensor alert")).toBeTruthy();
    expect(screen.getByText(/Sensor Alert: sensor-alert-linked-1/)).toBeTruthy();
    expect(screen.getByText(/ToolRun: run-linked-1/)).toBeTruthy();
    expect(screen.getAllByText("product batch").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("View personal task source").length).toBe(10);
    expect(screen.getByText("Review alert-linked product")).toBeTruthy();
    expect(screen.getByText(/Product: veg-mix-1/)).toBeTruthy();
    expect(
      screen.getByLabelText("Personal task link /home/personal/diagnose?growId=grow-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Personal task link /home/personal/courses?courseId=course-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Personal task link /home/personal/courses?courseId=course-1&lessonId=lesson-1&assignmentId=assignment-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Personal task link /live-session?sessionId=live-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Personal task link /store?q=batch-linked-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Personal task link /home/alerts?alertId=sensor-alert-linked-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Personal task link /home/alerts?alertId=alert-product-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Personal task link /store/living-soil-labs/products/veg-mix-1"
      )
    ).toBeTruthy();
    expect(screen.getAllByLabelText("View personal task linked object").length).toBe(1);
    expect(screen.getByLabelText("Personal task link /store/store-1")).toBeTruthy();
    expect(screen.queryByLabelText(/Personal task link .*home\/commercial/)).toBeNull();
    expect(screen.queryByLabelText("Task center source product_trial")).toBeNull();
    expect(screen.queryByLabelText("Task center source storefront")).toBeNull();
    expect(screen.queryByLabelText("Task center source order")).toBeNull();
    expect(screen.queryByLabelText("Task center source facility")).toBeNull();
    expect(screen.queryByLabelText("Task center source room")).toBeNull();
    expect(screen.queryByLabelText("Task center source facility_run")).toBeNull();
    expect(screen.queryByLabelText("Task center source sop")).toBeNull();

    fireEvent.changeText(screen.getByLabelText("Task center grow ID"), "grow-2");
    fireEvent.changeText(
      screen.getByLabelText("Task center title"),
      "Topdress follow-up"
    );
    fireEvent.press(screen.getByLabelText("Task center quick date In 21 days"));
    fireEvent.press(screen.getByLabelText("Task center source product_batch"));
    fireEvent.changeText(screen.getByLabelText("Task center source object"), "batch-1");
    fireEvent.changeText(screen.getByLabelText("Task center ToolRun"), "run-2");
    fireEvent.press(screen.getByLabelText("Task center reminder preset 24 hours before"));
    fireEvent.press(screen.getByLabelText("Task center recurrence preset every 21 days"));
    fireEvent.press(screen.getByLabelText("Create task center task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-2",
          title: "Topdress follow-up",
          dueDate: addDaysKey(21),
          allDay: true,
          calendarType: "product_batch_task",
          sourceStage: "product_batch_review",
          sourceType: "product_batch",
          sourceObjectId: "batch-1",
          sourceToolRunId: "run-2",
          linkedProductBatchId: "batch-1",
          linkedToolRunId: "run-2",
          reminderPlan: { label: "24 hours before", channels: ["in_app"] },
          recurrence: { rule: "every 21 days" }
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Task created.")).toBeTruthy());

    fireEvent.changeText(screen.getByLabelText("Task center grow ID"), "grow-2");
    fireEvent.changeText(screen.getByLabelText("Task center title"), "Review diagnosis");
    fireEvent.press(screen.getByLabelText("Task center source ai_diagnosis"));
    fireEvent.changeText(screen.getByLabelText("Task center source object"), "diag-2");
    fireEvent.press(screen.getByLabelText("Create task center task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sourceType: "ai_diagnosis",
          sourceObjectId: "diag-2",
          linkedDiagnosisId: "diag-2",
          allDay: true,
          calendarType: "ai_diagnosis_task",
          sourceStage: "diagnosis_recheck"
        })
      )
    );

    fireEvent.changeText(screen.getByLabelText("Task center grow ID"), "grow-2");
    fireEvent.changeText(
      screen.getByLabelText("Task center title"),
      "Inspect sensor alert"
    );
    fireEvent.press(screen.getByLabelText("Task center source sensor_alert"));
    fireEvent.changeText(
      screen.getByLabelText("Task center source object"),
      "sensor-alert-2"
    );
    fireEvent.press(screen.getByLabelText("Create task center task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sourceType: "sensor_alert",
          sourceObjectId: "sensor-alert-2",
          linkedSensorAlertId: "sensor-alert-2",
          allDay: true,
          calendarType: "sensor_alert_task",
          sourceStage: "sensor_alert_followup"
        })
      )
    );

    fireEvent.changeText(screen.getByLabelText("Task center grow ID"), "grow-2");
    fireEvent.changeText(
      screen.getByLabelText("Task center title"),
      "Upload course assignment"
    );
    fireEvent.press(screen.getByLabelText("Task center source course_assignment"));
    fireEvent.changeText(
      screen.getByLabelText("Task center source object"),
      "assignment-2"
    );
    fireEvent.press(screen.getByLabelText("Create task center task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sourceType: "course_assignment",
          sourceObjectId: "assignment-2",
          linkedCourseAssignmentId: "assignment-2",
          allDay: true,
          calendarType: "course_assignment_task",
          sourceStage: "course_assignment_due"
        })
      )
    );

    fireEvent.press(screen.getAllByLabelText("Complete task")[0]);
    await waitFor(() =>
      expect(mockUpdatePersonalTask).toHaveBeenCalledWith("task-overdue", {
        completed: true
      })
    );
  });
});
