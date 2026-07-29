import { apiRequest } from "./apiRequest";
import { persistImageUri } from "@/utils/photoUploads";

export type CommercialFeedCampaignType = "listing" | "drop" | "update" | "education";

export type CommercialFeedPostType = CommercialFeedCampaignType | "iso" | "question";

export type CommercialFeedCampaign = {
  id: string;
  campaignId?: string;
  feedCampaignId?: string;
  linkedFeedCampaignId?: string;
  linkedFeedPostId?: string;
  type: CommercialFeedPostType;
  campaignKind?: string;
  authorType?: string;
  workspaceType?: string;
  ownerType?: "commercial" | "facility";
  facilityId?: string;
  campaignType?: "product" | "course" | "live" | "storefront" | "facility" | "general";
  status?: "draft" | "scheduled" | "active" | "paused" | "ended" | "cancelled";
  title?: string;
  body: string;
  tags: string[];
  growInterests: string[];
  location?: string;
  linkedProductId?: string;
  linkedProductLineId?: string;
  linkedCourseId?: string;
  linkedLiveId?: string;
  linkedTrialId?: string;
  linkedGrowId?: string;
  linkedForumThreadId?: string;
  storefrontSlug?: string;
  linkedStorefrontSlug?: string;
  brandSlug?: string;
  publicSlug?: string;
  imageUrl?: string;
  creativeImageUrl?: string;
  bannerImageUrl?: string;
  startsAt?: string;
  endsAt?: string;
  reminderPreference?: string;
  recurrenceRule?: string;
  externalLinks?: Array<{ label: string; url: string }>;
  placements?: FeedCampaignPlacement[];
  destination?: { type?: string; id?: string; url?: string; label?: string };
  cta?: { label?: string; kind?: string };
  engagementCount?: number;
  likeCount?: number;
  commentCount?: number;
  clickCount?: number;
  promotionCount?: number;
  relevanceScore?: number;
  createdAt?: string;
  author?: {
    displayName?: string;
    email?: string;
    plan?: string;
  } | null;
};

/**
 * Compatibility alias for older callers. New Feed/Campaigns code should use
 * CommercialFeedCampaign so Feed remains outreach/campaign language.
 */
export type CommercialFeedPost = CommercialFeedCampaign;

export type FeedCampaignPlacement =
  | "feed"
  | "home_hero"
  | "home_top"
  | "home_middle"
  | "home_bottom"
  | "page_top"
  | "page_middle"
  | "page_bottom"
  | "course"
  | "tool"
  | "forum"
  | "product"
  | "facility"
  | "commercial";

export type FeedCampaignMetricCounts = {
  impressions: number;
  clicks: number;
  conversions: number;
  hides: number;
  reports: number;
};

export type FeedCampaignAnalytics = {
  totals: FeedCampaignMetricCounts;
  campaigns: Array<
    FeedCampaignMetricCounts & {
      key: string;
      title: string;
      campaignType: string;
    }
  >;
  placements: Array<FeedCampaignMetricCounts & { key: string }>;
  growInterests: Array<FeedCampaignMetricCounts & { key: string }>;
};

function normalizeCampaign(row: any): CommercialFeedCampaign {
  return {
    ...row,
    id: String(
      row?.id ||
        row?._id ||
        row?.campaignId ||
        row?.feedCampaignId ||
        row?.linkedFeedCampaignId ||
        row?.linkedFeedPostId ||
        ""
    ),
    type: String(row?.type || "update") as CommercialFeedPostType,
    body: String(row?.body || row?.description || ""),
    storefrontSlug: String(
      row?.storefrontSlug ||
        row?.linkedStorefrontSlug ||
        row?.brandSlug ||
        row?.publicSlug ||
        ""
    ),
    engagementCount: Number(row?.engagementCount ?? row?.likeCount ?? 0),
    tags: Array.isArray(row?.tags) ? row.tags.map((tag: any) => String(tag)) : [],
    growInterests: Array.isArray(row?.growInterests)
      ? row.growInterests.map((interest: any) => String(interest))
      : []
  };
}

export async function listCommercialFeedCampaigns(
  params: {
    type?: string;
    tag?: string;
    q?: string;
    sort?: "new" | "top";
    cursor?: string | null;
    limit?: number;
    placement?: FeedCampaignPlacement;
  } = {}
): Promise<{ items: CommercialFeedCampaign[]; nextCursor: string | null }> {
  const res: any = await apiRequest("/api/commercial/feed", {
    // Feed discovery is optional public/customer-facing content. A 401 here can
    // mean the Feed route is unavailable for this workspace; it must not clear
    // an otherwise valid app session. /api/me remains the authoritative token check.
    invalidateOn401: false,
    params: {
      ...(params.type && params.type !== "all" ? { type: params.type } : {}),
      ...(params.tag ? { tag: params.tag } : {}),
      ...(params.q ? { q: params.q } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
      ...(params.placement ? { placement: params.placement } : {})
    }
  });
  const items: CommercialFeedCampaign[] = Array.isArray(res?.items)
    ? res.items.map(normalizeCampaign)
    : [];
  return {
    items,
    nextCursor: res?.nextCursor ? String(res.nextCursor) : null
  };
}

export async function createCommercialFeedCampaign(input: {
  type: CommercialFeedCampaignType;
  campaignKind?: string;
  authorType?: "commercial" | "facility";
  workspaceType?: "commercial" | "facility";
  ownerType?: "commercial" | "facility";
  facilityId?: string;
  campaignType?: "product" | "course" | "live" | "storefront" | "facility" | "general";
  status?: "draft" | "scheduled" | "active" | "paused" | "ended" | "cancelled";
  title?: string;
  body: string;
  tags?: string[];
  growInterests?: string[];
  location?: string;
  linkedProductId?: string;
  linkedProductLineId?: string;
  linkedCourseId?: string;
  linkedLiveId?: string;
  linkedTrialId?: string;
  linkedGrowId?: string;
  linkedForumThreadId?: string;
  storefrontSlug?: string;
  imageUrl?: string;
  startsAt?: string;
  endsAt?: string;
  reminderPreference?: string;
  recurrenceRule?: string;
  externalLinks?: Array<{ label: string; url: string }>;
  placements?: FeedCampaignPlacement[];
  cta?: { label?: string; kind?: string };
}) {
  const imageUrl = await persistImageUri(input.imageUrl);
  const res: any = await apiRequest("/api/commercial/feed", {
    method: "POST",
    body: {
      ...input,
      imageUrl: imageUrl || undefined,
      creativeImageUrl: imageUrl || undefined
    }
  });
  return normalizeCampaign(res?.item ?? res?.post ?? res);
}

export async function recordFeedCampaignEvent(
  campaignId: string,
  input: {
    eventType: "impression" | "click" | "conversion" | "hide" | "report";
    placement?: FeedCampaignPlacement;
    growInterests?: string[];
    targetUrl?: string;
    conversionType?: string;
    reportReason?: string;
    sessionKey?: string;
  }
) {
  return apiRequest(`/api/commercial/feed/${encodeURIComponent(campaignId)}/events`, {
    method: "POST",
    body: input,
    auth: false,
    silent: true
  });
}

export async function fetchFeedCampaignAnalytics(): Promise<FeedCampaignAnalytics> {
  const res: any = await apiRequest("/api/commercial/feed-analytics");
  return (
    res?.analytics ?? {
      totals: { impressions: 0, clicks: 0, conversions: 0, hides: 0, reports: 0 },
      campaigns: [],
      placements: [],
      growInterests: []
    }
  );
}

/** @deprecated Use listCommercialFeedCampaigns for new Feed/Campaigns code. */
export const listCommercialFeedPosts = listCommercialFeedCampaigns;
/** @deprecated Use createCommercialFeedCampaign for new Feed/Campaigns code. */
export const createCommercialFeedPost = createCommercialFeedCampaign;
