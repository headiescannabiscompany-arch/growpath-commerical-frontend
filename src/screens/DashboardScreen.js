import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import AppShell from "../components/AppShell.js";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { colors, radius, spacing } from "../theme/theme.js";

function DashboardAction({ label, description, onPress, disabled }) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionCard, disabled && styles.actionCardDisabled]}
    >
      <Text style={styles.actionTitle}>{label}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const entitlements = useEntitlements();
  const analyticsEnabled = entitlements.can(CAPABILITY_KEYS.DASHBOARD_ANALYTICS);
  const exportEnabled = entitlements.can(CAPABILITY_KEYS.DASHBOARD_EXPORT);

  const goTo = (route) => {
    if (navigation?.navigate) {
      navigation.navigate(route);
    }
  };

  return (
    <AppShell style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Personal Workspace</Text>
        <Text style={styles.greeting}>Grower Dashboard</Text>
        <Text style={styles.subtitle}>
          Track grows, open tools, review tasks, and use Forum/Q&A for discussion.
          Feed placements here are promotional campaigns from commercial and facility
          accounts.
        </Text>
      </View>

      <PersonalFeedPlacement placement="top" routeKey="personal_dashboard" longContent />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Main Actions</Text>
        <View style={styles.grid}>
          <DashboardAction
            label="My Grows"
            description="Open active grows, plants, notes, photos, and stage context."
            onPress={() => goTo("Grows")}
          />
          <DashboardAction
            label="Open Tools"
            description="Use VPD, NPK, soil, IPM, pheno, and harvest workflows."
            onPress={() => goTo("Tools")}
          />
          <DashboardAction
            label="Schedule / Agenda"
            description="See grow tasks, course work, reminders, and live events."
            onPress={() => goTo("Calendar")}
          />
          <DashboardAction
            label="Forum / Q&A"
            description="Ask grow questions and discuss products, courses, and lives."
            onPress={() => goTo("Community")}
          />
        </View>
      </View>

      <PersonalFeedPlacement placement="middle" routeKey="personal_dashboard" longContent />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Workflow Status</Text>
        <View style={styles.statusList}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>AI and tools</Text>
            <Text style={styles.statusValue}>Use tool outputs as grow/task context</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Forum</Text>
            <Text style={styles.statusValue}>Discussion and Q&A only</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Campaign feed</Text>
            <Text style={styles.statusValue}>Ads, outreach, products, courses, lives</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plan Controls</Text>
        <View style={styles.grid}>
          <DashboardAction
            label={analyticsEnabled ? "View Analytics" : "Analytics Locked"}
            description="Review grow consistency, task completion, and tracked activity."
            onPress={() => goTo("Analytics")}
            disabled={!analyticsEnabled}
          />
          <DashboardAction
            label={exportEnabled ? "Export Data" : "Export Locked"}
            description="Export grow records and connected workflow history."
            onPress={() => goTo("Profile")}
            disabled={!exportEnabled}
          />
        </View>
      </View>

      <PersonalFeedPlacement placement="bottom" routeKey="personal_dashboard" longContent />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F1F5F9"
  },
  header: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(2)
  },
  kicker: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: spacing(1)
  },
  greeting: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: spacing(1)
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 760
  },
  section: {
    paddingHorizontal: spacing(4),
    marginTop: spacing(4)
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing(2)
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2)
  },
  actionCard: {
    backgroundColor: colors.card,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: 240,
    flexGrow: 1,
    minHeight: 118,
    padding: spacing(3)
  },
  actionCardDisabled: {
    opacity: 0.56
  },
  actionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing(1)
  },
  actionDescription: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 19
  },
  statusList: {
    backgroundColor: colors.card,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden"
  },
  statusRow: {
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: 1,
    gap: spacing(0.5),
    padding: spacing(3)
  },
  statusLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  statusValue: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18
  }
});
