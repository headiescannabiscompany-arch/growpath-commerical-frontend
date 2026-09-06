import {
  buildGrowTimeline,
  buildCommercialGrowTimeline,
  groupTimelineEvents,
  timelineEventPhotos,
  timelinePeriodKey,
  visualTimelineEvents
} from "../timeline";

describe("buildGrowTimeline", () => {
  it("merges logs, tool runs, and tasks in descending time order", () => {
    const timeline = buildGrowTimeline({
      logs: [
        {
          id: "log-1",
          date: "2026-06-18T10:00:00.000Z",
          title: "Watered",
          type: "watering"
        }
      ],
      toolRuns: [
        {
          _id: "run-1",
          createdAt: "2026-06-19T10:00:00.000Z",
          toolType: "vpd"
        }
      ],
      tasks: [
        {
          id: "task-1",
          dueDate: "2026-06-20T10:00:00.000Z",
          title: "Check runoff",
          completed: false
        }
      ]
    });

    expect(timeline.map((item) => `${item.kind}:${item.id}`)).toEqual([
      "task:task-1",
      "tool_run:run-1",
      "log:log-1"
    ]);
    expect(timeline[0]).toEqual(
      expect.objectContaining({ category: "task", completed: false })
    );
  });

  it("uses deterministic fallback identifiers for incomplete legacy rows", () => {
    const timeline = buildGrowTimeline({ logs: [{}], toolRuns: [{}], tasks: [{}] });

    expect(timeline.map((item) => item.id).sort()).toEqual([
      "log-0",
      "task-0",
      "tool-run-0"
    ]);
  });

  it("keeps saved diagnosis logs visible as diagnosis journal entries", () => {
    const timeline = buildGrowTimeline({
      logs: [
        {
          id: "diagnosis-log",
          date: "2026-06-21T10:00:00.000Z",
          title: "Nitrogen deficiency likely",
          type: "diagnosis",
          diagnosisId: "diagnosis-1"
        }
      ]
    });

    expect(timeline[0]).toEqual(
      expect.objectContaining({
        kind: "log",
        id: "diagnosis-log",
        category: "diagnosis",
        title: "Nitrogen deficiency likely"
      })
    );
  });

  it("builds a commercial evidence timeline without inventing empty milestones", () => {
    const timeline = buildCommercialGrowTimeline({
      id: "run-1",
      createdAt: "2026-08-01T12:00:00Z",
      updatedAt: "2026-08-10T12:00:00Z",
      purpose: "Product trial",
      measurementPlan: "Weekly canopy photos",
      commercialCropSummary: "Improved vigor",
      publicShareStatus: "public_ready"
    });
    expect(timeline.map((event) => event.title)).toEqual(
      expect.arrayContaining([
        "Evidence run started",
        "Measurement plan",
        "Commercial crop summary",
        "Evidence run updated"
      ])
    );
    expect(timeline.some((event) => event.title === "Harvest and quality notes")).toBe(
      false
    );
  });
});

describe("visual grow timeline", () => {
  it("keeps persisted relative evidence photos available for authenticated review", () => {
    expect(
      timelineEventPhotos({
        payload: {
          url: "/api/evidence-assets/uploads/507f1f77bcf86cd799439011/object"
        },
        photos: ["/uploads/grows/week-one.jpg"]
      })
    ).toEqual([
      "/uploads/grows/week-one.jpg",
      "/api/evidence-assets/uploads/507f1f77bcf86cd799439011/object"
    ]);
  });

  it("extracts unique photos from event and payload records", () => {
    expect(
      timelineEventPhotos({
        photoUrl: "https://example.com/whole.jpg",
        payload: {
          photos: [
            "https://example.com/detail.jpg",
            { url: "https://example.com/whole.jpg" }
          ]
        }
      })
    ).toEqual(["https://example.com/whole.jpg", "https://example.com/detail.jpg"]);
  });

  it("groups events at lifecycle, month, week, and day zoom levels", () => {
    const events = [
      { timestamp: "2026-07-02T12:00:00.000Z", id: "c" },
      { timestamp: "2026-08-12T12:00:00.000Z", id: "b" },
      { timestamp: "2026-08-14T12:00:00.000Z", id: "a" }
    ];
    expect(groupTimelineEvents(events, "lifecycle")).toHaveLength(1);
    const monthGroups = groupTimelineEvents(events, "month");
    expect(monthGroups).toHaveLength(2);
    expect(monthGroups.map((group) => group.key)).toEqual(["2026-08", "2026-07"]);
    expect(monthGroups[0].items.map((event) => event.id)).toEqual(["a", "b"]);
    expect(groupTimelineEvents(events, "week")).toHaveLength(2);
    expect(timelinePeriodKey(events[2].timestamp, "day")).toBe("2026-08-14");
    expect(timelinePeriodKey("2026-09-01T00:00:00.000Z", "day")).toBe("2026-09-01");
  });

  it("places photo audit events on their matching journal milestone", () => {
    const visual = visualTimelineEvents([
      {
        id: "GrowLog:log-1",
        sourceId: "log-1",
        sourceModel: "GrowLog",
        type: "log_created",
        title: "Pest check"
      },
      {
        id: "GrowLog:log-1:photo:0",
        sourceId: "log-1",
        sourceModel: "GrowLog",
        type: "photo_added",
        title: "Photo added: Pest check",
        payload: { linkedLogId: "log-1", url: "/uploads/pest-check.jpg" }
      }
    ]);

    expect(visual).toHaveLength(1);
    expect(visual[0]).toEqual(
      expect.objectContaining({
        id: "GrowLog:log-1",
        photos: ["/uploads/pest-check.jpg"]
      })
    );
  });
});
