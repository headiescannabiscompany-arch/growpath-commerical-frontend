import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  within
} from "@testing-library/react-native";

import AiScreen, {
  assistantQuickQuestions,
  facilityAiPresetFor,
  textIncludesCannabisContext
} from "@/app/home/personal/(tabs)/ai";

const mockListPersonalGrows = jest.fn();
const mockListPersonalLogs = jest.fn();
const mockListPersonalTasks = jest.fn();
const mockListPersonalPlants = jest.fn();
const mockListToolRuns = jest.fn();
const mockGetDiagnosisHistory = jest.fn();
const mockCreatePersonalTask = jest.fn();
const mockAskPersonalAssistant = jest.fn();
const mockListNutrientRecipes = jest.fn();
const mockListTelemetrySources = jest.fn();
const mockGetTelemetryPoints = jest.fn();
const mockApiRequest = jest.fn();
const mockGetFacilityTasks = jest.fn();
const mockCreateFacilityTask = jest.fn();
const mockFetchCommercialGrows = jest.fn();
const mockGetFacilityComplianceExport = jest.fn();
const mockRouterPush = jest.fn();
const mockMediaEvidencePickerProps = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockRouterPush })
}));

jest.mock("@/components/media/MediaEvidencePicker", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockMediaEvidencePicker(props: any) {
    mockMediaEvidencePickerProps(props);
    return <Text>Attach grow evidence</Text>;
  };
});

jest.mock("@/api/grows", () => ({
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
}));

jest.mock("@/api/logs", () => ({
  createPersonalLog: jest.fn(),
  listPersonalLogs: (...args: any[]) => mockListPersonalLogs(...args)
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args: any[]) => mockListPersonalPlants(...args)
}));

jest.mock("@/api/tasks", () => ({
  createPersonalTask: (...args: any[]) => mockCreatePersonalTask(...args),
  listPersonalTasks: (...args: any[]) => mockListPersonalTasks(...args)
}));

jest.mock("@/api/diagnose", () => ({
  getDiagnosisHistory: (...args: any[]) => mockGetDiagnosisHistory(...args)
}));

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args: any[]) => mockListToolRuns(...args)
}));

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
}));

jest.mock("@/api/nutrientRecipes", () => ({
  listNutrientRecipes: (...args: any[]) => mockListNutrientRecipes(...args)
}));

jest.mock("@/api/telemetry", () => ({
  listTelemetrySources: (...args: any[]) => mockListTelemetrySources(...args),
  getTelemetryPoints: (...args: any[]) => mockGetTelemetryPoints(...args)
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/facilityTasks", () => ({
  getFacilityTasks: (...args: any[]) => mockGetFacilityTasks(...args),
  createFacilityTask: (...args: any[]) => mockCreateFacilityTask(...args)
}));

jest.mock("@/api/commercialWorkflows", () => ({
  fetchCommercialGrows: (...args: any[]) => mockFetchCommercialGrows(...args)
}));

jest.mock("@/api/complianceExport", () => ({
  getFacilityComplianceExport: (...args: any[]) =>
    mockGetFacilityComplianceExport(...args)
}));

describe("personal AI screen", () => {
  afterEach(cleanup);
  beforeEach(() => {
    jest.resetAllMocks();
    mockSearchParams = {};
    mockListPersonalGrows.mockResolvedValue([
      {
        id: "grow-1",
        name: "Flower Room",
        status: "flowering",
        updatedAt: "2026-06-28T12:00:00.000Z"
      }
    ]);
    mockListPersonalLogs.mockResolvedValue([
      {
        id: "log-1",
        growId: "grow-1",
        title: "Canopy check",
        date: "2026-06-28T12:00:00.000Z",
        notes: "Raised light and checked airflow."
      }
    ]);
    mockListPersonalTasks.mockResolvedValue([
      {
        id: "task-1",
        growId: "grow-1",
        title: "Inspect lowers",
        dueDate: "2026-06-29T12:00:00.000Z",
        description: "Look for humidity pockets.",
        completed: false
      }
    ]);
    mockListPersonalPlants.mockResolvedValue([]);
    mockListToolRuns.mockResolvedValue([]);
    mockGetDiagnosisHistory.mockResolvedValue([]);
    mockListNutrientRecipes.mockResolvedValue([]);
    mockListTelemetrySources.mockResolvedValue([]);
    mockGetTelemetryPoints.mockResolvedValue({ points: [] });
    mockAskPersonalAssistant.mockRejectedValue(new Error("assistant unavailable"));
    mockCreatePersonalTask.mockResolvedValue({ id: "ai-task-1" });
    mockApiRequest.mockResolvedValue([]);
    mockGetFacilityTasks.mockResolvedValue([]);
    mockCreateFacilityTask.mockResolvedValue({ id: "facility-task-1" });
    mockFetchCommercialGrows.mockResolvedValue([
      {
        id: "commercial-grow-1",
        growName: "Commercial Trial",
        cropType: "hemp"
      }
    ]);
    mockGetFacilityComplianceExport.mockResolvedValue({
      success: true,
      exportType: "facility_compliance_packet",
      facilityId: "facility-1",
      generatedAt: "2026-07-22T19:00:00.000Z",
      filters: {},
      counts: {
        auditLogs: 36,
        deviations: 0,
        verifications: 0,
        sopTemplates: 0,
        sopRuns: 0
      },
      evidenceSummary: {
        sopRuns: {
          totalRuns: 0,
          completedRuns: 0,
          inProgressRuns: 0,
          totalSteps: 0,
          doneSteps: 0,
          skippedSteps: 0,
          pendingSteps: 0,
          runsMissingSteps: 0
        }
      },
      collections: {}
    });
  });

  it("answers VPD commands and context-aware task prompts", async () => {
    const screen = render(<AiScreen />);

    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());
    expect(screen.getByText("Grows: 1")).toBeTruthy();
    expect(screen.getByPlaceholderText("Type here...").props).toMatchObject({
      autoComplete: "off",
      textContentType: "none",
      importantForAutofill: "no"
    });

    fireEvent.changeText(screen.getByPlaceholderText("Type here..."), "vpd 78f 60");
    fireEvent.press(screen.getByText("Send"));

    await waitFor(() => expect(screen.getByText(/VPD approx/)).toBeTruthy());

    fireEvent.changeText(screen.getByPlaceholderText("Type here..."), "what is next");
    fireEvent.press(screen.getByText("Send"));

    await waitFor(() =>
      expect(screen.getByText(/Next open task: Inspect lowers/)).toBeTruthy()
    );
  });

  it("keeps useful AI context when one source is unavailable", async () => {
    mockListPersonalLogs.mockRejectedValue(new Error("logs unavailable"));

    const screen = render(<AiScreen />);

    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());
    expect(screen.getByText("Grows: 1")).toBeTruthy();
    expect(screen.getByText("Logs: 0")).toBeTruthy();
    expect(
      screen.getByText(/Partial context: logs unavailable\. AI can still use/)
    ).toBeTruthy();
  });

  it("exposes workspace, grow context, quick-question, and send state", async () => {
    let finishAssistant: ((value: any) => void) | undefined;
    mockAskPersonalAssistant.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishAssistant = resolve;
        })
    );
    const screen = render(<AiScreen />);

    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());

    expect(screen.getByLabelText("Open Single user AI").props).toMatchObject({
      accessibilityRole: "link",
      accessibilityState: { selected: true }
    });
    expect(screen.getByLabelText("Open Commercial AI").props).toMatchObject({
      accessibilityRole: "link",
      accessibilityState: { selected: false }
    });
    expect(screen.getByLabelText("AI grow context").props.accessibilityRole).toBe(
      "radiogroup"
    );
    expect(screen.getByLabelText("Select AI grow Flower Room").props).toMatchObject({
      accessibilityRole: "radio",
      accessibilityState: { checked: true }
    });

    expect(screen.getByLabelText("Send").props.accessibilityState).toEqual({
      disabled: true,
      busy: false
    });
    const quickQuestion = screen.getAllByLabelText(/^Use quick question:/)[0];
    expect(quickQuestion.props.accessibilityState).toEqual({ disabled: false });

    fireEvent.changeText(screen.getByPlaceholderText("Type here..."), "Review my grow");
    expect(screen.getByLabelText("Send").props.accessibilityState).toEqual({
      disabled: false,
      busy: false
    });
    fireEvent.press(screen.getByLabelText("Send"));

    await waitFor(() =>
      expect(screen.getByLabelText("Send").props.accessibilityState).toEqual({
        disabled: true,
        busy: true
      })
    );
    expect(
      screen.getAllByLabelText(/^Use quick question:/)[0].props.accessibilityState
    ).toEqual({ disabled: true });

    await act(async () =>
      finishAssistant?.({
        success: true,
        reply: "Review complete.",
        actions: [],
        referencedData: [],
        proposedWrites: []
      })
    );
    await waitFor(() => expect(screen.getByText("Review complete.")).toBeTruthy());
    expect(
      screen
        .UNSAFE_getAllByProps({ accessibilityLiveRegion: "polite" })
        .some((region) => Boolean(within(region).queryByText("Review complete.")))
    ).toBe(true);
  });

  it("sends the saved evidence id instead of the temporary picker id", async () => {
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: "I reviewed the saved photo.",
      actions: [],
      referencedData: [],
      proposedWrites: []
    });
    const screen = render(<AiScreen />);
    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());

    act(() => {
      mockMediaEvidencePickerProps.mock.calls.at(-1)?.[0]?.onChange?.([
        {
          id: "evidence-local-1",
          _id: "66aa00000000000000000001",
          assetType: "photo",
          originalUri: "/api/evidence-assets/uploads/66bb00000000000000000001/object",
          durableUrl: "/api/evidence-assets/uploads/66bb00000000000000000001/object",
          source: "library",
          purpose: "diagnosis",
          uploadStatus: "uploaded",
          aiUsable: true,
          qualityWarnings: []
        }
      ]);
    });
    fireEvent.changeText(screen.getByPlaceholderText("Type here..."), "review photo");
    fireEvent.press(screen.getByText("Send"));

    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          evidenceAssetIds: ["66aa00000000000000000001"]
        })
      )
    );
  });

  it("fills a cannabis-aware quick question without spending a credit until Send", async () => {
    mockListPersonalPlants.mockResolvedValue([
      {
        id: "plant-1",
        growId: "grow-1",
        cropCommonName: "Cannabis",
        scientificName: "Cannabis sativa",
        growthProfile: { confirmationStatus: "user_confirmed" }
      }
    ]);
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: "The visible node is not conclusive yet.",
      actions: [],
      referencedData: [],
      proposedWrites: []
    });

    const screen = render(<AiScreen />);
    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());

    const question =
      "Male, female, intersex, or too early to tell? Explain exactly what is visible and what photo would confirm it.";
    fireEvent.press(screen.getByLabelText(`Use quick question: ${question}`));

    expect(screen.getByPlaceholderText("Type here...").props.value).toBe(question);
    expect(mockAskPersonalAssistant).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Send"));
    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
        expect.objectContaining({ message: question, growId: "grow-1" })
      )
    );
  });

  it("offers a crop-neutral plant-sex question without surfacing cannabis wording", () => {
    const questions = assistantQuickQuestions({
      workspaceType: "personal",
      cannabisContext: false
    });

    expect(questions).toContain(
      "Is this plant male, female, intersex, or too early to tell? Explain exactly what the photos support and what photo would confirm it."
    );
    expect(questions.join(" ")).not.toMatch(/cannabis|hemp|cultivar|strain/i);
    expect(questions).toContain(
      "What do these photos show, and what evidence is missing before you are confident?"
    );
  });

  it("recognizes canonical Personal and Commercial cannabis context shapes", () => {
    expect(textIncludesCannabisContext({ cropTypes: ["Cannabis"] })).toBe(true);
    expect(
      textIncludesCannabisContext({
        growInterests: { primary: ["hemp"], secondary: ["vegetables"] }
      })
    ).toBe(true);
    expect(textIncludesCannabisContext({ cropType: "Cannabis sativa" })).toBe(true);
    expect(textIncludesCannabisContext({ cropTypes: ["tomato"] })).toBe(false);
    expect(
      textIncludesCannabisContext({
        scientificName: "Cannabis sativa",
        growthProfile: { confirmationStatus: "user_confirmed" }
      })
    ).toBe(true);
  });

  it("does not expose cannabis questions from negative, unconfirmed, or rejected text", () => {
    expect(
      textIncludesCannabisContext({
        cropTypes: ["tomato"],
        notes: "This is not cannabis; compare the leaf shape only."
      })
    ).toBe(false);
    expect(textIncludesCannabisContext({ cropTypes: ["not cannabis"] })).toBe(false);
    expect(
      textIncludesCannabisContext({
        cropTypes: ["rose"],
        exclusions: ["cannabis"],
        rejectedCandidates: [{ scientificName: "Cannabis sativa" }]
      })
    ).toBe(false);
    expect(
      textIncludesCannabisContext({
        scientificName: "Cannabis sativa",
        growthProfile: { confirmationStatus: "needs_confirmation" }
      })
    ).toBe(false);
  });

  it("does not send a source video before extracted frames are ready", async () => {
    const screen = render(<AiScreen />);
    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());
    act(() => {
      mockMediaEvidencePickerProps.mock.calls.at(-1)?.[0]?.onChange?.([
        {
          id: "source-video",
          _id: "66aa00000000000000000009",
          assetType: "video",
          durableUrl: "/uploads/source-video.mov",
          source: "library",
          purpose: "other",
          uploadStatus: "uploaded",
          aiUsable: true,
          qualityWarnings: []
        }
      ]);
    });
    fireEvent.changeText(screen.getByPlaceholderText("Type here..."), "Male or female?");
    fireEvent.press(screen.getByText("Send"));
    await waitFor(() =>
      expect(screen.getByText(/no reviewable still frames are ready yet/i)).toBeTruthy()
    );
    expect(mockAskPersonalAssistant).not.toHaveBeenCalled();
  });

  it("sends the exact source-video and extracted-frame set for a visual question", async () => {
    mockAskPersonalAssistant.mockResolvedValueOnce({
      success: true,
      reply: "The visible nodes are not sufficient to confirm plant sex.",
      actions: [],
      referencedData: [],
      proposedWrites: []
    });
    const sourceVideoId = "66aa00000000000000000009";
    const frameIds = [
      "66aa00000000000000000010",
      "66aa00000000000000000011",
      "66aa00000000000000000012"
    ];
    const screen = render(<AiScreen />);
    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());
    act(() => {
      mockMediaEvidencePickerProps.mock.calls.at(-1)?.[0]?.onChange?.([
        {
          id: "source-video",
          _id: sourceVideoId,
          assetType: "video",
          durableUrl: "/uploads/source-video.mov",
          source: "library",
          purpose: "other",
          uploadStatus: "uploaded",
          aiUsable: true,
          qualityWarnings: []
        },
        ...frameIds.map((id, index) => ({
          id: `source-frame-${index + 1}`,
          _id: id,
          assetType: "photo",
          durableUrl: `/uploads/source-frame-${index + 1}.jpg`,
          source: "generated",
          purpose: "other",
          sourceVideoEvidenceAssetId: sourceVideoId,
          uploadStatus: "uploaded",
          aiUsable: true,
          qualityWarnings: []
        }))
      ]);
    });
    fireEvent.changeText(screen.getByPlaceholderText("Type here..."), "Male or female?");
    fireEvent.press(screen.getByText("Send"));

    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Male or female?",
          evidenceAssetIds: [sourceVideoId, ...frameIds]
        })
      )
    );
  });

  it("requires confirmation before creating AI-suggested tasks", async () => {
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: "I drafted a follow-up task for your humidity issue.",
      proposedWrites: [
        {
          type: "create_task",
          payload: {
            title: "Check humidity pockets after lights out",
            description: "Inspect dense canopy and corners before the next dark cycle.",
            priority: "high",
            sourceObjectId: "assistant-thread-1"
          }
        }
      ],
      actions: [],
      referencedData: [],
      conversationId: "conversation-1",
      providerLabel: "GPT-assisted grow review"
    });

    const screen = render(<AiScreen />);

    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());

    fireEvent.changeText(
      screen.getByPlaceholderText("Type here..."),
      "turn this into a task"
    );
    fireEvent.press(screen.getByText("Send"));

    await waitFor(() =>
      expect(screen.getByText("Drafted actions require confirmation")).toBeTruthy()
    );
    await waitFor(() =>
      expect(screen.getByText("GPT-assisted grow review")).toBeTruthy()
    );
    expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        conversationId: undefined,
        evidenceAssetIds: []
      })
    );
    expect(mockCreatePersonalTask).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Confirm create_task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenCalledWith({
        growId: "grow-1",
        linkedGrowId: "grow-1",
        title: "Check humidity pockets after lights out",
        description: "Inspect dense canopy and corners before the next dark cycle.",
        priority: "high",
        dueDate: undefined,
        allDay: true,
        calendarType: "ai_assistant_followup",
        sourceStage: "ai_suggested_action",
        sourceType: "ai_assistant",
        sourceObjectId: "assistant-thread-1",
        reminderPlan: undefined
      })
    );
    expect(screen.getByText("AI suggested task created.")).toBeTruthy();
  });

  it("loads Commercial grow context without leaking a Personal grow or task", async () => {
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      intent: "sop_recommendation",
      reply: "I found one review-only procedure draft.",
      actions: [],
      referencedData: [],
      proposedWrites: [],
      sopRecommendations: [
        {
          key: "ipm_scouting_escalation",
          sourceVersion: 2,
          title: "IPM Scouting and Escalation",
          category: "ipm",
          summary: "A repeatable visual scouting record.",
          whyRecommended: "It matches the scouting request and selected grow.",
          checklist: [
            "Confirm the inspection scope.",
            "Separate observations from suspected causes."
          ],
          safetyNotes: "Do not diagnose from one sign or apply a treatment.",
          missingInformation: ["Confirm the reviewer and escalation threshold."],
          reviewStatus: "review_required"
        }
      ]
    });

    const screen = render(<AiScreen workspaceType="commercial" />);
    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());
    expect(mockMediaEvidencePickerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        extractFramesFromVideo: true,
        videoWorkspaceType: "commercial",
        videoWorkspaceId: undefined,
        sourceContext: expect.objectContaining({ facilityId: undefined })
      })
    );

    fireEvent.press(screen.getByLabelText("Draft IPM Scouting and Escalation"));
    const composer = screen.getByPlaceholderText("Type here...");
    expect(composer.props.value).toContain("review-only SOP/checklist draft");
    expect(mockAskPersonalAssistant).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Send"));
    await waitFor(() =>
      expect(screen.getByText("Review-only procedure drafts")).toBeTruthy()
    );
    expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "commercial-grow-1",
        workspaceType: "commercial",
        context: expect.objectContaining({
          sopStarterLibrary: expect.arrayContaining([
            expect.objectContaining({
              key: "ipm_scouting_escalation",
              sourceVersion: 2
            })
          ])
        })
      })
    );
    expect(
      JSON.stringify(mockAskPersonalAssistant.mock.calls[0][0].context.sopStarterLibrary)
    ).not.toMatch(
      /facility (?:ipm plan|scale|approved|reviewer|quarantine|sanitation|emergency)/i
    );
    expect(screen.getByText(/starting points, not approved Facility SOPs/i)).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("Review IPM Scouting and Escalation as a task")
    );
    expect(mockCreatePersonalTask).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Review the drafted task below. Nothing is saved until you confirm it."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Confirm create_task"));
    await waitFor(() =>
      expect(
        screen.getByText(
          "This Commercial task is still a review-only draft. It was not written to a Personal workspace."
        )
      ).toBeTruthy()
    );
    expect(mockCreatePersonalTask).not.toHaveBeenCalled();
  });

  it("loads the Facility inspection-readiness preset and its evidence context", async () => {
    mockSearchParams = { preset: "compliance" };
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: "Recorded audit coverage is present; SOP run evidence is missing.",
      actions: [],
      referencedData: [],
      proposedWrites: [
        {
          type: "create_task",
          payload: {
            title: "Review inspection evidence gaps",
            description: "Confirm the missing SOP run evidence.",
            priority: "medium",
            sourceObjectId: "facility-inspection-review"
          }
        }
      ]
    });

    const screen = render(<AiScreen workspaceType="facility" facilityId="facility-1" />);

    await waitFor(() =>
      expect(screen.getByText("Inspection Readiness Context")).toBeTruthy()
    );
    expect(mockMediaEvidencePickerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        videoWorkspaceType: "facility",
        videoWorkspaceId: "facility-1",
        sourceContext: expect.objectContaining({ facilityId: "facility-1" })
      })
    );
    expect(screen.getByText("Audit logs: 36")).toBeTruthy();
    expect(screen.getByText("SOP runs: 0")).toBeTruthy();
    expect(mockListToolRuns).toHaveBeenCalledWith({
      workspaceType: "facility",
      facilityId: "facility-1"
    });
    expect(mockGetDiagnosisHistory).not.toHaveBeenCalled();
    expect(mockListNutrientRecipes).not.toHaveBeenCalled();
    expect(screen.queryByText("Build your first grow")).toBeNull();
    expect(screen.queryByText(/Crop context:/)).toBeNull();
    expect(screen.queryByText("AI procedure recommendations")).toBeNull();

    const composer = screen.getByPlaceholderText("Add notes for Inspection Readiness");
    expect(composer.props.value).toContain(
      "Review this Facility's current inspection readiness"
    );
    fireEvent.press(screen.getByText("Send"));

    await waitFor(() =>
      expect(mockAskPersonalAssistant).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: "facility-1",
          workspaceType: "facility",
          context: expect.objectContaining({
            facilityPreset: "compliance",
            facilityCompliance: expect.objectContaining({
              counts: expect.objectContaining({ auditLogs: 36, sopRuns: 0 })
            })
          })
        })
      )
    );

    fireEvent.press(screen.getByLabelText("Confirm create_task"));
    await waitFor(() =>
      expect(mockCreateFacilityTask).toHaveBeenCalledWith("facility-1", {
        title: "Review inspection evidence gaps",
        description: "Confirm the missing SOP run evidence.",
        priority: "normal",
        dueAt: undefined,
        sourceType: "ai_assistant",
        sourceObjectId: "facility-inspection-review",
        reminderPlan: undefined
      })
    );
    expect(mockCreatePersonalTask).not.toHaveBeenCalled();
    expect(screen.getByText("AI suggested task created.")).toBeTruthy();
  });

  it("recognizes only supported Facility AI presets", () => {
    expect(facilityAiPresetFor("inventory")?.title).toBe("Inventory Risk");
    expect(facilityAiPresetFor("unknown")).toBeNull();
  });
});
