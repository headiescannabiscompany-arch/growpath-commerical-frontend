import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getToken } from "../../src/auth/tokenStore";
import { apiRequest, setOnUnauthorized } from "../../src/api/apiRequest";
import { subscribeToTokenBalanceChange } from "../../src/utils/tokenBalanceEvents";

jest.mock("../../src/auth/tokenStore", () => ({
  getToken: jest.fn()
}));

const mockGetToken = jest.mocked(getToken);

describe("apiRequest authentication contract", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetToken.mockResolvedValue("stored-token");
  });

  afterEach(() => {
    setOnUnauthorized(null);
  });

  it("adds the persisted token to authenticated requests", async () => {
    global.fetch = jest.fn(async (_url: string, options: any) => ({
      ok: true,
      text: async () => JSON.stringify({ authorization: options.headers.Authorization })
    })) as any;

    await expect(apiRequest("/api/test")).resolves.toEqual({
      authorization: "Bearer stored-token"
    });
  });

  it("publishes the remaining balance reported by a completed AI request", async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToTokenBalanceChange(listener);
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ aiTokensRemaining: 99 })
    })) as any;

    try {
      await apiRequest("/api/ai/assistant/personal");
      expect(listener).toHaveBeenCalledWith(99);
    } finally {
      unsubscribe();
    }
  });

  it("refreshes token listeners when an AI response reports consumed credits", async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToTokenBalanceChange(listener);
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ aiCreditsUsed: 3 })
    })) as any;

    try {
      await apiRequest("/api/ai/assistant/personal");
      expect(listener).toHaveBeenCalledWith(0);
    } finally {
      unsubscribe();
    }
  });

  it("does not replace an explicitly supplied lowercase authorization header", async () => {
    global.fetch = jest.fn(async (_url: string, options: any) => ({
      ok: true,
      text: async () => JSON.stringify(options.headers)
    })) as any;

    await expect(
      apiRequest("/api/test", { headers: { authorization: "Custom token" } })
    ).resolves.toEqual({ authorization: "Custom token" });
  });

  it("preserves a feature 401 without invalidating the session", async () => {
    const onUnauthorized = jest.fn(async () => {});
    setOnUnauthorized(onUnauthorized);
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => "request-401" },
      text: async () =>
        JSON.stringify({ code: "TOKEN_EXPIRED", message: "Session expired." })
    })) as any;

    await expect(apiRequest("/api/test")).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
      message: "Session expired.",
      requestId: "request-401",
      status: 401
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("invalidates the session when the canonical session check opts in", async () => {
    const onUnauthorized = jest.fn(async () => {});
    setOnUnauthorized(onUnauthorized);
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => "request-401" },
      text: async () =>
        JSON.stringify({ code: "TOKEN_EXPIRED", message: "Session expired." })
    })) as any;

    await expect(apiRequest("/api/me", { invalidateOn401: true })).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
      requestId: "request-401",
      status: 401
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("preserves 403 permission messages without logging out", async () => {
    const onUnauthorized = jest.fn(async () => {});
    setOnUnauthorized(onUnauthorized);
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 403,
      headers: { get: () => "request-403" },
      text: async () =>
        JSON.stringify({
          error: {
            code: "FACILITY_ROLE_REQUIRED",
            message: "Manager access required."
          }
        })
    })) as any;

    await expect(apiRequest("/api/test")).rejects.toMatchObject({
      code: "FACILITY_ROLE_REQUIRED",
      message: "Manager access required.",
      requestId: "request-403",
      status: 403
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("composes caller cancellation with a timeout and reports ABORTED", async () => {
    const caller = new AbortController();
    let resolveFetchStarted: (() => void) | undefined;
    const fetchStarted = new Promise<void>((resolve) => {
      resolveFetchStarted = resolve;
    });
    let requestSignal: AbortSignal | undefined;
    global.fetch = jest.fn((_url: string, options: any) => {
      requestSignal = options.signal;
      resolveFetchStarted?.();
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          "abort",
          () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          },
          { once: true }
        );
      });
    }) as any;

    const request = apiRequest("/api/test", {
      signal: caller.signal,
      timeoutMs: 60_000
    });
    const rejection = expect(request).rejects.toMatchObject({
      code: "ABORTED",
      message: "The request was canceled.",
      status: null
    });

    await fetchStarted;
    expect(requestSignal).toBeDefined();
    expect(requestSignal).not.toBe(caller.signal);
    expect(requestSignal?.aborted).toBe(false);

    caller.abort();

    await rejection;
    expect(requestSignal?.aborted).toBe(true);
  });

  it("keeps an un-aborted caller signal composed while reporting TIMEOUT", async () => {
    const caller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    global.fetch = jest.fn((_url: string, options: any) => {
      requestSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          "abort",
          () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          },
          { once: true }
        );
      });
    }) as any;

    await expect(
      apiRequest("/api/test", {
        signal: caller.signal,
        timeoutMs: 10
      })
    ).rejects.toMatchObject({
      code: "TIMEOUT",
      message: "The request timed out.",
      status: null
    });

    expect(caller.signal.aborted).toBe(false);
    expect(requestSignal).toBeDefined();
    expect(requestSignal).not.toBe(caller.signal);
    expect(requestSignal?.aborted).toBe(true);
  });

  it("keeps the timeout active while a successful response body is stalled", async () => {
    let requestSignal: AbortSignal | undefined;
    global.fetch = jest.fn(async (_url: string, options: any) => {
      requestSignal = options.signal;
      return {
        ok: true,
        text: () =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener(
              "abort",
              () => {
                const error = new Error("The response body was aborted");
                error.name = "AbortError";
                reject(error);
              },
              { once: true }
            );
          })
      };
    }) as any;

    await expect(
      apiRequest("/api/stalled-body", { timeoutMs: 10 })
    ).rejects.toMatchObject({
      code: "TIMEOUT",
      message: "The request timed out.",
      status: null
    });

    expect(requestSignal).toBeDefined();
    expect(requestSignal?.aborted).toBe(true);
  });

  it("keeps caller cancellation active while a successful response body is stalled", async () => {
    const caller = new AbortController();
    let bodyStarted: (() => void) | undefined;
    const bodyPending = new Promise<void>((resolve) => {
      bodyStarted = resolve;
    });
    global.fetch = jest.fn(async (_url: string, options: any) => ({
      ok: true,
      text: () => {
        bodyStarted?.();
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            "abort",
            () => {
              const error = new Error("The response body was aborted");
              error.name = "AbortError";
              reject(error);
            },
            { once: true }
          );
        });
      }
    })) as any;

    const request = apiRequest("/api/stalled-body", {
      signal: caller.signal,
      timeoutMs: 60_000
    });
    const rejection = expect(request).rejects.toMatchObject({
      code: "ABORTED",
      message: "The request was canceled.",
      status: null
    });

    await bodyPending;
    caller.abort();

    await rejection;
  });
});
