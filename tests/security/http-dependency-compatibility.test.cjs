"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const { MockAgent, fetch } = require("undici");

test("updated Axios preserves JSON transforms, headers and response handling without network", async () => {
  const instance = axios.create({
    baseURL: "https://synthetic.invalid",
    adapter: async (config) => {
      assert.equal(config.method, "post");
      assert.equal(config.url, "/synthetic");
      assert.equal(config.data, '{"sample":true}');
      assert.equal(config.headers.get("X-Synthetic"), "yes");
      assert.equal(config.headers.get("Content-Type"), "application/json");
      return { data: '{"ok":true}', status: 200, statusText: "OK", headers: {}, config };
    }
  });
  const response = await instance.post(
    "/synthetic",
    { sample: true },
    {
      headers: { "X-Synthetic": "yes" }
    }
  );
  assert.deepEqual(response.data, { ok: true });
});

test("updated Axios cancellation never dispatches a canceled request", async () => {
  const controller = new AbortController();
  controller.abort();
  let dispatched = false;
  await assert.rejects(
    axios.get("https://synthetic.invalid", {
      signal: controller.signal,
      adapter: async () => {
        dispatched = true;
        throw new Error("must not dispatch");
      }
    }),
    (error) => axios.isCancel(error) && error.code === "ERR_CANCELED"
  );
  assert.equal(dispatched, false);
});

test("updated Undici preserves fetch JSON/body/header handling with network disabled", async () => {
  const dispatcher = new MockAgent();
  dispatcher.disableNetConnect();
  try {
    dispatcher
      .get("https://synthetic.invalid")
      .intercept({
        method: "POST",
        path: "/synthetic",
        body: '{"sample":true}',
        headers: { "content-type": "application/json" }
      })
      .reply(200, { ok: true }, { headers: { "content-type": "application/json" } });
    const response = await fetch("https://synthetic.invalid/synthetic", {
      dispatcher,
      method: "POST",
      body: JSON.stringify({ sample: true }),
      headers: { "Content-Type": "application/json" }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    dispatcher.assertNoPendingInterceptors();
  } finally {
    await dispatcher.close();
  }
});
