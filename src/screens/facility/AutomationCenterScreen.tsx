import React from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useAutomationPolicies } from "../../hooks/useAutomationPolicies";
import { useFacilityPermissions } from "../../permissions/useFacilityPermissions";

function label(type: string) {
  switch (type) {
    case "TASK_OVERDUE_ESCALATION":
      return "Overdue Task Escalation";
    case "TASK_STALE_REMINDER":
      return "Stale Task Reminders";
    case "COMPLIANCE_DAILY_REQUIRED":
      return "Daily Compliance Required";
    case "COMPLIANCE_WEEKLY_REQUIRED":
      return "Weekly Compliance Required";
    default:
      return type;
  }
}

export default function AutomationCenterScreen() {
  const { can } = useFacilityPermissions();
  const canEdit = can("facility.settings.edit");
  const { data, isLoading, togglePolicy } = useAutomationPolicies();

  const policies = Array.isArray(data) ? data : [];

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>
        Automation Center
      </Text>
      <Text style={{ opacity: 0.75, marginBottom: 16 }}>
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
            <View
              style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }}
            >
              <Text style={{ fontWeight: "800" }}>{label(item.type)}</Text>
              <Text style={{ opacity: 0.7, marginTop: 4 }}>
                Status: {item.enabled ? "Enabled" : "Disabled"}
              </Text>

              <Pressable
                onPress={() =>
                  canEdit && togglePolicy({ policyId: item.id, enabled: !item.enabled })
                }
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  opacity: canEdit ? 1 : 0.4,
                  alignSelf: "flex-start"
                }}
              >
                <Text style={{ fontWeight: "700" }}>
                  {item.enabled ? "Disable" : "Enable"}
                </Text>
              </Pressable>

              {!canEdit && (
                <Text style={{ marginTop: 8, opacity: 0.6 }}>
                  Requires Admin/Owner permissions.
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
