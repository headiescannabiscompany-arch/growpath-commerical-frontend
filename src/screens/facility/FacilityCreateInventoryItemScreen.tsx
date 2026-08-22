import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import CalendarDateField from "@/components/forms/CalendarDateField";

export default function FacilityCreateInventoryItemScreen() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const ent = useEntitlements();
  const { palette } = useAppTheme();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [category, setCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [locationId, setLocationId] = useState("");
  const [authorizedUnitCost, setAuthorizedUnitCost] = useState("");
  const [currency, setCurrency] = useState("");
  const [sourceFreshnessAt, setSourceFreshnessAt] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const canWriteInventory = Boolean(ent?.can?.(CAPABILITY_KEYS.INVENTORY_WRITE));
  const canSave =
    !!facilityId &&
    canWriteInventory &&
    name.trim().length > 1 &&
    unit.trim().length > 0 &&
    !saving;

  const createItem = async () => {
    if (!canSave || !facilityId) return;
    const quantityNumber = Number(quantity);
    const reorderPointNumber = Number(reorderPoint);
    const costNumber = Number(authorizedUnitCost);
    const normalizedCurrency = currency.trim().toLowerCase();

    if (!quantity.trim() || !Number.isFinite(quantityNumber) || quantityNumber < 0) {
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
    if (
      authorizedUnitCost.trim() &&
      (!Number.isFinite(costNumber) || costNumber < 0)
    ) {
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

    setSaving(true);
    setSaveError("");
    try {
      await apiRequest(endpoints.inventory(facilityId), {
        method: "POST",
        body: {
          name: name.trim(),
          sku: sku.trim() || undefined,
          quantity: quantityNumber,
          unit: unit.trim(),
          reorderPoint:
            reorderPoint.trim() && Number.isFinite(reorderPointNumber)
              ? reorderPointNumber
              : 0,
          category: category.trim() || undefined,
          vendor: vendor.trim() || undefined,
          locationId: locationId.trim() || undefined,
          authorizedUnitCost: authorizedUnitCost.trim() ? costNumber : null,
          currency: normalizedCurrency || undefined,
          sourceFreshnessAt: sourceFreshnessAt || null
        }
      });
      router.replace("/home/facility/inventory");
    } catch (e: any) {
      setSaveError(String(e?.message || e || "Unable to create inventory item."));
    } finally {
      setSaving(false);
    }
  };

  if (!canWriteInventory) {
    return (
      <ScreenBoundary
        title="Create Inventory Item"
        showBack
        backFallbackHref="/home/facility/inventory"
      >
        <View accessibilityRole="alert" style={styles.container}>
          <Text
            accessibilityRole="header"
            aria-level={1}
            style={[styles.h1, { color: palette.text }]}
          >
            Inventory is read-only
          </Text>
          <Text style={[styles.lockedText, { color: palette.warning }]}>
            Your facility role or plan does not allow inventory changes. Ask an owner or
            manager to update inventory access.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to facility inventory"
            onPress={() => router.replace("/home/facility/inventory")}
            style={[styles.button, { backgroundColor: palette.accent }]}
          >
            <Text style={[styles.buttonText, { color: palette.accentText }]}>
              Return to Inventory
            </Text>
          </Pressable>
        </View>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title="Create Inventory Item"
      showBack
      backFallbackHref="/home/facility/inventory"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text
          accessibilityRole="header"
          aria-level={1}
          style={[styles.h1, { color: palette.text }]}
        >
          Create Inventory Item
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          accessibilityLabel="Inventory item name"
          editable={!saving}
          placeholder="Name"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <TextInput
          value={sku}
          onChangeText={setSku}
          accessibilityLabel="Inventory item SKU"
          editable={!saving}
          placeholder="SKU (optional)"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          accessibilityLabel="Inventory item quantity"
          editable={!saving}
          placeholder="Quantity"
          keyboardType="numeric"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <TextInput
          value={unit}
          onChangeText={setUnit}
          accessibilityLabel="Inventory item unit"
          editable={!saving}
          placeholder="Unit (bags, bottles, grams)"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <TextInput
          value={reorderPoint}
          onChangeText={setReorderPoint}
          accessibilityLabel="Inventory item reorder point"
          editable={!saving}
          placeholder="Reorder point"
          keyboardType="numeric"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <TextInput
          value={category}
          onChangeText={setCategory}
          accessibilityLabel="Inventory item category"
          editable={!saving}
          placeholder="Category (optional)"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <Text style={[styles.privateLabel, { color: palette.textMuted }]}>
          Private workspace fields — vendor and authorized cost are not published to
          Storefront or discovery.
        </Text>
        <TextInput
          value={vendor}
          onChangeText={setVendor}
          accessibilityLabel="Inventory item vendor"
          editable={!saving}
          placeholder="Vendor (private, optional)"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <TextInput
          value={locationId}
          onChangeText={setLocationId}
          accessibilityLabel="Inventory item location"
          editable={!saving}
          placeholder="Storage location ID (optional)"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <TextInput
          value={authorizedUnitCost}
          onChangeText={setAuthorizedUnitCost}
          accessibilityLabel="Inventory item authorized unit cost"
          editable={!saving}
          placeholder="Authorized unit cost (private, optional)"
          keyboardType="decimal-pad"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <TextInput
          value={currency}
          onChangeText={setCurrency}
          accessibilityLabel="Inventory item currency"
          editable={!saving}
          placeholder="Currency, e.g. USD"
          autoCapitalize="characters"
          maxLength={3}
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              color: palette.text
            }
          ]}
        />
        <CalendarDateField
          accessibilityLabel="Inventory item source freshness date"
          disabled={saving}
          label="Source freshness date"
          maximumDate={new Date().toISOString().slice(0, 10)}
          onChange={setSourceFreshnessAt}
          optional
          placeholder="When this source or cost was last verified"
          value={sourceFreshnessAt}
        />
        {saveError ? (
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={[styles.errorText, { color: palette.danger }]}
          >
            {saveError}
          </Text>
        ) : null}
        <Pressable
          onPress={createItem}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Create inventory item"
          accessibilityState={{ disabled: !canSave }}
          style={[
            styles.button,
            { backgroundColor: palette.accent },
            !canSave && styles.disabled
          ]}
        >
          <Text style={[styles.buttonText, { color: palette.accentText }]}>
            {saving ? "Saving..." : "Create Item"}
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  button: {
    marginTop: 6,
    borderRadius: radius.card,
    paddingVertical: 12,
    alignItems: "center"
  },
  disabled: { opacity: 0.55 },
  buttonText: { fontWeight: "800" },
  lockedText: { fontWeight: "800" },
  privateLabel: { fontSize: 12, fontWeight: "800", lineHeight: 18 },
  errorText: { fontSize: 13, fontWeight: "800" }
});
