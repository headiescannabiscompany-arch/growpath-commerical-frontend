/**
 * AIResultCard
 *
 * Standard renderer for AI call results.
 * Handles: confidence, recommendation, result pretty-print, writes audit trail.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

type WriteRef = { type: string; id: string };

export function AIResultCard({
  title = "Result",
  data
}: {
  title?: string;
  data:
    | null
    | undefined
    | {
        result?: any;
        confidence?: number;
        confidence_reason?: string;
        recommendation?: string;
        writes?: WriteRef[];
      };
}) {
  if (!data) return null;

  const writes = Array.isArray(data.writes) ? data.writes : [];

  return (
    <View style={styles.card}>
      <Text style={styles.h2}>{title}</Text>

      {typeof data.confidence === "number" && (
        <Text style={styles.meta}>Confidence: {data.confidence.toFixed(2)}</Text>
      )}
      {!!data.confidence_reason && (
        <Text style={styles.meta}>{data.confidence_reason}</Text>
      )}
      {!!data.recommendation && <Text style={styles.reco}>{data.recommendation}</Text>}

      <View style={styles.sep} />

      <Text style={styles.label}>result</Text>
      <Text style={styles.mono}>{safeStringify(data.result)}</Text>

      {writes.length > 0 && (
        <>
          <View style={styles.sep} />
          <Text style={styles.label}>writes (persisted)</Text>
          {writes.map((w, idx) => (
            <Text key={`${w.type}-${w.id}-${idx}`} style={styles.write}>
              • {w.type}: {w.id}
            </Text>
          ))}
        </>
      )}
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

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14
  },
  h2: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  meta: { fontSize: 12, opacity: 0.7, marginBottom: 2 },
  reco: { marginTop: 6, fontSize: 13, fontWeight: "700" },
  sep: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 10 },
  label: { fontSize: 12, fontWeight: "800", opacity: 0.7, marginBottom: 6 },
  mono: { fontSize: 12, fontFamily: "monospace", opacity: 0.85 },
  write: { fontSize: 12, opacity: 0.85, marginBottom: 2 }
});
