import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

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

type ToolField = {
  key: string;
  label: string;
  defaultValue: string;
  keyboardType?: "default" | "numeric";
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
  growOptional?: boolean;
  noGrowContextMessage?: string;
  backFallbackHref?: string;
  feedRouteKey?: string;
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
    evidenceAssetIds?: () => string[];
    isReady?: () => boolean;
    notReadyMessage?: string;
    buildMessage: (context: { growId: string; plantId: string }) => string;
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
  growOptional = false,
  noGrowContextMessage,
  backFallbackHref = "/home/personal/tools",
  feedRouteKey,
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
  defaultLogTitle,
  defaultTask,
  buildActions,
  assistantBrief,
  aiPrefill
}: BackendCalculatorToolScreenProps) {
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
    setValues((current) => ({ ...current, [key]: value }));
    setToolRun(null);
    setModuleRecord(null);
    setOutputs(null);
    setFeedback("");
    setAssistantBriefText("");
  }

  async function prefillWithAI() {
    if (!aiPrefill || !aiPrefillReady || (!growId && !growOptional) || prefilling) return;
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
          plantId: plantContext.plantId || ""
        })
      });
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
        fields.map((field) => [
          field.key,
          next[field.key] ?? (aiPrefill.clearUnfilled ? "" : values[field.key] || "")
        ])
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
        await calculateWithValues(resolvedValues, metadata);
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
    metadata: Record<string, any> = aiPrefillPayload
  ) {
    if (running) return;
    const validationMessage = validateValues?.(submittedValues);
    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }
    setRunning(true);
    setFeedback("");
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
      setOutputs(response.outputs);
      setToolRun(response.toolRun);
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
            setModuleRecord(existingRecord);
            setFeedback(
              existingRecord
                ? "Calculated and saved as a ToolRun and module record."
                : "Calculated and saved. The backend created the module record, but it could not be reloaded yet. Open Saved Runs before calculating again."
            );
          } else {
            const createdRecord = await createGrowpathModuleRecord(modulePayload);
            setModuleRecord(createdRecord);
            setFeedback("Calculated and saved as a ToolRun and module record.");
          }
        } catch (saveError: any) {
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
      setFeedback(error?.message || "Unable to calculate.");
    } finally {
      setRunning(false);
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
        successMessage: "Created grow task.",
        onPress: async () => {
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
          <Text style={styles.title}>{title}</Text>
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
        <Text style={styles.title}>{title}</Text>
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
          <Text style={styles.resultTitle}>How this tool works</Text>
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
              disabled={!aiPrefillReady || (!growId && !growOptional) || prefilling}
              style={[
                styles.secondaryButton,
                (!aiPrefillReady || (!growId && !growOptional) || prefilling) &&
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
                ) : (
                  <TextInput
                    accessibilityLabel={`${title} ${field.label}`}
                    accessibilityHint={field.helpText}
                    placeholder={field.placeholder}
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
          disabled={running}
          onPress={calculate}
          style={[styles.button, running && styles.disabled]}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 36, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B" },
  context: { color: "#166534", fontWeight: "700" },
  growPicker: { gap: 7 },
  growPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  growPill: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  growPillOn: { borderColor: "#166534", backgroundColor: "#DCFCE7" },
  growPillText: { color: "#334155", fontWeight: "700" },
  growPillTextOn: { color: "#166534" },
  guidanceCard: {
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    backgroundColor: "#F0FDF4"
  },
  resultTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  guidanceText: { color: "#334155", lineHeight: 19 },
  guidanceStrong: { color: "#334155", fontWeight: "800" },
  formSection: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8
  },
  fieldHelp: { color: "#64748B", fontSize: 12, lineHeight: 17 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF"
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
  briefBox: {
    borderWidth: 1,
    borderColor: "#D9F99D",
    borderRadius: 8,
    padding: 10,
    gap: 6,
    backgroundColor: "#FFFFFF"
  },
  briefText: { color: "#0F172A", lineHeight: 19 },
  form: { gap: 10 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: "#334155" },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionCard: {
    minWidth: 150,
    flexGrow: 1,
    flexBasis: 180,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10,
    gap: 3,
    backgroundColor: "#FFFFFF"
  },
  optionCardOn: { borderColor: "#166534", backgroundColor: "#F0FDF4" },
  optionCardLabel: { color: "#334155", fontWeight: "800" },
  optionCardLabelOn: { color: "#166534" },
  optionCardDescription: { color: "#64748B", fontSize: 12, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  button: {
    borderRadius: 8,
    backgroundColor: "#166534",
    paddingVertical: 12,
    alignItems: "center"
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
  feedback: { color: "#991B1B", fontWeight: "700" }
});
