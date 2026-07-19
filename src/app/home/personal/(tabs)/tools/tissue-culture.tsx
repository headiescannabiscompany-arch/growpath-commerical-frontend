import React, { useState } from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import type { EvidenceAsset } from "@/types/evidence";

function numberOrFallback(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function tissueCultureCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "tissue_culture_workflow",
    sourceStage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -24 * 60 }]
    }
  };
}

function tissueCultureTaskPlan(
  outputs: Record<string, any>,
  payload: Record<string, any>
) {
  const projectName = String(outputs.projectName || payload.projectName || "TC Project");
  const batchNumber = String(payload.batchNumber || "TC batch");
  const stage = String(payload.stage || "initiation");
  const productionPhase = String(payload.productionPhase || "production");
  const transferCycle = numberOrFallback(payload.transferCycle, 0);
  const maxProductionTransfers = numberOrFallback(payload.maxProductionTransfers, 12);
  const transferDueDays = numberOrFallback(
    outputs.nextTransferTasks?.[0]?.dueInDays,
    numberOrFallback(payload.transfersDueDays, 14)
  );
  const failureModes = outputs.diagnosisRecord?.likelyFailureModes;
  const failureSummary =
    Array.isArray(failureModes) && failureModes.length
      ? `Likely failure modes: ${failureModes.map((item: any) => item?.issue || item).join("; ")}`
      : "";
  const calendarMetadata = tissueCultureCalendarMetadata(stage);
  const generatedCalendarTasks = Array.isArray(outputs.generatedCalendar)
    ? outputs.generatedCalendar.slice(0, 8).map((item: any, index: number) => ({
        title: String(item?.title || `TC calendar check ${index + 1}`),
        priority: item?.priority || "medium",
        dueDate: tomorrow(numberOrFallback(item?.dueInDays, index + 1)),
        ...calendarMetadata,
        sourceStage: String(item?.sourceStage || `generated_calendar_${stage}`),
        description: [
          `${projectName} generated calendar check for ${batchNumber}.`,
          item?.description || "",
          "Confirm the batch pattern before changing SOP, media, or transfer timing."
        ]
          .filter(Boolean)
          .join("\n")
      }))
    : [];

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
        `Production phase: ${productionPhase}; transfer cycle ${transferCycle}/${maxProductionTransfers}.`,
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
        "Review vessel IDs, media recipe, multiplication/rooting readiness, contamination, transfer cycle count, and transfer notes before moving cultures."
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
        `Technician/owner: ${payload.technicianOwner || "not set"}.`,
        "Capture what changed, what worked, and what should be adjusted before the next batch."
      ].join("\n")
    },
    ...(transferCycle >= Math.max(1, maxProductionTransfers - 2)
      ? [
          {
            title: `Refresh production line from mother block: ${batchNumber}`,
            priority: "high" as const,
            dueDate: tomorrow(1),
            ...calendarMetadata,
            sourceStage: "transfer_cycle_limit",
            description:
              "This line is near the transfer-cycle limit. Pull clean apical material from mother block or retire the production line before more multiplication."
          }
        ]
      : []),
    ...generatedCalendarTasks
  ];
}

export default function TissueCultureToolRoute() {
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  return (
    <BackendCalculatorToolScreen
      tool="tissue-culture"
      toolKey="tissue-culture"
      title="Tissue Culture"
      subtitle="Track TC batch status, vessels, contamination, rooting, acclimation, SOP version, and next transfer tasks."
      formHeader={({ growId }) => (
        <MediaEvidencePicker
          maxPhotos={10}
          allowVideo
          maxVideoSeconds={30}
          purpose="other"
          sourceContext={{ growId: growId || undefined }}
          value={evidenceAssets}
          onChange={setEvidenceAssets}
        />
      )}
      aiPrefill={{
        buttonLabel: "Fill TC batch from records and media",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        buildMessage: () =>
          `Prefill this Tissue Culture batch review from the selected grow/plant genetics, TC batch records, transfers, SOP/media records, costs, tasks, logs, and attached vessel photos/video. Return JSON only using these exact keys: projectName, batchNumber, geneticsId, stage, productionPhase, transferCycle, maxProductionTransfers, technicianOwner, motherBlockStartDate, productionEndDate, mediaRecipe, mediaType, vesselType, explantType, explantSize, vessels, contaminatedVessels, fungusVessels, browningVessels, stalledVessels, rootedVessels, acclimatedPlants, SOPVersion, mediaCost, vesselSupplyCost, laborCost, symptoms, transfersDueDays. Every value must be a string. Counts, dates, costs, SOP, recipe, and transfer timing must come from saved records, not visual estimates. Media may support visible contamination category, browning, callus/root visibility, and batch pattern, but do not identify a microbe species from appearance. Leave unknowns blank. In symptoms separate observations, hypotheses, batch distribution, uncertainty, and missing close-up/control-vessel evidence.`
      }}
      fields={[
        { key: "projectName", label: "Project name", defaultValue: "TC Project" },
        { key: "batchNumber", label: "Batch number", defaultValue: "TC-001" },
        { key: "geneticsId", label: "Genetics ID", defaultValue: "" },
        { key: "stage", label: "Stage", defaultValue: "initiation" },
        {
          key: "productionPhase",
          label: "Production phase",
          defaultValue: "production"
        },
        {
          key: "transferCycle",
          label: "Transfer cycle",
          defaultValue: "0",
          keyboardType: "numeric"
        },
        {
          key: "maxProductionTransfers",
          label: "Max production transfers",
          defaultValue: "12",
          keyboardType: "numeric"
        },
        {
          key: "technicianOwner",
          label: "Technician / owner",
          defaultValue: ""
        },
        {
          key: "motherBlockStartDate",
          label: "Mother block start date",
          defaultValue: ""
        },
        {
          key: "productionEndDate",
          label: "Production end date",
          defaultValue: ""
        },
        { key: "mediaRecipe", label: "Media recipe", defaultValue: "starter media" },
        { key: "mediaType", label: "Media type", defaultValue: "best fit box" },
        { key: "vesselType", label: "Vessel type", defaultValue: "glass jar" },
        { key: "explantType", label: "Explant type", defaultValue: "node" },
        { key: "explantSize", label: "Explant size", defaultValue: "standard" },
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
          key: "fungusVessels",
          label: "Fungus vessels",
          defaultValue: "0",
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
          key: "mediaCost",
          label: "Media cost",
          defaultValue: "0",
          keyboardType: "numeric"
        },
        {
          key: "vesselSupplyCost",
          label: "Vessel / supply cost",
          defaultValue: "0",
          keyboardType: "numeric"
        },
        {
          key: "laborCost",
          label: "Labor cost",
          defaultValue: "0",
          keyboardType: "numeric"
        },
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
        productionPhase: values.productionPhase,
        transferCycle: values.transferCycle,
        maxProductionTransfers: values.maxProductionTransfers,
        technicianOwner: values.technicianOwner,
        motherBlockStartDate: values.motherBlockStartDate,
        productionEndDate: values.productionEndDate,
        mediaRecipe: values.mediaRecipe,
        mediaType: values.mediaType,
        vesselType: values.vesselType,
        explantType: values.explantType,
        explantSize: values.explantSize,
        vessels: values.vessels,
        contaminatedVessels: values.contaminatedVessels,
        fungusVessels: values.fungusVessels,
        browningVessels: values.browningVessels,
        stalledVessels: values.stalledVessels,
        rootedVessels: values.rootedVessels,
        acclimatedPlants: values.acclimatedPlants,
        SOPVersion: values.SOPVersion,
        mediaCost: values.mediaCost,
        vesselSupplyCost: values.vesselSupplyCost,
        laborCost: values.laborCost,
        symptoms: values.symptoms,
        transfersDueDays: values.transfersDueDays,
        evidenceAssetIds: providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        mediaEvidence: providerEvidencePayload(evidenceAssets).media
      })}
      buildMetrics={(outputs) => [
        { key: "status", label: "Status", value: outputs.projectStatus },
        {
          key: "contamination",
          label: "Contamination %",
          value: outputs.contaminationRate
        },
        { key: "fungus", label: "Fungus %", value: outputs.fungusRate },
        {
          key: "transferCycle",
          label: "Transfer cycle",
          value: `${outputs.productionControls?.transferCycle ?? "-"} / ${
            outputs.productionControls?.maxProductionTransfers ?? "-"
          }`
        },
        {
          key: "transfersRemaining",
          label: "Transfers left",
          value: outputs.productionControls?.transfersRemaining
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
        },
        {
          key: "cost",
          label: "Total cost",
          value: outputs.costTracking?.totalProjectCost
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
        ...(outputs.targetBands?.commercialReference
          ? [
              {
                key: "target-bands",
                severity: "info" as const,
                message: outputs.targetBands.commercialReference
              }
            ]
          : []),
        ...(outputs.productionControls?.explantSizeTradeoff
          ? [
              {
                key: "explant-tradeoff",
                severity: "info" as const,
                message: outputs.productionControls.explantSizeTradeoff
              }
            ]
          : []),
        ...(outputs.acclimationGuidance?.greenhouseTransition
          ? [
              {
                key: "acclimation-guidance",
                severity: "info" as const,
                message: outputs.acclimationGuidance.greenhouseTransition
              }
            ]
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
        ...tissueCultureCalendarMetadata("transfer_review"),
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
