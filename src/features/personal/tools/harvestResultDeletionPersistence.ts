import AsyncStorage from "@react-native-async-storage/async-storage";

import { businessDeskProviderSignatureSha256 as sha256 } from "@/features/businessDesk/providerOperationPersistence";

export type PendingHarvestResultDeletion = {
  accountDigest: string;
  workspaceDigest: string;
  toolRunId: string;
  deleteSourceVideo: boolean;
  requestedAt: string;
};

const STORAGE_KEY = "growpath.harvest.resultDeletion.v1";
const MAX_ENTRIES = 10;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const TOOL_RUN_ID_PATTERN = /^[a-z0-9_-]{3,160}$/i;
let mutationQueue: Promise<void> = Promise.resolve();

function accountDigest(accountId: string) {
  return sha256(`harvest-delete-account:${String(accountId || "").trim()}`);
}

function workspaceDigest(workspaceKey: string) {
  return sha256(`harvest-delete-workspace:${String(workspaceKey || "").trim()}`);
}

function validEntry(value: unknown): value is PendingHarvestResultDeletion {
  if (!value || typeof value !== "object") return false;
  const entry = value as PendingHarvestResultDeletion;
  return (
    DIGEST_PATTERN.test(entry.accountDigest) &&
    DIGEST_PATTERN.test(entry.workspaceDigest) &&
    TOOL_RUN_ID_PATTERN.test(entry.toolRunId) &&
    typeof entry.deleteSourceVideo === "boolean" &&
    Number.isFinite(new Date(entry.requestedAt).getTime())
  );
}

async function loadEntries() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : [])
      .filter(validEntry)
      .slice(0, MAX_ENTRIES) as PendingHarvestResultDeletion[];
  } catch {
    return [];
  }
}

async function saveEntries(entries: PendingHarvestResultDeletion[]) {
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

export async function rememberPendingHarvestResultDeletion(input: {
  accountId: string;
  workspaceKey: string;
  toolRunId: string;
  deleteSourceVideo: boolean;
}) {
  return serialize(async () => {
    const entry: PendingHarvestResultDeletion = {
      accountDigest: accountDigest(input.accountId),
      workspaceDigest: workspaceDigest(input.workspaceKey),
      toolRunId: String(input.toolRunId || "").trim(),
      deleteSourceVideo: input.deleteSourceVideo === true,
      requestedAt: new Date().toISOString()
    };
    if (!validEntry(entry)) {
      throw new Error(
        "The deletion retry receipt could not be saved, so nothing was deleted."
      );
    }
    const entries = await loadEntries();
    const conflictingChoice = entries.find(
      (candidate) =>
        candidate.accountDigest === entry.accountDigest &&
        candidate.workspaceDigest === entry.workspaceDigest &&
        candidate.toolRunId === entry.toolRunId &&
        candidate.deleteSourceVideo !== entry.deleteSourceVideo
    );
    if (conflictingChoice) {
      throw new Error(
        "This Harvest result already has cleanup pending with a different source-video choice. Retry that exact saved choice."
      );
    }
    await saveEntries([
      entry,
      ...entries.filter(
        (candidate) =>
          !(
            candidate.accountDigest === entry.accountDigest &&
            candidate.workspaceDigest === entry.workspaceDigest &&
            candidate.toolRunId === entry.toolRunId
          )
      )
    ]);
    return entry;
  });
}

export async function loadPendingHarvestResultDeletion(input: {
  accountId: string;
  workspaceKey: string;
}) {
  const expectedAccount = accountDigest(input.accountId);
  const expectedWorkspace = workspaceDigest(input.workspaceKey);
  const entries = await loadEntries();
  return (
    entries.find(
      (entry) =>
        entry.accountDigest === expectedAccount &&
        entry.workspaceDigest === expectedWorkspace
    ) || null
  );
}

export async function forgetPendingHarvestResultDeletion(
  entry: PendingHarvestResultDeletion
) {
  await serialize(async () => {
    const entries = await loadEntries();
    await saveEntries(
      entries.filter(
        (candidate) =>
          !(
            candidate.accountDigest === entry.accountDigest &&
            candidate.workspaceDigest === entry.workspaceDigest &&
            candidate.toolRunId === entry.toolRunId &&
            candidate.deleteSourceVideo === entry.deleteSourceVideo
          )
      )
    );
  });
}
