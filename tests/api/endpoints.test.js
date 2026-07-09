import { describe, it, beforeEach, expect } from "@jest/globals";
import * as tasksApi from "../../src/api/tasks.js";
import * as growsApi from "../../src/api/grows.js";
import * as personalLogsApi from "../../src/api/logs";
import * as postsApi from "../../src/api/posts.js";
import { listBatchCycles } from "../../src/api/facilityWorkflows";
import { getFacilityReport } from "../../src/api/reports";
import { createSOPTemplate, getSOPTemplates } from "../../src/api/sop";
import {
  approveVerification,
  getVerifications,
  rejectVerification
} from "../../src/api/verification";
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
      expect(ROUTES.GROWS.LIST).toBe("/api/personal/grows");
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

    it("personal task helpers send source, priority, snooze, and delete requests", async () => {
      await tasksApi.createPersonalTask({
        growId: "grow_1",
        title: "Follow up",
        description: "Check VPD",
        dueDate: "2026-07-01",
        priority: "high",
        sourceType: "ai_diagnosis",
        sourceObjectId: "diagnosis-1",
        sourceDiagnosisId: "diagnosis-1"
      });
      expect(fetchCalls[0].url.endsWith("/api/personal/tasks")).toBe(true);
      expect(fetchCalls[0].options.method).toBe("POST");
      expect(JSON.parse(fetchCalls[0].options.body)).toMatchObject({
        growId: "grow_1",
        priority: "high",
        sourceType: "ai_diagnosis",
        sourceObjectId: "diagnosis-1",
        sourceDiagnosisId: "diagnosis-1"
      });

      await tasksApi.updatePersonalTask("task 1", {
        snoozeUntil: "2026-07-02T12:00:00.000Z",
        completed: true
      });
      expect(fetchCalls[1].url.endsWith("/api/personal/tasks/task%201")).toBe(true);
      expect(fetchCalls[1].options.method).toBe("PATCH");
      expect(JSON.parse(fetchCalls[1].options.body)).toMatchObject({
        snoozeUntil: "2026-07-02T12:00:00.000Z",
        completed: true
      });

      await tasksApi.deletePersonalTask("task 1");
      expect(fetchCalls[2].url.endsWith("/api/personal/tasks/task%201")).toBe(true);
      expect(fetchCalls[2].options.method).toBe("DELETE");
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

    it("listPersonalGrows accepts top-level grows envelope", async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          text: async () =>
            JSON.stringify({ success: true, grows: [{ id: "g1", name: "Grow 1" }] }),
          json: async () => ({ success: true, grows: [{ id: "g1", name: "Grow 1" }] })
        };
      };

      try {
        const grows = await growsApi.listPersonalGrows();
        expect(fetchCalls[0].url.includes("/api/personal/grows")).toBe(true);
        expect(grows).toHaveLength(1);
        expect(grows[0].id).toBe("g1");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("getPersonalGrowTimeline accepts canonical timeline envelope", async () => {
      const originalFetch = global.fetch;
      global.fetch = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              success: true,
              timeline: [
                {
                  id: "GrowLog:1",
                  type: "log_created",
                  sourceModel: "GrowLog",
                  sourceId: "1",
                  title: "Journal",
                  timestamp: "2026-06-30T00:00:00.000Z"
                }
              ]
            }),
          json: async () => ({
            success: true,
            timeline: [
              {
                id: "GrowLog:1",
                type: "log_created",
                sourceModel: "GrowLog",
                sourceId: "1",
                title: "Journal",
                timestamp: "2026-06-30T00:00:00.000Z"
              }
            ]
          })
        };
      };

      try {
        const timeline = await growsApi.getPersonalGrowTimeline("grow 1");
        expect(fetchCalls[0].url.includes("/api/personal/grows/grow%201/timeline")).toBe(
          true
        );
        expect(timeline).toHaveLength(1);
        expect(timeline[0].type).toBe("log_created");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("appendGrowPhotos targets personal grow photo attachment endpoint", async () => {
      await growsApi.appendGrowPhotos("grow_1", ["/uploads/photo.jpg"]);
      expect(fetchCalls[0].url.endsWith("/api/personal/grows/grow_1/photos")).toBe(true);
      expect(fetchCalls[0].options.method).toBe("PATCH");
      expect(JSON.parse(fetchCalls[0].options.body).photos).toEqual([
        "/uploads/photo.jpg"
      ]);
    });
  });

  describe("Personal Logs API", () => {
    it("createPersonalLog sends photos and photo metadata", async () => {
      await personalLogsApi.createPersonalLog({
        growId: "grow_1",
        title: "Photo log",
        notes: "Bud sites checked",
        photos: ["/uploads/log.jpg"],
        photoMetadata: [
          {
            url: "/uploads/log.jpg",
            mimeType: "image/jpeg",
            width: 1200,
            height: 900,
            sizeBytes: 45678,
            stage: "flower",
            consentForAI: true,
            consentForTraining: false
          }
        ],
        tags: ["photo"],
        rejectedTags: ["pests"]
      });

      expect(fetchCalls[0].url.endsWith("/api/personal/logs")).toBe(true);
      expect(fetchCalls[0].options.method).toBe("POST");
      const body = JSON.parse(fetchCalls[0].options.body);
      expect(body.photos).toEqual(["/uploads/log.jpg"]);
      expect(body.photoMetadata[0]).toMatchObject({
        url: "/uploads/log.jpg",
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
        sizeBytes: 45678,
        stage: "flower",
        consentForAI: true,
        consentForTraining: false
      });
      expect(body.tags).toEqual(["photo"]);
      expect(body.rejectedTags).toEqual(["pests"]);
    });
  });

  describe("Facility P2 workflow endpoints", () => {
    it("facility report summary uses the facility-scoped reports endpoint", async () => {
      await getFacilityReport("facility 1");
      expect(
        fetchCalls[0].url.endsWith("/api/facilities/facility%201/reports/summary")
      ).toBe(true);
    });

    it("SOP templates use facility-scoped endpoints", async () => {
      await getSOPTemplates("f1");
      expect(fetchCalls[0].url.endsWith("/api/facilities/f1/sop-templates")).toBe(true);

      await createSOPTemplate("f1", { title: "Opening", content: "Steps" });
      expect(fetchCalls[1].options.method).toBe("POST");
      expect(fetchCalls[1].url.endsWith("/api/facilities/f1/sop-templates")).toBe(true);
    });

    it("verification queue uses facility-scoped approve and reject endpoints", async () => {
      await getVerifications("f1");
      expect(fetchCalls[0].url.endsWith("/api/facilities/f1/verification")).toBe(true);

      await approveVerification("f1", "v1");
      expect(fetchCalls[1].options.method).toBe("POST");
      expect(fetchCalls[1].url.endsWith("/api/facilities/f1/verification/v1")).toBe(true);

      await rejectVerification("f1", "v1", "Missing image");
      expect(fetchCalls[2].options.method).toBe("PUT");
      expect(
        fetchCalls[2].url.endsWith("/api/facilities/f1/verification/v1/reject")
      ).toBe(true);
      expect(JSON.parse(fetchCalls[2].options.body).reason).toBe("Missing image");
    });

    it("batch cycles use facility-scoped workflow endpoint", async () => {
      await listBatchCycles("f1");
      expect(fetchCalls[0].url.endsWith("/api/facility/f1/batch-cycles")).toBe(true);
    });
  });
});
