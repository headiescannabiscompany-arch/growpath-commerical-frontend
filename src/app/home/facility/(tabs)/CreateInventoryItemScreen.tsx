import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { radius } from "@/theme/theme";
import { useAppTheme } from "@/theme/appTheme";

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
  const [saving, setSaving] = useState(false);

  const canWriteInventory = Boolean(ent?.can?.(CAPABILITY_KEYS.INVENTORY_WRITE));
  const canSave = !!facilityId && canWriteInventory && name.trim().length > 1 && !saving;

  const createItem = async () => {
    if (!canSave || !facilityId) return;
    const quantityNumber = Number(quantity);
    const reorderPointNumber = Number(reorderPoint);

    setSaving(true);
    try {
      await apiRequest(endpoints.inventory(facilityId), {
        method: "POST",
        body: {
          name: name.trim(),
          sku: sku.trim() || undefined,
          quantity: Number.isFinite(quantityNumber) ? quantityNumber : 0,
          unit: unit.trim() || undefined,
          reorderPoint:
            reorderPoint.trim() && Number.isFinite(reorderPointNumber)
              ? reorderPointNumber
              : undefined
        }
      });
      router.replace("/home/facility/inventory");
    } catch (e: any) {
      Alert.alert("Create failed", String(e?.message || e || "Unknown error"));
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
      <View style={styles.container}>
        <Text style={[styles.h1, { color: palette.text }]}>Create Inventory Item</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          accessibilityLabel="Inventory item name"
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
        <Pressable
          onPress={createItem}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Create inventory item"
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
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
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
  lockedText: { fontWeight: "800" }
});
