import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { createStorefront, fetchStorefront, updateStorefront } from "../api/storefront";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct
} from "../api/products";
import { apiRequest } from "../api/apiRequest";
import { endpoints } from "../api/endpoints";
import ScreenContainer from "../components/ScreenContainer";
import { persistImageUri } from "@/utils/photoUploads";

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

function rows(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function inventoryLabel(item) {
  if (!item) return "Manual stock";
  const qty = item?.quantity ?? item?.qty ?? item?.onHand ?? item?.count ?? 0;
  const unit = item?.unit || "ea";
  const sku = item?.sku ? ` - ${item.sku}` : "";
  return `${item?.name || "Inventory item"}${sku} (${qty} ${unit})`;
}

export default function StorefrontScreen() {
  const [storefront, setStorefront] = useState(null);
  const [products, setProducts] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [storeWebsiteUrl, setStoreWebsiteUrl] = useState("");
  const [storeSupportEmail, setStoreSupportEmail] = useState("");
  const [storeSocialLinksText, setStoreSocialLinksText] = useState("");
  const [storePublished, setStorePublished] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productShortDescription, setProductShortDescription] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productUsageInstructions, setProductUsageInstructions] = useState("");
  const [productWarnings, setProductWarnings] = useState("");
  const [productExternalPurchaseUrl, setProductExternalPurchaseUrl] = useState("");
  const [productLineId, setProductLineId] = useState("");
  const [linkedRecipeId, setLinkedRecipeId] = useState("");
  const [linkedBatchId, setLinkedBatchId] = useState("");
  const [linkedGrowTrialId, setLinkedGrowTrialId] = useState("");
  const [linkedCourseId, setLinkedCourseId] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productPriceValue, setProductPriceValue] = useState("");
  const [productInventoryCount, setProductInventoryCount] = useState("");
  const [productInventoryItemId, setProductInventoryItemId] = useState("");
  const [productPublished, setProductPublished] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextStorefront, nextProducts, nextInventory] = await Promise.all([
        fetchStorefront(),
        fetchProducts(),
        apiRequest(endpoints.commercial.inventory, { method: "GET" })
      ]);
      setStorefront(nextStorefront);
      setStoreName(nextStorefront?.name || "");
      setStoreSlug(nextStorefront?.slug || "");
      setStoreWebsiteUrl(nextStorefront?.websiteUrl || "");
      setStoreSupportEmail(nextStorefront?.supportEmail || "");
      setStoreSocialLinksText(
        Array.isArray(nextStorefront?.socialLinks)
          ? nextStorefront.socialLinks
              .map((link) => [link.label, link.url].filter(Boolean).join(": "))
              .join("\n")
          : nextStorefront?.socialLinksText || ""
      );
      setStorePublished(Boolean(nextStorefront?.isPublished));
      setProducts(nextProducts);
      setInventoryItems(rows(nextInventory, "inventory"));
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
    setProductSku("");
    setProductCategory("");
    setProductShortDescription("");
    setProductDescription("");
    setProductUsageInstructions("");
    setProductWarnings("");
    setProductExternalPurchaseUrl("");
    setProductLineId("");
    setLinkedRecipeId("");
    setLinkedBatchId("");
    setLinkedGrowTrialId("");
    setLinkedCourseId("");
    setProductImageUrl("");
    setProductPriceValue("");
    setProductInventoryCount("");
    setProductInventoryItemId("");
    setProductPublished(false);
    setUploadingProductImage(false);
    setModalVisible(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);
    setProductName(product?.name || "");
    setProductSku(product?.sku || "");
    setProductCategory(product?.category || "");
    setProductShortDescription(product?.shortDescription || "");
    setProductDescription(product?.description || "");
    setProductUsageInstructions(product?.usageInstructions || "");
    setProductWarnings(product?.warnings || "");
    setProductExternalPurchaseUrl(product?.externalPurchaseUrl || "");
    setProductLineId(product?.productLineId || "");
    setLinkedRecipeId(product?.linkedRecipeId || "");
    setLinkedBatchId(product?.linkedBatchId || "");
    setLinkedGrowTrialId(product?.linkedGrowTrialId || "");
    setLinkedCourseId(product?.linkedCourseId || "");
    setProductImageUrl(product?.imageUrl || "");
    setProductPriceValue(centsToInput(product?.priceCents ?? product?.price));
    setProductInventoryCount(
      product?.inventoryCount === undefined || product?.inventoryCount === null
        ? ""
        : String(product.inventoryCount)
    );
    setProductInventoryItemId(
      String(
        product?.inventoryItemId ||
          product?.inventoryItem?._id ||
          product?.inventoryItem?.id ||
          ""
      )
    );
    setProductPublished(product?.status === "published" || product?.isPublished === true);
    setUploadingProductImage(false);
    setModalVisible(true);
  }

  async function pickProductImage() {
    if (uploadingProductImage) return;
    setUploadingProductImage(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission?.granted === false) {
        Alert.alert(
          "Product image",
          "Photo library access is required to upload an image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9
      });
      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      const imageUrl = await persistImageUri(uri);
      if (!imageUrl) throw new Error("Image upload did not return a URL.");
      setProductImageUrl(imageUrl);
    } catch (err) {
      Alert.alert("Product image", err?.message || "Unable to upload product image.");
    } finally {
      setUploadingProductImage(false);
    }
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
      const payload = {
        name,
        slug: storeSlug.trim() || undefined,
        websiteUrl: storeWebsiteUrl.trim() || undefined,
        supportEmail: storeSupportEmail.trim() || undefined,
        socialLinksText: storeSocialLinksText.trim() || undefined,
        isPublished: storePublished
      };
      const result = storefront
        ? await updateStorefront(payload)
        : await createStorefront(payload);
      const next =
        result?.storefront || result?.data?.storefront || result?.data || result;
      setStorefront(next);
      setStoreName(next?.name || name);
      setStoreSlug(next?.slug || payload.slug || "");
      setStoreWebsiteUrl(next?.websiteUrl || payload.websiteUrl || "");
      setStoreSupportEmail(next?.supportEmail || payload.supportEmail || "");
      setStoreSocialLinksText(next?.socialLinksText || payload.socialLinksText || "");
      setStorePublished(Boolean(next?.isPublished ?? storePublished));
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
        sku: productSku.trim(),
        category: productCategory.trim(),
        shortDescription: productShortDescription.trim(),
        description: productDescription.trim(),
        usageInstructions: productUsageInstructions.trim(),
        warnings: productWarnings.trim(),
        externalPurchaseUrl: productExternalPurchaseUrl.trim(),
        productLineId: productLineId.trim() || undefined,
        linkedRecipeId: linkedRecipeId.trim() || undefined,
        linkedBatchId: linkedBatchId.trim() || undefined,
        linkedGrowTrialId: linkedGrowTrialId.trim() || undefined,
        linkedCourseId: linkedCourseId.trim() || undefined,
        imageUrl: productImageUrl.trim(),
        priceCents: inputToCents(productPriceValue),
        status: productPublished ? "published" : "draft",
        inventoryItemId: productInventoryItemId || null,
        inventoryCount:
          productInventoryItemId || productInventoryCount.trim() === ""
            ? null
            : Math.max(0, Number(productInventoryCount) || 0)
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
          <Text style={styles.subtitle}>
            Manage storefront settings and sellable products.
          </Text>
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
        <TextInput
          value={storeWebsiteUrl}
          onChangeText={setStoreWebsiteUrl}
          placeholder="Website or shop URL"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          keyboardType="url"
          style={styles.input}
        />
        <TextInput
          value={storeSupportEmail}
          onChangeText={setStoreSupportEmail}
          placeholder="Support email"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={storeSocialLinksText}
          onChangeText={setStoreSocialLinksText}
          placeholder="Social links, one per line"
          placeholderTextColor="#94A3B8"
          multiline
          style={[styles.input, styles.textArea]}
        />
        <Text style={styles.meta}>
          Public users can find this profile from feed posts, forum replies, products,
          courses, similar brand links, and public store pages.
        </Text>
        <View style={styles.rowBetween}>
          <Text style={styles.meta}>
            Status: {storefront?.isPublished ? "published" : "draft"}
          </Text>
          <View style={styles.inlineSwitch}>
            <Text style={styles.label}>Publish</Text>
            <Switch value={storePublished} onValueChange={setStorePublished} />
          </View>
          <Pressable style={styles.button} onPress={saveStorefront} disabled={saving}>
            <Text style={styles.buttonText}>
              {saving ? "Saving..." : "Save storefront"}
            </Text>
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
              <Text style={styles.meta}>
                Create your first product to populate the storefront.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.productName}>{item?.name || "Unnamed product"}</Text>
                <Text style={styles.meta}>{productPrice(item)}</Text>
                <Text style={styles.meta}>
                  {[item?.sku ? `SKU ${item.sku}` : "", item?.status || "draft"]
                    .filter(Boolean)
                    .join(" - ")}
                </Text>
                {item?.category || item?.shortDescription ? (
                  <Text style={styles.meta}>
                    {[item.category, item.shortDescription].filter(Boolean).join(" - ")}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  Inventory:{" "}
                  {item?.inventoryItem
                    ? inventoryLabel(item.inventoryItem)
                    : item?.inventoryCount === null || item?.inventoryCount === undefined
                      ? "not tracked"
                      : item.inventoryCount}
                </Text>
                {item?.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                {item?.externalPurchaseUrl ? (
                  <Text style={styles.meta}>External purchase link added</Text>
                ) : null}
                {item?.linkedRecipeId ||
                item?.linkedBatchId ||
                item?.linkedGrowTrialId ||
                item?.linkedCourseId ? (
                  <Text style={styles.meta}>
                    Linked evidence:{" "}
                    {[
                      item.linkedRecipeId && "recipe",
                      item.linkedBatchId && "batch",
                      item.linkedGrowTrialId && "trial",
                      item.linkedCourseId && "course"
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => openEditProduct(item)}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.dangerButton}
                  onPress={() => confirmDelete(item)}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalShell} contentContainerStyle={styles.modal}>
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
              value={productSku}
              onChangeText={setProductSku}
              placeholder="SKU"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              style={styles.input}
            />
            <TextInput
              value={productCategory}
              onChangeText={setProductCategory}
              placeholder="Category, e.g. soil mix, dry amendment, houseplant"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
            <TextInput
              value={productShortDescription}
              onChangeText={setProductShortDescription}
              placeholder="Short public summary"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
            <TextInput
              value={productDescription}
              onChangeText={setProductDescription}
              placeholder="Description"
              placeholderTextColor="#94A3B8"
              multiline
              style={[styles.input, styles.textArea]}
            />
            <TextInput
              value={productUsageInstructions}
              onChangeText={setProductUsageInstructions}
              placeholder="Usage instructions, application rate, or care guidance"
              placeholderTextColor="#94A3B8"
              multiline
              style={[styles.input, styles.textArea]}
            />
            <TextInput
              value={productWarnings}
              onChangeText={setProductWarnings}
              placeholder="Warnings, stage limits, legal notes, or safety notes"
              placeholderTextColor="#94A3B8"
              multiline
              style={[styles.input, styles.textArea]}
            />
            <TextInput
              value={productExternalPurchaseUrl}
              onChangeText={setProductExternalPurchaseUrl}
              placeholder="External purchase URL"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="url"
              style={styles.input}
            />
            <TextInput
              value={productLineId}
              onChangeText={setProductLineId}
              placeholder="Product line id"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              style={styles.input}
            />
            <View style={styles.linkGrid}>
              <TextInput
                value={linkedRecipeId}
                onChangeText={setLinkedRecipeId}
                placeholder="Linked recipe id"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={[styles.input, styles.linkInput]}
              />
              <TextInput
                value={linkedBatchId}
                onChangeText={setLinkedBatchId}
                placeholder="Linked batch id"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={[styles.input, styles.linkInput]}
              />
              <TextInput
                value={linkedGrowTrialId}
                onChangeText={setLinkedGrowTrialId}
                placeholder="Linked grow/trial id"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={[styles.input, styles.linkInput]}
              />
              <TextInput
                value={linkedCourseId}
                onChangeText={setLinkedCourseId}
                placeholder="Linked course id"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                style={[styles.input, styles.linkInput]}
              />
            </View>
            <TextInput
              value={productImageUrl}
              onChangeText={setProductImageUrl}
              placeholder="Image URL"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="url"
              style={styles.input}
            />
            <View style={styles.imageActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload product image"
                style={styles.secondaryButton}
                onPress={pickProductImage}
                disabled={saving || uploadingProductImage}
              >
                <Text style={styles.secondaryButtonText}>
                  {uploadingProductImage ? "Uploading..." : "Upload image"}
                </Text>
              </Pressable>
              {productImageUrl ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear product image"
                  style={styles.secondaryButton}
                  onPress={() => setProductImageUrl("")}
                  disabled={saving || uploadingProductImage}
                >
                  <Text style={styles.secondaryButtonText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
            {productImageUrl ? (
              <Image
                source={{ uri: productImageUrl }}
                style={styles.productImagePreview}
              />
            ) : null}
            <TextInput
              value={productPriceValue}
              onChangeText={setProductPriceValue}
              placeholder="Price, for example 19.99"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              value={productInventoryCount}
              onChangeText={setProductInventoryCount}
              editable={!productInventoryItemId}
              placeholder={
                productInventoryItemId
                  ? "Synced from linked inventory item"
                  : "Manual inventory count"
              }
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              style={[styles.input, productInventoryItemId ? styles.disabledInput : null]}
            />
            <View style={styles.inventoryPicker}>
              <Text style={styles.label}>Inventory source</Text>
              <Pressable
                style={[
                  styles.inventoryOption,
                  !productInventoryItemId && styles.inventoryOptionActive
                ]}
                onPress={() => setProductInventoryItemId("")}
              >
                <Text style={styles.inventoryOptionText}>Manual stock count</Text>
              </Pressable>
              {inventoryItems.map((item) => {
                const id = idOf(item);
                const active = id && id === productInventoryItemId;
                return (
                  <Pressable
                    key={id || inventoryLabel(item)}
                    style={[
                      styles.inventoryOption,
                      active && styles.inventoryOptionActive
                    ]}
                    onPress={() => {
                      setProductInventoryItemId(id);
                      setProductInventoryCount(String(item?.quantity ?? item?.qty ?? 0));
                    }}
                  >
                    <Text style={styles.inventoryOptionText}>{inventoryLabel(item)}</Text>
                  </Pressable>
                );
              })}
            </View>
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
          </ScrollView>
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
  inlineSwitch: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
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
  disabledInput: {
    backgroundColor: "#F1F5F9",
    color: "#64748B"
  },
  inventoryPicker: { gap: 8 },
  imageActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  productImagePreview: {
    aspectRatio: 16 / 9,
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    width: "100%"
  },
  linkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  linkInput: {
    flexBasis: "48%",
    flexGrow: 1
  },
  inventoryOption: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  inventoryOptionActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#166534"
  },
  inventoryOptionText: { color: "#111827", fontWeight: "700" },
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
  description: { color: "#475569", marginTop: 6 },
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
  modalShell: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    maxHeight: "92%"
  },
  textArea: { minHeight: 82, textAlignVertical: "top" },
  modalTitle: { color: "#111827", fontSize: 20, fontWeight: "800" },
  label: { color: "#334155", fontWeight: "800" },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end"
  }
});
