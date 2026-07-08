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
        {
          id: "right",
          growId: "active",
          date: "2026-06-19",
          title: "Right",
          photos: ["/uploads/canopy.jpg"],
          photoMetadata: [{ createdAt: "2026-06-19T12:00:00.000Z" }]
        }
      ] as any,
      plants: [
        { id: "plant-1", growId: "active", name: "A" },
        { id: "plant-2", growId: "active", name: "B" },
        { id: "plant-3", growId: "older", name: "C" }
      ] as any,
      tasks: [
        {
          id: "task-overdue",
          growId: "active",
          title: "Past due inspection",
          dueDate: "2026-06-20T09:00:00.000Z",
          completed: false,
          priority: "high"
        },
        {
          id: "task-2",
          growId: "active",
          title: "Later",
          dueDate: "2026-06-22T10:00:00.000Z",
          completed: false
        },
        {
          id: "task-1",
          growId: "active",
          title: "Sooner",
          dueDate: "2026-06-21T10:00:00.000Z",
          completed: false,
          priority: "high",
          sourceType: "tool_run",
          linkedToolRunId: "run-1"
        },
        {
          id: "task-3",
          growId: "active",
          title: "Done",
          dueDate: "2026-06-20T10:00:00.000Z",
          completed: true
        },
        {
          id: "task-4",
          growId: "active",
          title: "Diagnosis follow-up",
          dueDate: "2026-06-21T11:00:00.000Z",
          completed: false,
          sourceType: "ai_diagnosis",
          sourceDiagnosisId: "diagnosis-1"
        },
        {
          id: "task-5",
          growId: "active",
          title: "Automation inspection",
          dueDate: "2026-06-21T12:00:00.000Z",
          completed: false,
          sourceType: "automation_policy",
          sourceObjectId: "automation-event-1"
        },
        {
          id: "task-6",
          growId: "active",
          title: "Forum follow-up",
          dueDate: "2026-06-21T12:30:00.000Z",
          completed: false,
          sourceType: "forum",
          linkedForumThreadId: "thread-1"
        }
      ] as any,
      toolRuns: [
        {
          id: "run-1",
          growId: "active",
          toolType: "vpd",
          createdAt: "2026-06-19",
          warnings: ["VPD drifted above the crop target."]
        }
      ],
      diagnoses: [
        {
          id: "diagnosis-1",
          growId: "active",
          issueSummary: "Possible magnesium stress",
          urgency: "high",
          createdAt: "2026-06-19T13:00:00.000Z"
        },
        {
          id: "diagnosis-wrong-grow",
          growId: "older",
          issueSummary: "Wrong grow diagnosis",
          createdAt: "2026-06-20T13:00:00.000Z"
        }
      ],
      telemetrySources: [
        {
          id: "source-1",
          growId: "active",
          type: "growlink",
          name: "Tent controller",
          timezone: "America/New_York",
          isActive: true,
          config: {},
          updatedAt: "2026-06-20T09:00:00.000Z"
        }
      ] as any,
      now: new Date("2026-06-21T12:00:00.000Z")
    });

    expect(model.activeGrowId).toBe("active");
    expect(model.latestLog?.id).toBe("right");
    expect(model.nextTask?.id).toBe("task-overdue");
    expect(model.todayTasks).toEqual([
      expect.objectContaining({
        id: "task-overdue",
        sourceLabel: "manual",
        sourceHref: "/home/personal/grows/active/tasks"
      }),
      expect.objectContaining({
        id: "task-1",
        sourceLabel: "tool run",
        sourceHref: "/home/personal/grows/active/tools"
      }),
      expect.objectContaining({
        id: "task-4",
        sourceLabel: "ai diagnosis",
        sourceHref: "/home/personal/grows/active/timeline"
      }),
      expect.objectContaining({
        id: "task-5",
        sourceLabel: "automation policy",
        sourceHref: "/home/personal/grows/active/tasks"
      }),
      expect.objectContaining({
        id: "task-6",
        sourceLabel: "forum",
        sourceHref: "/forum/post/thread-1"
      })
    ]);
    expect(model.openTaskCount).toBe(6);
    expect(model.latestToolRun?.toolType).toBe("vpd");
    expect(model.latestDiagnosis?.id).toBe("diagnosis-1");
    expect(model.alerts).toEqual([
      expect.objectContaining({
        id: "overdue-tasks",
        severity: "critical",
        message: "1 open task past due for Active."
      }),
      expect.objectContaining({
        id: "high-priority-today",
        severity: "warning"
      }),
      expect.objectContaining({
        id: "diagnosis-urgency",
        message: "Possible magnesium stress"
      }),
      expect.objectContaining({
        id: "tool-warning",
        message: "VPD drifted above the crop target."
      }),
      expect.objectContaining({
        id: "telemetry-stale",
        message: "Tent controller has not updated in more than 24 hours."
      })
    ]);
    expect(model.recentPhotos).toEqual([
      expect.objectContaining({
        url: "/uploads/canopy.jpg",
        logId: "right",
        title: "Right"
      })
    ]);
    expect(model.stats).toMatchObject({
      totalGrows: 3,
      activeGrowCount: 2,
      plantCount: 2,
      logCount: 1,
      taskCount: 7,
      openTaskCount: 6,
      completedTaskCount: 1,
      toolRunCount: 1,
      diagnosisCount: 1,
      photoCount: 1
    });
  });
});
