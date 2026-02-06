import { useMutation } from "@tanstack/react-query";
import { createFeedPost, type CreatePostInput } from "@/api/feed";

export function useCreatePost() {
  const mutation = useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const res = await createFeedPost(input);
      // If your api layer returns { success, data }, enforce success here
      if (res && typeof res === "object" && "success" in res && !res.success) {
        const err = new Error((res as any).message || "Unable to post");
        // @ts-ignore
        err.payload = res;
        throw err;
      }
      return res;
    }
  });

  return {
    createPost: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error
  };
}
