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
import { recordCommercialAnalyticsEvent } from "@/api/commercialAnalytics";
import { InlineError } from "@/components/InlineError";
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
import SchedulePicker from "@/components/schedule/SchedulePicker";
import {
  facilitySalesPolicyText,
  hasFacilitySalesLanguage
} from "@/utils/commercialFeedPolicy";
import { resolveImageUri } from "@/utils/photoUploads";
import { radius } from "@/theme/theme";

const COMMERCIAL_TYPES: CommercialFeedCampaignType[] = [
  "update",
  "listing",
  "drop",
  "education"
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
  campaignStart,
  campaignEnd,
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
  campaignStart: string;
  campaignEnd: string;
  placements: FeedCampaignPlacement[];
}) {
  const warnings: string[] = [];
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
  const start = campaignStart.trim() ? new Date(campaignStart.trim()) : null;
  const end = campaignEnd.trim() ? new Date(campaignEnd.trim()) : null;
  if (start && Number.isNaN(start.getTime())) {
    warnings.push("Campaign start date is invalid.");
  }
  if (end && Number.isNaN(end.getTime())) {
    warnings.push("Campaign end date is invalid.");
  }
  if (
    start &&
    end &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end <= start
  ) {
    warnings.push("Campaign end must be after its start.");
  }
  if (!placements.length) {
    warnings.push("Select at least one campaign placement.");
  }
  return warnings;
}

function authorLabel(post: CommercialFeedCampaign) {
  if (post.author?.displayName || post.author?.email) {
    return post.author.displayName || post.author.email || "";
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
  return resolveImageUri(
    post.imageUrl || post.creativeImageUrl || post.bannerImageUrl || ""
  );
}

function visibleCampaignType(post: CommercialFeedCampaign) {
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
  const selected = options.find((option) => option.id === selectedId);
  return (
    <View style={styles.destinationGroup} accessibilityLabel={`${title} destinations`}>
      <Text style={styles.destinationTitle}>{title}</Text>
      {loading ? (
        <View style={styles.destinationLoading}>
          <ActivityIndicator size="small" />
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
  const router = useRouter();
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
  const canManageCampaigns = isCommercial || isFacility;
  const allowedTypes = isFacility ? FACILITY_TYPES : COMMERCIAL_TYPES;
  const allowedCampaignKinds = isFacility
    ? FACILITY_CAMPAIGN_KINDS
    : COMMERCIAL_CAMPAIGN_KINDS;

  const [items, setItems] = useState<CommercialFeedCampaign[]>([]);
  const [type, setType] = useState<CommercialFeedCampaignType>(allowedTypes[0]);
  const [campaignKind, setCampaignKind] = useState<CampaignKind>(allowedCampaignKinds[0]);
  const [filterType, setFilterType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [growInterests, setGrowInterests] = useState("");
  const [location, setLocation] = useState("");
  const [linkedProductId, setLinkedProductId] = useState("");
  const [linkedProductLineId, setLinkedProductLineId] = useState("");
  const [linkedCourseId, setLinkedCourseId] = useState("");
  const [linkedLiveId, setLinkedLiveId] = useState("");
  const [linkedGrowId, setLinkedGrowId] = useState("");
  const [linkedForumThreadId, setLinkedForumThreadId] = useState("");
  const [storefrontSlug, setStorefrontSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalLinkUrl, setExternalLinkUrl] = useState("");
  const [externalLinkLabel, setExternalLinkLabel] = useState("");
  const [campaignStart, setCampaignStart] = useState("");
  const [campaignEnd, setCampaignEnd] = useState("");
  const [campaignReminder, setCampaignReminder] = useState("24 hours before");
  const [campaignRecurrence, setCampaignRecurrence] = useState("");
  const [placements, setPlacements] = useState<FeedCampaignPlacement[]>(
    isFacility ? ["facility"] : ["feed"]
  );
  const [ctaLabel, setCtaLabel] = useState("Open");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingSetupTask, setCreatingSetupTask] = useState(false);
  const [error, setError] = useState<any>(null);
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
    campaignStart,
    campaignEnd,
    placements
  });
  const canCreate =
    canManageCampaigns && title.trim().length > 0 && body.trim().length > 0 && !creating;
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
      if (!canAccess) return;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await listCommercialFeedCampaigns({
          type: filterType,
          q: q.trim(),
          limit: 30
        });
        setItems(res.items);
        if (canManageCampaigns) {
          try {
            const campaignAnalytics = await fetchFeedCampaignAnalytics();
            setAnalytics(campaignAnalytics);
          } catch {
            setAnalytics(null);
          }
        }
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canAccess, canManageCampaigns, filterType, q]
  );

  useEffect(() => {
    void load();
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
          campaignStart.trim() && new Date(campaignStart.trim()) > new Date()
            ? "scheduled"
            : "active",
        title: cleanTitle,
        body: cleanBody,
        tags: cleanTags,
        growInterests: cleanGrowInterests,
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
        startsAt: campaignStart.trim() || undefined,
        endsAt: campaignEnd.trim() || undefined,
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
          campaignStartsAt: campaignStart.trim() || undefined,
          campaignEndsAt: campaignEnd.trim() || undefined,
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

  function reportCampaign(post: CommercialFeedCampaign) {
    setHiddenCampaignIds((current) => [...new Set([...current, post.id])]);
    setFeedback("Campaign reported and hidden from this view.");
    void recordFeedCampaignEvent(post.id, {
      eventType: "report",
      placement: "feed",
      reportReason: "viewer_report"
    }).catch(() => undefined);
  }

  if (!ent.ready) return null;
  if (!canAccess) return <Redirect href="/home/personal" />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load({ refresh: true })}
        />
      }
    >
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

      {!canManageCampaigns ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Promoted Outreach</Text>
          <Text style={styles.linkBoxText}>
            Feed placements are advertisements and outreach from commercial and facility
            accounts. Personal grow updates, questions, and replies belong in Forum/Q&A or
            grow logs.
          </Text>
        </View>
      ) : null}

      {canManageCampaigns ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Campaign</Text>
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
            placeholder={isFacility ? "Educational topic" : "Title"}
            accessibilityLabel="Feed campaign title"
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            style={[styles.input, styles.bodyInput]}
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
            placeholder="Tags, comma separated"
            accessibilityLabel="Feed campaign tags"
          />
          <TextInput
            value={growInterests}
            onChangeText={setGrowInterests}
            style={styles.input}
            placeholder="Grow interests for targeting, comma separated"
            accessibilityLabel="Feed campaign grow interests"
          />
          <TextInput
            value={location}
            onChangeText={setLocation}
            style={styles.input}
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
                        placeholder="Linked product ID or slug"
                        autoCapitalize="none"
                        accessibilityLabel="Linked product"
                      />
                      <TextInput
                        value={linkedProductLineId}
                        onChangeText={setLinkedProductLineId}
                        style={styles.input}
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
                    placeholder="Linked course ID or slug"
                    autoCapitalize="none"
                    accessibilityLabel="Linked course"
                  />
                  <TextInput
                    value={linkedLiveId}
                    onChangeText={setLinkedLiveId}
                    style={styles.input}
                    placeholder="Linked live ID or slug"
                    autoCapitalize="none"
                    accessibilityLabel="Linked live"
                  />
                  {!isFacility ? (
                    <TextInput
                      value={linkedGrowId}
                      onChangeText={setLinkedGrowId}
                      style={styles.input}
                      placeholder="Linked evidence run ID"
                      autoCapitalize="none"
                      accessibilityLabel="Linked evidence run"
                    />
                  ) : null}
                  <TextInput
                    value={linkedForumThreadId}
                    onChangeText={setLinkedForumThreadId}
                    style={styles.input}
                    placeholder="Linked Forum/Q&A thread ID"
                    autoCapitalize="none"
                    accessibilityLabel="Linked forum thread"
                  />
                  {!isFacility ? (
                    <TextInput
                      value={storefrontSlug}
                      onChangeText={setStorefrontSlug}
                      style={styles.input}
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
              {imageUrl ? (
                <Image
                  source={{ uri: resolveImageUri(imageUrl) }}
                  style={styles.postImagePreview}
                  resizeMode="cover"
                  accessibilityLabel="Feed campaign image preview"
                />
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
                    disabled={creatingSetupTask || !title.trim()}
                    onPress={createCampaignSetupTask}
                    style={[
                      styles.secondaryButton,
                      creatingSetupTask || !title.trim() ? styles.disabled : null
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
                  placeholder="CTA label"
                  accessibilityLabel="Campaign CTA label"
                />
                <TextInput
                  value={externalLinkLabel}
                  onChangeText={setExternalLinkLabel}
                  style={[styles.input, styles.columnInput]}
                  placeholder="External link label"
                  accessibilityLabel="External link label"
                />
                <TextInput
                  value={externalLinkUrl}
                  onChangeText={setExternalLinkUrl}
                  style={[styles.input, styles.columnInput]}
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
                  accessibilityRole="group"
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
                <TextInput
                  value={campaignEnd}
                  onChangeText={setCampaignEnd}
                  style={styles.input}
                  placeholder="Campaign end date/time"
                  autoCapitalize="none"
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
              CTA: {ctaLabel.trim() || externalLinkLabel.trim() || "Open"} · Status:{" "}
              {campaignStart.trim() && new Date(campaignStart.trim()) > new Date()
                ? "scheduled"
                : "active"}
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

      {canManageCampaigns && analytics ? (
        <View style={styles.card} accessibilityLabel="Feed campaign analytics">
          <Text style={styles.cardTitle}>Campaign Analytics</Text>
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
        <Text style={styles.filterLabel}>Filter</Text>
        <View
          style={styles.chipRow}
          accessibilityRole="radiogroup"
          accessibilityLabel="Campaign filters"
        >
          {["all", ...COMMERCIAL_TYPES].map((option) => (
            <Pressable
              key={option}
              onPress={() => setFilterType(option)}
              accessibilityRole="radio"
              aria-checked={filterType === option}
              accessibilityState={{ checked: filterType === option }}
              accessibilityLabel={`Filter feed by ${option}`}
              style={[styles.chip, filterType === option && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  filterType === option && styles.chipTextSelected
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholder="Search campaigns"
          autoCapitalize="none"
          accessibilityLabel="Search campaigns"
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading feed...</Text>
        </View>
      ) : null}

      {!loading && items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No campaigns yet</Text>
          <Text style={styles.muted}>
            Publish the first {isFacility ? "facility outreach" : "feed campaign"}.
          </Text>
        </View>
      ) : null}

      {items
        .filter((post) => !hiddenCampaignIds.includes(post.id))
        .map((post) => {
          const destination = campaignDestination(post);
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
                <Text style={styles.engagements}>
                  {campaignEngagementCount(post)} campaign engagements
                </Text>
              </View>
              <Text style={styles.postTitle}>{post.title || "Feed campaign"}</Text>
              {campaignImage(post) ? (
                <Image
                  source={{ uri: campaignImage(post) }}
                  style={styles.feedImage}
                  resizeMode="cover"
                  accessibilityLabel={`${post.title || "Feed campaign"} image`}
                />
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
                  accessibilityLabel={`Hide ${post.title || "campaign"}`}
                  onPress={() => hideCampaign(post)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Hide</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Report ${post.title || "campaign"}`}
                  onPress={() => reportCampaign(post)}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    gap: 12,
    padding: 16,
    paddingBottom: 32
  },
  header: { gap: 5 },
  title: { color: "#0F172A", fontSize: 25, fontWeight: "900" },
  subtitle: { color: "#475569", fontWeight: "700", lineHeight: 21, maxWidth: 860 },
  card: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  cardTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: {
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    minWidth: 105,
    padding: 10
  },
  metricValue: { color: "#0F172A", fontSize: 20, fontWeight: "900" },
  metricLabel: { color: "#64748B", fontSize: 11, fontWeight: "800" },
  input: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  bodyInput: { minHeight: 110, textAlignVertical: "top" },
  linkBox: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  linkBoxTitle: { color: "#0F172A", fontWeight: "900" },
  linkBoxText: { color: "#64748B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  destinationGroup: { gap: 7, marginTop: 4 },
  destinationTitle: { color: "#334155", fontSize: 13, fontWeight: "900" },
  destinationLoading: { alignItems: "center", flexDirection: "row", gap: 8 },
  destinationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  destinationCard: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 180,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  destinationCardSelected: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  destinationCardTitle: { color: "#0F172A", fontWeight: "900" },
  destinationCardTitleSelected: { color: "white" },
  destinationCardDetail: { color: "#64748B", fontSize: 11, marginTop: 3 },
  destinationCardDetailSelected: { color: "#CCFBF1" },
  emptyDestinationText: { color: "#64748B", fontSize: 12, fontStyle: "italic" },
  selectedDestinationText: { color: "#0F766E", fontSize: 12, fontWeight: "900" },
  advancedReferenceBox: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  manualReferenceFields: { gap: 8 },
  imageTools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryButtonText: { color: "#0F172A", fontWeight: "800" },
  postImagePreview: {
    width: "100%",
    maxWidth: 520,
    aspectRatio: 16 / 7,
    borderRadius: radius.card,
    backgroundColor: "#E2E8F0"
  },
  warningBox: { gap: 4 },
  warningText: { color: "#92400E", fontSize: 12, fontWeight: "800" },
  readyText: { color: "#166534", fontSize: 12, fontWeight: "900" },
  reviewBox: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    padding: 10
  },
  twoColumn: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  columnInput: { flex: 1, minWidth: 180 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  chipSelected: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  chipText: { color: "#0F172A", fontWeight: "800", textTransform: "capitalize" },
  chipTextSelected: { color: "white" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingVertical: 12
  },
  primaryButtonText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  feedback: { color: "#166534", fontWeight: "800" },
  filters: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 9,
    padding: 12
  },
  filterLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  loading: { alignItems: "center", gap: 8, paddingVertical: 20 },
  muted: { color: "#64748B", fontWeight: "700", lineHeight: 20 },
  post: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 7,
    padding: 14
  },
  postFocused: {
    backgroundColor: "#ECFDF5",
    borderColor: "#16A34A",
    borderWidth: 2
  },
  postHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  typePill: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  engagements: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  postTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  feedImage: {
    width: "100%",
    maxWidth: 640,
    aspectRatio: 16 / 7,
    borderRadius: radius.card,
    backgroundColor: "#E2E8F0"
  },
  postBody: { color: "#334155", fontWeight: "600", lineHeight: 21 },
  tags: { color: "#2563EB", fontSize: 12, fontWeight: "800" },
  interests: { color: "#047857", fontSize: 12, fontWeight: "800" },
  linkMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  linkMeta: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    color: "#3730A3",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  ctaButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#0F766E",
    borderRadius: radius.card,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  ctaButtonText: { color: "white", fontWeight: "900" },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "700" }
});
