import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import IpmScoutToolRoute, {
  normalizeIpmPrefillField,
  reusableIpmEvidenceError,
  savedIpmEvidenceIds,
  verifiedIpmPrefillMetadata
} from "@/app/home/personal/(tabs)/tools/ipm-scout";

const mockRunCalculator = jest.fn();
const mockCreateGrowpathModuleRecord = jest.fn();
const mockSaveToolRunAndCreateTask = jest.fn();
const mockSaveToolRunAndCreateTasks = jest.fn();
const mockCreateFacilityTask = jest.fn();
const mockUpdateIpmToolRunDecision = jest.fn();
const mockUpdateGrowpathModuleRecord = jest.fn();
const mockAskPersonalAssistant = jest.fn();

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
  updateIpmToolRunDecision: (...args: any[]) => mockUpdateIpmToolRunDecision(...args)
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

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
}));

describe("IpmScoutToolRoute", () => {
  it("recovers only exact durable IPM photos and extracted frames", () => {
    expect(
      savedIpmEvidenceIds({
        toolType: "ipm_scout",
        inputs: {
          evidenceAssetIds: ["photo-a", "frame-b"],
          mediaEvidence: [{ id: "source-video" }]
        },
        outputs: { imageAnalysis: { evidenceUsed: ["frame-b"] } }
      } as any)
    ).toEqual(["photo-a", "frame-b", "source-video"]);

    expect(
      reusableIpmEvidenceError([
        {
          id: "photo-a",
          purpose: "ipm",
          assetType: "photo",
          uploadStatus: "uploaded",
          durableUrl: "/api/evidence-assets/photo-a/object",
          aiUsable: true
        },
        {
          id: "frame-b",
          purpose: "ipm",
          assetType: "video_frame",
          uploadStatus: "uploaded",
          durableUrl: "/api/evidence-assets/frame-b/object",
          aiUsable: true
        }
      ] as any)
    ).toBe("");
    expect(
      reusableIpmEvidenceError([
        {
          id: "diagnosis-photo",
          purpose: "diagnosis",
          assetType: "photo",
          uploadStatus: "uploaded",
          durableUrl: "/api/evidence-assets/diagnosis-photo/object",
          aiUsable: true
        }
      ] as any)
    ).toMatch(/another workflow/i);
  });

  it("normalizes provider evidence arrays into readable scout observations", () => {
    expect(
      normalizeIpmPrefillField({
        fieldKey: "evidence",
        value: [" visible leaf edge browning ", "", "no insect visible"]
      })
    ).toBe("visible leaf edge browning, no insect visible");
    expect(normalizeIpmPrefillField({ fieldKey: "evidence", value: [] })).toBe("");
    expect(normalizeIpmPrefillField({ fieldKey: "plantsChecked", value: ["1"] })).toBe(
      ""
    );
    expect(normalizeIpmPrefillField({ fieldKey: "plantsChecked", value: "1" })).toBe("");
    expect(
      normalizeIpmPrefillField({ fieldKey: "plantsAffected", value: "not confirmed" })
    ).toBe("");
    expect(
      normalizeIpmPrefillField({ fieldKey: "stickyTrapCount", value: "not applicable" })
    ).toBe("");
    expect(
      normalizeIpmPrefillField({ fieldKey: "progression", value: "not determined" })
    ).toBe("");
    expect(
      normalizeIpmPrefillField({ fieldKey: "recentActions", value: "none documented" })
    ).toBe("");
    expect(
      normalizeIpmPrefillField({ fieldKey: "pestSeen", value: "not confirmed" })
    ).toBe("not confirmed");
    expect(
      normalizeIpmPrefillField({
        fieldKey: "pestSeen",
        value: "powdery mildew-like growth, not confirmed"
      })
    ).toBe("not confirmed");
    expect(normalizeIpmPrefillField({ fieldKey: "pestSeen", value: "unknown" })).toBe(
      "not confirmed"
    );
    expect(
      normalizeIpmPrefillField({ fieldKey: "pestSeen", value: "none observed" })
    ).toBe("not confirmed");
    expect(normalizeIpmPrefillField({ fieldKey: "pestSeen", value: "not visible" })).toBe(
      "not confirmed"
    );
    expect(
      normalizeIpmPrefillField({ fieldKey: "leafDamage", value: "leaf-edge browning" })
    ).toBeUndefined();
  });

  it("accepts only an exact server-attested IPM photo/video-frame receipt", () => {
    const imageIds = ["frame-b", "photo-a"];
    const metadata = verifiedIpmPrefillMetadata({
      response: {
        evidenceUsed: ["photo-a", "frame-b"],
        provider: "openai",
        providerLabel: "OpenAI IPM review",
        mediaAnalysis: { photosAnalyzed: 2, providerModel: "gpt-4o-mini" },
        analysisReceipt: {
          aiUsageEventId: "66aa00000000000000000001",
          normalizedIpmResultDigest: "a".repeat(64),
          evidenceFingerprint: [...imageIds].sort().join("|"),
          reviewPolicyVersion: "ipm-observation-differential-v2"
        }
      },
      parsed: {
        imageAnalysisPerformed: "true",
        imageQuality: "limited",
        visualConfidence: "low"
      },
      selectedEvidenceAssetIds: ["source-video", ...imageIds],
      imageEvidenceAssetIds: imageIds
    });
    expect(metadata.imageAnalysis).toMatchObject({
      performed: true,
      photoCount: 2,
      evidenceUsed: ["frame-b", "photo-a"],
      normalizedIpmResultDigest: "a".repeat(64)
    });
  });

  it("rejects a stale or missing IPM receipt before applying AI observations", () => {
    expect(() =>
      verifiedIpmPrefillMetadata({
        response: {
          evidenceUsed: ["old-photo"],
          mediaAnalysis: { photosAnalyzed: 1 }
        },
        parsed: { imageAnalysisPerformed: "true" },
        selectedEvidenceAssetIds: ["new-photo"],
        imageEvidenceAssetIds: ["new-photo"]
      })
    ).toThrow(/could not be matched to this exact photo\/video-frame set/i);
  });

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
    mockUpdateIpmToolRunDecision.mockResolvedValue({ id: "toolrun-1" });
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
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply:
        "White marks alone do not separate powdery mildew from thrips feeding, mites, or residue. Add a neutral-light leaf-top macro, leaf underside, and a direct target close-up.",
      providerLabel: "GrowPath evidence-bound IPM follow-up",
      mediaAnalysis: { requested: true, photosAnalyzed: 2 },
      limitations: ["No direct insect morphology is visible yet."]
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
    expect(
      screen.getByText(/If several organisms or objects appear, say which one/i)
    ).toBeTruthy();
    expect(
      screen.getByLabelText("IPM Scout Other context or question").props.placeholder
    ).toMatch(/Which organism or spot in the photo is the target/i);
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
    expect(screen.getByText("Next evidence or checks")).toBeTruthy();
    expect(screen.getAllByText(/Inspect leaf undersides at 30x/).length).toBeGreaterThan(
      0
    );
    expect(screen.getAllByText(/dated sticky-trap comparison/).length).toBeGreaterThan(0);
    fireEvent.press(screen.getByLabelText("How to add requested evidence"));
    expect(
      screen.getByText(
        /Requested next evidence: dated sticky-trap comparison; Inspect leaf undersides at 30x/
      )
    ).toBeTruthy();
  });

  it("asks an editable evidence-bound IPM follow-up without replacing the result", async () => {
    const screen = render(<IpmScoutToolRoute />);

    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Damage or symptom pattern"),
      "white flecks and silver streaks"
    );
    fireEvent.press(
      screen.getByLabelText("Run IPM Scout and GPT review for 1 AI credit")
    );

    await waitFor(() => expect(screen.getByText("IPM Scout result")).toBeTruthy());
    expect(screen.queryByLabelText("Ask AI About This")).toBeNull();
    fireEvent.press(
      screen.getByLabelText(
        "Use suggested question: Compare thrips, mites, and powdery mildew."
      )
    );
    expect(screen.getByLabelText("Ask about this result").props.value).toBe(
      "Compare thrips, mites, and powdery mildew."
    );
    fireEvent.press(screen.getByLabelText("Ask AI about this result for 1 AI credit"));

    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Compare thrips, mites, and powdery mildew.",
          sourceToolRunId: "toolrun-1",
          context: expect.objectContaining({
            workflow: "ipm-result-follow-up",
            sourceToolRunId: "toolrun-1",
            sourceTool: "ipm-scout"
          })
        })
      )
    );
    expect(
      await screen.findByText(/White marks alone do not separate powdery mildew/)
    ).toBeTruthy();
    expect(screen.getAllByText("Possible spider mite pressure").length).toBeGreaterThan(
      0
    );
    expect(screen.getByText("Evidence inspected: Yes")).toBeTruthy();
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
  });

  it("creates only an evidence-gathering task when the differential is unresolved", async () => {
    mockRunCalculator.mockResolvedValueOnce({
      outputs: {
        suspectedIssue: "Unresolved foliar marks",
        differentialStatus: "unresolved_insufficient_evidence",
        readiness: { status: "needs_distinguishing_evidence" },
        mediaAnalysis: { requested: true, performed: false },
        taskSuggestions: [
          { title: "Apply treatment", sourceStage: "ipm_treatment_decision" },
          { title: "Review outcome", sourceStage: "ipm_outcome_review" }
        ],
        growPathAi: { answer: "Collect more evidence before choosing a cause." }
      },
      toolRun: { id: "toolrun-unresolved", _id: "toolrun-unresolved" }
    });
    const screen = render(<IpmScoutToolRoute />);
    fireEvent.changeText(
      screen.getByLabelText("IPM Scout Damage or symptom pattern"),
      "white flecks and silver streaks"
    );
    fireEvent.press(
      screen.getByLabelText("Run IPM Scout and GPT review for 1 AI credit")
    );
    await waitFor(() => expect(screen.getByText("IPM Scout result")).toBeTruthy());
    fireEvent.press(screen.getByText("Create IPM Task Plan"));
    await waitFor(() => expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalled());
    const tasks = mockSaveToolRunAndCreateTasks.mock.calls.at(-1)?.[0]?.tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      title: "Repeat IPM scout with distinguishing evidence",
      sourceStage: "ipm_inspection"
    });
    expect(JSON.stringify(tasks)).not.toMatch(/apply treatment|review outcome/i);
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
      expect(mockUpdateIpmToolRunDecision).toHaveBeenCalledWith(
        "toolrun-1",
        "uncertain",
        { workspaceType: "personal" }
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
