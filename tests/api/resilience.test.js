import { describe, it, beforeEach, expect } from "@jest/globals";
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

    await expect(client.get("/any")).rejects.toMatchObject({
      status: 503
    });
  });

  it("handles network-level connection refused (thrown error)", async () => {
    global.fetch = async () => {
      throw new Error("fetch failed");
    };

    await expect(client.get("/any")).rejects.toThrow("fetch failed");
  });

  it("handles request timeouts correctly", async () => {
    global.fetch = async (url, options) => {
      return new Promise((_, reject) => {
        options.signal.addEventListener("abort", () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    };

    await expect(client("/timeout-test", { timeout: 10 })).rejects.toThrow(
      /Request timeout/
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
    expect(attempts).toBe(3);
    expect(result.success).toBe(true);
  });

  it("retries on timeouts and eventually fails if still timing out", async () => {
    let attempts = 0;
    global.fetch = async (url, options) => {
      attempts++;
      return new Promise((_, reject) => {
        options.signal.addEventListener("abort", () => {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    };

    await expect(client("/retry-timeout", { retries: 2, timeout: 10 })).rejects.toThrow(
      /Request timeout/
    );
    expect(attempts).toBe(3);
  });
});
