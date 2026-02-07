/**
 * ComputeVPDScreen
 *
 * Phase 1.1: Climate VPD calculator (read-only metric, no persistence).
 * Safe to include in nav even if disabled in matrix — just won't be reachable.
 */

import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useAICall } from "@/hooks/useAICall";
import { AIResultCard } from "@/features/ai/components/AIResultCard";

export default function ComputeVPDScreen({ facilityId }: { facilityId: string }) {
  const { callAI, loading, error, last } = useAICall(facilityId);
  const [temp, setTemp] = useState("26");
  const [rh, setRh] = useState("60");

  const canRun = useMemo(
    () => facilityId && temp.length > 0 && rh.length > 0,
    [facilityId, temp, rh]
  );

  const onRun = async () => {
    const t = Number(temp);
    const r = Number(rh);
    if (!Number.isFinite(t) || !Number.isFinite(r)) {
      return;
    }
    await callAI({
      tool: "climate",
      fn: "computeVPD",
      args: { temp: t, rh: r },
      context: {} // no growId needed
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Compute VPD</Text>
      <Text style={styles.sub}>
        Calculate vapor pressure deficit from temperature and relative humidity
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Temperature (°C)</Text>
        <TextInput
          value={temp}
          onChangeText={setTemp}
          keyboardType="numeric"
          style={styles.input}
          placeholder="26"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Relative Humidity (%)</Text>
        <TextInput
          value={rh}
          onChangeText={setRh}
          keyboardType="numeric"
          style={styles.input}
          placeholder="60"
        />

        <Pressable
          onPress={onRun}
          disabled={!canRun || loading}
          style={[styles.cta, (!canRun || loading) && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>{loading ? "Computing…" : "Compute VPD"}</Text>
        </Pressable>

        {!!error && (
          <Text style={styles.error}>
            {error.code}: {error.message}
          </Text>
        )}
      </View>

      {!!last?.data && <AIResultCard title="VPD Result" data={last.data as any} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  sub: { fontSize: 14, opacity: 0.7, marginBottom: 12, lineHeight: 18 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: "#fff",
    marginBottom: 16
  },
  label: { fontWeight: "700", fontSize: 14, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    fontSize: 14
  },
  cta: {
    marginTop: 10,
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center"
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontWeight: "700", color: "#fff", fontSize: 14 },
  error: { color: "#DC2626", fontWeight: "600", fontSize: 12, marginTop: 8 }
});
