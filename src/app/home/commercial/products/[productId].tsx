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

function hasText(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

function productPrice(product: Product | null) {
  const priceCents = Number(product?.priceCents);
  if (Number.isFinite(priceCents) && priceCents > 0) return priceCents;
  const price = Number(product?.price);
  if (Number.isFinite(price) && price > 0) return price * 100;
  return 0;
}

function productImage(product: Product | null) {
  return (
    product?.imageUrl ||
    (product as any)?.thumbnailUrl ||
    (product as any)?.photoUrl ||
    (product as any)?.gallery?.[0] ||
    (product as any)?.images?.[0] ||
    ""
  );
}

function priceInputValue(product: Product | null) {
  const priceCents = Number(product?.priceCents);
  if (Number.isFinite(priceCents) && priceCents > 0) {
    return String(priceCents / 100);
  }
  const price = Number(product?.price);
  return Number.isFinite(price) && price > 0 ? String(price) : "";
}

function parsePrice(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function splitList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function productMissingSetup(product: Product | null) {
  const missing: string[] = [];
  if (!productImage(product)) missing.push("image");
  if (!hasText((product as any)?.shortDescription) && !hasText(product?.description)) {
    missing.push("description");
  }
  if (productPrice(product) <= 0) missing.push("price");
  if (!hasText((product as any)?.unitSize) && !hasText(product?.specs?.unitSize)) {
    missing.push("size/weight");
  }
  if (!product?.growInterests?.length) missing.push("grow interests");
  if (
    !hasText((product as any)?.externalPurchaseUrl) &&
    !hasText((product as any)?.stripePriceId)
  ) {
    missing.push("checkout path");
  }
  if (product?.status !== "published") missing.push("published status");
  return missing;
}

function publicFieldMissingSetup(missing: string[]) {
  return missing.filter((item) => item !== "published status");
}

function formatDetailValue(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const record = value as Record<string, any>;
    if (hasText(record.summary)) return String(record.summary);
    if (hasText(record.explanation)) return String(record.explanation);
    return Object.entries(record)
      .filter(([, entry]) => entry !== null && entry !== undefined && entry !== "")
      .map(([key, entry]) => {
        if (Array.isArray(entry)) return `${key}: ${entry.filter(Boolean).join(", ")}`;
        if (entry && typeof entry === "object") return `${key}: ${JSON.stringify(entry)}`;
        return `${key}: ${entry}`;
      })
      .join(", ");
  }
  return String(value || "").trim();
}

function DetailRow({ label, value }: { label: string; value?: unknown }) {
  const display = formatDetailValue(value);
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
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [unitSize, setUnitSize] = useState("");
  const [growInterests, setGrowInterests] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [externalPurchaseUrl, setExternalPurchaseUrl] = useState("");
  const [stripePriceId, setStripePriceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const hydrate = useCallback((next: Product | null) => {
    setProduct(next);
    setStatus(next?.status || "draft");
    setImageUrl(productImage(next));
    setPrice(priceInputValue(next));
    setUnitSize(next?.unitSize || next?.specs?.unitSize || "");
    setGrowInterests(next?.growInterests?.join(", ") || "");
    setShortDescription((next as any)?.shortDescription || next?.description || "");
    setExternalPurchaseUrl(next?.externalPurchaseUrl || "");
    setStripePriceId(next?.stripePriceId || "");
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
    const nextStatus = (status.trim() || "draft") as Product["status"];
    const nextProduct = {
      ...(product || {}),
      status: nextStatus,
      imageUrl: imageUrl.trim(),
      price: parsePrice(price),
      unitSize: unitSize.trim(),
      growInterests: splitList(growInterests),
      shortDescription: shortDescription.trim(),
      description: shortDescription.trim(),
      externalPurchaseUrl: externalPurchaseUrl.trim(),
      stripePriceId: stripePriceId.trim(),
      specs: {
        ...(product?.specs || {}),
        unitSize: unitSize.trim() || product?.specs?.unitSize
      }
    } as Product;
    const publishMissing = publicFieldMissingSetup(productMissingSetup(nextProduct));
    if (
      nextStatus === "published" &&
      product?.status !== "published" &&
      publishMissing.length
    ) {
      setMessage(`Product publish blocked: missing ${publishMissing.join(", ")}.`);
      return;
    }
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      const res = await updateProduct(productId, {
        status: nextStatus,
        imageUrl: imageUrl.trim() || undefined,
        price: parsePrice(price),
        unitSize: unitSize.trim() || undefined,
        growInterests: splitList(growInterests),
        shortDescription: shortDescription.trim(),
        description: shortDescription.trim(),
        externalPurchaseUrl: externalPurchaseUrl.trim(),
        stripePriceId: stripePriceId.trim() || undefined,
        specs: {
          ...(product?.specs || {}),
          unitSize: unitSize.trim() || product?.specs?.unitSize
        }
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
  const specs = (product as any)?.specs || {};
  const missingSetup = productMissingSetup(product);

  return (
    <AppPage
      routeKey="commercial-product-detail"
      backFallbackHref="/home/commercial/products"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial product workspace</Text>
          <Text style={styles.title}>{productTitle(product)}</Text>
          <Text style={styles.subtitle}>
            Manage the private product record, evidence links, external purchase path, and
            publishability before pushing claims to storefront, feed, courses, or forum.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/products" label="All Products" />
            <ActionLink href="/home/commercial/storefront" label="Storefront" />
            <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
          </View>
        </View>
      }
    >
      {loading ? <Text style={styles.muted}>Loading product...</Text> : null}
      {error ? <InlineError error={error} /> : null}

      <AppCard>
        <Text style={styles.cardTitle}>Product Record</Text>
        <Text style={styles.body}>
          This is the commercial source record for storefront listings, feed campaigns,
          courses, support threads, and product-trial reports.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Category" value={(product as any)?.category} />
          <DetailRow label="SKU" value={product?.sku} />
          <DetailRow label="Status" value={product?.status} />
          <DetailRow label="Currency" value={product?.currency} />
          <DetailRow label="Image" value={productImage(product)} />
          <DetailRow label="Price" value={product?.price ? `$${product.price}` : ""} />
          <DetailRow
            label="Size / weight"
            value={(product as any)?.unitSize || specs.unitSize}
          />
          <DetailRow label="Grow interests" value={product?.growInterests} />
          <DetailRow label="External URL" value={product?.externalPurchaseUrl} />
          <DetailRow label="Stripe price" value={product?.stripePriceId} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Label / Use Specs</Text>
        <Text style={styles.body}>
          Soil, nutrient, and dry amendment products need public-facing label fields
          before campaigns, courses, or product claims rely on them.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Source tool" value={specs.sourceTool || specs.source} />
          <DetailRow label="N-P-K" value={specs.npk || (product as any)?.npk} />
          <DetailRow
            label="Guaranteed analysis"
            value={specs.guaranteedAnalysis || (product as any)?.guaranteedAnalysis}
          />
          <DetailRow
            label="Guaranteed analysis estimate"
            value={specs.guaranteedAnalysisEstimate}
          />
          <DetailRow label="Elemental estimate" value={specs.elementalEstimate} />
          <DetailRow
            label="Ingredients"
            value={specs.ingredients || (product as any)?.ingredients}
          />
          <DetailRow
            label="Directions"
            value={specs.directions || (product as any)?.directions}
          />
          <DetailRow
            label="Application rate"
            value={specs.applicationRate || (product as any)?.applicationRate}
          />
          <DetailRow
            label="Release timing"
            value={specs.releaseCurve || specs.releaseTimeline}
          />
          <DetailRow label="Warnings" value={specs.warnings} />
        </View>
      </AppCard>

      <AppCard>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Storefront Readiness</Text>
          <Text style={[styles.statusPill, !missingSetup.length && styles.readyPill]}>
            {missingSetup.length ? "Needs setup" : "Ready"}
          </Text>
        </View>
        <Text style={styles.body}>
          Use this before pushing a product into storefront cards, feed campaigns,
          courses, lives, or public support answers.
        </Text>
        {missingSetup.length ? (
          <View style={styles.warningRow}>
            {missingSetup.map((item) => (
              <Text key={item} style={styles.warningPill}>
                Missing {item}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.success}>This product has the minimum public fields.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Effectiveness Snapshot</Text>
        <Text style={styles.body}>
          {summary.claimGuard || "No claim guard returned yet."}
        </Text>
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
            <Text style={styles.metricLabel}>Evidence runs</Text>
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
          <Text style={styles.success}>
            Public proof ready from linked batch and completed trial.
          </Text>
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
          <DetailRow label="Evidence runs" value={linked.grows?.length || 0} />
          <DetailRow label="Linked courses" value={linked.courses?.length || 0} />
        </View>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/batch-planner" label="Open Batch Planner" />
          <ActionLink href="/home/commercial/trials" label="Open Product Trials" />
          <ActionLink href="/home/commercial/evidence-runs" label="Open Evidence Runs" />
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
            accessibilityLabel="Commercial product detail image URL"
            autoCapitalize="none"
            onChangeText={setImageUrl}
            placeholder="Storefront image URL"
            style={styles.input}
            value={imageUrl}
          />
          <TextInput
            accessibilityLabel="Commercial product detail price"
            keyboardType="decimal-pad"
            onChangeText={setPrice}
            placeholder="Product price"
            style={styles.input}
            value={price}
          />
          <TextInput
            accessibilityLabel="Commercial product detail size or weight"
            onChangeText={setUnitSize}
            placeholder="Size / weight, e.g. 5 lb bag"
            style={styles.input}
            value={unitSize}
          />
          <TextInput
            accessibilityLabel="Commercial product detail grow interests"
            onChangeText={setGrowInterests}
            placeholder="Grow interests, comma separated"
            style={styles.input}
            value={growInterests}
          />
          <TextInput
            accessibilityLabel="Commercial product detail external URL"
            autoCapitalize="none"
            onChangeText={setExternalPurchaseUrl}
            placeholder="External purchase URL"
            style={styles.input}
            value={externalPurchaseUrl}
          />
          <TextInput
            accessibilityLabel="Commercial product detail Stripe price ID"
            autoCapitalize="none"
            onChangeText={setStripePriceId}
            placeholder="Stripe price ID"
            style={styles.input}
            value={stripePriceId}
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
  warningRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  warningPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    color: "#92400E",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
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
