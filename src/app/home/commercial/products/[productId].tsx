import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  fetchProduct,
  fetchProductEffectiveness,
  Product,
  updateProduct
} from "@/api/products";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

function cleanId(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function productTitle(product: Product | null) {
  return product?.name || "Commercial Product";
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

export default function CommercialProductDetailRoute({ route }: { route?: any } = {}) {
  const params = useLocalSearchParams<{ productId?: string }>();
  const productId = useMemo(
    () => cleanId(params.productId || route?.params?.productId || route?.params?.id),
    [params.productId, route?.params?.productId, route?.params?.id]
  );
  const [product, setProduct] = useState<Product | null>(null);
  const [effectiveness, setEffectiveness] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [externalPurchaseUrl, setExternalPurchaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const hydrate = useCallback((next: Product | null) => {
    setProduct(next);
    setStatus(next?.status || "draft");
    setShortDescription((next as any)?.shortDescription || next?.description || "");
    setExternalPurchaseUrl((next as any)?.externalPurchaseUrl || "");
  }, []);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const [productResult, effectivenessResult] = await Promise.all([
        fetchProduct(productId),
        fetchProductEffectiveness(productId).catch(() => null)
      ]);
      hydrate(productResult);
      setEffectiveness(effectivenessResult || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [hydrate, productId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!productId) return;
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      const res = await updateProduct(productId, {
        status: (status.trim() || "draft") as Product["status"],
        shortDescription: shortDescription.trim(),
        description: shortDescription.trim(),
        externalPurchaseUrl: externalPurchaseUrl.trim()
      } as Partial<Product>);
      hydrate(res?.product ?? res?.item ?? res);
      setMessage("Product updated.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  const summary = effectiveness?.summary || {};
  const linked = effectiveness?.linked || {};

  return (
    <AppPage
      routeKey="commercial-product-detail"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial product workspace</Text>
          <Text style={styles.title}>{productTitle(product)}</Text>
          <Text style={styles.subtitle}>
            Manage the private product record, evidence links, external purchase path,
            and publishability before pushing claims to storefront, feed, courses, or forum.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/products" label="All Products" />
            <ActionLink href="/home/commercial/storefront" label="Storefront" />
            <ActionLink href="/home/commercial/feed" label="Create Feed Post" />
          </View>
        </View>
      }
    >
      {loading ? <Text style={styles.muted}>Loading product...</Text> : null}
      {error ? <InlineError error={error} /> : null}

      <AppCard>
        <Text style={styles.cardTitle}>Product Record</Text>
        <Text style={styles.body}>
          This is the commercial source record for storefront listings, feed posts,
          courses, support threads, and product-trial reports.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Category" value={(product as any)?.category} />
          <DetailRow label="SKU" value={product?.sku} />
          <DetailRow label="Status" value={product?.status} />
          <DetailRow label="Currency" value={product?.currency} />
          <DetailRow label="External URL" value={(product as any)?.externalPurchaseUrl} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Effectiveness Snapshot</Text>
        <Text style={styles.body}>{summary.claimGuard || "No claim guard returned yet."}</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{summary.batchCount || 0}</Text>
            <Text style={styles.metricLabel}>Batches</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{summary.completedTrialCount || 0}</Text>
            <Text style={styles.metricLabel}>Completed trials</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{summary.growCount || 0}</Text>
            <Text style={styles.metricLabel}>Linked grows</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{summary.courseCount || 0}</Text>
            <Text style={styles.metricLabel}>Courses</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{summary.harvestQualityCount || 0}</Text>
            <Text style={styles.metricLabel}>Harvest quality notes</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {summary.commercialCropSummaryCount || 0}
            </Text>
            <Text style={styles.metricLabel}>Crop summaries</Text>
          </View>
        </View>
        {summary.latestHarvestQualityNotes ? (
          <Text style={styles.body}>
            Latest harvest quality: {summary.latestHarvestQualityNotes}
          </Text>
        ) : null}
        {summary.latestCommercialCropSummary ? (
          <Text style={styles.body}>
            Latest crop summary: {summary.latestCommercialCropSummary}
          </Text>
        ) : null}
        {summary.publicProofReady ? (
          <Text style={styles.success}>Public proof ready from linked batch and completed trial.</Text>
        ) : null}
        {Array.isArray(summary.warnings) && summary.warnings.length ? (
          <View style={styles.warningBox}>
            {summary.warnings.map((warning: string) => (
              <Text key={warning} style={styles.warningText}>
                {warning}
              </Text>
            ))}
          </View>
        ) : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Linked Evidence</Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Linked batches" value={linked.batches?.length || 0} />
          <DetailRow label="Linked trials" value={linked.trials?.length || 0} />
          <DetailRow label="Linked grows" value={linked.grows?.length || 0} />
          <DetailRow label="Linked courses" value={linked.courses?.length || 0} />
        </View>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/batch-planner" label="Open Batch Planner" />
          <ActionLink href="/home/commercial/trials" label="Open Product Trials" />
          <ActionLink href="/home/commercial/grows" label="Open Grows" />
          <ActionLink href="/home/commercial/courses" label="Open Courses" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Update Product</Text>
        <View style={styles.formGrid}>
          <TextInput
            accessibilityLabel="Commercial product detail status"
            onChangeText={setStatus}
            placeholder="draft, published, archived"
            style={styles.input}
            value={status}
          />
          <TextInput
            accessibilityLabel="Commercial product detail external URL"
            onChangeText={setExternalPurchaseUrl}
            placeholder="External purchase URL"
            style={styles.input}
            value={externalPurchaseUrl}
          />
        </View>
        <TextInput
          accessibilityLabel="Commercial product detail short description"
          multiline
          onChangeText={setShortDescription}
          placeholder="Short description, use case, product context, or public page copy"
          style={[styles.input, styles.textArea]}
          value={shortDescription}
        />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Pressable
          accessibilityLabel="Save commercial product detail"
          accessibilityRole="button"
          disabled={saving || !productId}
          onPress={saveChanges}
          style={[styles.primaryAction, saving || !productId ? styles.disabled : null]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Saving..." : "Save Product Detail"}
          </Text>
        </Pressable>
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
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  metric: {
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 130,
    padding: 9
  },
  metricValue: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  metricLabel: { color: "#64748B", fontSize: 12, marginTop: 2 },
  warningBox: { gap: 6, marginTop: 10 },
  warningText: { color: "#92400E", fontSize: 13, fontWeight: "700" },
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
  success: { color: "#166534", fontSize: 13, fontWeight: "800", marginTop: 8 }
});
