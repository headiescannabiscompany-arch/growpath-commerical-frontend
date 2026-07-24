import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import {
  fetchProducts,
  fetchProductTrialEvidenceRuns,
  type CommercialProduct,
  type ProductTrialEvidenceRun
} from "@/api/commercialWorkflows";
import { endpoints } from "@/api/endpoints";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";

type RecordChoice = {
  id: string;
  label: string;
};

const ITEM_TYPE_OPTIONS = [
  ["product", "Product"],
  ["ingredient", "Ingredient"],
  ["packaging", "Packaging"],
  ["plant", "Plant"],
  ["genetics", "Genetics"],
  ["equipment", "Equipment"],
  ["course", "Course"],
  ["service", "Service"],
  ["retail", "Retail item"]
] as const;

function recordChoice(
  record: Record<string, any>,
  index: number,
  labelKeys: string[],
  fallback: string
): RecordChoice | null {
  const id = String(record.id ?? record._id ?? "").trim();
  if (!id) return null;
  const label =
    labelKeys.map((key) => String(record[key] ?? "").trim()).find(Boolean) ||
    `${fallback} ${index + 1}`;
  return { id, label };
}

function RecordPicker({
  choices,
  createHref,
  createLabel,
  label,
  onChange,
  selectedId
}: {
  choices: RecordChoice[];
  createHref: string;
  createLabel: string;
  label: string;
  onChange: (id: string) => void;
  selectedId: string;
}) {
  return (
    <View style={styles.recordPicker}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {choices.length ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={`${label} choices`}
          style={styles.choiceRow}
        >
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${label}: Not linked yet`}
            accessibilityState={{ checked: !selectedId }}
            onPress={() => onChange("")}
            style={[styles.choice, !selectedId && styles.choiceSelected]}
          >
            <Text style={styles.choiceText}>Not linked yet</Text>
          </Pressable>
          {choices.slice(0, 8).map((item) => (
            <Pressable
              key={`${label}-${item.id}`}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${item.label}`}
              accessibilityState={{ checked: selectedId === item.id }}
              onPress={() => onChange(item.id)}
              style={[styles.choice, selectedId === item.id && styles.choiceSelected]}
            >
              <Text style={styles.choiceText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyPicker}>
          <Text style={styles.helpText}>No saved {label.toLowerCase()} records yet.</Text>
          <Link href={createHref as any} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={createLabel}
              style={styles.choice}
            >
              <Text style={styles.choiceText}>{createLabel}</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </View>
  );
}

export default function CommercialInventoryCreateRoute() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("0");
  const [unit, setUnit] = useState("ea");
  const [reorderPoint, setReorderPoint] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("");
  const [itemType, setItemType] = useState("");
  const [location, setLocation] = useState("");
  const [linkedProductId, setLinkedProductId] = useState("");
  const [linkedIngredientId, setLinkedIngredientId] = useState("");
  const [linkedGeneticsId, setLinkedGeneticsId] = useState("");
  const [linkedGrowId, setLinkedGrowId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<CommercialProduct[]>([]);
  const [evidenceRuns, setEvidenceRuns] = useState<ProductTrialEvidenceRun[]>([]);
  const [linkOptionsLoading, setLinkOptionsLoading] = useState(true);
  const [linkOptionsError, setLinkOptionsError] = useState("");
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  const path = useMemo(
    () =>
      (endpoints as any)?.commercial?.inventory ??
      (endpoints as any)?.inventoryGlobal ??
      "/api/inventory",
    []
  );

  const canSave = name.trim().length > 1 && !saving;

  const loadLinkOptions = useCallback(async () => {
    setLinkOptionsLoading(true);
    setLinkOptionsError("");
    try {
      const [nextProducts, nextEvidenceRuns] = await Promise.all([
        fetchProducts(),
        fetchProductTrialEvidenceRuns()
      ]);
      setProducts(nextProducts);
      setEvidenceRuns(nextEvidenceRuns);
    } catch (error: any) {
      setProducts([]);
      setEvidenceRuns([]);
      setLinkOptionsError(
        String(error?.message || "Saved record choices could not be loaded.")
      );
    } finally {
      setLinkOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLinkOptions();
  }, [loadLinkOptions]);

  const productChoices = products
    .map((record, index) => recordChoice(record, index, ["name"], "Product"))
    .filter((item): item is RecordChoice => !!item);
  const evidenceRunChoices = evidenceRuns
    .map((record, index) =>
      recordChoice(record, index, ["name", "growName", "cultivar"], "Evidence run")
    )
    .filter((item): item is RecordChoice => !!item);

  const create = async () => {
    if (!canSave) return;
    const quantityNumber = Number(qty);
    const reorderPointNumber = Number(reorderPoint);

    setSaving(true);
    try {
      await apiRequest(path, {
        method: "POST",
        body: {
          name: name.trim(),
          sku: sku.trim() || undefined,
          quantity: Number.isFinite(quantityNumber) ? quantityNumber : 0,
          unit: unit.trim() || "ea",
          reorderPoint:
            reorderPoint.trim() && Number.isFinite(reorderPointNumber)
              ? reorderPointNumber
              : 0,
          vendor: vendor.trim() || undefined,
          category: category.trim() || undefined,
          itemType: itemType.trim() || undefined,
          location: location.trim() || undefined,
          linkedProductId: linkedProductId.trim() || undefined,
          linkedIngredientId: linkedIngredientId.trim() || undefined,
          linkedGeneticsId: linkedGeneticsId.trim() || undefined,
          linkedTrialId: linkedGrowId.trim() || undefined,
          linkedGrowId: linkedGrowId.trim() || undefined,
          notes: notes.trim() || undefined
        }
      });
      router.replace("/home/commercial/inventory");
    } catch (e: any) {
      Alert.alert("Create failed", String(e?.message || e || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPage
      routeKey="commercial-inventory-create"
      backFallbackHref="/home/commercial/inventory"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial workspace</Text>
          <Text style={styles.h1}>Create Inventory Support Record</Text>
          <Text style={styles.helpText}>
            Commercial inventory support tracks stock behind products, batches/lots,
            plants, ingredients, packaging, genetics, equipment, courses, services, and
            retail items. Product records still explain and sell the item; inventory
            support tracks quantity, cost, supplier, and location.
          </Text>
        </View>
      }
    >
      <AppCard>
        <TextInput
          value={name}
          onChangeText={setName}
          accessibilityLabel="Commercial inventory item name"
          placeholder="Name"
          style={styles.input}
        />
        <TextInput
          value={sku}
          onChangeText={setSku}
          accessibilityLabel="Commercial inventory item SKU"
          placeholder="SKU (optional)"
          style={styles.input}
        />
        <TextInput
          value={qty}
          onChangeText={setQty}
          accessibilityLabel="Commercial inventory item quantity"
          placeholder="Quantity"
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          value={unit}
          onChangeText={setUnit}
          accessibilityLabel="Commercial inventory item unit"
          placeholder="Unit"
          style={styles.input}
        />
        <TextInput
          value={reorderPoint}
          onChangeText={setReorderPoint}
          accessibilityLabel="Commercial inventory item reorder point"
          placeholder="Reorder point"
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          value={vendor}
          onChangeText={setVendor}
          accessibilityLabel="Commercial inventory item vendor"
          placeholder="Vendor"
          style={styles.input}
        />
        <TextInput
          value={category}
          onChangeText={setCategory}
          accessibilityLabel="Commercial inventory item category"
          placeholder="Category"
          style={styles.input}
        />
        <Text style={styles.sectionLabel}>Item type</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Commercial inventory item type choices"
          style={styles.choiceRow}
        >
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel="Commercial inventory item type: Not selected"
            accessibilityState={{ checked: !itemType }}
            onPress={() => setItemType("")}
            style={[styles.choice, !itemType && styles.choiceSelected]}
          >
            <Text style={styles.choiceText}>Not selected</Text>
          </Pressable>
          {ITEM_TYPE_OPTIONS.map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`Commercial inventory item type: ${label}`}
              accessibilityState={{ checked: itemType === value }}
              onPress={() => setItemType(value)}
              style={[styles.choice, itemType === value && styles.choiceSelected]}
            >
              <Text style={styles.choiceText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={location}
          onChangeText={setLocation}
          accessibilityLabel="Commercial inventory item location"
          placeholder="Storage location"
          style={styles.input}
        />
        <Text style={styles.sectionLabel}>Optional links</Text>
        {linkOptionsLoading ? (
          <Text style={styles.helpText}>Loading saved record choices...</Text>
        ) : null}
        {linkOptionsError ? (
          <View style={styles.loadError}>
            <Text style={styles.errorText}>{linkOptionsError}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry inventory saved record choices"
              onPress={loadLinkOptions}
              style={styles.choice}
            >
              <Text style={styles.choiceText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {!linkOptionsLoading && !linkOptionsError ? (
          <>
            <RecordPicker
              label="Linked product"
              choices={productChoices}
              selectedId={linkedProductId}
              onChange={setLinkedProductId}
              createHref="/home/commercial/products/new"
              createLabel="Create Product"
            />
            <RecordPicker
              label="Linked product trial evidence run"
              choices={evidenceRunChoices}
              selectedId={linkedGrowId}
              onChange={setLinkedGrowId}
              createHref="/home/commercial/evidence-runs/new"
              createLabel="Create Evidence Run"
            />
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showAdvancedFields
              ? "Hide advanced inventory record fields"
              : "Show advanced inventory record fields"
          }
          accessibilityState={{ expanded: showAdvancedFields }}
          onPress={() => setShowAdvancedFields((current) => !current)}
          style={styles.advancedToggle}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvancedFields
              ? "Hide advanced record fields"
              : "Use advanced record fields"}
          </Text>
        </Pressable>
        {showAdvancedFields ? (
          <View style={styles.advancedFields}>
            <TextInput
              value={itemType}
              onChangeText={setItemType}
              accessibilityLabel="Commercial inventory custom item type"
              placeholder="Custom item type"
              style={styles.input}
            />
            <TextInput
              value={linkedProductId}
              onChangeText={setLinkedProductId}
              accessibilityLabel="Commercial inventory linked product"
              placeholder="Linked product ID"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={linkedIngredientId}
              onChangeText={setLinkedIngredientId}
              accessibilityLabel="Commercial inventory linked ingredient"
              placeholder="Linked ingredient ID"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={linkedGeneticsId}
              onChangeText={setLinkedGeneticsId}
              accessibilityLabel="Commercial inventory linked genetics"
              placeholder="Linked genetics ID"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={linkedGrowId}
              onChangeText={setLinkedGrowId}
              accessibilityLabel="Commercial inventory linked product trial evidence run"
              placeholder="Linked product trial evidence run ID"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        ) : null}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Commercial inventory item notes"
          placeholder="Notes"
          multiline
          style={[styles.input, styles.notesInput]}
        />
        <Pressable
          onPress={create}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Create commercial inventory item"
          style={[styles.button, !canSave && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {saving ? "Saving..." : "Create Inventory Record"}
          </Text>
        </Pressable>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  header: { gap: 8 },
  kicker: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  helpText: { color: "#475569", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  sectionLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
    textTransform: "uppercase"
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  choice: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  choiceSelected: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E"
  },
  choiceText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900"
  },
  recordPicker: {
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  emptyPicker: {
    alignItems: "flex-start",
    gap: 8
  },
  loadError: {
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: radius.card,
    gap: 8,
    padding: 10
  },
  errorText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "700"
  },
  advancedToggle: {
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 8
  },
  advancedToggleText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900",
    textDecorationLine: "underline"
  },
  advancedFields: {
    gap: 10
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  notesInput: { minHeight: 78, textAlignVertical: "top" },
  button: {
    marginTop: 6,
    backgroundColor: "#2563eb",
    borderRadius: radius.card,
    paddingVertical: 12,
    alignItems: "center"
  },
  disabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "800" }
});
