import { client as api } from "./client.ts";
import ROUTES from "./routes.js";

// Login
export async function login(email, password) {
  try {
    console.log("[API] Login request:", { email, passwordLength: password?.length });
    const data = await api.post(ROUTES.AUTH.LOGIN, { email, password });
    global.authToken = data.token;
    global.user = data.user;
    return { user: data.user, token: data.token };
  } catch (err) {
    console.error("[API] Login error:", {
      error: err,
      message: err?.message,
      data: err?.data,
      code: err?.code,
      status: err?.status
    });
    throw err; // Throw the full error object, not just the message
  }
}

// Signup
export async function signup({ name, displayName, email, password }) {
  try {
    const payload = { name, displayName, email, password };
    const data = await api.post(ROUTES.AUTH.SIGNUP, payload);
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
    const data = await api.post("/api/auth/register", payload);
    global.authToken = data.token;
    return { token: data.token };
  } catch (err) {
    throw err?.data?.message || err.message || "Register failed";
  }
}

// Become Creator
export async function becomeCreator() {
  try {
    const data = await api.post(ROUTES.AUTH.BECOME_CREATOR, {});
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
    const data = await api.post("/api/auth/save-push-token", { pushToken });
    return data;
  } catch (err) {
    throw err?.data?.message || err.message || "Save push token failed";
  }
}
