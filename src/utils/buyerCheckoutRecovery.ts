import AsyncStorage from "@react-native-async-storage/async-storage";

export type BuyerCheckoutKind = "course" | "marketplace";

export type PendingBuyerCheckout = {
  kind: BuyerCheckoutKind;
  itemId: string;
  returnPath: string;
  startedAt: string;
};

export type AuthoritativeCheckoutState = "confirmed" | "pending" | "terminal" | "unknown";

export type CheckoutReconciliation<T> = {
  attempts: number;
  snapshot: T | null;
  state: AuthoritativeCheckoutState;
};

type PollOptions<T> = {
  classify: (snapshot: T) => AuthoritativeCheckoutState;
  delaysMs?: readonly number[];
  onSnapshot?: (snapshot: T) => void;
  read: () => Promise<T>;
  shouldContinue?: () => boolean;
  wait?: (delayMs: number) => Promise<void>;
};

const STORAGE_PREFIX = "@growpath/buyer-checkout-recovery/v1";

export const BUYER_CHECKOUT_RECONCILIATION_DELAYS_MS = [0, 300, 800, 1600, 2800] as const;

function storageKey(kind: BuyerCheckoutKind) {
  return `${STORAGE_PREFIX}/${kind}`;
}

function normalizeRecord(
  value: unknown,
  kind: BuyerCheckoutKind
): PendingBuyerCheckout | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PendingBuyerCheckout>;
  const itemId = String(candidate.itemId || "").trim();
  const startedAt = String(candidate.startedAt || "").trim();
  if (candidate.kind !== kind || !itemId || !startedAt) return null;
  if (Number.isNaN(new Date(startedAt).getTime())) return null;
  return {
    kind,
    itemId,
    returnPath: String(candidate.returnPath || ""),
    startedAt
  };
}

export async function rememberPendingBuyerCheckout(
  kind: BuyerCheckoutKind,
  itemId: string,
  returnPath = ""
): Promise<PendingBuyerCheckout> {
  const normalizedId = String(itemId || "").trim();
  if (!normalizedId) throw new Error("A checkout item id is required.");
  const record: PendingBuyerCheckout = {
    kind,
    itemId: normalizedId,
    returnPath: String(returnPath || ""),
    startedAt: new Date().toISOString()
  };
  await AsyncStorage.setItem(storageKey(kind), JSON.stringify(record));
  return record;
}

export async function readPendingBuyerCheckout(
  kind: BuyerCheckoutKind
): Promise<PendingBuyerCheckout | null> {
  const raw = await AsyncStorage.getItem(storageKey(kind));
  if (!raw) return null;
  try {
    return normalizeRecord(JSON.parse(raw), kind);
  } catch {
    return null;
  }
}

export async function clearPendingBuyerCheckout(
  kind: BuyerCheckoutKind,
  itemId?: string
): Promise<boolean> {
  if (itemId) {
    const current = await readPendingBuyerCheckout(kind);
    if (!current || current.itemId !== String(itemId)) return false;
  }
  await AsyncStorage.removeItem(storageKey(kind));
  return true;
}

function defaultWait(delayMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

export async function pollAuthoritativeCheckoutStatus<T>({
  classify,
  delaysMs = BUYER_CHECKOUT_RECONCILIATION_DELAYS_MS,
  onSnapshot,
  read,
  shouldContinue = () => true,
  wait = defaultWait
}: PollOptions<T>): Promise<CheckoutReconciliation<T>> {
  let attempts = 0;
  let snapshot: T | null = null;
  let state: AuthoritativeCheckoutState = "unknown";

  for (const delayMs of delaysMs) {
    if (!shouldContinue()) break;
    if (delayMs > 0) await wait(delayMs);
    if (!shouldContinue()) break;
    attempts += 1;
    try {
      snapshot = await read();
      if (!shouldContinue()) break;
      onSnapshot?.(snapshot);
      state = classify(snapshot);
      if (state === "confirmed" || state === "terminal") break;
    } catch {
      state = "unknown";
    }
  }

  return { attempts, snapshot, state };
}
