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

export default function Storefront() {
  return (
    <AppPage
      routeKey="storefront"
      header={
        <View>
          <Text style={styles.headerTitle}>Storefront</Text>
          <Text style={styles.headerSubtitle}>Manage your storefront</Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Storefront Setup</Text>
        <Text style={styles.cardDesc}>Coming next</Text>
      </AppCard>
    </AppPage>
  );
}
