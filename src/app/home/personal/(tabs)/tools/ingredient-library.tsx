import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  archiveProductIngredient,
  createProductIngredient,
  extractIngredientLabel,
  listProductIngredients,
  updateProductIngredient,
  type ProductIngredient,
  type SourceRecord
} from "@/api/productIngredients";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { radius } from "@/theme/theme";
import type { EvidenceAsset } from "@/types/evidence";

type Draft = {
  name: string;
  brand: string;
  category: string;
  n: string;
  p: string;
  k: string;
  densityGml: string;
  releaseSpeed: "immediate" | "fast" | "medium" | "slow" | "unknown";
  releaseWindow: string;
  cost: string;
  supplier: string;
  organicOrSynthetic: string;
  documentUrl: string;
  photoUrl: string;
  applicationNotes: string;
  micronutrientNotes: string;
  sourceType: string;
  confidence: "low" | "medium" | "high";
  sourceName: string;
  sourceUrl: string;
  citation: string;
  license: string;
  commercialUseAllowed: boolean;
  trainingUseAllowed: boolean;
  sourceNotes: string;
  favorite: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  brand: "",
  category: "amendment",
  n: "0",
  p: "0",
  k: "0",
  densityGml: "",
  releaseSpeed: "unknown",
  releaseWindow: "unknown",
  cost: "",
  supplier: "",
  organicOrSynthetic: "",
  documentUrl: "",
  photoUrl: "",
  applicationNotes: "",
  micronutrientNotes: "",
  sourceType: "user_entered",
  confidence: "low",
  sourceName: "",
  sourceUrl: "",
  citation: "",
  license: "",
  commercialUseAllowed: false,
  trainingUseAllowed: false,
  sourceNotes: "",
  favorite: false
};

function idFor(item: ProductIngredient) {
  return String(item._id || item.id || "");
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSourceType(value: string): NonNullable<SourceRecord["sourceType"]> {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const allowed: NonNullable<SourceRecord["sourceType"]>[] = [
    "extension",
    "federal",
    "academic",
    "api",
    "manufacturer_label",
    "manufacturer",
    "user_entered",
    "growpath_verified",
    "ai_assisted",
    "other"
  ];
  return allowed.includes(normalized as NonNullable<SourceRecord["sourceType"]>)
    ? (normalized as NonNullable<SourceRecord["sourceType"]>)
    : "other";
}

function extractedNumber(data: any, keys: string[]) {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], data);
    const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
    if (!cleaned) continue;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return String(parsed);
  }
  return "";
}

function fromItem(item?: ProductIngredient | null): Draft {
  if (!item) return EMPTY_DRAFT;
  const firstSource = item.sourceRecords?.[0] || null;
  return {
    name: item.name || "",
    brand: item.brand || "",
    category: item.category || "amendment",
    n: String(item.labelNPK?.N ?? 0),
    p: String(item.labelNPK?.P ?? 0),
    k: String(item.labelNPK?.K ?? 0),
    densityGml: item.densityGml ? String(item.densityGml) : "",
    releaseSpeed: item.releaseSpeed || "unknown",
    releaseWindow: item.releaseWindow || "unknown",
    cost: item.cost ? String(item.cost) : "",
    supplier: item.supplier || "",
    organicOrSynthetic: item.organicOrSynthetic || "",
    documentUrl: item.documentUrl || "",
    photoUrl: item.photoUrl || "",
    applicationNotes: item.applicationNotes || "",
    micronutrientNotes: item.micronutrientNotes || "",
    sourceType: item.sourceType || "user_entered",
    confidence: item.confidence || "low",
    sourceName: firstSource?.sourceName || "",
    sourceUrl: firstSource?.url || item.sourceUrl || "",
    citation: firstSource?.citation || "",
    license: firstSource?.license || "",
    commercialUseAllowed: Boolean(firstSource?.commercialUseAllowed),
    trainingUseAllowed: Boolean(firstSource?.trainingUseAllowed),
    sourceNotes: firstSource?.notes || "",
    favorite: Boolean(item.favorite)
  };
}

function payloadFromDraft(draft: Draft) {
  const sourceName = draft.sourceName.trim();
  const sourceUrl = draft.sourceUrl.trim();
  const sourceType = normalizeSourceType(draft.sourceType || "user_entered");
  const sourceRecords: SourceRecord[] =
    sourceName || sourceUrl || draft.citation.trim()
      ? [
          {
            sourceName: sourceName || draft.name.trim(),
            sourceType,
            url: sourceUrl,
            citation: draft.citation.trim(),
            license: draft.license.trim(),
            commercialUseAllowed: draft.commercialUseAllowed,
            trainingUseAllowed: draft.trainingUseAllowed,
            confidence: draft.confidence,
            notes: draft.sourceNotes.trim()
          }
        ]
      : [];
  return {
    name: draft.name.trim(),
    brand: draft.brand.trim(),
    category: draft.category.trim() || "amendment",
    labelNPK: {
      N: toNumber(draft.n),
      P: toNumber(draft.p),
      K: toNumber(draft.k)
    },
    densityGml: draft.densityGml.trim() ? toNumber(draft.densityGml) : null,
    releaseSpeed: draft.releaseSpeed,
    releaseWindow: draft.releaseWindow.trim() || "unknown",
    cost: draft.cost.trim() ? toNumber(draft.cost) : null,
    supplier: draft.supplier.trim(),
    organicOrSynthetic: draft.organicOrSynthetic.trim(),
    documentUrl: draft.documentUrl.trim(),
    photoUrl: draft.photoUrl.trim(),
    applicationNotes: draft.applicationNotes.trim(),
    micronutrientNotes: draft.micronutrientNotes.trim(),
    sourceType,
    confidence: draft.confidence,
    sourceUrl,
    sourceRecords,
    favorite: draft.favorite
  };
}

export default function IngredientLibraryRoute() {
  const [items, setItems] = useState<ProductIngredient[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [labelEvidence, setLabelEvidence] = useState<EvidenceAsset[]>([]);
  const [labelExtraction, setLabelExtraction] = useState<Record<string, any> | null>(
    null
  );
  const [labelVerifiedByUser, setLabelVerifiedByUser] = useState(false);

  const selected = useMemo(
    () => items.find((item) => idFor(item) === selectedId) || null,
    [items, selectedId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listProductIngredients();
    setItems(rows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function updateDraft(key: keyof Draft, value: string | boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFeedback("");
  }

  function startNew() {
    setSelectedId("");
    setDraft(EMPTY_DRAFT);
    setLabelEvidence([]);
    setLabelExtraction(null);
    setLabelVerifiedByUser(false);
    setFeedback("");
  }

  function selectItem(item: ProductIngredient) {
    setSelectedId(idFor(item));
    setDraft(fromItem(item));
    setLabelExtraction(item.labelExtraction || null);
    setLabelVerifiedByUser(Boolean(item.labelVerifiedByUser));
    setFeedback("");
  }

  async function save() {
    if (!draft.name.trim()) {
      setFeedback("Ingredient name is required.");
      return;
    }
    setSaving(true);
    try {
      const uploadedEvidence = labelEvidence.filter(
        (asset) => asset.uploadStatus === "uploaded"
      );
      const payload = {
        ...payloadFromDraft(draft),
        evidenceAssetIds: uploadedEvidence.map((asset) => asset._id || asset.id),
        photoUrls: uploadedEvidence
          .map((asset) => asset.durableUrl)
          .filter((url): url is string => Boolean(url)),
        labelExtraction,
        labelVerifiedByUser,
        labelVerifiedAt: labelVerifiedByUser ? new Date().toISOString() : null
      };
      const saved = selectedId
        ? await updateProductIngredient(selectedId, payload)
        : await createProductIngredient(payload);
      setSelectedId(idFor(saved));
      setDraft(fromItem(saved));
      await load();
      setFeedback(selectedId ? "Ingredient updated." : "Ingredient created.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to save ingredient.");
    } finally {
      setSaving(false);
    }
  }

  async function analyzeLabel() {
    const asset = labelEvidence.find(
      (item) => item.assetType === "photo" && item.uploadStatus === "uploaded"
    );
    const evidenceAssetId = String(asset?._id || asset?.id || "");
    if (!evidenceAssetId) {
      setFeedback("Upload a clear label photo before analysis.");
      return;
    }
    setSaving(true);
    try {
      const response = await extractIngredientLabel(evidenceAssetId);
      const data = response?.nutrientData || {};
      setLabelExtraction(data);
      setLabelVerifiedByUser(false);
      setDraft((current) => ({
        ...current,
        name: String(data.productName || data.name || current.name),
        brand: String(data.brand || data.manufacturer || current.brand),
        n:
          extractedNumber(data, ["labelNPK.N", "npk.N", "guaranteedAnalysis.nitrogen"]) ||
          current.n,
        p:
          extractedNumber(data, [
            "labelNPK.P",
            "npk.P",
            "guaranteedAnalysis.phosphate"
          ]) || current.p,
        k:
          extractedNumber(data, ["labelNPK.K", "npk.K", "guaranteedAnalysis.potash"]) ||
          current.k,
        photoUrl: asset?.durableUrl || current.photoUrl,
        sourceType: "manufacturer",
        confidence: "medium"
      }));
      setFeedback(
        "GPT-assisted label extraction filled the draft. Verify every value against the label before saving."
      );
    } catch (error: any) {
      setFeedback(error?.message || "Unable to analyze the label photo.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite() {
    if (!selectedId) {
      updateDraft("favorite", !draft.favorite);
      return;
    }
    setSaving(true);
    try {
      const saved = await updateProductIngredient(selectedId, {
        favorite: !draft.favorite
      });
      setDraft(fromItem(saved));
      await load();
      setFeedback(saved.favorite ? "Marked favorite." : "Removed favorite.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to update favorite.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveSelected() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const ok = await archiveProductIngredient(selectedId);
      if (!ok) throw new Error("Archive failed.");
      startNew();
      await load();
      setFeedback("Ingredient archived.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to archive ingredient.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenBoundary
      title="Products & Label Library"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Products & Label Library</Text>
          <Text style={styles.subtitle}>
            Manage user-entered nutrients, amendments, soil inputs, and source confidence.
            Guaranteed analysis is stored as label N-P2O5-K2O; elemental conversions
            happen inside recipe tools.
          </Text>
          <PersonalFeedPlacement
            placement="top"
            routeKey="personal_tools_ingredient_library"
            longContent
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={startNew}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>New Ingredient</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={toggleFavorite}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>
              {draft.favorite ? "Unfavorite" : "Favorite"}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator />
          </View>
        ) : items.length ? (
          <View style={styles.list}>
            {items.map((item) => {
              const active = idFor(item) === selectedId;
              return (
                <Pressable
                  key={idFor(item)}
                  accessibilityRole="button"
                  onPress={() => selectItem(item)}
                  style={[styles.card, active && styles.cardOn]}
                >
                  <Text style={styles.cardTitle}>
                    {item.favorite ? "* " : ""}
                    {item.name}
                  </Text>
                  <Text style={styles.meta}>
                    {item.brand || "No brand"} | {item.category || "input"} | Label
                    N-P2O5-K2O {item.labelNPK?.N ?? 0}-{item.labelNPK?.P ?? 0}-
                    {item.labelNPK?.K ?? 0}
                  </Text>
                  <Text style={styles.meta}>
                    {item.sourceType || "user_entered"} | confidence{" "}
                    {item.confidence || "low"}
                  </Text>
                  <Text style={styles.meta}>
                    Release {item.releaseSpeed || "unknown"} | Window{" "}
                    {item.releaseWindow || "unknown"} | Density{" "}
                    {item.densityGml ? `${item.densityGml} g/ml` : "not set"}
                  </Text>
                  {item.supplier || item.cost ? (
                    <Text style={styles.meta}>
                      Supplier {item.supplier || "not set"} | Cost{" "}
                      {item.cost ? `$${item.cost}` : "not set"}
                    </Text>
                  ) : null}
                  {item.sourceRecords?.[0]?.sourceName ? (
                    <Text style={styles.meta}>
                      Source: {item.sourceRecords[0].sourceName}
                    </Text>
                  ) : null}
                  {item.documentUrl || item.photoUrl ? (
                    <Text style={styles.meta}>
                      Docs {item.documentUrl || "not set"} | Label{" "}
                      {item.photoUrl || "not set"}
                    </Text>
                  ) : null}
                  {item.applicationNotes ? (
                    <Text style={styles.meta}>Use: {item.applicationNotes}</Text>
                  ) : null}
                  {item.micronutrientNotes ? (
                    <Text style={styles.meta}>Micros: {item.micronutrientNotes}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No ingredients yet</Text>
            <Text style={styles.meta}>
              Create one to use in recipes and amendment planning.
            </Text>
          </View>
        )}

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_tools_ingredient_library"
          longContent
        />

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>
            {selected ? "Edit ingredient" : "Create ingredient"}
          </Text>

          <MediaEvidencePicker
            aiUsable
            maxPhotos={10}
            allowVideo={false}
            purpose="product"
            value={labelEvidence}
            onChange={setLabelEvidence}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Analyze ingredient label with AI"
            disabled={saving}
            onPress={analyzeLabel}
            style={[styles.secondary, saving && styles.disabled]}
          >
            <Text style={styles.secondaryText}>Analyze Label with AI</Text>
          </Pressable>
          <Text style={styles.meta}>
            AI extraction is a draft. User-entered, label-verified values override generic
            catalog assumptions.
          </Text>
          {labelExtraction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm extracted label values"
              onPress={() => setLabelVerifiedByUser((current) => !current)}
              style={[styles.chip, labelVerifiedByUser && styles.chipOn]}
            >
              <Text style={[styles.chipText, labelVerifiedByUser && styles.chipTextOn]}>
                {labelVerifiedByUser
                  ? "Label values confirmed"
                  : "Confirm values against label"}
              </Text>
            </Pressable>
          ) : null}

          <Field
            label="Name"
            value={draft.name}
            onChangeText={(value) => updateDraft("name", value)}
          />
          <Field
            label="Brand"
            value={draft.brand}
            onChangeText={(value) => updateDraft("brand", value)}
          />
          <Field
            label="Category"
            value={draft.category}
            onChangeText={(value) => updateDraft("category", value)}
          />

          <View style={styles.row}>
            <Field
              label="N"
              value={draft.n}
              numeric
              onChangeText={(value) => updateDraft("n", value)}
            />
            <Field
              label="P2O5"
              value={draft.p}
              numeric
              onChangeText={(value) => updateDraft("p", value)}
            />
            <Field
              label="K2O"
              value={draft.k}
              numeric
              onChangeText={(value) => updateDraft("k", value)}
            />
          </View>

          <View style={styles.row}>
            <Field
              label="Density g/ml"
              value={draft.densityGml}
              numeric
              onChangeText={(value) => updateDraft("densityGml", value)}
            />
            <Field
              label="Cost"
              value={draft.cost}
              numeric
              onChangeText={(value) => updateDraft("cost", value)}
            />
          </View>

          <Text style={styles.label}>Release speed</Text>
          <View style={styles.actions}>
            {(["immediate", "fast", "medium", "slow", "unknown"] as const).map(
              (value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Release speed ${value}`}
                  onPress={() => updateDraft("releaseSpeed", value)}
                  style={[styles.chip, draft.releaseSpeed === value && styles.chipOn]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draft.releaseSpeed === value && styles.chipTextOn
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              )
            )}
          </View>
          <Field
            label="Release window"
            value={draft.releaseWindow}
            onChangeText={(value) => updateDraft("releaseWindow", value)}
          />
          <Field
            label="Supplier"
            value={draft.supplier}
            onChangeText={(value) => updateDraft("supplier", value)}
          />
          <Field
            label="Organic or synthetic"
            value={draft.organicOrSynthetic}
            onChangeText={(value) => updateDraft("organicOrSynthetic", value)}
          />
          <Field
            label="Document / COA / SDS URL"
            value={draft.documentUrl}
            onChangeText={(value) => updateDraft("documentUrl", value)}
          />
          <Field
            label="Label photo URL"
            value={draft.photoUrl}
            onChangeText={(value) => updateDraft("photoUrl", value)}
          />
          <Field
            label="Micronutrient notes"
            value={draft.micronutrientNotes}
            onChangeText={(value) => updateDraft("micronutrientNotes", value)}
          />
          <Field
            label="Application notes"
            value={draft.applicationNotes}
            onChangeText={(value) => updateDraft("applicationNotes", value)}
          />

          <Field
            label="Source type"
            value={draft.sourceType}
            onChangeText={(value) => updateDraft("sourceType", value)}
          />
          <Text style={styles.label}>Confidence</Text>
          <View style={styles.actions}>
            {(["low", "medium", "high"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                onPress={() => updateDraft("confidence", value)}
                style={[styles.chip, draft.confidence === value && styles.chipOn]}
              >
                <Text
                  style={[
                    styles.chipText,
                    draft.confidence === value && styles.chipTextOn
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field
            label="Source name"
            value={draft.sourceName}
            onChangeText={(value) => updateDraft("sourceName", value)}
          />
          <Field
            label="Source URL"
            value={draft.sourceUrl}
            onChangeText={(value) => updateDraft("sourceUrl", value)}
          />
          <Field
            label="Citation"
            value={draft.citation}
            onChangeText={(value) => updateDraft("citation", value)}
          />
          <Field
            label="License"
            value={draft.license}
            onChangeText={(value) => updateDraft("license", value)}
          />
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                updateDraft("commercialUseAllowed", !draft.commercialUseAllowed)
              }
              style={[styles.chip, draft.commercialUseAllowed && styles.chipOn]}
            >
              <Text
                style={[styles.chipText, draft.commercialUseAllowed && styles.chipTextOn]}
              >
                Commercial use {draft.commercialUseAllowed ? "yes" : "no"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => updateDraft("trainingUseAllowed", !draft.trainingUseAllowed)}
              style={[styles.chip, draft.trainingUseAllowed && styles.chipOn]}
            >
              <Text
                style={[styles.chipText, draft.trainingUseAllowed && styles.chipTextOn]}
              >
                Training use {draft.trainingUseAllowed ? "yes" : "no"}
              </Text>
            </Pressable>
          </View>
          <Field
            label="Source notes"
            value={draft.sourceNotes}
            onChangeText={(value) => updateDraft("sourceNotes", value)}
          />

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={save}
              style={[styles.primary, saving && styles.disabled]}
            >
              <Text style={styles.primaryText}>
                {saving ? "Saving..." : "Save Ingredient"}
              </Text>
            </Pressable>
            {selectedId ? (
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={archiveSelected}
                style={[styles.secondary, saving && styles.disabled]}
              >
                <Text style={styles.secondaryText}>Archive</Text>
              </Pressable>
            ) : null}
          </View>

          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </View>

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_ingredient_library"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

function Field({
  label,
  value,
  onChangeText,
  numeric = false
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  numeric?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? "numeric" : "default"}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  header: { gap: 6 },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#475569", lineHeight: 20 },
  list: { gap: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 4
  },
  cardOn: { borderColor: "#166534", backgroundColor: "#F0FDF4" },
  cardTitle: { color: "#0F172A", fontWeight: "800" },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  form: { gap: 10 },
  sectionTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  field: { gap: 5, flex: 1 },
  label: { color: "#334155", fontSize: 12, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  row: { flexDirection: "row", gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primary: {
    borderRadius: radius.card,
    backgroundColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondary: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryText: { color: "#166534", fontWeight: "800" },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  chipOn: { borderColor: "#166534", backgroundColor: "#166534" },
  chipText: { color: "#0F172A", fontSize: 12, fontWeight: "800" },
  chipTextOn: { color: "#FFFFFF" },
  disabled: { opacity: 0.6 },
  feedback: { color: "#334155", fontWeight: "700" }
});
