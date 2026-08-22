import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import CalendarDateField from "@/components/forms/CalendarDateField";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

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
  const [location, setLocation] = useState("");
  const [authorizedUnitCost, setAuthorizedUnitCost] = useState("");
  const [currency, setCurrency] = useState("");
  const [sourceFreshnessAt, setSourceFreshnessAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const saveInFlightRef = useRef(false);

  const path = useMemo(
    () =>
      (endpoints as any)?.commercial?.inventory ??
      (endpoints as any)?.inventoryGlobal ??
      "/api/inventory",
    []
  );

  const canSave = name.trim().length > 1 && unit.trim().length > 0 && !saving;

  const create = async () => {
    if (!canSave || saveInFlightRef.current) return;
    const quantityNumber = Number(qty);
    const reorderPointNumber = Number(reorderPoint);
    const costNumber = Number(authorizedUnitCost);
    const normalizedCurrency = currency.trim().toLowerCase();

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
    if (authorizedUnitCost.trim() && (!Number.isFinite(costNumber) || costNumber < 0)) {
      setSaveError("Authorized unit cost must be a number that is zero or greater.");
      return;
    }
    if (normalizedCurrency && !/^[a-z]{3}$/.test(normalizedCurrency)) {
      setSaveError("Currency must be a three-letter code such as USD.");
      return;
    }
    if (authorizedUnitCost.trim() && !normalizedCurrency) {
      setSaveError("Choose a currency when recording an authorized unit cost.");
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
          locationId: location.trim() || undefined,
          authorizedUnitCost: authorizedUnitCost.trim() ? costNumber : null,
          currency: normalizedCurrency || undefined,
          sourceFreshnessAt: sourceFreshnessAt || null,
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
            Track a real stock record by name, SKU, quantity, counting unit, reorder
            point, supplier, category, and storage location. Public product and evidence
            links stay in their own workflows until a verified inventory-link contract is
            available.
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
        <TextInput
          value={location}
          onChangeText={setLocation}
          accessibilityLabel="Commercial inventory item location"
          editable={!saving}
          placeholder="Storage location ID"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
        />
        <Text style={styles.helpText}>
          Vendor and authorized cost are private workspace records and are not published
          to Storefront or discovery.
        </Text>
        <TextInput
          value={authorizedUnitCost}
          onChangeText={setAuthorizedUnitCost}
          accessibilityLabel="Commercial inventory item authorized unit cost"
          editable={!saving}
          placeholder="Authorized unit cost (private, optional)"
          placeholderTextColor={palette.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <TextInput
          value={currency}
          onChangeText={setCurrency}
          accessibilityLabel="Commercial inventory item currency"
          editable={!saving}
          placeholder="Currency, e.g. USD"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="characters"
          maxLength={3}
          style={styles.input}
        />
        <CalendarDateField
          accessibilityLabel="Commercial inventory item source freshness date"
          disabled={saving}
          label="Source freshness date"
          maximumDate={new Date().toISOString().slice(0, 10)}
          onChange={setSourceFreshnessAt}
          optional
          placeholder="When this source or cost was last verified"
          value={sourceFreshnessAt}
        />
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
