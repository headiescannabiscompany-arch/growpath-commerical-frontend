import { postMultipart } from "./client.js";
import { apiRequest } from "./apiRequest";
import routes from "./routes.js";

export function getProfile(id) {
  return apiRequest(routes.USER.PROFILE(id), { method: "GET" });
}

export function updateAvatar(formData, token) {
  return postMultipart(routes.USER.AVATAR, formData, token);
}

export function updateBanner(formData, token) {
  return postMultipart(routes.USER.BANNER, formData, token);
}

export function updateBio(bio) {
  return apiRequest(routes.USER.BIO, {
    method: "POST",
    body: { bio }
  });
}

export function followUser(id) {
  return apiRequest(routes.USER.FOLLOW(id), { method: "POST" });
}

export function unfollowUser(id) {
  return apiRequest(routes.USER.UNFOLLOW(id), { method: "POST" });
}

export function isFollowing(id) {
  return apiRequest(routes.USER.IS_FOLLOWING(id), { method: "GET" });
}

export function getFollowers(id) {
  return apiRequest(routes.USER.FOLLOWERS(id), { method: "GET" });
}

export function getFollowing(id) {
  return apiRequest(routes.USER.FOLLOWING(id), { method: "GET" });
}

export function updateNotificationPreferences(prefs) {
  return apiRequest(routes.USER.NOTIFICATIONS, {
    method: "POST",
    body: prefs
  });
}

export function updateGrowInterests(growInterests) {
  return apiRequest("/api/user/preferences/interests", {
    method: "POST",
    body: { growInterests }
  });
}

export function getCertificates() {
  return apiRequest(routes.USER.CERTIFICATES, { method: "GET" });
}

export function onboardCreator(refreshUrl, returnUrl) {
  return apiRequest(routes.USER.ONBOARD_CREATOR, {
    method: "POST",
    body: { refreshUrl, returnUrl }
  });
}

export function getUserPosts(userId, page = 1) {
  // Assuming route structure /api/user/{id}/posts?page=...
  // Since apiRoutes doesn't have it explicitly, I'll construct it or add to apiRoutes.
  // Using direct construction for now as it's cleaner than modifying apiRoutes file just for this if I don't have to.
  // Wait, api/routes.js is a centralized map. I should check if I should update that too.
  // For now, hardcoded path is fine if consistent with backend.
  return apiRequest(`/api/user/${userId}/posts`, {
    method: "GET",
    params: { page }
  });
}

export function getUserGrowLogs(userId, page = 1) {
  return apiRequest(`/api/user/${userId}/growlogs`, {
    method: "GET",
    params: { page }
  });
}
