import { Link, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  fetchProduct,
  fetchProductEffectiveness,
  Product,
  updateProduct
} from "@/api/products";
import { fetchProductLines, ProductLine } from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import CommercialContextualTools from "@/components/commercial/CommercialContextualTools";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";
import { persistImageUri, resolveImageUri } from "@/utils/photoUploads";

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

function productLineRecordId(line: ProductLine) {
  return String(line.id || line._id || "").trim();
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
  const params = useLocalSearchParams<{ productId?: string; batchId?: string }>();
  const productId = useMemo(
    () => cleanId(params.productId || route?.params?.productId || route?.params?.id),
    [params.productId, route?.params?.productId, route?.params?.id]
  );
  const focusedBatchId = useMemo(
    () => cleanId(params.batchId || route?.params?.batchId),
    [params.batchId, route?.params?.batchId]
  );
  const [product, setProduct] = useState<Product | null>(null);
  const [effectiveness, setEffectiveness] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [productLineId, setProductLineId] = useState("");
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [price, setPrice] = useState("");
  const [unitSize, setUnitSize] = useState("");
  const [npk, setNpk] = useState("");
  const [guaranteedAnalysis, setGuaranteedAnalysis] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [applicationRate, setApplicationRate] = useState("");
  const [directions, setDirections] = useState("");
  const [warnings, setWarnings] = useState("");
  const [growInterests, setGrowInterests] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [externalPurchaseUrl, setExternalPurchaseUrl] = useState("");
  const [stripeProductId, setStripeProductId] = useState("");
  const [stripePriceId, setStripePriceId] = useState("");
  const [regulatedCannabis, setRegulatedCannabis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const hydrate = useCallback((next: Product | null) => {
    setProduct(next);
    setStatus(next?.status || "draft");
    setImageUrl(productImage(next));
    setProductLineId(next?.productLineId || next?.linkedProductLineId || "");
    setPrice(priceInputValue(next));
    const specs = (next as any)?.specs || {};
    setUnitSize((next as any)?.unitSize || specs.unitSize || "");
    setNpk((next as any)?.npk || specs.npk || specs.labelNpk || "");
    setGuaranteedAnalysis(
      (next as any)?.guaranteedAnalysis || specs.guaranteedAnalysis || ""
    );
    setIngredients(formatDetailValue((next as any)?.ingredients || specs.ingredients));
    setApplicationRate((next as any)?.applicationRate || specs.applicationRate || "");
    setDirections((next as any)?.directions || specs.directions || "");
    setWarnings(formatDetailValue((next as any)?.warnings || specs.warnings));
    setGrowInterests(next?.growInterests?.join(", ") || "");
    setShortDescription((next as any)?.shortDescription || next?.description || "");
    setExternalPurchaseUrl(next?.externalPurchaseUrl || "");
    setStripeProductId(next?.stripeProductId || "");
    setStripePriceId(next?.stripePriceId || "");
    setRegulatedCannabis(Boolean(next?.regulatedCannabis || next?.isCannabis));
  }, []);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const [productResult, effectivenessResult, productLineResult] = await Promise.all([
        fetchProduct(productId),
        fetchProductEffectiveness(productId).catch(() => null),
        fetchProductLines().catch(() => [])
      ]);
      hydrate(productResult);
      setEffectiveness(effectivenessResult || null);
      setProductLines(Array.isArray(productLineResult) ? productLineResult : []);
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
    let persistedImageUrl = imageUrl.trim() || null;
    const nextProduct = {
      ...(product || {}),
      status: nextStatus,
      imageUrl: persistedImageUrl || "",
      productLineId: productLineId.trim(),
      price: parsePrice(price),
      unitSize: unitSize.trim(),
      npk: npk.trim(),
      labelNpk: npk.trim(),
      guaranteedAnalysis: guaranteedAnalysis.trim(),
      ingredients: splitList(ingredients),
      applicationRate: applicationRate.trim(),
      directions: directions.trim(),
      warnings: splitList(warnings),
      growInterests: splitList(growInterests),
      shortDescription: shortDescription.trim(),
      description: shortDescription.trim(),
      externalPurchaseUrl: regulatedCannabis ? "" : externalPurchaseUrl.trim(),
      stripeProductId: regulatedCannabis ? "" : stripeProductId.trim(),
      stripePriceId: regulatedCannabis ? "" : stripePriceId.trim(),
      regulatedCannabis,
      isCannabis: regulatedCannabis,
      productType: regulatedCannabis ? "cannabis" : undefined,
      specs: {
        ...(product?.specs || {}),
        unitSize: unitSize.trim() || product?.specs?.unitSize,
        npk: npk.trim() || product?.specs?.npk,
        labelNpk: npk.trim() || (product?.specs as any)?.labelNpk,
        guaranteedAnalysis:
          guaranteedAnalysis.trim() || product?.specs?.guaranteedAnalysis,
        ingredients: splitList(ingredients).length
          ? splitList(ingredients)
          : product?.specs?.ingredients,
        directions: directions.trim() || product?.specs?.directions,
        applicationRate: applicationRate.trim() || product?.specs?.applicationRate,
        warnings: splitList(warnings).length
          ? splitList(warnings)
          : product?.specs?.warnings
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
      persistedImageUrl = await persistImageUri(imageUrl.trim());
      const res = await updateProduct(productId, {
        status: nextStatus,
        imageUrl: persistedImageUrl || undefined,
        productLineId: productLineId.trim() || undefined,
        price: parsePrice(price),
        unitSize: unitSize.trim() || undefined,
        npk: npk.trim() || undefined,
        labelNpk: npk.trim() || undefined,
        guaranteedAnalysis: guaranteedAnalysis.trim() || undefined,
        ingredients: splitList(ingredients),
        applicationRate: applicationRate.trim() || undefined,
        directions: directions.trim() || undefined,
        warnings: splitList(warnings),
        growInterests: splitList(growInterests),
        shortDescription: shortDescription.trim(),
        description: shortDescription.trim(),
        externalPurchaseUrl: regulatedCannabis ? "" : externalPurchaseUrl.trim(),
        stripeProductId: regulatedCannabis ? "" : stripeProductId.trim() || undefined,
        stripePriceId: regulatedCannabis ? "" : stripePriceId.trim() || undefined,
        regulatedCannabis,
        isCannabis: regulatedCannabis,
        productType: regulatedCannabis ? "cannabis" : undefined,
        specs: {
          ...(product?.specs || {}),
          unitSize: unitSize.trim() || product?.specs?.unitSize,
          npk: npk.trim() || product?.specs?.npk,
          labelNpk: npk.trim() || (product?.specs as any)?.labelNpk,
          guaranteedAnalysis:
            guaranteedAnalysis.trim() || product?.specs?.guaranteedAnalysis,
          ingredients: splitList(ingredients).length
            ? splitList(ingredients)
            : product?.specs?.ingredients,
          directions: directions.trim() || product?.specs?.directions,
          applicationRate: applicationRate.trim() || product?.specs?.applicationRate,
          warnings: splitList(warnings).length
            ? splitList(warnings)
            : product?.specs?.warnings
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

  async function pickProductImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        new Error("Photo-library permission is required to upload a product image.")
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    });
    const uri = result.canceled ? "" : result.assets?.[0]?.uri || "";
    if (uri) setImageUrl(uri);
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

      <CommercialContextualTools
        source="commercial_product_detail"
        productId={productId}
        productLineId={String((product as any)?.productLineId || "")}
        prompt={`Review the commercial product ${productTitle(product)} and its linked formula, batch, evidence, and customer guidance.`}
        tools={["ask-ai", "recipe-builder", "report"]}
      />

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
          <DetailRow
            label="Product line"
            value={product?.productLineId || product?.linkedProductLineId}
          />
          <DetailRow label="Currency" value={product?.currency} />
          <DetailRow label="Image" value={productImage(product)} />
          <DetailRow label="Price" value={product?.price ? `$${product.price}` : ""} />
          <DetailRow
            label="Size / weight"
            value={(product as any)?.unitSize || specs.unitSize}
          />
          <DetailRow label="Grow interests" value={product?.growInterests} />
          <DetailRow label="External URL" value={product?.externalPurchaseUrl} />
          <DetailRow label="Stripe product" value={product?.stripeProductId} />
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
          <DetailRow
            label="Label N-P2O5-K2O"
            value={specs.npk || specs.labelNpk || (product as any)?.npk}
          />
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
        {focusedBatchId ? (
          <View style={styles.focusBox}>
            <Text style={styles.focusLabel}>Focused product batch</Text>
            <Text style={styles.focusValue}>{focusedBatchId}</Text>
            <Text style={styles.focusBody}>
              This product opened from a batch-linked task, alert, schedule item, or
              notification. Keep the batch inside the product workspace, then open the
              full batch record when you need production details.
            </Text>
          </View>
        ) : null}
        <View style={styles.detailGrid}>
          <DetailRow label="Linked batches" value={linked.batches?.length || 0} />
          <DetailRow label="Linked trials" value={linked.trials?.length || 0} />
          <DetailRow label="Evidence runs" value={linked.grows?.length || 0} />
          <DetailRow label="Linked courses" value={linked.courses?.length || 0} />
        </View>
        <View style={styles.actions}>
          {focusedBatchId ? (
            <ActionLink
              href={`/home/commercial/batch-planner/${encodeURIComponent(focusedBatchId)}`}
              label="Open Focused Batch"
            />
          ) : null}
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
          <View style={styles.mediaTools}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload commercial product detail image"
              disabled={saving}
              onPress={pickProductImage}
              style={[styles.mediaButton, saving && styles.disabled]}
            >
              <Text style={styles.mediaButtonText}>Upload product image</Text>
            </Pressable>
            {imageUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear commercial product detail image"
                disabled={saving}
                onPress={() => setImageUrl("")}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Clear image</Text>
              </Pressable>
            ) : null}
          </View>
          {imageUrl ? (
            <Image
              accessibilityLabel="Commercial product detail image preview"
              resizeMode="cover"
              source={{ uri: resolveImageUri(imageUrl) }}
              style={styles.productPreview}
            />
          ) : null}
          <TextInput
            accessibilityLabel="Commercial product detail product line"
            autoCapitalize="none"
            onChangeText={setProductLineId}
            placeholder="Product line id, or choose below"
            style={styles.input}
            value={productLineId}
          />
          {productLines.length ? (
            <View style={styles.selectorRow}>
              {productLines.map((line) => {
                const id = productLineRecordId(line);
                if (!id) return null;
                const name = line.name || "Product line";
                return (
                  <Pressable
                    accessibilityLabel={`Use product detail product line ${name}`}
                    accessibilityRole="button"
                    key={id}
                    onPress={() => setProductLineId(id)}
                    style={[
                      styles.selectorButton,
                      productLineId === id && styles.selectedSelectorButton
                    ]}
                  >
                    <Text style={styles.selectorButtonText}>
                      {productLineId === id ? "Selected " : "Use "}
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
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
            accessibilityLabel="Commercial product detail label N-P2O5-K2O"
            onChangeText={setNpk}
            placeholder="Label N-P2O5-K2O, e.g. 3-1-1"
            style={styles.input}
            value={npk}
          />
          <TextInput
            accessibilityLabel="Commercial product detail grow interests"
            onChangeText={setGrowInterests}
            placeholder="Grow interests, comma separated"
            style={styles.input}
            value={growInterests}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: regulatedCannabis }}
            accessibilityLabel="Regulated cannabis product"
            onPress={() => {
              const next = !regulatedCannabis;
              setRegulatedCannabis(next);
              if (next) {
                setExternalPurchaseUrl("");
                setStripeProductId("");
                setStripePriceId("");
              }
            }}
            style={[
              styles.selectorButton,
              regulatedCannabis && styles.selectedSelectorButton
            ]}
          >
            <Text style={styles.selectorButtonText}>
              {regulatedCannabis
                ? "Regulated cannabis · catalog only"
                : "Mark as regulated cannabis"}
            </Text>
          </Pressable>
          {!regulatedCannabis ? (
            <TextInput
              accessibilityLabel="Commercial product detail external URL"
              autoCapitalize="none"
              onChangeText={setExternalPurchaseUrl}
              placeholder="External purchase URL"
              style={styles.input}
              value={externalPurchaseUrl}
            />
          ) : null}
          {!regulatedCannabis ? (
            <TextInput
              accessibilityLabel="Commercial product detail Stripe product ID"
              autoCapitalize="none"
              onChangeText={setStripeProductId}
              placeholder="Stripe product ID"
              style={styles.input}
              value={stripeProductId}
            />
          ) : null}
          {!regulatedCannabis ? (
            <TextInput
              accessibilityLabel="Commercial product detail Stripe price ID"
              autoCapitalize="none"
              onChangeText={setStripePriceId}
              placeholder="Stripe price ID"
              style={styles.input}
              value={stripePriceId}
            />
          ) : null}
        </View>
        <TextInput
          accessibilityLabel="Commercial product detail short description"
          multiline
          onChangeText={setShortDescription}
          placeholder="Short description, use case, product context, or public page copy"
          style={[styles.input, styles.textArea]}
          value={shortDescription}
        />
        <TextInput
          accessibilityLabel="Commercial product detail guaranteed analysis"
          multiline
          onChangeText={setGuaranteedAnalysis}
          placeholder="Guaranteed analysis: N, P2O5, K2O, Ca, Mg, S, micros"
          style={[styles.input, styles.textArea]}
          value={guaranteedAnalysis}
        />
        <TextInput
          accessibilityLabel="Commercial product detail ingredients"
          multiline
          onChangeText={setIngredients}
          placeholder="Ingredients, one per line or comma separated"
          style={[styles.input, styles.textArea]}
          value={ingredients}
        />
        <TextInput
          accessibilityLabel="Commercial product detail application rate"
          onChangeText={setApplicationRate}
          placeholder="Application rate, e.g. 1 cup per cubic foot"
          style={styles.input}
          value={applicationRate}
        />
        <TextInput
          accessibilityLabel="Commercial product detail directions"
          multiline
          onChangeText={setDirections}
          placeholder="Directions for use, storage, and safety notes"
          style={[styles.input, styles.textArea]}
          value={directions}
        />
        <TextInput
          accessibilityLabel="Commercial product detail warnings"
          multiline
          onChangeText={setWarnings}
          placeholder="Warnings, stage limits, legal notes, or safety notes"
          style={[styles.input, styles.textArea]}
          value={warnings}
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
    borderRadius: radius.card,
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
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionText: { color: "#166534", fontSize: 13, fontWeight: "900" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  metric: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
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
  focusBox: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 10,
    padding: 12
  },
  focusLabel: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  focusValue: { color: "#0F172A", fontSize: 18, fontWeight: "900", marginTop: 4 },
  focusBody: { color: "#475569", fontSize: 13, lineHeight: 19, marginTop: 6 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  mediaTools: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    width: "100%"
  },
  mediaButton: {
    backgroundColor: "#111827",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  mediaButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  clearButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  clearButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900"
  },
  productPreview: {
    aspectRatio: 16 / 9,
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    marginTop: 10,
    maxWidth: 520,
    width: "100%"
  },
  selectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" },
  selectorButton: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  selectedSelectorButton: { backgroundColor: "#DCFCE7", borderColor: "#166534" },
  selectorButtonText: { color: "#166534", fontSize: 12, fontWeight: "900" },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
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
    borderRadius: radius.card,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  success: { color: "#166534", fontSize: 13, fontWeight: "800", marginTop: 8 }
});
