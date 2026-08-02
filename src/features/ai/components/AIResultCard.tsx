/**
 * AIResultCard
 *
 * Standard renderer for AI call results.
 * Handles confidence, recommendation, result details, and persisted write refs.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type WriteRef = { type: string; id: string };

type AIResultData = {
  result?: any;
  confidence?: number;
  confidence_reason?: string;
  recommendation?: string;
  writes?: WriteRef[];
};

export function AIResultCard({
  title = "Result",
  data
}: {
  title?: string;
  data: AIResultData | null | undefined;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createAIResultCardStyles(palette), [palette]);

  if (!data) return null;

  const writes = Array.isArray(data.writes) ? data.writes : [];
  const result = data.result && typeof data.result === "object" ? data.result : null;
  const confidence =
    typeof data.confidence === "number"
      ? data.confidence
      : typeof result?.confidence === "number"
        ? result.confidence
        : null;
  const recommendation =
    data.recommendation ||
    result?.recommendation ||
    (Array.isArray(result?.recommendations) ? result.recommendations[0] : "");
  const status = result?.status || result?.action || "";

  return (
    <View style={styles.card}>
      <Text style={styles.h2}>{title}</Text>

      {!!status && <Text style={styles.status}>Status: {String(status)}</Text>}
      {typeof confidence === "number" ? (
        <Text style={styles.meta}>Confidence: {confidence.toFixed(2)}</Text>
      ) : null}
      {!!data.confidence_reason && (
        <Text style={styles.meta}>{data.confidence_reason}</Text>
      )}
      {!!recommendation && <Text style={styles.reco}>{String(recommendation)}</Text>}

      <View style={styles.sep} />

      <Text style={styles.label}>result</Text>
      <Text style={styles.mono}>{safeStringify(data.result)}</Text>

      {writes.length > 0 ? (
        <>
          <View style={styles.sep} />
          <Text style={styles.label}>writes (persisted)</Text>
          {writes.map((w, idx) => (
            <Text key={`${w.type}-${w.id}-${idx}`} style={styles.write}>
              - {w.type}: {w.id}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

function safeStringify(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function createAIResultCardStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 14
    },
    h2: { color: palette.text, fontSize: 16, fontWeight: "800", marginBottom: 6 },
    status: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 4
    },
    meta: { color: palette.textMuted, fontSize: 12, marginBottom: 2 },
    reco: { color: palette.textSoft, fontSize: 13, fontWeight: "700", marginTop: 6 },
    sep: { backgroundColor: palette.border, height: 1, marginVertical: 10 },
    label: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 6
    },
    mono: { color: palette.textSoft, fontFamily: "monospace", fontSize: 12 },
    write: { color: palette.textSoft, fontSize: 12, marginBottom: 2 }
  });
}
