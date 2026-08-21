const mockApiRequest = jest.fn();
const mockListToolRuns = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/grows", () => ({
  appendGrowPhotos: jest.fn(),
  getPersonalGrowTimeline: jest.fn(),
  listPersonalGrows: jest.fn()
}));

jest.mock("@/api/logs", () => ({
  createPersonalLog: jest.fn(),
  listPersonalLogs: jest.fn()
}));

jest.mock("@/api/plants", () => ({
  createPersonalPlant: jest.fn(),
  listPersonalPlants: jest.fn()
}));

jest.mock("@/api/tasks", () => ({
  createPersonalTask: jest.fn(),
  deletePersonalTask: jest.fn(),
  listPersonalTasks: jest.fn(),
  updatePersonalTask: jest.fn()
}));

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args: any[]) => mockListToolRuns(...args)
}));

import {
  createWorkspaceGrow,
  createWorkspaceLog,
  createWorkspacePlant,
  createWorkspaceTask,
  deleteWorkspaceTask,
  getWorkspaceGrowTimeline,
  listCommercialGrowTasks,
  listWorkspaceGrows,
  listWorkspaceLogs,
  listWorkspaceTasks,
  updateWorkspaceTask
} from "@/features/grows/workspaceData";

describe("Commercial grow workspace data", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockListToolRuns.mockReset();
  });

  it("reads and creates owner-scoped Commercial grows", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ grows: [{ _id: "grow-1", name: "Tomatoes" }] })
      .mockResolvedValueOnce({ grow: { _id: "grow-2", name: "Basil" } });

    await expect(listWorkspaceGrows("commercial")).resolves.toEqual([
      expect.objectContaining({ id: "grow-1", name: "Tomatoes" })
    ]);
    await expect(createWorkspaceGrow("commercial", { name: "Basil" })).resolves.toEqual(
      expect.objectContaining({ id: "grow-2", name: "Basil" })
    );

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/commercial/grows",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        params: expect.any(Object)
      })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/commercial/grows", {
      method: "POST",
      body: { name: "Basil", workspaceType: "commercial" }
    });
  });

  it("writes Commercial plants through the owner-scoped atomic child endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      plant: { id: "plant-1", growId: "grow-1", name: "Plant one" }
    });

    await expect(
      createWorkspacePlant("commercial", {
        growId: "grow-1",
        name: "Plant one"
      } as any)
    ).resolves.toEqual(expect.objectContaining({ growId: "grow-1", name: "Plant one" }));

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/commercial/grows/grow-1/plants",
      {
        method: "POST",
        body: expect.objectContaining({ growId: "grow-1", name: "Plant one" })
      }
    );
    expect(mockApiRequest).not.toHaveBeenCalledWith(
      "/api/commercial/grows/grow-1",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("keeps Commercial journal reads and writes nested in the owning grow", async () => {
    const existingLog = {
      id: "log-1",
      growId: "grow-1",
      title: "Existing note",
      date: "2026-08-20T00:00:00.000Z"
    };
    mockApiRequest
      .mockResolvedValueOnce({ success: true, logs: [existingLog], items: [existingLog] })
      .mockResolvedValueOnce({
        success: true,
        log: {
          id: "log-2",
          growId: "grow-1",
          linkedGrowId: "grow-1",
          title: "Watered"
        }
      });

    await expect(listWorkspaceLogs("commercial", "grow-1")).resolves.toEqual([
      expect.objectContaining({ id: "log-1", growId: "grow-1" })
    ]);
    await expect(
      createWorkspaceLog("commercial", {
        growId: "grow-1",
        title: "Watered"
      } as any)
    ).resolves.toEqual(
      expect.objectContaining({
        growId: "grow-1",
        linkedGrowId: "grow-1",
        title: "Watered",
        workspaceType: "commercial"
      })
    );

    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/commercial/grows/grow-1/logs",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/commercial/grows/grow-1/logs",
      {
        method: "POST",
        body: expect.objectContaining({ title: "Watered", growId: "grow-1" })
      }
    );
    expect(mockApiRequest).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/(personal\/)?logs/),
      expect.anything()
    );
  });

  it("keeps Commercial task CRUD nested in the owning grow", async () => {
    const task = {
      id: "task-1",
      growId: "grow-1",
      title: "Inspect",
      description: "Check leaves",
      dueDate: "",
      completed: false,
      status: "OPEN",
      createdAt: "2026-08-20T00:00:00.000Z"
    };
    mockApiRequest
      .mockResolvedValueOnce({ success: true, tasks: [task], items: [task] })
      .mockResolvedValueOnce({
        success: true,
        task: {
          ...task,
          id: "task-2",
          title: "Review tool result",
          linkedGrowId: "grow-1",
          dueAt: "2026-08-22T12:00:00.000Z",
          sourceStage: "ipm_review"
        }
      })
      .mockResolvedValueOnce({
        success: true,
        task: { ...task, completed: true, status: "DONE" }
      })
      .mockResolvedValueOnce({
        success: true,
        archived: true,
        task: { ...task, status: "ARCHIVED", isActive: false }
      });

    await expect(listWorkspaceTasks("commercial", "grow-1")).resolves.toEqual([
      expect.objectContaining({ id: "task-1", completed: false })
    ]);
    await expect(
      createWorkspaceTask("commercial", {
        growId: "grow-1",
        title: "Review tool result",
        dueAt: "2026-08-22T12:00:00.000Z",
        sourceStage: "ipm_review"
      } as any)
    ).resolves.toEqual(
      expect.objectContaining({
        growId: "grow-1",
        linkedGrowId: "grow-1",
        status: "OPEN",
        dueAt: "2026-08-22T12:00:00.000Z",
        sourceStage: "ipm_review",
        workspaceType: "commercial"
      })
    );
    await expect(
      updateWorkspaceTask("commercial", "task-1", { completed: true }, "grow-1")
    ).resolves.toEqual(
      expect.objectContaining({ id: "task-1", completed: true, status: "DONE" })
    );
    await expect(deleteWorkspaceTask("commercial", "task-1", "grow-1")).resolves.toBe(
      true
    );

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/commercial/grows/grow-1/tasks",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/commercial/grows/grow-1/tasks",
      {
        method: "POST",
        body: expect.objectContaining({
          growId: "grow-1",
          title: "Review tool result",
          dueAt: "2026-08-22T12:00:00.000Z",
          sourceStage: "ipm_review"
        })
      }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/commercial/grows/grow-1/tasks/task-1",
      {
        method: "PATCH",
        body: expect.objectContaining({
          completed: true,
          status: "DONE",
          completedAt: expect.any(String)
        })
      }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/commercial/grows/grow-1/tasks/task-1",
      { method: "DELETE" }
    );
    expect(mockApiRequest).not.toHaveBeenCalledWith(
      "/api/commercial/grows/grow-1",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(mockApiRequest).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/(personal\/)?tasks/),
      expect.anything()
    );
  });

  it("aggregates active grow tasks for the Commercial task center without reviving archives", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ grows: [{ _id: "grow-1" }] })
      .mockResolvedValueOnce({
        tasks: [
          { id: "active", title: "Inspect", status: "OPEN" },
          { id: "archived", title: "Old task", status: "ARCHIVED" }
        ]
      });

    await expect(listCommercialGrowTasks()).resolves.toEqual([
      expect.objectContaining({
        id: "active",
        growId: "grow-1",
        linkedGrowId: "grow-1",
        workspaceStorage: "commercial_grow",
        workspaceGrowId: "grow-1"
      })
    ]);
  });

  it("includes Commercial plant records in the grow timeline", async () => {
    const grow = {
      _id: "grow-1",
      logs: [],
      plants: [
        {
          id: "plant-1",
          growId: "grow-1",
          name: "Tomato one",
          createdAt: "2026-08-20T10:00:00.000Z"
        }
      ],
      tasks: []
    };
    mockApiRequest
      .mockResolvedValueOnce({ logs: grow.logs })
      .mockResolvedValueOnce({ plants: grow.plants })
      .mockResolvedValueOnce({ tasks: grow.tasks });
    mockListToolRuns.mockResolvedValueOnce([]);

    await expect(getWorkspaceGrowTimeline("commercial", "grow-1")).resolves.toEqual([
      expect.objectContaining({
        id: "plant-plant-1",
        type: "plant",
        sourceModel: "Plant",
        title: "Tomato one",
        payload: expect.objectContaining({
          linkedPlantId: "plant-1",
          workspaceType: "commercial"
        })
      })
    ]);
    expect(mockListToolRuns).toHaveBeenCalledWith({
      growId: "grow-1",
      workspaceType: "commercial"
    });
  });
});
