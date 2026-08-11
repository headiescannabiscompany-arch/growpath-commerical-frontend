import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  type TextInputProps,
  View
} from "react-native";

import {
  CommercialProduct,
  fetchProductLine,
  fetchProducts,
  ProductLine,
  updateProductLine
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

function TextInput(props: TextInputProps) {
  const { palette } = useAppTheme();
  return (
    <NativeTextInput
      {...props}
      placeholderTextColor={palette.textMuted}
      selectionColor={palette.accent}
    />
  );
}

function cleanId(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function lineTitle(line: ProductLine | null) {
  return line?.name || "Commercial Product Line";
}

function splitList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function productId(product: CommercialProduct) {
  return String(product.id || product._id || "").trim();
}

function productMatchesLine(product: CommercialProduct, lineId: string) {
  const ids = [
    product.productLineId,
    product.linkedProductLineId,
    ...(Array.isArray(product.productLineIds) ? product.productLineIds : []),
    ...(Array.isArray(product.linkedProductLineIds) ? product.linkedProductLineIds : [])
  ];
  return ids.some((id) => String(id || "") === lineId);
}

function DetailRow({ label, value }: { label: string; value?: unknown }) {
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => createCommercialProductLineDetailStyles(palette),
    [palette]
  );
  const display = Array.isArray(value)
    ? value.filter(Boolean).join(", ")
    : String(value || "").trim();
  if (!display) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{display}</Text>
    </View>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => createCommercialProductLineDetailStyles(palette),
    [palette]
  );
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialProductLineDetailRoute({
  route
}: { route?: any } = {}) {
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => createCommercialProductLineDetailStyles(palette),
    [palette]
  );
  const params = useLocalSearchParams<{ lineId?: string }>();
  const lineId = useMemo(
    () => cleanId(params.lineId || route?.params?.lineId || route?.params?.id),
    [params.lineId, route?.params?.lineId, route?.params?.id]
  );
  const [line, setLine] = useState<ProductLine | null>(null);
  const [products, setProducts] = useState<CommercialProduct[]>([]);
  const [status, setStatus] = useState("");
  const [publicSummary, setPublicSummary] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [growInterests, setGrowInterests] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);
  const [saveError, setSaveError] = useState<any>(null);
  const [message, setMessage] = useState("");
  const loadInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const canSave = !!lineId && !loading && !saving;

  const hydrate = useCallback((next: ProductLine | null) => {
    setLine(next);
    setStatus(next?.status || "draft");
    setPublicSummary(next?.publicSummary || "");
    setDescription(next?.description || "");
    setCoverImageUrl((next as any)?.coverImageUrl || "");
    setGrowInterests(next?.growInterests?.join(", ") || "");
  }, []);

  const load = useCallback(async () => {
    if (!lineId || loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      const [nextLine, nextProducts] = await Promise.all([
        fetchProductLine(lineId),
        fetchProducts()
      ]);
      hydrate(nextLine);
      setProducts(nextProducts.filter((product) => productMatchesLine(product, lineId)));
    } catch (err) {
      setLoadError(err);
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  }, [hydrate, lineId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!lineId || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaving(true);
    setMessage("");
    setSaveError(null);
    try {
      const updated = await updateProductLine(lineId, {
        status: (status.trim() || "draft") as ProductLine["status"],
        publicSummary: publicSummary.trim(),
        description: description.trim(),
        coverImageUrl: coverImageUrl.trim(),
        growInterests: splitList(growInterests)
      });
      hydrate(updated);
      setMessage("Product line updated.");
    } catch (err) {
      setSaveError(err);
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-product-line-detail"
      backFallbackHref="/home/commercial/product-lines"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial product family</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {lineTitle(line)}
          </Text>
          <Text style={styles.subtitle}>
            Manage the private product-family record that feeds storefront sections,
            products, batches, trials, courses, feed campaigns, and support conversations.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/product-lines" label="All Lines" />
            <ActionLink href="/home/commercial/products" label="Products" />
            <ActionLink href="/home/commercial/storefront" label="Storefront" />
          </View>
        </View>
      }
    >
      {loading ? (
        <View
          accessibilityLabel="Loading commercial product line"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          style={styles.progressRow}
        >
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.muted}>Loading product line...</Text>
        </View>
      ) : null}
      {loadError ? (
        <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
          <InlineError error={loadError} />
          <Pressable
            accessibilityLabel="Retry commercial product line"
            accessibilityRole="button"
            disabled={loading}
            onPress={load}
            style={[styles.action, loading && styles.disabled]}
          >
            <Text style={styles.actionText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.success}
        >
          {message}
        </Text>
      ) : null}

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Line Record
        </Text>
        <Text style={styles.body}>
          Product lines organize commercial products by purpose and brand family, not
          inventory shelf location. They should make product pages easier to find and
          explain.
        </Text>
        <View style={styles.detailGrid}>
          <DetailRow label="Category" value={line?.category} />
          <DetailRow label="Status" value={line?.status} />
          <DetailRow label="Public summary" value={line?.publicSummary} />
          <DetailRow label="Cover image" value={(line as any)?.coverImageUrl} />
          <DetailRow label="Grow interests" value={line?.growInterests} />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Commercial Links
        </Text>
        <Text style={styles.body}>
          A line should connect products, product formulas, batches, evidence runs,
          courses, feed campaigns, storefront blocks, and forum support.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/products" label="Product Catalog" />
          <ActionLink href="/home/commercial/batch-planner" label="Batch Planner" />
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
          <ActionLink href="/home/commercial/courses" label="Courses" />
          <ActionLink href="/home/commercial/feed" label="Feed" />
          <ActionLink href="/home/commercial/community" label="Forum / Q&A" />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Products In This Line
        </Text>
        <Text style={styles.body}>
          These products are attached to this storefront family and should appear together
          in public line browsing, feed campaigns, batches, and product education.
        </Text>
        {products.length ? (
          <View style={styles.productList}>
            {products.map((product) => (
              <View key={productId(product) || product.name} style={styles.productRow}>
                <View style={styles.productCopy}>
                  <Text style={styles.productTitle}>{product.name || "Product"}</Text>
                  <Text style={styles.muted}>
                    {[product.category, product.status || "draft"]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                  {product.shortDescription || product.description ? (
                    <Text style={styles.body}>
                      {product.shortDescription || product.description}
                    </Text>
                  ) : null}
                  {Array.isArray(product.growInterests) &&
                  product.growInterests.length ? (
                    <Text style={styles.muted}>
                      Interests {product.growInterests.join(", ")}
                    </Text>
                  ) : null}
                </View>
                {productId(product) ? (
                  <ActionLink
                    href={`/home/commercial/products/${encodeURIComponent(
                      productId(product)
                    )}`}
                    label="Open Product"
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>
            No products are attached to this line yet. Add or edit products and choose
            this Product Line so the public storefront can group them.
          </Text>
        )}
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Update Product Line
        </Text>
        <TextInput
          accessibilityLabel="Commercial product line detail status"
          editable={!saving}
          onChangeText={setStatus}
          placeholder="draft, testing, active, archived"
          style={styles.input}
          value={status}
        />
        <TextInput
          accessibilityLabel="Commercial product line detail public summary"
          editable={!saving}
          onChangeText={setPublicSummary}
          placeholder="Public summary"
          style={styles.input}
          value={publicSummary}
        />
        <TextInput
          accessibilityLabel="Commercial product line detail cover image URL"
          editable={!saving}
          onChangeText={setCoverImageUrl}
          placeholder="Cover image URL"
          style={styles.input}
          value={coverImageUrl}
        />
        <TextInput
          accessibilityLabel="Commercial product line detail grow interests"
          editable={!saving}
          onChangeText={setGrowInterests}
          placeholder="Grow interests, comma separated"
          style={styles.input}
          value={growInterests}
        />
        <TextInput
          accessibilityLabel="Commercial product line detail description"
          editable={!saving}
          multiline
          onChangeText={setDescription}
          placeholder="Line description, use cases, products included, and evidence plan"
          style={[styles.input, styles.textArea]}
          value={description}
        />
        {saving ? (
          <View
            accessibilityLabel="Saving commercial product line in progress"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.progressRow}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Saving product line...</Text>
          </View>
        ) : null}
        {saveError ? (
          <View accessible accessibilityLiveRegion="assertive" accessibilityRole="alert">
            <InlineError error={saveError} />
          </View>
        ) : null}
        <Pressable
          accessibilityLabel="Save commercial product line detail"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave, busy: saving }}
          disabled={!canSave}
          onPress={saveChanges}
          style={[styles.primaryAction, !canSave ? styles.disabled : null]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Saving..." : "Save Product Line"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Public Use
        </Text>
        <Text style={styles.bullet}>
          Feature this line on the storefront; legacy brand profile remains secondary.
        </Text>
        <Text style={styles.bullet}>
          Link products to trial evidence before strong claims.
        </Text>
        <Text style={styles.bullet}>
          Create a course or support thread explaining product-line use.
        </Text>
        <Text style={styles.bullet}>
          Use feed campaigns to announce releases, trials, and seasonal recommendations.
        </Text>
      </AppCard>
    </AppPage>
  );
}

export function createCommercialProductLineDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    header: { gap: 8 },
    kicker: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 28, fontWeight: "900" },
    subtitle: { color: palette.textSoft, lineHeight: 21 },
    cardTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    body: { color: palette.textSoft, fontSize: 14, lineHeight: 21, marginTop: 8 },
    muted: { color: palette.textMuted, fontSize: 13 },
    detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    detailRow: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 170,
      padding: 10
    },
    detailLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    detailValue: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "800",
      marginTop: 4
    },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    action: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    actionText: { color: palette.link, fontSize: 13, fontWeight: "900" },
    productList: { gap: 10, marginTop: 12 },
    productRow: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between",
      padding: 10
    },
    productCopy: { flex: 1, gap: 4, minWidth: 190 },
    productTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontSize: 14,
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 9
    },
    textArea: { minHeight: 90, textAlignVertical: "top" },
    primaryAction: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryActionText: {
      color: palette.accentText,
      fontSize: 13,
      fontWeight: "900"
    },
    disabled: { opacity: 0.55 },
    progressRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 10
    },
    errorPanel: { alignItems: "flex-start", gap: 8 },
    success: { color: palette.success, fontSize: 13, fontWeight: "800", marginTop: 8 },
    bullet: {
      color: palette.textSoft,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      marginTop: 6
    }
  });
}
