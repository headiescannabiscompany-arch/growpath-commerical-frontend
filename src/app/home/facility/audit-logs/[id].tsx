import React, { useMemo } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { normalizeApiError } from "@/api/errors";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useFacility } from "@/state/useFacility";
import type { AuditLog } from "@/types/contracts";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  formatFacilityAuditAction,
  formatFacilityAuditDetails,
  formatFacilityAuditTimestamp
} from "@/utils/facilityAuditPresentation";

type AuditLogItem = AuditLog & {
  id?: string;
  _id?: string;
  logId?: string;
  entity?: string;
  entityType?: string;
  entityId?: string;
  targetId?: string;
  message?: string;
  createdAt?: string;
  role?: string;
  userEmail?: string;
};

function pickId(x: AuditLogItem) {
  return String(x?.id ?? x?._id ?? x?.logId ?? "");
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilityAuditLogDetailRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityAuditDetailStyles(palette), [palette]);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { selectedId } = useFacility();
  const { logs, isLoading, error } = useAuditLogs(selectedId);

  const item = useMemo(() => {
    if (!id || !Array.isArray(logs)) return null;
    const typed = logs as AuditLogItem[];
    return typed.find((x) => pickId(x) === String(id)) ?? null;
  }, [id, logs]);

  const entity = String(item?.entity ?? item?.entityType ?? "");
  const entityId = String(item?.entityId ?? item?.targetId ?? "");
  const actionLabel = formatFacilityAuditAction(item?.action);
  const detailSummary = formatFacilityAuditDetails(
    item?.action,
    item?.details ?? item?.message
  );
  const recordedAt = formatFacilityAuditTimestamp(item?.timestamp ?? item?.createdAt);
  const actor = String(item?.userName || item?.userEmail || "").trim();
  const role = String(item?.role || "").trim();

  const renderBoundary = (children: React.ReactNode) => (
    <ScreenBoundary
      title="Audit Log Detail"
      showBack
      backFallbackHref="/home/facility/audit-logs"
    >
      {children}
    </ScreenBoundary>
  );

  if (isLoading)
    return renderBoundary(
      <View style={styles.container}>
        <Text style={styles.status}>Loading audit log...</Text>
      </View>
    );
  if (!selectedId)
    return renderBoundary(
      <View style={styles.container}>
        <Text style={styles.status}>Select a facility first.</Text>
      </View>
    );
  if (!id)
    return renderBoundary(
      <View style={styles.container}>
        <Text style={styles.status}>Missing audit log id.</Text>
      </View>
    );
  if (error)
    return renderBoundary(
      <View style={styles.container}>
        <Text style={styles.status}>
          {getErrorMessage(error, "Failed to load audit log detail.")}
        </Text>
      </View>
    );
  if (!item)
    return renderBoundary(
      <View style={styles.container}>
        <Text style={styles.status}>Audit log not found.</Text>
      </View>
    );

  return renderBoundary(
    <View style={styles.container}>
      <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
        Audit Log Detail
      </Text>
      <View style={styles.summaryCard}>
        <Text style={styles.eventTitle}>{actionLabel}</Text>
        {detailSummary ? <Text style={styles.summary}>{detailSummary}</Text> : null}
        <View style={styles.metaGrid}>
          {recordedAt ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Recorded</Text>
              <Text style={styles.metaValue}>{recordedAt}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Actor</Text>
            <Text style={styles.metaValue}>{actor || "Recorded facility member"}</Text>
          </View>
          {role ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Role</Text>
              <Text style={styles.metaValue}>{formatFacilityAuditAction(role)}</Text>
            </View>
          ) : null}
          {entity ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Record type</Text>
              <Text style={styles.metaValue}>{formatFacilityAuditAction(entity)}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {entity && entityId ? (
        <Link
          href={{
            pathname: "/home/facility/audit-logs/[entity]/[entityId]",
            params: { entity, entityId }
          }}
          style={styles.link}
        >
          View all for this entity
        </Link>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Immutable audit record</Text>
        <Text style={styles.sub}>
          Raw identifiers are shown only here for exact audit verification.
        </Text>
        <Text selectable style={styles.json}>
          {JSON.stringify(item, null, 2)}
        </Text>
      </View>
    </View>
  );
}

export function createFacilityAuditDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 8 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    status: { color: palette.text },
    sub: { color: palette.textMuted },
    summaryCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 14
    },
    eventTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    summary: { color: palette.textMuted, fontSize: 15, lineHeight: 21 },
    metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    metaItem: { minWidth: 150 },
    metaLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    metaValue: { color: palette.text, fontWeight: "700", marginTop: 2 },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.surface
    },
    cardTitle: { color: palette.text, fontWeight: "900", marginBottom: 4 },
    json: { color: palette.text, fontFamily: "monospace", fontSize: 12 },
    link: { color: palette.link, fontWeight: "700" }
  });
}
