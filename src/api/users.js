import { client as api, postMultipart } from "./client.js";
import ROUTES from "./routes.js";

export function getProfile(id) {
  return api(ROUTES.USER.PROFILE(id));
}

export function updateAvatar(formData, token) {
  return postMultipart(ROUTES.USER.AVATAR, formData, token);
}

export function updateBanner(formData, token) {
  return postMultipart(ROUTES.USER.BANNER, formData, token);
}

export function updateBio(bio) {
  return api(ROUTES.USER.BIO, {
    method: "POST",
    body: JSON.stringify({ bio })
  });
}

export function followUser(id) {
  return api(ROUTES.USER.FOLLOW(id), { method: "POST" });
}

export function unfollowUser(id) {
  return api(ROUTES.USER.UNFOLLOW(id), { method: "POST" });
}

export function isFollowing(id) {
  return api(ROUTES.USER.IS_FOLLOWING(id));
}

export function getFollowers(id) {
  return api(ROUTES.USER.FOLLOWERS(id));
}

export function getFollowing(id) {
  return api(ROUTES.USER.FOLLOWING(id));
}

export function updateNotificationPreferences(prefs) {
  return api(ROUTES.USER.NOTIFICATIONS, {
    method: "POST",
    body: JSON.stringify(prefs)
  });
}

export function getCertificates() {
  return api(ROUTES.USER.CERTIFICATES);
}

export function onboardCreator(refreshUrl, returnUrl) {
  return api(ROUTES.USER.ONBOARD_CREATOR, {
    method: "POST",
    body: JSON.stringify({ refreshUrl, returnUrl })
  });
}
