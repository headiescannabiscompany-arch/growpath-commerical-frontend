import { apiRequest } from "@/api/apiRequest";
import { persistImageUris } from "@/utils/photoUploads";

export type Post = {
  _id?: string;
  id?: string;
  user?: any;
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

const CREATE_POST_PATH = "/api/posts";

function normalizeCreatedPost(res: any): Post {
  // ✅ Today: backend returns post directly
  // ✅ Future: if you later wrap it as { created: post } or { post: post }, this still works
  return (res?.created ?? res?.post ?? res) as Post;
}

export async function createFeedPost(input: CreatePostInput): Promise<Post> {
  const photos = await persistImageUris(input.photos || []);

  const res = await apiRequest<any>(CREATE_POST_PATH, {
    method: "POST",
    body: {
      text: input.text,
      plantId: input.plantId || undefined,
      photos
    }
  });

  return normalizeCreatedPost(res);
}
