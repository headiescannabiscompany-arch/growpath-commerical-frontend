import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { getTokenBalance } from "../api/tokens";
import ScreenContainer from "../components/ScreenContainer";
import { radius } from "../theme/theme";
import { FREE_POLICY } from "../config/freePolicy";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ACTION_COSTS = [
  {
    action: "Rule-based calculators and fallbacks",
    credits: "0 tokens",
    note: "VPD, DLI, nutrient math, risk rules, and fallback answers do not call the model."
  },
  {
    action: "Text symptom analysis",
    credits: "0 tokens",
    note: "Uses GrowPath's diagnostic rules without calling an AI provider."
  },
  {
    action: "Ask AI",
    credits: `${FREE_POLICY.aiActions.assistant.credits} token`,
    note: `One completed provider-backed answer costs one token (about $${FREE_POLICY.aiActions.assistant.estimatedUsd.toFixed(3)} of metered usage value).`
  },
  {
    action: "Facility form help",
    credits: `${FREE_POLICY.aiActions.assistant.credits} token`,
    note: `The rule-based draft is free; a completed provider review uses the token (about $${FREE_POLICY.aiActions.assistant.estimatedUsd.toFixed(3)} of metered usage value).`
  },
  {
    action: "Plant Diagnose",
    credits: `${FREE_POLICY.aiActions.diagnosis.credits} tokens`,
    note: `One completed photo diagnosis costs three tokens (about $${FREE_POLICY.aiActions.diagnosis.estimatedUsd.toFixed(2)} of metered usage value).`
  }
];

export default function TokenInfoScreen() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getTokenBalance(undefined, { timeoutMs: 8000 })
      .then((response) => {
        if (alive) setBalance(response?.data ?? response);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const values = useMemo(() => {
    const current = Number(balance?.aiTokens);
    const maximum = Number(balance?.maxTokens);
    const validCurrent = Number.isFinite(current) && current >= 0 ? current : null;
    const validMaximum = Number.isFinite(maximum) && maximum > 0 ? maximum : null;
    return {
      current: validCurrent,
      maximum: validMaximum,
      percent:
        validCurrent !== null && validMaximum
          ? clamp((validCurrent / validMaximum) * 100, 0, 100)
          : 0
    };
  }, [balance]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>How GrowPathAI works</Text>
        <Text style={styles.intro}>
          GrowPathAI combines your question with the grow, room, plant, recent log, photo,
          or environmental context you choose. You stay in control of what is saved and
          what actions are created.
        </Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your live AI-credit balance</Text>
          <Text style={styles.balanceValue}>
            {loading
              ? "Checking..."
              : values.current === null
                ? "Unavailable"
                : `${values.current} / ${values.maximum ?? "-"}`}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${values.percent}%` }]} />
          </View>
          <Text style={styles.helpText}>
            {loadFailed
              ? "GrowPathAI could not verify your balance, so it is not showing a guessed plan allowance."
              : balance?.refillDescription || "Configured AI allowances refresh weekly."}
          </Text>
          {balance?.nextRefresh ? (
            <Text style={styles.helpText}>
              Next refresh: {new Date(balance.nextRefresh).toLocaleString()}
            </Text>
          ) : null}
        </View>

        <View style={styles.estimatesSection}>
          <Text style={styles.sectionTitle}>What actions cost</Text>
          <Text style={styles.estimateIntro}>
            Free accounts receive {FREE_POLICY.aiCreditsPerWeek} AI credits each week.
            These are the exact credits deducted; dollar figures are small usage-value
            equivalents, not separate card charges.
          </Text>
          {ACTION_COSTS.map((estimate) => (
            <View key={estimate.action} style={styles.estimateCard}>
              <View style={styles.estimateHeader}>
                <Text style={styles.estimateAction}>{estimate.action}</Text>
                <Text style={styles.creditBadge}>{estimate.credits}</Text>
              </View>
              <Text style={styles.estimateNote}>{estimate.note}</Text>
            </View>
          ))}
          <Text style={styles.estimateFootnote}>
            These are fixed per completed action, not estimates. Failed provider calls are
            refunded. Free rule-based results do not reduce the balance.
          </Text>
        </View>

        <Section title="1. You provide the context">
          Select a facility, room, grow, plant, photo, reading, or journal entry.
          GrowPathAI uses only the workspace information your account is allowed to
          access.
        </Section>
        <Section title="2. GrowPathAI analyzes it">
          Ask AI and contextual tools turn that information into an explanation,
          recommendations, warnings, and suggested next steps. Credits are charged only
          when GrowPathAI completes real provider-backed model work. Rule-based
          calculators and fallbacks are free. Plant Diagnose uses 3 credits;
          provider-backed text assistance uses 1. GrowPathAI shows the real server balance
          and does not invent a plan balance when it cannot connect.
        </Section>
        <Section title="3. Higher-risk answers can be checked">
          Where a verification workflow is enabled, such as supported IPM analysis, the
          same context can be sent for a separate GPT review. GrowPathAI shows both
          answers and saves both with the tool run. This is not enabled for every tool,
          and GrowPathAI does not claim a Grok review unless one was actually run.
        </Section>
        <Section title="4. You review and save the result">
          A result can be saved to the grow record and used to create a log, task,
          warning, or timeline event. Suggested actions are not silently applied to
          equipment or your crop.
        </Section>
        <Section title="Use AI safely">
          AI can be wrong. Confirm pesticide labels, local law, worker-safety rules, and
          important crop decisions with qualified sources. GrowPathAI does not directly
          control connected equipment or authorize regulated sales.
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.bodyText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 48,
    width: "100%",
    maxWidth: 820,
    alignSelf: "center"
  },
  title: { fontSize: 28, fontWeight: "800", color: "#16352b", marginBottom: 10 },
  intro: { fontSize: 16, lineHeight: 24, color: "#374151", marginBottom: 20 },
  balanceCard: {
    backgroundColor: "#f0fdf4",
    borderColor: "#22c55e",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 22
  },
  balanceLabel: { color: "#166534", fontWeight: "700", marginBottom: 6 },
  balanceValue: { color: "#14532d", fontSize: 30, fontWeight: "800", marginBottom: 12 },
  progressBar: {
    height: 10,
    backgroundColor: "#d1d5db",
    borderRadius: radius.pill,
    overflow: "hidden"
  },
  progressFill: { height: "100%", backgroundColor: "#16a34a" },
  helpText: { color: "#4b5563", fontSize: 13, lineHeight: 19, marginTop: 10 },
  estimatesSection: { marginBottom: 24 },
  estimateIntro: { color: "#4b5563", fontSize: 14, lineHeight: 21, marginBottom: 12 },
  estimateCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d1d5db",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 10
  },
  estimateHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  estimateAction: { flex: 1, color: "#1f2937", fontSize: 15, fontWeight: "700" },
  creditBadge: {
    color: "#166534",
    backgroundColor: "#dcfce7",
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden"
  },
  estimateNote: { color: "#6b7280", fontSize: 13, lineHeight: 19, marginTop: 5 },
  estimateFootnote: { color: "#6b7280", fontSize: 12, lineHeight: 18, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { color: "#1f2937", fontSize: 18, fontWeight: "700", marginBottom: 7 },
  bodyText: { color: "#4b5563", fontSize: 15, lineHeight: 23 }
});
