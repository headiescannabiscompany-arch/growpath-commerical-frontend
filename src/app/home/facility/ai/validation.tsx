import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useFacility } from "@/state/useFacility";
import { aiCompare, aiFeedback, aiTrainingExport, aiVerify } from "@/api/aiValidation";

export default function FacilityAiValidationRoute() {
  const { selectedId: facilityId } = useFacility();

  const [inferenceRunId, setInferenceRunId] = useState("");
  const [verifierRunId, setVerifierRunId] = useState("");
  const [tool, setTool] = useState("harvest");
  const [fn, setFn] = useState("estimateHarvestWindow");
  const [normalizedInputJson, setNormalizedInputJson] = useState("{}");
  const [feedbackDecision, setFeedbackDecision] = useState<
    "accepted" | "modified" | "rejected"
  >("accepted");
  const [actualAction, setActualAction] = useState("");
  const [observedOutcome, setObservedOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastResponse, setLastResponse] = useState<Record<string, unknown> | null>(null);

  function parseInput() {
    try {
      const parsed = JSON.parse(normalizedInputJson || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed as Record<string, unknown>;
    } catch {
      throw new Error("normalizedInput must be valid JSON object");
    }
  }

  async function run<T>(work: () => Promise<T>) {
    setLoading(true);
    setError("");
    try {
      const res = await work();
      setLastResponse(res as Record<string, unknown>);
    } catch (e: any) {
      setError(String(e?.message || e || "Request failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>AI Validation Lab</Text>
      <Text style={styles.sub}>
        Verify, compare, feedback, and training export endpoint smoke checks.
      </Text>

      <TextInput
        value={inferenceRunId}
        onChangeText={setInferenceRunId}
        style={styles.input}
        placeholder="Inference Run ID"
      />
      <TextInput
        value={verifierRunId}
        onChangeText={setVerifierRunId}
        style={styles.input}
        placeholder="Verifier Run ID (for compare)"
      />
      <TextInput
        value={tool}
        onChangeText={setTool}
        style={styles.input}
        placeholder="Tool"
      />
      <TextInput
        value={fn}
        onChangeText={setFn}
        style={styles.input}
        placeholder="Function"
      />
      <TextInput
        value={normalizedInputJson}
        onChangeText={setNormalizedInputJson}
        style={[styles.input, styles.code]}
        placeholder="Normalized Input JSON"
        multiline
      />

      <Text style={styles.label}>Feedback Decision</Text>
      <View style={styles.choiceRow}>
        {(["accepted", "modified", "rejected"] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setFeedbackDecision(item)}
            style={[styles.choice, feedbackDecision === item && styles.choiceActive]}
          >
            <Text
              style={
                feedbackDecision === item ? styles.choiceTextActive : styles.choiceText
              }
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={actualAction}
        onChangeText={setActualAction}
        style={styles.input}
        placeholder="Actual Action"
      />
      <TextInput
        value={observedOutcome}
        onChangeText={setObservedOutcome}
        style={styles.input}
        placeholder="Observed Outcome"
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        style={styles.input}
        placeholder="Feedback Notes (optional)"
      />

      <View style={styles.buttonGrid}>
        <Pressable
          style={[styles.button, styles.buttonPrimary, loading && styles.disabled]}
          disabled={loading || !inferenceRunId.trim()}
          onPress={() =>
            run(() =>
              aiVerify({
                inferenceRunId: inferenceRunId.trim(),
                tool: tool.trim(),
                fn: fn.trim(),
                normalizedInput: parseInput()
              })
            )
          }
        >
          <Text style={styles.buttonText}>POST /ai/verify</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, loading && styles.disabled]}
          disabled={loading || !inferenceRunId.trim() || !verifierRunId.trim()}
          onPress={() =>
            run(() =>
              aiCompare({
                inferenceRunId: inferenceRunId.trim(),
                verifierRunId: verifierRunId.trim()
              })
            )
          }
        >
          <Text style={styles.buttonText}>POST /ai/compare</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, loading && styles.disabled]}
          disabled={loading || !inferenceRunId.trim()}
          onPress={() =>
            run(() =>
              aiFeedback({
                inferenceRunId: inferenceRunId.trim(),
                userDecision: feedbackDecision,
                actualAction: actualAction.trim(),
                observedOutcome: observedOutcome.trim(),
                notes: notes.trim() || undefined
              })
            )
          }
        >
          <Text style={styles.buttonText}>POST /ai/feedback</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonSecondary, loading && styles.disabled]}
          disabled={loading}
          onPress={() =>
            run(() => aiTrainingExport({ facilityId: String(facilityId || "") }))
          }
        >
          <Text style={styles.buttonText}>POST /ai/training/export</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {lastResponse ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last Response Envelope</Text>
          <Text selectable style={styles.codeText}>
            {JSON.stringify(lastResponse, null, 2)}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75, marginBottom: 4 },
  label: { fontWeight: "700", marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  code: { minHeight: 92, textAlignVertical: "top", fontFamily: "monospace" },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db"
  },
  choiceActive: { borderColor: "#1d4ed8", backgroundColor: "#dbeafe" },
  choiceText: { color: "#111827", textTransform: "capitalize" },
  choiceTextActive: { color: "#1e3a8a", fontWeight: "700", textTransform: "capitalize" },
  buttonGrid: { marginTop: 4, gap: 8 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  buttonPrimary: { backgroundColor: "#111827" },
  buttonSecondary: { backgroundColor: "#1f2937" },
  disabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "800" },
  error: { color: "#b91c1c", marginTop: 6 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff",
    marginTop: 8
  },
  cardTitle: { fontWeight: "800", marginBottom: 4 },
  codeText: { fontFamily: "monospace", fontSize: 12 }
});
