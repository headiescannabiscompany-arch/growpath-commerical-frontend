import { client as api } from "./client.js";
import ROUTES from "./routes.js";

// Login
export async function login(email, password) {
  try {
    const data = await api(ROUTES.AUTH.LOGIN, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    global.authToken = data.token;
    global.user = data.user;
    return { user: data.user, token: data.token };
  } catch (err) {
    throw err?.data?.message || err.message || "Login failed";
  }
}

// Signup
export async function signup({ name, displayName, email, password }) {
  try {
    const payload = { name, displayName, email, password };
    const data = await api(ROUTES.AUTH.SIGNUP, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    global.authToken = data.token;
    global.user = data.user;
    return { user: data.user, token: data.token };
  } catch (err) {
    throw err?.data?.message || err.message || "Signup failed";
  }
}

// Register
export async function register({ name, displayName, email, password }) {
  try {
    const payload = { name, displayName, email, password };
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    global.authToken = data.token;
    return { token: data.token };
  } catch (err) {
    throw err?.data?.message || err.message || "Register failed";
  }
}

// Become Creator
export async function becomeCreator() {
  try {
    const data = await api(ROUTES.AUTH.BECOME_CREATOR, {
      method: "POST"
    });
    if (data.role) {
      if (global.user) global.user.role = data.role;
    }
    return data;
  } catch (err) {
    throw err?.data?.message || err.message || "Become creator failed";
  }
}

// Save Push Token
export async function savePushToken(pushToken) {
  try {
    const data = await api("/api/auth/save-push-token", {
      method: "POST",
      body: JSON.stringify({ pushToken })
    });
    return data;
  } catch (err) {
    throw err?.data?.message || err.message || "Save push token failed";
  }
}
