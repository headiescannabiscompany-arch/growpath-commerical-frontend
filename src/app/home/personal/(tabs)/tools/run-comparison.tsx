import React from "react";

import BackendCalculatorToolScreen from "@/features/personal/tools/BackendCalculatorToolScreen";

function parseRuns(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split("\n")
      .map((line, index) => {
        const [name, yieldAmount, qualityScore, issueCount, days] = line.split(",").map((part) => part.trim());
        if (!name) return null;
        return {
          id: `run_${index + 1}`,
          name,
          yieldAmount: Number(yieldAmount || 0),
          qualityScore: Number(qualityScore || 0),
          issueCount: Number(issueCount || 0),
          days: Number(days || 0)
        };
      })
      .filter(Boolean);
  }
}

export default function RunComparisonToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="run-comparison"
      toolKey="run-comparison"
      title="Run-To-Run Comparison"
      subtitle="Compare grow runs by yield, quality, timing, issue pressure, and next-run lessons."
      fields={[
        {
          key: "runs",
          label: "Runs as lines: name, yield, quality 0-10, issue count, days",
          defaultValue: "Run 1, 14, 7, 3, 120\nRun 2, 18, 8, 1, 112",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId }) => ({
        growId,
        runs: parseRuns(values.runs)
      })}
      buildMetrics={(outputs) => [
        { key: "best", label: "Best run", value: outputs.bestRun?.name },
        { key: "worst", label: "Needs review", value: outputs.worstRun?.name },
        { key: "yield", label: "Yield spread", value: outputs.differences?.yieldSpread },
        { key: "quality", label: "Quality spread", value: outputs.differences?.qualitySpread }
      ]}
      defaultLogTitle={(outputs) => `Run comparison: ${outputs.bestRun?.name || "selected runs"}`}
    />
  );
}
