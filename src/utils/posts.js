export function normalizePostList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.posts)) return payload.posts;
  return [];
}

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value._id) return value._id;
    if (value.id) return value.id;
    if (typeof value.toString === "function") {
      return value.toString();
    }
  }
  return null;
}

export function userHasLiked(post, userId) {
  if (!userId || !post || !Array.isArray(post.likes)) return false;
  return post.likes.some((like) => normalizeId(like) === userId);
}

export function applyLikeMetadata(post, userId, likeCount, shouldLike) {
  if (!post) return post;
  const normalizedLikes = Array.isArray(post.likes)
    ? post.likes.map((like) => normalizeId(like)).filter((id) => id !== null)
    : [];

  let nextLikes = normalizedLikes;
  if (shouldLike && userId && !normalizedLikes.includes(userId)) {
    nextLikes = [...normalizedLikes, userId];
  } else if (!shouldLike && userId) {
    nextLikes = normalizedLikes.filter((id) => id !== userId);
  }

  const currentCount = typeof post.likeCount === "number" ? post.likeCount : 0;
  const fallbackCount = shouldLike ? currentCount + 1 : Math.max(0, currentCount - 1);
  const nextCount = typeof likeCount === "number" ? likeCount : fallbackCount;

  return {
    ...post,
    likeCount: nextCount,
    likes: nextLikes
  };
}
