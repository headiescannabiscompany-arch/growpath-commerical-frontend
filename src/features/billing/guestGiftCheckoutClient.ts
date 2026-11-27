import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { apiRequest } from "@/api/apiRequest";
import {
  isGiftCheckoutQuote,
  isSafeStripeCheckoutUrl,
  type GiftCheckoutInterval,
  type GiftCheckoutQuote,
  type GiftCheckoutReconcileState
} from "@/api/subscription";

export type GuestGiftPlan = "pro" | "commercial";
export type GuestGiftDetails = {
  purchaserEmail: string;
  giftRecipientEmail: string;
  giftRecipientName: string;
  giftMessage: string;
  plan: GuestGiftPlan;
  interval: GiftCheckoutInterval;
};
export type GuestGiftReceipt = {
  checkoutAttemptId: string;
  guestAccessToken: string;
  amountCents: number;
  currency: string;
};
type GuestGiftStatus = {
  state: GiftCheckoutReconcileState;
  canStartNewAttempt: boolean;
  checkoutUrl: string | null;
};
const STORAGE_KEY = "growpath_guest_gift_receipt_v1";
const DRAFT_KEY = "growpath_guest_gift_quote_v1";
const API = "/api/subscription/gifts/guest/";
const STATES: GiftCheckoutReconcileState[] = [
  "verifying",
  "pending",
  "open_unpaid",
  "payment_processing",
  "settled",
  "expired",
  "not_created",
  "support"
];

function isReceipt(value: unknown): value is GuestGiftReceipt {
  if (typeof value !== "object" || !value) return false;
  const row = value as Partial<GuestGiftReceipt>;
  return (
    typeof row.checkoutAttemptId === "string" &&
    /^[a-zA-Z0-9_-]{20,128}$/.test(row.checkoutAttemptId) &&
    typeof row.guestAccessToken === "string" &&
    /^[\x21-\x7e]{24,2048}$/.test(row.guestAccessToken) &&
    Number.isSafeInteger(row.amountCents) &&
    Number(row.amountCents) > 0 &&
    typeof row.currency === "string" &&
    /^[a-z]{3}$/.test(row.currency)
  );
}

async function readLocal(key: string): Promise<string | null> {
  return Platform.OS === "web"
    ? window.sessionStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}
async function writeLocal(key: string, value: string) {
  if (Platform.OS === "web") window.sessionStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}
async function removeLocal(key: string) {
  if (Platform.OS === "web") window.sessionStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}

export async function guestQuoteIdentity() {
  const raw = await readLocal(DRAFT_KEY);
  if (raw) {
    const stored = JSON.parse(raw);
    if (
      /^[0-9a-f]{32}$/.test(stored?.checkoutAttemptId) &&
      /^[0-9a-f]{64}$/.test(stored?.guestRequestKey)
    ) {
      return {
        checkoutAttemptId: String(stored.checkoutAttemptId),
        guestRequestKey: String(stored.guestRequestKey)
      };
    }
    throw new Error("Your saved gift review could not be read.");
  }
  if (!globalThis.crypto?.getRandomValues)
    throw new Error("Secure gift checkout is unavailable in this browser.");
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(48));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const identity = {
    checkoutAttemptId: hex.slice(0, 32),
    guestRequestKey: hex.slice(32)
  };
  const encoded = JSON.stringify(identity);
  await writeLocal(DRAFT_KEY, encoded);
  if ((await readLocal(DRAFT_KEY)) !== encoded)
    throw new Error("Your gift review could not be saved.");
  return identity;
}

export async function loadGuestGiftReceipt(): Promise<GuestGiftReceipt | null> {
  const raw = await readLocal(STORAGE_KEY);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!isReceipt(value)) throw new Error("The saved gift receipt could not be read.");
  return value;
}

export async function storeGuestGiftReceipt(receipt: GuestGiftReceipt): Promise<void> {
  if (!isReceipt(receipt)) throw new Error("The gift receipt is incomplete.");
  const raw = JSON.stringify(receipt);
  await writeLocal(STORAGE_KEY, raw);
  const saved = await loadGuestGiftReceipt();
  if (
    saved?.checkoutAttemptId !== receipt.checkoutAttemptId ||
    saved.guestAccessToken !== receipt.guestAccessToken ||
    saved.amountCents !== receipt.amountCents ||
    saved.currency !== receipt.currency
  ) {
    throw new Error("This browser could not save the gift receipt.");
  }
}

export async function clearGuestGiftReceipt(expected: GuestGiftReceipt): Promise<void> {
  const saved = await loadGuestGiftReceipt();
  if (
    saved?.checkoutAttemptId !== expected.checkoutAttemptId ||
    saved.guestAccessToken !== expected.guestAccessToken
  )
    throw new Error("This receipt changed. Reload before opening a different gift.");
  await removeLocal(DRAFT_KEY);
  await removeLocal(STORAGE_KEY);
  if (await loadGuestGiftReceipt())
    throw new Error("The gift receipt could not be cleared.");
}

function guestPost(path: string, body: Record<string, unknown>) {
  return apiRequest(API + path, { method: "POST", auth: false, cache: "no-store", body });
}

export async function reviewGuestGift(
  details: GuestGiftDetails,
  identity: { checkoutAttemptId: string; guestRequestKey: string },
  existingToken?: string
): Promise<{ quote: GiftCheckoutQuote; receipt: GuestGiftReceipt }> {
  const result = await guestPost("quote", {
    ...details,
    ...identity,
    ...(existingToken ? { guestAccessToken: existingToken } : {})
  });
  const { quote, guestAccessToken } = result?.data ?? result ?? {};
  if (
    !isGiftCheckoutQuote(quote) ||
    quote.plan !== details.plan ||
    quote.interval !== details.interval ||
    Date.parse(quote.expiresAt) <= Date.now()
  ) {
    throw new Error(
      "The current gift price could not be confirmed. Review the price again."
    );
  }
  const receipt = {
    checkoutAttemptId: identity.checkoutAttemptId,
    guestAccessToken,
    amountCents: quote.amountCents,
    currency: quote.currency
  };
  if (!isReceipt(receipt)) throw new Error("The gift receipt could not be confirmed.");
  return { quote, receipt };
}

export async function startGuestGift(
  details: GuestGiftDetails,
  receipt: GuestGiftReceipt,
  quote: GiftCheckoutQuote
): Promise<string> {
  const result = await guestPost("checkout", {
    ...details,
    checkoutAttemptId: receipt.checkoutAttemptId,
    guestAccessToken: receipt.guestAccessToken,
    giftQuoteToken: quote.confirmationToken
  });
  const row = result?.data ?? result;
  if (
    row?.checkoutAttemptId !== receipt.checkoutAttemptId ||
    row.amountCents !== receipt.amountCents ||
    row.currency !== receipt.currency ||
    !isSafeStripeCheckoutUrl(row.url) ||
    !Number.isFinite(Date.parse(row.expiresAt)) ||
    Date.parse(row.expiresAt) <= Date.now()
  ) {
    throw new Error(
      "The checkout response could not be confirmed. Check the saved gift status."
    );
  }
  return row.url;
}

export function checkGuestGift(receipt: GuestGiftReceipt) {
  return guestReceiptStatus("status", receipt);
}

export function recoverGuestGift(receipt: GuestGiftReceipt) {
  return guestReceiptStatus("recover", receipt);
}

async function guestReceiptStatus(
  operation: "status" | "recover",
  receipt: GuestGiftReceipt
): Promise<GuestGiftStatus> {
  const result = await guestPost(operation, {
    checkoutAttemptId: receipt.checkoutAttemptId,
    guestAccessToken: receipt.guestAccessToken
  });
  const row = result?.data ?? result;
  const amountMatches =
    row?.amountCents === receipt.amountCents && row?.currency === receipt.currency;
  const emptyPrice = row?.amountCents === null && row?.currency === null;
  if (
    row?.checkoutAttemptId !== receipt.checkoutAttemptId ||
    !STATES.includes(row.state) ||
    typeof row.paymentConfirmed !== "boolean" ||
    row.paymentConfirmed !== (row.state === "settled") ||
    typeof row.canResume !== "boolean" ||
    typeof row.canStartNewAttempt !== "boolean" ||
    (row.canStartNewAttempt &&
      !["not_created", "expired", "settled"].includes(row.state)) ||
    (row.canResume
      ? row.state !== "open_unpaid" || !isSafeStripeCheckoutUrl(row.checkoutUrl)
      : row.checkoutUrl !== null) ||
    (!amountMatches &&
      !(
        emptyPrice &&
        ["not_created", "pending", "verifying", "support"].includes(row.state)
      ))
  ) {
    throw new Error(
      "The gift status could not be confirmed. Check again before starting another payment."
    );
  }
  return {
    state: row.state,
    canStartNewAttempt: row.canStartNewAttempt,
    checkoutUrl: row.checkoutUrl
  };
}
