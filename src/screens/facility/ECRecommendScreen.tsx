import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAICall } from "@/hooks/useAICall";
import { AIResultCard } from "@/features/ai/components/AIResultCard";

export default function ECRecommendScreen({ facilityId }: { facilityId: string }) {
  const { callAI, loading, error, last } = useAICall(facilityId);
  const [currentEC, setCurrentEC] = useState("1.4");
  const [targetEC, setTargetEC] = useState("1.6");
  const [confirm, setConfirm] = useState(false);

  const canRun = useMemo(
    () => facilityId && currentEC.length > 0 && targetEC.length > 0,
    [facilityId, currentEC, targetEC]
  );

  const onRun = async (forceConfirm?: boolean) => {
    const cec = Number(currentEC);
    const tec = Number(targetEC);
    if (!Number.isFinite(cec) || !Number.isFinite(tec)) return;

    await callAI({
      tool: "ec",
      fn: "recommendCorrection",
      args: { currentEC: cec, targetEC: tec, confirm: forceConfirm ?? confirm },
      context: {}
    });
  };

  const needsConfirm =
    last?.success === false &&
    (last?.error?.code === "USER_CONFIRMATION_REQUIRED" || last?.error?.code === "409");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>EC Recommendation</Text>
      <Text style={styles.sub}>
        Get nutrient correction recommendation based on current and target EC
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Current EC</Text>
        <TextInput
          value={currentEC}
          onChangeText={setCurrentEC}
          keyboardType="numeric"
          style={styles.input}
          placeholder="1.4"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Target EC</Text>
        <TextInput
          value={targetEC}
          onChangeText={setTargetEC}
          keyboardType="numeric"
          style={styles.input}
          placeholder="1.6"
        />

        <Pressable
          onPress={() => onRun(false)}
          disabled={!canRun || loading}
          style={[styles.cta, (!canRun || loading) && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>{loading ? "Running..." : "Get Recommendation"}</Text>
        </Pressable>

        {needsConfirm && (
          <>
            <Text style={styles.warn}>Confirmation required: {last?.error?.message}</Text>
            <Pressable
              onPress={() => {
                setConfirm(true);
                onRun(true);
              }}
              disabled={loading}
              style={[styles.confirmBtn, loading && styles.ctaDisabled]}
            >
              <Text style={styles.confirmBtnText}>Confirm and Apply Recommendation</Text>
            </Pressable>
          </>
        )}

        {!!error && !needsConfirm && (
          <Text style={styles.error}>
            {error.code}: {error.message}
          </Text>
        )}
      </View>

      {!!last?.data && <AIResultCard title="EC Result" data={last.data as any} />}
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
  warn: { color: "#92400E", fontWeight: "600", fontSize: 12, marginTop: 8 },
  error: { color: "#DC2626", fontWeight: "600", fontSize: 12, marginTop: 8 },
  confirmBtn: {
    marginTop: 8,
    backgroundColor: "#92400E",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center"
  },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 }
});
