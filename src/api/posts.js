import client from "./client";

export function getFeed(page = 1, token) {
  return client.get(`/posts/feed?page=${page}`, token);
}

export function getTrending(token) {
  return client.get("/posts/trending", token);
}

export function createPost(formData, token) {
  return client.post("/posts", formData, token);
}

export function likePost(id, token) {
  return client.post(`/posts/${id}/like`, {}, token);
}

export function unlikePost(id, token) {
  return client.post(`/posts/${id}/unlike`, {}, token);
}

export function getComments(id, token) {
  return client.get(`/posts/${id}/comments`, token);
}

export function addComment(id, text, token) {
  return client.post(`/posts/${id}/comment`, { text }, token);
}
