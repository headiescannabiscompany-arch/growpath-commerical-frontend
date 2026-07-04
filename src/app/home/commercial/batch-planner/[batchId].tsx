import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  fetchSoilNutrientBatch,
  SoilNutrientBatch,
  updateSoilNutrientBatch
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

function cleanId(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function batchTitle(batch: SoilNutrientBatch | null) {
  return batch?.batchName || batch?.name || "Commercial Batch";
}

function DetailRow({ label, value }: { label: string; value?: unknown }) {
  const display = String(value || "").trim();
  if (!display) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{display}</Text>
    </View>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialBatchDetailRoute({ route }: { route?: any } = {}) {
  const params = useLocalSearchParams<{ batchId?: string }>();
  const batchId = useMemo(
    () => cleanId(params.batchId || route?.params?.batchId || route?.params?.id),
    [params.batchId, route?.params?.batchId, route?.params?.id]
  );
  const [batch, setBatch] = useState<SoilNutrientBatch | null>(null);
  const [status, setStatus] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [releaseTimelineNotes, setReleaseTimelineNotes] = useState("");
  const [guaranteedAnalysisNotes, setGuaranteedAnalysisNotes] = useState("");
  const [ingredientSummary, setIngredientSummary] = useState("");
  const [mixingInstructions, setMixingInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const hydrate = useCallback((next: SoilNutrientBatch | null) => {
    setBatch(next);
    setStatus(next?.status || "planned");
    setEstimatedCost(next?.estimatedCost != null ? String(next.estimatedCost) : "");
    setReleaseTimelineNotes(next?.releaseTimelineNotes || "");
    setGuaranteedAnalysisNotes(next?.guaranteedAnalysisNotes || "");
    setIngredientSummary(next?.ingredientSummary || "");
    setMixingInstructions(next?.mixingInstructions || "");
    setNotes(next?.notes || "");
  }, []);

  const load = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError(null);
    try {
      hydrate(await fetchSoilNutrientBatch(batchId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [batchId, hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!batchId) return;
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      const parsedCost = Number(estimatedCost);
      const updated = await updateSoilNutrientBatch(batchId, {
        status: (status.trim() || "planned") as SoilNutrientBatch["status"],
        estimatedCost: Number.isFinite(parsedCost) ? parsedCost : undefined,
        releaseTimelineNotes: releaseTimelineNotes.trim(),
        guaranteedAnalysisNotes: guaranteedAnalysisNotes.trim(),
        ingredientSummary: ingredientSummary.trim(),
        mixingInstructions: mixingInstructions.trim(),
        notes: notes.trim()
      });
      hydrate(updated);
      setMessage("Commercial batch updated.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-batch-detail"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial formula batch</Text>
          <Text style={styles.title}>{batchTitle(batch)}</Text>
          <Text style={styles.subtitle}>
            Manage the private production batch record that links formula version,
            guaranteed analysis, release timing, inventory/cost, products, and trials.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/batch-planner" label="All Batches" />
            <ActionLink href="/home/commercial/products" label="Products" />
            <ActionLink href="/home/commercial/trials" label="Product Trials" />
          </View>
        </View>
      }
    >
      {loading ? <Text style={styles.muted}>Loading commercial batch...</Text> : null}
      {error ? <InlineError error={error} /> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <AppCard>
        <Text style={styles.cardTitle}>Batch Record</Text>
        <Text style={styles.body}>
          This record should connect formula math to the real mixed batch and future
          product effectiveness claims.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Batch code" value={batch?.batchCode} />
          <DetailRow label="Purpose" value={batch?.purpose} />
          <DetailRow label="Formula version" value={batch?.formulaVersion} />
          <DetailRow label="Status" value={batch?.status} />
          <DetailRow label="Volume" value={[batch?.batchVolume, batch?.batchVolumeUnit].filter(Boolean).join(" ")} />
          <DetailRow label="Estimated cost" value={batch?.estimatedCost} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Linked Commercial Workflow</Text>
        <Text style={styles.body}>
          Batches should link to products, product lines, trial grows, feed posts, and
          storefront proof only when the evidence is strong enough.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Product ID" value={batch?.productId} />
          <DetailRow label="Product line ID" value={batch?.productLineId} />
          <DetailRow label="Trial grow ID" value={batch?.trialGrowId} />
        </View>
        <View style={styles.actions}>
          {batch?.productId ? (
            <ActionLink
              href={`/home/commercial/products/${encodeURIComponent(batch.productId)}`}
              label="Open Product"
            />
          ) : null}
          {batch?.productLineId ? (
            <ActionLink
              href={`/home/commercial/product-lines/${encodeURIComponent(batch.productLineId)}`}
              label="Open Product Line"
            />
          ) : null}
          {batch?.trialGrowId ? (
            <ActionLink
              href={`/home/commercial/grows/${encodeURIComponent(batch.trialGrowId)}`}
              label="Open Trial Grow"
            />
          ) : null}
          <ActionLink href="/home/commercial/trials" label="Open Trials" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Formula Evidence</Text>
        <Text style={styles.body}>
          Keep guaranteed analysis and release timing visible so public product copy does
          not collapse formula work into a toy NPK claim.
        </Text>
        <TextInput
          accessibilityLabel="Commercial batch detail status"
          onChangeText={setStatus}
          placeholder="planned, mixed, resting, ready, used, archived"
          style={styles.input}
          value={status}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail estimated cost"
          keyboardType="decimal-pad"
          onChangeText={setEstimatedCost}
          placeholder="Estimated cost"
          style={styles.input}
          value={estimatedCost}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail guaranteed analysis notes"
          multiline
          onChangeText={setGuaranteedAnalysisNotes}
          placeholder="Guaranteed analysis, elemental estimate, source confidence"
          style={[styles.input, styles.textArea]}
          value={guaranteedAnalysisNotes}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail release timeline notes"
          multiline
          onChangeText={setReleaseTimelineNotes}
          placeholder="Fast, medium, slow release timing and uncertainty"
          style={[styles.input, styles.textArea]}
          value={releaseTimelineNotes}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail ingredient summary"
          multiline
          onChangeText={setIngredientSummary}
          placeholder="Ingredient pull sheet / ingredient summary"
          style={[styles.input, styles.textArea]}
          value={ingredientSummary}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail mixing instructions"
          multiline
          onChangeText={setMixingInstructions}
          placeholder="Mixing instructions, rest/cook timing, QC checks"
          style={[styles.input, styles.textArea]}
          value={mixingInstructions}
        />
        <TextInput
          accessibilityLabel="Commercial batch detail notes"
          multiline
          onChangeText={setNotes}
          placeholder="Batch notes, cost gaps, inventory shortages, trial plan"
          style={[styles.input, styles.textArea]}
          value={notes}
        />
        <Pressable
          accessibilityLabel="Save commercial batch detail"
          accessibilityRole="button"
          disabled={saving || !batchId}
          onPress={saveChanges}
          style={[styles.primaryAction, saving || !batchId ? styles.disabled : null]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Saving..." : "Save Batch Detail"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Commercial Use Rules</Text>
        <Text style={styles.bullet}>Do not call the module Living Soil Labs in the app.</Text>
        <Text style={styles.bullet}>Use guaranteed analysis plus release timing, not only NPK.</Text>
        <Text style={styles.bullet}>Treat compost/castings and organic release as estimated.</Text>
        <Text style={styles.bullet}>Link trial results before making public product claims.</Text>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: { color: "#0F172A", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#475569", lineHeight: 21 },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  body: { color: "#475569", fontSize: 14, lineHeight: 21, marginTop: 8 },
  muted: { color: "#64748B", fontSize: 13 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  detailRow: {
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 170,
    padding: 10
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  detailValue: { color: "#0F172A", fontSize: 14, fontWeight: "800", marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionText: { color: "#166534", fontSize: 13, fontWeight: "900" },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 14,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  success: { color: "#166534", fontSize: 13, fontWeight: "800", marginTop: 8 },
  bullet: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 6
  }
});
