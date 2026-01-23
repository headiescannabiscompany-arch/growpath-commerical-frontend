import React from "react";
import { View, Text, StyleSheet, Button, ScrollView, Alert } from "react-native";
import { PLANS, MODES, ROLES } from "../constants/userModes.js";
import { useAuth } from "../context/AuthContext.js";
import { FEATURES, getEntitlement } from "../utils/entitlements.js";

export default function DebugScreen() {
  const {
    user,
    setMode,
    mode,
    updateUser,
    logout,
    setSelectedFacilityId,
    selectedFacilityId,
    facilityFeaturesEnabled,
    setFacilityFeaturesEnabled
  } = useAuth();
  // Feature flag toggles (example: facility features)
  const handleToggleFacilityFeatures = () => {
    setFacilityFeaturesEnabled(!facilityFeaturesEnabled);
    Alert.alert(
      "Facility Features",
      `Facility features are now ${!facilityFeaturesEnabled ? "enabled" : "disabled"}`
    );
  };

  // Mock API toggle (dev only, just a placeholder)
  const [mockApiEnabled, setMockApiEnabled] = React.useState(false);
  const handleToggleMockApi = () => {
    setMockApiEnabled((prev) => !prev);
    Alert.alert(
      "Mock API",
      `Mock API is now ${!mockApiEnabled ? "enabled" : "disabled"}`
    );
  };

  // Test data reset (dev only, just a placeholder)
  const handleResetTestData = () => {
    Alert.alert("Test Data", "Test data reset (not implemented)");
  };

  // Helper: update user role/plan for impersonation
  const impersonate = (updates) => {
    if (!user) return;
    updateUser({ ...user, ...updates });
  };

  // Helper: clear auth and reload
  const handleClearAuth = () => {
    logout();
    Alert.alert("Auth cleared", "You have been logged out.");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Debug QA Harness</Text>
      <Text style={styles.label}>User ID: {user?._id || user?.id || "-"}</Text>
      <Text style={styles.label}>Email: {user?.email || "-"}</Text>
      <Text style={styles.label}>Plan: {user?.plan || "-"}</Text>
      <Text style={styles.label}>Mode: {mode}</Text>
      <Text style={styles.label}>Role: {user?.role || "-"}</Text>
      <Text style={styles.label}>Facility ID: {selectedFacilityId || "-"}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Switch Mode</Text>
        <Button title="Personal" onPress={() => setMode(MODES.PERSONAL)} />
        <Button title="Commercial" onPress={() => setMode(MODES.COMMERCIAL)} />
        <Button title="Facility" onPress={() => setMode(MODES.FACILITY)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Impersonate Test User</Text>
        <Button
          title="Free User"
          onPress={() => impersonate({ plan: PLANS.FREE, role: ROLES.USER })}
        />
        <Button
          title="Pro User"
          onPress={() => impersonate({ plan: PLANS.PRO, role: ROLES.USER })}
        />
        <Button
          title="Commercial Owner"
          onPress={() => impersonate({ plan: PLANS.COMMERCIAL, role: ROLES.OWNER })}
        />
        <Button
          title="Facility Owner"
          onPress={() => impersonate({ plan: PLANS.FACILITY, role: ROLES.OWNER })}
        />
        <Button
          title="Facility Staff"
          onPress={() => impersonate({ plan: PLANS.FACILITY, role: ROLES.STAFF })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Flags & QA Tools</Text>
        <Button
          title={`Facility Features: ${facilityFeaturesEnabled ? "ON" : "OFF"}`}
          onPress={handleToggleFacilityFeatures}
        />
        <Button
          title={`Mock API: ${mockApiEnabled ? "ON" : "OFF"}`}
          onPress={handleToggleMockApi}
        />
        <Button title="Reset Test Data" onPress={handleResetTestData} />
        <Button title="Clear Auth + Reload" onPress={handleClearAuth} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "#fff",
    padding: 24
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 16
  },
  label: {
    fontSize: 16,
    marginBottom: 4
  },
  section: {
    marginTop: 24,
    width: "100%"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8
  }
});
