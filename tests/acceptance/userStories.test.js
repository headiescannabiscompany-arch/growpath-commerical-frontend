import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert";
import { setupNetworkMock } from "../test_utils.js";

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

if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() { this.data = []; }
    append(k, v) { this.data.push([k, v]); }
  };
}

describe("Acceptance: User Stories", async () => {
  let authApi, tasksApi, growsApi, forumApi, coursesApi, usersApi, creatorApi, diagnoseApi, guildsApi;
  const fetchCalls = global.__FETCH_CALLS__ || [];
  let specAvailable = false;

  before(async () => {
    authApi = await import("../../src/api/auth.js");
    tasksApi = await import("../../src/api/tasks.js");
    growsApi = await import("../../src/api/grows.js");
    forumApi = await import("../../src/api/forum.js");
    coursesApi = await import("../../src/api/courses.js");
    usersApi = await import("../../src/api/users.js");
    creatorApi = await import("../../src/api/creator.js");
    diagnoseApi = await import("../../src/api/diagnose.js");
    guildsApi = await import("../../src/api/guilds.js");

    const { getSpec } = await import("../contract_utils.js");
    const spec = await getSpec();
    specAvailable = !!spec;
  });

  beforeEach(() => {
    // Clear the global calls array between tests
    if (global.__FETCH_CALLS__) {
      global.__FETCH_CALLS__.length = 0;
    }

    // Set up mock responder for non-live mode
    globalThis.__MOCK_RESPONDER__ = async (url, options) => {
       if (url.includes("/api/auth/signup")) return { json: { token: "mock-token", user: { id: "u1" } } };
       if (url.includes("/api/auth/login")) return { json: { token: "mock-token", user: { id: "u1" } } };
       if (url.includes("/api/auth/become-creator")) return { json: { ok: true, role: "creator" } };
       if (url.includes("/api/user/creator/onboard")) return { json: { url: "https://stripe.com/onboard" } };
       if (url.includes("/api/creator/signature")) return { json: { success: true, url: "/sig.png" } };
       if (url.includes("/api/tasks/today")) return { json: [{ _id: "t1", title: "Test Task" }] };
       if (url.includes("/api/grows")) return { json: { _id: "g1", title: "Live Test Plant" } };
       if (url.includes("/api/forum/create")) return { json: { _id: "f1", title: "Live Question" } };
       if (url.includes("/api/courses/create")) return { json: { _id: "c1", title: "New Course" } };
       if (url.includes("/api/courses/list")) return { json: { courses: [{ _id: "c1", title: "Intro to Growing" }], total: 1, hasMore: false } };
       if (url.includes("/api/courses") && url.includes("/enroll")) return { json: { success: true } };
       if (url.includes("/api/user/certificates")) return { json: [{ certificateId: "cert123", course: { title: "Intro" } }] };
       if (url.includes("/api/diagnose/analyze")) return { json: { _id: "d1", issueSummary: "Yellowing leaves", severity: 2 } };
       if (url.includes("/api/guilds")) return { json: [{ _id: "guild1", name: "Master Growers" }] };
       if (url.includes("/api/user/follow/u2")) return { json: { following: true } };
       return { json: { success: true } };
    };
  });

  it("User Story: Login and view tasks", async (t) => {
    if (process.env.USE_LIVE_BACKEND === "true" && !specAvailable) {
       t.skip("OpenAPI spec missing - cannot run contract validation in live mode");
       return;
    }
    const email = `test-${Date.now()}@example.com`;
    const password = "password123";
    const displayName = "Test User";
    
    // Register first if using live backend to ensure user exists
    if (process.env.USE_LIVE_BACKEND === "true") {
      try {
        await authApi.signup(email, password, displayName);
      } catch (e) {
        console.warn("Registration failed:", e.message);
      }
    }

    await authApi.login(email, password);
    assert.ok(global.authToken, "Token should be set globally after login");
    assert.ok(fetchCalls.some(c => c.url.includes("/api/auth/login")), "Login endpoint hit");

    await tasksApi.getTodayTasks(global.authToken);
    assert.ok(fetchCalls.some(c => c.url.includes("/api/tasks/today")), "Tasks endpoint hit");
  });

  it("User Story: Create a grow and add a log entry", async (t) => {
    if (process.env.USE_LIVE_BACKEND === "true" && !specAvailable) {
       t.skip("OpenAPI spec missing");
       return;
    }
    const grow = await growsApi.createGrow({ title: "Live Test Plant", name: "Live Test Plant", body: "Growing fast" });
    assert.ok(fetchCalls.some(c => c.url.includes("/api/grows")), "Create grow hit");

    const growId = grow?._id || grow?.id || "g123";
    await growsApi.addEntry(growId, "Real entry", ["test"]);
    assert.ok(fetchCalls.some(c => c.url.includes(`/api/grows/${growId}/entries`)), "Add entry hit");
  });

  it("User Story: Post to forum and comment", async (t) => {
    if (process.env.USE_LIVE_BACKEND === "true" && !specAvailable) {
       t.skip("OpenAPI spec missing");
       return;
    }
    const post = await forumApi.createPost({ title: "Live Question", content: "How is it going?" });
    assert.ok(fetchCalls.some(c => c.url.includes("/api/forum/create")), "Forum create hit");

    const postId = post?._id || post?.id || "f123";
    await forumApi.addComment(postId, "Looking good!");
    assert.ok(fetchCalls.some(c => c.url.includes("/api/forum") && c.url.includes("/comment")), "Comment hit");
  });

  it("User Story: Creator Onboarding and Course Creation", async (t) => {
    if (process.env.USE_LIVE_BACKEND === "true" && !specAvailable) {
       t.skip("OpenAPI spec missing");
       return;
    }

    await authApi.becomeCreator();
    assert.ok(fetchCalls.some(c => c.url.includes("/api/auth/become-creator")), "Become creator hit");

    await usersApi.onboardCreator("https://res.url", "https://ret.url");
    assert.ok(fetchCalls.some(c => c.url.includes("/api/user/creator/onboard")), "Stripe onboard hit");

    const sigData = new global.FormData();
    sigData.append("signature", "fake-sig");
    await creatorApi.uploadSignature(sigData);
    assert.ok(fetchCalls.some(c => c.url.includes("/api/creator/signature")), "Signature upload hit");

    await coursesApi.createCourse({ title: "Masterclass", description: "Expert tips", priceCents: 5000 });
    assert.ok(fetchCalls.some(c => c.url.includes("/api/courses")), "Course creation hit");
  });

  it("User Story: Search, Enroll, and Earn Certificates", async (t) => {
    if (process.env.USE_LIVE_BACKEND === "true" && !specAvailable) {
       t.skip("OpenAPI spec missing");
       return;
    }

    await coursesApi.listCourses(1);
    assert.ok(fetchCalls.some(c => c.url.includes("/api/courses/list")), "List courses hit");

    await coursesApi.enrollInCourse("c1");
    assert.ok(fetchCalls.some(c => c.url.includes("/api/courses/c1/enroll")), "Enrollment hit");

    await usersApi.getCertificates();
    assert.ok(fetchCalls.some(c => c.url.includes("/api/user/certificates")), "Get certificates hit");
  });

  it("User Story: Cultivation Management and AI Diagnosis", async (t) => {
    if (process.env.USE_LIVE_BACKEND === "true" && !specAvailable) {
       t.skip("OpenAPI spec missing");
       return;
    }

    const grow = await growsApi.createGrow({ title: "White Widow", name: "WW #1" });
    assert.ok(fetchCalls.some(c => c.url.includes("/api/grows")), "Create grow hit");

    await diagnoseApi.analyzeDiagnosis({ notes: "Bottom leaves are yellowing", stage: "veg" });
    assert.ok(fetchCalls.some(c => c.url.includes("/api/diagnose/analyze")), "AI analysis hit");
  });

  it("User Story: Social Networking and Community Guilds", async (t) => {
    if (process.env.USE_LIVE_BACKEND === "true" && !specAvailable) {
       t.skip("OpenAPI spec missing");
       return;
    }

    await usersApi.followUser("u2");
    assert.ok(fetchCalls.some(c => c.url.includes("/api/user/follow/u2")), "Follow user hit");

    await guildsApi.listGuilds();
    assert.ok(fetchCalls.some(c => c.url.includes("/api/guilds")), "List guilds hit");

        await guildsApi.joinGuild("guild1");

        assert.ok(fetchCalls.some(c => c.url.includes("/api/guilds/guild1/join")), "Join guild hit");

      });

    

  it("User Story: Guild Member Access (Gated Features)", async (t) => {
    const { getEntitlements } = await import("../../src/utils/entitlements.js");
    
    // 1. Mock a non-pro Guild member
    globalThis.__MOCK_RESPONDER__ = async (url) => {
       if (url.includes("/api/auth/login")) return { 
          json: { token: "guild-token", user: { id: "u-guild", subscriptionStatus: "free", guilds: ["guild1"] } } 
       };
       return { json: { success: true } };
    };

    const loginRes = await authApi.login("guild@member.com", "pass");
    assert.strictEqual(global.user.subscriptionStatus, "free");
    assert.ok(global.user.guilds.length > 0, "Should be guild member");

    // 2. Verify AI/VPD access (surfaced via logic)
    await diagnoseApi.analyzeDiagnosis({ notes: "test" });
    assert.ok(fetchCalls.some(c => c.url.includes("/api/diagnose/analyze")), "AI Analysis hit for guild member");

    // 3. Verify logic mapping matches backend rules
    const entitlements = getEntitlements(global.user);
    assert.strictEqual(entitlements.isPro, false, "Guild member should not be Pro");
    assert.strictEqual(entitlements.isEntitled, true, "Guild member should be entitled to AI tools");
  });
});


        

    