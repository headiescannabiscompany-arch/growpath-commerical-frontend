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
  courses: "/api/commercial/courses",
  lives: "/api/commercial/lives",
  feed: "/api/commercial/feed",
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

function hasText(value: any) {
  return String(value ?? "").trim().length > 0;
}

function productImage(product: AnyRec) {
  return (
    product.imageUrl ||
    product.thumbnailUrl ||
    product.photoUrl ||
    product.gallery?.[0] ||
    product.images?.[0] ||
    ""
  );
}

function productPrice(product: AnyRec) {
  const priceCents = Number(product.priceCents);
  if (Number.isFinite(priceCents) && priceCents > 0) return priceCents;
  const price = Number(product.price);
  if (Number.isFinite(price) && price > 0) return price * 100;
  return 0;
}

function productIsPublished(product: AnyRec) {
  return ["published", "live", "active"].includes(
    String(product.status || "").toLowerCase()
  );
}

function productCheckoutReady(product: AnyRec) {
  return hasText(product.externalPurchaseUrl) || hasText(product.stripePriceId);
}

function productMissingSetup(product: AnyRec) {
  const missing: string[] = [];
  if (!productImage(product)) missing.push("image");
  if (!hasText(product.shortDescription) && !hasText(product.description)) {
    missing.push("description");
  }
  if (productPrice(product) <= 0) missing.push("price");
  if (!productCheckoutReady(product)) missing.push("checkout link");
  if (!productIsPublished(product)) missing.push("published status");
  return missing;
}

function liveId(live: AnyRec) {
  return String(live.id ?? live._id ?? live.title ?? "");
}

function courseId(course: AnyRec) {
  return String(course.id ?? course._id ?? course.slug ?? course.title ?? "");
}

function courseIsPublic(course: AnyRec) {
  const status = String(course.status || "published").toLowerCase();
  return ["published", "active", "live"].includes(status);
}

function liveIsPublic(live: AnyRec) {
  return !["cancelled", "archived", "hidden"].includes(
    String(live.status || "").toLowerCase()
  );
}

function campaignId(campaign: AnyRec) {
  return String(campaign.id ?? campaign._id ?? campaign.title ?? campaign.name ?? "");
}

function campaignTitle(campaign: AnyRec) {
  return String(campaign.title ?? campaign.headline ?? campaign.name ?? "Campaign");
}

function campaignBody(campaign: AnyRec) {
  return String(campaign.body ?? campaign.description ?? campaign.shortDescription ?? "");
}

function campaignImage(campaign: AnyRec) {
  return (
    campaign.imageUrl ||
    campaign.creativeImageUrl ||
    campaign.thumbnailUrl ||
    campaign.videoThumbnailUrl ||
    ""
  );
}

function campaignIsActive(campaign: AnyRec) {
  const status = String(campaign.status || "active").toLowerCase();
  return ["active", "published", "scheduled", "live"].includes(status);
}

function storefrontPublishBlockers(args: {
  draft: AnyRec;
  publishedProducts: AnyRec[];
  courses: AnyRec[];
  lives: AnyRec[];
  campaigns: AnyRec[];
}) {
  const blockers: string[] = [];
  if (!hasText(args.draft.name)) blockers.push("add brand name");
  if (!hasText(args.draft.slug)) blockers.push("add public slug");
  if (!hasText(args.draft.logoUrl)) blockers.push("add logo");
  if (!hasText(args.draft.bannerUrl)) blockers.push("add banner");
  if (!hasText(args.draft.description)) blockers.push("add description");
  if (
    !args.publishedProducts.length &&
    !args.courses.length &&
    !args.lives.length &&
    !args.campaigns.length
  ) {
    blockers.push("add a product, course, live, or campaign");
  }
  return blockers;
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
  const [courses, setCourses] = useState<AnyRec[]>([]);
  const [lives, setLives] = useState<AnyRec[]>([]);
  const [campaigns, setCampaigns] = useState<AnyRec[]>([]);
  const [inventory, setInventory] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStorefront, setSavingStorefront] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [creatingSetupTasks, setCreatingSetupTasks] = useState(false);
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
        const [storeRes, productRes, courseRes, liveRes, feedRes, inventoryRes] =
          await Promise.all([
            apiRequest(commercialEndpoints.storefront),
            apiRequest(commercialEndpoints.products),
            apiRequest(commercialEndpoints.courses),
            apiRequest(commercialEndpoints.lives),
            apiRequest(commercialEndpoints.feed),
            apiRequest(commercialEndpoints.inventory)
          ]);
        const nextStorefront = storeRes?.storefront ?? storeRes ?? null;
        setStorefront(nextStorefront);
        setProducts(asArray(productRes, "products"));
        setCourses(asArray(courseRes, "courses").filter(courseIsPublic));
        setLives(asArray(liveRes, "lives").filter(liveIsPublic));
        setCampaigns(asArray(feedRes, "items").filter(campaignIsActive));
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
  const publishedProducts = useMemo(
    () => products.filter((product) => productIsPublished(product)),
    [products]
  );
  const storefrontLives = useMemo(() => lives.slice(0, 4), [lives]);
  const storefrontCourses = useMemo(() => courses.slice(0, 4), [courses]);
  const storefrontCampaigns = useMemo(() => campaigns.slice(0, 4), [campaigns]);
  const productWarnings = useMemo(
    () =>
      products.map((product) => ({
        id: productId(product),
        missing: productMissingSetup(product)
      })),
    [products]
  );
  const warningCount = productWarnings.reduce(
    (sum, item) => sum + item.missing.length,
    0
  );
  const setupChecklist = useMemo(
    () => [
      {
        label: "Brand name",
        complete: hasText(storeDraft.name),
        helper: "Public storefront has a real brand name."
      },
      {
        label: "Public slug",
        complete: hasText(storeDraft.slug),
        helper: "Public URLs are stable for View as User."
      },
      {
        label: "Logo",
        complete: hasText(storeDraft.logoUrl),
        helper: "Brand identity appears on cards and public pages."
      },
      {
        label: "Banner",
        complete: hasText(storeDraft.bannerUrl),
        helper: "Public storefront has a first-viewport brand signal."
      },
      {
        label: "Description",
        complete: hasText(storeDraft.description),
        helper: "Users can understand what the brand sells or teaches."
      },
      {
        label: "Published storefront",
        complete: storeDraft.isPublished,
        helper: "Owner has intentionally made the storefront visible."
      },
      {
        label: "First product",
        complete: products.length > 0,
        helper: "Storefront has at least one product card to show."
      },
      {
        label: "Published product",
        complete: publishedProducts.length > 0,
        helper: "At least one product is ready for public display."
      },
      {
        label: "Product checkout path",
        complete: products.some(productCheckoutReady),
        helper: "At least one product has an external checkout or Stripe price."
      },
      {
        label: "Published course",
        complete: storefrontCourses.length > 0,
        helper: "Storefront can show course cards for learning and product education."
      },
      {
        label: "Upcoming live or replay",
        complete: storefrontLives.length > 0,
        helper: "Storefront can show RSVP, replay, or product-demo live content."
      },
      {
        label: "Active feed campaign",
        complete: storefrontCampaigns.length > 0,
        helper: "Promotional outreach is available without becoming forum discussion."
      }
    ],
    [
      products,
      publishedProducts.length,
      storeDraft,
      storefrontCampaigns.length,
      storefrontCourses.length,
      storefrontLives.length
    ]
  );
  const completedSetupCount = setupChecklist.filter((item) => item.complete).length;
  const incompleteSetup = setupChecklist.filter((item) => !item.complete);
  const publishBlockers = storefrontPublishBlockers({
    draft: storeDraft,
    publishedProducts,
    courses: storefrontCourses,
    lives: storefrontLives,
    campaigns: storefrontCampaigns
  });
  const publishDisabled = !storeDraft.isPublished && publishBlockers.length > 0;

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

  async function createSetupTasks() {
    if (!canEdit || !incompleteSetup.length || creatingSetupTasks) return;
    setCreatingSetupTasks(true);
    setFeedback("");
    try {
      clearError();
      const sourceId = String(storefront?.id ?? storefront?._id ?? storeDraft.slug ?? "");
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(
        incompleteSetup.map((item) =>
          apiRequest("/api/tasks", {
            method: "POST",
            body: {
              workspaceType: "commercial",
              title: `Complete storefront setup: ${item.label}`,
              description: item.helper,
              sourceType: "storefront",
              sourceId,
              linkedStorefrontId: sourceId,
              priority: publishBlockers.some((blocker) =>
                blocker.includes(item.label.toLowerCase())
              )
                ? "high"
                : "normal",
              status: "open",
              dueAt: today,
              reminderPlan: { label: "24 hours before", channels: ["in_app"] }
            }
          })
        )
      );
      setFeedback(`Created ${incompleteSetup.length} storefront setup tasks.`);
    } catch (e) {
      handleApiError(e);
    } finally {
      setCreatingSetupTasks(false);
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
            <View>
              <Text style={styles.cardTitle}>Storefront Setup Checklist</Text>
              <Text style={styles.helperText}>
                {completedSetupCount} of {setupChecklist.length} ready. Fix warnings
                before treating the storefront as launch-ready.
              </Text>
            </View>
            <Text
              style={[
                styles.statusPill,
                completedSetupCount === setupChecklist.length && styles.livePill
              ]}
            >
              {completedSetupCount === setupChecklist.length ? "Ready" : "Needs setup"}
            </Text>
          </View>
          <View style={styles.metricGrid}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{products.length}</Text>
              <Text style={styles.metricLabel}>Products</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{publishedProducts.length}</Text>
              <Text style={styles.metricLabel}>Published</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{warningCount}</Text>
              <Text style={styles.metricLabel}>Product warnings</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{storefrontLives.length}</Text>
              <Text style={styles.metricLabel}>Lives</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{storefrontCourses.length}</Text>
              <Text style={styles.metricLabel}>Courses</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{storefrontCampaigns.length}</Text>
              <Text style={styles.metricLabel}>Campaigns</Text>
            </View>
          </View>
          <View style={styles.checklist}>
            {setupChecklist.map((item) => (
              <View
                key={item.label}
                style={[styles.checkItem, item.complete && styles.checkItemComplete]}
              >
                <Text style={styles.checkIcon}>
                  {item.complete ? "Ready" : "Needs work"}
                </Text>
                <View style={styles.checkCopy}>
                  <Text style={styles.checkLabel}>{item.label}</Text>
                  <Text style={styles.checkHelper}>{item.helper}</Text>
                </View>
              </View>
            ))}
          </View>
          {incompleteSetup.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create storefront setup tasks"
              onPress={createSetupTasks}
              disabled={creatingSetupTasks || !canEdit}
              style={[
                styles.secondaryButton,
                (creatingSetupTasks || !canEdit) && styles.disabled
              ]}
            >
              <Text style={styles.secondaryText}>
                {creatingSetupTasks ? "Creating..." : "Create Setup Tasks"}
              </Text>
            </Pressable>
          ) : null}
        </AppCard>

        <AppCard>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Featured Courses</Text>
            <Text style={styles.statusPill}>Storefront section</Text>
          </View>
          <Text style={styles.helperText}>
            Course cards help users learn from the brand, enroll in paid or free content,
            and move into related products, lives, and Forum/Q&A when they need support.
          </Text>
          {storefrontCourses.length ? (
            <View style={styles.eventList}>
              {storefrontCourses.map((course) => (
                <View key={courseId(course)} style={styles.eventRow}>
                  <Text style={styles.eventTitle}>
                    {course.title || "Commercial course"}
                  </Text>
                  <Text style={styles.muted}>
                    {[
                      course.skillLevel || course.level,
                      course.access || course.pricingType,
                      course.price
                        ? `$${course.price}`
                        : course.priceCents
                          ? `$${dollars(course.priceCents)}`
                          : "Free or draft pricing"
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                  {course.shortDescription || course.description ? (
                    <Text style={styles.eventBody}>
                      {course.shortDescription || course.description}
                    </Text>
                  ) : null}
                  <Text style={styles.muted}>
                    {[
                      Array.isArray(course.growInterests) &&
                        course.growInterests.length &&
                        `Interests ${course.growInterests.join(", ")}`,
                      Array.isArray(course.linkedProductIds) &&
                        course.linkedProductIds.length &&
                        `Products ${course.linkedProductIds.join(", ")}`,
                      Array.isArray(course.linkedLiveIds) &&
                        course.linkedLiveIds.length &&
                        `Lives ${course.linkedLiveIds.join(", ")}`,
                      course.forumThreadId && `Forum/Q&A ${course.forumThreadId}`
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>
              No published courses yet. Use the commercial Courses workspace to add
              product education, workshops, SOP training, and replay-based lessons.
            </Text>
          )}
        </AppCard>

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
            disabled={publishDisabled}
            style={[styles.secondaryButton, publishDisabled && styles.disabled]}
          >
            <Text style={styles.secondaryText}>
              {storeDraft.isPublished ? "Set Draft" : "Publish"}
            </Text>
          </Pressable>
          {publishDisabled ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Publish blocked</Text>
              <Text style={styles.warningText}>{publishBlockers.join(" | ")}</Text>
            </View>
          ) : null}
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
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upcoming Lives</Text>
            <Text style={styles.statusPill}>Storefront section</Text>
          </View>
          <Text style={styles.helperText}>
            Storefront lives are event cards for RSVP, reminders, replay access, and
            related product/course links. Forum/Q&A stays linked as discussion.
          </Text>
          {storefrontLives.length ? (
            <View style={styles.eventList}>
              {storefrontLives.map((live) => (
                <View key={liveId(live)} style={styles.eventRow}>
                  <Text style={styles.eventTitle}>{live.title || "Commercial live"}</Text>
                  <Text style={styles.muted}>
                    {[
                      live.status || "scheduled",
                      live.scheduledStart,
                      live.twitchChannelName && `Twitch ${live.twitchChannelName}`
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                  {live.description ? (
                    <Text style={styles.eventBody}>{live.description}</Text>
                  ) : null}
                  <Text style={styles.muted}>
                    {[
                      live.relatedProductId && `Product ${live.relatedProductId}`,
                      live.relatedCourseId && `Course ${live.relatedCourseId}`,
                      live.relatedFeedPostId && `Campaign ${live.relatedFeedPostId}`,
                      live.forumThreadId && `Forum/Q&A ${live.forumThreadId}`,
                      live.replayUrl && "Replay available"
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>
              No scheduled lives yet. Use the commercial Lives workspace to add product
              demos, course sessions, launch events, and replay links.
            </Text>
          )}
        </AppCard>

        <AppCard>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Active Feed Campaigns</Text>
            <Text style={styles.statusPill}>Advertising / outreach</Text>
          </View>
          <Text style={styles.helperText}>
            Feed is promotional outreach from commercial or facility accounts. Campaign
            cards link to products, courses, lives, storefronts, and optional Forum/Q&A
            threads, but discussion does not happen inside the ad.
          </Text>
          {storefrontCampaigns.length ? (
            <View style={styles.eventList}>
              {storefrontCampaigns.map((campaign) => {
                const image = campaignImage(campaign);
                return (
                  <View key={campaignId(campaign)} style={styles.campaignRow}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.campaignThumb} />
                    ) : null}
                    <View style={styles.campaignCopy}>
                      <Text style={styles.eventTitle}>{campaignTitle(campaign)}</Text>
                      {campaignBody(campaign) ? (
                        <Text style={styles.eventBody}>{campaignBody(campaign)}</Text>
                      ) : null}
                      <Text style={styles.muted}>
                        {[
                          campaign.type || campaign.campaignType || "campaign",
                          campaign.linkedProductId &&
                            `Product ${campaign.linkedProductId}`,
                          campaign.linkedCourseId && `Course ${campaign.linkedCourseId}`,
                          campaign.linkedLiveId && `Live ${campaign.linkedLiveId}`,
                          campaign.linkedStorefrontId &&
                            `Storefront ${campaign.linkedStorefrontId}`,
                          campaign.linkedForumThreadId &&
                            `Forum/Q&A ${campaign.linkedForumThreadId}`
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.muted}>
              No active campaigns yet. Use Feed / Campaigns for storefront, product,
              course, and live outreach.
            </Text>
          )}
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
              accessibilityLabel="Linked evidence run id"
              placeholder="Linked evidence run id"
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
            <Text style={styles.muted}>
              No products yet. Create the first product with an image, description, price,
              and checkout path so it can become a storefront card.
            </Text>
          ) : (
            <View style={styles.productList}>
              {products.map((product) => {
                const image = productImage(product);
                const missing = productMissingSetup(product);
                const priceCents = productPrice(product);
                return (
                  <View key={productId(product)} style={styles.productRow}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.productThumb} />
                    ) : (
                      <View style={styles.productThumbPlaceholder}>
                        <Text style={styles.productThumbText}>No image</Text>
                      </View>
                    )}
                    <View style={styles.productCopy}>
                      <View style={styles.productHeaderRow}>
                        <Text style={styles.productTitle}>
                          {product.name || "Product"}
                        </Text>
                        <Text
                          style={[
                            styles.rowPill,
                            productIsPublished(product) && styles.livePill
                          ]}
                        >
                          {productIsPublished(product) ? "Live" : "Draft"}
                        </Text>
                      </View>
                      <Text style={styles.muted}>
                        ${dollars(priceCents)}{" "}
                        {String(product.currency || "usd").toUpperCase()} |{" "}
                        {product.category || "No category"}
                      </Text>
                      {product.shortDescription || product.description ? (
                        <Text style={styles.muted} numberOfLines={2}>
                          {product.shortDescription || product.description}
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
                      {productCheckoutReady(product) ? (
                        <Text style={styles.goodText}>Checkout path added</Text>
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
                            product.linkedGrowTrialId && "evidence run",
                            product.linkedCourseId && "course"
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </Text>
                      ) : null}
                      {missing.length ? (
                        <View style={styles.warningRow}>
                          {missing.map((item) => (
                            <Text key={item} style={styles.warningPill}>
                              Missing {item}
                            </Text>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.readyText}>Storefront card ready</Text>
                      )}
                    </View>
                  </View>
                );
              })}
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
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  metric: {
    backgroundColor: "#F8FAFC",
    borderColor: "rgba(15,23,42,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 130,
    padding: 12
  },
  metricValue: { color: "#0F172A", fontSize: 20, fontWeight: "900" },
  metricLabel: { color: "#64748B", fontSize: 12, fontWeight: "900", marginTop: 2 },
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
  checklist: { gap: 8, marginTop: 12 },
  checkItem: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10
  },
  checkItemComplete: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  checkIcon: {
    color: "#0F172A",
    fontSize: 11,
    fontWeight: "900",
    minWidth: 36
  },
  checkCopy: { flex: 1, gap: 2 },
  checkLabel: { color: "#0F172A", fontSize: 13, fontWeight: "900" },
  checkHelper: { color: "#64748B", fontSize: 12, fontWeight: "700", lineHeight: 17 },
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
  warningBox: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderRadius: 10,
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
  eventList: { gap: 10, marginTop: 12 },
  eventRow: {
    backgroundColor: "#F8FAFC",
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12
  },
  eventTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  eventBody: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 5
  },
  campaignRow: {
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  campaignThumb: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    height: 72,
    width: 72
  },
  campaignCopy: { flex: 1, gap: 4 },
  productList: { gap: 10, marginTop: 10 },
  productRow: {
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  productThumb: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    height: 84,
    width: 84
  },
  productThumbPlaceholder: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: 8,
    borderWidth: 1,
    height: 84,
    justifyContent: "center",
    width: 84
  },
  productThumbText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center"
  },
  productCopy: { flex: 1, gap: 5 },
  productHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
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
  },
  goodText: { color: "#047857", fontSize: 12, fontWeight: "900" },
  readyText: { color: "#047857", fontSize: 12, fontWeight: "900" },
  warningRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 3 },
  warningPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    color: "#92400E",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  }
});
