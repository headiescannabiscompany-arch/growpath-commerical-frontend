import React from "react";
import { StyleSheet, Text, View } from "react-native";

import RequireAuthGate from "@/auth/RequireAuthGate";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import AppPage from "@/components/layout/AppPage";

function AccountModePageContent() {
  return (
    <AppPage
      routeKey="account-mode"
      showBack
      backFallbackHref="/profile"
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Account mode</Text>
          <Text style={styles.title}>Choose Workspace</Text>
          <Text style={styles.subtitle}>
            Pick whether you are acting as yourself, a commercial brand, or a facility
            team before creating records or posting.
          </Text>
        </View>
      }
    >
      <ModeSwitcher />
      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Mode boundaries</Text>
        <Text style={styles.noteText}>
          Personal creates personal grow records and Forum/Q&A posts. Commercial manages
          storefront products, courses, lives, Feed/Campaigns, orders, and analytics.
          Facility manages rooms, operational runs, staff tasks, inventory, sensors,
          compliance, and audit logs.
        </Text>
      </View>
    </AppPage>
  );
}

export default function AccountModePage() {
  return (
    <RequireAuthGate>
      <AccountModePageContent />
    </RequireAuthGate>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  noteCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe3ea",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  noteTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900"
  },
  noteText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 8
  }
});
