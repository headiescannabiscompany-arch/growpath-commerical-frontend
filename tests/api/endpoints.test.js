import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert";

// Mock global fetch
let fetchCalls = [];
global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  return {
    ok: true,
    text: async () => JSON.stringify({ success: true, data: {} }),
    json: async () => ({ success: true, data: {} }),
  };
};

global.API_URL_OVERRIDE = "http://test-api.com";
global.authToken = "test-token";

if (typeof FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() { this.data = []; }
    append(k, v) { this.data.push([k, v]); }
  };
}

describe("API Configuration & Endpoints", async () => {
  let tasksApi, growsApi, postsApi, ROUTES;

  before(async () => {
    const routesMod = await import("../../src/api/routes.js");
    ROUTES = routesMod.default || routesMod.ROUTES;
    
    tasksApi = await import("../../src/api/tasks.js");
    growsApi = await import("../../src/api/grows.js");
    postsApi = await import("../../src/api/posts.js");
  });

  beforeEach(() => {
    fetchCalls = [];
  });

  describe("Route Map Contract", () => {
    it("ROUTES has correct literal values", () => {
      assert.strictEqual(ROUTES.AUTH.LOGIN, "/api/auth/login");
      assert.strictEqual(ROUTES.TASKS.TODAY, "/api/tasks/today");
      assert.strictEqual(ROUTES.GROWS.LIST, "/api/grows");
      assert.strictEqual(ROUTES.TASKS.COMPLETE("123"), "/api/tasks/123/complete");
    });
  });

  describe("Tasks API with Shared Config", () => {
    it("getTodayTasks uses ROUTES.TASKS.TODAY", async () => {
      await tasksApi.getTodayTasks("token123");
      assert.strictEqual(fetchCalls.length, 1);
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.TASKS.TODAY));
    });

    it("completeTask uses ROUTES.TASKS.COMPLETE", async () => {
      await tasksApi.completeTask("task_99", "token123");
      assert.ok(fetchCalls[0].url.endsWith("/api/tasks/task_99/complete"));
      assert.strictEqual(fetchCalls[0].options.method, "PUT");
    });
  });

  describe("Grows API with Shared Config", () => {
    it("addEntry uses ROUTES.GROWS.ENTRIES", async () => {
      await growsApi.addEntry("grow_1", "note", []);
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.GROWS.ENTRIES("grow_1")));
    });

    it("listGrows appends filters as query parameters", async () => {
      await growsApi.listGrows({ stage: "veg", search: "blue dream" });
      const parsed = new URL(fetchCalls[0].url);
      assert.strictEqual(parsed.pathname, ROUTES.GROWS.LIST);
      assert.strictEqual(parsed.searchParams.get("stage"), "veg");
      assert.strictEqual(parsed.searchParams.get("search"), "blue dream");
    });
  });
});
