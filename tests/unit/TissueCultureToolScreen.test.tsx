import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import TissueCultureToolRoute from "@/app/home/personal/(tabs)/tools/tissue-culture";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTask = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockListPersonalGrows = jest.fn();

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
  useEntitlements: () => ({ plan: "pro", mode: "personal", can: () => true })
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

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
}));

jest.mock("@/api/growpathModules", () => ({
  createGrowpathModuleRecord: (...args: any[]) => mockCreateGrowpathModuleRecord(...args)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateLog: jest.fn(),
  saveToolRunAndCreateTask: (...args: any[]) => mockSaveToolRunAndCreateTask(...args),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

const title = "Tissue Culture Batch Review";

function fillRequired(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByLabelText(`${title} Project name`), "MAC1 TC");
  fireEvent.changeText(screen.getByLabelText(`${title} Batch number`), "TC-042");
  fireEvent.press(screen.getByLabelText(`${title} Workflow lane: Production line`));
  fireEvent.press(screen.getByLabelText(`${title} Stage: Initiation (Stage 1)`));
  fireEvent.press(
    screen.getByLabelText(`${title} Direct inspection status: Mixed visible condition`)
  );
  fireEvent.changeText(
    screen.getByLabelText(`${title} Observation date/time`),
    "2026-07-21 14:30 ET"
  );
  fireEvent.changeText(
    screen.getByLabelText(`${title} Observation source`),
    "Ailda direct count at rack TC-2"
  );
  fireEvent.changeText(screen.getByLabelText(`${title} Total vessels`), "12");
  fireEvent.changeText(screen.getByLabelText(`${title} Contaminated vessels`), "3");
  fireEvent.changeText(
    screen.getByLabelText(`${title} Fungal-like appearance vessels`),
    "1"
  );
  fireEvent.changeText(
    screen.getByLabelText(`${title} Browning / oxidized vessels`),
    "2"
  );
  fireEvent.changeText(screen.getByLabelText(`${title} Stalled vessels`), "2");
  fireEvent.changeText(screen.getByLabelText(`${title} Rooted vessels`), "4");
}

describe("TissueCultureToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListPersonalGrows.mockReturnValue(new Promise(() => {}));
    mockRunCalculator.mockResolvedValue({
      outputs: {
        methodIds: ["tissue-culture"],
        sourceIds: [
          "usda-ars-hemp-tissue-culture-protocol-2025",
          "frontiers-2021-drug-type-cannabis-tc"
        ],
        projectName: "MAC1 TC",
        assessmentStatus: "partial_measured_batch_review",
        projectStatus: "needs_attention",
        workflowLane: "production",
        stage: "initiation",
        vesselStatus: {
          total: 12,
          contaminated: 3,
          fungalLikeAppearance: 1,
          rooted: 4,
          contaminationPercent: 25,
          fungalLikeAppearancePercent: 8.3,
          rootedPercent: 33.3
        },
        rootingRate: 33.3,
        acclimationRate: null,
        protocolSurvivalRate: null,
        releaseReview: {
          status: "blocked",
          automaticRelease: false,
          blockers: ["visible contamination requires isolation and disposition"]
        },
        missingInformation: ["SOP version", "media preparation or lot ID"],
        costTracking: { totalProjectCost: 120 },
        costPerSurvivingPlant: null,
        diagnosisRecord: {
          likelyFailureModes: [
            {
              key: "visible-contamination-pattern",
              severity: "high",
              issue: "Visible contamination-like growth requires isolation.",
              evidence: "3/12 vessels were recorded.",
              nextChecks: ["Map the pattern by vessel and media lot."]
            }
          ]
        },
        mediaAnalysis: {
          requested: false,
          performed: false,
          limitations: ["Visible patterns cannot identify a microorganism."]
        },
        limitations: ["This workflow does not automatically release material."],
        nextTransferTasks: [
          {
            title: "Review transfer readiness: TC-042",
            priority: "high",
            dueInDays: 10
          }
        ],
        generatedCalendar: [
          {
            title: "Confirm isolation and disposition: TC-042",
            dueInDays: 1,
            priority: "high",
            sourceStage: "contamination_disposition",
            description: "Recount isolated vessels and document final disposition."
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
      taskIds: ["task-1", "task-2", "task-3"]
    });
  });

  it("starts blank and refuses to create a fake batch", () => {
    const screen = render(<TissueCultureToolRoute />);

    expect(screen.getByLabelText(`${title} Project name`).props.value).toBe("");
    expect(screen.getByLabelText(`${title} Total vessels`).props.value).toBe("");
    fireEvent.press(screen.getByLabelText(`Run ${title}`));

    expect(screen.getByText(/Complete the required fields: Project name/i)).toBeTruthy();
    expect(mockRunCalculator).not.toHaveBeenCalled();
  });

  it("submits measured evidence and creates traceable workflow tasks", async () => {
    const screen = render(<TissueCultureToolRoute />);
    fillRequired(screen);
    fireEvent.changeText(screen.getByLabelText(`${title} Transfer cycle`), "5");
    fireEvent.changeText(
      screen.getByLabelText(`${title} Owner-recorded maximum production transfers`),
      "8"
    );
    fireEvent.changeText(
      screen.getByLabelText(`${title} Next transfer review due in days`),
      "10"
    );
    fireEvent.changeText(screen.getByLabelText(`${title} Technician / owner`), "Ailda");
    fireEvent.changeText(screen.getByLabelText(`${title} Media cost`), "40");
    fireEvent.changeText(screen.getByLabelText(`${title} Vessel / supply cost`), "30");
    fireEvent.changeText(screen.getByLabelText(`${title} Labor cost`), "50");
    fireEvent.changeText(
      screen.getByLabelText(`${title} Sterilization method / protocol`),
      "Validated surface protocol"
    );
    fireEvent.press(screen.getByLabelText(`Run ${title}`));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "tissue-culture",
        expect.objectContaining({
          growId: "grow-1",
          projectName: "MAC1 TC",
          batchNumber: "TC-042",
          workflowLane: "production",
          stage: "initiation",
          inspectionStatus: "mixed",
          observedAt: "2026-07-21 14:30 ET",
          observationSource: "Ailda direct count at rack TC-2",
          vessels: "12",
          contaminatedVessels: "3",
          fungalLikeVessels: "1",
          transferCycle: "5",
          maxProductionTransfers: "8",
          transfersDueDays: "10",
          technicianOwner: "Ailda",
          mediaCost: "40",
          vesselSupplyCost: "30",
          laborCost: "50",
          sterilizationMethod: "Validated surface protocol"
        })
      )
    );
    await waitFor(() => expect(screen.getByText(`${title} result`)).toBeTruthy());
    fireEvent.press(screen.getByText("Create TC Evidence Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "tissue-culture",
          toolRunId: "toolrun-1",
          input: expect.objectContaining({ batchNumber: "TC-042" }),
          output: expect.objectContaining({
            assessmentStatus: "partial_measured_batch_review"
          }),
          tasks: expect.arrayContaining([
            expect.objectContaining({
              title: "Review TC release evidence: TC-042",
              priority: "high",
              allDay: true,
              calendarType: "tissue_culture_workflow",
              sourceStage: "tc_release_review",
              description: expect.stringContaining("Blocked by")
            }),
            expect.objectContaining({
              title: "Review transfer readiness: TC-042",
              dueDate: expect.any(String),
              sourceStage: "tc_transfer_review"
            }),
            expect.objectContaining({
              title: "Confirm isolation and disposition: TC-042",
              sourceStage: "contamination_disposition"
            })
          ])
        })
      )
    );
  });

  it("creates a default follow-up from the recorded schedule", async () => {
    const screen = render(<TissueCultureToolRoute />);
    fillRequired(screen);
    fireEvent.press(screen.getByLabelText(`Run ${title}`));

    await waitFor(() => expect(screen.getByText(`${title} result`)).toBeTruthy());
    fireEvent.press(screen.getByText("Create Follow-up Task"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "tissue-culture",
          toolRunId: "toolrun-1",
          title: "Review transfer readiness: TC-042",
          priority: "high",
          dueDate: expect.any(String),
          allDay: true,
          calendarType: "tissue_culture_workflow",
          sourceStage: "tc_transfer_review",
          description: expect.stringContaining("Recount the batch")
        })
      )
    );
  });
});
