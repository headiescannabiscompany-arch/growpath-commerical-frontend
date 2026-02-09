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

import { LegacyFacilityRouteShim } from "@/features/routing/LegacyFacilityRouteShim";

export default function LegacyFacilityTasks() {
  return <LegacyFacilityRouteShim section="tasks" />;
}
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  return (
    <AppPage
      routeKey="facility_ops"
      header={
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSubtitle}>facilityId: {facilityId}</Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Task Queue</Text>
        <Text style={styles.cardDesc}>Stub screen</Text>
      </AppCard>
    </AppPage>
  );
}
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

import { LegacyFacilityRouteShim } from "@/features/routing/LegacyFacilityRouteShim";

export default function LegacyFacilityTasks() {
  return <LegacyFacilityRouteShim section="tasks" />;
}
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  return (
    <AppPage
      routeKey="facility_ops"
      header={
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSubtitle}>facilityId: {facilityId}</Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Task Queue</Text>
        <Text style={styles.cardDesc}>Stub screen</Text>
      </AppCard>
    </AppPage>
  );
}
