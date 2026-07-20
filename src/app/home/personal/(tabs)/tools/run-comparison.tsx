import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import {
  saveToolRunAndCreateTasks,
  type LinkedTaskDraft
} from "@/features/personal/tools/saveToolRunAndOpenJournal";

function normalizePriority(
  value: unknown,
  fallback: "low" | "medium" | "high" = "medium"
) {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

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
        ] = line.split(",").map((part) => part.trim());
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

function runComparisonTaskPlan(outputs: Record<string, any>) {
  const planned = Array.isArray(outputs.tasksToCreate) ? outputs.tasksToCreate : [];
  const metadata = (sourceStage: string) => ({
    allDay: true,
    calendarType: "run_comparison_followup",
    sourceStage,
    reminderPlan: {
      label: "24 hours before",
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -1440 }]
    }
  });
  if (planned.length) {
    return planned.slice(0, 8).map((task: any, index: number) => ({
      title: String(task?.title || `Run comparison follow-up ${index + 1}`),
      priority: normalizePriority(task?.priority),
      dueDate: tomorrow(Number(task?.dueInDays || index + 1)),
      ...metadata(String(task?.sourceStage || `run_comparison_followup_${index + 1}`)),
      description:
        task?.description ||
        "Use this run comparison result to update next-run planning, notes, environment targets, and task templates."
    }));
  }

  const missingCount = Array.isArray(outputs.missingData)
    ? outputs.missingData.length
    : 0;
  const bestRun = outputs.bestRun?.name || "best run";
  const worstRun = outputs.worstRun?.name || "review run";
  const sameCultivar = outputs.structuredSummary?.sameCultivar;

  const tasks: LinkedTaskDraft[] = [
    {
      title: "Record run comparison decisions",
      priority: "medium" as const,
      dueDate: tomorrow(1),
      ...metadata("post_run_decision_review"),
      description: `Compare ${bestRun} against ${worstRun}; save the environment, feeding, IPM, dry/cure, and quality lessons that should change the next run.`
    },
    {
      title: "Update next-run task template",
      priority: "medium" as const,
      dueDate: tomorrow(3),
      ...metadata("next_run_template_update"),
      description:
        "Turn the comparison into concrete next-run actions for VPD, DLI, feeding, IPM checks, dry/cure timing, harvest timing, and pheno scoring."
    }
  ];

  if (missingCount > 0) {
    tasks.push({
      title: "Fill missing comparison data",
      priority: "high",
      dueDate: tomorrow(2),
      ...metadata("comparison_data_backfill"),
      description:
        "Add missing yield, quality, issue, environment, task, dry/cure, or smoke-note data before trusting the comparison."
    });
  }

  if (sameCultivar === false) {
    tasks.push({
      title: "Separate cultivar and environment effects",
      priority: "medium",
      dueDate: tomorrow(4),
      ...metadata("cultivar_environment_effect_review"),
      description:
        "Review whether the result is driven by genetics/pheno differences or by grow process differences before changing SOPs."
    });
  }

  return tasks;
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
          defaultValue:
            "Run 1, Sour Diesel, 14, 7, 3, 120, 1.1, 36, 12\nRun 2, Sour Diesel, 18, 8, 1, 112, 1.3, 40, 8",
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
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-run-comparison-tasks",
          label: "Create Next-Run Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created run comparison tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "run-comparison",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: runComparisonTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
