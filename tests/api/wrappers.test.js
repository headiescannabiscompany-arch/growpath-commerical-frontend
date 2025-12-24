const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert");

// Setup minimal fetch spy
let fetchCalls = [];
global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  return {
    ok: true,
    text: async () => JSON.stringify({ success: true, token: "success-token", user: { id: "u1" } }),
    json: async () => ({ success: true, token: "success-token", user: { id: "u1" } }),
  };
};

global.API_URL_OVERRIDE = "http://test-api.local";
global.authToken = "unit-test-token";

if (typeof FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() { this.data = []; }
    append(k, v) { this.data.push([k, v]); }
  };
}

describe("API Wrappers Unit Tests", async () => {
  let ROUTES;
  
  before(async () => {
    const routesMod = await import("../../src/api/routes.js");
    ROUTES = routesMod.default || routesMod.ROUTES;
  });

  beforeEach(() => {
    fetchCalls = [];
  });

  it("Users API: followUser uses POST and correct path", async () => {
    const { followUser } = await import("../../src/api/users.js");
    await followUser("u1");
    assert.strictEqual(fetchCalls[0].options.method, "POST");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.USER.FOLLOW("u1")));
  });

  it("Users API: updateBio uses POST and correct path", async () => {
    const { updateBio } = await import("../../src/api/users.js");
    await updateBio("New bio");
    assert.strictEqual(fetchCalls[0].options.method, "POST");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.USER.BIO));
    assert.strictEqual(JSON.parse(fetchCalls[0].options.body).bio, "New bio");
  });

  it("Courses API: enrollInCourse uses POST", async () => {
    const { enrollInCourse } = await import("../../src/api/courses.js");
    await enrollInCourse("c1");
    assert.strictEqual(fetchCalls[0].options.method, "POST");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.COURSES.ENROLL("c1")));
  });

  it("Courses API: buyCourse uses POST", async () => {
    const { buyCourse } = await import("../../src/api/courses.js");
    await buyCourse("c1");
    assert.strictEqual(fetchCalls[0].options.method, "POST");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.COURSES.BUY("c1")));
  });

  it("Forum API: createPost uses POST", async () => {
    const { createPost } = await import("../../src/api/forum.js");
    await createPost({ title: "Test" });
    assert.strictEqual(fetchCalls[0].options.method, "POST");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.FORUM.CREATE));
  });

  it("Tasks API: reopenTask uses PUT", async () => {
    const { reopenTask } = await import("../../src/api/tasks.js");
    await reopenTask("t1");
    assert.strictEqual(fetchCalls[0].options.method, "PUT");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.TASKS.REOPEN("t1")));
  });

  it("Tasks API: deleteTask uses DELETE", async () => {
    const { deleteTask } = await import("../../src/api/tasks.js");
    await deleteTask("t1");
    assert.strictEqual(fetchCalls[0].options.method, "DELETE");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.TASKS.DELETE("t1")));
  });

  it("Environment API: envToTasks uses POST", async () => {
    const { envToTasks } = await import("../../src/api/environment.js");
    await envToTasks("p1", ["action1"]);
    assert.strictEqual(fetchCalls[0].options.method, "POST");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.ENVIRONMENT.TO_TASKS("p1")));
  });

  it("Creator API: uploadSignature uses POST", async () => {
    const { uploadSignature } = await import("../../src/api/creator.js");
    const fd = new FormData();
    await uploadSignature(fd);
    assert.strictEqual(fetchCalls[0].options.method, "POST");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.CREATOR.SIGNATURE));
  });

  it("Subscription API: createCheckoutSession uses POST", async () => {
    const { createCheckoutSession } = await import("../../src/api/subscription.js");
    await createCheckoutSession();
    assert.strictEqual(fetchCalls[0].options.method, "POST");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.SUBSCRIBE.CREATE_CHECKOUT_SESSION));
  });

  it("Guilds API: joinGuild uses POST", async () => {
    const { joinGuild } = await import("../../src/api/guilds.js");
    await joinGuild("g1");
    assert.strictEqual(fetchCalls[0].options.method, "POST");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.GUILDS.JOIN("g1")));
  });

  it("Lives API: updateLive uses PUT", async () => {
    const { updateLive } = await import("../../src/api/lives.js");
    await updateLive("l1", { title: "Updated" });
    assert.strictEqual(fetchCalls[0].options.method, "PUT");
    assert.ok(fetchCalls[0].url.endsWith(ROUTES.LIVES.UPDATE("l1")));
  });

  describe("Authentication API", () => {
    it("login sets global token and user", async () => {
      const { login } = await import("../../src/api/auth.js");
      const user = await login("test@test.com", "pass");
      assert.strictEqual(fetchCalls[0].options.method, "POST");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.AUTH.LOGIN));
      assert.strictEqual(global.authToken, "success-token"); // from mock json response logic if I update mock
    });

    it("signup sends correct payload", async () => {
      const { signup } = await import("../../src/api/auth.js");
      await signup("test@test.com", "pass", "Name");
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.strictEqual(body.displayName, "Name");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.AUTH.SIGNUP));
    });
  });

  describe("Plants API", () => {
    it("getPlants uses GET", async () => {
      const { getPlants } = await import("../../src/api/plants.js");
      await getPlants("token");
      assert.strictEqual(fetchCalls[0].options.method, "GET");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.PLANTS.LIST));
    });

    it("exportPlantPdf uses correct export path", async () => {
      const { exportPlantPdf } = await import("../../src/api/plants.js");
      await exportPlantPdf("p123");
      assert.ok(fetchCalls[0].url.endsWith("/api/plants/p123/export"));
    });
  });

  describe("Forum API", () => {
    it("listPosts uses GET", async () => {
      const { listPosts } = await import("../../src/api/forum.js");
      await listPosts();
      assert.strictEqual(fetchCalls[0].options.method, "GET");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.FORUM.LIST));
    });

    it("likePost uses POST", async () => {
      const { likePost } = await import("../../src/api/forum.js");
      await likePost("f1");
      assert.strictEqual(fetchCalls[0].options.method, "POST");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.FORUM.LIKE("f1")));
    });

    it("addComment sends text and parentId", async () => {
      const { addComment } = await import("../../src/api/forum.js");
      await addComment("f1", "Hello", "p1");
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.strictEqual(body.text, "Hello");
      assert.strictEqual(body.parentId, "p1");
    });
  });

  describe("Courses API", () => {
    it("getCourse uses GET", async () => {
      const { getCourse } = await import("../../src/api/courses.js");
      await getCourse("c1");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.COURSES.DETAIL("c1")));
    });

    it("publishCourse uses PUT", async () => {
      const { publishCourse } = await import("../../src/api/courses.js");
      await publishCourse("c1");
      assert.strictEqual(fetchCalls[0].options.method, "PUT");
    });

    it("completeLesson sends courseId", async () => {
      const { completeLesson } = await import("../../src/api/courses.js");
      await completeLesson("l1", "c1");
      assert.strictEqual(JSON.parse(fetchCalls[0].options.body).courseId, "c1");
    });
  });

  describe("GrowLog API", () => {
    it("autoTagEntry uses POST", async () => {
      const { autoTagEntry } = await import("../../src/api/growlog.js");
      await autoTagEntry("e1");
      assert.strictEqual(fetchCalls[0].options.method, "POST");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.GROWLOG.AUTO_TAG("e1")));
    });
  });

  describe("Tokens API", () => {
    it("getTokenBalance uses GET", async () => {
      const { getTokenBalance } = await import("../../src/api/tokens.js");
      await getTokenBalance("token");
      assert.strictEqual(fetchCalls[0].options.method, "GET");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.TOKENS.BALANCE));
    });
  });

  describe("Reports API", () => {
    it("submitReport sends contentId", async () => {
      const { submitReport } = await import("../../src/api/reports.js");
      await submitReport({ contentId: "id1", reason: "spam" });
      assert.strictEqual(JSON.parse(fetchCalls[0].options.body).contentId, "id1");
    });
  });

  describe("Creator API", () => {
    it("getCourseAnalytics uses correct template", async () => {
      const { getCourseAnalytics } = await import("../../src/api/creator.js");
      await getCourseAnalytics("c123");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.CREATOR.ANALYTICS("c123")));
    });

    it("getMyEarnings hits correct endpoint", async () => {
      const { getMyEarnings } = await import("../../src/api/earnings.js");
      await getMyEarnings();
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.CREATOR.MINE));
    });
  });

  describe("Guilds API", () => {
    it("listGuilds uses GET", async () => {
      const { listGuilds } = await import("../../src/api/guilds.js");
      await listGuilds();
      assert.strictEqual(fetchCalls[0].options.method, "GET");
    });

    it("joinGuild uses POST", async () => {
      const { joinGuild } = await import("../../src/api/guilds.js");
      await joinGuild("g1");
      assert.strictEqual(fetchCalls[0].options.method, "POST");
      assert.ok(fetchCalls[0].url.endsWith("/join"));
    });
  });

  describe("Certificates API", () => {
    it("getMyCertificates hits correct route", async () => {
      const { getMyCertificates } = await import("../../src/api/certificates.js");
      await getMyCertificates();
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.CERTIFICATES.MINE));
    });

    it("verifyCertificate hits public verification route", async () => {
      const { verifyCertificate } = await import("../../src/api/certificates.js");
      await verifyCertificate("cert1");
      assert.ok(fetchCalls[0].url.endsWith(ROUTES.CERTIFICATES.VERIFY("cert1")));
    });
  });
});
