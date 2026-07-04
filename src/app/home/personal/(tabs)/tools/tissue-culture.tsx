import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

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
    />
  );
}
