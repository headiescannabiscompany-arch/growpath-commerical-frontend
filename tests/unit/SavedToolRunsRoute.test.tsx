import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import SavedToolRunsRoute from "@/app/home/personal/(tabs)/tools/saved-runs";

const mockGetToolRun = jest.fn();
const mockListToolRuns = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    toolRunId: "run-1",
    growId: "grow-1",
    sourceContext: "journal"
  })
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

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref, preferBackFallback }: any) =>
      React.createElement(
        View,
        null,
        showBack
          ? React.createElement(
              Text,
              null,
              `Shared Back ${backFallbackHref} Prefer ${preferBackFallback}`
            )
          : null,
        children
      )
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/features/personal/tools/ToolResultSurface", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ title, summary, metrics, notices, outputs }: any) =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, null, `${title}: ${summary}`),
      React.createElement(Text, null, `Displayed output: ${outputs?.likelyCrop || "-"}`),
      ...(metrics || []).map((metric: any) =>
        React.createElement(Text, { key: metric.key }, `${metric.label}: ${metric.value}`)
      ),
      ...(notices || []).map((notice: any) =>
        React.createElement(Text, { key: notice.key }, notice.message)
      )
    );
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
        growId: "grow-1",
        toolType: undefined
      })
    );
    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));

    expect(screen.getByLabelText("Selected saved tool run run-1")).toBeTruthy();
    expect(screen.getByLabelText("Opened exact saved tool result run-1")).toBeTruthy();
    expect(screen.getByText("Opened from source link")).toBeTruthy();
    expect(screen.getByText("Saved run history")).toBeTruthy();
    expect(
      screen.getByText("Shared Back /home/personal/grows/grow-1/journal Prefer true")
    ).toBeTruthy();
    expect(screen.getByText("vpd result: Full VPD result.")).toBeTruthy();
  });

  it("surfaces saved Crop ID vision provenance instead of hiding nested metadata", async () => {
    const cropRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "species_crop_id",
      summary: "species_crop_id completed",
      outputs: {
        likelyCrop: "Not confirmed",
        commonNames: ["Mint"],
        scientificName: null,
        confidence: "medium",
        userConfirmationRequired: true,
        identifyingVisualTraits:
          "Flower clusters on a leafy stem suggest a mint-family plant.",
        imageAnalysis: {
          requested: true,
          performed: true,
          photosAnalyzed: 1,
          provider: "growpath_context_plus_openai",
          providerModel: "gpt-4o-mini",
          providerLabel: "GrowPath context + OpenAI image review",
          quality: "usable",
          evidenceUsed: ["evidence-mint-1"],
          limitations: ["Exact mint species cannot be confirmed from these views."]
        }
      },
      createdAt: "2026-07-21T12:00:00.000Z"
    };
    mockListToolRuns.mockResolvedValue([cropRun]);
    mockGetToolRun.mockResolvedValue(cropRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(screen.getByText("Likely crop: Mint")).toBeTruthy();
    expect(screen.getByText("Displayed output: Mint")).toBeTruthy();
    expect(screen.getByText("Photos inspected: 1")).toBeTruthy();
    expect(screen.getByText("Image quality: usable")).toBeTruthy();
    expect(screen.getByText("Needs confirmation: Yes")).toBeTruthy();
    expect(
      screen.getByText(/OpenAI image review inspected 1 uploaded photo/i)
    ).toBeTruthy();
    expect(screen.getByText(/Working identification candidate: Mint/i)).toBeTruthy();
    expect(screen.getByText(/Evidence: evidence-mint-1/i)).toBeTruthy();
    expect(
      screen.getByText(/Visible identification traits: Flower clusters/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Exact mint species cannot be confirmed from these views/i)
    ).toBeTruthy();
  });

  it("keeps saved Dry Cure light and timing evidence visible", async () => {
    const dryCureRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "dry_cure_guard",
      summary: "Measured drying checkpoint.",
      inputs: {
        mode: "drying",
        daysInStage: 1,
        lightExposure: "dark",
        dryRoomTemp: 68,
        dryRoomRH: 60
      },
      outputs: {
        assessmentStatus: "measured_snapshot",
        moldRisk: "monitor",
        overdryRisk: "monitor",
        mode: "drying",
        daysInStage: 1,
        lightExposure: "dark",
        lightStatus: "protected",
        stageTiming: {
          nextCheckHours: 24,
          completionStatus: "not_determined_by_clock",
          planningWindow: "usually_10_to_14_days_under_controlled_conditions"
        },
        realisticNotes:
          "A 24-hour item is the next recheck, not the finish date. Controlled drying is commonly planned around 10-14 days; a hot, fast, low-humidity dry can reach an endpoint in 5-7 days with higher quality-loss or overdry concern. Longer than 14 days can occur but is not recommended as a routine target."
      },
      createdAt: "2026-07-21T20:05:00.000Z"
    };
    mockListToolRuns.mockResolvedValue([dryCureRun]);
    mockGetToolRun.mockResolvedValue(dryCureRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(screen.getByText("Light protection: protected")).toBeTruthy();
    expect(screen.getByText("Day in stage: 1")).toBeTruthy();
    expect(
      screen.getByText("Stage timing: Plan 10-14 days; 24h is a recheck")
    ).toBeTruthy();
    expect(
      screen.getByText("Completion basis: Measurements, not elapsed time")
    ).toBeTruthy();
    expect(screen.getByText(/5-7 days with higher quality-loss/i)).toBeTruthy();
    expect(
      screen.getByText(/Longer than 14 days can occur but is not recommended/i)
    ).toBeTruthy();
    expect(screen.getByText(/Saved light condition: dark/i)).toBeTruthy();
  });

  it("keeps saved Clone Rooting batch evidence visible", async () => {
    const cloneRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "clone_rooting",
      summary: "Measured clone batch review.",
      inputs: {
        daysSinceCut: 9,
        cloneCount: 12,
        rootedCount: 3,
        failedCount: 3,
        rootEvidence: "mixed"
      },
      outputs: {
        assessmentStatus: "measured_batch_review",
        riskLevel: "high",
        rootingProgress: "mixed_outcome",
        batchCounts: { total: 12, rooted: 3, failed: 3, pending: 6 },
        clonePerformanceSummary: {
          rootingPercent: 25,
          failurePercent: 25,
          pendingPercent: 50
        },
        observations: { rootEvidence: "mixed" },
        likelyBottlenecks: [
          {
            key: "low-humidity",
            severity: "high",
            issue: "Measured humidity may increase water-loss pressure.",
            evidence: "65% RH was recorded.",
            recommendations: ["Confirm the sensor location and leaf turgor."]
          }
        ],
        missingInformation: []
      },
      warnings: ["Measured humidity may increase water-loss pressure."],
      createdAt: "2026-07-21T20:30:00.000Z"
    };
    mockListToolRuns.mockResolvedValue([cloneRun]);
    mockGetToolRun.mockResolvedValue(cloneRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(screen.getByText("Evidence status: measured_batch_review")).toBeTruthy();
    expect(screen.getByText("Visibly rooted: 3/12 (25%)")).toBeTruthy();
    expect(screen.getByText("Failed / culled: 3/12 (25%)")).toBeTruthy();
    expect(screen.getByText("Still pending: 6/12")).toBeTruthy();
    expect(screen.getByText("Direct root evidence: mixed")).toBeTruthy();
    expect(screen.getByText(/65% RH was recorded/i)).toBeTruthy();
    expect(
      screen.getAllByText(/Measured humidity may increase water-loss pressure/i)
    ).toHaveLength(1);
    expect(screen.getByText(/do not prove hidden roots/i)).toBeTruthy();
  });

  it("keeps saved Tissue Culture evidence, release blockers, and media limits visible", async () => {
    const tissueCultureRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "tissue_culture",
      summary: "Measured tissue-culture batch review.",
      inputs: {
        projectName: "MAC1 TC",
        batchNumber: "TC-042",
        workflowLane: "production",
        stage: "initiation"
      },
      outputs: {
        assessmentStatus: "partial_measured_batch_review",
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
        protocolSurvivalRate: 75,
        acclimationRate: 80,
        missingInformation: ["sterilization run ID"],
        diagnosisRecord: {
          likelyFailureModes: [
            {
              key: "fungal-like-appearance",
              severity: "high",
              issue:
                "A fungal-like appearance was recorded, but no microorganism identity is established.",
              evidence: "1/12 vessels showed the recorded visual pattern.",
              nextChecks: ["Map the pattern by media lot and handler."]
            }
          ],
          limitations: ["Visible vessel patterns cannot identify microorganisms."]
        },
        releaseReview: {
          status: "blocked",
          automaticRelease: false,
          blockers: ["visible contamination requires isolation and disposition"]
        },
        mediaAnalysis: {
          requested: true,
          performed: false,
          limitations: [
            "Media is attached, but this saved result does not attest that photo pixels were analyzed."
          ]
        },
        limitations: ["Cold storage and cryopreservation are separate workflows."]
      },
      warnings: ["Visible contamination requires isolation and disposition."],
      createdAt: "2026-07-21T21:00:00.000Z"
    };
    mockListToolRuns.mockResolvedValue([tissueCultureRun]);
    mockGetToolRun.mockResolvedValue(tissueCultureRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(
      screen.getByText("Evidence status: partial_measured_batch_review")
    ).toBeTruthy();
    expect(screen.getByText("Release review: blocked")).toBeTruthy();
    expect(screen.getByText("Lane / stage: production / initiation")).toBeTruthy();
    expect(screen.getByText("Contaminated vessels: 3/12 (25%)")).toBeTruthy();
    expect(screen.getByText("Fungal-like appearance: 1/12 (8.3%)")).toBeTruthy();
    expect(screen.getByText("Rooted vessels: 4/12 (33.3%)")).toBeTruthy();
    expect(screen.getByText("Protocol survival: 75%")).toBeTruthy();
    expect(screen.getByText("Acclimation survival: 80%")).toBeTruthy();
    expect(screen.getByText(/no microorganism identity is established/i)).toBeTruthy();
    expect(screen.getByText(/Release blocker: visible contamination/i)).toBeTruthy();
    expect(screen.getByText(/sterilization run ID/i)).toBeTruthy();
    expect(
      screen.getByText(/does not attest that photo pixels were analyzed/i)
    ).toBeTruthy();
    expect(
      screen.getAllByText(/Visible contamination requires isolation and disposition/i)
    ).toHaveLength(1);
  });

  it("keeps legacy Clone Rooting warnings when structured bottlenecks are absent", async () => {
    const legacyCloneRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "clone_rooting",
      summary: "Legacy clone batch review.",
      inputs: {},
      outputs: {},
      warnings: ["Legacy saved warning remains available."],
      createdAt: "2026-07-20T20:30:00.000Z"
    };
    mockListToolRuns.mockResolvedValue([legacyCloneRun]);
    mockGetToolRun.mockResolvedValue(legacyCloneRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(screen.getByText("Legacy saved warning remains available.")).toBeTruthy();
  });
});
