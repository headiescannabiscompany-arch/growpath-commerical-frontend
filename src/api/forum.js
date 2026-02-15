import { client as api } from "./client.js";
import apiRoutes from "./routes.js";

export function listPosts() {
  return api(apiRoutes.FORUM.LIST);
}

export function getPost(id) {
  return api(apiRoutes.FORUM.DETAIL(id));
}

function buildForumFeedQuery(page = 1, tier1 = [], tags = []) {
  const qs = new URLSearchParams({ page });
  if (tier1 && tier1.length > 0) qs.append("tier1", tier1.join(","));
  if (tags && tags.length > 0) qs.append("tags", tags.join(","));
  return qs.toString();
}

export function getLatestPosts(page = 1, tier1 = [], tags = []) {
  const qs = buildForumFeedQuery(page, tier1, tags);
  return api(`${apiRoutes.FORUM.FEED_LATEST}?${qs}`);
}

export function getTrendingPosts(page = 1, tier1 = [], tags = []) {
  const qs = buildForumFeedQuery(page, tier1, tags);
  return api(`${apiRoutes.FORUM.FEED_TRENDING}?${qs}`);
}

export function getFollowingPosts(page = 1, tier1 = [], tags = []) {
  const qs = buildForumFeedQuery(page, tier1, tags);
  return api(`${apiRoutes.FORUM.FEED_FOLLOWING}?${qs}`);
}

export function createPost(payload) {
  return api(apiRoutes.FORUM.CREATE, {
    method: "POST",
    body: JSON.stringify(payload)
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

  return api(apiRoutes.FORUM.LEGACY_CREATE, {
    method: "POST",
    body: form
  });
}

export function likePost(id) {
  return api(apiRoutes.FORUM.LIKE(id), { method: "POST" });
}

export function unlikePost(id) {
  return api(apiRoutes.FORUM.UNLIKE(id), { method: "POST" });
}

export function addComment(id, text, parentId = null) {
  return api(apiRoutes.FORUM.COMMENT(id), {
    method: "POST",
    body: JSON.stringify({ text, parentId })
  });
}

export function getComments(id) {
  return api(apiRoutes.FORUM.COMMENTS(id));
}

export function deleteComment(commentId) {
  return api(apiRoutes.FORUM.COMMENT_DETAIL(commentId), { method: "DELETE" });
}

export function savePost(id) {
  return api(apiRoutes.FORUM.SAVE(id), { method: "POST" });
}

export function unsavePost(id) {
  return api(apiRoutes.FORUM.UNSAVE(id), { method: "POST" });
}

export function reportPost(id, reason = "No reason provided") {
  return api(apiRoutes.FORUM.REPORT(id), {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function savePostToGrowLog(id) {
  return api(apiRoutes.FORUM.TO_GROWLOG(id), { method: "POST" });
}

export function commentOnPost(postId, text) {
  return api(apiRoutes.FORUM.COMMENTS(postId), {
    method: "POST",
    body: JSON.stringify({ text })
  });
}
