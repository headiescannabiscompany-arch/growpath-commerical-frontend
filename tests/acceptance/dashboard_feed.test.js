import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert";

// Ensure fetch is available in Node.js environment
if (typeof fetch === "undefined") {
  try {
    const { fetch: undiciFetch, FormData: undiciFormData } = await import("undici");
    global.fetch = undiciFetch;
    global.FormData = undiciFormData;
  } catch (e) {
    global.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  }
}

global.API_URL_OVERRIDE = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:5001";
global.authToken = "test-token";

const isLiveBackend = process.env.USE_LIVE_BACKEND === "true";

describe("Acceptance: Dashboard Feed", async () => {
  let authApi, postsApi;
  const fetchCalls = global.__FETCH_CALLS__ || [];

  before(async () => {
    authApi = await import("../../src/api/auth.js");
    postsApi = await import("../../src/api/posts.js");
  });

  beforeEach(async () => {
    if (global.__FETCH_CALLS__) {
      global.__FETCH_CALLS__.length = 0;
    }

    globalThis.__MOCK_RESPONDER__ = async (url) => {
       if (url.includes("/api/auth/login")) return { json: { token: "mock-token", user: { id: "u1" } } };
       if (url.includes("/api/posts/feed")) return { json: [
         { _id: "p1", text: "Dashboard post 1", createdAt: new Date().toISOString(), user: { username: "user1" } },
         { _id: "p2", text: "Dashboard post 2", createdAt: new Date().toISOString(), user: { username: "user2" } }
       ] };
       return { json: { success: true } };
    };
  });

  it("should fetch feed posts when loading dashboard data", async (t) => {
    if (isLiveBackend) {
      t.skip("Skipping mock-based test in live backend mode");
      return;
    }
    // Simulate what DashboardScreen does
    await postsApi.getFeed(1, global.authToken);
    
    assert.ok(
      fetchCalls.some(c => c.url.includes("/api/posts/feed")),
      "Dashboard should fetch the feed"
    );
  });

  if (isLiveBackend) {
    it("should return valid posts from live feed", async () => {
      const email = `test-feed-${Date.now()}@example.com`;
      const password = "password123";
      
      try {
        await authApi.signup(email, password, "Feed Tester");
      } catch (e) {}

      await authApi.login(email, password);
      const posts = await postsApi.getFeed(1);
      
      assert.ok(Array.isArray(posts), "Feed should return an array");
      // If there are posts, they should have expected fields
      if (posts.length > 0) {
        assert.ok(posts[0].text || posts[0].content, "Post should have text or content");
      }
    });
  }
});
