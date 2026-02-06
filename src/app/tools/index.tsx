import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AppPage from "@/components/layout/AppPage";
import AppCard from "@/components/layout/AppCard";

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6
  },
  cardDesc: {
    fontSize: 14,
    color: "#475569"
  }
});

export default function Tools() {
  return (
    <AppPage
      routeKey="tools"
      header={
        <View>
          <Text style={styles.headerTitle}>Tools</Text>
          <Text style={styles.headerSubtitle}>Calculators and grow utilities</Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>VPD, NPK, Soil, and Harvest Tools</Text>
        <Text style={styles.cardDesc}>
          This is the tools hub shell. Add calculators and quick links here.
        </Text>
      </AppCard>
    </AppPage>
  );
}
