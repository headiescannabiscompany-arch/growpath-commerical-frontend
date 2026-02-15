import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform
} from "react-native";

export default function QAScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>QA & Debug Tools</Text>
      <Text style={styles.subtitle}>
        Access advanced QA and debugging tools for commercial accounts.
      </Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Flags</Text>
        {/* Feature flags and toggles will be rendered here */}
        <Text style={styles.placeholder}>No feature flags available.</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mock API Controls</Text>
        {/* Mock API controls will be rendered here */}
        <Text style={styles.placeholder}>No mock API controls available.</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Harness</Text>
        {/* Debug harness will be integrated here */}
        <Text style={styles.placeholder}>No debug tools available.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#F9FAFB"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    marginBottom: 16
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 2px 4px rgba(0,0,0,0.03)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 2
        })
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 6
  },
  placeholder: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8
  }
});
