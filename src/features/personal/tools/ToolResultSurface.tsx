import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  notices?: ToolResultNotice[];
  recommendations?: string[];
  assumptions?: string[];
  actions?: ToolResultAction[];
  feedback?: string;
  contextMessage?: string;
  details?: React.ReactNode;
};

export default function ToolResultSurface({
  title = "Result",
  status,
  summary,
  metrics,
  notices = [],
  recommendations = [],
  assumptions = [],
  actions = [],
  feedback,
  contextMessage,
  details
}: ToolResultSurfaceProps) {
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
              • {item}
            </Text>
          ))}
        </View>
      ) : null}

      {assumptions.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assumptions</Text>
          {assumptions.map((item) => (
            <Text key={item} style={styles.detail}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}

      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((action) => {
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
    borderRadius: 14,
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
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 3
  },
  metricLabel: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  metricValue: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  detail: { color: "#64748B", fontSize: 12, lineHeight: 18 },
  notice: { borderRadius: 10, padding: 10, gap: 4 },
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
    borderRadius: 9,
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
