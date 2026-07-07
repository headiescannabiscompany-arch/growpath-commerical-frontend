import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import TissueCultureToolRoute from "@/app/home/personal/(tabs)/tools/tissue-culture";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn()
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    plan: "pro",
    mode: "personal",
    can: () => true
  })
}));

jest.mock("@/components/feed/FeedBanner", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "feed-banner" });
});

jest.mock("@/features/personal/tools/ToolPlantContextPicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ToolPlantContextPicker: () => React.createElement(View, { testID: "plant-picker" }),
    useToolPlantContext: () => ({
      plants: [],
      plantId: "",
      selectedPlant: null,
      setPlantId: jest.fn(),
      toolRunContext: { selectedPlantContext: null }
    })
  };
});

jest.mock("@/api/toolRuns", () => ({
  runCalculator: (...args: any[]) => mockRunCalculator(...args)
}));

jest.mock("@/api/growpathModules", () => ({
  createGrowpathModuleRecord: (...args: any[]) => mockCreateGrowpathModuleRecord(...args)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateLog: jest.fn(),
  saveToolRunAndCreateTask: jest.fn(),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

describe("TissueCultureToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        projectName: "MAC1 TC",
        projectStatus: "needs_attention",
        contaminationRate: 12.5,
        rootingRate: 40,
        acclimationRate: 25,
        diagnosisRecord: {
          likelyFailureModes: [{ issue: "possible media contamination" }]
        },
        nextTransferTasks: [
          {
            title: "Transfer clean TC vessels",
            priority: "high",
            dueInDays: 10
          }
        ]
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4"]
    });
  });

  it("creates tissue culture workflow tasks from the saved ToolRun", async () => {
    const screen = render(<TissueCultureToolRoute />);

    fireEvent.changeText(screen.getByLabelText("Tissue Culture Project name"), "MAC1 TC");
    fireEvent.changeText(screen.getByLabelText("Tissue Culture Batch number"), "TC-042");
    fireEvent.changeText(
      screen.getByLabelText("Tissue Culture Contaminated vessels"),
      "3"
    );
    fireEvent.press(screen.getByLabelText("Run Tissue Culture"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "tissue-culture",
        expect.objectContaining({
          growId: "grow-1",
          projectName: "MAC1 TC",
          batchNumber: "TC-042",
          contaminatedVessels: "3"
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Tissue Culture result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create TC Workflow Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "tissue-culture",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            projectName: "MAC1 TC",
            batchNumber: "TC-042"
          }),
          output: expect.objectContaining({
            projectStatus: "needs_attention"
          }),
          tasks: [
            expect.objectContaining({
              title: "Review contamination and browning: TC-042",
              priority: "high",
              description: expect.stringContaining("possible media contamination")
            }),
            expect.objectContaining({
              title: "Transfer clean TC vessels",
              priority: "high"
            }),
            expect.objectContaining({
              title: "Record rooting and acclimation counts: TC-042"
            }),
            expect.objectContaining({
              title: "Update TC SOP notes: TC-042"
            })
          ]
        })
      )
    );
  });
});
