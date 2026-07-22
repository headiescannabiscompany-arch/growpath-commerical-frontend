import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PhEcToolScreen from "@/app/home/personal/(tabs)/tools/ph-ec";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1", projectId: "project-1" }),
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

describe("PhEcToolScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        phStatus: "ok",
        runoffPHStatus: "high",
        ecStatus: "ok",
        runoffECStatus: "high",
        driftDirection: "rising",
        possibleRisks: ["salt buildup"],
        warnings: ["Runoff EC is high. Confirm trend before changing feed."],
        retestTaskSuggestion: {
          title: "Retest runoff after next watering",
          priority: "high",
          dueInDays: 1
        }
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

  it("creates pH and EC follow-up tasks from warning output", async () => {
    const screen = render(<PhEcToolScreen />);

    fireEvent.changeText(screen.getByLabelText("pH / EC Range Check Medium"), "coco");
    fireEvent.changeText(screen.getByLabelText("pH / EC Range Check Stage"), "flower");
    fireEvent.changeText(screen.getByLabelText("pH / EC Range Check Runoff EC"), "2.4");
    fireEvent.changeText(screen.getByLabelText("pH / EC Range Check EC unit"), "mS/cm");
    fireEvent.press(screen.getByLabelText("Run pH / EC Range Check"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "ph-ec-check",
        expect.objectContaining({
          growId: "grow-1",
          projectId: "project-1",
          cropType: "cannabis",
          medium: "coco",
          stage: "flower",
          runoffEC: 2.4
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("pH / EC Range Check result")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create pH / EC Task Plan"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "ph-ec-check",
          toolRunId: "toolrun-1",
          output: expect.objectContaining({
            driftDirection: "rising",
            possibleRisks: expect.any(Array)
          }),
          tasks: [
            expect.objectContaining({
              title: "Retest runoff after next watering",
              priority: "high",
              allDay: true,
              calendarType: "ph_ec_followup",
              sourceType: "ph_ec_check",
              sourceStage: "ph_ec_retest",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -720 })]
              }),
              description: expect.stringContaining("Runoff EC is high")
            }),
            expect.objectContaining({
              title: "Log plant response to pH / EC trend",
              priority: "high",
              sourceStage: "ph_ec_plant_response",
              sourceType: "ph_ec_check",
              description: expect.stringContaining("photos")
            }),
            expect.objectContaining({
              title: "Review source water and feed assumptions",
              sourceStage: "ph_ec_source_review",
              sourceType: "ph_ec_check",
              description: expect.stringContaining("meter calibration")
            })
          ]
        })
      )
    );
  });
});
