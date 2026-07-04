import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

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

export default function AutoGrowCalendarToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="auto-grow-calendar"
      toolKey="auto-grow-calendar"
      title="Auto Grow Calendar"
      subtitle="Generate deterministic stage anchors, task dates, and harvest planning windows."
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
        }
      ]}
      buildPayload={(values, { growId }) => ({
        growId,
        plantCount: values.plantCount,
        startDate: values.startDate,
        vegLengthWeeks: values.vegLengthWeeks,
        expectedFlowerDays: values.expectedFlowerDays,
        growStyle: values.growStyle,
        medium: values.medium,
        plants: parsePlants(values.plants)
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
        description:
          "Use this as the first calendar task, then create the rest from the saved plan."
      })}
    />
  );
}
