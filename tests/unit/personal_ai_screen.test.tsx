import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AiScreen from "@/app/home/personal/(tabs)/ai";

const mockListPersonalGrows = jest.fn();
const mockListPersonalLogs = jest.fn();
const mockListPersonalTasks = jest.fn();
const mockListPersonalPlants = jest.fn();
const mockListToolRuns = jest.fn();
const mockGetDiagnosisHistory = jest.fn();
const mockCreatePersonalTask = jest.fn();
const mockAskPersonalAssistant = jest.fn();

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

describe("personal AI screen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
    mockAskPersonalAssistant.mockRejectedValue(new Error("assistant unavailable"));
    mockCreatePersonalTask.mockResolvedValue({ id: "ai-task-1" });
  });

  it("answers VPD commands and context-aware task prompts", async () => {
    const screen = render(<AiScreen />);

    await waitFor(() => expect(screen.getByText("Context Loaded")).toBeTruthy());
    expect(screen.getByText("Grows: 1")).toBeTruthy();

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
      referencedData: []
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
    expect(mockCreatePersonalTask).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Confirm create_task"));

    await waitFor(() =>
      expect(mockCreatePersonalTask).toHaveBeenCalledWith({
        growId: "grow-1",
        title: "Check humidity pockets after lights out",
        description: "Inspect dense canopy and corners before the next dark cycle.",
        priority: "high",
        sourceType: "ai_assistant",
        sourceObjectId: "assistant-thread-1"
      })
    );
    expect(screen.getByText("AI suggested task created.")).toBeTruthy();
  });
});
