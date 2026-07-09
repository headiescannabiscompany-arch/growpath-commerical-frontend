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
  imageUrl?: string;
  creativeImageUrl?: string;
  bannerImageUrl?: string;
  startsAt?: string;
  endsAt?: string;
  reminderPreference?: string;
  recurrenceRule?: string;
  externalLinks?: Array<{ label: string; url: string }>;
  engagementCount?: number;
  likeCount?: number;
  commentCount?: number;
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
  } = {}
) {
  const res: any = await apiRequest("/api/commercial/feed", {
    params: {
      ...(params.type && params.type !== "all" ? { type: params.type } : {}),
      ...(params.tag ? { tag: params.tag } : {}),
      ...(params.q ? { q: params.q } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.limit ? { limit: params.limit } : {})
    }
  });
  const items = Array.isArray(res?.items) ? res.items.map(normalizeCampaign) : [];
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

/** @deprecated Use listCommercialFeedCampaigns for new Feed/Campaigns code. */
export const listCommercialFeedPosts = listCommercialFeedCampaigns;
/** @deprecated Use createCommercialFeedCampaign for new Feed/Campaigns code. */
export const createCommercialFeedPost = createCommercialFeedCampaign;
