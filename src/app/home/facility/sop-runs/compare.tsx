import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type SopRunListItem = {
  id?: string;
  _id?: string;
  runId?: string;
  title?: string;
  name?: string;
  status?: string;
  startedAt?: string;
};
type UnknownRecord = Record<string, unknown>;

function toRunListItem(x: unknown): SopRunListItem {
  return typeof x === "object" && x !== null ? (x as SopRunListItem) : {};
}

function asArray(res: unknown): SopRunListItem[] {
  const r = (res ?? {}) as UnknownRecord;
  if (Array.isArray(res)) return res.map(toRunListItem);
  if (Array.isArray(r.items)) return r.items.map(toRunListItem);
  if (Array.isArray(r.runs)) return r.runs.map(toRunListItem);
  if (Array.isArray(r.data)) return r.data.map(toRunListItem);
  return [];
}

function pickId(x: SopRunListItem, idx: number) {
  return String(x?.id ?? x?._id ?? x?.runId ?? `run-${idx}`);
}

function pickTitle(x: SopRunListItem) {
  return String(x?.title || x?.name || "Untitled SOP run");
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilitySopRunsCompareRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilitySopCompareStyles(palette), [palette]);
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const [runs, setRuns] = useState<SopRunListItem[]>([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setRuns([]);
      setError("Select a facility first.");
      return;
    }
    setError(null);
    try {
      const res = await apiRequest(endpoints.sopRuns(facilityId));
      setRuns(asArray(res));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load runs for comparison"));
    }
  }, [facilityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const go = () => {
    if (!leftId.trim() || !rightId.trim() || leftId === rightId) return;
    router.push({
      pathname: "/home/facility/sop-runs/compare-result",
      params: { leftId: leftId.trim(), rightId: rightId.trim() }
    });
  };

  const canCompare = Boolean(leftId && rightId && leftId !== rightId);
  const leftTitle = runs.find((run, idx) => pickId(run, idx) === leftId);
  const rightTitle = runs.find((run, idx) => pickId(run, idx) === rightId);

  return (
    <ScreenBoundary
      title="Compare SOP Runs"
      showBack
      backFallbackHref="/home/facility/sop-runs"
    >
      <View style={styles.container}>
        <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
          Compare SOP Runs
        </Text>
        <Text style={styles.sub}>
          Choose two saved runs. GrowPath compares their recorded checklist evidence and
          outcomes; no internal IDs are required.
        </Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <View style={styles.selectionRow}>
          <View style={styles.selectionCard}>
            <Text style={styles.selectionLabel}>Reference run</Text>
            <Text style={styles.selectionValue}>
              {leftTitle ? pickTitle(leftTitle) : "Choose below"}
            </Text>
          </View>
          <View style={styles.selectionCard}>
            <Text style={styles.selectionLabel}>Comparison run</Text>
            <Text style={styles.selectionValue}>
              {rightTitle ? pickTitle(rightTitle) : "Choose below"}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compare selected SOP runs"
          accessibilityState={{ disabled: !canCompare }}
          disabled={!canCompare}
          onPress={go}
          style={[styles.btn, !canCompare && styles.disabled]}
        >
          <Text style={styles.btnText}>Compare</Text>
        </Pressable>

        <FlatList
          data={runs}
          keyExtractor={pickId}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Complete at least two SOP runs before comparing recorded outcomes.
            </Text>
          }
          renderItem={({ item, index }) => {
            const id = pickId(item, index);
            const title = pickTitle(item);
            const isReference = id === leftId;
            const isComparison = id === rightId;
            return (
              <View
                style={[
                  styles.card,
                  (isReference || isComparison) && styles.cardSelected
                ]}
              >
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.sub}>
                  {item.status ? formatLabel(item.status) : "Saved run"}
                  {item.startedAt
                    ? ` · ${new Date(item.startedAt).toLocaleDateString()}`
                    : ""}
                </Text>
                <View style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${title} as reference run`}
                    disabled={isComparison}
                    onPress={() => setLeftId(id)}
                    style={[styles.choice, isReference && styles.choiceActive]}
                  >
                    <Text style={styles.link}>
                      {isReference ? "Reference selected" : "Use as reference"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${title} as comparison run`}
                    disabled={isReference}
                    onPress={() => setRightId(id)}
                    style={[styles.choice, isComparison && styles.choiceActive]}
                  >
                    <Text style={styles.link}>
                      {isComparison ? "Comparison selected" : "Use as comparison"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </View>
    </ScreenBoundary>
  );
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function createFacilitySopCompareStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 8 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    sub: { color: palette.textMuted, fontWeight: "700", lineHeight: 19 },
    selectionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    selectionCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexGrow: 1,
      minWidth: 220,
      padding: 10
    },
    selectionLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    selectionValue: { color: palette.text, fontWeight: "900", marginTop: 2 },
    btn: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      padding: 10,
      alignItems: "center"
    },
    btnText: { color: palette.accentText, fontWeight: "800" },
    disabled: { opacity: 0.45 },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      marginTop: 10,
      backgroundColor: palette.card
    },
    cardSelected: { borderColor: palette.accent, borderWidth: 2 },
    title: { color: palette.text, fontWeight: "800" },
    row: { flexDirection: "row", gap: 12, marginTop: 6 },
    choice: {
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 9,
      paddingVertical: 7
    },
    choiceActive: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
    link: { color: palette.link, fontWeight: "800" },
    empty: { color: palette.textMuted, fontWeight: "700", paddingVertical: 18 },
    err: { color: palette.danger, fontWeight: "700" }
  });
}
