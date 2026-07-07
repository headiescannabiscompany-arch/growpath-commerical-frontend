import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  fetchProductTrial,
  ProductTrial,
  saveProductTrialAIReview,
  updateProductTrial
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

function cleanId(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function trialTitle(trial: ProductTrial | null) {
  return trial?.trialName || trial?.name || "Commercial Product Trial";
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function trialClaimWarnings(trial: ProductTrial | null) {
  const warnings: string[] = [];
  const review = trial?.AIReview || trial?.aiReview || {};
  const measurements = trial?.measurements || {};
  if (trial?.status !== "complete") warnings.push("complete trial");
  if (!trial?.productId) warnings.push("link product");
  if (!trial?.batchId) warnings.push("link batch/lot");
  if (!trial?.growId) warnings.push("link evidence run");
  if (!trial?.effectivenessSummary?.trim()) warnings.push("add effectiveness summary");
  if (!trial?.harvestQualityNotes?.trim()) warnings.push("add harvest quality notes");
  if (!trial?.commercialCropSummary?.trim()) warnings.push("add crop summary");
  if (!review.summary?.trim()) warnings.push("save AI review summary");
  if (!Array.isArray(review.evidence) || !review.evidence.length) {
    warnings.push("save AI review evidence");
  }
  if (!measurements?.pHChecks && !measurements?.ecChecks && !measurements?.yieldData) {
    warnings.push("add measurement data");
  }
  return warnings;
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

export default function CommercialTrialDetailRoute({ route }: { route?: any } = {}) {
  const params = useLocalSearchParams<{ trialId?: string }>();
  const trialId = useMemo(
    () => cleanId(params.trialId || route?.params?.trialId || route?.params?.id),
    [params.trialId, route?.params?.trialId, route?.params?.id]
  );
  const [trial, setTrial] = useState<ProductTrial | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [effectivenessSummary, setEffectivenessSummary] = useState("");
  const [harvestQualityNotes, setHarvestQualityNotes] = useState("");
  const [commercialCropSummary, setCommercialCropSummary] = useState("");
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewEvidence, setReviewEvidence] = useState("");
  const [reviewLimitations, setReviewLimitations] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const hydrate = useCallback((next: ProductTrial | null) => {
    setTrial(next);
    setStatus(next?.status || "planned");
    setNotes(next?.notes || "");
    setEffectivenessSummary(next?.effectivenessSummary || "");
    setHarvestQualityNotes(next?.harvestQualityNotes || "");
    setCommercialCropSummary(next?.commercialCropSummary || "");
    const review = next?.AIReview || next?.aiReview || {};
    setReviewSummary(review.summary || "");
    setReviewEvidence(Array.isArray(review.evidence) ? review.evidence.join("\n") : "");
    setReviewLimitations(
      Array.isArray(review.limitations) ? review.limitations.join("\n") : ""
    );
  }, []);

  const load = useCallback(async () => {
    if (!trialId) return;
    setLoading(true);
    setError(null);
    try {
      hydrate(await fetchProductTrial(trialId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [hydrate, trialId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!trialId) return;
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      const updated = await updateProductTrial(trialId, {
        status: (status.trim() || "planned") as ProductTrial["status"],
        notes: notes.trim(),
        effectivenessSummary: effectivenessSummary.trim(),
        harvestQualityNotes: harvestQualityNotes.trim(),
        commercialCropSummary: commercialCropSummary.trim()
      });
      hydrate(updated);
      setMessage("Product trial updated.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function saveReview() {
    if (!trialId) return;
    setReviewing(true);
    setMessage("");
    setError(null);
    try {
      const updated = await saveProductTrialAIReview(trialId, {
        summary: reviewSummary.trim(),
        evidence: splitLines(reviewEvidence),
        limitations: splitLines(reviewLimitations)
      });
      hydrate(updated);
      setMessage("Claim-safe AI review saved.");
    } catch (err) {
      setError(err);
    } finally {
      setReviewing(false);
    }
  }

  const measurements = trial?.measurements || {};
  const claimWarnings = trialClaimWarnings(trial);
  const evidenceCount = [
    trial?.productId,
    trial?.productLineId,
    trial?.batchId,
    trial?.growId,
    measurements?.pHChecks,
    measurements?.ecChecks,
    measurements?.yieldData,
    measurements?.harvestData,
    measurements?.dryCureData
  ].filter(Boolean).length;

  return (
    <AppPage
      routeKey="commercial-trial-detail"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial evidence workspace</Text>
          <Text style={styles.title}>{trialTitle(trial)}</Text>
          <Text style={styles.subtitle}>
            Keep product trials tied to evidence runs, batches, measurements, limitations,
            and claim-safe public summaries.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/trials" label="All Trials" />
            <ActionLink href="/home/commercial/grows" label="Evidence Runs" />
            <ActionLink href="/home/commercial/products" label="Products" />
          </View>
        </View>
      }
    >
      {loading ? <Text style={styles.muted}>Loading product trial...</Text> : null}
      {error ? <InlineError error={error} /> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <AppCard>
        <Text style={styles.cardTitle}>Trial Record</Text>
        <Text style={styles.body}>
          This is the private evidence record behind product claims, storefront proof,
          feed campaigns, courses, and Forum/Q&A support answers.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Purpose" value={trial?.purpose} />
          <DetailRow label="Status" value={trial?.status} />
          <DetailRow label="Crop" value={trial?.cropType} />
          <DetailRow label="Cultivar" value={trial?.cultivar} />
          <DetailRow label="Plant count" value={trial?.plantCount} />
          <DetailRow label="Evidence links" value={evidenceCount} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Linked Commercial Evidence</Text>
        <Text style={styles.body}>
          A trial is stronger when it links the product, formula/batch, grow, and
          measurements instead of relying on marketing copy.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Product ID" value={trial?.productId} />
          <DetailRow label="Product line ID" value={trial?.productLineId} />
          <DetailRow label="Batch ID" value={trial?.batchId} />
          <DetailRow label="Evidence run ID" value={trial?.growId} />
        </View>
        <View style={styles.actions}>
          {trial?.productId ? (
            <ActionLink
              href={`/home/commercial/products/${encodeURIComponent(trial.productId)}`}
              label="Open Product"
            />
          ) : null}
          {trial?.growId ? (
            <ActionLink
              href={`/home/commercial/grows/${encodeURIComponent(trial.growId)}`}
              label="Open Evidence Run"
            />
          ) : null}
          <ActionLink href="/home/commercial/batch-planner" label="Batch Planner" />
          <ActionLink href="/home/commercial/analytics" label="Analytics" />
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Claim Readiness</Text>
          <Text style={[styles.statusPill, !claimWarnings.length && styles.readyPill]}>
            {claimWarnings.length ? "Evidence building" : "Claim-ready"}
          </Text>
        </View>
        <Text style={styles.body}>
          Trials stay private evidence until completion, linked product/batch/grow
          records, measurement data, summaries, and AI review evidence support the public
          claim.
        </Text>
        {claimWarnings.length ? (
          <View style={styles.warningBox}>
            {claimWarnings.map((warning) => (
              <Text key={warning} style={styles.warningText}>
                Missing {warning}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.success}>
            This trial has the minimum support for cautious storefront, course, feed, or
            forum proof points.
          </Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Effectiveness Summary</Text>
        <Text style={styles.body}>
          Save the private working summary here. Publish only claims supported by saved
          evidence runs, measurements, photos, harvest, dry/cure, or comparison records.
        </Text>
        <TextInput
          accessibilityLabel="Commercial trial status"
          onChangeText={setStatus}
          placeholder="planned, active, complete, archived"
          style={styles.input}
          value={status}
        />
        <TextInput
          accessibilityLabel="Commercial trial effectiveness summary"
          multiline
          onChangeText={setEffectivenessSummary}
          placeholder="Observed results, plant response, quality notes, missing data..."
          style={[styles.input, styles.textArea]}
          value={effectivenessSummary}
        />
        <TextInput
          accessibilityLabel="Commercial trial harvest quality notes"
          multiline
          onChangeText={setHarvestQualityNotes}
          placeholder="Harvest quality notes: yield, aroma, flavor, resin, dry/cure result, defects, final product quality..."
          style={[styles.input, styles.textArea]}
          value={harvestQualityNotes}
        />
        <TextInput
          accessibilityLabel="Commercial trial crop summary"
          multiline
          onChangeText={setCommercialCropSummary}
          placeholder="Commercial crop summary: product used, outcome, final quality, limitations, next-run changes..."
          style={[styles.input, styles.textArea]}
          value={commercialCropSummary}
        />
        <TextInput
          accessibilityLabel="Commercial trial notes"
          multiline
          onChangeText={setNotes}
          placeholder="Trial notes, measurement gaps, control group notes, next checks..."
          style={[styles.input, styles.textArea]}
          value={notes}
        />
        <Pressable
          accessibilityLabel="Save commercial trial detail"
          accessibilityRole="button"
          disabled={saving || !trialId}
          onPress={saveChanges}
          style={[styles.primaryAction, saving || !trialId ? styles.disabled : null]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Saving..." : "Save Trial Detail"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Claim-Safe AI Review</Text>
        <Text style={styles.body}>
          Store a cautious review that separates observations, evidence, and limitations.
          This should guide public copy without overclaiming causation.
        </Text>
        <TextInput
          accessibilityLabel="Commercial trial AI review summary"
          multiline
          onChangeText={setReviewSummary}
          placeholder="Trial review summary"
          style={[styles.input, styles.textArea]}
          value={reviewSummary}
        />
        <TextInput
          accessibilityLabel="Commercial trial AI review evidence"
          multiline
          onChangeText={setReviewEvidence}
          placeholder="Evidence, one item per line"
          style={[styles.input, styles.textArea]}
          value={reviewEvidence}
        />
        <TextInput
          accessibilityLabel="Commercial trial AI review limitations"
          multiline
          onChangeText={setReviewLimitations}
          placeholder="Limitations, one item per line"
          style={[styles.input, styles.textArea]}
          value={reviewLimitations}
        />
        <Pressable
          accessibilityLabel="Save commercial trial AI review"
          accessibilityRole="button"
          disabled={reviewing || !trialId}
          onPress={saveReview}
          style={[styles.primaryAction, reviewing || !trialId ? styles.disabled : null]}
        >
          <Text style={styles.primaryActionText}>
            {reviewing ? "Saving review..." : "Save AI Review"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Publish Path</Text>
        <Text style={styles.bullet}>
          Complete the trial before using it as strong product proof.
        </Text>
        <Text style={styles.bullet}>
          Attach product, batch, grow, pH/EC, diagnosis, harvest, and dry/cure evidence.
        </Text>
        <Text style={styles.bullet}>
          Use cautious language: may have contributed, observed in this trial, limited
          sample size.
        </Text>
        <Text style={styles.bullet}>
          Turn the final summary into a feed campaign, storefront proof point, course
          lesson, or forum answer.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
          <ActionLink href="/home/commercial/storefront" label="Storefront" />
          <ActionLink href="/home/commercial/courses" label="Courses" />
          <ActionLink href="/home/commercial/community" label="Community" />
        </View>
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
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
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
  statusPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    color: "#92400E",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  readyPill: { backgroundColor: "#DCFCE7", color: "#166534" },
  warningBox: { gap: 6, marginTop: 10 },
  warningText: { color: "#92400E", fontSize: 13, fontWeight: "700" },
  bullet: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 6
  }
});
