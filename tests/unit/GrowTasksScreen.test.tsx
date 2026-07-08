import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowTasksScreen from "@/app/home/personal/(tabs)/grows/[growId]/tasks";

const mockCreatePersonalTask = jest.fn();
const mockDeletePersonalTask = jest.fn();
const mockListPersonalTasks = jest.fn();
const mockUpdatePersonalTask = jest.fn();
let mockCanUseTaskReminders = true;

jest.mock("@/api/tasks", () => ({
  createPersonalTask: (...args: any[]) => mockCreatePersonalTask(...args),
  deletePersonalTask: (...args: any[]) => mockDeletePersonalTask(...args),
  listPersonalTasks: (...args: any[]) => mockListPersonalTasks(...args),
  updatePersonalTask: (...args: any[]) => mockUpdatePersonalTask(...args)
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    TASK_REMINDERS: "TASK_REMINDERS"
  },
  useEntitlements: () => ({
    can: (capability: string) =>
      capability === "TASK_REMINDERS" ? mockCanUseTaskReminders : false
  })
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    useLocalSearchParams: () => ({ growId: "grow-task-1" }),
    Link: ({ children, href }: any) =>
      React.createElement(
        React.Fragment,
        null,
        children,
        React.createElement(Text, { accessibilityLabel: `Grow task link ${href}` })
      )
  };
});

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => callback(), [callback]);
    }
  };
});

jest.mock("@/components/personal/GrowWorkspaceNav", () => {
  const { Text } = require("react-native");
  return ({ active }: { active: string }) => <Text>Workspace nav: {active}</Text>;
});

describe("GrowTasksScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCanUseTaskReminders = true;
    mockListPersonalTasks.mockResolvedValue([
      {
        id: "task-open-1",
        growId: "grow-task-1",
        title: "Inspect leaf spots",
        description: "Check underside of leaves.",
        dueDate: "2026-07-02T08:00:00.000Z",
        completed: false,
        priority: "high",
        sourceType: "ai_diagnosis",
        sourceObjectId: "diag-1",
        createdAt: "2026-07-01T08:00:00.000Z"
      },
      {
        id: "task-done-1",
        growId: "grow-task-1",
        title: "Review VPD result",
        description: "Already reviewed.",
        dueDate: "2026-07-01T08:00:00.000Z",
        completed: true,
        priority: "medium",
        sourceToolRunId: "run-1",
        createdAt: "2026-07-01T08:00:00.000Z"
      },
      {
        id: "task-linked-batch",
        growId: "grow-task-1",
        title: "Review linked batch",
        description: "Linked-only batch context.",
        dueDate: "2026-07-04T08:00:00.000Z",
        completed: false,
        priority: "medium",
        sourceType: "product_batch",
        linkedProductBatchId: "batch-linked-1",
        linkedToolRunId: "run-linked-1",
        createdAt: "2026-07-01T08:00:00.000Z"
      },
      {
        id: "task-linked-sensor-alert",
        growId: "grow-task-1",
        title: "Inspect linked sensor alert",
        description: "Linked-only sensor alert context.",
        dueDate: "2026-07-05T08:00:00.000Z",
        completed: false,
        priority: "high",
        sourceType: "sensor_alert",
        linkedSensorAlertId: "sensor-alert-linked-1",
        createdAt: "2026-07-01T08:00:00.000Z"
      },
      {
        id: "task-alert-linked-product",
        growId: "grow-task-1",
        title: "Review alert-linked product",
        description: "Alert-generated grow task should open the exact product.",
        dueDate: "2026-07-06T08:00:00.000Z",
        completed: false,
        priority: "medium",
        sourceType: "alert",
        sourceObjectId: "alert-product-1",
        linkedProductId: "veg-mix-1",
        linkedStorefrontSlug: "living-soil-labs",
        createdAt: "2026-07-01T08:00:00.000Z"
      }
    ]);
    mockUpdatePersonalTask.mockResolvedValue({ id: "task-open-1" });
    mockCreatePersonalTask.mockResolvedValue({ id: "task-created-1" });
    mockDeletePersonalTask.mockResolvedValue(true);
  });

  it("renders source labels and patches complete, reopen, and snooze actions", async () => {
    const screen = render(<GrowTasksScreen />);

    await waitFor(() =>
      expect(mockListPersonalTasks).toHaveBeenCalledWith({ growId: "grow-task-1" })
    );
    expect(screen.getByText("Source: ai diagnosis")).toBeTruthy();
    expect(screen.getByText("AI Diagnosis: diag-1")).toBeTruthy();
    expect(screen.getByText("Source: tool run")).toBeTruthy();
    expect(screen.getByText("Review linked batch")).toBeTruthy();
    expect(screen.getByText(/Product Batch: batch-linked-1/)).toBeTruthy();
    expect(screen.getByText("Inspect linked sensor alert")).toBeTruthy();
    expect(screen.getByText(/Sensor Alert: sensor-alert-linked-1/)).toBeTruthy();
    expect(screen.getByText(/ToolRun: run-linked-1/)).toBeTruthy();
    expect(screen.getByText("Review alert-linked product")).toBeTruthy();
    expect(screen.getByText(/Product: veg-mix-1/)).toBeTruthy();
    expect(screen.getAllByLabelText("View grow task source")).toHaveLength(5);
    expect(
      screen.getByLabelText("Grow task link /home/personal/diagnose?growId=grow-task-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Grow task link /home/personal/tools/saved-runs?toolRunId=run-1"
      )
    ).toBeTruthy();
    expect(screen.getByLabelText("Grow task link /store?q=batch-linked-1")).toBeTruthy();
    expect(
      screen.getByLabelText("Grow task link /home/alerts?alertId=sensor-alert-linked-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Grow task link /home/alerts?alertId=alert-product-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Grow task link /store/living-soil-labs/products/veg-mix-1")
    ).toBeTruthy();
    expect(screen.getAllByLabelText("View grow task linked object")).toHaveLength(1);

    fireEvent.press(screen.getAllByLabelText("Complete task")[0]);
    await waitFor(() =>
      expect(mockUpdatePersonalTask).toHaveBeenCalledWith("task-open-1", {
        completed: true
      })
    );

    fireEvent.press(screen.getByLabelText("Reopen task"));
    await waitFor(() =>
      expect(mockUpdatePersonalTask).toHaveBeenCalledWith("task-done-1", {
        completed: false
      })
    );

    fireEvent.press(screen.getAllByLabelText("Snooze task one day")[0]);
    await waitFor(() =>
      expect(mockUpdatePersonalTask).toHaveBeenCalledWith(
        "task-open-1",
        expect.objectContaining({ snoozeUntil: expect.any(String) })
      )
    );
  });

  it("creates grow tasks linked to sensor alerts with sensor alert ids", async () => {
    const screen = render(<GrowTasksScreen />);

    await waitFor(() => expect(screen.getByText("Tasks")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Task title"), "Inspect sensor alert");
    fireEvent.press(screen.getByLabelText("Set task source sensor_alert"));
    fireEvent.changeText(screen.getByLabelText("Task source object"), "sensor-alert-2");
    fireEvent.press(screen.getByLabelText("Add task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-task-1",
          linkedGrowId: "grow-task-1",
          title: "Inspect sensor alert",
          sourceType: "sensor_alert",
          sourceObjectId: "sensor-alert-2",
          linkedSensorAlertId: "sensor-alert-2"
        })
      )
    );
  });

  it("creates manual grow tasks with due date and priority", async () => {
    const screen = render(<GrowTasksScreen />);

    await waitFor(() => expect(screen.getByText("Tasks")).toBeTruthy());
    expect(screen.queryByLabelText("Set task source product_trial")).toBeNull();
    expect(screen.queryByLabelText("Set task source storefront")).toBeNull();
    expect(screen.queryByLabelText("Set task source order")).toBeNull();
    expect(screen.queryByLabelText("Set task source facility")).toBeNull();
    expect(screen.queryByLabelText("Set task source room")).toBeNull();
    expect(screen.queryByLabelText("Set task source facility_run")).toBeNull();
    expect(screen.queryByLabelText("Set task source sop")).toBeNull();
    fireEvent.changeText(screen.getByLabelText("Task title"), "Check soil moisture");
    fireEvent.changeText(screen.getByLabelText("Task description"), "Before watering.");
    fireEvent.changeText(screen.getByLabelText("Task due date"), "2026-07-03");
    fireEvent.press(screen.getByLabelText("Set task priority high"));
    fireEvent.press(screen.getByLabelText("Set task source product_batch"));
    fireEvent.changeText(screen.getByLabelText("Task source object"), "batch-1");
    fireEvent.changeText(screen.getByLabelText("Task ToolRun"), "toolrun-1");
    fireEvent.changeText(screen.getByLabelText("Task diagnosis"), "diag-2");
    fireEvent.changeText(screen.getByLabelText("Task linked log"), "log-3");
    fireEvent.changeText(screen.getByLabelText("Task reminder note"), "24 hours before");
    fireEvent.changeText(screen.getByLabelText("Task recurrence rule"), "every 7 days");
    fireEvent.press(screen.getByLabelText("Add task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenCalledWith({
        growId: "grow-task-1",
        title: "Check soil moisture",
        description: "Before watering.",
        dueDate: "2026-07-03",
        priority: "high",
        sourceType: "product_batch",
        sourceObjectId: "batch-1",
        sourceToolRunId: "toolrun-1",
        sourceDiagnosisId: "diag-2",
        linkedGrowId: "grow-task-1",
        linkedProductBatchId: "batch-1",
        linkedToolRunId: "toolrun-1",
        linkedLogId: "log-3",
        reminderPlan: { label: "24 hours before", channels: ["in_app"] },
        recurrence: { rule: "every 7 days" }
      })
    );
  });

  it("shows an upgrade prompt instead of write controls without task entitlement", async () => {
    mockCanUseTaskReminders = false;

    const screen = render(<GrowTasksScreen />);

    await waitFor(() =>
      expect(mockListPersonalTasks).toHaveBeenCalledWith({ growId: "grow-task-1" })
    );
    expect(screen.getByText("Task reminders are Pro")).toBeTruthy();
    expect(screen.queryByLabelText("Task title")).toBeNull();
    expect(screen.queryByLabelText("Complete task")).toBeNull();
  });
});
