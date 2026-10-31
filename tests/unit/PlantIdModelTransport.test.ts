import { askPersonalAssistant, PLANT_ID_REQUEST_TIMEOUT_MS } from "@/api/personalAssistant";
import { plantIdRequestFailureMessage } from "@/features/personal/tools/plantIdRequestFailure";
import { subscribeToApiTransport } from "@/api/apiRequest";

jest.mock("@/auth/tokenStore", () => ({ getToken: jest.fn(async () => "synthetic-token") }));
jest.mock("@/utils/tokenBalanceEvents", () => ({ publishTokenBalanceChange: jest.fn() }));
const payload = { message: "Synthetic photo review", context: { workflow: "species-crop-id" }, evidenceAssetIds: ["synthetic-photo"] };
const response = (data: any) => ({ ok: true, status: 200,
  headers: { get: (name: string) => name === "content-type" ? "application/json" : null },
  json: async () => data, text: async () => JSON.stringify(data) });
let originalFetch: typeof fetch;
beforeEach(() => { jest.useFakeTimers(); originalFetch = global.fetch; });
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

describe("Plant ID model transport", () => {
  test.each(["species-crop-id", "species_crop_id", "species_crop_identification", "species-crop-identification"])(
    "%s waits beyond a minute and returns the exact retained response once", async workflow => {
      let finish!: (value: any) => void;
      global.fetch = jest.fn(() => new Promise(resolve => { finish = resolve; })) as any;
      const saved = { success: true, reply: "synthetic retained JSON", analysisRecovered: true,
        creditStatus: "previously_charged", aiCreditsUsed: 0, analysisReceipt: { aiUsageEventId: "retained-receipt" },
        mediaAnalysis: { providerModel: "gpt-6.1-sol" } };
      const task = askPersonalAssistant({ ...payload, context: { workflow } });
      await jest.advanceTimersByTimeAsync(120000);
      const call = (global.fetch as jest.Mock).mock.calls[0];
      expect(call[1].signal.aborted).toBe(false);
      expect(JSON.parse(call[1].body)).toEqual({ ...payload, context: { workflow } });
      finish(response(saved));
      expect(await task).toEqual(saved);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

  test("180-second deadline reports uncertainty without automatic retries or invented credit outcome", async () => {
    global.fetch = jest.fn((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("synthetic abort"), { name: "AbortError" })));
    })) as any;
    const events: any[] = [];
    const unsubscribe = subscribeToApiTransport(event => events.push(event));
    try {
      const outcome = askPersonalAssistant(payload).catch(error => error);
      await jest.advanceTimersByTimeAsync(PLANT_ID_REQUEST_TIMEOUT_MS - 1);
      expect((global.fetch as jest.Mock).mock.calls[0][1].signal.aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      const error = await outcome;
      expect(error.code).toBe("TIMEOUT");
      expect(plantIdRequestFailureMessage(error, "analysis")).toMatch(/cannot confirm.*credits were used/);
      expect(plantIdRequestFailureMessage(error, "analysis")).toMatch(/Nothing will retry automatically/);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("error");
      expect(jest.getTimerCount()).toBe(0);
    } finally { unsubscribe(); }
  });

  test("deadline stays attached while reading a stalled response body", async () => {
    global.fetch = jest.fn(async (_url, options) => ({ ...response({}), text: () => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("stalled body"), { name: "AbortError" })));
    }) })) as any;
    const outcome = askPersonalAssistant(payload).catch(error => error);
    await jest.advanceTimersByTimeAsync(PLANT_ID_REQUEST_TIMEOUT_MS);
    expect((await outcome).code).toBe("TIMEOUT");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(["diagnosis", "ipm-scout", "plant-id-follow-up", "ipm-result-follow-up", "other"])(
    "%s photos reuse the bounded transport without retrying", async workflow => {
      global.fetch = jest.fn(async () => response({ success: true })) as any;
      await askPersonalAssistant({ ...payload, context: { workflow } });
      expect((global.fetch as jest.Mock).mock.calls[0][1].signal.aborted).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

  test("text-only Plant ID does not acquire a photo deadline", async () => {
    global.fetch = jest.fn(async () => response({ success: true })) as any;
    await askPersonalAssistant({ ...payload, evidenceAssetIds: [] });
    expect((global.fetch as jest.Mock).mock.calls[0][1].signal).toBeUndefined();
  });

  test("ordinary Assistant photos wait beyond a minute then report a bounded timeout without retry or charge claim", async () => {
    global.fetch = jest.fn((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("synthetic abort"), { name: "AbortError" })));
    })) as any;
    const outcome = askPersonalAssistant({ ...payload, context: {} }).catch(error => error);
    await jest.advanceTimersByTimeAsync(120000);
    expect((global.fetch as jest.Mock).mock.calls[0][1].signal.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(60000);
    const error = await outcome;
    expect(error.code).toBe("TIMEOUT");
    expect(error.data?.aiCreditsUsed).toBeUndefined();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test("server-side unresolved result preserves its recovery instructions without resending", async () => {
    const data = { success: false, creditStatus: "unconfirmed", error: { code: "PLANT_ID_REQUEST_UNRESOLVED",
      message: "Check Saved Runs or contact support. It was not sent again." } };
    global.fetch = jest.fn(async () => ({ ...response(data), ok: false, status: 409 })) as any;
    const error = await askPersonalAssistant(payload).catch(value => value);
    expect(error.code).toBe("PLANT_ID_REQUEST_UNRESOLVED");
    expect(plantIdRequestFailureMessage(error, "analysis")).toMatch(/Check Saved Runs/);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
