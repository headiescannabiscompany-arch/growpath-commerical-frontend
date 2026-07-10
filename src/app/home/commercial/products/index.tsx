import { Link } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { createProduct, fetchProducts, Product } from "@/api/products";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { persistImageUri, resolveImageUri } from "@/utils/photoUploads";

type ProductForm = {
  name: string;
  category: string;
  shortDescription: string;
  imageUrl: string;
  price: string;
  currency: string;
  sku: string;
  unitSize: string;
  growInterests: string;
  npk: string;
  guaranteedAnalysis: string;
  ingredients: string;
  directions: string;
  applicationRate: string;
  externalPurchaseUrl: string;
  stripeProductId: string;
  stripePriceId: string;
  status: "draft" | "published";
};

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "soil_mix",
  shortDescription: "",
  imageUrl: "",
  price: "",
  currency: "USD",
  sku: "",
  unitSize: "",
  growInterests: "",
  npk: "",
  guaranteedAnalysis: "",
  ingredients: "",
  directions: "",
  applicationRate: "",
  externalPurchaseUrl: "",
  stripeProductId: "",
  stripePriceId: "",
  status: "draft"
};

function productId(product: Product) {
  return product.id || (product as any)._id || product.sku || product.name;
}

function hasText(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

function productImage(product: Product) {
  return resolveImageUri(
    product.imageUrl ||
      (product as any).thumbnailUrl ||
      (product as any).photoUrl ||
      (product as any).gallery?.[0] ||
      (product as any).images?.[0] ||
      ""
  );
}

function productPrice(product: Product) {
  const priceCents = Number(product.priceCents);
  if (Number.isFinite(priceCents) && priceCents > 0) return priceCents;
  const price = Number(product.price);
  if (Number.isFinite(price) && price > 0) return price * 100;
  return 0;
}

function productCheckoutReady(product: Product) {
  return (
    hasText((product as any).externalPurchaseUrl) ||
    hasText((product as any).stripePriceId)
  );
}

function splitList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function feedCampaignIds(row: any) {
  return row?.linkedFeedCampaignIds || row?.linkedFeedPostIds || [];
}

function hasProductSpecs(form: ProductForm) {
  return [
    form.unitSize,
    form.npk,
    form.guaranteedAnalysis,
    form.ingredients,
    form.directions,
    form.applicationRate
  ].some(hasText);
}

function productMissingSetup(product: Product) {
  const missing: string[] = [];
  if (!productImage(product)) missing.push("image");
  if (!hasText((product as any).shortDescription) && !hasText(product.description)) {
    missing.push("description");
  }
  if (productPrice(product) <= 0) missing.push("price");
  if (!hasText((product as any).unitSize) && !hasText(product.specs?.unitSize)) {
    missing.push("size/weight");
  }
  if (!product.growInterests?.length) missing.push("grow interests");
  if (!productCheckoutReady(product)) missing.push("checkout");
  if (product.status !== "published") missing.push("published");
  return missing;
}

function formPublishBlockers(form: ProductForm) {
  const blockers: string[] = [];
  if (!hasText(form.imageUrl)) blockers.push("add image");
  if (!hasText(form.shortDescription)) blockers.push("add description");
  if (!Number(form.price)) blockers.push("add price");
  if (!hasText(form.unitSize)) blockers.push("add size/weight");
  if (!splitList(form.growInterests).length) blockers.push("add grow interests");
  if (!hasText(form.externalPurchaseUrl) && !hasText(form.stripePriceId)) {
    blockers.push("add checkout link or Stripe price");
  }
  return blockers;
}

function parsePrice(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialProductsRoute({
  routeKey = "commercial-products"
}: {
  routeKey?: string;
} = {}) {
  const auth = useAuth();
  const ent = useEntitlements();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTaskForProductId, setCreatingTaskForProductId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<any>(null);

  const publishedCount = useMemo(
    () => products.filter((product) => product.status === "published").length,
    [products]
  );
  const draftCount = Math.max(0, products.length - publishedCount);
  const externalLinkCount = useMemo(
    () => products.filter((product) => (product as any).externalPurchaseUrl).length,
    [products]
  );
  const missingSetupCount = useMemo(
    () =>
      products.reduce((total, product) => total + productMissingSetup(product).length, 0),
    [products]
  );
  const publishBlockers = formPublishBlockers(form);
  const publishToggleDisabled = form.status === "draft" && publishBlockers.length > 0;

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function submitProduct() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const imageUrl = await persistImageUri(form.imageUrl.trim());
      await createProduct({
        name: form.name.trim(),
        category: form.category.trim() || "other",
        shortDescription: form.shortDescription.trim(),
        description: form.shortDescription.trim(),
        imageUrl: imageUrl || undefined,
        price: parsePrice(form.price),
        currency: form.currency.trim() || "USD",
        sku: form.sku.trim(),
        unitSize: form.unitSize.trim() || undefined,
        growInterests: splitList(form.growInterests),
        externalPurchaseUrl: form.externalPurchaseUrl.trim(),
        stripeProductId: form.stripeProductId.trim() || undefined,
        stripePriceId: form.stripePriceId.trim() || undefined,
        specs: hasProductSpecs(form)
          ? {
              unitSize: form.unitSize.trim() || undefined,
              npk: form.npk.trim() || undefined,
              labelNpk: form.npk.trim() || undefined,
              guaranteedAnalysis: form.guaranteedAnalysis.trim() || undefined,
              ingredients: splitList(form.ingredients),
              directions: form.directions.trim() || undefined,
              applicationRate: form.applicationRate.trim() || undefined
            }
          : undefined,
        status: form.status
      } as Partial<Product>);
      setForm(EMPTY_FORM);
      await loadProducts();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function pickProductImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        new Error("Photo-library permission is required to upload a product image.")
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85
    });
    if (result.canceled) return;
    const uri = result.assets.find((asset) => asset.uri)?.uri;
    if (uri) setForm((prev) => ({ ...prev, imageUrl: uri }));
  }

  async function createProductSetupTask(product: Product, missing: string[]) {
    const id = productId(product);
    if (!id || !missing.length || creatingTaskForProductId) return;
    setCreatingTaskForProductId(String(id));
    setFeedback("");
    setError(null);
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: {
          workspaceType: "commercial",
          title: `Complete product setup: ${product.name || "Product"}`,
          description: `Missing setup: ${missing.join(", ")}.`,
          sourceType: "product",
          sourceId: String(id),
          sourceObjectId: String(id),
          allDay: true,
          calendarType: "product_setup_task",
          sourceStage: "product_setup_review",
          linkedProductId: String(id),
          growInterests: (product as any).growInterests || [],
          linkedProductLineId: (product as any).productLineId,
          linkedRecipeId: (product as any).linkedRecipeId,
          linkedCourseIds: (product as any).linkedCourseIds || [],
          linkedLiveIds: (product as any).linkedLiveIds || [],
          linkedFeedCampaignIds: feedCampaignIds(product),
          linkedFeedPostIds: feedCampaignIds(product),
          linkedForumThreadId: (product as any).forumThreadId,
          priority:
            missing.includes("checkout") || missing.includes("published")
              ? "high"
              : "normal",
          status: "open",
          dueAt: new Date().toISOString().slice(0, 10),
          reminderPlan: { label: "24 hours before", channels: ["in_app"] }
        }
      });
      setFeedback(`Created setup task for ${product.name || "product"}.`);
    } catch (err) {
      setError(err);
    } finally {
      setCreatingTaskForProductId("");
    }
  }

  return (
    <AppPage
      routeKey={routeKey}
      backFallbackHref={
        routeKey === "commercial-product-create" ? "/home/commercial/products" : undefined
      }
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.title}>Products</Text>
            <Text style={styles.subtitle}>
              Commercial products need images, descriptions, links, use instructions,
              related evidence runs, related courses, and storefront visibility.
            </Text>
            <Text style={styles.accountLine}>
              {[auth.user?.email, `${ent.plan || "commercial"} plan`]
                .filter(Boolean)
                .join(" | ")}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionLink href="/home/commercial/product-lines" label="Product Lines" />
            <ActionLink href="/home/commercial/storefront" label="Storefront" />
            <ActionLink href="/home/commercial/batch-planner" label="Batch Planner" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Product catalog</Text>
        <Text style={styles.body}>
          Products are brand and storefront records, not generic inventory rows. They can
          link to inventory, recipes, batches, product trial evidence runs, courses,
          Feed/Campaigns, and external purchase URLs.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{products.length}</Text>
            <Text style={styles.metricLabel}>Products</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{publishedCount}</Text>
            <Text style={styles.metricLabel}>Published</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{draftCount}</Text>
            <Text style={styles.metricLabel}>Draft/private</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{externalLinkCount}</Text>
            <Text style={styles.metricLabel}>External links</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{missingSetupCount}</Text>
            <Text style={styles.metricLabel}>Missing setup</Text>
          </View>
        </View>
        {loading ? <Text style={styles.muted}>Loading products...</Text> : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Create product</Text>
        <Text style={styles.body}>
          Create the product shell here, then connect formulas, batches, evidence runs,
          courses, feed campaigns, and support threads as evidence comes in.
        </Text>
        <View style={styles.formGrid}>
          <TextInput
            value={form.name}
            onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
            accessibilityLabel="Commercial product name"
            placeholder="Product name"
            style={styles.input}
          />
          <TextInput
            value={form.category}
            onChangeText={(category) => setForm((prev) => ({ ...prev, category }))}
            accessibilityLabel="Commercial product category"
            placeholder="Category: soil_mix, nutrient, plant, equipment..."
            style={styles.input}
          />
          <TextInput
            value={form.sku}
            onChangeText={(sku) => setForm((prev) => ({ ...prev, sku }))}
            accessibilityLabel="Commercial product SKU"
            placeholder="SKU"
            style={styles.input}
          />
          <TextInput
            value={form.imageUrl}
            onChangeText={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
            accessibilityLabel="Commercial product image URL"
            placeholder="Thumbnail / image URL"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={form.price}
            onChangeText={(price) => setForm((prev) => ({ ...prev, price }))}
            accessibilityLabel="Commercial product price"
            keyboardType="decimal-pad"
            placeholder="Price"
            style={styles.input}
          />
          <TextInput
            value={form.unitSize}
            onChangeText={(unitSize) => setForm((prev) => ({ ...prev, unitSize }))}
            accessibilityLabel="Commercial product size or weight"
            placeholder="Size / weight / unit: 5 lb, 1 cu ft, 1 gallon..."
            style={styles.input}
          />
          <TextInput
            value={form.growInterests}
            onChangeText={(growInterests) =>
              setForm((prev) => ({ ...prev, growInterests }))
            }
            accessibilityLabel="Commercial product grow interests"
            placeholder="Grow interests: living soil, dry amendments..."
            style={styles.input}
          />
          <TextInput
            value={form.npk}
            onChangeText={(npk) => setForm((prev) => ({ ...prev, npk }))}
            accessibilityLabel="Commercial product label N-P2O5-K2O"
            placeholder="Label N-P2O5-K2O: 3-1-1"
            style={styles.input}
          />
          <TextInput
            value={form.applicationRate}
            onChangeText={(applicationRate) =>
              setForm((prev) => ({ ...prev, applicationRate }))
            }
            accessibilityLabel="Commercial product application rate"
            placeholder="Application rate"
            style={styles.input}
          />
          <TextInput
            value={form.currency}
            onChangeText={(currency) => setForm((prev) => ({ ...prev, currency }))}
            accessibilityLabel="Commercial product currency"
            placeholder="Currency"
            style={styles.input}
          />
          <TextInput
            value={form.externalPurchaseUrl}
            onChangeText={(externalPurchaseUrl) =>
              setForm((prev) => ({ ...prev, externalPurchaseUrl }))
            }
            accessibilityLabel="Commercial product external purchase URL"
            placeholder="External purchase URL"
            style={styles.input}
          />
          <TextInput
            value={form.stripeProductId}
            onChangeText={(stripeProductId) =>
              setForm((prev) => ({ ...prev, stripeProductId }))
            }
            accessibilityLabel="Commercial product Stripe product ID"
            placeholder="Stripe product ID"
            style={styles.input}
          />
          <TextInput
            value={form.stripePriceId}
            onChangeText={(stripePriceId) =>
              setForm((prev) => ({ ...prev, stripePriceId }))
            }
            accessibilityLabel="Commercial product Stripe price ID"
            placeholder="Stripe price ID"
            style={styles.input}
          />
        </View>
        <TextInput
          value={form.guaranteedAnalysis}
          onChangeText={(guaranteedAnalysis) =>
            setForm((prev) => ({ ...prev, guaranteedAnalysis }))
          }
          accessibilityLabel="Commercial product guaranteed analysis"
          multiline
          placeholder="Guaranteed analysis / label fields: N, P2O5, K2O, Ca, Mg, S, micros"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.ingredients}
          onChangeText={(ingredients) => setForm((prev) => ({ ...prev, ingredients }))}
          accessibilityLabel="Commercial product ingredients"
          multiline
          placeholder="Ingredients, one per line or comma separated"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.directions}
          onChangeText={(directions) => setForm((prev) => ({ ...prev, directions }))}
          accessibilityLabel="Commercial product directions"
          multiline
          placeholder="Directions for use, storage, and safety notes"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.shortDescription}
          onChangeText={(shortDescription) =>
            setForm((prev) => ({ ...prev, shortDescription }))
          }
          accessibilityLabel="Commercial product short description"
          multiline
          placeholder="Short public description, use case, and product context"
          style={[styles.input, styles.textArea]}
        />
        <View style={styles.mediaTools}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload commercial product image"
            onPress={pickProductImage}
            disabled={saving}
            style={[styles.mediaButton, saving && styles.disabled]}
          >
            <Text style={styles.mediaButtonText}>Upload product image</Text>
          </Pressable>
          {form.imageUrl ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear commercial product image"
              onPress={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
              disabled={saving}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Clear image</Text>
            </Pressable>
          ) : null}
        </View>
        {form.imageUrl ? (
          <Image
            source={{ uri: resolveImageUri(form.imageUrl) }}
            style={styles.productPreview}
            resizeMode="cover"
            accessibilityLabel="Commercial product image preview"
          />
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create commercial product"
            disabled={saving || !form.name.trim()}
            onPress={submitProduct}
            style={[
              styles.primaryAction,
              saving || !form.name.trim() ? styles.disabled : null
            ]}
          >
            <Text style={styles.primaryActionText}>
              {saving ? "Creating..." : "Create Product"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle commercial product publish status"
            disabled={publishToggleDisabled}
            onPress={() =>
              setForm((prev) => ({
                ...prev,
                status: prev.status === "published" ? "draft" : "published"
              }))
            }
            style={[styles.action, publishToggleDisabled ? styles.disabled : null]}
          >
            <Text style={styles.actionText}>
              Status: {form.status === "published" ? "Published" : "Draft"}
            </Text>
          </Pressable>
        </View>
        {publishToggleDisabled ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Product publish blocked</Text>
            <Text style={styles.warningText}>{publishBlockers.join(" | ")}</Text>
          </View>
        ) : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Current products</Text>
        {products.length ? (
          <View style={styles.list}>
            {products.map((product) => {
              const id = productId(product);
              const missing = productMissingSetup(product);
              return (
                <View key={id} style={styles.productRow}>
                  {productImage(product) ? (
                    <Image
                      source={{ uri: productImage(product) }}
                      style={styles.productThumb}
                      resizeMode="cover"
                      accessibilityLabel={`${product.name || "Product"} thumbnail`}
                    />
                  ) : null}
                  <View style={styles.productMain}>
                    <Text style={styles.productTitle}>
                      {product.name || "Untitled product"}
                    </Text>
                    <Text style={styles.productMeta}>
                      {[
                        (product as any).category,
                        product.sku && `SKU ${product.sku}`,
                        ((product as any).unitSize || product.specs?.unitSize) &&
                          `Size ${(product as any).unitSize || product.specs?.unitSize}`,
                        product.status || "draft",
                        (product as any).externalPurchaseUrl ? "external link" : null
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </Text>
                    {product.description || (product as any).shortDescription ? (
                      <Text style={styles.productDescription}>
                        {(product as any).shortDescription || product.description}
                      </Text>
                    ) : null}
                    {missing.length ? (
                      <View style={styles.warningRow}>
                        {missing.map((item) => (
                          <Text key={item} style={styles.warningPill}>
                            Missing {item}
                          </Text>
                        ))}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Create setup task for ${product.name || "product"}`}
                          onPress={() => createProductSetupTask(product, missing)}
                          disabled={creatingTaskForProductId === String(id)}
                          style={[
                            styles.miniAction,
                            creatingTaskForProductId === String(id) && styles.disabled
                          ]}
                        >
                          <Text style={styles.miniActionText}>
                            {creatingTaskForProductId === String(id)
                              ? "Creating..."
                              : "Create Task"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.readyText}>Storefront-ready product</Text>
                    )}
                  </View>
                  <View style={styles.rowActions}>
                    <ActionLink
                      href={`/home/commercial/products/${encodeURIComponent(String(id))}`}
                      label="Open Detail"
                    />
                    <ActionLink
                      href={`/store/example-brand/products/${id}`}
                      label="Public Detail"
                    />
                    <ActionLink href="/home/commercial/feed" label="Create Campaign" />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.muted}>No products yet.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Public product page workflow</Text>
        <Text style={styles.body}>
          Published products should be inspectable from public storefronts and public
          storefront pages. Users should be able to move from feed to storefront to
          product detail to external purchase or support.
        </Text>
        <Text style={styles.bullet}>
          Public product detail route: /store/your-brand-slug/products/product-id
        </Text>
        <Text style={styles.bullet}>
          Support product photos, description, price, external purchase link, usage
          instructions, warnings, courses, trials, and support links
        </Text>
        <Text style={styles.bullet}>
          Product cards should link to Details instead of dead-ending in a storefront list
        </Text>
        <Text style={styles.bullet}>
          Storefront should expose featured products; legacy brand profile remains
          secondary
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/store" label="Public Store Directory" />
          <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Soil and nutrient product path</Text>
        <Text style={styles.body}>
          For soil, dry amendment, and nutrient products, the product record should
          connect to formula, guaranteed analysis, release timing, batch records, evidence
          runs, and long-term effectiveness notes.
        </Text>
        <Text style={styles.bullet}>Build formula in Soil & Nutrient Batch Planner</Text>
        <Text style={styles.bullet}>Link formula/batch to product and product line</Text>
        <Text style={styles.bullet}>
          Run product trial evidence runs and record pH/EC, vigor, diagnosis events,
          harvest, dry/cure, aroma/flavor
        </Text>
        <Text style={styles.bullet}>
          Publish only supported claims as product proof, courses, or feed campaigns
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/batch-planner" label="Batch Planner" />
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Garden center and retail product path</Text>
        <Text style={styles.body}>
          Retailers and garden centers need plant/product inventory plus public product
          education. This workflow must not assume every product is cannabis-specific.
        </Text>
        <Text style={styles.bullet}>
          Houseplants, vegetable starts, trees/shrubs, soils, fertilizers, tools, and
          seasonal products
        </Text>
        <Text style={styles.bullet}>
          Attach care instructions, course links, photos, and external purchase URLs
        </Text>
        <Text style={styles.bullet}>
          Publish seasonal feed campaigns and Forum/Q&A support answers from product
          records
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/inventory" label="Inventory Support" />
          <ActionLink href="/home/commercial/courses" label="Courses" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Inventory is support, not the product model</Text>
        <Text style={styles.body}>
          Inventory tracks stock. Product records explain and sell the item. Storefront
          should feature Products and Product Lines, not raw inventory rows.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/inventory" label="Open Inventory Support" />
        </View>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between"
  },
  headerText: {
    flex: 1,
    minWidth: 260
  },
  headerActions: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: 440
  },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4
  },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  accountLine: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 8
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900"
  },
  body: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  metric: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 120,
    padding: 9
  },
  metricValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#0F172A",
    flexGrow: 1,
    fontSize: 14,
    minWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  textArea: {
    minHeight: 80,
    marginTop: 8,
    textAlignVertical: "top"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  mediaTools: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  mediaButton: {
    backgroundColor: "#111827",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  mediaButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  clearButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  clearButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900"
  },
  productPreview: {
    aspectRatio: 16 / 9,
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    marginTop: 10,
    width: "100%"
  },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900"
  },
  primaryAction: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.5
  },
  list: {
    gap: 10,
    marginTop: 12
  },
  productRow: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    padding: 10
  },
  productThumb: {
    backgroundColor: "#E2E8F0",
    borderRadius: radius.card,
    height: 82,
    width: 112
  },
  productMain: {
    flex: 1,
    minWidth: 240
  },
  productTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900"
  },
  productMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  },
  productDescription: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  warningRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  warningBox: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 10,
    padding: 10
  },
  warningTitle: {
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  warningText: { color: "#9A3412", fontSize: 12, fontWeight: "800", marginTop: 4 },
  warningPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    color: "#92400E",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  miniAction: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  miniActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900"
  },
  readyText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8
  },
  rowActions: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  bullet: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  muted: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 10
  },
  feedback: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10
  }
});
