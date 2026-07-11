import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import TissueCultureToolRoute from "@/app/home/personal/(tabs)/tools/tissue-culture";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTask = jest.fn();
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
  saveToolRunAndCreateTask: (...args: any[]) => mockSaveToolRunAndCreateTask(...args),
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
        fungusRate: 4.5,
        rootingRate: 40,
        acclimationRate: 25,
        targetBands: {
          commercialReference:
            "Production target: keep fungus low and total contamination under 10%."
        },
        productionControls: {
          transferCycle: 11,
          maxProductionTransfers: 12,
          transfersRemaining: 1,
          explantSizeTradeoff:
            "Larger explants usually grow faster but carry more contamination risk."
        },
        acclimationGuidance: {
          greenhouseTransition: "Remove media before greenhouse transfer."
        },
        costTracking: {
          totalProjectCost: 120,
          costPerAcclimatedPlant: 40
        },
        diagnosisRecord: {
          likelyFailureModes: [{ issue: "possible media contamination" }]
        },
        nextTransferTasks: [
          {
            title: "Transfer clean TC vessels",
            priority: "high",
            dueInDays: 10
          }
        ],
        generatedCalendar: [
          {
            title: "Check for early contamination",
            dueInDays: 3,
            priority: "medium"
          },
          {
            title: "Evaluate shoot growth",
            dueInDays: 21,
            priority: "medium"
          }
        ]
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
    mockSaveToolRunAndCreateTask.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskId: "task-1"
    });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4", "task-5", "task-6", "task-7"]
    });
  });

  it("creates tissue culture workflow tasks from the saved ToolRun", async () => {
    const screen = render(<TissueCultureToolRoute />);

    fireEvent.changeText(screen.getByLabelText("Tissue Culture Project name"), "MAC1 TC");
    fireEvent.changeText(screen.getByLabelText("Tissue Culture Batch number"), "TC-042");
    fireEvent.changeText(screen.getByLabelText("Tissue Culture Transfer cycle"), "11");
    fireEvent.changeText(
      screen.getByLabelText("Tissue Culture Max production transfers"),
      "12"
    );
    fireEvent.changeText(
      screen.getByLabelText("Tissue Culture Technician / owner"),
      "Ailda"
    );
    fireEvent.changeText(
      screen.getByLabelText("Tissue Culture Contaminated vessels"),
      "3"
    );
    fireEvent.changeText(screen.getByLabelText("Tissue Culture Media cost"), "40");
    fireEvent.changeText(
      screen.getByLabelText("Tissue Culture Vessel / supply cost"),
      "30"
    );
    fireEvent.changeText(screen.getByLabelText("Tissue Culture Labor cost"), "50");
    fireEvent.press(screen.getByLabelText("Run Tissue Culture"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "tissue-culture",
        expect.objectContaining({
          growId: "grow-1",
          projectName: "MAC1 TC",
          batchNumber: "TC-042",
          transferCycle: "11",
          maxProductionTransfers: "12",
          technicianOwner: "Ailda",
          contaminatedVessels: "3",
          mediaCost: "40",
          vesselSupplyCost: "30",
          laborCost: "50"
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
          tasks: expect.arrayContaining([
            expect.objectContaining({
              title: "Review contamination and browning: TC-042",
              priority: "high",
              allDay: true,
              calendarType: "tissue_culture_workflow",
              sourceStage: "initiation",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -1440 })]
              }),
              description: expect.stringContaining("possible media contamination")
            }),
            expect.objectContaining({
              title: "Transfer clean TC vessels",
              priority: "high",
              calendarType: "tissue_culture_workflow",
              sourceStage: "initiation"
            }),
            expect.objectContaining({
              title: "Record rooting and acclimation counts: TC-042",
              sourceStage: "rooting_acclimation_review"
            }),
            expect.objectContaining({
              title: "Update TC SOP notes: TC-042",
              sourceStage: "sop_media_review"
            }),
            expect.objectContaining({
              title: "Refresh production line from mother block: TC-042",
              sourceStage: "transfer_cycle_limit"
            }),
            expect.objectContaining({
              title: "Check for early contamination",
              sourceStage: "generated_calendar_initiation"
            }),
            expect.objectContaining({
              title: "Evaluate shoot growth",
              sourceStage: "generated_calendar_initiation"
            })
          ])
        })
      )
    );
    expect(mockSaveToolRunAndCreateTasks.mock.calls[0][0].tasks).toHaveLength(7);
  }, 15000);

  it("creates default tissue culture follow-up task with shared Schedule metadata", async () => {
    const screen = render(<TissueCultureToolRoute />);

    fireEvent.press(screen.getByLabelText("Run Tissue Culture"));

    await waitFor(() => expect(screen.getByText("Tissue Culture result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Follow-up Task"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "tissue-culture",
          toolRunId: "toolrun-1",
          title: "Transfer clean TC vessels",
          priority: "high",
          allDay: true,
          calendarType: "tissue_culture_workflow",
          sourceStage: "transfer_review",
          reminderPlan: expect.objectContaining({
            channels: ["in_app"],
            reminders: [expect.objectContaining({ offsetMinutes: -1440 })]
          }),
          description: expect.stringContaining("Review vessel IDs")
        })
      )
    );
  });
});
