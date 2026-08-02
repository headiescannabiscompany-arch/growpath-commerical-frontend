import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import RequireAuthGate from "@/auth/RequireAuthGate";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import AppPage from "@/components/layout/AppPage";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

function AccountModePageContent() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createAccountModeStyles(palette), [palette]);
  return (
    <AppPage
      routeKey="account-mode"
      showBack
      backFallbackHref="/profile"
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Account mode</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Choose Workspace
          </Text>
          <Text style={styles.subtitle}>
            Pick whether you are acting as yourself, a commercial brand, or a facility
            team before creating records or posting.
          </Text>
        </View>
      }
    >
      <ModeSwitcher />
      <ThemeModeSelector />
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

export function createAccountModeStyles(palette: ThemePalette) {
  return StyleSheet.create({
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
    },
    noteCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 16
    },
    noteTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "900"
    },
    noteText: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      marginTop: 8
    }
  });
}
