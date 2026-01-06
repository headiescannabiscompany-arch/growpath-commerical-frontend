import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function listPosts() {
  return api(ROUTES.FORUM.LIST);
}

export function getPost(id) {
  return api(ROUTES.FORUM.DETAIL(id));
}

function buildForumFeedQuery(page = 1, tier1 = [], tags = []) {
  const qs = new URLSearchParams({ page });
  if (tier1 && tier1.length > 0) qs.append("tier1", tier1.join(","));
  if (tags && tags.length > 0) qs.append("tags", tags.join(","));
  return qs.toString();
}

export function getLatestPosts(page = 1, tier1 = [], tags = []) {
  const qs = buildForumFeedQuery(page, tier1, tags);
  return api(`${ROUTES.FORUM.FEED_LATEST}?${qs}`);
}

export function getTrendingPosts(page = 1, tier1 = [], tags = []) {
  const qs = buildForumFeedQuery(page, tier1, tags);
  return api(`${ROUTES.FORUM.FEED_TRENDING}?${qs}`);
}

export function getFollowingPosts(page = 1, tier1 = [], tags = []) {
  const qs = buildForumFeedQuery(page, tier1, tags);
  return api(`${ROUTES.FORUM.FEED_FOLLOWING}?${qs}`);
}

export function createPost(payload) {
  return api(ROUTES.FORUM.CREATE, {
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

  return api(ROUTES.FORUM.LEGACY_CREATE, {
    method: "POST",
    body: form
  });
}

export function likePost(id) {
  return api(ROUTES.FORUM.LIKE(id), { method: "POST" });
}

export function unlikePost(id) {
  return api(ROUTES.FORUM.UNLIKE(id), { method: "POST" });
}

export function addComment(id, text, parentId = null) {
  return api(ROUTES.FORUM.COMMENT(id), {
    method: "POST",
    body: JSON.stringify({ text, parentId })
  });
}

export function getComments(id) {
  return api(ROUTES.FORUM.COMMENTS(id));
}

export function deleteComment(commentId) {
  return api(ROUTES.FORUM.COMMENT_DETAIL(commentId), { method: "DELETE" });
}

export function savePost(id) {
  return api(ROUTES.FORUM.SAVE(id), { method: "POST" });
}

export function unsavePost(id) {
  return api(ROUTES.FORUM.UNSAVE(id), { method: "POST" });
}

export function reportPost(id, reason = "No reason provided") {
  return api(ROUTES.FORUM.REPORT(id), {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function savePostToGrowLog(id) {
  return api(ROUTES.FORUM.TO_GROWLOG(id), { method: "POST" });
}

export function commentOnPost(postId, text) {
  return api(ROUTES.FORUM.COMMENTS(postId), {
    method: "POST",
    body: JSON.stringify({ text })
  });
}
