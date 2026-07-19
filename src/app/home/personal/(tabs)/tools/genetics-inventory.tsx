import React, { useState } from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import type { EvidenceAsset } from "@/types/evidence";

function geneticsTaskPlan(outputs: Record<string, any>) {
  const cultivar = String(outputs.cultivar || "cultivar");
  const recommendations = Array.isArray(outputs.preservationRecommendations)
    ? outputs.preservationRecommendations
    : [];
  const keeperSignals = Array.isArray(outputs.keeperSignals)
    ? outputs.keeperSignals.join(", ")
    : "";
  const calendarMetadata = {
    allDay: true,
    calendarType: "genetics_preservation_followup",
    sourceStage: "genetics_record_review",
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -24 * 60 }]
    }
  };

  return [
    {
      title: `Verify genetics record for ${cultivar}`,
      priority: "medium" as const,
      dueDate: tomorrow(1),
      ...calendarMetadata,
      description:
        "Confirm breeder/source, parentage, material type, flower timing, and any missing provenance before relying on this record."
    },
    {
      title: `Plan preservation for ${cultivar}`,
      priority: recommendations.length ? ("high" as const) : ("medium" as const),
      dueDate: tomorrow(3),
      ...calendarMetadata,
      sourceStage: "preservation_planning",
      description: [
        recommendations.length
          ? `Preservation notes: ${recommendations.slice(0, 3).join("; ")}`
          : "Decide whether this genetics record needs clone, mother, seed, tissue culture, or archive follow-up.",
        keeperSignals ? `Keeper signals: ${keeperSignals}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    },
    {
      title: `Link ${cultivar} to grow, pheno, or clone records`,
      priority: "medium" as const,
      dueDate: tomorrow(7),
      ...calendarMetadata,
      sourceStage: "genetics_record_linking",
      description:
        "Attach this genetics record to active plants, clone rooting notes, pheno hunt scores, mother stock, or tissue culture records."
    }
  ];
}

export default function GeneticsInventoryToolRoute() {
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  return (
    <BackendCalculatorToolScreen
      tool="genetics-inventory"
      toolKey="genetics-inventory"
      title="Genetics Inventory"
      subtitle="Record cultivar, parentage, feeding response, stress notes, flower timing, and keeper signals."
      formHeader={({ growId }) => (
        <MediaEvidencePicker
          maxPhotos={10}
          allowVideo
          maxVideoSeconds={30}
          purpose="pheno"
          sourceContext={{ growId: growId || undefined }}
          value={evidenceAssets}
          onChange={setEvidenceAssets}
        />
      )}
      aiPrefill={{
        buttonLabel: "Fill genetics record from grow",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        buildMessage: () =>
          `Prefill this Genetics Inventory record from the selected grow and plant, seed/package or source notes, clone history, pheno records, stress/recovery, feeding response, flower timeline, harvest reviews, and attached documentation media. Return JSON only with exactly these string keys: cultivar, breeder, parentage, seedType, materialType, feedingResponse, rootingBehavior, flowerTime, stressNotes, aromaFlavorNotes, provenanceNotes. Breeder, cultivar, parentage, seed type, and material type must come from explicit saved provenance or readable documentation; never infer them from plant appearance. Media can support visible phenotype documentation but not lineage. Leave unknowns blank. In provenanceNotes distinguish verified facts, user-entered claims, AI summaries, conflicts, and missing package/source documentation.`
      }}
      fields={[
        { key: "cultivar", label: "Cultivar", defaultValue: "" },
        { key: "breeder", label: "Breeder / source", defaultValue: "" },
        { key: "parentage", label: "Parentage", defaultValue: "" },
        { key: "seedType", label: "Seed type", defaultValue: "" },
        { key: "materialType", label: "Material type", defaultValue: "" },
        { key: "feedingResponse", label: "Feeding response", defaultValue: "unknown" },
        { key: "rootingBehavior", label: "Rooting behavior", defaultValue: "unknown" },
        {
          key: "flowerTime",
          label: "Flower time days",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "stressNotes",
          label: "Stress notes, comma-separated",
          defaultValue: "",
          multiline: true
        },
        {
          key: "aromaFlavorNotes",
          label: "Aroma/flavor notes, comma-separated",
          defaultValue: "",
          multiline: true
        },
        {
          key: "provenanceNotes",
          label: "Provenance and verification notes (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        ...values,
        evidenceAssetIds: providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        mediaEvidence: providerEvidencePayload(evidenceAssets).media
      })}
      buildMetrics={(outputs) => [
        { key: "cultivar", label: "Cultivar", value: outputs.cultivar },
        { key: "breeder", label: "Breeder", value: outputs.breeder },
        { key: "flower", label: "Flower time", value: outputs.flowerTime },
        { key: "material", label: "Material", value: outputs.materialType },
        {
          key: "tags",
          label: "Tags",
          value: outputs.tags?.length || 0
        },
        {
          key: "signals",
          label: "Keeper signals",
          value: outputs.keeperSignals?.length || 0
        }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.parentageWarnings)
          ? outputs.parentageWarnings.map((message: string, index: number) => ({
              key: `parentage-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(Array.isArray(outputs.preservationRecommendations)
          ? outputs.preservationRecommendations
              .slice(0, 1)
              .map((message: string, index: number) => ({
                key: `preservation-${index}`,
                severity: "info" as const,
                message
              }))
          : [])
      ]}
      defaultLogTitle={(outputs) => `Genetics record: ${outputs.cultivar || "cultivar"}`}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-genetics-follow-up-tasks",
          label: "Create Genetics Follow-up Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created genetics follow-up tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "genetics-inventory",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: geneticsTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
