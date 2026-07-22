import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { providerEvidencePayload } from "@/api/evidence";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { radius } from "@/theme/theme";
import type { EvidenceAsset } from "@/types/evidence";

function normalizeAiField(value: unknown) {
  if (value == null) return "";
  const text = typeof value === "string" ? value.trim() : String(value).trim();
  if (
    /^(unknown|not known|not provided|not recorded|not available|not determined|n\/a)$/i.test(
      text
    )
  ) {
    return "";
  }
  if (Array.isArray(value)) return value.length ? JSON.stringify(value, null, 2) : "";
  return text;
}

function validateTissueCultureValues(values: Record<string, string>) {
  const required = [
    ["projectName", "Project name"],
    ["batchNumber", "Batch number"],
    ["workflowLane", "Workflow lane"],
    ["stage", "Stage"],
    ["inspectionStatus", "Direct inspection status"],
    ["observedAt", "Observation date/time"],
    ["observationSource", "Observation source"],
    ["vessels", "Total vessels"],
    ["contaminatedVessels", "Contaminated vessels"],
    ["fungalLikeVessels", "Fungal-like appearance vessels"],
    ["browningVessels", "Browning vessels"],
    ["stalledVessels", "Stalled vessels"],
    ["rootedVessels", "Rooted vessels"]
  ] as const;
  const missing = required
    .filter(([key]) => !String(values[key] || "").trim())
    .map(([, label]) => label);
  if (missing.length) return `Complete the required fields: ${missing.join(", ")}.`;

  const wholeCount = (key: string, label: string, requiredCount = false) => {
    const raw = String(values[key] || "").trim();
    if (!raw && !requiredCount) return null;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return `${label} must be a whole number of zero or greater.`;
    }
    return parsed;
  };
  const total = wholeCount("vessels", "Total vessels", true);
  if (typeof total === "string") return total;
  if (total == null || total < 1) return "Total vessels must be greater than zero.";

  const vesselCounts = [
    ["contaminatedVessels", "Contaminated vessels"],
    ["fungalLikeVessels", "Fungal-like appearance vessels"],
    ["browningVessels", "Browning vessels"],
    ["stalledVessels", "Stalled vessels"],
    ["rootedVessels", "Rooted vessels"]
  ] as const;
  const parsedCounts: Record<string, number> = {};
  for (const [key, label] of vesselCounts) {
    const parsed = wholeCount(key, label, true);
    if (typeof parsed === "string") return parsed;
    parsedCounts[key] = parsed || 0;
    if ((parsed || 0) > total) return `${label} cannot exceed total vessels.`;
  }
  if (parsedCounts.fungalLikeVessels > parsedCounts.contaminatedVessels) {
    return "Fungal-like appearance vessels cannot exceed contaminated vessels.";
  }
  if (
    values.inspectionStatus === "not_inspected" &&
    Object.values(parsedCounts).some((count) => count > 0)
  ) {
    return "Direct inspection cannot be Not inspected when visible vessel counts are recorded.";
  }

  const optionalWholeCounts = [
    ["transferCycle", "Transfer cycle"],
    ["maxProductionTransfers", "Maximum production transfers"],
    ["acclimatedPlants", "Plants entering acclimation"],
    ["acclimationSurvived", "Acclimation survivors"],
    ["initialProtocolUnits", "Initial protocol cohort units"],
    ["survivingProtocolUnits", "Surviving protocol cohort units"],
    ["regrowingProtocolUnits", "Regrowing protocol cohort units"],
    ["transfersDueDays", "Next transfer due days"],
    ["recoveryCheckDays", "Recovery check days"]
  ] as const;
  for (const [key, label] of optionalWholeCounts) {
    const parsed = wholeCount(key, label);
    if (typeof parsed === "string") return parsed;
  }
  if (
    values.transferCycle.trim() &&
    values.maxProductionTransfers.trim() &&
    Number(values.transferCycle) > Number(values.maxProductionTransfers)
  ) {
    return "Transfer cycle cannot exceed maximum production transfers.";
  }
  if (
    values.acclimatedPlants.trim() &&
    values.acclimationSurvived.trim() &&
    Number(values.acclimationSurvived) > Number(values.acclimatedPlants)
  ) {
    return "Acclimation survivors cannot exceed plants entering acclimation.";
  }
  if (
    values.initialProtocolUnits.trim() &&
    values.survivingProtocolUnits.trim() &&
    Number(values.survivingProtocolUnits) > Number(values.initialProtocolUnits)
  ) {
    return "Surviving protocol units cannot exceed initial protocol units.";
  }
  if (
    values.survivingProtocolUnits.trim() &&
    values.regrowingProtocolUnits.trim() &&
    Number(values.regrowingProtocolUnits) > Number(values.survivingProtocolUnits)
  ) {
    return "Regrowing protocol units cannot exceed surviving protocol units.";
  }
  return null;
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

function optionalDueDate(value: unknown) {
  if (value == null || String(value).trim() === "") return undefined;
  const days = Number(value);
  return Number.isInteger(days) && days >= 0 ? tomorrow(days) : undefined;
}

function tissueCultureTaskPlan(
  outputs: Record<string, any>,
  payload: Record<string, any>
) {
  const batchNumber = String(payload.batchNumber || "TC batch");
  const generated = Array.isArray(outputs.generatedCalendar)
    ? outputs.generatedCalendar.map((item: any, index: number) => ({
        title: String(item?.title || `TC evidence check ${index + 1}`),
        priority: item?.priority || "medium",
        dueDate: optionalDueDate(item?.dueInDays),
        ...tissueCultureCalendarMetadata(
          String(item?.sourceStage || `tc_evidence_check_${index + 1}`)
        ),
        description: String(
          item?.description ||
            "Recount the batch and review traceability before changing the protocol."
        )
      }))
    : [];
  const hasGeneratedTransferTask = Array.isArray(outputs.generatedCalendar)
    ? outputs.generatedCalendar.some(
        (item: any) => String(item?.sourceStage || "") === "transfer_review"
      )
    : false;
  const qualityTask = {
    title: `Review TC release evidence: ${batchNumber}`,
    priority: outputs.releaseReview?.blockers?.length
      ? ("high" as const)
      : ("medium" as const),
    dueDate: tomorrow(1),
    ...tissueCultureCalendarMetadata("tc_release_review"),
    description: [
      `Lane: ${outputs.workflowLane || payload.workflowLane || "not recorded"}; stage: ${
        outputs.stage || payload.stage || "not recorded"
      }.`,
      outputs.releaseReview?.blockers?.length
        ? `Blocked by: ${outputs.releaseReview.blockers.join("; ")}.`
        : "Review the complete evidence packet; GrowPath does not automatically release material.",
      "Visible vessel patterns cannot identify a microorganism. Link laboratory evidence when identity or pathogen status matters."
    ].join("\n")
  };
  const transferTask =
    !hasGeneratedTransferTask && outputs.nextTransferTasks?.[0]
      ? {
          title:
            outputs.nextTransferTasks[0].title || `Set transfer review: ${batchNumber}`,
          priority: outputs.nextTransferTasks[0].priority || "medium",
          dueDate: optionalDueDate(outputs.nextTransferTasks[0].dueInDays),
          ...tissueCultureCalendarMetadata("tc_transfer_review"),
          description:
            "Review vessel IDs, inspection counts, SOP, media and sterilization lots, quality-control evidence, and the owner-recorded transfer schedule."
        }
      : null;
  const coldStorageTasks =
    outputs.workflowLane === "cold_storage"
      ? [
          {
            title: `Verify cold-storage record: ${batchNumber}`,
            priority: "high" as const,
            dueDate: payload.coldStorageStartDate || undefined,
            ...tissueCultureCalendarMetadata("tc_cold_storage_entry"),
            description:
              "Verify vessel IDs, location, measured temperature, clean status, entry date, retrieval plan, and the recovery cohort to be measured."
          },
          ...(payload.plannedRetrievalDate
            ? [
                {
                  title: `Retrieve and recovery-check: ${batchNumber}`,
                  priority: "high" as const,
                  dueDate: payload.plannedRetrievalDate,
                  ...tissueCultureCalendarMetadata("tc_cold_storage_recovery"),
                  description:
                    "Record retrieval conditions, survival, regrowth, contamination, phenotype observations, and final disposition."
                }
              ]
            : [])
        ]
      : [];
  return [
    qualityTask,
    ...(transferTask ? [transferTask] : []),
    ...coldStorageTasks,
    ...generated
  ];
}

export default function TissueCultureToolRoute() {
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  const evidencePayload = useMemo(
    () => providerEvidencePayload(evidenceAssets),
    [evidenceAssets]
  );

  return (
    <BackendCalculatorToolScreen
      tool="tissue-culture"
      toolKey="tissue-culture"
      title="Tissue Culture Batch Review"
      subtitle="Review a real cannabis/hemp tissue-culture batch from direct vessel counts, lineage, SOP and lot traceability, quality controls, measured outcomes, and storage or recovery evidence."
      experienceMessage="This is a cannabis/hemp laboratory record and decision-support workflow. It keeps mother-bank, production, cold-storage, and validated cryopreservation work separate and never identifies microorganisms from appearance."
      aiCreditMessage="The measured batch calculator uses no AI credit. Optional AI photo/grow prefill uses one credit when the provider runs; review every filled field before calculating."
      runLabel="Review TC Batch"
      formHeader={({ growId, facilityId }) => (
        <View style={styles.evidenceSection}>
          <View style={styles.guidanceCard}>
            <Text style={styles.guidanceTitle}>Build one traceable batch snapshot</Text>
            <Text style={styles.guidanceText}>
              1. Choose the workflow lane and culture stage, then count every vessel in
              the same batch using the same inspection definitions.
            </Text>
            <Text style={styles.guidanceText}>
              2. Record when and how the batch was inspected. Map visible patterns by
              vessel, rack, source line, media lot, sterilization run, and handler.
            </Text>
            <Text style={styles.guidanceText}>
              3. Link the lineage, SOP, media, quality-control, acclimation, storage, and
              recovery evidence needed for the decision you are making.
            </Text>
            <Text style={styles.guidanceWarning}>
              Photos can document visible patterns. They cannot supply counts, prove
              pathogen freedom, see hidden contents, or identify a microorganism.
            </Text>
          </View>
          <MediaEvidencePicker
            aiUsable
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
        </View>
      )}
      aiPrefill={{
        buttonLabel: "Analyze TC evidence & prefill (1 AI credit)",
        clearUnfilled: true,
        evidenceAssetIds: () => evidencePayload.evidenceAssetIds,
        buildMessage: () =>
          `Inspect any attached image pixels and the selected cannabis/hemp grow, genetics/source line, tissue-culture batch and transfer history, SOP/media/sterilization records, technician actions, environment readings, quality-control reports, costs, acclimation outcomes, and storage/recovery records. Return JSON only with exactly these string keys: {"projectName":"","batchNumber":"","cropType":"","geneticsId":"","motherBankId":"","sourceBatchId":"","parentTransferId":"","workflowLane":"","stage":"","inspectionStatus":"","observedAt":"","observationSource":"","vessels":"","contaminatedVessels":"","fungalLikeVessels":"","browningVessels":"","stalledVessels":"","rootedVessels":"","visiblePatterns":"","transferCycle":"","maxProductionTransfers":"","transfersDueDays":"","technicianOwner":"","lastAction":"","lastActionBy":"","lastActionAt":"","SOPVersion":"","mediaRecipe":"","mediaType":"","mediaLotId":"","vesselType":"","explantType":"","explantSize":"","sterilizationRunId":"","sterilizationMethod":"","sterilizationOutcome":"","incubationRoomId":"","telemetrySourceIds":"","measuredIncubationTempC":"","measuredPhotoperiodHours":"","inventoryLocation":"","vesselTraceability":"","pathogenTestStatus":"","pathogenReportId":"","geneticStabilityStatus":"","offTypeObservations":"","contaminationDisposition":"","acclimationCohortId":"","acclimatedPlants":"","acclimationSurvived":"","multiplicationRate":"","protocolId":"","protocolVersion":"","initialProtocolUnits":"","survivingProtocolUnits":"","regrowingProtocolUnits":"","protocolOutcomeNotes":"","mediaCost":"","vesselSupplyCost":"","laborCost":"","coldStorageRoomId":"","coldStorageTempC":"","coldStorageStartDate":"","plannedRetrievalDate":"","recoveryCheckDays":"","storageNotes":"","cryopreservationValidationStatus":"","imageAnalysisPerformed":"true or false","imageQuality":"usable, limited, or unusable","visualConfidence":"high, medium, or low"}. Never invent counts, identifiers, dates, lots, custody, laboratory results, costs, environmental measurements, or transfer timing. Photos may support visible batch distribution, explant/browning/root appearance, and contamination-like categories, but cannot identify bacteria, fungi, yeast, viruses, viroids, or prove pathogen freedom. Leave unknowns blank. Use canonical values only when supported: workflowLane mother_bank, production, cold_storage, cryopreservation; stage stock_selection, initiation, multiplication, rooting, acclimation, storage, recovery; inspectionStatus not_inspected, inspected_no_visible_issue, visible_issue_present, mixed; pathogenTestStatus not_tested, pending, clear, detected, inconclusive; geneticStabilityStatus not_reviewed, reviewed_no_observed_off_types, concern, lab_reviewed; cryopreservationValidationStatus not_applicable, planned, validated, failed. vesselTraceability may be a JSON-array string with vesselId, rack, shelf, status, parentVesselId, and notes.`,
        normalizeFieldValue: ({ value }) => normalizeAiField(value),
        buildPayloadMetadata: ({ response, parsed, evidenceAssetIds }) => {
          const evidenceUsed = Array.isArray(response.evidenceUsed)
            ? response.evidenceUsed
            : [];
          const limitations = Array.isArray(response.limitations)
            ? response.limitations
            : [];
          const reportsNoVision = limitations.some((item) =>
            /text[- ]only|cannot (inspect|analyze|view)|image pixels? (were )?not|visual analysis (was )?not/i.test(
              String(item)
            )
          );
          const photosAnalyzed = Number(response.mediaAnalysis?.photosAnalyzed || 0);
          return {
            imageAnalysis: {
              requested: evidenceAssetIds.length > 0,
              performed:
                evidenceAssetIds.length > 0 &&
                evidenceUsed.length > 0 &&
                photosAnalyzed > 0 &&
                !reportsNoVision &&
                String(parsed.imageAnalysisPerformed || "").toLowerCase() === "true",
              photoCount: evidenceAssetIds.length,
              photosAnalyzed,
              provider: response.provider || "assistant",
              providerLabel: response.providerLabel || "AI tissue culture photo review",
              confidence: String(parsed.visualConfidence || "low").toLowerCase(),
              quality: String(parsed.imageQuality || "limited").toLowerCase(),
              evidenceUsed,
              limitations
            },
            assistantMethodIds: response.methodIds || [],
            assistantSourceIds: response.sourceIds || [],
            assistantCitations: response.citations || []
          };
        }
      }}
      fields={[
        {
          key: "projectName",
          label: "Project name",
          defaultValue: "",
          placeholder: "e.g. Mother-bank cleanup 2026",
          required: true,
          section: "Batch identity"
        },
        {
          key: "batchNumber",
          label: "Batch number",
          defaultValue: "",
          placeholder: "Owner-recorded batch or lot ID",
          required: true,
          section: "Batch identity"
        },
        {
          key: "cropType",
          label: "Crop / species (if established)",
          defaultValue: "",
          section: "Batch identity"
        },
        {
          key: "geneticsId",
          label: "Genetics / source-line ID",
          defaultValue: "",
          section: "Batch identity"
        },
        {
          key: "motherBankId",
          label: "Mother-bank line ID",
          defaultValue: "",
          section: "Batch identity"
        },
        {
          key: "sourceBatchId",
          label: "Source batch ID",
          defaultValue: "",
          section: "Batch identity"
        },
        {
          key: "parentTransferId",
          label: "Parent transfer ID",
          defaultValue: "",
          section: "Batch identity"
        },
        {
          key: "workflowLane",
          label: "Workflow lane",
          defaultValue: "",
          required: true,
          section: "Workflow decision",
          helpText:
            "Keep ordinary cold storage separate from validated cryopreservation.",
          options: [
            {
              value: "mother_bank",
              label: "Mother bank",
              description: "Source-line maintenance and release evidence."
            },
            {
              value: "production",
              label: "Production line",
              description: "Active multiplication, rooting, and transfer work."
            },
            {
              value: "cold_storage",
              label: "Cold storage",
              description: "Reduced-growth storage with retrieval and recovery tracking."
            },
            {
              value: "cryopreservation",
              label: "Cryopreservation",
              description:
                "Only a validated freeze, storage, retrieval, and recovery process."
            }
          ]
        },
        {
          key: "stage",
          label: "Stage",
          defaultValue: "",
          required: true,
          section: "Workflow decision",
          options: [
            { value: "stock_selection", label: "Stock / donor selection (Stage 0)" },
            { value: "initiation", label: "Initiation (Stage 1)" },
            { value: "multiplication", label: "Multiplication (Stage 2)" },
            { value: "rooting", label: "Rooting (Stage 3)" },
            { value: "acclimation", label: "Acclimation (Stage 4)" },
            { value: "storage", label: "Storage" },
            { value: "recovery", label: "Recovery after storage" }
          ]
        },
        {
          key: "inspectionStatus",
          label: "Direct inspection status",
          defaultValue: "",
          required: true,
          section: "Direct batch inspection",
          options: [
            {
              value: "not_inspected",
              label: "Not inspected",
              description: "Use only when every visible count is zero."
            },
            { value: "inspected_no_visible_issue", label: "Inspected, no visible issue" },
            { value: "visible_issue_present", label: "Visible issue present" },
            { value: "mixed", label: "Mixed visible condition" }
          ]
        },
        {
          key: "observedAt",
          label: "Observation date/time",
          defaultValue: "",
          placeholder: "YYYY-MM-DD HH:MM and timezone",
          required: true,
          section: "Direct batch inspection"
        },
        {
          key: "observationSource",
          label: "Observation source",
          defaultValue: "",
          placeholder: "Person, count method, and bench/rack",
          required: true,
          section: "Direct batch inspection"
        },
        {
          key: "vessels",
          label: "Total vessels",
          defaultValue: "",
          placeholder: "Count every vessel in this batch snapshot",
          keyboardType: "numeric",
          required: true,
          section: "Direct batch inspection"
        },
        {
          key: "contaminatedVessels",
          label: "Contaminated vessels",
          defaultValue: "",
          placeholder: "Use 0 only after counting",
          keyboardType: "numeric",
          required: true,
          section: "Direct batch inspection"
        },
        {
          key: "fungalLikeVessels",
          label: "Fungal-like appearance vessels",
          defaultValue: "",
          helpText: "Appearance category only; this does not identify an organism.",
          keyboardType: "numeric",
          required: true,
          section: "Direct batch inspection"
        },
        {
          key: "browningVessels",
          label: "Browning / oxidized vessels",
          defaultValue: "",
          keyboardType: "numeric",
          required: true,
          section: "Direct batch inspection"
        },
        {
          key: "stalledVessels",
          label: "Stalled vessels",
          defaultValue: "",
          keyboardType: "numeric",
          required: true,
          section: "Direct batch inspection"
        },
        {
          key: "rootedVessels",
          label: "Rooted vessels",
          defaultValue: "",
          helpText: "Count directly visible roots only.",
          keyboardType: "numeric",
          required: true,
          section: "Direct batch inspection"
        },
        {
          key: "visiblePatterns",
          label: "Visible patterns and batch distribution",
          defaultValue: "",
          placeholder:
            "Where, when, and how the pattern appears; do not name a microorganism",
          multiline: true,
          section: "Direct batch inspection"
        },
        {
          key: "transferCycle",
          label: "Transfer cycle",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Transfer and custody"
        },
        {
          key: "maxProductionTransfers",
          label: "Owner-recorded maximum production transfers",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Transfer and custody"
        },
        {
          key: "transfersDueDays",
          label: "Next transfer review due in days",
          defaultValue: "",
          keyboardType: "numeric",
          helpText: "Enter the owner-recorded schedule; no deadline is assumed.",
          section: "Transfer and custody"
        },
        {
          key: "technicianOwner",
          label: "Technician / owner",
          defaultValue: "",
          section: "Transfer and custody"
        },
        {
          key: "lastAction",
          label: "Last handling action",
          defaultValue: "",
          section: "Transfer and custody"
        },
        {
          key: "lastActionBy",
          label: "Last action by",
          defaultValue: "",
          section: "Transfer and custody"
        },
        {
          key: "lastActionAt",
          label: "Last action date/time",
          defaultValue: "",
          section: "Transfer and custody"
        },
        {
          key: "SOPVersion",
          label: "SOP version",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "mediaRecipe",
          label: "Media recipe / formulation record",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "mediaType",
          label: "Media type",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "mediaLotId",
          label: "Media preparation / lot ID",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "vesselType",
          label: "Vessel type",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "explantType",
          label: "Explant type",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "explantSize",
          label: "Recorded explant size",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "sterilizationRunId",
          label: "Sterilization run ID",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "sterilizationMethod",
          label: "Sterilization method / protocol",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "sterilizationOutcome",
          label: "Sterilization control result",
          defaultValue: "",
          section: "SOP, media, and sterilization"
        },
        {
          key: "incubationRoomId",
          label: "Incubation room ID",
          defaultValue: "",
          section: "Measured environment and location"
        },
        {
          key: "telemetrySourceIds",
          label: "Environment device / source IDs",
          defaultValue: "",
          section: "Measured environment and location"
        },
        {
          key: "measuredIncubationTempC",
          label: "Measured incubation temperature (C)",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Measured environment and location"
        },
        {
          key: "measuredPhotoperiodHours",
          label: "Measured photoperiod (hours)",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Measured environment and location"
        },
        {
          key: "inventoryLocation",
          label: "Inventory location / rack / shelf",
          defaultValue: "",
          section: "Measured environment and location"
        },
        {
          key: "vesselTraceability",
          label: "Vessel traceability rows",
          defaultValue: "",
          placeholder:
            "One line each: vessel ID, rack, shelf, status, parent vessel ID, notes",
          multiline: true,
          helpText: "You may also paste a JSON array with those fields.",
          section: "Measured environment and location"
        },
        {
          key: "pathogenTestStatus",
          label: "Pathogen / indexing status",
          defaultValue: "",
          section: "Quality control and release",
          options: [
            { value: "not_tested", label: "Not tested" },
            { value: "pending", label: "Pending" },
            { value: "clear", label: "Clear on linked test" },
            { value: "detected", label: "Detected" },
            { value: "inconclusive", label: "Inconclusive" }
          ]
        },
        {
          key: "pathogenReportId",
          label: "Linked pathogen / indexing report ID",
          defaultValue: "",
          section: "Quality control and release"
        },
        {
          key: "geneticStabilityStatus",
          label: "Genetic stability / off-type review",
          defaultValue: "",
          section: "Quality control and release",
          options: [
            { value: "not_reviewed", label: "Not reviewed" },
            {
              value: "reviewed_no_observed_off_types",
              label: "Reviewed, no observed off-types"
            },
            { value: "concern", label: "Concern recorded" },
            { value: "lab_reviewed", label: "Laboratory reviewed" }
          ]
        },
        {
          key: "offTypeObservations",
          label: "Off-type / stability observations",
          defaultValue: "",
          multiline: true,
          section: "Quality control and release"
        },
        {
          key: "contaminationDisposition",
          label: "Isolation, cull, or disposal outcome",
          defaultValue: "",
          multiline: true,
          section: "Quality control and release"
        },
        {
          key: "acclimationCohortId",
          label: "Acclimation cohort ID",
          defaultValue: "",
          section: "Outcome comparison"
        },
        {
          key: "acclimatedPlants",
          label: "Plants entering acclimation",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Outcome comparison"
        },
        {
          key: "acclimationSurvived",
          label: "Acclimation survivors",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Outcome comparison"
        },
        {
          key: "multiplicationRate",
          label: "Recorded multiplication rate per transfer",
          defaultValue: "",
          keyboardType: "numeric",
          helpText:
            "Enter a measured rate from this batch or linked protocol evidence; GrowPath will not assume one.",
          section: "Outcome comparison"
        },
        {
          key: "protocolId",
          label: "Protocol ID",
          defaultValue: "",
          section: "Outcome comparison"
        },
        {
          key: "protocolVersion",
          label: "Protocol version",
          defaultValue: "",
          section: "Outcome comparison"
        },
        {
          key: "initialProtocolUnits",
          label: "Initial protocol cohort units",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Outcome comparison"
        },
        {
          key: "survivingProtocolUnits",
          label: "Surviving / viable cohort units",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Outcome comparison"
        },
        {
          key: "regrowingProtocolUnits",
          label: "Regrowing cohort units",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Outcome comparison"
        },
        {
          key: "protocolOutcomeNotes",
          label: "Survival, regrowth, labor, and comparison notes",
          defaultValue: "",
          multiline: true,
          section: "Outcome comparison"
        },
        {
          key: "mediaCost",
          label: "Media cost",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Cost per survivor"
        },
        {
          key: "vesselSupplyCost",
          label: "Vessel / supply cost",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Cost per survivor"
        },
        {
          key: "laborCost",
          label: "Labor cost",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Cost per survivor"
        },
        {
          key: "coldStorageRoomId",
          label: "Cold-storage room / unit ID",
          defaultValue: "",
          section: "Storage and recovery"
        },
        {
          key: "coldStorageTempC",
          label: "Measured cold-storage temperature (C)",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Storage and recovery"
        },
        {
          key: "coldStorageStartDate",
          label: "Cold-storage entry date",
          defaultValue: "",
          section: "Storage and recovery"
        },
        {
          key: "plannedRetrievalDate",
          label: "Planned retrieval date",
          defaultValue: "",
          section: "Storage and recovery"
        },
        {
          key: "recoveryCheckDays",
          label: "Recovery check after retrieval (days)",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Storage and recovery"
        },
        {
          key: "cryopreservationValidationStatus",
          label: "Cryopreservation validation status",
          defaultValue: "",
          section: "Storage and recovery",
          options: [
            { value: "not_applicable", label: "Not applicable" },
            { value: "planned", label: "Planned, not validated" },
            { value: "validated", label: "Validated with recovery evidence" },
            { value: "failed", label: "Validation failed" }
          ]
        },
        {
          key: "storageNotes",
          label: "Storage, retrieval, recovery, and location notes",
          defaultValue: "",
          multiline: true,
          section: "Storage and recovery"
        }
      ]}
      validateValues={validateTissueCultureValues}
      buildPayload={(
        values,
        { growId, facilityId, commercialAccountId, plantContext }
      ) => ({
        growId,
        facilityId: facilityId || undefined,
        commercialAccountId: commercialAccountId || undefined,
        ...plantContext.toolRunContext,
        projectName: values.projectName,
        batchNumber: values.batchNumber,
        cropType: values.cropType || undefined,
        geneticsId: values.geneticsId || undefined,
        motherBankId: values.motherBankId || undefined,
        sourceBatchId: values.sourceBatchId || undefined,
        parentTransferId: values.parentTransferId || undefined,
        workflowLane: values.workflowLane,
        stage: values.stage,
        inspectionStatus: values.inspectionStatus,
        observedAt: values.observedAt,
        observationSource: values.observationSource,
        vessels: values.vessels,
        contaminatedVessels: values.contaminatedVessels,
        fungalLikeVessels: values.fungalLikeVessels,
        browningVessels: values.browningVessels,
        stalledVessels: values.stalledVessels,
        rootedVessels: values.rootedVessels,
        visiblePatterns: values.visiblePatterns || undefined,
        transferCycle: values.transferCycle || undefined,
        maxProductionTransfers: values.maxProductionTransfers || undefined,
        transfersDueDays: values.transfersDueDays || undefined,
        technicianOwner: values.technicianOwner || undefined,
        lastAction: values.lastAction || undefined,
        lastActionBy: values.lastActionBy || undefined,
        lastActionAt: values.lastActionAt || undefined,
        SOPVersion: values.SOPVersion || undefined,
        mediaRecipe: values.mediaRecipe || undefined,
        mediaType: values.mediaType || undefined,
        mediaLotId: values.mediaLotId || undefined,
        vesselType: values.vesselType || undefined,
        explantType: values.explantType || undefined,
        explantSize: values.explantSize || undefined,
        sterilizationRunId: values.sterilizationRunId || undefined,
        sterilizationMethod: values.sterilizationMethod || undefined,
        sterilizationOutcome: values.sterilizationOutcome || undefined,
        incubationRoomId: values.incubationRoomId || undefined,
        telemetrySourceIds: values.telemetrySourceIds || undefined,
        measuredIncubationTempC: values.measuredIncubationTempC || undefined,
        measuredPhotoperiodHours: values.measuredPhotoperiodHours || undefined,
        inventoryLocation: values.inventoryLocation || undefined,
        vesselTraceability: parseTraceabilityRows(values.vesselTraceability),
        pathogenTestStatus: values.pathogenTestStatus || undefined,
        pathogenReportId: values.pathogenReportId || undefined,
        geneticStabilityStatus: values.geneticStabilityStatus || undefined,
        offTypeObservations: values.offTypeObservations || undefined,
        contaminationDisposition: values.contaminationDisposition || undefined,
        acclimationCohortId: values.acclimationCohortId || undefined,
        acclimatedPlants: values.acclimatedPlants || undefined,
        acclimationSurvived: values.acclimationSurvived || undefined,
        multiplicationRate: values.multiplicationRate || undefined,
        protocolId: values.protocolId || undefined,
        protocolVersion: values.protocolVersion || undefined,
        initialProtocolUnits: values.initialProtocolUnits || undefined,
        survivingProtocolUnits: values.survivingProtocolUnits || undefined,
        regrowingProtocolUnits: values.regrowingProtocolUnits || undefined,
        protocolOutcomeNotes: values.protocolOutcomeNotes || undefined,
        mediaCost: values.mediaCost || undefined,
        vesselSupplyCost: values.vesselSupplyCost || undefined,
        laborCost: values.laborCost || undefined,
        coldStorageRoomId: values.coldStorageRoomId || undefined,
        coldStorageTempC: values.coldStorageTempC || undefined,
        coldStorageStartDate: values.coldStorageStartDate || undefined,
        plannedRetrievalDate: values.plannedRetrievalDate || undefined,
        recoveryCheckDays: values.recoveryCheckDays || undefined,
        cryopreservationValidationStatus:
          values.cryopreservationValidationStatus || undefined,
        storageNotes: values.storageNotes || undefined,
        evidenceAssetIds: evidencePayload.evidenceAssetIds,
        mediaEvidence: evidencePayload.media
      })}
      buildMetrics={(outputs) => [
        { key: "assessment", label: "Assessment", value: outputs.assessmentStatus },
        { key: "release", label: "Release review", value: outputs.releaseReview?.status },
        { key: "lane", label: "Workflow lane", value: outputs.workflowLane },
        { key: "stage", label: "Stage", value: outputs.stage },
        {
          key: "contamination",
          label: "Contaminated vessels",
          value: `${outputs.vesselStatus?.contaminated ?? "-"} / ${
            outputs.vesselStatus?.total ?? "-"
          } (${outputs.vesselStatus?.contaminationPercent ?? "-"}%)`
        },
        {
          key: "fungal-like",
          label: "Fungal-like appearance",
          value: `${outputs.vesselStatus?.fungalLikeAppearance ?? "-"} / ${
            outputs.vesselStatus?.total ?? "-"
          } (${outputs.vesselStatus?.fungalLikeAppearancePercent ?? "-"}%)`
        },
        { key: "rooting", label: "Rooted vessels %", value: outputs.rootingRate },
        {
          key: "traceability",
          label: "Missing traceability items",
          value: outputs.missingInformation?.length || 0
        },
        {
          key: "protocol-survival",
          label: "Protocol survival %",
          value: outputs.protocolSurvivalRate ?? "Not recorded"
        },
        {
          key: "acclimation-survival",
          label: "Acclimation survival %",
          value: outputs.acclimationRate ?? "Not recorded"
        },
        {
          key: "cost",
          label: "Total recorded cost",
          value: outputs.costTracking?.totalProjectCost ?? "Not recorded"
        },
        {
          key: "cost-per-survivor",
          label: "Cost / surviving plant",
          value: outputs.costPerSurvivingPlant ?? "Not recorded"
        }
      ]}
      buildNotices={(outputs) => {
        const failureModes = Array.isArray(outputs.diagnosisRecord?.likelyFailureModes)
          ? outputs.diagnosisRecord.likelyFailureModes
          : [];
        const releaseBlockers = Array.isArray(outputs.releaseReview?.blockers)
          ? outputs.releaseReview.blockers
          : [];
        const missing = Array.isArray(outputs.missingInformation)
          ? outputs.missingInformation
          : [];
        const mediaLimitations = Array.isArray(outputs.mediaAnalysis?.limitations)
          ? outputs.mediaAnalysis.limitations
          : [];
        return [
          ...failureModes.map((item: any, index: number) => ({
            key: `tc-failure-${item?.key || index}`,
            severity: item?.severity === "high" ? ("high" as const) : ("medium" as const),
            message: [
              item?.issue || String(item),
              item?.evidence ? `Evidence: ${item.evidence}` : "",
              Array.isArray(item?.nextChecks) && item.nextChecks.length
                ? `Next checks: ${item.nextChecks.join(" ")}`
                : ""
            ]
              .filter(Boolean)
              .join("\n")
          })),
          ...releaseBlockers.map((message: string, index: number) => ({
            key: `tc-release-blocker-${index}`,
            severity: "high" as const,
            message: `Release blocker: ${message}.`
          })),
          ...(missing.length
            ? [
                {
                  key: "tc-missing-evidence",
                  severity: "medium" as const,
                  message: `Still needed for a complete traceable review: ${missing.join(", ")}.`
                }
              ]
            : []),
          ...(outputs.mediaAnalysis?.performed
            ? [
                {
                  key: "tc-media-provenance",
                  severity: "info" as const,
                  message: `${
                    outputs.mediaAnalysis.providerLabel ||
                    "AI tissue culture photo review"
                  } inspected ${outputs.mediaAnalysis.photosAnalyzed || 0} photo(s). Quality: ${
                    outputs.mediaAnalysis.quality || "not provided"
                  }.`
                }
              ]
            : []),
          ...mediaLimitations.slice(0, 3).map((message: string, index: number) => ({
            key: `tc-media-limit-${index}`,
            severity: "info" as const,
            message
          })),
          ...(Array.isArray(outputs.storageReminders)
            ? outputs.storageReminders.map((message: string, index: number) => ({
                key: `tc-storage-${index}`,
                severity: "info" as const,
                message
              }))
            : []),
          ...(Array.isArray(outputs.limitations)
            ? outputs.limitations.map((message: string, index: number) => ({
                key: `tc-limit-${index}`,
                severity: "info" as const,
                message
              }))
            : [])
        ];
      }}
      defaultLogTitle={(outputs) =>
        `${outputs.projectName || "Tissue culture"} batch review`
      }
      defaultTask={(outputs) => {
        const followUp = outputs.nextTransferTasks?.[0];
        return {
          title: followUp?.title || "Set tissue-culture transfer review date",
          priority: followUp?.priority || "medium",
          dueDate: optionalDueDate(followUp?.dueInDays),
          ...tissueCultureCalendarMetadata("tc_transfer_review"),
          description:
            "Recount the batch and review vessel IDs, SOP, lots, inspection, quality-control, and release evidence before transfer."
        };
      }}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-tissue-culture-workflow-tasks",
          label: "Create TC Evidence Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created tissue-culture evidence tasks.",
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

const styles = StyleSheet.create({
  evidenceSection: { gap: 12 },
  guidanceCard: {
    gap: 7,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    backgroundColor: "#F0FDF4",
    padding: 14
  },
  guidanceTitle: { color: "#14532D", fontSize: 16, fontWeight: "800" },
  guidanceText: { color: "#334155", fontSize: 13, lineHeight: 19 },
  guidanceWarning: { color: "#92400E", fontSize: 13, fontWeight: "700", lineHeight: 19 }
});
