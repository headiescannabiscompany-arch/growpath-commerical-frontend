import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

export type ResultQuestionAnswer = {
  answer: string;
  providerLabel?: string;
  evidenceInspected?: boolean;
  limitations?: string[];
};

export type ResultQuestionCardProps = {
  sourceKey: string;
  suggestions: string[];
  onSubmit: (question: string) => Promise<ResultQuestionAnswer>;
};

function normalizedSuggestions(suggestions: string[]) {
  return [
    ...new Set(suggestions.map((item) => String(item || "").trim()).filter(Boolean))
  ];
}

function normalizedLimitations(limitations: unknown) {
  if (!Array.isArray(limitations)) return [];
  return limitations
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ResultQuestionCard({
  sourceKey,
  suggestions,
  onSubmit
}: ResultQuestionCardProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createResultQuestionCardStyles(palette), [palette]);
  const suggestionOptions = useMemo(
    () => normalizedSuggestions(suggestions),
    [suggestions]
  );
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<ResultQuestionAnswer | null>(null);
  const activeSourceRef = useRef(sourceKey);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    activeSourceRef.current = sourceKey;
    requestVersionRef.current += 1;
    setQuestion("");
    setPending(false);
    setError("");
    setResponse(null);
  }, [sourceKey]);

  const trimmedQuestion = question.trim();
  const canSubmit = trimmedQuestion.length > 0 && !pending;

  function chooseSuggestion(suggestion: string) {
    if (pending) return;
    setQuestion(suggestion);
    setError("");
  }

  async function submitQuestion() {
    if (!canSubmit) return;
    const submittedSourceKey = sourceKey;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setPending(true);
    setError("");
    setResponse(null);
    try {
      const result = await onSubmit(trimmedQuestion);
      if (
        activeSourceRef.current !== submittedSourceKey ||
        requestVersionRef.current !== requestVersion
      ) {
        return;
      }
      const answer = String(result?.answer || "").trim();
      if (!answer) throw new Error("AI returned no usable answer.");
      setResponse({
        answer,
        providerLabel: String(result.providerLabel || "").trim() || undefined,
        evidenceInspected: result.evidenceInspected,
        limitations: normalizedLimitations(result.limitations)
      });
    } catch (submitError: any) {
      if (
        activeSourceRef.current !== submittedSourceKey ||
        requestVersionRef.current !== requestVersion
      ) {
        return;
      }
      setError(submitError?.message || "Unable to answer this question.");
    } finally {
      if (
        activeSourceRef.current === submittedSourceKey &&
        requestVersionRef.current === requestVersion
      ) {
        setPending(false);
      }
    }
  }

  const limitations = normalizedLimitations(response?.limitations);

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" aria-level={3} style={styles.title}>
        Ask about this result
      </Text>
      <Text style={styles.description}>
        Ask a focused follow-up while keeping this result visible. Review suggested
        questions before sending them.
      </Text>

      {suggestionOptions.length ? (
        <View style={styles.suggestions}>
          {suggestionOptions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityRole="button"
              accessibilityLabel={`Use suggested question: ${suggestion}`}
              accessibilityHint="Fills the question field so you can review it before using an AI credit."
              disabled={pending}
              onPress={() => chooseSuggestion(suggestion)}
              style={[styles.suggestion, pending && styles.disabled]}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextInput
        accessibilityLabel="Ask about this result"
        editable={!pending}
        multiline
        value={question}
        onChangeText={(value) => {
          setQuestion(value);
          setError("");
        }}
        placeholder="Type a specific question about the result or its evidence."
        placeholderTextColor={palette.textMuted}
        selectionColor={palette.accent}
        style={styles.input}
        textAlignVertical="top"
      />

      <Text style={styles.creditNotice}>
        Sending this follow-up uses 1 AI credit. Choosing or editing a suggestion does
        not.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask AI about this result for 1 AI credit"
        accessibilityState={{ disabled: !canSubmit, busy: pending }}
        disabled={!canSubmit}
        onPress={submitQuestion}
        style={[styles.submit, !canSubmit && styles.disabled]}
      >
        <Text style={styles.submitText}>
          {pending ? "Asking..." : "Ask AI (1 credit)"}
        </Text>
      </Pressable>

      {pending ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          Asking AI about this result...
        </Text>
      ) : null}

      {error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {response ? (
        <View accessibilityLiveRegion="polite" style={styles.answerCard}>
          <Text accessibilityRole="header" aria-level={4} style={styles.answerTitle}>
            AI follow-up answer
          </Text>
          <Text style={styles.answer}>{response.answer}</Text>
          <View style={styles.answerMeta}>
            <Text style={styles.metaText}>
              Provider: {response.providerLabel || "Not reported"}
            </Text>
            <Text style={styles.metaText}>
              Evidence inspected:{" "}
              {response.evidenceInspected === true
                ? "Yes"
                : response.evidenceInspected === false
                  ? "No"
                  : "Not reported"}
            </Text>
          </View>
          {limitations.length ? (
            <View style={styles.limitations}>
              <Text style={styles.limitationsTitle}>Limitations</Text>
              {limitations.map((limitation, index) => (
                <Text key={`${index}-${limitation}`} style={styles.metaText}>
                  - {limitation}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function createResultQuestionCardStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    title: { color: palette.text, fontSize: 17, fontWeight: "800" },
    description: { color: palette.textMuted, lineHeight: 20 },
    suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    suggestion: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    suggestionText: { color: palette.link, fontWeight: "700" },
    input: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      color: palette.text,
      lineHeight: 20,
      minHeight: 92,
      padding: 12
    },
    creditNotice: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    submit: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: 10,
      minHeight: 46,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    submitText: { color: palette.accentText, fontSize: 15, fontWeight: "800" },
    disabled: { opacity: 0.5 },
    status: { color: palette.info, fontWeight: "700" },
    error: { color: palette.danger, fontWeight: "700", lineHeight: 20 },
    answerCard: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.borderSoft,
      borderRadius: 10,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    answerTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
    answer: { color: palette.text, lineHeight: 21 },
    answerMeta: { gap: 3 },
    metaText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    limitations: { gap: 3 },
    limitationsTitle: { color: palette.text, fontSize: 13, fontWeight: "800" }
  });
}
