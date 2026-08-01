import React, { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacilityReport } from "@/hooks/useFacilityReport";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

function displayValue(value: unknown, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function displayLabel(value: unknown) {
  return String(value || "unknown")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function FacilityComplianceReportDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { palette } = useAppTheme();
  const styles = useMemo(() => createComplianceReportDetailStyles(palette), [palette]);
  const { data, isLoading, error } = useFacilityReport();
  const report = useMemo<Record<string, any>>(() => data ?? {}, [data]);
  const tasks = report.tasks || {};
  const compliance = report.compliance || {};
  const automation = report.automation || {};
  const team = report.team || {};
  const roleSummary = Object.entries(team.byRole || {});

  return (
    <ScreenBoundary
      title="Compliance Report Detail"
      showBack
      backFallbackHref="/home/facility/compliance"
    >
      {isLoading ? (
        <View style={styles.container}>
          <Text style={styles.status}>Loading report...</Text>
        </View>
      ) : error ? (
        <View style={styles.container}>
          <Text style={styles.error}>Failed to load report.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
            Compliance Report Detail
          </Text>
          <Text style={styles.sub}>Report reference: {String(id || "latest")}</Text>
          {report.generatedAt ? (
            <Text style={styles.generated}>
              Generated {new Date(report.generatedAt).toLocaleString()}
            </Text>
          ) : null}
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Tasks
            </Text>
            <Text style={styles.detail}>
              Total {displayValue(tasks.total)} · Open {displayValue(tasks.open)} ·
              Overdue {displayValue(tasks.overdue)} · Completed in 7 days{" "}
              {displayValue(tasks.completedLast7d)}
            </Text>
          </View>
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Compliance records
            </Text>
            <Text style={styles.detail}>
              Total logs {displayValue(compliance.totalLogs)} · Missed in 7 days{" "}
              {displayValue(compliance.missedLast7d, "Unknown")}
            </Text>
            <Text style={styles.detail}>
              {Object.keys(compliance.byType || {}).length
                ? Object.entries(compliance.byType)
                    .map(([key, value]) => `${displayLabel(key)}: ${value}`)
                    .join(" · ")
                : "No compliance log types recorded."}
            </Text>
          </View>
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Automation
            </Text>
            <Text style={styles.detail}>
              Policies enabled {displayValue(automation.policiesEnabled)} · Triggers in 7
              days {displayValue(automation.triggersLast7d)}
            </Text>
          </View>
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Team
            </Text>
            <Text style={styles.detail}>
              Total members {displayValue(team.totalMembers)}
            </Text>
            <Text style={styles.detail}>
              {roleSummary.length
                ? roleSummary
                    .map(([role, count]) => `${displayLabel(role)}: ${count}`)
                    .join(" · ")
                : "No role breakdown recorded."}
            </Text>
          </View>
        </ScrollView>
      )}
    </ScreenBoundary>
  );
}

export function createComplianceReportDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 16, gap: 10, backgroundColor: palette.page },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    sub: { color: palette.textMuted },
    generated: { color: palette.textSoft, fontSize: 12, fontWeight: "700" },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      gap: 6,
      backgroundColor: palette.card
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    detail: { color: palette.textMuted, lineHeight: 19 },
    status: { color: palette.text },
    error: { color: palette.danger, fontWeight: "700" }
  });
}
