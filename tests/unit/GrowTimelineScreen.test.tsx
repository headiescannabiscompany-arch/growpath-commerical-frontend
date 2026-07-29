import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowTimelineScreen from "@/app/home/personal/(tabs)/grows/[growId]/timeline";

const mockGetPersonalGrowTimeline = jest.fn();

jest.mock("@/api/grows", () => ({
  getPersonalGrowTimeline: (...args: any[]) => mockGetPersonalGrowTimeline(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    useLocalSearchParams: () => ({ growId: "grow-1" }),
    Link: ({ children, href }: any) =>
      React.createElement(
        React.Fragment,
        null,
        children,
        React.createElement(Text, { accessibilityLabel: `Timeline source link ${href}` })
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
  const { View } = require("react-native");
  return () => <View testID="grow-workspace-nav" />;
});

describe("GrowTimelineScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetPersonalGrowTimeline.mockResolvedValue([
      {
        id: "GrowLog:log-1",
        type: "log_created",
        sourceModel: "GrowLog",
        sourceId: "log-1",
        title: "Watered blueberry",
        summary: "Added 500 ml.",
        timestamp: "2026-06-30T11:00:00.000Z",
        tags: ["journal"]
      },
      {
        id: "Photo:log-1:0",
        type: "photo_added",
        sourceModel: "GrowLog",
        sourceId: "log-1",
        title: "Photo attached",
        summary: "/uploads/leaf.jpg",
        timestamp: "2026-06-30T11:30:00.000Z",
        tags: ["photo"]
      },
      {
        id: "Diagnosis:diag-1",
        type: "diagnosis_created",
        sourceModel: "Diagnosis",
        sourceId: "diag-1",
        title: "Possible pH drift",
        summary: "Lower leaves show marginal chlorosis.",
        timestamp: "2026-06-30T12:00:00.000Z",
        tags: ["diagnosis"],
        payload: {
          overallHealth: "watch",
          feedbackCount: 1
        }
      },
      {
        id: "DiagnosisFeedback:feedback-1",
        type: "diagnosis_feedback",
        sourceModel: "DiagnosisFeedback",
        sourceId: "feedback-1",
        title: "Diagnosis feedback: not accurate",
        summary: "Symptoms worsened after the first recommendation.",
        timestamp: "2026-06-30T13:00:00.000Z",
        tags: ["diagnosis_feedback", "not_accurate", "worse"],
        payload: {
          verdict: "not_accurate",
          symptomChange: "worse",
          confirmedIssue: "Heat stress",
          actionsTaken: ["Raised light", "Increased airflow"],
          providerName: "OpenAI",
          providerModel: "gpt-test"
        }
      },
      {
        id: "ToolRun:run-1",
        type: "tool_run_created",
        sourceModel: "ToolRun",
        sourceId: "run-1",
        title: "VPD result saved",
        summary: "Saved VPD result.",
        timestamp: "2026-06-30T14:00:00.000Z",
        tags: ["tool", "vpd"]
      },
      {
        id: "ProductBatch:batch-linked-1",
        type: "product_batch",
        sourceModel: "ProductBatch",
        sourceId: "",
        sourceType: "product_batch",
        linkedProductBatchId: "batch-linked-1",
        title: "Batch follow-up saved",
        summary: "Linked product batch timeline event.",
        timestamp: "2026-06-30T14:30:00.000Z",
        tags: ["product_batch"]
      },
      {
        id: "Task:task-1",
        type: "task_created",
        sourceModel: "Task",
        sourceId: "task-1",
        title: "Review irrigation",
        summary: "Tool-created task.",
        timestamp: "2026-06-30T15:00:00.000Z",
        tags: ["task"]
      },
      {
        id: "Automation:automation-1",
        type: "automation_triggered",
        sourceModel: "AutomationPolicy",
        sourceId: "automation-1",
        title: "Humidity alert automation",
        summary: "Created a humidity follow-up.",
        timestamp: "2026-06-30T16:00:00.000Z",
        tags: ["automation"]
      }
    ]);
  });

  it("renders diagnosis feedback outcome details on the grow timeline", async () => {
    const screen = render(<GrowTimelineScreen />);

    await waitFor(() =>
      expect(mockGetPersonalGrowTimeline).toHaveBeenCalledWith("grow-1")
    );

    expect(screen.getByText("Possible pH drift")).toBeTruthy();
    expect(screen.getByText("Overall health: watch")).toBeTruthy();
    expect(screen.getByText("Feedback: 1 response(s)")).toBeTruthy();
    expect(screen.getByText("Diagnosis feedback: not accurate")).toBeTruthy();
    expect(screen.getByText("Verdict: not accurate")).toBeTruthy();
    expect(screen.getByText("Symptoms: worse")).toBeTruthy();
    expect(screen.getByText("Confirmed issue: Heat stress")).toBeTruthy();
    expect(screen.getByText("Actions: Raised light, Increased airflow")).toBeTruthy();
    expect(screen.getByText("Provider: OpenAI, gpt-test")).toBeTruthy();
    expect(screen.getAllByText("Open Journal Source")).toHaveLength(2);
    expect(screen.getAllByText("Open Diagnosis Source")).toHaveLength(2);
    expect(screen.getByText("Open Tool Source")).toBeTruthy();
    expect(screen.getByText("Batch follow-up saved")).toBeTruthy();
    expect(screen.getByText("Open Task Source")).toBeTruthy();
    expect(screen.getByText("Open Automation Source")).toBeTruthy();
    expect(
      screen.getAllByLabelText("Timeline source link /home/personal/logs/log-1")
    ).toHaveLength(2);
    expect(
      screen.getAllByLabelText(
        "Timeline source link /home/personal/diagnose?growId=grow-1"
      )
    ).toHaveLength(2);
    expect(
      screen.getByLabelText(
        "Timeline source link /home/personal/tools/saved-runs?toolRunId=run-1&growId=grow-1&sourceContext=timeline"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Timeline source link /store?q=batch-linked-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Timeline source link /home/personal/grows/grow-1/tasks?taskId=task-1"
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Timeline source link /home/personal/grows/grow-1/automation")
    ).toBeTruthy();
  });

  it("filters timeline events by canonical event group", async () => {
    const screen = render(<GrowTimelineScreen />);

    await waitFor(() =>
      expect(mockGetPersonalGrowTimeline).toHaveBeenCalledWith("grow-1")
    );

    fireEvent.press(screen.getByText("Journal"));
    expect(screen.getByText("Watered blueberry")).toBeTruthy();
    expect(screen.getByText("Photo attached")).toBeTruthy();
    expect(screen.queryByText("VPD result saved")).toBeNull();

    fireEvent.press(screen.getByText("Tools"));
    expect(screen.getByText("VPD result saved")).toBeTruthy();
    expect(screen.queryByText("Watered blueberry")).toBeNull();

    fireEvent.press(screen.getByText("Tasks"));
    expect(screen.getByText("Review irrigation")).toBeTruthy();
    expect(screen.queryByText("VPD result saved")).toBeNull();
  });
});
