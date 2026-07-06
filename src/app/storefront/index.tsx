import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Link } from "expo-router";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { persistImageUri } from "@/utils/photoUploads";
import { currentPublicUrl } from "@/utils/publicLinks";

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

function PublicPreviewLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="link" style={styles.previewButton}>
        <Text style={styles.previewButtonText}>{label}</Text>
      </Pressable>
    </Link>
  );
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
  const [uploadingImageField, setUploadingImageField] = useState("");

  const [storeDraft, setStoreDraft] = useState({
    name: "",
    slug: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    websiteUrl: "",
    supportEmail: "",
    socialLinksText: "",
    isPublished: false
  });
  const [productDraft, setProductDraft] = useState({
    name: "",
    sku: "",
    category: "",
    shortDescription: "",
    description: "",
    price: "",
    currency: "usd",
    status: "draft",
    inventoryItemId: "",
    imageUrl: "",
    externalPurchaseUrl: "",
    usageInstructions: "",
    warnings: "",
    productLineId: "",
    linkedRecipeId: "",
    linkedBatchId: "",
    linkedGrowTrialId: "",
    linkedCourseId: ""
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
      websiteUrl: String(storefront.websiteUrl ?? ""),
      supportEmail: String(storefront.supportEmail ?? ""),
      socialLinksText: Array.isArray(storefront.socialLinks)
        ? storefront.socialLinks
            .map((link: AnyRec) => [link.label, link.url].filter(Boolean).join(": "))
            .join("\n")
        : String(storefront.socialLinksText ?? ""),
      isPublished: Boolean(storefront.isPublished)
    });
  }, [storefront]);

  const publicSlug = storeDraft.slug.trim() || "your-brand";
  const publicProfilePath = `/brands/${publicSlug}`;
  const publicStorePath = `/store/${publicSlug}`;

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

  async function uploadImageField(
    field: "logoUrl" | "bannerUrl" | "imageUrl",
    target: "storefront" | "product",
    label: string
  ) {
    if (!canEdit || uploadingImageField) return;
    setUploadingImageField(`${target}:${field}`);
    setFeedback("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission?.granted === false) {
        Alert.alert(label, "Photo library access is required to upload an image.");
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

      if (target === "storefront") {
        setStoreDraft((draft) => ({ ...draft, [field]: imageUrl }));
      } else {
        setProductDraft((draft) => ({ ...draft, imageUrl }));
      }
      setFeedback(`${label} uploaded.`);
    } catch (e: any) {
      Alert.alert(label, e?.message || "Unable to upload image.");
    } finally {
      setUploadingImageField("");
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
          category: productDraft.category.trim() || undefined,
          shortDescription: productDraft.shortDescription.trim() || undefined,
          description: productDraft.description.trim() || undefined,
          price: Number.isFinite(priceNumber) ? priceNumber : 0,
          currency: productDraft.currency.trim() || "usd",
          status: productDraft.status === "published" ? "published" : "draft",
          inventoryItemId: productDraft.inventoryItemId.trim() || undefined,
          imageUrl: productDraft.imageUrl.trim() || undefined,
          externalPurchaseUrl: productDraft.externalPurchaseUrl.trim() || undefined,
          usageInstructions: productDraft.usageInstructions.trim() || undefined,
          warnings: productDraft.warnings.trim() || undefined,
          productLineId: productDraft.productLineId.trim() || undefined,
          linkedRecipeId: productDraft.linkedRecipeId.trim() || undefined,
          linkedBatchId: productDraft.linkedBatchId.trim() || undefined,
          linkedGrowTrialId: productDraft.linkedGrowTrialId.trim() || undefined,
          linkedCourseId: productDraft.linkedCourseId.trim() || undefined
        }
      });
      const created = res?.product ?? res;
      setProducts((current) => [created, ...current].filter(Boolean));
      setProductDraft({
        name: "",
        sku: "",
        category: "",
        shortDescription: "",
        description: "",
        price: "",
        currency: "usd",
        status: "draft",
        inventoryItemId: "",
        imageUrl: "",
        externalPurchaseUrl: "",
        usageInstructions: "",
        warnings: "",
        productLineId: "",
        linkedRecipeId: "",
        linkedBatchId: "",
        linkedGrowTrialId: "",
        linkedCourseId: ""
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
            Public brand profile, product cards, courses, lives, campaigns, and user
            preview links.
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
            value={storeDraft.websiteUrl}
            onChangeText={(websiteUrl) =>
              setStoreDraft((draft) => ({ ...draft, websiteUrl }))
            }
            accessibilityLabel="Storefront website URL"
            placeholder="Website or shop URL"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={storeDraft.supportEmail}
            onChangeText={(supportEmail) =>
              setStoreDraft((draft) => ({ ...draft, supportEmail }))
            }
            accessibilityLabel="Storefront support email"
            placeholder="Support email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={storeDraft.socialLinksText}
            onChangeText={(socialLinksText) =>
              setStoreDraft((draft) => ({ ...draft, socialLinksText }))
            }
            accessibilityLabel="Storefront social links"
            placeholder="Social links, one per line"
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
          <View style={styles.imageActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload storefront logo"
              onPress={() => uploadImageField("logoUrl", "storefront", "Storefront logo")}
              disabled={Boolean(uploadingImageField) || !canEdit}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>
                {uploadingImageField === "storefront:logoUrl"
                  ? "Uploading..."
                  : "Upload Logo"}
              </Text>
            </Pressable>
            {storeDraft.logoUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear storefront logo"
                onPress={() => setStoreDraft((draft) => ({ ...draft, logoUrl: "" }))}
                disabled={Boolean(uploadingImageField) || !canEdit}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Clear Logo</Text>
              </Pressable>
            ) : null}
          </View>
          {storeDraft.logoUrl ? (
            <Image source={{ uri: storeDraft.logoUrl }} style={styles.logoPreview} />
          ) : null}
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
          <View style={styles.imageActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload storefront banner"
              onPress={() =>
                uploadImageField("bannerUrl", "storefront", "Storefront banner")
              }
              disabled={Boolean(uploadingImageField) || !canEdit}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>
                {uploadingImageField === "storefront:bannerUrl"
                  ? "Uploading..."
                  : "Upload Banner"}
              </Text>
            </Pressable>
            {storeDraft.bannerUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear storefront banner"
                onPress={() => setStoreDraft((draft) => ({ ...draft, bannerUrl: "" }))}
                disabled={Boolean(uploadingImageField) || !canEdit}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Clear Banner</Text>
              </Pressable>
            ) : null}
          </View>
          {storeDraft.bannerUrl ? (
            <Image source={{ uri: storeDraft.bannerUrl }} style={styles.bannerPreview} />
          ) : null}
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
          <Text style={styles.cardTitle}>Public Discovery</Text>
          <Text style={styles.helperText}>
            Free, Pro, commercial, and facility users can reach this brand from feed
            campaigns, forum replies, course pages, product cards, and public search
            surfaces. Storefronts should make it easy to view as a user, open the brand
            profile, open support discussions, and follow product links.
          </Text>
          <View style={styles.publicLinkBox}>
            <Text style={styles.publicLinkLabel}>Brand profile</Text>
            <Text selectable style={styles.publicLinkText}>
              {currentPublicUrl(publicProfilePath)}
            </Text>
          </View>
          <View style={styles.publicLinkBox}>
            <Text style={styles.publicLinkLabel}>Store page</Text>
            <Text selectable style={styles.publicLinkText}>
              {currentPublicUrl(publicStorePath)}
            </Text>
          </View>
          <View style={styles.previewActions}>
            <PublicPreviewLink href={publicStorePath} label="View Store Page" />
            <PublicPreviewLink href={publicProfilePath} label="View Brand Profile" />
          </View>
          <View style={styles.discoveryActions}>
            <Text style={styles.discoveryAction}>View similar brands</Text>
            <Text style={styles.discoveryAction}>Return to campaign placements</Text>
            <Text style={styles.discoveryAction}>Open forum/support discussions</Text>
          </View>
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
            value={productDraft.category}
            onChangeText={(category) =>
              setProductDraft((draft) => ({ ...draft, category }))
            }
            accessibilityLabel="Product category"
            placeholder="Category, e.g. soil mix, dry amendment, houseplant"
            style={styles.input}
          />
          <TextInput
            value={productDraft.shortDescription}
            onChangeText={(shortDescription) =>
              setProductDraft((draft) => ({ ...draft, shortDescription }))
            }
            accessibilityLabel="Product short description"
            placeholder="Short public summary"
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
            value={productDraft.usageInstructions}
            onChangeText={(usageInstructions) =>
              setProductDraft((draft) => ({ ...draft, usageInstructions }))
            }
            accessibilityLabel="Product usage instructions"
            placeholder="Usage instructions, application rate, or care guidance"
            multiline
            style={[styles.input, styles.notesInput]}
          />
          <TextInput
            value={productDraft.warnings}
            onChangeText={(warnings) =>
              setProductDraft((draft) => ({ ...draft, warnings }))
            }
            accessibilityLabel="Product warnings"
            placeholder="Warnings, stage limits, legal notes, or safety notes"
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
            value={productDraft.externalPurchaseUrl}
            onChangeText={(externalPurchaseUrl) =>
              setProductDraft((draft) => ({ ...draft, externalPurchaseUrl }))
            }
            accessibilityLabel="Product external purchase URL"
            placeholder="External purchase URL"
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
          <TextInput
            value={productDraft.productLineId}
            onChangeText={(productLineId) =>
              setProductDraft((draft) => ({ ...draft, productLineId }))
            }
            accessibilityLabel="Product line id"
            placeholder="Product line id"
            autoCapitalize="none"
            style={styles.input}
          />
          <View style={styles.linkGrid}>
            <TextInput
              value={productDraft.linkedRecipeId}
              onChangeText={(linkedRecipeId) =>
                setProductDraft((draft) => ({ ...draft, linkedRecipeId }))
              }
              accessibilityLabel="Linked recipe id"
              placeholder="Linked recipe id"
              autoCapitalize="none"
              style={[styles.input, styles.linkInput]}
            />
            <TextInput
              value={productDraft.linkedBatchId}
              onChangeText={(linkedBatchId) =>
                setProductDraft((draft) => ({ ...draft, linkedBatchId }))
              }
              accessibilityLabel="Linked batch id"
              placeholder="Linked batch id"
              autoCapitalize="none"
              style={[styles.input, styles.linkInput]}
            />
            <TextInput
              value={productDraft.linkedGrowTrialId}
              onChangeText={(linkedGrowTrialId) =>
                setProductDraft((draft) => ({ ...draft, linkedGrowTrialId }))
              }
              accessibilityLabel="Linked grow trial id"
              placeholder="Linked grow/trial id"
              autoCapitalize="none"
              style={[styles.input, styles.linkInput]}
            />
            <TextInput
              value={productDraft.linkedCourseId}
              onChangeText={(linkedCourseId) =>
                setProductDraft((draft) => ({ ...draft, linkedCourseId }))
              }
              accessibilityLabel="Linked course id"
              placeholder="Linked course id"
              autoCapitalize="none"
              style={[styles.input, styles.linkInput]}
            />
          </View>
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
          <View style={styles.imageActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upload product listing image"
              onPress={() => uploadImageField("imageUrl", "product", "Product image")}
              disabled={Boolean(uploadingImageField) || !canEdit}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>
                {uploadingImageField === "product:imageUrl"
                  ? "Uploading..."
                  : "Upload Product Image"}
              </Text>
            </Pressable>
            {productDraft.imageUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear product listing image"
                onPress={() => setProductDraft((draft) => ({ ...draft, imageUrl: "" }))}
                disabled={Boolean(uploadingImageField) || !canEdit}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Clear Product Image</Text>
              </Pressable>
            ) : null}
          </View>
          {productDraft.imageUrl ? (
            <Image source={{ uri: productDraft.imageUrl }} style={styles.bannerPreview} />
          ) : null}
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
                    {product.category || product.shortDescription ? (
                      <Text style={styles.muted}>
                        {[product.category, product.shortDescription]
                          .filter(Boolean)
                          .join(" | ")}
                      </Text>
                    ) : null}
                    {product.inventoryItem ? (
                      <Text style={styles.muted}>
                        Linked inventory: {product.inventoryItem.name}
                      </Text>
                    ) : product.inventoryItemId ? (
                      <Text style={styles.muted}>
                        Linked inventory: {String(product.inventoryItemId)}
                      </Text>
                    ) : null}
                    {product.externalPurchaseUrl ? (
                      <Text style={styles.muted}>External purchase link added</Text>
                    ) : null}
                    {product.linkedRecipeId ||
                    product.linkedBatchId ||
                    product.linkedGrowTrialId ||
                    product.linkedCourseId ? (
                      <Text style={styles.muted}>
                        Linked evidence:{" "}
                        {[
                          product.linkedRecipeId && "recipe",
                          product.linkedBatchId && "batch",
                          product.linkedGrowTrialId && "trial",
                          product.linkedCourseId && "course"
                        ]
                          .filter(Boolean)
                          .join(", ")}
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
  imageActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  helperText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 8
  },
  publicLinkBox: {
    backgroundColor: "#F8FAFC",
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    padding: 10
  },
  publicLinkLabel: { color: "#64748B", fontSize: 12, fontWeight: "900" },
  publicLinkText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  previewActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  previewButton: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  previewButtonText: { color: "white", fontWeight: "900" },
  discoveryActions: { gap: 6, marginTop: 10 },
  discoveryAction: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  linkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linkInput: { flexBasis: "48%", flexGrow: 1 },
  logoPreview: {
    backgroundColor: "#F1F5F9",
    borderColor: "rgba(0,0,0,0.14)",
    borderRadius: 10,
    borderWidth: 1,
    height: 96,
    marginTop: 10,
    width: 96
  },
  bannerPreview: {
    aspectRatio: 16 / 9,
    backgroundColor: "#F1F5F9",
    borderColor: "rgba(0,0,0,0.14)",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    width: "100%"
  },
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
