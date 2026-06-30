import { createPersonalTask } from "@/api/tasks";
import { createToolRun } from "@/api/toolRuns";

import {
  saveToolRunAndCreateTask,
  saveToolRunAndOpenJournal
} from "../saveToolRunAndOpenJournal";

jest.mock("@/api/tasks", () => ({
  createPersonalTask: jest.fn()
}));

jest.mock("@/api/toolRuns", () => ({
  createToolRun: jest.fn()
}));

const mockedCreatePersonalTask = createPersonalTask as jest.MockedFunction<
  typeof createPersonalTask
>;
const mockedCreateToolRun = createToolRun as jest.MockedFunction<typeof createToolRun>;

describe("saveToolRunAndOpenJournal", () => {
  beforeEach(() => {
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
      output: { requiredPpfd: 810 }
    });
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
      sourceToolRunId: "run-1"
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
        sourceToolRunId: "created-run"
      })
    );
  });
});
