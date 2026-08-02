import React, { useMemo } from "react";
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
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

export function LoginWorkspaceChoiceContent() {
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createLoginWorkspaceChoiceStyles(palette), [palette]);

  if (!entitlements.ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
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
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Choose where you are working
          </Text>
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

export function createLoginWorkspaceChoiceStyles(palette: ThemePalette) {
  return StyleSheet.create({
    loading: {
      alignItems: "center",
      flex: 1,
      gap: 10,
      justifyContent: "center",
      padding: 24
    },
    loadingText: {
      color: palette.textMuted,
      fontSize: 14,
      fontWeight: "700"
    },
    header: { gap: 6 },
    kicker: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: {
      color: palette.text,
      fontSize: 30,
      fontWeight: "900"
    },
    subtitle: {
      color: palette.textMuted,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 20
    }
  });
}
