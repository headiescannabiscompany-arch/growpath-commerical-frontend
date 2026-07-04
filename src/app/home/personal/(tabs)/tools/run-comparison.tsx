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
        const [
          name,
          cultivar,
          yieldAmount,
          qualityScore,
          issueCount,
          days,
          averageVpd,
          averageDli,
          dryDays
        ] = line
          .split(",")
          .map((part) => part.trim());
        if (!name) return null;
        return {
          id: `run_${index + 1}`,
          name,
          cultivar,
          yieldAmount: Number(yieldAmount || 0),
          qualityScore: Number(qualityScore || 0),
          issueCount: Number(issueCount || 0),
          days: Number(days || 0),
          averageVpd: averageVpd ? Number(averageVpd) : null,
          averageDli: averageDli ? Number(averageDli) : null,
          dryDays: dryDays ? Number(dryDays) : null
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
          label:
            "Runs as lines: name, cultivar, yield, quality 0-10, issue count, days, avg VPD, avg DLI, dry days",
          defaultValue: "Run 1, Sour Diesel, 14, 7, 3, 120, 1.1, 36, 12\nRun 2, Sour Diesel, 18, 8, 1, 112, 1.3, 40, 8",
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
        {
          key: "quality",
          label: "Quality spread",
          value: outputs.differences?.qualitySpread
        },
        {
          key: "missing",
          label: "Missing data",
          value: outputs.missingData?.length || 0
        }
      ]}
      buildNotices={(outputs) => [
        ...(outputs.missingData?.length
          ? [
              {
                key: "missing-data",
                severity: "medium" as const,
                message:
                  "Some comparison fields are missing. Recommendations are lower-confidence until logs, environment, tasks, dry/cure, and final quality are linked."
              }
            ]
          : []),
        ...(outputs.structuredSummary?.sameCultivar === false
          ? [
              {
                key: "cultivar",
                severity: "medium" as const,
                message:
                  "Selected runs include different cultivars or phenos. Genetic differences may explain some variation."
              }
            ]
          : [])
      ]}
      defaultLogTitle={(outputs) =>
        `Run comparison: ${outputs.bestRun?.name || "selected runs"}`
      }
    />
  );
}
