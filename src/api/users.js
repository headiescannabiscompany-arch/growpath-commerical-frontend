import api from "./client";

export function followUser(id) {
  return api(`/users/follow/${id}`, { method: "POST" });
}

export function unfollowUser(id) {
  return api(`/users/unfollow/${id}`, { method: "POST" });
}

export function isFollowing(id) {
  return api(`/users/is-following/${id}`);
}

export function getFollowers(id) {
  return api(`/users/followers/${id}`);
}

export function getFollowing(id) {
  return api(`/users/following/${id}`);
}
