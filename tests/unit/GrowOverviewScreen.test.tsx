import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import GrowOverviewScreen from "@/app/home/personal/(tabs)/grows/[growId]";

const mockGetPersonalGrowTimeline = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockListPersonalLogs = jest.fn();
const mockListPersonalTasks = jest.fn();
const mockListToolRuns = jest.fn();

jest.mock("@/api/grows", () => ({
  getPersonalGrowTimeline: (...args: any[]) => mockGetPersonalGrowTimeline(...args),
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
}));

jest.mock("@/api/logs", () => ({
  listPersonalLogs: (...args: any[]) => mockListPersonalLogs(...args)
}));

jest.mock("@/api/tasks", () => ({
  listPersonalTasks: (...args: any[]) => mockListPersonalTasks(...args)
}));

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args: any[]) => mockListToolRuns(...args)
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
        React.createElement(Text, { accessibilityLabel: `Overview link ${href}` })
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

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const { View } = require("react-native");
  return () => <View testID="personal-feed-placement" />;
});

jest.mock("@/components/personal/GrowWorkspaceNav", () => {
  const { View } = require("react-native");
  return () => <View testID="grow-workspace-nav" />;
});

describe("GrowOverviewScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListPersonalGrows.mockResolvedValue([
      {
        id: "grow-1",
        name: "Connected Run",
        status: "flowering",
        growTags: ["Cannabis", "Indoor"],
        growInterests: { crops: ["Cannabis"], environment: ["Indoor"] },
        updatedAt: "2026-07-07T00:00:00.000Z"
      }
    ]);
    mockListPersonalLogs.mockResolvedValue([{ id: "log-1" }]);
    mockListPersonalTasks.mockResolvedValue([{ id: "task-1" }]);
    mockListToolRuns.mockResolvedValue([{ id: "run-1" }]);
    mockGetPersonalGrowTimeline.mockResolvedValue([
      {
        id: "ProductBatch:batch-linked-1",
        type: "product_batch",
        sourceModel: "ProductBatch",
        sourceId: "",
        sourceType: "product_batch",
        linkedProductBatchId: "batch-linked-1",
        title: "Batch follow-up saved",
        summary: "Linked product batch timeline event.",
        timestamp: "2026-07-07T12:00:00.000Z"
      },
      {
        id: "Task:task-linked-1",
        type: "task_created",
        sourceModel: "Task",
        sourceId: "",
        growId: "grow-1",
        linkedGrowId: "grow-1",
        linkedTaskId: "task-linked-1",
        title: "Topdress follow-up",
        summary: "Recipe-created task.",
        timestamp: "2026-07-07T13:00:00.000Z"
      },
      {
        id: "FeedCampaign:campaign-linked-1",
        type: "campaign",
        sourceModel: "FeedCampaign",
        sourceId: "",
        linkedFeedCampaignId: "campaign-linked-1",
        title: "Course campaign attached",
        summary: "Linked campaign timeline event.",
        timestamp: "2026-07-07T14:00:00.000Z"
      },
      {
        id: "GrowLog:log-1",
        type: "log_created",
        sourceModel: "GrowLog",
        sourceId: "log-1",
        title: "Legacy journal preview",
        summary: "Legacy rows stay display-only in overview.",
        timestamp: "2026-07-07T15:00:00.000Z"
      }
    ]);
  });

  it("opens explicit linked timeline preview sources with the shared source resolver", async () => {
    const screen = render(<GrowOverviewScreen />);

    await waitFor(() =>
      expect(mockGetPersonalGrowTimeline).toHaveBeenCalledWith("grow-1")
    );

    expect(screen.getByText("Connected Run")).toBeTruthy();
    expect(screen.getByText("Pheno / Genetics")).toBeTruthy();
    expect(screen.getByText("Harvest / Diagnosis")).toBeTruthy();
    expect(screen.getByLabelText("Pheno Matrix from grow_detail_pheno")).toBeTruthy();
    expect(
      screen.getByLabelText("Harvest Readiness from grow_detail_harvest")
    ).toBeTruthy();
    expect(screen.getByText("Batch follow-up saved")).toBeTruthy();
    expect(screen.getByText("Topdress follow-up")).toBeTruthy();
    expect(screen.getByText("Course campaign attached")).toBeTruthy();
    expect(screen.getByLabelText("Overview link /store?q=batch-linked-1")).toBeTruthy();
    expect(
      screen.getAllByLabelText("Overview link /home/personal/grows/grow-1/tasks").length
    ).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Overview link /feed?campaignId=campaign-linked-1")
    ).toBeTruthy();
    expect(screen.queryByLabelText("Overview link /home/personal/logs/log-1")).toBeNull();
  });
});
