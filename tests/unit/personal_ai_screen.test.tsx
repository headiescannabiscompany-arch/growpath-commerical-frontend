import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import AiScreen, { facilityAiPresetFor } from "@/app/home/personal/(tabs)/ai";

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
const mockGetFacilityComplianceExport = jest.fn();
const mockRouterPush = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockRouterPush })
}));

jest.mock("@/components/media/MediaEvidencePicker", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockMediaEvidencePicker() {
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
  getFacilityTasks: (...args: any[]) => mockGetFacilityTasks(...args)
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

  it("loads the Facility inspection-readiness preset and its evidence context", async () => {
    mockSearchParams = { preset: "compliance" };
    mockAskPersonalAssistant.mockResolvedValue({
      success: true,
      reply: "Recorded audit coverage is present; SOP run evidence is missing.",
      actions: [],
      referencedData: [],
      proposedWrites: []
    });

    const screen = render(<AiScreen workspaceType="facility" facilityId="facility-1" />);

    await waitFor(() =>
      expect(screen.getByText("Inspection Readiness Context")).toBeTruthy()
    );
    expect(screen.getByText("Audit logs: 36")).toBeTruthy();
    expect(screen.getByText("SOP runs: 0")).toBeTruthy();
    expect(screen.queryByText("Build your first grow")).toBeNull();
    expect(screen.queryByText(/Crop context:/)).toBeNull();

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
  });

  it("recognizes only supported Facility AI presets", () => {
    expect(facilityAiPresetFor("inventory")?.title).toBe("Inventory Risk");
    expect(facilityAiPresetFor("unknown")).toBeNull();
  });
});
