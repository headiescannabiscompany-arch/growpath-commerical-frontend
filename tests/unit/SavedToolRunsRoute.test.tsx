import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import SavedToolRunsRoute from "@/app/home/personal/(tabs)/tools/saved-runs";

const mockGetToolRun = jest.fn();
const mockListToolRuns = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ toolRunId: "run-1" })
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => callback(), [callback]);
    }
  };
});

jest.mock("@/api/toolRuns", () => ({
  archiveToolRun: jest.fn(),
  createTaskFromToolRun: jest.fn(),
  getToolRun: (...args: any[]) => mockGetToolRun(...args),
  listToolRuns: (...args: any[]) => mockListToolRuns(...args),
  saveToolRunToLog: jest.fn(),
  updateToolRun: jest.fn()
}));

jest.mock("@/components/nav/BackButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Back");
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/features/personal/tools/ToolResultSurface", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ title, summary }: any) =>
    React.createElement(Text, null, `${title}: ${summary}`);
});

describe("SavedToolRunsRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListToolRuns.mockResolvedValue([
      {
        id: "run-1",
        _id: "run-1",
        toolType: "vpd",
        growId: "grow-1",
        summary: "Cached VPD result.",
        outputs: { vpd: 1.2 },
        createdAt: "2026-07-07T12:00:00.000Z"
      }
    ]);
    mockGetToolRun.mockResolvedValue({
      id: "run-1",
      _id: "run-1",
      toolType: "vpd",
      growId: "grow-1",
      summary: "Full VPD result.",
      outputs: { vpd: 1.2 },
      createdAt: "2026-07-07T12:00:00.000Z"
    });
  });

  it("selects the saved ToolRun from the route query", async () => {
    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith({
        growId: undefined,
        toolType: undefined
      })
    );
    await waitFor(() =>
      expect(mockGetToolRun).toHaveBeenCalledWith("run-1")
    );

    expect(screen.getByLabelText("Selected saved tool run run-1")).toBeTruthy();
    expect(screen.getByText("vpd result: Full VPD result.")).toBeTruthy();
  });
});
