import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  createPersonalAutomationPolicy,
  deletePersonalAutomationPolicy,
  listPersonalAutomationEvents,
  listPersonalAutomationPolicies,
  testPersonalAutomationPolicy,
  updatePersonalAutomationPolicy
} from "@/api/automation";
import type {
  AutomationEvent,
  AutomationPolicy,
  AutomationPolicyPayload
} from "@/types/automation";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, fmtDate } from "@/features/grows/routeUtils";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { marginTop: 6, color: "#64748B", lineHeight: 20 },
  topActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  card: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#F8FAFC"
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  sectionTitle: {
    marginTop: 22,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A"
  },
  description: { marginTop: 6, color: "#475569", lineHeight: 19 },
  meta: { marginTop: 7, color: "#64748B", fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  button: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 11,
    backgroundColor: "#FFFFFF"
  },
  primaryButton: { backgroundColor: "#166534" },
  dangerButton: { borderColor: "#B91C1C" },
  disabledButton: { opacity: 0.45 },
  buttonText: { color: "#166534", fontWeight: "800" },
  primaryButtonText: { color: "#FFFFFF" },
  dangerText: { color: "#B91C1C" },
  status: { marginTop: 12, color: "#166534", fontWeight: "700" },
  error: { marginTop: 12, color: "#B91C1C" },
  empty: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    color: "#64748B",
    backgroundColor: "#F8FAFC"
  }
});

function dewPointPolicy(growId: string): AutomationPolicyPayload {
  return {
    growId,
    name: "Dew Point High Risk Alert",
    description:
      "Create a canopy inspection task when Dew Point Guard reports high risk.",
    enabled: true,
    trigger: { source: "tool_run", eventType: "dew_point_high_risk" },
    conditions: [{ field: "risk", operator: "equals", value: "high" }],
    actions: [
      {
        type: "create_task",
        payload: {
          title: "Inspect canopy for condensation risk",
          priority: "high",
          dueInHours: 1
        }
      },
      {
        type: "create_notification",
        payload: {
          title: "Dew Point Risk",
          body: "Dew Point Guard detected high condensation risk."
        }
      }
    ],
    cooldownMinutes: 180,
    maxTriggersPerDay: 4
  };
}

function diagnosisPolicy(growId: string): AutomationPolicyPayload {
  return {
    growId,
    name: "AI Diagnosis Follow-Up",
    description:
      "Create a follow-up task when AI diagnosis reports a non-good health state.",
    enabled: true,
    trigger: { source: "ai_diagnosis", eventType: "ai_issue_detected" },
    conditions: [{ field: "overallHealth", operator: "not_equals", value: "good" }],
    actions: [
      {
        type: "create_task",
        payload: {
          title: "Follow up on AI diagnosis",
          priority: "medium",
          dueInHours: 24
        }
      },
      {
        type: "create_grow_log",
        payload: {
          title: "AI Diagnosis Follow-Up Created",
          tags: ["ai_diagnosis", "follow_up"]
        }
      }
    ],
    cooldownMinutes: 360,
    maxTriggersPerDay: 4
  };
}

function triggerLabel(policy: AutomationPolicy) {
  return [policy.trigger?.source, policy.trigger?.eventType]
    .filter(Boolean)
    .join(":")
    .replace(/_/g, " ");
}

function actionLabel(policy: AutomationPolicy) {
  if (!Array.isArray(policy.actions) || !policy.actions.length) {
    return "No actions configured";
  }
  return policy.actions
    .map((action) => String(action?.type || "action").replace(/_/g, " "))
    .join(", ");
}

function samplePayload(policy: AutomationPolicy) {
  if (policy.trigger?.eventType === "dew_point_high_risk") {
    return { risk: "high", dewPointSpreadC: 1.2 };
  }
  if (policy.trigger?.eventType === "ai_issue_detected") {
    return { overallHealth: "watch", likelyIssues: ["environment review"] };
  }
  return {};
}

function eventTitle(event: AutomationEvent) {
  return [event.source, event.eventType].filter(Boolean).join(":").replace(/_/g, " ");
}

function eventSummary(event: AutomationEvent) {
  const matches = event.matchedPolicyIds?.length || 0;
  const errorCount = event.errors?.length || 0;
  if (errorCount) return `${errorCount} error(s): ${event.errors.join(", ")}`;
  return `${event.processed ? "Processed" : "Pending"} | matched ${matches} policy(s)`;
}

export default function GrowAutomationScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  const [policies, setPolicies] = useState<AutomationPolicy[]>([]);
  const [events, setEvents] = useState<AutomationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    if (!growId) {
      setError("Missing grow id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [policyRows, eventRows] = await Promise.all([
        listPersonalAutomationPolicies({ growId }),
        listPersonalAutomationEvents({ growId })
      ]);
      setPolicies(policyRows);
      setEvents(eventRows);
    } catch {
      setPolicies([]);
      setEvents([]);
      setError("Failed to load automation policies.");
    } finally {
      setLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function runAction(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await action();
      setStatus(message);
      await load();
    } catch (err: any) {
      setError(err?.message || "Automation action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Grow Automation</Text>
      <Text style={styles.subtitle}>
        Create grow-scoped rules that turn tool and AI events into tasks, alerts, and grow
        logs.
      </Text>
      <GrowWorkspaceNav growId={growId} active="automation" />

      <View style={styles.topActions}>
        <Pressable
          disabled={!growId || busy}
          onPress={() =>
            runAction(
              () => createPersonalAutomationPolicy(dewPointPolicy(growId)),
              "Dew Point automation added."
            )
          }
          style={[
            styles.button,
            styles.primaryButton,
            (!growId || busy) && styles.disabledButton
          ]}
        >
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            Add Dew Point Alert
          </Text>
        </Pressable>
        <Pressable
          disabled={!growId || busy}
          onPress={() =>
            runAction(
              () => createPersonalAutomationPolicy(diagnosisPolicy(growId)),
              "AI diagnosis automation added."
            )
          }
          style={[styles.button, (!growId || busy) && styles.disabledButton]}
        >
          <Text style={styles.buttonText}>Add AI Follow-Up</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator /> : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !policies.length ? (
        <Text style={styles.empty}>
          No automation policies are attached to this grow yet. Add a starter policy
          above, then run Dew Point Guard or AI diagnosis from this grow.
        </Text>
      ) : null}

      {policies.map((policy) => (
        <View key={policy.id} style={styles.card}>
          <Text style={styles.cardTitle}>{policy.name}</Text>
          {policy.description ? (
            <Text style={styles.description}>{policy.description}</Text>
          ) : null}
          <Text style={styles.meta}>
            Status: {policy.enabled ? "Enabled" : "Disabled"}
          </Text>
          <Text style={styles.meta}>Trigger: {triggerLabel(policy) || "Not set"}</Text>
          <Text style={styles.meta}>Actions: {actionLabel(policy)}</Text>
          <Text style={styles.meta}>
            Triggered: {policy.triggerCount || 0}
            {policy.lastTriggeredAt ? ` | Last: ${fmtDate(policy.lastTriggeredAt)}` : ""}
          </Text>

          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              onPress={() =>
                runAction(
                  () =>
                    updatePersonalAutomationPolicy(policy.id, {
                      enabled: !policy.enabled
                    }),
                  policy.enabled ? "Automation disabled." : "Automation enabled."
                )
              }
              style={[
                styles.button,
                policy.enabled && styles.primaryButton,
                busy && styles.disabledButton
              ]}
            >
              <Text
                style={[styles.buttonText, policy.enabled && styles.primaryButtonText]}
              >
                {policy.enabled ? "Disable" : "Enable"}
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() =>
                runAction(
                  () => testPersonalAutomationPolicy(policy.id, samplePayload(policy)),
                  "Dry-run completed."
                )
              }
              style={[styles.button, busy && styles.disabledButton]}
            >
              <Text style={styles.buttonText}>Test</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() =>
                runAction(
                  () => deletePersonalAutomationPolicy(policy.id),
                  "Automation deleted."
                )
              }
              style={[styles.button, styles.dangerButton, busy && styles.disabledButton]}
            >
              <Text style={[styles.buttonText, styles.dangerText]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Recent Automation Events</Text>
      {!loading && !events.length ? (
        <Text style={styles.empty}>
          No automation events have fired for this grow yet.
        </Text>
      ) : null}
      {events.slice(0, 8).map((event) => (
        <View key={event.id} style={styles.card}>
          <Text style={styles.cardTitle}>{eventTitle(event) || "Automation event"}</Text>
          <Text style={styles.meta}>{fmtDate(event.createdAt || "")}</Text>
          <Text style={styles.description}>{eventSummary(event)}</Text>
          {event.payload?.risk ? (
            <Text style={styles.meta}>
              Risk: {String(event.payload.risk).replace(/_/g, " ")}
            </Text>
          ) : null}
          {event.payload?.overallHealth ? (
            <Text style={styles.meta}>
              Health: {String(event.payload.overallHealth).replace(/_/g, " ")}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}
