import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import IpmScoutToolRoute from "@/app/home/personal/(tabs)/tools/ipm-scout";

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

describe("IpmScoutToolRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunCalculator.mockResolvedValue({
      outputs: {
        suspectedIssue: "Possible spider mite pressure",
        suspectedOrganism: "spider mites",
        severity: "medium",
        confidence: "moderate",
        growPathAi: {
          answer:
            "GrowPath AI sees stippling and recommends confirming leaf undersides before treatment."
        },
        gptVerification: {
          status: "completed",
          answer:
            "GPT verification agrees mites are plausible but says to verify eggs or moving pests first."
        },
        documentation: { savedAs: "ToolRun" }
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

  it("shows GrowPath AI and GPT verification answers from the IPM ToolRun", async () => {
    const screen = render(<IpmScoutToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Pest or organism seen"),
      "mites"
    );
    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Evidence / notes, comma-separated"),
      "stippling, leaf underside specks"
    );
    fireEvent.press(screen.getByLabelText("Run IPM Scout"));

    await waitFor(() =>
      expect(mockRunCalculator).toHaveBeenCalledWith(
        "ipm-scout",
        expect.objectContaining({
          growId: "grow-1",
          pestSeen: "mites",
          evidence: "stippling, leaf underside specks"
        })
      )
    );

    await waitFor(() => expect(screen.getByText("IPM Scout result")).toBeTruthy());
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
    fireEvent.press(screen.getByLabelText("Run IPM Scout"));

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
    fireEvent.press(screen.getByLabelText("Run IPM Scout"));

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
});
