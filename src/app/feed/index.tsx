import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { fetchProducts, type Product } from "@/api/products";
import { fetchStorefront } from "@/api/storefront";
import { useAuth } from "@/auth/AuthContext";
import { submitReport } from "@/api/reports";
import { recordCommercialAnalyticsEvent } from "@/api/commercialAnalytics";
import { InlineError } from "@/components/InlineError";
import OwnerFeedCampaignsPanel from "@/components/feed/OwnerFeedCampaignsPanel";
import {
  createCommercialFeedCampaign,
  fetchFeedCampaignAnalytics,
  listCommercialFeedCampaigns,
  recordFeedCampaignEvent,
  type CommercialFeedCampaign,
  type CommercialFeedCampaignType,
  type FeedCampaignAnalytics,
  type FeedCampaignPlacement
} from "@/api/commercialFeed";
import { useEntitlements } from "@/entitlements";
import CalendarDateField from "@/components/forms/CalendarDateField";
import BackButton from "@/components/nav/BackButton";
import SchedulePicker from "@/components/schedule/SchedulePicker";
import {
  facilitySalesPolicyText,
  hasFacilitySalesLanguage
} from "@/utils/commercialFeedPolicy";
import { resolveImageUri } from "@/utils/photoUploads";
import { useCampaignImagePreview } from "@/hooks/useCampaignImagePreview";
import { sharePublicLink } from "@/utils/publicLinks";
import {
  getFeedCampaignTimeZone,
  resolveFeedCampaignSchedule
} from "@/utils/feedCampaignSchedule";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

const COMMERCIAL_TYPES: CommercialFeedCampaignType[] = [
  "update",
  "listing",
  "drop",
  "education"
];
const CAMPAIGN_FILTERS: Array<{
  value: "all" | CommercialFeedCampaignType;
  label: string;
}> = [
  { value: "all", label: "All campaigns" },
  { value: "update", label: "Updates" },
  { value: "listing", label: "Product listings" },
  { value: "drop", label: "Launches & live events" },
  { value: "education", label: "Education" }
];
const FACILITY_TYPES: CommercialFeedCampaignType[] = ["education"];
type CampaignKind =
  | "product_ad"
  | "course_ad"
  | "live_ad"
  | "storefront_ad"
  | "facility_outreach"
  | "general_campaign";

type DestinationOption = {
  id: string;
  label: string;
  detail?: string;
};

type DestinationOptions = {
  courses: DestinationOption[];
  lives: DestinationOption[];
  forumThreads: DestinationOption[];
};

const COMMERCIAL_CAMPAIGN_KINDS: CampaignKind[] = [
  "product_ad",
  "course_ad",
  "live_ad",
  "storefront_ad",
  "general_campaign"
];
const FACILITY_CAMPAIGN_KINDS: CampaignKind[] = ["facility_outreach"];

const campaignKindLabels: Record<CampaignKind, string> = {
  product_ad: "Product ad",
  course_ad: "Course ad",
  live_ad: "Live event ad",
  storefront_ad: "Storefront ad",
  facility_outreach: "Facility outreach",
  general_campaign: "General campaign"
};

const PLACEMENT_OPTIONS: FeedCampaignPlacement[] = [
  "feed",
  "home_hero",
  "home_top",
  "home_middle",
  "home_bottom",
  "page_top",
  "page_middle",
  "page_bottom",
  "course",
  "tool",
  "forum",
  "product",
  "facility",
  "commercial"
];

const placementLabels: Record<FeedCampaignPlacement, string> = {
  feed: "All Feed placements",
  home_hero: "Home hero",
  home_top: "Home top",
  home_middle: "Home middle",
  home_bottom: "Home bottom",
  page_top: "Page top",
  page_middle: "Page middle",
  page_bottom: "Page bottom",
  course: "Courses",
  tool: "Tools",
  forum: "Forum",
  product: "Products",
  facility: "Facility",
  commercial: "Commercial"
};

function backendTypeForCampaignKind(kind: CampaignKind): CommercialFeedCampaignType {
  if (kind === "product_ad") return "listing";
  if (kind === "course_ad") return "education";
  if (kind === "live_ad") return "drop";
  if (kind === "facility_outreach") return "education";
  return "update";
}

function canonicalCampaignType(kind: CampaignKind) {
  return kind.replace(/_ad$|_outreach$|_campaign$/g, "") as
    | "product"
    | "course"
    | "live"
    | "storefront"
    | "facility"
    | "general";
}

function campaignReadinessWarnings({
  campaignKind,
  linkedProductId,
  linkedProductLineId,
  linkedCourseId,
  linkedLiveId,
  storefrontSlug,
  linkedForumThreadId,
  externalLinkUrl,
  imageUrl,
  scheduleWarnings,
  placements
}: {
  campaignKind: CampaignKind;
  linkedProductId: string;
  linkedProductLineId: string;
  linkedCourseId: string;
  linkedLiveId: string;
  storefrontSlug: string;
  linkedForumThreadId: string;
  externalLinkUrl: string;
  imageUrl: string;
  scheduleWarnings: string[];
  placements: FeedCampaignPlacement[];
}) {
  const warnings: string[] = [...scheduleWarnings];
  const hasDestination =
    linkedProductId.trim() ||
    linkedProductLineId.trim() ||
    linkedCourseId.trim() ||
    linkedLiveId.trim() ||
    storefrontSlug.trim() ||
    linkedForumThreadId.trim() ||
    externalLinkUrl.trim();
  if (
    campaignKind === "product_ad" &&
    !linkedProductId.trim() &&
    !linkedProductLineId.trim()
  ) {
    warnings.push("Product ad should link to a product or product line.");
  }
  if (campaignKind === "course_ad" && !linkedCourseId.trim()) {
    warnings.push("Course ad should link to a course.");
  }
  if (campaignKind === "live_ad" && !linkedLiveId.trim()) {
    warnings.push("Live event ad should link to a live.");
  }
  if (campaignKind === "storefront_ad" && !storefrontSlug.trim()) {
    warnings.push("Storefront ad should link to a storefront.");
  }
  if (!hasDestination) {
    warnings.push("Add at least one destination before promoting broadly.");
  }
  if (!imageUrl.trim()) {
    warnings.push("Add an image or creative before publishing.");
  }
  if (externalLinkUrl.trim() && !/^https?:\/\//i.test(externalLinkUrl.trim())) {
    warnings.push("External destination must start with http:// or https://.");
  }
  if (!placements.length) {
    warnings.push("Select at least one campaign placement.");
  }
  return warnings;
}

function authorLabel(post: CommercialFeedCampaign) {
  if (post.author?.displayName) {
    return post.author.displayName;
  }
  if (post.authorType === "facility" || post.workspaceType === "facility") {
    return "Facility account";
  }
  return "Commercial account";
}

function campaignMeta(post: CommercialFeedCampaign) {
  const created = post.createdAt ? new Date(post.createdAt).toLocaleString() : "";
  return [authorLabel(post), created, post.location].filter(Boolean).join(" - ");
}

function campaignImage(post: CommercialFeedCampaign) {
  return campaignImages(post)[0] || "";
}

function campaignImages(post: CommercialFeedCampaign) {
  const values = [
    post.imageUrl,
    post.creativeImageUrl,
    post.bannerImageUrl,
    ...(isHarvestReadinessCampaign(post) ? post.media || [] : []).map((item) => item.url)
  ]
    .map((value) => resolveImageUri(String(value || "")))
    .filter(Boolean);
  return [...new Set(values)].slice(0, 8);
}

function isHarvestReadinessCampaign(post: CommercialFeedCampaign) {
  return (
    post.sourceType === "harvest_readiness" ||
    (post.contentLabels || []).some(
      (label) =>
        String(label || "")
          .trim()
          .toLowerCase() === "harvest-readiness"
    )
  );
}

function isCannabisCampaign(post: CommercialFeedCampaign) {
  return (post.contentLabels || []).some(
    (label) =>
      String(label || "")
        .trim()
        .toLowerCase() === "cannabis"
  );
}

function visibleCampaignType(post: CommercialFeedCampaign) {
  if (isHarvestReadinessCampaign(post)) return "Owner-reviewed Harvest Readiness";
  if (post.campaignKind && campaignKindLabels[post.campaignKind as CampaignKind]) {
    return campaignKindLabels[post.campaignKind as CampaignKind];
  }
  if (post.linkedProductId) return campaignKindLabels.product_ad;
  if (post.linkedCourseId) return campaignKindLabels.course_ad;
  if (post.linkedLiveId) return campaignKindLabels.live_ad;
  if (post.linkedProductLineId) return campaignKindLabels.product_ad;
  if (post.storefrontSlug) return campaignKindLabels.storefront_ad;
  if (post.authorType === "facility" || post.workspaceType === "facility") {
    return campaignKindLabels.facility_outreach;
  }
  return campaignKindLabels.general_campaign;
}

function campaignStorefrontSlug(post: CommercialFeedCampaign) {
  return String(
    post.storefrontSlug ||
      post.linkedStorefrontSlug ||
      post.brandSlug ||
      post.publicSlug ||
      ""
  ).trim();
}

function campaignEngagementCount(post: CommercialFeedCampaign) {
  return Number(post.engagementCount ?? post.likeCount ?? 0);
}

function campaignEvidenceRunId(post: CommercialFeedCampaign) {
  return post.linkedTrialId || post.linkedGrowId || "";
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function recordsFromEnvelope(value: any, keys: string[]) {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
    if (Array.isArray(value?.data?.[key])) return value.data[key];
  }
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function destinationOptionsFromRecords(
  value: any,
  keys: string[],
  idKeys: string[],
  labelKeys: string[],
  detailKeys: string[] = []
): DestinationOption[] {
  const seen = new Set<string>();
  return recordsFromEnvelope(value, keys)
    .map((record: any) => {
      const id = idKeys
        .map((key) => record?.[key])
        .find((candidate) => typeof candidate === "string" && candidate.trim());
      const label = labelKeys
        .map((key) => record?.[key])
        .find((candidate) => typeof candidate === "string" && candidate.trim());
      const detail = detailKeys
        .map((key) => record?.[key])
        .find((candidate) => typeof candidate === "string" && candidate.trim());
      if (!id || !label || seen.has(id.trim())) return null;
      seen.add(id.trim());
      return {
        id: id.trim(),
        label: label.trim(),
        detail: detail?.trim()
      };
    })
    .filter((option: DestinationOption | null): option is DestinationOption =>
      Boolean(option)
    )
    .slice(0, 12);
}

function mergeDestinationOptions(...lists: DestinationOption[][]) {
  const options = new Map<string, DestinationOption>();
  for (const option of lists.flat()) {
    if (!options.has(option.id)) options.set(option.id, option);
  }
  return Array.from(options.values()).slice(0, 12);
}

function DestinationPickerGroup({
  title,
  kind,
  options,
  selectedId,
  loading,
  onChange
}: {
  title: string;
  kind: string;
  options: DestinationOption[];
  selectedId: string;
  loading: boolean;
  onChange: (id: string) => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFeedCampaignStyles(palette), [palette]);
  const selected = options.find((option) => option.id === selectedId);
  return (
    <View style={styles.destinationGroup} accessibilityLabel={`${title} destinations`}>
      <Text style={styles.destinationTitle}>{title}</Text>
      {loading ? (
        <View style={styles.destinationLoading}>
          <ActivityIndicator size="small" color={palette.accent} />
          <Text style={styles.linkBoxText}>Loading {kind.toLowerCase()} choices...</Text>
        </View>
      ) : options.length ? (
        <View style={styles.destinationGrid}>
          {options.map((option) => {
            const isSelected = option.id === selectedId;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${isSelected ? "Remove" : "Select"} ${kind} ${option.label}`}
                onPress={() => onChange(isSelected ? "" : option.id)}
                style={[
                  styles.destinationCard,
                  isSelected ? styles.destinationCardSelected : null
                ]}
              >
                <Text
                  style={[
                    styles.destinationCardTitle,
                    isSelected ? styles.destinationCardTitleSelected : null
                  ]}
                >
                  {option.label}
                </Text>
                {option.detail ? (
                  <Text
                    style={[
                      styles.destinationCardDetail,
                      isSelected ? styles.destinationCardDetailSelected : null
                    ]}
                  >
                    {option.detail}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyDestinationText}>
          No public {kind.toLowerCase()} records are available yet.
        </Text>
      )}
      {selected ? (
        <Text style={styles.selectedDestinationText}>
          Selected {kind.toLowerCase()}: {selected.label}
        </Text>
      ) : selectedId ? (
        <Text style={styles.selectedDestinationText}>
          A manual {kind.toLowerCase()} reference is selected.
        </Text>
      ) : null}
    </View>
  );
}

function campaignDestination(post: CommercialFeedCampaign) {
  const storefrontSlug = campaignStorefrontSlug(post);
  if (post.linkedProductId) {
    const productId = encodeURIComponent(String(post.linkedProductId));
    if (storefrontSlug) {
      const slug = encodeURIComponent(storefrontSlug);
      return {
        label: "View Product",
        href: `/store/${slug}/products/${productId}`
      };
    }
    return {
      label: "View Product",
      href: `/store?q=${productId}`
    };
  }
  if (post.linkedCourseId) {
    const courseId = encodeURIComponent(String(post.linkedCourseId));
    if (storefrontSlug) {
      const slug = encodeURIComponent(storefrontSlug);
      return {
        label: "View Course",
        href: `/store/${slug}/courses/${courseId}`
      };
    }
    return {
      label: "View Course",
      href: `/courses?courseId=${courseId}`
    };
  }
  if (post.linkedLiveId) {
    return {
      label: "View Live",
      href: `/live-session?sessionId=${encodeURIComponent(String(post.linkedLiveId))}`
    };
  }
  if (post.linkedProductLineId) {
    const lineId = encodeURIComponent(String(post.linkedProductLineId));
    if (storefrontSlug) {
      const slug = encodeURIComponent(storefrontSlug);
      return {
        label: "View Product Line",
        href: `/store/${slug}?line=${lineId}`
      };
    }
    return {
      label: "View Product Line",
      href: `/store?line=${lineId}`
    };
  }
  if (storefrontSlug) {
    return {
      label: "Visit Storefront",
      href: `/store/${encodeURIComponent(storefrontSlug)}`
    };
  }
  if (post.linkedForumThreadId) {
    return {
      label: "Open Forum Q&A",
      href: `/forum/post?id=${encodeURIComponent(String(post.linkedForumThreadId))}`
    };
  }
  const externalLink = post.externalLinks?.find((link) => String(link?.url || "").trim());
  if (externalLink) {
    return {
      label: externalLink.label || "Learn More",
      href: String(externalLink.url)
    };
  }
  return {
    label: "View Outreach",
    href: `/feed?campaignId=${encodeURIComponent(String(post.id))}`
  };
}

export default function CommercialFeedRoute() {
  const params = useLocalSearchParams<{ productId?: string | string[] }>();
  const ent = useEntitlements();
  if (!ent.ready) return null;
  if (params.productId !== undefined && ent.mode === "commercial") {
    const productId = typeof params.productId === "string" ? params.productId : "";
    return <ProductCampaignScope productId={productId} />;
  }
  return <CommercialFeedForm />;
}

function ProductCampaignScope({ productId }: { productId: string }) {
  const auth = useAuth();
  if (auth.isHydrating || !auth.isAuthed || !auth.user?.id) return null;
  return (
    <ProductCampaignHandoff key={`${auth.user.id}:${productId}`} productId={productId} />
  );
}

function ProductCampaignHandoff({ productId }: { productId: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFeedCampaignStyles(palette), [palette]);
  const [seed, setSeed] = useState<{ product: Product; storefrontSlug: string } | null>(
    null
  );
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) {
      setError(
        "The selected product link is invalid. Return to Products and choose it again."
      );
      return;
    }
    // Resolve only through the signed-in seller's catalog, never through public or URL copy.
    void Promise.all([fetchProducts(), fetchStorefront()])
      .then(([products, storefront]) => {
        if (!active) return;
        const selected = products.find(
          (item) =>
            String(item.id || (item as any)._id) === productId &&
            item.status === "published"
        );
        if (!selected) {
          setError(
            "This product is no longer published in your catalog. Return to Products to review it."
          );
          return;
        }
        if (!storefront?.isPublished || !storefront.slug?.trim()) {
          setError(
            "A published storefront is needed for this product destination. Return to Products and review Storefront setup."
          );
          return;
        }
        setSeed({ product: selected, storefrontSlug: storefront.slug.trim() });
      })
      .catch(() => {
        if (active)
          setError(
            "Unable to load the selected product. Retry or return to Products; nothing has been published."
          );
      });
    return () => {
      active = false;
    };
  }, [productId, attempt]);
  if (seed)
    return (
      <CommercialFeedForm
        initialProduct={seed.product}
        initialStorefrontSlug={seed.storefrontSlug}
      />
    );
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton fallbackHref="/home/commercial/products" preferFallback />
      <Text accessibilityRole="header" style={styles.title}>
        Feed / Campaigns
      </Text>
      <View style={styles.card}>
        <Text style={styles.subtitle}>{error || "Loading selected product…"}</Text>
        {error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry selected product"
            onPress={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            <Text style={styles.linkBoxText}>Retry selected product</Text>
          </Pressable>
        ) : (
          <ActivityIndicator color={palette.accent} />
        )}
      </View>
    </ScrollView>
  );
}

function CommercialFeedForm({
  initialProduct,
  initialStorefrontSlug = ""
}: {
  initialProduct?: Product;
  initialStorefrontSlug?: string;
}) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFeedCampaignStyles(palette), [palette]);
  const params = useLocalSearchParams<{
    campaignId?: string | string[];
    liveId?: string | string[];
  }>();
  const focusedCampaignId = Array.isArray(params.campaignId)
    ? params.campaignId[0]
    : params.campaignId;
  const focusedLiveId = Array.isArray(params.liveId) ? params.liveId[0] : params.liveId;
  const ent = useEntitlements();
  const isFacility = ent.mode === "facility";
  const isCommercial = ent.mode === "commercial";
  const facilityRole = String(ent.facilityRole || "").toUpperCase();
  const canManageCampaigns =
    isCommercial ||
    (isFacility && (facilityRole === "OWNER" || facilityRole === "MANAGER"));
  const allowedTypes = isFacility ? FACILITY_TYPES : COMMERCIAL_TYPES;
  const allowedCampaignKinds = isFacility
    ? FACILITY_CAMPAIGN_KINDS
    : COMMERCIAL_CAMPAIGN_KINDS;

  const [items, setItems] = useState<CommercialFeedCampaign[]>([]);
  const [type, setType] = useState<CommercialFeedCampaignType>(allowedTypes[0]);
  const [campaignKind, setCampaignKind] = useState<CampaignKind>(allowedCampaignKinds[0]);
  const [filterType, setFilterType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState(initialProduct?.name || "");
  const [body, setBody] = useState(
    initialProduct?.shortDescription || initialProduct?.description || ""
  );
  const [tags, setTags] = useState("");
  const [growInterests, setGrowInterests] = useState(
    initialProduct?.growInterests?.join(", ") || ""
  );
  const [cannabisSpecific, setCannabisSpecific] = useState(
    Boolean(initialProduct?.isCannabis || initialProduct?.regulatedCannabis)
  );
  const [location, setLocation] = useState("");
  const [linkedProductId, setLinkedProductId] = useState(
    initialProduct ? String(initialProduct.id || (initialProduct as any)._id) : ""
  );
  const [linkedProductLineId, setLinkedProductLineId] = useState("");
  const [linkedCourseId, setLinkedCourseId] = useState("");
  const [linkedLiveId, setLinkedLiveId] = useState("");
  const [linkedGrowId, setLinkedGrowId] = useState("");
  const [linkedForumThreadId, setLinkedForumThreadId] = useState("");
  const [storefrontSlug, setStorefrontSlug] = useState(initialStorefrontSlug);
  const [imageUrl, setImageUrl] = useState(
    resolveImageUri(
      initialProduct?.imageUrl ||
        (initialProduct as any)?.thumbnailUrl ||
        (initialProduct as any)?.photoUrl ||
        (initialProduct as any)?.gallery?.[0] ||
        (initialProduct as any)?.images?.[0] ||
        ""
    )
  );
  const [externalLinkUrl, setExternalLinkUrl] = useState("");
  const previewUri = resolveImageUri(imageUrl.trim());
  const imagePreview = useCampaignImagePreview(previewUri);
  const [externalLinkLabel, setExternalLinkLabel] = useState("");
  const [campaignStart, setCampaignStart] = useState("");
  const [campaignEnd, setCampaignEnd] = useState("");
  const [campaignReminder, setCampaignReminder] = useState("24 hours before");
  const [campaignRecurrence, setCampaignRecurrence] = useState("");
  const [placements, setPlacements] = useState<FeedCampaignPlacement[]>(
    isFacility ? ["facility"] : ["feed"]
  );
  const [ctaLabel, setCtaLabel] = useState("Open");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ownerCampaignsBusy, setOwnerCampaignsBusy] = useState(false);
  const [creatingSetupTask, setCreatingSetupTask] = useState(false);
  const [error, setError] = useState<any>(null);
  const [loadError, setLoadError] = useState<any>(null);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const readSequence = useRef(0);
  const activeRead = useRef<{ id: number; key: string } | null>(null);
  const queryKey = JSON.stringify([ent.mode, ent.facilityId, filterType, q.trim()]);
  const hasLoadedQuery = loadedQuery === queryKey;
  const [feedback, setFeedback] = useState("");
  const [analytics, setAnalytics] = useState<FeedCampaignAnalytics | null>(null);
  const [hiddenCampaignIds, setHiddenCampaignIds] = useState<string[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<DestinationOptions>({
    courses: [],
    lives: [],
    forumThreads: []
  });
  const [destinationOptionsLoading, setDestinationOptionsLoading] = useState(false);
  const [destinationOptionsError, setDestinationOptionsError] = useState("");
  const [showAdvancedReferences, setShowAdvancedReferences] = useState(false);
  const recordedImpressions = useRef(new Set<string>());
  // Keep confirmed withdrawals out of both current cards and late public reads.
  // This does not hide the retained record in the separate owner-management list.
  const unpublishedCampaignIds = useRef(new Set<string>());
  const onCampaignUnpublished = useCallback((id: string) => {
    unpublishedCampaignIds.current.add(id);
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (!allowedTypes.includes(type)) setType(allowedTypes[0]);
  }, [allowedTypes, type]);

  useEffect(() => {
    if (!allowedCampaignKinds.includes(campaignKind)) {
      setCampaignKind(allowedCampaignKinds[0]);
    }
    setType(backendTypeForCampaignKind(campaignKind));
  }, [allowedCampaignKinds, campaignKind]);

  const canAccess = ent.ready;
  const campaignTimeZone = getFeedCampaignTimeZone();
  const campaignSchedule = useMemo(
    () => resolveFeedCampaignSchedule(campaignStart, campaignEnd, campaignTimeZone),
    [campaignStart, campaignEnd, campaignTimeZone]
  );
  const readinessWarnings = campaignReadinessWarnings({
    campaignKind,
    linkedProductId,
    linkedProductLineId,
    linkedCourseId,
    linkedLiveId,
    storefrontSlug,
    linkedForumThreadId,
    externalLinkUrl,
    imageUrl,
    scheduleWarnings: campaignSchedule.warnings,
    placements
  });
  const canCreate =
    canManageCampaigns &&
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    !creating &&
    !ownerCampaignsBusy;
  if (previewUri && imagePreview.status !== "loaded") {
    readinessWarnings.push(
      imagePreview.status === "failed"
        ? "The campaign image could not load. Retry the preview or choose another image before publishing."
        : "Wait for the campaign image preview to load before publishing."
    );
  }
  const canPublishCampaign = canCreate && readinessWarnings.length === 0;

  const helper = useMemo(
    () =>
      isFacility
        ? "Facility feed campaigns are outreach placements. Share training, SOP, IPM, safety, cultivation, compliance, and professional education. Direct sales listings are blocked for facility accounts."
        : isCommercial
          ? "Create outreach campaigns that promote products, courses, lives, storefronts, offers, and brand updates. Use Forum/Q&A for discussion."
          : "Browse commercial and facility outreach campaigns for products, courses, lives, storefronts, and offers. Use Forum/Q&A for discussion.",
    [isCommercial, isFacility]
  );

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!canAccess || activeRead.current?.key === queryKey) return;
      const id = ++readSequence.current;
      activeRead.current = { id, key: queryKey };
      const isCurrent = () => readSequence.current === id;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);
      try {
        const res = await listCommercialFeedCampaigns({
          type: filterType,
          q: q.trim(),
          limit: 30
        });
        if (!isCurrent()) return;
        setItems(
          res.items.filter((item) => !unpublishedCampaignIds.current.has(item.id))
        );
        setLoadedQuery(queryKey);
        if (canManageCampaigns) {
          try {
            const campaignAnalytics = await fetchFeedCampaignAnalytics();
            if (isCurrent()) setAnalytics(campaignAnalytics);
          } catch {
            if (isCurrent()) setAnalytics(null);
          }
        }
      } catch (e) {
        if (isCurrent()) setLoadError(e);
      } finally {
        if (isCurrent()) {
          activeRead.current = null;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [canAccess, canManageCampaigns, filterType, q, queryKey]
  );

  useEffect(() => {
    void load();
    return () => {
      readSequence.current += 1;
      activeRead.current = null;
    };
  }, [load]);

  const loadDestinationOptions = useCallback(async () => {
    if (!canAccess || !canManageCampaigns || !isFacility) return;
    setDestinationOptionsLoading(true);
    setDestinationOptionsError("");
    const [courseResult, commercialCourseResult, liveResult, forumResult] =
      await Promise.allSettled([
        apiRequest("/api/courses"),
        apiRequest("/api/commercial/courses/public"),
        apiRequest("/api/lives"),
        apiRequest("/api/forum/feed/latest", { params: { page: 1 } })
      ]);
    const next = {
      courses: mergeDestinationOptions(
        courseResult.status === "fulfilled"
          ? destinationOptionsFromRecords(
              courseResult.value,
              ["courses", "publishedCourses"],
              ["id", "_id", "courseId", "slug"],
              ["title", "name"],
              ["shortDescription", "category", "status"]
            )
          : [],
        commercialCourseResult.status === "fulfilled"
          ? destinationOptionsFromRecords(
              commercialCourseResult.value,
              ["courses", "commercialCourses"],
              ["id", "_id", "courseId", "slug"],
              ["title", "name"],
              ["shortDescription", "category", "status"]
            )
          : []
      ),
      lives:
        liveResult.status === "fulfilled"
          ? destinationOptionsFromRecords(
              liveResult.value,
              ["lives", "sessions", "liveEvents"],
              ["id", "_id", "sessionId", "liveId"],
              ["title", "name"],
              ["scheduledStart", "startsAt", "status"]
            )
          : [],
      forumThreads:
        forumResult.status === "fulfilled"
          ? destinationOptionsFromRecords(
              forumResult.value,
              ["posts", "threads", "forumPosts"],
              ["id", "_id", "postId", "threadId"],
              ["title", "subject"],
              ["categoryName", "category", "createdAt"]
            )
          : []
    };
    setDestinationOptions(next);
    const optionResults = [courseResult, commercialCourseResult, liveResult, forumResult];
    const failedCount = optionResults.filter(
      (result) => result.status === "rejected"
    ).length;
    if (failedCount) {
      setDestinationOptionsError(
        failedCount === optionResults.length
          ? "Destination choices could not be loaded. Advanced references remain available."
          : "Some destination choices could not be loaded. You can refresh or use an advanced reference."
      );
    }
    setDestinationOptionsLoading(false);
  }, [canAccess, canManageCampaigns, isFacility]);

  useEffect(() => {
    void loadDestinationOptions();
  }, [loadDestinationOptions]);

  useEffect(() => {
    for (const campaign of items) {
      if (
        !campaign.id ||
        hiddenCampaignIds.includes(campaign.id) ||
        recordedImpressions.current.has(campaign.id)
      )
        continue;
      recordedImpressions.current.add(campaign.id);
      void recordFeedCampaignEvent(campaign.id, {
        eventType: "impression",
        placement: "feed"
      }).catch(() => undefined);
    }
  }, [hiddenCampaignIds, items]);

  async function createCampaign() {
    if (!canPublishCampaign || !canManageCampaigns) return;
    setCreating(true);
    setError(null);
    setFeedback("");
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const cleanTags = splitTags(tags);
    const cleanGrowInterests = splitTags(growInterests);
    const cleanLocation = location.trim();
    const cleanExternalUrl = externalLinkUrl.trim();
    const cleanExternalLabel = externalLinkLabel.trim();
    if (isFacility && hasFacilitySalesLanguage([cleanTitle, cleanBody, ...cleanTags])) {
      setCreating(false);
      setFeedback(facilitySalesPolicyText());
      return;
    }
    try {
      await createCommercialFeedCampaign({
        type: isFacility ? "education" : backendTypeForCampaignKind(campaignKind),
        campaignKind,
        authorType: isFacility ? "facility" : "commercial",
        workspaceType: isFacility ? "facility" : "commercial",
        ownerType: isFacility ? "facility" : "commercial",
        facilityId: isFacility ? ent.facilityId || undefined : undefined,
        campaignType: canonicalCampaignType(campaignKind),
        status:
          campaignSchedule.startsAt && new Date(campaignSchedule.startsAt) > new Date()
            ? "scheduled"
            : "active",
        title: cleanTitle,
        body: cleanBody,
        tags: cleanTags,
        growInterests: cleanGrowInterests,
        contentLabels: cannabisSpecific ? ["cannabis"] : [],
        cannabisSpecific,
        location: cleanLocation,
        linkedProductId: linkedProductId.trim() || undefined,
        linkedProductLineId: linkedProductLineId.trim() || undefined,
        linkedCourseId: linkedCourseId.trim() || undefined,
        linkedLiveId: linkedLiveId.trim() || undefined,
        linkedTrialId: linkedGrowId.trim() || undefined,
        linkedGrowId: linkedGrowId.trim() || undefined,
        linkedForumThreadId: linkedForumThreadId.trim() || undefined,
        storefrontSlug: storefrontSlug.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        startsAt: campaignSchedule.startsAt,
        endsAt: campaignSchedule.endsAt,
        reminderPreference: campaignReminder.trim() || undefined,
        recurrenceRule: campaignRecurrence.trim() || undefined,
        externalLinks: cleanExternalUrl
          ? [{ label: cleanExternalLabel || "External link", url: cleanExternalUrl }]
          : undefined,
        placements,
        cta: { label: ctaLabel.trim() || cleanExternalLabel || "Open", kind: "open" }
      });
      setTitle("");
      setBody("");
      setTags("");
      setGrowInterests("");
      setCannabisSpecific(false);
      setLocation("");
      setLinkedProductId("");
      setLinkedProductLineId("");
      setLinkedCourseId("");
      setLinkedLiveId("");
      setLinkedGrowId("");
      setLinkedForumThreadId("");
      setStorefrontSlug("");
      setImageUrl("");
      setExternalLinkUrl("");
      setExternalLinkLabel("");
      setCampaignStart("");
      setCampaignEnd("");
      setCampaignReminder("24 hours before");
      setCampaignRecurrence("");
      setPlacements(isFacility ? ["facility"] : ["feed"]);
      setCtaLabel("Open");
      setFeedback(
        isFacility ? "Facility outreach campaign published." : "Feed campaign published."
      );
      await load({ refresh: true });
    } catch (e) {
      setError(e);
    } finally {
      setCreating(false);
    }
  }

  async function createCampaignSetupTask() {
    if (!readinessWarnings.length || creatingSetupTask || !title.trim()) return;
    if (campaignSchedule.warnings.length) return;
    setCreatingSetupTask(true);
    setError(null);
    setFeedback("");
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: {
          workspaceType: isFacility ? "facility" : "commercial",
          title: `Complete feed campaign setup: ${title.trim()}`,
          description: [
            `Campaign type: ${campaignKindLabels[campaignKind]}.`,
            `Missing setup: ${readinessWarnings.join(", ")}.`
          ].join(" "),
          sourceType: "feed_campaign",
          sourceId: title.trim(),
          sourceObjectId: title.trim(),
          campaignKind,
          campaignTitle: title.trim(),
          linkedProductId: linkedProductId.trim() || undefined,
          linkedProductLineId: linkedProductLineId.trim() || undefined,
          linkedCourseId: linkedCourseId.trim() || undefined,
          linkedLiveId: linkedLiveId.trim() || undefined,
          linkedTrialId: linkedGrowId.trim() || undefined,
          linkedGrowId: linkedGrowId.trim() || undefined,
          linkedForumThreadId: linkedForumThreadId.trim() || undefined,
          linkedStorefrontSlug: storefrontSlug.trim() || undefined,
          growInterests: splitTags(growInterests),
          campaignStartsAt: campaignSchedule.startsAt,
          campaignEndsAt: campaignSchedule.endsAt,
          recurrenceRule: campaignRecurrence.trim() || undefined,
          allDay: true,
          calendarType: `${isFacility ? "facility" : "commercial"}_feed_campaign_setup`,
          sourceStage: `${campaignKind}_campaign_readiness`,
          priority: readinessWarnings.some(
            (warning) =>
              warning.includes("destination") || warning.includes("should link")
          )
            ? "high"
            : "normal",
          status: "open",
          dueAt: campaignStart.trim()
            ? campaignStart.trim().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          reminderPlan: {
            label: campaignReminder.trim() || "24 hours before",
            channels: ["in_app"]
          }
        }
      });
      setFeedback(`Created campaign setup task for ${title.trim()}.`);
    } catch (e) {
      setError(e);
    } finally {
      setCreatingSetupTask(false);
    }
  }

  async function pickCampaignImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback("Photo-library permission is required to attach an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85
    });
    if (result.canceled) return;
    const uri = result.assets.find((asset) => asset.uri)?.uri;
    if (uri) {
      setImageUrl(uri);
      setFeedback("");
    }
  }

  function openCampaignDestination(
    post: CommercialFeedCampaign,
    destination: { label: string; href: string }
  ) {
    void recordCommercialAnalyticsEvent({
      eventType: "feed_campaign_click",
      objectType: "feed_campaign",
      objectId: post.id,
      storefrontSlug: campaignStorefrontSlug(post),
      productId: post.linkedProductId,
      targetUrl: destination.href,
      source: "commercial_feed",
      metadata: {
        campaignKind: post.campaignKind || visibleCampaignType(post),
        destinationLabel: destination.label,
        growInterests: post.growInterests,
        linkedProductLineId: post.linkedProductLineId,
        linkedCourseId: post.linkedCourseId,
        linkedLiveId: post.linkedLiveId,
        linkedForumThreadId: post.linkedForumThreadId,
        linkedTrialId: post.linkedTrialId,
        linkedGrowId: post.linkedGrowId,
        startsAt: post.startsAt,
        endsAt: post.endsAt
      }
    }).catch(() => undefined);
    void recordFeedCampaignEvent(post.id, {
      eventType: "click",
      placement: "feed",
      targetUrl: destination.href,
      growInterests: post.growInterests
    }).catch(() => undefined);
    router.push(destination.href as any);
  }

  function hideCampaign(post: CommercialFeedCampaign) {
    setHiddenCampaignIds((current) => [...new Set([...current, post.id])]);
    void recordFeedCampaignEvent(post.id, {
      eventType: "hide",
      placement: "feed"
    }).catch(() => undefined);
  }

  async function reportCampaign(post: CommercialFeedCampaign) {
    setFeedback("");
    try {
      await submitReport({
        contentType: "commercialPost",
        contentId: post.id,
        contentTitle: post.title || "Feed campaign",
        targetUrl: `/feed?campaignId=${encodeURIComponent(post.id)}`,
        reason: "Reported from Feed by a viewer"
      });
      setHiddenCampaignIds((current) => [...new Set([...current, post.id])]);
      setFeedback("Campaign reported and hidden from this view.");
      void recordFeedCampaignEvent(post.id, {
        eventType: "report",
        placement: "feed",
        reportReason: "viewer_report"
      }).catch(() => undefined);
    } catch (error: any) {
      setFeedback(error?.message || "Unable to submit the campaign report.");
    }
  }

  async function shareCampaign(post: CommercialFeedCampaign) {
    setFeedback("");
    try {
      await sharePublicLink(
        post.title || "GrowPathAI campaign",
        `/feed?campaignId=${encodeURIComponent(post.id)}`,
        {
          description: `${isCannabisCampaign(post) ? "Cannabis content. " : ""}${post.body}`,
          socialPreviewUrl: post.socialPreviewUrl
        }
      );
      setFeedback("Campaign share link is ready.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to share this campaign.");
    }
  }

  if (!ent.ready) return null;
  if (!canAccess) return <Redirect href="/home/personal" />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          colors={[palette.accent]}
          progressBackgroundColor={palette.surface}
          refreshing={refreshing}
          onRefresh={() => void load({ refresh: true })}
          tintColor={palette.accent}
        />
      }
    >
      <BackButton
        fallbackHref={
          initialProduct
            ? "/home/commercial/products"
            : isFacility
              ? "/home/facility/dashboard"
              : "/home/commercial"
        }
        preferFallback={Boolean(initialProduct)}
      />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {isFacility
            ? "Facility Outreach"
            : isCommercial
              ? "Feed / Campaigns"
              : "Campaigns"}
        </Text>
        <Text style={styles.subtitle}>{helper}</Text>
      </View>

      <OwnerFeedCampaignsPanel
        disabled={creating}
        onUnpublished={onCampaignUnpublished}
        onBusyChange={setOwnerCampaignsBusy}
      />

      {!canManageCampaigns ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Promoted Outreach
          </Text>
          <Text style={styles.linkBoxText}>
            Feed placements are advertisements and outreach from commercial and facility
            accounts. Personal grow updates, questions, and replies belong in Forum/Q&A or
            grow logs.
          </Text>
        </View>
      ) : null}

      {canManageCampaigns ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Create Campaign
          </Text>
          {initialProduct ? (
            <Text style={styles.subtitle}>
              Started from {initialProduct.name}. Review this unsaved campaign before
              publishing. The product and its price are unchanged.
            </Text>
          ) : null}
          <Text style={styles.linkBoxText}>
            Feed is advertising and outreach. Link the campaign to a product, course,
            live, storefront, or support Q&A thread. Keep threaded conversation in
            Forum/Q&A.
          </Text>
          <View
            style={styles.chipRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="Campaign type"
          >
            {allowedCampaignKinds.map((option) => (
              <Pressable
                key={option}
                onPress={() => setCampaignKind(option)}
                accessibilityRole="radio"
                aria-checked={campaignKind === option}
                accessibilityState={{ checked: campaignKind === option }}
                accessibilityLabel={`Select ${campaignKindLabels[option]} campaign type`}
                style={[styles.chip, campaignKind === option && styles.chipSelected]}
              >
                <Text
                  style={[
                    styles.chipText,
                    campaignKind === option && styles.chipTextSelected
                  ]}
                >
                  {campaignKindLabels[option]}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholderTextColor={palette.textMuted}
            placeholder={isFacility ? "Educational topic" : "Title"}
            accessibilityLabel="Feed campaign title"
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            style={[styles.input, styles.bodyInput]}
            placeholderTextColor={palette.textMuted}
            placeholder={
              isFacility
                ? "Teach something useful: SOP notes, scouting lesson, compliance tip..."
                : "Campaign message, offer, announcement, or educational promotion"
            }
            multiline
            accessibilityLabel="Feed campaign body"
          />
          <TextInput
            value={tags}
            onChangeText={setTags}
            style={styles.input}
            placeholderTextColor={palette.textMuted}
            placeholder="Tags, comma separated"
            accessibilityLabel="Feed campaign tags"
          />
          <TextInput
            value={growInterests}
            onChangeText={setGrowInterests}
            style={styles.input}
            placeholderTextColor={palette.textMuted}
            placeholder="Grow interests for targeting, comma separated"
            accessibilityLabel="Feed campaign grow interests"
          />
          <Pressable
            accessibilityRole="checkbox"
            aria-checked={cannabisSpecific}
            accessibilityState={{ checked: cannabisSpecific }}
            accessibilityLabel="Mark campaign as cannabis content"
            onPress={() => setCannabisSpecific((current) => !current)}
            style={[styles.chip, cannabisSpecific && styles.chipSelected]}
          >
            <Text style={[styles.chipText, cannabisSpecific && styles.chipTextSelected]}>
              Cannabis content
            </Text>
          </Pressable>
          <TextInput
            value={location}
            onChangeText={setLocation}
            style={styles.input}
            placeholderTextColor={palette.textMuted}
            placeholder="Location (optional)"
            accessibilityLabel="Feed campaign location"
          />
          {canManageCampaigns ? (
            <View style={styles.linkBox}>
              <Text style={styles.linkBoxTitle}>Destination and creative</Text>
              <Text style={styles.linkBoxText}>
                Link a real public destination and add campaign creative. Facility
                outreach can link education, lives, or Forum/Q&A, but cannot publish
                direct sales campaigns.
              </Text>
              {isFacility ? (
                <>
                  <DestinationPickerGroup
                    title="Public courses"
                    kind="Course"
                    options={destinationOptions.courses}
                    selectedId={linkedCourseId}
                    loading={destinationOptionsLoading}
                    onChange={setLinkedCourseId}
                  />
                  <DestinationPickerGroup
                    title="Public live events"
                    kind="Live event"
                    options={destinationOptions.lives}
                    selectedId={linkedLiveId}
                    loading={destinationOptionsLoading}
                    onChange={setLinkedLiveId}
                  />
                  <DestinationPickerGroup
                    title="Forum/Q&A threads"
                    kind="Forum thread"
                    options={destinationOptions.forumThreads}
                    selectedId={linkedForumThreadId}
                    loading={destinationOptionsLoading}
                    onChange={setLinkedForumThreadId}
                  />
                  {destinationOptionsError ? (
                    <Text style={styles.warningText}>{destinationOptionsError}</Text>
                  ) : null}
                  <View style={styles.imageTools}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Refresh campaign destination choices"
                      disabled={destinationOptionsLoading}
                      onPress={loadDestinationOptions}
                      style={[
                        styles.secondaryButton,
                        destinationOptionsLoading ? styles.disabled : null
                      ]}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {destinationOptionsLoading
                          ? "Loading choices..."
                          : "Refresh choices"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${showAdvancedReferences ? "Hide" : "Show"} advanced destination references`}
                      onPress={() => setShowAdvancedReferences((current) => !current)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {showAdvancedReferences
                          ? "Hide advanced references"
                          : "Advanced references"}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
              {!isFacility || showAdvancedReferences ? (
                <View
                  style={
                    isFacility
                      ? styles.advancedReferenceBox
                      : styles.manualReferenceFields
                  }
                >
                  {isFacility ? (
                    <>
                      <Text style={styles.linkBoxTitle}>
                        Advanced destination references
                      </Text>
                      <Text style={styles.linkBoxText}>
                        Use these only when a valid published record is missing from the
                        choices above. The campaign still links to the saved record.
                      </Text>
                    </>
                  ) : null}
                  {!isFacility ? (
                    <>
                      <TextInput
                        value={linkedProductId}
                        onChangeText={setLinkedProductId}
                        style={styles.input}
                        placeholderTextColor={palette.textMuted}
                        placeholder="Linked product ID or slug"
                        autoCapitalize="none"
                        accessibilityLabel="Linked product"
                      />
                      <TextInput
                        value={linkedProductLineId}
                        onChangeText={setLinkedProductLineId}
                        style={styles.input}
                        placeholderTextColor={palette.textMuted}
                        placeholder="Linked product line ID or slug"
                        autoCapitalize="none"
                        accessibilityLabel="Linked product line"
                      />
                    </>
                  ) : null}
                  <TextInput
                    value={linkedCourseId}
                    onChangeText={setLinkedCourseId}
                    style={styles.input}
                    placeholderTextColor={palette.textMuted}
                    placeholder="Linked course ID or slug"
                    autoCapitalize="none"
                    accessibilityLabel="Linked course"
                  />
                  <TextInput
                    value={linkedLiveId}
                    onChangeText={setLinkedLiveId}
                    style={styles.input}
                    placeholderTextColor={palette.textMuted}
                    placeholder="Linked live ID or slug"
                    autoCapitalize="none"
                    accessibilityLabel="Linked live"
                  />
                  {!isFacility ? (
                    <TextInput
                      value={linkedGrowId}
                      onChangeText={setLinkedGrowId}
                      style={styles.input}
                      placeholderTextColor={palette.textMuted}
                      placeholder="Linked evidence run ID"
                      autoCapitalize="none"
                      accessibilityLabel="Linked evidence run"
                    />
                  ) : null}
                  <TextInput
                    value={linkedForumThreadId}
                    onChangeText={setLinkedForumThreadId}
                    style={styles.input}
                    placeholderTextColor={palette.textMuted}
                    placeholder="Linked Forum/Q&A thread ID"
                    autoCapitalize="none"
                    accessibilityLabel="Linked forum thread"
                  />
                  {!isFacility ? (
                    <TextInput
                      value={storefrontSlug}
                      onChangeText={setStorefrontSlug}
                      style={styles.input}
                      placeholderTextColor={palette.textMuted}
                      placeholder="Storefront slug"
                      autoCapitalize="none"
                      accessibilityLabel="Linked storefront slug"
                    />
                  ) : null}
                </View>
              ) : null}
              <TextInput
                value={imageUrl}
                onChangeText={setImageUrl}
                style={styles.input}
                placeholderTextColor={palette.textMuted}
                placeholder="Campaign image URL or uploaded creative"
                autoCapitalize="none"
                accessibilityLabel="Feed campaign image URL"
              />
              <View style={styles.imageTools}>
                <Pressable
                  onPress={pickCampaignImage}
                  accessibilityRole="button"
                  accessibilityLabel="Upload feed campaign image"
                  style={styles.secondaryButton}
                  disabled={creating}
                >
                  <Text style={styles.secondaryButtonText}>Upload image</Text>
                </Pressable>
                {imageUrl ? (
                  <Pressable
                    onPress={() => setImageUrl("")}
                    accessibilityRole="button"
                    accessibilityLabel="Clear feed campaign image"
                    style={styles.secondaryButton}
                    disabled={creating}
                  >
                    <Text style={styles.secondaryButtonText}>Clear image</Text>
                  </Pressable>
                ) : null}
              </View>
              {previewUri ? (
                <Image
                  key={imagePreview.key}
                  source={{ uri: previewUri }}
                  onLoad={imagePreview.onLoad}
                  onError={imagePreview.onError}
                  style={styles.postImagePreview}
                  resizeMode="cover"
                  accessibilityLabel="Feed campaign image preview"
                />
              ) : null}
              {previewUri && imagePreview.status === "failed" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry campaign image preview"
                  disabled={creating}
                  onPress={imagePreview.retry}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Retry image preview</Text>
                </Pressable>
              ) : null}
              {readinessWarnings.length ? (
                <View style={styles.warningBox}>
                  {readinessWarnings.map((warning) => (
                    <Text key={warning} style={styles.warningText}>
                      {warning}
                    </Text>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create feed campaign setup task"
                    disabled={
                      creatingSetupTask ||
                      !title.trim() ||
                      campaignSchedule.warnings.length > 0
                    }
                    accessibilityState={{
                      disabled:
                        creatingSetupTask ||
                        !title.trim() ||
                        campaignSchedule.warnings.length > 0
                    }}
                    onPress={createCampaignSetupTask}
                    style={[
                      styles.secondaryButton,
                      creatingSetupTask ||
                      !title.trim() ||
                      campaignSchedule.warnings.length > 0
                        ? styles.disabled
                        : null
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {creatingSetupTask ? "Creating..." : "Create Task"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.readyText}>
                  Campaign has destination and creative.
                </Text>
              )}
              <View style={styles.twoColumn}>
                <TextInput
                  value={ctaLabel}
                  onChangeText={setCtaLabel}
                  style={[styles.input, styles.columnInput]}
                  placeholderTextColor={palette.textMuted}
                  placeholder="CTA label"
                  accessibilityLabel="Campaign CTA label"
                />
                <TextInput
                  value={externalLinkLabel}
                  onChangeText={setExternalLinkLabel}
                  style={[styles.input, styles.columnInput]}
                  placeholderTextColor={palette.textMuted}
                  placeholder="External link label"
                  accessibilityLabel="External link label"
                />
                <TextInput
                  value={externalLinkUrl}
                  onChangeText={setExternalLinkUrl}
                  style={[styles.input, styles.columnInput]}
                  placeholderTextColor={palette.textMuted}
                  placeholder="https://..."
                  autoCapitalize="none"
                  accessibilityLabel="External link URL"
                />
              </View>
              <View style={styles.linkBox}>
                <Text style={styles.linkBoxTitle}>Audience and placements</Text>
                <Text style={styles.linkBoxText}>
                  Grow interests above tune relevance. Select where this campaign is
                  eligible to appear; All Feed placements keeps it broadly eligible.
                </Text>
                <View
                  style={styles.chipRow}
                  role="group"
                  accessibilityLabel="Campaign placements"
                >
                  {PLACEMENT_OPTIONS.filter(
                    (option) => !isFacility || option !== "commercial"
                  ).map((option) => {
                    const selected = placements.includes(option);
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="checkbox"
                        aria-checked={selected}
                        accessibilityState={{ checked: selected }}
                        onPress={() =>
                          setPlacements((current) =>
                            selected
                              ? current.filter((value) => value !== option)
                              : [...current, option]
                          )
                        }
                        accessibilityLabel={`${selected ? "Remove" : "Add"} ${placementLabels[option]} placement`}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text
                          style={[styles.chipText, selected && styles.chipTextSelected]}
                        >
                          {placementLabels[option]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.linkBox}>
                <Text style={styles.linkBoxTitle}>Campaign schedule</Text>
                <Text style={styles.linkBoxText}>
                  Schedule launch timing, reminders, and recurring outreach using the
                  shared GrowPath scheduler.
                </Text>
                <SchedulePicker
                  dateTime
                  localDateTimeQuickDates
                  timezone={campaignTimeZone}
                  dueDate={campaignStart}
                  reminder={campaignReminder}
                  recurrence={campaignRecurrence}
                  onDueDateChange={setCampaignStart}
                  onReminderChange={setCampaignReminder}
                  onRecurrenceChange={setCampaignRecurrence}
                  accessibilityPrefix="Feed campaign schedule"
                  dueDateAccessibilityLabel="Feed campaign schedule start"
                  reminderAccessibilityLabel="Feed campaign reminder"
                  recurrenceAccessibilityLabel="Feed campaign recurrence"
                  dueDatePlaceholder="Campaign start date/time"
                  reminderPlaceholder="Campaign reminder"
                  recurrencePlaceholder="Campaign recurrence"
                />
                <CalendarDateField
                  mode="datetime"
                  timeZoneLabel={campaignTimeZone}
                  label="Campaign end"
                  value={campaignEnd}
                  onChange={setCampaignEnd}
                  placeholder="Choose campaign end date and time"
                  accessibilityLabel="Feed campaign schedule end"
                />
              </View>
            </View>
          ) : null}
          <View style={styles.reviewBox} accessibilityLabel="Campaign review">
            <Text style={styles.linkBoxTitle}>Review before publishing</Text>
            <Text style={styles.linkBoxText}>
              {campaignKindLabels[campaignKind]} · {placements.length} placement
              {placements.length === 1 ? "" : "s"} · {splitTags(growInterests).length}{" "}
              grow interest{splitTags(growInterests).length === 1 ? "" : "s"}
            </Text>
            <Text style={styles.linkBoxText}>
              CTA: {ctaLabel.trim() || externalLinkLabel.trim() || "Open"} · Will publish
              as:{" "}
              {campaignSchedule.startsAt &&
              new Date(campaignSchedule.startsAt) > new Date()
                ? "Scheduled"
                : "Active"}
              {cannabisSpecific ? " · Marked cannabis content" : ""}
            </Text>
            {readinessWarnings.length ? (
              <Text style={styles.warningText}>
                Publishing blocked: {readinessWarnings.join(" ")}
              </Text>
            ) : (
              <Text style={styles.readyText}>Ready to publish.</Text>
            )}
          </View>
          <Pressable
            onPress={createCampaign}
            disabled={!canPublishCampaign}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPublishCampaign }}
            accessibilityLabel={
              isFacility ? "Publish facility outreach" : "Publish feed campaign"
            }
            style={[styles.primaryButton, !canPublishCampaign && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>
              {creating
                ? "Publishing..."
                : isFacility
                  ? "Publish Outreach"
                  : "Publish Campaign"}
            </Text>
          </Pressable>
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </View>
      ) : null}

      {error ? <InlineError error={error} /> : null}

      {canManageCampaigns && hasLoadedQuery && analytics ? (
        <View style={styles.card} accessibilityLabel="Feed campaign analytics">
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Campaign Analytics
          </Text>
          <View style={styles.metricRow}>
            {[
              ["Impressions", analytics.totals.impressions],
              ["Clicks", analytics.totals.clicks],
              ["Conversions", analytics.totals.conversions],
              ["Hidden", analytics.totals.hides],
              ["Reports", analytics.totals.reports]
            ].map(([label, value]) => (
              <View key={String(label)} style={styles.metricCard}>
                <Text style={styles.metricValue}>{String(value)}</Text>
                <Text style={styles.metricLabel}>{label}</Text>
              </View>
            ))}
          </View>
          {analytics.placements.slice(0, 4).map((row) => (
            <Text key={`placement-${row.key}`} style={styles.linkBoxText}>
              {placementLabels[row.key as FeedCampaignPlacement] || row.key}:{" "}
              {row.impressions} impressions {" · "}
              {row.clicks} clicks {" · "}
              {row.conversions} conversions
            </Text>
          ))}
          {analytics.growInterests.slice(0, 4).map((row) => (
            <Text key={`interest-${row.key}`} style={styles.linkBoxText}>
              Grow interest {row.key}: {row.impressions} impressions {" · "}
              {row.clicks} clicks
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.filters}>
        <Text accessibilityRole="header" aria-level={2} style={styles.filterLabel}>
          Filter
        </Text>
        <View
          style={styles.chipRow}
          accessibilityRole="radiogroup"
          accessibilityLabel="Campaign filters"
        >
          {CAMPAIGN_FILTERS.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setFilterType(value)}
              accessibilityRole="radio"
              aria-checked={filterType === value}
              accessibilityState={{ checked: filterType === value }}
              accessibilityLabel={`Filter campaigns by ${label}`}
              style={[styles.chip, filterType === value && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, filterType === value && styles.chipTextSelected]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholderTextColor={palette.textMuted}
          placeholder="Search campaigns"
          autoCapitalize="none"
          accessibilityLabel="Search campaigns"
        />
        <Pressable
          onPress={() => void load({ refresh: true })}
          disabled={loading || refreshing}
          accessibilityRole="button"
          accessibilityLabel={loadError ? "Retry campaigns" : "Refresh campaigns"}
          accessibilityState={{ disabled: loading || refreshing }}
          style={[styles.chip, (loading || refreshing) && styles.disabled]}
        >
          <Text style={styles.chipText}>
            {refreshing
              ? "Refreshing campaigns..."
              : loadError
                ? "Retry campaigns"
                : "Refresh campaigns"}
          </Text>
        </Pressable>
      </View>

      {loadError ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Unable to load campaigns
          </Text>
          <InlineError error={loadError} />
          <Text style={styles.muted}>
            {hasLoadedQuery
              ? "Showing previously loaded campaign results. Retry to check for updates."
              : "Campaign results are unavailable. Retry to load this view."}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.muted}>Loading feed...</Text>
        </View>
      ) : null}

      {hasLoadedQuery && !loading && !refreshing && !loadError && items.length === 0 ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            {filterType !== "all" || q.trim()
              ? "No matching campaigns"
              : "No campaigns yet"}
          </Text>
          <Text style={styles.muted}>
            {filterType !== "all" || q.trim()
              ? "Try a different search or filter."
              : canManageCampaigns
                ? `Publish the first ${isFacility ? "facility outreach" : "feed campaign"}.`
                : "Campaigns will appear here when available."}
          </Text>
        </View>
      ) : null}

      {(hasLoadedQuery ? items : [])
        .filter((post) => !hiddenCampaignIds.includes(post.id))
        .map((post) => {
          const destination = campaignDestination(post);
          const images = campaignImages(post);
          const isCampaignFocused = Boolean(
            focusedCampaignId && focusedCampaignId === post.id
          );
          const isLiveFocused = Boolean(
            focusedLiveId && focusedLiveId === String(post.linkedLiveId || "")
          );
          const isFocused = isCampaignFocused || isLiveFocused;
          return (
            <View
              key={post.id}
              accessibilityLabel={
                isCampaignFocused
                  ? `Selected feed campaign ${post.id}`
                  : isLiveFocused
                    ? `Selected feed live ${focusedLiveId}`
                    : undefined
              }
              style={[styles.post, isFocused ? styles.postFocused : null]}
            >
              <View style={styles.postHeader}>
                <Text style={styles.typePill}>{visibleCampaignType(post)}</Text>
                {isCannabisCampaign(post) ? (
                  <Text style={styles.typePill}>Cannabis content</Text>
                ) : null}
                <Text style={styles.engagements}>
                  {campaignEngagementCount(post)} campaign engagements
                </Text>
              </View>
              <Text style={styles.postTitle}>{post.title || "Feed campaign"}</Text>
              {images[0] ? (
                <Image
                  source={{ uri: images[0] }}
                  style={styles.feedImage}
                  resizeMode="cover"
                  accessibilityLabel={`${post.title || "Feed campaign"} image`}
                />
              ) : null}
              {images.length > 1 ? (
                <View
                  accessibilityLabel={`${post.title || "Feed campaign"} photo gallery`}
                  style={styles.feedGallery}
                >
                  {images.slice(1).map((url, imageIndex) => (
                    <Image
                      key={url}
                      source={{ uri: url }}
                      style={styles.feedGalleryImage}
                      resizeMode="cover"
                      accessibilityLabel={`${post.title || "Feed campaign"} supplemental photo ${imageIndex + 2}`}
                    />
                  ))}
                </View>
              ) : null}
              <Text style={styles.postBody}>{post.body}</Text>
              {post.tags.length ? (
                <Text style={styles.tags}>
                  {post.tags.map((tag) => `#${tag}`).join(" ")}
                </Text>
              ) : null}
              {post.growInterests.length ? (
                <Text style={styles.interests}>
                  Interests: {post.growInterests.join(", ")}
                </Text>
              ) : null}
              {post.linkedProductId ||
              post.linkedProductLineId ||
              post.linkedCourseId ||
              post.linkedLiveId ||
              campaignEvidenceRunId(post) ||
              post.linkedForumThreadId ||
              campaignStorefrontSlug(post) ||
              post.startsAt ||
              post.endsAt ||
              post.externalLinks?.length ? (
                <View style={styles.linkMetaRow}>
                  {post.linkedProductId ? (
                    <Text style={styles.linkMeta}>Product: {post.linkedProductId}</Text>
                  ) : null}
                  {post.linkedProductLineId ? (
                    <Text style={styles.linkMeta}>
                      Product line: {post.linkedProductLineId}
                    </Text>
                  ) : null}
                  {post.linkedCourseId ? (
                    <Text style={styles.linkMeta}>Course: {post.linkedCourseId}</Text>
                  ) : null}
                  {post.linkedLiveId ? (
                    <Text style={styles.linkMeta}>Live: {post.linkedLiveId}</Text>
                  ) : null}
                  {campaignEvidenceRunId(post) ? (
                    <Text style={styles.linkMeta}>
                      Evidence run: {campaignEvidenceRunId(post)}
                    </Text>
                  ) : null}
                  {post.linkedForumThreadId ? (
                    <Text style={styles.linkMeta}>
                      Forum/Q&A: {post.linkedForumThreadId}
                    </Text>
                  ) : null}
                  {campaignStorefrontSlug(post) ? (
                    <Text style={styles.linkMeta}>
                      Store: {campaignStorefrontSlug(post)}
                    </Text>
                  ) : null}
                  {post.startsAt ? (
                    <Text style={styles.linkMeta}>Starts: {post.startsAt}</Text>
                  ) : null}
                  {post.endsAt ? (
                    <Text style={styles.linkMeta}>Ends: {post.endsAt}</Text>
                  ) : null}
                  {post.externalLinks?.map((link) => (
                    <Text key={`${link.label}-${link.url}`} style={styles.linkMeta}>
                      {link.label}: {link.url}
                    </Text>
                  ))}
                </View>
              ) : null}
              {destination ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${destination.label} for ${post.title || "campaign"}`}
                  onPress={() => openCampaignDestination(post, destination)}
                  style={styles.ctaButton}
                >
                  <Text style={styles.ctaButtonText}>{destination.label}</Text>
                </Pressable>
              ) : null}
              <View style={styles.imageTools}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${post.title || "campaign"}`}
                  onPress={() => void shareCampaign(post)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Share</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Hide ${post.title || "campaign"}`}
                  onPress={() => hideCampaign(post)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Hide</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Report ${post.title || "campaign"}`}
                  onPress={() => void reportCampaign(post)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Report</Text>
                </Pressable>
              </View>
              <Text style={styles.meta}>{campaignMeta(post)}</Text>
            </View>
          );
        })}
    </ScrollView>
  );
}

export const createFeedCampaignStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.page,
      gap: 12,
      padding: 16,
      paddingBottom: 32
    },
    header: { gap: 5 },
    title: { color: palette.text, fontSize: 25, fontWeight: "900" },
    subtitle: {
      color: palette.textMuted,
      fontWeight: "700",
      lineHeight: 21,
      maxWidth: 860
    },
    card: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    metricCard: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      minWidth: 105,
      padding: 10
    },
    metricValue: { color: palette.text, fontSize: 20, fontWeight: "900" },
    metricLabel: { color: palette.textMuted, fontSize: 11, fontWeight: "800" },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    bodyInput: { minHeight: 110, textAlignVertical: "top" },
    linkBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 10
    },
    linkBoxTitle: { color: palette.text, fontWeight: "900" },
    linkBoxText: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 18
    },
    destinationGroup: { gap: 7, marginTop: 4 },
    destinationTitle: { color: palette.text, fontSize: 13, fontWeight: "900" },
    destinationLoading: { alignItems: "center", flexDirection: "row", gap: 8 },
    destinationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    destinationCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 180,
      paddingHorizontal: 11,
      paddingVertical: 9
    },
    destinationCardSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    destinationCardTitle: { color: palette.text, fontWeight: "900" },
    destinationCardTitleSelected: { color: palette.accentText },
    destinationCardDetail: { color: palette.textMuted, fontSize: 11, marginTop: 3 },
    destinationCardDetailSelected: { color: palette.accentText },
    emptyDestinationText: { color: palette.textMuted, fontSize: 12, fontStyle: "italic" },
    selectedDestinationText: { color: palette.link, fontSize: 12, fontWeight: "900" },
    advancedReferenceBox: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 10
    },
    manualReferenceFields: { gap: 8 },
    imageTools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    secondaryButton: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    postImagePreview: {
      width: "100%",
      maxWidth: 520,
      aspectRatio: 16 / 7,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceStrong
    },
    warningBox: { gap: 4 },
    warningText: { color: palette.warning, fontSize: 12, fontWeight: "800" },
    readyText: { color: palette.link, fontSize: 12, fontWeight: "900" },
    reviewBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 6,
      padding: 10
    },
    twoColumn: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    columnInput: { flex: 1, minWidth: 180 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 7
    },
    chipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    chipText: { color: palette.text, fontWeight: "800", textTransform: "capitalize" },
    chipTextSelected: { color: palette.accentText },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.55 },
    feedback: { color: palette.link, fontWeight: "800" },
    filters: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      padding: 12
    },
    filterLabel: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    loading: { alignItems: "center", gap: 8, paddingVertical: 20 },
    muted: { color: palette.textMuted, fontWeight: "700", lineHeight: 20 },
    post: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 7,
      padding: 14
    },
    postFocused: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderWidth: 2
    },
    postHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between"
    },
    typePill: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    engagements: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    postTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    feedImage: {
      width: "100%",
      maxWidth: 640,
      aspectRatio: 16 / 7,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceStrong
    },
    feedGallery: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    feedGalleryImage: {
      width: 112,
      height: 84,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceStrong
    },
    postBody: { color: palette.textMuted, fontWeight: "600", lineHeight: 21 },
    tags: { color: palette.link, fontSize: 12, fontWeight: "800" },
    interests: { color: palette.link, fontSize: 12, fontWeight: "800" },
    linkMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    linkMeta: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: 999,
      color: palette.link,
      fontSize: 12,
      fontWeight: "800",
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    ctaButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    ctaButtonText: { color: palette.accentText, fontWeight: "900" },
    meta: { color: palette.textMuted, fontSize: 12, fontWeight: "700" }
  });
