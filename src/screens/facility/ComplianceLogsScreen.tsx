import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import ErrorState from "@/components/ErrorState";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useComplianceLogs } from "@/hooks/useComplianceLogs";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import type { ComplianceLogType } from "@/types/compliance";

const TYPES: { label: string; value: ComplianceLogType }[] = [
  { label: "Daily Check", value: "DAILY_CHECK" },
  { label: "Sanitation", value: "SANITATION" },
  { label: "Pest Control", value: "PEST_CONTROL" },
  { label: "Nutrient Mix", value: "NUTRIENT_MIX" },
  { label: "IPM Spray", value: "IPM_SPRAY" },
  { label: "Equipment Cal", value: "EQUIPMENT_CAL" },
  { label: "Incident", value: "INCIDENT" },
  { label: "Other", value: "OTHER" }
];

function canWriteRole(role: unknown) {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF";
}

export default function ComplianceLogsScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createComplianceLogsStyles(palette), [palette]);
  const ent = useEntitlements();
  const canWrite =
    Boolean(ent?.can?.(CAPABILITY_KEYS.COMPLIANCE_WRITE)) &&
    canWriteRole(ent?.facilityRole);
  const [type, setType] = useState<ComplianceLogType>("DAILY_CHECK");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const { data, isLoading, error, createLog, creating, refetch } = useComplianceLogs();
  const logs = Array.isArray(data) ? data : [];

  const submit = async () => {
    if (!canWrite || !title.trim() || creating) return;
    await createLog({ type, title: title.trim(), notes: notes.trim() || undefined });
    setTitle("");
    setNotes("");
  };

  return (
    <ScreenBoundary
      title="Compliance Logs"
      showBack
      backFallbackHref="/home/facility/compliance"
    >
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.h1}>
          Compliance Logs
        </Text>
        <Text style={styles.intro}>
          Review auditable facility checks, sanitation, pest-control, nutrient, and
          incident records.
        </Text>

        {isLoading ? <LoadingSpinner /> : null}
        {error ? (
          <ErrorState
            message="Failed to load compliance logs"
            onRetry={() => refetch()}
          />
        ) : null}

        {!isLoading && !error && canWrite ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.h2}>
              Record compliance log
            </Text>
            <Text style={styles.muted}>
              Choose the record type and add a clear title.
            </Text>
            <View style={styles.typeRow}>
              {TYPES.map((option) => {
                const active = option.value === type;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    key={option.value}
                    onPress={() => setType(option.value)}
                    style={[styles.typeButton, active && styles.typeButtonActive]}
                  >
                    <Text style={[styles.typeText, active && styles.typeTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              accessibilityLabel="Compliance log title"
              value={title}
              onChangeText={setTitle}
              placeholder="Log title (required)"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Compliance log notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={palette.textMuted}
              multiline
              style={[styles.input, styles.notesInput]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create compliance log"
              onPress={submit}
              disabled={creating || !title.trim()}
              style={[
                styles.primaryButton,
                (creating || !title.trim()) && styles.disabled
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {creating ? "Saving..." : "Create Log"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error && logs.length === 0 ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.h2}>
              No compliance logs yet
            </Text>
            <Text style={styles.muted}>
              {canWrite
                ? "Use the form above to record the first auditable facility check."
                : "Compliance records will appear here after an authorized team member creates them."}
            </Text>
          </View>
        ) : null}

        {!isLoading && !error && logs.length > 0 ? (
          <View style={styles.listSection}>
            <Text accessibilityRole="header" style={styles.h2}>
              Recorded logs
            </Text>
            <FlatList
              data={logs}
              keyExtractor={(log) => log.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.logCard}>
                  <Text style={styles.logTitle}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {item.type} · {new Date(item.createdAt).toLocaleString()}
                  </Text>
                  {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                  <Text style={styles.meta}>
                    By:{" "}
                    {item.createdBy?.name ||
                      item.createdBy?.email ||
                      item.createdBy?.userId ||
                      "Unknown"}
                  </Text>
                </View>
              )}
            />
          </View>
        ) : null}
      </View>
    </ScreenBoundary>
  );
}

export const createComplianceLogsStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16 },
    h1: { color: palette.text, fontSize: 24, fontWeight: "900", marginBottom: 4 },
    h2: { color: palette.text, fontSize: 18, fontWeight: "900", marginBottom: 8 },
    intro: { color: palette.textMuted, marginBottom: 16 },
    muted: { color: palette.textMuted },
    card: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginBottom: 12,
      padding: 14
    },
    typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    typeButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    typeButtonActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    typeText: { color: palette.text, fontWeight: "700" },
    typeTextActive: { color: palette.accentText },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      marginTop: 10,
      padding: 10
    },
    notesInput: { minHeight: 80, textAlignVertical: "top" },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 12,
      padding: 12
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.5 },
    listSection: { flex: 1 },
    listContent: { paddingBottom: 24 },
    logCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginBottom: 10,
      padding: 12
    },
    logTitle: { color: palette.text, fontWeight: "900" },
    meta: { color: palette.textMuted, marginTop: 4 },
    notes: { color: palette.text, marginTop: 8 }
  });
