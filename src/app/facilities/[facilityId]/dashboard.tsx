import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
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

export default function FacilityDashboard() {
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();

  return (
    <AppPage
      routeKey="facility_ops"
      header={
        <View>
          <Text style={styles.headerTitle}>Facility Dashboard</Text>
          <Text style={styles.headerSubtitle}>facilityId: {facilityId}</Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Next</Text>
        <Text style={styles.cardDesc}>
          Add Rooms / Tasks / Team routes under this facilityId scope.
        </Text>
      </AppCard>
    </AppPage>
  );
}
