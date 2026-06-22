export type HarvestEstimatorInput = {
  floweringDay: number;
  breederFlowerDays: number;
  cloudyPct: number;
  amberPct: number;
  pistilDarkPct: number;
  cultivarSpeed: "fast" | "average" | "slow";
};

export type HarvestEstimatorResult = {
  daysRemaining: number;
  earliestDay: number;
  targetDay: number;
  latestDay: number;
  readiness: "early" | "monitor" | "ready" | "late";
  summary: string;
};

export type TimelineInput = {
  startDate: string;
  vegWeeks: number;
  flowerWeeks: number;
  dryDays: number;
  cureWeeks: number;
};

export type TimelineMilestone = {
  key: string;
  label: string;
  date: string;
  detail: string;
};

export type ExportRow = {
  type: string;
  date: string;
  title: string;
  detail: string;
};

function finiteNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function estimateHarvestWindow(
  input: HarvestEstimatorInput
): HarvestEstimatorResult {
  const floweringDay = Math.max(0, finiteNumber(input.floweringDay, 0));
  const breederFlowerDays = Math.max(35, finiteNumber(input.breederFlowerDays, 63));
  const cloudyPct = Math.max(0, Math.min(100, finiteNumber(input.cloudyPct, 0)));
  const amberPct = Math.max(0, Math.min(100, finiteNumber(input.amberPct, 0)));
  const pistilDarkPct = Math.max(0, Math.min(100, finiteNumber(input.pistilDarkPct, 0)));
  const speedAdjustment =
    input.cultivarSpeed === "fast" ? -5 : input.cultivarSpeed === "slow" ? 5 : 0;
  const maturitySignal =
    cloudyPct * 0.45 + amberPct * 1.1 + pistilDarkPct * 0.25 + floweringDay * 0.35;
  const targetDay = Math.max(
    35,
    Math.round(breederFlowerDays + speedAdjustment - (maturitySignal - 55) * 0.22)
  );
  const earliestDay = Math.max(1, targetDay - 5);
  const latestDay = targetDay + 7;
  const daysRemaining = Math.max(0, targetDay - floweringDay);
  const readiness =
    amberPct >= 35 || floweringDay > latestDay
      ? "late"
      : amberPct >= 10 && cloudyPct >= 60 && floweringDay >= earliestDay
        ? "ready"
        : floweringDay >= earliestDay - 7 || cloudyPct >= 55
          ? "monitor"
          : "early";

  return {
    daysRemaining,
    earliestDay,
    targetDay,
    latestDay,
    readiness,
    summary:
      readiness === "ready"
        ? "Harvest window is open. Confirm with multiple bud sites before cutting."
        : readiness === "late"
          ? "Harvest indicators are past the preferred target. Review immediately."
          : readiness === "monitor"
            ? "Begin frequent trichome checks and prepare harvest tasks."
            : "Plant appears early. Keep tracking trichomes, pistils, and cultivar timing."
  };
}

export function buildTimelinePlan(input: TimelineInput): TimelineMilestone[] {
  const start = input.startDate ? new Date(`${input.startDate}T00:00:00`) : new Date();
  const vegDays = Math.max(0, finiteNumber(input.vegWeeks, 4) * 7);
  const flowerDays = Math.max(35, finiteNumber(input.flowerWeeks, 9) * 7);
  const dryDays = Math.max(3, finiteNumber(input.dryDays, 10));
  const cureDays = Math.max(0, finiteNumber(input.cureWeeks, 4) * 7);

  return [
    {
      key: "start",
      label: "Start grow",
      date: isoDate(start),
      detail: "Germination, clone transplant, or imported grow start."
    },
    {
      key: "flip",
      label: "Flip or flower start",
      date: isoDate(addDays(start, vegDays)),
      detail: "Switch photoperiod or mark the first confirmed flowering week."
    },
    {
      key: "harvest-window",
      label: "Harvest window",
      date: isoDate(addDays(start, vegDays + flowerDays)),
      detail: "Start final harvest checks and line up drying space."
    },
    {
      key: "dry-complete",
      label: "Dry complete",
      date: isoDate(addDays(start, vegDays + flowerDays + dryDays)),
      detail: "Move from drying to trim, cure, or packaging workflow."
    },
    {
      key: "cure-check",
      label: "Cure check",
      date: isoDate(addDays(start, vegDays + flowerDays + dryDays + cureDays)),
      detail: "Review moisture, aroma, storage, and batch notes."
    }
  ];
}

export function buildExportRows(input: {
  logs?: any[];
  tasks?: any[];
  plants?: any[];
  toolRuns?: any[];
}): ExportRow[] {
  const rows: ExportRow[] = [];
  for (const log of input.logs || []) {
    rows.push({
      type: "log",
      date: String(log.date || log.createdAt || ""),
      title: String(log.title || log.type || "Grow log"),
      detail: String(log.notes || "")
    });
  }
  for (const task of input.tasks || []) {
    rows.push({
      type: "task",
      date: String(task.dueDate || task.createdAt || ""),
      title: String(task.title || "Task"),
      detail: String(task.description || (task.completed ? "Completed" : "Open"))
    });
  }
  for (const plant of input.plants || []) {
    rows.push({
      type: "plant",
      date: String(plant.updatedAt || plant.createdAt || ""),
      title: String(plant.name || plant.cultivar || plant.strain || "Plant"),
      detail: String(plant.stage || plant.status || plant.medium || "")
    });
  }
  for (const run of input.toolRuns || []) {
    rows.push({
      type: "tool_run",
      date: String(run.createdAt || ""),
      title: String(run.toolName || run.toolType || "Tool run"),
      detail: String(run.summary || JSON.stringify(run.outputs || run.output || {}))
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}
