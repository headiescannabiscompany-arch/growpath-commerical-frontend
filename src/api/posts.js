import { client } from "./client.js";
import ROUTES from "./routes.js";

export function getFeed(page = 1, options) {
  let tier1 = [];
  let tags = [];
  let token;

  if (typeof options === "string") {
    token = options;
  } else if (options && typeof options === "object") {
    ({ tier1 = [], tags = [], token } = options);
  }

  const qs = new URLSearchParams({ page });
  if (Array.isArray(tier1) && tier1.length) {
    qs.append("tier1", tier1.join(","));
  }
  if (Array.isArray(tags) && tags.length) {
    qs.append("tags", tags.join(","));
  }

  return client.get(`${ROUTES.POSTS.FEED}?${qs.toString()}`, token);
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
