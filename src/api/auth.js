import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export async function login(email, password) {
  const data = await api(ROUTES.AUTH.LOGIN, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  global.authToken = data.token;
  global.user = data.user;
  return { user: data.user, token: data.token };
}

export async function signup(email, password, displayName) {
  const data = await api(ROUTES.AUTH.SIGNUP, {
    method: "POST",
    body: JSON.stringify({ email, password, displayName })
  });

  global.authToken = data.token;
  global.user = data.user;
  return { user: data.user, token: data.token };
}

export async function becomeCreator() {
  const data = await api(ROUTES.AUTH.BECOME_CREATOR, {
    method: "POST"
  });

  if (data.role) {
    global.user.role = data.role;
  }

  return data;
}
