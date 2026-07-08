const mockApiRequest = jest.fn();

// Mock the API client to return canned responses for all endpoints
jest.mock("../../src/api/client", () => {
  if (!global.__FETCH_CALLS__) global.__FETCH_CALLS__ = [];
  const record = (method, url) => global.__FETCH_CALLS__.push({ method, url });
  const canned = {
    get: async (path) => {
      record("GET", path);
      if (path.includes("/commercial/feed"))
        return {
          items: [
            {
              id: "campaign-1",
              title: "Dashboard campaign 1",
              body: "Commercial outreach campaign",
              authorType: "commercial"
            },
            {
              id: "campaign-2",
              title: "Dashboard campaign 2",
              body: "Facility outreach campaign",
              authorType: "facility"
            }
          ]
        };
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

jest.mock("../../src/api/apiRequest", () => ({
  __esModule: true,
  apiRequest: (...args) => mockApiRequest(...args)
}));
import { describe, it, beforeAll, beforeEach } from "@jest/globals";
let authApi, commercialFeedApi;
global.API_URL_OVERRIDE = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:5001";
global.authToken = "test-token";
const isLiveBackend = process.env.USE_LIVE_BACKEND === "true";

describe("Acceptance: Dashboard Campaign Placements", () => {
  const fetchCalls = () => global.__FETCH_CALLS__ || [];

  beforeAll(() => {
    authApi = require("../../src/api/auth.js");
    commercialFeedApi = require("../../src/api/commercialFeed.ts");
  });

  beforeEach(() => {
    if (!global.__FETCH_CALLS__) {
      global.__FETCH_CALLS__ = [];
    } else {
      global.__FETCH_CALLS__.length = 0;
    }

    mockApiRequest.mockReset();

    const record = (method, url) => global.__FETCH_CALLS__.push({ method, url });

    const withParams = (base, params) => {
      if (!params || typeof params !== "object") return base;
      const entries = Object.entries(params).flatMap(([key, value]) => {
        if (value === undefined || value === null) return [];
        if (Array.isArray(value)) return value.map((v) => [key, v]);
        return [[key, value]];
      });
      if (!entries.length) return base;
      const qs = entries
        .map(([key, value]) => {
          const v = typeof value === "string" ? value : String(value);
          return `${encodeURIComponent(String(key))}=${encodeURIComponent(v)}`;
        })
        .join("&");
      const glue = base.includes("?") ? "&" : "?";
      return `${base}${glue}${qs}`;
    };

    mockApiRequest.mockImplementation(async (url, options = {}) => {
      const base = typeof url === "string" ? url : String(url);
      const urlStr = withParams(base, options.params);
      const method = options.method ? String(options.method).toUpperCase() : "GET";
      record(method, urlStr);

      if (typeof globalThis.__MOCK_RESPONDER__ === "function") {
        const res = await globalThis.__MOCK_RESPONDER__(urlStr, options);
        if (res && Object.prototype.hasOwnProperty.call(res, "json")) return res.json;
        if (res && Object.prototype.hasOwnProperty.call(res, "text")) return res.text;
        return res;
      }

      return { success: true };
    });

    globalThis.__MOCK_RESPONDER__ = async (url) => {
      if (url.includes("/api/commercial/feed")) {
        return {
          json: {
            items: [
              {
                id: "campaign-1",
                type: "listing",
                campaignKind: "product_ad",
                title: "Dashboard campaign 1",
                body: "Commercial outreach campaign",
                authorType: "commercial",
                createdAt: new Date().toISOString()
              },
              {
                id: "campaign-2",
                type: "education",
                campaignKind: "facility_outreach",
                title: "Dashboard campaign 2",
                body: "Facility outreach campaign",
                authorType: "facility",
                createdAt: new Date().toISOString()
              }
            ]
          }
        };
      }
      // Always return a valid token for any /api endpoint
      if (url.includes("/api/")) return { json: { success: true, token: "mock-token" } };
      return { json: { success: true } };
    };
  });

  it("should fetch campaign feed placements when loading dashboard data", async () => {
    if (isLiveBackend) {
      return;
    }
    await commercialFeedApi.listCommercialFeedCampaigns({ limit: 6, sort: "new" });
    expect(fetchCalls().some((c) => c.url.includes("/api/commercial/feed"))).toBe(true);
    expect(fetchCalls().every((c) => !c.url.includes("/api/posts/"))).toBe(true);
  });

  if (isLiveBackend) {
    it("should return valid campaigns from live feed", async () => {
      const email = `test-feed-${Date.now()}@example.com`;
      const password = "password123";

      try {
        await authApi.signup(email, password, "Feed Tester");
      } catch (e) {}

      await authApi.login(email, password);
      const campaigns = await commercialFeedApi.listCommercialFeedCampaigns({ limit: 6 });

      expect(Array.isArray(campaigns.items)).toBe(true);
      if (campaigns.items.length > 0) {
        expect(campaigns.items[0].title || campaigns.items[0].body).toBeTruthy();
      }
    });
  }
});
