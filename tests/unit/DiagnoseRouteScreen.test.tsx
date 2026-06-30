import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DiagnoseRoute from "@/app/home/personal/(tabs)/diagnose";

const mockAnalyzeDiagnosis = jest.fn();
const mockDiagnoseImage = jest.fn();
const mockSubmitDiagnosisFeedback = jest.fn();
const mockCreatePersonalLog = jest.fn();
const mockCreatePersonalTask = jest.fn();
const mockListPersonalPlants = jest.fn();

jest.mock("@/api/diagnose", () => ({
  analyzeDiagnosis: (...args: any[]) => mockAnalyzeDiagnosis(...args),
  diagnoseImage: (...args: any[]) => mockDiagnoseImage(...args),
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
});
