import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";
import { runCalculator, type CalculatorTool, type ToolRun } from "@/api/toolRuns";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import ToolResultSurface, {
  type ToolResultAction,
  type ToolResultMetric,
  type ToolResultNotice
} from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateLog,
  saveToolRunAndCreateTask
} from "@/features/personal/tools/saveToolRunAndOpenJournal";

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
  defaultTask?: (outputs: Record<string, any>) => {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
  } | undefined;
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

function formatValue(value: unknown) {
  if (value == null || value === "") return "-";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(", ") : "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function defaultMetrics(outputs: Record<string, any>): ToolResultMetric[] {
  return Object.entries(outputs)
    .filter(([, value]) => value == null || typeof value !== "object" || Array.isArray(value))
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
  defaultTask
}: BackendCalculatorToolScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ growId?: string | string[]; plantId?: string | string[] }>();
  const growId = coerceParam(params.growId);
  const plantContext = useToolPlantContext(growId, coerceParam(params.plantId));
  const initialValues = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.key, field.defaultValue])),
    [fields]
  );
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [outputs, setOutputs] = useState<Record<string, any> | null>(null);
  const [toolRun, setToolRun] = useState<ToolRun | null>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState("");

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setToolRun(null);
    setOutputs(null);
    setFeedback("");
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
      setFeedback("Calculated and saved as a ToolRun.");
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
          router,
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
            dueDate: task.dueDate
          });
          if (!result.ok) throw new Error(result.error);
        }
      });
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BackButton />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
      <ToolPlantContextPicker
        plants={plantContext.plants}
        plantId={plantContext.plantId}
        selectedPlant={plantContext.selectedPlant}
        onSelect={plantContext.setPlantId}
      />

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
        <Text style={styles.buttonText}>{running ? "Calculating..." : "Calculate"}</Text>
      </Pressable>

      {outputs ? (
        <ToolResultSurface
          title={`${title} result`}
          status={status}
          metrics={buildMetrics(outputs)}
          inputs={payload}
          outputs={outputs}
          notices={buildNotices(outputs)}
          recommendations={Array.isArray(outputs.recommendations) ? outputs.recommendations : []}
          formulas={[
            outputs.formulaExplanation,
            outputs.formula,
            outputs.releaseDisclaimer,
            outputs.realisticNotes
          ].filter(Boolean)}
          actions={actions}
          feedback={feedback}
          contextMessage={growId ? undefined : "Select a grow to enable log and task actions."}
          copyPayload={{ tool, input: payload, output: outputs }}
        />
      ) : feedback ? (
        <Text style={styles.feedback}>{feedback}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 36, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B" },
  context: { color: "#166534", fontWeight: "700" },
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
