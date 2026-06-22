import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";

import {
  createStorefront,
  fetchStorefront,
  updateStorefront
} from "../api/storefront";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct
} from "../api/products";
import ScreenContainer from "../components/ScreenContainer";

function idOf(item) {
  return String(item?.id || item?._id || item?.productId || "");
}

function centsToInput(value) {
  const n = Number(value || 0);
  if (!n) return "";
  return n > 999 ? (n / 100).toFixed(2) : n.toFixed(2);
}

function inputToCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function productPrice(product) {
  const cents = Number(product?.priceCents || 0);
  if (cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const price = Number(product?.price || 0);
  return price > 0 ? `$${price.toFixed(2)}` : "No price";
}

export default function StorefrontScreen() {
  const [storefront, setStorefront] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productName, setProductName] = useState("");
  const [productPriceValue, setProductPriceValue] = useState("");
  const [productPublished, setProductPublished] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextStorefront, nextProducts] = await Promise.all([
        fetchStorefront(),
        fetchProducts()
      ]);
      setStorefront(nextStorefront);
      setStoreName(nextStorefront?.name || "");
      setStoreSlug(nextStorefront?.slug || "");
      setProducts(nextProducts);
    } catch (err) {
      setError(err?.message || "Unable to load storefront.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      `${product?.name || ""} ${product?.sku || ""} ${product?.status || ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [products, query]);

  function openAddProduct() {
    setEditingProduct(null);
    setProductName("");
    setProductPriceValue("");
    setProductPublished(false);
    setModalVisible(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);
    setProductName(product?.name || "");
    setProductPriceValue(centsToInput(product?.priceCents ?? product?.price));
    setProductPublished(product?.status === "published" || product?.isPublished === true);
    setModalVisible(true);
  }

  async function saveStorefront() {
    const name = storeName.trim();
    if (!name) {
      Alert.alert("Storefront", "Storefront name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { name, slug: storeSlug.trim() || undefined };
      const result = storefront ? await updateStorefront(payload) : await createStorefront(payload);
      const next = result?.storefront || result?.data?.storefront || result?.data || result;
      setStorefront(next);
      setStoreName(next?.name || name);
      setStoreSlug(next?.slug || payload.slug || "");
    } catch (err) {
      setError(err?.message || "Unable to save storefront.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct() {
    const name = productName.trim();
    if (!name) {
      Alert.alert("Product", "Product name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name,
        priceCents: inputToCents(productPriceValue),
        status: productPublished ? "published" : "draft"
      };
      if (editingProduct) {
        await updateProduct(idOf(editingProduct), payload);
      } else {
        await createProduct(payload);
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      Alert.alert("Product", err?.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(product) {
    Alert.alert("Delete product?", `Delete "${product?.name || "this product"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await deleteProduct(idOf(product));
            await load();
          } catch (err) {
            Alert.alert("Product", err?.message || "Unable to delete product.");
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Storefront</Text>
          <Text style={styles.subtitle}>Manage storefront settings and sellable products.</Text>
        </View>
        <Pressable style={styles.button} onPress={load} disabled={loading || saving}>
          <Text style={styles.buttonText}>Refresh</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Storefront setup</Text>
        <TextInput
          value={storeName}
          onChangeText={setStoreName}
          placeholder="Storefront name"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
        <TextInput
          value={storeSlug}
          onChangeText={setStoreSlug}
          placeholder="Optional storefront slug"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          style={styles.input}
        />
        <View style={styles.rowBetween}>
          <Text style={styles.meta}>
            Status: {storefront?.isPublished ? "published" : "draft"}
          </Text>
          <Pressable style={styles.button} onPress={saveStorefront} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "Saving..." : "Save storefront"}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Products</Text>
        <Pressable style={styles.button} onPress={openAddProduct} disabled={saving}>
          <Text style={styles.buttonText}>Add Product</Text>
        </Pressable>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search products"
        placeholderTextColor="#94A3B8"
        style={styles.search}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading storefront...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item, idx) => idOf(item) || `product-${idx}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No products yet.</Text>
              <Text style={styles.meta}>Create your first product to populate the storefront.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.productName}>{item?.name || "Unnamed product"}</Text>
                <Text style={styles.meta}>{productPrice(item)}</Text>
                <Text style={styles.meta}>Status: {item?.status || "draft"}</Text>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.secondaryButton} onPress={() => openEditProduct(item)}>
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.dangerButton} onPress={() => confirmDelete(item)}>
                  <Text style={styles.buttonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingProduct ? "Edit Product" : "Add Product"}
            </Text>
            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="Product name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
            <TextInput
              value={productPriceValue}
              onChangeText={setProductPriceValue}
              placeholder="Price, for example 19.99"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Published</Text>
              <Switch value={productPublished} onValueChange={setProductPublished} />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={saveProduct} disabled={saving}>
                <Text style={styles.buttonText}>{saving ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  header: { color: "#111827", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#64748B", marginTop: 4 },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "800" },
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 14,
    padding: 12
  },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    padding: 10
  },
  search: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    marginTop: 10,
    padding: 10
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  button: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  secondaryButtonText: { color: "#334155", fontWeight: "800" },
  dangerButton: {
    backgroundColor: "#991B1B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  error: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    marginBottom: 10,
    padding: 10
  },
  listContent: { paddingBottom: 80, paddingTop: 10 },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    padding: 12
  },
  cardBody: { flex: 1 },
  productName: { color: "#111827", fontSize: 16, fontWeight: "800" },
  meta: { color: "#64748B", marginTop: 4 },
  actions: { gap: 8 },
  center: { alignItems: "center", gap: 8, padding: 24 },
  empty: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 20
  },
  emptyTitle: { color: "#111827", fontSize: 16, fontWeight: "800" },
  modalOverlay: {
    backgroundColor: "rgba(15,23,42,0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 16
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    gap: 12,
    padding: 16
  },
  modalTitle: { color: "#111827", fontSize: 20, fontWeight: "800" },
  label: { color: "#334155", fontWeight: "800" },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end"
  }
});
