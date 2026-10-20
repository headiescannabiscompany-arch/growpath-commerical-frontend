/** @jest-environment jsdom */
import React from "react";
import { Platform } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import {
  createInternalCourseGiftClient,
  COURSE_GIFT_REQUEST_MS,
  courseGiftClient
} from "@/api/courseGiftClient";
import { apiRequest } from "@/api/apiRequest";
import { invokeCourseGiftHttp } from "@/api/courseGiftHttp";
import {
  createCourseGiftContinuation,
  type CourseGiftAuth
} from "@/utils/courseGiftContinuation";
import { createInternalCourseGiftWebSession } from "@/utils/courseGiftWebSession";
import Screen, {
  InternalCourseGiftWebContext
} from "@/components/courseGifts/CourseGiftWebScreen";
import { CourseGiftRecipientPanel } from "@/components/courseGifts/CourseGiftPanels";
import type { GiftRecipientState } from "@/components/courseGifts/courseGiftPresentation";
jest.mock("@/api/apiRequest", () => ({
  apiRequest: jest.fn(),
  ApiError: class extends Error {}
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/claim-course-gift",
  useGlobalSearchParams: () => ({}),
  useNavigationContainerRef: () => ({ isReady: () => false, addListener: () => () => {} })
}));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
const TOKEN = "a".repeat(64);
const OP = "11111111-2222-4333-8444-555555555555";
const ready: CourseGiftAuth = {
  state: "ready",
  userId: "b".repeat(24),
  sessionKey: "synthetic",
  emailVerified: true
};
const state = (): GiftRecipientState => ({
  giftId: "c".repeat(24),
  courseId: "d".repeat(24),
  courseTitle: "Synthetic renewal course",
  recipient: "r***@example.invalid",
  claimExpiresAt: "2020-01-01T00:00:00.000Z",
  claimExpiryMode: "none",
  inactivityFeeCents: 0,
  code: "COURSE_GIFT_LINK_RENEWAL_REQUIRED"
});
const result = { giftId: state().giftId, deliveryStatus: "pending" };
const cleanups: Array<() => void> = [];
let network: jest.SpyInstance;
const originalOS = Platform.OS;
beforeEach(() => {
  network = jest.spyOn(global, "fetch").mockImplementation(() => {
    throw new Error("Network forbidden");
  });
  Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanups.splice(0).forEach((dispose) => dispose());
  expect(network).not.toHaveBeenCalled();
  jest.useRealTimers();
  Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
});
function fixture() {
  const auth = { current: { ...ready } };
  const storage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  const continuation = createCourseGiftContinuation({ storage });
  continuation.capture({
    location: { pathname: "/claim-course-gift", hash: `#token=${TOKEN}`, search: "" },
    history: { replaceState: jest.fn() }
  });
  const invoke = jest.fn().mockResolvedValue(state());
  const newRenewalId = jest.fn(() => OP);
  const client = createInternalCourseGiftClient({
    platform: "web",
    continuation,
    auth: () => auth.current,
    getAccessToken: jest.fn(async () => "synthetic"),
    invoke,
    newRenewalId
  });
  cleanups.push(() => client.dispose());
  return { client, invoke, storage, auth, newRenewalId };
}
test("review makes no renewal; explicit confirmation prepares only one original request", async () => {
  const f = fixture();
  expect(f.invoke).not.toHaveBeenCalled();
  await f.client.reviewRecipient();
  await expect(f.client.renewRecipient({ confirmed: false })).rejects.toBeTruthy();
  f.invoke.mockResolvedValue(result);
  expect(await f.client.renewRecipient({ confirmed: true })).toEqual(result);
  expect(f.invoke.mock.calls[1][0]).toMatchObject({
    operation: "recipient_renew",
    body: { giftId: result.giftId, token: TOKEN, operationId: OP },
    retries: 0,
    cache: "no-store",
    redirect: "error"
  });
  expect(f.storage.setItem).not.toHaveBeenCalled();
});
test("unknown reply retries the same request without generating another operation", async () => {
  const f = fixture();
  await f.client.reviewRecipient();
  f.invoke.mockRejectedValueOnce(new Error(TOKEN));
  await expect(f.client.renewRecipient({ confirmed: true })).rejects.toMatchObject({
    code: "COURSE_GIFT_REQUEST_UNKNOWN"
  });
  f.invoke.mockResolvedValue(result);
  await f.client.renewRecipient({ confirmed: true });
  expect(f.invoke.mock.calls[1][0].body).toEqual(f.invoke.mock.calls[2][0].body);
  expect(f.newRenewalId).toHaveBeenCalledTimes(1);
  expect(f.storage.setItem).not.toHaveBeenCalled();
});
test("late reply after timeout cannot cause automatic resend", async () => {
  jest.useFakeTimers();
  const f = fixture();
  await f.client.reviewRecipient();
  let resolve!: (value: unknown) => void;
  f.invoke.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  const pending = expect(
    f.client.renewRecipient({ confirmed: true })
  ).rejects.toMatchObject({ code: "COURSE_GIFT_REQUEST_UNKNOWN" });
  await jest.advanceTimersByTimeAsync(COURSE_GIFT_REQUEST_MS);
  await pending;
  resolve(result);
  await Promise.resolve();
  expect(f.invoke).toHaveBeenCalledTimes(2);
  // Restore before Testing Library's earlier-registered async cleanup hook.
  jest.useRealTimers();
});
test("account replacement discards the pending renewal and late response", async () => {
  const f = fixture();
  await f.client.reviewRecipient();
  let resolve!: (value: unknown) => void;
  f.invoke.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  const pending = expect(
    f.client.renewRecipient({ confirmed: true })
  ).rejects.toBeTruthy();
  await Promise.resolve();
  await Promise.resolve();
  f.auth.current = { ...ready, userId: "e".repeat(24) };
  resolve(result);
  await pending;
  await expect(f.client.renewRecipient({ confirmed: true })).rejects.toBeTruthy();
  expect(f.invoke).toHaveBeenCalledTimes(2);
});
test.each([
  { claimExpiryMode: undefined },
  { inactivityFeeCents: 1 },
  { claimExpiresAt: "2099-01-01T00:00:00.000Z" }
])("malformed renewal review cannot enable a write: %j", async (override) => {
  const f = fixture();
  f.invoke.mockResolvedValue({ ...state(), ...override });
  await expect(f.client.reviewRecipient()).rejects.toBeTruthy();
  await expect(f.client.renewRecipient({ confirmed: true })).rejects.toBeTruthy();
  expect(f.invoke).toHaveBeenCalledTimes(1);
});
test("fresh client after reload cannot renew without its private invitation and review", async () => {
  const f = fixture();
  await expect(f.client.renewRecipient({ confirmed: true })).rejects.toBeTruthy();
  expect(f.invoke).not.toHaveBeenCalled();
});
test("replacement result must bind original gift and disclose no extra response fields", async () => {
  const f = fixture();
  await f.client.reviewRecipient();
  f.invoke.mockResolvedValueOnce({ ...result, giftId: "e".repeat(24) });
  await expect(f.client.renewRecipient({ confirmed: true })).rejects.toBeTruthy();
  f.invoke.mockResolvedValue({ ...result, token: TOKEN, privateReceipt: "private" });
  expect(await f.client.renewRecipient({ confirmed: true })).toEqual(result);
});
test("expired renewal state cannot claim; unsupported public/native client stays closed", async () => {
  const f = fixture();
  await f.client.reviewRecipient();
  await expect(f.client.claimRecipient({ confirmed: true })).rejects.toBeTruthy();
  expect(() => courseGiftClient()).toThrow("COURSE_GIFTING_NOT_RELEASED");
  expect(() => createInternalCourseGiftClient({ platform: "native" } as any)).toThrow(
    "COURSE_GIFTING_NOT_RELEASED"
  );
});
test("renewal HTTP uses exact POST and silent no-retry transport; rejects extra keys", async () => {
  (apiRequest as jest.Mock).mockResolvedValue({ success: true, data: result });
  const request = {
    operation: "recipient_renew" as const,
    body: { giftId: result.giftId, token: TOKEN, operationId: OP },
    authorization: "synthetic",
    signal: new AbortController().signal,
    retries: 0 as const,
    cache: "no-store" as const,
    redirect: "error" as const
  };
  await invokeCourseGiftHttp(request);
  expect(apiRequest).toHaveBeenCalledWith(
    "/api/course-gifts/recipient/renew",
    expect.objectContaining({
      body: request.body,
      method: "POST",
      auth: false,
      invalidateOn401: false,
      notifyTokenBalance: false,
      notifyTransport: false,
      retries: 0,
      cache: "no-store",
      redirect: "error"
    })
  );
  await expect(
    invokeCourseGiftHttp({
      ...request,
      body: { ...request.body, actorUserId: ready.userId }
    })
  ).rejects.toBeTruthy();
  expect(apiRequest).toHaveBeenCalledTimes(1);
});
test("panel keeps uncertain request explicit and never claims or promises inbox delivery", async () => {
  const onRenew = jest
    .fn()
    .mockRejectedValueOnce(new Error("private"))
    .mockResolvedValue(result);
  const onClaim = jest.fn(),
    onRecheck = jest.fn();
  const view = render(
    <CourseGiftRecipientPanel
      scopeKey="synthetic"
      state={state()}
      onRenew={onRenew}
      onClaim={onClaim}
      onRecheck={onRecheck}
      onSignIn={jest.fn()}
      onOpenCourse={jest.fn()}
    />
  );
  expect(onRenew).not.toHaveBeenCalled();
  await act(async () =>
    fireEvent.press(view.getByText("Request replacement invitation"))
  );
  expect(view.queryByText("Check gift again")).toBeNull();
  await act(async () =>
    fireEvent.press(view.getByText("Retry same replacement request"))
  );
  expect(view.getByText(/This does not confirm inbox delivery/)).toBeTruthy();
  expect(view.queryByText("Claim course gift")).toBeNull();
  expect(onClaim).not.toHaveBeenCalled();
  expect(onRecheck).not.toHaveBeenCalled();
  view.unmount();
});
test("actual screen/session wiring uses explicit review then renewal and scrubs original URL", async () => {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: jest.fn(() => OP)
  });
  const storage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  const session = createInternalCourseGiftWebSession({
    auth: () => ready,
    getAccessToken: async () => "synthetic",
    storage
  });
  cleanups.push(() => session.dispose());
  window.history.replaceState(null, "", `/claim-course-gift#token=${TOKEN}`);
  const snapshot = session.sync("/claim-course-gift", window);
  (apiRequest as jest.Mock)
    .mockResolvedValueOnce({ success: true, data: state() })
    .mockResolvedValueOnce({ success: true, data: result });
  const view = render(
    <InternalCourseGiftWebContext.Provider value={{ session, snapshot }}>
      <Screen />
    </InternalCourseGiftWebContext.Provider>
  );
  expect(window.location.hash).toBe("");
  expect(apiRequest).not.toHaveBeenCalled();
  await act(async () => fireEvent.press(view.getByText("Review course gift")));
  await act(async () =>
    fireEvent.press(view.getByText("Request replacement invitation"))
  );
  expect(apiRequest).toHaveBeenCalledTimes(2);
  expect(view.getByText(/Replacement invitation recorded/)).toBeTruthy();
  expect(storage.setItem).not.toHaveBeenCalled();
  view.unmount();
});
