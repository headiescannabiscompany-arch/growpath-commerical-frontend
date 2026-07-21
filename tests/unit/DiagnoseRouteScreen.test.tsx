import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DiagnoseRoute from "@/app/home/personal/(tabs)/diagnose";

const mockAnalyzeDiagnosis = jest.fn();
const mockDiagnoseImage = jest.fn();
const mockDiagnoseEvidence = jest.fn();
const mockGetDiagnosisProviderStatus = jest.fn();
const mockSubmitDiagnosisFeedback = jest.fn();
const mockCreatePersonalLog = jest.fn();
const mockListPersonalLogs = jest.fn();
const mockCreatePersonalTask = jest.fn();
const mockListPersonalPlants = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockCreateEvidenceAsset = jest.fn();

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
  createPersonalLog: (...args: any[]) => mockCreatePersonalLog(...args),
  listPersonalLogs: (...args: any[]) => mockListPersonalLogs(...args)
}));

jest.mock("@/api/evidence", () => {
  const actual = jest.requireActual("@/api/evidence");
  return {
    ...actual,
    createEvidenceAsset: (...args: any[]) => mockCreateEvidenceAsset(...args)
  };
});

jest.mock("@/api/tasks", () => ({
  createPersonalTask: (...args: any[]) => mockCreatePersonalTask(...args)
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args: any[]) => mockListPersonalPlants(...args)
}));

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
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
  async function waitForGrowContext(screen: ReturnType<typeof render>) {
    await waitFor(() =>
      expect(screen.getByText("Grow context: Bruce Banner")).toBeTruthy()
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Diagnosis crop common name").props.value).toBe(
        "Cannabis"
      )
    );
  }

  beforeEach(() => {
    jest.resetAllMocks();
    mockListPersonalPlants.mockResolvedValue([]);
    mockListPersonalLogs.mockResolvedValue([]);
    mockListPersonalGrows.mockResolvedValue([
      {
        id: "grow-1",
        name: "Bruce Banner",
        status: "flowering",
        updatedAt: "2026-07-20T12:00:00.000Z",
        cropCommonName: "Cannabis",
        cultivar: "Bruce Banner"
      }
    ]);
    mockCreatePersonalLog.mockResolvedValue({ id: "log-1" });
    mockCreateEvidenceAsset.mockImplementation(async (input) => ({
      ...input,
      id: "saved-existing-1",
      _id: "saved-existing-1"
    }));
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
      followUpQuestion: "What changed after the last irrigation?",
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
    mockGetDiagnosisProviderStatus.mockResolvedValue({
      provider: {
        providerName: "openai",
        providerModel: "gpt-4o-mini",
        configured: true,
        imageSupport: true
      }
    });
    mockDiagnoseEvidence.mockResolvedValue({
      id: "diagnosis-vision-1",
      issueSummary: "Possible visual issue",
      severity: 2,
      details: {
        likelyIssues: [{ evidence: ["Visible stippling on the upper leaf surface"] }],
        recommendations: ["Compare both leaf surfaces."],
        suggestedTags: [],
        disclaimer: "Visual triage.",
        imageAnalysis: {
          requested: true,
          performed: true,
          photoCount: 2,
          usableForTriage: true,
          qualityIssues: [],
          observedFeatures: ["Leaf surfaces are in focus"],
          limitations: ["Root zone is not visible"],
          provider: "openai",
          providerModel: "gpt-4o-mini"
        },
        cropIdentity: {
          commonName: "Cannabis",
          scientificName: "Cannabis sativa",
          confidence: "high",
          source: "visual_suggestion",
          requiresUserConfirmation: true,
          visibleEvidence: ["Pistils and trichome-covered bracts are visible"],
          alternatives: [],
          clarificationPrompt: "Confirm that this crop is Cannabis."
        },
        followUpQuestion: "What are the current root-zone EC and pH readings?"
      }
    });
    const screen = render(<DiagnoseRoute />);
    await waitForGrowContext(screen);
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
    await waitFor(() =>
      expect(screen.getByText(/2 submitted photos were inspected/i)).toBeTruthy()
    );
    expect(screen.getByText("Photos analyzed")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Draft crop identity")).toBeTruthy();
    expect(
      screen.getByText(/Cannabis \| Cannabis sativa \| high confidence/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Pistils and trichome-covered bracts are visible/i)
    ).toBeTruthy();
    expect(screen.getByText("Photo evidence quality")).toBeTruthy();
    expect(
      screen.getByText(/2 photos inspected \| usable for cautious triage/i)
    ).toBeTruthy();
    expect(screen.getByText(/Root zone is not visible/i)).toBeTruthy();
    expect(
      screen.getByText("What are the current root-zone EC and pH readings?")
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Diagnosis follow-up answer"),
      "No feeding schedule is recorded; specify the next measurements and photos."
    );
    fireEvent.press(screen.getByLabelText("Refine diagnosis"));

    await waitFor(() => expect(mockDiagnoseEvidence).toHaveBeenCalledTimes(2));
    expect(mockDiagnoseEvidence).toHaveBeenLastCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        photoUrls: ["/uploads/leaf-top.jpg", "/uploads/leaf-bottom.jpg"],
        evidenceAssetIds: ["evidence-1", "evidence-2"],
        context: expect.objectContaining({
          priorDiagnosisId: "diagnosis-vision-1",
          priorCropIdentity: expect.objectContaining({
            commonName: "Cannabis",
            confidence: "high",
            source: "visual_suggestion",
            requiresUserConfirmation: true
          }),
          followUpQuestion: "What are the current root-zone EC and pH readings?",
          followUpAnswer:
            "No feeding schedule is recorded; specify the next measurements and photos."
        })
      })
    );
    expect(mockAnalyzeDiagnosis).not.toHaveBeenCalled();
  });

  it("tells the user exactly when submitted photos need replacement", async () => {
    mockGetDiagnosisProviderStatus.mockResolvedValue({
      provider: {
        providerName: "openai",
        providerModel: "gpt-4o-mini",
        configured: true,
        imageSupport: true
      }
    });
    mockDiagnoseEvidence.mockResolvedValue({
      id: "diagnosis-vision-unusable",
      issueSummary: "Photo evidence needs replacement",
      severity: 1,
      details: {
        likelyIssues: [],
        recommendations: ["Retake one whole-plant photo in even light."],
        suggestedTags: [],
        disclaimer: "No useful visual triage was possible from these photos.",
        providerName: "openai",
        providerModel: "gpt-4o-mini",
        imageAnalysis: {
          requested: true,
          performed: true,
          photoCount: 2,
          usableForTriage: false,
          qualityIssues: [
            "Both photos are too blurry to inspect leaf detail.",
            "A whole-plant context photo is missing."
          ],
          observedFeatures: [],
          limitations: ["Leaf surfaces cannot be compared"]
        },
        cropIdentity: {
          commonName: "",
          scientificName: "",
          confidence: "low",
          source: "insufficient_evidence",
          requiresUserConfirmation: true,
          visibleEvidence: [],
          alternatives: [],
          clarificationPrompt: "Retake a sharp whole-plant and close leaf photo."
        },
        followUpQuestion: "Can you add one sharp whole-plant photo in neutral light?"
      }
    });

    const screen = render(<DiagnoseRoute />);
    await waitForGrowContext(screen);
    await waitFor(() => expect(mockGetDiagnosisProviderStatus).toHaveBeenCalled());

    fireEvent.press(screen.getByLabelText("Attach diagnosis evidence"));
    fireEvent.press(screen.getByLabelText("Run diagnosis"));

    await waitFor(() => expect(mockDiagnoseEvidence).toHaveBeenCalled());
    expect(screen.getAllByText(/Both photos are too blurry/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/A whole-plant context photo is missing/i).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/2 photos inspected \| replacement needed/i)).toBeTruthy();
    expect(screen.getByText(/Leaf surfaces cannot be compared/i)).toBeTruthy();
    expect(
      screen.getByText(/Can you add one sharp whole-plant photo in neutral light/i)
    ).toBeTruthy();
  });

  it("reuses an existing grow photo as explicit diagnosis evidence", async () => {
    mockListPersonalLogs.mockResolvedValue([
      {
        id: "log-photo-1",
        growId: "grow-1",
        date: "2026-07-20T12:00:00.000Z",
        title: "Ready to chop",
        notes: "",
        photos: ["/uploads/existing-flower.jpg"],
        photoMetadata: [
          {
            url: "/uploads/existing-flower.jpg",
            plantId: "plant-photo-1",
            mimeType: "image/jpeg",
            createdAt: "2026-07-20T12:00:00.000Z"
          }
        ],
        createdAt: "2026-07-20T12:00:00.000Z",
        updatedAt: "2026-07-20T12:00:00.000Z"
      }
    ]);
    mockGetDiagnosisProviderStatus.mockResolvedValue({
      provider: {
        providerName: "openai",
        providerModel: "gpt-4o-mini",
        configured: true,
        imageSupport: true
      }
    });

    const screen = render(<DiagnoseRoute />);
    await waitForGrowContext(screen);
    await waitFor(() =>
      expect(screen.getByText("Diagnosis and photo analysis ready")).toBeTruthy()
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Use saved photo Ready to chop, item 1")).toBeTruthy()
    );

    expect(
      screen.getByLabelText("Saved grow photo Ready to chop").props.source.uri
    ).toMatch(/^https?:\/\//);
    fireEvent.press(screen.getByLabelText("Use saved photo Ready to chop, item 1"));

    await waitFor(() =>
      expect(mockCreateEvidenceAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          plantId: "plant-photo-1",
          logId: "log-photo-1",
          originalUri: "/uploads/existing-flower.jpg",
          durableUrl: "/uploads/existing-flower.jpg",
          purpose: "diagnosis",
          aiUsable: true
        })
      )
    );
    expect(screen.getByText("Added saved grow photo: Ready to chop.")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByLabelText("Run diagnosis").props.disabled).not.toBe(true)
    );

    fireEvent.press(screen.getByLabelText("Run diagnosis"));
    await waitFor(() =>
      expect(mockDiagnoseEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          photoUrls: ["/uploads/existing-flower.jpg"],
          evidenceAssetIds: ["saved-existing-1"]
        })
      )
    );
  });

  it("falls back to the full plant list when the grow-filtered response is empty", async () => {
    mockListPersonalPlants.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "plant-1", growId: "grow-1", name: "Bruce Banner #1" },
      { id: "plant-2", growId: "other-grow", name: "Other grow plant" }
    ]);

    const screen = render(<DiagnoseRoute />);
    await waitForGrowContext(screen);

    await waitFor(() =>
      expect(screen.getByLabelText("Diagnose plant Bruce Banner #1")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Diagnose plant Other grow plant")).toBeNull();
  });

  it("lets users accept or reject diagnosis tags before saving to the grow journal", async () => {
    const screen = render(<DiagnoseRoute />);
    await waitForGrowContext(screen);

    await waitFor(() =>
      expect(screen.getByText("Diagnosis provider needs verification")).toBeTruthy()
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

  it("explains readiness and preserves structured evidence during follow-up", async () => {
    const screen = render(<DiagnoseRoute />);
    await waitForGrowContext(screen);

    expect(
      screen.getByText(
        "Add written symptom notes or at least one uploaded photo to run diagnosis."
      )
    ).toBeTruthy();
    expect(screen.getByLabelText("Run diagnosis").props.accessibilityHint).toMatch(
      /Add written symptom notes/
    );

    fireEvent.changeText(
      screen.getByLabelText("Diagnosis notes"),
      "Interveinal yellowing began after the last irrigation"
    );
    fireEvent.press(screen.getByLabelText("Diagnosis progression spreading slowly"));
    fireEvent.press(screen.getByLabelText("Diagnosis temperature unit degrees C"));
    fireEvent.changeText(screen.getByLabelText("Diagnosis temperature"), "24");
    fireEvent.changeText(screen.getByLabelText("Diagnosis RH"), "60");
    fireEvent.changeText(screen.getByLabelText("Diagnosis VPD"), "1.2");
    fireEvent.changeText(screen.getByLabelText("Diagnosis feed pH"), "6.3");

    expect(screen.getByText(/Ready with written symptoms/)).toBeTruthy();
    expect(screen.getByText(/4 measured values are included/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Run diagnosis"));

    await waitFor(() => expect(mockAnalyzeDiagnosis).toHaveBeenCalledTimes(1));
    expect(mockAnalyzeDiagnosis).toHaveBeenLastCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        pattern: expect.objectContaining({
          location: "upper new growth",
          progression: "spreading slowly",
          notes: "Interveinal yellowing began after the last irrigation"
        }),
        environment: {
          temp: "24",
          tempUnit: "C",
          rh: "60",
          vpd: "1.2"
        },
        numbers: expect.objectContaining({ feedPH: "6.3" })
      })
    );

    fireEvent.changeText(
      screen.getByLabelText("Diagnosis follow-up answer"),
      "Symptoms slowed after the root zone dried."
    );
    fireEvent.press(screen.getByLabelText("Refine diagnosis"));

    await waitFor(() => expect(mockAnalyzeDiagnosis).toHaveBeenCalledTimes(2));
    expect(mockAnalyzeDiagnosis).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pattern: expect.objectContaining({ progression: "spreading slowly" }),
        environment: expect.objectContaining({ temp: "24", tempUnit: "C" }),
        numbers: expect.objectContaining({ feedPH: "6.3" }),
        followUpQuestion: "What changed after the last irrigation?",
        followUpAnswer: "Symptoms slowed after the root zone dried."
      })
    );
  });

  it("creates source-linked follow-up tasks from diagnosis results", async () => {
    const screen = render(<DiagnoseRoute />);
    await waitForGrowContext(screen);

    await waitFor(() =>
      expect(screen.getByText("Diagnosis provider needs verification")).toBeTruthy()
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

  it("does not pretend a text-only provider analyzed attached photos", async () => {
    mockGetDiagnosisProviderStatus.mockResolvedValue({
      provider: {
        providerName: "growpathai",
        providerModel: "deterministic-etgu-v1",
        configured: true,
        imageSupport: false,
        mode: "deterministic_triage"
      }
    });
    const screen = render(<DiagnoseRoute />);
    await waitForGrowContext(screen);

    await waitFor(() =>
      expect(screen.getByText("Text diagnosis engine ready")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Attach diagnosis evidence"));

    expect(
      screen.getByText(/A photo-only request would otherwise produce a generic result/i)
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Run diagnosis"));
    expect(mockDiagnoseEvidence).not.toHaveBeenCalled();

    fireEvent.changeText(
      screen.getByLabelText("Diagnosis notes"),
      "Yellowing begins on lower leaves"
    );
    fireEvent.press(screen.getByLabelText("Run diagnosis"));

    await waitFor(() => expect(mockDiagnoseEvidence).toHaveBeenCalled());
  });

  it("shows the selected grow by name so diagnosis results can be saved", async () => {
    const screen = render(<DiagnoseRoute />);

    await waitFor(() => expect(mockListPersonalGrows).toHaveBeenCalled());
    expect(screen.getByLabelText("Select diagnosis grow Bruce Banner")).toBeTruthy();
    await waitForGrowContext(screen);
  });
});
