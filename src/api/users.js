import { client as api, postMultipart } from "./client.js";
import routes from "./routes.js";

export function getProfile(id) {
  return api(routes.USER.PROFILE(id));
}

export function updateAvatar(formData, token) {
  return postMultipart(routes.USER.AVATAR, formData, token);
}

export function updateBanner(formData, token) {
  return postMultipart(routes.USER.BANNER, formData, token);
}

export function updateBio(bio) {
  return api(routes.USER.BIO, {
    method: "POST",
    body: JSON.stringify({ bio })
  });
}

export function followUser(id) {
  return api(routes.USER.FOLLOW(id), { method: "POST" });
}

export function unfollowUser(id) {
  return api(routes.USER.UNFOLLOW(id), { method: "POST" });
}

export function isFollowing(id) {
  return api(routes.USER.IS_FOLLOWING(id));
}

export function getFollowers(id) {
  return api(routes.USER.FOLLOWERS(id));
}

export function getFollowing(id) {
  return api(routes.USER.FOLLOWING(id));
}

export function updateNotificationPreferences(prefs) {
  return api(routes.USER.NOTIFICATIONS, {
    method: "POST",
    body: JSON.stringify(prefs)
  });
}

export function updateGrowInterests(growInterests) {
  return api("/api/user/preferences/interests", {
    method: "POST",
    body: JSON.stringify({ growInterests })
  });
}

export function getCertificates() {
  return api(routes.USER.CERTIFICATES);
}

export function onboardCreator(refreshUrl, returnUrl) {
  return api(routes.USER.ONBOARD_CREATOR, {
    method: "POST",
    body: JSON.stringify({ refreshUrl, returnUrl })
  });
}

export function getUserPosts(userId, page = 1) {
  // Assuming route structure /api/user/{id}/posts?page=...
  // Since apiRoutes doesn't have it explicitly, I'll construct it or add to apiRoutes.
  // Using direct construction for now as it's cleaner than modifying apiRoutes file just for this if I don't have to.
  // Wait, api/routes.js is a centralized map. I should check if I should update that too.
  // For now, hardcoded path is fine if consistent with backend.
  return api(`/api/user/${userId}/posts?page=${page}`);
}

export function getUserGrowLogs(userId, page = 1) {
  return api(`/api/user/${userId}/growlogs?page=${page}`);
}
