import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useEntitlements } from "../../context/EntitlementsContext";

export default function FacilityHomeScreen() {
  const nav = useNavigation<any>();
  const { selectedFacilityId } = useEntitlements();

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Facility Dashboard</Text>
      <Text style={{ opacity: 0.7 }}>Facility ID: {selectedFacilityId}</Text>

      <Pressable
        onPress={() => nav.navigate("FacilityDashboard")}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Reporting Dashboard</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          Facility health, compliance, team, automation
        </Text>
      </Pressable>

      <Pressable
        onPress={() => nav.navigate("FacilityTasks")}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Go to Tasks</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          Work orders, due items, assignments
        </Text>
      </Pressable>

      <Pressable
        onPress={() => nav.navigate("FacilityTeam")}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Go to Team</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>Members, roles, invitations</Text>
      </Pressable>

      <Pressable
        onPress={() => nav.navigate("ComplianceLogs")}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Compliance Logs</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          Auditable logs, sign-offs, inspections
        </Text>
      </Pressable>

      <Pressable
        onPress={() => nav.navigate("AutomationCenter")}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Automation Center</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          Task SLAs, compliance schedules, reminders
        </Text>
      </Pressable>

      <Pressable
        onPress={() => nav.navigate("NotificationsCenter")}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Notifications</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          All activity, automation, and alerts
        </Text>
      </Pressable>

      <Pressable
        onPress={() => nav.navigate("Insights")}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Insights (Advanced Analytics)</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          Risk, efficiency, compliance, automation
        </Text>
      </Pressable>

      <Pressable
        onPress={() => nav.navigate("Webhooks")}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Integrations (Webhooks)</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          Connect GrowPath to Slack, Zapier, email, more
        </Text>
      </Pressable>

      <Pressable
        onPress={() => nav.navigate("FacilitySettings")}
        style={{ padding: 14, borderRadius: 12, borderWidth: 1 }}
      >
        <Text style={{ fontWeight: "600" }}>Facility Settings</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          Switch facility, exit facility mode
        </Text>
      </Pressable>
    </View>
  );
}
