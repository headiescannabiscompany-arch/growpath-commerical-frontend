import { client as api } from "./client";

export async function login(email, password) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  global.authToken = data.token;
  global.user = data.user;
  return data.user;
}

export async function signup(email, password, displayName) {
  const data = await api("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName })
  });

  global.authToken = data.token;
  global.user = data.user;
  return data.user;
}

export async function becomeCreator() {
  const data = await api("/api/auth/become-creator", {
    method: "POST"
  });

  if (data.role) {
    global.user.role = data.role;
  }

  return data;
}
