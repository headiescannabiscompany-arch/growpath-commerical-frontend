import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

export default function StoreIndex() {
  return (
    <AppPage
      routeKey="store"
      header={
        <View>
          <Text style={styles.title}>Store</Text>
          <Text style={styles.subtitle}>
            Open public storefronts or manage your commercial storefront.
          </Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Commercial storefront</Text>
        <Text style={styles.cardText}>
          Storefront setup and product management are available to commercial accounts.
        </Text>
        <Link href="/storefront" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Manage Storefront</Text>
          </Pressable>
        </Link>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Marketplace</Text>
        <Text style={styles.cardText}>
          Browse creator content, templates, courses, and resources.
        </Text>
        <Link href="/marketplace" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Open Marketplace</Text>
          </Pressable>
        </Link>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "800"
  },
  subtitle: {
    color: "#64748B",
    marginTop: 4
  },
  cardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8
  },
  cardText: {
    color: "#475569",
    lineHeight: 20,
    marginBottom: 14
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  secondaryButtonText: {
    color: "#166534",
    fontWeight: "800"
  }
});
