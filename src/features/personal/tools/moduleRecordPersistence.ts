import type {
  GrowpathModuleAgreementStatus,
  GrowpathModuleRecordInput,
  GrowpathModuleRecordType
} from "@/api/growpathModules";
import type { CalculatorTool, ToolRun } from "@/api/toolRuns";

export const TOOL_MODULE_RECORD_TYPES: Partial<
  Record<CalculatorTool, GrowpathModuleRecordType>
> = {
  "soil-builder": "soil_builder_recipe",
  "dry-amendment-mix": "dry_amendment_mix",
  "topdress-plan": "topdress_plan",
  "nutrient-source-comparison": "nutrient_source_comparison",
  "soil-nutrient-batch": "soil_nutrient_batch",
  "crop-steering-project": "crop_steering_entry",
  "ph-ec-check": "ph_ec_check",
  "pheno-hunt": "pheno_hunt",
  "stress-test": "stress_test",
  "genetics-inventory": "genetics_note",
  "tissue-culture": "tissue_culture_project",
  "ipm-scout": "ipm_scout",
  "species-crop-id": "species_crop_id",
  "harvest-readiness": "harvest_readiness_check",
  "dry-cure-guard": "dry_cure_check",
  "auto-grow-calendar": "auto_grow_calendar",
  "clone-rooting": "clone_batch_check",
  "run-comparison": "run_comparison"
};

export function getModuleRecordTypeForTool(tool: CalculatorTool) {
  return TOOL_MODULE_RECORD_TYPES[tool] || null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function compactStrings(values: unknown[]) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function normalizeAgreementStatus(
  ...values: unknown[]
): GrowpathModuleAgreementStatus | undefined {
  const status = firstString(...values).toLowerCase();
  if (status === "conflict") return "conflicts";
  if (
    status === "agrees" ||
    status === "partially_agrees" ||
    status === "conflicts" ||
    status === "insufficient_data" ||
    status === "not_run"
  ) {
    return status;
  }
  return undefined;
}

export function buildModuleRecordInput({
  tool,
  title,
  growId,
  plantId,
  cropProfileId,
  cropIdentity,
  selectedPlantContext,
  inputs,
  outputs,
  toolRun
}: {
  tool: CalculatorTool;
  title: string;
  growId?: string;
  plantId?: string | null;
  cropProfileId?: string | null;
  cropIdentity?: Record<string, any> | null;
  selectedPlantContext?: Record<string, any> | null;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  toolRun?: ToolRun | null;
}): GrowpathModuleRecordInput | null {
  const recordType = getModuleRecordTypeForTool(tool);
  if (!recordType) return null;

  const localRuleResult =
    recordType === "ipm_scout"
      ? outputs.localRuleResult ||
        outputs.growPathRuleResult ||
        outputs.ruleResult ||
        outputs
      : undefined;
  const aiVerificationResult =
    recordType === "ipm_scout"
      ? outputs.aiVerificationResult || outputs.gptVerification || null
      : undefined;
  const agreementStatus =
    recordType === "ipm_scout"
      ? normalizeAgreementStatus(
          outputs.agreementStatus,
          outputs.gptVerification?.agreementStatus,
          outputs.gptVerification?.agreement,
          outputs.verificationStatus
        )
      : undefined;

  return {
    recordType,
    title: firstString(
      title,
      outputs.projectName,
      outputs.mixName,
      outputs.batchName,
      outputs.recipeName,
      outputs.summary,
      tool
    ),
    status: "active",
    growId: growId || inputs.growId || undefined,
    plantId: plantId || inputs.plantId || undefined,
    phenoPlantId:
      firstString(
        inputs.phenoPlantId,
        recordType === "crop_steering_entry" ? plantId || inputs.plantId : ""
      ) || undefined,
    geneticsId: firstString(inputs.geneticsId) || undefined,
    cropProfileId: cropProfileId || inputs.cropProfileId || undefined,
    cropIdentity: cropIdentity || inputs.cropIdentity || null,
    selectedPlantContext: selectedPlantContext || inputs.selectedPlantContext || null,
    inputs,
    outputs,
    payload: outputs,
    localRuleResult,
    aiVerificationResult,
    agreementStatus,
    warnings: compactStrings([outputs.warnings, outputs.stageTimingWarnings]),
    recommendations: compactStrings([outputs.recommendations, outputs.nextChecks]),
    confidence: firstString(outputs.confidence, outputs.sourceConfidence) || null,
    limitations: compactStrings([
      outputs.limitations,
      outputs.missingData,
      outputs.missingInformation
    ]),
    methodIds: compactStrings([outputs.methodIds]),
    sourceIds: compactStrings([outputs.sourceIds]),
    citations: Array.isArray(outputs.citations) ? outputs.citations : [],
    disagreements: Array.isArray(outputs.disagreements) ? outputs.disagreements : [],
    sourceRecords: Array.isArray(outputs.sourceRecords) ? outputs.sourceRecords : [],
    tags: compactStrings([
      tool,
      outputs.tags,
      outputs.phenoTags,
      outputs.category,
      outputs.severity,
      outputs.pressureLevel,
      outputs.recoveryStatus
    ]),
    tasksToCreate: Array.isArray(outputs.tasksToCreate)
      ? outputs.tasksToCreate
      : Array.isArray(outputs.taskSuggestions)
        ? outputs.taskSuggestions
        : [],
    linkedToolRunId: toolRun?.id || toolRun?._id || undefined,
    linkedRecipeId:
      firstString(outputs.linkedRecipeId, outputs.recipe?._id, outputs.recipe?.id) ||
      undefined,
    schemaVersion: Number(outputs.schemaVersion || toolRun?.schemaVersion || 1),
    moduleVersion: firstString(
      outputs.calculatorVersion,
      toolRun?.calculatorVersion,
      "2026.07"
    )
  };
}
