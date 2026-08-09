import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import SavedToolRunsRoute, {
  personalDiagnosisRetryHref,
  personalPlantIdRetryHref
} from "@/app/home/personal/(tabs)/tools/saved-runs";

const mockGetToolRun = jest.fn();
const mockListToolRuns = jest.fn();
const mockUpdateToolRun = jest.fn();
const mockUpdatePlantIdCorrection = jest.fn();
const mockGetFieldStudy = jest.fn();
const mockCreateFieldObservation = jest.fn();
const mockUpdateFieldObservation = jest.fn();
const mockRequestCurrentCoordinates = jest.fn();
const mockAskPersonalAssistant = jest.fn();
let mockSearchParams: Record<string, string> = {
  toolRunId: "run-1",
  growId: "grow-1",
  sourceContext: "journal"
};
let mockEntitlementMode: "personal" | "commercial" | "facility" = "personal";
let mockEntitlementFacilityId = "";

jest.mock("expo-router", () => ({
  Link: ({ children, href }: any) => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(
      View,
      { accessibilityLabel: `Link to ${String(href)}` },
      children
    );
  },
  useLocalSearchParams: () => mockSearchParams
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
  updateToolRun: (...args: any[]) => mockUpdateToolRun(...args),
  updatePlantIdCorrection: (...args: any[]) => mockUpdatePlantIdCorrection(...args)
}));

jest.mock("@/api/fieldStudies", () => ({
  createFieldObservation: (...args: any[]) => mockCreateFieldObservation(...args),
  getFieldStudy: (...args: any[]) => mockGetFieldStudy(...args),
  updateFieldObservation: (...args: any[]) => mockUpdateFieldObservation(...args)
}));

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
}));

jest.mock("@/utils/locationSearch", () => ({
  requestCurrentCoordinates: (...args: any[]) => mockRequestCurrentCoordinates(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: mockEntitlementMode,
    facilityId: mockEntitlementFacilityId
  })
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
  return ({ title, summary, metrics, notices, outputs, details, followUp }: any) =>
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
      ),
      details,
      followUp
    );
});

describe("SavedToolRunsRoute", () => {
  it("builds a Diagnosis saved-evidence retry without unrelated route context", () => {
    const href = personalDiagnosisRetryHref({
      toolRunId: "diagnosis-run-1",
      growId: "grow-1",
      plantId: "plant-1"
    });

    expect(href).toBe(
      "/home/personal/diagnose?retryToolRunId=diagnosis-run-1&growId=grow-1&plantId=plant-1"
    );
    expect(href).not.toMatch(/sourceContext|workspace|facility|commercial/i);
  });
  beforeEach(() => {
    jest.resetAllMocks();
    mockSearchParams = {
      toolRunId: "run-1",
      growId: "grow-1",
      sourceContext: "journal"
    };
    mockEntitlementMode = "personal";
    mockEntitlementFacilityId = "";
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
    mockRequestCurrentCoordinates.mockResolvedValue({
      latitude: 35.7796,
      longitude: -78.6382,
      accuracyMeters: 25
    });
    mockUpdatePlantIdCorrection.mockResolvedValue(null);
  });

  it("offers the retry for the historical ai diagnosis saved-run type", async () => {
    const diagnosisRun = {
      id: "diagnosis-run-legacy-type",
      _id: "diagnosis-run-legacy-type",
      toolType: "ai diagnosis",
      summary: "Historical Diagnosis result.",
      inputs: { evidenceAssetIds: ["diagnosis-photo-1"] },
      outputs: { overallHealth: "watch" }
    };
    mockSearchParams = { toolRunId: "diagnosis-run-legacy-type" };
    mockListToolRuns.mockResolvedValue([diagnosisRun]);
    mockGetToolRun.mockResolvedValue(diagnosisRun);

    const screen = render(<SavedToolRunsRoute />);

    expect(
      await screen.findByLabelText("Re-run Diagnosis with saved evidence")
    ).toBeTruthy();
  });

  it("offers a Personal Plant ID re-run that carries only saved evidence and active Personal context", async () => {
    const cropRun = {
      id: "plant-run-retry",
      _id: "plant-run-retry",
      toolType: "species_crop_id",
      growId: "grow-1",
      summary: "Night plant candidate.",
      inputs: { evidenceAssetIds: ["private-photo-1"] },
      outputs: { likelyCrop: "Cannabis", confidence: "low" }
    };
    mockSearchParams = {
      toolRunId: "plant-run-retry",
      growId: "grow-1",
      fieldStudyId: "study-1",
      sourceContext: "journal",
      sourceTaskId: "task-should-not-leak"
    };
    mockListToolRuns.mockResolvedValue([cropRun]);
    mockGetToolRun.mockResolvedValue(cropRun);
    mockGetFieldStudy.mockResolvedValue({
      study: {
        id: "study-1",
        title: "Night plants",
        accessRole: "owner"
      },
      observations: []
    });

    const screen = render(<SavedToolRunsRoute />);
    const href = personalPlantIdRetryHref({
      toolRunId: "plant-run-retry",
      growId: "grow-1",
      fieldStudyId: "study-1"
    });

    expect(await screen.findByText("Re-run with Saved Evidence")).toBeTruthy();
    expect(screen.getByLabelText(`Link to ${href}`)).toBeTruthy();
    expect(href).toBe(
      "/home/personal/tools/species-crop-id?retryToolRunId=plant-run-retry&growId=grow-1&fieldStudyId=study-1"
    );
    expect(href).not.toMatch(/sourceContext|sourceTaskId|workspace|facility|commercial/i);
  });

  it("asks an editable evidence-bound IPM follow-up without replacing the saved result", async () => {
    const ipmRun = {
      id: "ipm-run-1",
      _id: "ipm-run-1",
      toolType: "ipm-scout",
      immutableSnapshotStored: true,
      secureFollowUpSupported: true,
      growId: "grow-1",
      plantId: "plant-1",
      summary: "Original saved IPM result: powdery mildew was the leading hypothesis.",
      inputs: {
        evidenceAssetIds: ["ipm-photo-1", "ipm-photo-2", "ipm-photo-1"]
      },
      outputs: {
        suspectedIssue: "Possible powdery mildew",
        imageAnalysis: {
          evidenceUsed: ["ipm-photo-2", "ipm-photo-3"]
        }
      },
      createdAt: "2026-08-06T14:00:00.000Z"
    };
    mockSearchParams = {
      toolRunId: "ipm-run-1",
      growId: "grow-1",
      toolType: "ipm-scout"
    };
    mockListToolRuns.mockResolvedValue([ipmRun]);
    mockGetToolRun.mockResolvedValue(ipmRun);
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply:
        "Thrips remain plausible because the photos need an underside macro showing insects, frass, or feeding scars before powdery mildew can be favored.",
      providerLabel: "GrowPath context + OpenAI image review",
      mediaAnalysis: { requested: true, photosAnalyzed: 3 },
      limitations: ["No sharp leaf-underside macro was included."]
    });

    const screen = render(<SavedToolRunsRoute />);

    const compareSuggestion = await screen.findByLabelText(
      "Use suggested question: Compare thrips, mites, and powdery mildew."
    );
    fireEvent.press(compareSuggestion);
    const questionInput = screen.getByLabelText("Ask about this result");
    expect(questionInput.props.value).toBe("Compare thrips, mites, and powdery mildew.");

    fireEvent.changeText(
      questionInput,
      "Compare thrips and powdery mildew using only the saved photo evidence."
    );
    fireEvent.press(screen.getByLabelText("Ask AI about this result for 1 AI credit"));

    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith({
        message: "Compare thrips and powdery mildew using only the saved photo evidence.",
        sourceToolRunId: "ipm-run-1",
        growId: "grow-1",
        plantId: "plant-1",
        workspaceType: "personal",
        evidenceAssetIds: ["ipm-photo-1", "ipm-photo-2", "ipm-photo-3"],
        context: {
          workflow: "ipm-result-follow-up",
          sourceToolRunId: "ipm-run-1",
          sourceTool: "ipm-scout",
          workspaceType: "personal"
        }
      })
    );
    expect(
      await screen.findByText(
        "Thrips remain plausible because the photos need an underside macro showing insects, frass, or feeding scars before powdery mildew can be favored."
      )
    ).toBeTruthy();
    expect(
      screen.getByText("Provider: GrowPath context + OpenAI image review")
    ).toBeTruthy();
    expect(screen.getByText("Evidence inspected: Yes")).toBeTruthy();
    expect(
      screen.getByText("- No sharp leaf-underside macro was included.")
    ).toBeTruthy();
    expect(
      screen.getAllByText(
        /Original saved IPM result: powdery mildew was the leading hypothesis\./
      ).length
    ).toBeGreaterThan(0);
  });

  it("shows the bounded visible-sample Harvest review instead of hiding it inside receipt metadata", async () => {
    const harvestRun = {
      id: "harvest-run-1",
      _id: "harvest-run-1",
      toolType: "harvest_readiness",
      growId: "grow-1",
      summary: "Harvest review saved.",
      inputs: { evidenceAssetIds: ["top", "middle", "lower", "context"] },
      outputs: {
        readinessStatus: "insufficient_evidence",
        photoAnalysis: {
          performed: true,
          imagesAnalyzed: 4,
          imageQuality: "limited",
          imageDetail: "high",
          providerLabel: "OpenAI Harvest image review",
          providerModel: "gpt-5.1",
          aiCreditsUsed: 1,
          creditStatus: "charged",
          visibleSampleEstimateUsable: true,
          sampleClear: 0.1,
          sampleCloudy: 0.45,
          sampleAmber: 0.3,
          sampleCloudyOrGlare: 0.15,
          sampleEstimateBasis: "Glare-free calyx regions in images 1 and 3.",
          amberVisibility: "substantial_visible",
          amberEvidenceBasis: "Multiple intact amber heads were visible in image 3.",
          limitations: ["Top, middle, and lower role coverage was not confirmed."]
        }
      },
      createdAt: "2026-08-08T22:00:00.000Z"
    };
    mockSearchParams = { toolRunId: "harvest-run-1", growId: "grow-1" };
    mockListToolRuns.mockResolvedValue([harvestRun]);
    mockGetToolRun.mockResolvedValue(harvestRun);

    const screen = render(<SavedToolRunsRoute />);

    expect(
      await screen.findByText(
        "Visible sampled heads: Clear 10% · Cloudy 45% · Amber 30% · Cloudy or glare 15%"
      )
    ).toBeTruthy();
    expect(screen.getByText("Amber visibility: substantial visible")).toBeTruthy();
    expect(
      screen.getByText(
        /visible-sample estimate describes only intact heads visible in the inspected regions, not the whole plant/i
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/Multiple intact amber heads were visible in image 3/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Top, middle, and lower role coverage was not confirmed/i)
    ).toBeTruthy();
  });

  it("does not offer plant-sex follow-up suggestions for a non-cannabis Plant ID run", async () => {
    const magnoliaRun = {
      id: "magnolia-run-1",
      _id: "magnolia-run-1",
      toolType: "species_crop_id",
      immutableSnapshotStored: true,
      secureFollowUpSupported: true,
      growId: "grow-1",
      summary: "Magnolia remains a medium-confidence candidate.",
      inputs: { evidenceAssetIds: ["magnolia-photo-1"] },
      outputs: {
        likelyCrop: "Southern magnolia",
        scientificName: "Magnolia grandiflora",
        likelyFamily: "Magnoliaceae",
        confidence: "medium"
      },
      createdAt: "2026-08-06T14:15:00.000Z"
    };
    mockSearchParams = {
      toolRunId: "magnolia-run-1",
      growId: "grow-1",
      toolType: "species_crop_id"
    };
    mockListToolRuns.mockResolvedValue([magnoliaRun]);
    mockGetToolRun.mockResolvedValue(magnoliaRun);

    const screen = render(<SavedToolRunsRoute />);

    expect(
      await screen.findByLabelText(
        "Use suggested question: What visible traits support this identification?"
      )
    ).toBeTruthy();
    expect(
      screen.queryByLabelText(
        "Use suggested question: Male, female, intersex, or unclear from this evidence?"
      )
    ).toBeNull();
    expect(
      screen.queryByLabelText(
        "Use suggested question: What node or preflower photo would confirm plant sex?"
      )
    ).toBeNull();
  });

  it("hides evidence-bound follow-up for a legacy run without a stored immutable snapshot", async () => {
    const legacyRun = {
      id: "legacy-ipm-run",
      _id: "legacy-ipm-run",
      toolType: "ipm-scout",
      immutableSnapshotStored: true,
      secureFollowUpSupported: false,
      summary: "Legacy scout result",
      outputs: { suspectedIssue: "Unverified white marks" }
    };
    mockSearchParams = { toolRunId: "legacy-ipm-run", toolType: "ipm-scout" };
    mockListToolRuns.mockResolvedValue([legacyRun]);
    mockGetToolRun.mockResolvedValue(legacyRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("legacy-ipm-run"));
    expect(screen.queryByLabelText("Ask about this result")).toBeNull();
  });

  it("keeps the plant-sex shortcut for an inconclusive saved run with explicit Cannabis context", async () => {
    const cannabisRun = {
      id: "saved-dark-cannabis",
      _id: "saved-dark-cannabis",
      toolType: "species_crop_id",
      immutableSnapshotStored: true,
      secureFollowUpSupported: true,
      summary: "Identity remains unclear in limited light.",
      inputs: {
        userEnteredName: "Cannabis, flowering",
        evidenceAssetIds: ["dark-photo-1"]
      },
      outputs: { likelyCrop: "unknown crop", confidence: "low" }
    };
    mockSearchParams = {
      toolRunId: "saved-dark-cannabis",
      toolType: "species_crop_id"
    };
    mockListToolRuns.mockResolvedValue([cannabisRun]);
    mockGetToolRun.mockResolvedValue(cannabisRun);

    const screen = render(<SavedToolRunsRoute />);

    expect(
      await screen.findByLabelText(
        "Use suggested question: Male, female, intersex, or unclear from this evidence?"
      )
    ).toBeTruthy();
  });

  it("adds and removes a private location from Plant ID history without a Field Study", async () => {
    const cropRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "species_crop_id",
      growId: null,
      summary: "Magnolia candidate.",
      inputs: {},
      outputs: { likelyCrop: "Magnolia", confidence: "medium" },
      createdAt: "2026-08-02T12:00:00.000Z"
    };
    const locatedRun = {
      ...cropRun,
      inputs: {
        capturedLocation: {
          latitude: 35.7796,
          longitude: -78.6382,
          accuracyMeters: 25,
          privacy: "private",
          userAuthorized: true
        }
      }
    };
    const clearedRun = { ...cropRun, inputs: { capturedLocation: null } };
    mockSearchParams = {
      toolRunId: "run-1",
      toolType: "species_crop_id"
    };
    mockListToolRuns.mockResolvedValue([cropRun]);
    mockGetToolRun.mockResolvedValue(cropRun);
    mockUpdateToolRun.mockResolvedValueOnce(locatedRun).mockResolvedValueOnce(clearedRun);

    const screen = render(<SavedToolRunsRoute />);

    expect(await screen.findByText("Private plant location")).toBeTruthy();
    expect(screen.getByText("No device location saved")).toBeTruthy();
    expect(screen.queryByText("Add this identification to a Field Study")).toBeNull();
    fireEvent.press(screen.getByText("Include Current Location Privately"));

    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenCalledWith(
        "run-1",
        expect.objectContaining({
          inputs: expect.objectContaining({
            capturedLocation: expect.objectContaining({
              latitude: 35.7796,
              longitude: -78.6382,
              privacy: "private",
              userAuthorized: true
            })
          })
        })
      )
    );
    expect(screen.getByText("Exact location saved privately · Not shared")).toBeTruthy();
    expect(
      await screen.findByText(
        "Current location saved privately to this Plant ID only. Field Studies and Nature were not changed."
      )
    ).toBeTruthy();
    expect(mockGetFieldStudy).not.toHaveBeenCalled();
    expect(mockCreateFieldObservation).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Remove Private Location"));
    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenLastCalledWith(
        "run-1",
        expect.objectContaining({
          inputs: expect.objectContaining({ capturedLocation: null })
        })
      )
    );
    expect(screen.getByText("No device location saved")).toBeTruthy();
    expect(
      await screen.findByText(
        "Private location removed from this Plant ID only. Field Studies and Nature were not changed."
      )
    ).toBeTruthy();
  });

  it("does not reselect an older Plant ID when its location update finishes late", async () => {
    const runOne = {
      id: "run-1",
      _id: "run-1",
      toolType: "species_crop_id",
      summary: "First plant",
      inputs: {},
      outputs: { likelyCrop: "Magnolia" }
    };
    const runTwo = {
      id: "run-2",
      _id: "run-2",
      toolType: "species_crop_id",
      summary: "Second plant",
      inputs: {},
      outputs: { likelyCrop: "Rose" }
    };
    const locatedRunOne = {
      ...runOne,
      inputs: {
        capturedLocation: {
          latitude: 35.7796,
          longitude: -78.6382,
          privacy: "private",
          userAuthorized: true
        }
      }
    };
    let resolveUpdate: ((value: typeof locatedRunOne) => void) | undefined;
    mockSearchParams = { toolRunId: "run-1", toolType: "species_crop_id" };
    mockListToolRuns.mockResolvedValue([runOne, runTwo]);
    mockGetToolRun.mockImplementation(async (id: string) =>
      id === "run-2" ? runTwo : runOne
    );
    mockUpdateToolRun.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );

    const screen = render(<SavedToolRunsRoute />);
    expect(await screen.findByLabelText("Selected saved tool run run-1")).toBeTruthy();
    fireEvent.press(screen.getByText("Include Current Location Privately"));
    await waitFor(() => expect(mockUpdateToolRun).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText("Saved tool run run-2"));
    expect(await screen.findByLabelText("Selected saved tool run run-2")).toBeTruthy();

    await act(async () => {
      resolveUpdate?.(locatedRunOne);
    });
    expect(screen.getByLabelText("Selected saved tool run run-2")).toBeTruthy();
    expect(screen.getByText("No device location saved")).toBeTruthy();
  });

  it("links a historical Plant ID to a Field Study as a private draft", async () => {
    const cropRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "species_crop_id",
      growId: null,
      summary: "Magnolia candidate from one photo.",
      inputs: {
        mediaEvidence: [
          {
            id: "asset-1",
            durableUrl: "https://example.com/magnolia.jpg",
            kind: "photo"
          }
        ]
      },
      outputs: {
        likelyCrop: "Magnolia",
        scientificName: "Magnolia spp.",
        confidence: "medium",
        evidence: ["Broad evergreen leaf"],
        missingInformation: ["leaf underside", "flower"]
      },
      createdAt: "2026-08-02T12:00:00.000Z"
    };
    const locatedRun = {
      ...cropRun,
      inputs: {
        ...cropRun.inputs,
        capturedLocation: {
          latitude: 35.7796,
          longitude: -78.6382,
          accuracyMeters: 25,
          privacy: "private",
          userAuthorized: true
        }
      }
    };
    mockSearchParams = {
      toolRunId: "run-1",
      toolType: "species_crop_id",
      fieldStudyId: "study-1"
    };
    mockListToolRuns.mockResolvedValue([cropRun]);
    mockGetToolRun.mockResolvedValue(cropRun);
    mockUpdateToolRun.mockResolvedValue(locatedRun);
    mockGetFieldStudy.mockResolvedValue({
      study: {
        id: "study-1",
        title: "Raleigh park",
        visibility: "private",
        accessRole: "owner"
      },
      observations: []
    });
    mockCreateFieldObservation.mockResolvedValue({
      observation: {
        id: "observation-1",
        sourceToolRunId: "run-1",
        publication: { status: "draft" },
        location: { privacy: "private" }
      }
    });

    const screen = render(<SavedToolRunsRoute />);

    expect(
      await screen.findByText("Add this identification to a Field Study")
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Include Current Location Privately"));
    await waitFor(() => expect(mockRequestCurrentCoordinates).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenCalledWith(
        "run-1",
        expect.objectContaining({
          inputs: expect.objectContaining({
            capturedLocation: expect.objectContaining({
              latitude: 35.7796,
              longitude: -78.6382,
              privacy: "private",
              userAuthorized: true
            })
          })
        })
      )
    );
    fireEvent.press(screen.getByText("Save Private Observation"));

    await waitFor(() =>
      expect(mockCreateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        expect.objectContaining({
          sourceToolRunId: "run-1",
          publication: expect.objectContaining({
            status: "draft",
            cannabisContextConfirmed: false
          }),
          location: expect.objectContaining({
            latitude: 35.7796,
            longitude: -78.6382,
            privacy: "private",
            exactLocationPublicConfirmed: false
          })
        })
      )
    );
    expect(
      await screen.findByText("Saved privately to Raleigh park — not on Nature.")
    ).toBeTruthy();
    expect(screen.getByText("Already Linked")).toBeTruthy();
  });

  it("keeps standalone private location changes out of an existing Field Study observation", async () => {
    const cropRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "species_crop_id",
      growId: null,
      summary: "Magnolia candidate from one photo.",
      inputs: {
        mediaEvidence: [
          {
            id: "asset-1",
            durableUrl: "https://example.com/magnolia.jpg",
            kind: "photo"
          }
        ]
      },
      outputs: {
        likelyCrop: "Magnolia",
        scientificName: "Magnolia spp.",
        confidence: "medium"
      },
      createdAt: "2026-08-02T12:00:00.000Z"
    };
    const locatedRun = {
      ...cropRun,
      inputs: {
        ...cropRun.inputs,
        capturedLocation: {
          latitude: 35.7796,
          longitude: -78.6382,
          accuracyMeters: 25,
          privacy: "private",
          userAuthorized: true
        }
      }
    };
    const linkedObservation = {
      id: "observation-1",
      sourceToolRunId: "run-1",
      identity: {
        commonName: "Magnolia",
        evidence: ["Broad evergreen leaf"]
      },
      evidenceAssets: [{ assetId: "asset-1", kind: "photo" }],
      publication: {
        status: "draft",
        sensitiveSpecies: false,
        cannabisContextConfirmed: false
      },
      location: {
        label: "Raleigh park",
        privacy: "private",
        exactLocationPublicConfirmed: false
      }
    };
    mockSearchParams = {
      toolRunId: "run-1",
      toolType: "species_crop_id",
      fieldStudyId: "study-1"
    };
    mockListToolRuns.mockResolvedValue([cropRun]);
    mockGetToolRun.mockResolvedValue(cropRun);
    mockUpdateToolRun
      .mockResolvedValueOnce(locatedRun)
      .mockResolvedValueOnce({ ...cropRun, inputs: { capturedLocation: null } });
    mockGetFieldStudy.mockResolvedValue({
      study: {
        id: "study-1",
        title: "Raleigh park",
        visibility: "private",
        accessRole: "owner"
      },
      observations: [linkedObservation]
    });
    mockUpdateFieldObservation.mockResolvedValue({
      ...linkedObservation,
      location: {
        ...linkedObservation.location,
        latitude: 35.7796,
        longitude: -78.6382,
        accuracyMeters: 25,
        precision: "exact"
      }
    });
    const screen = render(<SavedToolRunsRoute />);

    expect(await screen.findByText("Already Linked")).toBeTruthy();
    fireEvent.press(screen.getByText("Include Current Location Privately"));

    await waitFor(() =>
      expect(mockUpdateToolRun).toHaveBeenCalledWith(
        "run-1",
        expect.objectContaining({
          inputs: expect.objectContaining({
            capturedLocation: expect.objectContaining({
              latitude: 35.7796,
              longitude: -78.6382,
              privacy: "private",
              userAuthorized: true
            })
          })
        })
      )
    );
    expect(
      await screen.findByText(
        "Current location saved privately to this Plant ID only. Field Studies and Nature were not changed."
      )
    ).toBeTruthy();
    expect(mockUpdateFieldObservation).not.toHaveBeenCalled();
    expect(mockCreateFieldObservation).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Copy Exact Location to Private Field Study Draft"));
    await waitFor(() =>
      expect(mockUpdateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        "observation-1",
        {
          location: {
            label: "Raleigh park",
            privacy: "private",
            exactLocationPublicConfirmed: false,
            latitude: 35.7796,
            longitude: -78.6382,
            accuracyMeters: 25,
            precision: "exact"
          }
        }
      )
    );
    expect(
      await screen.findByText(
        "Exact location copied to the existing private Raleigh park draft. It was not published to Nature."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Remove Private Location"));
    expect(
      await screen.findByText(
        "Private location removed from this Plant ID only. Field Studies and Nature were not changed."
      )
    ).toBeTruthy();
    expect(mockUpdateFieldObservation).toHaveBeenCalledTimes(1);
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
      immutableSnapshotStored: true,
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
          photosAnalyzed: 2,
          stillImagesAnalyzed: 2,
          videoFramesAnalyzed: 1,
          videosAttached: 1,
          videosAnalyzed: 0,
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
    expect(screen.getByText("Still images inspected: 2")).toBeTruthy();
    expect(screen.getByText("Video frames inspected: 1")).toBeTruthy();
    expect(
      screen.getByText("Source video: Saved; extracted still frames analyzed")
    ).toBeTruthy();
    expect(screen.getByText("Image quality: usable")).toBeTruthy();
    expect(screen.getByText("Needs confirmation: Yes")).toBeTruthy();
    expect(
      screen.getByText(
        /OpenAI image review inspected 2 still images, including 1 frame extracted from video/i
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/source video was saved but was not analyzed directly/i)
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

  it("does not claim a failed source-video frame was analyzed", async () => {
    const cropRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "species_crop_id",
      summary: "species_crop_id completed",
      outputs: {
        likelyCrop: "Rose",
        confidence: "medium",
        userConfirmationRequired: true,
        imageAnalysis: {
          requested: true,
          performed: true,
          photosAnalyzed: 1,
          stillImagesAnalyzed: 1,
          videoFramesAnalyzed: 0,
          videosAttached: 1,
          videosAnalyzed: 0,
          quality: "usable"
        }
      },
      createdAt: "2026-08-06T12:00:00.000Z"
    };
    mockListToolRuns.mockResolvedValue([cropRun]);
    mockGetToolRun.mockResolvedValue(cropRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(
      screen.getByText("Source video: Saved; no extracted frame analyzed")
    ).toBeTruthy();
    expect(
      screen.queryByText(/Source video: Saved; extracted still frames analyzed/i)
    ).toBeNull();
  });

  it("does not invent an inspected-image count for a legacy completed review", async () => {
    const cropRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "species_crop_id",
      summary: "Legacy Plant ID result",
      outputs: {
        likelyCrop: "Rose",
        confidence: "medium",
        userConfirmationRequired: true,
        imageAnalysis: {
          requested: true,
          performed: true,
          quality: "usable"
        }
      },
      createdAt: "2026-08-06T12:00:00.000Z"
    };
    mockListToolRuns.mockResolvedValue([cropRun]);
    mockGetToolRun.mockResolvedValue(cropRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(screen.getByText("Still images inspected: Count unavailable")).toBeTruthy();
    expect(
      screen.getByText(
        /completed image review, but the saved still-image count is unavailable/i
      )
    ).toBeTruthy();
    expect(screen.queryByText(/inspected 1 still image/i)).toBeNull();
  });

  it("reopens a limited-light candidate with its defensible candidate name", async () => {
    mockSearchParams = {
      toolRunId: "run-limited-cannabis",
      sourceContext: "saved-runs"
    };
    const cropRun = {
      id: "run-limited-cannabis",
      _id: "run-limited-cannabis",
      toolType: "species_crop_id",
      summary: "species_crop_id completed",
      outputs: {
        likelyCrop: "unknown crop",
        scientificName: null,
        commonNames: [],
        possibleGenera: [],
        confidence: "low",
        identityEvidenceStatus: "candidate_only",
        userConfirmationRequired: true,
        candidates: [
          {
            scientificName: "Cannabis spp.",
            commonNames: ["Cannabis"],
            rank: "genus",
            confidence: "low",
            evidence: ["Sharp bracts, pistils, and resinous sugar leaves remain visible"]
          }
        ],
        imageAnalysis: {
          requested: true,
          performed: true,
          photosAnalyzed: 1,
          stillImagesAnalyzed: 1,
          quality: "limited",
          confidence: "low"
        }
      },
      createdAt: "2026-08-06T12:00:00.000Z"
    };
    mockListToolRuns.mockResolvedValue([cropRun]);
    mockGetToolRun.mockResolvedValue(cropRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() =>
      expect(mockGetToolRun).toHaveBeenCalledWith("run-limited-cannabis")
    );
    expect(screen.getByText("Likely crop: Cannabis")).toBeTruthy();
    expect(screen.getByLabelText("Corrected plant or crop name").props.value).toBe(
      "Cannabis"
    );
  });

  it("shows a draft-only saved candidate with its evidence instead of only its name", async () => {
    const cropRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "species_crop_id",
      summary: "Candidate-only result",
      outputs: {
        likelyCrop: "unknown crop",
        scientificName: null,
        confidence: "low",
        userConfirmationRequired: true,
        identificationDraft: {
          candidates: [
            {
              scientificName: "Cannabis spp.",
              commonNames: ["Cannabis"],
              rank: "genus",
              confidence: "low",
              evidence: ["Sharp bracts and pistils remain visible"]
            }
          ]
        }
      },
      createdAt: "2026-08-06T12:00:00.000Z"
    };
    mockListToolRuns.mockResolvedValue([cropRun]);
    mockGetToolRun.mockResolvedValue(cropRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(screen.getByText("Likely crop: Cannabis")).toBeTruthy();
    expect(screen.getByText(/1\. Cannabis spp\./i)).toBeTruthy();
    expect(screen.getByText(/Sharp bracts and pistils remain visible/i)).toBeTruthy();
  });

  it("saves a user correction while keeping exact species unverified and requesting new photos", async () => {
    const originalRun = {
      id: "run-1",
      _id: "run-1",
      toolType: "species_crop_id",
      immutableSnapshotStored: true,
      secureFollowUpSupported: true,
      summary: "species_crop_id completed",
      outputs: {
        likelyCrop: "Cotton plant",
        scientificName: "Rose plant",
        confidence: "medium",
        userConfirmationRequired: true,
        requiredNextPhotos: []
      },
      createdAt: "2026-07-27T12:00:00.000Z"
    };
    const correctedRun = {
      ...originalRun,
      summary: "User-corrected identity: Rose bush.",
      outputs: {
        ...originalRun.outputs,
        userCorrection: {
          status: "user_corrected",
          commonName: "Rose bush",
          scientificName: null,
          correctedAt: "2026-07-27T13:30:00.000Z",
          previousLikelyCrop: "Cotton plant",
          previousScientificName: "Rose plant"
        },
        confidence: "user_corrected",
        userConfirmationRequired: false,
        requiredNextPhotos: [
          "A new whole-plant photo showing overall growth habit and scale"
        ]
      }
    };
    mockListToolRuns.mockResolvedValue([originalRun]);
    mockGetToolRun.mockResolvedValue(originalRun);
    mockUpdatePlantIdCorrection.mockResolvedValue(correctedRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() => expect(mockGetToolRun).toHaveBeenCalledWith("run-1"));
    expect(screen.getByLabelText("Ask about this result")).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText("Corrected plant or crop name"),
      "Rose bush"
    );
    fireEvent.press(screen.getByText("Save Identification Correction"));

    await waitFor(() =>
      expect(mockUpdatePlantIdCorrection).toHaveBeenCalledWith("run-1", {
        userCorrection: {
          commonName: "Rose bush",
          scientificName: null,
          note: "User corrected the common identity; exact scientific species remains unverified."
        }
      })
    );
    expect(mockUpdateToolRun).not.toHaveBeenCalled();
    expect(await screen.findByText("Likely crop: Rose bush")).toBeTruthy();
    expect(screen.getByText("Scientific name: -")).toBeTruthy();
    expect(screen.getByText("Confidence: user corrected")).toBeTruthy();
    expect(screen.getByText(/original AI draft was rejected/i)).toBeTruthy();
    expect(screen.queryByLabelText("Ask about this result")).toBeNull();
  });

  it("keeps facility Saved Run reloads and corrections inside the facility scope", async () => {
    mockEntitlementMode = "facility";
    mockEntitlementFacilityId = "facility-authoritative";
    mockSearchParams = {
      toolRunId: "facility-run-1",
      workspace: "facility",
      facilityId: "facility-hostile",
      growId: "personal-grow-secret",
      fieldStudyId: "personal-study-secret"
    };
    const originalRun = {
      id: "facility-run-1",
      _id: "facility-run-1",
      toolType: "species_crop_id",
      summary: "Facility Plant ID draft.",
      outputs: {
        likelyCrop: "Unknown flowering plant",
        confidence: "low",
        userConfirmationRequired: true
      },
      createdAt: "2026-08-06T12:00:00.000Z"
    };
    const correctedRun = {
      ...originalRun,
      outputs: {
        ...originalRun.outputs,
        userCorrection: {
          status: "user_corrected",
          commonName: "Rose bush",
          scientificName: null
        }
      }
    };
    mockListToolRuns.mockResolvedValue([originalRun]);
    mockGetToolRun.mockResolvedValue(originalRun);
    mockUpdatePlantIdCorrection.mockResolvedValue(correctedRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceType: "facility",
          facilityId: "facility-authoritative",
          growId: undefined
        })
      )
    );
    await waitFor(() =>
      expect(mockGetToolRun).toHaveBeenCalledWith("facility-run-1", {
        workspaceType: "facility",
        facilityId: "facility-authoritative"
      })
    );
    expect(mockGetFieldStudy).not.toHaveBeenCalled();
    expect(
      screen.getByText("Shared Back /home/facility/ai-tools Prefer true")
    ).toBeTruthy();
    expect(screen.queryByText("Add this identification to a Field Study")).toBeNull();
    expect(screen.queryByText("Re-run with Saved Evidence")).toBeNull();
    fireEvent.changeText(
      screen.getByLabelText("Corrected plant or crop name"),
      "Rose bush"
    );
    fireEvent.press(screen.getByText("Save Identification Correction"));

    await waitFor(() =>
      expect(mockUpdatePlantIdCorrection).toHaveBeenCalledWith(
        "facility-run-1",
        expect.objectContaining({
          userCorrection: expect.objectContaining({ commonName: "Rose bush" })
        }),
        { workspaceType: "facility", facilityId: "facility-authoritative" }
      )
    );
    expect(await screen.findByText("Likely crop: Rose bush")).toBeTruthy();
  });

  it("treats a commercial account route value only as a shared-mode signal", async () => {
    mockSearchParams = {
      toolRunId: "commercial-run-1",
      commercialAccountId: "untrusted-brand-route",
      growId: "personal-grow-secret",
      fieldStudyId: "personal-study-secret"
    };
    const originalRun = {
      id: "commercial-run-1",
      _id: "commercial-run-1",
      toolType: "species_crop_id",
      summary: "Commercial Plant ID draft.",
      outputs: {
        likelyCrop: "Unknown flowering plant",
        confidence: "low",
        userConfirmationRequired: true
      },
      createdAt: "2026-08-06T12:00:00.000Z"
    };
    const correctedRun = {
      ...originalRun,
      outputs: {
        ...originalRun.outputs,
        userCorrection: {
          status: "user_corrected",
          commonName: "Rose bush",
          scientificName: null
        }
      }
    };
    mockListToolRuns.mockResolvedValue([originalRun]);
    mockGetToolRun.mockResolvedValue(originalRun);
    mockUpdatePlantIdCorrection.mockResolvedValue(correctedRun);

    const screen = render(<SavedToolRunsRoute />);

    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith({
        growId: undefined,
        toolType: undefined,
        workspaceType: "commercial"
      })
    );
    await waitFor(() =>
      expect(mockGetToolRun).toHaveBeenCalledWith("commercial-run-1", {
        workspaceType: "commercial"
      })
    );
    expect(mockGetFieldStudy).not.toHaveBeenCalled();
    expect(
      screen.getByText("Shared Back /home/commercial/tools Prefer true")
    ).toBeTruthy();
    expect(screen.queryByText("Add this identification to a Field Study")).toBeNull();
    expect(JSON.stringify(mockListToolRuns.mock.calls)).not.toContain(
      "untrusted-brand-route"
    );
    expect(JSON.stringify(mockGetToolRun.mock.calls)).not.toContain(
      "untrusted-brand-route"
    );

    fireEvent.changeText(
      screen.getByLabelText("Corrected plant or crop name"),
      "Rose bush"
    );
    fireEvent.press(screen.getByText("Save Identification Correction"));

    await waitFor(() =>
      expect(mockUpdatePlantIdCorrection).toHaveBeenCalledWith(
        "commercial-run-1",
        expect.objectContaining({
          userCorrection: expect.objectContaining({ commonName: "Rose bush" })
        }),
        { workspaceType: "commercial" }
      )
    );
    expect(JSON.stringify(mockUpdatePlantIdCorrection.mock.calls)).not.toContain(
      "untrusted-brand-route"
    );
    expect(await screen.findByText("Likely crop: Rose bush")).toBeTruthy();
  });

  it("clears Personal Saved Run and Field Study state when the mounted route becomes commercial", async () => {
    const personalRun = {
      id: "personal-run-1",
      _id: "personal-run-1",
      toolType: "species_crop_id",
      growId: "personal-grow-secret",
      summary: "Personal rose result.",
      outputs: { likelyCrop: "Rose", confidence: "medium" },
      createdAt: "2026-08-06T12:00:00.000Z"
    };
    mockSearchParams = {
      toolRunId: "personal-run-1",
      growId: "personal-grow-secret",
      fieldStudyId: "personal-study-secret"
    };
    mockListToolRuns.mockResolvedValue([personalRun]);
    mockGetToolRun.mockResolvedValue(personalRun);
    mockGetFieldStudy.mockResolvedValue({
      study: {
        id: "personal-study-secret",
        title: "Personal study",
        accessRole: "owner"
      },
      observations: []
    });

    const screen = render(<SavedToolRunsRoute />);

    expect(await screen.findByText("Displayed output: Rose")).toBeTruthy();
    expect(
      await screen.findByText("Add this identification to a Field Study")
    ).toBeTruthy();

    mockEntitlementMode = "commercial";
    mockSearchParams = {};
    mockListToolRuns.mockClear();
    mockGetToolRun.mockClear();
    mockGetFieldStudy.mockClear();
    mockListToolRuns.mockResolvedValue([]);
    screen.rerender(<SavedToolRunsRoute />);

    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith({
        growId: undefined,
        toolType: undefined,
        workspaceType: "commercial"
      })
    );
    await waitFor(() => expect(screen.queryByText("Displayed output: Rose")).toBeNull());
    expect(mockGetToolRun).not.toHaveBeenCalled();
    expect(mockGetFieldStudy).not.toHaveBeenCalled();
    expect(screen.queryByText("Add this identification to a Field Study")).toBeNull();
    expect(
      screen.getByText("Shared Back /home/commercial/tools Prefer true")
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
