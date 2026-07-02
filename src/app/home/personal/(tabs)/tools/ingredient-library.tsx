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
  listProductIngredients,
  updateProductIngredient,
  type ProductIngredient
} from "@/api/productIngredients";
import BackButton from "@/components/nav/BackButton";

type Draft = {
  name: string;
  brand: string;
  category: string;
  n: string;
  p: string;
  k: string;
  sourceType: string;
  confidence: "low" | "medium" | "high";
  sourceUrl: string;
  favorite: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  brand: "",
  category: "amendment",
  n: "0",
  p: "0",
  k: "0",
  sourceType: "user_entered",
  confidence: "low",
  sourceUrl: "",
  favorite: false
};

function idFor(item: ProductIngredient) {
  return String(item._id || item.id || "");
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fromItem(item?: ProductIngredient | null): Draft {
  if (!item) return EMPTY_DRAFT;
  return {
    name: item.name || "",
    brand: item.brand || "",
    category: item.category || "amendment",
    n: String(item.labelNPK?.N ?? 0),
    p: String(item.labelNPK?.P ?? 0),
    k: String(item.labelNPK?.K ?? 0),
    sourceType: item.sourceType || "user_entered",
    confidence: item.confidence || "low",
    sourceUrl: item.sourceUrl || "",
    favorite: Boolean(item.favorite)
  };
}

function payloadFromDraft(draft: Draft) {
  return {
    name: draft.name.trim(),
    brand: draft.brand.trim(),
    category: draft.category.trim() || "amendment",
    labelNPK: {
      N: toNumber(draft.n),
      P: toNumber(draft.p),
      K: toNumber(draft.k)
    },
    sourceType: draft.sourceType.trim() || "user_entered",
    confidence: draft.confidence,
    sourceUrl: draft.sourceUrl.trim(),
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
    setFeedback("");
  }

  function selectItem(item: ProductIngredient) {
    setSelectedId(idFor(item));
    setDraft(fromItem(item));
    setFeedback("");
  }

  async function save() {
    if (!draft.name.trim()) {
      setFeedback("Ingredient name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = payloadFromDraft(draft);
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BackButton />
      <View style={styles.header}>
        <Text style={styles.title}>Product / Ingredient Library</Text>
        <Text style={styles.subtitle}>
          Manage user-entered nutrients, amendments, soil inputs, and source confidence.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={startNew} style={styles.secondary}>
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
                  {item.brand || "No brand"} | {item.category || "input"} | NPK{" "}
                  {item.labelNPK?.N ?? 0}-{item.labelNPK?.P ?? 0}-{item.labelNPK?.K ?? 0}
                </Text>
                <Text style={styles.meta}>
                  {item.sourceType || "user_entered"} | confidence{" "}
                  {item.confidence || "low"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No ingredients yet</Text>
          <Text style={styles.meta}>Create one to use in recipes and amendment planning.</Text>
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>
          {selected ? "Edit ingredient" : "Create ingredient"}
        </Text>

        <Field label="Name" value={draft.name} onChangeText={(value) => updateDraft("name", value)} />
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
            label="P"
            value={draft.p}
            numeric
            onChangeText={(value) => updateDraft("p", value)}
          />
          <Field
            label="K"
            value={draft.k}
            numeric
            onChangeText={(value) => updateDraft("k", value)}
          />
        </View>

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
                style={[styles.chipText, draft.confidence === value && styles.chipTextOn]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Source URL"
          value={draft.sourceUrl}
          onChangeText={(value) => updateDraft("sourceUrl", value)}
        />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={save}
            style={[styles.primary, saving && styles.disabled]}
          >
            <Text style={styles.primaryText}>{saving ? "Saving..." : "Save Ingredient"}</Text>
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
    </ScrollView>
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
    borderRadius: 8,
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
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  row: { flexDirection: "row", gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primary: {
    borderRadius: 8,
    backgroundColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondary: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 8,
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
