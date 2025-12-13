import api from "./client";

export function listPosts() {
  return api("/forum");
}

export function getPost(id) {
  return api(`/forum/${id}`);
}

export function getLatestPosts() {
  return api("/forum/feed/latest");
}

export function getTrendingPosts() {
  return api("/forum/feed/trending");
}

export function getFollowingPosts() {
  return api("/forum/feed/following");
}

export function createPost(payload) {
  return api("/forum/create", {
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

  return api("/forum", {
    method: "POST",
    body: form
  });
}

export function likePost(id) {
  return api(`/forum/like/${id}`, { method: "POST" });
}

export function unlikePost(id) {
  return api(`/forum/unlike/${id}`, { method: "POST" });
}

export function addComment(id, text, parentId = null) {
  return api(`/forum/${id}/comment`, {
    method: "POST",
    body: JSON.stringify({ text, parentId })
  });
}

export function getComments(id) {
  return api(`/forum/${id}/comments`);
}

export function deleteComment(commentId) {
  return api(`/forum/comment/${commentId}`, { method: "DELETE" });
}

export function savePost(id) {
  return api(`/forum/save/${id}`, { method: "POST" });
}

export function unsavePost(id) {
  return api(`/forum/unsave/${id}`, { method: "POST" });
}

export function reportPost(id, reason = "No reason provided") {
  return api(`/forum/report/${id}`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function savePostToGrowLog(id) {
  return api(`/forum/to-growlog/${id}`, { method: "POST" });
}

export function commentOnPost(postId, text) {
  return api(`/forum/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
}
