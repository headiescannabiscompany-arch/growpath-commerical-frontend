import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DiagnoseRoute from "@/app/home/personal/(tabs)/diagnose";

const mockAnalyzeDiagnosis = jest.fn();
const mockDiagnoseImage = jest.fn();
const mockDiagnoseEvidence = jest.fn();
const mockGetDiagnosisProviderStatus = jest.fn();
const mockSubmitDiagnosisFeedback = jest.fn();
const mockCreatePersonalLog = jest.fn();
const mockCreatePersonalTask = jest.fn();
const mockListPersonalPlants = jest.fn();

jest.mock("@/api/diagnose", () => ({
  analyzeDiagnosis: (...args: any[]) => mockAnalyzeDiagnosis(...args),
  diagnoseImage: (...args: any[]) => mockDiagnoseImage(...args),
  diagnoseEvidence: (...args: any[]) => mockDiagnoseEvidence(...args),
  getDiagnosisProviderStatus: (...args: any[]) => mockGetDiagnosisProviderStatus(...args),
  submitDiagnosisFeedback: (...args: any[]) => mockSubmitDiagnosisFeedback(...args)
}));

jest.mock("@/components/media/MediaEvidencePicker", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onChange }: any) =>
    React.createElement(
      Pressable,
      {
        accessibilityLabel: "Attach diagnosis evidence",
        onPress: () =>
          onChange([
            {
              id: "evidence-1",
              _id: "evidence-1",
              assetType: "photo",
              originalUri: "file:///leaf-top.jpg",
              durableUrl: "/uploads/leaf-top.jpg",
              source: "library",
              purpose: "diagnosis",
              uploadStatus: "uploaded",
              qualityWarnings: []
            },
            {
              id: "evidence-2",
              _id: "evidence-2",
              assetType: "photo",
              originalUri: "file:///leaf-bottom.jpg",
              durableUrl: "/uploads/leaf-bottom.jpg",
              source: "library",
              purpose: "diagnosis",
              uploadStatus: "uploaded",
              qualityWarnings: []
            }
          ])
      },
      React.createElement(Text, null, "Attach evidence")
    );
});

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
    mockDiagnoseEvidence.mockResolvedValue({
      id: "diagnosis-vision-1",
      issueSummary: "Possible visual issue",
      severity: 2,
      details: {
        likelyIssues: [],
        recommendations: ["Compare both leaf surfaces."],
        suggestedTags: [],
        disclaimer: "Visual triage."
      }
    });
  });

  it("submits multiple durable evidence photos and their record ids", async () => {
    const screen = render(<DiagnoseRoute />);
    await waitFor(() => expect(mockGetDiagnosisProviderStatus).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Attach diagnosis evidence"));
    fireEvent.press(screen.getByLabelText("Run diagnosis"));

    await waitFor(() =>
      expect(mockDiagnoseEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          photoUrls: ["/uploads/leaf-top.jpg", "/uploads/leaf-bottom.jpg"],
          evidenceAssetIds: ["evidence-1", "evidence-2"]
        })
      )
    );
    expect(mockAnalyzeDiagnosis).not.toHaveBeenCalled();
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
    expect(screen.getByText(/ETGU checks symptom pattern/i)).toBeTruthy();
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
        tags: ["yellowing"],
        rejectedTags: ["ph out of range"],
        aiInsight: expect.objectContaining({
          source: "ai_diagnosis",
          acceptedTags: ["yellowing"],
          rejectedTags: ["ph out of range"],
          missingData: ["Check runoff pH"],
          suggestedTask: "Check runoff pH before changing feed."
        })
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
        description: expect.stringContaining("Next checks: Check runoff pH"),
        dueDate: expect.any(String),
        priority: "medium",
        allDay: true,
        calendarType: "ai_diagnosis_followup",
        sourceStage: "diagnosis_recheck",
        sourceType: "ai_diagnosis",
        sourceObjectId: "diagnosis-1",
        sourceDiagnosisId: "diagnosis-1",
        reminderPlan: { label: "12 hours before", channels: ["in_app"] }
      })
    );
    expect(mockCreatePersonalTask.mock.calls[0][0].description).toContain(
      "Accepted tags: yellowing, ph out of range"
    );
    expect(screen.getByText("Follow-up task created.")).toBeTruthy();
  });
});
