import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DiagnoseRoute from "@/app/home/personal/(tabs)/diagnose";

const mockAnalyzeDiagnosis = jest.fn();
const mockDiagnoseImage = jest.fn();
const mockGetDiagnosisProviderStatus = jest.fn();
const mockSubmitDiagnosisFeedback = jest.fn();
const mockCreatePersonalLog = jest.fn();
const mockCreatePersonalTask = jest.fn();
const mockListPersonalPlants = jest.fn();

jest.mock("@/api/diagnose", () => ({
  analyzeDiagnosis: (...args: any[]) => mockAnalyzeDiagnosis(...args),
  diagnoseImage: (...args: any[]) => mockDiagnoseImage(...args),
  getDiagnosisProviderStatus: (...args: any[]) => mockGetDiagnosisProviderStatus(...args),
  submitDiagnosisFeedback: (...args: any[]) => mockSubmitDiagnosisFeedback(...args)
}));

jest.mock("@/api/logs", () => ({
  createPersonalLog: (...args: any[]) => mockCreatePersonalLog(...args)
}));

jest.mock("@/api/tasks", () => ({
  createPersonalTask: (...args: any[]) => mockCreatePersonalTask(...args)
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args: any[]) => mockListPersonalPlants(...args)
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { DIAGNOSE_AI: "diagnose_ai" },
  useEntitlements: () => ({ can: () => true })
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  useRouter: () => ({ back: jest.fn() })
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
});

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" }
}));

describe("DiagnoseRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListPersonalPlants.mockResolvedValue([]);
    mockCreatePersonalLog.mockResolvedValue({ id: "log-1" });
    mockCreatePersonalTask.mockResolvedValue({ id: "task-1" });
    mockGetDiagnosisProviderStatus.mockResolvedValue({
      provider: {
        providerName: "openai",
        providerModel: "gpt-4o-mini",
        configured: false,
        imageSupport: true
      }
    });
    mockAnalyzeDiagnosis.mockResolvedValue({
      id: "diagnosis-1",
      issueSummary: "Possible pH issue",
      severity: 2,
      confidence: "medium",
      details: {
        likelyIssues: [{ evidence: ["Leaf yellowing"], nextChecks: ["Check runoff pH"] }],
        recommendations: ["Check runoff pH before changing feed."],
        suggestedTags: ["yellowing", "ph out of range"],
        disclaimer: "Plant-health triage.",
        providerName: "growpath_heuristic",
        providerModel: "diagnosis-etgu-heuristic-1"
      }
    });
  });

  it("lets users accept or reject diagnosis tags before saving to the grow journal", async () => {
    const screen = render(<DiagnoseRoute />);

    await waitFor(() =>
      expect(screen.getByText("Production AI provider needs verification")).toBeTruthy()
    );
    expect(screen.getByText("Shared Back /home/personal")).toBeTruthy();
    expect(mockGetDiagnosisProviderStatus).toHaveBeenCalled();
    expect(screen.getByText(/Photos are used for this diagnosis request/i)).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Diagnosis notes"), "Yellowing leaves");
    fireEvent.press(screen.getByLabelText("Run diagnosis"));

    await waitFor(() => expect(mockAnalyzeDiagnosis).toHaveBeenCalled());
    expect(screen.getByText("Accepted tags")).toBeTruthy();
    expect(screen.getByText("yellowing")).toBeTruthy();
    expect(screen.getByText("ph out of range")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Diagnosis tag ph out of range"));
    fireEvent.press(screen.getByText("Save to Grow Log"));

    await waitFor(() => expect(mockCreatePersonalLog).toHaveBeenCalled());
    expect(mockCreatePersonalLog).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        diagnosisId: "diagnosis-1",
        tags: ["yellowing"]
      })
    );
  });

  it("creates source-linked follow-up tasks from diagnosis results", async () => {
    const screen = render(<DiagnoseRoute />);

    await waitFor(() =>
      expect(screen.getByText("Production AI provider needs verification")).toBeTruthy()
    );

    fireEvent.changeText(
      screen.getByLabelText("Diagnosis notes"),
      "Interveinal yellowing on older leaves"
    );
    fireEvent.press(screen.getByLabelText("Run diagnosis"));

    await waitFor(() => expect(mockAnalyzeDiagnosis).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText("Create Follow-up Task"));

    await waitFor(() => expect(mockCreatePersonalTask).toHaveBeenCalled());
    expect(mockCreatePersonalTask).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        linkedGrowId: "grow-1",
        title: "Follow up: Possible pH issue",
        description: "Check runoff pH before changing feed.",
        sourceType: "ai_diagnosis",
        sourceObjectId: "diagnosis-1",
        sourceDiagnosisId: "diagnosis-1"
      })
    );
    expect(screen.getByText("Follow-up task created.")).toBeTruthy();
  });
});
