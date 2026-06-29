import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAICall } from "@/hooks/useAICall";
import { AIResultCard } from "@/features/ai/components/AIResultCard";

export default function TrichomeAnalysisScreen({
  facilityId,
  growId
}: {
  facilityId: string;
  growId: string;
}) {
  const { callAI, loading, error, last } = useAICall(facilityId);
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [daysSinceFlip, setDaysSinceFlip] = useState("65");
  const [clear, setClear] = useState("0.2");
  const [cloudy, setCloudy] = useState("0.7");
  const [amber, setAmber] = useState("0.1");

  const canRun = useMemo(
    () => !!facilityId && !!growId && Number.isFinite(Number(daysSinceFlip)),
    [daysSinceFlip, facilityId, growId]
  );

  const runAnalysis = async () => {
    if (!canRun) return;
    await callAI({
      tool: "harvest",
      fn: "estimateHarvestWindow",
      args: {
        daysSinceFlip: Number(daysSinceFlip),
        goal: "balanced",
        distribution: {
          clear: Number(clear) || 0,
          cloudy: Number(cloudy) || 0,
          amber: Number(amber) || 0
        },
        imageUrl: imageUrl.trim() || undefined,
        notes: notes.trim() || undefined
      },
      context: { growId }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Trichome Harvest Estimate</Text>
      <Text style={styles.sub}>
        Estimate harvest timing from trichome distribution and optional photo context.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Days since flip</Text>
        <TextInput
          accessibilityLabel="Trichome days since flip"
          value={daysSinceFlip}
          onChangeText={setDaysSinceFlip}
          keyboardType="numeric"
          style={styles.input}
          placeholder="65"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Trichome distribution</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.small}>Clear</Text>
            <TextInput
              accessibilityLabel="Clear trichome ratio"
              value={clear}
              onChangeText={setClear}
              keyboardType="numeric"
              style={styles.inputSm}
              placeholder="0.2"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.small}>Cloudy</Text>
            <TextInput
              accessibilityLabel="Cloudy trichome ratio"
              value={cloudy}
              onChangeText={setCloudy}
              keyboardType="numeric"
              style={styles.inputSm}
              placeholder="0.7"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.small}>Amber</Text>
            <TextInput
              accessibilityLabel="Amber trichome ratio"
              value={amber}
              onChangeText={setAmber}
              keyboardType="numeric"
              style={styles.inputSm}
              placeholder="0.1"
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Image URL (optional)</Text>
        <TextInput
          accessibilityLabel="Trichome image URL"
          value={imageUrl}
          onChangeText={setImageUrl}
          style={styles.input}
          placeholder="https://example.com/trichomes.jpg"
          multiline
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Notes (optional)</Text>
        <TextInput
          accessibilityLabel="Trichome analysis notes"
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, { minHeight: 80 }]}
          placeholder="Lens details, lighting, or grow context"
          multiline
        />

        <Pressable
          onPress={runAnalysis}
          disabled={!canRun || loading}
          accessibilityLabel="Estimate trichome harvest window"
          style={[styles.cta, (!canRun || loading) && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>
            {loading ? "Estimating..." : "Estimate Harvest Window"}
          </Text>
        </Pressable>

        {!!error && (
          <Text style={styles.error}>
            {error.code}: {error.message}
          </Text>
        )}
      </View>

      {!!last?.data && (
        <AIResultCard title="Trichome Harvest Estimate" data={last.data as any} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  sub: { fontSize: 14, opacity: 0.7, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: "#fff"
  },
  label: { fontWeight: "700", fontSize: 14, marginBottom: 4 },
  small: { fontSize: 12, opacity: 0.7, marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  col: { gap: 0 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    fontSize: 14
  },
  inputSm: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    minWidth: 82,
    padding: 10,
    fontSize: 13
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
