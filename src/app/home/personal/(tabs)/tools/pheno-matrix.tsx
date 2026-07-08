import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  DEFAULT_PHENO_WEIGHTS,
  PHENO_TRAITS,
  PhenoCandidateInput,
  PhenoTraitKey,
  PhenoTraitWeights,
  rankPhenoCandidates
} from "@/features/personal/tools/phenoMatrix";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateTasks,
  saveToolRunResult
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";

const initialCandidates: PhenoCandidateInput[] = [
  {
    id: "p1",
    label: "Plant 1",
    generation: "F1",
    stage: "flower",
    vigor: 7,
    structure: 7,
    aroma: 8,
    resin: 8,
    yield: 7,
    resistance: 7,
    uniformity: 7,
    notes: "Balanced keeper candidate."
  },
  {
    id: "p2",
    label: "Plant 2",
    generation: "F1",
    stage: "flower",
    vigor: 8,
    structure: 6,
    aroma: 7,
    resin: 7,
    yield: 8,
    resistance: 6,
    uniformity: 6,
    notes: "Good production traits; watch structure."
  },
  {
    id: "p3",
    label: "Plant 3",
    generation: "F1",
    stage: "flower",
    vigor: 6,
    structure: 8,
    aroma: 9,
    resin: 8,
    yield: 6,
    resistance: 7,
    uniformity: 8,
    notes: "Strong sensory profile."
  }
];

function numericText(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export default function PhenoMatrixScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(rawGrowId);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_PHENO_MATRIX);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [weights, setWeights] = useState<PhenoTraitWeights>({
    ...DEFAULT_PHENO_WEIGHTS,
    aroma: 1.5,
    resin: 1.5,
    resistance: 1.25
  });
  const [savedRunId, setSavedRunId] = useState("");
  const [feedback, setFeedback] = useState("");

  const ranked = useMemo(
    () => rankPhenoCandidates(candidates, weights),
    [candidates, weights]
  );
  const topCandidate = ranked[0];
  const keepers = ranked.filter((candidate) => candidate.recommendation === "keeper");
  const watches = ranked.filter((candidate) => candidate.recommendation === "watch");
  const matrixInput = useMemo(
    () => ({
      candidates,
      weights
    }),
    [candidates, weights]
  );
  const matrixOutput = useMemo(
    () => ({
      ranked,
      topCandidate,
      keeperCount: keepers.length,
      watchCount: watches.length
    }),
    [keepers.length, ranked, topCandidate, watches.length]
  );

  function updateCandidate(id: string, key: keyof PhenoCandidateInput, value: string) {
    setSavedRunId("");
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              [key]:
                key === "label" ||
                key === "generation" ||
                key === "stage" ||
                key === "notes"
                  ? value
                  : parseNumber(value)
            }
          : candidate
      )
    );
  }

  function updateWeight(key: PhenoTraitKey, value: string) {
    setWeights((current) => ({ ...current, [key]: parseNumber(value) }));
    setSavedRunId("");
  }

  async function saveMatrixRun() {
    if (!growId) throw new Error("Select a grow before saving this matrix.");
    const result = await saveToolRunResult({
      growId,
      toolKey: "pheno-matrix",
      input: matrixInput,
      output: matrixOutput
    });
    if (!result.ok) throw new Error(result.error);
    setSavedRunId(result.toolRunId);
    setFeedback("Saved pheno matrix ToolRun.");
  }

  async function createDecisionTasks() {
    if (!growId) throw new Error("Select a grow before creating a review task.");
    const candidateLabel = topCandidate?.label || "top pheno";
    const scoreLine = topCandidate
      ? `${candidateLabel} ranked #1 with ${topCandidate.normalizedScore.toFixed(2)}/10 and ${topCandidate.recommendation.toUpperCase()} recommendation.`
      : "Review ranked pheno candidates before making final keeper decisions.";
    const result = await saveToolRunAndCreateTasks({
      growId,
      toolKey: "pheno-matrix",
      toolRunId: savedRunId || undefined,
      input: matrixInput,
      output: matrixOutput,
      tasks: [
        {
          title: `Review pheno keeper evidence: ${candidateLabel}`,
          description: `${scoreLine} Review photos, morphology, vigor, aroma, resin, pest resistance, and stress notes before changing keeper status.`,
          priority: keepers.length ? "high" : "medium",
          dueDate: daysFromNow(1)
        },
        {
          title: `Verify clone and stress response: ${candidateLabel}`,
          description:
            "Confirm clone status, rooting behavior, stress tolerance, pest/disease tolerance, and whether backup cuts or mother stock should be kept.",
          priority: "medium",
          dueDate: daysFromNow(3)
        },
        {
          title: `Record dry/cure smoke and hash notes: ${candidateLabel}`,
          description:
            "After dry/cure, add smell, taste, smoke quality, resin behavior, hash value, and any lab or wash notes to support the keeper/reject decision.",
          priority: "medium",
          dueDate: daysFromNow(14)
        },
        {
          title: `Mark final keeper/reject/watch decision: ${candidateLabel}`,
          description:
            "Save the final decision with reasoning, including what data supported the call and where selected keeper data should flow next.",
          priority: keepers.length ? "high" : "medium",
          dueDate: daysFromNow(21)
        }
      ]
    });
    if (!result.ok) throw new Error(result.error);
    if (!savedRunId) setSavedRunId(result.toolRunId);
    setFeedback("Created pheno decision tasks.");
  }

  if (!enabled) {
    return (
      <ScreenBoundary
        title="Pheno Matrix"
        showBack
        backFallbackHref="/home/personal/tools"
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Pheno Matrix</Text>
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>Tool unavailable</Text>
            <Text style={styles.subtitle}>
              This account does not have `TOOL_PHENO_MATRIX`.
            </Text>
            <PersonalFeedPlacement
              placement="top"
              routeKey="personal_tools_pheno_matrix"
              longContent
            />
          </View>
        </ScrollView>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary title="Pheno Matrix" showBack backFallbackHref="/home/personal/tools">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Pheno Matrix</Text>
        <Text style={styles.subtitle}>
          Score candidate plants from 0 to 10, adjust trait weights, and rank keeper
          selections.
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_pheno_matrix"
          longContent
        />
        {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trait weights</Text>
          <View style={styles.weightGrid}>
            {PHENO_TRAITS.map((trait) => (
              <View key={trait.key} style={styles.weightCell}>
                <Text style={styles.label}>{trait.label}</Text>
                <TextInput
                  style={styles.weightInput}
                  value={numericText(weights[trait.key])}
                  onChangeText={(value) => updateWeight(trait.key, value)}
                  keyboardType="numeric"
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Candidates</Text>
          {candidates.map((candidate) => (
            <View key={candidate.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.label}>Label</Text>
                  <TextInput
                    style={styles.input}
                    value={candidate.label}
                    onChangeText={(value) =>
                      updateCandidate(candidate.id, "label", value)
                    }
                  />
                </View>
                <View style={styles.smallField}>
                  <Text style={styles.label}>Generation</Text>
                  <TextInput
                    style={styles.input}
                    value={candidate.generation}
                    onChangeText={(value) =>
                      updateCandidate(candidate.id, "generation", value)
                    }
                  />
                </View>
                <View style={styles.smallField}>
                  <Text style={styles.label}>Stage</Text>
                  <TextInput
                    style={styles.input}
                    value={candidate.stage}
                    onChangeText={(value) =>
                      updateCandidate(candidate.id, "stage", value)
                    }
                  />
                </View>
              </View>

              <View style={styles.traitGrid}>
                {PHENO_TRAITS.map((trait) => (
                  <View key={trait.key} style={styles.traitCell}>
                    <Text style={styles.label}>{trait.label}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={numericText(candidate[trait.key])}
                      onChangeText={(value) =>
                        updateCandidate(candidate.id, trait.key, value)
                      }
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={candidate.notes || ""}
                onChangeText={(value) => updateCandidate(candidate.id, "notes", value)}
                multiline
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ranked selections</Text>
          {ranked.map((candidate) => (
            <View key={candidate.id} style={styles.rankRow}>
              <Text style={styles.rankNumber}>#{candidate.rank}</Text>
              <View style={styles.rankBody}>
                <Text style={styles.rankTitle}>{candidate.label}</Text>
                <Text style={styles.rankMeta}>
                  {candidate.generation} | {candidate.stage} |{" "}
                  {candidate.recommendation.toUpperCase()}
                </Text>
              </View>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>
                  {candidate.normalizedScore.toFixed(2)}
                </Text>
                <Text style={styles.scoreLabel}>/ 10</Text>
              </View>
            </View>
          ))}
        </View>

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_tools_pheno_matrix"
          longContent
        />

        <View style={styles.section}>
          <ToolResultSurface
            title="Pheno matrix result"
            status={topCandidate ? topCandidate.recommendation.toUpperCase() : "READY"}
            summary={
              topCandidate
                ? `${topCandidate.label} is currently ranked #1 at ${topCandidate.normalizedScore.toFixed(2)}/10. Treat this as a decision aid, not a final keeper call.`
                : "Score candidates to rank pheno selections."
            }
            metrics={[
              {
                key: "candidates",
                label: "Candidates",
                value: String(candidates.length)
              },
              {
                key: "keepers",
                label: "Keeper calls",
                value: String(keepers.length)
              },
              {
                key: "watch",
                label: "Watch calls",
                value: String(watches.length)
              }
            ]}
            inputs={matrixInput}
            outputs={matrixOutput}
            recommendations={[
              "Confirm the top rank against photos, clone performance, stress response, and production goals.",
              "Do not make keeper decisions from weighted scores alone.",
              "Record rerun/reject reasons before cutting candidates."
            ]}
            formulas={[
              "Each trait is clamped to 0-10 for scoring, multiplied by its weight, then normalized by total positive weight.",
              "Default calls: keeper >= 8, watch >= 6, otherwise cull."
            ]}
            uncertainty="Current v1 matrix does not yet persist full pheno hunt projects, photos, lab/smoke review, clone performance, or stress-test history."
            confidence="local-weighted-score"
            actions={[
              {
                key: "save-run",
                label: savedRunId ? "Matrix Saved" : "Save Tool Run",
                pendingLabel: "Saving...",
                disabled: !growId || Boolean(savedRunId),
                onPress: saveMatrixRun
              },
              {
                key: "create-task",
                label: "Create Pheno Decision Tasks",
                variant: "secondary",
                pendingLabel: "Creating...",
                disabled: !growId,
                onPress: createDecisionTasks
              }
            ]}
            feedback={feedback}
            contextMessage={
              !growId
                ? "Open this tool from a grow to save pheno matrix runs and create keeper review tasks."
                : undefined
            }
            copyPayload={matrixOutput}
          />
        </View>

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_pheno_matrix"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 44 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6, color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#64748B", lineHeight: 20 },
  context: { color: "#166534", fontWeight: "800", marginTop: 8 },
  section: { marginTop: 22 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 10
  },
  weightGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  weightCell: { width: 136 },
  label: { fontSize: 12, fontWeight: "700", color: "#475569", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#FFFFFF"
  },
  weightInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#F8FAFC"
  },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#F8FAFC"
  },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  flex: { flex: 1, minWidth: 140 },
  smallField: { width: 104 },
  traitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
    marginBottom: 12
  },
  traitCell: { width: 104 },
  scoreInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#FFFFFF"
  },
  notesInput: {
    minHeight: 66,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF"
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#F0FDF4"
  },
  rankNumber: { width: 36, fontSize: 16, fontWeight: "800", color: "#166534" },
  rankBody: { flex: 1 },
  rankTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  rankMeta: { marginTop: 2, fontSize: 12, color: "#475569" },
  scoreBadge: {
    width: 72,
    borderRadius: radius.card,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#166534"
  },
  scoreText: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  scoreLabel: { fontSize: 11, fontWeight: "700", color: "#DCFCE7" },
  lockedCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.card,
    padding: 16,
    backgroundColor: "#FEF2F2"
  },
  lockedTitle: { fontSize: 16, fontWeight: "700", color: "#991B1B" }
});
