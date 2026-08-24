import AsyncStorage from "@react-native-async-storage/async-storage";

import { businessDeskProviderSignatureSha256 as sha256 } from "@/features/businessDesk/providerOperationPersistence";
import { newBusinessDeskOperationKey } from "@/features/businessDesk/recordWorkflow";

export type PersistedHarvestDeepReview = {
  accountDigest: string;
  workspaceDigest: string;
  scopeDigest: string;
  clientOperationKey: string;
  operationId: string | null;
  requestDigest: string | null;
  manifestDigest: string;
  selectedEvidenceDigest: string;
  analyzedEvidenceDigest: string;
  selectedEvidenceCount: number;
  analyzedEvidenceCount: number;
  batchCount: number;
  creditsQuoted: number;
  quoteExpiresAt: string;
  dispatchAttemptCount: number;
  lastDispatchAt: string | null;
  updatedAt: string;
};

const STORAGE_KEY = "growpath.harvest.deepReviewOperation.v3";
const MAX_ENTRIES = 12;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/i;
const OPERATION_ID_PATTERN = /^[a-z0-9_-]{8,160}$/i;
let mutationQueue: Promise<void> = Promise.resolve();

function accountDigest(accountId: string) {
  return sha256(`harvest-account:${String(accountId || "").trim()}`);
}

export function harvestDeepReviewScopeDigest(scopeKey: string) {
  return sha256(`harvest-deep-scope:${String(scopeKey || "").trim()}`);
}

function validEntry(value: unknown): value is PersistedHarvestDeepReview {
  if (!value || typeof value !== "object") return false;
  const entry = value as PersistedHarvestDeepReview;
  return (
    DIGEST_PATTERN.test(entry.accountDigest) &&
    DIGEST_PATTERN.test(entry.workspaceDigest) &&
    DIGEST_PATTERN.test(entry.scopeDigest) &&
    typeof entry.clientOperationKey === "string" &&
    entry.clientOperationKey.length >= 8 &&
    entry.clientOperationKey.length <= 200 &&
    (entry.operationId === null || OPERATION_ID_PATTERN.test(entry.operationId)) &&
    (entry.requestDigest === null || DIGEST_PATTERN.test(entry.requestDigest)) &&
    ((entry.operationId === null && entry.requestDigest === null) ||
      (entry.operationId !== null && entry.requestDigest !== null)) &&
    DIGEST_PATTERN.test(entry.manifestDigest) &&
    DIGEST_PATTERN.test(entry.selectedEvidenceDigest) &&
    DIGEST_PATTERN.test(entry.analyzedEvidenceDigest) &&
    Number.isInteger(entry.selectedEvidenceCount) &&
    entry.selectedEvidenceCount >= 13 &&
    entry.selectedEvidenceCount <= 80 &&
    Number.isInteger(entry.analyzedEvidenceCount) &&
    entry.analyzedEvidenceCount >= 13 &&
    entry.analyzedEvidenceCount <= entry.selectedEvidenceCount &&
    Number.isInteger(entry.batchCount) &&
    entry.batchCount >= 2 &&
    entry.batchCount <= 7 &&
    Number.isInteger(entry.creditsQuoted) &&
    entry.creditsQuoted >= 2 &&
    entry.creditsQuoted <= 7 &&
    entry.creditsQuoted === entry.batchCount &&
    Number.isFinite(new Date(entry.quoteExpiresAt).getTime()) &&
    Number.isInteger(entry.dispatchAttemptCount) &&
    entry.dispatchAttemptCount >= 0 &&
    entry.dispatchAttemptCount <= 2 &&
    ((entry.dispatchAttemptCount === 0 && entry.lastDispatchAt === null) ||
      (entry.dispatchAttemptCount > 0 &&
        typeof entry.lastDispatchAt === "string" &&
        Number.isFinite(new Date(entry.lastDispatchAt).getTime()))) &&
    Number.isFinite(new Date(entry.updatedAt).getTime())
  );
}

async function loadEntries() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : [])
      .filter(validEntry)
      .slice(0, MAX_ENTRIES) as PersistedHarvestDeepReview[];
  } catch {
    return [];
  }
}

async function saveEntries(entries: PersistedHarvestDeepReview[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

function serialize<TResult>(work: () => Promise<TResult>) {
  const result = mutationQueue.then(work, work);
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

export async function prepareHarvestDeepReview(input: {
  accountId: string;
  workspaceKey: string;
  scopeKey: string;
  manifestDigest: string;
  selectedEvidenceDigest: string;
  analyzedEvidenceDigest: string;
  selectedEvidenceCount: number;
  analyzedEvidenceCount: number;
  batchCount: number;
  creditsQuoted: number;
  quoteExpiresAt: string;
}) {
  return serialize(async () => {
    const entry: PersistedHarvestDeepReview = {
      accountDigest: accountDigest(input.accountId),
      workspaceDigest: sha256(
        `harvest-workspace:${String(input.workspaceKey || "").trim()}`
      ),
      scopeDigest: harvestDeepReviewScopeDigest(input.scopeKey),
      clientOperationKey: newBusinessDeskOperationKey("harvest-deep"),
      operationId: null,
      requestDigest: null,
      manifestDigest: String(input.manifestDigest || "").trim(),
      selectedEvidenceDigest: String(input.selectedEvidenceDigest || "").trim(),
      analyzedEvidenceDigest: String(input.analyzedEvidenceDigest || "").trim(),
      selectedEvidenceCount: Math.trunc(Number(input.selectedEvidenceCount || 0)),
      analyzedEvidenceCount: Math.trunc(Number(input.analyzedEvidenceCount || 0)),
      batchCount: Math.trunc(Number(input.batchCount || 0)),
      creditsQuoted: Math.trunc(Number(input.creditsQuoted || 0)),
      quoteExpiresAt: String(input.quoteExpiresAt || "").trim(),
      dispatchAttemptCount: 0,
      lastDispatchAt: null,
      updatedAt: new Date().toISOString()
    };
    if (!validEntry(entry)) {
      throw new Error("The Deep review recovery metadata was invalid and was not saved.");
    }
    const entries = await loadEntries();
    await saveEntries([
      entry,
      ...entries.filter(
        (candidate) =>
          !(
            candidate.accountDigest === entry.accountDigest &&
            candidate.workspaceDigest === entry.workspaceDigest &&
            candidate.scopeDigest === entry.scopeDigest
          )
      )
    ]);
    return entry;
  });
}

export async function rememberHarvestDeepReviewDispatch(
  prepared: PersistedHarvestDeepReview
) {
  return serialize(async () => {
    const dispatchAt = new Date().toISOString();
    const updated: PersistedHarvestDeepReview = {
      ...prepared,
      dispatchAttemptCount: prepared.dispatchAttemptCount + 1,
      lastDispatchAt: dispatchAt,
      updatedAt: dispatchAt
    };
    if (!validEntry(updated)) {
      throw new Error(
        "The bounded Deep review dispatch metadata was invalid and no request was sent."
      );
    }
    const entries = await loadEntries();
    await saveEntries([
      updated,
      ...entries.filter(
        (candidate) =>
          !(
            candidate.accountDigest === updated.accountDigest &&
            candidate.workspaceDigest === updated.workspaceDigest &&
            candidate.scopeDigest === updated.scopeDigest
          )
      )
    ]);
    return updated;
  });
}

export async function rememberHarvestDeepReviewOperation(
  prepared: PersistedHarvestDeepReview,
  input: {
    operationId: string;
    requestDigest: string;
    clientOperationKey: string;
  }
) {
  return serialize(async () => {
    if (String(input.clientOperationKey || "") !== prepared.clientOperationKey) {
      throw new Error("The Deep review operation did not match its stable request ID.");
    }
    const updated: PersistedHarvestDeepReview = {
      ...prepared,
      operationId: String(input.operationId || "").trim(),
      requestDigest: String(input.requestDigest || "").trim(),
      updatedAt: new Date().toISOString()
    };
    if (!validEntry(updated)) {
      throw new Error(
        "The Deep review operation metadata was invalid and was not saved."
      );
    }
    const entries = await loadEntries();
    await saveEntries([
      updated,
      ...entries.filter(
        (candidate) =>
          !(
            candidate.accountDigest === updated.accountDigest &&
            candidate.workspaceDigest === updated.workspaceDigest &&
            candidate.scopeDigest === updated.scopeDigest
          )
      )
    ]);
    return updated;
  });
}

export async function loadHarvestDeepReview(input: {
  accountId: string;
  workspaceKey: string;
  scopeKey: string;
}) {
  const expectedAccount = accountDigest(input.accountId);
  const expectedWorkspace = sha256(
    `harvest-workspace:${String(input.workspaceKey || "").trim()}`
  );
  const expectedScope = harvestDeepReviewScopeDigest(input.scopeKey);
  const entries = await loadEntries();
  return (
    entries.find(
      (entry) =>
        entry.accountDigest === expectedAccount &&
        entry.workspaceDigest === expectedWorkspace &&
        entry.scopeDigest === expectedScope
    ) || null
  );
}

export async function forgetHarvestDeepReview(entry: PersistedHarvestDeepReview) {
  await serialize(async () => {
    const entries = await loadEntries();
    await saveEntries(
      entries.filter(
        (candidate) =>
          !(
            candidate.accountDigest === entry.accountDigest &&
            candidate.workspaceDigest === entry.workspaceDigest &&
            candidate.scopeDigest === entry.scopeDigest &&
            candidate.clientOperationKey === entry.clientOperationKey
          )
      )
    );
  });
}
