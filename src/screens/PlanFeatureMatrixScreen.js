import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import PrimaryButton from "../components/PrimaryButton.js";
import {
  COMMERCIAL_PLAN_PRICE_DISPLAY,
  FACILITY_PLAN_PRICE_DISPLAY,
  PRO_PLAN_PRICE_DISPLAY
} from "../constants/pricing.js";
import { radius } from "../theme/theme";

const featureMatrix = [
  [
    "Feature / Tool",
    "Free User",
    `Pro Grower (${PRO_PLAN_PRICE_DISPLAY})`,
    `Commercial Partner (${COMMERCIAL_PLAN_PRICE_DISPLAY})`,
    `Facility (${FACILITY_PLAN_PRICE_DISPLAY})`
  ],
  ["Create Courses", "Yes", "Yes", "Yes", "Yes"],
  ["Sell Paid Courses", "Yes*", "Yes", "Yes", "Yes"],
  ["Max Paid Courses", "1", "3-5", "Unlimited", "Unlimited"],
  ["Lessons per Course", "7", "20", "Unlimited", "Unlimited"],
  ["Certificates", "No", "No", "Yes", "Yes"],
  ["Course Analytics", "No", "Basic", "Advanced", "Advanced"],
  ["Education Feed Boost", "No", "Low", "Medium", "Medium"],
  ["Course Approval Required", "Yes*", "Yes*", "No", "No"],
  ["Soil Calculator", "Yes", "Yes", "Yes", "Yes"],
  ["NPK Calculator", "Yes", "Yes", "Yes", "Yes"],
  ["VPD Tool", "Yes", "Yes", "Yes", "Yes"],
  ["Feed Scheduler", "No", "Yes", "Yes", "Yes"],
  ["Harvest Estimator", "No", "Yes", "Yes", "Yes"],
  ["Timeline Planner", "No", "Yes", "Yes", "Yes"],
  ["PDF/CSV Export", "No", "Yes", "Yes", "Yes"],
  ["Pheno Matrix", "No", "Yes", "Yes", "Yes"],
  ["Post Offers", "No", "No", "Yes", "No"],
  ["Advertise Products", "No", "No", "Yes", "No"],
  ["Capture Leads", "No", "No", "Yes", "No"],
  ["Facility Dashboard", "No", "No", "No", "Yes"],
  ["Compliance Tools", "No", "No", "No", "Yes"],
  ["Team Roles", "No", "No", "No", "Yes"],
  ["SOPs", "No", "No", "No", "Yes"],
  ["Audit Logs", "No", "No", "No", "Yes"],
  ["METRC Integration", "No", "No", "No", "Yes"],
  ["Task Verification", "No", "No", "No", "Yes"],
  ["Operational Analytics", "No", "No", "No", "Yes"]
];

export default function PlanFeatureMatrixScreen({ navigation }) {
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
    borderRadius: radius.card,
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
