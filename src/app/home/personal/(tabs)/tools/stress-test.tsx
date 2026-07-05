import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function StressTestToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="stress-test"
      toolKey="stress-test"
      title="Stress Testing"
      subtitle="Record recovery from difficult conditions for pheno selection, keeper decisions, and crop-steering suitability."
      fields={[
        { key: "stressType", label: "Stress type", defaultValue: "dryback" },
        { key: "stage", label: "Stage", defaultValue: "mid flower" },
        {
          key: "severity",
          label: "Severity 1-10",
          defaultValue: "4",
          keyboardType: "numeric"
        },
        {
          key: "recoveryDays",
          label: "Recovery days",
          defaultValue: "2",
          keyboardType: "numeric"
        },
        {
          key: "hoursToRecover",
          label: "Hours to recover",
          defaultValue: "24",
          keyboardType: "numeric"
        },
        {
          key: "damageScore",
          label: "Damage score 0-10",
          defaultValue: "3",
          keyboardType: "numeric"
        },
        {
          key: "vigorScore",
          label: "Vigor under stress 0-10",
          defaultValue: "7",
          keyboardType: "numeric"
        },
        {
          key: "stabilitySignals",
          label: "Stability / sensitivity signals",
          defaultValue:
            "no intersex signs, mild droop, no lasting calcium symptoms, no tip burn",
          multiline: true
        },
        {
          key: "notes",
          label: "Recovery notes and selection impact",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        stressType: values.stressType,
        stage: values.stage,
        severity: values.severity,
        recoveryDays: values.recoveryDays,
        hoursToRecover: values.hoursToRecover,
        damageScore: values.damageScore,
        vigorScore: values.vigorScore,
        stabilitySignals: values.stabilitySignals,
        notes: values.notes
      })}
      buildMetrics={(outputs) => [
        { key: "risk", label: "Risk", value: outputs.riskLevel },
        { key: "status", label: "Recovery", value: outputs.recoveryStatus },
        { key: "response", label: "Response score", value: outputs.stressResponseScore },
        { key: "recovery", label: "Recovery score", value: outputs.recoveryScore },
        { key: "stability", label: "Stability score", value: outputs.stabilityScore },
        { key: "keeper", label: "Keeper impact", value: outputs.keeperImpact },
        {
          key: "steering",
          label: "Steering candidate",
          value: outputs.selectionSignals?.cropSteeringCandidate ? "Yes" : "No"
        }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.warnings)
          ? outputs.warnings.map((message: string, index: number) => ({
              key: `warning-${index}`,
              severity:
                outputs.riskLevel === "high" ? ("high" as const) : ("medium" as const),
              message
            }))
          : []),
        ...(outputs.selectionSignals?.rejectOrRetest
          ? [
              {
                key: "retest",
                severity: "medium" as const,
                message:
                  "This stress result should trigger retest or extra observation before keeper decisions."
              }
            ]
          : [])
      ]}
      defaultLogTitle={(outputs) => `${outputs.stressType || "Stress"} test result`}
      defaultTask={(outputs) => ({
        title: outputs.taskSuggestion?.title || "Recheck stress recovery",
        priority: outputs.taskSuggestion?.priority || "medium",
        dueDate: tomorrow(outputs.taskSuggestion?.dueInDays || 2),
        description:
          "Review recovery, new damage, photos, and stability signals before changing keeper decisions."
      })}
    />
  );
}
