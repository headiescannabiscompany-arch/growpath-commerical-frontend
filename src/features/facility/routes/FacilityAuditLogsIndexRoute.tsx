import React, { useMemo } from "react";
import { Link } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { FacilityAuditReadStatus, useFacilityAuditRead } from "../useFacilityAuditRead";
import type { AuditLog } from "@/types/contracts";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import {
  formatFacilityAuditAction,
  formatFacilityAuditDetails,
  formatFacilityAuditTimestamp
} from "@/utils/facilityAuditPresentation";

type AuditLogListItem = AuditLog & {
  id?: string;
  _id?: string;
  logId?: string;
  type?: string;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
};

function pickId(x: AuditLogListItem, idx: number) {
  return String(x?.id || x?._id || x?.logId || `audit-${idx}`);
}

function AuditLogsHeading() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
      Audit Logs
    </Text>
  );
}

export default function FacilityAuditLogsIndexRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const read = useFacilityAuditRead();
  const { logs, isRefreshing, refetch, hasLoaded } = read;
  const items = useMemo(
    () => (Array.isArray(logs) ? (logs as AuditLogListItem[]) : []),
    [logs]
  );

  return (
    <ScreenBoundary
      title="Facility audit logs"
      showBack
      backFallbackHref="/home/facility/dashboard"
    >
      <FlatList
        style={styles.list}
        onRefresh={() => {
          void refetch();
        }}
        refreshing={Boolean(isRefreshing)}
        data={items}
        keyExtractor={pickId}
        ListHeaderComponent={
          <>
            <AuditLogsHeading />
            <FacilityAuditReadStatus read={read} />
          </>
        }
        ListEmptyComponent={
          hasLoaded ? <Text style={styles.empty}>No audit logs yet.</Text> : null
        }
        renderItem={({ item, index }) => {
          const id = pickId(item, index);
          return (
            <View style={styles.card}>
              <Text style={styles.title}>
                {formatFacilityAuditAction(item?.action || item?.type)}
              </Text>
              <Text style={styles.sub}>
                {formatFacilityAuditDetails(
                  item?.action || item?.type,
                  item?.details ?? item?.message
                ) || "Facility event recorded."}
              </Text>
              {formatFacilityAuditTimestamp(
                item?.timestamp || item?.createdAt || item?.updatedAt
              ) ? (
                <Text style={styles.meta}>
                  {formatFacilityAuditTimestamp(
                    item?.timestamp || item?.createdAt || item?.updatedAt
                  )}
                </Text>
              ) : null}
              <Link
                href={{ pathname: "/home/facility/audit-logs/[id]", params: { id } }}
                style={styles.link}
              >
                Open Detail
              </Link>
            </View>
          );
        }}
      />
    </ScreenBoundary>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    list: { flex: 1, padding: 16 },
    container: { flex: 1, padding: 16, justifyContent: "center" },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900", marginBottom: 10 },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      marginBottom: 10,
      backgroundColor: palette.surface,
      gap: 4
    },
    title: { color: palette.text, fontWeight: "800" },
    sub: { color: palette.textMuted },
    meta: { color: palette.textMuted, fontSize: 12 },
    link: { color: palette.link, fontWeight: "700" },
    empty: { color: palette.textMuted }
  });
