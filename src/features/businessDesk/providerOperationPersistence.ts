import AsyncStorage from "@react-native-async-storage/async-storage";

import { newBusinessDeskOperationKey } from "@/features/businessDesk/recordWorkflow";

export type BusinessDeskProviderOperationSlot =
  | "expense_receipt_extraction"
  | "business_ask"
  | "expense_receipt_apply";

export type PersistedBusinessDeskOperation = {
  scopeKey: string;
  slot: BusinessDeskProviderOperationSlot;
  signatureSha256: string;
  clientOperationKey: string;
  operationId: string | null;
  updatedAt: string;
};

const STORAGE_KEY = "growpath.businessDesk.providerOperationMetadata.v2";
const MAX_ENTRIES = 24;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
let mutationQueue: Promise<void> = Promise.resolve();

function serializedMutation<TResult>(run: () => Promise<TResult>) {
  const result = mutationQueue.then(run, run);
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function rotateRight(value: number, bits: number) {
  return (value >>> bits) | (value << (32 - bits));
}

function utf8Bytes(value: string) {
  const result: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < value.length) {
      const low = value.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (low - 0xdc00);
        index += 1;
      }
    }
    if (codePoint <= 0x7f) result.push(codePoint);
    else if (codePoint <= 0x7ff) {
      result.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      result.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      result.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return result;
}

// A small synchronous SHA-256 implementation keeps sensitive request text out of
// AsyncStorage on web and native. Only this digest and provider operation metadata persist.
export function businessDeskProviderSignatureSha256(value: string) {
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
    0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
    0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
    0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2
  ];
  const words = utf8Bytes(String(value));
  const bitLength = words.length * 8;
  words.push(0x80);
  while (words.length % 64 !== 56) words.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) words.push((high >>> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) words.push((low >>> shift) & 0xff);

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
    0x5be0cd19
  ];
  const schedule = new Array<number>(64);
  for (let offset = 0; offset < words.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const byte = offset + index * 4;
      schedule[index] =
        ((words[byte] << 24) |
          (words[byte + 1] << 16) |
          (words[byte + 2] << 8) |
          words[byte + 3]) >>>
        0;
    }
    for (let index = 16; index < 64; index += 1) {
      const before15 = schedule[index - 15];
      const before2 = schedule[index - 2];
      const sigma0 =
        rotateRight(before15, 7) ^ rotateRight(before15, 18) ^ (before15 >>> 3);
      const sigma1 =
        rotateRight(before2, 17) ^ rotateRight(before2, 19) ^ (before2 >>> 10);
      schedule[index] =
        (schedule[index - 16] + sigma0 + schedule[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temporary1 = (h + sum1 + choose + constants[index] + schedule[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
}

export function businessDeskProviderPersistenceScopeKey(
  accountSubject: string | null | undefined,
  workspaceKey: string
) {
  const subject = String(accountSubject || "").trim();
  const workspace = String(workspaceKey || "").trim();
  if (!subject || !workspace) return "";
  return `${businessDeskProviderSignatureSha256(`account:${subject}`)}:${workspace}`;
}

function validEntry(value: unknown): value is PersistedBusinessDeskOperation {
  if (!value || typeof value !== "object") return false;
  const entry = value as PersistedBusinessDeskOperation;
  return (
    typeof entry.scopeKey === "string" &&
    entry.scopeKey.length > 0 &&
    entry.scopeKey.length <= 512 &&
    ["expense_receipt_extraction", "business_ask", "expense_receipt_apply"].includes(
      entry.slot
    ) &&
    DIGEST_PATTERN.test(String(entry.signatureSha256 || "")) &&
    typeof entry.clientOperationKey === "string" &&
    entry.clientOperationKey.length > 0 &&
    entry.clientOperationKey.length <= 256 &&
    (entry.operationId === null ||
      (typeof entry.operationId === "string" && entry.operationId.length <= 256)) &&
    Number.isFinite(new Date(entry.updatedAt).getTime())
  );
}

async function loadEntries() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return (Array.isArray(parsed) ? parsed : [])
      .filter(validEntry)
      .filter((entry) => new Date(entry.updatedAt).getTime() >= cutoff)
      .slice(0, MAX_ENTRIES) as PersistedBusinessDeskOperation[];
  } catch {
    return [];
  }
}

async function saveEntries(entries: PersistedBusinessDeskOperation[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export async function getOrCreatePersistedProviderIdentity(input: {
  scopeKey: string;
  slot: BusinessDeskProviderOperationSlot;
  signature: string;
  keyPrefix: string;
}) {
  return serializedMutation(async () => {
    if (!String(input.scopeKey || "").trim()) {
      throw new Error(
        "A signed-in account scope is required for safe AI retry metadata."
      );
    }
    const signatureSha256 = businessDeskProviderSignatureSha256(input.signature);
    const entries = await loadEntries();
    const existing = entries.find(
      (entry) =>
        entry.scopeKey === input.scopeKey &&
        entry.slot === input.slot &&
        entry.signatureSha256 === signatureSha256
    );
    if (existing) return existing;
    const created: PersistedBusinessDeskOperation = {
      scopeKey: input.scopeKey,
      slot: input.slot,
      signatureSha256,
      clientOperationKey: newBusinessDeskOperationKey(input.keyPrefix),
      operationId: null,
      updatedAt: new Date().toISOString()
    };
    await saveEntries([created, ...entries]);
    return created;
  });
}

export async function rememberPersistedProviderOperation(
  identity: PersistedBusinessDeskOperation,
  operationId: string
) {
  return serializedMutation(async () => {
    const entries = await loadEntries();
    const updated = {
      ...identity,
      operationId: String(operationId || "").trim() || null,
      updatedAt: new Date().toISOString()
    } satisfies PersistedBusinessDeskOperation;
    await saveEntries([
      updated,
      ...entries.filter(
        (entry) =>
          !(
            entry.scopeKey === updated.scopeKey &&
            entry.slot === updated.slot &&
            entry.signatureSha256 === updated.signatureSha256
          )
      )
    ]);
    return updated;
  });
}

export async function forgetPersistedProviderIdentity(
  scopeKey: string,
  slot: BusinessDeskProviderOperationSlot,
  signatureSha256: string
) {
  await serializedMutation(async () => {
    const entries = await loadEntries();
    await saveEntries(
      entries.filter(
        (entry) =>
          !(
            entry.scopeKey === scopeKey &&
            entry.slot === slot &&
            entry.signatureSha256 === signatureSha256
          )
      )
    );
  });
}

export async function loadLatestPersistedProviderOperation(
  scopeKey: string,
  slot: Exclude<BusinessDeskProviderOperationSlot, "expense_receipt_apply">
) {
  if (!String(scopeKey || "").trim()) return null;
  const entries = await loadEntries();
  return (
    entries
      .filter(
        (entry) =>
          entry.scopeKey === scopeKey && entry.slot === slot && Boolean(entry.operationId)
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )[0] || null
  );
}
