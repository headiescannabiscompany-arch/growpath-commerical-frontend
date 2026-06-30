import React from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useAutomationPolicies } from "@/hooks/useAutomationPolicies";
import { useEntitlements, CAPABILITY_KEYS } from "@/entitlements";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#FFFFFF" },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 6, color: "#0F172A" },
  subtitle: { color: "#475569", marginBottom: 16, lineHeight: 20 },
  card: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#F8FAFC"
  },
  cardTitle: { fontWeight: "800", fontSize: 15, color: "#0F172A" },
  description: { color: "#475569", marginTop: 4, lineHeight: 19 },
  meta: { color: "#64748B", marginTop: 8, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  button: {
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 8,
    backgroundColor: "#FFFFFF"
  },
  primaryButton: { backgroundColor: "#166534" },
  disabledButton: { opacity: 0.45 },
  buttonText: { fontWeight: "800", color: "#166534" },
  primaryButtonText: { color: "#FFFFFF" },
  empty: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 12,
    color: "#64748B",
    backgroundColor: "#F8FAFC"
  },
  permission: { marginTop: 8, color: "#64748B" }
});

function titleForPolicy(item: any) {
  return item.name || String(item.type || "Automation policy").replace(/_/g, " ");
}

function triggerLabel(item: any) {
  const source = item.trigger?.source || item.config?.trigger?.source;
  const eventType = item.trigger?.eventType || item.type;
  return [source, eventType].filter(Boolean).join(":").replace(/_/g, " ");
}

function actionLabel(item: any) {
  const actions = Array.isArray(item.actions) ? item.actions : item.config?.actions;
  if (!Array.isArray(actions) || !actions.length) return "No actions configured";
  return actions
    .map((action) => String(action?.type || "action").replace(/_/g, " "))
    .join(", ");
}

export default function AutomationCenterScreen() {
  const ent = useEntitlements();
  const canEdit = ent.can(CAPABILITY_KEYS.FACILITY_SETTINGS_EDIT);
  const { data, isLoading, togglePolicy, triggerPolicy, toggling, triggering } =
    useAutomationPolicies();

  const policies = Array.isArray(data) ? data : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Automation Center</Text>
      <Text style={styles.subtitle}>
        Lightweight workflows that keep tasks and compliance on track.
      </Text>

      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={policies}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{titleForPolicy(item)}</Text>
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}
              <Text style={styles.meta}>
                Status: {item.enabled ? "Enabled" : "Disabled"}
              </Text>
              <Text style={styles.meta}>Trigger: {triggerLabel(item) || "Not set"}</Text>
              <Text style={styles.meta}>Actions: {actionLabel(item)}</Text>
              <Text style={styles.meta}>
                Triggered: {item.triggerCount || 0}
                {item.lastTriggeredAt ? ` | Last: ${item.lastTriggeredAt}` : ""}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  disabled={!canEdit || toggling}
                  onPress={() =>
                    canEdit && togglePolicy({ policyId: item.id, enabled: !item.enabled })
                  }
                  style={[
                    styles.button,
                    item.enabled && styles.primaryButton,
                    (!canEdit || toggling) && styles.disabledButton
                  ]}
                >
                  <Text
                    style={[styles.buttonText, item.enabled && styles.primaryButtonText]}
                  >
                    {item.enabled ? "Disable" : "Enable"}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={!canEdit || !item.enabled || triggering}
                  onPress={() =>
                    canEdit &&
                    item.enabled &&
                    triggerPolicy({
                      policyId: item.id,
                      reason: "manual automation center run"
                    })
                  }
                  style={[
                    styles.button,
                    styles.primaryButton,
                    (!canEdit || !item.enabled || triggering) && styles.disabledButton
                  ]}
                >
                  <Text style={[styles.buttonText, styles.primaryButtonText]}>
                    Run Now
                  </Text>
                </Pressable>
              </View>

              {!canEdit && (
                <Text style={styles.permission}>Requires Admin/Owner permissions.</Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No automation policies are configured for this facility.
            </Text>
          }
        />
      )}
    </View>
  );
}
