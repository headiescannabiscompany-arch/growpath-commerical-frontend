import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { client, ApiError } from "../../src/api/client.js";

describe("API Resilience & Network Failures", () => {
  beforeEach(() => {
    global.API_URL_OVERRIDE = "http://resilience-test.local";
  });

  it("handles 503 Service Unavailable", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({ message: "Overloaded" })
    });

    await assert.rejects(
      () => client.get("/any"),
      (err) => err instanceof ApiError && err.status === 503
    );
  });

  it("handles network-level connection refused (thrown error)", async () => {
    global.fetch = async () => {
      throw new Error("fetch failed");
    };

    await assert.rejects(
      () => client.get("/any"),
      (err) => err.message === "fetch failed"
    );
  });

  it("handles request timeouts correctly", async () => {
    global.fetch = async (url, options) => {
      return new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    };

    await assert.rejects(
      () => client("/timeout-test", { timeout: 10 }), 
      (err) => err.message.includes("Request timeout")
    );
  });

  it("retries on 500 errors and eventually succeeds", async () => {
    let attempts = 0;
    global.fetch = async () => {
      attempts++;
      if (attempts < 3) {
        return {
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ message: "Server Error" })
        };
      }
      return {
        ok: true,
        text: async () => JSON.stringify({ success: true })
      };
    };

    const result = await client("/retry-test", { retries: 3, retryDelay: 10 });
    assert.strictEqual(attempts, 3);
    assert.strictEqual(result.success, true);
  });

  it("retries on timeouts and eventually fails if still timing out", async () => {
    let attempts = 0;
    global.fetch = async (url, options) => {
      attempts++;
      return new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    };

    await assert.rejects(
      () => client("/retry-timeout", { retries: 2, timeout: 10 }),
      (err) => err.message.includes("Request timeout")
    );
    assert.strictEqual(attempts, 3);
  });
});