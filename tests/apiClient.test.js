const test = require("node:test");
const assert = require("node:assert/strict");

const { client, ApiError, API_URL } = require("../src/api/client.js");

function setupGlobals(t) {
  const previousFetch = global.fetch;
  const previousToken = global.authToken;

  t.after(() => {
    global.fetch = previousFetch;
    global.authToken = previousToken;
  });
}

test("client.post attaches the global auth token and serializes JSON bodies", async (t) => {
  setupGlobals(t);

  const calls = [];
  global.authToken = "abc123";

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () => JSON.stringify({ success: true })
    };
  };

  const result = await client.post("/plants", { name: "Misty" });

  assert.deepEqual(result, { success: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${API_URL}/plants`);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.Authorization, "Bearer abc123");
  assert.equal(calls[0].options.headers["Content-Type"], "application/json");
  assert.equal(calls[0].options.body, JSON.stringify({ name: "Misty" }));
});

test("client.get uses token argument and bypasses globals when provided", async (t) => {
  setupGlobals(t);

  const calls = [];
  global.authToken = "should-not-be-used";

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () => JSON.stringify({ ok: true })
    };
  };

  await client.get("/me", "argument-token");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.Authorization, "Bearer argument-token");
});

test("client.postMultipart forwards FormData without forcing Content-Type", async (t) => {
  setupGlobals(t);

  let capturedHeaders = null;
  global.fetch = async (_url, options) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      text: async () => JSON.stringify({ uploaded: true })
    };
  };

  const form = new FormData();
  form.append("photo", "example.png");

  await client.postMultipart("/upload", form, {
    headers: { "X-Test": "1" }
  });

  assert.ok(capturedHeaders);
  assert.equal(capturedHeaders["X-Test"], "1");
  assert.equal(capturedHeaders["Content-Type"], undefined);
});

test("client throws ApiError with status/data when response is not ok", async (t) => {
  setupGlobals(t);

  global.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => JSON.stringify({ message: "Unauthorized" })
  });

  await assert.rejects(
    () => client.get("/secure"),
    (error) =>
      error instanceof ApiError &&
      error.status === 401 &&
      error.data.message === "Unauthorized"
  );
});

test("Subscription helpers propagate explicit tokens and payloads", async (t) => {
  setupGlobals(t);
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      text: async () => JSON.stringify({ success: true })
    };
  };

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

test("Marketplace transforms handle array and nested payload shapes", () => {
  const { extractCourses, extractHasMore } = require("../src/utils/marketplaceTransforms.js");
  const nested = { data: { courses: [{ _id: "1" }], hasMore: true } };
  const bare = [{ _id: "2" }, { _id: "3" }];
  const empty = { data: { courses: [] } };

  assert.deepEqual(extractCourses(nested), [{ _id: "1" }]);
  assert.deepEqual(extractCourses(bare), bare);
  assert.equal(extractHasMore(nested), true);
  assert.equal(extractHasMore(empty), false);
  assert.equal(extractHasMore(bare), true);
});
