import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GeneticsInventoryToolRoute from "@/app/home/personal/(tabs)/tools/genetics-inventory";

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

describe("GeneticsInventoryToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        cultivar: "Blueberry Keeper",
        breeder: "Archive Seed Co",
        flowerTime: 63,
        materialType: "clone",
        keeperSignals: ["strong rooting", "stable under stress"],
        preservationRecommendations: ["Keep a mother backup", "Take tissue culture notes"]
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3"]
    });
  });

  it("creates genetics provenance and preservation follow-up tasks", async () => {
    const screen = render(<GeneticsInventoryToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Genetics Inventory Cultivar"),
      "Blueberry Keeper"
    );
    fireEvent.press(screen.getByLabelText("Run Genetics Inventory"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "genetics-inventory",
        expect.objectContaining({
          growId: "grow-1",
          cultivar: "Blueberry Keeper"
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Genetics Inventory result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Genetics Follow-up Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "genetics-inventory",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({
            cultivar: "Blueberry Keeper"
          }),
          output: expect.objectContaining({
            cultivar: "Blueberry Keeper",
            preservationRecommendations: expect.any(Array)
          }),
          tasks: [
            expect.objectContaining({
              title: "Verify genetics record for Blueberry Keeper",
              allDay: true,
              calendarType: "genetics_preservation_followup",
              sourceStage: "genetics_record_review",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -1440 })]
              })
            }),
            expect.objectContaining({
              title: "Plan preservation for Blueberry Keeper",
              priority: "high",
              sourceStage: "preservation_planning",
              description: expect.stringContaining("Keep a mother backup")
            }),
            expect.objectContaining({
              title: "Link Blueberry Keeper to grow, pheno, or clone records",
              sourceStage: "genetics_record_linking"
            })
          ]
        })
      )
    );
  });
});
