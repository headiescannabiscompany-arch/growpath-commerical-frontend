import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import IpmScoutToolRoute from "@/app/home/personal/(tabs)/tools/ipm-scout";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTask = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockCreateFacilityTask = jest.fn();
const mockUpdateToolRun = jest.fn();
const mockUpdateGrowpathModuleRecord = jest.fn();

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
  runCalculator: (...args: any[]) => mockRunCalculator(...args),
  updateToolRun: (...args: any[]) => mockUpdateToolRun(...args)
}));

jest.mock("@/api/growpathModules", () => ({
  createGrowpathModuleRecord: (...args: any[]) => mockCreateGrowpathModuleRecord(...args),
  updateGrowpathModuleRecord: (...args: any[]) => mockUpdateGrowpathModuleRecord(...args)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateLog: jest.fn(),
  saveToolRunAndCreateTask: (...args: any[]) => mockSaveToolRunAndCreateTask(...args),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

jest.mock("@/api/facilityTasks", () => ({
  createFacilityTask: (...args: any[]) => mockCreateFacilityTask(...args)
}));

describe("IpmScoutToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        suspectedIssue: "Possible spider mite pressure",
        suspectedOrganism: "spider mites",
        severity: "medium",
        confidence: "moderate",
        readiness: {
          status: "ready_for_working_hypothesis",
          summary: "Enough independent scout fields are present."
        },
        pressureSummary: {
          plantsAffected: 2,
          plantsChecked: 8,
          affectedPercent: 25
        },
        supportingEvidence: ["Stippling was recorded."],
        counterEvidence: ["No eggs were confirmed."],
        missingInformation: ["dated sticky-trap comparison"],
        nextInspectionSteps: ["Inspect leaf undersides at 30x."],
        taskSuggestions: [
          {
            title: "Repeat IPM scout",
            priority: "medium",
            dueInDays: 3,
            sourceStage: "ipm_inspection",
            description: "Repeat underside inspection and comparable counts."
          },
          {
            title: "Document IPM evidence and treatment decision",
            priority: "medium",
            dueInDays: 4,
            sourceStage: "ipm_treatment_decision",
            description: "Save photos, trap counts, and the selected treatment category."
          },
          {
            title: "Review IPM outcome",
            priority: "medium",
            dueInDays: 7,
            sourceStage: "ipm_outcome_review",
            description: "Record whether the response worked and repeat the same count."
          }
        ],
        growPathAi: {
          answer:
            "GrowPath AI sees stippling and recommends confirming leaf undersides before treatment."
        },
        gptVerification: {
          status: "completed",
          agreementStatus: "agrees",
          providerLabel: "GPT structured IPM second opinion",
          answer:
            "GPT verification agrees mites are plausible but says to verify eggs or moving pests first."
        },
        mediaAnalysis: {
          performed: true,
          photosAnalyzed: 2,
          videosAnalyzed: 0,
          videoStatus: "stored_for_follow_up; direct video interpretation is not enabled"
        },
        documentation: { savedAs: "ToolRun" },
        aiCreditsUsed: 1
      },
      toolRun: { id: "toolrun-1", _id: "toolrun-1" }
    });
    mockCreateGrowpathModuleRecord.mockResolvedValue({
      id: "module-record-1",
      title: "IPM scout: possible spider mite pressure",
      status: "active",
      warnings: [],
      recommendations: [],
      limitations: [],
      tags: ["ipm-scout"],
      linkedTaskIds: [],
      tasksToCreate: []
    });
    mockUpdateToolRun.mockResolvedValue({ id: "toolrun-1" });
    mockUpdateGrowpathModuleRecord.mockResolvedValue({ id: "module-record-1" });
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

  it("starts unknown scout observations blank and explains the photo requirement", async () => {
    const screen = render(<IpmScoutToolRoute />);

    expect(screen.getByLabelText("IPM Scout Pest or organism seen").props.value).toBe("");
    expect(screen.getByLabelText("IPM Scout Damage or symptom pattern").props.value).toBe(
      ""
    );
    expect(screen.getByLabelText("IPM Scout Underside inspection").props.value).toBe("");
    expect(screen.getByLabelText("IPM Scout Sticky trap count").props.value).toBe("");
    await waitFor(() =>
      expect(
        screen.getByText(/Upload at least one clear photo before asking AI/)
      ).toBeTruthy()
    );
    expect(
      screen.getByText(
        "Each provider-backed action is separate: photo prefill uses 1 AI credit, and Analyze Scout + GPT Review uses 1 AI credit. A failed provider call is refunded; the result shows the actual charge."
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Run IPM Scout and GPT review for 1 AI credit")
    ).toBeTruthy();
    expect(screen.getByText("Use photos already in this grow")).toBeTruthy();
  });

  it("shows GrowPath AI and GPT verification answers from the IPM ToolRun", async () => {
    const screen = render(<IpmScoutToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Pest or organism seen"),
      "mites"
    );
    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Direct evidence, comma-separated"),
      "stippling, leaf underside specks"
    );
    fireEvent.changeText(screen.getByLabelText("IPM Scout Plants checked"), "8");
    fireEvent.changeText(screen.getByLabelText("IPM Scout Plants affected"), "2");
    fireEvent.press(
      screen.getByLabelText("Run IPM Scout and GPT review for 1 AI credit")
    );

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "ipm-scout",
        expect.objectContaining({
          growId: "grow-1",
          pestSeen: "mites",
          evidence: "stippling, leaf underside specks",
          plantsChecked: "8",
          plantsAffected: "2"
        })
      )
    );

    await waitFor(() => expect(screen.getByText("IPM Scout result")).toBeTruthy());
    expect(screen.getByText("AI credits used")).toBeTruthy();
    expect(screen.getByText("GrowPath AI")).toBeTruthy();
    expect(
      screen.getByText(
        "GrowPath AI sees stippling and recommends confirming leaf undersides before treatment."
      )
    ).toBeTruthy();
    expect(screen.getByText("GPT verification")).toBeTruthy();
    expect(
      screen.getByText(
        "GPT verification agrees mites are plausible but says to verify eggs or moving pests first."
      )
    ).toBeTruthy();
    expect(screen.getByText("Agreement status")).toBeTruthy();
    expect(screen.getByText("agrees")).toBeTruthy();
    expect(screen.getByText("Yes — 2 photo(s)")).toBeTruthy();
    expect(screen.getByText("ready_for_working_hypothesis")).toBeTruthy();
    expect(screen.getByText("2/8 (25%)")).toBeTruthy();
    expect(
      screen.getByText(/Save this ToolRun so the GrowPath AI scout answer and GPT review/)
    ).toBeTruthy();
  });

  it("creates an IPM follow-up task with GrowPath and GPT verification context", async () => {
    const screen = render(<IpmScoutToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Pest or organism seen"),
      "mites"
    );
    fireEvent.press(
      screen.getByLabelText("Run IPM Scout and GPT review for 1 AI credit")
    );

    await waitFor(() => expect(screen.getByText("IPM Scout result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create Follow-up Task"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "ipm-scout",
          toolRunId: "toolrun-1",
          title: "Repeat IPM scout",
          allDay: true,
          calendarType: "ipm_scout_followup",
          sourceStage: "ipm_inspection",
          reminderPlan: expect.objectContaining({
            channels: ["in_app"],
            reminders: [expect.objectContaining({ offsetMinutes: -720 })]
          }),
          description: expect.stringContaining(
            "GPT verification: GPT verification agrees mites are plausible"
          )
        })
      )
    );
    expect(mockSaveToolRunAndCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("Record whether the response worked")
      })
    );
  });

  it("creates an IPM task plan with verification and outcome tracking", async () => {
    const screen = render(<IpmScoutToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Pest or organism seen"),
      "mites"
    );
    fireEvent.press(
      screen.getByLabelText("Run IPM Scout and GPT review for 1 AI credit")
    );

    await waitFor(() => expect(screen.getByText("IPM Scout result")).toBeTruthy());

    fireEvent.press(screen.getByText("Create IPM Task Plan"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "ipm-scout",
          toolRunId: "toolrun-1",
          output: expect.objectContaining({
            suspectedIssue: "Possible spider mite pressure",
            gptVerification: expect.objectContaining({ status: "completed" })
          }),
          tasks: [
            expect.objectContaining({
              title: "Repeat IPM scout",
              allDay: true,
              calendarType: "ipm_scout_followup",
              sourceStage: "ipm_inspection",
              reminderPlan: expect.objectContaining({
                channels: ["in_app"],
                reminders: [expect.objectContaining({ offsetMinutes: -720 })]
              }),
              description: expect.stringContaining("GPT verification")
            }),
            expect.objectContaining({
              title: "Document IPM evidence and treatment decision",
              sourceStage: "ipm_treatment_decision",
              description: expect.stringContaining("trap counts")
            }),
            expect.objectContaining({
              title: "Review IPM outcome",
              sourceStage: "ipm_outcome_review",
              description: expect.stringContaining("whether the response worked")
            })
          ]
        })
      )
    );
  });

  it("saves an uncertain user decision to both the ToolRun and IPM record", async () => {
    const screen = render(<IpmScoutToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Damage or symptom pattern"),
      "fine stippling"
    );
    fireEvent.press(
      screen.getByLabelText("Run IPM Scout and GPT review for 1 AI credit")
    );

    await waitFor(() => expect(screen.getByText("IPM Scout result")).toBeTruthy());
    await waitFor(() => expect(mockCreateGrowpathModuleRecord).toHaveBeenCalled());

    fireEvent.press(screen.getByText("Mark as Not Sure"));

    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenCalledWith(
        "toolrun-1",
        expect.objectContaining({
          outputs: expect.objectContaining({
            userDecision: expect.objectContaining({ value: "uncertain" })
          })
        })
      )
    );
    expect(mockUpdateGrowpathModuleRecord).toHaveBeenCalledWith(
      "module-record-1",
      expect.objectContaining({
        userDecision: "uncertain",
        outcome: expect.objectContaining({ lastDecision: "uncertain" })
      })
    );
  });
});
