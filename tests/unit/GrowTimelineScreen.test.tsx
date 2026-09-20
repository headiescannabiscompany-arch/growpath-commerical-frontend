import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowTimelineScreen from "@/app/home/personal/(tabs)/grows/[growId]/timeline";

const mockGetWorkspaceGrowTimeline = jest.fn();

jest.mock("@/features/grows/workspaceData", () => ({
  getWorkspaceGrowTimeline: (...args: any[]) => mockGetWorkspaceGrowTimeline(...args),
  growWorkspaceBasePath: (workspace: string) => `/home/${workspace}`
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
  return function MockGrowWorkspaceNav() {
    return <View testID="grow-workspace-nav" />;
  };
});

describe("GrowTimelineScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetWorkspaceGrowTimeline.mockResolvedValue([
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
        payload: { linkedLogId: "log-1", url: "/uploads/leaf.jpg" },
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

  it.each(["personal", "commercial"] as const)(
    "keeps the clearly named Share Timeline link and selected presentation in %s",
    async (workspace) => {
      const screen = render(<GrowTimelineScreen workspace={workspace} />);

      await waitFor(() =>
        expect(mockGetWorkspaceGrowTimeline).toHaveBeenCalledWith(workspace, "grow-1")
      );

      expect(screen.getByRole("link", { name: "Share Timeline" })).toBeTruthy();
      expect(screen.getByText("Share Timeline")).toBeTruthy();
      expect(screen.queryByText("Review & Share Copy")).toBeNull();
      expect(screen.getByText("Export Visual Timeline")).toBeTruthy();
      expect(
        screen.getByLabelText(
          `Timeline source link /home/${workspace}/grows/grow-1/share?presentation=visual`
        )
      ).toBeTruthy();

      fireEvent.press(screen.getByText("Detailed List"));
      expect(screen.getByRole("link", { name: "Share Timeline" })).toBeTruthy();
      expect(
        screen.getByLabelText(
          `Timeline source link /home/${workspace}/grows/grow-1/share?presentation=list`
        )
      ).toBeTruthy();
    }
  );

  it("renders diagnosis feedback outcome details on the grow timeline", async () => {
    const screen = render(<GrowTimelineScreen />);

    await waitFor(() =>
      expect(mockGetWorkspaceGrowTimeline).toHaveBeenCalledWith("personal", "grow-1")
    );

    fireEvent.press(screen.getByText("Detailed List"));

    expect(screen.getByText("Possible pH drift")).toBeTruthy();
    expect(screen.getByText("Overall health: watch")).toBeTruthy();
    expect(screen.getByText("Feedback: 1 response(s)")).toBeTruthy();
    expect(screen.getByText("Diagnosis feedback: not accurate")).toBeTruthy();
    expect(screen.getByText("Verdict: not accurate")).toBeTruthy();
    expect(screen.getByText("Symptoms: worse")).toBeTruthy();
    expect(screen.getByText("Confirmed issue: Heat stress")).toBeTruthy();
    expect(screen.getByText("Actions: Raised light, Increased airflow")).toBeTruthy();
    expect(screen.getByText("Provider: OpenAI, gpt-test")).toBeTruthy();
    expect(screen.getAllByText("Open Journal Source")).toHaveLength(1);
    expect(screen.getAllByText("Open Diagnosis Source")).toHaveLength(2);
    expect(screen.getByText("Open Tool Source")).toBeTruthy();
    expect(screen.getByText("Batch follow-up saved")).toBeTruthy();
    expect(screen.getByText("Open Task Source")).toBeTruthy();
    expect(screen.getByText("Open Automation Source")).toBeTruthy();
    expect(
      screen.getAllByLabelText("Timeline source link /home/personal/logs/log-1")
    ).toHaveLength(1);
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
      expect(mockGetWorkspaceGrowTimeline).toHaveBeenCalledWith("personal", "grow-1")
    );

    fireEvent.press(screen.getByText("Detailed List"));

    fireEvent.press(screen.getByText("Journal"));
    expect(screen.getByText("Watered blueberry")).toBeTruthy();
    expect(screen.queryByText("Photo attached")).toBeNull();
    expect(
      screen.getByLabelText("Timeline photo for Watered blueberry").props.source.uri
    ).toEqual(expect.stringContaining("/uploads/leaf.jpg"));
    expect(screen.getByText("1 saved event")).toBeTruthy();
    expect(screen.queryByText("VPD result saved")).toBeNull();

    fireEvent.press(screen.getByText("Tools"));
    expect(screen.getByText("VPD result saved")).toBeTruthy();
    expect(screen.queryByText("Watered blueberry")).toBeNull();

    fireEvent.press(screen.getByText("Tasks"));
    expect(screen.getByText("Review irrigation")).toBeTruthy();
    expect(screen.queryByText("VPD result saved")).toBeNull();
  });

  it.each(["personal", "commercial"] as const)(
    "consolidates photo audit rows without merging distinct same-date journals in %s",
    async (workspace) => {
      const timestamp = "2026-09-19T12:00:00.000Z";
      mockGetWorkspaceGrowTimeline.mockResolvedValue([
        ...["first", "second"].flatMap((identity) => [
          {
            id: `GrowLog:log-${identity}`,
            sourceId: `log-${identity}`,
            sourceModel: "GrowLog",
            type: "log_created",
            title: "Same-day journal",
            summary: `${identity} distinct journal notes`,
            timestamp,
            tags: ["journal"]
          },
          {
            id: `GrowLog:log-${identity}:photo:0`,
            sourceId: `log-${identity}`,
            sourceModel: "GrowLog",
            type: "photo_added",
            title: `Photo added: ${identity} journal`,
            summary: `Photo audit for ${identity} journal`,
            timestamp,
            payload: {
              linkedLogId: `log-${identity}`,
              url: `/uploads/${identity}-journal.jpg`
            },
            tags: ["photo"]
          }
        ]),
        {
          id: "Task:unrelated-task",
          sourceId: "unrelated-task",
          sourceModel: "Task",
          type: "task_created",
          title: "Unrelated task",
          timestamp,
          tags: ["task"]
        }
      ]);
      const screen = render(<GrowTimelineScreen workspace={workspace} />);
      await screen.findByText("3 points");
      expect(mockGetWorkspaceGrowTimeline).toHaveBeenCalledWith(workspace, "grow-1");
      fireEvent.press(screen.getByText("Journal"));

      expect(screen.getByText("2 points")).toBeTruthy();
      expect(screen.queryByText("Unrelated task")).toBeNull();
      expect(
        screen.getAllByLabelText(/^Open timeline entry \d+: Same-day journal$/)
      ).toHaveLength(2);
      expect(screen.queryByText("Photo added: first journal")).toBeNull();
      expect(screen.queryByText("Photo added: second journal")).toBeNull();
      expect(screen.getByText("first distinct journal notes")).toBeTruthy();
      expect(
        screen.getByLabelText("Photo 1 for Same-day journal").props.source.uri
      ).toEqual(expect.stringContaining("/uploads/first-journal.jpg"));
      fireEvent.press(screen.getByLabelText("Open timeline entry 2: Same-day journal"));
      expect(screen.getByText("second distinct journal notes")).toBeTruthy();
      expect(screen.queryByText("first distinct journal notes")).toBeNull();
      expect(
        screen.getByLabelText("Photo 1 for Same-day journal").props.source.uri
      ).toEqual(expect.stringContaining("/uploads/second-journal.jpg"));

      fireEvent.press(screen.getByText("Detailed List"));
      for (const zoom of ["Lifecycle", "Day"]) {
        fireEvent.press(screen.getByLabelText(`Show timeline by ${zoom}`));
        expect(screen.getByText("2 saved events")).toBeTruthy();
        expect(screen.getAllByText("Same-day journal")).toHaveLength(2);
        expect(screen.getByText("first distinct journal notes")).toBeTruthy();
        expect(screen.getByText("second distinct journal notes")).toBeTruthy();
        expect(screen.queryByText("Photo added: first journal")).toBeNull();
        expect(screen.queryByText("Photo added: second journal")).toBeNull();
        const photoUris = screen
          .getAllByLabelText("Timeline photo for Same-day journal")
          .map((image) => image.props.source.uri);
        expect(photoUris).toHaveLength(2);
        expect(photoUris).toEqual(
          expect.arrayContaining([
            expect.stringContaining("/uploads/first-journal.jpg"),
            expect.stringContaining("/uploads/second-journal.jpg")
          ])
        );
        for (const identity of ["first", "second"]) {
          const href =
            workspace === "commercial"
              ? `/home/commercial/grows/grow-1/journal?logId=log-${identity}`
              : `/home/personal/logs/log-${identity}`;
          expect(screen.getAllByLabelText(`Timeline source link ${href}`)).toHaveLength(
            1
          );
        }
      }
      fireEvent.press(screen.getByText("Visual Flow"));
      expect(screen.getByText("2 points")).toBeTruthy();
    }
  );

  it.each(["personal", "commercial"] as const)(
    "retains a standalone photo whose journal is absent in both %s timeline views",
    async (workspace) => {
      mockGetWorkspaceGrowTimeline.mockResolvedValue([
        {
          id: "GrowLog:standalone-log:photo:0",
          sourceId: "standalone-log",
          sourceModel: "GrowLog",
          type: "photo_added",
          title: "Standalone evidence photo",
          summary: "Its journal milestone is not in this timeline selection.",
          timestamp: "2026-09-19T12:00:00.000Z",
          payload: { linkedLogId: "standalone-log", url: "/uploads/standalone.jpg" },
          tags: ["photo"]
        }
      ]);
      const screen = render(<GrowTimelineScreen workspace={workspace} />);
      await screen.findByText("1 points");
      fireEvent.press(screen.getByText("Journal"));
      expect(
        screen.getByLabelText("Open timeline entry 1: Standalone evidence photo")
      ).toBeTruthy();
      expect(
        screen.getByLabelText("Photo 1 for Standalone evidence photo").props.source.uri
      ).toEqual(expect.stringContaining("/uploads/standalone.jpg"));

      fireEvent.press(screen.getByText("Detailed List"));
      fireEvent.press(screen.getByLabelText("Show timeline by Day"));
      expect(screen.getByText("1 saved event")).toBeTruthy();
      expect(screen.getByText("Standalone evidence photo")).toBeTruthy();
      expect(
        screen.getByLabelText("Timeline photo for Standalone evidence photo").props.source
          .uri
      ).toEqual(expect.stringContaining("/uploads/standalone.jpg"));
      const href =
        workspace === "commercial"
          ? "/home/commercial/grows/grow-1/journal?logId=standalone-log"
          : "/home/personal/logs/standalone-log";
      expect(screen.getByLabelText(`Timeline source link ${href}`)).toBeTruthy();
    }
  );
});
