import { Platform } from "react-native";
import { apiRequest } from "@/api/apiRequest";
import { uriToBlob } from "@/api/uriToBlob";

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
  photos?: string[]; // array of uri
};

const CREATE_POST_PATH = "/api/posts";

function normalizeCreatedPost(res: any): Post {
  // ✅ Today: backend returns post directly
  // ✅ Future: if you later wrap it as { created: post } or { post: post }, this still works
  return (res?.created ?? res?.post ?? res) as Post;
}

export async function createFeedPost(input: CreatePostInput): Promise<Post> {
  const form = new FormData();

  form.append("text", input.text);
  if (input.plantId) form.append("plantId", input.plantId);

  const photos = input.photos || [];
  for (let i = 0; i < photos.length; i++) {
    const uri = photos[i];

    if (Platform.OS === "web") {
      const blob = await uriToBlob(uri);
      form.append("photos", blob, `photo_${i}.jpg`);
    } else {
      form.append("photos", { uri, name: `photo_${i}.jpg`, type: "image/jpeg" } as any);
    }
  }

  const res = await apiRequest<any>(CREATE_POST_PATH, {
    method: "POST",
    body: form
  });

  return normalizeCreatedPost(res);
}
