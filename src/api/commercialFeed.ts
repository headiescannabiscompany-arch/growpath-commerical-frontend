import { apiRequest } from "./apiRequest";
import { persistImageUri } from "@/utils/photoUploads";

export type CommercialFeedPostType =
  | "listing"
  | "iso"
  | "drop"
  | "update"
  | "question"
  | "education";

export type CommercialFeedPost = {
  id: string;
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
  likeCount?: number;
  commentCount?: number;
  createdAt?: string;
  author?: {
    displayName?: string;
    email?: string;
    plan?: string;
  } | null;
};

function normalizePost(row: any): CommercialFeedPost {
  return {
    ...row,
    id: String(row?.id || row?._id || ""),
    type: String(row?.type || "update") as CommercialFeedPostType,
    body: String(row?.body || row?.description || ""),
    tags: Array.isArray(row?.tags) ? row.tags.map((tag: any) => String(tag)) : [],
    growInterests: Array.isArray(row?.growInterests)
      ? row.growInterests.map((interest: any) => String(interest))
      : []
  };
}

export async function listCommercialFeedPosts(
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
  const items = Array.isArray(res?.items) ? res.items.map(normalizePost) : [];
  return {
    items,
    nextCursor: res?.nextCursor ? String(res.nextCursor) : null
  };
}

export async function createCommercialFeedPost(input: {
  type: CommercialFeedPostType;
  campaignKind?: string;
  title?: string;
  body: string;
  tags?: string[];
  growInterests?: string[];
  location?: string;
  linkedProductId?: string;
  linkedProductLineId?: string;
  linkedCourseId?: string;
  linkedLiveId?: string;
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
  const res: any = await apiRequest("/api/commercial/posts", {
    method: "POST",
    body: {
      ...input,
      imageUrl: imageUrl || undefined,
      creativeImageUrl: imageUrl || undefined
    }
  });
  return normalizePost(res?.item ?? res?.post ?? res);
}
