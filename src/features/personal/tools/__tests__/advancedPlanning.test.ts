import {
  buildExportRows,
  buildTimelinePlan,
  estimateHarvestWindow
} from "../advancedPlanning";

describe("advanced planning tools", () => {
  test("estimates a harvest readiness window from maturity signals", () => {
    const result = estimateHarvestWindow({
      floweringDay: 58,
      breederFlowerDays: 63,
      cloudyPct: 72,
      amberPct: 14,
      pistilDarkPct: 80,
      cultivarSpeed: "average"
    });

    expect(result.readiness).toBe("ready");
    expect(result.earliestDay).toBeLessThanOrEqual(result.targetDay);
    expect(result.latestDay).toBeGreaterThan(result.targetDay);
  });

  test("builds deterministic grow timeline milestones", () => {
    const timeline = buildTimelinePlan({
      startDate: "2026-01-01",
      vegWeeks: 4,
      flowerWeeks: 8,
      dryDays: 10,
      cureWeeks: 2
    });

    expect(timeline.map((item) => `${item.key}:${item.date}`)).toEqual([
      "start:2026-01-01",
      "flip:2026-01-29",
      "harvest-window:2026-03-26",
      "dry-complete:2026-04-05",
      "cure-check:2026-04-19"
    ]);
  });

  test("normalizes export rows from grow records", () => {
    const rows = buildExportRows({
      logs: [{ date: "2026-02-01", title: "Watered", notes: "1 gal" }],
      tasks: [{ dueDate: "2026-02-03", title: "Defoliate", completed: false }],
      plants: [{ updatedAt: "2026-02-02", name: "A1", stage: "veg" }]
    });

    expect(rows.map((row) => row.type)).toEqual(["task", "plant", "log"]);
    expect(rows[2]).toEqual({
      type: "log",
      date: "2026-02-01",
      title: "Watered",
      detail: "1 gal"
    });
  });
});
