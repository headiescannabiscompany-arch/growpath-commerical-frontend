import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";

export default function AnalyticsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Track views, enrollments, and revenue for your organization.
      </Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        {/* Analytics summary will be rendered here */}
        <Text style={styles.placeholder}>Views: 0 · Enrollments: 0 · Revenue: $0</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reports & Export</Text>
        {/* Export/reporting features will be added here */}
        <Text style={styles.placeholder}>No reports available.</Text>
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
    // Use boxShadow for web, shadow* for native
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 2px 4px rgba(0,0,0,0.03)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.03,
          shadowRadius: 2,
          elevation: 1
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
