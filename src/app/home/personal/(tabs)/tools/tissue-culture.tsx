import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function numberOrFallback(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function tissueCultureTaskPlan(
  outputs: Record<string, any>,
  payload: Record<string, any>
) {
  const projectName = String(outputs.projectName || payload.projectName || "TC Project");
  const batchNumber = String(payload.batchNumber || "TC batch");
  const stage = String(payload.stage || "initiation");
  const transferDueDays = numberOrFallback(
    outputs.nextTransferTasks?.[0]?.dueInDays,
    numberOrFallback(payload.transfersDueDays, 14)
  );
  const failureModes = outputs.diagnosisRecord?.likelyFailureModes;
  const failureSummary =
    Array.isArray(failureModes) && failureModes.length
      ? `Likely failure modes: ${failureModes.map((item: any) => item?.issue || item).join("; ")}`
      : "";
  const calendarMetadata = {
    allDay: true,
    calendarType: "tissue_culture_workflow",
    sourceStage: stage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -24 * 60 }]
    }
  };

  return [
    {
      title: `Review contamination and browning: ${batchNumber}`,
      priority: outputs.contaminationRate > 10 ? ("high" as const) : ("medium" as const),
      dueDate: tomorrow(1),
      ...calendarMetadata,
      description: [
        `${projectName} is in ${stage}.`,
        `Contaminated vessels: ${payload.contaminatedVessels || 0}; browning vessels: ${payload.browningVessels || 0}.`,
        failureSummary,
        "Cull or isolate contaminated vessels and note whether the issue is media, explant prep, or handling."
      ]
        .filter(Boolean)
        .join("\n")
    },
    {
      title: outputs.nextTransferTasks?.[0]?.title || `Transfer review: ${batchNumber}`,
      priority: outputs.nextTransferTasks?.[0]?.priority || "medium",
      dueDate: tomorrow(transferDueDays),
      ...calendarMetadata,
      description:
        "Review vessel IDs, media recipe, multiplication/rooting readiness, contamination, and transfer notes before moving cultures."
    },
    {
      title: `Record rooting and acclimation counts: ${batchNumber}`,
      priority: "medium" as const,
      dueDate: tomorrow(Math.max(1, Math.min(transferDueDays, 7))),
      ...calendarMetadata,
      sourceStage: "rooting_acclimation_review",
      description:
        "Update rooted vessels, acclimated plants, stalled vessels, and survival rate so the protocol can be compared over time."
    },
    {
      title: `Update TC SOP notes: ${batchNumber}`,
      priority: "medium" as const,
      dueDate: tomorrow(Math.max(1, transferDueDays + 1)),
      ...calendarMetadata,
      sourceStage: "sop_media_review",
      description: [
        `SOP version: ${payload.SOPVersion || "not set"}.`,
        `Media recipe: ${payload.mediaRecipe || "not set"}.`,
        "Capture what changed, what worked, and what should be adjusted before the next batch."
      ].join("\n")
    }
  ];
}

export default function TissueCultureToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="tissue-culture"
      toolKey="tissue-culture"
      title="Tissue Culture"
      subtitle="Track TC batch status, vessels, contamination, rooting, acclimation, SOP version, and next transfer tasks."
      fields={[
        { key: "projectName", label: "Project name", defaultValue: "TC Project" },
        { key: "batchNumber", label: "Batch number", defaultValue: "TC-001" },
        { key: "geneticsId", label: "Genetics ID", defaultValue: "" },
        { key: "stage", label: "Stage", defaultValue: "initiation" },
        { key: "mediaRecipe", label: "Media recipe", defaultValue: "starter media" },
        {
          key: "vessels",
          label: "Total vessels",
          defaultValue: "24",
          keyboardType: "numeric"
        },
        {
          key: "contaminatedVessels",
          label: "Contaminated vessels",
          defaultValue: "2",
          keyboardType: "numeric"
        },
        {
          key: "browningVessels",
          label: "Browning / oxidized vessels",
          defaultValue: "1",
          keyboardType: "numeric"
        },
        {
          key: "stalledVessels",
          label: "Stalled vessels",
          defaultValue: "3",
          keyboardType: "numeric"
        },
        {
          key: "rootedVessels",
          label: "Rooted vessels",
          defaultValue: "10",
          keyboardType: "numeric"
        },
        {
          key: "acclimatedPlants",
          label: "Acclimated plants",
          defaultValue: "6",
          keyboardType: "numeric"
        },
        { key: "SOPVersion", label: "SOP version", defaultValue: "SOP-TC-1" },
        {
          key: "symptoms",
          label: "Symptoms / diagnosis notes",
          defaultValue: "fuzzy mold, browning",
          multiline: true
        },
        {
          key: "transfersDueDays",
          label: "Next transfer due in days",
          defaultValue: "14",
          keyboardType: "numeric"
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        projectName: values.projectName,
        batchNumber: values.batchNumber,
        geneticsId: values.geneticsId,
        stage: values.stage,
        mediaRecipe: values.mediaRecipe,
        vessels: values.vessels,
        contaminatedVessels: values.contaminatedVessels,
        browningVessels: values.browningVessels,
        stalledVessels: values.stalledVessels,
        rootedVessels: values.rootedVessels,
        acclimatedPlants: values.acclimatedPlants,
        SOPVersion: values.SOPVersion,
        symptoms: values.symptoms,
        transfersDueDays: values.transfersDueDays
      })}
      buildMetrics={(outputs) => [
        { key: "status", label: "Status", value: outputs.projectStatus },
        {
          key: "contamination",
          label: "Contamination %",
          value: outputs.contaminationRate
        },
        { key: "rooting", label: "Rooting %", value: outputs.rootingRate },
        { key: "acclimation", label: "Acclimation %", value: outputs.acclimationRate },
        {
          key: "failureModes",
          label: "Likely issues",
          value: outputs.diagnosisRecord?.likelyFailureModes?.length || 0
        },
        {
          key: "nextCheck",
          label: "Calendar tasks",
          value: outputs.generatedCalendar?.length || 0
        }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.warnings)
          ? outputs.warnings.map((message: string, index: number) => ({
              key: `warning-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(outputs.diagnosisRecord?.likelyFailureModes?.length
          ? [
              {
                key: "diagnosis",
                severity: "info" as const,
                message:
                  "Diagnosis is pattern-based. Compare vessel and batch patterns before changing the whole protocol."
              }
            ]
          : [])
      ]}
      defaultLogTitle={(outputs) =>
        `${outputs.projectName || "Tissue culture"} batch check`
      }
      defaultTask={(outputs) => ({
        title: outputs.nextTransferTasks?.[0]?.title || "Review TC vessels for transfer",
        priority: outputs.nextTransferTasks?.[0]?.priority || "medium",
        dueDate: tomorrow(outputs.nextTransferTasks?.[0]?.dueInDays || 14),
        description:
          "Review vessel IDs, contamination, rooting status, media, and transfer notes."
      })}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-tissue-culture-workflow-tasks",
          label: "Create TC Workflow Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created tissue culture workflow tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "tissue-culture",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: tissueCultureTaskPlan(outputs, payload)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
