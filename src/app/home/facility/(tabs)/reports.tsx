import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { getFacilityComplianceExport } from "@/api/complianceExport";
import { getFacilityReport } from "@/api/reports";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import type { FacilityReport } from "@/types/report";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

const EXPORT_COUNT_LABELS: Array<[string, string]> = [
  ["facility", "Facility"],
  ["members", "Team"],
  ["rooms", "Rooms"],
  ["equipment", "Equipment"],
  ["batchCycles", "Batches"],
  ["plants", "Plants"],
  ["growLogs", "Grow logs"],
  ["inventoryItems", "Inventory"],
  ["complianceLogs", "Compliance logs"],
  ["auditLogs", "Audit logs"],
  ["deviations", "Deviations"],
  ["verifications", "Verifications"],
  ["sopTemplates", "SOP templates"],
  ["sopRuns", "SOP runs"],
  ["metrcCredentialStatus", "METRC status"],
  ["metrcPlants", "METRC plants"],
  ["metrcPackages", "METRC packages"],
  ["metrcTransfers", "METRC transfers"]
];

type ExportSummary = {
  filename: string;
  generatedAt: string;
  totalRecords: number;
  counts: Record<string, number>;
  readiness: {
    status: "Ready" | "Needs cleanup" | "Action required";
    tone: "ok" | "warn" | "danger";
    issues: string[];
  };
  sopEvidence?: {
    totalRuns: number;
    completedRuns: number;
    inProgressRuns: number;
    totalSteps: number;
    doneSteps: number;
    skippedSteps: number;
    pendingSteps: number;
    runsMissingSteps: number;
  };
  deviationEvidence?: {
    totalDeviations: number;
    openDeviations: number;
    resolvedDeviations: number;
    cancelledDeviations: number;
  };
};

export function buildReadinessSummary(
  counts: Record<string, number>,
  sopEvidence: ExportSummary["sopEvidence"],
  deviationEvidence?: ExportSummary["deviationEvidence"]
): ExportSummary["readiness"] {
  const issues: string[] = [];
  const openDeviations = Number(
    deviationEvidence?.openDeviations ?? counts.deviations ?? 0
  );
  const pendingSteps = Number(sopEvidence?.pendingSteps || 0);
  const runsMissingSteps = Number(sopEvidence?.runsMissingSteps || 0);

  if (openDeviations > 0) {
    issues.push(`${openDeviations} open deviation record(s) in packet`);
  }
  if (pendingSteps > 0) issues.push(`${pendingSteps} SOP checklist step(s) pending`);
  if (runsMissingSteps > 0) {
    issues.push(`${runsMissingSteps} SOP run(s) missing checklist evidence`);
  }
  if (Number(counts.auditLogs || 0) === 0) issues.push("No audit events exported");
  if (Number(counts.sopRuns || 0) === 0) issues.push("No SOP runs exported");

  if (!issues.length) {
    return {
      status: "Ready",
      tone: "ok",
      issues: ["Packet has audit, SOP, and compliance evidence coverage."]
    };
  }

  const critical =
    pendingSteps > 0 || runsMissingSteps > 0 || Number(counts.auditLogs || 0) === 0;
  return {
    status: critical ? "Action required" : "Needs cleanup",
    tone: critical ? "danger" : "warn",
    issues
  };
}

function StatTile({
  label,
  value,
  detail
}: {
  label: string;
  value: number | string;
  detail?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{String(value)}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {detail ? <Text style={styles.tileDetail}>{detail}</Text> : null}
    </View>
  );
}

export function formatMissedComplianceCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : "Not tracked";
}

export function facilityComplianceExportFilename(
  facilityName: unknown,
  facilityId?: string | null
) {
  const candidate = String(facilityName || "").trim();
  const readableName =
    candidate && candidate !== facilityId ? candidate : "selected-facility";
  const slug = readableName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "selected-facility"}-compliance-export.json`;
}

export function facilityComplianceExportFilenameFromSources(
  packetFacilityName: unknown,
  selectedFacilityName: unknown,
  facilityId?: string | null
) {
  const packetName = String(packetFacilityName || "").trim();
  return facilityComplianceExportFilename(packetName || selectedFacilityName, facilityId);
}

export default function FacilityReportsTab() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const entitlements = useEntitlements();
  const canExportCompliance = Boolean(
    entitlements.can?.(CAPABILITY_KEYS.EXPORT_COMPLIANCE)
  );
  const { selectedId: facilityId, selected: selectedFacility } = useFacility();
  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [report, setReport] = useState<FacilityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState("");
  const [exportSummary, setExportSummary] = useState<ExportSummary | null>(null);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      try {
        clearError();
        setReport(await getFacilityReport(facilityId));
      } catch (e) {
        handleApiError(e);
        setReport(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearError, facilityId, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  async function exportCompliancePacket() {
    if (!facilityId || exporting || !canExportCompliance) return;
    setExporting(true);
    setExportFeedback("");
    try {
      clearError();
      const packet = await getFacilityComplianceExport(facilityId);
      const filename = facilityComplianceExportFilenameFromSources(
        packet.facilityName,
        selectedFacility?.name,
        facilityId
      );
      const json = JSON.stringify(packet, null, 2);
      const counts = packet.counts || {};
      const totalRecords = Object.values(counts).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );

      setExportSummary({
        filename,
        generatedAt: packet.generatedAt,
        totalRecords,
        counts,
        readiness: buildReadinessSummary(
          counts,
          packet.evidenceSummary?.sopRuns,
          packet.evidenceSummary?.deviations
        ),
        sopEvidence: packet.evidenceSummary?.sopRuns,
        deviationEvidence: packet.evidenceSummary?.deviations
      });

      if (typeof document !== "undefined") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setExportFeedback(`Export ready: ${filename}`);
      } else {
        setExportFeedback(`Export ready with ${totalRecords} records.`);
      }
    } catch (e) {
      handleApiError(e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScreenBoundary title="Reports">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        <View style={styles.headerRow}>
          <View>
            <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
              Facility Reports
            </Text>
            <Text style={styles.muted}>Summary from the facility reports endpoint.</Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh facility reports"
              style={styles.button}
              onPress={() => load({ refresh: true })}
            >
              <Text style={styles.buttonText}>Refresh</Text>
            </Pressable>
            {canExportCompliance ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Export compliance packet"
                style={[styles.button, exporting ? styles.buttonDisabled : null]}
                disabled={exporting}
                onPress={exportCompliancePacket}
              >
                <Text style={styles.buttonText}>
                  {exporting ? "Exporting..." : "Export"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {exportFeedback ? <Text style={styles.success}>{exportFeedback}</Text> : null}

        {exportSummary ? (
          <View style={styles.card}>
            <View style={styles.exportHeader}>
              <View>
                <Text style={styles.cardTitle}>Export packet coverage</Text>
                <Text style={styles.muted}>
                  {exportSummary.totalRecords} records | generated{" "}
                  {new Date(exportSummary.generatedAt).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.fileName}>{exportSummary.filename}</Text>
            </View>
            <View
              style={[
                styles.readinessPanel,
                exportSummary.readiness.tone === "ok" && styles.readinessOk,
                exportSummary.readiness.tone === "warn" && styles.readinessWarn,
                exportSummary.readiness.tone === "danger" && styles.readinessDanger
              ]}
            >
              <Text style={styles.readinessTitle}>
                Inspection readiness: {exportSummary.readiness.status}
              </Text>
              {exportSummary.readiness.issues.map((issue) => (
                <Text key={issue} style={styles.readinessIssue}>
                  {issue}
                </Text>
              ))}
              <View style={styles.nextActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open AI readiness from export"
                  style={styles.secondaryButton}
                  onPress={() =>
                    router.push("/home/facility/ai-ask?preset=compliance" as any)
                  }
                >
                  <Text style={styles.secondaryButtonText}>AI readiness</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open compliance cleanup from export"
                  style={styles.secondaryButton}
                  onPress={() => router.push("/home/facility/compliance" as any)}
                >
                  <Text style={styles.secondaryButtonText}>Compliance</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open SOP runs from export"
                  style={styles.secondaryButton}
                  onPress={() => router.push("/home/facility/sop-runs" as any)}
                >
                  <Text style={styles.secondaryButtonText}>SOP runs</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.grid}>
              {EXPORT_COUNT_LABELS.map(([key, label]) => (
                <StatTile
                  key={key}
                  label={label}
                  value={exportSummary.counts[key] ?? 0}
                />
              ))}
            </View>
            {exportSummary.sopEvidence ? (
              <View style={styles.evidencePanel}>
                <Text style={styles.evidenceTitle}>SOP evidence readiness</Text>
                <View style={styles.grid}>
                  <StatTile
                    label="Completed runs"
                    value={exportSummary.sopEvidence.completedRuns}
                    detail={`${exportSummary.sopEvidence.totalRuns} total`}
                  />
                  <StatTile
                    label="Done steps"
                    value={exportSummary.sopEvidence.doneSteps}
                    detail={`${exportSummary.sopEvidence.totalSteps} total`}
                  />
                  <StatTile
                    label="Skipped"
                    value={exportSummary.sopEvidence.skippedSteps}
                  />
                  <StatTile
                    label="Pending"
                    value={exportSummary.sopEvidence.pendingSteps}
                  />
                  <StatTile
                    label="Missing steps"
                    value={exportSummary.sopEvidence.runsMissingSteps}
                    detail="runs without checklist evidence"
                  />
                </View>
              </View>
            ) : null}
            {exportSummary.deviationEvidence ? (
              <View style={styles.evidencePanel}>
                <Text style={styles.evidenceTitle}>Deviation evidence status</Text>
                <View style={styles.grid}>
                  <StatTile
                    label="Total deviations"
                    value={exportSummary.deviationEvidence.totalDeviations}
                  />
                  <StatTile
                    label="Open deviations"
                    value={exportSummary.deviationEvidence.openDeviations}
                  />
                  <StatTile
                    label="Resolved deviations"
                    value={exportSummary.deviationEvidence.resolvedDeviations}
                  />
                  <StatTile
                    label="Cancelled deviations"
                    value={exportSummary.deviationEvidence.cancelledDeviations}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading report...</Text>
          </View>
        ) : null}

        {!loading && !report ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No report available</Text>
            <Text style={styles.muted}>The backend did not return a report summary.</Text>
          </View>
        ) : null}

        {report ? (
          <>
            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                Tasks
              </Text>
              <View style={styles.grid}>
                <StatTile label="Total" value={report.tasks?.total ?? 0} />
                <StatTile label="Open" value={report.tasks?.open ?? 0} />
                <StatTile label="Overdue" value={report.tasks?.overdue ?? 0} />
                <StatTile
                  label="Completed"
                  value={report.tasks?.completedLast7d ?? 0}
                  detail="last 7 days"
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                Compliance
              </Text>
              <View style={styles.grid}>
                <StatTile label="Logs" value={report.compliance?.totalLogs ?? 0} />
                <StatTile
                  label="Missed"
                  value={formatMissedComplianceCount(report.compliance?.missedLast7d)}
                  detail="last 7 days"
                />
              </View>
              {Object.entries(report.compliance?.byType || {}).map(([type, value]) => (
                <View key={type} style={styles.row}>
                  <Text style={styles.rowTitle}>{type}</Text>
                  <Text style={styles.rowValue}>{String(value)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                Team
              </Text>
              <View style={styles.grid}>
                <StatTile label="Members" value={report.team?.totalMembers ?? 0} />
              </View>
              {Object.entries(report.team?.byRole || {}).map(([role, value]) => (
                <View key={role} style={styles.row}>
                  <Text style={styles.rowTitle}>{role}</Text>
                  <Text style={styles.rowValue}>{String(value)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                Automation
              </Text>
              <View style={styles.grid}>
                <StatTile
                  label="Policies"
                  value={report.automation?.policiesEnabled ?? 0}
                />
                <StatTile
                  label="Triggers"
                  value={report.automation?.triggersLast7d ?? 0}
                  detail="last 7 days"
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { padding: 16, paddingBottom: 32 },
    headerRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      marginBottom: 12
    },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900", marginBottom: 4 },
    muted: { color: palette.textMuted },
    button: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: palette.accentText, fontWeight: "900" },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "flex-end"
    },
    success: { color: palette.success, fontWeight: "800", marginBottom: 8 },
    exportHeader: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between",
      marginBottom: 10
    },
    fileName: {
      color: palette.textMuted,
      flexShrink: 1,
      fontSize: 12,
      fontWeight: "800"
    },
    readinessPanel: {
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 6,
      marginBottom: 12,
      padding: 12
    },
    readinessOk: { backgroundColor: palette.surfaceMuted, borderColor: palette.success },
    readinessWarn: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning
    },
    readinessDanger: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger
    },
    readinessTitle: { color: palette.text, fontWeight: "900" },
    readinessIssue: { color: palette.textMuted, fontWeight: "700", lineHeight: 18 },
    nextActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    secondaryButtonText: { color: palette.text, fontWeight: "900" },
    evidencePanel: {
      borderTopColor: palette.borderSoft,
      borderTopWidth: 1,
      marginTop: 12,
      paddingTop: 12
    },
    evidenceTitle: { color: palette.text, fontWeight: "900", marginBottom: 10 },
    loading: { alignItems: "center", paddingVertical: 24 },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 12,
      padding: 14
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    tile: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 120,
      padding: 12
    },
    tileValue: { color: palette.text, fontSize: 22, fontWeight: "900" },
    tileLabel: { color: palette.textMuted, fontWeight: "800", marginTop: 4 },
    tileDetail: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
    row: {
      borderTopColor: palette.borderSoft,
      borderTopWidth: 1,
      flexDirection: "row",
      paddingVertical: 10
    },
    rowTitle: { color: palette.text, flex: 1, fontWeight: "800" },
    rowValue: { color: palette.text, fontWeight: "900" }
  });
