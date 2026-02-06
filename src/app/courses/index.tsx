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

export default function Courses() {
  return (
    <AppPage
      routeKey="courses"
      header={
        <View>
          <Text style={styles.headerTitle}>Courses</Text>
          <Text style={styles.headerSubtitle}>Learning paths and certifications</Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Course Catalog</Text>
        <Text style={styles.cardDesc}>Stub screen</Text>
      </AppCard>
    </AppPage>
  );
}
