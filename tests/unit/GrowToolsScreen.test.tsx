import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowToolsScreen from "@/app/home/personal/(tabs)/grows/[growId]/tools";

const mockListToolRuns = jest.fn();
const mockGetToolRun = jest.fn();
const mockSaveToolRunToLog = jest.fn();
const mockCreateTaskFromToolRun = jest.fn();

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args: any[]) => mockListToolRuns(...args),
  getToolRun: (...args: any[]) => mockGetToolRun(...args),
  saveToolRunToLog: (...args: any[]) => mockSaveToolRunToLog(...args),
  createTaskFromToolRun: (...args: any[]) => mockCreateTaskFromToolRun(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  Link: ({ children }: any) => children
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
  const { View } = require("react-native");
  return () => <View testID="grow-workspace-nav" />;
});

describe("GrowToolsScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListToolRuns.mockResolvedValue([
      {
        id: "run-1",
        _id: "run-1",
        growId: "grow-1",
        toolName: "dew_point_guard",
        createdAt: "2026-06-30T12:00:00.000Z",
        selectedPlantContext: {
          name: "Blueberry #1",
          cropCommonName: "Blueberry",
          scientificName: "Vaccinium corymbosum"
        }
      }
    ]);
    mockGetToolRun.mockResolvedValue({
      id: "run-1",
      _id: "run-1",
      growId: "grow-1",
      toolName: "dew_point_guard",
      status: "completed",
      summary: "High condensation risk detected.",
      inputs: { rh: 84 },
      outputs: { risk: "high", dewPointSpreadC: 1.4 },
      warnings: ["Condensation risk is high."],
      recommendations: ["Inspect canopy and increase airflow."],
      formulas: ["Dew point spread compares canopy temp to dew point."],
      confidence: "server-calculated"
    });
    mockSaveToolRunToLog.mockResolvedValue({ ok: true });
    mockCreateTaskFromToolRun.mockResolvedValue({ ok: true });
  });

  it("reloads and renders saved tool run results from the grow workspace", async () => {
    const screen = render(<GrowToolsScreen />);

    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith({ growId: "grow-1" })
    );
    expect(screen.getByText("dew_point_guard | 2026-06-30")).toBeTruthy();
    expect(screen.getByText("Blueberry #1 | Blueberry")).toBeTruthy();

    fireEvent.press(screen.getByText("View result"));

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(screen.getByText("dew_point_guard result")).toBeTruthy();
    expect(screen.getByText("High condensation risk detected.")).toBeTruthy();
    expect(screen.getAllByText("risk").length).toBeGreaterThan(0);
    expect(screen.getAllByText("high").length).toBeGreaterThan(0);
    expect(screen.getByText("Condensation risk is high.")).toBeTruthy();
    expect(screen.getByText("- Inspect canopy and increase airflow.")).toBeTruthy();
    expect(
      screen.getByText("- Dew point spread compares canopy temp to dew point.")
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Save to Grow Log"));
    await waitFor(() => expect(mockSaveToolRunToLog).toHaveBeenCalledWith("run-1"));
    await waitFor(() => expect(screen.getByText("Saved to grow log.")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Task"));
    await waitFor(() => expect(mockCreateTaskFromToolRun).toHaveBeenCalledWith("run-1"));
  });
});
