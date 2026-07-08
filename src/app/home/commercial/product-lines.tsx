import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link } from "expo-router";

import {
  createProductLine,
  fetchProductLines,
  type ProductLine
} from "@/api/commercialWorkflows";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { InlineError } from "@/components/InlineError";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

function idOf(item: AnyRec, index: number) {
  return String(item.id ?? item._id ?? `line-${index}`);
}

function splitList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CommercialProductLinesRoute() {
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [feedback, setFeedback] = useState("");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [publicSummary, setPublicSummary] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [growInterests, setGrowInterests] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLines(await fetchProductLines());
    } catch (err) {
      setError(err);
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createLine() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    setFeedback("");
    try {
      const created = await createProductLine({
        name: trimmed,
        category: category.trim() || undefined,
        publicSummary: publicSummary.trim() || undefined,
        description: description.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        growInterests: splitList(growInterests),
        status: "draft"
      });
      setLines((current) => [created, ...current].filter(Boolean));
      setName("");
      setCategory("");
      setPublicSummary("");
      setDescription("");
      setCoverImageUrl("");
      setGrowInterests("");
      setFeedback("Product line created.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-product-lines"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial workspace</Text>
          <Text style={styles.title}>Product Lines</Text>
          <Text style={styles.subtitle}>
            Organize products into families: soil lines, nutrient lines, genetics lines,
            plant lines, course lines, equipment lines, and garden-center categories.
          </Text>
          <View style={styles.headerActions}>
            <Link href="/home/commercial/products/new" asChild>
              <Pressable style={styles.outlineButton}>
                <Text style={styles.outlineText}>Create Product</Text>
              </Pressable>
            </Link>
            <Link href="/home/commercial/products" asChild>
              <Pressable style={styles.outlineButton}>
                <Text style={styles.outlineText}>Products</Text>
              </Pressable>
            </Link>
            <Link href="/home/commercial/marketing" asChild>
              <Pressable style={styles.outlineButton}>
                <Text style={styles.outlineText}>Marketing Planner</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      }
    >
      {error ? <InlineError error={error} /> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <AppCard>
        <Text style={styles.cardTitle}>Create Product Line</Text>
        <Text style={styles.body}>
          Product family workflow: create the line first, then attach products, formulas,
          product trial evidence runs, courses, feed campaigns, and storefront sections.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          accessibilityLabel="Product line name"
          placeholder="Living soil line"
          style={styles.input}
        />
        <TextInput
          value={category}
          onChangeText={setCategory}
          accessibilityLabel="Product line category"
          placeholder="soil, nutrient, genetics, plants, course, equipment..."
          style={styles.input}
        />
        <TextInput
          value={publicSummary}
          onChangeText={setPublicSummary}
          accessibilityLabel="Product line public summary"
          placeholder="Public summary"
          style={styles.input}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="Product line description"
          placeholder="Full line description"
          multiline
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={coverImageUrl}
          onChangeText={setCoverImageUrl}
          accessibilityLabel="Product line cover image URL"
          placeholder="Cover image URL"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={growInterests}
          onChangeText={setGrowInterests}
          accessibilityLabel="Product line grow interests"
          placeholder="Grow interests, comma separated"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create product line"
          onPress={createLine}
          disabled={!name.trim() || saving}
          style={[styles.primaryButton, (!name.trim() || saving) && styles.disabled]}
        >
          <Text style={styles.primaryText}>
            {saving ? "Creating..." : "Create Product Line"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Product Lines</Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading product lines...</Text>
          </View>
        ) : lines.length ? (
          <View style={styles.list}>
            {lines.map((line, index) => (
              <View key={idOf(line, index)} style={styles.lineRow}>
                <Text style={styles.lineTitle}>{line.name || "Untitled line"}</Text>
                <Text style={styles.muted}>
                  {[line.category, line.status || "draft"].filter(Boolean).join(" | ")}
                </Text>
                {line.growInterests?.length ? (
                  <Text style={styles.tags}>{line.growInterests.join(", ")}</Text>
                ) : null}
                {line.publicSummary || line.description ? (
                  <Text style={styles.body} numberOfLines={2}>
                    {line.publicSummary || line.description}
                  </Text>
                ) : null}
                <View style={styles.headerActions}>
                  <Link
                    href={
                      `/home/commercial/product-lines/${encodeURIComponent(idOf(line, index))}` as any
                    }
                    asChild
                  >
                    <Pressable style={styles.outlineButton}>
                      <Text style={styles.outlineText}>Open Detail</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No product lines yet.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Line-level public page context</Text>
        <Text style={styles.body}>
          Product lines explain families of related products. They should feed storefront
          sections, public profile sections, course bundles, and product-trial reports.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>
            Line name, category, public summary, cover image, and tags
          </Text>
          <Text style={styles.bullet}>Featured product IDs and linked product pages</Text>
          <Text style={styles.bullet}>
            Linked courses and grow/product trial evidence
          </Text>
          <Text style={styles.bullet}>
            Feed campaigns and support threads related to the line
          </Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Brand-type examples</Text>
        <Text style={styles.body}>
          Different commercial users need the same structure with different content, not
          separate apps.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>
            Soil/nutrient brand: formula lines and amendment systems
          </Text>
          <Text style={styles.bullet}>
            Breeder/seed company: genetics lines and release families
          </Text>
          <Text style={styles.bullet}>
            Garden center: plant categories and care-guide bundles
          </Text>
          <Text style={styles.bullet}>
            Creator/educator: course collections and digital products
          </Text>
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
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  outlineButton: {
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  outlineText: { color: "#166534", fontSize: 13, fontWeight: "900" },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  body: { color: "#475569", lineHeight: 20, marginTop: 8 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15,23,42,0.14)",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textArea: { minHeight: 82, textAlignVertical: "top" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    marginTop: 12,
    paddingVertical: 12
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  loading: { alignItems: "center", gap: 8, paddingVertical: 12 },
  muted: { color: "#64748B", fontWeight: "700" },
  tags: { color: "#166534", fontSize: 12, fontWeight: "900", marginTop: 6 },
  list: { gap: 10, marginTop: 10 },
  lineRow: {
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 12
  },
  lineTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  bullets: { gap: 6, marginTop: 10 },
  bullet: { color: "#334155", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  feedback: {
    backgroundColor: "#DCFCE7",
    borderRadius: radius.card,
    color: "#166534",
    fontWeight: "900",
    padding: 10
  }
});
