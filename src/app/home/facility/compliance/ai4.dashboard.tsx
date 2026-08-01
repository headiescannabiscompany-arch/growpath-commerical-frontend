import React, { useMemo } from "react";
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

function Metric({ label, value }: { label: string; value: unknown }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createComplianceAiDashboardStyles(palette), [palette]);
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{displayValue(value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function FacilityComplianceAiDashboardRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createComplianceAiDashboardStyles(palette), [palette]);
  const { data, isLoading, error } = useFacilityReport();
  const summary = useMemo<Record<string, any>>(() => data ?? {}, [data]);
  const tasks = summary.tasks || {};
  const compliance = summary.compliance || {};
  const automation = summary.automation || {};
  const team = summary.team || {};
  const roles = Object.entries(team.byRole || {});
  const hasStructuredMetrics = Boolean(
    summary.tasks || summary.compliance || summary.automation || summary.team
  );

  return (
    <ScreenBoundary
      title="Compliance AI Dashboard"
      showBack
      backFallbackHref="/home/facility/compliance"
    >
      {isLoading ? (
        <View style={styles.container}>
          <Text style={styles.status}>Loading AI dashboard...</Text>
        </View>
      ) : error ? (
        <View style={styles.container}>
          <Text style={styles.error}>Failed to load AI dashboard.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
            Compliance AI Dashboard
          </Text>
          <Text style={styles.sub}>
            Live report-derived status for compliance operations.
          </Text>
          {summary.generatedAt ? (
            <Text style={styles.generated}>
              Generated {new Date(summary.generatedAt).toLocaleString()}
            </Text>
          ) : null}
          {summary.status ? (
            <View style={styles.statusCard}>
              <Text style={styles.cardTitle}>Report status</Text>
              <Text style={styles.statusValue}>{displayLabel(summary.status)}</Text>
            </View>
          ) : null}
          {hasStructuredMetrics ? (
            <View style={styles.grid}>
              <View style={styles.card}>
                <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                  Tasks
                </Text>
                <View style={styles.metricGrid}>
                  <Metric label="Total" value={tasks.total} />
                  <Metric label="Open" value={tasks.open} />
                  <Metric label="Overdue" value={tasks.overdue} />
                  <Metric label="Completed in 7 days" value={tasks.completedLast7d} />
                </View>
              </View>
              <View style={styles.card}>
                <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                  Compliance records
                </Text>
                <View style={styles.metricGrid}>
                  <Metric label="Total logs" value={compliance.totalLogs} />
                  <Metric
                    label="Missed in 7 days"
                    value={compliance.missedLast7d ?? "Unknown"}
                  />
                </View>
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
                <View style={styles.metricGrid}>
                  <Metric label="Policies enabled" value={automation.policiesEnabled} />
                  <Metric label="Triggers in 7 days" value={automation.triggersLast7d} />
                </View>
              </View>
              <View style={styles.card}>
                <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                  Team
                </Text>
                <View style={styles.metricGrid}>
                  <Metric label="Total members" value={team.totalMembers} />
                </View>
                <Text style={styles.detail}>
                  {roles.length
                    ? roles
                        .map(([role, count]) => `${displayLabel(role)}: ${count}`)
                        .join(" · ")
                    : "No role breakdown recorded."}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>
              No structured compliance metrics were returned.
            </Text>
          )}
        </ScrollView>
      )}
    </ScreenBoundary>
  );
}

export function createComplianceAiDashboardStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 16, gap: 10, backgroundColor: palette.page },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    sub: { color: palette.textMuted },
    generated: { color: palette.textSoft, fontSize: 12, fontWeight: "700" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: {
      flexBasis: 280,
      flexGrow: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      gap: 10,
      backgroundColor: palette.card
    },
    statusCard: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      padding: 12,
      backgroundColor: palette.surfaceMuted
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    statusValue: { color: palette.success, fontWeight: "900", marginTop: 4 },
    metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    metric: { minWidth: 110, flexGrow: 1 },
    metricValue: { color: palette.text, fontSize: 20, fontWeight: "900" },
    metricLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    detail: { color: palette.textMuted, lineHeight: 19 },
    status: { color: palette.text },
    error: { color: palette.danger, fontWeight: "700" },
    empty: { color: palette.textMuted, fontWeight: "700" }
  });
}
