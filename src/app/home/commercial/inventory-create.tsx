import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
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
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
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
  disabled = false,
  label,
  onChange,
  selectedId
}: {
  choices: RecordChoice[];
  createHref: string;
  createLabel: string;
  disabled?: boolean;
  label: string;
  onChange: (id: string) => void;
  selectedId: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialInventoryCreateStyles(palette), [palette]);

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
            accessibilityState={{ checked: !selectedId, disabled }}
            disabled={disabled}
            onPress={() => onChange("")}
            style={[
              styles.choice,
              !selectedId && styles.choiceSelected,
              disabled && styles.disabled
            ]}
          >
            <Text style={styles.choiceText}>Not linked yet</Text>
          </Pressable>
          {choices.slice(0, 8).map((item) => (
            <Pressable
              key={`${label}-${item.id}`}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${item.label}`}
              accessibilityState={{ checked: selectedId === item.id, disabled }}
              disabled={disabled}
              onPress={() => onChange(item.id)}
              style={[
                styles.choice,
                selectedId === item.id && styles.choiceSelected,
                disabled && styles.disabled
              ]}
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
              accessibilityState={{ disabled }}
              disabled={disabled}
              style={[styles.choice, disabled && styles.disabled]}
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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialInventoryCreateStyles(palette), [palette]);
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
  const [saveError, setSaveError] = useState("");
  const loadInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);

  const path = useMemo(
    () =>
      (endpoints as any)?.commercial?.inventory ??
      (endpoints as any)?.inventoryGlobal ??
      "/api/inventory",
    []
  );

  const canSave = name.trim().length > 1 && unit.trim().length > 0 && !saving;

  const loadLinkOptions = useCallback(async () => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
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
      loadInFlightRef.current = false;
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
    if (!canSave || saveInFlightRef.current) return;
    const quantityNumber = Number(qty);
    const reorderPointNumber = Number(reorderPoint);

    if (!qty.trim() || !Number.isFinite(quantityNumber) || quantityNumber < 0) {
      setSaveError("Quantity must be a number that is zero or greater.");
      return;
    }
    if (
      reorderPoint.trim() &&
      (!Number.isFinite(reorderPointNumber) || reorderPointNumber < 0)
    ) {
      setSaveError("Reorder point must be a number that is zero or greater.");
      return;
    }

    saveInFlightRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await apiRequest(path, {
        method: "POST",
        body: {
          name: name.trim(),
          sku: sku.trim() || undefined,
          quantity: quantityNumber,
          unit: unit.trim() || "ea",
          reorderPoint: reorderPoint.trim() ? reorderPointNumber : 0,
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
      setSaveError(String(e?.message || e || "Unable to create inventory record."));
    } finally {
      saveInFlightRef.current = false;
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
          editable={!saving}
          placeholder="Name"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />
        <TextInput
          value={sku}
          onChangeText={setSku}
          accessibilityLabel="Commercial inventory item SKU"
          editable={!saving}
          placeholder="SKU (optional)"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />
        <TextInput
          value={qty}
          onChangeText={setQty}
          accessibilityLabel="Commercial inventory item quantity"
          editable={!saving}
          placeholder="Quantity"
          placeholderTextColor={palette.textMuted}
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          value={unit}
          onChangeText={setUnit}
          accessibilityLabel="Commercial inventory item unit"
          editable={!saving}
          placeholder="Unit"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />
        <TextInput
          value={reorderPoint}
          onChangeText={setReorderPoint}
          accessibilityLabel="Commercial inventory item reorder point"
          editable={!saving}
          placeholder="Reorder point"
          placeholderTextColor={palette.textMuted}
          keyboardType="numeric"
          style={styles.input}
        />
        <TextInput
          value={vendor}
          onChangeText={setVendor}
          accessibilityLabel="Commercial inventory item vendor"
          editable={!saving}
          placeholder="Vendor"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />
        <TextInput
          value={category}
          onChangeText={setCategory}
          accessibilityLabel="Commercial inventory item category"
          editable={!saving}
          placeholder="Category"
          placeholderTextColor={palette.textMuted}
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
            accessibilityState={{ checked: !itemType, disabled: saving }}
            disabled={saving}
            onPress={() => setItemType("")}
            style={[
              styles.choice,
              !itemType && styles.choiceSelected,
              saving && styles.disabled
            ]}
          >
            <Text style={styles.choiceText}>Not selected</Text>
          </Pressable>
          {ITEM_TYPE_OPTIONS.map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`Commercial inventory item type: ${label}`}
              accessibilityState={{ checked: itemType === value, disabled: saving }}
              disabled={saving}
              onPress={() => setItemType(value)}
              style={[
                styles.choice,
                itemType === value && styles.choiceSelected,
                saving && styles.disabled
              ]}
            >
              <Text style={styles.choiceText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={location}
          onChangeText={setLocation}
          accessibilityLabel="Commercial inventory item location"
          editable={!saving}
          placeholder="Storage location"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />
        <Text style={styles.sectionLabel}>Optional links</Text>
        {linkOptionsLoading ? (
          <View
            accessibilityLabel="Loading Commercial inventory saved record choices"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.progressRow}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.helpText}>Loading saved record choices...</Text>
          </View>
        ) : null}
        {linkOptionsError ? (
          <View accessibilityLiveRegion="assertive" style={styles.loadError}>
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
              disabled={saving}
              choices={productChoices}
              selectedId={linkedProductId}
              onChange={setLinkedProductId}
              createHref="/home/commercial/products/new"
              createLabel="Create Product"
            />
            <RecordPicker
              label="Linked product trial evidence run"
              disabled={saving}
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
          disabled={saving}
          onPress={() => setShowAdvancedFields((current) => !current)}
          style={[styles.advancedToggle, saving && styles.disabled]}
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
              editable={!saving}
              placeholder="Custom item type"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
            />
            <TextInput
              value={linkedProductId}
              onChangeText={setLinkedProductId}
              accessibilityLabel="Commercial inventory linked product"
              editable={!saving}
              placeholder="Linked product ID"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={linkedIngredientId}
              onChangeText={setLinkedIngredientId}
              accessibilityLabel="Commercial inventory linked ingredient"
              editable={!saving}
              placeholder="Linked ingredient ID"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={linkedGeneticsId}
              onChangeText={setLinkedGeneticsId}
              accessibilityLabel="Commercial inventory linked genetics"
              editable={!saving}
              placeholder="Linked genetics ID"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={linkedGrowId}
              onChangeText={setLinkedGrowId}
              accessibilityLabel="Commercial inventory linked product trial evidence run"
              editable={!saving}
              placeholder="Linked product trial evidence run ID"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        ) : null}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Commercial inventory item notes"
          editable={!saving}
          placeholder="Notes"
          placeholderTextColor={palette.textMuted}
          multiline
          style={[styles.input, styles.notesInput]}
        />
        {saving ? (
          <View
            accessibilityLabel="Creating Commercial inventory record in progress"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.progressRow}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.helpText}>Creating inventory record...</Text>
          </View>
        ) : null}
        {saveError ? (
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.errorText}
          >
            {saveError}
          </Text>
        ) : null}
        <Pressable
          onPress={create}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Create commercial inventory item"
          accessibilityState={{ disabled: !canSave, busy: saving }}
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

export function createCommercialInventoryCreateStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 10 },
    header: { gap: 8 },
    kicker: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0,
      textTransform: "uppercase"
    },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900", marginBottom: 4 },
    helpText: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19
    },
    sectionLabel: {
      color: palette.textMuted,
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
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    choiceSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent
    },
    choiceText: {
      color: palette.link,
      fontSize: 13,
      fontWeight: "900"
    },
    recordPicker: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
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
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderWidth: 1,
      borderRadius: radius.card,
      gap: 8,
      padding: 10
    },
    errorText: {
      color: palette.danger,
      fontSize: 13,
      fontWeight: "700"
    },
    progressRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8
    },
    advancedToggle: {
      alignSelf: "flex-start",
      paddingHorizontal: 4,
      paddingVertical: 8
    },
    advancedToggleText: {
      color: palette.link,
      fontSize: 13,
      fontWeight: "900",
      textDecorationLine: "underline"
    },
    advancedFields: {
      gap: 10
    },
    input: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      color: palette.text,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    notesInput: { minHeight: 78, textAlignVertical: "top" },
    button: {
      marginTop: 6,
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12,
      alignItems: "center"
    },
    disabled: { opacity: 0.55 },
    buttonText: { color: palette.accentText, fontWeight: "800" }
  });
}
