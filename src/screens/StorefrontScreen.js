import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
  StyleSheet
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/auth/AuthContext";
import {
  listVendors as apiListVendors,
  updateVendor as apiUpdateVendor
} from "../api/vendor";

function safeId(obj) {
  return obj?.id ?? obj?._id ?? obj?.vendorId ?? obj?.productId ?? null;
}

export default function StorefrontScreen() {
  const qc = useQueryClient();

  const auth = useAuth?.() ?? {};
  const token = auth?.token ?? auth?.authToken ?? null;
  const user = auth?.user ?? null;

  // Robust facilityId mapping from user/auth context
  const facilityId =
    user?.facilityId ??
    user?.facility?._id ??
    user?.facility?.id ??
    user?.selectedFacilityId ??
    user?.facilitiesAccess?.[0]?.facilityId ??
    auth?.facilityId ??
    auth?.selectedFacilityId ??
    null;


  const [selectedVendorId, setSelectedVendorId] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);

  const vendorsQuery = useQuery({
    queryKey: ["vendors", facilityId],
    enabled: !!facilityId,
    queryFn: async () => {
      const res = await apiListVendors(facilityId);
      if (res.success && Array.isArray(res.data)) return res.data;
      return [];
    }
  });

  const vendors = vendorsQuery.data ?? [];

  const selectedVendor = useMemo(() => {
    if (!vendors.length) return null;
    const found = selectedVendorId
      ? vendors.find((v) => safeId(v) === selectedVendorId)
      : null;
    return found ?? vendors[0];
  }, [vendors, selectedVendorId]);

  useEffect(() => {
    if (!selectedVendorId && vendors.length) {
      setSelectedVendorId(safeId(vendors[0]));
    }
  }, [vendors, selectedVendorId]);

  const products = useMemo(() => {
    const arr = selectedVendor?.products;
    return Array.isArray(arr) ? arr : [];
  }, [selectedVendor]);

  const updateVendorMutation = useMutation({
    mutationFn: async ({ vendorPayload }) => {
      const vendorId = safeId(selectedVendor);
      if (!facilityId) throw new Error("facilityId missing");
      if (!vendorId) throw new Error("vendorId missing");
      return apiUpdateVendor(facilityId, vendorId, vendorPayload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vendors", facilityId] });
    }
  });

  function resetForm() {
    setEditingProductId(null);
    setName("");
    setPrice("");
    setActive(true);
  }

  function openAdd() {
    resetForm();
    setModalVisible(true);
  }

  function openEdit(product) {
    setEditingProductId(safeId(product));
    setName(product?.name ?? "");
    setPrice(product?.price === 0 || product?.price ? String(product.price) : "");
    setActive(product?.active ?? true);
    setModalVisible(true);
  }

  async function saveProduct() {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Missing name", "Product name is required.");

    const parsed = price === "" ? null : Number(price);
    if (price !== "" && Number.isNaN(parsed)) {
      return Alert.alert("Invalid price", "Price must be numeric.");
    }

    const current = Array.isArray(selectedVendor?.products)
      ? selectedVendor.products
      : [];
    const next = [...current];

    if (editingProductId) {
      const idx = next.findIndex((p) => safeId(p) === editingProductId);
      if (idx === -1) return Alert.alert("Not found", "Product not found.");
      next[idx] = {
        ...next[idx],
        name: trimmed,
        price: parsed ?? next[idx]?.price ?? 0,
        active
      };
    } else {
      next.unshift({
        id: `tmp_${Date.now()}`,
        name: trimmed,
        price: parsed ?? 0,
        active
      });
    }

    const vendorPayload = { ...selectedVendor, products: next };

    try {
      await updateVendorMutation.mutateAsync({ vendorPayload });
      setModalVisible(false);
      resetForm();
    } catch (e) {
      Alert.alert("Save failed", e?.message ?? "Could not save product.");
    }
  }

  function confirmDelete(product) {
    Alert.alert("Delete product?", `Delete "${product?.name ?? "this product"}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteProduct(product) }
    ]);
  }

  async function deleteProduct(product) {
    const pid = safeId(product);
    if (!pid) return Alert.alert("Missing id", "Product has no id.");

    const current = Array.isArray(selectedVendor?.products)
      ? selectedVendor.products
      : [];
    const next = current.filter((p) => safeId(p) !== pid);

    const vendorPayload = { ...selectedVendor, products: next };

    try {
      await updateVendorMutation.mutateAsync({ vendorPayload });
    } catch (e) {
      Alert.alert("Delete failed", e?.message ?? "Could not delete product.");
    }
  }

  if (!facilityId) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Storefront</Text>
        <Text style={styles.muted}>facilityId not found. Map it from AuthContext.</Text>
      </View>
    );
  }

  if (vendorsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading vendors…</Text>
      </View>
    );
  }

  if (vendorsQuery.isError) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Storefront</Text>
        <View
          style={{
            marginTop: 40,
            padding: 24,
            borderRadius: 12,
            backgroundColor: "#FEE2E2",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#FCA5A5"
          }}
        >
          <Text style={{ fontSize: 32, color: "#B91C1C", marginBottom: 8 }}>🚫</Text>
          <Text
            style={{
              color: "#B91C1C",
              fontWeight: "bold",
              fontSize: 18,
              marginBottom: 4
            }}
          >
            {vendorsQuery.error?.message?.includes("403")
              ? "Access Denied"
              : vendorsQuery.error?.message?.includes("404")
                ? "Not Found"
                : "API Error"}
          </Text>
          <Text style={{ color: "#B91C1C", textAlign: "center" }}>
            {vendorsQuery.error?.message ?? "Failed to load vendors."}
          </Text>
        </View>
        <Pressable style={styles.button} onPress={() => vendorsQuery.refetch()}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!vendors.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Storefront</Text>
        <Text style={styles.muted}>No vendors found for this facility.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Storefront</Text>
      <Text style={styles.muted}>Editing products via PUT vendor</Text>

      {vendors.length > 1 && (
        <View style={styles.vendorRow}>
          {vendors.map((v) => {
            const vid = safeId(v);
            const isActive = vid && selectedVendor && vid === safeId(selectedVendor);
            return (
              <Pressable
                key={vid ?? Math.random()}
                onPress={() => setSelectedVendorId(vid)}
                style={[styles.vendorChip, isActive && styles.vendorChipActive]}
              >
                <Text style={styles.vendorChipText}>
                  {v?.companyName ?? v?.name ?? "Vendor"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Products</Text>
        <Pressable style={styles.button} onPress={openAdd}>
          <Text style={styles.buttonText}>Add Product</Text>
        </Pressable>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item, idx) => String(safeId(item) ?? idx)}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item?.name ?? "Unnamed"}</Text>
              <Text style={styles.muted}>
                {item?.price === 0 || item?.price
                  ? `$${Number(item.price).toFixed(2)}`
                  : "—"}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <View style={styles.switchRow}>
                <Text style={styles.muted}>
                  {(item?.active ?? true) ? "Active" : "Inactive"}
                </Text>
                <Switch value={!!(item?.active ?? true)} disabled />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  style={[styles.button, styles.buttonMuted]}
                  onPress={() => openEdit(item)}
                >
                  <Text style={styles.buttonText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.buttonDanger]}
                  onPress={() => confirmDelete(item)}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.card}>
            <Text style={styles.muted}>No products yet.</Text>
          </View>
        }
      />

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingProductId ? "Edit Product" : "Add Product"}
            </Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Product name"
              placeholderTextColor="#64748b"
              style={styles.input}
            />

            <Text style={styles.label}>Price</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="19.99"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <View style={styles.rowBetween}>
              <Text style={styles.label}>Active</Text>
              <Switch value={active} onValueChange={setActive} />
            </View>

            {updateVendorMutation.isPending && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator />
                <Text style={styles.muted}>Saving…</Text>
              </View>
            )}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 10
              }}
            >
              <Pressable
                style={[styles.button, styles.buttonMuted]}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
                disabled={updateVendorMutation.isPending}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.button}
                onPress={saveProduct}
                disabled={updateVendorMutation.isPending}
              >
                <Text style={styles.buttonText}>{editingProductId ? "Save" : "Add"}</Text>
              </Pressable>
            </View>

            {updateVendorMutation.isError && (
              <Text style={styles.error}>
                {updateVendorMutation.error?.message ?? "Save failed"}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  center: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8
  },

  header: { fontSize: 22, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  muted: { color: "#475569" },
  error: { color: "#b91c1c", marginTop: 8 },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#0f172a"
  },
  buttonMuted: { backgroundColor: "#1f2937" },
  buttonDanger: { backgroundColor: "#7f1d1d" },
  buttonText: { color: "white", fontWeight: "800" },

  card: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    flexDirection: "row",
    gap: 12
  },
  cardTitle: { color: "white", fontWeight: "800", fontSize: 16 },

  vendorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  vendorChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#111827"
  },
  vendorChipActive: { backgroundColor: "#1d4ed8" },
  vendorChipText: { color: "white", fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 16
  },
  modal: { backgroundColor: "#0b1220", borderRadius: 14, padding: 14, gap: 10 },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  label: { color: "#cbd5e1", fontWeight: "800" },
  input: { backgroundColor: "#111827", color: "white", padding: 10, borderRadius: 10 }
});
