import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useFacility } from "../../facility/FacilityProvider";
import { can } from "../../facility/roleGates";
import { handleApiError } from "../../ui/handleApiError";

const SettingsScreen = ({ navigation }) => {
  const { activeFacilityId, facilityRole, resetFacility } = useFacility();
  const handlers = useMemo(
    () => ({
      onAuthRequired: () => {
        // TODO: logout + route to login
        console.log("AUTH_REQUIRED: route to login");
      },
      onFacilityDenied: () => {
        Alert.alert("No Access", "You don't have access to this facility.");
      },
      toast: (msg) => Alert.alert("Notice", msg)
    }),
    []
  );

  // Facility not selected
  if (!activeFacilityId) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.infoText}>Select a facility to view facility settings.</Text>
        </View>
      </View>
    );
  }

  // NOTE:
  // Billing + Metrc endpoints are intentionally NOT called here unless they are part of the frozen v1 API contract.
  // This prevents drift and "phantom" feature work.

  const allowTeamInvite = can(facilityRole, "TEAM_INVITE");

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            // Reset facility session; auth provider should handle token clearing separately.
            if (typeof resetFacility === "function") await resetFacility();
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          } catch (e) {
            handleApiError(e, handlers);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Facility Settings */}
      <View style={styles.card}>
        <Text style={styles.title}>Facility Settings</Text>
        <Text style={styles.subtitle}>Contract-locked v1 settings</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Facility Role</Text>
          <Text style={styles.value}>{facilityRole || "Unknown"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Facility</Text>
          <Text style={styles.value}>{activeFacilityId}</Text>
        </View>

        {allowTeamInvite ? (
          <TouchableOpacity
            style={[styles.button, { marginTop: 12 }]}
            onPress={() => navigation.navigate("TeamScreen")}
          >
            <Text style={styles.buttonText}>Manage Team</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, { marginTop: 12 }]}
            onPress={() => navigation.navigate("TeamScreen")}
          >
            <Text style={styles.buttonText}>View Team</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Metrc */}
      <View style={styles.card}>
        <Text style={styles.title}>Metrc Connection</Text>
        <Text style={styles.infoText}>
          Metrc integration is not enabled unless its endpoints are included in the frozen v1 contract.
        </Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: 12 }]}
          onPress={() => navigation.navigate("Verification")}
        >
          <Text style={styles.buttonText}>Open Metrc Setup</Text>
        </TouchableOpacity>
      </View>

      {/* Billing */}
      <View style={styles.card}>
        <Text style={styles.title}>Facility Billing</Text>
        <Text style={styles.infoText}>
          Billing actions require canonical backend endpoints (checkout/cancel/status) to be part of the v1 contract.
        </Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: 12 }]}
          onPress={() => navigation.navigate("BillingAndReporting")}
        >
          <Text style={styles.buttonText}>Billing & Reporting</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Links */}
      <View style={styles.card}>
        <Text style={styles.title}>Quick Links</Text>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("SOPTemplates")}>
          <Text style={styles.buttonText}>SOP Templates</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("AuditLog")}>
          <Text style={styles.buttonText}>Audit Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("BillingAndReporting")}
        >
          <Text style={styles.buttonText}>Billing & Reporting</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      {/* Status */}
      <View style={styles.card}>
        <Text style={styles.title}>Workspace Status</Text>
        <Text style={styles.infoText}>
          Facility workspace is v1. Current focus: rooms, tasks, team, grows, plants, inventory, growlogs.
          Compliance/reporting integrations come only after endpoints are frozen into the contract.
        </Text>
      </View>
    </View>
  );
};
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 2
  },
  title: { fontSize: 18, fontWeight: "600", color: "#1f2937", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6b7280", marginBottom: 12, fontWeight: "500" },
  section: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12, marginTop: 12 },
  label: { fontSize: 13, color: "#6b7280", fontWeight: "500", marginBottom: 4 },
  value: { fontSize: 14, color: "#1f2937", fontWeight: "600" },
  button: {
    backgroundColor: "#0ea5e9",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: "center"
  },
  logoutButton: { backgroundColor: "#ef4444" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  infoText: { fontSize: 14, color: "#374151", lineHeight: 20 }
});

export default SettingsScreen;
