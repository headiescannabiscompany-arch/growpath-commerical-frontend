import { Platform } from "react-native";
import { apiRequest } from "@/api/apiRequest";

export type CreatePostInput = {
  text: string;
  workspaceContext: string;
  authorType: "business" | "user";
  authorId: string;
  postType: string;
  growTags?: string[];
  photos?: string[]; // array of uri
};

// Set this to your real backend route if different
const CREATE_POST_PATH = "/api/posts";

async function uriToBlob(uri: string): Promise<Blob> {
  const resp = await fetch(uri);
  return await resp.blob();
}

export async function createFeedPost(input: CreatePostInput) {
  const form = new FormData();

  form.append("text", input.text);
  form.append("workspaceContext", input.workspaceContext);
  form.append("authorType", input.authorType);
  form.append("authorId", input.authorId);
  form.append("postType", input.postType);

  const tags = input.growTags || [];
  if (tags.length) form.append("growTags", JSON.stringify(tags));

  const photos = input.photos || [];
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];

    if (Platform.OS === "web") {
      const blob = await uriToBlob(photo);
      form.append("photos", blob, `photo_${i}.jpg`);
    } else {
      form.append("photos", {
        uri: photo,
        name: `photo_${i}.jpg`,
        type: "image/jpeg"
      } as any);
    }
  }

  return apiRequest(CREATE_POST_PATH, {
    method: "POST",
    body: form
  });
}
