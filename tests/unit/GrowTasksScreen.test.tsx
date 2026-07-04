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

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-task-1" })
}));

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
    expect(screen.getByText("Source: tool run")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Complete task"));
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

    fireEvent.press(screen.getByLabelText("Snooze task one day"));
    await waitFor(() =>
      expect(mockUpdatePersonalTask).toHaveBeenCalledWith(
        "task-open-1",
        expect.objectContaining({ snoozeUntil: expect.any(String) })
      )
    );
  });

  it("creates manual grow tasks with due date and priority", async () => {
    const screen = render(<GrowTasksScreen />);

    await waitFor(() => expect(screen.getByText("Tasks")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Task title"), "Check soil moisture");
    fireEvent.changeText(screen.getByLabelText("Task description"), "Before watering.");
    fireEvent.changeText(screen.getByLabelText("Task due date"), "2026-07-03");
    fireEvent.press(screen.getByLabelText("Set task priority high"));
    fireEvent.press(screen.getByLabelText("Add task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenCalledWith({
        growId: "grow-task-1",
        title: "Check soil moisture",
        description: "Before watering.",
        dueDate: "2026-07-03",
        priority: "high"
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
