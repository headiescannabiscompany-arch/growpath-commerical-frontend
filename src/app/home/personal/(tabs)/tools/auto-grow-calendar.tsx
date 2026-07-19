import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function parsePlants(value: string) {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split("\n")
      .map((line, index) => {
        const [cultivar, expectedFlowerDaysMin, expectedFlowerDaysMax] = line
          .split(",")
          .map((part) => part.trim());
        if (!cultivar) return null;
        return {
          plantId: `plant_${index + 1}`,
          cultivar,
          expectedFlowerDaysMin,
          expectedFlowerDaysMax: expectedFlowerDaysMax || expectedFlowerDaysMin
        };
      })
      .filter(Boolean);
  }
}

function normalizePriority(value: unknown): "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function growCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "grow_milestone",
    sourceStage,
    reminderPlan: {
      label: "24 hours before",
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -1440 }]
    }
  };
}

function calendarTaskPlan(outputs: Record<string, any>) {
  const schedule = Array.isArray(outputs.taskSchedule) ? outputs.taskSchedule : [];
  return schedule.slice(0, 20).map((item: any, index: number) => {
    const title = String(item?.title || item?.name || `Grow calendar task ${index + 1}`);
    const dueDate = String(item?.dueDate || item?.date || tomorrow(index));
    const sourceStage = item?.stage
      ? String(item.stage)
      : `grow_calendar_task_${index + 1}`;
    const stage = sourceStage ? `Stage: ${sourceStage}` : "";
    const notes = item?.description || item?.notes || item?.reason || "";

    return {
      title,
      priority: normalizePriority(item?.priority),
      dueDate,
      ...growCalendarMetadata(sourceStage),
      description: [stage, notes, "Created from the Auto Grow Calendar ToolRun."]
        .filter(Boolean)
        .join("\n")
    };
  });
}

export default function AutoGrowCalendarToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="auto-grow-calendar"
      toolKey="auto-grow-calendar"
      title="Auto Grow Calendar"
      subtitle="Build one editable grow lifecycle plan from saved dates, plant timing, veg, flower, harvest, dry, and cure context."
      aiPrefill={{
        buttonLabel: "Fill lifecycle plan from grow",
        clearUnfilled: true,
        buildMessage: () =>
          `Prefill this grow lifecycle calendar from the selected grow's actual start date, plants, crop/cultivar records, current stage, stage-change logs, breeder timing, tasks, diagnoses, harvest reviews, and dry/cure plans. Return JSON only with exactly these string keys: plantCount, startDate, vegLengthWeeks, expectedFlowerDays, growStyle, medium, plants, planningNotes. plants must be a JSON array encoded as a string; each item may contain plantId, cultivar, expectedFlowerDaysMin, expectedFlowerDaysMax, and timingEvidence. Dates and elapsed durations must come from saved records. Breeder timing is a reference, not a guaranteed harvest date. Leave unknowns blank. In planningNotes identify conflicts, missing dates, cultivar/plant timing differences, uncertainty, and milestones that should remain user-editable proposals.`
      }}
      fields={[
        {
          key: "plantCount",
          label: "Plant count",
          defaultValue: "4",
          keyboardType: "numeric"
        },
        { key: "startDate", label: "Start date YYYY-MM-DD", defaultValue: tomorrow(0) },
        {
          key: "vegLengthWeeks",
          label: "Veg length weeks",
          defaultValue: "4",
          keyboardType: "numeric"
        },
        {
          key: "expectedFlowerDays",
          label: "Expected flower days",
          defaultValue: "63",
          keyboardType: "numeric"
        },
        { key: "growStyle", label: "Grow style", defaultValue: "indoor" },
        { key: "medium", label: "Medium", defaultValue: "living_soil" },
        {
          key: "plants",
          label: "Optional plants: cultivar, flower min days, flower max days",
          defaultValue: "Sour Diesel, 63, 70\nHaze Hybrid, 70, 77",
          multiline: true
        },
        {
          key: "planningNotes",
          label: "Planning notes and timing uncertainty (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        plantCount: values.plantCount,
        startDate: values.startDate,
        vegLengthWeeks: values.vegLengthWeeks,
        expectedFlowerDays: values.expectedFlowerDays,
        growStyle: values.growStyle,
        medium: values.medium,
        plants: parsePlants(values.plants),
        planningNotes: values.planningNotes || undefined
      })}
      buildMetrics={(outputs) => [
        { key: "flip", label: "Flip date", value: outputs.stageTimeline?.flipDate },
        {
          key: "harvestStart",
          label: "Harvest start",
          value: outputs.stageTimeline?.expectedHarvestStart
        },
        {
          key: "harvestEnd",
          label: "Harvest end",
          value: outputs.stageTimeline?.expectedHarvestEnd
        },
        {
          key: "tasks",
          label: "Planned tasks",
          value: Array.isArray(outputs.taskSchedule) ? outputs.taskSchedule.length : 0
        },
        {
          key: "plantWindows",
          label: "Plant windows",
          value: outputs.plantSpecificHarvestWindows?.length || 0
        }
      ]}
      buildNotices={(outputs) =>
        Array.isArray(outputs.reminders)
          ? outputs.reminders.map((message: string, index: number) => ({
              key: `reminder-${index}`,
              severity: "info" as const,
              message
            }))
          : []
      }
      defaultLogTitle={() => "Auto grow calendar plan"}
      defaultTask={(outputs) => ({
        title: outputs.taskSchedule?.[0]?.title || "Start grow calendar",
        dueDate: outputs.taskSchedule?.[0]?.dueDate || tomorrow(0),
        priority: "medium",
        ...growCalendarMetadata(
          outputs.taskSchedule?.[0]?.stage
            ? String(outputs.taskSchedule[0].stage)
            : "grow_calendar_start"
        ),
        description:
          "Use this as the first calendar task, then create the rest from the saved plan."
      })}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-grow-calendar-tasks",
          label: "Create Calendar Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId || calendarTaskPlan(outputs).length === 0,
          successMessage: "Created grow calendar tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "auto-grow-calendar",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: calendarTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
