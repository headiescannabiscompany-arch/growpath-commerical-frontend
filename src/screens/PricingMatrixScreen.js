import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import {
  COMMERCIAL_PLAN_PRICE_DISPLAY,
  FACILITY_PLAN_PRICE_DISPLAY,
  PRO_PLAN_PRICE_DISPLAY
} from "../constants/pricing.js";

const plans = [
  {
    name: "Free",
    price: "$0",
    features: [
      "1 active grow",
      "1 plant in that grow",
      "Manual grow logs",
      "Basic tools (VPD, pH, light targets)",
      "Forum access",
      "Limited AI Diagnose (tokens/soft caps)"
    ]
  },
  {
    name: "Pro Grower",
    price: PRO_PLAN_PRICE_DISPLAY,
    features: [
      "Unlimited grows & plants",
      "Advanced tools (DLI, nutrient calculators, LAWNS)",
      "AI Diagnose (higher quota)",
      "Export logs (PDF/CSV)",
      "Course access (non-creator)"
    ]
  },
  {
    name: "Commercial",
    price: COMMERCIAL_PLAN_PRICE_DISPLAY,
    features: [
      "Brand storefront workspace",
      "Product, batch, and trial evidence tracking",
      "Feed campaigns and advertising",
      "Course and educational content tools",
      "Expanded AI workflows"
    ]
  },
  {
    name: "Facility",
    price: FACILITY_PLAN_PRICE_DISPLAY,
    features: [
      "Multiple rooms/zones",
      "Room-level climate & lighting profiles",
      "Plant counts by room",
      "Task assignment (staff-level)",
      "Audit-ready grow logs",
      "Batch/harvest tracking",
      "Compliance-friendly exports",
      "Role-based access (manager/staff/read-only)",
      "Central calendar across rooms",
      "Unlimited AI diagnostics for facility plants"
    ]
  }
];

export default function PricingMatrixScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>GrowPath Plans & Features</Text>
      <View style={styles.matrix}>
        {plans.map((plan) => (
          <View key={plan.name} style={styles.planBox}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>{plan.price}</Text>
            {plan.features.map((feature, i) => (
              <Text key={i} style={styles.feature}>
                {`\u2022 ${feature}`}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#f9fafb"
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center"
  },
  matrix: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  planBox: {
    flex: 1,
    margin: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2
  },
  planName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#10B981"
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12
  },
  feature: {
    fontSize: 14,
    marginBottom: 4
  }
});
