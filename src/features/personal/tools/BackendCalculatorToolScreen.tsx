import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import FeedBanner from "@/components/feed/FeedBanner";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import {
  createGrowpathModuleRecord,
  type GrowpathModuleRecord
} from "@/api/growpathModules";
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
};

type BackendCalculatorToolScreenProps = {
  tool: CalculatorTool;
  toolKey: string;
  title: string;
  subtitle: string;
  status?: string;
  fields: ToolField[];
  buildPayload: (
    values: Record<string, string>,
    context: { growId: string; plantContext: ReturnType<typeof useToolPlantContext> }
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
    growId: string;
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

export { tomorrow };

export default function BackendCalculatorToolScreen({
  tool,
  toolKey,
  title,
  subtitle,
  status = "CALCULATED",
  fields,
  buildPayload,
  buildMetrics = defaultMetrics,
  buildNotices = defaultNotices,
  defaultLogTitle,
  defaultTask,
  buildActions,
  assistantBrief
}: BackendCalculatorToolScreenProps) {
  const routeParams = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const params = routeParams as typeof routeParams &
    Record<string, string | string[] | undefined>;
  const growId = coerceParam(params.growId);
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
    routeKey: `personal_tool_${toolKey}`,
    plan,
    mode: entitlements.mode,
    longContent: true
  });

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

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setToolRun(null);
    setModuleRecord(null);
    setOutputs(null);
    setFeedback("");
    setAssistantBriefText("");
  }

  const payload = useMemo(
    () => buildPayload(values, { growId, plantContext }),
    [buildPayload, growId, plantContext, values]
  );

  async function calculate() {
    if (running) return;
    setRunning(true);
    setFeedback("");
    try {
      const response = await runCalculator<Record<string, any>>(tool, payload);
      setOutputs(response.outputs);
      setToolRun(response.toolRun);
      const modulePayload = buildModuleRecordInput({
        tool,
        title: defaultLogTitle(response.outputs),
        growId,
        plantId: plantContext.plantId,
        cropProfileId: response.toolRun?.cropProfileId || payload.cropProfileId || null,
        cropIdentity: response.toolRun?.cropIdentity || payload.cropIdentity || null,
        selectedPlantContext:
          response.toolRun?.selectedPlantContext || payload.selectedPlantContext || null,
        inputs: payload,
        outputs: response.outputs,
        toolRun: response.toolRun
      });
      if (modulePayload) {
        try {
          const createdRecord = await createGrowpathModuleRecord(modulePayload);
          setModuleRecord(createdRecord);
          setFeedback("Calculated and saved as a ToolRun and module record.");
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
          growId,
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
      <ScreenBoundary title={title} showBack backFallbackHref="/home/personal/tools">
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
    <ScreenBoundary title={title} showBack backFallbackHref="/home/personal/tools">
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
        {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
        <ToolPlantContextPicker
          plants={plantContext.plants}
          plantId={plantContext.plantId}
          selectedPlant={plantContext.selectedPlant}
          onSelect={plantContext.setPlantId}
        />

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
          {fields.map((field) => (
            <View key={field.key} style={styles.field}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                accessibilityLabel={`${title} ${field.label}`}
                style={[styles.input, field.multiline && styles.textArea]}
                value={values[field.key] ?? ""}
                onChangeText={(value) => updateValue(field.key, value)}
                keyboardType={field.keyboardType || "default"}
                multiline={field.multiline}
              />
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Run ${title}`}
          disabled={running}
          onPress={calculate}
          style={[styles.button, running && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {running ? "Calculating..." : "Calculate"}
          </Text>
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
              growId ? undefined : "Select a grow to enable log and task actions."
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
