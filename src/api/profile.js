import api from "./client";

export function getProfile(id) {
  return api(`/users/profile/${id}`);
}

export function updateAvatar(avatar) {
  return api("/users/avatar", {
    method: "POST",
    body: JSON.stringify({ avatar })
  });
}

export function updateBanner(banner) {
  return api("/users/banner", {
    method: "POST",
    body: JSON.stringify({ banner })
  });
}

export function updateBio(bio) {
  return api("/users/bio", {
    method: "POST",
    body: JSON.stringify({ bio })
  });
}
