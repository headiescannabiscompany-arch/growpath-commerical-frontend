import { createPersonalTask } from "@/api/tasks";
import { createPersonalLog } from "@/api/logs";
import { createToolRun } from "@/api/toolRuns";

import {
  saveToolRunAndCreateLog,
  saveToolRunAndCreateTask,
  saveToolRunAndCreateTasks,
  saveToolRunAndOpenJournal,
  saveToolRunResult
} from "../saveToolRunAndOpenJournal";

jest.mock("@/api/logs", () => ({
  createPersonalLog: jest.fn()
}));

jest.mock("@/api/tasks", () => ({
  createPersonalTask: jest.fn()
}));

jest.mock("@/api/toolRuns", () => ({
  createToolRun: jest.fn()
}));

const mockedCreatePersonalTask = createPersonalTask as jest.MockedFunction<
  typeof createPersonalTask
>;
const mockedCreatePersonalLog = createPersonalLog as jest.MockedFunction<
  typeof createPersonalLog
>;
const mockedCreateToolRun = createToolRun as jest.MockedFunction<typeof createToolRun>;

describe("saveToolRunAndOpenJournal", () => {
  beforeEach(() => {
    mockedCreatePersonalLog.mockReset();
    mockedCreatePersonalTask.mockReset();
    mockedCreateToolRun.mockReset();
  });

  it("reuses an existing tool run instead of creating a duplicate", async () => {
    const router = { push: jest.fn() };

    const result = await saveToolRunAndOpenJournal({
      router,
      growId: "grow 1",
      toolKey: "vpd",
      toolRunId: "run/1",
      input: { rh: 60 },
      output: { vpdKpa: 1.2 }
    });

    expect(result).toEqual({ ok: true, toolRunId: "run/1" });
    expect(mockedCreateToolRun).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith(
      "/home/personal/logs/new?growId=grow%201&toolRunId=run%2F1"
    );
  });

  it("creates a tool run when no existing run is supplied", async () => {
    mockedCreateToolRun.mockResolvedValue({ _id: "created-run" });
    const router = { push: jest.fn() };

    const result = await saveToolRunAndOpenJournal({
      router,
      growId: "grow-1",
      plantId: "plant-1",
      cropProfileId: "crop-blueberry-1",
      selectedPlantContext: {
        id: "plant-1",
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum"
      },
      plantGrowthProfile: {
        phenoLabel: "early fruiting"
      },
      toolKey: "ppfd",
      input: { dliTarget: 35 },
      output: { requiredPpfd: 810 }
    });

    expect(result).toEqual({ ok: true, toolRunId: "created-run" });
    expect(mockedCreateToolRun).toHaveBeenCalledWith({
      toolType: "ppfd",
      growId: "grow-1",
      plantId: "plant-1",
      cropProfileId: "crop-blueberry-1",
      cropIdentity: undefined,
      selectedPlantContext: {
        id: "plant-1",
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum"
      },
      plantGrowthProfile: {
        phenoLabel: "early fruiting"
      },
      input: { dliTarget: 35 },
      output: { requiredPpfd: 810 },
      calculatorVersion: "ppfd-dli-2026.06"
    });
  });

  it("allows an explicit calculator version override", async () => {
    mockedCreateToolRun.mockResolvedValue({ _id: "override-run" });
    const router = { push: jest.fn() };

    const result = await saveToolRunAndOpenJournal({
      router,
      growId: "grow-override",
      toolKey: "vpd",
      input: { rh: 64 },
      output: { vpdKpa: 1.18 },
      calculatorVersion: "vpd-experiment-2"
    });

    expect(result).toEqual({ ok: true, toolRunId: "override-run" });
    expect(mockedCreateToolRun).toHaveBeenCalledWith(
      expect.objectContaining({
        toolType: "vpd",
        calculatorVersion: "vpd-experiment-2"
      })
    );
  });

  it("saves a standalone visible tool run through the calculator version registry", async () => {
    mockedCreateToolRun.mockResolvedValue({ _id: "watering-run-1" });

    const result = await saveToolRunResult({
      growId: "grow-water",
      plantId: "plant-water",
      toolKey: "watering",
      input: { potLiters: 11, runoffPct: 10 },
      output: { targetLiters: 2.42 }
    });

    expect(result).toEqual({ ok: true, toolRunId: "watering-run-1" });
    expect(mockedCreateToolRun).toHaveBeenCalledWith(
      expect.objectContaining({
        toolType: "watering",
        growId: "grow-water",
        plantId: "plant-water",
        calculatorVersion: "watering-heuristic-2026.06"
      })
    );
  });

  it("creates a source-linked task from an existing tool run", async () => {
    mockedCreatePersonalTask.mockResolvedValue({
      id: "task-1",
      growId: "grow-1",
      title: "Check light",
      description: "",
      dueDate: "2026-07-01",
      completed: false,
      createdAt: "2026-06-30T00:00:00.000Z"
    });

    const result = await saveToolRunAndCreateTask({
      growId: "grow-1",
      plantId: "plant-1",
      toolKey: "ppfd",
      toolRunId: "run-1",
      input: { dliTarget: 35 },
      output: { requiredPpfd: 810 },
      title: "Check light",
      description: "Verify canopy PPFD.",
      priority: "medium",
      dueDate: "2026-07-01"
    });

    expect(result).toEqual({ ok: true, toolRunId: "run-1", taskId: "task-1" });
    expect(mockedCreateToolRun).not.toHaveBeenCalled();
    expect(mockedCreatePersonalTask).toHaveBeenCalledWith({
      growId: "grow-1",
      plantId: "plant-1",
      title: "Check light",
      description: "Verify canopy PPFD.",
      priority: "medium",
      dueDate: "2026-07-01",
      sourceType: "tool_run",
      sourceObjectId: "run-1",
      sourceToolRunId: "run-1",
      linkedGrowId: "grow-1",
      linkedPlantId: "plant-1",
      linkedToolRunId: "run-1"
    });
  });

  it("creates a tool run before creating a source-linked task", async () => {
    mockedCreateToolRun.mockResolvedValue({ _id: "created-run" });
    mockedCreatePersonalTask.mockResolvedValue({
      id: "task-2",
      growId: "grow-2",
      title: "Review nutrients",
      description: "",
      dueDate: "2026-07-01",
      completed: false,
      createdAt: "2026-06-30T00:00:00.000Z"
    });

    const result = await saveToolRunAndCreateTask({
      growId: "grow-2",
      toolKey: "nutrient-chemistry",
      input: { nutrient: "calcium" },
      output: { activeIngredient: "gypsum" },
      title: "Review nutrients"
    });

    expect(result).toEqual({
      ok: true,
      toolRunId: "created-run",
      taskId: "task-2"
    });
    expect(mockedCreatePersonalTask).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-2",
        title: "Review nutrients",
        sourceType: "tool_run",
        sourceObjectId: "created-run",
        sourceToolRunId: "created-run",
        linkedGrowId: "grow-2",
        linkedToolRunId: "created-run"
      })
    );
    expect(mockedCreateToolRun).toHaveBeenCalledWith(
      expect.objectContaining({
        toolType: "nutrient-chemistry",
        calculatorVersion: "nutrient-chemistry-2026.06"
      })
    );
  });

  it("creates a tool run before saving a source-linked grow log", async () => {
    mockedCreateToolRun.mockResolvedValue({ _id: "log-run-1" });
    mockedCreatePersonalLog.mockResolvedValue({
      id: "log-1",
      growId: "grow-log",
      toolRunId: "log-run-1",
      date: "2026-07-01",
      title: "Environment analysis",
      notes: "Review VPD and RH.",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z"
    });

    const result = await saveToolRunAndCreateLog({
      growId: "grow-log",
      plantId: "plant-log",
      toolKey: "environment-analysis",
      input: { vpd: 1.4, humidity: 62 },
      output: { status: "review", recommendations: ["Increase airflow."] },
      type: "environment",
      date: "2026-07-01",
      title: "Environment analysis",
      notes: "Review VPD and RH.",
      tags: ["environment", "ai_analysis"]
    });

    expect(result).toEqual({
      ok: true,
      toolRunId: "log-run-1",
      logId: "log-1"
    });
    expect(mockedCreateToolRun).toHaveBeenCalledWith(
      expect.objectContaining({
        toolType: "environment-analysis",
        growId: "grow-log",
        plantId: "plant-log",
        input: { vpd: 1.4, humidity: 62 },
        output: { status: "review", recommendations: ["Increase airflow."] },
        calculatorVersion: "environment-analysis-2026.06"
      })
    );
    expect(mockedCreatePersonalLog).toHaveBeenCalledWith({
      growId: "grow-log",
      linkedGrowId: "grow-log",
      plantId: "plant-log",
      linkedPlantId: "plant-log",
      toolRunId: "log-run-1",
      linkedToolRunId: "log-run-1",
      type: "environment",
      date: "2026-07-01",
      title: "Environment analysis",
      notes: "Review VPD and RH.",
      tags: ["environment", "ai_analysis"]
    });
  });

  it("creates one tool run before creating multiple source-linked tasks", async () => {
    mockedCreateToolRun.mockResolvedValue({ _id: "timeline-run-1" });
    mockedCreatePersonalTask
      .mockResolvedValueOnce({
        id: "task-a",
        growId: "grow-timeline",
        title: "Flip to flower",
        description: "",
        dueDate: "2026-08-01",
        completed: false,
        createdAt: "2026-07-01T00:00:00.000Z"
      })
      .mockResolvedValueOnce({
        id: "task-b",
        growId: "grow-timeline",
        title: "Harvest window",
        description: "",
        dueDate: "2026-10-01",
        completed: false,
        createdAt: "2026-07-01T00:00:00.000Z"
      });

    const result = await saveToolRunAndCreateTasks({
      growId: "grow-timeline",
      toolKey: "timeline-planner",
      input: { startDate: "2026-07-01", vegWeeks: 4 },
      output: { milestoneCount: 2 },
      tasks: [
        {
          title: "Flip to flower",
          description: "Change photoperiod.",
          dueDate: "2026-08-01"
        },
        {
          title: "Harvest window",
          description: "Start harvest checks.",
          dueDate: "2026-10-01",
          priority: "high"
        }
      ]
    });

    expect(result).toEqual({
      ok: true,
      toolRunId: "timeline-run-1",
      taskIds: ["task-a", "task-b"]
    });
    expect(mockedCreateToolRun).toHaveBeenCalledTimes(1);
    expect(mockedCreateToolRun).toHaveBeenCalledWith(
      expect.objectContaining({
        toolType: "timeline-planner",
        calculatorVersion: "timeline-planner-2026.06"
      })
    );
    expect(mockedCreatePersonalTask).toHaveBeenCalledTimes(2);
    expect(mockedCreatePersonalTask).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        growId: "grow-timeline",
        title: "Flip to flower",
        sourceType: "tool_run",
        sourceObjectId: "timeline-run-1",
        sourceToolRunId: "timeline-run-1",
        linkedGrowId: "grow-timeline",
        linkedToolRunId: "timeline-run-1"
      })
    );
    expect(mockedCreatePersonalTask).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        growId: "grow-timeline",
        title: "Harvest window",
        priority: "high",
        sourceType: "tool_run",
        sourceObjectId: "timeline-run-1",
        sourceToolRunId: "timeline-run-1",
        linkedGrowId: "grow-timeline",
        linkedToolRunId: "timeline-run-1"
      })
    );
  });
});
