import { apiRequest } from "@/api/apiRequest";
import apiRoutes from "@/api/routes.js";
import { persistImageUris } from "@/utils/photoUploads";

export type Post = {
  _id?: string;
  id?: string;
  user?: any;
  title?: string;
  body?: string;
  text: string;
  photos?: string[];
  plant?: string | null;
  likeCount?: number;
  score?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreatePostInput = {
  text: string;
  plantId?: string | null;
  photos?: string[];
};

const LEGACY_FORUM_TITLE_LIMIT = 80;

function normalizeCreatedPost(res: any): Post {
  return (res?.created ?? res?.post ?? res) as Post;
}

function forumTitleFromText(text: string) {
  const compact = text.trim().replace(/\s+/g, " ");
  if (!compact) return "Forum discussion";
  return compact.length > LEGACY_FORUM_TITLE_LIMIT
    ? `${compact.slice(0, LEGACY_FORUM_TITLE_LIMIT - 1)}...`
    : compact;
}

export async function createFeedPost(input: CreatePostInput): Promise<Post> {
  const photos = await persistImageUris(input.photos || []);

  const res = await apiRequest<any>(apiRoutes.FORUM.CREATE, {
    method: "POST",
    body: {
      title: forumTitleFromText(input.text),
      body: input.text,
      linkedPlantId: input.plantId || undefined,
      photos
    }
  });

  return normalizeCreatedPost(res);
}
