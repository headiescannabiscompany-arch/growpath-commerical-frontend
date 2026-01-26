import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  client,
  ApiError,
  API_URL,
  setAuthToken,
  setTokenGetter
} from "../src/api/client.js";
import { handleApiError, isPro403Error, requirePro } from "../src/utils/proHelper.js";
import { extractCourses, extractHasMore } from "../src/utils/marketplaceTransforms.js";

let previousFetch;
beforeEach(() => {
  previousFetch = global.fetch;
  setTokenGetter(null); // Prevent lingering TOKEN_GETTER from overriding AUTH_TOKEN
  setAuthToken(null); // Optional: keeps tests isolated
});
afterEach(() => {
  global.fetch = previousFetch;
});

it("client.post attaches the global auth token and serializes JSON bodies", async () => {
  const calls = [];
  setAuthToken("abc123");
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () => JSON.stringify({ success: true })
    };
  };
  const result = await client.post("/plants", { name: "Misty" });
  expect(result).toEqual({ success: true });
  expect(calls.length).toBe(1);
  expect(calls[0].url).toBe(`${API_URL}/plants`);
  expect(calls[0].options.method).toBe("POST");
  expect(calls[0].options.headers.Authorization).toBe("Bearer abc123");
  expect(calls[0].options.headers["Content-Type"]).toBe("application/json");
  expect(calls[0].options.body).toBe(JSON.stringify({ name: "Misty" }));
});

it("client.get uses token argument and bypasses globals when provided", async () => {
  const calls = [];
  setAuthToken("should-not-be-used");
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () => JSON.stringify({ ok: true })
    };
  };
  await client.get("/me", "argument-token");
  expect(calls.length).toBe(1);
  expect(calls[0].options.method).toBe("GET");
  expect(calls[0].options.headers.Authorization).toBe("Bearer argument-token");
});

it("client.postMultipart forwards FormData without forcing Content-Type", async () => {
  let capturedHeaders = null;
  global.fetch = async (_url, options) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      text: async () => JSON.stringify({ uploaded: true })
    };
  };
  const form = new global.FormData();
  form.append("photo", "example.png");
  await client.postMultipart("/upload", form, {
    headers: { "X-Test": "1" }
  });
  expect(capturedHeaders).toBeTruthy();
  expect(capturedHeaders["X-Test"]).toBe("1");
  expect(capturedHeaders["Content-Type"]).toBeUndefined();
});

it("client throws ApiError with status/data when response is not ok", async () => {
  global.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => JSON.stringify({ message: "Unauthorized" })
  });
  await expect(client.get("/secure")).rejects.toMatchObject({
    status: 401,
    data: { message: "Unauthorized" }
  });
});

it("Subscription helpers propagate explicit tokens and payloads", async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () => JSON.stringify({ success: true })
    };
  };
  await client.post("/subscribe/start", { type: "trial" }, "token-123");
  await client.post("/subscribe/cancel", {}, "token-123");
  await client.get("/api/subscribe/status", "token-123");
  expect(calls.length).toBe(3);
  calls.forEach(({ options }) => {
    expect(options.headers.Authorization).toBe("Bearer token-123");
  });
  const trialCall = calls[0];
  expect(trialCall.options.body).toBe(JSON.stringify({ type: "trial" }));
});

it("Marketplace transforms handle array and nested payload shapes", () => {
  const nested = { data: { courses: [{ _id: "1" }], hasMore: true } };
  const bare = [{ _id: "2" }, { _id: "3" }];
  const empty = { data: { courses: [] } };
  expect(extractCourses(nested)).toEqual([{ _id: "1" }]);
  expect(extractCourses(bare)).toEqual(bare);
  expect(extractHasMore(nested)).toBe(true);
  expect(extractHasMore(empty)).toBe(false);
  expect(extractHasMore(bare)).toBe(true);
});

it("requirePro executes the action for Pro users", () => {
  const navigation = { navigate: () => {} };
  let called = false;
  requirePro(navigation, true, () => {
    called = true;
  });
  expect(called).toBe(true);
});

it("requirePro navigates to Paywall for free users", () => {
  const navigation = {
    screen: null,
    navigate(s) {
      this.screen = s;
    }
  };
  let called = false;
  requirePro(navigation, false, () => {
    called = true;
  });
  expect(called).toBe(false);
  expect(navigation.screen).toBe("Paywall");
});

it("isPro403Error detects errors with status/data and Axios-style response objects", () => {
  const apiError = new ApiError("PRO", 403, { message: "PRO required" });
  expect(isPro403Error(apiError)).toBe(true);
  const axiosError = { response: { status: 403, data: { message: "PRO required" } } };
  expect(isPro403Error(axiosError)).toBe(true);
  expect(isPro403Error(new Error("Other"))).toBe(false);
});

it("handleApiError navigates only when error requires PRO", () => {
  const navigation = {
    screen: null,
    navigate(s) {
      this.screen = s;
    }
  };
  const proError = new ApiError("PRO", 403, { message: "PRO required" });
  const handled = handleApiError(proError, navigation);
  expect(handled).toBe(true);
  expect(navigation.screen).toBe("Paywall");
  const otherError = new ApiError("Other", 500);
  const handledOther = handleApiError(otherError, navigation);
  expect(handledOther).toBe(false);
});
