import React from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import RequireAuthGate from "@/auth/RequireAuthGate";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import AppPage from "@/components/layout/AppPage";
import { useEntitlements } from "@/entitlements";
import {
  availableWorkspaceModes,
  workspaceHomeHref
} from "@/features/mode/workspaceOptions";

export function LoginWorkspaceChoiceContent() {
  const entitlements = useEntitlements();

  if (!entitlements.ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading your workspaces...</Text>
      </View>
    );
  }

  const availableModes = availableWorkspaceModes(entitlements);
  if (availableModes.length === 1) {
    return (
      <Redirect
        href={
          workspaceHomeHref(
            availableModes[0],
            entitlements.selectedFacilityId || entitlements.facilityId
          ) as any
        }
      />
    );
  }
  const choiceDescription = availableModes.includes("commercial")
    ? "Choose your individual Personal account, Commercial workspace, or shared Facility."
    : "Choose your individual Personal account or shared Facility workspace.";

  return (
    <AppPage
      routeKey="login-workspace"
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Signed in</Text>
          <Text style={styles.title}>Choose where you are working</Text>
          <Text style={styles.subtitle}>
            This login has access to more than one workspace. {choiceDescription} You can
            switch again later from Profile.
          </Text>
        </View>
      }
    >
      <ModeSwitcher availableOnly />
    </AppPage>
  );
}

export default function LoginWorkspaceChoicePage() {
  return (
    <RequireAuthGate>
      <LoginWorkspaceChoiceContent />
    </RequireAuthGate>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 24
  },
  loadingText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700"
  },
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
  }
});
