import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

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
  return (
    <BackendCalculatorToolScreen
      tool="genetics-inventory"
      toolKey="genetics-inventory"
      title="Genetics Inventory"
      subtitle="Record cultivar, parentage, feeding response, stress notes, flower timing, and keeper signals."
      fields={[
        { key: "cultivar", label: "Cultivar", defaultValue: "Unnamed cultivar" },
        { key: "breeder", label: "Breeder / source", defaultValue: "" },
        { key: "parentage", label: "Parentage", defaultValue: "" },
        { key: "seedType", label: "Seed type", defaultValue: "regular" },
        { key: "materialType", label: "Material type", defaultValue: "seed" },
        { key: "feedingResponse", label: "Feeding response", defaultValue: "unknown" },
        { key: "rootingBehavior", label: "Rooting behavior", defaultValue: "unknown" },
        {
          key: "flowerTime",
          label: "Flower time days",
          defaultValue: "63",
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
        }
      ]}
      buildPayload={(values, { growId }) => ({ growId, ...values })}
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
