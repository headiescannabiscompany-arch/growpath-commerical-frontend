import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function numberOrFallback(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function readinessTaskPlan(outputs: Record<string, any>, payload: Record<string, any>) {
  const flowerDay = numberOrFallback(payload.flowerDay, 0);
  const startDay = numberOrFallback(outputs.estimatedWindow?.startDay, flowerDay + 3);
  const targetDay = numberOrFallback(
    outputs.estimatedWindow?.targetDay,
    outputs.harvestTask?.dueInDays
      ? flowerDay + Number(outputs.harvestTask.dueInDays)
      : flowerDay + 7
  );
  const recheckDueInDays = numberOrFallback(outputs.harvestTask?.dueInDays, 3);
  const windowStartDueInDays = Math.max(1, Math.round(startDay - flowerDay));
  const targetDueInDays = Math.max(
    windowStartDueInDays,
    Math.round(targetDay - flowerDay)
  );
  const readiness = String(outputs.readinessStatus || "harvest readiness").replaceAll(
    "_",
    " "
  );
  const warningText =
    Array.isArray(outputs.warnings) && outputs.warnings.length
      ? `\nWarnings: ${outputs.warnings.join("; ")}`
      : "";

  return [
    {
      title: outputs.harvestTask?.title || "Recheck harvest readiness",
      priority: outputs.harvestTask?.priority || "medium",
      dueDate: tomorrow(recheckDueInDays),
      description: [
        `Current readiness: ${readiness}.`,
        "Recheck trichomes, pistils, aroma, bud swell, and whole-plant maturity.",
        `Sample location: ${payload.sampleLocation || "mixed bud sites"}.`,
        warningText.trim()
      ]
        .filter(Boolean)
        .join("\n")
    },
    {
      title: "Capture top and lower trichome photos",
      priority: "medium" as const,
      dueDate: tomorrow(recheckDueInDays),
      description:
        "Take clear photos from top and lower buds so harvest timing is not based on one sample site."
    },
    {
      title: "Make harvest window decision",
      priority: "high" as const,
      dueDate: tomorrow(windowStartDueInDays),
      description: [
        `Estimated window starts around flower day ${startDay}.`,
        `Target day is ${targetDay} for goal: ${payload.userGoal || "balanced"}.`,
        "Decide whether to harvest all at once, delay, or partial harvest tops before lowers."
      ].join("\n")
    },
    {
      title: "Prepare dry/cure setup",
      priority: "high" as const,
      dueDate: tomorrow(Math.max(1, targetDueInDays - 1)),
      description:
        "Prepare dry space targets, jars/bags, labels, and post-harvest notes before cutting plants."
    }
  ];
}

export default function HarvestReadinessToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="harvest-readiness"
      toolKey="harvest-readiness"
      title="Harvest Readiness AI"
      subtitle="Estimate harvest readiness from flower day, breeder timing, trichome mix, aroma, and user goals."
      fields={[
        {
          key: "flowerDay",
          label: "Flower day",
          defaultValue: "56",
          keyboardType: "numeric"
        },
        {
          key: "breederFlowerTime",
          label: "Breeder flower time",
          defaultValue: "63",
          keyboardType: "numeric"
        },
        {
          key: "cloudyPercent",
          label: "Cloudy %",
          defaultValue: "65",
          keyboardType: "numeric"
        },
        {
          key: "amberPercent",
          label: "Amber %",
          defaultValue: "8",
          keyboardType: "numeric"
        },
        {
          key: "clearPercent",
          label: "Clear %",
          defaultValue: "10",
          keyboardType: "numeric"
        },
        { key: "pistilStatus", label: "Pistil / hair status", defaultValue: "mixed" },
        {
          key: "budSwellStatus",
          label: "Bud / calyx swell",
          defaultValue: "mostly_swollen"
        },
        {
          key: "sampleLocation",
          label: "Trichome sample location",
          defaultValue: "mixed_bud_sites"
        },
        { key: "aromaIntensity", label: "Aroma intensity", defaultValue: "building" },
        { key: "userGoal", label: "Effect goal", defaultValue: "balanced" }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        ...values
      })}
      buildMetrics={(outputs) => [
        { key: "status", label: "Readiness", value: outputs.readinessStatus },
        { key: "start", label: "Start day", value: outputs.estimatedWindow?.startDay },
        { key: "target", label: "Target day", value: outputs.estimatedWindow?.targetDay },
        { key: "end", label: "End day", value: outputs.estimatedWindow?.endDay },
        {
          key: "pistils",
          label: "Pistils",
          value: outputs.wholePlantMaturity?.pistilStatus
        },
        {
          key: "swell",
          label: "Bud swell",
          value: outputs.wholePlantMaturity?.budSwellStatus
        }
      ]}
      buildNotices={(outputs) =>
        Array.isArray(outputs.warnings)
          ? outputs.warnings.map((message: string, index: number) => ({
              key: `warning-${index}`,
              severity: "medium" as const,
              message
            }))
          : []
      }
      defaultLogTitle={(outputs) =>
        `Harvest readiness: ${outputs.readinessStatus || "check"}`
      }
      defaultTask={(outputs) => ({
        title: outputs.harvestTask?.title || "Recheck harvest readiness",
        priority: outputs.harvestTask?.priority || "medium",
        dueDate: tomorrow(outputs.harvestTask?.dueInDays || 3),
        description:
          "Recheck trichomes, pistils, aroma, bud swell, and whole-plant maturity."
      })}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-harvest-readiness-task-plan",
          label: "Create Harvest Decision Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created harvest decision tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "harvest-readiness",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: readinessTaskPlan(outputs, payload)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
