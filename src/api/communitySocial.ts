import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";
import { persistImageUris } from "@/utils/photoUploads";

// A feature-level authorization failure must stay inside the community UI. The auth
// provider owns session validation; logging the user out because one forum, guild, or
// notification endpoint returned 401 makes every forum link appear to redirect home.
const communityRequest = (path: string, options: any = {}) =>
  apiRequest(path, { ...options, invalidateOn401: false });

export type SocialPost = {
  id?: string;
  _id?: string;
  title?: string;
  body?: string;
  content?: string;
  text?: string;
  author?: any;
  user?: any;
  likeCount?: number;
  likes?: any[];
  comments?: any[];
  commentCount?: number;
  tags?: string[];
  growInterests?: string[] | Record<string, string[]>;
  growTags?: string[];
  attachments?: any[];
  media?: any[];
  photos?: string[];
  photoUrls?: string[];
  imageUrl?: string;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
  isHidden?: boolean;
  moderationStatus?: "clean" | "reported" | "reviewed" | "held" | string;
  moderationNotice?: string | null;
};

export type Guild = {
  id?: string;
  _id?: string;
  name?: string;
  description?: string;
  memberCount?: number;
  joined?: boolean;
  isMember?: boolean;
};

export type SocialNotification = {
  id?: string;
  _id?: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
};

function rows<T>(response: any, keys: string[]): T[] {
  if (Array.isArray(response)) return response as T[];
  for (const key of keys) {
    const value = response?.[key] ?? response?.data?.[key];
    if (Array.isArray(value)) return value as T[];
  }
  const items = response?.items ?? response?.data?.items;
  return Array.isArray(items) ? (items as T[]) : [];
}

export function postId(row: any) {
  return String(row?._id || row?.id || "");
}

export async function listForumPosts(
  page = 1,
  tier1: string[] = []
): Promise<SocialPost[]> {
  const response = await communityRequest(apiRoutes.FORUM.LATEST, {
    method: "GET",
    params: { page, tier1: tier1.length ? tier1.join(",") : undefined }
  });
  return rows<SocialPost>(response, ["posts", "items"]);
}

export async function createForumPost(data: {
  title: string;
  body: string;
  photos?: string[];
  tags?: string[];
  growInterests?: string[];
  authorType?: "user" | "commercial" | "facility" | "moderator";
  authorId?: string | null;
  workspaceContext?: "personal" | "commercial" | "facility" | string;
  growId?: string;
  plantId?: string;
  diagnosisId?: string;
  toolRunId?: string;
}): Promise<SocialPost> {
  const photos = await persistImageUris(data.photos || []);
  const tags = data.tags?.length
    ? data.tags
    : data.growInterests?.length
      ? data.growInterests
      : undefined;
  const growInterests = data.growInterests?.length
    ? data.growInterests
    : data.tags?.length
      ? data.tags
      : undefined;
  const response = await communityRequest(apiRoutes.FORUM.CREATE, {
    method: "POST",
    body: {
      title: data.title,
      body: data.body,
      authorType: data.authorType,
      authorId: data.authorId,
      workspaceContext: data.workspaceContext,
      growId: data.growId,
      linkedGrowId: data.growId,
      plantId: data.plantId,
      linkedPlantId: data.plantId,
      diagnosisId: data.diagnosisId,
      linkedDiagnosisId: data.diagnosisId,
      toolRunId: data.toolRunId,
      linkedToolRunId: data.toolRunId,
      photos,
      ...(tags ? { tags } : {}),
      ...(growInterests ? { growInterests } : {})
    }
  });
  return response?.created ?? response?.post ?? response;
}

export async function getForumPost(id: string): Promise<SocialPost | null> {
  const response = await communityRequest(apiRoutes.FORUM.DETAIL(id), { method: "GET" });
  return response?.post ?? response?.data?.post ?? response;
}

export async function likeForumPost(id: string) {
  return communityRequest(apiRoutes.FORUM.LIKE(id), { method: "POST" });
}

export async function unlikeForumPost(id: string) {
  return communityRequest(apiRoutes.FORUM.UNLIKE(id), { method: "POST" });
}

export async function listForumComments(id: string) {
  const response = await communityRequest(apiRoutes.FORUM.COMMENTS(id), {
    method: "GET"
  });
  return rows<any>(response, ["comments", "items"]);
}

export async function addForumComment(id: string, text: string, photos: string[] = []) {
  const persistedPhotos = await persistImageUris(photos);
  const storedText = [text.trim(), ...persistedPhotos].filter(Boolean).join("\n");
  return communityRequest(apiRoutes.FORUM.COMMENT(id), {
    method: "POST",
    body: { text: storedText, photos: persistedPhotos }
  });
}

export async function saveForumPostToGrowLog(id: string, growId?: string) {
  return communityRequest(apiRoutes.FORUM.TO_GROWLOG(id), {
    method: "POST",
    body: growId ? { growId } : {}
  });
}

export async function reportForumPost(
  id: string,
  data: { reason?: string; details?: string } = {}
) {
  return communityRequest(apiRoutes.FORUM.REPORT(id), {
    method: "POST",
    body: {
      reason: data.reason || "other",
      details: data.details || ""
    }
  });
}

export async function listGuilds(): Promise<Guild[]> {
  const response = await communityRequest(apiRoutes.GUILDS.LIST, { method: "GET" });
  return rows<Guild>(response, ["guilds", "items"]);
}

export async function joinGuild(id: string) {
  return communityRequest(apiRoutes.GUILDS.JOIN(id), { method: "POST" });
}

export async function leaveGuild(id: string) {
  return communityRequest(apiRoutes.GUILDS.LEAVE(id), { method: "POST" });
}

export async function listNotifications(): Promise<SocialNotification[]> {
  const response = await communityRequest("/api/notifications", { method: "GET" });
  return rows<SocialNotification>(response, ["notifications", "items"]);
}

export async function markNotificationRead(id: string) {
  return communityRequest(`/api/notifications/read/${encodeURIComponent(id)}`, {
    method: "POST"
  });
}

export async function markAllNotificationsRead() {
  return communityRequest("/api/notifications/read-all", { method: "POST" });
}
