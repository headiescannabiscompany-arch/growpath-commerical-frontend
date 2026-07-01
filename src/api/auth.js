import { apiRequest } from "./apiRequest";
import routes from "./routes.js";

function normalizeAuthArgs(a, b) {
  if (typeof a === "object" && a !== null) return a;
  return { email: a, password: b };
}

// Login
export async function login(a, b) {
  try {
    const { email, password } = normalizeAuthArgs(a, b);
    const loginData = await apiRequest(routes.AUTH.LOGIN, {
      method: "POST",
      auth: false,
      body: { email, password }
    });
    global.authToken = loginData.token;
    global.user = loginData.user;
    return { user: loginData.user, token: loginData.token };
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
export async function signup(payload) {
  try {
    const { name, displayName, email, password, plan, mode } = payload || {};
    const signupPayload = { name, displayName, email, password, plan, mode };
    const signupData = await apiRequest(routes.AUTH.SIGNUP, {
      method: "POST",
      auth: false,
      body: signupPayload
    });
    global.authToken = signupData.token;
    global.user = signupData.user;
    return signupData;
  } catch (err) {
    throw err?.data?.message || err.message || "Signup failed";
  }
}

// Register
export async function register(payload) {
  try {
    const { name, displayName, email, password } = payload || {};
    const registerPayload = { name, displayName, email, password };
    const registerData = await apiRequest("/api/auth/register", {
      method: "POST",
      auth: false,
      body: registerPayload
    });
    global.authToken = registerData.token;
    return { token: registerData.token };
  } catch (err) {
    throw err?.data?.message || err.message || "Register failed";
  }
}

export async function requestEmailVerification(email) {
  return apiRequest("/api/auth/verify-email/request", {
    method: "POST",
    auth: false,
    body: { email }
  });
}

export async function confirmEmailVerification(token) {
  return apiRequest("/api/auth/verify-email/confirm", {
    method: "POST",
    auth: false,
    body: { token }
  });
}

export async function forgotPassword(email) {
  return apiRequest("/api/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: { email }
  });
}

export async function resetPassword(token, password) {
  return apiRequest("/api/auth/reset-password", {
    method: "POST",
    auth: false,
    body: { token, password }
  });
}

// Become Creator
export async function becomeCreator() {
  try {
    const creatorData = await apiRequest(routes.AUTH.BECOME_CREATOR, {
      method: "POST",
      body: {}
    });
    if (creatorData.role) {
      if (global.user) global.user.role = creatorData.role;
    }
    return creatorData;
  } catch (err) {
    throw err?.data?.message || err.message || "Become creator failed";
  }
}

// Save Push Token
export async function savePushToken(pushToken) {
  try {
    const pushTokenData = await apiRequest("/api/auth/save-push-token", {
      method: "POST",
      body: { pushToken }
    });
    return pushTokenData;
  } catch (err) {
    throw err?.data?.message || err.message || "Save push token failed";
  }
}
