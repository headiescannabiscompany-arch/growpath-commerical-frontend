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

export default function Orders() {
  return (
    <AppPage
      routeKey="orders"
      header={
        <View>
          <Text style={styles.headerTitle}>Orders</Text>
          <Text style={styles.headerSubtitle}>Track and fulfill orders</Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Order Queue</Text>
        <Text style={styles.cardDesc}>Coming next</Text>
      </AppCard>
    </AppPage>
  );
}
