import { describe, it, beforeEach, expect } from "@jest/globals";
import * as tasksApi from "../../src/api/tasks.js";
import * as growsApi from "../../src/api/grows.js";
import * as postsApi from "../../src/api/posts.js";
import { ROUTES } from "../../src/api/routes.js";

// Mock global fetch
let fetchCalls = [];
global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  return {
    ok: true,
    text: async () => JSON.stringify({ success: true, data: {} }),
    json: async () => ({ success: true, data: {} })
  };
};

global.API_URL_OVERRIDE = "http://test-api.com";
global.authToken = "test-token";

if (typeof FormData === "undefined") {
  global.FormData = class FormData {
    constructor() {
      this.data = [];
    }
    append(k, v) {
      this.data.push([k, v]);
    }
  };
}

describe("API Configuration & Endpoints", () => {
  beforeEach(() => {
    fetchCalls = [];
  });

  describe("Route Map Contract", () => {
    it("ROUTES has correct literal values", () => {
      expect(ROUTES.AUTH.LOGIN).toBe("/api/auth/login");
      expect(ROUTES.TASKS.TODAY).toBe("/api/tasks/today");
      expect(ROUTES.GROWS.LIST).toBe("/api/grows");
      expect(ROUTES.TASKS.COMPLETE("123")).toBe("/api/tasks/123/complete");
    });
  });

  describe("Tasks API with Shared Config", () => {
    it("getTodayTasks uses ROUTES.TASKS.TODAY", async () => {
      await tasksApi.getTodayTasks("token123");
      expect(fetchCalls.length).toBe(1);
      expect(fetchCalls[0].url.endsWith(ROUTES.TASKS.TODAY)).toBe(true);
    });

    it("completeTask uses ROUTES.TASKS.COMPLETE", async () => {
      await tasksApi.completeTask("task_99", "token123");
      expect(fetchCalls[0].url.endsWith("/api/tasks/task_99/complete")).toBe(true);
      expect(fetchCalls[0].options.method).toBe("PUT");
    });
  });

  describe("Grows API with Shared Config", () => {
    it("addEntry uses ROUTES.GROWS.ENTRIES", async () => {
      await growsApi.addEntry("grow_1", {});
      expect(fetchCalls[0].url.endsWith(ROUTES.GROWS.ENTRIES("grow_1"))).toBe(true);
    });

    it("listGrows appends filters as query parameters", async () => {
      await growsApi.listGrows({ stage: "veg", search: "blue dream" });
      const parsed = new URL(fetchCalls[0].url);
      expect(parsed.pathname).toBe(ROUTES.GROWS.LIST);
      expect(parsed.searchParams.get("stage")).toBe("veg");
      expect(parsed.searchParams.get("search")).toBe("blue dream");
    });
  });
});
