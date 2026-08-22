import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { BusinessDeskRecord } from "@/api/businessDesk";
import InlineError from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { businessDeskRecordId } from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type RecordToolScaffoldProps = {
  title: string;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
  description: string;
  records: BusinessDeskRecord[];
  selectedRecord: BusinessDeskRecord | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onNew: () => void;
  onSelect: (record: BusinessDeskRecord) => void;
  recordsToolbar?: React.ReactNode;
  children: React.ReactNode;
};

export default function RecordToolScaffold({
  title,
  workspaceLabel,
  basePath,
  description,
  records,
  selectedRecord,
  loading,
  error,
  onRetry,
  onNew,
  onSelect,
  recordsToolbar,
  children
}: RecordToolScaffoldProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const selectedId = businessDeskRecordId(selectedRecord);

  return (
    <AppPage
      routeKey={`business-desk-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      railOverride={null}
      longContent
      backFallbackHref={basePath}
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>{workspaceLabel} Business Desk</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{description}</Text>
        </View>
      }
    >
      <AppCard
        title="Saved records"
        titleLevel={2}
        subtitle="Records stay private to this workspace and keep immutable revision history."
      >
        <View style={styles.listActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start new ${title.toLowerCase()} record`}
            onPress={onNew}
            style={styles.primarySmall}
          >
            <Text style={styles.primarySmallText}>New record</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Refresh ${title.toLowerCase()} records`}
            accessibilityState={{ busy: loading, disabled: loading }}
            disabled={loading}
            onPress={onRetry}
            style={[styles.secondarySmall, loading && styles.disabled]}
          >
            <Text style={styles.secondarySmallText}>Refresh</Text>
          </Pressable>
        </View>
        {recordsToolbar ? (
          <View style={styles.recordsToolbar}>{recordsToolbar}</View>
        ) : null}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.loadingText}>Loading records…</Text>
          </View>
        ) : records.length ? (
          <View style={styles.recordList}>
            {records.map((record) => {
              const id = businessDeskRecordId(record);
              const selected = Boolean(id && id === selectedId);
              return (
                <Pressable
                  key={id || `${record.kind}-${record.title}-${record.version}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${title.toLowerCase()} ${record.title}`}
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(record)}
                  style={[styles.recordRow, selected && styles.recordRowSelected]}
                >
                  <View style={styles.recordText}>
                    <Text style={styles.recordTitle}>{record.title}</Text>
                    <Text style={styles.recordMeta}>
                      {record.status} · revision {record.version}
                    </Text>
                  </View>
                  <Text style={styles.recordAction}>{selected ? "Editing" : "Open"}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : error ? null : (
          <Text style={styles.emptyText}>No saved records yet.</Text>
        )}
      </AppCard>

      {error ? <InlineError error={error} onRetry={onRetry} /> : null}
      {children}
    </AppPage>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    disabled: { opacity: 0.65 },
    emptyText: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    header: { gap: 6 },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    listActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
    loadingText: { color: palette.textMuted, fontSize: 13 },
    primarySmall: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    primarySmallText: { color: palette.accentText, fontSize: 13, fontWeight: "900" },
    recordAction: { color: palette.link, fontSize: 12, fontWeight: "900" },
    recordList: { gap: 8 },
    recordsToolbar: { gap: 10, marginBottom: 12 },
    recordMeta: { color: palette.textMuted, fontSize: 12, marginTop: 3 },
    recordRow: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
      minHeight: 58,
      padding: 11
    },
    recordRowSelected: { borderColor: palette.accent, borderWidth: 2 },
    recordText: { flex: 1 },
    recordTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    secondarySmall: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    secondarySmallText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 820 },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" }
  });
}
