import { buildPersonalHomeModel } from "../homeModel";

describe("buildPersonalHomeModel", () => {
  it("selects the most recently updated active grow and scopes activity to it", () => {
    const model = buildPersonalHomeModel({
      grows: [
        {
          id: "older",
          name: "Older",
          status: "vegetating",
          updatedAt: "2026-06-18T00:00:00.000Z"
        },
        {
          id: "active",
          name: "Active",
          status: "flowering",
          updatedAt: "2026-06-19T00:00:00.000Z"
        },
        {
          id: "done",
          name: "Done",
          status: "harvested",
          updatedAt: "2026-06-20T00:00:00.000Z"
        }
      ] as any,
      logs: [
        { id: "wrong", growId: "older", date: "2026-06-20", title: "Wrong" },
        { id: "right", growId: "active", date: "2026-06-19", title: "Right" }
      ] as any,
      plants: [
        { id: "plant-1", growId: "active", name: "A" },
        { id: "plant-2", growId: "active", name: "B" },
        { id: "plant-3", growId: "older", name: "C" }
      ] as any,
      tasks: [
        {
          id: "task-2",
          growId: "active",
          title: "Later",
          dueDate: "2026-06-22",
          completed: false
        },
        {
          id: "task-1",
          growId: "active",
          title: "Sooner",
          dueDate: "2026-06-21",
          completed: false,
          priority: "high",
          sourceType: "tool_run",
          sourceToolRunId: "run-1"
        },
        {
          id: "task-3",
          growId: "active",
          title: "Done",
          dueDate: "2026-06-20",
          completed: true
        }
      ] as any,
      toolRuns: [
        { id: "run-1", growId: "active", toolType: "vpd", createdAt: "2026-06-19" }
      ]
    });

    expect(model.activeGrowId).toBe("active");
    expect(model.latestLog?.id).toBe("right");
    expect(model.nextTask?.id).toBe("task-1");
    expect(model.todayTasks).toEqual([
      expect.objectContaining({
        id: "task-1",
        sourceLabel: "tool run",
        sourceHref: "/home/personal/grows/active/tools"
      }),
      expect.objectContaining({
        id: "task-2",
        sourceLabel: "manual",
        sourceHref: "/home/personal/grows/active/tasks"
      })
    ]);
    expect(model.openTaskCount).toBe(2);
    expect(model.latestToolRun?.toolType).toBe("vpd");
    expect(model.stats).toMatchObject({
      totalGrows: 3,
      activeGrowCount: 2,
      plantCount: 2,
      logCount: 1,
      taskCount: 3,
      openTaskCount: 2,
      completedTaskCount: 1,
      toolRunCount: 1
    });
  });
});
