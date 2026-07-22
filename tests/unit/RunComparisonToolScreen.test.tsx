import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import RunComparisonToolRoute from "@/app/home/personal/(tabs)/tools/run-comparison";

const mockListPersonalGrows = jest.fn();
const mockCompareSavedGrows = jest.fn();
const mockSaveToolRunToLog = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
let mockPlan = "pro";

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
    plan: mockPlan,
    mode: "personal",
    can: () => mockPlan !== "free"
  })
}));

jest.mock("@/utils/localPaidPreview", () => ({
  hasLocalPaidPreviewOverride: () => false
}));

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "feed-placement" });
});

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
}));

jest.mock("@/api/toolRuns", () => ({
  compareSavedGrows: (...args: any[]) => mockCompareSavedGrows(...args),
  saveToolRunToLog: (...args: any[]) => mockSaveToolRunToLog(...args)
}));

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

describe("RunComparisonToolRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlan = "pro";
    mockListPersonalGrows.mockResolvedValue([
      {
        id: "grow-1",
        name: "Reference grow",
        cropCommonName: "Cannabis",
        cultivar: "Shared line",
        status: "harvested"
      },
      {
        id: "grow-2",
        name: "Comparison grow",
        cropCommonName: "Cannabis",
        cultivar: "Shared line",
        status: "harvested"
      },
      {
        id: "grow-3",
        name: "Different crop",
        cropCommonName: "Tomato",
        status: "harvested"
      }
    ]);
    mockCompareSavedGrows.mockResolvedValue({
      toolRun: { id: "toolrun-1", _id: "toolrun-1" },
      outputs: {
        comparisonTitle: "Reference vs comparison",
        evidenceStatus: "limited_comparison",
        providerLabel: "GrowPath saved-history comparison (deterministic, no AI credit)",
        summary:
          "Two recorded differences were found; associations are not proof of cause.",
        confidence: "low_to_moderate",
        methodIds: ["run-comparison"],
        sourceIds: ["growpath-method", "user-observation"],
        structuredSummary: { sharedMetricCount: 2 },
        snapshots: [
          {
            growId: "grow-1",
            name: "Reference grow",
            crop: "Cannabis",
            cultivar: "Shared line",
            evidenceInventory: {
              logs: 3,
              tasks: 2,
              toolRuns: 4,
              diagnoses: 1,
              telemetryPoints: 2,
              excludedSyntheticTelemetryPoints: 1
            },
            taskCount: 2
          },
          {
            growId: "grow-2",
            name: "Comparison grow",
            crop: "Cannabis",
            cultivar: "Shared line",
            evidenceInventory: {
              logs: 4,
              tasks: 2,
              toolRuns: 5,
              diagnoses: 0,
              telemetryPoints: 2
            },
            taskCount: 2
          }
        ],
        keyDifferences: [
          {
            category: "yieldAmount",
            label: "Recorded yield",
            referenceGrowId: "grow-1",
            referenceRun: "Reference grow",
            referenceValue: 14,
            comparisonGrowId: "grow-2",
            comparisonRun: "Comparison grow",
            comparisonValue: 18,
            delta: 4,
            unit: "oz",
            interpretation: "Comparison grow is 4 oz higher than the reference record.",
            limitation: "This recorded difference does not establish what caused it."
          }
        ],
        associatedDrivers: [
          {
            driver: "Environment changed alongside an outcome",
            evidence: "Average recorded VPD changed by 0.2 kPa",
            possibleAssociation: "Environment may be associated with the outcome.",
            alternatives: ["cultivar", "nutrition"],
            nextCheck: "Repeat one controlled change."
          }
        ],
        missingData: [
          {
            growId: "grow-1",
            growName: "Reference grow",
            field: "recorded dry/cure duration",
            reason: "No comparable saved evidence was found."
          }
        ],
        limitations: [
          "This is an observational comparison of saved records and cannot establish causation."
        ],
        recommendations: ["Review the saved evidence inventory."],
        tasksToCreate: [
          {
            title: "Review run-comparison evidence gaps",
            description: "Fill missing evidence.",
            dueInDays: 1,
            priority: "high",
            sourceStage: "run_comparison_evidence_review"
          }
        ]
      }
    });
    mockSaveToolRunToLog.mockResolvedValue({ ok: true });
    mockSaveToolRunAndCreateTasks.mockResolvedValue({ ok: true, taskIds: ["task-1"] });
  });

  it("compares selected owned saved grows without demo rows and creates linked actions", async () => {
    const screen = render(<RunComparisonToolRoute />);

    expect(screen.queryByText(/Run 1, Sour Diesel/)).toBeNull();
    expect(screen.getByText("Compare saved evidence—not demo rows")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Comparison grow")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Compare saved grow Comparison grow"));
    fireEvent.press(
      screen.getByLabelText("Run comparison scope: Harvest / final outcome")
    );
    fireEvent.press(screen.getByLabelText("Run comparison objective: Recorded yield"));
    fireEvent.changeText(
      screen.getByLabelText("Run comparison report title"),
      "Reference vs comparison"
    );
    fireEvent.press(screen.getByLabelText("Compare saved grow histories"));

    await waitFor(() =>
      expect(mockCompareSavedGrows).toHaveBeenCalledWith({
        growIds: ["grow-1", "grow-2"],
        referenceGrowId: "grow-1",
        scope: "harvest_final",
        objective: "yield",
        title: "Reference vs comparison",
        notes: ""
      })
    );
    await waitFor(() =>
      expect(screen.getByText("Run-To-Run Comparison result")).toBeTruthy()
    );
    expect(screen.getByText("Recorded differences")).toBeTruthy();
    expect(screen.getByText("Possible associations—not causes")).toBeTruthy();
    expect(screen.getByText(/Excluded 1 synthetic telemetry/)).toBeTruthy();

    fireEvent.press(screen.getByText("Save Comparison to Grow Log"));
    await waitFor(() =>
      expect(mockSaveToolRunToLog).toHaveBeenCalledWith(
        "toolrun-1",
        expect.objectContaining({ growId: "grow-1", linkedToolRunId: "toolrun-1" })
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Saved comparison to the reference grow log.")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Reviewed Next-Run Tasks"));
    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "run-comparison",
          toolRunId: "toolrun-1",
          tasks: [
            expect.objectContaining({
              title: "Review run-comparison evidence gaps",
              priority: "high",
              allDay: true,
              calendarType: "run_comparison_followup",
              sourceStage: "run_comparison_evidence_review"
            })
          ]
        })
      )
    );
  });

  it("keeps the workflow locked for Personal Free", () => {
    mockPlan = "free";
    const screen = render(<RunComparisonToolRoute />);
    expect(screen.getByText("Run-To-Run Comparison is a Pro tool")).toBeTruthy();
    expect(mockListPersonalGrows).not.toHaveBeenCalled();
  });
});
