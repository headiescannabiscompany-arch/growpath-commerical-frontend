import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useEntitlements } from "../../context/EntitlementsContext";
import {
  useInsights,
  useResolveInsight,
  useSnoozeInsight,
  useRunInsights
} from "../../hooks/useInsights";
import { Insight, InsightAction } from "../../types/insight";

export default function InsightsScreen() {
  const { selectedFacilityId, capabilities } = useEntitlements();
  const { data, isLoading, error } = useInsights(selectedFacilityId!);
  const resolveMutation = useResolveInsight(selectedFacilityId!);
  const snoozeMutation = useSnoozeInsight(selectedFacilityId!);
  const runInsightsMutation = useRunInsights(selectedFacilityId!);
  const nav = useNavigation<any>();

  const isAdmin = capabilities?.admin;

  const handleRefresh = async () => {
    try {
      const result = await runInsightsMutation.mutateAsync();
      Alert.alert(
        "Insights Refreshed",
        `Created: ${result.created}, Updated: ${result.updated}`
      );
    } catch (e) {
      Alert.alert("Error", "Failed to refresh insights.");
    }
  };

  if (isLoading) return <Text>Loading insights…</Text>;
  if (error) return <Text>Error loading insights.</Text>;
  if (!data || data.length === 0) return <Text>No insights yet.</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Facility Insights</Text>
      {isAdmin && (
        <Pressable
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={runInsightsMutation.status === "pending"}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            {runInsightsMutation.status === "pending"
              ? "Refreshing..."
              : "Refresh Insights"}
          </Text>
        </Pressable>
      )}
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <InsightCard
            insight={item}
            onResolve={() => resolveMutation.mutate(item.id)}
            onSnooze={() => snoozeMutation.mutate(item.id)}
            onAction={(action) => handleInsightAction(action, nav)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

function InsightCard({
  insight,
  onResolve,
  onSnooze,
  onAction
}: {
  insight: Insight;
  onResolve: () => void;
  onSnooze: () => void;
  onAction: (action: InsightAction) => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  return (
    <View style={styles.card}>
      <Text style={styles.type}>{insight.type}</Text>
      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.score}>Score: {insight.score}</Text>
      {insight.severity && (
        <Text
          style={{
            color:
              insight.severity === "high"
                ? "#c00"
                : insight.severity === "medium"
                  ? "#e6a700"
                  : "#00796b",
            fontWeight: "bold"
          }}
        >
          Severity: {insight.severity}
        </Text>
      )}
      {typeof insight.confidence === "number" && (
        <Text style={{ color: "#888" }}>
          Confidence: {(insight.confidence * 100).toFixed(0)}%
        </Text>
      )}
      <Text style={styles.explanation}>{insight.explanation}</Text>
      <Text style={styles.recommendation}>{insight.recommendation}</Text>
      <Text style={styles.date}>{new Date(insight.createdAt).toLocaleString()}</Text>
      {insight.evidence && insight.evidence.length > 0 && (
        <Pressable
          onPress={() => setShowEvidence((e) => !e)}
          style={styles.evidenceToggle}
        >
          <Text style={{ color: "#00796b", fontWeight: "bold" }}>
            {showEvidence ? "Hide" : "View"} Evidence
          </Text>
        </Pressable>
      )}
      {showEvidence && insight.evidence && (
        <View style={styles.evidenceBox}>
          {insight.evidence.map((ev, idx) => (
            <Text key={idx} style={styles.evidenceItem}>
              {ev.metric}: {ev.value}
              {typeof ev.baseline !== "undefined" ? ` (baseline: ${ev.baseline})` : ""}
              {ev.trend ? `, trend: ${ev.trend}` : ""}
            </Text>
          ))}
        </View>
      )}
      {insight.actions && insight.actions.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {insight.actions.map((action, idx) => (
            <Pressable
              key={idx}
              style={styles.actionBtn}
              onPress={() => onAction(action)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {getActionLabel(action)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", marginTop: 10, gap: 8 }}>
        <Pressable style={styles.resolveBtn} onPress={onResolve}>
          <Text style={{ color: "#fff" }}>Resolve</Text>
        </Pressable>
        <Pressable style={styles.snoozeBtn} onPress={onSnooze}>
          <Text style={{ color: "#fff" }}>Snooze</Text>
        </Pressable>
      </View>
      {insight.status && (
        <Text style={{ marginTop: 6, color: "#888" }}>Status: {insight.status}</Text>
      )}
    </View>
  );
}

function getActionLabel(action: InsightAction) {
  switch (action.kind) {
    case "CREATE_TASK":
      return "Create Task";
    case "NAVIGATE":
      return "Go to " + (action.payload.route || "Screen");
    case "ENABLE_AUTOMATION":
      return "Enable Automation";
    default:
      return "Action";
  }
}

function handleInsightAction(action: InsightAction, nav: any) {
  switch (action.kind) {
    case "CREATE_TASK":
      // Could open a create task modal or prefill task creation
      // For now, navigate to tasks screen
      nav.navigate("FacilityTasks", { prefill: action.payload });
      break;
    case "NAVIGATE":
      nav.navigate(action.payload.route, action.payload.params);
      break;
    case "ENABLE_AUTOMATION":
      nav.navigate("AutomationCenter", { policyType: action.payload.policyType });
      break;
    default:
      break;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  card: { backgroundColor: "#f6f6f6", borderRadius: 12, padding: 16, marginBottom: 16 },
  type: { fontWeight: "bold", color: "#3a3a3a" },
  title: { fontSize: 18, fontWeight: "600", marginVertical: 4 },
  score: { fontWeight: "bold", color: "#00796b" },
  explanation: { marginTop: 6, color: "#444" },
  recommendation: { marginTop: 6, fontStyle: "italic", color: "#2e7d32" },
  date: { marginTop: 8, fontSize: 12, color: "#888" },
  evidenceToggle: { marginTop: 8, marginBottom: 4, alignSelf: "flex-start" },
  evidenceBox: { backgroundColor: "#e3f2fd", borderRadius: 8, padding: 8, marginTop: 4 },
  evidenceItem: { color: "#1976d2", fontSize: 14, marginBottom: 2 },
  actionBtn: {
    backgroundColor: "#1976d2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    alignItems: "center"
  },
  resolveBtn: {
    backgroundColor: "#388e3c",
    borderRadius: 8,
    padding: 10,
    flex: 1,
    alignItems: "center"
  },
  snoozeBtn: {
    backgroundColor: "#e6a700",
    borderRadius: 8,
    padding: 10,
    flex: 1,
    alignItems: "center"
  },
  refreshBtn: {
    backgroundColor: "#1976d2",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "flex-start"
  }
});
