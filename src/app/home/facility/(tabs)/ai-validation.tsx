import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { aiCompare, aiFeedback, aiTrainingExport, aiVerify } from "@/api/aiValidation";

export default function FacilityAiValidationRoute() {
  const [predictionJson, setPredictionJson] = useState(
    JSON.stringify({ humidity: 80, dewPointSpread: 1.4 }, null, 2)
  );
  const [observedJson, setObservedJson] = useState(
    JSON.stringify({ humidity: 79.9, dewPointSpread: 1.5 }, null, 2)
  );
  const [baselineJson, setBaselineJson] = useState(
    JSON.stringify({ confidence: 0.72, risk: 0.6 }, null, 2)
  );
  const [candidateJson, setCandidateJson] = useState(
    JSON.stringify({ confidence: 0.82, risk: 0.55 }, null, 2)
  );
  const [targetType, setTargetType] = useState("ai_call");
  const [targetId, setTargetId] = useState("smoke-run");
  const [rating, setRating] = useState("4");
  const [comment, setComment] = useState("");
  const [labels, setLabels] = useState("facility,qa");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastResponse, setLastResponse] = useState<Record<string, unknown> | null>(null);

  function parseJsonObject(value: string, label: string) {
    try {
      const parsed = JSON.parse(value || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`${label} must be a JSON object`);
      }
      return parsed as Record<string, unknown>;
    } catch (e: any) {
      throw new Error(e?.message || `${label} must be valid JSON`);
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

      <Text style={styles.label}>Verify prediction vs observed</Text>
      <TextInput
        value={predictionJson}
        onChangeText={setPredictionJson}
        style={[styles.input, styles.code]}
        placeholder="Prediction JSON"
        multiline
      />
      <TextInput
        value={observedJson}
        onChangeText={setObservedJson}
        style={[styles.input, styles.code]}
        placeholder="Observed JSON"
        multiline
      />

      <Text style={styles.label}>Compare baseline vs candidate</Text>
      <TextInput
        value={baselineJson}
        onChangeText={setBaselineJson}
        style={[styles.input, styles.code]}
        placeholder="Baseline JSON"
        multiline
      />
      <TextInput
        value={candidateJson}
        onChangeText={setCandidateJson}
        style={[styles.input, styles.code]}
        placeholder="Candidate JSON"
        multiline
      />

      <Text style={styles.label}>Feedback</Text>
      <TextInput
        value={targetType}
        onChangeText={setTargetType}
        style={styles.input}
        placeholder="Target Type"
      />
      <TextInput
        value={targetId}
        onChangeText={setTargetId}
        style={styles.input}
        placeholder="Target ID"
      />
      <TextInput
        value={rating}
        onChangeText={setRating}
        style={styles.input}
        placeholder="Rating 1-5"
        keyboardType="numeric"
      />
      <TextInput
        value={comment}
        onChangeText={setComment}
        style={styles.input}
        placeholder="Comment"
      />
      <TextInput
        value={labels}
        onChangeText={setLabels}
        style={styles.input}
        placeholder="Labels, comma separated"
      />

      <View style={styles.buttonGrid}>
        <Pressable
          style={[styles.button, styles.buttonPrimary, loading && styles.disabled]}
          disabled={loading}
          onPress={() =>
            run(() =>
              aiVerify({
                prediction: parseJsonObject(predictionJson, "prediction"),
                observed: parseJsonObject(observedJson, "observed")
              })
            )
          }
        >
          <Text style={styles.buttonText}>POST /ai/verify</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, loading && styles.disabled]}
          disabled={loading}
          onPress={() =>
            run(() =>
              aiCompare({
                baseline: parseJsonObject(baselineJson, "baseline"),
                candidate: parseJsonObject(candidateJson, "candidate")
              })
            )
          }
        >
          <Text style={styles.buttonText}>POST /ai/compare</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, loading && styles.disabled]}
          disabled={loading || !targetType.trim() || !targetId.trim() || !rating.trim()}
          onPress={() =>
            run(() =>
              aiFeedback({
                targetType: targetType.trim(),
                targetId: targetId.trim(),
                rating: Number(rating),
                comment: comment.trim() || undefined,
                labels: labels
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              })
            )
          }
        >
          <Text style={styles.buttonText}>POST /ai/feedback</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonSecondary, loading && styles.disabled]}
          disabled={loading}
          onPress={() => run(() => aiTrainingExport({ format: "json" }))}
        >
          <Text style={styles.buttonText}>GET /ai/training/export</Text>
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
