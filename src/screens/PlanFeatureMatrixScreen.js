import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import PrimaryButton from "../components/PrimaryButton.js";

const featureMatrix = [
  [
    "Feature / Tool",
    "Free User",
    "Pro Grower ($10/mo)",
    "Creator Plus ($25/mo)",
    "Commercial Partner ($50/mo)",
    "Facility ($50/mo)"
  ],
  ["Create Courses", "✅", "✅", "✅", "✅", "✅"],
  ["Sell Paid Courses", "✅*", "✅", "✅", "✅", "✅"],
  ["Max Paid Courses", "1", "3–5", "Unlimited", "Unlimited", "Unlimited"],
  ["Lessons per Course", "7", "20", "Unlimited", "Unlimited", "Unlimited"],
  ["Certificates", "❌", "❌", "✅", "✅", "✅"],
  ["Course Analytics", "❌", "Basic", "Advanced", "Advanced", "Advanced"],
  ["Education Feed Boost", "❌", "Low", "Medium", "Medium", "Medium"],
  ["Course Approval Required", "Yes*", "Yes*", "No", "No", "No"],
  ["Soil Calculator", "✅", "✅", "✅", "✅", "✅"],
  ["NPK Calculator", "✅", "✅", "✅", "✅", "✅"],
  ["VPD Tool", "✅", "✅", "✅", "✅", "✅"],
  ["Feed Scheduler", "❌", "✅", "✅", "✅", "✅"],
  ["Harvest Estimator", "❌", "✅", "✅", "✅", "✅"],
  ["Timeline Planner", "❌", "✅", "✅", "✅", "✅"],
  ["PDF/CSV Export", "❌", "✅", "✅", "✅", "✅"],
  ["Pheno Matrix", "❌", "✅", "✅", "✅", "✅"],
  ["Post Offers", "❌", "❌", "❌", "✅", "❌"],
  ["Advertise Products", "❌", "❌", "❌", "✅", "❌"],
  ["Capture Leads", "❌", "❌", "❌", "✅", "❌"],
  ["Facility Dashboard", "❌", "❌", "❌", "❌", "✅"],
  ["Compliance Tools", "❌", "❌", "❌", "❌", "✅"],
  ["Team Roles", "❌", "❌", "❌", "❌", "✅"],
  ["SOPs", "❌", "❌", "❌", "❌", "✅"],
  ["Audit Logs", "❌", "❌", "❌", "❌", "✅"],
  ["METRC Integration", "❌", "❌", "❌", "❌", "✅"],
  ["Task Verification", "❌", "❌", "❌", "❌", "✅"],
  ["Operational Analytics", "❌", "❌", "❌", "❌", "✅"]
];

export default function PlanFeatureMatrixScreen({ navigation, route }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Compare GrowPath Plans</Text>
      <View style={styles.table}>
        {featureMatrix.map((row, i) => (
          <View key={i} style={[styles.row, i === 0 && styles.headerRow]}>
            {row.map((cell, j) => (
              <View
                key={j}
                style={[styles.cell, i === 0 ? styles.headerCell : styles.bodyCell]}
              >
                <Text style={i === 0 ? styles.headerText : styles.bodyText}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.note}>
        *Free/pro users: First course requires approval. Paid course limit and lesson cap
        apply. All plans: 15% platform fee on course sales.
      </Text>
      <PrimaryButton
        title="Choose Plan"
        onPress={() => navigation?.navigate?.("RegisterScreen")}
        style={{ marginTop: 18 }}
        disabled={false}
      >
        <Text>Choose Plan</Text>
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  content: {
    padding: 20,
    alignItems: "center"
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 18,
    textAlign: "center"
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden"
  },
  row: {
    flexDirection: "row"
  },
  headerRow: {
    backgroundColor: "#F0FDF4"
  },
  cell: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb"
  },
  headerCell: {
    backgroundColor: "#F0FDF4"
  },
  bodyCell: {
    backgroundColor: "#fff"
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 13,
    color: "#10B981",
    textAlign: "center"
  },
  bodyText: {
    fontSize: 13,
    color: "#222",
    textAlign: "center"
  },
  note: {
    marginTop: 18,
    fontSize: 12,
    color: "#666",
    textAlign: "center"
  }
});
