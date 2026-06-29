import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;

const commercialEndpoints = {
  storefront: "/api/commercial/storefront",
  products: "/api/commercial/products",
  inventory: (endpoints as any)?.commercial?.inventory ?? "/api/commercial/inventory"
};

function asArray(res: any, key: string) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.[key])) return res[key];
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

function dollars(cents: any) {
  const number = Number(cents || 0);
  return (Number.isFinite(number) ? number / 100 : 0).toFixed(2);
}

function productId(product: AnyRec) {
  return String(product.id ?? product._id ?? "");
}

export default function Storefront() {
  const ent = useEntitlements();
  const canEdit = Boolean(ent?.can?.(CAPABILITY_KEYS.STORE_FRONT_VIEW));
  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [storefront, setStorefront] = useState<AnyRec | null>(null);
  const [products, setProducts] = useState<AnyRec[]>([]);
  const [inventory, setInventory] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStorefront, setSavingStorefront] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [storeDraft, setStoreDraft] = useState({
    name: "",
    slug: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    isPublished: false
  });
  const [productDraft, setProductDraft] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    currency: "usd",
    status: "draft",
    inventoryItemId: "",
    imageUrl: ""
  });

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        clearError();
        const [storeRes, productRes, inventoryRes] = await Promise.all([
          apiRequest(commercialEndpoints.storefront),
          apiRequest(commercialEndpoints.products),
          apiRequest(commercialEndpoints.inventory)
        ]);
        const nextStorefront = storeRes?.storefront ?? storeRes ?? null;
        setStorefront(nextStorefront);
        setProducts(asArray(productRes, "products"));
        setInventory(asArray(inventoryRes, "inventory"));
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearError, handleApiError]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!storefront) return;
    setStoreDraft({
      name: String(storefront.name ?? ""),
      slug: String(storefront.slug ?? ""),
      description: String(storefront.description ?? ""),
      logoUrl: String(storefront.logoUrl ?? ""),
      bannerUrl: String(storefront.bannerUrl ?? ""),
      isPublished: Boolean(storefront.isPublished)
    });
  }, [storefront]);

  async function saveStorefront() {
    if (!canEdit) return;
    setSavingStorefront(true);
    setFeedback("");
    try {
      clearError();
      const res = await apiRequest(commercialEndpoints.storefront, {
        method: storefront ? "PATCH" : "POST",
        body: storeDraft
      });
      setStorefront(res?.storefront ?? res ?? null);
      setFeedback("Storefront saved.");
    } catch (e) {
      handleApiError(e);
    } finally {
      setSavingStorefront(false);
    }
  }

  async function createProduct() {
    if (!canEdit || !productDraft.name.trim()) return;
    const priceNumber = Number(productDraft.price);
    setSavingProduct(true);
    setFeedback("");
    try {
      clearError();
      const res = await apiRequest(commercialEndpoints.products, {
        method: "POST",
        body: {
          name: productDraft.name.trim(),
          sku: productDraft.sku.trim() || undefined,
          description: productDraft.description.trim() || undefined,
          price: Number.isFinite(priceNumber) ? priceNumber : 0,
          currency: productDraft.currency.trim() || "usd",
          status: productDraft.status === "published" ? "published" : "draft",
          inventoryItemId: productDraft.inventoryItemId.trim() || undefined,
          imageUrl: productDraft.imageUrl.trim() || undefined
        }
      });
      const created = res?.product ?? res;
      setProducts((current) => [created, ...current].filter(Boolean));
      setProductDraft({
        name: "",
        sku: "",
        description: "",
        price: "",
        currency: "usd",
        status: "draft",
        inventoryItemId: "",
        imageUrl: ""
      });
      setFeedback("Product created.");
    } catch (e) {
      handleApiError(e);
    } finally {
      setSavingProduct(false);
    }
  }

  if (!ent.ready) return null;

  return (
    <AppPage
      routeKey="storefront"
      header={
        <View>
          <Text style={styles.headerTitle}>Storefront</Text>
          <Text style={styles.headerSubtitle}>
            Configure storefront settings, product listings, and inventory links.
          </Text>
        </View>
      }
    >
      {error ? <InlineError error={error} /> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load({ refresh: true })}
          />
        }
        contentContainerStyle={styles.inner}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading storefront...</Text>
          </View>
        ) : null}

        <AppCard>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Storefront Settings</Text>
            <Text style={[styles.statusPill, storeDraft.isPublished && styles.livePill]}>
              {storeDraft.isPublished ? "Published" : "Draft"}
            </Text>
          </View>
          <TextInput
            value={storeDraft.name}
            onChangeText={(name) => setStoreDraft((draft) => ({ ...draft, name }))}
            accessibilityLabel="Storefront name"
            placeholder="Storefront name"
            style={styles.input}
          />
          <TextInput
            value={storeDraft.slug}
            onChangeText={(slug) => setStoreDraft((draft) => ({ ...draft, slug }))}
            accessibilityLabel="Storefront slug"
            placeholder="storefront-slug"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={storeDraft.description}
            onChangeText={(description) =>
              setStoreDraft((draft) => ({ ...draft, description }))
            }
            accessibilityLabel="Storefront description"
            placeholder="Storefront description"
            multiline
            style={[styles.input, styles.notesInput]}
          />
          <TextInput
            value={storeDraft.logoUrl}
            onChangeText={(logoUrl) => setStoreDraft((draft) => ({ ...draft, logoUrl }))}
            accessibilityLabel="Storefront logo URL"
            placeholder="Logo URL"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={storeDraft.bannerUrl}
            onChangeText={(bannerUrl) =>
              setStoreDraft((draft) => ({ ...draft, bannerUrl }))
            }
            accessibilityLabel="Storefront banner URL"
            placeholder="Banner URL"
            autoCapitalize="none"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              storeDraft.isPublished ? "Set storefront draft" : "Publish storefront"
            }
            onPress={() =>
              setStoreDraft((draft) => ({ ...draft, isPublished: !draft.isPublished }))
            }
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>
              {storeDraft.isPublished ? "Set Draft" : "Publish"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save storefront settings"
            onPress={saveStorefront}
            disabled={savingStorefront || !canEdit}
            style={[
              styles.primaryButton,
              (savingStorefront || !canEdit) && styles.disabled
            ]}
          >
            <Text style={styles.primaryText}>
              {savingStorefront ? "Saving..." : "Save Storefront"}
            </Text>
          </Pressable>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>Create Product</Text>
          <TextInput
            value={productDraft.name}
            onChangeText={(name) => setProductDraft((draft) => ({ ...draft, name }))}
            accessibilityLabel="Product name"
            placeholder="Product name"
            style={styles.input}
          />
          <TextInput
            value={productDraft.sku}
            onChangeText={(sku) => setProductDraft((draft) => ({ ...draft, sku }))}
            accessibilityLabel="Product SKU"
            placeholder="SKU"
            style={styles.input}
          />
          <TextInput
            value={productDraft.description}
            onChangeText={(description) =>
              setProductDraft((draft) => ({ ...draft, description }))
            }
            accessibilityLabel="Product description"
            placeholder="Product description"
            multiline
            style={[styles.input, styles.notesInput]}
          />
          <TextInput
            value={productDraft.price}
            onChangeText={(price) => setProductDraft((draft) => ({ ...draft, price }))}
            accessibilityLabel="Product price dollars"
            placeholder="Price, e.g. 25"
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            value={productDraft.currency}
            onChangeText={(currency) =>
              setProductDraft((draft) => ({ ...draft, currency }))
            }
            accessibilityLabel="Product currency"
            placeholder="usd"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={productDraft.inventoryItemId}
            onChangeText={(inventoryItemId) =>
              setProductDraft((draft) => ({ ...draft, inventoryItemId }))
            }
            accessibilityLabel="Product inventory item id"
            placeholder="Inventory item id"
            autoCapitalize="none"
            style={styles.input}
          />
          {inventory.length ? (
            <View style={styles.chipRow}>
              {inventory.slice(0, 6).map((item) => {
                const id = String(item.id ?? item._id ?? "");
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`Link product inventory ${item.name || id}`}
                    onPress={() =>
                      setProductDraft((draft) => ({ ...draft, inventoryItemId: id }))
                    }
                    style={[
                      styles.chip,
                      productDraft.inventoryItemId === id && styles.chipSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        productDraft.inventoryItemId === id && styles.chipTextSelected
                      ]}
                    >
                      {item.name || id}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <TextInput
            value={productDraft.imageUrl}
            onChangeText={(imageUrl) =>
              setProductDraft((draft) => ({ ...draft, imageUrl }))
            }
            accessibilityLabel="Product image URL"
            placeholder="Image URL"
            autoCapitalize="none"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              productDraft.status === "published"
                ? "Set product draft"
                : "Publish product listing"
            }
            onPress={() =>
              setProductDraft((draft) => ({
                ...draft,
                status: draft.status === "published" ? "draft" : "published"
              }))
            }
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>
              {productDraft.status === "published" ? "Draft Product" : "Publish Product"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create storefront product"
            onPress={createProduct}
            disabled={savingProduct || !productDraft.name.trim() || !canEdit}
            style={[
              styles.primaryButton,
              (savingProduct || !productDraft.name.trim() || !canEdit) && styles.disabled
            ]}
          >
            <Text style={styles.primaryText}>
              {savingProduct ? "Saving..." : "Create Product"}
            </Text>
          </Pressable>
        </AppCard>

        <AppCard>
          <Text style={styles.cardTitle}>Products</Text>
          {products.length === 0 ? (
            <Text style={styles.muted}>No products yet.</Text>
          ) : (
            <View style={styles.productList}>
              {products.map((product) => (
                <View key={productId(product)} style={styles.productRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productTitle}>{product.name || "Product"}</Text>
                    <Text style={styles.muted}>
                      ${dollars(product.priceCents)}{" "}
                      {String(product.currency || "usd").toUpperCase()} |{" "}
                      {product.status || "draft"}
                    </Text>
                    {product.inventoryItem ? (
                      <Text style={styles.muted}>
                        Linked inventory: {product.inventoryItem.name}
                      </Text>
                    ) : product.inventoryItemId ? (
                      <Text style={styles.muted}>
                        Linked inventory: {String(product.inventoryItemId)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.rowPill}>
                    {product.status === "published" ? "Live" : "Draft"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </AppCard>
      </ScrollView>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4
  },
  headerSubtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20
  },
  inner: { gap: 14 },
  loading: { alignItems: "center", gap: 10, paddingVertical: 18 },
  muted: { color: "#64748B", fontWeight: "700" },
  feedback: {
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
    color: "#065F46",
    fontWeight: "800",
    padding: 10
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  cardTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  statusPill: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  livePill: { backgroundColor: "#D1FAE5", color: "#065F46" },
  input: {
    backgroundColor: "white",
    borderColor: "rgba(0,0,0,0.14)",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  notesInput: { minHeight: 76, textAlignVertical: "top" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    marginTop: 12,
    paddingVertical: 12
  },
  primaryText: { color: "white", fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    borderColor: "rgba(0,0,0,0.16)",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 10
  },
  secondaryText: { color: "#0F172A", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    borderColor: "rgba(0,0,0,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  chipSelected: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  chipText: { color: "#0F172A", fontWeight: "800" },
  chipTextSelected: { color: "white" },
  productList: { gap: 10, marginTop: 10 },
  productRow: {
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  productTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  rowPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3
  }
});
