/** @jest-environment node */
import http from "node:http";
import https from "node:https";
import { Platform } from "react-native";
import { createStagingCourseGiftWebContextInternal } from "@/utils/courseGiftStagingWebContext";

const WEB = "https://growpath-web-staging.onrender.com";
const API = "https://growpath-api-staging.onrender.com";
let mockApiUrl = API;
const mockApi = jest.fn();
jest.mock("react-native", () => ({ Platform: { OS: "web" } }));
jest.mock("@/api/apiRequest", () => ({
  get API_URL() {
    return mockApiUrl;
  },
  apiRequest: (...args: any[]) => mockApi(...args),
  ApiError: class extends Error {}
}));
let browser: any;
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const request = (signal = new AbortController().signal) => ({
  operation: "buyer_status" as const,
  body: { checkoutAttemptId: "a0000000-0000-4000-8000-000000000001" },
  authorization: "synthetic-bearer",
  signal,
  retries: 0 as const,
  cache: "no-store" as const,
  redirect: "error" as const
});
beforeEach(() => {
  mockApiUrl = API;
  Platform.OS = "web";
  browser = {
    location: { origin: WEB, assign: jest.fn() },
    sessionStorage: { getItem: jest.fn(), setItem: jest.fn() },
    crypto: { randomUUID: jest.fn(() => "a0000000-0000-4000-8000-000000000001") }
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  mockApi.mockResolvedValue({ success: true, data: { synthetic: true } });
  const blocked = () => {
    throw Error("External access blocked");
  };
  for (const module of [http, https])
    for (const method of ["get", "request"] as const)
      jest.spyOn(module, method).mockImplementation(blocked);
  if (typeof global.fetch === "function")
    jest.spyOn(global, "fetch").mockImplementation(blocked);
});
afterEach(() => {
  if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

describe("R09 staging web guard", () => {
  test("construction is inert and frozen", () => {
    const context = createStagingCourseGiftWebContextInternal();
    expect(Object.isFrozen(context)).toBe(true);
    expect(mockApi).not.toHaveBeenCalled();
    expect(browser.sessionStorage.getItem).not.toHaveBeenCalled();
    expect(browser.crypto.randomUUID).not.toHaveBeenCalled();
    expect(browser.location.assign).not.toHaveBeenCalled();
    context.close();
  });
  test.each([
    "https://growpathai.com",
    "http://growpath-web-staging.onrender.com",
    "http://localhost:8081",
    "https://growpath-web-staging.onrender.com.evil.invalid"
  ])("rejects website %s without transport", (origin) => {
    browser.location.origin = origin;
    expect(createStagingCourseGiftWebContextInternal).toThrow(
      "COURSE_GIFT_STAGING_UNAVAILABLE"
    );
    expect(mockApi).not.toHaveBeenCalled();
  });
  test.each([
    "",
    "https://growpath-api.onrender.com",
    API + "/api",
    API + ":443",
    API + ".evil.invalid",
    "http://localhost:5002"
  ])("rejects API %s without transport", (api) => {
    mockApiUrl = api;
    expect(createStagingCourseGiftWebContextInternal).toThrow(
      "COURSE_GIFT_STAGING_UNAVAILABLE"
    );
    expect(mockApi).not.toHaveBeenCalled();
  });
  test.each(["ios", "android"] as const)("refuses %s", (platform) => {
    Platform.OS = platform;
    expect(createStagingCourseGiftWebContextInternal).toThrow(
      "COURSE_GIFT_STAGING_UNAVAILABLE"
    );
  });
  test("refuses server rendering", () => {
    Reflect.deleteProperty(globalThis, "window");
    expect(createStagingCourseGiftWebContextInternal).toThrow(
      "COURSE_GIFT_STAGING_UNAVAILABLE"
    );
  });
  test("reuses canonical quiet transport after explicit invocation", async () => {
    const context = createStagingCourseGiftWebContextInternal();
    await expect(context.invoke(request())).resolves.toEqual({ synthetic: true });
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi).toHaveBeenCalledWith(
      "/api/course-gifts/buyer/status",
      expect.objectContaining({
        method: "POST",
        auth: false,
        invalidateOn401: false,
        notifyTransport: false,
        notifyTokenBalance: false,
        retries: 0,
        cache: "no-store",
        redirect: "error",
        timeoutMs: 20000,
        responseType: "json",
        headers: {
          Authorization: "Bearer synthetic-bearer",
          "Content-Type": "application/json"
        }
      })
    );
    context.close();
  });
  test("close aborts admitted work and rejects a late successful reply", async () => {
    let release!: (value: unknown) => void;
    mockApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const context = createStagingCourseGiftWebContextInternal();
    const result = context.invoke(request());
    const rejected = expect(result).rejects.toThrow("COURSE_GIFT_REQUEST_CANCELED");
    const signal = mockApi.mock.calls[0][1].signal;
    context.close();
    expect(signal.aborted).toBe(true);
    release({ success: true, data: { late: true } });
    await rejected;
    await expect(context.invoke(request())).rejects.toThrow(
      "COURSE_GIFT_STAGING_UNAVAILABLE"
    );
    expect(mockApi).toHaveBeenCalledTimes(1);
  });
  test("caller cancellation reaches transport without retry", async () => {
    let release!: (value: unknown) => void;
    mockApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const context = createStagingCourseGiftWebContextInternal();
    const caller = new AbortController();
    const result = context.invoke(request(caller.signal));
    const rejected = expect(result).rejects.toThrow("COURSE_GIFT_REQUEST_CANCELED");
    caller.abort();
    expect(mockApi.mock.calls[0][1].signal.aborted).toBe(true);
    release({ success: true, data: {} });
    await rejected;
    expect(mockApi).toHaveBeenCalledTimes(1);
    context.close();
  });
  test("already-canceled requests never reach transport", async () => {
    const context = createStagingCourseGiftWebContextInternal();
    const caller = new AbortController();
    caller.abort();
    await expect(context.invoke(request(caller.signal))).rejects.toThrow(
      "COURSE_GIFT_REQUEST_CANCELED"
    );
    expect(mockApi).not.toHaveBeenCalled();
    context.close();
  });
  test.each(["website", "API", "window"] as const)(
    "rejects late reply after %s drift permanently",
    async (kind) => {
      let release!: (value: unknown) => void;
      mockApi.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = resolve;
          })
      );
      const context = createStagingCourseGiftWebContextInternal();
      const result = context.invoke(request());
      const rejected = expect(result).rejects.toThrow("COURSE_GIFT_STAGING_UNAVAILABLE");
      if (kind === "website") browser.location.origin = "https://growpathai.com";
      if (kind === "API") mockApiUrl = "https://growpath-api.onrender.com";
      if (kind === "window")
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: { ...browser }
        });
      release({ success: true, data: { late: true } });
      await rejected;
      browser.location.origin = WEB;
      mockApiUrl = API;
      Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
      expect(context.assertCurrent).toThrow("COURSE_GIFT_STAGING_UNAVAILABLE");
      expect(mockApi).toHaveBeenCalledTimes(1);
    }
  );
  test("storage and request IDs are lazy and refused after closing", () => {
    const context = createStagingCourseGiftWebContextInternal();
    context.storage.setItem("synthetic-key", "synthetic-hint");
    context.storage.getItem("synthetic-key");
    context.newRequestId();
    expect(browser.sessionStorage.setItem).toHaveBeenCalledTimes(1);
    expect(browser.crypto.randomUUID).toHaveBeenCalledTimes(1);
    context.close();
    expect(() => context.storage.getItem("synthetic-key")).toThrow();
    expect(() => context.storage.setItem("synthetic-key", "new")).toThrow();
    expect(context.newRequestId).toThrow();
    expect(browser.sessionStorage.setItem).toHaveBeenCalledTimes(1);
  });
  test("checkout navigation retains the existing provider allowlist and context fence", () => {
    const context = createStagingCourseGiftWebContextInternal();
    expect(() => context.onNavigateToCheckout("https://evil.invalid/payment")).toThrow();
    expect(browser.location.assign).not.toHaveBeenCalled();
    context.onNavigateToCheckout("https://checkout.stripe.com/c/pay/synthetic");
    expect(browser.location.assign).toHaveBeenCalledTimes(1);
    context.close();
    expect(() =>
      context.onNavigateToCheckout("https://checkout.stripe.com/c/pay/synthetic")
    ).toThrow();
    expect(browser.location.assign).toHaveBeenCalledTimes(1);
  });
});
