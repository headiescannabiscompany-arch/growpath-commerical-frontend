import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { apiRequest } from "@/api/apiRequest";
import { GuestGiftOrder, GuestGiftStatus } from "@/features/billing/GuestGiftCheckout";
import {
  checkGuestGift,
  guestQuoteIdentity,
  loadGuestGiftReceipt
} from "@/features/billing/guestGiftCheckoutClient";
import * as SecureStore from "expo-secure-store";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}));
const req = apiRequest as jest.Mock;
const token = "scope-test-key-0123456789abcdefghijk";
const id = "a".repeat(32);
const receipt = {
  checkoutAttemptId: id,
  guestAccessToken: token,
  amountCents: 6813,
  currency: "usd"
};
const store = new Map<string, string>();
const quoted = {
  schemaVersion: "gift_quote_v1",
  version: 1,
  quantity: 1,
  renews: false,
  plan: "pro",
  interval: "yearly",
  amountCents: 6813,
  currency: "usd",
  issuedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2099-12-31T00:00:00.000Z",
  confirmationToken: "1.cHJldmlldw.c2lnbmVk"
};
const hosted = "https://checkout.stripe.com/c/pay/cs_test_guest";
const state = (name: string, extras = {}) => ({
  checkoutAttemptId: id,
  state: name,
  paymentConfirmed: name === "settled",
  canResume: false,
  canStartNewAttempt: false,
  checkoutUrl: null,
  amountCents: 6813,
  currency: "usd",
  expiresAt: "2099-12-31T00:00:00.000Z",
  ...extras
});
beforeEach(() => {
  store.clear();
  jest.resetAllMocks();
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(
    async (k: string) => store.get(k) ?? null
  );
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(
    async (k: string, v: string) => {
      store.set(k, v);
    }
  );
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (k: string) => {
    store.delete(k);
  });
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: require("node:crypto").webcrypto
  });
});
function order() {
  const onReceipt = jest.fn();
  const openCheckout = jest.fn().mockResolvedValue(undefined);
  const screen = render(
    <GuestGiftOrder
      plan="pro"
      interval="yearly"
      onReceipt={onReceipt}
      openCheckout={openCheckout}
    />
  );
  fireEvent.changeText(
    screen.getByLabelText("Your receipt email"),
    " Buyer@example.test "
  );
  fireEvent.changeText(
    screen.getByLabelText("Gift recipient email"),
    "Recipient@example.test"
  );
  return { screen, onReceipt, openCheckout };
}
test("requests a review, then one deliberate payment, with a durable guest receipt and no login token", async () => {
  let observedAttempt = "";
  req.mockImplementation(async (endpoint: string, opts: any) => {
    expect(opts.auth).toBe(false);
    expect(opts.body.purchaserEmail).toBe("buyer@example.test");
    expect(opts.body.giftRecipientEmail).toBe("recipient@example.test");
    expect(opts.body.giftMessage).toBe("Happy growing!");
    if (endpoint.endsWith("/quote")) {
      expect(opts.body.guestRequestKey).toMatch(/^[a-f0-9]{64}$/);
      observedAttempt = opts.body.checkoutAttemptId;
      return { quote: quoted, guestAccessToken: token };
    }
    expect(opts.body.guestAccessToken).toBe(token);
    expect(opts.body.checkoutAttemptId).toBe(observedAttempt);
    expect(opts.body.giftQuoteToken).toBe(quoted.confirmationToken);
    expect((await loadGuestGiftReceipt())?.checkoutAttemptId).toBe(observedAttempt);
    return {
      url: hosted,
      checkoutAttemptId: observedAttempt,
      amountCents: 6813,
      currency: "usd",
      expiresAt: "2099-12-31T00:00:00.000Z"
    };
  });
  const { screen, onReceipt, openCheckout } = order();
  fireEvent.press(screen.getByText("Add a name or gift message"));
  fireEvent.changeText(screen.getByLabelText("Gift message"), "Happy growing!");
  fireEvent.press(screen.getByText("Review gift price"));
  const pay = await screen.findByText(/Pay .*68.13 with Stripe/);
  expect(openCheckout).not.toHaveBeenCalled();
  expect(req).toHaveBeenCalledTimes(1);
  fireEvent.press(pay);
  fireEvent.press(pay);
  await waitFor(() => expect(onReceipt).toHaveBeenCalledTimes(1));
  expect(req).toHaveBeenCalledTimes(2);
  expect(openCheckout).toHaveBeenCalledWith(hosted);
  expect(JSON.stringify([...store.values()])).not.toMatch(
    /buyer@|recipient@|Happy growing/
  );
});
test("retains the attempt and secret after a lost quote response including a reload", async () => {
  req
    .mockRejectedValueOnce(new Error("network interrupted"))
    .mockResolvedValueOnce({ quote: quoted, guestAccessToken: token });
  const first = order();
  fireEvent.press(first.screen.getByText("Review gift price"));
  await first.screen.findByText("network interrupted");
  first.screen.unmount();
  const second = order();
  fireEvent.press(second.screen.getByText("Review gift price"));
  await second.screen.findByText(/Pay /);
  const submitted = req.mock.calls.map(([, args]) => args.body);
  expect(submitted[0].checkoutAttemptId).toEqual(submitted[1].checkoutAttemptId);
  expect(submitted[0].guestRequestKey).toEqual(submitted[1].guestRequestKey);
});
test("edited details require a new price review before paying", async () => {
  req.mockResolvedValue({ quote: quoted, guestAccessToken: token });
  const { screen, openCheckout } = order();
  fireEvent.press(screen.getByText("Review gift price"));
  await screen.findByText(/Pay /);
  fireEvent.changeText(
    screen.getByLabelText("Gift recipient email"),
    "other@example.test"
  );
  expect(screen.queryByText(/Pay /)).toBeNull();
  expect(screen.getByText("Review gift price")).toBeTruthy();
  expect(openCheckout).not.toHaveBeenCalled();
});
test("stops before checkout when storage fails and never follows an unverified payment URL", async () => {
  req.mockResolvedValueOnce({ quote: quoted, guestAccessToken: token });
  const { screen, onReceipt, openCheckout } = order();
  fireEvent.press(screen.getByText("Review gift price"));
  const pay = await screen.findByText(/Pay /);
  (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
    new Error("storage unavailable")
  );
  fireEvent.press(pay);
  await screen.findByText("storage unavailable");
  expect(req).toHaveBeenCalledTimes(1);
  req.mockImplementationOnce(async (_url, opts) => ({
    checkoutAttemptId: opts.body.checkoutAttemptId,
    amountCents: 6813,
    currency: "usd",
    url: "https://example.test/invalid",
    expiresAt: "2099-12-31T00:00:00.000Z"
  }));
  fireEvent.press(pay);
  await waitFor(() => expect(onReceipt).toHaveBeenCalled());
  expect(openCheckout).not.toHaveBeenCalled();
});
test("recovers an ambiguous payment without a second checkout and confirms only settled payment", async () => {
  req
    .mockResolvedValueOnce(state("open_unpaid", { canResume: true, checkoutUrl: hosted }))
    .mockResolvedValueOnce(state("settled"));
  const openCheckout = jest.fn().mockResolvedValue(undefined);
  const screen = render(
    <GuestGiftStatus
      receipt={receipt}
      onNew={jest.fn()}
      onRetry={jest.fn()}
      openCheckout={openCheckout}
    />
  );
  fireEvent.press(await screen.findByText("Resume the same Stripe checkout"));
  expect(openCheckout).toHaveBeenCalledWith(hosted);
  fireEvent.press(screen.getByText("Check gift status"));
  await screen.findByText(/Payment confirmed/);
  expect(req).toHaveBeenCalledTimes(2);
  for (const [endpoint, opts] of req.mock.calls) {
    expect(endpoint).toBe("/api/subscription/gifts/guest/status");
    expect(opts.auth).toBe(false);
    expect(opts.body).toEqual({ checkoutAttemptId: id, guestAccessToken: token });
  }
});
test.each([
  ["payment_processing", { paymentConfirmed: true }],
  ["open_unpaid", { canResume: true, checkoutUrl: "https://example.test" }],
  ["support", { canStartNewAttempt: true }],
  ["settled", { amountCents: 999 }],
  ["settled", { checkoutAttemptId: "b".repeat(32) }]
])("rejects inconsistent %s receipts", async (kind, extra) => {
  req.mockResolvedValue(state(kind as string, extra));
  await expect(checkGuestGift(receipt)).rejects.toThrow(/could not be confirmed/);
});
test("a pending review key is persistent and unpredictable across independent buyers", async () => {
  const first = await guestQuoteIdentity();
  expect(await guestQuoteIdentity()).toEqual(first);
  store.clear();
  expect((await guestQuoteIdentity()).guestRequestKey).not.toBe(first.guestRequestKey);
});

test("keeps automatic status checks read-only and recovers an unbound checkout only after an explicit retry", async () => {
  req
    .mockResolvedValueOnce(state("verifying"))
    .mockResolvedValueOnce(
      state("open_unpaid", { canResume: true, checkoutUrl: hosted })
    );
  const openCheckout = jest.fn().mockResolvedValue(undefined);
  const screen = render(
    <GuestGiftStatus
      receipt={receipt}
      onNew={jest.fn()}
      onRetry={jest.fn()}
      openCheckout={openCheckout}
    />
  );
  const retry = await screen.findByText("Retry the same checkout");
  expect(req.mock.calls.map(([p]) => p)).toEqual([
    "/api/subscription/gifts/guest/status"
  ]);
  fireEvent.press(retry);
  fireEvent.press(retry);
  const resume = await screen.findByText("Resume the same Stripe checkout");
  expect(req.mock.calls.map(([p]) => p)).toEqual([
    "/api/subscription/gifts/guest/status",
    "/api/subscription/gifts/guest/recover"
  ]);
  expect(req.mock.calls[1][1].body).toEqual({
    checkoutAttemptId: id,
    guestAccessToken: token
  });
  expect(openCheckout).not.toHaveBeenCalled();
  fireEvent.press(resume);
  expect(openCheckout).toHaveBeenCalledWith(hosted);
});
