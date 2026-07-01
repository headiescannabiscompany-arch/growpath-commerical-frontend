import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

export type ToolResultSeverity = "info" | "low" | "medium" | "high";

export type ToolResultMetric = {
  key: string;
  label: string;
  value: string;
  detail?: string;
};

export type ToolResultNotice = {
  key: string;
  severity: ToolResultSeverity;
  message: string;
  remediation?: string;
};

export type ToolResultAction = {
  key: string;
  label: string;
  onPress: () => void | Promise<void>;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  pendingLabel?: string;
  successMessage?: string;
};

type ToolResultSurfaceProps = {
  title?: string;
  status?: string;
  summary?: string;
  metrics: ToolResultMetric[];
  inputs?: Record<string, any> | null;
  outputs?: Record<string, any> | null;
  notices?: ToolResultNotice[];
  recommendations?: string[];
  assumptions?: string[];
  formulas?: string[];
  uncertainty?: string | Record<string, any> | null;
  confidence?: string | null;
  actions?: ToolResultAction[];
  feedback?: string;
  contextMessage?: string;
  details?: React.ReactNode;
  copyPayload?: unknown;
  onReuseInputs?: () => void | Promise<void>;
  onAskAI?: () => void | Promise<void>;
};

function canCopyText() {
  return typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText);
}

function formatScalar(value: any): string {
  if (value == null || value === "") return "-";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(formatScalar).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .slice(0, 5)
      .map(([key, nested]) => {
        if (Array.isArray(nested)) return `${key}: ${nested.length}`;
        if (nested && typeof nested === "object") return `${key}: {...}`;
        return `${key}: ${formatScalar(nested)}`;
      })
      .join("; ");
  }
  return String(value);
}

function compactEntries(data?: Record<string, any> | null) {
  if (!data || typeof data !== "object") return [];
  return Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .slice(0, 8)
    .map(([key, value]) => ({
      key,
      label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " "),
      value: formatScalar(value)
    }));
}

async function copyResult(payload: unknown) {
  if (!canCopyText()) throw new Error("Copy is unavailable in this runtime.");
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function objectValue(source: unknown, key: string) {
  return source && typeof source === "object"
    ? (source as Record<string, unknown>)[key]
    : undefined;
}

function buildAskAiPrompt({
  title,
  status,
  summary,
  inputs,
  outputs,
  metrics,
  notices,
  recommendations,
  formulas,
  confidence,
  copyPayload
}: {
  title: string;
  status?: string;
  summary?: string;
  inputs?: Record<string, any> | null;
  outputs?: Record<string, any> | null;
  metrics: ToolResultMetric[];
  notices: ToolResultNotice[];
  recommendations: string[];
  formulas: string[];
  confidence?: string | null;
  copyPayload?: unknown;
}) {
  const payload = {
    title,
    status,
    summary,
    metrics,
    inputs,
    outputs,
    notices,
    recommendations,
    formulas,
    confidence,
    source: copyPayload
  };
  return [
    `Explain this GrowPathAI tool result and suggest safe next checks.`,
    `Do not make absolute diagnosis claims; use the selected grow context if available.`,
    JSON.stringify(payload, null, 2)
  ]
    .join("\n\n")
    .slice(0, 4000);
}

export default function ToolResultSurface({
  title = "Result",
  status,
  summary,
  metrics,
  inputs,
  outputs,
  notices = [],
  recommendations = [],
  assumptions = [],
  formulas = [],
  uncertainty,
  confidence,
  actions = [],
  feedback,
  contextMessage,
  details,
  copyPayload,
  onReuseInputs,
  onAskAI
}: ToolResultSurfaceProps) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState("");

  async function runAction(action: ToolResultAction) {
    if (activeAction || action.disabled) return;
    setActiveAction(action.key);
    setActionFeedback("");
    try {
      await action.onPress();
      if (action.successMessage) setActionFeedback(action.successMessage);
    } catch (error: any) {
      setActionFeedback(error?.message || "Unable to complete this action.");
    } finally {
      setActiveAction(null);
    }
  }

  const inputEntries = compactEntries(inputs);
  const outputEntries = compactEntries(outputs);
  const growId = firstString(
    objectValue(copyPayload, "growId"),
    objectValue(inputs, "growId"),
    objectValue(outputs, "growId")
  );
  const defaultAskAi =
    onAskAI ||
    (copyPayload || inputs || outputs || metrics.length || summary
      ? () => {
          const prompt = buildAskAiPrompt({
            title,
            status,
            summary,
            inputs,
            outputs,
            metrics,
            notices,
            recommendations,
            formulas,
            confidence,
            copyPayload
          });
          const query = [
            `prompt=${encodeURIComponent(prompt)}`,
            growId ? `growId=${encodeURIComponent(growId)}` : ""
          ]
            .filter(Boolean)
            .join("&");
          router.push(`/home/personal/ai?${query}`);
        }
      : undefined);
  const standardActions: ToolResultAction[] = [
    ...(canCopyText()
      ? [
          {
            key: "copy-result",
            label: "Copy Result",
            variant: "secondary" as const,
            pendingLabel: "Copying...",
            successMessage: "Result copied.",
            onPress: () =>
              copyResult(
                copyPayload ?? {
                  title,
                  status,
                  summary,
                  inputs,
                  outputs,
                  metrics,
                  notices,
                  recommendations,
                  formulas,
                  uncertainty,
                  confidence
                }
              )
          }
        ]
      : []),
    ...(onReuseInputs
      ? [
          {
            key: "reuse-inputs",
            label: "Reuse Inputs",
            variant: "secondary" as const,
            pendingLabel: "Loading...",
            successMessage: "Inputs restored.",
            onPress: onReuseInputs
          }
        ]
      : []),
    ...(defaultAskAi
      ? [
          {
            key: "ask-ai",
            label: "Ask AI About This",
            variant: "secondary" as const,
            pendingLabel: "Opening...",
            onPress: defaultAskAi
          }
        ]
      : [])
  ];
  const allActions = [...actions, ...standardActions];

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
      {summary ? <Text style={styles.summary}>{summary}</Text> : null}

      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.key} style={styles.metric}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
            {metric.detail ? <Text style={styles.detail}>{metric.detail}</Text> : null}
          </View>
        ))}
      </View>

      {inputEntries.length || outputEntries.length ? (
        <View style={styles.dataGrid}>
          {inputEntries.length ? (
            <View style={styles.dataColumn}>
              <Text style={styles.sectionTitle}>Inputs</Text>
              {inputEntries.map((entry) => (
                <View key={`input-${entry.key}`} style={styles.dataRow}>
                  <Text style={styles.dataLabel}>{entry.label}</Text>
                  <Text style={styles.dataValue}>{entry.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {outputEntries.length ? (
            <View style={styles.dataColumn}>
              <Text style={styles.sectionTitle}>Outputs</Text>
              {outputEntries.map((entry) => (
                <View key={`output-${entry.key}`} style={styles.dataRow}>
                  <Text style={styles.dataLabel}>{entry.label}</Text>
                  <Text style={styles.dataValue}>{entry.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {notices.map((notice) => (
        <View
          key={notice.key}
          style={[
            styles.notice,
            notice.severity === "high"
              ? styles.noticeHigh
              : notice.severity === "medium"
                ? styles.noticeMedium
                : styles.noticeInfo
          ]}
        >
          <Text style={styles.noticeLabel}>{notice.severity.toUpperCase()}</Text>
          <Text style={styles.noticeText}>{notice.message}</Text>
          {notice.remediation ? (
            <Text style={styles.remediation}>Action: {notice.remediation}</Text>
          ) : null}
        </View>
      ))}

      {details ? <View style={styles.section}>{details}</View> : null}

      {recommendations.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {recommendations.map((item) => (
            <Text key={item} style={styles.listItem}>
              - {item}
            </Text>
          ))}
        </View>
      ) : null}

      {formulas.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formula / Why It Matters</Text>
          {formulas.map((item) => (
            <Text key={item} style={styles.detail}>
              - {item}
            </Text>
          ))}
        </View>
      ) : null}

      {uncertainty || confidence ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uncertainty / Confidence</Text>
          {confidence ? (
            <Text style={styles.detail}>Confidence: {confidence}</Text>
          ) : null}
          {uncertainty ? (
            <Text style={styles.detail}>
              {typeof uncertainty === "string"
                ? uncertainty
                : JSON.stringify(uncertainty)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {assumptions.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assumptions</Text>
          {assumptions.map((item) => (
            <Text key={item} style={styles.detail}>
              - {item}
            </Text>
          ))}
        </View>
      ) : null}

      {allActions.length ? (
        <View style={styles.actions}>
          {allActions.map((action) => {
            const pending = activeAction === action.key;
            return (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                disabled={Boolean(activeAction) || action.disabled}
                onPress={() => runAction(action)}
                style={[
                  styles.action,
                  action.variant === "secondary"
                    ? styles.actionSecondary
                    : styles.actionPrimary,
                  (Boolean(activeAction) || action.disabled) && styles.actionDisabled
                ]}
              >
                <Text
                  style={
                    action.variant === "secondary"
                      ? styles.actionSecondaryText
                      : styles.actionPrimaryText
                  }
                >
                  {pending ? action.pendingLabel || "Working..." : action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {contextMessage ? <Text style={styles.detail}>{contextMessage}</Text> : null}
      {feedback || actionFeedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback || actionFeedback}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 10
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  title: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  status: {
    color: "#166534",
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden"
  },
  summary: { color: "#334155", lineHeight: 20 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    minWidth: 130,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 3
  },
  metricLabel: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  metricValue: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  detail: { color: "#64748B", fontSize: 12, lineHeight: 18 },
  dataGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dataColumn: {
    minWidth: 210,
    flexGrow: 1,
    flexBasis: 240,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 6
  },
  dataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10
  },
  dataLabel: {
    flex: 1,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  dataValue: {
    flex: 1.25,
    flexShrink: 1,
    minWidth: 120,
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "left"
  },
  notice: { borderRadius: 8, padding: 10, gap: 4 },
  noticeHigh: { backgroundColor: "#FEE2E2" },
  noticeMedium: { backgroundColor: "#FFEDD5" },
  noticeInfo: { backgroundColor: "#E0F2FE" },
  noticeLabel: { color: "#7C2D12", fontSize: 11, fontWeight: "800" },
  noticeText: { color: "#7C2D12", lineHeight: 19 },
  remediation: { color: "#9A3412", fontWeight: "700", lineHeight: 19 },
  section: { gap: 4 },
  sectionTitle: { color: "#334155", fontWeight: "800" },
  listItem: { color: "#475569", lineHeight: 19 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  actionPrimary: { backgroundColor: "#166534", borderColor: "#166534" },
  actionSecondary: { backgroundColor: "#FFFFFF", borderColor: "#166534" },
  actionPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  actionSecondaryText: { color: "#166534", fontWeight: "800" },
  actionDisabled: { opacity: 0.55 },
  feedback: { color: "#334155", fontSize: 12, fontWeight: "700" }
});
