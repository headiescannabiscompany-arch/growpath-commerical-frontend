import { ApiError, apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function listPosts(filters = {}) {
  return apiRequest(apiRoutes.FORUM.LIST, { params: filters });
}

export function listForumCategories() {
  return apiRequest("/api/forum/categories");
}

export function assistForumDraft(content) {
  return apiRequest("/api/forum/assist", {
    method: "POST",
    body: { content }
  });
}

export function assistForumThread(id) {
  return apiRequest(`/api/forum/${encodeURIComponent(id)}/assist`, { method: "POST" });
}

export function createForumTask(id, input = {}) {
  return apiRequest(`/api/forum/${encodeURIComponent(id)}/create-task`, {
    method: "POST",
    body: input
  });
}

export function getPost(id) {
  return apiRequest(apiRoutes.FORUM.DETAIL(id));
}

export function getLatestPosts(page = 1, tier1 = [], tags = [], filters = {}) {
  return apiRequest(apiRoutes.FORUM.LATEST, {
    params: {
      page,
      tier1: tier1 && tier1.length ? tier1.join(",") : undefined,
      tags: tags && tags.length ? tags.join(",") : undefined,
      ...filters
    }
  });
}

export function getTrendingPosts(page = 1, tier1 = [], tags = [], filters = {}) {
  return apiRequest(apiRoutes.FORUM.TRENDING, {
    params: {
      page,
      tier1: tier1 && tier1.length ? tier1.join(",") : undefined,
      tags: tags && tags.length ? tags.join(",") : undefined,
      ...filters
    }
  });
}

export function getFollowingPosts(page = 1, tier1 = [], tags = [], filters = {}) {
  return apiRequest(apiRoutes.FORUM.FOLLOWING, {
    params: {
      page,
      tier1: tier1 && tier1.length ? tier1.join(",") : undefined,
      tags: tags && tags.length ? tags.join(",") : undefined,
      ...filters
    }
  }).catch((err) => {
    if (err instanceof ApiError && err.status === 500) {
      // Keep forum usable when following feed is misconfigured server-side.
      return { posts: [], hasMore: false, page };
    }
    throw err;
  });
}

export function createPost(payload) {
  return apiRequest(apiRoutes.FORUM.CREATE, {
    method: "POST",
    body: payload
  });
}

export function createPostLegacy(title, body, photos, vipOnly = false) {
  const form = new FormData();
  form.append("title", title);
  form.append("body", body);
  form.append("vipOnly", vipOnly ? "true" : "false");

  if (photos) {
    photos.forEach((file) => form.append("photos", file));
  }

  return apiRequest(apiRoutes.FORUM.LEGACY_CREATE, {
    method: "POST",
    body: form
  });
}

export function likePost(id) {
  return apiRequest(apiRoutes.FORUM.LIKE(id), { method: "POST" });
}

export function unlikePost(id) {
  return apiRequest(apiRoutes.FORUM.UNLIKE(id), { method: "POST" });
}

export function addComment(id, text, parentId = null, identity = {}) {
  return apiRequest(apiRoutes.FORUM.COMMENT(id), {
    method: "POST",
    body: { text, parentId, ...identity }
  });
}

export function getComments(id) {
  return apiRequest(apiRoutes.FORUM.COMMENTS(id));
}

export function deleteComment(commentId) {
  return apiRequest(apiRoutes.FORUM.COMMENT_DETAIL(commentId), { method: "DELETE" });
}

export function savePost(id) {
  return apiRequest(apiRoutes.FORUM.SAVE(id), { method: "POST" });
}

export function unsavePost(id) {
  return apiRequest(apiRoutes.FORUM.UNSAVE(id), { method: "POST" });
}

export function reportPost(id, reason = "No reason provided") {
  return apiRequest(apiRoutes.FORUM.REPORT(id), {
    method: "POST",
    body: { reason }
  });
}

export function savePostToGrowLog(id) {
  return apiRequest(apiRoutes.FORUM.TO_GROWLOG(id), { method: "POST" });
}

export function commentOnPost(postId, text) {
  return apiRequest(apiRoutes.FORUM.COMMENTS(postId), {
    method: "POST",
    body: { text }
  });
}
