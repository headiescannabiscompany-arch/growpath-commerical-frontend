import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  type TextInputProps,
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
import { SUPPORT_CONTACTS } from "@/config/supportContacts";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { requestCurrentCoordinates } from "@/utils/locationSearch";

type AnyRec = Record<string, any>;

const regulatedProductClasses = [
  ["hemp_seed", "Hemp seed"],
  ["cannabis_seed", "Cannabis seed"],
  ["hemp_plant", "Hemp plant"],
  ["cannabis_plant", "Cannabis plant"],
  ["hemp_product", "Hemp product"],
  ["regulated_cannabis_product", "Regulated cannabis product"]
] as const;

const commercialEndpoints = {
  storefront: "/api/commercial/storefront",
  products: "/api/commercial/products",
  productLines: "/api/commercial/product-lines",
  courses: "/api/commercial/courses",
  lives: "/api/commercial/lives",
  feed: "/api/commercial/feed",
  inventory: (endpoints as any)?.commercial?.inventory ?? "/api/commercial/inventory"
};

function TextInput(props: TextInputProps) {
  const { palette } = useAppTheme();
  return (
    <NativeTextInput
      {...props}
      placeholderTextColor={palette.textMuted}
      selectionColor={palette.accent}
    />
  );
}

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

function isHttpsUrl(value: string) {
  if (!value.trim()) return true;
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function isEmail(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function coordinateValue(value: string, minimum: number, maximum: number) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum
    ? number
    : undefined;
}

function splitTextList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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

export function productIsAvailableToOwnerStorefront(product: AnyRec) {
  return !["archived", "deleted", "removed", "cancelled", "hidden"].includes(
    String(product.status || "").toLowerCase()
  );
}

function productCheckoutReady(product: AnyRec, dispensary = false) {
  if (dispensary) {
    return hasText(product.externalPurchaseUrl) || product.pickupAvailable === true;
  }
  return hasText(product.externalPurchaseUrl) || hasText(product.stripePriceId);
}

function storefrontStripeReady(storefront: AnyRec | null) {
  if (!storefront) return false;
  return (
    hasText(storefront.stripeAccountId) ||
    hasText(storefront.stripeConnectAccountId) ||
    hasText(storefront.stripeCustomerId) ||
    Boolean(storefront.stripeConnected) ||
    ["connected", "active", "enabled", "ready"].includes(
      String(
        storefront.stripeStatus || storefront.stripeConnectionStatus || ""
      ).toLowerCase()
    )
  );
}

function productMissingSetup(product: AnyRec, dispensary = false) {
  const missing: string[] = [];
  if (!productImage(product)) missing.push("image");
  if (!hasText(product.shortDescription) && !hasText(product.description)) {
    missing.push("description");
  }
  if (!Array.isArray(product.growInterests) || !product.growInterests.length) {
    missing.push("grow interests");
  }
  if (!hasText(product.unitSize) && !hasText(product.specs?.unitSize)) {
    missing.push("size/weight");
  }
  if (!dispensary && productPrice(product) <= 0) missing.push("price");
  if (!productCheckoutReady(product, dispensary)) {
    missing.push(dispensary ? "website or pickup handoff" : "checkout link");
  }
  if (!productIsPublished(product)) missing.push("published status");
  return missing;
}

function liveId(live: AnyRec) {
  return String(live.id ?? live._id ?? live.title ?? "");
}

function liveCampaignId(live: AnyRec) {
  return String(
    live.relatedFeedCampaignId ??
      live.linkedFeedCampaignId ??
      live.relatedFeedPostId ??
      ""
  );
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

function campaignProductLineId(campaign: AnyRec) {
  return String(
    campaign.linkedProductLineId ??
      campaign.productLineId ??
      campaign.linkedProductLineIds?.[0] ??
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
  if (!hasText(args.draft.growInterestsText)) blockers.push("add grow interests");
  if (args.draft.storefrontType === "dispensary") {
    if (!hasText(args.draft.city)) blockers.push("add dispensary city");
    if (!hasText(args.draft.stateCode)) blockers.push("add dispensary state");
    if (!hasText(args.draft.latitude) || !hasText(args.draft.longitude)) {
      blockers.push("add dispensary location for distance search");
    }
    if (!hasText(args.draft.websiteUrl) && args.draft.pickupAvailable !== true) {
      blockers.push("add dispensary website or pickup handoff");
    }
  }
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

function PublicPreviewLink({ href, label }: { href?: string; label: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStorefrontOwnerStyles(palette), [palette]);

  if (!href) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${label} unavailable. Add a public slug first.`}
        accessibilityState={{ disabled: true }}
        disabled
        style={[styles.previewButton, styles.disabled]}
      >
        <Text style={styles.previewButtonText}>{label}</Text>
        <Text style={styles.previewDisabledText}>Add public slug first</Text>
      </Pressable>
    );
  }

  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="link" style={styles.previewButton}>
        <Text style={styles.previewButtonText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function ObjectActionLink({ href, label }: { href: string; label: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStorefrontOwnerStyles(palette), [palette]);

  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="link" style={styles.objectAction}>
        <Text style={styles.objectActionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

type StorefrontOwnerScreenProps = {
  routeKey?: string;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backFallbackHref?: string;
};

export default function Storefront({
  routeKey = "storefront",
  title = "Storefront",
  subtitle = "Public storefront, product cards, courses, lives, campaigns, and user preview links.",
  showBack,
  backFallbackHref
}: StorefrontOwnerScreenProps = {}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStorefrontOwnerStyles(palette), [palette]);
  const ent = useEntitlements();
  const canEdit = Boolean(ent?.can?.(CAPABILITY_KEYS.STORE_FRONT_VIEW));
  const mapApiError = useApiErrorHandler();

  const [storefront, setStorefront] = useState<AnyRec | null>(null);
  const [products, setProducts] = useState<AnyRec[]>([]);
  const [productLines, setProductLines] = useState<AnyRec[]>([]);
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
  const [loadError, setLoadError] = useState<any>(null);
  const [actionError, setActionError] = useState<any>(null);
  const [uploadingImageField, setUploadingImageField] = useState("");
  const [locatingStorefront, setLocatingStorefront] = useState(false);
  const loadInFlightRef = useRef(false);
  const writeInFlightRef = useRef(false);
  const uploadInFlightRef = useRef(false);
  const locationInFlightRef = useRef(false);

  const [storeDraft, setStoreDraft] = useState({
    name: "",
    slug: "",
    storefrontType: "general",
    description: "",
    city: "",
    countryCode: "",
    stateCode: "",
    latitude: "",
    longitude: "",
    logoUrl: "",
    bannerUrl: "",
    websiteUrl: "",
    pickupAvailable: false,
    pickupInstructions: "",
    supportEmail: "",
    socialLinksText: "",
    growInterestsText: "",
    isPublished: false
  });
  const [productDraft, setProductDraft] = useState({
    name: "",
    sku: "",
    category: "",
    growInterestsText: "",
    unitSize: "",
    shortDescription: "",
    description: "",
    price: "",
    currency: "usd",
    status: "draft",
    inventoryItemId: "",
    imageUrl: "",
    externalPurchaseUrl: "",
    regulatedCannabis: false,
    regulatedProductClass: "",
    pickupAvailable: false,
    pickupInstructions: "",
    stripeProductId: "",
    stripePriceId: "",
    npk: "",
    guaranteedAnalysis: "",
    ingredients: "",
    applicationRate: "",
    usageInstructions: "",
    warnings: "",
    productLineId: "",
    linkedRecipeId: "",
    linkedBatchId: "",
    linkedTrialId: "",
    linkedCourseId: ""
  });

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (
        loadInFlightRef.current ||
        writeInFlightRef.current ||
        uploadInFlightRef.current ||
        locationInFlightRef.current
      ) {
        return;
      }
      loadInFlightRef.current = true;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        setLoadError(null);
        const [
          storeRes,
          productRes,
          productLineRes,
          courseRes,
          liveRes,
          feedRes,
          inventoryRes
        ] = await Promise.all([
          apiRequest(commercialEndpoints.storefront),
          apiRequest(commercialEndpoints.products),
          apiRequest(commercialEndpoints.productLines),
          apiRequest(commercialEndpoints.courses),
          apiRequest(commercialEndpoints.lives),
          apiRequest(commercialEndpoints.feed),
          apiRequest(commercialEndpoints.inventory)
        ]);
        const nextStorefront = storeRes?.storefront ?? storeRes ?? null;
        setStorefront(nextStorefront);
        setProducts(
          asArray(productRes, "products").filter(productIsAvailableToOwnerStorefront)
        );
        setProductLines(asArray(productLineRes, "productLines"));
        setCourses(asArray(courseRes, "courses").filter(courseIsPublic));
        setLives(asArray(liveRes, "lives").filter(liveIsPublic));
        setCampaigns(asArray(feedRes, "items").filter(campaignIsActive));
        setInventory(asArray(inventoryRes, "inventory"));
      } catch (e) {
        setLoadError(mapApiError(e) ?? e);
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mapApiError]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!storefront) return;
    setStoreDraft({
      name: String(storefront.name ?? ""),
      slug: String(storefront.slug ?? ""),
      storefrontType:
        String(storefront.storefrontType ?? storefront.businessType ?? "general") ===
        "dispensary"
          ? "dispensary"
          : "general",
      description: String(storefront.description ?? ""),
      city: String(storefront.city ?? ""),
      countryCode: String(storefront.countryCode ?? ""),
      stateCode: String(storefront.stateCode ?? storefront.state ?? ""),
      latitude:
        storefront.latitude === null || storefront.latitude === undefined
          ? ""
          : String(storefront.latitude),
      longitude:
        storefront.longitude === null || storefront.longitude === undefined
          ? ""
          : String(storefront.longitude),
      logoUrl: String(storefront.logoUrl ?? ""),
      bannerUrl: String(storefront.bannerUrl ?? ""),
      websiteUrl: String(storefront.websiteUrl ?? ""),
      pickupAvailable: Boolean(storefront.pickupAvailable),
      pickupInstructions: String(storefront.pickupInstructions ?? ""),
      supportEmail: String(storefront.supportEmail ?? ""),
      socialLinksText: Array.isArray(storefront.socialLinks)
        ? storefront.socialLinks
            .map((link: AnyRec) => [link.label, link.url].filter(Boolean).join(": "))
            .join("\n")
        : String(storefront.socialLinksText ?? ""),
      growInterestsText: Array.isArray(storefront.growInterests)
        ? storefront.growInterests.join(", ")
        : String(storefront.growInterestsText ?? ""),
      isPublished: Boolean(storefront.isPublished)
    });
  }, [storefront]);

  const publicSlug = storeDraft.slug.trim();
  const isDispensary = storeDraft.storefrontType === "dispensary";
  const publicStorePath = publicSlug ? `/store/${encodeURIComponent(publicSlug)}` : "";
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
        missing: productMissingSetup(product, isDispensary)
      })),
    [isDispensary, products]
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
        label: "Grow interests",
        complete: hasText(storeDraft.growInterestsText),
        helper:
          "Storefront discovery, campaign targeting, course recommendations, and analytics have real grow-interest data."
      },
      ...(isDispensary
        ? [
            {
              label: "Dispensary location",
              complete:
                hasText(storeDraft.city) &&
                hasText(storeDraft.stateCode) &&
                hasText(storeDraft.latitude) &&
                hasText(storeDraft.longitude),
              helper:
                "City, state, and map coordinates allow state and distance discovery."
            },
            {
              label: "Dispensary handoff",
              complete:
                hasText(storeDraft.websiteUrl) || storeDraft.pickupAvailable === true,
              helper:
                "Customers have a dispensary website or truthful in-store pickup path without GrowPath checkout."
            }
          ]
        : []),
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
        label: isDispensary ? "Product handoff path" : "Product checkout path",
        complete: products.some((product) => productCheckoutReady(product, isDispensary)),
        helper: isDispensary
          ? "At least one inventory listing links to the dispensary website or offers in-store pickup."
          : "At least one product has an external checkout or Stripe price."
      },
      ...(!isDispensary
        ? [
            {
              label: "Stripe connection",
              complete: storefrontStripeReady(storefront),
              helper:
                "Connect Stripe from Profile & Billing before relying on in-app checkout, paid courses, or storefront payouts."
            }
          ]
        : []),
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
      isDispensary,
      storefront,
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
  const writeBusy = savingStorefront || savingProduct || creatingSetupTasks;
  const interactionBusy =
    loading ||
    writeBusy ||
    Boolean(uploadingImageField) ||
    locatingStorefront ||
    refreshing;
  const actionProgressLabel = savingStorefront
    ? "Saving storefront settings"
    : savingProduct
      ? "Creating storefront product"
      : creatingSetupTasks
        ? "Creating storefront setup tasks"
        : uploadingImageField
          ? "Uploading storefront media"
          : locatingStorefront
            ? "Locating storefront"
            : "";

  async function saveStorefront() {
    if (
      !canEdit ||
      loadInFlightRef.current ||
      writeInFlightRef.current ||
      uploadInFlightRef.current ||
      locationInFlightRef.current
    ) {
      return;
    }
    const latitude = coordinateValue(storeDraft.latitude, -90, 90);
    const longitude = coordinateValue(storeDraft.longitude, -180, 180);
    if (latitude === undefined) {
      setActionError(new Error("Latitude must be a number from -90 to 90."));
      setFeedback("");
      return;
    }
    if (longitude === undefined) {
      setActionError(new Error("Longitude must be a number from -180 to 180."));
      setFeedback("");
      return;
    }
    if (
      storeDraft.countryCode.trim() &&
      !/^[A-Za-z]{2}$/.test(storeDraft.countryCode.trim())
    ) {
      setActionError(new Error("Business country must be a two-letter code."));
      setFeedback("");
      return;
    }
    if (storeDraft.storefrontType === "dispensary") {
      if (!/^[A-Za-z]{2}$/.test(storeDraft.countryCode.trim())) {
        setActionError(new Error("Dispensary country must be a two-letter code."));
        setFeedback("");
        return;
      }
      if (!/^[A-Za-z]{2}$/.test(storeDraft.stateCode.trim())) {
        setActionError(new Error("Dispensary state must be a two-letter code."));
        setFeedback("");
        return;
      }
      if (latitude === null || longitude === null) {
        setActionError(
          new Error("Dispensary latitude and longitude are required for distance search.")
        );
        setFeedback("");
        return;
      }
    }
    if (!isHttpsUrl(storeDraft.websiteUrl)) {
      setActionError(new Error("Storefront website must use a valid https URL."));
      setFeedback("");
      return;
    }
    if (!isEmail(storeDraft.supportEmail)) {
      setActionError(new Error("Storefront support email must be valid."));
      setFeedback("");
      return;
    }
    writeInFlightRef.current = true;
    setSavingStorefront(true);
    setFeedback("");
    setActionError(null);
    try {
      const { growInterestsText, ...storefrontPayload } = storeDraft;
      const res = await apiRequest(commercialEndpoints.storefront, {
        method: storefront ? "PATCH" : "POST",
        body: {
          ...storefrontPayload,
          countryCode: storefrontPayload.countryCode.trim().toUpperCase(),
          stateCode: storefrontPayload.stateCode.trim().toUpperCase(),
          latitude,
          longitude,
          growInterests: splitTextList(growInterestsText)
        }
      });
      setStorefront(res?.storefront ?? res ?? null);
      setFeedback("Storefront saved.");
    } catch (e) {
      setActionError(mapApiError(e) ?? e);
    } finally {
      writeInFlightRef.current = false;
      setSavingStorefront(false);
    }
  }

  async function locateStorefront() {
    if (
      !canEdit ||
      loadInFlightRef.current ||
      writeInFlightRef.current ||
      uploadInFlightRef.current ||
      locationInFlightRef.current
    ) {
      return;
    }
    locationInFlightRef.current = true;
    setLocatingStorefront(true);
    setFeedback("");
    setActionError(null);
    try {
      const coordinates = await requestCurrentCoordinates();
      setStoreDraft((draft) => ({
        ...draft,
        latitude: String(coordinates.latitude),
        longitude: String(coordinates.longitude)
      }));
      setFeedback("Location added. Confirm the city and state before publishing.");
    } catch (error: any) {
      setActionError(
        new Error(
          error?.message ||
            "Current location is unavailable. Enter the dispensary coordinates manually."
        )
      );
    } finally {
      locationInFlightRef.current = false;
      setLocatingStorefront(false);
    }
  }

  async function createSetupTasks() {
    if (
      !canEdit ||
      !incompleteSetup.length ||
      loadInFlightRef.current ||
      writeInFlightRef.current ||
      uploadInFlightRef.current ||
      locationInFlightRef.current
    ) {
      return;
    }
    writeInFlightRef.current = true;
    setCreatingSetupTasks(true);
    setFeedback("");
    setActionError(null);
    try {
      const sourceId = String(storefront?.id ?? storefront?._id ?? storeDraft.slug ?? "");
      const today = new Date().toISOString().slice(0, 10);
      const linkedProductIds = products.map(productId).filter(Boolean);
      const linkedPublishedProductIds = publishedProducts.map(productId).filter(Boolean);
      const linkedCourseIds = storefrontCourses.map(courseId).filter(Boolean);
      const linkedLiveIds = storefrontLives.map(liveId).filter(Boolean);
      const linkedFeedCampaignIds = storefrontCampaigns.map(campaignId).filter(Boolean);
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
              linkedStorefrontSlug: publicSlug,
              storefrontName: storeDraft.name.trim() || undefined,
              setupItemLabel: item.label,
              setupItemHelper: item.helper,
              growInterests: splitTextList(storeDraft.growInterestsText),
              linkedProductIds,
              linkedPublishedProductIds,
              linkedCourseIds,
              linkedLiveIds,
              linkedFeedCampaignIds,
              linkedFeedPostIds: linkedFeedCampaignIds,
              allDay: true,
              calendarType: "storefront_setup_task",
              sourceStage: `storefront_${
                item.label
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_|_$/g, "") || "setup"
              }_review`,
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
      setActionError(mapApiError(e) ?? e);
    } finally {
      writeInFlightRef.current = false;
      setCreatingSetupTasks(false);
    }
  }

  async function uploadImageField(
    field: "logoUrl" | "bannerUrl" | "imageUrl",
    target: "storefront" | "product",
    label: string
  ) {
    if (
      !canEdit ||
      loadInFlightRef.current ||
      writeInFlightRef.current ||
      uploadInFlightRef.current ||
      locationInFlightRef.current
    ) {
      return;
    }
    uploadInFlightRef.current = true;
    setUploadingImageField(`${target}:${field}`);
    setFeedback("");
    setActionError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission?.granted === false) {
        setActionError(
          new Error(`${label}: Photo library access is required to upload an image.`)
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

      if (target === "storefront") {
        setStoreDraft((draft) => ({ ...draft, [field]: imageUrl }));
      } else {
        setProductDraft((draft) => ({ ...draft, imageUrl }));
      }
      setFeedback(`${label} uploaded.`);
    } catch (e: any) {
      setActionError(new Error(`${label}: ${e?.message || "Unable to upload image."}`));
    } finally {
      uploadInFlightRef.current = false;
      setUploadingImageField("");
    }
  }

  async function createProduct() {
    if (
      !canEdit ||
      !productDraft.name.trim() ||
      loadInFlightRef.current ||
      writeInFlightRef.current ||
      uploadInFlightRef.current ||
      locationInFlightRef.current
    ) {
      return;
    }
    const priceNumber = productDraft.price.trim()
      ? Number(productDraft.price)
      : undefined;
    if (priceNumber !== undefined && (!Number.isFinite(priceNumber) || priceNumber < 0)) {
      setActionError(
        new Error("Product price must be a number that is zero or greater.")
      );
      setFeedback("");
      return;
    }
    if (!isHttpsUrl(productDraft.externalPurchaseUrl)) {
      setActionError(new Error("Product purchase link must use a valid https URL."));
      setFeedback("");
      return;
    }
    if (productDraft.regulatedCannabis && !productDraft.regulatedProductClass) {
      setActionError(
        new Error("Choose the regulated product class before saving this listing.")
      );
      setFeedback("");
      return;
    }
    const price = priceNumber;
    const proposedProduct = {
      ...productDraft,
      growInterests: splitTextList(productDraft.growInterestsText),
      price,
      imageUrl: productDraft.imageUrl.trim(),
      externalPurchaseUrl: productDraft.externalPurchaseUrl.trim(),
      pickupAvailable: isDispensary && productDraft.pickupAvailable
    };
    if (productDraft.status === "published") {
      const missing = productMissingSetup(proposedProduct, isDispensary);
      if (missing.length) {
        setActionError(
          new Error(`Published product still needs: ${missing.join(", ")}.`)
        );
        setFeedback("");
        return;
      }
    }
    writeInFlightRef.current = true;
    setSavingProduct(true);
    setFeedback("");
    setActionError(null);
    try {
      const res = await apiRequest(commercialEndpoints.products, {
        method: "POST",
        body: {
          name: productDraft.name.trim(),
          sku: productDraft.sku.trim() || undefined,
          category: productDraft.category.trim() || undefined,
          growInterests: splitTextList(productDraft.growInterestsText),
          unitSize: productDraft.unitSize.trim() || undefined,
          shortDescription: productDraft.shortDescription.trim() || undefined,
          description: productDraft.description.trim() || undefined,
          price,
          currency:
            price === undefined ? undefined : productDraft.currency.trim() || "usd",
          status: productDraft.status === "published" ? "published" : "draft",
          inventoryItemId: productDraft.inventoryItemId.trim() || undefined,
          imageUrl: productDraft.imageUrl.trim() || undefined,
          externalPurchaseUrl: productDraft.externalPurchaseUrl.trim() || undefined,
          regulatedCannabis: productDraft.regulatedCannabis,
          regulatedProductClass: productDraft.regulatedProductClass.trim() || undefined,
          pickupAvailable: isDispensary && productDraft.pickupAvailable,
          pickupInstructions:
            isDispensary && productDraft.pickupInstructions.trim()
              ? productDraft.pickupInstructions.trim()
              : undefined,
          stripeProductId: isDispensary
            ? undefined
            : productDraft.stripeProductId.trim() || undefined,
          stripePriceId: isDispensary
            ? undefined
            : productDraft.stripePriceId.trim() || undefined,
          npk: productDraft.npk.trim() || undefined,
          labelNpk: productDraft.npk.trim() || undefined,
          guaranteedAnalysis: productDraft.guaranteedAnalysis.trim() || undefined,
          ingredients: splitTextList(productDraft.ingredients),
          applicationRate: productDraft.applicationRate.trim() || undefined,
          usageInstructions: productDraft.usageInstructions.trim() || undefined,
          directions: productDraft.usageInstructions.trim() || undefined,
          warnings: productDraft.warnings.trim() || undefined,
          specs: {
            unitSize: productDraft.unitSize.trim() || undefined,
            npk: productDraft.npk.trim() || undefined,
            labelNpk: productDraft.npk.trim() || undefined,
            guaranteedAnalysis: productDraft.guaranteedAnalysis.trim() || undefined,
            ingredients: splitTextList(productDraft.ingredients),
            directions: productDraft.usageInstructions.trim() || undefined,
            applicationRate: productDraft.applicationRate.trim() || undefined,
            warnings: productDraft.warnings.trim() || undefined
          },
          productLineId: productDraft.productLineId.trim() || undefined,
          linkedRecipeId: productDraft.linkedRecipeId.trim() || undefined,
          linkedBatchId: productDraft.linkedBatchId.trim() || undefined,
          linkedTrialId: productDraft.linkedTrialId.trim() || undefined,
          linkedGrowTrialId: productDraft.linkedTrialId.trim() || undefined,
          linkedCourseId: productDraft.linkedCourseId.trim() || undefined
        }
      });
      const created = res?.product ?? res;
      setProducts((current) => [created, ...current].filter(Boolean));
      setProductDraft({
        name: "",
        sku: "",
        category: "",
        growInterestsText: "",
        unitSize: "",
        shortDescription: "",
        description: "",
        price: "",
        currency: "usd",
        status: "draft",
        inventoryItemId: "",
        imageUrl: "",
        externalPurchaseUrl: "",
        regulatedCannabis: false,
        regulatedProductClass: "",
        pickupAvailable: false,
        pickupInstructions: "",
        stripeProductId: "",
        stripePriceId: "",
        npk: "",
        guaranteedAnalysis: "",
        ingredients: "",
        applicationRate: "",
        usageInstructions: "",
        warnings: "",
        productLineId: "",
        linkedRecipeId: "",
        linkedBatchId: "",
        linkedTrialId: "",
        linkedCourseId: ""
      });
      setFeedback("Product created.");
    } catch (e) {
      setActionError(mapApiError(e) ?? e);
    } finally {
      writeInFlightRef.current = false;
      setSavingProduct(false);
    }
  }

  if (!ent.ready) return null;

  return (
    <AppPage
      routeKey={routeKey}
      showBack={showBack}
      backFallbackHref={backFallbackHref}
      header={
        <View>
          <Text accessibilityRole="header" aria-level={1} style={styles.headerTitle}>
            {title}
          </Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
      }
    >
      {loadError ? (
        <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
          <InlineError error={loadError} />
          <Pressable
            accessibilityLabel="Retry commercial storefront workspace"
            accessibilityRole="button"
            disabled={loading || interactionBusy}
            onPress={() => void load()}
            style={[
              styles.secondaryButton,
              (loading || interactionBusy) && styles.disabled
            ]}
          >
            <Text style={styles.secondaryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {actionError ? (
        <View accessible accessibilityLiveRegion="assertive" accessibilityRole="alert">
          <InlineError error={actionError} />
        </View>
      ) : null}
      {feedback ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.feedback}
        >
          {feedback}
        </Text>
      ) : null}
      {actionProgressLabel ? (
        <View
          accessibilityLabel={`${actionProgressLabel} in progress`}
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          style={styles.progressRow}
        >
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.muted}>{actionProgressLabel}...</Text>
        </View>
      ) : null}

      <ScrollView
        refreshControl={
          <RefreshControl
            enabled={!interactionBusy}
            refreshing={refreshing}
            onRefresh={() => void load({ refresh: true })}
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
            tintColor={palette.accent}
          />
        }
        contentContainerStyle={styles.inner}
      >
        {loading ? (
          <View
            accessibilityLabel="Loading commercial storefront workspace"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading storefront...</Text>
          </View>
        ) : null}

        <AppCard>
          <View style={styles.cardHeader}>
            <View>
              <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                Storefront Setup Checklist
              </Text>
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
              <Text style={styles.metricValue}>{productLines.length}</Text>
              <Text style={styles.metricLabel}>Lines</Text>
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
              disabled={interactionBusy || !canEdit}
              style={[
                styles.secondaryButton,
                (interactionBusy || !canEdit) && styles.disabled
              ]}
              accessibilityState={{ disabled: interactionBusy || !canEdit }}
            >
              <Text style={styles.secondaryText}>
                {creatingSetupTasks ? "Creating..." : "Create Setup Tasks"}
              </Text>
            </Pressable>
          ) : null}
        </AppCard>

        <AppCard>
          <View style={styles.cardHeader}>
            <View>
              <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
                Storefront Launch Actions
              </Text>
              <Text style={styles.helperText}>
                Build, publish, promote, fulfill, and measure the storefront from one
                place.
              </Text>
            </View>
            <Text style={styles.statusPill}>Owner shortcuts</Text>
          </View>
          <View style={styles.objectActions}>
            <ObjectActionLink href="/home/commercial/products/new" label="Add Product" />
            <ObjectActionLink
              href="/courses/create?from=%2Fhome%2Fcommercial%2Fstorefront"
              label="Create Course"
            />
            <ObjectActionLink href="/home/commercial/lives" label="Schedule Live" />
            <ObjectActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
            <ObjectActionLink href="/home/commercial/orders" label="Orders" />
            <ObjectActionLink href="/home/commercial/analytics" label="Analytics" />
            <PublicPreviewLink href={publicStorePath} label="View as User" />
          </View>
        </AppCard>

        <AppCard>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Product Lines
            </Text>
            <Text style={styles.statusPill}>Storefront section</Text>
          </View>
          <Text style={styles.helperText}>
            Product lines organize storefront products into public families. Keep them
            tagged with grow interests so users can browse by category, use case, and
            campaign context.
          </Text>
          {productLines.length ? (
            <View style={styles.eventList}>
              {productLines.slice(0, 4).map((line) => (
                <View
                  key={String(line.id ?? line._id ?? line.name)}
                  style={styles.eventRow}
                >
                  <Text style={styles.eventTitle}>
                    {line.name || "Commercial product line"}
                  </Text>
                  <Text style={styles.muted}>
                    {[line.category, line.status || "draft"].filter(Boolean).join(" | ")}
                  </Text>
                  {line.publicSummary || line.description ? (
                    <Text style={styles.eventBody}>
                      {line.publicSummary || line.description}
                    </Text>
                  ) : null}
                  {Array.isArray(line.growInterests) && line.growInterests.length ? (
                    <Text style={styles.muted}>
                      Interests {line.growInterests.join(", ")}
                    </Text>
                  ) : null}
                  <View style={styles.objectActions}>
                    <ObjectActionLink
                      href={`/home/commercial/product-lines/${encodeURIComponent(
                        String(line.id ?? line._id ?? line.name)
                      )}`}
                      label="Open Line"
                    />
                    <PublicPreviewLink
                      href={
                        publicStorePath
                          ? `${publicStorePath}?line=${encodeURIComponent(
                              String(line.id ?? line._id ?? line.name)
                            )}`
                          : undefined
                      }
                      label="View as User"
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>
              No product lines yet. Use Product Lines inside Products to organize
              storefront families without creating separate stores.
            </Text>
          )}
        </AppCard>

        <AppCard>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Featured Courses
            </Text>
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
                  <View style={styles.objectActions}>
                    <ObjectActionLink
                      href={`/home/commercial/courses/${encodeURIComponent(courseId(course))}`}
                      label="Open Course"
                    />
                    {course.forumThreadId ? (
                      <ObjectActionLink
                        href={`/forum/post?id=${encodeURIComponent(String(course.forumThreadId))}`}
                        label="Open Q&A"
                      />
                    ) : null}
                  </View>
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
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Storefront Settings
            </Text>
            <Text style={[styles.statusPill, storeDraft.isPublished && styles.livePill]}>
              {storeDraft.isPublished ? "Published" : "Draft"}
            </Text>
          </View>
          <View style={styles.objectActions}>
            <ObjectActionLink
              href="/home/commercial/regulated-commerce"
              label="Regulated commerce permissions"
            />
          </View>
          <Text style={styles.muted}>
            Add every business role you perform and submit jurisdiction-specific
            authorization evidence. Profiles and informational inventory remain separate
            from checkout, payment, pickup, delivery, shipping, import, and export
            permissions.
          </Text>
          <TextInput
            value={storeDraft.name}
            editable={!interactionBusy}
            onChangeText={(name) => setStoreDraft((draft) => ({ ...draft, name }))}
            accessibilityLabel="Storefront name"
            placeholder="Storefront name"
            style={styles.input}
          />
          <TextInput
            value={storeDraft.slug}
            editable={!interactionBusy}
            onChangeText={(slug) => setStoreDraft((draft) => ({ ...draft, slug }))}
            accessibilityLabel="Storefront slug"
            placeholder="storefront-slug"
            autoCapitalize="none"
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>Storefront type</Text>
          <View style={styles.objectActions}>
            {[
              { value: "general", label: "General Commercial Storefront" },
              { value: "dispensary", label: "Dispensary" }
            ].map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`Storefront type ${option.label}`}
                accessibilityState={{
                  disabled: interactionBusy,
                  selected: storeDraft.storefrontType === option.value
                }}
                disabled={interactionBusy}
                onPress={() =>
                  setStoreDraft((draft) => ({
                    ...draft,
                    storefrontType: option.value
                  }))
                }
                style={[
                  styles.secondaryButton,
                  storeDraft.storefrontType === option.value && styles.selectedButton
                ]}
              >
                <Text style={styles.secondaryText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          {isDispensary ? (
            <View style={styles.dispensaryPanel}>
              <Text style={styles.warningTitle}>Dispensary discovery and handoff</Text>
              <Text style={styles.muted}>
                Published dispensaries can show linked inventory and be found by state or
                distance. A regulated handoff requires an exact reviewed decision that
                matches product, origin, destination, buyer eligibility, and fulfillment.
              </Text>
              <View style={styles.linkGrid}>
                <TextInput
                  value={storeDraft.countryCode}
                  editable={!interactionBusy}
                  onChangeText={(countryCode) =>
                    setStoreDraft((draft) => ({
                      ...draft,
                      countryCode: countryCode.toUpperCase()
                    }))
                  }
                  accessibilityLabel="Dispensary country"
                  placeholder="Country code, e.g. US"
                  autoCapitalize="characters"
                  maxLength={2}
                  style={[styles.input, styles.linkInput]}
                />
                <TextInput
                  value={storeDraft.city}
                  editable={!interactionBusy}
                  onChangeText={(city) => setStoreDraft((draft) => ({ ...draft, city }))}
                  accessibilityLabel="Dispensary city"
                  placeholder="City"
                  style={[styles.input, styles.linkInput]}
                />
                <TextInput
                  value={storeDraft.stateCode}
                  editable={!interactionBusy}
                  onChangeText={(stateCode) =>
                    setStoreDraft((draft) => ({
                      ...draft,
                      stateCode: stateCode.toUpperCase()
                    }))
                  }
                  accessibilityLabel="Dispensary state"
                  placeholder="State code, e.g. MA"
                  autoCapitalize="characters"
                  maxLength={2}
                  style={[styles.input, styles.linkInput]}
                />
                <TextInput
                  value={storeDraft.latitude}
                  editable={!interactionBusy}
                  onChangeText={(latitude) =>
                    setStoreDraft((draft) => ({ ...draft, latitude }))
                  }
                  accessibilityLabel="Dispensary latitude"
                  placeholder="Latitude"
                  keyboardType="numeric"
                  style={[styles.input, styles.linkInput]}
                />
                <TextInput
                  value={storeDraft.longitude}
                  editable={!interactionBusy}
                  onChangeText={(longitude) =>
                    setStoreDraft((draft) => ({ ...draft, longitude }))
                  }
                  accessibilityLabel="Dispensary longitude"
                  placeholder="Longitude"
                  keyboardType="numeric"
                  style={[styles.input, styles.linkInput]}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use current location for dispensary"
                accessibilityState={{ disabled: interactionBusy || !canEdit }}
                disabled={interactionBusy || !canEdit}
                onPress={() => void locateStorefront()}
                style={[
                  styles.secondaryButton,
                  (interactionBusy || !canEdit) && styles.disabled
                ]}
              >
                <Text style={styles.secondaryText}>
                  {locatingStorefront ? "Locating..." : "Use Current Location"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dispensary offers in-store pickup"
                accessibilityState={{
                  checked: storeDraft.pickupAvailable,
                  disabled: interactionBusy
                }}
                disabled={interactionBusy}
                onPress={() =>
                  setStoreDraft((draft) => ({
                    ...draft,
                    pickupAvailable: !draft.pickupAvailable
                  }))
                }
                style={[
                  styles.secondaryButton,
                  storeDraft.pickupAvailable && styles.selectedButton
                ]}
              >
                <Text style={styles.secondaryText}>
                  {storeDraft.pickupAvailable
                    ? "In-store Pickup Available"
                    : "No Pickup Option Published"}
                </Text>
              </Pressable>
              {storeDraft.pickupAvailable ? (
                <TextInput
                  value={storeDraft.pickupInstructions}
                  editable={!interactionBusy}
                  onChangeText={(pickupInstructions) =>
                    setStoreDraft((draft) => ({ ...draft, pickupInstructions }))
                  }
                  accessibilityLabel="Dispensary pickup instructions"
                  placeholder="Pickup hours, ID reminder, or where to check in"
                  multiline
                  style={[styles.input, styles.notesInput]}
                />
              ) : null}
            </View>
          ) : null}
          <TextInput
            value={storeDraft.description}
            editable={!interactionBusy}
            onChangeText={(description) =>
              setStoreDraft((draft) => ({ ...draft, description }))
            }
            accessibilityLabel="Storefront description"
            placeholder="Storefront description"
            multiline
            style={[styles.input, styles.notesInput]}
          />
          {!isDispensary ? (
            <TextInput
              value={storeDraft.countryCode}
              editable={!interactionBusy}
              onChangeText={(countryCode) =>
                setStoreDraft((draft) => ({
                  ...draft,
                  countryCode: countryCode.toUpperCase()
                }))
              }
              accessibilityLabel="Business country"
              placeholder="Country code for regulated listings, e.g. US"
              autoCapitalize="characters"
              maxLength={2}
              style={styles.input}
            />
          ) : null}
          <TextInput
            value={storeDraft.growInterestsText}
            editable={!interactionBusy}
            onChangeText={(growInterestsText) =>
              setStoreDraft((draft) => ({ ...draft, growInterestsText }))
            }
            accessibilityLabel="Storefront grow interests"
            placeholder="Grow interests, comma separated"
            multiline
            style={[styles.input, styles.notesInput]}
          />
          <TextInput
            value={storeDraft.websiteUrl}
            editable={!interactionBusy}
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
            editable={!interactionBusy}
            onChangeText={(supportEmail) =>
              setStoreDraft((draft) => ({ ...draft, supportEmail }))
            }
            accessibilityLabel="Storefront support email"
            placeholder={SUPPORT_CONTACTS.general}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={storeDraft.socialLinksText}
            editable={!interactionBusy}
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
            editable={!interactionBusy}
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
              disabled={interactionBusy || !canEdit}
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
                disabled={interactionBusy || !canEdit}
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
            editable={!interactionBusy}
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
              disabled={interactionBusy || !canEdit}
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
                disabled={interactionBusy || !canEdit}
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
            accessibilityState={{ disabled: publishDisabled || interactionBusy }}
            disabled={publishDisabled || interactionBusy}
            style={[
              styles.secondaryButton,
              (publishDisabled || interactionBusy) && styles.disabled
            ]}
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
            accessibilityState={{ disabled: interactionBusy || !canEdit }}
            disabled={interactionBusy || !canEdit}
            style={[
              styles.primaryButton,
              (interactionBusy || !canEdit) && styles.disabled
            ]}
          >
            <Text style={styles.primaryText}>
              {savingStorefront ? "Saving..." : "Save Storefront"}
            </Text>
          </Pressable>
        </AppCard>

        <AppCard>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Public Discovery
          </Text>
          <Text style={styles.helperText}>
            Free, Pro, commercial, and facility users can reach this brand from feed
            campaigns, forum replies, course pages, product cards, and public search
            surfaces. Use the store page as the single public home for the brand,
            products, courses, live sessions, and support links.
          </Text>
          <View style={styles.publicLinkBox}>
            <Text style={styles.publicLinkLabel}>Public store</Text>
            <Text selectable style={styles.publicLinkText}>
              {publicStorePath
                ? currentPublicUrl(publicStorePath)
                : "Add a public slug to create the public store URL."}
            </Text>
          </View>
          <View style={styles.previewActions}>
            <PublicPreviewLink href={publicStorePath} label="View Public Store" />
          </View>
        </AppCard>

        <AppCard>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Upcoming Lives
            </Text>
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
                      liveCampaignId(live) && `Campaign ${liveCampaignId(live)}`,
                      live.forumThreadId && `Forum/Q&A ${live.forumThreadId}`,
                      live.replayUrl && "Replay available"
                    ]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                  <View style={styles.objectActions}>
                    <ObjectActionLink
                      href={`/home/commercial/lives?liveId=${encodeURIComponent(liveId(live))}`}
                      label="Open Live"
                    />
                    {live.forumThreadId ? (
                      <ObjectActionLink
                        href={`/forum/post?id=${encodeURIComponent(String(live.forumThreadId))}`}
                        label="Open Q&A"
                      />
                    ) : null}
                  </View>
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
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Active Feed Campaigns
            </Text>
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
                          campaignProductLineId(campaign) &&
                            `Product line ${campaignProductLineId(campaign)}`,
                          campaign.linkedCourseId && `Course ${campaign.linkedCourseId}`,
                          campaign.linkedLiveId && `Live ${campaign.linkedLiveId}`,
                          campaign.linkedStorefrontId &&
                            `Storefront ${campaign.linkedStorefrontId}`,
                          Array.isArray(campaign.growInterests) &&
                            campaign.growInterests.length &&
                            `Interests ${campaign.growInterests.join(", ")}`,
                          campaign.linkedForumThreadId &&
                            `Forum/Q&A ${campaign.linkedForumThreadId}`
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </Text>
                      <View style={styles.objectActions}>
                        <ObjectActionLink
                          href="/home/commercial/feed"
                          label="Open Campaigns"
                        />
                        {campaignProductLineId(campaign) ? (
                          <PublicPreviewLink
                            href={
                              publicStorePath
                                ? `${publicStorePath}?line=${encodeURIComponent(
                                    campaignProductLineId(campaign)
                                  )}`
                                : undefined
                            }
                            label="Browse Line"
                          />
                        ) : null}
                        {campaign.linkedForumThreadId ? (
                          <ObjectActionLink
                            href={`/forum/post?id=${encodeURIComponent(String(campaign.linkedForumThreadId))}`}
                            label="Open Q&A"
                          />
                        ) : null}
                      </View>
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
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Create Product
          </Text>
          <TextInput
            value={productDraft.name}
            editable={!interactionBusy}
            onChangeText={(name) => setProductDraft((draft) => ({ ...draft, name }))}
            accessibilityLabel="Product name"
            placeholder="Product name"
            style={styles.input}
          />
          <TextInput
            value={productDraft.sku}
            editable={!interactionBusy}
            onChangeText={(sku) => setProductDraft((draft) => ({ ...draft, sku }))}
            accessibilityLabel="Product SKU"
            placeholder="SKU"
            style={styles.input}
          />
          <TextInput
            value={productDraft.category}
            editable={!interactionBusy}
            onChangeText={(category) =>
              setProductDraft((draft) => ({ ...draft, category }))
            }
            accessibilityLabel="Product category"
            placeholder="Category, e.g. soil mix, dry amendment, houseplant"
            style={styles.input}
          />
          <TextInput
            value={productDraft.growInterestsText}
            editable={!interactionBusy}
            onChangeText={(growInterestsText) =>
              setProductDraft((draft) => ({ ...draft, growInterestsText }))
            }
            accessibilityLabel="Product grow interests"
            placeholder="Product grow interests, comma separated"
            style={styles.input}
          />
          <TextInput
            value={productDraft.unitSize}
            editable={!interactionBusy}
            onChangeText={(unitSize) =>
              setProductDraft((draft) => ({ ...draft, unitSize }))
            }
            accessibilityLabel="Product size or weight"
            placeholder="Size or weight, e.g. 5 lb bag"
            style={styles.input}
          />
          <TextInput
            value={productDraft.npk}
            editable={!interactionBusy}
            onChangeText={(npk) => setProductDraft((draft) => ({ ...draft, npk }))}
            accessibilityLabel="Product label N-P2O5-K2O"
            placeholder="Label N-P2O5-K2O, e.g. 3-1-1"
            style={styles.input}
          />
          <TextInput
            value={productDraft.shortDescription}
            editable={!interactionBusy}
            onChangeText={(shortDescription) =>
              setProductDraft((draft) => ({ ...draft, shortDescription }))
            }
            accessibilityLabel="Product short description"
            placeholder="Short public summary"
            style={styles.input}
          />
          <TextInput
            value={productDraft.description}
            editable={!interactionBusy}
            onChangeText={(description) =>
              setProductDraft((draft) => ({ ...draft, description }))
            }
            accessibilityLabel="Product description"
            placeholder="Product description"
            multiline
            style={[styles.input, styles.notesInput]}
          />
          <TextInput
            value={productDraft.guaranteedAnalysis}
            editable={!interactionBusy}
            onChangeText={(guaranteedAnalysis) =>
              setProductDraft((draft) => ({ ...draft, guaranteedAnalysis }))
            }
            accessibilityLabel="Product guaranteed analysis"
            placeholder="Guaranteed analysis: N, P2O5, K2O, Ca, Mg, S, micros"
            multiline
            style={[styles.input, styles.notesInput]}
          />
          <TextInput
            value={productDraft.ingredients}
            editable={!interactionBusy}
            onChangeText={(ingredients) =>
              setProductDraft((draft) => ({ ...draft, ingredients }))
            }
            accessibilityLabel="Product ingredients"
            placeholder="Ingredients, one per line or comma separated"
            multiline
            style={[styles.input, styles.notesInput]}
          />
          <TextInput
            value={productDraft.applicationRate}
            editable={!interactionBusy}
            onChangeText={(applicationRate) =>
              setProductDraft((draft) => ({ ...draft, applicationRate }))
            }
            accessibilityLabel="Product application rate"
            placeholder="Application rate, e.g. 1 cup per cubic foot"
            style={styles.input}
          />
          <TextInput
            value={productDraft.usageInstructions}
            editable={!interactionBusy}
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
            editable={!interactionBusy}
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
            editable={!interactionBusy}
            onChangeText={(price) => setProductDraft((draft) => ({ ...draft, price }))}
            accessibilityLabel="Product price dollars"
            placeholder="Price (optional; blank means TBD)"
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            value={productDraft.currency}
            editable={!interactionBusy}
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
            editable={!interactionBusy}
            onChangeText={(externalPurchaseUrl) =>
              setProductDraft((draft) => ({ ...draft, externalPurchaseUrl }))
            }
            accessibilityLabel="Product external purchase URL"
            placeholder={
              isDispensary ? "Dispensary menu or product URL" : "External purchase URL"
            }
            autoCapitalize="none"
            style={styles.input}
          />
          <View style={styles.dispensaryPanel}>
            <Text style={styles.fieldLabel}>Regulated product handling</Text>
            <Text style={styles.muted}>
              Use this for hemp or cannabis seeds, plants, and regulated products.
              Informational inventory stays separate from any transaction permission.
            </Text>
            <View style={styles.objectActions}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Product is regulated cannabis"
                accessibilityState={{
                  checked: productDraft.regulatedCannabis,
                  disabled: interactionBusy
                }}
                disabled={interactionBusy}
                onPress={() =>
                  setProductDraft((draft) => ({
                    ...draft,
                    regulatedCannabis: !draft.regulatedCannabis,
                    regulatedProductClass: draft.regulatedCannabis
                      ? ""
                      : draft.regulatedProductClass
                  }))
                }
                style={[
                  styles.secondaryButton,
                  productDraft.regulatedCannabis && styles.selectedButton
                ]}
              >
                <Text style={styles.secondaryText}>
                  {productDraft.regulatedCannabis
                    ? "Regulated Item"
                    : "Not Marked Regulated"}
                </Text>
              </Pressable>
            </View>
            {productDraft.regulatedCannabis ? (
              <View>
                <Text style={styles.fieldLabel}>Regulated product class</Text>
                <View style={styles.objectActions}>
                  {regulatedProductClasses.map(([value, label]) => (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityLabel={`Regulated product class ${label}`}
                      accessibilityState={{
                        selected: productDraft.regulatedProductClass === value,
                        disabled: interactionBusy
                      }}
                      disabled={interactionBusy}
                      onPress={() =>
                        setProductDraft((draft) => ({
                          ...draft,
                          regulatedProductClass: value
                        }))
                      }
                      style={[
                        styles.secondaryButton,
                        productDraft.regulatedProductClass === value &&
                          styles.selectedButton
                      ]}
                    >
                      <Text style={styles.secondaryText}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
          {isDispensary ? (
            <View style={styles.dispensaryPanel}>
              <Text style={styles.muted}>
                Inventory can remain publicly listed. GrowPath releases a regulated
                product handoff only when an active reviewed decision matches the exact
                product, origin, destination, buyer eligibility, and fulfillment route.
              </Text>
              <View style={styles.objectActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Product available for in-store pickup"
                  accessibilityState={{
                    checked: productDraft.pickupAvailable,
                    disabled: interactionBusy
                  }}
                  disabled={interactionBusy}
                  onPress={() =>
                    setProductDraft((draft) => ({
                      ...draft,
                      pickupAvailable: !draft.pickupAvailable
                    }))
                  }
                  style={[
                    styles.secondaryButton,
                    productDraft.pickupAvailable && styles.selectedButton
                  ]}
                >
                  <Text style={styles.secondaryText}>
                    {productDraft.pickupAvailable
                      ? "Pickup Available"
                      : "Pickup Not Published"}
                  </Text>
                </Pressable>
              </View>
              {productDraft.pickupAvailable ? (
                <TextInput
                  value={productDraft.pickupInstructions}
                  editable={!interactionBusy}
                  onChangeText={(pickupInstructions) =>
                    setProductDraft((draft) => ({
                      ...draft,
                      pickupInstructions
                    }))
                  }
                  accessibilityLabel="Product pickup instructions"
                  placeholder="Optional product-specific pickup note"
                  multiline
                  style={[styles.input, styles.notesInput]}
                />
              ) : null}
            </View>
          ) : (
            <>
              <TextInput
                value={productDraft.stripeProductId}
                editable={!interactionBusy}
                onChangeText={(stripeProductId) =>
                  setProductDraft((draft) => ({ ...draft, stripeProductId }))
                }
                accessibilityLabel="Product Stripe product ID"
                placeholder="Stripe product ID"
                autoCapitalize="none"
                style={styles.input}
              />
              <TextInput
                value={productDraft.stripePriceId}
                editable={!interactionBusy}
                onChangeText={(stripePriceId) =>
                  setProductDraft((draft) => ({ ...draft, stripePriceId }))
                }
                accessibilityLabel="Product Stripe price ID"
                placeholder="Stripe price ID"
                autoCapitalize="none"
                style={styles.input}
              />
            </>
          )}
          <TextInput
            value={productDraft.inventoryItemId}
            editable={!interactionBusy}
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
            editable={!interactionBusy}
            onChangeText={(productLineId) =>
              setProductDraft((draft) => ({ ...draft, productLineId }))
            }
            accessibilityLabel="Product line id"
            placeholder="Product line id, or choose an existing line below"
            autoCapitalize="none"
            style={styles.input}
          />
          {productLines.length ? (
            <View style={styles.objectActions}>
              {productLines.slice(0, 4).map((line) => {
                const id = String(line.id ?? line._id ?? line.lineId ?? line.name ?? "");
                const name = String(line.name ?? line.title ?? "Product line");
                return (
                  <Pressable
                    key={`choose-line-${id || name}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Use product line ${name}`}
                    accessibilityState={{ disabled: interactionBusy }}
                    disabled={interactionBusy}
                    style={[
                      styles.secondaryButton,
                      productDraft.productLineId === id && styles.selectedButton
                    ]}
                    onPress={() =>
                      setProductDraft((draft) => ({ ...draft, productLineId: id }))
                    }
                  >
                    <Text style={styles.secondaryText}>{name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={styles.linkGrid}>
            <TextInput
              value={productDraft.linkedRecipeId}
              editable={!interactionBusy}
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
              editable={!interactionBusy}
              onChangeText={(linkedBatchId) =>
                setProductDraft((draft) => ({ ...draft, linkedBatchId }))
              }
              accessibilityLabel="Linked batch id"
              placeholder="Linked batch id"
              autoCapitalize="none"
              style={[styles.input, styles.linkInput]}
            />
            <TextInput
              value={productDraft.linkedTrialId}
              editable={!interactionBusy}
              onChangeText={(linkedTrialId) =>
                setProductDraft((draft) => ({ ...draft, linkedTrialId }))
              }
              accessibilityLabel="Linked evidence run id"
              placeholder="Linked evidence run id"
              autoCapitalize="none"
              style={[styles.input, styles.linkInput]}
            />
            <TextInput
              value={productDraft.linkedCourseId}
              editable={!interactionBusy}
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
                    accessibilityState={{ disabled: interactionBusy }}
                    disabled={interactionBusy}
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
            editable={!interactionBusy}
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
              disabled={interactionBusy || !canEdit}
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
                disabled={interactionBusy || !canEdit}
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
            accessibilityState={{ disabled: interactionBusy }}
            disabled={interactionBusy}
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
            accessibilityState={{
              disabled: interactionBusy || !productDraft.name.trim() || !canEdit,
              busy: savingProduct
            }}
            disabled={interactionBusy || !productDraft.name.trim() || !canEdit}
            style={[
              styles.primaryButton,
              (interactionBusy || !productDraft.name.trim() || !canEdit) &&
                styles.disabled
            ]}
          >
            <Text style={styles.primaryText}>
              {savingProduct ? "Saving..." : "Create Product"}
            </Text>
          </Pressable>
        </AppCard>

        <AppCard>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Products
          </Text>
          {products.length === 0 ? (
            <Text style={styles.muted}>
              {isDispensary
                ? "No inventory listings yet. Create the first public item with an image, description, linked inventory, and website or pickup handoff."
                : "No products yet. Create the first product with an image, description, price, and checkout path so it can become a storefront card."}
            </Text>
          ) : (
            <View style={styles.productList}>
              {products.map((product) => {
                const image = productImage(product);
                const missing = productMissingSetup(product, isDispensary);
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
                        {priceCents > 0
                          ? `$${dollars(priceCents)} ${String(
                              product.currency || "usd"
                            ).toUpperCase()}`
                          : "Price TBD"}{" "}
                        | {product.category || "No category"}
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
                      {productCheckoutReady(product, isDispensary) ? (
                        <Text style={styles.goodText}>
                          {isDispensary
                            ? "Website or pickup handoff added"
                            : "Checkout path added"}
                        </Text>
                      ) : null}
                      {product.linkedRecipeId ||
                      product.linkedBatchId ||
                      product.linkedTrialId ||
                      product.linkedGrowTrialId ||
                      product.linkedCourseId ? (
                        <Text style={styles.muted}>
                          Linked evidence:{" "}
                          {[
                            product.linkedRecipeId && "recipe",
                            product.linkedBatchId && "batch",
                            (product.linkedTrialId || product.linkedGrowTrialId) &&
                              "evidence run",
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
                      <View style={styles.objectActions}>
                        <ObjectActionLink
                          href={`/home/commercial/products/${encodeURIComponent(productId(product))}`}
                          label="Open Product"
                        />
                        {product.linkedCourseId ? (
                          <ObjectActionLink
                            href={`/home/commercial/courses/${encodeURIComponent(String(product.linkedCourseId))}`}
                            label="Open Course"
                          />
                        ) : null}
                      </View>
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

export function createStorefrontOwnerStyles(palette: ThemePalette) {
  return StyleSheet.create({
    headerTitle: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "800",
      marginBottom: 4
    },
    headerSubtitle: {
      color: palette.textMuted,
      fontSize: 14,
      lineHeight: 20
    },
    inner: { gap: 14 },
    loading: { alignItems: "center", gap: 10, paddingVertical: 18 },
    progressRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      paddingVertical: 8
    },
    errorPanel: { alignItems: "flex-start", gap: 8 },
    muted: { color: palette.textMuted, fontWeight: "700" },
    feedback: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.success,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.success,
      fontWeight: "800",
      padding: 10
    },
    cardHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
    metric: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexGrow: 1,
      minWidth: 130,
      padding: 12
    },
    metricValue: { color: palette.text, fontSize: 20, fontWeight: "900" },
    metricLabel: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "900",
      marginTop: 2
    },
    statusPill: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: 999,
      color: palette.textSoft,
      fontSize: 12,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3
    },
    livePill: { backgroundColor: palette.accentSoft, color: palette.success },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      color: palette.text,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    notesInput: { minHeight: 76, textAlignVertical: "top" },
    imageActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    helperText: {
      color: palette.textSoft,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      marginTop: 8
    },
    checklist: { gap: 8, marginTop: 12 },
    checkItem: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      padding: 10
    },
    checkItemComplete: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.success
    },
    checkIcon: {
      color: palette.text,
      fontSize: 11,
      fontWeight: "900",
      minWidth: 36
    },
    checkCopy: { flex: 1, gap: 2 },
    checkLabel: { color: palette.text, fontSize: 13, fontWeight: "900" },
    checkHelper: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 17
    },
    publicLinkBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      padding: 10
    },
    publicLinkLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "900" },
    publicLinkText: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 4
    },
    previewActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    previewButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      minHeight: 42,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    previewButtonText: { color: palette.accentText, fontWeight: "900" },
    previewDisabledText: {
      color: palette.accentText,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 2
    },
    objectActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    objectAction: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 34,
      justifyContent: "center",
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    objectActionText: { color: palette.link, fontSize: 12, fontWeight: "900" },
    discoveryActions: { gap: 6, marginTop: 10 },
    discoveryAction: { color: palette.link, fontSize: 13, fontWeight: "800" },
    dispensaryPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      marginBottom: 10,
      marginTop: 10,
      padding: 12
    },
    fieldLabel: {
      color: palette.textSoft,
      fontSize: 12,
      fontWeight: "900",
      marginTop: 4
    },
    linkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    linkInput: { flexBasis: "48%", flexGrow: 1 },
    logoPreview: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      height: 96,
      marginTop: 10,
      width: 96
    },
    bannerPreview: {
      aspectRatio: 16 / 9,
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      width: "100%"
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 12,
      paddingVertical: 12
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 12,
      paddingVertical: 10
    },
    selectedButton: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
    secondaryText: { color: palette.text, fontWeight: "900" },
    disabled: { opacity: 0.55 },
    warningBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      padding: 10
    },
    warningTitle: {
      color: palette.warning,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    warningText: {
      color: palette.warning,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 4
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    chip: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    chipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    chipText: { color: palette.text, fontWeight: "800" },
    chipTextSelected: { color: palette.accentText },
    eventList: { gap: 10, marginTop: 12 },
    eventRow: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    eventTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    eventBody: {
      color: palette.textSoft,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      marginTop: 5
    },
    campaignRow: {
      alignItems: "flex-start",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      padding: 12
    },
    campaignThumb: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      height: 72,
      width: 72
    },
    campaignCopy: { flex: 1, gap: 4 },
    productList: { gap: 10, marginTop: 10 },
    productRow: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      padding: 12
    },
    productThumb: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      height: 84,
      width: 84
    },
    productThumbPlaceholder: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      height: 84,
      justifyContent: "center",
      width: 84
    },
    productThumbText: {
      color: palette.textMuted,
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
    productTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    rowPill: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceStrong,
      borderRadius: 999,
      color: palette.textSoft,
      fontSize: 12,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3
    },
    goodText: { color: palette.success, fontSize: 12, fontWeight: "900" },
    readyText: { color: palette.success, fontSize: 12, fontWeight: "900" },
    warningRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 3 },
    warningPill: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: 999,
      color: palette.warning,
      fontSize: 11,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 4
    }
  });
}
