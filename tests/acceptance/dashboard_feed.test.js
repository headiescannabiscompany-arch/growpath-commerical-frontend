// Mock the API client to return canned responses for all endpoints
jest.mock("../../src/api/client", () => {
  if (!global.__FETCH_CALLS__) global.__FETCH_CALLS__ = [];
  const record = (method, url) => global.__FETCH_CALLS__.push({ method, url });
  const canned = {
    get: async (path) => {
      record("GET", path);
      if (path.includes("/posts/feed"))
        return [
          { _id: "p1", text: "Dashboard post 1", user: { username: "user1" } },
          { _id: "p2", text: "Dashboard post 2", user: { username: "user2" } }
        ];
      if (path.includes("/auth/login")) {
        const user = { plan: "free", subscriptionStatus: "free", guilds: ["guild1"] };
        global.user = user;
        return { token: "test-token", user };
      }
      if (path.includes("/tasks")) return [];
      if (path.includes("/forum")) return { posts: [] };
      if (path.includes("/courses")) return [];
      return {};
    },
    post: async (path) => {
      record("POST", path);
      if (path.includes("/auth/login")) {
        const user = { plan: "free", subscriptionStatus: "free", guilds: ["guild1"] };
        global.user = user;
        return { token: "test-token", user };
      }
      return { success: true };
    },
    put: async (path) => {
      record("PUT", path);
      return { success: true };
    },
    delete: async (path) => {
      record("DELETE", path);
      return { success: true };
    },
    postMultipart: async (path) => {
      record("POSTMULTIPART", path);
      return { success: true };
    }
  };
  const api = async (path, options = {}) => {
    const method = options && options.method ? options.method.toUpperCase() : "GET";
    if (method === "POST") return canned.post(path, options);
    if (method === "PUT") return canned.put(path, options);
    if (method === "DELETE") return canned.delete(path, options);
    return canned.get(path, options);
  };
  const client = Object.assign(api, canned);
  return {
    __esModule: true,
    default: client,
    client,
    api,
    postMultipart: canned.postMultipart
  };
});
import { describe, it, beforeAll, beforeEach } from "@jest/globals";
let authApi, postsApi;
global.API_URL_OVERRIDE = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:5001";
global.authToken = "test-token";
const isLiveBackend = process.env.USE_LIVE_BACKEND === "true";

describe("Acceptance: Dashboard Feed", () => {
  const fetchCalls = () => global.__FETCH_CALLS__ || [];

  beforeAll(() => {
    authApi = require("../../src/api/auth.js");
    postsApi = require("../../src/api/posts.js");
  });

  beforeEach(() => {
    if (global.__FETCH_CALLS__) {
      global.__FETCH_CALLS__.length = 0;
    }

    globalThis.__MOCK_RESPONDER__ = async (url) => {
      if (url.includes("/api/posts/feed")) {
        return {
          json: [
            {
              _id: "p1",
              text: "Dashboard post 1",
              createdAt: new Date().toISOString(),
              user: { username: "user1" },
              token: "mock-token"
            },
            {
              _id: "p2",
              text: "Dashboard post 2",
              createdAt: new Date().toISOString(),
              user: { username: "user2" },
              token: "mock-token"
            }
          ]
        };
      }
      // Always return a valid token for any /api endpoint
      if (url.includes("/api/")) return { json: { success: true, token: "mock-token" } };
      return { json: { success: true } };
    };
  });

  it("should fetch feed posts when loading dashboard data", async () => {
    if (isLiveBackend) {
      return;
    }
    // Simulate what DashboardScreen does
    await postsApi.getFeed(1, global.authToken);
    expect(fetchCalls().some((c) => c.url.includes("/api/posts/feed"))).toBe(true);
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

      expect(Array.isArray(posts)).toBe(true);
      // If there are posts, they should have expected fields
      if (posts.length > 0) {
        expect(posts[0].text || posts[0].content).toBeTruthy();
      }
    });
  }
});
