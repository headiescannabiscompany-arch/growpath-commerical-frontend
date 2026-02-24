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

  const canRun = useMemo(
    () => !!facilityId && !!growId && imageUrl.trim().length > 0,
    [facilityId, growId, imageUrl]
  );

  const runAnalysis = async () => {
    if (!canRun) return;
    await callAI({
      tool: "harvest",
      fn: "analyzeTrichomes",
      args: { images: [imageUrl.trim()], notes: notes.trim() || undefined },
      context: { growId }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Analyze Trichomes</Text>
      <Text style={styles.sub}>Submit trichome imagery for harvest signal analysis.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Image URL</Text>
        <TextInput
          value={imageUrl}
          onChangeText={setImageUrl}
          style={styles.input}
          placeholder="https://example.com/trichomes.jpg"
          multiline
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, { minHeight: 80 }]}
          placeholder="Lens details, lighting, or grow context"
          multiline
        />

        <Pressable
          onPress={runAnalysis}
          disabled={!canRun || loading}
          style={[styles.cta, (!canRun || loading) && styles.ctaDisabled]}
        >
          <Text style={styles.ctaText}>{loading ? "Analyzing..." : "Analyze"}</Text>
        </Pressable>

        {!!error && (
          <Text style={styles.error}>
            {error.code}: {error.message}
          </Text>
        )}
      </View>

      {!!last?.data && <AIResultCard title="Trichome Analysis" data={last.data as any} />}
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
