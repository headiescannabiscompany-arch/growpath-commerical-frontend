import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

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
        { key: "aromaIntensity", label: "Aroma intensity", defaultValue: "building" },
        { key: "userEffectGoal", label: "Effect goal", defaultValue: "balanced" }
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
        { key: "end", label: "End day", value: outputs.estimatedWindow?.endDay }
      ]}
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
    />
  );
}
