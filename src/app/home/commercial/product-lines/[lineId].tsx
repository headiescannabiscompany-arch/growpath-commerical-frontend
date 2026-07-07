import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  fetchProductLine,
  ProductLine,
  updateProductLine
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

function cleanId(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "").trim();
}

function lineTitle(line: ProductLine | null) {
  return line?.name || "Commercial Product Line";
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

export default function CommercialProductLineDetailRoute({
  route
}: { route?: any } = {}) {
  const params = useLocalSearchParams<{ lineId?: string }>();
  const lineId = useMemo(
    () => cleanId(params.lineId || route?.params?.lineId || route?.params?.id),
    [params.lineId, route?.params?.lineId, route?.params?.id]
  );
  const [line, setLine] = useState<ProductLine | null>(null);
  const [status, setStatus] = useState("");
  const [publicSummary, setPublicSummary] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");

  const hydrate = useCallback((next: ProductLine | null) => {
    setLine(next);
    setStatus(next?.status || "draft");
    setPublicSummary(next?.publicSummary || "");
    setDescription(next?.description || "");
    setCoverImageUrl((next as any)?.coverImageUrl || "");
  }, []);

  const load = useCallback(async () => {
    if (!lineId) return;
    setLoading(true);
    setError(null);
    try {
      hydrate(await fetchProductLine(lineId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [hydrate, lineId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!lineId) return;
    setSaving(true);
    setMessage("");
    setError(null);
    try {
      const updated = await updateProductLine(lineId, {
        status: (status.trim() || "draft") as ProductLine["status"],
        publicSummary: publicSummary.trim(),
        description: description.trim(),
        coverImageUrl: coverImageUrl.trim()
      });
      hydrate(updated);
      setMessage("Product line updated.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-product-line-detail"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial product family</Text>
          <Text style={styles.title}>{lineTitle(line)}</Text>
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
      {loading ? <Text style={styles.muted}>Loading product line...</Text> : null}
      {error ? <InlineError error={error} /> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <AppCard>
        <Text style={styles.cardTitle}>Line Record</Text>
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
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Commercial Links</Text>
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
          <ActionLink href="/home/commercial/community" label="Community" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Update Product Line</Text>
        <TextInput
          accessibilityLabel="Commercial product line detail status"
          onChangeText={setStatus}
          placeholder="draft, testing, active, archived"
          style={styles.input}
          value={status}
        />
        <TextInput
          accessibilityLabel="Commercial product line detail public summary"
          onChangeText={setPublicSummary}
          placeholder="Public summary"
          style={styles.input}
          value={publicSummary}
        />
        <TextInput
          accessibilityLabel="Commercial product line detail cover image URL"
          onChangeText={setCoverImageUrl}
          placeholder="Cover image URL"
          style={styles.input}
          value={coverImageUrl}
        />
        <TextInput
          accessibilityLabel="Commercial product line detail description"
          multiline
          onChangeText={setDescription}
          placeholder="Line description, use cases, products included, and evidence plan"
          style={[styles.input, styles.textArea]}
          value={description}
        />
        <Pressable
          accessibilityLabel="Save commercial product line detail"
          accessibilityRole="button"
          disabled={saving || !lineId}
          onPress={saveChanges}
          style={[styles.primaryAction, saving || !lineId ? styles.disabled : null]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Saving..." : "Save Product Line"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Public Use</Text>
        <Text style={styles.bullet}>
          Feature this line on storefront and public brand profile.
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
