import { client } from "./client.js";
import ROUTES from "./routes.js";

export function getFeed(page = 1, token) {
  return client.get(`${ROUTES.POSTS.FEED}?page=${page}`, token);
}

export function getTrending(token) {
  return client.get(ROUTES.POSTS.TRENDING, token);
}

export function createPost(formData, token) {
  return client.post(ROUTES.POSTS.CREATE, formData, token);
}

export function likePost(id, token) {
  return client.post(ROUTES.POSTS.LIKE(id), {}, token);
}

export function unlikePost(id, token) {
  return client.post(ROUTES.POSTS.UNLIKE(id), {}, token);
}

export function getComments(id, token) {
  return client.get(ROUTES.POSTS.COMMENTS(id), token);
}

export function addComment(id, text, token) {
  return client.post(ROUTES.POSTS.COMMENT(id), { text }, token);
}
