import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { aiCompare, aiFeedback, aiTrainingExport, aiVerify } from "@/api/aiValidation";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { buildFeedbackPayload, parseJsonObject } from "@/utils/aiValidationLab";
import { radius } from "@/theme/theme";

export default function FacilityAiValidationRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityAiValidationStyles(palette), [palette]);
  const ent = useEntitlements();
  const canUseValidationLab =
    ent?.facilityRole === "OWNER" &&
    Boolean(ent?.can?.(CAPABILITY_KEYS.FACILITY_SETTINGS_EDIT));
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

  async function run<T>(work: () => Promise<T>) {
    if (!canUseValidationLab) return;
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
      <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
        AI Validation Lab
      </Text>
      <Text style={styles.sub}>
        Owner-only operational checks for AI verification, comparison, feedback, and
        training export endpoints.
      </Text>

      {!canUseValidationLab ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Owner access required
          </Text>
          <Text style={styles.sub}>
            This operational QA workspace is limited to the facility owner. No validation,
            feedback, or training data can be submitted or exported from your role.
          </Text>
        </View>
      ) : null}

      {canUseValidationLab ? (
        <>
          <Text accessibilityRole="header" aria-level={2} style={styles.label}>
            Verify prediction vs observed
          </Text>
          <TextInput
            accessibilityLabel="AI verify prediction JSON"
            value={predictionJson}
            onChangeText={setPredictionJson}
            style={[styles.input, styles.code]}
            placeholder="Prediction JSON"
            placeholderTextColor={palette.textSoft}
            multiline
          />
          <TextInput
            accessibilityLabel="AI verify observed JSON"
            value={observedJson}
            onChangeText={setObservedJson}
            style={[styles.input, styles.code]}
            placeholder="Observed JSON"
            placeholderTextColor={palette.textSoft}
            multiline
          />

          <Text accessibilityRole="header" aria-level={2} style={styles.label}>
            Compare baseline vs candidate
          </Text>
          <TextInput
            accessibilityLabel="AI compare baseline JSON"
            value={baselineJson}
            onChangeText={setBaselineJson}
            style={[styles.input, styles.code]}
            placeholder="Baseline JSON"
            placeholderTextColor={palette.textSoft}
            multiline
          />
          <TextInput
            accessibilityLabel="AI compare candidate JSON"
            value={candidateJson}
            onChangeText={setCandidateJson}
            style={[styles.input, styles.code]}
            placeholder="Candidate JSON"
            placeholderTextColor={palette.textSoft}
            multiline
          />

          <Text accessibilityRole="header" aria-level={2} style={styles.label}>
            Feedback
          </Text>
          <TextInput
            accessibilityLabel="AI feedback target type"
            value={targetType}
            onChangeText={setTargetType}
            style={styles.input}
            placeholder="Target Type"
            placeholderTextColor={palette.textSoft}
          />
          <TextInput
            accessibilityLabel="AI feedback target id"
            value={targetId}
            onChangeText={setTargetId}
            style={styles.input}
            placeholder="Target ID"
            placeholderTextColor={palette.textSoft}
          />
          <TextInput
            accessibilityLabel="AI feedback rating"
            value={rating}
            onChangeText={setRating}
            style={styles.input}
            placeholder="Rating 1-5"
            placeholderTextColor={palette.textSoft}
            keyboardType="numeric"
          />
          <TextInput
            accessibilityLabel="AI feedback comment"
            value={comment}
            onChangeText={setComment}
            style={styles.input}
            placeholder="Comment"
            placeholderTextColor={palette.textSoft}
          />
          <TextInput
            accessibilityLabel="AI feedback labels"
            value={labels}
            onChangeText={setLabels}
            style={styles.input}
            placeholder="Labels, comma separated"
            placeholderTextColor={palette.textSoft}
          />

          <View style={styles.buttonGrid}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Verify AI prediction"
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
              accessibilityRole="button"
              accessibilityLabel="Compare AI candidates"
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
              accessibilityRole="button"
              accessibilityLabel="Submit AI feedback"
              style={[styles.button, styles.buttonPrimary, loading && styles.disabled]}
              disabled={
                loading || !targetType.trim() || !targetId.trim() || !rating.trim()
              }
              onPress={() =>
                run(() =>
                  aiFeedback(
                    buildFeedbackPayload({
                      targetType,
                      targetId,
                      rating,
                      comment,
                      labels
                    })
                  )
                )
              }
            >
              <Text style={styles.buttonText}>POST /ai/feedback</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export AI training feedback"
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
              <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                Last Response Envelope
              </Text>
              <Text selectable style={styles.codeText}>
                {JSON.stringify(lastResponse, null, 2)}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

export function createFacilityAiValidationStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { padding: 16, gap: 10, backgroundColor: palette.page },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    sub: { color: palette.textMuted, marginBottom: 4 },
    label: { color: palette.text, fontWeight: "700", marginTop: 2 },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: palette.text,
      backgroundColor: palette.surface
    },
    code: { minHeight: 92, textAlignVertical: "top", fontFamily: "monospace" },
    choiceRow: { flexDirection: "row", gap: 8 },
    choice: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border
    },
    choiceActive: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    choiceText: { color: palette.text, textTransform: "capitalize" },
    choiceTextActive: {
      color: palette.accent,
      fontWeight: "700",
      textTransform: "capitalize"
    },
    buttonGrid: { marginTop: 4, gap: 8 },
    button: { borderRadius: radius.card, paddingVertical: 12, alignItems: "center" },
    buttonPrimary: { backgroundColor: palette.accent },
    buttonSecondary: { backgroundColor: palette.surfaceStrong },
    disabled: { opacity: 0.55 },
    buttonText: { color: palette.accentText, fontWeight: "800" },
    error: { color: palette.danger, marginTop: 6 },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.card,
      marginTop: 8
    },
    cardTitle: { color: palette.text, fontWeight: "800", marginBottom: 4 },
    codeText: { color: palette.text, fontFamily: "monospace", fontSize: 12 }
  });
}
