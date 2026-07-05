import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  CommercialGrow,
  fetchCommercialGrow,
  updateCommercialGrow
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

function cleanId(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function titleFor(grow: CommercialGrow | null) {
  return grow?.name || grow?.growName || "Commercial Grow";
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

export default function CommercialGrowDetailRoute({ route }: { route?: any } = {}) {
  const params = useLocalSearchParams<{ growId?: string }>();
  const growId = useMemo(
    () => cleanId(params.growId || route?.params?.growId || route?.params?.id),
    [params.growId, route?.params?.growId, route?.params?.id]
  );
  const [grow, setGrow] = useState<CommercialGrow | null>(null);
  const [status, setStatus] = useState("");
  const [publicShareStatus, setPublicShareStatus] = useState("");
  const [harvestQualityNotes, setHarvestQualityNotes] = useState("");
  const [commercialCropSummary, setCommercialCropSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const hydrate = useCallback((next: CommercialGrow | null) => {
    setGrow(next);
    setStatus(next?.status || "active");
    setPublicShareStatus(next?.publicShareStatus || "evidence_building");
    setHarvestQualityNotes(next?.harvestQualityNotes || "");
    setCommercialCropSummary(next?.commercialCropSummary || "");
    setNotes(next?.notes || "");
  }, []);

  const load = useCallback(async () => {
    if (!growId) return;
    setLoading(true);
    setError(null);
    try {
      hydrate(await fetchCommercialGrow(growId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [growId, hydrate]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!growId) return;
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      const updated = await updateCommercialGrow(growId, {
        status: status.trim() || "active",
        publicShareStatus:
          (publicShareStatus.trim() as CommercialGrow["publicShareStatus"]) ||
          "evidence_building",
        harvestQualityNotes: harvestQualityNotes.trim(),
        commercialCropSummary: commercialCropSummary.trim(),
        notes: notes.trim()
      });
      hydrate(updated);
      setMessage("Commercial grow updated.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-grow-detail"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial grow workspace</Text>
          <Text style={styles.title}>{titleFor(grow)}</Text>
          <Text style={styles.subtitle}>
            Keep the grow as the private source of truth, then connect product, batch,
            formula, trial, public-share, feed, and report workflows around it.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/grows" label="All Grows" />
            <ActionLink href="/home/personal/grows" label="Pro Grow Workspace" />
            <ActionLink href="/home/commercial/trials" label="Product Trials" />
          </View>
        </View>
      }
    >
      {loading ? <Text style={styles.muted}>Loading commercial grow...</Text> : null}
      {error ? <InlineError error={error} /> : null}

      <AppCard>
        <Text style={styles.cardTitle}>Commercial Context</Text>
        <Text style={styles.body}>
          This layer tracks why the grow exists commercially: product trial, soil trial,
          demo grow, genetics test, plant inventory grow, or private business grow.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Purpose" value={grow?.purpose} />
          <DetailRow label="Crop" value={grow?.cropType} />
          <DetailRow label="Cultivar / line" value={grow?.cultivar} />
          <DetailRow label="Medium" value={grow?.medium} />
          <DetailRow label="Plant count" value={grow?.plantCount} />
          <DetailRow label="Status" value={grow?.status} />
          <DetailRow label="Public-share status" value={grow?.publicShareStatus} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Linked Evidence</Text>
        <Text style={styles.body}>
          Product claims should be tied back to saved grow evidence, formula versions,
          batches, measurements, and final outcomes.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Product ID" value={grow?.productId} />
          <DetailRow label="Product line ID" value={grow?.productLineId} />
          <DetailRow label="Batch ID" value={grow?.batchId} />
          <DetailRow label="Formula version" value={grow?.formulaVersion} />
        </View>
        <View style={styles.actions}>
          {grow?.productId ? (
            <ActionLink
              href={`/home/commercial/products?productId=${encodeURIComponent(grow.productId)}`}
              label="Open Product"
            />
          ) : null}
          {grow?.batchId ? (
            <ActionLink
              href={`/home/commercial/batch-planner?batchId=${encodeURIComponent(grow.batchId)}`}
              label="Open Batch"
            />
          ) : null}
          <ActionLink href="/home/commercial/feed" label="Create Feed Update" />
          <ActionLink href="/home/commercial/analytics" label="Analytics" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Measurement Plan</Text>
        <Text style={styles.body}>
          {grow?.measurementPlan ||
            "No measurement plan saved yet. Add pH/EC checks, vigor scoring, diagnosis, steering, harvest, dry/cure, and final quality notes before using this grow as public proof."}
        </Text>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Harvest Quality Notes</Text>
        <Text style={styles.body}>
          Capture the final quality evidence that matters commercially: yield, flower
          structure, aroma, flavor, resin, dry/cure result, defects, and what can be used
          publicly.
        </Text>
        <TextInput
          accessibilityLabel="Commercial grow harvest quality notes"
          multiline
          onChangeText={setHarvestQualityNotes}
          placeholder="Aroma, flavor, resin, yield, trim quality, dry/cure notes, defects, customer-facing quality notes..."
          style={[styles.input, styles.textArea]}
          value={harvestQualityNotes}
        />
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Commercial Crop Summary</Text>
        <Text style={styles.body}>
          Use this as the report-ready summary for the crop run. Keep it evidence-backed
          and cautious enough for storefront, feed, trial, or course use.
        </Text>
        <TextInput
          accessibilityLabel="Commercial grow crop summary"
          multiline
          onChangeText={setCommercialCropSummary}
          placeholder="Commercial summary: product/batch used, crop outcome, quality result, limitations, next run changes..."
          style={[styles.input, styles.textArea]}
          value={commercialCropSummary}
        />
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Update Grow Status</Text>
        <View style={styles.formGrid}>
          <TextInput
            accessibilityLabel="Commercial grow detail status"
            onChangeText={setStatus}
            placeholder="active, completed, archived"
            style={styles.input}
            value={status}
          />
          <TextInput
            accessibilityLabel="Commercial grow detail public share status"
            onChangeText={setPublicShareStatus}
            placeholder="private, evidence_building, public_ready"
            style={styles.input}
            value={publicShareStatus}
          />
        </View>
        <TextInput
          accessibilityLabel="Commercial grow detail notes"
          multiline
          onChangeText={setNotes}
          placeholder="Commercial notes, publishability, evidence gaps, or next checks"
          style={[styles.input, styles.textArea]}
          value={notes}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Pressable
          accessibilityLabel="Save commercial grow detail"
          accessibilityRole="button"
          disabled={saving || !growId}
          onPress={saveChanges}
          style={[styles.primaryAction, saving || !growId ? styles.disabled : null]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Saving..." : "Save Grow Detail"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Next Commercial Actions</Text>
        <Text style={styles.bullet}>
          Log grow observations and photos in the Pro grow workspace.
        </Text>
        <Text style={styles.bullet}>
          Attach product, batch, and formula context before publishing claims.
        </Text>
        <Text style={styles.bullet}>
          Use product trials and run comparisons to summarize effectiveness.
        </Text>
        <Text style={styles.bullet}>
          Publish only evidence-backed updates to feed, courses, or storefront proof.
        </Text>
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
    minWidth: 180,
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
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    flexGrow: 1,
    fontSize: 14,
    minWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  textArea: { minHeight: 90, marginTop: 8, textAlignVertical: "top" },
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
