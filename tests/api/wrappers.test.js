import * as usersApi from "../../src/api/users.js";
import * as coursesApi from "../../src/api/courses.js";
import * as forumApi from "../../src/api/forum.js";
import * as tasksApi from "../../src/api/tasks.js";
import * as environmentApi from "../../src/api/environment.js";
import * as creatorApi from "../../src/api/creator.js";
import * as subscriptionApi from "../../src/api/subscription.js";
import * as guildsApi from "../../src/api/guilds.js";
import * as livesApi from "../../src/api/lives.js";
import * as plantsApi from "../../src/api/plants.js";
import * as growlogApi from "../../src/api/growlog.js";
import * as growsApi from "../../src/api/grows.js";
import * as tokensApi from "../../src/api/tokens.js";
import * as reportsApi from "../../src/api/reports.js";
import * as earningsApi from "../../src/api/earnings.js";
import * as certificatesApi from "../../src/api/certificates.js";
import ROUTES from "../../src/api/routes.js";

// Setup minimal fetch spy
let fetchCalls = [];
global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  return {
    ok: true,
    text: async () =>
      JSON.stringify({ success: true, token: "success-token", user: { id: "u1" } }),
    json: async () => ({ success: true, token: "success-token", user: { id: "u1" } })
  };
};

global.API_URL_OVERRIDE = "http://test-api.local";
global.authToken = "unit-test-token";

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

describe("API Wrappers Unit Tests", () => {
  beforeEach(() => {
    fetchCalls = [];
  });

  it("Users API: followUser uses POST and correct path", async () => {
    await usersApi.followUser("u1");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.USER.FOLLOW("u1"))).toBe(true);
  });

  it("Users API: updateBio uses POST and correct path", async () => {
    await usersApi.updateBio("New bio");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.USER.BIO)).toBe(true);
    expect(JSON.parse(fetchCalls[0].options.body).bio).toBe("New bio");
  });

  it("Courses API: enrollInCourse uses POST", async () => {
    await coursesApi.enrollInCourse("c1");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.COURSES.ENROLL("c1"))).toBe(true);
  });

  it("Courses API: buyCourse uses POST", async () => {
    await coursesApi.buyCourse("c1");
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.COURSES.BUY("c1"))).toBe(true);
  });

  it("Forum API: createPost uses POST", async () => {
    await forumApi.createPost({ title: "Test" });
    expect(fetchCalls[0].options.method).toBe("POST");
    expect(fetchCalls[0].url.endsWith(ROUTES.FORUM.CREATE)).toBe(true);
  });

  // ... Add more tests as needed, following the above pattern ...
});
