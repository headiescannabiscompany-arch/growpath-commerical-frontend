/**
 * AIResultCard
 *
 * Standard renderer for AI call results.
 * Handles confidence, recommendation, result details, and persisted write refs.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
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

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: 14
  },
  h2: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  status: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  meta: { fontSize: 12, opacity: 0.7, marginBottom: 2 },
  reco: { marginTop: 6, fontSize: 13, fontWeight: "700" },
  sep: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 10 },
  label: { fontSize: 12, fontWeight: "800", opacity: 0.7, marginBottom: 6 },
  mono: { fontSize: 12, fontFamily: "monospace", opacity: 0.85 },
  write: { fontSize: 12, opacity: 0.85, marginBottom: 2 }
});
