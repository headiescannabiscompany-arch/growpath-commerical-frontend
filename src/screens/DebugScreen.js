import React, { useContext } from "react";
import { View, Text, StyleSheet, Button, ScrollView } from "react-native";
// Import your AuthContext or similar user context here
// import { AuthContext } from "../AuthContext";
import { PLANS, MODES, ROLES } from "../constants/userModes";

// TODO: Replace with your actual AuthContext
const fakeUser = {
  id: "test-user-1",
  email: "testuser@example.com",
  plan: PLANS.FREE,
  mode: MODES.PERSONAL,
  role: ROLES.USER,
  facilityId: null
};

export default function DebugScreen() {
  // const { user, setUser, setMode, setPlan, setRole, setFacilityId, clearAuth } = useContext(AuthContext);
  // For now, use fakeUser and console.log for actions

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Debug QA Harness</Text>
      <Text style={styles.label}>User ID: {fakeUser.id}</Text>
      <Text style={styles.label}>Email: {fakeUser.email}</Text>
      <Text style={styles.label}>Plan: {fakeUser.plan}</Text>
      <Text style={styles.label}>Mode: {fakeUser.mode}</Text>
      <Text style={styles.label}>Role: {fakeUser.role}</Text>
      <Text style={styles.label}>Facility ID: {fakeUser.facilityId || "-"}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Switch Mode</Text>
        <Button title="Personal" onPress={() => console.log("Switch to personal mode")} />
        <Button
          title="Commercial"
          onPress={() => console.log("Switch to commercial mode")}
        />
        <Button title="Facility" onPress={() => console.log("Switch to facility mode")} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Impersonate Test User</Text>
        <Button title="Free User" onPress={() => console.log("Impersonate Free User")} />
        <Button title="Pro User" onPress={() => console.log("Impersonate Pro User")} />
        <Button
          title="Commercial Owner"
          onPress={() => console.log("Impersonate Commercial Owner")}
        />
        <Button
          title="Facility Owner"
          onPress={() => console.log("Impersonate Facility Owner")}
        />
        <Button
          title="Facility Staff"
          onPress={() => console.log("Impersonate Facility Staff")}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Other Actions</Text>
        <Button
          title="Clear Auth + Reload"
          onPress={() => console.log("Clear auth and reload")}
        />
        <Button title="Toggle Mock API" onPress={() => console.log("Toggle mock API")} />
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
