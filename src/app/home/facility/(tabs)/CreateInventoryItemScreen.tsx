import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

export default function FacilityCreateInventoryItemScreen() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [saving, setSaving] = useState(false);

  const canSave = !!facilityId && name.trim().length > 1 && !saving;

  const createItem = async () => {
    if (!canSave || !facilityId) return;
    setSaving(true);
    try {
      await apiRequest(endpoints.inventory(facilityId), {
        method: "POST",
        body: {
          name: name.trim(),
          sku: sku.trim() || undefined,
          quantity: Number(quantity) || 0
        }
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Create failed", String(e?.message || e || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Create Inventory Item</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        style={styles.input}
      />
      <TextInput
        value={sku}
        onChangeText={setSku}
        placeholder="SKU (optional)"
        style={styles.input}
      />
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Quantity"
        keyboardType="numeric"
        style={styles.input}
      />
      <Pressable
        onPress={createItem}
        disabled={!canSave}
        style={[styles.button, !canSave && styles.disabled]}
      >
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Create Item"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  button: {
    marginTop: 6,
    backgroundColor: "#166534",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  disabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "800" }
});
