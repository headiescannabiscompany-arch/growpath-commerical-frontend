import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import CalendarDateField from "@/components/forms/CalendarDateField";
import FeedBanner from "@/components/feed/FeedBanner";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import {
  createGrowpathModuleRecord,
  getGrowpathModuleRecord,
  type GrowpathModuleRecord
} from "@/api/growpathModules";
import { listPersonalGrows, type PersonalGrow } from "@/api/grows";
import {
  askPersonalAssistant,
  type PersonalAssistantResponse
} from "@/api/personalAssistant";
import { runCalculator, type CalculatorTool, type ToolRun } from "@/api/toolRuns";
import { useEntitlements } from "@/entitlements";
import { LockedScreen } from "@/entitlements/LockedScreen";
import { personalToolFeatures, type FeatureDefinition } from "@/config/featureStatus";
import { getFeedBannerPolicy } from "@/utils/feedPolicy";
import { hasLocalPaidPreviewOverride } from "@/utils/localPaidPreview";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import { TOOL_FEATURE_KEY_BY_TOOL_KEY } from "@/features/personal/tools/toolFeatureKeys";
import ToolResultSurface, {
  type ToolResultAction,
  type ToolResultMetric,
  type ToolResultNotice
} from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateLog,
  saveToolRunAndCreateTask
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { buildModuleRecordInput } from "@/features/personal/tools/moduleRecordPersistence";
import { createFacilityTask } from "@/api/facilityTasks";
import { normalizeEvidenceReview } from "@/features/personal/evidence/evidenceReview";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

function inferEvidenceReview(outputs: Record<string, any>, payload: Record<string, any>) {
  const media = outputs.mediaAnalysis || outputs.photoAnalysis || outputs.imageAnalysis;
  const assetIds = Array.isArray(payload.evidenceAssetIds)
    ? payload.evidenceAssetIds
    : [];
  const mediaEvidence = Array.isArray(payload.mediaEvidence) ? payload.mediaEvidence : [];
  const photoUrls = Array.isArray(payload.photoUrls) ? payload.photoUrls : [];
  const requested = Boolean(
    media || assetIds.length || mediaEvidence.length || photoUrls.length
  );
  if (!requested) return null;
  return normalizeEvidenceReview(
    {
      ...(media || {}),
      evidenceUsed: outputs.evidenceUsed || media?.evidenceUsed,
      counterEvidence: outputs.counterEvidence || media?.counterEvidence,
      missingInformation: outputs.missingInformation || media?.missingInformation,
      requiredNextPhotos: outputs.requiredNextPhotos || media?.requiredNextPhotos,
      limitations: outputs.limitations || media?.limitations || outputs.warnings
    },
    {
      requested,
      photoCount:
        assetIds.length ||
        mediaEvidence.filter((item: any) => item?.type !== "video").length ||
        photoUrls.length
    }
  );
}

type ToolField = {
  key: string;
  label: string;
  defaultValue: string;
  keyboardType?: "default" | "numeric";
  inputType?: "text" | "date" | "datetime";
  multiline?: boolean;
  placeholder?: string;
  helpText?: string;
  section?: string;
  required?: boolean;
  options?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
};

type BackendCalculatorToolScreenProps = {
  tool: CalculatorTool;
  toolKey: string;
  title: string;
  subtitle: string;
  pageHeadingLevel?: 1 | 2;
  growOptional?: boolean;
  noGrowContextMessage?: string;
  backFallbackHref?: string;
  feedRouteKey?: string;
  externalInputKey?: string;
  onToolRunChange?: (toolRun: ToolRun | null) => void;
  formHeader?:
    | React.ReactNode
    | ((context: {
        growId: string;
        plantId: string;
        facilityId: string;
        commercialAccountId: string;
      }) => React.ReactNode);
  status?: string;
  runLabel?: string;
  runAccessibilityLabel?: string;
  experienceMessage?: string;
  aiCreditMessage?: string;
  fields: ToolField[];
  validateValues?: (values: Record<string, string>) => string | null;
  buildPayload: (
    values: Record<string, string>,
    context: {
      growId: string;
      facilityId: string;
      commercialAccountId: string;
      plantContext: ReturnType<typeof useToolPlantContext>;
    }
  ) => Record<string, any>;
  buildMetrics?: (outputs: Record<string, any>) => ToolResultMetric[];
  buildNotices?: (outputs: Record<string, any>) => ToolResultNotice[];
  buildDetails?: (outputs: Record<string, any>) => React.ReactNode;
  defaultLogTitle: (outputs: Record<string, any>) => string;
  defaultTask?: (outputs: Record<string, any>) =>
    | {
        title: string;
        description?: string;
        priority?: "low" | "medium" | "high";
        dueDate?: string;
        endAt?: string;
        allDay?: boolean;
        calendarType?: string;
        sourceStage?: string;
        reminderPlan?: Record<string, any>;
        recurrence?: Record<string, any> | string;
      }
    | undefined;
  buildActions?: (context: {
    outputs: Record<string, any>;
    payload: Record<string, any>;
    toolRun: ToolRun | null;
    moduleRecord: GrowpathModuleRecord | null;
    growId: string;
    facilityId: string;
    commercialAccountId: string;
    plantContext: ReturnType<typeof useToolPlantContext>;
  }) => ToolResultAction[];
  assistantBrief?: {
    title: string;
    description: string;
    buttonLabel: string;
    accessibilityLabel: string;
    briefTitle: string;
    buildBrief: (context: {
      values: Record<string, string>;
      payload: Record<string, any>;
      growId: string;
      plantContext: ReturnType<typeof useToolPlantContext>;
    }) => string;
  };
  aiPrefill?: {
    buttonLabel?: string;
    clearUnfilled?: boolean;
    preserveAllExistingFields?: boolean;
    preserveExistingFields?: string[];
    evidenceAssetIds?: () => string[];
    isReady?: () => boolean;
    notReadyMessage?: string;
    buildMessage: (context: {
      growId: string;
      plantId: string;
      values: Record<string, string>;
    }) => string;
    normalizeFieldValue?: (context: {
      fieldKey: string;
      value: unknown;
      parsed: Record<string, any>;
    }) => string | undefined;
    runAfterPrefill?: boolean;
    buildPayloadMetadata?: (context: {
      response: PersonalAssistantResponse;
      parsed: Record<string, any>;
      evidenceAssetIds: string[];
    }) => Record<string, any>;
  };
};

const RUN_LABELS: Record<string, string> = {
  "auto-grow-calendar": "Build Calendar",
  "clone-rooting": "Review Rooting",
  "crop-steering-project": "Review Steering Plan",
  "dry-amendment-mix": "Calculate Blend",
  "dry-cure-guard": "Check Dry / Cure Risk",
  "genetics-inventory": "Review Genetics",
  "harvest-readiness": "Estimate Readiness",
  "ipm-scout": "Analyze Scout",
  "nutrient-source-comparison": "Compare Sources",
  "ph-ec-check": "Check pH / EC",
  "pheno-hunt": "Compare Phenotypes",
  "run-comparison": "Compare Runs",
  "soil-builder": "Build Soil Mix",
  "soil-nutrient-batch": "Build Production Batch",
  "species-crop-id": "Review Entered Identity",
  "stress-test": "Score Recovery",
  "tissue-culture": "Review TC Batch",
  "topdress-plan": "Build Topdress Plan"
};

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function tomorrow(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "-";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(", ") : "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function defaultMetrics(outputs: Record<string, any>): ToolResultMetric[] {
  return Object.entries(outputs)
    .filter(
      ([, value]) => value == null || typeof value !== "object" || Array.isArray(value)
    )
    .slice(0, 6)
    .map(([key, value]) => ({
      key,
      label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "),
      value: formatValue(value)
    }));
}

function defaultNotices(outputs: Record<string, any>): ToolResultNotice[] {
  const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
  return warnings.map((message, index) => ({
    key: `warning-${index}`,
    severity: "medium",
    message: String(message)
  }));
}

function outputSummary(outputs: Record<string, any>) {
  return JSON.stringify(outputs, null, 2).slice(0, 3000);
}

function normalizedPrefillText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.length ? JSON.stringify(value, null, 2) : "";
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export { tomorrow };

export default function BackendCalculatorToolScreen({
  tool,
  toolKey,
  title,
  subtitle,
  pageHeadingLevel = 2,
  growOptional = false,
  noGrowContextMessage,
  backFallbackHref = "/home/personal/tools",
  feedRouteKey,
  externalInputKey = "",
  onToolRunChange,
  formHeader,
  status = "CALCULATED",
  runLabel: runLabelOverride,
  runAccessibilityLabel,
  experienceMessage,
  aiCreditMessage: aiCreditMessageOverride,
  fields,
  validateValues,
  buildPayload,
  buildMetrics = defaultMetrics,
  buildNotices = defaultNotices,
  buildDetails,
  defaultLogTitle,
  defaultTask,
  buildActions,
  assistantBrief,
  aiPrefill
}: BackendCalculatorToolScreenProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createBackendCalculatorStyles(palette), [palette]);
  const routeParams = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
    facilityId?: string | string[];
    commercialAccountId?: string | string[];
  }>();
  const params = routeParams as typeof routeParams &
    Record<string, string | string[] | undefined>;
  const routeGrowId = coerceParam(params.growId);
  const facilityId = coerceParam(params.facilityId);
  const commercialAccountId = coerceParam(params.commercialAccountId);
  const [availableGrows, setAvailableGrows] = useState<PersonalGrow[]>([]);
  const [growId, setGrowId] = useState(routeGrowId);
  const plantContext = useToolPlantContext(growId, coerceParam(params.plantId));
  const entitlements = useEntitlements();
  const paidPreviewOverride = hasLocalPaidPreviewOverride();
  const plan = paidPreviewOverride ? "pro" : entitlements.plan || "free";
  const isFreePlan = !paidPreviewOverride && String(plan).toLowerCase() === "free";
  const feature = personalToolFeatures.find(
    (item) => item.key === TOOL_FEATURE_KEY_BY_TOOL_KEY[toolKey]
  ) as FeatureDefinition | undefined;
  const requiredCapability = feature?.capabilityKey || null;
  const betaLockedForFree = feature?.status === "beta" && isFreePlan;
  const capabilityLocked =
    !paidPreviewOverride &&
    Boolean(requiredCapability) &&
    !entitlements.can(String(requiredCapability));
  const locked = betaLockedForFree || capabilityLocked;
  const bannerPolicy = getFeedBannerPolicy({
    routeKey: feedRouteKey || `personal_tool_${toolKey}`,
    plan,
    mode: entitlements.mode,
    longContent: true
  });
  const aiPrefillReady = aiPrefill?.isReady?.() ?? true;
  const isCropIdentification = tool === "species-crop-id";
  const experience = feature?.experience;
  const runLabel = runLabelOverride || RUN_LABELS[toolKey] || "Calculate Result";
  const experienceMode =
    experienceMessage ||
    (experience
      ? {
          ai: "AI analyzes the supplied evidence.",
          ai_assisted:
            "AI can help fill evidence, but the final result is calculated from the values you review.",
          calculated:
            "The result is calculated from the measurements and records you enter.",
          guided: "The tool turns the information you enter into a reviewable workflow.",
          library: "The tool creates reusable records for other GrowPath workflows."
        }[experience.mode]
      : aiPrefill
        ? "AI prefill is optional; the final result is calculated from the values you review."
        : "The result is calculated from the measurements and records you enter.");
  const aiCreditMessage =
    aiCreditMessageOverride ||
    (experience
      ? experience.aiCredits === "required"
        ? "This workflow uses AI credits."
        : experience.aiCredits === "optional"
          ? "AI credits are used only when you run the AI step. The calculator itself does not use an AI credit."
          : "This workflow does not use AI credits."
      : aiPrefill
        ? "AI credits are used only when you choose the AI prefill step."
        : "The calculator does not use AI credits.");

  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          coerceParam(params[field.key]) || field.defaultValue
        ])
      ),
    [fields, params]
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [outputs, setOutputs] = useState<Record<string, any> | null>(null);
  const [toolRun, setToolRun] = useState<ToolRun | null>(null);
  const [moduleRecord, setModuleRecord] = useState<GrowpathModuleRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [assistantBriefText, setAssistantBriefText] = useState("");
  const [prefilling, setPrefilling] = useState(false);
  const [aiPrefillPayload, setAiPrefillPayload] = useState<Record<string, any>>({});
  const userValuesRef = React.useRef<Record<string, string>>(initialValues);
  const externalInputKeyRef = React.useRef(externalInputKey);
  const latestExternalInputKeyRef = React.useRef(externalInputKey);
  const inputRevisionRef = React.useRef(0);
  const executionLockRef = React.useRef<"prefill" | "calculate" | null>(null);
  latestExternalInputKeyRef.current = externalInputKey;

  React.useEffect(() => {
    if (externalInputKeyRef.current === externalInputKey) return;
    externalInputKeyRef.current = externalInputKey;
    inputRevisionRef.current += 1;
    setValues(userValuesRef.current);
    setToolRun(null);
    onToolRunChange?.(null);
    setModuleRecord(null);
    setOutputs(null);
    setAiPrefillPayload({});
    setFeedback("");
    setAssistantBriefText("");
  }, [externalInputKey, onToolRunChange]);

  React.useEffect(() => {
    if (locked) return;
    let active = true;
    listPersonalGrows()
      .then((grows) => {
        if (!active) return;
        setAvailableGrows(grows);
        if (!growOptional && !routeGrowId && grows.length === 1) {
          setGrowId(String(grows[0].id || (grows[0] as any)._id || ""));
        }
      })
      .catch(() => {
        if (active) setAvailableGrows([]);
      });
    return () => {
      active = false;
    };
  }, [growOptional, locked, routeGrowId]);

  function updateValue(key: string, value: string) {
    inputRevisionRef.current += 1;
    userValuesRef.current = { ...userValuesRef.current, [key]: value };
    setValues((current) => ({ ...current, [key]: value }));
    setToolRun(null);
    onToolRunChange?.(null);
    setModuleRecord(null);
    setOutputs(null);
    setAiPrefillPayload({});
    setFeedback("");
    setAssistantBriefText("");
  }

  async function prefillWithAI() {
    if (
      !aiPrefill ||
      !aiPrefillReady ||
      (!growId && !growOptional) ||
      prefilling ||
      running ||
      executionLockRef.current
    ) {
      return;
    }
    executionLockRef.current = "prefill";
    const requestInputRevision = inputRevisionRef.current;
    const requestExternalInputKey = latestExternalInputKeyRef.current;
    setPrefilling(true);
    setFeedback("");
    try {
      const evidenceAssetIds = aiPrefill.evidenceAssetIds?.() || [];
      const response = await askPersonalAssistant({
        growId: growId || undefined,
        plantId: plantContext.plantId || undefined,
        evidenceAssetIds,
        context: { workflow: toolKey, requestedFields: fields.map((field) => field.key) },
        message: aiPrefill.buildMessage({
          growId,
          plantId: plantContext.plantId || "",
          values
        })
      });
      if (
        inputRevisionRef.current !== requestInputRevision ||
        latestExternalInputKeyRef.current !== requestExternalInputKey
      ) {
        return;
      }
      if (!response?.success || !response.reply) {
        throw new Error(
          tool === "species-crop-id"
            ? "AI did not return an identification result."
            : "AI did not return usable prefill data for this tool."
        );
      }
      const raw = String(response.reply || "");
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const parsed = JSON.parse(match?.[1] || raw.slice(raw.indexOf("{")));
      const next = Object.fromEntries(
        fields
          .filter((field) => parsed[field.key] != null)
          .map((field) => {
            const value = parsed[field.key];
            const configuredValue = aiPrefill.normalizeFieldValue?.({
              fieldKey: field.key,
              value,
              parsed
            });
            return [field.key, configuredValue ?? normalizedPrefillText(value)];
          })
      );
      const resolvedValues = Object.fromEntries(
        fields.map((field) => {
          const existingValue = values[field.key] || "";
          const preserveExisting =
            (aiPrefill.preserveAllExistingFields ||
              aiPrefill.preserveExistingFields?.includes(field.key)) &&
            existingValue.trim().length > 0;
          return [
            field.key,
            preserveExisting
              ? existingValue
              : (next[field.key] ?? (aiPrefill.clearUnfilled ? "" : existingValue))
          ];
        })
      );
      const metadata =
        aiPrefill.buildPayloadMetadata?.({
          response,
          parsed,
          evidenceAssetIds
        }) || {};
      setValues(resolvedValues);
      setAiPrefillPayload(metadata);
      if (aiPrefill.runAfterPrefill) {
        await calculateWithValues(
          resolvedValues,
          metadata,
          {
            externalInputKey: requestExternalInputKey,
            revision: requestInputRevision
          },
          "prefill"
        );
      } else {
        const filledFieldCount = Object.values(next).filter((value) =>
          String(value).trim()
        ).length;
        const prefillSummary = filledFieldCount
          ? `AI filled ${filledFieldCount} non-empty field${
              filledFieldCount === 1 ? "" : "s"
            } from available evidence. Empty or unknown values were left blank. Review before calculating.`
          : "AI reviewed the available evidence but could not prefill any non-empty fields. Empty or unknown values were left blank. Add clearer evidence or complete the form manually.";
        setFeedback(
          `${prefillSummary}${
            response.missingInformation?.length
              ? ` Optional missing details: ${response.missingInformation.join(", ")}.`
              : ""
          }`
        );
      }
    } catch (error: any) {
      setFeedback(error?.message || "AI could not prefill this workflow.");
    } finally {
      if (executionLockRef.current === "prefill") {
        executionLockRef.current = null;
      }
      setPrefilling(false);
    }
  }

  const payload = useMemo(
    () => ({
      ...buildPayload(values, {
        growId,
        facilityId,
        commercialAccountId,
        plantContext
      }),
      ...aiPrefillPayload
    }),
    [
      aiPrefillPayload,
      buildPayload,
      commercialAccountId,
      facilityId,
      growId,
      plantContext,
      values
    ]
  );

  async function calculateWithValues(
    submittedValues: Record<string, string>,
    metadata: Record<string, any> = aiPrefillPayload,
    expectedInputState = {
      externalInputKey: latestExternalInputKeyRef.current,
      revision: inputRevisionRef.current
    },
    existingLock: "prefill" | null = null
  ) {
    const validationMessage = validateValues?.(submittedValues);
    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }
    const usesExistingLock =
      existingLock === "prefill" && executionLockRef.current === "prefill";
    if (!usesExistingLock) {
      if (running || prefilling || executionLockRef.current) return;
      executionLockRef.current = "calculate";
    }
    setRunning(true);
    setFeedback("");
    const requestIsCurrent = () =>
      inputRevisionRef.current === expectedInputState.revision &&
      latestExternalInputKeyRef.current === expectedInputState.externalInputKey;
    try {
      const submittedPayload = {
        ...buildPayload(submittedValues, {
          growId,
          facilityId,
          commercialAccountId,
          plantContext
        }),
        ...metadata
      };
      const response = await runCalculator<Record<string, any>>(tool, submittedPayload);
      if (!requestIsCurrent()) return;
      setOutputs(response.outputs);
      setToolRun(response.toolRun);
      onToolRunChange?.(response.toolRun);
      const modulePayload = buildModuleRecordInput({
        tool,
        title: defaultLogTitle(response.outputs),
        growId,
        plantId: plantContext.plantId,
        cropProfileId:
          response.toolRun?.cropProfileId || submittedPayload.cropProfileId || null,
        cropIdentity:
          response.toolRun?.cropIdentity || submittedPayload.cropIdentity || null,
        selectedPlantContext:
          response.toolRun?.selectedPlantContext ||
          submittedPayload.selectedPlantContext ||
          null,
        inputs: submittedPayload,
        outputs: response.outputs,
        toolRun: response.toolRun
      });
      if (modulePayload) {
        try {
          const linkedModuleRecordId = String(
            response.toolRun?.linkedModuleRecordId || ""
          ).trim();
          if (linkedModuleRecordId) {
            const existingRecord = await getGrowpathModuleRecord(linkedModuleRecordId);
            if (!requestIsCurrent()) return;
            setModuleRecord(existingRecord);
            setFeedback(
              existingRecord
                ? "Calculated and saved as a ToolRun and module record."
                : "Calculated and saved. The backend created the module record, but it could not be reloaded yet. Open Saved Runs before calculating again."
            );
          } else {
            const createdRecord = await createGrowpathModuleRecord(modulePayload);
            if (!requestIsCurrent()) return;
            setModuleRecord(createdRecord);
            setFeedback("Calculated and saved as a ToolRun and module record.");
          }
        } catch (saveError: any) {
          if (!requestIsCurrent()) return;
          setModuleRecord(null);
          setFeedback(
            `Calculated and saved as a ToolRun. Module record save failed: ${
              saveError?.message || "unknown error"
            }`
          );
        }
      } else {
        setModuleRecord(null);
        setFeedback("Calculated and saved as a ToolRun.");
      }
    } catch (error: any) {
      if (requestIsCurrent()) {
        setFeedback(error?.message || "Unable to calculate.");
      }
    } finally {
      setRunning(false);
      if (!usesExistingLock && executionLockRef.current === "calculate") {
        executionLockRef.current = null;
      }
    }
  }

  async function calculate() {
    await calculateWithValues(values);
  }
  const actions: ToolResultAction[] = [];
  if (outputs && growId) {
    actions.push({
      key: "save-log",
      label: "Save to Grow Log",
      variant: "secondary",
      pendingLabel: "Saving...",
      successMessage: "Saved to grow log.",
      onPress: async () => {
        const result = await saveToolRunAndCreateLog({
          growId,
          ...plantContext.toolRunContext,
          toolKey,
          toolRunId: toolRun?.id || toolRun?._id,
          input: payload,
          output: outputs,
          title: defaultLogTitle(outputs),
          notes: outputSummary(outputs),
          tags: [toolKey, "tool-result"]
        });
        if (!result.ok) throw new Error(result.error);
      }
    });
    const task = defaultTask?.(outputs);
    if (task) {
      actions.push({
        key: "create-task",
        label: "Create Follow-up Task",
        variant: "secondary",
        pendingLabel: "Creating...",
        successMessage: "Created follow-up task in the selected workspace.",
        onPress: async () => {
          if (facilityId) {
            await createFacilityTask(facilityId, {
              title: task.title,
              description: task.description || `Follow up on ${toolKey} result.`,
              priority: task.priority === "medium" ? "normal" : task.priority,
              dueAt: task.dueDate
                ? new Date(`${task.dueDate}T12:00:00.000Z`).toISOString()
                : undefined,
              endAt: task.endAt,
              recurrence:
                typeof task.recurrence === "string"
                  ? { rule: task.recurrence }
                  : task.recurrence,
              reminderPlan: task.reminderPlan,
              sourceType: "tool_run",
              sourceObjectId: String(toolRun?.id || toolRun?._id || "") || undefined,
              linkedToolRunId: String(toolRun?.id || toolRun?._id || "") || undefined
            });
          } else {
            const result = await saveToolRunAndCreateTask({
              growId,
              ...plantContext.toolRunContext,
              toolKey,
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              title: task.title,
              description: task.description,
              priority: task.priority,
              dueDate: task.dueDate,
              endAt: task.endAt,
              allDay: task.allDay,
              calendarType: task.calendarType,
              sourceStage: task.sourceStage,
              reminderPlan: task.reminderPlan,
              recurrence: task.recurrence
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      });
    }
  }
  if (outputs && buildActions) {
    try {
      actions.push(
        ...buildActions({
          outputs,
          payload,
          toolRun,
          moduleRecord,
          growId,
          facilityId,
          commercialAccountId,
          plantContext
        })
      );
    } catch (_error: any) {
      actions.push({
        key: "custom-action-error",
        label: "Action unavailable",
        variant: "secondary",
        disabled: true,
        onPress: () => {}
      });
    }
  }

  if (locked) {
    return (
      <ScreenBoundary title={title} showBack backFallbackHref={backFallbackHref}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <Text
            accessibilityRole="header"
            aria-level={pageHeadingLevel}
            style={styles.title}
          >
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {bannerPolicy.top ? (
            <FeedBanner
              placement="top"
              slots={bannerPolicy.slotsByPlacement.top}
              mode={entitlements.mode}
              plan={plan}
              railMode={bannerPolicy.railMode}
            />
          ) : null}
          <LockedScreen
            title={`${title} is a Pro tool`}
            message="Free accounts can use core tools and browse the app. Upgrade to run this tool and save its results to grow history."
          />
          {bannerPolicy.bottom ? (
            <FeedBanner
              placement="bottom"
              slots={bannerPolicy.slotsByPlacement.bottom}
              mode={entitlements.mode}
              plan={plan}
              railMode={bannerPolicy.railMode}
            />
          ) : null}
        </ScrollView>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary title={title} showBack backFallbackHref={backFallbackHref}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          aria-level={pageHeadingLevel}
          style={styles.title}
        >
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {bannerPolicy.top ? (
          <FeedBanner
            placement="top"
            slots={bannerPolicy.slotsByPlacement.top}
            mode={entitlements.mode}
            plan={plan}
            railMode={bannerPolicy.railMode}
          />
        ) : null}
        <View style={styles.guidanceCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.resultTitle}>
            How this tool works
          </Text>
          <Text style={styles.guidanceText}>{experienceMode}</Text>
          <Text style={styles.guidanceText}>{aiCreditMessage}</Text>
          {experience ? (
            <>
              <Text style={styles.guidanceText}>
                <Text style={styles.guidanceStrong}>Bring: </Text>
                {experience.inputSummary}
              </Text>
              <Text style={styles.guidanceText}>
                <Text style={styles.guidanceStrong}>You get: </Text>
                {experience.outputSummary}
              </Text>
            </>
          ) : null}
          <Text style={styles.guidanceText}>
            A successful run is saved to Saved Runs. Attach a grow to also enable
            grow-log, task, and plant-history actions.
          </Text>
        </View>
        {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
        {availableGrows.length ? (
          <View style={styles.growPicker}>
            <Text style={styles.label}>
              {growOptional ? "Attach to a grow (optional)" : "Select grow"}
            </Text>
            {growOptional ? (
              <Text style={styles.guidanceText}>
                {isCropIdentification
                  ? "Identification works without a grow. Attach one only to save the result, create tasks, or use plant history."
                  : "This workflow works without a grow. Attach one to use saved crop history and create linked logs, tasks, or plant records."}
              </Text>
            ) : null}
            <View style={styles.growPickerRow}>
              {growOptional ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${title} without a grow`}
                  onPress={() => setGrowId("")}
                  style={[styles.growPill, !growId && styles.growPillOn]}
                >
                  <Text style={[styles.growPillText, !growId && styles.growPillTextOn]}>
                    No grow
                  </Text>
                </Pressable>
              ) : null}
              {availableGrows.map((grow, index) => {
                const id = String(grow.id || (grow as any)._id || "");
                if (!id) return null;
                const selected = growId === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`Select grow ${grow.name || index + 1}`}
                    onPress={() => setGrowId(id)}
                    style={[styles.growPill, selected && styles.growPillOn]}
                  >
                    <Text
                      style={[styles.growPillText, selected && styles.growPillTextOn]}
                    >
                      {grow.name || `Grow ${index + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : !growId && growOptional ? (
          <Text style={styles.feedback}>
            {isCropIdentification
              ? "No grow is required. Upload photos or enter what you know to identify the crop."
              : "No grow is required. Enter direct observations or upload evidence; attach a grow later for linked history and tasks."}
          </Text>
        ) : !growId ? (
          <Text style={styles.feedback}>
            Create a grow first, then return here to run and save this tool.
          </Text>
        ) : null}
        {growId || !growOptional ? (
          <ToolPlantContextPicker
            plants={plantContext.plants}
            plantId={plantContext.plantId}
            selectedPlant={plantContext.selectedPlant}
            onSelect={plantContext.setPlantId}
          />
        ) : null}

        {typeof formHeader === "function"
          ? formHeader({
              growId,
              plantId: plantContext.plantId,
              facilityId,
              commercialAccountId
            })
          : formHeader}

        {aiPrefill ? (
          <View style={styles.guidanceCard}>
            <Text style={styles.resultTitle}>
              {isCropIdentification
                ? "AI photo identification"
                : growOptional
                  ? "AI photo evidence prefill"
                  : "AI grow-context prefill"}
            </Text>
            <Text style={styles.guidanceText}>
              {isCropIdentification
                ? "AI can inspect uploaded photos and use an attached grow or plant as optional context. Review and confirm every identification."
                : growOptional
                  ? "AI can inspect uploaded photos and use an attached grow or plant as optional context. Review every filled observation before running the structured workflow."
                  : "AI will use saved grow and plant evidence to fill every supported field. You can add or correct anything before running the tool."}
            </Text>
            {!aiPrefillReady && aiPrefill.notReadyMessage ? (
              <Text style={styles.feedback}>{aiPrefill.notReadyMessage}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={
                !aiPrefillReady || (!growId && !growOptional) || prefilling || running
              }
              style={[
                styles.secondaryButton,
                (!aiPrefillReady ||
                  (!growId && !growOptional) ||
                  prefilling ||
                  running) &&
                  styles.disabled
              ]}
              onPress={prefillWithAI}
            >
              <Text style={styles.secondaryButtonText}>
                {prefilling
                  ? growOptional
                    ? "Analyzing photos..."
                    : "Reviewing grow..."
                  : aiPrefill.buttonLabel || "Fill with AI"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {assistantBrief ? (
          <View style={styles.guidanceCard}>
            <Text style={styles.resultTitle}>{assistantBrief.title}</Text>
            <Text style={styles.guidanceText}>{assistantBrief.description}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={assistantBrief.accessibilityLabel}
              style={styles.secondaryButton}
              onPress={() =>
                setAssistantBriefText(
                  assistantBrief.buildBrief({ values, payload, growId, plantContext })
                )
              }
            >
              <Text style={styles.secondaryButtonText}>{assistantBrief.buttonLabel}</Text>
            </Pressable>
            {assistantBriefText ? (
              <View style={styles.briefBox}>
                <Text style={styles.resultTitle}>{assistantBrief.briefTitle}</Text>
                <Text selectable style={styles.briefText}>
                  {assistantBriefText}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.form}>
          {fields.map((field, index) => (
            <React.Fragment key={field.key}>
              {field.section &&
              (index === 0 || fields[index - 1]?.section !== field.section) ? (
                <Text style={styles.formSection}>{field.section}</Text>
              ) : null}
              <View style={styles.field}>
                <Text style={styles.label}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Text>
                {field.helpText ? (
                  <Text style={styles.fieldHelp}>{field.helpText}</Text>
                ) : null}
                {field.options?.length ? (
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel={`${title} ${field.label}`}
                    style={styles.optionGrid}
                  >
                    {field.options.map((option) => {
                      const selected = values[field.key] === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="radio"
                          accessibilityLabel={`${title} ${field.label}: ${option.label}`}
                          accessibilityHint={option.description}
                          accessibilityState={{ checked: selected }}
                          onPress={() => updateValue(field.key, option.value)}
                          style={[styles.optionCard, selected && styles.optionCardOn]}
                        >
                          <Text
                            style={[
                              styles.optionCardLabel,
                              selected && styles.optionCardLabelOn
                            ]}
                          >
                            {option.label}
                          </Text>
                          {option.description ? (
                            <Text style={styles.optionCardDescription}>
                              {option.description}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : field.inputType === "date" || field.inputType === "datetime" ? (
                  <CalendarDateField
                    accessibilityLabel={`${title} ${field.label}`}
                    label={undefined}
                    mode={field.inputType}
                    onChange={(value) => updateValue(field.key, value)}
                    optional={!field.required}
                    placeholder={
                      field.placeholder ||
                      (field.inputType === "datetime"
                        ? "Choose date and time"
                        : "Choose date")
                    }
                    value={values[field.key] ?? ""}
                  />
                ) : (
                  <TextInput
                    accessibilityLabel={`${title} ${field.label}`}
                    accessibilityHint={field.helpText}
                    placeholder={field.placeholder}
                    placeholderTextColor={palette.textMuted}
                    selectionColor={palette.accent}
                    style={[styles.input, field.multiline && styles.textArea]}
                    value={values[field.key] ?? ""}
                    onChangeText={(value) => updateValue(field.key, value)}
                    keyboardType={field.keyboardType || "default"}
                    multiline={field.multiline}
                  />
                )}
              </View>
            </React.Fragment>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={runAccessibilityLabel || `Run ${title}`}
          accessibilityHint={runLabel}
          disabled={running || prefilling}
          onPress={calculate}
          style={[styles.button, (running || prefilling) && styles.disabled]}
        >
          <Text style={styles.buttonText}>{running ? "Working..." : runLabel}</Text>
        </Pressable>

        {bannerPolicy.middle ? (
          <FeedBanner
            placement="middle"
            slots={bannerPolicy.slotsByPlacement.middle}
            mode={entitlements.mode}
            plan={plan}
            railMode={bannerPolicy.railMode}
          />
        ) : null}

        {outputs ? (
          <ToolResultSurface
            title={`${title} result`}
            status={status}
            metrics={buildMetrics(outputs)}
            inputs={payload}
            outputs={outputs}
            notices={buildNotices(outputs)}
            recommendations={
              Array.isArray(outputs.recommendations) ? outputs.recommendations : []
            }
            formulas={[
              outputs.formulaExplanation,
              outputs.formula,
              outputs.releaseDisclaimer,
              outputs.realisticNotes
            ].filter(Boolean)}
            details={buildDetails?.(outputs)}
            evidenceReview={inferEvidenceReview(outputs, payload)}
            onAddEvidence={() =>
              setFeedback(
                "Add the requested evidence above, then run this tool again to update the review."
              )
            }
            actions={actions}
            feedback={feedback}
            contextMessage={
              growId
                ? undefined
                : noGrowContextMessage || "Select a grow to enable log and task actions."
            }
            copyPayload={{ tool, input: payload, output: outputs }}
            footerMessage={
              moduleRecord?.id ? `Module record saved: ${moduleRecord.id}` : undefined
            }
          />
        ) : feedback ? (
          <Text style={styles.feedback}>{feedback}</Text>
        ) : null}
        {bannerPolicy.bottom ? (
          <FeedBanner
            placement="bottom"
            slots={bannerPolicy.slotsByPlacement.bottom}
            mode={entitlements.mode}
            plan={plan}
            railMode={bannerPolicy.railMode}
          />
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

export function createBackendCalculatorStyles(palette: ThemePalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 36, gap: 10 },
    title: { fontSize: 22, fontWeight: "700", color: palette.text },
    subtitle: { fontSize: 13, color: palette.textMuted },
    context: { color: palette.link, fontWeight: "700" },
    growPicker: { gap: 7 },
    growPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    growPill: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    growPillOn: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    growPillText: { color: palette.textMuted, fontWeight: "700" },
    growPillTextOn: { color: palette.link },
    guidanceCard: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: 8,
      padding: 12,
      gap: 8,
      backgroundColor: palette.surfaceMuted
    },
    resultTitle: { fontSize: 15, fontWeight: "800", color: palette.text },
    guidanceText: { color: palette.textMuted, lineHeight: 19 },
    guidanceStrong: { color: palette.text, fontWeight: "800" },
    formSection: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 8
    },
    fieldHelp: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    secondaryButton: {
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: palette.surface
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    briefBox: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: 8,
      padding: 10,
      gap: 6,
      backgroundColor: palette.surface
    },
    briefText: { color: palette.text, lineHeight: 19 },
    form: { gap: 10 },
    field: { gap: 6 },
    label: { fontSize: 13, fontWeight: "700", color: palette.text },
    optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    optionCard: {
      minWidth: 150,
      flexGrow: 1,
      flexBasis: 180,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      padding: 10,
      gap: 3,
      backgroundColor: palette.surface
    },
    optionCardOn: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    optionCardLabel: { color: palette.text, fontWeight: "800" },
    optionCardLabelOn: { color: palette.link },
    optionCardDescription: { color: palette.textMuted, fontSize: 12, lineHeight: 16 },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surface,
      color: palette.text
    },
    textArea: { minHeight: 88, textAlignVertical: "top" },
    button: {
      borderRadius: 8,
      backgroundColor: palette.accent,
      paddingVertical: 12,
      alignItems: "center"
    },
    disabled: { opacity: 0.6 },
    buttonText: { color: palette.accentText, fontWeight: "700" },
    feedback: { color: palette.danger, fontWeight: "700" }
  });
}
