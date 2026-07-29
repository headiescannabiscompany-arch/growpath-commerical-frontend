import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { createGrowpathModuleRecord } from "@/api/growpathModules";

function parsePlants(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split("\n")
      .map((line, index) => {
        const [
          label,
          vigor,
          aroma,
          resin,
          stressResistance,
          yieldScore,
          sexWeek,
          cloneRootingDays,
          recoveryHours,
          morphology,
          pestResistance,
          feedingResponse,
          flowerStructure,
          taste,
          effect,
          hashValue,
          clonePerformance,
          tissueCultureSuitability,
          breedingValue,
          finalProduct,
          intersexSigns,
          hermObservationCount,
          sexObservationCount,
          notes
        ] = line.split(",").map((part) => part.trim());
        if (!label) return null;
        return {
          id: `plant_${index + 1}`,
          label,
          vigor,
          aroma,
          resin,
          stressResistance,
          yieldScore,
          sexWeek,
          cloneRootingDays,
          recoveryHours,
          morphology,
          pestResistance,
          feedingResponse,
          flowerStructure,
          taste,
          effect,
          hashValue,
          clonePerformance,
          tissueCultureSuitability,
          breedingValue,
          finalProduct,
          intersexSigns,
          hermObservationCount,
          sexObservationCount,
          notes
        };
      })
      .filter(Boolean);
  }
}

function phenoLabel(item: any, fallback: string) {
  return String(item?.label || item?.plantLabel || item?.plantId || item?.id || fallback);
}

function phenoHuntTaskPlan(outputs: Record<string, any>) {
  const keepers = Array.isArray(outputs.keeperRecommendations)
    ? outputs.keeperRecommendations
    : [];
  const retests = Array.isArray(outputs.retestRecommendations)
    ? outputs.retestRecommendations
    : [];
  const topPlant = outputs.comparisonMatrix?.[0];

  const keeperTasks = keepers.slice(0, 3).map((item: any, index: number) => ({
    title: `Preserve keeper candidate ${phenoLabel(item, `#${index + 1}`)}`,
    priority: "high" as const,
    dueDate: tomorrow(1),
    description:
      item?.reason ||
      "Take clone/mother notes, preserve the candidate, and record why it remains in keeper contention."
  }));

  const retestTasks = retests.slice(0, 3).map((item: any, index: number) => ({
    title: `Retest pheno ${phenoLabel(item, `#${index + 1}`)}`,
    priority: "medium" as const,
    dueDate: tomorrow(3),
    description:
      item?.reason ||
      "Recheck stability, stress response, flower quality, clone performance, and keeper/reject reasoning before final selection."
  }));

  return [
    ...keeperTasks,
    ...retestTasks,
    {
      title: "Record pheno hunt decision notes",
      priority: "medium" as const,
      dueDate: tomorrow(7),
      description: [
        topPlant ? `Top scored plant: ${phenoLabel(topPlant, "top plant")}.` : "",
        "Update keeper/watch/reject reasoning with smoke, hash, taste, structure, and stress notes."
      ]
        .filter(Boolean)
        .join("\n")
    }
  ];
}

export default function PhenoHuntToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="pheno-hunt"
      toolKey="pheno-hunt"
      title="Pheno Hunting"
      subtitle="Score pheno plants, compare keeper candidates, retest decisions, and breeding notes."
      aiPrefill={{
        buttonLabel: "Fill pheno hunt from grow",
        buildMessage: () =>
          `Prefill this cannabis Pheno Hunting workflow from the selected grow's saved plants, logs, photos, clone results, diagnoses, stress/recovery records, harvest, dry/cure, aroma, taste, effect, yield, hash, and propagation notes. Return JSON only with exactly these keys: {"projectName":"string","plants":[{"id":"string","plantId":"string","label":"string","vigor":0,"morphology":0,"stressResistance":0,"pestResistance":0,"feedingResponse":0,"aroma":0,"taste":0,"resin":0,"flowerStructure":0,"effect":0,"yieldScore":0,"hashValue":0,"clonePerformance":0,"tissueCultureSuitability":0,"breedingValue":0,"finalProduct":0,"sexWeek":0,"cloneRootingDays":0,"recoveryHours":0,"intersexSigns":"string","hermObservationCount":0,"sexObservationCount":0,"notes":"string","evidenceAssetIds":["string"]}],"additionalInformation":"string"}. Use only supported evidence; leave unknown values blank instead of inventing them. Scores use 0-10 and must be supported by records. For cannabis, count explicit herm/intersex outcomes and total stability observations from grow logs because the observed herm rate is a strong keeper-status indicator. Record sex-expression timing separately; never infer a herm from timing alone. Keep early observations separate from final-product evidence. Put missing evidence, uncertainties, and optional context in additionalInformation.`
      }}
      fields={[
        { key: "projectName", label: "Project name", defaultValue: "Pheno hunt" },
        {
          key: "plants",
          label:
            "Cannabis plants as JSON or lines: label, vigor, aroma, resin, stress, yield, sex week, clone root days, recovery hours, morphology, pest resistance, feeding response, flower structure, taste, effect, hash value, clone performance, TC suitability, breeding value, final product, intersex signs, herm observations, total stability observations, notes",
          defaultValue: "",
          multiline: true
        },
        {
          key: "additionalInformation",
          label: "Additional information (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(
        values,
        { growId, facilityId, commercialAccountId, plantContext }
      ) => ({
        growId,
        facilityId: facilityId || undefined,
        commercialAccountId: commercialAccountId || undefined,
        ...plantContext.toolRunContext,
        cropType: "cannabis",
        cannabisContext: true,
        projectName: values.projectName,
        plants: parsePlants(values.plants),
        additionalInformation: values.additionalInformation || undefined
      })}
      buildMetrics={(outputs) => [
        { key: "project", label: "Project", value: outputs.projectName },
        { key: "top", label: "Top plant", value: outputs.comparisonMatrix?.[0]?.label },
        { key: "score", label: "Top score", value: outputs.comparisonMatrix?.[0]?.score },
        {
          key: "category",
          label: "Top category",
          value: outputs.comparisonMatrix?.[0]?.keeperCategory
        },
        {
          key: "keepers",
          label: "Keeper candidates",
          value: outputs.keeperRecommendations?.length || 0
        },
        {
          key: "retests",
          label: "Retests",
          value: outputs.retestRecommendations?.length || 0
        },
        {
          key: "evidence-completeness",
          label: "Top evidence completeness",
          value:
            outputs.comparisonMatrix?.[0]?.completeness != null
              ? `${outputs.comparisonMatrix[0].completeness}%`
              : "-"
        },
        {
          key: "intersex-rate",
          label: "Observed intersex rate",
          value:
            outputs.stabilitySummary?.observedIntersexRate != null
              ? `${outputs.stabilitySummary.observedIntersexRate}%`
              : "-",
          detail: `${outputs.stabilitySummary?.hermObservations || 0} herm/intersex observations across ${outputs.stabilitySummary?.stabilityObservations || 0} logged stability observations; sex timing recorded for ${outputs.stabilitySummary?.sexTimingRecorded || 0} plants.`
        }
      ]}
      buildNotices={(outputs) => [
        ...(outputs.retestRecommendations?.length
          ? [
              {
                key: "retest",
                severity: "medium" as const,
                message:
                  "Some plants are marked for retest. Confirm with flower, smoke/taste, clone performance, and stability notes before final decisions."
              }
            ]
          : []),
        ...(outputs.comparisonMatrix?.some(
          (plant: any) =>
            Array.isArray(plant.tags) && plant.tags.includes("stability_concern")
        )
          ? [
              {
                key: "stability",
                severity: "high" as const,
                message:
                  "At least one pheno has a stability/intersex concern. Do not mark it as an automatic keeper from score alone."
              }
            ]
          : []),
        ...(Array.isArray(outputs.limitations)
          ? outputs.limitations.map((message: string, index: number) => ({
              key: `limitation-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(outputs.stabilitySummary?.interpretation
          ? [
              {
                key: "sex-timing-stability",
                severity: "info" as const,
                message: outputs.stabilitySummary.interpretation
              }
            ]
          : [])
      ]}
      defaultLogTitle={(outputs) => `Pheno hunt: ${outputs.projectName || "project"}`}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-pheno-hunt-tasks",
          label: "Create Pheno Decision Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId || phenoHuntTaskPlan(outputs).length === 0,
          successMessage: "Created pheno decision tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "pheno-hunt",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: phenoHuntTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        },
        {
          key: "create-keeper-records",
          label: "Create Keeper Genetics Records",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId || !outputs.keeperRecommendations?.length,
          successMessage: "Created linked keeper genetics records.",
          onPress: async () => {
            await Promise.all(
              outputs.keeperRecommendations.map((keeper: any) =>
                createGrowpathModuleRecord({
                  recordType: "genetics_note",
                  title: `Keeper candidate: ${phenoLabel(keeper, "pheno")}`,
                  status: "candidate",
                  growId,
                  plantId: keeper.plantId || keeper.id || null,
                  phenoPlantId: keeper.id || null,
                  facilityId: payload.facilityId || null,
                  linkedToolRunId: toolRun?.id || toolRun?._id || null,
                  inputs: { sourceProject: payload.projectName },
                  outputs: keeper,
                  payload: {
                    selectionLanes: keeper.decisionLanes || {},
                    commercialCandidate: Boolean(
                      keeper.decisionLanes?.commercialCandidate
                    ),
                    cloneCandidate: Boolean(keeper.decisionLanes?.cloneKeeper),
                    motherCandidate: Boolean(keeper.decisionLanes?.motherKeeper),
                    tissueCultureCandidate: Boolean(
                      outputs.comparisonMatrix?.find((row: any) => row.id === keeper.id)
                        ?.traits?.tissueCultureSuitability >= 7
                    )
                  },
                  recommendations: [
                    "Preserve source material before final selection.",
                    "Confirm final product, propagation, stability, and the intended keeper lane."
                  ],
                  tags: [
                    "pheno_keeper_candidate",
                    ...Object.entries(keeper.decisionLanes || {})
                      .filter(([, selected]) => selected)
                      .map(([lane]) => lane)
                  ]
                })
              )
            );
          }
        }
      ]}
    />
  );
}
