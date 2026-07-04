import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function CloneRootingToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="clone-rooting"
      toolKey="clone-rooting"
      title="Clone Rooting Troubleshooter"
      subtitle="Check clone rooting bottlenecks from humidity, temperature, light, stem condition, and timeline."
      fields={[
        {
          key: "daysSinceCut",
          label: "Days since cut",
          defaultValue: "7",
          keyboardType: "numeric"
        },
        {
          key: "cloneCount",
          label: "Clone count",
          defaultValue: "12",
          keyboardType: "numeric"
        },
        {
          key: "rootedCount",
          label: "Rooted count",
          defaultValue: "0",
          keyboardType: "numeric"
        },
        {
          key: "failedCount",
          label: "Failed count",
          defaultValue: "0",
          keyboardType: "numeric"
        },
        {
          key: "motherPlantHealth",
          label: "Mother plant health",
          defaultValue: "good"
        },
        {
          key: "humidity",
          label: "Humidity %",
          defaultValue: "80",
          keyboardType: "numeric"
        },
        {
          key: "temperature",
          label: "Temperature F",
          defaultValue: "76",
          keyboardType: "numeric"
        },
        {
          key: "lightIntensity",
          label: "Light intensity PPFD",
          defaultValue: "150",
          keyboardType: "numeric"
        },
        { key: "mediumStatus", label: "Medium status", defaultValue: "moist" },
        { key: "stemCondition", label: "Stem condition", defaultValue: "green, firm" },
        { key: "leafCondition", label: "Leaf condition", defaultValue: "slight wilt" },
        {
          key: "rootingStatus",
          label: "Rooting status",
          defaultValue: "no visible roots yet"
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        daysSinceCut: values.daysSinceCut,
        cloneCount: values.cloneCount,
        rootedCount: values.rootedCount,
        failedCount: values.failedCount,
        motherPlantHealth: values.motherPlantHealth,
        humidity: values.humidity,
        temperature: values.temperature,
        lightIntensity: values.lightIntensity,
        mediumStatus: values.mediumStatus,
        stemCondition: values.stemCondition,
        leafCondition: values.leafCondition,
        rootingStatus: values.rootingStatus
      })}
      buildMetrics={(outputs) => [
        { key: "risk", label: "Risk", value: outputs.riskLevel },
        { key: "progress", label: "Progress", value: outputs.rootingProgress },
        { key: "days", label: "Days since cut", value: outputs.daysSinceCut },
        {
          key: "bottlenecks",
          label: "Bottlenecks",
          value: Array.isArray(outputs.likelyBottlenecks)
            ? outputs.likelyBottlenecks.length
            : 0
        },
        {
          key: "rooted",
          label: "Rooted %",
          value: outputs.clonePerformanceSummary?.rootingPercent
        }
      ]}
      buildNotices={(outputs) =>
        Array.isArray(outputs.likelyBottlenecks)
          ? outputs.likelyBottlenecks.slice(0, 4).map((item: any, index: number) => ({
              key: `bottleneck-${index}`,
              severity:
                outputs.riskLevel === "high" || item.confidence >= 0.75
                  ? ("high" as const)
                  : ("medium" as const),
              message: item.issue || String(item),
              remediation: Array.isArray(item.recommendations)
                ? item.recommendations.join(" ")
                : undefined
            }))
          : []
      }
      defaultLogTitle={() => "Clone rooting check"}
      defaultTask={(outputs) => ({
        title: outputs.followUpTask?.title || "Check clone rooting tray",
        priority: outputs.followUpTask?.priority || "medium",
        dueDate: tomorrow(outputs.followUpTask?.dueInDays || 2),
        description:
          "Inspect dome humidity, leaf turgor, stem base, and callus/root progress."
      })}
    />
  );
}
