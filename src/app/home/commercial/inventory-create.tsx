import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";

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

  const path = useMemo(
    () =>
      (endpoints as any)?.commercial?.inventory ??
      (endpoints as any)?.inventoryGlobal ??
      "/api/inventory",
    []
  );

  const canSave = name.trim().length > 1 && !saving;

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
    <View style={styles.container}>
      <Text style={styles.h1}>Create Inventory Support Item</Text>
      <Text style={styles.helpText}>
        Commercial inventory support tracks stock behind products, batches/lots, plants,
        ingredients, packaging, genetics, equipment, courses, services, and retail items.
        Product records still explain and sell the item; inventory support tracks
        quantity, cost, supplier, and location.
      </Text>
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
      <TextInput
        value={itemType}
        onChangeText={setItemType}
        accessibilityLabel="Commercial inventory item type"
        placeholder="Item type: product, ingredient, packaging, plant, genetics, equipment..."
        style={styles.input}
      />
      <TextInput
        value={location}
        onChangeText={setLocation}
        accessibilityLabel="Commercial inventory item location"
        placeholder="Storage location"
        style={styles.input}
      />
      <Text style={styles.sectionLabel}>Optional links</Text>
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
          {saving ? "Saving..." : "Create Support Item"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  helpText: { color: "#475569", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  sectionLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
    textTransform: "uppercase"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  notesInput: { minHeight: 78, textAlignVertical: "top" },
  button: {
    marginTop: 6,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  disabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "800" }
});
