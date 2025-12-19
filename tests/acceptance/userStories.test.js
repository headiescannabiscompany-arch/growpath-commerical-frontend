const test = require("node:test");
const assert = require("node:assert/strict");

const { client, ApiError } = require("../../src/api/client.js");
const { handleApiError } = require("../../src/utils/proHelper.js");
const {
  extractCourses,
  extractHasMore
} = require("../../src/utils/marketplaceTransforms.js");

function mockFetch(t, responder) {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
    delete global.authToken;
  });
  global.fetch = responder;
}

test("Returning Pro user keeps bearer token on initial requests", async (t) => {
  mockFetch(t, async (url, options) => {
    return {
      ok: true,
      text: async () => JSON.stringify({ url, headers: options.headers })
    };
  });

  global.authToken = "persisted-token";

  const res = await client.get("/api/profile");
  assert.equal(res.headers.Authorization, "Bearer persisted-token");
});

test("Subscription helpers propagate explicit tokens and payloads", async (t) => {
  const calls = [];
  mockFetch(t, async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () => JSON.stringify({ success: true })
    };
  });

  await client.post("/subscribe/start", { type: "trial" }, "token-123");
  await client.post("/subscribe/cancel", {}, "token-123");
  await client.get("/api/subscribe/status", "token-123");

  assert.equal(calls.length, 3);
  calls.forEach(({ options }) => {
    assert.equal(options.headers.Authorization, "Bearer token-123");
  });
  const trialCall = calls[0];
  assert.equal(trialCall.options.body, JSON.stringify({ type: "trial" }));
});

test("PRO-only backend responses navigate to the Paywall", () => {
  const navigation = {
    history: [],
    navigate(screen) {
      this.history.push(screen);
    }
  };

  const proError = new ApiError("PRO required", 403, { message: "PRO required" });
  const handled = handleApiError(proError, navigation);

  assert.equal(handled, true);
  assert.deepEqual(navigation.history, ["Paywall"]);
});

test("Marketplace transforms handle array and nested payload shapes", () => {
  const nested = { data: { courses: [{ _id: "1" }], hasMore: true } };
  const bare = [{ _id: "2" }, { _id: "3" }];
  const empty = { data: { courses: [] } };

  assert.deepEqual(extractCourses(nested), [{ _id: "1" }]);
  assert.deepEqual(extractCourses(bare), bare);
  assert.equal(extractHasMore(nested), true);
  assert.equal(extractHasMore(empty), false);
  assert.equal(extractHasMore(bare), true);
});
