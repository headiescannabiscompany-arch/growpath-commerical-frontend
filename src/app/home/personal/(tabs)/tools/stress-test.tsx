import React from "react";

import BackendCalculatorToolScreen, { tomorrow } from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function StressTestToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="stress-test"
      toolKey="stress-test"
      title="Stress Testing"
      subtitle="Record controlled stress response, recovery, stability signals, and keeper impact."
      fields={[
        { key: "stressType", label: "Stress type", defaultValue: "dryback" },
        { key: "severity", label: "Severity 1-10", defaultValue: "4", keyboardType: "numeric" },
        { key: "recoveryDays", label: "Recovery days", defaultValue: "2", keyboardType: "numeric" },
        { key: "damageScore", label: "Damage score 0-10", defaultValue: "3", keyboardType: "numeric" },
        { key: "vigorScore", label: "Vigor under stress 0-10", defaultValue: "7", keyboardType: "numeric" },
        {
          key: "stabilitySignals",
          label: "Stability signals, comma-separated",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        stressType: values.stressType,
        severity: values.severity,
        recoveryDays: values.recoveryDays,
        damageScore: values.damageScore,
        vigorScore: values.vigorScore,
        stabilitySignals: values.stabilitySignals
      })}
      buildMetrics={(outputs) => [
        { key: "risk", label: "Risk", value: outputs.riskLevel },
        { key: "response", label: "Response score", value: outputs.stressResponseScore },
        { key: "recovery", label: "Recovery score", value: outputs.recoveryScore },
        { key: "stability", label: "Stability score", value: outputs.stabilityScore },
        { key: "keeper", label: "Keeper impact", value: outputs.keeperImpact }
      ]}
      defaultLogTitle={(outputs) => `${outputs.stressType || "Stress"} test result`}
      defaultTask={(outputs) => ({
        title: outputs.taskSuggestion?.title || "Recheck stress recovery",
        priority: outputs.taskSuggestion?.priority || "medium",
        dueDate: tomorrow(outputs.taskSuggestion?.dueInDays || 2),
        description: "Review recovery, new damage, photos, and stability signals before changing keeper decisions."
      })}
    />
  );
}
