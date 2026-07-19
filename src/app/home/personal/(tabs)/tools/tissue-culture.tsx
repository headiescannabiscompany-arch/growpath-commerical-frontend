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

function parseTraceabilityRows(value: string) {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split("\n")
      .map((line) => {
        const [vesselId, rack, shelf, status, parentVesselId, notes] = line
          .split(",")
          .map((part) => part.trim());
        if (!vesselId) return null;
        return { vesselId, rack, shelf, status, parentVesselId, notes };
      })
      .filter(Boolean);
  }
}

function costPerSurvivingPlant(values: Record<string, string>) {
  const survivors = Number(values.survivingProtocolUnits || values.acclimationSurvived);
  if (!Number.isFinite(survivors) || survivors <= 0) return undefined;
  const total = [values.mediaCost, values.vesselSupplyCost, values.laborCost].reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );
  return Number((total / survivors).toFixed(2));
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
  const coldStorageTasks =
    String(payload.preservationMode || "").toLowerCase() === "cold_storage"
      ? [
          {
            title: `Verify cold-storage entry: ${batchNumber}`,
            priority: "high" as const,
            dueDate: String(payload.coldStorageStartDate || tomorrow(1)),
            ...calendarMetadata,
            sourceStage: "tc_cold_storage_entry",
            description:
              "Verify vessel IDs, clean status, storage medium/SOP, measured temperature, location, entry date, and retrieval plan."
          },
          {
            title: `Retrieve and recovery-check: ${batchNumber}`,
            priority: "high" as const,
            dueDate: String(payload.plannedRetrievalDate || tomorrow(30)),
            ...calendarMetadata,
            sourceStage: "tc_cold_storage_recovery",
            description:
              "Record retrieval conditions, survival, contamination, regrowth, phenotype stability, and whether the line returns to production or needs retest."
          }
        ]
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
    {
      title: `Audit TC traceability: ${batchNumber}`,
      priority: "high" as const,
      dueDate: tomorrow(1),
      ...calendarMetadata,
      sourceStage: "tc_traceability_audit",
      description: [
        `Mother bank: ${payload.motherBankId || "not linked"}.`,
        `Source batch: ${payload.sourceBatchId || "not linked"}; parent transfer: ${payload.parentTransferId || "not linked"}.`,
        `Media lot: ${payload.mediaLotId || "not linked"}; sterilization run: ${payload.sterilizationRunId || "not linked"}.`,
        `Tracked vessels: ${Array.isArray(payload.vesselTraceability) ? payload.vesselTraceability.length : 0}.`,
        "Confirm vessel IDs, parent lineage, rack/shelf location, technician action, and status before the next transfer or storage move."
      ].join("\n")
    },
    {
      title: `Review TC quality controls: ${batchNumber}`,
      priority:
        payload.pathogenTestStatus === "clear" ? ("medium" as const) : ("high" as const),
      dueDate: tomorrow(2),
      ...calendarMetadata,
      sourceStage: "tc_quality_control",
      description: [
        `Pathogen/indexing status: ${payload.pathogenTestStatus || "not recorded"}.`,
        `Genetic stability/off-type review: ${payload.geneticStabilityStatus || "not recorded"}.`,
        `Contamination disposition: ${payload.contaminationDisposition || "not recorded"}.`,
        "Confirm linked lab reports, isolate/cull actions, off-type observations, and whether the line is eligible for production, storage, retest, or retirement."
      ].join("\n")
    },
    {
      title: `Review TC environment and protocol outcome: ${batchNumber}`,
      priority: "medium" as const,
      dueDate: tomorrow(3),
      ...calendarMetadata,
      sourceStage: "tc_environment_protocol_review",
      description: [
        `Incubation room: ${payload.incubationRoomId || "not linked"}; telemetry: ${payload.telemetrySourceIds || "not linked"}.`,
        `Protocol: ${payload.protocolId || "not linked"} ${payload.protocolVersion || ""}.`,
        `Initial units: ${payload.initialProtocolUnits || "not recorded"}; surviving units: ${payload.survivingProtocolUnits || "not recorded"}.`,
        "Compare measured incubation/storage conditions, survival, regrowth, contamination, labor, and cost per surviving plant against prior protocol cohorts."
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
    ...coldStorageTasks,
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
      formHeader={({ growId, facilityId }) => (
        <MediaEvidencePicker
          maxPhotos={10}
          allowVideo
          maxVideoSeconds={30}
          purpose="tissue_culture"
          sourceContext={{
            growId: growId || undefined,
            facilityId: facilityId || undefined
          }}
          value={evidenceAssets}
          onChange={setEvidenceAssets}
        />
      )}
      aiPrefill={{
        buttonLabel: "Fill TC batch from records and media",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        buildMessage: () =>
          `Prefill this Tissue Culture batch review from the selected grow/plant genetics, mother-bank and production-line records, TC batches/transfers, SOP/media lots, technician actions, costs, tasks, cold-storage history, logs, and attached vessel photos/video. Return JSON only using the fields requested by the form. Every value must be a string; vesselTraceability may be a JSON-array string with vesselId, rack, shelf, status, parentVesselId, and notes. Counts, identifiers, dates, costs, SOP, media lots, recipe, temperature, and transfer timing must come from saved records, not visual estimates. Never invent a vessel ID, parent lineage, lot, or technician action. Media may support visible contamination category, browning, callus/root visibility, and batch pattern, but do not identify a microbe species from appearance. Leave unknowns blank. In symptoms/storageNotes separate observations, hypotheses, batch distribution, uncertainty, cold-storage entry/retrieval conditions, and missing close-up/control-vessel evidence.`
      }}
      fields={[
        { key: "projectName", label: "Project name", defaultValue: "TC Project" },
        { key: "batchNumber", label: "Batch number", defaultValue: "TC-001" },
        { key: "geneticsId", label: "Genetics ID", defaultValue: "" },
        { key: "motherBankId", label: "Mother-bank line ID", defaultValue: "" },
        { key: "sourceBatchId", label: "Source batch ID", defaultValue: "" },
        { key: "parentTransferId", label: "Parent transfer ID", defaultValue: "" },
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
        { key: "lastAction", label: "Last handling action", defaultValue: "" },
        { key: "lastActionBy", label: "Last action by", defaultValue: "" },
        { key: "lastActionAt", label: "Last action date/time", defaultValue: "" },
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
        { key: "mediaLotId", label: "Media preparation / lot ID", defaultValue: "" },
        { key: "sterilizationRunId", label: "Sterilization run ID", defaultValue: "" },
        {
          key: "sterilizationMethod",
          label: "Sterilization method / protocol",
          defaultValue: ""
        },
        {
          key: "sterilizationOutcome",
          label: "Sterilization outcome / control result",
          defaultValue: ""
        },
        {
          key: "multiplicationRate",
          label: "Multiplication rate per transfer",
          defaultValue: "",
          keyboardType: "numeric"
        },
        { key: "protocolId", label: "Protocol ID", defaultValue: "" },
        { key: "protocolVersion", label: "Protocol version", defaultValue: "" },
        { key: "incubationRoomId", label: "Incubation room ID", defaultValue: "" },
        {
          key: "telemetrySourceIds",
          label: "Linked environment device/source IDs",
          defaultValue: ""
        },
        {
          key: "measuredIncubationTempC",
          label: "Measured incubation temperature C",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "measuredPhotoperiodHours",
          label: "Measured photoperiod hours",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "inventoryLocation",
          label: "Inventory location / rack / shelf",
          defaultValue: ""
        },
        {
          key: "vesselTraceability",
          label:
            "Vessels as lines: vessel ID, rack, shelf, status, parent vessel ID, notes",
          defaultValue: "",
          multiline: true
        },
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
          key: "pathogenTestStatus",
          label: "Pathogen / indexing status",
          defaultValue: ""
        },
        {
          key: "pathogenReportId",
          label: "Linked pathogen lab report ID",
          defaultValue: ""
        },
        {
          key: "geneticStabilityStatus",
          label: "Genetic stability / off-type status",
          defaultValue: ""
        },
        {
          key: "offTypeObservations",
          label: "Off-type or mutation observations",
          defaultValue: "",
          multiline: true
        },
        {
          key: "contaminationDisposition",
          label: "Contamination isolation / cull / disposal outcome",
          defaultValue: "",
          multiline: true
        },
        {
          key: "acclimationCohortId",
          label: "Acclimation cohort ID",
          defaultValue: ""
        },
        {
          key: "acclimationSurvived",
          label: "Acclimation survivors",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "protocolOutcomeNotes",
          label: "Protocol survival, regrowth, and comparison notes",
          defaultValue: "",
          multiline: true
        },
        {
          key: "initialProtocolUnits",
          label: "Initial protocol cohort units",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "survivingProtocolUnits",
          label: "Surviving / viable cohort units",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "regrowingProtocolUnits",
          label: "Regrowing cohort units",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "transfersDueDays",
          label: "Next transfer due in days",
          defaultValue: "14",
          keyboardType: "numeric"
        },
        { key: "preservationMode", label: "Preservation mode", defaultValue: "active" },
        { key: "coldStorageRoomId", label: "Cold-storage room ID", defaultValue: "" },
        {
          key: "coldStorageTempC",
          label: "Measured cold-storage temperature C",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "coldStorageStartDate",
          label: "Cold-storage entry date",
          defaultValue: ""
        },
        {
          key: "plannedRetrievalDate",
          label: "Planned retrieval date",
          defaultValue: ""
        },
        {
          key: "recoveryCheckDays",
          label: "Recovery check after retrieval (days)",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "storageNotes",
          label: "Cold-storage location, entry, retrieval, and recovery notes",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, facilityId, commercialAccountId, plantContext }) => ({
        growId,
        facilityId: facilityId || undefined,
        commercialAccountId: commercialAccountId || undefined,
        ...plantContext.toolRunContext,
        projectName: values.projectName,
        batchNumber: values.batchNumber,
        geneticsId: values.geneticsId,
        stage: values.stage,
        productionPhase: values.productionPhase,
        transferCycle: values.transferCycle,
        maxProductionTransfers: values.maxProductionTransfers,
        technicianOwner: values.technicianOwner,
        lastAction: values.lastAction || undefined,
        lastActionBy: values.lastActionBy || undefined,
        lastActionAt: values.lastActionAt || undefined,
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
        pathogenTestStatus: values.pathogenTestStatus || undefined,
        pathogenReportId: values.pathogenReportId || undefined,
        geneticStabilityStatus: values.geneticStabilityStatus || undefined,
        offTypeObservations: values.offTypeObservations || undefined,
        contaminationDisposition: values.contaminationDisposition || undefined,
        acclimationCohortId: values.acclimationCohortId || undefined,
        acclimationSurvived: values.acclimationSurvived || undefined,
        protocolOutcomeNotes: values.protocolOutcomeNotes || undefined,
        transfersDueDays: values.transfersDueDays,
        preservationMode: values.preservationMode,
        coldStorageRoomId: values.coldStorageRoomId || undefined,
        coldStorageTempC: values.coldStorageTempC || undefined,
        coldStorageStartDate: values.coldStorageStartDate || undefined,
        plannedRetrievalDate: values.plannedRetrievalDate || undefined,
        recoveryCheckDays: values.recoveryCheckDays || undefined,
        storageNotes: values.storageNotes || undefined,
        motherBankId: values.motherBankId || undefined,
        sourceBatchId: values.sourceBatchId || undefined,
        parentTransferId: values.parentTransferId || undefined,
        mediaLotId: values.mediaLotId || undefined,
        sterilizationRunId: values.sterilizationRunId || undefined,
        sterilizationMethod: values.sterilizationMethod || undefined,
        sterilizationOutcome: values.sterilizationOutcome || undefined,
        multiplicationRate: values.multiplicationRate || undefined,
        protocolId: values.protocolId || undefined,
        protocolVersion: values.protocolVersion || undefined,
        incubationRoomId: values.incubationRoomId || undefined,
        telemetrySourceIds: values.telemetrySourceIds || undefined,
        measuredIncubationTempC: values.measuredIncubationTempC || undefined,
        measuredPhotoperiodHours: values.measuredPhotoperiodHours || undefined,
        inventoryLocation: values.inventoryLocation || undefined,
        vesselTraceability: parseTraceabilityRows(values.vesselTraceability),
        initialProtocolUnits: values.initialProtocolUnits || undefined,
        survivingProtocolUnits: values.survivingProtocolUnits || undefined,
        regrowingProtocolUnits: values.regrowingProtocolUnits || undefined,
        costPerSurvivingPlant: costPerSurvivingPlant(values),
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
        },
        {
          key: "cost-per-survivor",
          label: "Cost / surviving plant",
          value: outputs.costPerSurvivingPlant
        },
        {
          key: "protocol-survival",
          label: "Protocol survival",
          value: outputs.protocolSurvivalRate
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
