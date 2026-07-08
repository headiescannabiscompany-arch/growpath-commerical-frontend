import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function getFeed(page = 1, options) {
  let tier1 = [];
  let tags = [];
  let token;

  if (typeof options === "string") {
    token = options;
  } else if (options && typeof options === "object") {
    ({ tier1 = [], tags = [], token } = options);
  }

  return apiRequest(apiRoutes.FORUM.FEED_LATEST, {
    auth: token ? true : false,
    params: {
      page,
      tier1: Array.isArray(tier1) && tier1.length ? tier1.join(",") : undefined,
      tags: Array.isArray(tags) && tags.length ? tags.join(",") : undefined
    }
  });
}

export function getTrending(token) {
  return apiRequest(apiRoutes.FORUM.FEED_TRENDING, { auth: token ? true : false });
}

export function createPost(formData, token) {
  return apiRequest(apiRoutes.FORUM.CREATE, {
    method: "POST",
    auth: token ? true : false,
    body: formData
  });
}

export function likePost(id, token) {
  return apiRequest(apiRoutes.FORUM.LIKE(id), {
    method: "POST",
    auth: token ? true : false,
    body: {}
  });
}

export function unlikePost(id, token) {
  return apiRequest(apiRoutes.FORUM.UNLIKE(id), {
    method: "POST",
    auth: token ? true : false,
    body: {}
  });
}

export function getComments(id, token) {
  return apiRequest(apiRoutes.FORUM.COMMENTS(id), { auth: token ? true : false });
}

export function addComment(id, text, token) {
  return apiRequest(apiRoutes.FORUM.COMMENT(id), {
    method: "POST",
    auth: token ? true : false,
    body: { text }
  });
}
